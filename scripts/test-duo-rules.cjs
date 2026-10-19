// Run: firebase emulators:exec --only firestore --project demo-partygame --config firebase.duo-test.json "node scripts/test-duo-rules.cjs"
const fs=require('node:fs');const path=require('node:path');
const {initializeTestEnvironment,assertSucceeds,assertFails}=require('@firebase/rules-unit-testing');
const {doc,setDoc,deleteDoc,getDoc,getDocs,collection,query,orderBy,limit,serverTimestamp,Timestamp}=require('firebase/firestore');
(async()=>{
 const env=await initializeTestEnvironment({projectId:'demo-partygame',firestore:{rules:fs.readFileSync(path.join(__dirname,'../firestore.rules'),'utf8')}});
 try{
  const owner=env.authenticatedContext('owner').firestore(),other=env.authenticatedContext('other').firestore(),guest=env.unauthenticatedContext().firestore();
  const ref=db=>doc(db,'duoPosts','owner');
  const post=()=>({riotId:'테스트#KR1',tier:'골드',division:'II',positions:['탑','미드'],wantedPositions:['정글','서포터'],mode:'솔로/듀오 랭크',note:'',mic:'가능',style:'즐겜',availability:'지금 가능',duration:'1~2판',status:'open',updatedAt:serverTimestamp(),modifiedAt:serverTimestamp()});
  await assertFails(setDoc(ref(guest),post()));await assertFails(setDoc(ref(other),post()));
  await assertSucceeds(setDoc(ref(owner),post()));
  const initial=(await getDoc(ref(owner))).data();
  const edit=()=>({...initial,modifiedAt:serverTimestamp()});
  await assertSucceeds(getDocs(query(collection(guest,'duoPosts'),orderBy('updatedAt','desc'),limit(50))));
  await assertSucceeds(setDoc(ref(owner),{...edit(),note:'수정해도 순서는 유지'}));
  await assertFails(setDoc(ref(owner),post())); // early bump
  for(const positions of [[],['탑','탑'],['상관없음','탑'],['바텀']]){
   await assertFails(setDoc(ref(owner),{...edit(),positions}));await assertFails(setDoc(ref(owner),{...edit(),wantedPositions:positions}));
  }
  await assertSucceeds(setDoc(ref(owner),{...edit(),positions:['상관없음']}));
  for(const invalid of [{tier:''},{riotId:'bad#id#tag'},{note:'a'.repeat(101)},{extra:1},{mic:'unknown'},{status:'expired'},{style:'unknown'},{division:'V'},{modifiedAt:Timestamp.fromMillis(0)}])await assertFails(setDoc(ref(owner),{...edit(),...invalid}));
  await assertSucceeds(setDoc(ref(owner),{...edit(),status:'closed'}));
  await assertFails(setDoc(ref(owner),edit())); // reopening without renewal
  await env.withSecurityRulesDisabled(async ctx=>setDoc(ref(ctx.firestore()),{...initial,updatedAt:Timestamp.fromMillis(Date.now()-310000)}));
  await assertSucceeds(setDoc(ref(owner),post()));
  const recent=(await getDoc(ref(owner))).data();
  const report=db=>doc(db,'duoReports','owner','reporters','other');
  const data=()=>({reason:'허위 정보',details:'검토 요청',riotId:recent.riotId,note:recent.note,createdAt:serverTimestamp()});
  await assertFails(setDoc(report(guest),data()));await assertSucceeds(setDoc(report(other),data()));
  await assertFails(getDoc(report(owner)));await assertFails(getDoc(report(guest)));await assertSucceeds(getDoc(report(other)));
  await assertFails(setDoc(report(other),data())); // 24-hour report cooldown
  await assertFails(setDoc(doc(owner,'duoReports','owner','reporters','owner'),data()));
  await assertFails(deleteDoc(ref(other)));await assertFails(deleteDoc(ref(owner)));
  await assertSucceeds(setDoc(ref(owner),{status:'deleted',updatedAt:recent.updatedAt,modifiedAt:serverTimestamp()}));
  const tombstone=(await getDoc(ref(owner))).data();if(tombstone.riotId)throw Error('deletion retained content');
  await assertFails(setDoc(ref(owner),post())); // delete/recreate cannot bypass cooldown
  await assertFails(setDoc(report(other),data()));
  await env.withSecurityRulesDisabled(async ctx=>setDoc(ref(ctx.firestore()),{status:'deleted',updatedAt:Timestamp.fromMillis(Date.now()-310000),modifiedAt:Timestamp.now()}));
  await assertSucceeds(setDoc(ref(owner),post()));
  // Legacy records can migrate without increasing their listing timestamp.
  const legacy={riotId:'이전글#KR1',tier:'실버',positions:['상관없음'],wantedPositions:['상관없음'],mode:'칼바람 나락',note:'',updatedAt:Timestamp.fromMillis(Date.now()-10000)};
  await env.withSecurityRulesDisabled(async ctx=>setDoc(ref(ctx.firestore()),legacy));
  await assertSucceeds(setDoc(ref(owner),{...post(),...legacy,modifiedAt:serverTimestamp()}));
  // Execute the actual store functions against the emulator. Only SDK imports/app setup are replaced.
  const sdk=require('firebase/firestore');
  globalThis.__duoTestSDK=sdk;
  globalThis.__duoTestDB=env.authenticatedContext('store-owner').firestore();
  let source=fs.readFileSync(path.join(__dirname,'duo-store.js'),'utf8');
  source=source.replace(/^import .*firebasejs.*;\r?\n/gm,'');
  source=source.replace("'./duo-core.mjs'",JSON.stringify(require('node:url').pathToFileURL(path.join(__dirname,'duo-core.mjs')).href));
  source=source.replace(/const app =[\s\S]*?const db = initializeFirestore[^;]+;/,"const {collection,doc,limit,onSnapshot,orderBy,query,serverTimestamp,setDoc,getDocsFromServer,startAfter,runTransaction}=globalThis.__duoTestSDK; const db=globalThis.__duoTestDB;");
  const api=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
  const account={uid:'store-owner'};
  await api.savePost(account,{...post(),updatedAt:undefined,modifiedAt:undefined});
  await api.savePost(account,{...post(),note:'actual edit'});
  const storeRef=doc(globalThis.__duoTestDB,'duoPosts',account.uid);
  const originalTime=(await getDoc(storeRef)).data().updatedAt.toMillis();
  await api.closePost(account);
  if((await getDoc(storeRef)).data().status!=='closed')throw Error('store close failed');
  await require('node:assert/strict').rejects(api.bumpPost(account),error=>error.code==='cooldown');
  await api.removePost(account);
  await require('node:assert/strict').rejects(api.savePost(account,post()),error=>error.code==='cooldown');
  await env.withSecurityRulesDisabled(async ctx=>setDoc(doc(ctx.firestore(),'duoPosts',account.uid),{status:'deleted',updatedAt:Timestamp.fromMillis(originalTime-310000),modifiedAt:Timestamp.now()}));
  await api.savePost(account,post());
  if((await getDoc(storeRef)).data().status!=='open')throw Error('store reopen failed');
  const page=await api.fetchPosts();
  if(!page.items.some(item=>item.id===account.uid))throw Error('store pagination failed');
  console.log('PASS: owner-only writes, legacy migration, position validation, edit/close/renew transitions, server cooldown, tombstone deletion/recreate protection, private reports and report cooldown.');
 }finally{await env.cleanup()}
})().catch(error=>{console.error(error);process.exitCode=1});
