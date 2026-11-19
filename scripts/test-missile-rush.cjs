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
assert.deepEqual(seen, ['−2', '−1', '+1', '+2', '+3']);
assert.deepEqual(C.shiftGate({ op: '×', v: 2 }), { op: '×', v: 2 }); assert.deepEqual(C.shiftGate({ op: '÷', v: 2 }), { op: '÷', v: 2 });
assert(C.shiftable({ op: '+', v: 1 }) && !C.shiftable({ op: '÷', v: 2 }));
for (let w = 1; w < 60; w++) assert(C.shiftCost(100, w) >= 80 && C.shiftCost(0, w) === 4);
// Firepower is proportional to the number of units; evolution multiplies it.
assert.equal(C.squadStats(0, 1).dps, 0); assert.equal(C.squadStats(0, 1).count, 0);
for (let n = 1; n <= C.MAX_UNITS; n++) {
  const s = C.squadStats(n, 1);
  assert(Math.abs(s.dps - C.squadStats(1, 1).dps * n) < 1e-6, 'dps scales linearly with units');
  assert(Math.abs(s.damage * s.count / s.interval - s.dps) < 1e-6, 'volley carries the whole squad');
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
assert.equal(C.contactLoss('boss'), 0);
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
console.log('PASS: missile rush operator capsules (+ − × ÷), capsule shifting, unit-proportional firepower, 5 missile tiers, endless waves and boss cadence');
