/* 새벽의 요새 — 규칙 엔진. 화면과 무관한 순수 로직이며 Node와 브라우저에서 같은 파일을 씁니다. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api; else root.Dawn = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const SIZE = 720;
  // 적이 걷는 길: 왼쪽 위 차원문에서 나와 보드를 한 바퀴 돌아 수정에 닿습니다.
  const TRACK = [[62, 62], [658, 62], [658, 658], [62, 658], [62, 196]];
  const SEGMENTS = TRACK.slice(1).map((p, i) => { const a = TRACK[i], len = Math.hypot(p[0] - a[0], p[1] - a[1]); return { ax: a[0], ay: a[1], dx: (p[0] - a[0]) / len, dy: (p[1] - a[1]) / len, len }; });
  const TRACK_LENGTH = SEGMENTS.reduce((sum, s) => sum + s.len, 0);
  const CORE = { x: 62, y: 150 };
  function trackPoint(d) {
    let rest = Math.max(0, Math.min(TRACK_LENGTH, d));
    for (const s of SEGMENTS) { if (rest <= s.len) return { x: s.ax + s.dx * rest, y: s.ay + s.dy * rest, dx: s.dx, dy: s.dy }; rest -= s.len; }
    const last = SEGMENTS[SEGMENTS.length - 1]; return { x: TRACK[TRACK.length - 1][0], y: TRACK[TRACK.length - 1][1], dx: last.dx, dy: last.dy };
  }
  const CELLS = []; for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) CELLS.push({ x: 183 + col * 118, y: 183 + row * 118 });
  const distanceToTrack = (x, y) => { let best = Infinity; for (const s of SEGMENTS) { const t = Math.max(0, Math.min(s.len, (x - s.ax) * s.dx + (y - s.ay) * s.dy)); best = Math.min(best, Math.hypot(x - s.ax - s.dx * t, y - s.ay - s.dy * t)); } return best; };

  const TIERS = [{ name: '일반', color: '#b9c7c2' }, { name: '고급', color: '#8fe0a0' }, { name: '희귀', color: '#7fb8ff' }, { name: '영웅', color: '#c79bff' }, { name: '전설', color: '#ffb561' }, { name: '신화', color: '#ff6f7d' }];
  const MAX_TIER = TIERS.length, GROWTH = 2.15;
  const TOWERS = {
    arrow: { name: '연사탑', role: '빠른 단일 공격', color: '#8cdbb7', damage: 14, range: 250, rate: .5 },
    cannon: { name: '폭발탑', role: '범위 폭발', color: '#f3ba77', damage: 27, range: 240, rate: 1.5 },
    frost: { name: '냉기탑', role: '주변 둔화', color: '#8ecbfa', damage: 6, range: 172, rate: 1.1 },
    tesla: { name: '번개탑', role: '연쇄 공격', color: '#c69cff', damage: 22, range: 245, rate: 1.5 },
    laser: { name: '광선탑', role: '직선 관통', color: '#ff739f', damage: 36, range: 300, rate: 1.7 },
    venom: { name: '맹독탑', role: '중독·회복 차단', color: '#a8ed72', damage: 6, range: 245, rate: 1.3 },
    flame: { name: '화염탑', role: '부채꼴 연소', color: '#ff9455', damage: 7, range: 168, rate: .36 },
    sniper: { name: '저격탑', role: '초장거리 고화력', color: '#f0e6c0', damage: 85, range: 430, rate: 2.6 },
    gravity: { name: '중력탑', role: '적을 뒤로 밀어냄', color: '#8f9bff', damage: 12, range: 235, rate: 2.5 },
    beacon: { name: '지휘탑', role: '이웃 타워 강화', color: '#ffd66e', damage: 0, range: 0, rate: 1 },
    star: { name: '별빛탑', role: '전장 어디든 유성 낙하', color: '#9fe8ff', damage: 17, range: 2000, rate: 1.25 },
    spike: { name: '가시탑', role: '길 위에 덫 설치', color: '#d9a066', damage: 34, range: 160, rate: 2.4 }
  };
  // 종류별 연구: 단계마다 공격력 +12%, 3단계와 5단계에서 특수 능력이 열립니다.
  const RESEARCH = {
    arrow: ['치명타: 20% 확률로 2.5배 피해', '관통: 뒤따르는 적 하나에게 60% 피해'],
    cannon: ['폭발 반경 +25%', '소이탄: 폭발에 맞은 적이 불탐'],
    frost: ['둔화 시간 +1초', '빙결: 12% 확률로 0.8초 정지'],
    tesla: ['연쇄 +2회', '연쇄할 때 피해가 거의 줄지 않음'],
    laser: ['광선 폭 +50%', '보호막에 2배 피해'],
    venom: ['중독 피해 +50%', '전염: 중독된 적이 죽으면 주변에 퍼짐'],
    flame: ['사거리 +25', '연소 3.5초, 연소 피해 2배'],
    sniper: ['군주에게 1.5배 피해', '처형: 체력 15% 이하의 적 즉시 처치'],
    gravity: ['밀어내는 거리 +50%', '대상 +2, 1.5초 둔화'],
    beacon: ['이웃 타워 공격 간격 −8%', '강화 효과 +10%p'],
    star: ['유성 폭발 반경 +30%', '유성에 맞은 적 1초 둔화'],
    spike: ['덫 사용 횟수 +2', '덫 피해 +50%, 0.4초 정지']
  };
  // 전설(5등급) 이상 타워에 열리는 각성 능력
  const AWAKEN = {
    arrow: '삼연사: 적 셋을 동시에 공격', cannon: '집속탄: 폭발 뒤 작은 폭발 3개', frost: '혹한: 둔화가 훨씬 강해짐', tesla: '과부하: 마지막 대상에서 폭발', laser: '쌍광선: 가장 튼튼한 적에게 두 번째 광선',
    venom: '부식: 중독된 적이 받는 피해 +20%', flame: '불바다: 맞은 자리에 3초간 불길', sniper: '관통탄: 탄도 위의 모든 적 타격', gravity: '특이점: 밀려난 적 0.6초 정지', beacon: '전장 지휘: 이웃 타워 공격 간격 −6%', star: '유성우: 유성 3개 동시 낙하', spike: '폭발 덫: 덫이 주변까지 피해'
  };
  // 상태가 겹칠 때 일어나는 조합 반응
  const REACTIONS = { shock: '열충격', conduct: '감전', shatter: '파쇄', ignite: '인화', mark: '급소' };
  const AWAKEN_TIER = 5;
  const RESEARCH_MAX = 4, NEIGHBORS = CELLS.map((c, i) => CELLS.flatMap((o, j) => j !== i && Math.abs(o.x - c.x) < 130 && Math.abs(o.y - c.y) < 130 ? [j] : []));
  const DECK = Object.keys(TOWERS);
  const ENEMIES = {
    grunt: { name: '그림자 병사', hp: 1, speed: 67, r: 13, gold: 6, leak: 1, tip: '기본 보병' },
    runner: { name: '질주자', hp: .6, speed: 113, r: 10, gold: 5, leak: 1, tip: '빠르지만 약함 · 둔화로 묶기' },
    armored: { name: '중갑병', hp: 2.4, speed: 46, r: 15, gold: 10, leak: 2, tip: '느리고 단단함 · 광선과 고등급 타워' },
    regenerator: { name: '재생술사', hp: 1.3, speed: 61, r: 13, gold: 9, leak: 1, tip: '초당 3% 회복 · 맹독이 회복을 막음' },
    splitter: { name: '분열체', hp: 1.2, speed: 61, r: 14, gold: 7, leak: 1, tip: '처치 시 파편 2개 · 범위 공격' },
    shard: { name: '분열 파편', hp: .3, speed: 102, r: 8, gold: 2, leak: 1, tip: '작고 빠름' },
    berserker: { name: '광전사', hp: 1.5, speed: 64, r: 14, gold: 9, leak: 2, tip: '체력 절반 이하에서 1.6배 가속' },
    wisp: { name: '망령', hp: .8, speed: 78, r: 12, gold: 7, leak: 1, tip: '둔화가 거의 통하지 않음' },
    shieldbearer: { name: '방벽 수호병', hp: 1.6, speed: 55, r: 15, gold: 11, leak: 2, tip: '체력 60%의 보호막을 먼저 깎아야 함' },
    healer: { name: '치유 사제', hp: 1.1, speed: 61, r: 13, gold: 11, leak: 1, tip: '2초마다 주변 아군 치료 · 맹독으로 차단' },
    stalker: { name: '은신 추적자', hp: 1, speed: 75, r: 12, gold: 9, leak: 1, tip: '길의 35%까지 조준 불가 · 둔화·연소·중독 시 드러남' },
    boss: { name: '군주', hp: 1, speed: 35, r: 24, gold: 70, leak: 10, tip: '5웨이브마다 출현' }
  };
  const BOSSES = [
    { id: 'summoner', name: '소환 군주', desc: '5초마다 병사 2명 소환' },
    { id: 'bulwark', name: '철벽 군주', desc: '체력 50% 보호막 · 3초간 안 맞으면 재생' },
    { id: 'jammer', name: '교란 군주', desc: '7초마다 가까운 타워 3초 마비' }
  ];
  const THEMES = ['grove', 'canyon', 'glacier', 'marsh', 'volcano', 'ruins'];
  const THEME_NAMES = { grove: '새벽 숲', canyon: '잿빛 협곡', glacier: '빙하 관문', marsh: '독안개 습지', volcano: '잿불 화산', ruins: '황혼 유적' };
  const PERKS = {
    power: { name: '요새의 화력', desc: '모든 타워 공격력 +15%', cap: 4 },
    haste: { name: '빠른 장전', desc: '모든 타워 공격 간격 −8%', cap: 4 },
    range: { name: '정밀 조준', desc: '모든 타워 사거리 +12', cap: 3 },
    luck: { name: '행운의 부적', desc: '소환 시 고급 이상 확률 +8%', cap: 3 },
    restore: { name: '수정 복구', desc: '수정 내구도 +5', cap: Infinity },
    supply: { name: '보급 상자', desc: '에테르 즉시 획득', cap: Infinity },
    resonance: { name: '새벽의 공명', desc: '모든 타워 공격력 +6% · 제한 없음', cap: Infinity }
  };
  const CORE_MAX = 20, FLASH_COOLDOWN = 30;
  const roster = wave => ['grunt', ...(wave >= 3 ? ['runner'] : []), ...(wave >= 4 ? ['armored'] : []), ...(wave >= 6 ? ['regenerator', 'splitter'] : []), ...(wave >= 8 ? ['berserker', 'wisp'] : []), ...(wave >= 11 ? ['shieldbearer', 'healer'] : []), ...(wave >= 13 ? ['stalker'] : [])];
  const depth = wave => Math.pow(1.13, Math.max(0, wave - 1));
  const bossOf = wave => wave > 0 && wave % 5 === 0 ? BOSSES[(wave / 5 - 1) % BOSSES.length] : null;
  const themeOf = wave => THEMES[Math.floor((Math.max(1, wave) - 1) / 5) % THEMES.length];

  class Game {
    constructor(random = Math.random) {
      this.random = random; this.state = 'idle'; this.time = 0; this.wave = 1; this.gold = 100; this.core = CORE_MAX; this.score = 0; this.kills = 0;
      this.cells = CELLS.map(c => ({ x: c.x, y: c.y, tower: null })); this.enemies = []; this.shots = []; this.effects = []; this.zones = []; this.traps = [];
      this.summons = 0; this.merges = 0; this.bestTier = 0; this.amplified = 0; this.flashCd = 0;
      this.perks = Object.fromEntries(Object.keys(PERKS).map(id => [id, 0])); this.offers = []; this.research = Object.fromEntries(DECK.map(type => [type, 0]));
      this.spawned = 0; this.spawnLimit = this.waveSize(1); this.spawnClock = 1.2; this.intermission = 0; this.overtime = 0; this.nextId = 0; this.nextFx = 0; this.coreHit = 0; this.leaks = 0;
    }
    get theme() { return themeOf(this.wave); }
    get boss() { return bossOf(this.wave); }
    get summonCost() { return 20 + 4 * this.summons; }
    get amplifyCost() { return 120 + 60 * this.amplified; }
    waveSize(wave) { return 8 + wave * 2; }
    waveInfo(wave = this.wave) { return { wave, total: this.waveSize(wave), roster: roster(wave), boss: bossOf(wave), theme: themeOf(wave) }; }
    emit(kind, x, y, data = {}) {
      if (this.effects.length >= 160) this.effects.splice(this.effects.findIndex(f => f.kind === 'hit' || f.kind === 'text') >= 0 ? this.effects.findIndex(f => f.kind === 'hit' || f.kind === 'text') : 0, 1);
      const life = data.life || .4; this.effects.push({ kind, x, y, ...data, life, max: life, id: ++this.nextFx });
    }
    start() { if (this.state !== 'idle') return false; this.state = 'running'; return true; }

    // ── 타워 ──
    // 연구 단계가 n 이상인지. 화면에는 1~5단계로 보이고 내부 값은 0~4입니다.
    knows(type, level) { return this.research[type] >= level - 1; }
    researchCost(type) { return this.research[type] >= RESEARCH_MAX ? Infinity : 50 + 50 * this.research[type]; }
    study(type) { if (this.state !== 'running' || !(type in this.research) || this.gold < this.researchCost(type)) return false; this.gold -= this.researchCost(type); this.research[type]++; this.emit('amplify', 360, 360, { life: .5 }); return true; }
    // 이웃한 지휘탑 가운데 가장 강한 하나의 효과만 받습니다.
    aura(index) { let best = 0, haste = 0; for (const j of NEIGHBORS[index] || []) { const t = this.cells[j].tower; if (!t || t.type !== 'beacon' || t.jam > 0) continue; const bonus = .1 + .06 * t.tier + .04 * this.research.beacon + (this.knows('beacon', 5) ? .1 : 0) + .05 * t.star; if (bonus > best) { best = bonus; haste = (this.knows('beacon', 3) ? .08 : 0) + (t.tier >= AWAKEN_TIER ? .06 : 0); } } return { damage: best, haste }; }
    towerStats(type, tier = 1, index = -1) {
      const spec = TOWERS[type]; if (!spec) return null; tier = Math.max(1, Math.min(MAX_TIER, tier));
      const aura = index >= 0 && type !== 'beacon' ? this.aura(index) : { damage: 0, haste: 0 }, own = index >= 0 ? this.cells[index]?.tower : null, star = own && own.type === type ? own.star : 0;
      return { damage: spec.damage * Math.pow(GROWTH, tier - 1) * (1 + .15 * this.perks.power + .06 * this.perks.resonance) * (1 + .12 * this.research[type]) * (1 + aura.damage) * (1 + .25 * star), range: spec.range ? spec.range + (tier - 1) * 6 + this.perks.range * 12 + (type === 'flame' && this.knows('flame', 3) ? 25 : 0) : 0, interval: spec.rate * Math.pow(.96, tier - 1) * (1 - .08 * this.perks.haste) * (1 - aura.haste), aura: aura.damage };
    }
    reaches(index, type = this.cells[index]?.tower?.type, tier = this.cells[index]?.tower?.tier) { const c = this.cells[index], stats = this.towerStats(type, tier); if (type === 'beacon') return !!c && NEIGHBORS[index].some(j => this.cells[j].tower && this.cells[j].tower.type !== 'beacon'); return !!c && !!stats && distanceToTrack(c.x, c.y) < stats.range - 8; }
    place(index, type, tier) { const tower = { type, tier, star: 0, cd: .25, angle: -Math.PI / 2, recoil: 0, jam: 0, born: this.time }; this.cells[index].tower = tower; this.bestTier = Math.max(this.bestTier, tier); return tower; }
    // 종류가 늘어도 합성이 막히지 않도록, 40% 확률로 같은 등급의 기존 타워와 같은 종류가 나옵니다.
    rollType(tier, skip = -1) { const roll = this.random(), pick = this.random(); if (roll < .4) { const same = this.cells.filter((c, i) => i !== skip && c.tower && c.tower.tier === tier).map(c => c.tower.type); if (same.length) return same[Math.floor(pick * same.length)]; } const type = DECK[Math.floor(pick * DECK.length)]; return type === 'beacon' && this.cells.filter((c, i) => i !== skip && c.tower && c.tower.type !== 'beacon').length < 2 ? 'arrow' : type; }
    emptyCells() { return this.cells.flatMap((c, i) => c.tower ? [] : [i]); }
    summon() {
      if (this.state !== 'running' || this.gold < this.summonCost) return -1;
      const empty = this.emptyCells(); if (!empty.length) return -1;
      this.gold -= this.summonCost; this.summons++;
      const index = empty[Math.floor(this.random() * empty.length)], roll = this.random(), bonus = .08 * this.perks.luck;
      const tier = roll < .02 + bonus * .25 ? 3 : roll < .12 + bonus ? 2 : 1, type = this.rollType(tier);
      this.place(index, type, tier); this.emit('summon', this.cells[index].x, this.cells[index].y, { tier, life: .55 }); return index;
    }
    canMerge(from, to) { const a = this.cells[from]?.tower, b = this.cells[to]?.tower; return !!a && !!b && from !== to && a.type === b.type && a.tier === b.tier && a.tier < MAX_TIER; }
    mergePair() { for (let i = 0; i < this.cells.length; i++) for (let j = i + 1; j < this.cells.length; j++) if (this.canMerge(i, j)) return [i, j]; return null; }
    // 같은 타워 위에 놓으면 합성, 빈 칸이면 이동, 다른 타워면 자리 교환.
    drop(from, to) {
      if (this.state !== 'running' || from === to || !this.cells[from]?.tower || !this.cells[to]) return false;
      const a = this.cells[from], b = this.cells[to];
      if (this.canMerge(from, to)) {
        const tier = a.tower.tier + 1, type = this.rollType(tier, from);
        const star = Math.max(a.tower.star, b.tower.star); a.tower = null; this.place(to, type, tier).star = star; this.merges++; this.score += 10 * tier;
        this.emit('merge', b.x, b.y, { tier, life: .9 }); return 'merge';
      }
      const moved = a.tower; a.tower = b.tower; b.tower = moved; return a.tower ? 'swap' : 'move';
    }
    sellValue(index) { const t = this.cells[index]?.tower; return t ? 10 * Math.pow(2, t.tier - 1) + Math.floor(t.star * this.temperBase(t.tier) * .5) : 0; }
    // 단련: 고른 타워 하나를 별 3개까지 강화합니다. 별 하나에 공격력 +25%이고 합성하면 높은 쪽 별을 물려받습니다.
    temperBase(tier) { return Math.round(30 * Math.pow(1.8, tier - 1)); }
    temperCost(index) { const t = this.cells[index]?.tower; return !t || t.star >= 3 ? Infinity : this.temperBase(t.tier) * (t.star + 1); }
    temper(index) { const t = this.cells[index]?.tower; if (this.state !== 'running' || !t || this.gold < this.temperCost(index)) return false; this.gold -= this.temperCost(index); t.star++; this.emit('temper', this.cells[index].x, this.cells[index].y, { life: .7, star: t.star }); return true; }
    sell(index) { if (this.state !== 'running' || !this.cells[index]?.tower) return false; this.gold += this.sellValue(index); this.cells[index].tower = null; return true; }
    amplify() { if (this.state !== 'running' || this.gold < this.amplifyCost) return false; this.gold -= this.amplifyCost; this.amplified++; this.perks.resonance++; this.emit('amplify', 360, 360, { life: .8 }); return true; }
    // 새벽 섬광: 모든 적에게 최대 체력 비례 피해와 둔화.
    flash() {
      if (this.state !== 'running' || this.flashCd > 0 || !this.enemies.length) return false;
      this.flashCd = FLASH_COOLDOWN; this.emit('flash', CORE.x, CORE.y, { life: .7 });
      for (const e of this.enemies.slice()) { e.slow = Math.max(e.slow, 2.5); this.damage(e, e.maxHp * (e.boss ? .04 : .12), '#fff3c4'); }
      return true;
    }

    // ── 보상 ──
    rewardPool() { return Object.keys(PERKS).filter(id => this.perks[id] < PERKS[id].cap); }
    offerReward() { const pool = this.rewardPool(); for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(this.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; } this.offers = pool.slice(0, 3); this.state = 'reward'; }
    supplyAmount() { return 60 + this.wave * 12; }
    chooseReward(id) {
      if (this.state !== 'reward' || !this.offers.includes(id)) return false;
      this.perks[id]++; if (id === 'restore') this.core = Math.min(CORE_MAX, this.core + 5); if (id === 'supply') this.gold += this.supplyAmount();
      this.offers = []; this.state = 'running'; return true;
    }

    // ── 적 ──
    spawn(kind, at = 0) {
      if (this.enemies.length >= 140) return null;
      const spec = ENEMIES[kind], boss = kind === 'boss' ? this.boss || BOSSES[0] : null;
      const hp = (boss ? 240 + this.wave * 55 : (30 + this.wave * 10) * spec.hp) * depth(this.wave), shield = kind === 'shieldbearer' ? hp * .6 : boss?.id === 'bulwark' ? hp * .5 : 0;
      const p = trackPoint(at), enemy = { id: ++this.nextId, kind, boss: boss ? boss.id : null, title: boss ? boss.name : null, d: at, x: p.x, y: p.y, dx: p.dx, dy: p.dy, hp, maxHp: hp, shield, maxShield: shield, r: spec.r, speed: spec.speed, slow: 0, reactCd: 0, deep: 0, acid: 0, stun: 0, burn: 0, burnDamage: 0, burnTick: 0, poison: 0, poisonDamage: 0, poisonTick: 0, calm: 0, clock: boss ? 4 : 2, hit: 0, heal: 0, born: this.time };
      this.enemies.push(enemy); if (boss) this.emit('boss', p.x, p.y, { life: 1.2 }); return enemy;
    }
    targetable(e) { return e.kind !== 'stalker' || e.d > TRACK_LENGTH * .35 || e.slow > 0 || e.burn > 0 || e.poison > 0; }
    damage(e, amount, color = '#ffe2a1', options = null) {
      if (e.hp <= 0 || !(amount > 0)) return;
      if (e.burn > 0 && e.slow > 0) amount *= this.react(e, 'shock', 1.25); // 열충격: 연소와 둔화가 겹치면 추가 피해
      if (e.acid > 0) amount *= 1.2;
      e.calm = 0; e.hit = .12;
      if (e.shield > 0) { const pierce = options?.shield || 1, absorbed = Math.min(e.shield, amount * pierce); e.shield -= absorbed; amount -= absorbed / pierce; if (amount <= 1e-9) return; }
      e.hp -= amount; this.emit('text', e.x, e.y - e.r - 6, { value: Math.ceil(amount), color, life: options?.crit ? .8 : .5, crit: !!options?.crit });
      if (options?.execute && !e.boss && e.hp > 0 && e.hp <= e.maxHp * .15) { e.hp = 0; this.emit('execute', e.x, e.y, { life: .5 }); }
      if (e.hp > 0) return;
      const spec = ENEMIES[e.kind]; this.kills++; this.gold += e.summoned ? 1 : spec.gold; this.score += e.boss ? 500 : 20;
      this.emit(e.boss ? 'bossDeath' : 'death', e.x, e.y, { r: e.r, life: e.boss ? .9 : .45, enemy: e.boss || e.kind });
      if (e.poison > 0 && this.knows('venom', 5)) { for (const o of this.enemies) if (o !== e && o.hp > 0 && Math.hypot(o.x - e.x, o.y - e.y) <= 64) { o.poisonDamage = Math.max(o.poison > 0 ? o.poisonDamage : 0, e.poisonDamage); o.poison = 3; if (o.poisonTick <= 0) o.poisonTick = .5; } this.emit('cloud', e.x, e.y, { r: 64, color: TOWERS.venom.color, life: .7, tier: 1 }); }
      if (e.kind === 'splitter') for (const offset of [-10, 10]) { const shard = this.spawn('shard', Math.max(0, e.d + offset)); if (shard) shard.summoned = true; }
    }
    enemyTick(e, dt) {
      e.hit = Math.max(0, e.hit - dt); e.heal = Math.max(0, e.heal - dt); e.reactCd = Math.max(0, e.reactCd - dt); e.calm += dt;
      if (e.burn > 0) { e.burn = Math.max(0, e.burn - dt); e.burnTick -= dt; if (e.burnTick <= 0) { e.burnTick += .5; this.damage(e, e.burnDamage, '#ff9455'); } }
      if (e.hp > 0 && e.poison > 0) { e.poison = Math.max(0, e.poison - dt); e.poisonTick -= dt; if (e.poisonTick <= 0) { e.poisonTick += .5; this.damage(e, e.poisonDamage, '#a8ed72'); } }
      if (e.hp <= 0) return;
      if (e.kind === 'regenerator' && e.poison <= 0) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * .03 * dt);
      if (e.boss === 'bulwark' && e.calm >= 3 && e.shield < e.maxShield) e.shield = Math.min(e.maxShield, e.shield + e.maxShield * .08 * dt);
      if (e.kind === 'healer' || e.boss === 'summoner' || e.boss === 'jammer') {
        e.clock -= dt;
        if (e.clock <= 0) {
          if (e.kind === 'healer') {
            e.clock = 2; if (e.poison > 0) return;
            let target = null, ratio = 1; for (const o of this.enemies) { if (o === e || o.kind === 'healer' || o.hp <= 0 || o.poison > 0 || Math.hypot(o.x - e.x, o.y - e.y) > 110) continue; const r = o.hp / o.maxHp; if (r < ratio) { ratio = r; target = o; } }
            if (target) { target.hp = Math.min(target.maxHp, target.hp + target.maxHp * .06); target.heal = .5; e.heal = .5; }
          } else if (e.boss === 'summoner') {
            e.clock = 5; for (const offset of [-26, -52]) { const minion = this.spawn('grunt', Math.max(0, e.d + offset)); if (minion) minion.summoned = true; } this.emit('boss', e.x, e.y, { life: .6 });
          } else {
            e.clock = 7; let best = null, d = 300; for (const c of this.cells) { if (!c.tower) continue; const n = Math.hypot(c.x - e.x, c.y - e.y); if (n < d) { d = n; best = c; } }
            if (best) { best.tower.jam = 3; this.emit('jam', best.x, best.y, { life: .6 }); }
          }
        }
      }
      const slowed = e.slow > 0 ? (e.kind === 'wisp' ? .85 : e.boss ? .7 : .55) * (e.deep > 0 ? .7 : 1) : 1, rage = e.kind === 'berserker' && e.hp <= e.maxHp * .5 ? 1.6 : 1;
      e.slow = Math.max(0, e.slow - dt); e.deep = Math.max(0, e.deep - dt); e.acid = Math.max(0, e.acid - dt); if (e.stun > 0) e.stun = Math.max(0, e.stun - dt); else e.d += e.speed * slowed * rage * dt;
      const p = trackPoint(e.d); e.x = p.x; e.y = p.y; e.dx = p.dx; e.dy = p.dy;
      if (e.d >= TRACK_LENGTH) { const leak = ENEMIES[e.kind].leak; this.core = Math.max(0, this.core - leak); this.leaks++; this.coreHit = .4; e.hp = 0; e.leaked = true; this.emit('leak', CORE.x, CORE.y, { life: .6, value: leak }); }
    }

    // ── 전투 ──
    // 조합 반응 배율. 같은 적에게는 1초에 한 번만 표시합니다.
    react(e, id, multiplier) { if (e.reactCd <= 0) { e.reactCd = 1; this.emit('react', e.x, e.y - e.r - 16, { label: REACTIONS[id], tag: id, life: .9 }); } return multiplier; }
    trapSpots(cell, range) { const spots = []; for (let d = 30; d < TRACK_LENGTH - 20; d += 18) { const p = trackPoint(d); if (Math.hypot(p.x - cell.x, p.y - cell.y) <= range) spots.push(d); } return spots; }
    pickTarget(cell, range, strongest = false) { let best = null; for (const e of this.enemies) { if (e.hp <= 0 || !this.targetable(e) || Math.hypot(e.x - cell.x, e.y - cell.y) > range) continue; if (!best || (strongest ? e.hp + e.shield > best.hp + best.shield : e.d > best.d)) best = e; } return best; }
    fire(cell, tower, target, stats) {
      const type = tower.type, spec = TOWERS[type], tier = tower.tier, color = spec.color, knows = level => this.knows(type, level), inRange = (x, y, r) => this.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - x, e.y - y) <= r + e.r * .5);
      tower.recoil = .16; const awake = tier >= AWAKEN_TIER;
      if (type === 'arrow') { const crit = knows(3) && this.random() < .2; const targets = awake ? [target, ...this.enemies.filter(e => e !== target && e.hp > 0 && this.targetable(e) && Math.hypot(e.x - cell.x, e.y - cell.y) <= stats.range).sort((a, b) => b.d - a.d).slice(0, 2)] : [target]; for (const aim of targets) this.shots.push({ kind: 'arrow', x: cell.x, y: cell.y, target: aim, damage: stats.damage * (crit ? 2.5 : 1), crit, pierce: knows(5), color, speed: 754, tier }); }
      else if (type === 'cannon') this.shots.push({ kind: 'shell', x: cell.x, y: cell.y, tx: target.x, ty: target.y, sx: cell.x, sy: cell.y, damage: stats.damage, color, speed: 478, splash: (58 + tier * 7) * (knows(3) ? 1.25 : 1), ignite: knows(5), cluster: awake, tier });
      else if (type === 'frost') { for (const e of inRange(cell.x, cell.y, stats.range)) { e.slow = Math.max(e.slow, knows(3) ? 3 : 2); if (awake) e.deep = Math.max(e.deep, 2); if (knows(5) && !e.boss && this.random() < .12) { e.stun = Math.max(e.stun, .8); this.emit('freeze', e.x, e.y, { life: .8, r: e.r }); } this.damage(e, stats.damage, color); } this.emit('frost', cell.x, cell.y, { r: stats.range, life: .55, tier }); }
      else if (type === 'tesla') {
        const points = [{ x: cell.x, y: cell.y }], visited = new Set(), hops = 3 + Math.floor(tier / 2) + (knows(3) ? 2 : 0), falloff = knows(5) ? .95 : .78; let next = target, from = cell;
        for (let hop = 0; hop < hops && next; hop++) { visited.add(next); points.push({ x: next.x, y: next.y }); this.damage(next, stats.damage * Math.pow(falloff, hop) * (next.poison > 0 ? this.react(next, 'conduct', 1.3) : 1), color); from = next; let best = null, d = 115; for (const e of this.enemies) { const n = Math.hypot(e.x - from.x, e.y - from.y); if (e.hp > 0 && !visited.has(e) && n <= d) { best = e; d = n; } } next = best; }
        if (awake && from !== cell) { for (const e of inRange(from.x, from.y, 55)) this.damage(e, stats.damage * .5, color); this.emit('blast', from.x, from.y, { r: 55, color, life: .4, tier: 1 }); }
        this.emit('bolt', cell.x, cell.y, { points, color, life: .28, tier });
      } else if (type === 'laser') {
        const length = stats.range + 40, width = (10 + tier * 3) * (knows(3) ? 1.5 : 1), cos = Math.cos(tower.angle), sin = Math.sin(tower.angle), options = knows(5) ? { shield: 2 } : null;
        for (const e of this.enemies) { if (e.hp <= 0) continue; const rx = e.x - cell.x, ry = e.y - cell.y, along = rx * cos + ry * sin; if (along >= 0 && along <= length && Math.abs(-rx * sin + ry * cos) <= width / 2 + e.r) this.damage(e, stats.damage, color, options); }
        this.emit('beam', cell.x, cell.y, { angle: tower.angle, length, width, color, life: .32, tier });
        if (awake) { let second = null; for (const e of this.enemies) if (e !== target && e.hp > 0 && this.targetable(e) && Math.hypot(e.x - cell.x, e.y - cell.y) <= stats.range && (!second || e.hp > second.hp)) second = e; if (second) { const angle = Math.atan2(second.y - cell.y, second.x - cell.x), c2 = Math.cos(angle), s2 = Math.sin(angle); for (const e of this.enemies) { if (e.hp <= 0) continue; const rx = e.x - cell.x, ry = e.y - cell.y, along = rx * c2 + ry * s2; if (along >= 0 && along <= length && Math.abs(-rx * s2 + ry * c2) <= width / 2 + e.r) this.damage(e, stats.damage * .6, color, options); } this.emit('beam', cell.x, cell.y, { angle, length, width: width * .7, color, life: .32, tier }); } }
      } else if (type === 'venom') {
        const r = 52 + tier * 4, dose = stats.damage * .45 * (knows(3) ? 1.5 : 1); for (const e of inRange(target.x, target.y, r)) { this.damage(e, stats.damage, color); e.poisonDamage = e.poison > 0 ? Math.max(e.poisonDamage, dose) : dose; e.poison = 3; if (awake) e.acid = 3; if (e.poisonTick <= 0) e.poisonTick = .5; }
        this.emit('cloud', target.x, target.y, { r, color, life: .8, tier });
      } else if (type === 'flame') {
        const half = (30 + tier * 3) * Math.PI / 180, heat = stats.damage * .5 * (knows(5) ? 2 : 1);
        for (const e of this.enemies) { if (e.hp <= 0) continue; const rx = e.x - cell.x, ry = e.y - cell.y, d = Math.hypot(rx, ry); if (d > stats.range + e.r || (d > 0 && (rx * Math.cos(tower.angle) + ry * Math.sin(tower.angle)) / d < Math.cos(half))) continue; this.damage(e, stats.damage, color); if (e.hp > 0) { const fuel = e.poison > 0 ? heat * this.react(e, 'ignite', 1.5) : heat; e.burnDamage = e.burn > 0 ? Math.max(e.burnDamage, fuel) : fuel; e.burn = knows(5) ? 3.5 : 2; if (e.burnTick <= 0) e.burnTick = .5; } }
        this.emit('cone', cell.x, cell.y, { angle: tower.angle, r: stats.range, half, color, life: .34, tier });
        if (awake) { const old = this.zones.find(z => Math.hypot(z.x - target.x, z.y - target.y) < 36); if (old) { old.life = 3; old.damage = Math.max(old.damage, heat); } else if (this.zones.length < 12) this.zones.push({ x: target.x, y: target.y, r: 42, damage: heat, life: 3, tick: .5, id: ++this.nextFx }); }
      } else if (type === 'sniper') {
        tower.recoil = .3; this.emit('snipe', cell.x, cell.y, { tx: target.x, ty: target.y, color, life: .3, tier });
        if (awake) { const angle = Math.atan2(target.y - cell.y, target.x - cell.x), cos = Math.cos(angle), sin = Math.sin(angle); for (const e of this.enemies) { if (e === target || e.hp <= 0) continue; const rx = e.x - cell.x, ry = e.y - cell.y, along = rx * cos + ry * sin; if (along >= 0 && along <= stats.range + 60 && Math.abs(-rx * sin + ry * cos) <= 8 + e.r) this.damage(e, stats.damage * .5, color); } }
        this.damage(target, stats.damage * (target.boss && knows(3) ? 1.5 : 1) * (target.stun > 0 || target.slow > 0 ? this.react(target, 'mark', 1.4) : 1), color, { crit: true, execute: knows(5) });
      } else if (type === 'gravity') {
        const push = (30 + tier * 7) * (knows(3) ? 1.5 : 1), count = 2 + Math.floor(tier / 2) + (knows(5) ? 2 : 0);
        const near = inRange(target.x, target.y, 80).sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y)).slice(0, count);
        this.emit('well', target.x, target.y, { r: 80, color, life: .6, tier });
        for (const e of near) { e.d = Math.max(0, e.d - push * (e.boss ? .3 : 1)); const p = trackPoint(e.d); e.x = p.x; e.y = p.y; if (knows(5)) e.slow = Math.max(e.slow, 1.5); if (awake && !e.boss) e.stun = Math.max(e.stun, .6); this.damage(e, stats.damage, color); }
      } else if (type === 'star') {
        const pool = this.enemies.filter(e => e.hp > 0 && this.targetable(e)), r = 36 * (knows(3) ? 1.3 : 1) + tier * 2;
        for (let i = 0; i < (awake ? 3 : 1) && pool.length; i++) { const aim = pool[Math.floor(this.random() * pool.length)]; for (const e of inRange(aim.x, aim.y, r)) { if (knows(5)) e.slow = Math.max(e.slow, 1); this.damage(e, stats.damage, color); } this.emit('meteor', aim.x, aim.y, { r, color, life: .55, tier }); }
      }
    }
    advance(dt, speed = 1) { if (!(dt > 0)) return; let rest = Math.min(.05, dt) * (speed === 2 ? 2 : 1); while (rest > 1e-8 && this.state === 'running') { const step = Math.min(.05, rest); this.step(step); rest -= step; } }
    step(dt) {
      if (this.state !== 'running') return; dt = Math.min(.05, Math.max(0, dt));
      this.time += dt; this.flashCd = Math.max(0, this.flashCd - dt); this.coreHit = Math.max(0, this.coreHit - dt);
      if (this.intermission > 0) { this.intermission -= dt; if (this.intermission > 0) { this.fade(dt); return; } this.intermission = 0; }
      if (this.spawned < this.spawnLimit) {
        this.spawnClock -= dt;
        if (this.spawnClock <= 0) {
          const last = this.spawned === this.spawnLimit - 1, pool = roster(this.wave);
          this.spawn(last && this.boss ? 'boss' : pool[Math.floor(this.random() * pool.length)]); this.spawned++;
          this.spawnClock = Math.max(.22, .8 - this.wave * .02);
        }
      }
      for (const e of this.enemies.slice()) if (e.hp > 0) this.enemyTick(e, dt);
      for (let index = 0; index < this.cells.length; index++) {
        const cell = this.cells[index], t = cell.tower; if (!t) continue; t.cd -= dt; t.recoil = Math.max(0, t.recoil - dt); t.jam = Math.max(0, t.jam - dt); if (t.jam > 0) continue;
        if (t.type === 'beacon') continue;
        if (t.type === 'spike') { if (t.cd <= 0) { const mine = this.traps.filter(trap => trap.owner === t), stats = this.towerStats('spike', t.tier, index); if (mine.length < 3) { const spots = this.trapSpots(cell, stats.range).filter(d => !this.traps.some(trap => Math.abs(trap.d - d) < 16)); if (spots.length) { const d = spots[Math.floor(this.random() * spots.length)], p = trackPoint(d); this.traps.push({ owner: t, d, x: p.x, y: p.y, charges: 3 + Math.floor(t.tier / 2) + (this.knows('spike', 3) ? 2 : 0), damage: stats.damage * (this.knows('spike', 5) ? 1.5 : 1), stun: this.knows('spike', 5) ? .4 : 0, burst: t.tier >= AWAKEN_TIER, cd: 0, id: ++this.nextFx, tier: t.tier }); t.recoil = .16; this.emit('trap', p.x, p.y, { life: .4, sx: cell.x, sy: cell.y }); } } t.cd = stats.interval; } continue; }
        const stats = this.towerStats(t.type, t.tier, index), target = this.pickTarget(cell, stats.range, t.type === 'sniper');
        if (target) t.angle = Math.atan2(target.y - cell.y, target.x - cell.x);
        if (t.cd > 0 || !target) continue; t.cd = stats.interval; this.fire(cell, t, target, stats);
      }
      for (const s of this.shots) {
        if (s.kind === 'arrow') {
          if (s.target.hp <= 0) { s.done = true; continue; }
          const dx = s.target.x - s.x, dy = s.target.y - s.y, d = Math.hypot(dx, dy), travel = s.speed * dt; s.angle = Math.atan2(dy, dx);
          if (d <= travel + s.target.r) { const hit = s.target; this.emit('hit', hit.x, hit.y, { color: s.color, life: .2, crit: s.crit }); if (s.pierce) { let next = null; for (const e of this.enemies) if (e !== hit && e.hp > 0 && e.d < hit.d && hit.d - e.d < 70 && (!next || e.d > next.d)) next = e; if (next) { this.damage(next, s.damage * .6, s.color); this.emit('hit', next.x, next.y, { color: s.color, life: .2 }); } } this.damage(hit, s.damage, s.color, s.crit ? { crit: true } : null); s.done = true; } else { s.x += dx / d * travel; s.y += dy / d * travel; }
        } else {
          const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy), travel = s.speed * dt; s.angle = Math.atan2(dy, dx);
          if (d <= travel) { for (const e of this.enemies) if (e.hp > 0 && Math.hypot(e.x - s.tx, e.y - s.ty) <= s.splash + e.r * .5) { this.damage(e, s.damage * (e.slow > 0 || e.stun > 0 ? this.react(e, 'shatter', 1.3) : 1), s.color); if (s.ignite && e.hp > 0) { e.burnDamage = Math.max(e.burn > 0 ? e.burnDamage : 0, s.damage * .2); e.burn = 2; if (e.burnTick <= 0) e.burnTick = .5; } } this.emit('blast', s.tx, s.ty, { r: s.splash, color: s.color, life: .45, tier: s.tier, ignite: s.ignite }); if (s.cluster) for (let i = 0; i < 3; i++) { const a = this.random() * Math.PI * 2, bx = s.tx + Math.cos(a) * s.splash * .7, by = s.ty + Math.sin(a) * s.splash * .7; for (const e of this.enemies) if (e.hp > 0 && Math.hypot(e.x - bx, e.y - by) <= s.splash * .55 + e.r * .5) this.damage(e, s.damage * .35, s.color); this.emit('blast', bx, by, { r: s.splash * .55, color: s.color, life: .5, tier: 1 }); } s.done = true; } else { s.x += dx / d * travel; s.y += dy / d * travel; }
        }
      }
      const owners = new Set(this.cells.map(c => c.tower));
      for (const trap of this.traps) {
        if (!owners.has(trap.owner)) { trap.charges = 0; continue; } trap.cd -= dt; if (trap.cd > 0) continue;
        const victim = this.enemies.find(e => e.hp > 0 && Math.abs(e.d - trap.d) <= 14 + e.r * .5); if (!victim) continue;
        trap.charges--; trap.cd = .25; this.emit('snap', trap.x, trap.y, { life: .35, burst: trap.burst });
        for (const e of trap.burst ? this.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - trap.x, e.y - trap.y) <= 46 + e.r * .5) : [victim]) { if (trap.stun && !e.boss) e.stun = Math.max(e.stun, trap.stun); this.damage(e, trap.damage, TOWERS.spike.color); }
      }
      this.traps = this.traps.filter(trap => trap.charges > 0);
      for (const z of this.zones) { z.life -= dt; z.tick -= dt; if (z.tick <= 0) { z.tick += .5; for (const e of this.enemies) if (e.hp > 0 && Math.hypot(e.x - z.x, e.y - z.y) <= z.r + e.r * .5) { this.damage(e, z.damage, TOWERS.flame.color); if (e.hp > 0) { e.burnDamage = Math.max(e.burn > 0 ? e.burnDamage : 0, z.damage); e.burn = Math.max(e.burn, 1.5); if (e.burnTick <= 0) e.burnTick = .5; } } } }
      this.zones = this.zones.filter(z => z.life > 0);
      this.shots = this.shots.filter(s => !s.done); this.enemies = this.enemies.filter(e => e.hp > 0); this.fade(dt);
      if (this.core <= 0) { this.state = 'lost'; return; }
      // 다음 웨이브는 전멸 즉시, 또는 마지막 출현 6초 뒤에 겹쳐서 시작합니다. 군주 웨이브는 군주를 잡아야 넘어갑니다.
      if (this.spawned >= this.spawnLimit) this.overtime += dt;
      if (this.spawned >= this.spawnLimit && (!this.enemies.length || (this.overtime >= 6 && !this.enemies.some(e => e.boss)))) {
        this.overtime = 0;
        const cleared = this.wave, wasBoss = !!this.boss; this.score += 100 + cleared * 10; this.gold += 30 + cleared * 2;
        this.wave++; this.spawned = 0; this.spawnLimit = this.waveSize(this.wave); this.spawnClock = .6; this.intermission = this.enemies.length ? 0 : 1.5;
        this.emit('wave', 360, 360, { life: 1.8, value: this.wave });
        if (wasBoss) this.offerReward();
      }
    }
    fade(dt) { let keep = 0; for (const f of this.effects) { f.life -= dt; if (f.life > 0) this.effects[keep++] = f; } this.effects.length = keep; }
  }
  return { Game, REACTIONS, AWAKEN, AWAKEN_TIER, RESEARCH, RESEARCH_MAX, NEIGHBORS, SIZE, TRACK, TRACK_LENGTH, CORE, CORE_MAX, CELLS, TOWERS, DECK, TIERS, MAX_TIER, GROWTH, ENEMIES, BOSSES, PERKS, THEMES, THEME_NAMES, FLASH_COOLDOWN, trackPoint, distanceToTrack, roster, depth, bossOf, themeOf };
});
