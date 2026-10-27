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
g.step(1); assert.equal(g.time, 0);
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
for (const state of ['building', 'paused']) {
  game.state = state;
  const before = JSON.stringify(game);
  game.step(.05);
  assert.equal(JSON.stringify(game), before, 'Effects and combat freeze together');
}
game.state = 'running';
game.step(.05);
assert(game.coreHit < .35);
for (let i = 0; i < 300; i++) game.emit('hit', 1, 1, 1, 0xffffff, .1);
assert.equal(game.effects.length, 100);
for (let i = 0; i < 3; i++) game.step(.05);
assert.equal(game.effects.length, 0);
assert.equal(game.effectPool.length, 100);
for (let i = 0; i < 300; i++) game.emit('hit', 1, 1, 1, 0xffffff, .1);
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
    assert(g.effects.some(f => f.kind === 'muzzle'));
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
console.log('PASS: hit/death rewards, pause/build freeze, effect pool cap/reuse, three tower effects, core damage and reset');
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
  const flash = model.effects.find(f => f.kind === 'muzzle');
  assert.equal(flash.x, slot.x + (type === 'cannon' ? 22 : 27));
  const count = model.shots.length;
  target.x = slot.x; target.y = slot.y + 100;
  model.step(.05);
  assert.equal(tower.angle, Math.PI / 2, 'Tracking continues during cooldown');
  assert(tower.recoil < .16);
  assert.equal(model.shots.length, count, 'Tracking does not create extra attacks');
  for (const state of ['building', 'paused']) {
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
console.log('PASS: tracking during cooldown, recoil/reset, muzzle alignment, unchanged projectile travel, pause/build freeze');

// Reward choices are unique, pause combat, apply once, and respect stack limits.
{
 const model=fresh();model.state='running';model.spawned=model.spawnLimit;model.waveTime=28;model.step(.05);
 assert.equal(model.state,'reward');assert.equal(new Set(model.offers).size,3);
 const before=JSON.stringify(model);model.step(.05);assert.equal(JSON.stringify(model),before);
 assert.equal(model.chooseReward('invalid'),false);const id=model.offers[0];assert(model.chooseReward(id));assert.equal(model.state,'building');assert.equal(model.perks[id],1);assert.equal(model.chooseReward(id),false);
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
 model.state='building';model.step(.05);assert.equal(model.comboLeft,3);model.state='paused';model.step(.05);assert.equal(model.comboLeft,3);
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
 for(const state of ['idle','building','paused','reward','won','lost']){m.state=state;const before=JSON.stringify(m);assert.equal(m.castShockwave(),false);m.step(.05);assert.equal(JSON.stringify(m),before);}
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
