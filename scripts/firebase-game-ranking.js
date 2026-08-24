import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-analytics.js";
import { browserLocalPersistence, getAuth, onAuthStateChanged, setPersistence } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCtCAly3XVVZTu0szIHAoQwYu0QaaXoNRM",
  authDomain: "gitpage-93dfb.firebaseapp.com",
  projectId: "gitpage-93dfb",
  storageBucket: "gitpage-93dfb.firebasestorage.app",
  messagingSenderId: "590509724278",
  appId: "1:590509724278:web:cb26ed63e8733ffa240557",
  measurementId: "G-0JPQ9J5Y18"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
isAnalyticsSupported().then((supported) => {
  if (supported) getAnalytics(app);
}).catch(() => {});

const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true
});
setPersistence(auth, browserLocalPersistence).catch(() => {});

function safeName(user) {
  const displayName = (user?.displayName || "").trim().replace(/\s+/g, " ").slice(0, 20);
  return displayName || `플레이어-${user.uid.slice(0, 6)}`;
}

function setRankingStatus(element, message, tone = "normal") {
  if (!element) return;
  element.textContent = message;
  element.className = `mt-3 rounded-lg border px-3 py-2 text-xs ${tone === "error"
    ? "border-rose-200/30 bg-rose-500/10 text-rose-100"
    : tone === "success"
      ? "border-emerald-200/30 bg-emerald-500/10 text-emerald-100"
      : "border-white/10 bg-slate-950/40 text-slate-300"}`;
}

function withTimeout(promise, timeoutMs = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => {
        const error = new Error("Firebase 요청 시간이 초과됐습니다.");
        error.code = "firestore-timeout";
        reject(error);
      }, timeoutMs);
    })
  ]);
}

function renderRanking(list, snapshot, currentUid) {
  if (!list) return;
  list.replaceChildren();
  if (snapshot.empty) {
    const empty = document.createElement("li");
    empty.className = "rounded-lg border border-white/10 bg-slate-950/40 px-3 py-4 text-center text-sm text-slate-400";
    empty.textContent = "아직 등록된 기록이 없습니다.";
    list.append(empty);
    return;
  }

  snapshot.docs.forEach((scoreDoc, index) => {
    const data = scoreDoc.data();
    const row = document.createElement("li");
    row.className = `grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-3 py-2 text-sm ${scoreDoc.id === currentUid
      ? "border-amber-200/50 bg-amber-500/10"
      : "border-white/10 bg-slate-950/40"}`;

    const rank = document.createElement("strong");
    rank.className = index < 3 ? "text-amber-300" : "text-slate-400";
    rank.textContent = `${index + 1}`;
    const name = document.createElement("span");
    name.className = "truncate text-slate-200";
    name.textContent = String(data.displayName || "플레이어");
    const result = document.createElement("span");
    result.className = "text-right font-bold text-white";
    result.textContent = `${Number(data.score || 0).toLocaleString("ko-KR")}점`;
    row.append(rank, name, result);
    list.append(row);
  });
}

export function initializeGameRanking({ gameId, gameName }) {
  const list = document.getElementById("firebaseRankingList");
  const status = document.getElementById("firebaseRankingStatus");
  let currentUser = null;
  let latestScore = null;

  const rankingQuery = query(
    collection(db, "gameRankings", gameId, "players"),
    orderBy("score", "desc"),
    limit(10)
  );

  async function refreshRanking() {
    try {
      const snapshot = await withTimeout(getDocs(rankingQuery));
      renderRanking(list, snapshot, currentUser?.uid || "");
    } catch (error) {
      console.error(`[${gameId}] 순위를 불러오지 못했습니다.`, error);
      if (list) {
        const item = document.createElement("li");
        item.className = "rounded-lg border border-rose-200/30 bg-rose-500/10 px-3 py-4 text-center text-sm text-rose-100";
        item.textContent = error.code === "firestore-timeout"
          ? "Cloud Firestore 연결을 확인해 주세요."
          : "Firebase 순위를 불러올 수 없습니다.";
        list.replaceChildren(item);
      }
      setRankingStatus(status, error.code === "firestore-timeout"
        ? "Cloud Firestore API 또는 보안 규칙을 확인해 주세요."
        : "Firebase 순위를 불러올 수 없습니다. 보안 규칙을 확인해 주세요.", "error");
    }
  }
  refreshRanking();

  async function saveBestScore(result) {
    latestScore = result;
    if (!currentUser) {
      setRankingStatus(status, "로그인하면 최고 점수가 게임 순위에 저장됩니다.");
      return;
    }

    const normalizedScore = Math.max(0, Math.min(1_000_000_000, Math.floor(Number(result.score) || 0)));
    const normalizedWave = Math.max(0, Math.min(1_000_000, Math.floor(Number(result.wave) || 0)));
    if (normalizedScore <= 0) return;

    try {
      await withTimeout(currentUser.getIdToken());
      const playerRef = doc(db, "gameRankings", gameId, "players", currentUser.uid);
      const previous = await withTimeout(getDoc(playerRef));
      if (previous.exists() && Number(previous.data().score || 0) >= normalizedScore) {
        setRankingStatus(status, "Firebase에 저장된 최고 점수가 더 높습니다.");
        return;
      }
      await withTimeout(setDoc(playerRef, {
        displayName: safeName(currentUser),
        gameId,
        score: normalizedScore,
        wave: normalizedWave,
        updatedAt: serverTimestamp()
      }));
      setRankingStatus(status, `${gameName} 최고 점수 ${normalizedScore.toLocaleString("ko-KR")}점이 저장됐습니다.`, "success");
      await refreshRanking();
    } catch (error) {
      console.error(`[${gameId}] 점수를 저장하지 못했습니다.`, error);
      setRankingStatus(status, error.code === "firestore-timeout"
        ? "Cloud Firestore 연결 시간이 초과됐습니다. API 활성화 상태를 확인해 주세요."
        : "점수를 저장하지 못했습니다. Firebase 보안 규칙을 확인해 주세요.", "error");
    }
  }

  const scoreHandler = (event) => {
    if (event.detail?.gameId !== gameId) return;
    saveBestScore(event.detail);
  };
  window.addEventListener("partygame:score", scoreHandler);

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    setRankingStatus(status, user
      ? `${safeName(user)} 계정으로 최고 점수를 저장합니다.`
      : "순위는 볼 수 있습니다. 로그인하면 최고 점수가 저장됩니다.");
    if (latestScore && user) saveBestScore(latestScore);
  });

  window.addEventListener("pagehide", () => {
    window.removeEventListener("partygame:score", scoreHandler);
  }, { once: true });
}
