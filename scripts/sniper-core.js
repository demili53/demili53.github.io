/* 윌리를 찾아서 저격해라 — game rules. No DOM access; runs in the browser and in Node tests. */
'use strict';
(function (root) {
const WORLD = { width: 1600, height: 900 };

function sniperRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const pick = (rand, list) => list[Math.floor(rand() * list.length)];

// Visible traits. Labels are what the wanted poster and decoy messages say.
const TRAITS = {
  hat: { beanie: '빨간 털모자', cap: '파란 야구모자', straw: '밀짚모자', beret: '검은 베레모', bowler: '갈색 중절모', none: '모자 없음' },
  top: { stripe: '빨강·흰 줄무늬 옷', green: '초록 옷', blue: '파란 옷', yellow: '노란 옷', purple: '보라 옷', check: '체크무늬 옷', white: '흰 옷', orange: '주황 옷' },
  glasses: { round: '둥근 안경', sun: '선글라스', none: '안경 없음' },
  item: { bag: '검은 가방', scarfY: '노란 스카프', backpack: '초록 배낭', camera: '목에 건 카메라', balloon: '빨간 풍선', scarfB: '파란 스카프', none: '소지품 없음' }
};
const TRAIT_KEYS = ['hat', 'top', 'glasses', 'item'];

// Locations: the ground below the horizon is walkable; props are drawn in depth order and block walking and bullets.
const LOCATIONS = [
  { id: 'harbor', name: '항구 시장', time: 90, crowd: 30, decoys: 2, item: 'bag', horizon: 360,
    props: [['stall', 330, 520], ['stall', 820, 470], ['stall', 1290, 540], ['crates', 560, 700], ['crates', 1080, 760], ['barrel', 200, 760], ['lamp', 1460, 690], ['barrel', 1500, 830]] },
  { id: 'festival', name: '별빛 야시장', time: 95, crowd: 38, decoys: 3, item: 'scarfY', horizon: 340, night: true,
    props: [['tent', 300, 480], ['tent', 780, 450], ['tent', 1260, 480], ['lantern', 560, 640], ['lantern', 1040, 660], ['bench', 260, 790], ['bench', 1350, 790], ['drum', 800, 830]] },
  { id: 'snow', name: '눈꽃 마을', time: 100, crowd: 42, decoys: 3, item: 'backpack', horizon: 350,
    props: [['pine', 180, 520], ['pine', 1430, 500], ['snowman', 620, 640], ['sled', 980, 600], ['pine', 820, 470], ['signpost', 1220, 720], ['snowman', 330, 800], ['pine', 1150, 860]] },
  { id: 'garden', name: '유리 온실 식물원', time: 105, crowd: 44, decoys: 4, item: 'camera', horizon: 370,
    props: [['planter', 380, 540], ['planter', 1220, 540], ['fountain', 800, 660], ['palm', 160, 640], ['palm', 1460, 660], ['planter', 560, 830], ['planter', 1040, 840]] },
  { id: 'pier', name: '노을 해변', time: 110, crowd: 48, decoys: 4, item: 'balloon', horizon: 380,
    props: [['umbrella', 300, 560], ['umbrella', 760, 520], ['umbrella', 1250, 580], ['lifeguard', 1460, 470], ['boat', 560, 770], ['umbrella', 1020, 790], ['cooler', 210, 845]] },
  { id: 'station', name: '중앙역', time: 120, crowd: 54, decoys: 5, item: 'scarfB', horizon: 360,
    props: [['pillar', 300, 560], ['pillar', 800, 560], ['pillar', 1300, 560], ['kiosk', 560, 720], ['bench', 1060, 720], ['clockPost', 1450, 820], ['bench', 200, 845], ['pillar', 820, 880]] }
];
// Ground footprint (ellipse radii) and visual box (width, height at depth scale 1) of each prop kind.
const PROP_SHAPES = {
  stall: { rx: 95, ry: 26, w: 200, h: 170 }, crates: { rx: 48, ry: 18, w: 100, h: 70 }, barrel: { rx: 22, ry: 10, w: 44, h: 56 }, lamp: { rx: 10, ry: 6, w: 30, h: 190 },
  tent: { rx: 100, ry: 28, w: 210, h: 190 }, lantern: { rx: 12, ry: 7, w: 50, h: 180 }, bench: { rx: 60, ry: 14, w: 124, h: 52 }, drum: { rx: 34, ry: 12, w: 70, h: 64 },
  pine: { rx: 34, ry: 14, w: 130, h: 230 }, snowman: { rx: 28, ry: 12, w: 64, h: 100 }, sled: { rx: 46, ry: 14, w: 96, h: 40 }, signpost: { rx: 16, ry: 8, w: 90, h: 150 },
  planter: { rx: 80, ry: 24, w: 170, h: 120 }, fountain: { rx: 95, ry: 30, w: 200, h: 150 }, palm: { rx: 22, ry: 10, w: 170, h: 250 },
  umbrella: { rx: 18, ry: 8, w: 170, h: 170 }, lifeguard: { rx: 46, ry: 16, w: 110, h: 220 }, boat: { rx: 90, ry: 24, w: 190, h: 80 }, cooler: { rx: 30, ry: 12, w: 62, h: 44 },
  pillar: { rx: 30, ry: 12, w: 62, h: 420 }, kiosk: { rx: 70, ry: 22, w: 150, h: 160 }, clockPost: { rx: 12, ry: 8, w: 70, h: 230 }
};
// Solid parts of each prop as [left, right, bottom, top] fractions of its visual box (x from -0.5 to 0.5, y from ground 0 to top 1).
// The renderer draws the same parts, so what hides a person is exactly what stops a bullet.
const PROP_SOLIDS = {
  stall: [[-0.5, 0.5, 0, 0.45], [-0.52, 0.52, 0.75, 1], [-0.48, -0.44, 0, 1], [0.44, 0.48, 0, 1]],
  tent: [[-0.5, 0.5, 0, 0.72], [-0.4, 0.4, 0.72, 1]],
  lamp: [[-0.12, 0.12, 0, 0.9], [-0.5, 0.5, 0.84, 1]],
  lantern: [[-0.08, 0.08, 0, 0.85], [-0.4, 0.4, 0.68, 1]],
  pine: [[-0.08, 0.08, 0, 0.15], [-0.5, 0.5, 0.12, 0.6], [-0.35, 0.35, 0.6, 0.85], [-0.18, 0.18, 0.85, 1]],
  signpost: [[-0.08, 0.08, 0, 1], [-0.5, 0.5, 0.62, 0.9]],
  palm: [[-0.08, 0.08, 0, 0.86], [-0.5, 0.5, 0.8, 1]],
  umbrella: [[-0.03, 0.03, 0, 0.86], [-0.5, 0.5, 0.72, 0.94]],
  lifeguard: [[-0.45, -0.35, 0, 0.6], [0.35, 0.45, 0, 0.6], [-0.5, 0.5, 0.55, 1]],
  pillar: [[-0.4, 0.4, 0, 1]],
  clockPost: [[-0.08, 0.08, 0, 0.8], [-0.5, 0.5, 0.72, 1]],
  fountain: [[-0.5, 0.5, 0, 0.35], [-0.1, 0.1, 0.35, 0.8], [-0.3, 0.3, 0.75, 0.86]]
};
const PERSON = { width: 26, height: 70 };
const LOOK_POOL = {
  skin: ['#f1d2b6', '#e3b48f', '#c48a62', '#9a6a4a', '#f5dcc7', '#d9a37c'],
  hair: ['#2a1f1a', '#5a3a22', '#8a5a2b', '#c9a15a', '#1c1c22', '#7b7b7b', '#a33d22'],
  pants: ['#2e3d5c', '#3c3c44', '#5b4636', '#6a7a8a', '#2f4a3a', '#7a5a7a']
};
const MAX_MISSES = 3, FLIGHT = 0.95, AFTERMATH = 1.6;

// Three rifles with different handling. Chosen once at the start of a run.
const WEAPONS = {
  scout: { id: 'scout', name: '정찰 소총', short: '균형형', desc: '흔들림과 배율이 고르고, 기회 3번.', zoom: 3.2, sway: 1, breath: 3.2, misses: 3, pierce: 0, silent: false, color: '#e8b45c', trail: '#ffdca0' },
  heavy: { id: 'heavy', name: '대구경 소총', short: '관통', desc: '가림막 하나를 뚫고, 배율이 높지만 많이 흔들려요. 정밀 명중 +300.', zoom: 3.9, sway: 1.35, breath: 2.6, misses: 3, pierce: 1, silent: false, headBonus: 300, color: '#ff8a4c', trail: '#ffb070' },
  rapid: { id: 'rapid', name: '반자동 소총', short: '속사', desc: '빗나간 탄은 슬로모션 없이 바로 다음 발. 배율이 낮고 많이 흔들려요.', zoom: 2.8, sway: 1.25, breath: 3, misses: 3, pierce: 0, silent: false, quick: true, color: '#b7e36a', trail: '#e2ffb0' },
  silent: { id: 'silent', name: '소음 카빈', short: '은밀', desc: '빗나가도 군중이 놀라지 않고 기회가 4번. 배율은 낮아요.', zoom: 2.6, sway: 0.8, breath: 4, misses: 4, pierce: 0, silent: true, color: '#8fd3ff', trail: '#cfeeff' }
};
// One special ability per rifle, usable once per stage (more with the 'charge' upgrade).
const ABILITIES = {
  scout: { name: '집중', desc: '4초 동안 조준이 멈추고 군중이 느려져요.', time: 4 },
  heavy: { name: '열상 투시', desc: '5초 동안 가림막 뒤 사람이 보여요.', time: 5 },
  rapid: { name: '속사 모드', desc: '6초 동안 숨이 줄지 않고 흔들림이 절반.', time: 6 },
  silent: { name: '예비탄', desc: '다음 빗나감 한 번은 기회를 쓰지 않아요.', time: 0 }
};
// Upgrades offered after each cleared stage (pick one of three).
const UPGRADES = {
  stock: { id: 'stock', name: '안정 개머리판', desc: '조준 흔들림 20% 감소', max: 3 },
  lungs: { id: 'lungs', name: '폐활량 훈련', desc: '숨 참기 시간 35% 증가', max: 3 },
  lens: { id: 'lens', name: '고배율 렌즈', desc: '스코프 배율 +0.5', max: 2 },
  mag: { id: 'mag', name: '예비 탄창', desc: '판마다 빗나갈 기회 +1', max: 2 },
  ap: { id: 'ap', name: '철갑탄', desc: '가림막 하나 더 관통', max: 2 },
  suppressor: { id: 'suppressor', name: '소음기', desc: '빗나가도 군중이 놀라지 않음', max: 1 },
  scanner: { id: 'scanner', name: '단서 탐지 렌즈', desc: '스코프 안 변장 인물에 X 표시', max: 1 },
  timer: { id: 'timer', name: '작전 연장', desc: '판마다 제한 시간 +10초', max: 3 },
  hollow: { id: 'hollow', name: '정밀 탄두', desc: '머리 판정 30% 확대, 정밀 명중 +200', max: 2 },
  charge: { id: 'charge', name: '능력 충전기', desc: '특수 능력 판마다 +1회', max: 2, rare: true },
  medkit: { id: 'medkit', name: '응급 키트', desc: '목숨 1개 회복(최대 3)', max: 9, rare: true },
  tracer: { id: 'tracer', name: '예광탄 표적기', desc: '시간 절반이 지나면 윌리 쪽 방향 표시', max: 1, rare: true }
};
// Two upgrades on the same build give an extra effect.
const SYNERGIES = [
  { id: 'deadeye', name: '명사수', need: { stock: 2, hollow: 1 }, desc: '정밀 명중 +500' },
  { id: 'ghost', name: '유령 저격수', need: { suppressor: 1, lungs: 1 }, desc: '빗나감이 점수를 깎지 않음', silentWeapon: true },
  { id: 'breacher', name: '관통 전문가', need: { ap: 1 }, weapon: 'heavy', desc: '관통 명중 +400' }
];
function weaponStats(weaponId, mods = {}) {
  const w = WEAPONS[weaponId] || WEAPONS.scout, m = id => mods[id] || 0;
  return {
    weapon: w, zoom: w.zoom + m('lens') * 0.5, sway: w.sway * Math.pow(0.8, m('stock')), breath: w.breath * (1 + 0.35 * m('lungs')),
    misses: w.misses + m('mag'), pierce: w.pierce + m('ap'), silent: w.silent || m('suppressor') > 0, scanner: m('scanner') > 0,
    timeBonus: m('timer') * 10, head: 1 + 0.3 * m('hollow'), headBonus: (w.headBonus || 0) + m('hollow') * 200,
    quick: Boolean(w.quick), charges: 1 + m('charge'), tracer: m('tracer') > 0, ability: ABILITIES[w.id]
  };
}
function activeSynergies(weaponId, mods = {}) {
  const silent = weaponStats(weaponId, mods).silent;
  return SYNERGIES.filter(sy => Object.entries(sy.need).every(([k, v]) => (mods[k] || 0) >= v || (k === 'suppressor' && sy.silentWeapon && silent))
    && (!sy.weapon || sy.weapon === weaponId));
}

function depthScale(stage, y) { return 0.62 + 0.58 * clamp((y - stage.horizon) / (WORLD.height - stage.horizon), 0, 1); }

function locationFor(level) {
  const base = LOCATIONS[level % LOCATIONS.length], tier = Math.floor(level / LOCATIONS.length);
  return { ...base, tier, time: Math.max(55, Math.round(base.time * Math.pow(0.88, tier))), crowd: base.crowd + tier * 6, decoys: Math.min(9, base.decoys + tier * 2) };
}
function targetLook(loc) { return { hat: 'beanie', top: 'stripe', glasses: 'round', item: loc.item }; }
function sameLook(a, b) { return TRAIT_KEYS.every(k => a[k] === b[k]); }
function differingTraits(a, b) { return TRAIT_KEYS.filter(k => a[k] !== b[k]); }
function describe(look) { return TRAIT_KEYS.map(k => TRAITS[k][look[k]]); }

function insideProp(stage, x, y, pad = 0) {
  return stage.props.some(p => { const dx = (x - p.x) / (p.rx + pad), dy = (y - p.y) / (p.ry + pad * 0.5); return dx * dx + dy * dy < 1; });
}
function randomSpot(stage, rand, near, radius) {
  for (let i = 0; i < 40; i++) {
    const x = near ? near.x + (rand() * 2 - 1) * radius : 60 + rand() * (WORLD.width - 120);
    const y = near ? near.y + (rand() * 2 - 1) * radius * 0.45 : stage.horizon + 40 + rand() * (WORLD.height - stage.horizon - 70);
    const cx = clamp(x, 50, WORLD.width - 50), cy = clamp(y, stage.horizon + 30, WORLD.height - 25);
    if (!insideProp(stage, cx, cy, 14)) return { x: cx, y: cy };
  }
  return { x: WORLD.width / 2, y: WORLD.height - 40 };
}

// Builds one location: props, the target, one-clue decoys and a crowd that never fully matches the target.
function makeStage(level, seed) {
  const loc = locationFor(level), rand = sniperRandom(seed), stage = { level, loc, seed, horizon: loc.horizon, props: [], people: [] };
  stage.props = loc.props.map(([kind, x, y], i) => ({ id: i, kind, x, y, ...PROP_SHAPES[kind] }));
  const target = targetLook(loc), looks = [{ ...target }];
  for (let i = 0; i < loc.decoys; i++) {
    const key = TRAIT_KEYS[i % TRAIT_KEYS.length], options = Object.keys(TRAITS[key]).filter(v => v !== target[key] && v !== 'none');
    looks.push({ ...target, [key]: options[Math.floor(rand() * options.length)] });
  }
  while (looks.length < loc.crowd) {
    const look = { hat: pick(rand, Object.keys(TRAITS.hat)), top: pick(rand, Object.keys(TRAITS.top)), glasses: pick(rand, ['none', 'none', 'round', 'sun']), item: pick(rand, Object.keys(TRAITS.item)) };
    // Partial look-alikes are common; anyone sharing three or more clues is a deliberate decoy only.
    if (rand() < 0.25) look.hat = 'beanie';
    if (rand() < 0.22) look.top = 'stripe';
    if (differingTraits(look, target).length < 2) continue;
    looks.push(look);
  }
  looks.forEach((look, id) => {
    const spot = randomSpot(stage, rand);
    stage.people.push({
      id, look, target: id === 0, decoy: id > 0 && differingTraits(look, target).length === 1,
      skin: pick(rand, LOOK_POOL.skin), hair: pick(rand, LOOK_POOL.hair), pants: pick(rand, LOOK_POOL.pants), build: 0.9 + rand() * 0.22,
      x: spot.x, y: spot.y, home: { ...spot }, goal: null, facing: rand() < 0.5 ? -1 : 1,
      speed: 26 + rand() * 18, stride: rand() * 6, state: 'idle', timer: rand() * 3, fear: 0, alarm: 0, dead: false, fall: 0, fallDir: 1, phase: rand() * 6,
      action: pick(rand, ['look', 'look', 'phone', 'chat', 'wave'])
    });
  });
  // Willy likes standing just behind props, half hidden.
  stage.hideSpots = stage.props.filter(p => p.y - p.ry - 18 > stage.horizon + 25).map(p => ({ x: p.x + (rand() * 2 - 1) * p.rx * 0.5, y: p.y - p.ry - 14 }));
  stage.rand = rand;
  return stage;
}

// Visual rectangle of a prop that stops bullets and hides people behind it.
function propSolid(stage, p, x, y) {
  const s = depthScale(stage, p.y), w = p.w * s, h = p.h * s, fx = (x - p.x) / w, fy = (p.y + 4 - y) / (h + 4);
  if (fx < -0.55 || fx > 0.55 || fy < 0 || fy > 1) return false;
  return (PROP_SOLIDS[p.kind] || [[-0.5, 0.5, 0, 1]]).some(([l, r, b, t]) => fx >= l && fx <= r && fy >= b && fy <= t);
}
function propCovers(stage, person, x, y) {
  return stage.props.find(p => p.y > person.y && propSolid(stage, p, x, y)) || null;
}
function personBox(stage, p) {
  const s = depthScale(stage, p.y) * p.build, h = PERSON.height * s;
  return { x: p.x, y: p.y, w: PERSON.width * s, h, head: h * 0.27 };
}
function hitTest(stage, x, y, opt = {}) {
  const pierce = opt.pierce || 0, headScale = opt.head || 1;
  const order = stage.people.filter(p => !p.dead).sort((a, b) => b.y - a.y);
  for (const p of order) {
    const b = personBox(stage, p);
    if (Math.abs(x - b.x) <= b.w / 2 && y <= b.y && y >= b.y - b.h) {
      const covers = stage.props.filter(o => o.y > p.y && propSolid(stage, o, x, y));
      if (covers.length > pierce) return { kind: 'prop', prop: covers[0], person: p };
      return { kind: 'person', person: p, head: y < b.y - b.h + b.head * headScale, pierced: covers };
    }
  }
  const prop = stage.props.find(p => propSolid(stage, p, x, y));
  return prop ? { kind: 'prop', prop, pierced: [] } : { kind: 'miss', pierced: [] };
}

class SniperRun {
  constructor({ seed = (Date.now() >>> 0), weapon = null } = {}) {
    this.seed = seed >>> 0; this.level = 0; this.lives = 3; this.score = 0; this.clears = []; this.attempt = 0;
    this.weapon = WEAPONS[weapon] ? weapon : 'scout'; this.mods = {}; this.offer = []; this.decals = [];
    this.state = WEAPONS[weapon] ? 'brief' : 'armory'; this.aim = { x: WORLD.width / 2, y: WORLD.height * 0.62 }; this.steady = false; this.breath = 1;
    this.loadLevel();
  }
  loadLevel() {
    this.stage = makeStage(this.level, (this.seed + this.level * 7919 + this.attempt * 104729) >>> 0);
    this.time = this.stage.loc.time + this.stats.timeBonus; this.decals = []; this.elapsed = 0;
    this.charges = this.stats.charges; this.abilityTime = 0; this.spareRound = false; this.shotsFired = 0; this.misses = 0; this.shot = null; this.result = null; this.message = '';
    this.pausedFrom = null; this.breath = 1; this.steady = false;
  }
  get location() { return this.stage.loc; }
  get stats() { return weaponStats(this.weapon, this.mods); }
  get maxMisses() { return this.stats.misses; }
  // Pick the rifle for this run (only before the first stage starts).
  chooseWeapon(id) {
    if (this.state !== 'armory' || !WEAPONS[id]) return false;
    this.weapon = id; this.time = this.stage.loc.time + this.stats.timeBonus; this.state = 'brief'; return true;
  }
  makeOffer() {
    const rand = sniperRandom((this.seed ^ (this.level * 2654435761)) >>> 0);
    const ok = id => (this.mods[id] || 0) < UPGRADES[id].max && !(id === 'suppressor' && WEAPONS[this.weapon].silent) && !(id === 'medkit' && this.lives >= 3);
    const pool = Object.keys(UPGRADES).filter(id => ok(id) && !UPGRADES[id].rare), rares = Object.keys(UPGRADES).filter(id => ok(id) && UPGRADES[id].rare);
    const offer = [];
    if (this.level >= 1 && rares.length && rand() < 0.6) offer.push(rares[Math.floor(rand() * rares.length)]);
    while (offer.length < 3 && pool.length) offer.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
    return offer;
  }
  // Take one of the offered upgrades after a clear, then move to the next stage.
  pickUpgrade(id) {
    if (this.state !== 'clear' || !this.offer.includes(id)) return false;
    if (id === 'medkit') this.lives = Math.min(3, this.lives + 1); else this.mods[id] = (this.mods[id] || 0) + 1;
    this.offer = []; return this.next();
  }
  get synergies() { return activeSynergies(this.weapon, this.mods); }
  hasSynergy(id) { return this.synergies.some(s => s.id === id); }
  // Special ability: one use per stage per charge.
  useAbility() {
    if (this.state !== 'play' || this.charges <= 0 || this.abilityTime > 0 || this.spareRound) return false;
    this.charges--; const a = this.stats.ability;
    if (this.weapon === 'silent') this.spareRound = true; else this.abilityTime = a.time;
    return true;
  }
  get focus() { return this.weapon === 'scout' && this.abilityTime > 0; }
  get thermal() { return this.weapon === 'heavy' && this.abilityTime > 0; }
  get rapidMode() { return this.weapon === 'rapid' && this.abilityTime > 0; }
  get tracerOn() { return this.stats.tracer && this.time <= (this.stage.loc.time + this.stats.timeBonus) / 2; }
  get target() { return this.stage.people[0]; }
  get clues() { return describe(targetLook(this.location)); }
  begin() { if (this.state !== 'brief') return false; this.state = 'play'; return true; }
  pause() {
    if (this.state === 'play' || this.state === 'shot') { this.pausedFrom = this.state; this.state = 'paused'; this.steady = false; return true; }
    if (this.state === 'paused') { this.state = this.pausedFrom; this.pausedFrom = null; return true; }
    return false;
  }
  setAim(x, y) { if (!Number.isFinite(x) || !Number.isFinite(y)) return false; this.aim.x = clamp(x, 0, WORLD.width); this.aim.y = clamp(y, 0, WORLD.height); return true; }
  setSteady(on) { this.steady = Boolean(on) && this.state === 'play' && this.breath > 0.05; }
  // Breathing sway; holding breath (steady) shrinks it until the breath meter runs out.
  sway() {
    if (this.focus) return { x: 0, y: 0 };
    const amp = (this.steady ? 1.4 : 6.5) * this.stats.sway * (this.rapidMode ? 0.5 : 1), t = this.elapsed;
    return { x: Math.sin(t * 1.9) * amp + Math.sin(t * 4.3) * amp * 0.25, y: Math.cos(t * 1.5) * amp * 0.7 };
  }
  fire() {
    if (this.state !== 'play') return { kind: 'blocked' };
    const st = this.stats, d = this.sway(), x = clamp(this.aim.x + d.x, 0, WORLD.width), y = clamp(this.aim.y + d.y, 0, WORLD.height), hit = hitTest(this.stage, x, y, { pierce: st.pierce, head: st.head });
    this.shot = { x, y, hit, clock: 0, resolved: false, outcome: null, weapon: this.weapon, pierced: hit.pierced || [] };
    this.state = 'shot'; this.steady = false; this.shotsFired++;
    // A semi-auto miss skips the slow-motion sequence entirely.
    if (this.stats.quick && hit.kind !== 'person') { this.shot.quick = true; this.resolveShot(); if (this.shot.outcome === 'miss') { this.lastShot = this.shot; this.shot = null; this.state = 'play'; } else this.shot.clock = FLIGHT; }
    return { kind: hit.kind === 'person' ? (hit.person.target ? 'target' : 'innocent') : hit.kind, x, y };
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    if (this.state === 'shot') { this.updateShot(dt); return; }
    if (this.state !== 'play') return;
    this.elapsed += dt; this.time = Math.max(0, this.time - dt);
    this.abilityTime = Math.max(0, this.abilityTime - dt);
    this.breath = this.steady && !this.rapidMode ? Math.max(0, this.breath - dt / this.stats.breath) : Math.min(1, this.breath + dt / 2.4);
    if (this.breath === 0) this.steady = false;
    this.updateCrowd(this.focus ? dt * 0.3 : dt);
    if (this.time === 0) this.fail('시간이 다 됐습니다. 윌리가 군중 속으로 사라졌어요.');
  }
  // Skip the rest of the bullet-time sequence; the outcome is resolved exactly once.
  skip() { if (this.state !== 'shot') return false; this.updateShot(FLIGHT + AFTERMATH); for (const p of this.stage.people) if (p.dead) p.fall = 1; return true; }
  updateShot(dt) {
    const s = this.shot; s.clock += dt;
    for (const p of this.stage.people) if (p.dead) p.fall = Math.min(1, p.fall + dt * 2.2);
    if (!s.resolved && s.clock >= FLIGHT) this.resolveShot();
    if (s.clock >= FLIGHT + AFTERMATH) {
      if (s.outcome === 'clear') this.clearLevel();
      else if (s.outcome === 'fail') this.fail(s.reason, true);
      else { this.state = 'play'; this.shot = null; }
    }
  }
  resolveShot() {
    const s = this.shot, hit = s.hit, target = targetLook(this.location); s.resolved = true;
    if (hit.kind === 'person') {
      const p = hit.person; p.dead = true; p.fall = 0; p.fallDir = s.x < p.x ? 1 : -1;
      if (p.target) { s.outcome = 'clear'; s.head = hit.head; return; }
      s.outcome = 'fail';
      const diff = differingTraits(p.look, target);
      s.reason = p.decoy ? `변장한 가짜였습니다. 윌리는 '${TRAITS[diff[0]][target[diff[0]]]}'인데 이 사람은 '${TRAITS[diff[0]][p.look[diff[0]]]}'였어요.` : '엉뚱한 사람을 쐈습니다. 수배 전단의 단서 네 가지를 모두 확인하세요.';
      return;
    }
    if (this.spareRound) { this.spareRound = false; s.spared = true; } else this.misses++;
    s.outcome = this.misses >= this.maxMisses ? 'fail' : 'miss';
    s.reason = `${this.maxMisses}번 빗나가자 윌리가 눈치채고 달아났습니다.`;
    this.decals.push({ x: s.x, y: s.y, prop: hit.kind === 'prop' });
    if (this.stats.silent) this.hush(s.x, s.y); else this.panic(s.x, s.y);
  }
  // A suppressed miss: only people right next to the impact glance around.
  hush(x, y) {
    for (const p of this.stage.people) if (!p.dead && Math.hypot(p.x - x, (p.y - y) * 1.6) < 90) { p.alarm = 0.8; p.action = 'look'; }
  }
  panic(x, y) {
    for (const p of this.stage.people) {
      if (p.dead) continue;
      const d = Math.hypot(p.x - x, (p.y - y) * 1.6);
      p.fear = Math.min(1, p.fear + 0.35 + Math.max(0, 1 - d / 700) * 0.6);
      p.alarm = 1.3; p.state = 'flee'; p.timer = 1.2 + p.fear * 2;
      const away = Math.atan2(p.y - y, p.x - x), dist = 160 + p.fear * 160;
      p.goal = randomSpot(this.stage, this.stage.rand, { x: p.x + Math.cos(away) * dist, y: p.y + Math.sin(away) * dist }, 60);
    }
  }
  updateCrowd(dt) {
    const stage = this.stage, rand = stage.rand;
    for (const p of stage.people) {
      if (p.dead) continue;
      p.timer -= dt; p.alarm = Math.max(0, p.alarm - dt); p.fear = Math.max(0, p.fear - dt * 0.06);
      if (p.state === 'idle' && p.timer <= 0) {
        const hide = p.target && stage.hideSpots.length && rand() < 0.45;
        p.goal = hide ? randomSpot(stage, rand, pick(rand, stage.hideSpots), 30) : randomSpot(stage, rand, rand() < 0.7 ? p.home : null, 260);
        p.state = 'walk';
      }
      if ((p.state === 'walk' || p.state === 'flee') && p.goal) {
        const dx = p.goal.x - p.x, dy = p.goal.y - p.y, d = Math.hypot(dx, dy);
        const speed = p.speed * (p.state === 'flee' ? 2.4 : 1) * (0.7 + 0.3 * depthScale(stage, p.y));
        if (d < 4 || (p.state === 'flee' && p.timer <= 0 && d < 30)) {
          p.state = 'idle'; p.timer = p.target ? 1.5 + rand() * 3 : 1.5 + rand() * 5; p.goal = null;
          p.action = p.fear > 0.3 ? 'look' : pick(rand, ['look', 'look', 'phone', 'chat', 'wave']);
          continue;
        }
        let nx = p.x + dx / d * speed * dt, ny = p.y + dy / d * speed * dt;
        if (insideProp(stage, nx, ny, 10)) {
          // Slide along the prop instead of walking through it; pick a new goal if still blocked.
          const prop = stage.props.find(o => { const ex = (nx - o.x) / (o.rx + 10), ey = (ny - o.y) / (o.ry + 5); return ex * ex + ey * ey < 1; });
          const side = Math.sign(p.y - prop.y) || 1;
          nx = p.x + Math.sign(dx || 1) * speed * dt * 0.6; ny = p.y + side * speed * dt * 0.8;
          if (insideProp(stage, nx, ny, 10)) { p.goal = randomSpot(stage, rand, p, 140); continue; }
        }
        p.x = clamp(nx, 40, WORLD.width - 40); p.y = clamp(ny, stage.horizon + 25, WORLD.height - 20);
        p.stride += speed * dt * 0.11; if (Math.abs(dx) > 1) p.facing = dx < 0 ? -1 : 1;
      }
    }
  }
  clearLevel() {
    const loc = this.location, s = this.shot;
    const st = this.stats, breakdown = { base: 1000, time: Math.round(this.time * 12), misses: (st.misses - this.misses) * 250, head: s.head ? 600 + st.headBonus + (this.hasSynergy('deadeye') ? 500 : 0) : 0, tier: loc.tier * 500 };
    if (s.pierced && s.pierced.length) breakdown.pierce = 300 + (this.hasSynergy('breacher') ? 400 : 0);
    if (this.hasSynergy('ghost')) breakdown.misses = st.misses * 250;
    const gained = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const stars = this.misses === 0 && this.time >= (loc.time + st.timeBonus) * 0.4 ? 3 : this.misses <= 1 ? 2 : 1;
    this.score += gained;
    this.result = { level: this.level, name: loc.name, gained, stars, head: Boolean(s.head), breakdown, seconds: Math.round((loc.time - this.time) * 10) / 10 };
    this.clears.push(this.result); this.state = 'clear'; this.shot = null; this.offer = this.makeOffer();
  }
  fail(reason, fromShot = false) {
    if (!['play', 'shot'].includes(this.state) || (this.state === 'shot' && !fromShot)) return;
    this.lives--; this.message = reason; this.shot = null; this.steady = false;
    this.state = this.lives > 0 ? 'failed' : 'over';
  }
  next() {
    if (this.state === 'clear') { this.offer = []; this.level++; this.attempt = 0; this.loadLevel(); this.state = 'brief'; return true; }
    if (this.state === 'failed') { this.attempt++; this.loadLevel(); this.state = 'brief'; return true; }
    return false;
  }
}

const api = { WEAPONS, UPGRADES, ABILITIES, SYNERGIES, activeSynergies, weaponStats, WORLD, TRAITS, TRAIT_KEYS, LOCATIONS, PROP_SHAPES, PROP_SOLIDS, PERSON, MAX_MISSES, FLIGHT, AFTERMATH, sniperRandom, makeStage, locationFor, targetLook, describe, differingTraits, sameLook, depthScale, hitTest, personBox, propCovers, propSolid, insideProp, SniperRun };
if (typeof module === 'object' && module.exports) module.exports = api; else root.SniperCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
