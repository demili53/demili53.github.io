const assert = require('node:assert/strict');
const C = require('./missile-rush-core.js');
const rng = C.seeded(7);

// Operators: the four arithmetic gates change the fleet size, clamped to 0..MAX_UNITS.
assert.equal(C.applyOperator(3, { op: '+', v: 3 }), 6);
assert.equal(C.applyOperator(6, { op: '-', v: 2 }), 4);
assert.equal(C.applyOperator(4, { op: '×', v: 2 }), 8);
assert.equal(C.applyOperator(9, { op: '÷', v: 2 }), 4);
assert.equal(C.applyOperator(1, { op: '÷', v: 3 }), 1, 'division never wipes the fleet');
assert.equal(C.applyOperator(2, { op: '-', v: 5 }), 0, 'subtraction can wipe the fleet');
assert.equal(C.applyOperator(200, { op: '×', v: 3 }), C.MAX_UNITS);
assert.throws(() => C.applyOperator(3, { op: '?', v: 1 }));
assert.equal(C.gateLabel({ op: '-', v: 2 }), '−2'); assert.equal(C.gateLabel({ op: '×', v: 2 }), '×2');
assert(C.isGood({ op: '+', v: 1 }) && C.isGood({ op: '×', v: 2 }) && !C.isGood({ op: '-', v: 1 }) && !C.isGood({ op: '÷', v: 2 }));

// Shooting a gate: − counts down and flips to +, + counts up, × and ÷ stay fixed, at most MAX_SHIFTS steps.
assert.equal(C.MAX_SHIFTS, 3);
let g = { op: '-', v: 2, shifts: C.MAX_SHIFTS }; const seen = [];
for (let i = 0; i < 5; i++) { g = C.shiftGate(g); seen.push(C.gateLabel(g)); }
assert.deepEqual(seen, ['−1', '+1', '+2', '+2', '+2']);
assert(!C.shiftable(g) && C.shiftable({ op: '+', v: 2 }) && !C.shiftable({ op: '×', v: 2 }) && !C.shiftable({ op: '÷', v: 2 }));
assert.equal(C.gateLabel(C.shiftGate({ op: '÷', v: 2 })), '÷2');
assert(C.shiftCost(100, 10) > C.shiftCost(10, 10), 'a bigger fleet has to pour in more fire');
assert(C.shiftCost(0, 1) >= 4);

// Gate rows fill the field with 2 or 3 lanes and always offer a good and a bad lane.
for (const units of [1, 5, 30, 120, 300]) for (const wave of [1, 6, 14, 30]) for (const lanes of [2, 3]) for (let i = 0; i < 60; i++) {
  const row = C.rollRow(wave, units, lanes, rng);
  assert.equal(row.length, lanes);
  assert(row.some(C.isGood) && row.some(x => !C.isGood(x)), 'one good and one bad lane');
  for (const x of row) { assert.equal(x.shifts, C.MAX_SHIFTS); assert(Number.isInteger(x.v) && x.v >= 1); if (x.op === '×' || x.op === '÷') assert(x.v <= 3); }
}
assert.equal(C.laneOf(10, 2), 0); assert.equal(C.laneOf(470, 2), 1); assert.equal(C.laneOf(240, 3), 1); assert.equal(C.laneOf(-5, 3), 0); assert.equal(C.laneOf(999, 3), 2);

// Fleet: 25 units merge into a gunship, 5 into a fighter; the pieces always add back up.
assert.deepEqual(C.composition(5), { heavy: 0, fighter: 1, light: 0 });
assert.deepEqual(C.composition(87), { heavy: 3, fighter: 2, light: 2 });
for (let n = 0; n <= C.MAX_UNITS; n++) { const f = C.composition(n); assert.equal(f.heavy * 25 + f.fighter * 5 + f.light, n); }

// Firepower is proportional to the number of units for every weapon.
assert.equal(C.WEAPON_IDS.length, 11); assert.equal(C.WEAPON_MAX_LEVEL, 5);
for (const id of C.WEAPON_IDS) {
  const a = C.squadStats(10, 1, id, 1), b = C.squadStats(30, 1, id, 1);
  assert(Math.abs(b.dps / a.dps - 3) < 1e-9, `${id}: three times the units, three times the damage`);
  assert(Math.abs(a.damage * a.count / a.interval - a.dps) < 1e-9, `${id}: volley adds up to the dps`);
  assert(a.count <= C.WEAPONS[id].volley);
  assert(C.squadStats(10, 1, id, 3).dps > a.dps, `${id}: levels add damage`);
  assert(C.squadStats(10, 3, id, 1).dps > a.dps, `${id}: warhead tiers add damage`);
}
assert.equal(C.squadStats(0, 1, 'missile', 1).dps, 0);
assert.equal(C.squadStats(5, 1, 'nope', 1).weapon, 'missile');
assert(C.squadStats(5, 1, 'laser', 1).beam > 0 && C.squadStats(5, 1, 'chain', 2).chain === 3 && C.squadStats(5, 1, 'rail', 1).pierce > 50 && C.squadStats(5, 1, 'bounce', 2).bounce === 3 && C.squadStats(5, 1, 'wave', 1).wave > 0 && C.squadStats(5, 1, 'blast', 1).blast > 0 && C.squadStats(5, 1, 'homing', 1).homing > 0 && C.squadStats(5, 1, 'scatter', 1).spread > 0);
assert(C.squadStats(200, 1, 'missile', 1).radius > C.squadStats(5, 1, 'missile', 1).radius, 'a bigger fleet is a bigger target');

// The top level awakens a weapon: each one gains its own extra trait on top of the damage.
for (const id of C.WEAPON_IDS) { assert(C.WEAPONS[id].awaken, id); assert(C.squadStats(20, 1, id, 5).awakened && !C.squadStats(20, 1, id, 4).awakened); }
const top = id => C.squadStats(20, 1, id, 5), under = id => C.squadStats(20, 1, id, 4);
assert(top('missile').blast > 0 && !under('missile').blast);
assert(top('scatter').pierce === 1 && under('scatter').pierce === 0);
assert(top('laser').beam > under('laser').beam * 1.3);
assert(top('homing').count === under('homing').count + 4);
assert(top('blast').blast > under('blast').blast * 1.3);
assert(top('chain').chain === under('chain').chain + 3);
assert(top('wave').twin && !under('wave').twin);
assert(top('rail').blast > 0 && !under('rail').blast);
assert(top('bounce').bounce === under('bounce').bounce + 3 && top('bounce').pierce === 2);
assert(top('flame').flame > under('flame').flame * 1.25 && top('flame').burn === under('flame').burn * 2);
assert(top('nova').novaBurst && !under('nova').novaBurst && under('nova').nova > 0);

// Modules stack on any weapon: faster fire, critical hits, bigger shots. They cap at MODULE_MAX_LEVEL.
assert.deepEqual(C.MODULE_IDS, ['rate', 'crit', 'size']);
for (const id of C.WEAPON_IDS) {
  const base = C.squadStats(20, 1, id, 1), fast = C.squadStats(20, 1, id, 1, { rate: 5 });
  assert(fast.interval < base.interval && fast.dps > base.dps * 1.5, `${id}: rate module`);
  assert(Math.abs(fast.damage * fast.count / fast.interval - fast.dps) < 1e-9);
  assert(Math.abs(C.squadStats(20, 1, id, 1, { overdrive: true }).dps / base.dps - C.OVERDRIVE.rate) < 1e-9, `${id}: overdrive doubles the fire rate`);
}
assert.equal(C.squadStats(20, 1, 'missile', 1).crit, 0);
assert(Math.abs(C.squadStats(20, 1, 'missile', 1, { crit: 3 }).crit - 0.18) < 1e-9); assert.equal(C.CRIT_MULT, 2.5);
assert(C.squadStats(20, 1, 'blast', 1, { size: 5 }).blast > C.squadStats(20, 1, 'blast', 1).blast * 1.4);
assert.equal(C.squadStats(20, 1, 'missile', 1, { rate: 99 }).interval, C.squadStats(20, 1, 'missile', 1, { rate: 5 }).interval);
let mod = { mods: { rate: 0, crit: 0, size: 0 } };
for (let i = 1; i <= 5; i++) { mod = C.pickModule(mod.mods, 'crit'); assert(mod.leveled && mod.mods.crit === i && mod.bonus === 0); }
mod = C.pickModule(mod.mods, 'crit'); assert(!mod.leveled && mod.bonus === 2 && mod.mods.crit === 5 && mod.mods.rate === 0);
assert.throws(() => C.pickModule({}, 'nope'));
let sawModule = 0, sawWeapon = 0;
for (let i = 0; i < 300; i++) { const id = C.rollCrate('laser', { rate: 5, crit: 0, size: 0 }, rng); if (C.MODULES[id]) { sawModule++; assert.notEqual(id, 'rate', 'maxed modules are skipped'); } else { assert(C.WEAPONS[id]); sawWeapon++; } }
assert(sawModule > 50 && sawWeapon > 120);
assert(C.MODULES[C.rollCrate('laser', { rate: 5, crit: 5, size: 5 }, () => 0)], 'all maxed: still a module, paying units');
assert.equal(C.overdriveCharge('drone'), 1); assert(C.overdriveCharge('boss') > 5); assert(C.OVERDRIVE.need > 0 && C.OVERDRIVE.time > 0);

// Weapon crates: swap, level up to the cap, bonus units at the cap, levels remembered.
let w = { weapon: 'missile', levels: { missile: 1 } };
let r = C.pickWeapon(w, 'missile'); assert(r.leveled && r.levels.missile === 2 && r.bonus === 0);
for (let lv = 3; lv <= 5; lv++) { r = C.pickWeapon({ weapon: 'missile', levels: r.levels }, 'missile'); assert(r.leveled); assert.equal(r.levels.missile, lv); }
r = C.pickWeapon({ weapon: 'missile', levels: r.levels }, 'missile'); assert(r.bonus === 3 && !r.leveled && r.levels.missile === 5);
r = C.pickWeapon({ weapon: 'missile', levels: r.levels }, 'chain'); assert(r.weapon === 'chain' && r.levels.chain === 1 && r.levels.missile === 5 && !r.leveled);
assert.throws(() => C.pickWeapon(w, 'nope'));
for (let i = 0; i < 100; i++) assert(C.WEAPON_IDS.includes(C.rollWeapon('laser', rng)));

// Enemies grow with the wave; four bosses rotate every BOSS_EVERY waves.
assert(C.enemyStats('drone', 10).hp > C.enemyStats('drone', 1).hp);
assert(C.hpScale(20) > C.hpScale(10) && C.hpScale(1) === 1);
assert(C.isBossWave(5) && C.isBossWave(20) && !C.isBossWave(4));
assert.deepEqual([5, 10, 15, 20, 25].map(n => C.bossFor(n).id), ['fortress', 'carrier', 'divider', 'hydra', 'fortress']);
assert(C.enemyStats('boss', 10).hp > C.enemyStats('boss', 5).hp);
assert.deepEqual(C.enemyTypes(1), ['drone']);
for (const t of ['drone', 'zig', 'tank', 'gunner', 'bomber', 'splitter', 'dasher']) assert(C.enemyTypes(30).includes(t), t);
assert(!C.enemyTypes(30).includes('boss') && !C.enemyTypes(30).includes('shard'));
assert.equal(C.contactLoss('boss'), 6); assert(C.contactLoss('tank') > C.contactLoss('drone')); assert.equal(C.breachLoss('boss'), 0); assert(C.breachLoss('drone') >= 1);

// Wave scripts: timed events in order; normal waves bring formations and gate rows, boss waves a boss.
for (let wave = 1; wave <= 40; wave++) {
  const s = C.buildWave(wave, rng);
  assert.equal(s.wave, wave); assert.equal(s.boss, C.isBossWave(wave));
  for (let i = 1; i < s.events.length; i++) assert(s.events[i].t >= s.events[i - 1].t, 'events in time order');
  assert(s.events.some(e => e.kind === 'gates'), 'every wave has gates');
  for (const e of s.events) {
    if (e.kind === 'gates') assert(e.lanes === 2 || e.lanes === 3);
    if (e.kind === 'formation') { assert(C.FORMATION_IDS.includes(e.name)); assert(e.spawns.length > 0); for (const p of e.spawns) { assert(p.x >= 0 && p.x <= 1 && p.d >= 0); assert(C.ENEMIES[p.type].from <= wave, `${p.type} too early in wave ${wave}`); } }
  }
  if (s.boss) assert(s.events.some(e => e.kind === 'boss')); else { assert(s.events.some(e => e.kind === 'formation')); assert(s.enemies > 0); }
}
assert(C.buildWave(12, rng).enemies > C.buildWave(1, rng).enemies, 'later waves are busier');
for (const id of C.FORMATION_IDS) for (const n of [1, 3, 6]) { const f = C.FORMATIONS[id](n, rng); assert(f.length >= 1, id); for (const p of f) assert(p.x >= 0 && p.x <= 1 && p.d >= 0, id); }
const a = C.seeded(3), b = C.seeded(3); assert.deepEqual(C.buildWave(7, a), C.buildWave(7, b), 'same seed, same wave');

// Combo and grade.
assert.equal(C.comboMultiplier(0), 1); assert.equal(C.comboMultiplier(25), 1.5); assert.equal(C.comboMultiplier(999), 2);
assert.deepEqual([1, 5, 10, 15, 20].map(C.grade), ['D', 'C', 'B', 'A', 'S']);
assert.equal(C.evolution(1).tier, 1); assert.equal(C.evolution(99).tier, 5);
console.log('PASS: missile rush core (operators, gate rows, fleet composition, 11 weapons with awakening, modules, overdrive, crates, enemies, 4 bosses, wave scripts, combo, grade)');
