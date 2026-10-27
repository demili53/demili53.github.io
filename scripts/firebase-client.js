// Shared Firebase app and persistent authentication for every page.
import { getApp, getApps, initializeApp } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-analytics.js";
import { browserLocalPersistence, getAuth, onAuthStateChanged, signOut, setPersistence } from "https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js";
export { onAuthStateChanged, signOut };
const firebaseConfig = {
  apiKey: "AIzaSyCtCAly3XVVZTu0szIHAoQwYu0QaaXoNRM",
  authDomain: "gitpage-93dfb.firebaseapp.com",
  projectId: "gitpage-93dfb",
  storageBucket: "gitpage-93dfb.firebasestorage.app",
  messagingSenderId: "590509724278",
  appId: "1:590509724278:web:cb26ed63e8733ffa240557",
  measurementId: "G-0JPQ9J5Y18"
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
isAnalyticsSupported().then((supported) => {
  if (supported) getAnalytics(app);
}).catch(() => {});

export const auth = getAuth(app);
export const authReady = setPersistence(auth, browserLocalPersistence).catch(() => {});

