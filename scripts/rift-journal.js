'use strict';
// Local, informational run history. It never grants progression or modifies a game.
var RiftJournal=(()=>{
 const C=typeof module!=='undefined'&&module.exports?require('./rift-core.js'):{RiftGame,RIFT_STAGES,RIFT_CLASSES,RIFT_RELICS,RIFT_SPECIALIZATIONS};
 const KEY='riftBladeJournalV1',VERSION=1,MAX_RECEIPTS=10000,MAX_BYTES=1500000;
 const statKeys=['damageDealt','damageTaken','maxCombo','perfectDodges','elitesKilled','goldEarned','stagesCleared','breaks'];
 const enemyTypes=['guard','mage','boss','brute','ranger','wraith'];
 const runKeys=['runId','startedAt','endedAt','difficultyId','classId','state','score','level','kills','stage','time','stats','relics','specializationId'];
 const fail=()=>{throw Error('Invalid journal');};
 function record(v,keys){if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v))||Object.keys(v).length!==keys.length)fail();for(const k of Object.keys(v))if(!keys.includes(k))fail();for(const k of keys)if(!Object.hasOwn(v,k))fail();}
 function num(v,min=0,max=1e12,int=false){if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max||int&&!Number.isSafeInteger(v))fail();}
 function member(v,values){if(!values.includes(v))fail();}
 function runId(v){if(typeof v!=='string'||! /^[a-z\d_-]{8,100}$/i.test(v))fail();}
 function ids(v,values,max){if(!Array.isArray(v)||v.length>max||new Set(v).size!==v.length)fail();for(const id of v)member(id,values);}
 function stats(v){record(v,Object.hasOwn(v,'breaks')?statKeys:statKeys.filter(k=>k!=='breaks'));if(!Object.hasOwn(v,'breaks'))v.breaks=0;for(const k of statKeys)num(v[k]);num(v.breaks,0,1e9,true);}
 function run(v){record(v,runKeys);runId(v.runId);num(v.startedAt,1,8640000000000000,true);num(v.endedAt,v.startedAt,8640000000000000,true);member(v.classId,Object.keys(C.RIFT_CLASSES));member(v.difficultyId,['story','normal','veteran']);member(v.state,['won','lost']);for(const k of ['score','kills'])num(v[k],0,1e9,true);num(v.level,1,1000,true);num(v.stage,0,C.RIFT_STAGES.length-1,true);num(v.time,0,1e8);stats(v.stats);ids(v.relics,C.RIFT_RELICS.map(r=>r.id),C.RIFT_STAGES.length);if(v.specializationId!==null)member(v.specializationId,C.RIFT_SPECIALIZATIONS[v.classId].map(s=>s.id));}
 function empty(){return{version:VERSION,runs:[],totals:{runs:0,wins:0,kills:0,gold:0},discovered:{enemyTypes:[],relics:[],classes:[],bosses:[]},recordedIds:[]};}
 function validate(v){
  record(v,['version','runs','totals','discovered','recordedIds']);if(v.version!==VERSION)fail();
  if(!Array.isArray(v.runs)||v.runs.length>10)fail();v.runs.forEach(run);if(new Set(v.runs.map(r=>r.runId)).size!==v.runs.length)fail();
  record(v.totals,['runs','wins','kills','gold']);for(const key of Object.keys(v.totals))num(v.totals[key],0,Number.MAX_SAFE_INTEGER,true);if(v.totals.wins>v.totals.runs||v.totals.runs<v.runs.length)fail();
  record(v.discovered,['enemyTypes','relics','classes','bosses']);ids(v.discovered.enemyTypes,enemyTypes,enemyTypes.length);ids(v.discovered.relics,C.RIFT_RELICS.map(r=>r.id),C.RIFT_RELICS.length);ids(v.discovered.classes,Object.keys(C.RIFT_CLASSES),Object.keys(C.RIFT_CLASSES).length);ids(v.discovered.bosses,C.RIFT_STAGES.map((_,i)=>i),C.RIFT_STAGES.length);
  if(!Array.isArray(v.recordedIds)||v.recordedIds.length>MAX_RECEIPTS||new Set(v.recordedIds).size!==v.recordedIds.length)fail();v.recordedIds.forEach(runId);if(v.recordedIds.length!==v.totals.runs||v.runs.some(r=>!v.recordedIds.includes(r.runId)))fail();
  if(v.totals.kills<v.runs.reduce((sum,r)=>sum+r.kills,0)||v.totals.gold<v.runs.reduce((sum,r)=>sum+r.stats.goldEarned,0)||v.totals.wins<v.runs.filter(r=>r.state==='won').length)fail();
  return v;
 }
 function storageDefault(storage){return storage===undefined?globalThis.localStorage:storage;}
 function read(storage){const raw=storageDefault(storage).getItem(KEY);if(raw===null)return empty();if(typeof raw!=='string'||raw.length>MAX_BYTES)fail();return validate(JSON.parse(raw));}
 function snapshot(game){
  if(!(game instanceof C.RiftGame)||!['won','lost'].includes(game.state)||game.practice)fail();
  const value={runId:game.runId,startedAt:game.startedAt,endedAt:Math.max(Date.now(),game.startedAt),difficultyId:game.difficultyId,classId:game.classId,state:game.state,score:game.score,level:game.player.level,kills:game.kills,stage:game.stage,time:game.time,stats:Object.fromEntries(statKeys.map(k=>[k,k==='breaks'&&!Object.hasOwn(game.stats,k)?0:game.stats[k]])),relics:[...game.relics],specializationId:game.specializationId};run(value);return value;
 }
 const api={key:KEY,version:VERSION,
  load(storage){try{return read(storage);}catch{return empty();}},
  record(game,storage){try{
   const value=snapshot(game),journal=read(storage);if(journal.recordedIds.includes(value.runId)||journal.recordedIds.length>=MAX_RECEIPTS)return false;
   journal.runs.unshift(value);journal.runs=journal.runs.slice(0,10);journal.recordedIds.push(value.runId);journal.totals.runs++;if(value.state==='won')journal.totals.wins++;journal.totals.kills+=value.kills;journal.totals.gold+=value.stats.goldEarned;
   const discovered=journal.discovered,merge=(key,values)=>discovered[key]=[...new Set([...discovered[key],...values])];merge('classes',[value.classId]);merge('relics',value.relics);
   merge('enemyTypes',C.RIFT_STAGES.slice(0,value.stage+1).flatMap(stage=>stage.enemies));const bosses=C.RIFT_STAGES.map((_,i)=>i).filter(i=>i<value.stage||i===value.stage&&(game.wave===1||value.state==='won'));merge('bosses',bosses);if(bosses.length)merge('enemyTypes',['boss']);
   validate(journal);const encoded=JSON.stringify(journal);if(encoded.length>MAX_BYTES)return false;storageDefault(storage).setItem(KEY,encoded);return true;
  }catch{return false;}},
  clear(storage){try{storageDefault(storage).removeItem(KEY);return true;}catch{return false;}}
 };return Object.freeze(api);
})();
if(typeof module!=='undefined'&&module.exports)module.exports=RiftJournal;
