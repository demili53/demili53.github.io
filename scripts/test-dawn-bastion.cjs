const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../arcade/dawn-bastion.html'), 'utf8');
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
g=fresh(); g.state='running'; g.spawned=g.spawnLimit; g.waveTime=28; g.step(.05); assert.equal(g.wave,2); assert.equal(g.gold,155);
g.wave=10;g.waveTime=28;g.spawned=g.spawnLimit;g.enemies=[];g.step(.05);assert.equal(g.state,'won');
g=fresh();g.state='running';g.wave=4;g.spawned=g.spawnLimit-1;g.step(.05);assert.equal(g.enemies[0].boss,true);
// Repeated long combat remains bounded, with no invalid coordinates.
g=fresh();g.state='building';g.gold=10000;for(let i=0;i<8;i++){g.build(i,['arrow','cannon','frost'][i%3]);g.upgrade(i);g.upgrade(i);}g.state='running';
for(let i=0;i<12000&&g.state==='running';i++){g.step(.05);assert.ok(g.enemies.length<=150);assert.ok(g.shots.length<=180);assert.ok(g.effects.length<=100);assert.ok(Number.isFinite(g.player.x));}
assert.ok(g.wave>1);
console.log('PASS: building economy, upgrades, repair, pause, movement, combat rewards, AoE, slow, waves, bosses, win/loss, bounds');
