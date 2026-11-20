// Rules check for Lantern Keeper (scripts/lantern-core.js): node scripts/test-lantern-keeper.cjs
const assert = require('node:assert/strict');
const C = require('./lantern-core.js');
let seed = 11; const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };

// Ten-minute night, three bosses on the 3-minute marks.
assert.equal(C.DURATION, 600);
assert.deepEqual(C.BOSSES.map(b => b.at), [180, 360, 540]);
assert.equal(C.bossAt(179.9, 180.01).id, 'treant'); assert.equal(C.bossAt(180.01, 181), null);
assert.equal(C.ringAt(89.9, 90.1), 90); assert.equal(C.ringAt(179.9, 180.1), 0, 'no ring on a boss minute');

// Six arts and six charms, five levels each; every level is at least as strong as the last.
assert.equal(C.WEAPON_IDS.length, 6); assert.equal(C.CHARM_IDS.length, 6);
for (const id of C.WEAPON_IDS) {
  for (let lv = 2; lv <= C.MAX_LEVEL; lv++) {
    const a = C.weaponStats(id, lv - 1), b = C.weaponStats(id, lv);
    assert(b.damage >= a.damage, id + ' damage');
    if (a.cooldown) assert(b.cooldown <= a.cooldown, id + ' cooldown');
    if (a.count) assert(b.count >= a.count, id + ' count');
    if (a.radius) assert(b.radius >= a.radius, id + ' radius');
  }
  assert.equal(C.weaponStats(id, 9).level, C.MAX_LEVEL, 'levels clamp');
}
assert.throws(() => C.weaponStats('sword', 1));

// Charms change the modifiers the arts use.
let build = C.newBuild();
assert.deepEqual(build.weapons, { ember: 1 });
const base = C.modifiers(build);
assert.equal(base.maxHp, 100); assert.equal(base.damage, 1); assert.equal(base.regen, 0);
for (const id of ['oil', 'oil', 'wick', 'shade', 'cloak']) build = C.applyChoice(build, { kind: 'charm', id });
const m = C.modifiers(build);
assert(Math.abs(m.damage - 1.2) < 1e-9 && Math.abs(m.cooldown - .93) < 1e-9 && Math.abs(m.area - 1.1) < 1e-9 && m.maxHp === 120 && m.regen > 0);
assert(Math.abs(C.weaponStats('ember', 1, m).damage - 12) < 1e-9);
assert(Math.abs(C.weaponStats('flare', 1, m).radius - 121) < 1e-9);

// Level-up offers: three distinct options, only legal ones.
for (let i = 0; i < 200; i++) {
  const offer = C.rollChoices(build, rng);
  assert.equal(offer.length, 3);
  assert.equal(new Set(offer.map(o => o.kind + o.id)).size, 3);
  for (const o of offer) assert(C.candidates(build).some(c => c.kind === o.kind && c.id === o.id && c.level === o.level));
}
// Slots: at most 4 arts and 4 charms; full builds stop offering new ones.
let full = C.newBuild();
for (const id of ['halo', 'firefly', 'sunbeam']) full = C.applyChoice(full, { kind: 'weapon', id });
for (const id of ['oil', 'wick', 'boots', 'shade']) full = C.applyChoice(full, { kind: 'charm', id });
const offers = C.candidates(full);
assert(!offers.some(o => o.id === 'pool' || o.id === 'flare' || o.id === 'lodestone' || o.id === 'cloak'), 'no new items past the slot limit');
assert(offers.every(o => o.level === 2));
// Everything maxed: the only offer is a heal.
for (const kind of ['weapons', 'charms']) for (const id in full[kind]) full[kind][id] = C.MAX_LEVEL;
assert.deepEqual(C.rollChoices(full, rng), [{ kind: 'heal', id: 'tea', level: 0 }]);
assert.deepEqual(C.applyChoice(full, { kind: 'heal' }), full);
assert.equal(C.applyChoice(full, { kind: 'weapon', id: 'halo' }).weapons.halo, C.MAX_LEVEL, 'levels cap at 5');
assert.throws(() => C.applyChoice(full, { kind: 'gold' }));
assert.equal(C.describe({ kind: 'weapon', id: 'halo', level: 1 }).tag, '새로 얻기');
assert.equal(C.describe({ kind: 'charm', id: 'oil', level: 3 }).tag, 'Lv.3');

// Pressure ramps up: more spawns, tougher shadows, new kinds over time.
for (let t = 10; t <= 600; t += 10) {
  assert(C.spawnRate(t) > C.spawnRate(t - 10)); assert(C.hpScale(t) > C.hpScale(t - 10));
  assert(C.enemyCap(t) >= C.enemyCap(t - 10) && C.enemyCap(t) <= C.MAX_ENEMIES);
}
assert.deepEqual(Object.keys(C.enemyMix(0)), ['moth']);
assert.deepEqual(Object.keys(C.enemyMix(599)).sort(), ['bat', 'golem', 'moth', 'vine', 'wisp']);
for (let i = 0; i < 300; i++) assert(C.enemyMix(30)[C.pickEnemy(30, rng)]);
assert.equal(C.enemyStats('moth', 0).hp, 8); assert(C.enemyStats('moth', 600).hp > 40);
assert.throws(() => C.enemyStats('dragon', 0));

// XP curve grows, gems match their value, score rewards time and dawn.
for (let lv = 2; lv < 60; lv++) assert(C.xpToNext(lv) > C.xpToNext(lv - 1));
assert.equal(C.xpToNext(1), 5);
assert.equal(C.gemFor(1).value, 1); assert.equal(C.gemFor(5).value, 4); assert.equal(C.gemFor(40).value, 12);
assert.equal(C.score(60, 100, 5, false), 600 + 200 + 120);
assert.equal(C.score(600, 0, 1, true) - C.score(600, 0, 1, false), 5000);
assert.equal(C.clock(0), '00:00'); assert.equal(C.clock(125.7), '02:05'); assert.equal(C.clock(600), '10:00');
console.log('PASS: lantern keeper rules — night length, bosses, 6 arts/6 charms, level-up offers, slots, scaling, score');
