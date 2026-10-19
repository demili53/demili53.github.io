import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
import { collection, doc, initializeFirestore, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, getDocsFromServer, startAfter, runTransaction } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { COOLDOWN, millis, profileData } from './duo-core.mjs';

const app = getApps().length ? getApp() : initializeApp({
  apiKey: 'AIzaSyCtCAly3XVVZTu0szIHAoQwYu0QaaXoNRM',
  authDomain: 'gitpage-93dfb.firebaseapp.com',
  projectId: 'gitpage-93dfb',
  storageBucket: 'gitpage-93dfb.firebasestorage.app',
  messagingSenderId: '590509724278',
  appId: '1:590509724278:web:cb26ed63e8733ffa240557'
});
const auth = getAuth(app);
const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
export const watchUser = callback => onAuthStateChanged(auth, callback);
export const watchOwnPost = (user, next, error) => onSnapshot(doc(db, 'duoPosts', user.uid), snapshot => {
  if (!snapshot.metadata.hasPendingWrites) next(snapshot.exists() ? { id:snapshot.id, ...snapshot.data() } : null);
}, error);
export async function fetchPosts(cursor = null) {
  const constraints = [orderBy('updatedAt','desc')];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(50));
  const snapshot = await getDocsFromServer(query(collection(db,'duoPosts'), ...constraints));
  return { items:snapshot.docs.map(item => ({ id:item.id,...item.data() })), cursor:snapshot.docs.at(-1) || cursor, hasMore:snapshot.size === 50 };
}
function cooldown(previous) {
  if (previous && Date.now() - millis(previous.updatedAt) < COOLDOWN) {
    const error = new Error('마지막 등록 또는 끌어올리기 후 5분이 지나야 다시 모집할 수 있습니다.');
    error.code = 'cooldown'; throw error;
  }
}
async function changePost(user, action, data) {
  const ref = doc(db,'duoPosts',user.uid);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.exists() ? snapshot.data() : null;
    if (action === 'delete') {
      if (previous) transaction.set(ref, { status:'deleted', updatedAt:previous.updatedAt, modifiedAt:serverTimestamp() });
      return;
    }
    if (action !== 'save' && (!previous || previous.status === 'deleted')) throw new Error('모집글이 없습니다. 먼저 등록해 주세요.');
    const fresh = !previous || previous.status === 'deleted' || action === 'bump';
    if (fresh) cooldown(previous);
    transaction.set(ref, {
      ...profileData(action === 'save' ? data : previous),
      status:action === 'close' ? 'closed' : fresh ? 'open' : (previous.status || 'open'),
      updatedAt:fresh ? serverTimestamp() : previous.updatedAt,
      modifiedAt:serverTimestamp()
    });
  });
}
export const savePost = (user,data) => changePost(user,'save',data);
export const bumpPost = user => changePost(user,'bump');
export const closePost = user => changePost(user,'close');
export const removePost = user => changePost(user,'delete');
export function reportPost(user, target, reason, details) {
  return setDoc(doc(db,'duoReports',target.id,'reporters',user.uid), {
    reason, details, createdAt:serverTimestamp(), riotId:target.riotId, note:target.note
  });
}
