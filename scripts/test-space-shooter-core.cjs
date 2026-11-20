// 비행기 게임 규칙 모듈 검증: node scripts/test-space-shooter-core.cjs
const assert = require('node:assert/strict');
const C = require('./space-shooter-core.js');
const Sprites = require('./shooter-sprites.js');
let n = 0;
const check = (name, fn) => { fn(); n += 1; console.log(`PASS ${n}. ${name}`); };
const player = { x: 240, y: 560 };

check('웨이브 편성은 같은 번호면 항상 같다', () => assert.deepEqual(C.wavePlan(7), C.wavePlan(7)));
check('5웨이브마다 보스만 등장한다', () => { for (const w of [5, 10, 15, 20]) { const p = C.wavePlan(w); assert.equal(p.boss, true); assert.deepEqual(p.events.map(e => e.type), ['boss']); } assert.ok(!C.wavePlan(4).boss); });
check('편성표는 시간순이고 뒤 웨이브일수록 적이 많다', () => {
  for (let w = 1; w <= 24; w += 1) { const p = C.wavePlan(w); if (p.boss) continue; assert.ok(p.events.length >= 6); for (let i = 1; i < p.events.length; i += 1) assert.ok(p.events[i].t >= p.events[i - 1].t); p.events.forEach(e => assert.ok(C.ENEMIES[e.type], e.type)); }
  assert.ok(C.wavePlan(12).events.length > C.wavePlan(1).events.length);
});
check('수송기는 3웨이브 주기로 나온다', () => { assert.ok(C.wavePlan(2).events.some(e => e.type === 'carrier')); assert.ok(!C.wavePlan(3).events.some(e => e.type === 'carrier')); });
check('무기 7종은 강화 단계마다 화력이 줄지 않는다', () => {
  for (const key of C.WEAPON_KEYS) { let before = 0; for (let level = 1; level <= C.MAX_LEVEL; level += 1) { const total = C.shots(key, level).reduce((sum, s) => sum + s.dmg, 0) / C.fireInterval(key, 'balanced', 0); assert.ok(total >= before, `${key} ${level}`); before = total; } }
  assert.ok(C.shots('missile', 3).some(s => s.homing)); assert.ok(C.shots('laser', 1).every(s => s.pierce > 0));
});
check('EX 단계에서 무기마다 성질이 바뀐다', () => {
  assert.equal(C.MAX_LEVEL, 6); assert.equal(C.WEAPON_KEYS.length, 7);
  const ex = key => C.shots(key, 6), before = key => C.shots(key, 5);
  assert.ok(ex('vulcan').length > before('vulcan').length);
  assert.ok(ex('spread').every(s => s.bounce > 0) && before('spread').every(s => !s.bounce));
  assert.ok(ex('laser').every(s => s.pierce >= 99));
  assert.ok(ex('missile').some(s => s.splash) && !before('missile').some(s => s.splash));
  assert.ok(ex('plasma').every(s => s.shards) && before('plasma').every(s => s.splash && !s.shards));
  assert.ok(ex('chain')[0].chain > before('chain')[0].chain);
  assert.ok(ex('wave')[0].cancel && !before('wave')[0].cancel);
  for (const key of C.WEAPON_KEYS) for (const field of ['name', 'letter', 'color', 'note', 'ex', 'bomb']) assert.ok(C.WEAPONS[key][field], `${key}.${field}`);
  assert.equal(new Set(C.WEAPON_KEYS.map(key => C.WEAPONS[key].letter)).size, 7);
});
check('보조 무기 단계와 무기 숙련 단계', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(C.subLevel), [1, 1, 1, 2, 3, 3]);
  assert.deepEqual([0, 14, 15, 40, 79, 80, 500].map(C.masteryTier), [0, 0, 1, 2, 2, 3, 3]);
});
check('무기 강화 선택지가 있다', () => { for (const id of ['option', 'pierce', 'crit', 'sub', 'keep']) assert.ok(C.UPGRADES.some(u => u.id === id), id); });
check('연사 강화와 기체 특성이 발사 간격에 반영된다', () => { assert.ok(C.fireInterval('vulcan', 'speed', 0) < C.fireInterval('vulcan', 'balanced', 0)); assert.ok(C.fireInterval('vulcan', 'balanced', 2) < C.fireInterval('vulcan', 'balanced', 0)); });
check('적 체력은 웨이브에 따라 오른다', () => assert.ok(C.makeEnemy('grunt', 10, 0, 0).hp > C.makeEnemy('grunt', 1, 0, 0).hp));
check('모든 적 종류가 움직이고 화면 밖으로 나가면 사라진다', () => {
  for (const type of Object.keys(C.ENEMIES)) { const e = C.makeEnemy(type, 3, 240, -20); for (let i = 0; i < 1800 && !e.gone; i += 1) C.stepEnemy(e, 1 / 60, player, 3); assert.ok(Number.isFinite(e.x) && Number.isFinite(e.y), type); }
  const e = C.makeEnemy('grunt', 1, 240, -20); for (let i = 0; i < 1200; i += 1) C.stepEnemy(e, 1 / 60, player, 1); assert.equal(e.gone, true);
});
check('저격기는 조준선을 보여 준 뒤에 쏜다', () => {
  const e = C.makeEnemy('sniper', 4, 240, -20, { move: 'hover', holdY: 100 }); let aimedFirst = false, fired = false;
  for (let i = 0; i < 900 && !fired; i += 1) { const out = C.stepEnemy(e, 1 / 60, player, 4); if (e.aim > 0) aimedFirst = true; if (out.length) fired = true; }
  assert.ok(aimedFirst && fired);
});
check('보스는 파괴자 → 직조자 → 요새 순서로 돌아온다', () => assert.deepEqual([5, 10, 15, 20].map(w => C.bossKindFor(w).id), ['destroyer', 'weaver', 'fortress', 'destroyer']));
check('보스는 등장 후 세 가지 공격을 모두 쓴다', () => {
  for (const wave of [5, 10, 15]) { const boss = C.makeBoss(wave), seen = new Set(); let bullets = 0; for (let i = 0; i < 60 * 60; i += 1) { if (boss.rest > 0) seen.add(C.nextAttack(boss)); bullets += C.stepBoss(boss, 1 / 60, player, Math.random).length; } assert.equal(boss.entering, false); assert.ok(bullets > 50); assert.deepEqual([...seen].sort(), [...C.bossKindFor(wave).attacks].sort()); }
});
check('보스 체력은 단계가 오를수록 늘고 절반 이하에서 과부하가 된다', () => { const a = C.makeBoss(5), b = C.makeBoss(20); assert.ok(b.maxHp > a.maxHp); assert.equal(C.bossEnraged(a), false); a.hp = a.maxHp * .5; assert.equal(C.bossEnraged(a), true); });
check('요새의 탄막 벽에는 지나갈 틈이 있다', () => {
  const boss = C.makeBoss(15); let wall = null;
  for (let i = 0; i < 60 * 90 && !wall; i += 1) { const gap = boss.wallGap, out = C.stepBoss(boss, 1 / 60, player, Math.random); if (gap !== null && out.length >= 6) wall = { gap, out }; }
  assert.ok(wall); assert.ok(wall.out.every(b => Math.abs(b.x - wall.gap) > 30));
});
check('기뢰는 시간이 지나면 여덟 방향으로 터진다', () => { const mine = { x: 100, y: 100, vx: 0, vy: 30, r: 8, kind: 'mine', fuse: .1 }; let out = null; for (let i = 0; i < 30 && !out; i += 1) out = C.stepBullet(mine, 1 / 60, player); assert.equal(out.length, 8); assert.equal(mine.dead, true); });
check('화면 밖 적탄은 정리된다', () => { const b = { x: 100, y: 630, vx: 0, vy: 300, r: 4 }; for (let i = 0; i < 30; i += 1) C.stepBullet(b, 1 / 60, player); assert.equal(b.dead, true); });
check('연쇄 배율은 오르다가 한도에서 멈춘다', () => { assert.equal(C.chainMultiplier(0), 1); assert.ok(C.chainMultiplier(10) > C.chainMultiplier(5)); assert.equal(C.chainMultiplier(35), C.chainMultiplier(500)); });
check('강화 선택지는 서로 다른 세 개이고 한도에 닿은 것은 빠진다', () => {
  const picks = C.upgradeChoices({}, { lives: 3, bombs: 2, shield: false }, Math.random); assert.equal(new Set(picks.map(p => p.id)).size, 3);
  for (let i = 0; i < 40; i += 1) { const ids = C.upgradeChoices({ magnet: 1, damage: 4 }, { lives: 6, bombs: 5, shield: true }, Math.random).map(p => p.id); for (const id of ['magnet', 'damage', 'life', 'bomb', 'shield']) assert.ok(!ids.includes(id)); }
});
check('등급은 점수가 높을수록 좋아진다', () => { const order = ['D', 'C', 'B', 'A', 'S']; assert.ok(order.indexOf(C.grade(10000000)) >= order.indexOf(C.grade(0))); assert.notEqual(C.grade(10000000), C.grade(0)); });
check('모든 기체, 적, 보스에 그림이 있다', () => { for (const key of [...Object.keys(C.SHIPS).map(s => `player-${s}`), ...Object.keys(C.ENEMIES), ...C.BOSSES.map(b => `boss-${b.id}`)]) assert.ok(Sprites.has(key), key); });
console.log(`space-shooter core: ${n} checks passed`);
