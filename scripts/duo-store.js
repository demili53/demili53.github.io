import { getApp, getApps, initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
import { collection, doc, initializeFirestore, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';

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
export const watchPosts = (next, error) => onSnapshot(
  query(collection(db, 'duoPosts'), orderBy('updatedAt', 'desc'), limit(50)),
  { includeMetadataChanges: true },
  snapshot => next(snapshot.docs.map(item => ({ id: item.id, ...item.data() })), snapshot.metadata), error
);
export function savePost(user, data) {
  return setDoc(doc(db, 'duoPosts', user.uid), { ...data, updatedAt: serverTimestamp() });
}
export function removePost(user) { return deleteDoc(doc(db, 'duoPosts', user.uid)); }
