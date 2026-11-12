const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const source = html.match(/<script id="gameLogic">([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({});
vm.runInContext(source + '\nthis.Game = BastionGame;', context);
const fresh = () => new context.Game(() => .5);
let g = fresh();
g.state = 'building';
assert.equal(g.build(0, 'arrow'), true);
assert.equal(g.gold, 60);
assert.equal(g.build(0, 'cannon'), false);
assert.equal(g.build(1, 'cannon'), false);
assert.equal(g.upgrade(0), true);
assert.equal(g.gold, 0);
g.step(1); assert.equal(g.time, .05);
g.gold = 120; assert.equal(g.upgrade(0), true);
assert.equal(g.upgrade(0), false);
assert.equal(g.sell(0), true); assert.equal(g.gold, 144);
g.core = 270; assert.equal(g.repair(), true); assert.equal(g.core, 300);
assert.equal(g.repair(), false);
g.state = 'running'; assert.equal(g.build(0, 'arrow'), false);
g.step(.05, { x: 1, y: 0 }); assert.ok(g.player.x > 360);
g.state = 'paused'; const time = g.time; g.step(.05); assert.equal(g.time, time);

// Actual projectile combat awards currency once, including when two attacks hit.
g = fresh(); g.state = 'running'; g.spawned = g.spawnLimit;
g.enemies.push({id:1,x:380,y:420,hp:5,maxHp:5,r:12,speed:0,slow:0,cd:1});
for(let i=0;i<10;i++) g.step(.05);
assert.equal(g.kills,1); assert.equal(g.gold,128); assert.equal(g.score,25);
// Frost applies area damage and slow; a cannon hits multiple nearby enemies.
g = fresh(); g.state='building'; g.gold=1000; g.build(0,'frost'); g.state='running'; g.spawned=g.spawnLimit;
g.enemies.push({id:1,x:360,y:180,hp:100,maxHp:100,r:12,speed:0,slow:0,cd:1});
g.step(.05); assert.ok(g.enemies[0].hp<100); assert.ok(g.enemies[0].slow>0);
g = fresh(); g.state='running'; g.spawned=g.spawnLimit;
const enemy=(id,x)=>({id,x,y:100,hp:20,maxHp:20,r:12,speed:0,slow:0,cd:1});
g.enemies=[enemy(1,100),enemy(2,125)]; g.fire({x:100,y:100},g.enemies[0],30,0,65); g.step(.05);
assert.equal(g.kills,2);
for(const cause of ['core','player']){g=fresh();g.state='running';if(cause==='core')g.core=0;else g.player.hp=0;g.step(.05);assert.equal(g.state,'lost');}
g=fresh(); g.state='running'; g.spawned=g.spawnLimit; g.waveTime=28; g.step(.05); assert.equal(g.wave,2); assert.equal(g.gold,180);
assert.equal(g.state,'reward'); assert.equal(g.offers.length,3); g.chooseReward(g.offers[0]); g.state='running';
g.wave=10;g.waveTime=28;g.spawned=g.spawnLimit;g.enemies=[];g.step(.05);assert.equal(g.state,'won');
g=fresh();g.state='running';g.wave=4;g.spawned=g.spawnLimit-1;g.step(.05);assert.equal(g.enemies[0].boss,true);
// Repeated long combat remains bounded, with no invalid coordinates.
g=fresh();g.state='building';g.gold=10000;for(let i=0;i<8;i++){g.build(i,['arrow','cannon','frost'][i%3]);g.upgrade(i);g.upgrade(i);}g.state='running';
for(let i=0;i<12000&&!['won','lost'].includes(g.state);i++){if(g.state==='reward'){g.chooseReward(g.offers[0]);g.state='running';}g.step(.05);assert.ok(g.enemies.length<=150);assert.ok(g.shots.length<=180);assert.ok(g.effects.length<=100);assert.ok(Number.isFinite(g.player.x));}
assert.ok(g.wave>1);
console.log('PASS: building economy, upgrades, repair, pause, movement, combat rewards, AoE, slow, waves, bosses, win/loss, bounds');

// Visual effects regression checks.
{
const Game = context.Game;
const game = new Game(() => .5);
game.state = 'running';
game.spawnClock = 100;
game.player.cd = 100;
game.spawn();
const enemy = game.enemies[0];
enemy.x = 400;
enemy.y = 360;
game.damage(enemy, 1);
assert.equal(enemy.hit, .12);
assert.equal(game.effects.at(-1).kind, 'hit');
game.damage(enemy, 1000);
assert.equal(game.kills, 1);
assert.equal(game.effects.at(-1).kind, 'death');
game.damage(enemy, 1000);
assert.equal(game.kills, 1, 'Dead enemies cannot grant duplicate rewards');

game.coreHit = .35;
for (const state of ['paused', 'reward']) {
  game.state = state;
  const before = JSON.stringify(game);
  game.step(.05);
  assert.equal(JSON.stringify(game), before, 'Effects and combat freeze together');
}
game.state = 'running';
game.step(.05);
assert(game.coreHit < .35);
for (let i = 0; i < 300; i++) game.emit('muzzle', 1, 1, 1, 0xffffff, .1);
assert.equal(game.effects.length, 100);
for (let i = 0; i < 3; i++) game.step(.05);
assert.equal(game.effects.length, 0);
assert.equal(game.effectPool.length, 100);
for (let i = 0; i < 300; i++) game.emit('muzzle', 1, 1, 1, 0xffffff, .1);
assert.equal(game.effects.length + game.effectPool.length, 100, 'Effect storage remains bounded');

for (const type of ['arrow', 'cannon', 'frost']) {
  const g = new Game(() => .5);
  g.state = 'building';
  assert(g.build(0, type));
  g.state = 'running';
  g.spawnClock = 100;
  g.player.cd = 100;
  g.spawn();
  Object.assign(g.enemies[0], { x: g.slots[0].x + 25, y: g.slots[0].y, hp: 1000, maxHp: 1000 });
  g.step(.05);
  if (type === 'frost') {
    assert(g.effects.some(f => f.kind === 'frost'));
    assert(g.enemies[0].slow > 0);
  } else {
    assert(g.effects.some(f => f.kind === (type==='cannon'?'cannonMuzzle':'muzzle')));
    for (let i = 0; i < 5; i++) g.step(.05);
    if (type === 'cannon') assert(g.effects.some(f => f.kind === 'explosion'));
  }
}
const core = new Game(() => .5);
core.state = 'running';
core.spawnClock = 100;
core.player.x = 600;
core.player.y = 600;
core.spawn();
Object.assign(core.enemies[0], { x: 360, y: 360 });
core.step(.05);
assert.equal(core.core, 293);
assert.equal(core.coreHit, .35);
const fresh = new Game();
assert.equal(fresh.effects.length, 0);
assert.equal(fresh.coreHit, 0);
console.log('PASS: hit/death rewards, pause/reward freeze, effect pool cap/reuse, three tower effects, core damage and reset');
}

// Aim updates between shots, while recoil and facing share the combat clock.
for (const type of ['arrow', 'cannon']) {
  const model = fresh();
  model.state = 'building'; model.gold = 500; model.build(0, type);
  const slot = model.slots[0], tower = slot.tower;
  model.state = 'running'; model.spawnClock = 100; model.player.cd = 100;
  model.spawn();
  const target = model.enemies[0];
  Object.assign(target, { x: slot.x + 100, y: slot.y, hp: 10000, speed: 0 });
  model.step(.05);
  assert.equal(tower.angle, 0);
  assert.equal(tower.recoil, .16);
  assert.equal(model.shots[0].x, slot.x + 21, 'Projectile simulation origin/speed are unchanged');
  const flash = model.effects.find(f => f.kind === (type==='cannon'?'cannonMuzzle':'muzzle'));
  assert.equal(flash.x, slot.x + (type === 'cannon' ? 22 : 27));
  const count = model.shots.length;
  target.x = slot.x; target.y = slot.y + 100;
  model.step(.05);
  assert.equal(tower.angle, Math.PI / 2, 'Tracking continues during cooldown');
  assert(tower.recoil < .16);
  assert.equal(model.shots.length, count, 'Tracking does not create extra attacks');
  for (const state of ['paused', 'reward']) {
    model.state = state;
    const snapshot = JSON.stringify(model);
    model.step(.05);
    assert.equal(JSON.stringify(model), snapshot);
  }
  model.state = 'running'; model.enemies = []; model.spawnClock = 100;
  for (let i = 0; i < 5; i++) model.step(.05);
  assert.equal(tower.recoil, 0);
  assert.equal(tower.angle, Math.PI / 2, 'No target retains the last direction');
  model.state = 'building'; model.sell(0); model.build(0, type);
  assert.equal(slot.tower.recoil, 0);
  assert.equal(slot.tower.angle, -Math.PI / 2);
}
console.log('PASS: tracking during cooldown, recoil/reset, muzzle alignment, unchanged projectile travel, pause/reward freeze');

// Reward choices are unique, pause combat, apply once, and respect stack limits.
{
 const model=fresh();model.state='running';model.spawned=model.spawnLimit;model.waveTime=28;model.step(.05);
 assert.equal(model.state,'reward');assert.equal(new Set(model.offers).size,3);
 const before=JSON.stringify(model);model.step(.05);assert.equal(JSON.stringify(model),before);
 assert.equal(model.chooseReward('invalid'),false);const id=model.offers[0];assert(model.chooseReward(id));assert.equal(model.state,'running');assert.equal(model.perks[id],1);assert.equal(model.chooseReward(id),false);
 for(const perk of ['power','haste','range','guardian'])model.perks[perk]=3;
 model.offerReward();assert(model.offers.every(x=>['supply','restore'].includes(x)));assert(model.chooseReward('supply'));assert.equal(model.gold,250);
 model.core=250;model.player.hp=90;model.offerReward();assert(model.chooseReward('restore'));assert.equal(model.core,300);assert.equal(model.player.hp,100);
}
// Five chained kills grant exactly one bonus, pause preserves the timer, and expiry resets it.
{
 const model=fresh();model.state='running';model.spawnClock=100;model.player.cd=100;
 const killed=[];for(let i=0;i<5;i++){const e={hp:1,x:0,y:0,r:12};killed.push(e);model.damage(e,1);}
 assert.equal(model.combo,5);assert.equal(model.bestCombo,5);assert.equal(model.gold,172);
 model.damage(killed[4],100);assert.equal(model.gold,172);
 model.state='building';model.step(.05);assert.equal(model.comboLeft,2.95);model.state='paused';model.step(.05);assert.equal(model.comboLeft,2.95);
 model.state='running';for(let i=0;i<61;i++)model.step(.05);assert.equal(model.combo,0);
 model.damage({hp:1,x:0,y:0,r:12},1);assert.equal(model.combo,1);assert.equal(model.bestCombo,5);
 assert.equal(fresh().bestCombo,0);assert.equal(fresh().perks.power,0);
}
// Perks affect real attack damage, cooldown, and target range, including newly built towers.
{
 const model=fresh();model.perks.power=1;model.perks.haste=1;model.perks.range=1;model.state='building';model.build(0,'arrow');model.state='running';model.spawnClock=100;model.player.cd=100;model.spawn();
 Object.assign(model.enemies[0],{x:540,y:215,hp:1000,speed:0});model.step(.05);
 assert.equal(model.shots.length,1);assert.equal(model.shots[0].damage,15*1.15);assert.equal(model.slots[0].tower.cd,.55*.9);
 const player=fresh();player.perks.guardian=1;player.state='running';player.spawnClock=100;player.spawn();Object.assign(player.enemies[0],{x:460,y:420,hp:1000,speed:0});player.step(.05);assert.equal(player.shots[0].damage,22*1.2);
}
// Every non-final wave offers one reward; the tenth ends directly in victory.
{
 const model=fresh();model.state='running';for(let wave=1;wave<=10;wave++){
 model.spawned=model.spawnLimit;model.waveTime=28;model.enemies=[];model.step(.05);
 if(wave<10){assert.equal(model.state,'reward');assert(model.chooseReward(model.offers[0]));model.state='running';}else assert.equal(model.state,'won');
 }
 assert.equal(Object.values(model.perks).reduce((a,b)=>a+b,0),9);
}
console.log('PASS: reward lifecycle/caps, combo rewards/timers, real perk effects, nine rewards and final victory');

// Modes differ in movement, spawning, damage, rewards and final wave.
{
 const make=mode=>new context.Game(()=>.5,mode);
 const classic=make('classic'),rush=make('rush'),siege=make('siege');
 assert.equal(make('unknown').mode,'classic');
 assert.equal(rush.gold,150);assert.equal(rush.spawnLimit,18);assert.equal(siege.gold,300);
 for(const m of [classic,rush,siege]){m.state='running';m.spawnClock=100;m.step(.05,{x:1,y:0});}
 assert(rush.player.x>classic.player.x);assert.equal(siege.player.x,360);
 classic.spawn();rush.spawn();assert.equal(rush.enemies[0].speed,classic.enemies[0].speed*1.25);
 siege.enemies=[{id:1,x:360,y:420,hp:1000,maxHp:1000,r:12,speed:25,slow:0,cd:0}];
 siege.step(.05);assert.equal(siege.shots.length,0);assert.equal(siege.player.hp,100);assert(siege.enemies[0].y<420,'Enemies head to the core even near the guardian');
 siege.offerReward();assert(!siege.offers.includes('guardian'));
 siege.state='building';siege.build(0,'arrow');siege.state='running';siege.enemies[0].x=450;siege.enemies[0].y=215;siege.step(.05);assert.equal(siege.shots[0].damage,15*1.25);
 for(const mode of ['classic','rush','siege']){
   const m=make(mode);m.state='running';let rewards=0;
   for(let wave=1;wave<=m.rules.waves;wave++){
     m.spawned=m.spawnLimit;m.waveTime=m.rules.waveSeconds;m.enemies=[];m.step(.05);
     if(wave<m.rules.waves){assert.equal(m.state,'reward');m.chooseReward(m.offers[0]);m.state='running';rewards++;}else assert.equal(m.state,'won');
   }
   assert.equal(rewards,m.rules.waves-1);
   for(const wave of m.rules.bosses){const boss=make(mode);boss.state='running';boss.wave=wave;boss.spawned=boss.spawnLimit-1;boss.step(.05);assert(boss.enemies[0].boss);}
 }
}
console.log('PASS: three modes, spawn/movement differences, tower-only rules, valid rewards, mode-specific bosses and victory');

// Active ability: correct radius, boss resistance, single-hit rewards and combat-only cooldown.
for(const mode of ['classic','rush','siege']){
 const m=new context.Game(()=>.5,mode);m.state='running';m.spawnClock=100;m.player.cd=100;
 assert.equal(m.castShockwave(),false);assert.equal(m.shockwaveCd,0);
 const enemy=(x,hp=200,boss=false)=>({id:x,x,y:360,hp,maxHp:hp,boss,r:12,speed:0,slow:0,cd:100});
 const normal=enemy(460),boss=enemy(500,500,true),edge=enemy(580),outside=enemy(581),dead=enemy(390,0),kill=enemy(400,10);
 m.enemies=[normal,boss,edge,outside,dead,kill];assert(m.castShockwave());
 assert.equal(normal.hp,160);assert.equal(normal.x,515);assert.equal(normal.slow,2);
 assert.equal(boss.hp,460);assert.equal(boss.x,518);assert.equal(edge.hp,160);assert.equal(outside.hp,200);
 assert.equal(m.kills,1);assert.equal(m.shockwaveCd,18);assert(m.effects.some(f=>f.kind==='shockwave'));
 assert.equal(m.castShockwave(),false);assert.equal(m.kills,1);
 for(const state of ['idle','paused','reward','won','lost']){m.state=state;const before=JSON.stringify(m);assert.equal(m.castShockwave(),false);m.step(.05);assert.equal(JSON.stringify(m),before);}
 m.state='running';m.enemies=[];m.spawnClock=100;for(let i=0;i<361;i++)m.step(.05);assert.equal(m.shockwaveCd,0);
 assert.equal(new context.Game(()=>.5,mode).shockwaveCd,0);
}
// Perfect defense tracks actual damage, not net health after a repair.
{
 const damaged=fresh();damaged.state='running';damaged.spawnClock=100;damaged.player.x=600;damaged.player.y=600;damaged.spawn();Object.assign(damaged.enemies[0],{x:360,y:360,speed:0});damaged.step(.05);
 assert.equal(damaged.waveCoreDamage,7);damaged.state='building';damaged.repair();assert.equal(damaged.core,300);assert.equal(damaged.waveCoreDamage,7);
 damaged.state='running';damaged.enemies=[];damaged.spawned=damaged.spawnLimit;damaged.waveTime=damaged.rules.waveSeconds;const gold=damaged.gold;damaged.step(.05);
 assert.equal(damaged.lastWavePerfect,false);assert.equal(damaged.perfectWaves,0);assert.equal(damaged.gold,gold+35);assert.equal(damaged.waveCoreDamage,0);
 const perfect=fresh();perfect.state='running';perfect.spawned=perfect.spawnLimit;perfect.waveTime=perfect.rules.waveSeconds;perfect.step(.05);
 assert.equal(perfect.lastWavePerfect,true);assert.equal(perfect.perfectWaves,1);assert.equal(perfect.gold,180);const reward=perfect.gold;perfect.step(.05);assert.equal(perfect.gold,reward);
 perfect.chooseReward(perfect.offers[0]);perfect.state='running';perfect.wave=perfect.rules.waves;perfect.spawned=perfect.spawnLimit;perfect.waveTime=perfect.rules.waveSeconds;perfect.step(.05);
 assert.equal(perfect.state,'won');assert.equal(perfect.perfectWaves,2);const final=perfect.gold;perfect.step(.05);assert.equal(perfect.gold,final);
 assert.equal(fresh().perfectWaves,0);assert.equal(fresh().waveCoreDamage,0);
}
console.log('PASS: shockwave radius/damage/knockback, boss resistance, state guards, cooldown freeze/reset and perfect-defense rewards');

// Character feedback shares combat time, resets on a new run, and cannot duplicate combat rewards.
{
 const model=fresh();model.state='running';model.spawnClock=100;
 model.spawn();const target=model.enemies[0];Object.assign(target,{x:450,y:420,hp:1000,maxHp:1000,speed:0});
 model.fire(model.player,target,10,0xffe6b3);assert.equal(model.player.attack,.15);assert.equal(model.player.aim,0);
 model.step(.05);assert(model.player.attack>0&&model.player.attack<=.15);
 model.state='paused';const attack=model.player.attack;model.step(.05);assert.equal(model.player.attack,attack);
 model.state='running';model.player.cd=100;for(let i=0;i<4;i++)model.step(.05);assert.equal(model.player.attack,0);
 const boss={hp:1,x:100,y:100,r:23,boss:true};const before=model.score;model.damage(boss,1);assert.equal(model.score,before+500);assert(model.effects.some(f=>f.kind==='bossDeath'));
 model.damage(boss,1);assert.equal(model.score,before+500);
 model.kills=model.nextLevel-1;model.damage({hp:1,x:100,y:100,r:12},1);assert(model.effects.some(f=>f.kind==='levelup'));
 assert.equal(fresh().player.attack,0);assert.equal(fresh().player.aim,0);
 const siege=new context.Game(()=>.5,'siege');siege.kills=siege.nextLevel-1;siege.damage({hp:1,x:100,y:100,r:12},1);const levelup=siege.effects.find(f=>f.kind==='levelup');assert.equal(levelup.x,360);assert.equal(levelup.y,360);
}
console.log('PASS: character attack feedback timing, boss death and level-up effects, no duplicate rewards and mode-aware feedback reset');

// Damage popups report actual health removed, and enemy attack poses obey pause.
{
 const model=fresh();const enemy={hp:7,x:200,y:200,r:12};model.damage(enemy,100);
 assert.equal(model.effects.find(f=>f.kind==='damageText').r,7);
 const count=model.effects.length;model.damage(enemy,100);assert.equal(model.effects.length,count);
 assert.equal(new Set(model.effects.map(f=>f.serial)).size,model.effects.length);
 model.state='running';model.spawnClock=100;model.player.cd=100;model.spawn();Object.assign(model.enemies[0],{x:model.player.x,y:model.player.y,hp:500});model.step(.05);assert.equal(model.enemies[0].attack,.18);
 model.state='paused';const before=JSON.stringify(model);model.step(.05);assert.equal(JSON.stringify(model),before);
}
// Atlas frames must fit the unmodified PNG and contain all four poses for every role.
{
 const path=require('node:path'),dir=path.join(__dirname,'../assets/games/dawn-bastion');
 const atlas=JSON.parse(fs.readFileSync(path.join(dir,'characters-v2.json'),'utf8'));
 const png=fs.readFileSync(path.join(dir,'characters-v2.png'));
 const width=png.readUInt32BE(16),height=png.readUInt32BE(20);
 for(const type of ['player','enemy','runner','boss'])for(let pose=0;pose<4;pose++){
   const f=atlas.frames[type+'-'+pose].frame;assert(f.w>0&&f.h>0);assert(f.x>=0&&f.y>=0&&f.x+f.w<=width&&f.y+f.h<=height);
 }
 assert.equal(Object.keys(atlas.frames).length,16);
}
console.log('PASS: damage popup values, enemy pose pause, unique effect identifiers, 16 atlas frames within PNG bounds');

// New weapons use distinct geometric damage rules; cosmetic effects do not replace real hits.
{
 const setup=(type,level=1)=>{const m=fresh();m.state='building';m.gold=10000;m.build(0,type);while(m.slots[0].tower.level<level)m.upgrade(0);m.state='running';m.spawnClock=100;m.player.x=650;m.player.y=650;m.player.cd=100;return m;};
 const target=(id,x,y,hp=1000)=>({id,x,y,hp,maxHp:hp,r:12,boss:false,speed:0,slow:0,cd:100,attack:0,hit:0});
 const hp=m=>m.enemies.map(e=>e.hp);
 const laser=setup('laser');laser.enemies=[target(1,460,215),target(2,530,215),target(3,510,255),target(4,160,215)];laser.step(.05);
 assert.deepEqual(hp(laser),[958,958,1000,1000]);assert(laser.effects.some(f=>f.kind==='laser'));assert.equal(laser.shots.length,0);
 const wide=setup('laser',3);wide.enemies=[target(1,460,215),target(2,510,234)];wide.step(.05);assert(wide.enemies[1].hp<1000);
 const narrow=setup('laser');narrow.enemies=[target(1,460,215),target(2,510,234)];narrow.step(.05);assert.equal(narrow.enemies[1].hp,1000);
 for(const level of [1,3]){const chain=setup('tesla',level);chain.enemies=Array.from({length:5},(_,i)=>target(i+1,430+i*70,215));chain.step(.05);const limit=2+level;for(let i=0;i<5;i++)assert(Math.abs(chain.enemies[i].hp-(i<limit?1000-24*(1+(level-1)*.65)*Math.pow(.75,i):1000))<1e-8);assert.equal(chain.effects.filter(f=>f.kind==='lightning').length,limit);}
 const isolated=setup('tesla');isolated.enemies=[target(1,440,215),target(2,560,215)];isolated.step(.05);assert.equal(isolated.enemies[1].hp,1000,'Chain cannot bridge a gap greater than 110');
 const flame=setup('flame');flame.enemies=[target(1,450,215),target(2,460,240),target(3,460,295),target(4,520,215)];flame.step(.05);
 assert.deepEqual(hp(flame),[992,992,1000,1000]);assert.equal(flame.enemies[0].burnTime,2);assert(flame.effects.some(f=>f.kind==='flame'));
 flame.slots[0].tower.cd=100;
 for(const state of ['paused','reward']){flame.state=state;const before=JSON.stringify(flame);flame.step(.05);assert.equal(JSON.stringify(flame),before);}
 flame.state='running';for(let i=0;i<40;i++)flame.step(.05);assert.equal(flame.enemies[0].hp,976);assert.equal(flame.enemies[0].burnTime,0);
 for(let i=0;i<20;i++)flame.step(.05);assert.equal(flame.enemies[0].hp,976,'Burn expires after four half-second ticks');
 const refresh=setup('flame');refresh.enemies=[target(1,450,215)];refresh.step(.05);for(let i=0;i<7;i++)refresh.step(.05);assert(refresh.enemies[0].burnTick<.2,'Repeated hits preserve the pending burn tick');
 const kills=setup('tesla');kills.enemies=[target(1,430,215,1),target(2,500,215,1),target(3,570,215,1)];kills.step(.05);assert.equal(kills.kills,3);kills.step(.05);assert.equal(kills.kills,3);
 for(const type of ['laser','tesla','flame'])for(const mode of ['classic','rush','siege']){const m=new context.Game(()=>.5,mode);m.state='building';m.gold=1000;assert(m.build(0,type));assert(m.upgrade(0));assert(m.upgrade(0));assert.equal(m.upgrade(0),false);assert(m.sell(0));assert.equal(m.slots[0].tower,null);}
 const budget=fresh();for(let i=0;i<100;i++)budget.damage(target(i,100,100),1);budget.emit('laser',100,100,200,0xff739f,.3);assert(budget.effects.filter(f=>f.kind==='damageText').length<=18);assert(budget.effects.some(f=>f.kind==='laser'));assert(budget.effects.length<=100);
 const stress=fresh();stress.state='building';stress.gold=10000;for(let i=0;i<8;i++){stress.build(i,['arrow','cannon','frost','laser','tesla','flame'][i%6]);stress.upgrade(i);stress.upgrade(i);}stress.state='running';
 for(let i=0;i<12000&&!['won','lost'].includes(stress.state);i++){if(stress.state==='reward'){stress.chooseReward(stress.offers[0]);stress.state='running';}stress.step(.05);assert(stress.effects.length<=100);assert(stress.shots.length<=180);for(const e of stress.enemies)assert(Number.isFinite(e.hp)&&Number.isFinite(e.x)&&Number.isFinite(e.y));}
 assert(stress.wave>1);
}
console.log('PASS: laser penetration/width, chain limits/falloff/gap, flame cone/burn/refresh/freeze, upgrades/economy, no duplicate kills and mixed-weapon bounds');

// A weaker flame cannot erase an active stronger burn, but expired burns do not retain old strength.
{
 const m=fresh();m.state='building';m.gold=5000;m.build(0,'flame');m.upgrade(0);m.upgrade(0);m.build(1,'flame');m.state='running';m.spawnClock=100;m.player.x=650;m.player.y=650;m.player.cd=100;
 m.enemies=[{id:1,x:430,y:240,hp:10000,maxHp:10000,r:12,speed:0,slow:0,cd:100}];m.step(.05);assert(Math.abs(m.enemies[0].burnDamage-9.2)<1e-8);
 for(const s of m.slots)if(s.tower)s.tower.cd=100;for(let i=0;i<40;i++)m.step(.05);assert.equal(m.enemies[0].burnTime,0);
 m.state='building';m.sell(0);m.slots[1].tower.cd=0;m.state='running';m.step(.05);assert.equal(m.enemies[0].burnDamage,4);
}
console.log('PASS: mixed-level flame stacking and expired-burn strength reset');

// Construction remains a live combat state, including burn damage, movement and abilities.
{const m=fresh();m.state='building';m.gold=1000;m.build(0,'flame');m.spawnClock=100;m.spawn();Object.assign(m.enemies[0],{x:420,y:360,hp:1000,maxHp:1000,speed:10});const y=m.enemies[0].y,x=m.player.x;m.step(.05,{x:1,y:0});assert.equal(m.time,.05);assert(m.player.x>x);assert(m.castShockwave());assert(m.shockwaveCd>0);m.state='paused';assert.equal(m.build(1,'arrow'),false);const before=JSON.stringify(m);m.step(.05);assert.equal(JSON.stringify(m),before);}
console.log('PASS: live construction clock, movement, shockwave and paused action guards');

// Map geometry, spawn lanes and all combinations of the expanded arsenal.
for(const map of ['grove','canyon','glacier'])for(const mode of ['classic','rush','siege']){
 const m=new context.Game(()=>.5,mode,map);assert.equal(m.map,map);assert.equal(m.slots.length,8);
 if(map==='canyon')assert.equal(m.slots[2].x,570);if(map==='glacier')assert.equal(m.slots[0].y,150);
 m.spawn();if(map==='canyon')assert([-18,738].includes(m.enemies[0].x));if(map==='glacier')assert([-18,738].includes(m.enemies[0].y));
 for(const type of ['sniper','venom','gravity']){m.state='building';m.gold=10000;assert(m.build(0,type));assert(m.upgrade(0));assert(m.upgrade(0));assert(m.sell(0));}
}
assert.equal(new context.Game(()=>.5,'classic','bad').map,'grove');
{
 const setup=type=>{const m=fresh();m.state='building';m.gold=1000;m.build(0,type);m.state='running';m.spawnClock=100;m.player.cd=100;return m;};
 const enemy=(id,x,hp=500,kind='grunt')=>({id,x,y:215,hp,maxHp:hp,r:12,speed:0,slow:0,cd:100,kind});
 const sniper=setup('sniper');sniper.enemies=[enemy(1,400,100),enemy(2,550,1000)];sniper.step(.05);assert.equal(sniper.enemies[0].hp,100);assert.equal(sniper.enemies[1].hp,900);
 const poison=setup('venom');poison.enemies=[enemy(1,420,500,'regenerator'),enemy(2,440),enemy(3,500)];poison.step(.05);assert.equal(poison.enemies[0].poisonTime,3);assert.equal(poison.enemies[1].hp,495);assert.equal(poison.enemies[2].hp,500);poison.slots[0].tower.cd=100;
 poison.state='paused';const frozen=JSON.stringify(poison);poison.step(.05);assert.equal(JSON.stringify(poison),frozen);poison.state='running';for(let i=0;i<60;i++)poison.step(.05);assert.equal(poison.enemies[0].hp,465);poison.step(.05);assert(poison.enemies[0].hp>465);
 const gravity=setup('gravity');gravity.enemies=[enemy(1,450),{...enemy(2,450),boss:true},enemy(3,600)];gravity.step(.05);assert.equal(gravity.enemies[0].x,412);assert.equal(gravity.enemies[1].x,442);assert.equal(gravity.enemies[2].x,600);
 const split=fresh();split.enemies=[enemy(1,100,1,'splitter')];split.nextId=1;split.damage(split.enemies[0],10);assert.equal(split.enemies.filter(e=>e.kind==='shard').length,2);split.damage(split.enemies[0],10);assert.equal(split.enemies.length,3);
 const armor=new context.Game(()=>.5);armor.wave=3;armor.spawn();assert.equal(armor.enemies[0].kind,'armored');assert.equal(armor.enemies[0].hp,98);
}
console.log('PASS: three maps, spawn lanes, nine mode/map combinations, new weapon economy, priority shots, poison/regen/freeze, gravity resistance, split-once and armored health');

// Expedition rules, roster, bosses and final-wave transitions are independent of free-play records.
for(let stage=0;stage<6;stage++){
 const m=new context.Game(()=>.5,'rush','grove',stage);assert.equal(m.stage,stage);assert.equal(m.mode,'classic');assert.equal(m.rules.waves,[4,5,5,6,7,8][stage]);assert.equal(m.map,['grove','canyon','glacier','marsh','volcano','ruins'][stage]);
 m.spawn();assert(m.scenario.roster.includes(m.enemies[0].kind));assert(Number.isFinite(m.enemies[0].hp));
 for(const wave of m.rules.bosses){const b=new context.Game(()=>.5,'classic','grove',stage);b.state='running';b.wave=wave;b.spawned=b.spawnLimit-1;b.step(.05);assert(b.enemies[0].boss);}
 m.state='running';for(let wave=1;wave<=m.rules.waves;wave++){m.enemies=[];m.spawned=m.spawnLimit;m.waveTime=m.rules.waveSeconds;m.step(.05);if(wave<m.rules.waves){assert.equal(m.state,'reward');m.chooseReward(m.offers[0]);}else assert.equal(m.state,'won');}
}
for(const stage of [-2,6,1.5,'1'])assert.equal(new context.Game(()=>.5,'classic','grove',stage).stage,-1);
{
 const move=(kind,hp,slow)=>{const m=fresh();m.state='running';m.spawnClock=100;m.player.x=650;m.player.y=650;m.player.cd=100;m.enemies=[{id:1,x:100,y:360,hp,maxHp:100,kind,r:12,speed:40,slow,cd:100}];m.step(.05);return m.enemies[0].x-100;};
 assert(move('wisp',100,2)>move('grunt',100,2));assert(move('berserker',40,0)>move('berserker',100,0));
}
console.log('PASS: six expedition stages, rosters, boss schedule, reward/victory transitions, invalid-stage fallback and special enemy movement');

// Dedicated attack visuals retain the shared bounded effect clock.
for(const [type,kind]of [['sniper','sniperShot'],['venom','venomCloud'],['gravity','gravityWell']]){
 const m=fresh();m.state='building';m.gold=1000;m.build(0,type);m.state='running';m.spawnClock=100;m.player.cd=100;m.enemies=[{id:1,x:430,y:215,hp:1000,maxHp:1000,r:12,speed:0,slow:0,cd:100}];m.step(.05);assert(m.effects.some(e=>e.kind===kind));
 m.state='paused';const frozen=JSON.stringify(m);m.step(.05);assert.equal(JSON.stringify(m),frozen);m.state='running';m.slots[0].tower.cd=100;for(let i=0;i<20;i++)m.step(.05);assert(!m.effects.some(e=>e.kind===kind));
}
console.log('PASS: distinct sniper/venom/gravity visuals, pause and expiry');

// Cycle 1: priorities change real aim, exclude dead/out-of-range enemies and guard paused edits.
{const m=fresh();m.state='building';m.build(0,'arrow');const slot=m.slots[0],enemies=[{id:1,x:400,y:215,hp:40,maxHp:50},{id:2,x:360,y:350,hp:80,maxHp:100},{id:3,x:430,y:215,hp:10,maxHp:20},{id:4,x:900,y:900,hp:1,maxHp:9999},{id:5,x:360,y:215,hp:0,maxHp:2000}];for(const [priority,id]of [['nearest',1],['core',2],['strong',2],['weak',3]]){assert(m.setPriority(0,priority));assert.equal(m.towerTarget(slot,enemies,175).id,id);}assert.equal(m.setPriority(0,'bad'),false);m.state='paused';assert.equal(m.setPriority(0,'core'),false);}
console.log('PASS cycle 1: tower targeting priorities');

// Cycle 2: scouting is deterministic and reflects actual stage rosters and boss schedules.
{const m=fresh(),before=JSON.stringify(m);assert.equal(m.waveIntel().total,m.spawnLimit);assert.equal(m.waveIntel(4).boss,true);assert(m.waveIntel(5).roster.includes('regenerator'));assert.equal(m.waveIntel(11),null);assert.equal(JSON.stringify(m),before);const stage=new context.Game(()=>.5,'classic','grove',3);assert(stage.waveIntel().roster.includes('splitter'));assert.equal(stage.waveIntel().lanes.join('/'),'동/남/서');}
console.log('PASS cycle 2: wave scouting');

// Cycle 3: two simulation substeps preserve collision accuracy and stop at reward boundaries.
{const a=fresh(),b=fresh();for(const m of [a,b]){m.state='running';m.spawnClock=100;}a.advance(.05,{x:1,y:0},2);b.step(.05,{x:1,y:0});b.step(.05,{x:1,y:0});assert.equal(JSON.stringify(a),JSON.stringify(b));a.state='paused';const frozen=JSON.stringify(a);a.advance(.05,{},2);assert.equal(JSON.stringify(a),frozen);const reward=fresh();reward.state='running';reward.spawned=reward.spawnLimit;reward.waveTime=28;reward.advance(.05,{x:0,y:0},2);assert.equal(reward.state,'reward');assert.equal(reward.time,.05);assert.equal(reward.waveTime,0);}
console.log('PASS cycle 3: safe 2x simulation and pause/reward boundaries');

// Cycle 5: repeat purchase shares all ordinary placement and currency guards.
{const m=fresh();m.state='building';assert.equal(m.repeatBuild(0),false);m.gold=200;assert(m.build(0,'cannon'));assert(m.repeatBuild(1));assert.equal(m.gold,20);assert.equal(m.repeatBuild(2),false);assert.equal(m.repeatBuild(1),false);m.gold=200;m.state='paused';assert.equal(m.repeatBuild(2),false);assert.equal(fresh().lastBuilt,null);}
console.log('PASS cycle 5: repeat-build economy and reset');

// Cycle 6: upgrade preview uses exactly the stats fired in combat, including mode and perks.
{const m=new context.Game(()=>.5,'siege');m.perks.power=2;m.perks.haste=1;m.perks.range=1;m.state='building';m.gold=1000;m.build(0,'arrow');m.upgrade(0);const stats=m.towerStats('arrow',2);m.state='running';m.spawnClock=100;m.enemies=[{id:1,x:450,y:215,hp:1000,maxHp:1000,r:12,speed:0,slow:0,cd:100}];m.step(.05);assert.equal(m.shots[0].damage,stats.damage);assert.equal(m.slots[0].tower.cd,stats.interval);assert.equal(stats.range,212);assert.equal(m.towerStats('invalid'),null);}
console.log('PASS cycle 6: upgrade stats match actual shots');

// Cycle 7: medals require victory, reward health/perfect defense and do not grade free play.
{const m=new context.Game(()=>.5,'classic','grove',0);assert.equal(m.stageMedal(),0);m.state='won';m.core=100;assert.equal(m.stageMedal(),1);m.core=240;assert.equal(m.stageMedal(),2);m.perfectWaves=m.rules.waves;assert.equal(m.stageMedal(),3);m.state='lost';assert.equal(m.stageMedal(),0);const free=fresh();free.state='won';assert.equal(free.stageMedal(),0);}
console.log('PASS cycle 7: stage medal thresholds');

// Cycle 9: only skip an empty fully-spawned wave, with exactly one ordinary reward.
{const m=fresh();m.state='running';assert.equal(m.finishWave(),false);m.spawned=m.spawnLimit;m.enemies=[{hp:1}];assert.equal(m.finishWave(),false);m.enemies=[];m.state='paused';assert.equal(m.finishWave(),false);m.state='running';const time=m.time;assert(m.finishWave());assert.equal(m.state,'reward');assert.equal(m.time,time);assert.equal(m.gold,180);assert.equal(m.finishWave(),false);m.chooseReward(m.offers[0]);m.wave=m.rules.waves;m.spawned=m.spawnLimit;m.enemies=[];assert(m.finishWave());assert.equal(m.state,'won');assert.equal(m.finishWave(),false);}
console.log('PASS cycle 9: safe empty-wave finish without duplicate rewards');

// Cycle 10: actual damage excludes overkill and repeated kills; spending records successful actions only.
{const m=fresh();m.state='building';m.gold=1000;assert(m.build(0,'arrow'));assert.equal(m.build(0,'arrow'),false);assert(m.upgrade(0));m.core=250;assert(m.repair());assert.equal(m.repair(),false);const e={hp:7,x:0,y:0,r:12};m.damage(e,100);m.damage(e,100);const report=m.battleReport();assert.equal(report.damage,7);assert.equal(report.built,1);assert.equal(report.upgrades,1);assert.equal(report.repairs,1);assert.equal(report.spent,180);report.built=99;assert.equal(m.runStats.built,1);assert.equal(fresh().runStats.damage,0);}
console.log('PASS cycle 10: battle report damage and economy accounting');

// Expansion cycle 1: level-three specialization changes actual stats and only charges once.
{const m=fresh();m.state='building';m.gold=1000;m.build(0,'flame');assert.equal(m.specialize(0,'power'),false);m.upgrade(0);m.upgrade(0);const before=m.gold,base=m.towerStats('flame',3);assert(m.specialize(0,'power'));assert.equal(m.gold,before-80);assert.equal(m.specialize(0,'rapid'),false);const stats=m.towerStats('flame',3,'power');assert.equal(stats.damage,base.damage*1.3);m.state='running';m.spawnClock=100;m.player.cd=100;m.enemies=[{id:1,x:430,y:215,hp:1000,maxHp:1000,r:12,speed:0,slow:0,cd:100}];m.step(.05);assert.equal(m.enemies[0].burnDamage,stats.damage*.5);}
console.log('PASS expansion 1: specialization and burn scaling');

// Expansion 2: one free reroll keeps reward pause and never applies a card twice.
{const m=fresh();assert.equal(m.rerollRewards(),false);m.offerReward();const old=[...m.offers],gold=m.gold;assert(m.rerollRewards());assert.equal(m.state,'reward');assert.equal(m.gold,gold);assert.equal(new Set(m.offers).size,m.offers.length);assert(m.offers.some(id=>!old.includes(id)));assert.equal(m.rerollRewards(),false);assert(m.chooseReward(m.offers[0]));assert.equal(fresh().rerolls,1);}
console.log('PASS expansion 2: free reward reroll lifecycle');

// Expansion 3: expedition cards have real economy/cooldown/heal effects; free play excludes them.
{const free=fresh();for(let i=0;i<20;i++){free.offerReward();assert(free.offers.every(id=>!['bounty','capacitor','mending'].includes(id)));}const m=new context.Game(()=>.5,'classic','grove',0);m.state='running';m.perks.bounty=2;const gold=m.gold;m.damage({hp:1,x:10,y:10,r:12},5);assert.equal(m.gold,gold+12);m.perks.capacitor=3;m.enemies=[{hp:100,x:400,y:360,r:12}];assert(m.castShockwave());assert.equal(m.shockwaveCd,12);m.perks.mending=2;m.core=200;m.waveCoreDamage=100;m.spawned=m.spawnLimit;m.enemies=[];m.finishWave();assert.equal(m.core,235);}
console.log('PASS expansion 3: expedition-only cards');

// Expansion 4: barrier protects only the core, expires in combat, and shares the paused clock.
{const m=fresh();assert.equal(m.castBarrier(),false);m.state='running';m.spawnClock=100;m.player.x=650;m.player.y=650;m.player.cd=100;assert(m.castBarrier());assert.equal(m.castBarrier(),false);m.enemies=[{id:1,x:360,y:360,hp:1000,maxHp:1000,r:12,speed:0,slow:0,cd:0}];m.step(.05);assert.equal(m.core,296);assert.equal(m.waveCoreDamage,4);m.state='paused';const before=JSON.stringify(m);m.step(.05);assert.equal(JSON.stringify(m),before);m.state='running';m.enemies=[];for(let i=0;i<101;i++)m.step(.05);assert.equal(m.barrierTime,0);assert(m.barrierCd>0);}
console.log('PASS expansion 4: core barrier and cooldown');

// Expansion 5: expedition boss enrages once at half health, free-play bosses retain old behavior.
{for(const stage of [-1,0]){const m=new context.Game(()=>.5,'classic','grove',stage);m.spawn(true);const e=m.enemies[0];m.damage(e,e.maxHp*.5);assert.equal(!!e.enraged,stage===0);const count=m.effects.filter(f=>f.kind==='bossArrival').length;m.damage(e,1);assert.equal(m.effects.filter(f=>f.kind==='bossArrival').length,count);if(stage===0){m.state='running';m.spawnClock=100;m.player.x=650;m.player.y=650;m.player.cd=100;e.x=360;e.y=360;e.cd=0;m.step(.05);assert.equal(e.cd,.7);}}}
console.log('PASS expansion 5: expedition boss second phase');

// Expansion 6: missions only reward a winning expedition and track historical tower peak.
{const m=new context.Game(()=>.5,'classic','grove',0,'compact');m.state='building';m.gold=10000;for(let i=0;i<5;i++)m.build(i,'arrow');m.sell(4);m.state='won';assert.equal(m.missionSatisfied(),false);const n=new context.Game(()=>.5,'classic','grove',0,'noRepair');n.state='running';n.wave=n.rules.waves;n.spawned=n.spawnLimit;n.finishWave();assert(n.missionSatisfied());assert.equal(n.score,2650);const score=n.score;assert.equal(n.finishWave(),false);assert.equal(n.score,score);assert.equal(new context.Game(()=>.5,'classic','grove',-1,'compact').mission,'none');}
console.log('PASS expansion 6: stage missions and one-time bonus');

// Expansion 7: relocation preserves tower identity, investment, upgrades and cooldown.
{const m=fresh();m.state='building';m.gold=1000;m.build(0,'arrow');m.upgrade(0);const t=m.slots[0].tower;t.cd=.4;const gold=m.gold,spent=t.spent;assert(m.relocate(0,2));assert.equal(m.gold,gold-25);assert.equal(m.slots[0].tower,null);assert.equal(m.slots[2].tower,t);assert.equal(t.spent,spent);assert.equal(t.cd,.4);assert.equal(m.relocate(2,2),false);m.state='paused';assert.equal(m.relocate(2,3),false);assert.equal(m.runStats.relocations,1);}
console.log('PASS expansion 7: tower relocation');

// Expansion 8: wave history records damage before repairs and the actual combat clock.
{const m=fresh();m.state='running';m.time=7;m.waveCoreDamage=21;m.kills=3;m.spawned=m.spawnLimit;m.finishWave();assert.equal(m.waveHistory.length,1);assert.equal(m.waveHistory[0].seconds,7);assert.equal(m.waveHistory[0].coreDamage,21);assert.equal(m.waveHistory[0].kills,3);assert.equal(m.waveHistory[0].perfect,false);m.step(.05);assert.equal(m.waveHistory.length,1);m.chooseReward(m.offers[0]);m.time=12;m.kills=8;m.spawned=m.spawnLimit;m.finishWave();assert.equal(m.waveHistory[1].seconds,5);assert.equal(m.waveHistory[1].kills,5);assert.equal(fresh().waveHistory.length,0);}
console.log('PASS expansion 8: bounded per-wave history');

// Expansion 10: budget-aware presets use real purchases and never overwrite existing towers.
{for(const mode of ['classic','siege'])for(const map of ['grove','marsh','volcano','ruins'])for(const id of ['balanced','crowd','precision']){const m=new context.Game(()=>.5,mode,map),start=m.gold,plan=m.loadoutPlan(id);assert(plan.cost<=start);assert.equal(new Set(plan.items.map(x=>x.index)).size,plan.items.length);assert.equal(m.deployLoadout(id),false);m.state='building';assert(m.deployLoadout(id));assert.equal(m.gold,start-plan.cost);assert.equal(m.runStats.built,plan.items.length);assert.equal(m.deployLoadout(id),false);assert(m.slots[map==='marsh'?2:0].tower);}const m=fresh();m.state='building';assert.equal(m.deployLoadout('none'),false);assert.equal(m.deployLoadout('bad'),false);}
console.log('PASS expansion 10: starting loadout budgets and slots');
