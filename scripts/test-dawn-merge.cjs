// Logic checks for the random merge defense (MergeGame) that powers the main page.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync(require('node:path').join(__dirname, '../index.html'), 'utf8');
const source = html.match(/<script id="gameLogic">([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({});
vm.runInContext(source + '\nthis.Game = MergeGame; this.MERGE = MERGE; this.TYPES = TYPES; this.MAPS = MAPS;', context);
const { MERGE } = context;
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const fresh = (random = () => .5) => { const g = new context.Game(random); g.state = 'running'; return g; };

// Board: 16 distinct cells clear of the four lanes, endless rules, nothing summons while idle.
{ const g = new context.Game(() => .5);
  assert.equal(g.slots.length, 16); assert.equal(new Set(g.slots.map(s => s.x + ':' + s.y)).size, 16);
  for (const s of g.slots) { assert(Math.abs(s.x - 360) >= 60 && Math.abs(s.y - 360) >= 60); assert(Math.hypot(s.x - 360, s.y - 360) < 210); }
  assert.equal(g.rules.waves, Infinity); assert.equal(g.gold, 100); assert.equal(g.state, 'idle'); assert.equal(g.summon(), -1); assert.equal(g.gold, 100); }
console.log('PASS merge board and idle guards');

// Summon: rising cost, random empty cell, deck-only types, lucky tiers, full-board and funds guards.
{ const g = fresh(); assert.equal(g.summonCost, 20); const index = g.summon(); assert(index >= 0); assert.equal(g.gold, 80); assert.equal(g.summonCost, 24);
  const t = g.slots[index].tower; assert(MERGE.deck.includes(t.type)); assert.equal(t.level, 1); assert.equal(t.priority, 'core');
  g.gold = 23; assert.equal(g.summon(), -1); assert.equal(g.gold, 23);
  const lucky = fresh(() => .01); assert.equal(lucky.slots[lucky.summon()].tower.level, 3); const good = fresh(() => .1); assert.equal(good.slots[good.summon()].tower.level, 2);
  const many = fresh(seeded(3)); many.gold = 1e6; for (let i = 0; i < 16; i++) assert(many.summon() >= 0); assert.equal(many.emptyCells().length, 0); const gold = many.gold; assert.equal(many.summon(), -1); assert.equal(many.gold, gold);
  for (const s of many.slots) assert(MERGE.deck.includes(s.tower.type)); }
console.log('PASS summon economy and guards');

// Merge, move and swap through drop(); only equal type and tier merge, and the top tier never merges.
{ const g = fresh(); g.place(0, 'arrow', 1); g.place(1, 'arrow', 1); g.place(2, 'cannon', 1); g.place(3, 'arrow', 2);
  assert(g.canMerge(0, 1)); assert(!g.canMerge(0, 2)); assert(!g.canMerge(0, 3)); assert(!g.canMerge(0, 0)); assert(!g.canMerge(0, 9));
  assert.deepEqual([...g.mergePair()], [0, 1]);
  assert.equal(g.drop(0, 1), 'merge'); assert.equal(g.slots[0].tower, null); assert.equal(g.slots[1].tower.level, 2); assert(MERGE.deck.includes(g.slots[1].tower.type)); assert.equal(g.merges, 1); assert.equal(g.bestTier, 2);
  assert.equal(g.drop(2, 5), 'move'); assert.equal(g.slots[2].tower, null); assert.equal(g.slots[5].tower.type, 'cannon');
  g.slots[1].tower.type = 'frost'; assert.equal(g.drop(5, 1), 'swap'); assert.equal(g.slots[5].tower.type, 'frost'); assert.equal(g.slots[1].tower.type, 'cannon');
  assert.equal(g.drop(0, 1), false); assert.equal(g.drop(1, 1), false); assert.equal(g.drop(1, 99), false);
  g.place(8, 'laser', MERGE.maxTier); g.place(9, 'laser', MERGE.maxTier); assert(!g.canMerge(8, 9)); assert.equal(g.drop(8, 9), 'swap');
  g.state = 'paused'; assert.equal(g.drop(8, 10), false); assert.equal(g.sell(8), false); assert.equal(g.amplify(), false); }
console.log('PASS merge, move, swap and state guards');

// Tier scaling, sell values and amplification affect real combat stats.
{ const g = fresh(); const a = g.towerStats('arrow', 1), b = g.towerStats('arrow', 2), top = g.towerStats('arrow', 99);
  assert(Math.abs(b.damage / a.damage - MERGE.growth) < 1e-9); assert(b.range > a.range); assert(b.interval < a.interval); assert(Math.abs(top.damage - a.damage * Math.pow(MERGE.growth, 5)) < 1e-6);
  g.place(0, 'arrow', 3); assert.equal(g.sellValue(0), 40); assert(g.sell(0)); assert.equal(g.gold, 140); assert.equal(g.slots[0].tower, null); assert.equal(g.sell(0), false);
  g.gold = 119; assert.equal(g.amplify(), false); g.gold = 300; assert(g.amplify()); assert.equal(g.gold, 180); assert.equal(g.amplifyCost, 180); assert(g.amplify()); assert.equal(g.gold, 0);
  assert(Math.abs(g.towerStats('arrow', 1).damage - a.damage * 1.12) < 1e-9); }
console.log('PASS tier scaling, selling and amplification');

// Towers on the grid actually kill enemies and earn ether; no guardian exists in this mode.
{ const g = fresh(); g.spawnClock = 1000; g.place(0, 'arrow', 3); const s = g.slots[0];
  g.enemies.push({ id: 1, x: s.x + 40, y: s.y, hp: 30, maxHp: 30, r: 12, speed: 0, slow: 0, cd: 5, kind: 'grunt' });
  for (let i = 0; i < 40; i++) g.step(.05); assert.equal(g.kills, 1); assert.equal(g.gold, 108); assert.equal(g.player.hp, 100); assert.equal(g.shots.every(shot => shot.weapon !== 'guardian'), true); }
console.log('PASS grid combat');

// Waves flow without interruption; a card choice appears only after boss waves and the battlefield rotates there.
{ const g = fresh(); const clear = () => { g.spawned = g.spawnLimit; g.enemies = []; g.waveTime = g.rules.waveSeconds; g.step(.05); };
  for (let wave = 1; wave <= 4; wave++) { clear(); assert.equal(g.state, 'running'); assert.equal(g.wave, wave + 1); assert.equal(g.map, 'grove'); }
  assert(g.isBossWave()); assert.equal(g.abyssBoss().id, 'summoner');
  clear(); assert.equal(g.state, 'reward'); assert.equal(g.wave, 6); assert.equal(g.offers.length, 3); assert.equal(g.map, 'canyon'); assert.deepEqual([...g.terrain.lanes], [...context.MAPS.canyon.lanes]);
  for (const id of g.offers) assert(['power', 'haste', 'range', 'restore', 'supply', 'overcharge'].includes(id));
  g.offers = ['supply', 'power', 'haste']; const gold = g.gold; assert(g.chooseReward('supply')); assert.equal(g.gold, gold + 70 + 6 * 12); assert.equal(g.state, 'running');
  for (let wave = 6; wave <= 9; wave++) { clear(); assert.equal(g.state, 'running'); } clear(); assert.equal(g.state, 'reward'); assert.equal(g.map, 'glacier'); assert.equal(g.wave, 11);
  assert(g.chooseReward(g.offers[0])); g.wave = 30; g.spawnLimit = 1; g.spawned = 1; g.enemies = []; g.waveTime = 99; g.step(.05); assert.equal(g.wave, 31); assert.equal(g.map, 'grove'); }
console.log('PASS wave flow, boss rewards and battlefield rotation');

// Enemy health compounds 13% per wave; pause freezes everything; the core falling ends the run.
{ const g = fresh(); assert.equal(g.depth(1), 1); assert(Math.abs(g.depth(11) - Math.pow(1.13, 10)) < 1e-9); g.wave = 11; const e = g.spawn(false, 'grunt'); assert(Math.abs(e.hp - (25 + 88) * Math.pow(1.13, 10)) < 1e-6);
  g.place(0, 'frost', 2); g.state = 'paused'; const snapshot = JSON.stringify(g); g.step(.05); g.advance(.05, { x: 0, y: 0 }, 2); assert.equal(JSON.stringify(g), snapshot);
  g.state = 'running'; g.core = 1; e.x = 360; e.y = 380; e.cd = 0; g.step(.05); assert.equal(g.state, 'lost'); assert.equal(g.summon(), -1); }
console.log('PASS scaling, pause and defeat');

// A simple summon-and-merge bot survives the opening and eventually loses, so the curve is neither trivial nor endless.
for (const seed of [1, 2, 3]) { const g = fresh(seeded(seed)); let ticks = 0;
  while (g.state !== 'lost' && ticks++ < 60000) { if (g.state === 'reward') { g.chooseReward(g.offers[0]); continue; }
    if (ticks % 10 === 0) { let pair; while ((pair = g.mergePair())) g.drop(pair[0], pair[1]); while (g.summon() >= 0) { while ((pair = g.mergePair())) g.drop(pair[0], pair[1]); } if (!g.emptyCells().length) g.amplify(); }
    g.step(.05); }
  assert.equal(g.state, 'lost', 'seed ' + seed); assert(g.wave >= 12 && g.wave <= 45, 'seed ' + seed + ' reached wave ' + g.wave); console.log('  seed', seed, 'wave', g.wave, 'merges', g.merges); assert(g.merges > 10); assert(g.enemies.length <= 150); }
console.log('PASS balance envelope: bot runs end between waves 12 and 45');
