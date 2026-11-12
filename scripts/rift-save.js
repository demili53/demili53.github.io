'use strict';
// Versioned local checkpoint storage. Only data fields, never game methods, are restored.
var RiftSave=(()=>{
 const C=typeof module!=='undefined'&&module.exports?require('./rift-core.js'):{RiftGame,RIFT_STAGES,RIFT_CLASSES,RIFT_RELICS,RIFT_BRANCHES,RIFT_SPECIALIZATIONS};
 const KEY='riftBladeRunV1',VERSION=2,MAX_BYTES=240000,states=['playing','paused','talents','upgrade'];
 const actions=['attack','skill','burst','special','ultimate','awakening','dash','potion'];
 const types=['guard','mage','boss','brute','ranger','wraith'];
 const legacyTop=['state','classId','difficultyId','stage','wave','time','score','kills','combo','comboTime','skillPoints','pendingLevelRewards','specializationId','skillRanks','branchRanks','talents','player','enemies','hazards','projectiles','effects','relics','upgradeOptions','stats','coins','pickups','pickupSerial','shopPurchases','rerollsRemaining','objective'];
 const additions=['runId','startedAt','weaponId','weaponRank','routeId','pendingRouteId','shrineChoice','containers','companionId','companionCooldown'];
 const top=[...legacyTop,...additions];
 const passiveKeys=['passiveCharge','passiveReady','passiveCooldown'];
 const enemyAdditions=['fracture','burn','burnTick','burnDamage','stagger','broken','breakGuard'];
 const playerKeys=['classId','specializationId','x','y','hp','maxHp','mp','maxMp','level','xp','damage','face','inv','attack','step','dash','shield','haste','bonusRegen','cd','potions','moving','lastAction','perfectWindow','perfectUsed',...passiveKeys];
 const enemyKeys=['id','x','y','hp','maxHp','type','face','cd','wind','stun','flash','slow','attackX','attackY','patternHazards','pattern','elite','enraged',...enemyAdditions];
 const effectKeys=['x','y','text','color','kind','life','max','classId','specializationId','facing','range','width','comboStep','rank','targetType','seed','actor'];
 const hazardKeys=['x','y','rx','ry','wind','maxWind','life','kind','color','damage','triggered','sourceId'];
 const projectileKeys=['x','y','vx','vy','life','damage','color','kind','sourceId'];
 const statKeys=['damageDealt','damageTaken','maxCombo','perfectDodges','elitesKilled','goldEarned','stagesCleared'];
 const objectiveKeys=['id','name','desc','target','progress','complete','claimed','failed','startTime','startDamage','reward'];
 const own=(o,k)=>Object.hasOwn(o,k);
 const invalid=()=>{throw Error('Invalid checkpoint');};
 function number(n,min=-1e9,max=1e9,int=false){if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||int&&!Number.isInteger(n))invalid();return n;}
 function boolean(v){if(typeof v!=='boolean')invalid();}
 function member(v,values){if(!values.includes(v))invalid();}
 function text(v,max=200){if(typeof v!=='string'||v.length>max)invalid();}
 function color(v){if(typeof v!=='string'||!/^#[\da-f]{6}([\da-f]{2})?$/i.test(v))invalid();}
 function record(v,allowed,required=[]){if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v)))invalid();for(const k of Object.keys(v))if(!allowed.includes(k)||['__proto__','prototype','constructor'].includes(k))invalid();for(const k of required)if(!own(v,k))invalid();return v;}
 function array(v,max=100){if(!Array.isArray(v)||v.length>max)invalid();return v;}
 // Build a fresh plain data tree while rejecting dangerous names, functions and non-finite numbers.
 function clone(v,depth=0){if(depth>8)invalid();if(v===null||typeof v==='boolean')return v;if(typeof v==='number')return number(v,-8640000000000000,8640000000000000);if(typeof v==='string'){text(v,500);return v;}if(Array.isArray(v))return array(v).map(x=>clone(x,depth+1));record(v,Object.keys(v));if(Object.keys(v).length>100)invalid();const out={};for(const [k,value]of Object.entries(v)){if(['__proto__','prototype','constructor'].includes(k))invalid();out[k]=clone(value,depth+1);}return out;}
 function ids(v,available,max=100){array(v,max);if(new Set(v).size!==v.length)invalid();for(const id of v)member(id,available);}
 function ranks(v,keys,max){record(v,keys,keys);for(const k of keys)number(v[k],0,max,true);}
 function entity(v,version=VERSION){record(v,version===1?enemyKeys.filter(k=>!enemyAdditions.includes(k)):enemyKeys,['id','x','y','hp','maxHp','type','face','cd','wind','stun','flash']);number(v.id,0,100000,true);member(v.type,types);number(v.x,0,960);number(v.y,150,540);number(v.maxHp,1,1000000);number(v.hp,-1e9,v.maxHp);member(v.face,[-1,1]);for(const k of ['cd','wind'])number(v[k],-1e8,1000);for(const k of ['stun','flash'])number(v[k],0,1000);if(own(v,'slow'))number(v.slow,0,1000);for(const k of ['attackX','attackY'])if(own(v,k))number(v[k],0,960);if(own(v,'pattern'))number(v.pattern,0,C.RIFT_STAGES.length-1,true);for(const k of ['patternHazards','enraged'])if(own(v,k))boolean(v[k]);if(own(v,'elite')&&v.elite!==null)member(v.elite,['swift','armored','vampiric']);if(version!==1){for(const key of v.type==='boss'?enemyAdditions:enemyAdditions.slice(0,4))if(!own(v,key))invalid();for(const [k,max]of Object.entries({fracture:3,burn:5,burnTick:1,burnDamage:1000,stagger:100,broken:2,breakGuard:4}))if(own(v,k))number(v[k],0,max);}}
 function validate(data,version=VERSION){
  record(data,version===1?legacyTop:top,version===1?legacyTop:top);
  member(data.state,states);member(data.classId,Object.keys(C.RIFT_CLASSES));if(own(data,'difficultyId'))member(data.difficultyId,['story','normal','veteran']);
  number(data.stage,0,C.RIFT_STAGES.length-1,true);number(data.wave,0,1,true);number(data.time,0,1e8);number(data.comboTime,-1e8,1000);
  for(const k of ['score','kills','combo','skillPoints','pendingLevelRewards'])number(data[k],0,1e9,true);
  const specIds=C.RIFT_SPECIALIZATIONS[data.classId].map(s=>s.id);if(data.specializationId!==null)member(data.specializationId,specIds);
  ranks(data.talents,['power','flow','guard','mastery'],3);ranks(data.skillRanks,['skill','burst','special','ultimate','awakening'],3);
  const branches=C.RIFT_BRANCHES[data.classId];ranks(data.branchRanks,branches.map(n=>n.id),1);
  const p=record(data.player,version===1?playerKeys.filter(k=>!passiveKeys.includes(k)):playerKeys,['classId','x','y','hp','maxHp','mp','maxMp','level','xp','damage','face','inv','attack','step','dash','shield','haste','bonusRegen','cd','potions',...(version===1?[]:passiveKeys)]);
  if(p.classId!==data.classId)invalid();if((own(p,'specializationId')||data.specializationId!==null)&&p.specializationId!==data.specializationId)invalid();
  number(p.x,35,925);number(p.y,245,465);number(p.maxHp,1,100000);number(p.hp,Number.MIN_VALUE,p.maxHp);number(p.maxMp,1,100000);number(p.mp,0,p.maxMp);number(p.level,1,1000,true);number(p.xp,0,1000000);number(p.damage,1,100000);member(p.face,[-1,1]);number(p.step,0,3,true);number(p.potions,0,5,true);
  for(const k of ['inv','attack','shield','haste','bonusRegen'])number(p[k],0,1000);number(p.dash,-.05,1);
  if(own(p,'moving'))boolean(p.moving);if(own(p,'lastAction'))member(p.lastAction,actions);if(own(p,'perfectWindow'))number(p.perfectWindow,0,1);if(own(p,'perfectUsed'))boolean(p.perfectUsed);
  record(p.cd,actions,actions);for(const k of actions)number(p.cd[k],0,1000);
  if(data.specializationId!==null&&p.level<5)invalid();
  for(const n of branches)if(data.branchRanks[n.id]&&(p.level<n.level||n.parent&&!data.branchRanks[n.parent]))invalid();
  if(data.talents.mastery>0&&data.talents.power+data.talents.flow+data.talents.guard<2)invalid();
  for(const [name,rank]of Object.entries(data.skillRanks))if(rank&&p.level<rank*2||name==='awakening'&&rank&&!data.specializationId)invalid();
  const relicIds=C.RIFT_RELICS.map(r=>r.id);ids(data.relics,relicIds,C.RIFT_STAGES.length);ids(data.upgradeOptions,relicIds,3);
  if(data.upgradeOptions.some(id=>data.relics.includes(id)))invalid();
  if(data.state==='upgrade'&&(data.stage>=C.RIFT_STAGES.length-1||data.wave!==1||data.upgradeOptions.length!==3))invalid();
  const enemies=array(data.enemies,40);enemies.forEach(e=>entity(e,version));if(new Set(enemies.map(e=>e.id)).size!==enemies.length)invalid();if(data.state==='upgrade'&&enemies.some(e=>e.hp>0))invalid();
  for(const h of array(data.hazards)){record(h,hazardKeys,['x','y','rx','ry','wind','maxWind','life','kind','color','damage','triggered']);number(h.x,0,960);number(h.y,150,540);number(h.rx,1,1000);number(h.ry,1,1000);number(h.maxWind,.01,100);number(h.wind,0,h.maxWind);number(h.life,0,100);member(h.kind,['slam','rune','flame','poison','frost','rift','charge']);color(h.color);number(h.damage,0,100000);boolean(h.triggered);if(own(h,'sourceId')&&h.sourceId!==null)number(h.sourceId,0,100000,true);}
  for(const b of array(data.projectiles)){record(b,projectileKeys,['x','y','vx','life']);number(b.x,-1000,2000);number(b.y,-1000,2000);number(b.vx,-10000,10000);if(own(b,'vy'))number(b.vy,-10000,10000);number(b.life,0,100);if(own(b,'kind'))member(b.kind,['arrow','orb']);if(own(b,'color'))color(b.color);if(own(b,'damage'))number(b.damage,0,100000);if(own(b,'sourceId')&&b.sourceId!==null)number(b.sourceId,0,100000,true);}
  for(const e of array(data.effects)){record(e,effectKeys,['x','y','text','color','kind','life','max']);number(e.x,-5000,5000);number(e.y,-5000,5000);text(e.text);color(e.color);member(e.kind,['text','hit','death','dash','levelup','attack','skill','burst','special','ultimate','awakening']);number(e.max,.001,100);number(e.life,0,e.max);if(own(e,'classId'))member(e.classId,Object.keys(C.RIFT_CLASSES));if(own(e,'specializationId')&&e.specializationId!==null)member(e.specializationId,C.RIFT_SPECIALIZATIONS[e.classId||data.classId].map(s=>s.id));if(own(e,'facing'))member(e.facing,[-1,1]);for(const k of ['range','width'])if(own(e,k))number(e[k],0,2000);if(own(e,'comboStep'))number(e.comboStep,0,3,true);if(own(e,'rank'))number(e.rank,0,3,true);if(own(e,'targetType'))member(e.targetType,types);if(own(e,'seed'))number(e.seed,0,1e9);if(own(e,'actor'))entity(e.actor,version);}
  if(own(data,'stats')){const keys=version===1?statKeys:[...statKeys,'breaks'];record(data.stats,keys,keys);for(const k of keys)number(data.stats[k],0,1e9);if(version!==1)number(data.stats.breaks,0,1e9,true);}
  if(own(data,'coins'))number(data.coins,0,1e9,true);
  if(own(data,'pickupSerial'))number(data.pickupSerial,0,1e9,true);
  if(own(data,'rerollsRemaining'))number(data.rerollsRemaining,0,1,true);
  if(own(data,'pickups'))for(const item of array(data.pickups)){record(item,['id','x','y','kind','value','life'],['id','x','y','kind','value','life']);number(item.id,0,1e9,true);number(item.x,0,960);number(item.y,150,540);member(item.kind,['health','mana','gold']);number(item.value,1,100000);number(item.life,0,1000);}
  if(own(data,'pickups')&&(new Set(data.pickups.map(p=>p.id)).size!==data.pickups.length||own(data,'pickupSerial')&&data.pickups.some(p=>p.id>data.pickupSerial)))invalid();
  if(own(data,'shopPurchases'))ids(data.shopPurchases,['heal','potion','training'],3);
  if(own(data,'objective')&&data.objective!==null){const o=record(data.objective,objectiveKeys,objectiveKeys);member(o.id,['nohit','speed','combo']);text(o.name,80);text(o.desc);number(o.target,1,1e6);number(o.progress,0,o.target);for(const k of ['complete','claimed','failed'])boolean(o[k]);number(o.startTime,0,data.time);number(o.startDamage,0,1e9);number(o.reward,0,100000,true);}
  if(version!==1){
   if(typeof data.runId!=='string'||! /^[a-z\d_-]{8,100}$/i.test(data.runId))invalid();number(data.startedAt,1,8640000000000000,true);
   member(data.weaponId,[null,'edge','focus','ward']);number(data.weaponRank,0,3,true);if((data.weaponId===null)!==(data.weaponRank===0))invalid();
   for(const k of ['routeId','pendingRouteId'])member(data[k],['standard','sanctuary','treasure','hunt']);member(data.shrineChoice,[null,'mercy','sacrifice','wisdom']);member(data.companionId,[null,'wisp','sprite','sentinel']);number(data.companionCooldown,0,7);
   number(p.passiveCharge,0,5);boolean(p.passiveReady);number(p.passiveCooldown,0,4);
   for(const item of array(data.containers,2)){record(item,['id','x','y','hp','maxHp','kind','opened'],['id','x','y','hp','maxHp','kind','opened']);number(item.id,0,51,true);number(item.x,0,960);number(item.y,150,540);number(item.maxHp,1,100000);number(item.hp,0,item.maxHp);member(item.kind,['barrel','urn','chest']);boolean(item.opened);if(item.opened&&item.hp!==0)invalid();}
   if(new Set(data.containers.map(item=>item.id)).size!==data.containers.length)invalid();
  }
  return data;
 }
 function migrate(data,savedAt){
  let hash=2166136261;for(const ch of JSON.stringify(data))hash=Math.imul(hash^ch.charCodeAt(0),16777619)>>>0;
  Object.assign(data,{runId:'legacy-'+savedAt.toString(36)+'-'+hash.toString(36),startedAt:Math.max(1,savedAt-Math.round(data.time*1000)),weaponId:null,weaponRank:0,routeId:'standard',pendingRouteId:'standard',shrineChoice:null,containers:[],companionId:null,companionCooldown:0});
  Object.assign(data.player,{passiveCharge:0,passiveReady:false,passiveCooldown:0});data.stats.breaks=0;
  for(const enemy of [...data.enemies,...data.effects.filter(e=>e.actor).map(e=>e.actor)])for(const key of enemyAdditions)enemy[key]=0;
  return validate(data);
 }
 function storageOrDefault(storage){return storage===undefined?globalThis.localStorage:storage;}
 function snapshot(game){if(!(game instanceof C.RiftGame)||!states.includes(game.state)||game.practice)invalid();const data={};for(const key of Object.keys(game)){if(key==='random')continue;if(!top.includes(key))invalid();data[key]=clone(game[key]);}return validate(data);}
 function read(storage){const raw=storageOrDefault(storage).getItem(KEY);if(typeof raw!=='string'||raw.length>MAX_BYTES)return null;const envelope=JSON.parse(raw);record(envelope,['version','savedAt','summary','data'],['version','savedAt','data']);if(![1,VERSION].includes(envelope.version))invalid();number(envelope.savedAt,0,8640000000000000,true);let data=validate(clone(envelope.data),envelope.version);if(own(envelope,'summary')){const expected=summary(data,envelope.savedAt),keys=Object.keys(expected);record(envelope.summary,keys,keys);for(const key of keys)if(envelope.summary[key]!==expected[key])invalid();}if(envelope.version===1)data=migrate(data,envelope.savedAt);return{data,savedAt:envelope.savedAt};}
 function summary(data,savedAt){return{classId:data.classId,stage:data.stage,level:data.player.level,difficultyId:data.difficultyId||'normal',savedAt};}
 const api={key:KEY,version:VERSION,
  save(game,storage){try{const data=snapshot(game),savedAt=Date.now(),encoded=JSON.stringify({version:VERSION,savedAt,summary:summary(data,savedAt),data});if(encoded.length>MAX_BYTES)return false;storageOrDefault(storage).setItem(KEY,encoded);return true;}catch{return false;}},
  load(storage){try{const saved=read(storage);if(!saved)return null;const data=saved.data,game=new C.RiftGame(data.classId,Math.random,{difficulty:data.difficultyId||'normal'});for(const key of top)if(own(data,key))game[key]=data[key];game.state=data.state==='upgrade'?'upgrade':'paused';return game;}catch{return null;}},
  clear(storage){try{storageOrDefault(storage).removeItem(KEY);return true;}catch{return false;}},
  has(storage){return api.load(storage)!==null;},
  inspect(storage){try{const saved=read(storage);return saved?summary(saved.data,saved.savedAt):null;}catch{return null;}}
 };return Object.freeze(api);
})();
if(typeof module!=='undefined'&&module.exports)module.exports=RiftSave;
