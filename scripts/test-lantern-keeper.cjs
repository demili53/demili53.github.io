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
assert.equal(C.WEAPON_IDS.length, 11); assert.equal(C.CHARM_IDS.length, 6);
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
for (const id of ['halo', 'firefly', 'sunbeam', 'chain']) full = C.applyChoice(full, { kind: 'weapon', id });
for (const id of ['oil', 'wick', 'boots', 'shade']) full = C.applyChoice(full, { kind: 'charm', id });
const offers = C.candidates(full);
assert(!offers.some(o => ['pool', 'flare', 'wing', 'whip', 'beacon', 'seed', 'lodestone', 'cloak'].includes(o.id)), 'no new items past the slot limit (5 arts, 4 charms)');
assert(offers.every(o => o.level === 2));
// Evolutions: Lv.5 art + its paired charm. Offered once, weighted heavily, then gone.
for (const kind of ['weapons', 'charms']) for (const id in full[kind]) full[kind][id] = C.MAX_LEVEL;
const evo = C.candidates(full).filter(o => o.kind === 'evolve').map(o => o.id).sort();
assert.deepEqual(evo, ['ember', 'halo', 'sunbeam'], 'firefly and chain need the lodestone');
assert.throws(() => C.applyChoice(full, { kind: 'evolve', id: 'firefly' }));
{ let n = 0; for (let i = 0; i < 200; i++) n += C.rollChoices(full, rng).filter(o => o.kind === 'evolve').length; assert(n / 200 > 2, 'evolutions crowd out polish: ' + n / 200); }
for (const id of evo) full = C.applyChoice(full, { kind: 'evolve', id });
assert(full.evolved.ember && full.evolved.halo && full.evolved.sunbeam);
// Starlight polish: Lv.5 arts take up to 3 stacks of +12% damage, then only tea is left.
let offer2 = C.rollChoices(full, rng);
assert(offer2.length === 3 && offer2.every(o => o.kind === 'polish'), 'polish follows evolutions');
const evoDmg = C.weaponStats('ember', 5, undefined, true).damage;
for (const id in full.weapons) for (let i = 0; i < C.MAX_POLISH; i++) full = C.applyChoice(full, { kind: 'polish', id });
assert.equal(full.polish.ember, C.MAX_POLISH);
assert(Math.abs(C.weaponStats('ember', 5, undefined, true, 3).damage - evoDmg * 1.36) < 1e-9);
assert.match(C.describe({ kind: 'polish', id: 'ember', level: 2 }).text, /\+12% \(연마 2\/3\)/);
assert.throws(() => C.applyChoice(C.newBuild(), { kind: 'polish', id: 'ember' }), /Lv\.5/);
assert.deepEqual(C.rollChoices(full, rng), [{ kind: 'heal', id: 'tea', level: 0 }]);
// Boss chest: three upgrades, evolutions take priority, new arts are never handed out.
let cb = C.newBuild(); cb = C.applyChoice(cb, { kind: 'charm', id: 'oil' }); for (let i = 0; i < 4; i++) cb = C.applyChoice(cb, { kind: 'weapon', id: 'ember' });
cb = C.applyChoice(cb, { kind: 'weapon', id: 'halo' });
const roll = C.chestRolls(cb, rng);
assert.equal(roll.picks.length, 3); assert.equal(roll.picks[0].kind, 'evolve'); assert(roll.build.evolved.ember);
assert(roll.picks.every(c => c.kind !== 'weapon' || c.level > 1));
assert.equal(C.chestRolls(full, rng).picks.length, 0, 'nothing left to upgrade');
assert.deepEqual(C.applyChoice(full, { kind: 'heal' }), full);
assert.equal(C.applyChoice(full, { kind: 'weapon', id: 'halo' }).weapons.halo, C.MAX_LEVEL, 'levels cap at 5');
for (const id of C.WEAPON_IDS) {
  const e = C.EVOLUTIONS[id]; assert(e && C.CHARMS[e.charm], id + ' has an evolution with a real charm');
  const a5 = C.weaponStats(id, 5), ev = C.weaponStats(id, 5, undefined, true);
  assert(ev.evolved && ev.damage > a5.damage * 1.3 && ev.name === e.name, id + ' evolution is stronger');
}
assert.equal(C.weaponStats('ember', 5, undefined, true).blast, 46);
assert.equal(C.weaponStats('wing', 5, undefined, true).pierce, Infinity);
assert(C.weaponStats('flare', 5, undefined, true).stun > 0 && C.weaponStats('pool', 5, undefined, true).slow > 0);
assert.equal(C.weaponStats('chain', 5, undefined, true).jumps, 12);
assert(C.weaponStats('seed', 5, undefined, true).garden && C.weaponStats('beacon', 5, undefined, true).count === 5);
// Cards say what the next level changes and how to evolve.
assert.match(C.describe({ kind: 'weapon', id: 'ember', level: 3 }).text, /피해 12→14/);
assert.match(C.describe({ kind: 'weapon', id: 'ember', level: 1 }).hint, /Lv\.5 \+ 등잔 기름 → 혜성 화살/);
assert.equal(C.describe({ kind: 'evolve', id: 'whip', level: 6 }).tag, '진화');
assert.match(C.describe({ kind: 'charm', id: 'boots', level: 1 }).hint, /새벽 파동/);
for (const id of C.WEAPON_IDS) for (let lv = 2; lv <= 5; lv++) assert(C.upgradeText(id, lv).length > 0, id + lv);
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
console.log('PASS: lantern keeper rules — night length, bosses, 11 arts/6 charms, evolutions, upgrade text, level-up offers, slots, scaling, score');
