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
function hitTest(stage, x, y) {
  const order = stage.people.filter(p => !p.dead).sort((a, b) => b.y - a.y);
  for (const p of order) {
    const b = personBox(stage, p);
    if (Math.abs(x - b.x) <= b.w / 2 && y <= b.y && y >= b.y - b.h) {
      const prop = propCovers(stage, p, x, y);
      if (prop) return { kind: 'prop', prop, person: p };
      return { kind: 'person', person: p, head: y < b.y - b.h + b.head };
    }
  }
  const prop = stage.props.find(p => propSolid(stage, p, x, y));
  return prop ? { kind: 'prop', prop } : { kind: 'miss' };
}

class SniperRun {
  constructor({ seed = (Date.now() >>> 0) } = {}) {
    this.seed = seed >>> 0; this.level = 0; this.lives = 3; this.score = 0; this.clears = []; this.attempt = 0;
    this.state = 'brief'; this.aim = { x: WORLD.width / 2, y: WORLD.height * 0.62 }; this.steady = false; this.breath = 1;
    this.loadLevel();
  }
  loadLevel() {
    this.stage = makeStage(this.level, (this.seed + this.level * 7919 + this.attempt * 104729) >>> 0);
    this.time = this.stage.loc.time; this.elapsed = 0; this.misses = 0; this.shot = null; this.result = null; this.message = '';
    this.pausedFrom = null; this.breath = 1; this.steady = false;
  }
  get location() { return this.stage.loc; }
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
    const amp = this.steady ? 1.4 : 6.5, t = this.elapsed;
    return { x: Math.sin(t * 1.9) * amp + Math.sin(t * 4.3) * amp * 0.25, y: Math.cos(t * 1.5) * amp * 0.7 };
  }
  fire() {
    if (this.state !== 'play') return { kind: 'blocked' };
    const d = this.sway(), x = clamp(this.aim.x + d.x, 0, WORLD.width), y = clamp(this.aim.y + d.y, 0, WORLD.height), hit = hitTest(this.stage, x, y);
    this.shot = { x, y, hit, clock: 0, resolved: false, outcome: null };
    this.state = 'shot'; this.steady = false;
    return { kind: hit.kind === 'person' ? (hit.person.target ? 'target' : 'innocent') : hit.kind, x, y };
  }
  update(dt) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    if (this.state === 'shot') { this.updateShot(dt); return; }
    if (this.state !== 'play') return;
    this.elapsed += dt; this.time = Math.max(0, this.time - dt);
    this.breath = this.steady ? Math.max(0, this.breath - dt / 3.2) : Math.min(1, this.breath + dt / 2.4);
    if (this.breath === 0) this.steady = false;
    this.updateCrowd(dt);
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
    this.misses++; s.outcome = this.misses >= MAX_MISSES ? 'fail' : 'miss';
    s.reason = '세 번 빗나가자 윌리가 눈치채고 달아났습니다.';
    this.panic(s.x, s.y);
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
    const breakdown = { base: 1000, time: Math.round(this.time * 12), misses: (MAX_MISSES - this.misses) * 250, head: s.head ? 600 : 0, tier: loc.tier * 500 };
    const gained = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const stars = this.misses === 0 && this.time >= loc.time * 0.4 ? 3 : this.misses <= 1 ? 2 : 1;
    this.score += gained;
    this.result = { level: this.level, name: loc.name, gained, stars, head: Boolean(s.head), breakdown, seconds: Math.round((loc.time - this.time) * 10) / 10 };
    this.clears.push(this.result); this.state = 'clear'; this.shot = null;
  }
  fail(reason, fromShot = false) {
    if (!['play', 'shot'].includes(this.state) || (this.state === 'shot' && !fromShot)) return;
    this.lives--; this.message = reason; this.shot = null; this.steady = false;
    this.state = this.lives > 0 ? 'failed' : 'over';
  }
  next() {
    if (this.state === 'clear') { this.level++; this.attempt = 0; this.loadLevel(); this.state = 'brief'; return true; }
    if (this.state === 'failed') { this.attempt++; this.loadLevel(); this.state = 'brief'; return true; }
    return false;
  }
}

const api = { WORLD, TRAITS, TRAIT_KEYS, LOCATIONS, PROP_SHAPES, PROP_SOLIDS, PERSON, MAX_MISSES, FLIGHT, AFTERMATH, sniperRandom, makeStage, locationFor, targetLook, describe, differingTraits, sameLook, depthScale, hitTest, personBox, propCovers, propSolid, insideProp, SniperRun };
if (typeof module === 'object' && module.exports) module.exports = api; else root.SniperCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
