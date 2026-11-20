// 새벽의 요새 규칙 엔진 테스트. 실행: node scripts/test-dawn-bastion.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const D = require('./dawn-core.js');

const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const fresh = (seed = 7) => { const g = new D.Game(seeded(seed)); g.start(); return g; };
const run = (g, seconds) => { for (let t = 0; t < seconds; t += .05) g.step(.05); };
let count = 0;
const test = (name, fn) => { fn(); count++; };

test('길과 칸 배치', () => {
  assert.equal(D.CELLS.length, 16);
  assert.ok(D.TRACK_LENGTH > 2000);
  const start = D.trackPoint(0), end = D.trackPoint(D.TRACK_LENGTH);
  assert.deepEqual([start.x, start.y], D.TRACK[0]);
  assert.deepEqual([end.x, end.y], D.TRACK[D.TRACK.length - 1]);
  for (const c of D.CELLS) assert.ok(D.distanceToTrack(c.x, c.y) > 100, '칸은 길과 겹치지 않는다');
});

test('시작 전에는 아무것도 할 수 없다', () => {
  const g = new D.Game(seeded(1));
  assert.equal(g.summon(), -1); assert.equal(g.amplify(), false); assert.equal(g.flash(), false);
  g.step(1); assert.equal(g.time, 0);
  assert.equal(g.start(), true); assert.equal(g.start(), false);
});

test('소환은 에테르를 쓰고 빈 칸에 타워를 놓는다', () => {
  const g = fresh();
  const index = g.summon();
  assert.ok(index >= 0 && g.cells[index].tower);
  assert.equal(g.gold, 80); assert.equal(g.summonCost, 24);
  g.gold = 0; assert.equal(g.summon(), -1);
  g.gold = 1e6; while (g.summon() >= 0); assert.equal(g.emptyCells().length, 0);
  assert.equal(g.summon(), -1);
});

test('같은 종류·등급만 합성되고 한 등급 오른다', () => {
  const g = fresh();
  g.place(0, 'arrow', 1); g.place(1, 'arrow', 1); g.place(2, 'cannon', 1); g.place(3, 'arrow', 2);
  assert.equal(g.canMerge(0, 1), true); assert.equal(g.canMerge(0, 2), false); assert.equal(g.canMerge(0, 3), false); assert.equal(g.canMerge(0, 0), false);
  assert.deepEqual(g.mergePair(), [0, 1]);
  assert.equal(g.drop(0, 1), 'merge');
  assert.equal(g.cells[0].tower, null); assert.equal(g.cells[1].tower.tier, 2); assert.ok(D.TOWERS[g.cells[1].tower.type]);
  assert.equal(g.merges, 1);
  g.place(4, 'frost', D.MAX_TIER); g.place(5, 'frost', D.MAX_TIER);
  assert.equal(g.canMerge(4, 5), false, '최고 등급은 합성되지 않는다');
});

test('이동, 자리 교환, 판매', () => {
  const g = fresh();
  g.place(0, 'arrow', 1); g.place(1, 'cannon', 3);
  assert.equal(g.drop(0, 5), 'move'); assert.equal(g.cells[5].tower.type, 'arrow');
  assert.equal(g.drop(5, 1), 'swap'); assert.equal(g.cells[5].tower.type, 'cannon'); assert.equal(g.cells[1].tower.type, 'arrow');
  assert.equal(g.drop(9, 1), false);
  assert.equal(g.sellValue(5), 40);
  const gold = g.gold; assert.equal(g.sell(5), true); assert.equal(g.gold, gold + 40); assert.equal(g.sell(5), false);
});

test('등급과 강화가 능력치를 올린다', () => {
  const g = fresh();
  const a = g.towerStats('arrow', 1), b = g.towerStats('arrow', 2);
  assert.ok(Math.abs(b.damage / a.damage - D.GROWTH) < 1e-9); assert.ok(b.range > a.range); assert.ok(b.interval < a.interval);
  g.gold = 500; assert.equal(g.amplify(), true); assert.equal(g.gold, 380); assert.equal(g.amplifyCost, 180);
  assert.ok(Math.abs(g.towerStats('arrow', 1).damage / a.damage - 1.06) < 1e-9);
  assert.equal(g.reaches(0, 'frost', 1), true); assert.equal(g.reaches(5, 'frost', 1), false, '안쪽 칸의 냉기탑은 길에 닿지 않는다'); assert.equal(g.reaches(5, 'laser', 1), true);
});

test('타워 일곱 종이 모두 적에게 피해를 준다', () => {
  for (const type of D.DECK) {
    const g = fresh(); g.spawnClock = 1e9; g.place(1, type, 3);
    const e = g.spawn('armored', 240); e.speed = 0; e.hp = e.maxHp = 1e6;
    run(g, 4);
    assert.ok(e.hp < e.maxHp, type + ' 피해');
    if (type === 'frost') assert.ok(e.slow > 0);
    if (type === 'venom') assert.ok(e.poison > 0);
    if (type === 'flame') assert.ok(e.burn > 0);
  }
});

test('열충격: 연소와 둔화가 겹치면 피해가 늘어난다', () => {
  const g = fresh(); const a = g.spawn('grunt', 100), b = g.spawn('grunt', 100);
  a.hp = a.maxHp = b.hp = b.maxHp = 1000; b.burn = 1; b.slow = 1;
  g.damage(a, 100); g.damage(b, 100);
  assert.equal(a.hp, 900); assert.equal(b.hp, 875);
});

test('보호막, 분열, 은신, 광전사', () => {
  const g = fresh(); g.spawnClock = 1e9;
  const shield = g.spawn('shieldbearer', 100); const hp = shield.hp;
  g.damage(shield, shield.maxShield * .5); assert.equal(shield.hp, hp); assert.ok(shield.shield > 0);
  const splitter = g.spawn('splitter', 300); g.damage(splitter, 1e9);
  assert.equal(g.enemies.filter(e => e.kind === 'shard').length, 2);
  const stalker = g.spawn('stalker', 10); assert.equal(g.targetable(stalker), false);
  stalker.slow = 1; assert.equal(g.targetable(stalker), true); stalker.slow = 0;
  stalker.d = D.TRACK_LENGTH * .4; assert.equal(g.targetable(stalker), true);
  const calm = g.spawn('berserker', 0), angry = g.spawn('berserker', 0); angry.hp = angry.maxHp * .4;
  g.step(.05); assert.ok(angry.d > calm.d * 1.5);
});

test('재생과 치유는 맹독으로 막힌다', () => {
  const g = fresh(); g.spawnClock = 1e9;
  const regen = g.spawn('regenerator', 100); regen.speed = 0; regen.hp = regen.maxHp * .5;
  run(g, 1); assert.ok(regen.hp > regen.maxHp * .5);
  const before = regen.hp; regen.poison = 5; regen.poisonDamage = 0; run(g, 1); assert.ok(regen.hp <= before);
});

test('적이 수정에 닿으면 내구도가 깎이고 0이면 패배', () => {
  const g = fresh(); g.spawnClock = 1e9;
  g.spawn('grunt', D.TRACK_LENGTH - 1); run(g, .2);
  assert.equal(g.core, D.CORE_MAX - 1); assert.equal(g.leaks, 1);
  g.spawn('boss', D.TRACK_LENGTH - 1); run(g, .5); assert.equal(g.core, D.CORE_MAX - 11);
  g.core = 1; g.spawn('grunt', D.TRACK_LENGTH - 1); run(g, .2);
  assert.equal(g.state, 'lost');
  const time = g.time; g.step(.05); assert.equal(g.time, time);
});

test('새벽 섬광은 모든 적에게 피해를 주고 재사용 대기가 있다', () => {
  const g = fresh(); g.spawnClock = 1e9;
  assert.equal(g.flash(), false, '적이 없으면 쓰지 않는다');
  const e = g.spawn('armored', 200), boss = g.spawn('boss', 100);
  assert.equal(g.flash(), true);
  assert.ok(Math.abs(e.hp / e.maxHp - .88) < 1e-9); assert.ok(e.slow > 0);
  assert.ok(boss.hp / boss.maxHp > .9);
  assert.equal(g.flash(), false); assert.equal(g.flashCd, D.FLASH_COOLDOWN);
});

test('웨이브 진행, 군주와 보상', () => {
  assert.equal(D.bossOf(4), null); assert.equal(D.bossOf(5).id, 'summoner'); assert.equal(D.bossOf(10).id, 'bulwark'); assert.equal(D.bossOf(15).id, 'jammer'); assert.equal(D.bossOf(20).id, 'summoner');
  assert.equal(D.themeOf(1), 'grove'); assert.equal(D.themeOf(6), 'canyon'); assert.equal(D.themeOf(31), 'grove');
  assert.ok(D.roster(1).length === 1 && D.roster(13).includes('stalker'));
  const g = fresh(); g.wave = 5; g.spawnLimit = g.waveSize(5); g.spawned = g.spawnLimit - 1; g.spawnClock = 0;
  g.step(.05); const boss = g.enemies.find(e => e.boss); assert.ok(boss && boss.boss === 'summoner');
  run(g, 8); assert.equal(g.wave, 5, '군주가 살아 있으면 다음 웨이브로 넘어가지 않는다');
  for (const e of g.enemies.slice()) g.damage(e, 1e12); g.step(.05);
  assert.equal(g.wave, 6); assert.equal(g.state, 'reward'); assert.equal(g.offers.length, 3);
  assert.equal(g.chooseReward('nope'), false);
  const pick = g.offers[0], had = g.perks[pick]; assert.equal(g.chooseReward(pick), true); assert.equal(g.perks[pick], had + 1); assert.equal(g.state, 'running');
});

test('보상 상한과 효과', () => {
  const g = fresh(); g.perks.power = D.PERKS.power.cap; assert.ok(!g.rewardPool().includes('power')); assert.ok(g.rewardPool().includes('resonance'));
  g.core = 10; g.state = 'reward'; g.offers = ['restore', 'supply']; g.chooseReward('restore'); assert.equal(g.core, 15);
  const gold = g.gold; g.state = 'reward'; g.offers = ['supply']; g.chooseReward('supply'); assert.equal(g.gold, gold + g.supplyAmount());
});

test('교란 군주는 타워를 마비시킨다', () => {
  const g = fresh(); g.spawnClock = 1e9; g.wave = 15; g.place(0, 'arrow', 1);
  const boss = g.spawn('boss', 200); boss.hp = boss.maxHp = 1e9; boss.speed = 0; boss.clock = .1; run(g, .3);
  assert.ok(g.cells[0].tower.jam > 0);
});

test('같은 난수면 같은 결과', () => {
  const play = () => { const g = fresh(42); for (let t = 0; t < 4000; t++) { if (g.state === 'reward') g.chooseReward(g.offers[0]); if (t % 20 === 0) { g.summon(); const p = g.mergePair(); if (p) g.drop(p[0], p[1]); } g.step(.05); } return [g.wave, g.score, g.kills, g.gold, g.core]; };
  assert.deepEqual(play(), play());
});

test('자동 플레이가 끝까지 오류 없이 진행된다', () => {
  const g = fresh(3); let steps = 0;
  while (g.state !== 'lost' && steps++ < 60000) {
    if (g.state === 'reward') { g.chooseReward(g.offers[0]); continue; }
    if (steps % 10 === 0) { let p; while ((p = g.mergePair())) g.drop(p[0], p[1]); g.summon(); if (g.flashCd <= 0) g.flash(); }
    g.step(.05);
    assert.ok(Number.isFinite(g.gold) && Number.isFinite(g.score));
    assert.ok(g.enemies.length <= 140 && g.effects.length <= 160);
  }
  assert.equal(g.state, 'lost'); assert.ok(g.wave >= 10, '10웨이브는 넘긴다: ' + g.wave); assert.ok(g.wave < 60);
});

test('페이지가 새 엔진만 쓴다', () => {
  const file = path.join(__dirname, '..', 'index.html'); if (!fs.existsSync(file)) return;
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /<script id="gameLogic">/);
  for (const name of ['dawn-core', 'dawn-art', 'dawn-view', 'dawn-sound']) assert.match(html, new RegExp('src="/scripts/' + name + '\\.js\\?v=\\d+[a-z]?"'));
  assert.doesNotMatch(html, /phaser|BastionGame|bastion-(graphics|lighting|sound|progress|convenience)/i);
});

console.log('dawn bastion: ' + count + ' tests passed');
