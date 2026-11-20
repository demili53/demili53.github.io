// Rules tests for "윌리를 찾아 보자" (scripts/sniper-core.js). Run: node scripts/test-shadow-sniper.cjs
const assert = require('assert');
const C = require('./sniper-core.js');

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('ok -', name); }

// A point on a person that a bullet actually reaches (not hidden by a prop).
function openPoint(stage, p, headOnly = false) {
  const b = C.personBox(stage, p);
  for (let fy = 0.08; fy < 0.95; fy += 0.04) for (let fx = -0.3; fx <= 0.3; fx += 0.1) {
    const x = p.x + fx * b.w, y = p.y - b.h + fy * b.h, hit = C.hitTest(stage, x, y);
    if (hit.kind === 'person' && hit.person === p && (!headOnly || hit.head)) return { x, y };
  }
  return null;
}
function noSway(run) { run.sway = () => ({ x: 0, y: 0 }); return run; }
function playUntilDone(run) { for (let i = 0; i < 400 && run.state === 'shot'; i++) run.update(0.05); }
// Move the target into the open so it can be shot, then return an aim point.
function exposeTarget(run) {
  const t = run.target; t.x = 800; t.y = 800; t.state = 'idle'; t.timer = 99;
  for (const p of run.stage.people) if (p !== t && Math.abs(p.x - t.x) < 40 && p.y > t.y - 10) p.x = 200;
  run.stage.props = run.stage.props.filter(o => !(Math.abs(o.x - t.x) < 200 && o.y > t.y - 60));
  return openPoint(run.stage, t);
}

test('every stage has exactly one person matching all four clues', () => {
  for (let level = 0; level < 18; level++) for (const seed of [1, 7, 99, 2026]) {
    const stage = C.makeStage(level, seed), look = C.targetLook(stage.loc);
    const matches = stage.people.filter(p => C.sameLook(p.look, look));
    assert.strictEqual(matches.length, 1, `level ${level} seed ${seed}`);
    assert.ok(matches[0].target);
    assert.strictEqual(stage.people.length, stage.loc.crowd);
  }
});

test('decoys differ by exactly one clue and the rest of the crowd by two or more', () => {
  for (let level = 0; level < 12; level++) {
    const stage = C.makeStage(level, 5 + level), look = C.targetLook(stage.loc);
    const decoys = stage.people.filter(p => p.decoy);
    assert.strictEqual(decoys.length, stage.loc.decoys);
    for (const d of decoys) assert.strictEqual(C.differingTraits(d.look, look).length, 1);
    for (const p of stage.people.filter(q => !q.decoy && !q.target)) assert.ok(C.differingTraits(p.look, look).length >= 2);
  }
});

test('stages are reproducible from the seed', () => {
  const a = C.makeStage(3, 1234), b = C.makeStage(3, 1234);
  assert.deepStrictEqual(a.people.map(p => [p.x, p.y, p.look]), b.people.map(p => [p.x, p.y, p.look]));
});

test('later rounds of the six locations get harder', () => {
  const a = C.locationFor(0), b = C.locationFor(6), c = C.locationFor(30);
  assert.strictEqual(a.name, b.name);
  assert.ok(b.time < a.time && b.crowd > a.crowd && b.decoys > a.decoys);
  assert.ok(c.time >= 55 && c.decoys <= 9);
});

test('a prop in front hides a person and stops the bullet', () => {
  const stage = C.makeStage(0, 3), p = stage.people[1];
  p.x = 800; p.y = 600;
  stage.props = [{ kind: 'crates', x: 800, y: 640, ...C.PROP_SHAPES.crates }];
  const b = C.personBox(stage, p), lowY = p.y - b.h * 0.15;
  assert.ok(C.propSolid(stage, stage.props[0], 800, lowY));
  assert.strictEqual(C.hitTest(stage, 800, lowY).kind, 'prop');
  const top = C.hitTest(stage, 800, p.y - b.h + 3);
  assert.strictEqual(top.kind, 'person'); assert.ok(top.head);
});

test('shooting Willy clears the level and scores the breakdown', () => {
  const run = noSway(new C.SniperRun({ seed: 11, weapon: 'scout' })); run.begin();
  const pt = exposeTarget(run); assert.ok(pt);
  run.setAim(pt.x, pt.y);
  assert.strictEqual(run.fire().kind, 'target');
  assert.strictEqual(run.state, 'shot');
  run.update(0.5); assert.strictEqual(run.shot.resolved, false, 'bullet still flying');
  playUntilDone(run);
  assert.strictEqual(run.state, 'clear');
  const r = run.result;
  assert.strictEqual(r.gained, Object.values(r.breakdown).reduce((a, b) => a + b, 0));
  assert.strictEqual(r.stars, 3); assert.strictEqual(run.score, r.gained);
  assert.ok(run.next()); assert.strictEqual(run.level, 1); assert.strictEqual(run.state, 'brief');
});

test('a head shot adds the precision bonus', () => {
  const run = noSway(new C.SniperRun({ seed: 12, weapon: 'scout' })); run.begin();
  exposeTarget(run); const pt = openPoint(run.stage, run.target, true); assert.ok(pt);
  run.setAim(pt.x, pt.y); run.fire(); playUntilDone(run);
  assert.strictEqual(run.result.breakdown.head, 600);
});

test('shooting a decoy fails with the differing clue named', () => {
  const run = noSway(new C.SniperRun({ seed: 13, weapon: 'scout' })); run.begin();
  const d = run.stage.people.find(p => p.decoy); d.x = 800; d.y = 800; d.timer = 99;
  run.stage.props = []; for (const p of run.stage.people) if (p !== d && Math.abs(p.x - 800) < 40) p.x = 150;
  const pt = openPoint(run.stage, d); run.setAim(pt.x, pt.y);
  assert.strictEqual(run.fire().kind, 'innocent'); playUntilDone(run);
  assert.strictEqual(run.state, 'failed'); assert.strictEqual(run.lives, 2);
  assert.match(run.message, /가짜/);
  const before = run.stage; assert.ok(run.next()); assert.notStrictEqual(run.stage, before, 'retry gets a new crowd');
  assert.strictEqual(run.level, 0);
});

test('three misses lose a life, and losing every life ends the run', () => {
  const run = noSway(new C.SniperRun({ seed: 14, weapon: 'scout' }));
  for (let life = 3; life > 0; life--) {
    run.begin(); run.stage.people.forEach(p => { p.x = 60; p.y = 880; p.timer = 99; }); run.stage.props = [];
    for (let i = 0; i < 3; i++) { run.setAim(1500, run.stage.horizon + 30); assert.strictEqual(run.fire().kind, 'miss'); playUntilDone(run); }
    assert.strictEqual(run.lives, life - 1);
    if (life > 1) { assert.strictEqual(run.state, 'failed'); run.next(); }
  }
  assert.strictEqual(run.state, 'over'); assert.strictEqual(run.next(), false);
});

test('running out of time costs a life', () => {
  const run = new C.SniperRun({ seed: 15, weapon: 'scout' }); run.begin(); run.time = 0.04; run.update(0.05);
  assert.strictEqual(run.state, 'failed'); assert.match(run.message, /시간/);
});

test('skipping bullet time resolves the shot exactly once', () => {
  const run = noSway(new C.SniperRun({ seed: 16, weapon: 'scout' })); run.begin();
  run.stage.people.forEach(p => { p.x = 60; p.y = 880; p.timer = 99; }); run.stage.props = [];
  run.setAim(1500, run.stage.horizon + 30); run.fire();
  assert.ok(run.skip()); assert.strictEqual(run.misses, 1); assert.strictEqual(run.state, 'play');
  assert.strictEqual(run.skip(), false); assert.strictEqual(run.misses, 1);
});

test('pause freezes the clock and fire is blocked', () => {
  const run = new C.SniperRun({ seed: 17, weapon: 'scout' }); run.begin(); const t = run.time;
  assert.ok(run.pause()); run.update(0.05); assert.strictEqual(run.time, t);
  assert.strictEqual(run.fire().kind, 'blocked');
  assert.ok(run.pause()); run.update(0.05); assert.ok(run.time < t);
});

test('holding breath shrinks sway and the breath meter runs out', () => {
  const run = new C.SniperRun({ seed: 18, weapon: 'scout' }); run.begin(); run.elapsed = 0.4;
  const loose = Math.hypot(run.sway().x, run.sway().y); run.setSteady(true);
  const tight = Math.hypot(run.sway().x, run.sway().y); assert.ok(tight < loose);
  for (let i = 0; i < 64 && run.steady; i++) run.update(0.05);
  assert.strictEqual(run.steady, false); assert.ok(run.breath < 0.02, 'breath used up');
  run.setSteady(true); assert.strictEqual(run.steady, false, 'cannot hold an empty breath');
  for (let i = 0; i < 60; i++) run.update(0.05); assert.ok(run.breath > 0.9, 'breath refills');
});

test('the crowd moves and never walks off the square', () => {
  const run = new C.SniperRun({ seed: 19, weapon: 'scout' }); run.begin();
  const start = run.stage.people.map(p => [p.x, p.y]);
  for (let i = 0; i < 400; i++) run.update(0.05);
  if (run.state !== 'play') return;
  assert.ok(run.stage.people.some((p, i) => Math.hypot(p.x - start[i][0], p.y - start[i][1]) > 20));
  for (const p of run.stage.people) { assert.ok(p.x >= 40 && p.x <= C.WORLD.width - 40); assert.ok(p.y > run.stage.horizon && p.y <= C.WORLD.height); }
});

test('a new run starts at the armory and the rifle choice sets its handling', () => {
  const run = new C.SniperRun({ seed: 30 });
  assert.strictEqual(run.state, 'armory'); assert.strictEqual(run.begin(), false); assert.strictEqual(run.fire().kind, 'blocked');
  assert.strictEqual(run.chooseWeapon('laser'), false);
  assert.ok(run.chooseWeapon('heavy')); assert.strictEqual(run.state, 'brief'); assert.strictEqual(run.chooseWeapon('scout'), false);
  const s = C.weaponStats;
  assert.ok(s('heavy').zoom > s('scout').zoom && s('heavy').pierce === 1);
  assert.ok(s('silent').silent && s('silent').misses === 4);
  assert.ok(s('rapid').quick);
  assert.strictEqual(Object.keys(C.WEAPONS).length, 4);
  for (const id of Object.keys(C.WEAPONS)) assert.ok(C.ABILITIES[id], id);
});

test('upgrades change the numbers they promise', () => {
  const base = C.weaponStats('scout'), up = C.weaponStats('scout', { stock: 2, lungs: 1, lens: 1, mag: 1, ap: 1, timer: 2, hollow: 1, charge: 1 });
  assert.ok(Math.abs(up.sway - base.sway * 0.64) < 1e-9); assert.ok(up.breath > base.breath);
  assert.strictEqual(up.zoom, base.zoom + 0.5); assert.strictEqual(up.misses, 4); assert.strictEqual(up.pierce, 1);
  assert.strictEqual(up.timeBonus, 20); assert.ok(up.head > 1 && up.headBonus === 200); assert.strictEqual(up.charges, 2);
  const run = new C.SniperRun({ seed: 31, weapon: 'scout' }); run.mods = { timer: 1 }; run.loadLevel();
  assert.strictEqual(run.time, run.stage.loc.time + 10);
});

test('after a clear three different upgrades are offered and picking one moves on', () => {
  const run = noSway(new C.SniperRun({ seed: 32, weapon: 'silent' })); run.begin();
  const pt = exposeTarget(run); run.setAim(pt.x, pt.y); run.fire(); playUntilDone(run);
  assert.strictEqual(run.state, 'clear'); assert.strictEqual(run.offer.length, 3); assert.strictEqual(new Set(run.offer).size, 3);
  assert.ok(!run.offer.includes('suppressor'), 'the silent carbine is already quiet');
  assert.ok(!run.offer.includes('medkit'), 'no med kit at full health');
  assert.strictEqual(run.pickUpgrade('nope'), false);
  const id = run.offer[0]; assert.ok(run.pickUpgrade(id));
  assert.strictEqual(run.state, 'brief'); assert.strictEqual(run.level, 1); assert.deepStrictEqual(run.offer, []);
  if (id !== 'medkit') assert.strictEqual(run.mods[id], 1);
  // maxed upgrades are never offered again
  const r2 = new C.SniperRun({ seed: 33, weapon: 'scout' }); for (const [k, u] of Object.entries(C.UPGRADES)) if (k !== 'stock') r2.mods[k] = u.max;
  r2.lives = 3; for (let i = 0; i < 20; i++) { r2.level = i; assert.deepStrictEqual(r2.makeOffer().filter(x => x !== 'medkit'), ['stock']); }
});

test('the heavy rifle punches through one piece of cover, the scout rifle does not', () => {
  const stage = C.makeStage(0, 34), p = stage.people[1]; p.x = 800; p.y = 600;
  stage.props = [{ kind: 'crates', x: 800, y: 640, ...C.PROP_SHAPES.crates }];
  const b = C.personBox(stage, p), y = p.y - b.h * 0.15;
  assert.strictEqual(C.hitTest(stage, 800, y).kind, 'prop');
  const hit = C.hitTest(stage, 800, y, { pierce: 1 }); assert.strictEqual(hit.kind, 'person'); assert.strictEqual(hit.pierced.length, 1);
  stage.props.push({ kind: 'barrel', x: 800, y: 620, ...C.PROP_SHAPES.barrel });
  assert.strictEqual(C.hitTest(stage, 800, p.y - 4, { pierce: 1 }).kind, 'prop', 'two layers stop one pierce');
});

test('a pierced kill scores a penetration bonus, more with the breacher synergy', () => {
  const run = noSway(new C.SniperRun({ seed: 35, weapon: 'heavy' })); run.mods = { ap: 1 }; run.begin();
  exposeTarget(run); const t = run.target; run.stage.props.push({ kind: 'crates', x: t.x, y: t.y + 30, ...C.PROP_SHAPES.crates });
  const b = C.personBox(run.stage, t); run.setAim(t.x, t.y - b.h * 0.12);
  assert.strictEqual(run.fire().kind, 'target'); playUntilDone(run);
  assert.ok(run.hasSynergy('breacher')); assert.strictEqual(run.result.breakdown.pierce, 700);
});

test('silent misses do not scare the crowd; loud ones do', () => {
  for (const [weapon, scared] of [['silent', false], ['scout', true]]) {
    const run = noSway(new C.SniperRun({ seed: 36, weapon })); run.begin(); run.stage.props = [];
    run.stage.people.forEach(p => { p.x = 300; p.y = 800; p.timer = 99; p.state = 'idle'; });
    run.setAim(1500, run.stage.horizon + 30); run.fire(); run.skip();
    assert.strictEqual(run.stage.people.some(p => p.state === 'flee'), scared, weapon);
  }
});

test('a semi-auto miss skips slow motion and the next shot is ready at once', () => {
  const run = noSway(new C.SniperRun({ seed: 37, weapon: 'rapid' })); run.begin(); run.stage.props = [];
  run.stage.people.forEach(p => { p.x = 100; p.y = 880; p.timer = 99; });
  run.setAim(1500, run.stage.horizon + 30); assert.strictEqual(run.fire().kind, 'miss');
  assert.strictEqual(run.state, 'play'); assert.strictEqual(run.misses, 1); assert.ok(run.lastShot);
  run.fire(); run.fire(); assert.strictEqual(run.state, 'shot', 'the third miss plays out the failure'); playUntilDone(run);
  assert.strictEqual(run.state, 'failed');
});

test('special abilities: focus stops sway, spare round saves a miss, one use per stage', () => {
  const run = new C.SniperRun({ seed: 38, weapon: 'scout' }); run.begin(); run.elapsed = 1;
  assert.ok(run.useAbility()); assert.deepStrictEqual(run.sway(), { x: 0, y: 0 }); assert.strictEqual(run.useAbility(), false);
  for (let i = 0; i < 90; i++) run.update(0.05); assert.strictEqual(run.focus, false); assert.strictEqual(run.useAbility(), false, 'no charges left');
  const s = noSway(new C.SniperRun({ seed: 39, weapon: 'silent' })); s.begin(); s.stage.props = []; s.stage.people.forEach(p => { p.x = 100; p.y = 880; p.timer = 99; });
  assert.ok(s.useAbility()); s.setAim(1500, s.stage.horizon + 30); s.fire(); s.skip();
  assert.strictEqual(s.misses, 0); assert.strictEqual(s.spareRound, false);
  const h = new C.SniperRun({ seed: 40, weapon: 'heavy' }); h.mods = { charge: 1 }; h.loadLevel(); h.begin();
  assert.strictEqual(h.charges, 2); assert.ok(h.useAbility()); assert.ok(h.thermal);
});

test('the med kit restores a life', () => {
  const run = noSway(new C.SniperRun({ seed: 41, weapon: 'scout' })); run.lives = 2; run.level = 3; run.loadLevel(); run.begin();
  const pt = exposeTarget(run); run.setAim(pt.x, pt.y); run.fire(); playUntilDone(run);
  run.offer = ['medkit', 'stock', 'lens']; assert.ok(run.pickUpgrade('medkit')); assert.strictEqual(run.lives, 3);
});

console.log(`\n${passed} tests passed`);
