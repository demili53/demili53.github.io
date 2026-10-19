// Run under the Firestore emulator with firebase and @firebase/rules-unit-testing available.
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, setDoc, deleteDoc, getDocs, collection, query, orderBy, limit, serverTimestamp } = require('firebase/firestore');
(async () => {
  const env = await initializeTestEnvironment({ projectId: 'demo-partygame', firestore: { rules: fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8') } });
  try {
    const owner = env.authenticatedContext('owner').firestore();
    const other = env.authenticatedContext('other').firestore();
    const guest = env.unauthenticatedContext().firestore();
    const post = () => ({ riotId: '테스트#KR1', tier: '골드', positions: ['탑','미드'], wantedPositions: ['정글','서포터'], mode: '솔로/듀오 랭크', note: '', updatedAt: serverTimestamp() });
    const ref = db => doc(db, 'duoPosts', 'owner');
    await assertFails(setDoc(ref(guest), post()));
    await assertFails(setDoc(ref(other), post()));
    await assertSucceeds(setDoc(ref(owner), post()));
    await assertSucceeds(getDocs(query(collection(guest,'duoPosts'), orderBy('updatedAt','desc'),limit(50))));
    for (const positions of [[], ['탑','탑'], ['상관없음','탑'], ['바텀']]) {
      await assertFails(setDoc(ref(owner), {...post(), positions}));
      await assertFails(setDoc(ref(owner), {...post(), wantedPositions: positions}));
    }
    await assertSucceeds(setDoc(ref(owner), {...post(),positions:['상관없음'],wantedPositions:['상관없음']}));
    await assertSucceeds(setDoc(ref(owner), {...post(),positions:['탑','정글','미드','원딜','서포터']}));
    for (const invalid of [{tier:''},{riotId:'invalid'},{riotId:'bad#id#tag'},{note:'a'.repeat(101)},{extra:'field'},{updatedAt:new Date(0)}]) {
      await assertFails(setDoc(ref(owner), {...post(),...invalid}));
    }
    await assertFails(deleteDoc(ref(other)));
    await assertFails(deleteDoc(ref(guest)));
    await assertSucceeds(deleteDoc(ref(owner)));
    console.log('PASS: public reads, owner-only writes/deletes, multiple/any positions, duplicate/unknown/empty positions rejected, fields and timestamp validated.');
  } finally { await env.cleanup(); }
})().catch(error => {console.error(error);process.exitCode=1});
