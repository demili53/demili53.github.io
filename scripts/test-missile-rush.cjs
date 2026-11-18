const assert = require('node:assert/strict');
const C = require('./missile-rush-core.js');
// Upgrade cards: three distinct, never above max, applyUpgrade is immutable.
let seed = 7; const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
for (let i = 0; i < 200; i++) { const c = C.rollChoices({}, rng); assert.equal(c.length, 3); assert.equal(new Set(c).size, 3); }
let levels = {};
for (const u of C.UPGRADES) for (let i = 0; i < u.max + 3; i++) levels = C.applyUpgrade(levels, u.id);
for (const u of C.UPGRADES) assert.equal(levels[u.id], u.max, u.id);
assert.deepEqual(C.rollChoices(levels, rng), [], 'no cards once everything is maxed');
const base = {}; const next = C.applyUpgrade(base, 'multi'); assert.equal(base.multi, undefined); assert.equal(next.multi, 1);
assert.deepEqual(C.rollChoices({ ...levels, drone: 1 }, rng), ['drone']);
// Weapon growth: every upgrade and evolution strictly improves the matching stat.
const s0 = C.weaponStats({}, 1);
assert.equal(s0.count, 1); assert.equal(s0.blast, 0); assert.equal(s0.drones, 0);
const sMax = C.weaponStats(levels, 5);
assert(sMax.damage > s0.damage * 10 && sMax.interval < s0.interval / 2 && sMax.count === 7 && sMax.pierce === 4 && sMax.blast > 0 && sMax.drones === 2);
for (let t = 2; t <= 5; t++) assert(C.weaponStats({}, t).damage > C.weaponStats({}, t - 1).damage);
assert.equal(C.evolution(99).tier, 5); assert.equal(C.evolution(0).tier, 1);
// Waves: endless scaling, boss every 5, new enemy types unlock over time.
assert(C.isBossWave(5) && C.isBossWave(10) && !C.isBossWave(4));
for (let w = 2; w < 60; w++) {
  assert(C.wavePlan(w).total >= C.wavePlan(w - 1).total, 'enemy count grows');
  assert(C.enemyStats('drone', w).hp > C.enemyStats('drone', w - 1).hp, 'enemy hp grows');
  assert(C.wavePlan(w).spawnGap >= .22);
}
assert.deepEqual(C.wavePlan(1).plan.map(p => p[0]), ['drone']);
assert(C.wavePlan(6).plan.map(p => p[0]).includes('splitter'));
assert(C.enemyStats('boss', 10).hp > C.enemyStats('boss', 5).hp);
for (let l = 2; l < 80; l++) assert(C.xpToNext(l) > C.xpToNext(l - 1));
// Every card has a readable description at every level.
for (const u of C.UPGRADES) for (let lv = 0; lv < u.max; lv++) assert(u.desc(lv).length > 5 && !/undefined|NaN/.test(u.desc(lv)), u.id);
console.log('PASS: missile rush upgrade cards, weapon scaling, 5 missile tiers, endless waves and boss cadence');
