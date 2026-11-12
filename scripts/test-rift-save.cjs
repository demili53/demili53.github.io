const assert=require('node:assert/strict'),{RiftGame,RIFT_STAGES,RIFT_SPECIALIZATIONS}=require('./rift-core.js'),RiftSave=require('./rift-save.js');
function memory(){const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v)),removeItem:k=>data.delete(k)};}
const storage=memory(),fresh=()=>{const g=new RiftGame('warrior',()=>.4,{difficulty:'normal'});g.start();return g;};
function exact(game,state){assert(RiftSave.save(game,storage),'valid game should save');const restored=RiftSave.load(storage);assert(restored instanceof RiftGame);assert.equal(restored.state,state);const wanted=JSON.parse(JSON.stringify(game));wanted.state=state;assert.deepEqual(JSON.parse(JSON.stringify(restored)),wanted);assert.equal(typeof restored.step,'function');assert.equal(typeof restored.random,'function');return restored;}
let g=fresh();exact(g,'paused');g.pause();g.player.cd.skill=1.72;g.player.inv=.43;g.player.dash=-.01;exact(g,'paused');const loaded=RiftSave.load(storage),frozen=JSON.stringify(loaded);loaded.step(.04,{right:true,attack:true});assert.equal(JSON.stringify(loaded),frozen);loaded.pause();loaded.step(.04);assert(loaded.time>g.time);
for(const classId of ['warrior','mage','brawler','archer','assassin','paladin'])for(const difficulty of ['story','normal','veteran']){const game=new RiftGame(classId,()=>.25,{difficulty});game.start();game.stage=3;game.wave=1;game.spawn();for(let i=0;i<130;i++)game.step(.04,{left:i%20<10,attack:true});if(game.state==='playing')exact(game,'paused');}
g=fresh();g.gainXP(600);g.toggleTalents();g.spendPoint('power');g.spendPoint('flow');g.spendPoint('mastery');g.chooseSpecialization(RIFT_SPECIALIZATIONS.warrior[0].id);g.upgradeSkill('awakening');exact(g,'paused');
g=fresh();g.wave=1;g.spawn();g.bossPattern(g.enemies.find(e=>e.type==='boss'));g.fireEnemyProjectile(g.enemies[0]);g.action('skill');g.hurtEnemy(g.enemies[0],9999);exact(g,'paused');
// All economy and objective fields survive even while drops are still on the floor.
g=fresh();g.coins=130;g.pickupSerial=2;g.pickups=[{id:1,x:320,y:310,kind:'gold',value:12,life:8},{id:2,x:360,y:350,kind:'health',value:20,life:7.5}];g.shopPurchases=['heal'];g.rerollsRemaining=0;g.objective={id:'combo',name:'연속 타격',desc:'콤보를 달성하세요.',target:12,progress:3,complete:false,claimed:false,failed:false,startTime:0,startDamage:0,reward:80};exact(g,'paused');
g=fresh();for(let w=0;w<2;w++){for(const e of g.enemies)g.hurtEnemy(e,9999);g.step(.01);}assert.equal(g.state,'upgrade');exact(g,'upgrade');assert.equal(RiftSave.inspect(storage).stage,0);assert(RiftSave.has(storage));
g.coins=500;g.player.hp-=30;g.player.potions=2;assert(g.buy('heal'));assert(g.buy('potion'));assert(g.buy('training'));assert(g.rerollRelics());const shopping=exact(g,'upgrade');assert(!shopping.buy('training'));assert(!shopping.rerollRelics());assert(shopping.upgrade(shopping.upgradeOptions[0]));assert.equal(shopping.stage,1);
// Traverse the entire expedition through real stage transitions, checkpointing every phase.
let expedition=fresh();const eliteKinds=new Set(),objectiveKinds=new Set();
for(let stage=0;stage<RIFT_STAGES.length;stage++){
 assert.equal(expedition.stage,stage);objectiveKinds.add(expedition.objective.id);assert.equal(expedition.objective.claimed,false);
 for(let wave=0;wave<2;wave++){
  assert.equal(expedition.wave,wave);for(const enemy of expedition.enemies)if(enemy.elite)eliteKinds.add(enemy.elite);
  if(expedition.objective.id==='combo'){for(let i=0;i<expedition.objective.target;i++)expedition.hurtEnemy(expedition.enemies[0],1,0);assert(expedition.objective.complete);}
  const boss=expedition.enemies.find(e=>e.type==='boss');
  if(boss){expedition.hurtEnemy(boss,Math.ceil(boss.maxHp*.6),0);assert(boss.enraged);expedition.bossPattern(boss);}
  expedition.fireEnemyProjectile(expedition.enemies.find(e=>e.hp>0));
  expedition=exact(expedition,'paused');assert(expedition.projectiles.length>0);if(boss)assert(expedition.enemies.find(e=>e.type==='boss').enraged);
  expedition.pause();const elite=expedition.enemies.find(e=>e.elite&&e.hp>0)||expedition.enemies[0];expedition.hurtEnemy(elite,99999);assert(expedition.pickups.length>0);
  expedition.pause();expedition=exact(expedition,'paused');expedition.pause();
  for(const enemy of expedition.enemies)expedition.hurtEnemy(enemy,99999);expedition.step(.01);
 }
 assert(expedition.objective.claimed);assert(expedition.objective.complete);assert.equal(expedition.stats.stagesCleared,stage+1);
 if(stage<RIFT_STAGES.length-1){
  assert.equal(expedition.state,'upgrade');assert(expedition.buy('training'));assert(expedition.rerollRelics());
  expedition=exact(expedition,'upgrade');const earned=expedition.stats.goldEarned;assert.equal(expedition.updateObjective(true),false);assert.equal(expedition.stats.goldEarned,earned);
  assert(!expedition.buy('training'));assert(!expedition.rerollRelics());assert(expedition.upgrade(expedition.upgradeOptions[0]));
 }else{assert.equal(expedition.state,'won');assert.equal(RiftSave.save(expedition,storage),false);}
}
assert.deepEqual([...eliteKinds].sort(),['armored','swift','vampiric']);assert.deepEqual([...objectiveKinds].sort(),['combo','nohit','speed']);
// Failed objectives and perfect-dodge windows retain their exact state after resuming.
let failed=fresh();failed.hitPlayer(1);assert(failed.objective.failed);failed.action('dash');failed=exact(failed,'paused');failed.pause();failed.hitPlayer(10);assert.equal(failed.stats.perfectDodges,1);failed=exact(failed,'paused');
failed.pause();failed.hitPlayer(10);assert.equal(failed.stats.perfectDodges,1);
for(const state of ['ready','won','lost']){g.state=state;assert(!RiftSave.save(g,storage));}g.state='upgrade';assert(RiftSave.save(g,storage));const valid=storage.getItem(RiftSave.key);
function reject(change){const object=JSON.parse(valid);change(object);storage.setItem(RiftSave.key,JSON.stringify(object));assert.equal(RiftSave.load(storage),null);assert.equal(RiftSave.has(storage),false);}
reject(o=>o.version=2);reject(o=>o.data.stage=RIFT_STAGES.length);reject(o=>o.data.wave=3);reject(o=>o.data.state='won');reject(o=>o.data.classId='bad');reject(o=>o.data.player.hp=-1);reject(o=>o.data.player.mp=o.data.player.maxMp+1);reject(o=>o.data.player.x=99999);reject(o=>o.data.player.cd.skill='NaN');reject(o=>o.data.player.level=1.5);reject(o=>o.data.relics=['bogus']);reject(o=>o.data.upgradeOptions=['power','power','vital']);reject(o=>o.data.specializationId='foreign');reject(o=>o.data.skillRanks.skill=4);reject(o=>o.data.player.cd.polluted=1);reject(o=>o.data.effects=Array(101).fill({}));reject(o=>o.data.hazards=[{}]);reject(o=>o.data.step='method override');reject(o=>o.data.player=null);reject(o=>delete o.data.enemies);
reject(o=>o.data.coins=-1);reject(o=>o.data.pickupSerial='2');reject(o=>o.data.rerollsRemaining=2);reject(o=>o.data.shopPurchases=['unknown']);reject(o=>o.data.pickups=[{id:1,x:320,y:310,kind:'unknown',value:1,life:2}]);reject(o=>o.data.objective={id:'combo',name:'x',desc:'x',target:2,progress:3,complete:false,claimed:false,failed:false,startTime:0,startDamage:0,reward:80});reject(o=>o.data.stats={damageDealt:NaN});
for(const key of ['difficultyId','stats','coins','pickupSerial','pickups','shopPurchases','rerollsRemaining','objective'])reject(o=>delete o.data[key]);
const injected=valid.replace('"data":{','"data":{"__proto__":{"polluted":true},');storage.setItem(RiftSave.key,injected);assert.equal(RiftSave.load(storage),null);assert.equal({}.polluted,undefined);
for(const raw of ['{',valid.slice(0,-12),'null','[]','x'.repeat(250000)]){storage.setItem(RiftSave.key,raw);assert.equal(RiftSave.load(storage),null);}
g=fresh();g.player.hp=Infinity;assert(!RiftSave.save(g,storage));g=fresh();g.player.cd.attack=NaN;assert(!RiftSave.save(g,storage));
const blocked={getItem(){throw Error('private');},setItem(){throw Error('quota');},removeItem(){throw Error('private');}};assert(!RiftSave.save(fresh(),blocked));assert.equal(RiftSave.load(blocked),null);assert(!RiftSave.has(blocked));assert(!RiftSave.clear(blocked));assert.equal(RiftSave.inspect(blocked),null);
assert(RiftSave.clear(storage));assert(!RiftSave.has(storage));assert.equal(RiftSave.inspect(storage),null);
// The same non-module script works in a browser global environment without requiring Node.
const fs=require('node:fs'),vm=require('node:vm'),context=vm.createContext({localStorage:memory()});vm.runInContext(fs.readFileSync(require.resolve('./rift-core.js'),'utf8')+'\n'+fs.readFileSync(require.resolve('./rift-save.js'),'utf8')+'\nconst checkpointGame=new RiftGame();checkpointGame.start();this.browserSaved=RiftSave.save(checkpointGame);this.browserLoaded=RiftSave.load().state;',context);assert.equal(context.browserSaved,true);assert.equal(context.browserLoaded,'paused');
console.log('PASS: all six stages, elite/enraged enemies, objectives/loot/shop, exact state/timers, paused resume, growth, effects/hazards/projectiles, malformed/injected/out-of-range checkpoints and unavailable storage');
