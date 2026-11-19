const assert = require('node:assert/strict');
const C = require('./missile-rush-core.js');
let seed = 7; const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
// Operators: the four arithmetic capsules change the squad size, clamped to 0..MAX_UNITS.
assert.equal(C.applyOperator(3, { op: '+', v: 3 }), 6);
assert.equal(C.applyOperator(6, { op: '-', v: 2 }), 4);
assert.equal(C.applyOperator(4, { op: '×', v: 2 }), 8);
assert.equal(C.applyOperator(9, { op: '÷', v: 2 }), 4);
assert.equal(C.applyOperator(1, { op: '÷', v: 3 }), 1, 'division never wipes the squad');
assert.equal(C.applyOperator(2, { op: '-', v: 5 }), 0, 'subtraction can wipe the squad');
assert.equal(C.applyOperator(200, { op: '×', v: 3 }), C.MAX_UNITS);
assert.throws(() => C.applyOperator(3, { op: '?', v: 1 }));
assert.equal(C.gateLabel({ op: '-', v: 2 }), '−2'); assert.equal(C.gateLabel({ op: '×', v: 2 }), '×2');
assert(C.isGood({ op: '+', v: 1 }) && C.isGood({ op: '×', v: 2 }) && !C.isGood({ op: '-', v: 1 }) && !C.isGood({ op: '÷', v: 2 }));
// Shooting a capsule: − counts down and flips to +, + counts up, × and ÷ stay fixed.
let g = { op: '-', v: 3 }; const seen = [];
for (let i = 0; i < 5; i++) { g = C.shiftGate(g); seen.push(C.gateLabel(g)); }
assert.deepEqual(seen, ['−2', '−1', '+1', '+2', '+2'], 'a capsule bends at most MAX_SHIFTS times');
assert.equal(C.MAX_SHIFTS, 4); assert(!C.shiftable(g) && C.shiftable({ op: '+', v: 2 }));
assert.equal(C.gateLabel(C.shiftGate({ op: '×', v: 2 })), '×2'); assert.equal(C.gateLabel(C.shiftGate({ op: '÷', v: 2 })), '÷2');
assert(C.shiftable({ op: '+', v: 1 }) && !C.shiftable({ op: '÷', v: 2 }));
for (let w = 1; w < 60; w++) assert(C.shiftCost(100, w) >= 80 && C.shiftCost(0, w) === 4);
// Firepower is proportional to the number of units; evolution multiplies it.
assert.equal(C.squadStats(0, 1).dps, 0); assert.equal(C.squadStats(0, 1).count, 0);
for (let n = 1; n <= C.MAX_UNITS; n++) {
  const s = C.squadStats(n, 1);
  assert(Math.abs(s.dps - C.squadStats(1, 1).dps * n) < 1e-6, 'dps scales linearly with units');
  assert(Math.abs(s.damage * s.count / s.interval - s.dps) < 1e-6, 'volley carries the whole squad');
  for (const w of C.WEAPON_IDS) for (let lv = 1; lv <= 3; lv++) { const q = C.squadStats(n, 2, w, lv); assert(Math.abs(q.damage * q.count / q.interval - q.dps) < 1e-6 && q.count >= 1 && q.count <= C.WEAPONS[w].volley, w); }
  assert(s.count <= 12 && s.count >= 1 && s.radius >= C.squadStats(Math.max(1, n - 1), 1).radius);
}
for (let t = 2; t <= 5; t++) assert(C.squadStats(10, t).dps > C.squadStats(10, t - 1).dps);
assert.equal(C.evolution(99).tier, 5); assert.equal(C.evolution(0).tier, 1);
// Random capsules: valid values, every operator appears, pairs always offer one good and one bad.
const counts = { '+': 0, '-': 0, '×': 0, '÷': 0 };
for (let i = 0; i < 4000; i++) {
  const wave = 1 + i % 30, units = 1 + (i * 7) % 120;
  const o = C.rollOperator(wave, units, rng);
  counts[o.op]++;
  assert(Number.isInteger(o.v) && o.v >= 1, JSON.stringify(o));
  if (o.op === '×' || o.op === '÷') assert(o.v === 2 || o.v === 3);
  if (o.op === '÷') assert(units >= 8, 'no division for tiny squads');
  const [a, b] = C.rollPair(wave, units, rng);
  assert.notEqual(C.isGood(a), C.isGood(b));
}
for (const k of Object.keys(counts)) assert(counts[k] > 100, k + ' appears');
const share = (units) => { let good = 0; for (let i = 0; i < 3000; i++) if (C.isGood(C.rollOperator(8, units, rng))) good++; return good / 3000; };
assert(share(3) > share(120) + .15, 'big squads meet more penalties');
// Losing units: bigger enemies cost more, the boss never rams.
assert(C.contactLoss('tank') > C.contactLoss('drone') && C.contactLoss('drone') >= 1 && C.breachLoss('shard') >= 1);
assert(C.contactLoss('boss') > C.contactLoss('tank')); assert.equal(C.breachLoss('boss'), 0);
// Weapons: five kinds, each with its own trait; levels add damage; crates swap or level up.
assert.deepEqual(C.WEAPON_IDS, ['missile', 'scatter', 'laser', 'homing', 'blast']);
const trait = { missile: 'pierce', scatter: 'spread', laser: 'beam', homing: 'homing', blast: 'blast' };
for (const w of C.WEAPON_IDS) {
  const a = C.squadStats(50, 1, w, 1);
  for (const k of Object.keys(trait)) assert.equal(a[trait[k]] > 0, k === w, `${w} trait ${k}`);
  for (let lv = 2; lv <= 3; lv++) assert(C.squadStats(50, 1, w, lv).dps > C.squadStats(50, 1, w, lv - 1).dps && C.squadStats(50, 1, w, lv)[trait[w]] > C.squadStats(50, 1, w, lv - 1)[trait[w]], w);
  assert(C.WEAPONS[w].desc.length > 5 && C.WEAPONS[w].icon.length === 1);
}
assert.equal(C.squadStats(5, 1, 'nope', 9).weapon, 'missile'); assert.equal(C.squadStats(5, 1, 'laser', 9).level, 3);
let ws = { weapon: 'missile', levels: { missile: 1 } };
ws = C.pickWeapon(ws, 'laser'); assert.equal(ws.weapon, 'laser'); assert.equal(ws.levels.laser, 1); assert(!ws.leveled && !ws.bonus);
ws = C.pickWeapon(ws, 'laser'); assert.equal(ws.levels.laser, 2); assert(ws.leveled);
ws = C.pickWeapon(ws, 'laser'); assert.equal(ws.levels.laser, 3);
ws = C.pickWeapon(ws, 'laser'); assert.equal(ws.levels.laser, 3); assert.equal(ws.bonus, 3); assert(!ws.leveled);
ws = C.pickWeapon(ws, 'missile'); assert.equal(ws.levels.missile, 1); assert.equal(ws.levels.laser, 3, 'levels are remembered');
ws = C.pickWeapon(ws, 'laser'); assert.equal(ws.levels.laser, 3); assert.equal(ws.bonus, 0, 'swapping back is not a level-up');
assert.throws(() => C.pickWeapon(ws, 'nope'));
const rolled = new Set(); for (let i = 0; i < 300; i++) rolled.add(C.rollWeapon('missile', rng));
assert.equal(rolled.size, 5);
// Bosses: four kinds rotate every fifth wave.
assert.deepEqual([5, 10, 15, 20, 25, 30].map(w => C.bossFor(w).id), ['fortress', 'carrier', 'divider', 'hydra', 'fortress', 'carrier']);
for (const b of C.BOSSES) assert(b.name && b.hint && b.hp > 0);
assert.equal(C.enemyStats('boss', 15).color, C.BOSSES[2].color);
// Waves: endless scaling, boss every 5, new enemy types unlock over time.
assert(C.isBossWave(5) && C.isBossWave(10) && !C.isBossWave(4));
for (let w = 2; w < 60; w++) {
  assert(C.wavePlan(w).total >= C.wavePlan(w - 1).total, 'enemy count grows');
  assert(C.enemyStats('drone', w).hp > C.enemyStats('drone', w - 1).hp, 'enemy hp grows');
  assert(C.wavePlan(w).spawnGap >= .22 && C.wavePlan(w).gateGap >= 1.5);
}
assert.deepEqual(C.wavePlan(1).plan.map(p => p[0]), ['drone']);
assert(C.wavePlan(6).plan.map(p => p[0]).includes('splitter'));
assert(C.enemyStats('boss', 10).hp > C.enemyStats('boss', 5).hp);
console.log('PASS: missile rush operator capsules (+ − × ÷), capsule shifting, unit-proportional firepower, 5 weapons with levels, 4 rotating bosses, 5 missile tiers, endless waves and boss cadence');
