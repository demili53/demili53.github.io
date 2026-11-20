// Lantern Keeper: survive one night (10 minutes) in a shadow forest. The keeper's lantern arts fire on
// their own; you only move. Shadows drop embers (XP); each level offers three lantern arts or charms.
// Rules and numbers live in scripts/lantern-core.js.
(() => {
  const C = window.LanternCore;
  const $ = id => document.getElementById(id);
  const canvas = $('lkCanvas'), ctx = canvas.getContext('2d');
  const ui = {
    overlay: $('lkOverlay'), kicker: $('lkKicker'), title: $('lkTitle'), text: $('lkText'), start: $('lkStart'), choices: $('lkChoices'),
    pause: $('lkPause'), sound: $('lkSound'), status: $('lkStatus'), best: $('lkBest')
  };
  const BEST_KEY = 'partygame.lanternKeeper.best', SOUND_KEY = 'partygame.lanternKeeper.sound';
  const readBest = () => { try { return { score: 0, time: 0, level: 0, ...JSON.parse(localStorage.getItem(BEST_KEY)) }; } catch { return { score: 0, time: 0, level: 0 }; } };
  const writeBest = v => { try { localStorage.setItem(BEST_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TAU = Math.PI * 2, PLAYER_R = 12;

  let S = null, mode = 'ready'; // ready | play | paused | levelup | over
  let choices = [], lastTime = 0, shake = 0, god = false, hitStop = 0, flashT = 0;
  let src = null, srcColor = '#ffffff', srcEvo = false; // which art is dealing damage right now
  const keys = new Set();
  let stick = null; // touch / mouse drag joystick
  let botMove = null; // test hook input
  const view = { k: 1, hw: 300, hh: 200, dpr: 1, cw: 600, ch: 400 };

  // ---------- Setup ----------
  function fit() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    const cw = Math.max(200, r.width), ch = Math.max(200, r.height);
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    const scale = Math.min(cw, ch) / 520;
    Object.assign(view, { dpr, cw, ch, k: dpr * scale, hw: cw / scale / 2, hh: ch / scale / 2 });
  }
  function fresh() {
    const build = C.newBuild(), mods = C.modifiers(build);
    return {
      t: 0, build, mods, level: 1, xp: 0, need: C.xpToNext(1), kills: 0, pending: 0, dawn: false, bossesDown: 0,
      player: { x: 0, y: 0, hp: mods.maxHp, inv: 0, face: 1, walk: 0, moving: false },
      enemies: [], shots: [], gems: [], pools: [], beams: [], flares: [], texts: [], parts: [], bullets: [], fx: [], arcs: [], slashes: [], blasts: [], later: [], dmgBy: {}, crits: 0, seeds: [], beaconA: 0, lastSeed: null,
      cds: {}, haloA: 0, spawnAcc: 0, id: 1
    };
  }

  // ---------- Audio (optional, generated) ----------
  let audio = null, lastHitSound = 0;
  function beep(freq, dur, type = 'triangle', vol = .035, slide = 0) {
    if (!ui.sound.checked) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
      o.type = type; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(audio.destination); o.start(t); o.stop(t + dur);
    } catch { /* audio blocked */ }
  }

  // ---------- Spatial grid ----------
  const CELL = 48; let grid = new Map();
  const key = (cx, cy) => (cx + 30000) * 60000 + (cy + 30000);
  function rebuildGrid() {
    grid = new Map();
    for (const e of S.enemies) {
      if (e.dead) continue;
      const k = key(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      let list = grid.get(k); if (!list) grid.set(k, list = []); list.push(e);
    }
  }
  function near(x, y, r, fn) {
    const x0 = Math.floor((x - r - 46) / CELL), x1 = Math.floor((x + r + 46) / CELL), y0 = Math.floor((y - r - 46) / CELL), y1 = Math.floor((y + r + 46) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const list = grid.get(key(cx, cy)); if (!list) continue;
      for (const e of list) if (!e.dead) { const d = r + e.r, dx = e.x - x, dy = e.y - y; if (dx * dx + dy * dy <= d * d && fn(e) === false) return; }
    }
  }
  function nearest(x, y, n = 1, skip) {
    const out = [];
    for (const e of S.enemies) {
      if (e.dead || (skip && skip.has(e))) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d > 520 * 520) continue;
      if (out.length < n) { out.push([d, e]); out.sort((a, b) => a[0] - b[0]); }
      else if (d < out[n - 1][0]) { out[n - 1] = [d, e]; out.sort((a, b) => a[0] - b[0]); }
    }
    return out.map(o => o[1]);
  }

  // ---------- Spawning ----------
  function edgePoint(extra = 40) {
    const a = Math.random() * TAU, r = Math.hypot(view.hw, view.hh) + extra;
    return { x: S.player.x + Math.cos(a) * r, y: S.player.y + Math.sin(a) * r };
  }
  function spawnEnemy(type, x, y) {
    if (x === undefined) ({ x, y } = edgePoint());
    const e = { ...C.enemyStats(type, S.t), id: S.id++, born: S.t, x, y, kx: 0, ky: 0, flash: 0, haloT: -9, phase: Math.random() * TAU };
    e.maxHp = e.hp; S.enemies.push(e); return e;
  }
  function spawnBoss(def) {
    const { x, y } = edgePoint(10);
    const e = { type: 'boss', boss: def.id, name: def.name, hp: def.hp, maxHp: def.hp, speed: def.speed, r: def.r, damage: def.damage, xp: def.xp, color: def.color,
      id: S.id++, born: S.t, x, y, kx: 0, ky: 0, flash: 0, haloT: -9, phase: 0, skill: 3, dash: 0, tele: 0 };
    S.enemies.push(e); S.boss = e;
    banner(`${def.name} 출현`); beep(110, .6, 'sawtooth', .05, -40);
    return e;
  }
  function ring(count = 26) {
    const r = Math.hypot(view.hw, view.hh) * .85;
    for (let i = 0; i < count; i++) { const a = i / count * TAU; spawnEnemy(S.t > 300 ? 'bat' : 'moth', S.player.x + Math.cos(a) * r, S.player.y + Math.sin(a) * r); }
    banner('그림자가 둘러싼다');
  }
  let bannerText = '', bannerT = 0;
  function banner(text) { bannerText = text; bannerT = 2.4; }

  // ---------- Combat ----------
  const mixCache = {};
  const mixWhite = hex => mixCache[hex] ||= '#' + [1, 3, 5].map(i => Math.round((parseInt(hex.slice(i, i + 2), 16) + 255 * 2) / 3).toString(16).padStart(2, '0')).join('');
  function setSrc(id, color, evo) { src = id; srcColor = color || '#ffffff'; srcEvo = !!evo; }
  function addText(x, y, text, color = '#fff') { if (S.texts.length < 70) S.texts.push({ x, y, text, color, t: 0 }); }
  function burst(x, y, color, n = 6, sp = 90) {
    for (let i = 0; i < n && S.parts.length < 400; i++) { const a = Math.random() * TAU, v = sp * (.4 + Math.random()); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: .35 + Math.random() * .3, color, r: 1.5 + Math.random() * 2 }); }
  }
  const CRIT = .08, CRIT_EVO = .15;
  function hit(e, dmg, kx = 0, ky = 0) {
    if (e.dead) return;
    // Critical hits: double damage, a bigger number and a spark ring. Evolved arts crit more often.
    const crit = src && Math.random() < (srcEvo ? CRIT_EVO : CRIT);
    dmg = Math.max(1, Math.round(dmg * (crit ? 2 : 1)));
    dmg = Math.min(dmg, Math.max(1, Math.ceil(e.hp)));
    e.hp -= dmg; e.flash = .1;
    if (src) { S.dmgBy[src] = (S.dmgBy[src] || 0) + dmg; if (crit) S.crits++; }
    if (e.type !== 'boss') { e.kx += kx; e.ky += ky; } else { e.kx += kx * .1; e.ky += ky * .1; }
    // sparks fly in the art's colour along the push direction
    const kl = Math.hypot(kx, ky) || 1;
    for (let i = 0; i < (crit ? 6 : 2) && S.parts.length < 420; i++) { const a = Math.atan2(ky, kx) + (Math.random() - .5) * 1.6, v = 80 + Math.random() * 120; S.parts.push({ x: e.x, y: e.y, vx: (kl > 1 ? Math.cos(a) : Math.cos(a * 7)) * v, vy: (kl > 1 ? Math.sin(a) : Math.sin(a * 7)) * v, t: 0, life: .2 + Math.random() * .15, color: srcColor, r: 1.4 }); }
    if (crit) { S.texts.length < 80 && S.texts.push({ x: e.x, y: e.y - e.r - 4, text: dmg + '!', color: '#ffd040', t: 0, crit: true }); if (S.fx.length < 90) S.fx.push({ kind: 'crit', x: e.x, y: e.y, t: 0, color: srcColor }); }
    else if (dmg >= 6 || Math.random() < .3) addText(e.x, e.y - e.r, dmg, dmg >= 30 ? '#ffd77a' : srcColor === '#ffffff' ? '#ffffff' : mixWhite(srcColor));
    if (S.t - lastHitSound > .07) { lastHitSound = S.t; beep(520 + Math.random() * 200, .04, 'square', .012); }
    if (e.hp <= 0) kill(e);
  }
  function kill(e) {
    e.dead = true; S.kills++;
    if (S.fx.length < 80) S.fx.push({ kind: 'die', x: e.x, y: e.y, r: e.r, color: e.color, t: 0 });
    for (let i = 0; i < (e.type === 'boss' ? 16 : 2) && S.parts.length < 400; i++) S.parts.push({ smoke: true, x: e.x + (Math.random() - .5) * e.r, y: e.y + (Math.random() - .5) * e.r, vx: (Math.random() - .5) * 30, vy: -20 - Math.random() * 20, t: 0, life: .6, color: '#2a1d4a', r: e.r * .4 });
    burst(e.x, e.y, e.color, e.type === 'boss' ? 40 : 7, e.type === 'boss' ? 220 : 90);
    if (e.type === 'boss') {
      S.bossesDown++; S.boss = null; shake = .5; hitStop = .12; flashT = .25;
      S.gems.push({ x: e.x, y: e.y, kind: 'chest', r: 12, value: 0 });
      for (let i = 0; i < 10; i++) dropGem(e.x + (Math.random() - .5) * 80, e.y + (Math.random() - .5) * 80, 12);
      banner(`${e.name} 격파!`); beep(240, .5, 'triangle', .05, 300);
      return;
    }
    dropGem(e.x, e.y, e.xp);
    if (Math.random() < (e.type === 'golem' ? .08 : .004)) S.gems.push({ x: e.x + 8, y: e.y, kind: 'tea', r: 8, value: 30 });
  }
  function dropGem(x, y, value) {
    if (S.gems.length > 420) { const g = S.gems[Math.floor(Math.random() * S.gems.length)]; if (g.kind === 'gem') { g.value += value; g.def = C.gemFor(g.value); return; } }
    S.gems.push({ x, y, kind: 'gem', value, def: C.gemFor(value), r: C.gemFor(value).r });
  }
  function hurtPlayer(dmg) {
    const p = S.player;
    if (p.inv > 0 || god || mode !== 'play') return;
    p.hp -= dmg; p.inv = .6; shake = Math.max(shake, .18);
    addText(p.x, p.y - 22, '-' + dmg, '#ff8f86'); beep(150, .12, 'sawtooth', .04, -60);
    if (p.hp <= 0) { p.hp = 0; finish(false); }
  }
  function gainXp(v) {
    S.xp += v;
    while (S.xp >= S.need) { S.xp -= S.need; S.level++; S.need = C.xpToNext(S.level); S.pending++; S.fx.push({ kind: 'lvl', t: 0 }); }
  }

  // ---------- Weapons ----------
  const wstat = id => C.weaponStats(id, S.build.weapons[id], S.mods, !!S.build.evolved[id], S.build.polish[id] || 0);
  function blastAt(x, y, R, dmg, color) {
    S.blasts.push({ x, y, R, t: 0, color });
    near(x, y, R, e => { const d = Math.hypot(e.x - x, e.y - y) || 1; hit(e, dmg, (e.x - x) / d * 90, (e.y - y) / d * 90); });
  }
  function flarePulse(s, x, y) {
    S.flares.push({ x, y, R: s.radius, t: 0, color: s.color, evo: !!s.evolved });
    near(x, y, s.radius, e => { const d = Math.hypot(e.x - x, e.y - y) || 1; if (s.stun) e.stunT = s.stun; hit(e, s.damage, (e.x - x) / d * s.knock, (e.y - y) / d * s.knock); });
  }
  function chainFrom(s, used) {
    const p = S.player, first = nearest(p.x, p.y, 1, used)[0];
    if (!first) return false;
    const pts = [[p.x, p.y - 4]]; let cur = first;
    for (let j = 0; j < s.jumps && cur; j++) {
      used.add(cur); pts.push([cur.x, cur.y]);
      hit(cur, s.damage * (1 - j * .06), 0, 0); burst(cur.x, cur.y, s.color, s.evolved ? 4 : 2, 110);
      let best = null, bd = s.radius * s.radius;
      for (const e of S.enemies) { if (e.dead || used.has(e)) continue; const d = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2; if (d < bd) { bd = d; best = e; } }
      cur = best;
    }
    // jagged path is fixed at creation so the bolt does not shimmer
    const jag = [];
    for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; jag.push([x0, y0]); for (let k = 1; k < 4; k++) { const f = k / 4, nx = -(y1 - y0), ny = x1 - x0, l = Math.hypot(nx, ny) || 1, o = (Math.random() - .5) * 18; jag.push([x0 + (x1 - x0) * f + nx / l * o, y0 + (y1 - y0) * f + ny / l * o]); } }
    jag.push(pts[pts.length - 1]);
    S.arcs.push({ pts: jag, nodes: pts.slice(1), t: 0, color: s.color, evo: !!s.evolved });
    return true;
  }
  function fireWeapons(dt) {
    const p = S.player;
    for (let i = S.later.length - 1; i >= 0; i--) if (S.t >= S.later[i].at) { const l = S.later.splice(i, 1)[0]; setSrc('flare', l.s.color, l.s.evolved); flarePulse(l.s, p.x, p.y); }
    for (const id in S.build.weapons) {
      const s = wstat(id);
      setSrc(id, s.color, s.evolved);
      if (id === 'halo') { haloHits(s, dt); continue; }
      if (id === 'beacon') { beaconHits(s, dt); continue; }
      S.cds[id] = (S.cds[id] ?? .3) - dt;
      if (S.cds[id] > 0) continue;
      S.cds[id] = s.cooldown;
      if (id === 'ember') {
        const targets = nearest(p.x, p.y, s.count);
        if (!targets.length) { S.cds[id] = .2; continue; }
        for (let i = 0; i < s.count; i++) {
          const t = targets[i % targets.length], a = Math.atan2(t.y - p.y, t.x - p.x) + (i >= targets.length ? (i - targets.length + 1) * .18 : 0);
          S.shots.push({ kind: 'ember', x: p.x, y: p.y - 6, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, dmg: s.damage, pierce: s.pierce, life: 1.3, r: s.blast ? 7 : 5, hits: new Set(), blast: s.blast || 0, color: s.color, evo: !!s.evolved, src: id });
        }
        beep(760, .05, 'triangle', .015, 200);
      } else if (id === 'firefly') {
        for (let i = 0; i < s.count; i++) { const a = Math.random() * TAU; S.shots.push({ kind: 'firefly', x: p.x, y: p.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, dmg: s.damage, speed: s.speed, pierce: 1, life: 3, r: 4, hits: new Set(), target: null, wob: Math.random() * TAU, color: s.color, evo: !!s.evolved, src: id }); }
      } else if (id === 'sunbeam') {
        const pool = S.enemies.filter(e => !e.dead && Math.abs(e.x - p.x) < view.hw && Math.abs(e.y - p.y) < view.hh);
        beep(900, .18, 'sine', .025, -500);
        for (let i = 0; i < s.count; i++) {
          const e = pool.length ? pool.splice(Math.floor(Math.random() * pool.length), 1)[0] : null;
          S.beams.push({ x: e ? e.x : p.x + (Math.random() - .5) * 300, y: e ? e.y : p.y + (Math.random() - .5) * 220, r: s.radius, dmg: s.damage, t: 0, done: false, color: s.color, evo: !!s.evolved, src: id });
        }
      } else if (id === 'pool') {
        for (let i = 0; i < s.count; i++) {
          const e = nearest(p.x, p.y, 4)[i] ;
          const x = e ? e.x : p.x + (Math.random() - .5) * 200, y = e ? e.y : p.y + (Math.random() - .5) * 200;
          S.pools.push({ x, y, r: s.radius, dmg: s.damage, life: s.duration, tick: s.tick, tt: 0, t: 0, slow: s.slow || 0, evo: !!s.evolved, src: id, color: s.color });
        }
      } else if (id === 'flare') {
        flarePulse(s, p.x, p.y);
        if (s.double) S.later.push({ at: S.t + .28, s: { ...s, radius: s.radius * 1.3 } });
        beep(300, .25, 'sine', .04, 500);
      } else if (id === 'chain') {
        const used = new Set(); let any = false;
        for (let i = 0; i < s.count; i++) any = chainFrom(s, used) || any;
        if (!any) { S.cds[id] = .2; continue; }
        beep(1200, .08, 'sawtooth', .02, -600);
      } else if (id === 'wing') {
        const t0 = nearest(p.x, p.y, 1)[0], base = t0 ? Math.atan2(t0.y - p.y, t0.x - p.x) : Math.random() * TAU;
        for (let i = 0; i < s.count; i++) {
          const a = base + (s.count > 1 ? (i - (s.count - 1) / 2) * (TAU / Math.max(3, s.count + 1)) : 0);
          S.shots.push({ kind: 'wing', x: p.x, y: p.y, ux: Math.cos(a), uy: Math.sin(a), reach: s.speed * s.duration / 3, age: 0, dur: s.duration, vx: 0, vy: 0, dmg: s.damage, pierce: Infinity, life: s.duration, r: s.radius, hits: new Set(), back: false, spin: 0, color: s.color, evo: !!s.evolved, src: id });
        }
        beep(420, .15, 'triangle', .02, 180);
      } else if (id === 'seed') {
        for (let i = 0; i < s.count; i++) {
          const a = Math.random() * TAU, d = 18 + Math.random() * 46;
          S.seeds.push({ x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, arm: .5, life: s.duration, dmg: s.damage, R: s.radius, evo: !!s.evolved, garden: !!s.garden, color: s.color, ph: Math.random() * TAU });
        }
        if (S.seeds.length > 40) S.seeds.splice(0, S.seeds.length - 40);
      } else if (id === 'whip') {
        const dirs = s.both || s.count >= 2 ? [p.face, -p.face] : [p.face];
        let healed = 0;
        for (const dir of dirs) {
          S.slashes.push({ x: p.x, y: p.y, dir, reach: s.radius, t: 0, color: s.color, evo: !!s.evolved });
          near(p.x + dir * s.radius * .5, p.y, s.radius * .75, e => {
            const dx = (e.x - p.x) * dir, dy = e.y - p.y;
            if (dx < -8 || Math.abs(dy) > s.radius * .6 || Math.hypot(dx, dy) > s.radius + e.r) return;
            hit(e, s.damage, dir * 120, 0); healed++;
          });
        }
        if (s.heal && healed) { const h = Math.min(8, healed) * s.heal; p.hp = Math.min(S.mods.maxHp, p.hp + h); }
        beep(240, .12, 'sine', .03, 400);
      }
    }
  }
  // Lighthouse beams: rotating rays from the keeper; each enemy on a ray is burned every tick.
  function beaconRays(s) { const out = []; for (let i = 0; i < s.count; i++) out.push(S.beaconA + i / s.count * TAU); return out; }
  function beaconHits(s, dt) {
    S.beaconA += s.spin * dt;
    const p = S.player, rays = beaconRays(s), w = s.evolved ? 16 : 11;
    near(p.x, p.y, s.radius, e => {
      if (S.t - (e.beaconT ?? -9) < s.tick) return;
      const ex = e.x - p.x, ey = e.y - p.y;
      for (const a of rays) {
        const along = ex * Math.cos(a) + ey * Math.sin(a), across = Math.abs(-ex * Math.sin(a) + ey * Math.cos(a));
        if (along > 0 && along < s.radius && across < w + e.r) { e.beaconT = S.t; hit(e, s.damage, Math.cos(a) * 30, Math.sin(a) * 30); return; }
      }
    });
  }
  function haloOrbs(s) {
    const out = [];
    for (let i = 0; i < s.count; i++) { const a = S.haloA + i / s.count * TAU; out.push({ x: S.player.x + Math.cos(a) * s.radius, y: S.player.y + Math.sin(a) * s.radius }); }
    return out;
  }
  function haloHits(s, dt) {
    S.haloA += s.spin * dt;
    for (const o of haloOrbs(s)) near(o.x, o.y, s.evolved ? 15 : 11, e => {
      if (S.t - e.haloT < s.tick) return;
      e.haloT = S.t; const d = Math.hypot(e.x - S.player.x, e.y - S.player.y) || 1;
      hit(e, s.damage, (e.x - S.player.x) / d * 60, (e.y - S.player.y) / d * 60);
    });
  }

  // ---------- Update ----------
  function moveInput() {
    let x = 0, y = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x--;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x++;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y--;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y++;
    if (stick && stick.mag > .12) { x = stick.dx; y = stick.dy; }
    if (botMove) ({ x, y } = botMove);
    const m = Math.hypot(x, y);
    return m > 1 ? { x: x / m, y: y / m } : { x, y };
  }
  function update(dt) {
    const p = S.player, t0 = S.t;
    S.t += dt;
    if (S.t >= C.DURATION) { S.t = C.DURATION; finish(true); return; }
    const mv = moveInput(), sp = C.BASE.speed * S.mods.speed;
    p.x += mv.x * sp * dt; p.y += mv.y * sp * dt;
    p.moving = mv.x !== 0 || mv.y !== 0; if (mv.x) p.face = Math.sign(mv.x); if (p.moving) p.walk += dt * 9;
    p.inv = Math.max(0, p.inv - dt);
    p.hp = Math.min(S.mods.maxHp, p.hp + S.mods.regen * dt);

    // Spawns
    S.spawnAcc += C.spawnRate(S.t) * dt;
    const cap = C.enemyCap(S.t);
    while (S.spawnAcc >= 1) { S.spawnAcc--; if (S.enemies.length < cap) spawnEnemy(C.pickEnemy(S.t)); }
    const b = C.bossAt(t0, S.t); if (b) spawnBoss(b);
    if (C.ringAt(t0, S.t)) ring();

    rebuildGrid();
    // Enemies
    const farR = Math.hypot(view.hw, view.hh) * 1.7;
    for (const e of S.enemies) {
      if (e.dead) continue;
      let dx = p.x - e.x, dy = p.y - e.y; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      let speed = e.speed;
      if (e.stunT > 0) { e.stunT -= dt; speed = 0; }
      if (e.slowT > 0) { e.slowT -= dt; speed *= .5; }
      if (e.type === 'boss') speed = e.stunT > 0 ? 0 : bossThink(e, dt, dx, dy, d) * (e.slowT > 0 ? .7 : 1);
      else if (e.type === 'bat') { e.phase += dt * 5; const s = Math.sin(e.phase) * .6; const ox = dx; dx = dx - dy * s; dy = dy + ox * s; }
      else if (e.type === 'wisp') { e.phase += dt * 2; speed *= .75 + Math.sin(e.phase) * .45; }
      if (e.dash > 0) { e.dash -= dt; dx = e.dvx; dy = e.dvy; speed = 400; }
      e.x += (dx * speed + e.kx) * dt; e.y += (dy * speed + e.ky) * dt;
      const decay = Math.exp(-dt * 8); e.kx *= decay; e.ky *= decay;
      e.flash = Math.max(0, e.flash - dt);
      // Soft separation so the horde spreads instead of stacking.
      if (e.type !== 'boss') near(e.x, e.y, e.r * .6, o => {
        if (o === e) return;
        const ox = e.x - o.x, oy = e.y - o.y, od = Math.hypot(ox, oy) || .01, push = (e.r + o.r - od) * .5;
        if (push > 0) { e.x += ox / od * push * .5; e.y += oy / od * push * .5; }
      });
      if (d < e.r + PLAYER_R) { hurtPlayer(e.damage); if (e.dash > 0) e.dash = 0; }
      if (d > farR && e.type !== 'boss') { const q = edgePoint(); e.x = q.x; e.y = q.y; }
    }
    fireWeapons(dt);

    // Projectiles
    for (const s of S.shots) {
      s.life -= dt;
      if (s.kind === 'firefly') {
        if (!s.target || s.target.dead) s.target = nearest(s.x, s.y, 1)[0] || null;
        s.wob += dt * 9;
        if (s.target) { const a = Math.atan2(s.target.y - s.y, s.target.x - s.x) + Math.sin(s.wob) * .4, f = Math.min(1, dt * 5); s.vx += (Math.cos(a) * s.speed - s.vx) * f; s.vy += (Math.sin(a) * s.speed - s.vy) * f; }
      }
      if (s.kind === 'wing') {
        // out and back: distance follows a sine arc and is measured from the keeper, so it always returns
        s.age += dt; s.spin += dt * 16;
        const k = Math.min(1, s.age / s.dur), dist = Math.sin(k * Math.PI) * s.reach, ox = s.x, oy = s.y;
        if (!s.back && k >= .5) { s.back = true; s.hits.clear(); }
        s.x = p.x + s.ux * dist; s.y = p.y + s.uy * dist; s.vx = (s.x - ox) / dt; s.vy = (s.y - oy) / dt;
      } else { s.x += s.vx * dt; s.y += s.vy * dt; }
      setSrc(s.src, s.color, s.evo);
      near(s.x, s.y, s.r, e => {
        if (s.hits.has(e)) return;
        s.hits.add(e); const v = Math.hypot(s.vx, s.vy) || 1;
        hit(e, s.dmg, s.vx / v * 40, s.vy / v * 40);
        if (s.blast) blastAt(s.x, s.y, s.blast, s.dmg * .6, s.color);
        if (--s.pierce <= 0) { s.life = 0; return false; }
      });
    }
    S.shots = S.shots.filter(s => s.life > 0);
    for (const pool of S.pools) {
      pool.t += dt; pool.tt -= dt; setSrc(pool.src, pool.color, pool.evo);
      if (pool.tt <= 0) { pool.tt = pool.tick; near(pool.x, pool.y, pool.r, e => { if (pool.slow) e.slowT = .5; hit(e, pool.dmg); }); }
    }
    S.pools = S.pools.filter(q => q.t < q.life);
    for (const sd of S.seeds) {
      sd.arm -= dt; sd.life -= dt;
      if (sd.arm > 0 || sd.life <= 0) continue;
      let trig = false; near(sd.x, sd.y, 24, () => { trig = true; return false; });
      if (trig) {
        sd.life = 0; setSrc('seed', sd.color, sd.evo);
        blastAt(sd.x, sd.y, sd.R, sd.dmg, sd.color); burst(sd.x, sd.y, sd.color, sd.evo ? 12 : 8, 160);
        if (sd.garden) S.pools.push({ x: sd.x, y: sd.y, r: sd.R * .7, dmg: sd.dmg * .18, life: 2, tick: .35, tt: .2, t: 0, slow: 0, evo: false, src: 'seed', color: sd.color });
        beep(180, .15, 'square', .025, -60);
      }
    }
    S.seeds = S.seeds.filter(sd => sd.life > 0);
    for (const beam of S.beams) {
      beam.t += dt; setSrc(beam.src, beam.color, beam.evo);
      if (!beam.done && beam.t >= .16) { beam.done = true; near(beam.x, beam.y, beam.r, e => hit(e, beam.dmg)); burst(beam.x, beam.y, beam.color || '#fff2b0', beam.evo ? 14 : 8, 120); }
    }
    S.beams = S.beams.filter(q => q.t < .5);
    for (const f of S.flares) f.t += dt;
    S.flares = S.flares.filter(f => f.t < .45);
    for (const q of S.arcs) q.t += dt; S.arcs = S.arcs.filter(q => q.t < .28);
    for (const q of S.slashes) q.t += dt; S.slashes = S.slashes.filter(q => q.t < .25);
    for (const q of S.blasts) q.t += dt; S.blasts = S.blasts.filter(q => q.t < .35);
    // Enemy bullets
    for (const q of S.bullets) {
      q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
      if (Math.hypot(q.x - p.x, q.y - p.y) < q.r + PLAYER_R - 2) { hurtPlayer(q.damage); q.life = 0; }
    }
    S.bullets = S.bullets.filter(q => q.life > 0);
    setSrc(null);
    S.enemies = S.enemies.filter(e => !e.dead);

    // Pickups
    const magnet = C.BASE.magnet * S.mods.magnet;
    for (const g of S.gems) {
      const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy) || 1;
      if (!g.pull && (d < magnet || (g.kind !== 'gem' && d < magnet * .6))) g.pull = 1;
      if (g.pull) { g.pull += dt * 3; const v = Math.min(d / dt, 160 * g.pull + 120); g.x += dx / d * v * dt; g.y += dy / d * v * dt; }
      if (d < PLAYER_R + 6) {
        g.taken = true;
        if (g.kind === 'gem') { gainXp(g.value); beep(900 + Math.random() * 300, .03, 'sine', .015); }
        else if (g.kind === 'tea') { p.hp = Math.min(S.mods.maxHp, p.hp + g.value); addText(p.x, p.y - 24, '+' + g.value, '#9dffb4'); beep(500, .2, 'sine', .04, 200); }
        else if (g.kind === 'chest') openChest();
      }
    }
    S.gems = S.gems.filter(g => !g.taken);
    for (const fx of S.fx) fx.t += dt;
    S.fx = S.fx.filter(fx => fx.t < (fx.kind === 'evo' || fx.kind === 'up' ? 1.2 : fx.kind === 'lvl' ? .8 : fx.kind === 'crit' ? .25 : .5));
    flashT = Math.max(0, flashT - dt);
    if (S.chest) { S.chest.t += dt; if (S.chest.t > 3.2) S.chest = null; }
    for (const s of S.shots) if ((s.kind === 'wing' || (s.kind === 'firefly' && s.evo)) && S.parts.length < 400 && Math.random() < .5) S.parts.push({ x: s.x, y: s.y, vx: (Math.random() - .5) * 16, vy: (Math.random() - .5) * 16, t: 0, life: .3, color: s.color, r: s.kind === 'wing' ? 2.2 : 1.4 });
    for (const s of S.shots) if (s.kind === 'ember' && S.parts.length < 400 && Math.random() < .6) S.parts.push({ x: s.x, y: s.y, vx: (Math.random() - .5) * 20, vy: (Math.random() - .5) * 20, t: 0, life: .25, color: '#ff9a3c', r: 1.6 });
    for (const q of S.parts) { q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .92; q.vy *= .92; }
    S.parts = S.parts.filter(q => q.t < q.life);
    for (const q of S.texts) { q.t += dt; q.y -= 30 * dt; }
    S.texts = S.texts.filter(q => q.t < .7);
    shake = Math.max(0, shake - dt); bannerT = Math.max(0, bannerT - dt);
    if (S.pending > 0 && mode === 'play') openLevelUp();
  }
  function bossThink(e, dt, dx, dy, d) {
    e.skill -= dt;
    if (e.boss === 'treant') {
      if (e.skill <= 0) { e.skill = 5; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; spawnEnemy('vine', e.x + Math.cos(a) * 60, e.y + Math.sin(a) * 60); } }
      return e.speed;
    }
    if (e.boss === 'crow') {
      if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { e.dash = .6; e.dvx = dx; e.dvy = dy; beep(200, .3, 'sawtooth', .04, 300); } return 0; }
      if (e.skill <= 0 && e.dash <= 0) { e.skill = 5; e.tele = .8; for (let i = 0; i < 5; i++) spawnEnemy('bat'); }
      return e.speed;
    }
    // eclipse: shadow rings
    if (e.skill <= 0) {
      e.skill = 3; e.phase++;
      const n = 14;
      for (let i = 0; i < n; i++) { const a = i / n * TAU + e.phase * .2; S.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, r: 7, damage: 12, life: 6 }); }
      if (e.phase % 2 === 0) for (let i = 0; i < 6; i++) spawnEnemy('wisp');
    }
    return d > 220 ? e.speed : e.speed * .5;
  }

  // ---------- Starlight chest: three upgrades at once, shown on the canvas (no extra menu) ----------
  function openChest() {
    const before = S.mods.maxHp, r = C.chestRolls(S.build);
    S.build = r.build; S.mods = C.modifiers(S.build); S.player.hp += S.mods.maxHp - before;
    S.chest = { t: 0, items: r.picks.map(c => C.describe(c)) };
    if (!r.picks.length) { S.player.hp = S.mods.maxHp; S.chest.items = [C.describe({ kind: 'heal' })]; }
    if (r.picks.some(c => c.kind === 'evolve')) { S.fx.push({ kind: 'evo', t: 0, color: '#ffd77a' }); flashT = .3; }
    banner('별빛 상자: 3연 강화'); beep(660, .4, 'triangle', .05, 400); setTimeout(() => beep(880, .3, 'triangle', .04, 300), 180);
    ui.status.textContent = '별빛 상자: ' + S.chest.items.map(d => d.name + (d.tag.startsWith('Lv') ? ' ' + d.tag : '')).join(', ');
  }
  function drawChestPanel() {
    const c = S.chest; if (!c) return;
    const { cw, ch } = view, a = Math.min(1, c.t * 4, (3.2 - c.t) * 2), w = Math.min(320, cw - 40), h = 30 + c.items.length * 34, x = (cw - w) / 2, y = ch * .32;
    ctx.globalAlpha = Math.max(0, a);
    ctx.fillStyle = '#120d06e6'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.fill(); ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = '800 12px system-ui,sans-serif'; ctx.fillStyle = '#ffd77a'; ctx.fillText('별빛 상자', cw / 2, y + 19);
    c.items.forEach((d, i) => {
      const show = Math.min(1, Math.max(0, (c.t - .25 - i * .3) * 5)), iy = y + 30 + i * 34;
      ctx.globalAlpha = Math.max(0, a) * show;
      ctx.fillStyle = '#1e2636'; ctx.beginPath(); ctx.roundRect(x + 10, iy, w - 20, 28, 7); ctx.fill();
      ctx.fillStyle = d.color; ctx.font = '700 15px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(d.icon, x + 28, iy + 19);
      ctx.textAlign = 'left'; ctx.fillStyle = '#f2f5fb'; ctx.font = '700 12.5px system-ui,sans-serif'; ctx.fillText(d.name, x + 44, iy + 18);
      ctx.textAlign = 'right'; ctx.fillStyle = d.tag === '진화' ? '#ffe08a' : '#ffb35c'; ctx.font = '700 11px system-ui,sans-serif'; ctx.fillText(d.tag, x + w - 20, iy + 18);
    });
    ctx.globalAlpha = 1; ctx.textAlign = 'center';
  }

  // ---------- Level up ----------
  function openLevelUp() {
    mode = 'levelup';
    choices = C.rollChoices(S.build);
    ui.kicker.textContent = `LEVEL ${S.level}`; ui.title.textContent = '등불이 밝아졌다'; ui.text.textContent = '하나를 고르세요. (1 · 2 · 3 키)';
    ui.start.hidden = true; ui.choices.hidden = false;
    ui.choices.replaceChildren(...choices.map((c, i) => {
      const d = C.describe(c), btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'lk-choice'; btn.dataset.index = i;
      btn.innerHTML = `<i style="color:${d.color};border-color:${d.color}">${d.icon}</i><span><b></b><em></em><small></small><u></u></span>`; if (c.kind === 'evolve') btn.classList.add('evo');
      btn.querySelector('b').textContent = d.name; btn.querySelector('em').textContent = d.tag; btn.querySelector('small').textContent = d.text; btn.querySelector('u').textContent = d.hint || '';
      btn.addEventListener('click', () => choose(i));
      return btn;
    }));
    ui.overlay.hidden = false;
    beep(520, .25, 'triangle', .04, 260);
    requestAnimationFrame(() => ui.choices.firstChild?.focus({ preventScroll: true }));
  }
  function choose(i) {
    if (mode !== 'levelup' || !choices[i]) return;
    const c = choices[i];
    S.build = C.applyChoice(S.build, c);
    const before = S.mods.maxHp; S.mods = C.modifiers(S.build);
    if (c.kind === 'heal') S.player.hp = Math.min(S.mods.maxHp, S.player.hp + 30);
    S.player.hp += S.mods.maxHp - before;
    const dsc = C.describe(c);
    ui.status.textContent = c.kind === 'evolve' ? `${dsc.name}(으)로 진화!` : `${dsc.name} ${c.kind === 'heal' ? '' : 'Lv.' + c.level} 획득`;
    if (c.kind !== 'heal') S.fx.push({ kind: 'up', t: 0, icon: dsc.icon, color: dsc.color });
    if (c.kind === 'evolve') { banner(`진화! ${dsc.name}`); S.fx.push({ kind: 'evo', t: 0, color: dsc.color }); shake = Math.max(shake, .25); flashT = .3; beep(330, .5, 'triangle', .05, 660); }
    S.pending--;
    if (S.pending > 0) openLevelUp();
    else { mode = 'play'; hideOverlay(); }
  }

  // ---------- Flow ----------
  function showOverlay(kicker, title, text, button) {
    ui.kicker.textContent = kicker; ui.title.textContent = title; ui.text.textContent = text;
    ui.choices.hidden = true; ui.start.hidden = false; ui.start.textContent = button; ui.overlay.hidden = false;
  }
  function hideOverlay() { ui.overlay.hidden = true; ui.choices.replaceChildren(); canvas.focus({ preventScroll: true }); }
  function newGame() {
    fit(); S = fresh(); mode = 'play'; keys.clear(); stick = null; shake = 0; god = false;
    hideOverlay(); ui.pause.disabled = false; ui.pause.textContent = '일시정지';
    ui.status.textContent = '이동만 하세요. 등불이 알아서 싸웁니다.';
    banner('새벽까지 10분');
    const r = canvas.getBoundingClientRect();
    if (r.top < 0 || r.bottom > innerHeight) canvas.scrollIntoView({ block: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  function setPaused(on) {
    if (on && mode === 'play') { mode = 'paused'; ui.pause.textContent = '계속하기'; showOverlay('PAUSED', '일시정지', dmgSummary(), '계속하기'); }
    else if (!on && mode === 'paused') { mode = 'play'; ui.pause.textContent = '일시정지'; hideOverlay(); }
  }
  function finish(dawn) {
    if (mode === 'over') return;
    mode = 'over'; S.dawn = dawn; ui.pause.disabled = true;
    if (dawn) { for (const e of S.enemies) burst(e.x, e.y, '#ffd77a', 3, 80); S.enemies = []; S.bullets = []; }
    const score = C.score(S.t, S.kills, S.level, dawn), best = readBest(), record = score > best.score;
    S.score = score;
    if (record) writeBest({ score, time: Math.floor(S.t), level: S.level });
    renderBest();
    showOverlay(dawn ? 'DAWN' : 'NIGHT FALLS', dawn ? (record ? '새벽이 밝았다 · 최고 기록!' : '새벽이 밝았다') : (record ? '새 최고 기록!' : '등불이 꺼졌다'),
      `${C.clock(S.t)} 버팀 · Lv.${S.level} · 처치 ${S.kills.toLocaleString('ko-KR')} · 치명타 ${S.crits.toLocaleString('ko-KR')}\n점수 ${score.toLocaleString('ko-KR')}점${dmgSummary(3) ? '\n\n' + dmgSummary(3) : ''}`, '다시 하기');
    ui.status.textContent = dawn ? '밤을 모두 버텼습니다.' : `${C.clock(S.t)}에 쓰러졌습니다.`;
    beep(dawn ? 520 : 160, .7, 'triangle', .05, dawn ? 400 : -80);
    window.dispatchEvent(new CustomEvent('partygame:score', { detail: { gameId: 'lantern-keeper', score, wave: Math.floor(S.t) } }));
  }
  // Damage dealt by each art this night, biggest first (shown on pause and results).
  function dmgSummary(n = 5) {
    const total = Object.values(S.dmgBy).reduce((a, b) => a + b, 0);
    if (!total) return '';
    return Object.entries(S.dmgBy).sort((a, b) => b[1] - a[1]).slice(0, n).map(([id, v]) => {
      const name = S.build.evolved[id] ? C.EVOLUTIONS[id].name : C.WEAPONS[id].name;
      return `${name} ${Math.round(v).toLocaleString('ko-KR')} (${Math.round(v / total * 100)}%)`;
    }).join('\n');
  }
  function renderBest() {
    const b = readBest();
    ui.best.textContent = b.score ? `${b.score.toLocaleString('ko-KR')}점 · ${C.clock(b.time)} · Lv.${b.level}` : '아직 기록이 없습니다';
  }

  // ---------- Drawing ----------
  // Sprites and textures come from scripts/lantern-art.js. Night is a darkness map with holes punched by
  // every light source (lantern, shots, fire, beams, embers, mushrooms), drawn at half resolution.
  const A = window.LanternArt;
  const hash = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const darkCv = document.createElement('canvas'), dctx = darkCv.getContext('2d');
  let groundPattern = null, lights = [], shrooms = [];
  function glow(x, y, r, color, a = 1) { ctx.globalAlpha = a; ctx.drawImage(A.glowSprite(color), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1; }
  const flick = (seed = 0) => reduceMotion ? 1 : 1 + Math.sin(S ? S.t * 13 + seed : 0) * .035 + Math.sin(S ? S.t * 29 + seed * 3 : 0) * .025;
  const LEAF = ['#6b4a2a', '#7a3f2a', '#4f5a2a', '#8a6a33'];
  function drawGround(cx, cy) {
    groundPattern ||= ctx.createPattern(A.ground(), 'repeat');
    ctx.fillStyle = groundPattern; ctx.fillRect(cx - view.hw - 2, cy - view.hh - 2, view.hw * 2 + 4, view.hh * 2 + 4);
    shrooms = [];
    const T = 90, t = S ? S.t : 0, x0 = Math.floor((cx - view.hw) / T) - 1, x1 = Math.floor((cx + view.hw) / T) + 1, y0 = Math.floor((cy - view.hh) / T) - 1, y1 = Math.floor((cy + view.hh) / T) + 1;
    for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) {
      const h = hash(tx, ty), h2 = hash(ty + 7, tx - 3), h3 = hash(tx - 11, ty + 5), bx = tx * T, by = ty * T;
      // grass clumps that sway a little
      for (let i = 0; i < 2 + (h3 > .5); i++) {
        const gx = bx + hash(tx * 3 + i, ty) * T, gy = by + hash(tx, ty * 3 + i) * T, sway = reduceMotion ? 0 : Math.sin(t * 1.6 + gx * .05) * 1.6;
        ctx.strokeStyle = i % 2 ? '#2f5a3a' : '#3e7048'; ctx.lineWidth = 1.3; ctx.beginPath();
        for (let b = -2; b <= 2; b++) { ctx.moveTo(gx + b * 1.6, gy); ctx.quadraticCurveTo(gx + b * 2.4, gy - 5, gx + b * 3 + sway, gy - 8 - (b & 1) * 3); }
        ctx.stroke();
      }
      if (h < .3) for (let i = 0; i < 3; i++) { // fallen leaves
        const lx = bx + hash(tx + i * 17, ty) * T, ly = by + hash(tx, ty + i * 17) * T;
        ctx.fillStyle = LEAF[(i + tx) & 3]; ctx.globalAlpha = .75; ctx.beginPath(); ctx.ellipse(lx, ly, 3.4, 1.7, h2 * 6 + i, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      }
      if (h2 > .86) { // mossy stone
        const sx = bx + h * T, sy = by + h2 * T * .5;
        ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(sx + 2, sy + 4, 11, 5, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4a5653'; ctx.beginPath(); ctx.ellipse(sx, sy, 10, 7, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#6b7a75'; ctx.beginPath(); ctx.ellipse(sx - 2, sy - 2.5, 6, 3.2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#3f6e3a'; ctx.beginPath(); ctx.ellipse(sx + 3, sy - 4, 5, 2.2, .3, 0, TAU); ctx.fill();
      }
      if (h > .91) { // glowing mushrooms (also light sources)
        const mx = bx + h2 * T, my = by + h * T * .7, col = h3 > .5 ? '#7fe8d6' : '#c8a6ff';
        for (let i = 0; i < 3; i++) {
          const ox = mx + (i - 1) * 6, oy = my + (i === 1 ? -2 : 1), s = i === 1 ? 1.25 : .9;
          ctx.fillStyle = '#d8d0c0'; ctx.fillRect(ox - .8, oy - 3 * s, 1.6, 4 * s);
          ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(ox, oy - 3 * s, 3.4 * s, 2.2 * s, 0, Math.PI, 0); ctx.fill();
        }
        shrooms.push([mx, my - 3, col]);
      }
      if (h2 < .05) { // old stump
        const sx = bx + T * .5, sy = by + T * .5;
        ctx.fillStyle = '#0007'; ctx.beginPath(); ctx.ellipse(sx + 3, sy + 7, 19, 8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#3a2c1e'; ctx.beginPath(); ctx.roundRect(sx - 16, sy - 6, 32, 14, 5); ctx.fill();
        ctx.fillStyle = '#5a4630'; ctx.beginPath(); ctx.ellipse(sx, sy - 6, 16, 8, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = '#7a6244'; ctx.lineWidth = 1; for (const rr of [4, 8, 12]) { ctx.beginPath(); ctx.ellipse(sx, sy - 6, rr, rr / 2, 0, 0, TAU); ctx.stroke(); }
        ctx.fillStyle = '#4f8a40'; ctx.beginPath(); ctx.ellipse(sx - 9, sy - 10, 7, 3, -.3, 0, TAU); ctx.fill();
      }
    }
  }
  function drawFog(cx, cy) {
    const T = 380, t = S ? S.t : performance.now() / 1000;
    for (let tx = Math.floor((cx - view.hw) / T) - 1; tx <= Math.floor((cx + view.hw) / T) + 1; tx++) for (let ty = Math.floor((cy - view.hh) / T) - 1; ty <= Math.floor((cy + view.hh) / T) + 1; ty++) {
      const h = hash(tx * 5 + 1, ty * 5 - 2); if (h > .55) continue;
      const fx = tx * T + h * T + Math.sin(t * .07 + h * 9) * 80, fy = ty * T + hash(ty, tx) * T;
      ctx.save(); ctx.translate(fx, fy); ctx.scale(2.4, 1); glow(0, 0, 90, '#b8cce0', .1); ctx.restore();
    }
  }
  function drawEnemy(e) {
    if (e.type === 'boss') { drawBoss(e); return; }
    const rate = e.type === 'bat' ? 16 : e.type === 'moth' ? 11 : e.type === 'wisp' ? 9 : 3;
    const sp = A.enemySprite(e.type, e.r, Math.floor(S.t * rate + e.id * .37), e.flash > 0);
    const born = Math.min(1, (S.t - (e.born ?? -9)) / .35), sq = e.flash > 0 ? 1.12 : 1;
    const bob = e.type === 'moth' || e.type === 'wisp' ? Math.sin(S.t * 4 + e.id) * 2 : 0;
    ctx.globalAlpha = born * .55; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(e.x, e.y + e.r * .95, e.r * .85, e.r * .3, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = born;
    const s = sp.size * sq * (.6 + born * .4);
    ctx.drawImage(sp.img, e.x - s / 2, e.y - s / 2 + bob - (1 - born) * 6, s, s);
    ctx.globalAlpha = 1;
  }
  function drawBoss(e) {
    const r = e.r, t = S.t, flash = e.flash > 0;
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.fillStyle = '#0008'; ctx.beginPath(); ctx.ellipse(0, r * 1.05, r * 1.1, r * .32, 0, 0, TAU); ctx.fill();
    if (e.boss === 'treant') {
      // roots
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) { const a = Math.PI * (.15 + i * .175), w = Math.sin(t * 2 + i) * 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .3, r * .7); ctx.quadraticCurveTo(Math.cos(a) * r * .9, r * .9 + w, Math.cos(a) * r * 1.3, r * 1.05); ctx.stroke(); }
      // trunk with bark lines
      const bark = ctx.createLinearGradient(-r * .6, 0, r * .6, 0); bark.addColorStop(0, '#2c1f14'); bark.addColorStop(.5, '#5a4128'); bark.addColorStop(1, '#2c1f14');
      ctx.fillStyle = flash ? '#fff4e0' : bark; ctx.beginPath(); ctx.moveTo(-r * .55, r * .9); ctx.quadraticCurveTo(-r * .45, 0, -r * .6, -r * .9); ctx.lineTo(r * .6, -r * .9); ctx.quadraticCurveTo(r * .45, 0, r * .55, r * .9); ctx.fill();
      ctx.strokeStyle = '#1e150d'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * .18, r * .8); ctx.bezierCurveTo(i * r * .25, r * .3, i * r * .1, -r * .2, i * r * .2, -r * .8); ctx.stroke(); }
      ctx.fillStyle = '#120c08'; ctx.beginPath(); ctx.ellipse(0, r * .05, r * .2, r * .12 + Math.abs(Math.sin(t * 2)) * r * .06, 0, 0, TAU); ctx.fill(); // mouth hollow
      // swaying branches + canopy
      const sway = Math.sin(t * 1.4) * .08;
      ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 6;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(s * r * .4, -r * .6); ctx.quadraticCurveTo(s * r * 1.1, -r * (.8 + sway * s), s * r * 1.35, -r * (.3 + sway * s * 3)); ctx.stroke(); }
      for (const [x, y, s, c] of [[-r * .75, -r * 1.05, .62, '#3e6e34'], [r * .75, -r * 1.05, .62, '#3e6e34'], [0, -r * 1.4, .78, '#4f8a40'], [-r * .3, -r * 1.25, .5, '#5d9a4a'], [r * .35, -r * 1.2, .48, '#5d9a4a']]) {
        const gr = ctx.createRadialGradient(x - r * .15, y - r * .2, 2, x, y, r * s); gr.addColorStop(0, flash ? '#fff' : '#7cc068'); gr.addColorStop(1, flash ? '#fff' : c);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x + sway * r * .3, y, r * s, 0, TAU); ctx.fill();
      }
    } else if (e.boss === 'crow') {
      const flap = e.tele > 0 ? .1 : Math.sin(t * 8) * .5 + .55;
      if (e.dash > 0) for (let i = 1; i <= 3; i++) { ctx.globalAlpha = .18 / i; ctx.fillStyle = '#6a5a9a'; ctx.beginPath(); ctx.arc(-e.dvx * i * 22, -e.dvy * i * 22, r, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
      for (const s of [-1, 1]) {
        ctx.save(); ctx.scale(s, 1);
        for (let f = 0; f < 6; f++) { // layered feathers
          const a = -.2 - flap * .9 + f * .16, len = r * (1.9 - f * .12);
          ctx.fillStyle = flash ? '#fff' : f % 2 ? '#3a2f5c' : '#4f4180';
          ctx.save(); ctx.translate(r * .3, -r * .1); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(len / 2, 0, len / 2, r * .16, 0, 0, TAU); ctx.fill(); ctx.restore();
        }
        ctx.restore();
      }
      const body = ctx.createRadialGradient(-r * .1, -r * .3, 2, 0, 0, r * .8); body.addColorStop(0, '#5a4a8a'); body.addColorStop(1, '#1a1430');
      ctx.fillStyle = flash ? '#fff' : body; ctx.beginPath(); ctx.ellipse(0, 0, r * .5, r * .8, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a1430'; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(i * r * .18, r * .6); ctx.lineTo(i * r * .3, r * 1.15); ctx.lineTo(i * r * .05 + r * .02, r * .65); ctx.fill(); } // tail
      ctx.fillStyle = '#e6b84a'; ctx.beginPath(); ctx.moveTo(-6, -r * .5); ctx.lineTo(6, -r * .5); ctx.lineTo(0, -r * .95); ctx.fill();
      ctx.fillStyle = '#ffd77a'; ctx.beginPath(); ctx.moveTo(-r * .3, -r * .75); ctx.lineTo(-r * .2, -r * 1.05); ctx.lineTo(-r * .05, -r * .8); ctx.lineTo(r * .05, -r * 1.1); ctx.lineTo(r * .15, -r * .8); ctx.lineTo(r * .3, -r * 1.05); ctx.lineTo(r * .3, -r * .75); ctx.fill(); // crown
    } else {
      const body = ctx.createRadialGradient(-r * .3, -r * .3, 2, 0, 0, r); body.addColorStop(0, '#2a2050'); body.addColorStop(.8, '#0c0818'); body.addColorStop(1, '#000');
      ctx.fillStyle = flash ? '#fff' : body; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(80,60,160,.5)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(0, 0, r * (.4 + i * .18), t * (i % 2 ? 1 : -1) + i, t * (i % 2 ? 1 : -1) + i + 2.2); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawBossGlow(e) {
    if (e.boss === 'eclipse') {
      const t = S.t, r = e.r;
      ctx.save(); ctx.translate(e.x, e.y);
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + t * .3, len = r * (1.5 + .25 * Math.sin(t * 3 + i)); ctx.strokeStyle = 'rgba(190,170,255,.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02); ctx.lineTo(Math.cos(a) * len, Math.sin(a) * len); ctx.stroke(); }
      ctx.restore();
      glow(e.x, e.y, r * 2, '#a090ff', .7);
      ctx.strokeStyle = '#e8e0ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke();
      if (e.skill < .6) { ctx.globalAlpha = 1 - e.skill / .6; ctx.strokeStyle = '#c8b0ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, r * (1.6 - e.skill), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    }
    if (e.boss === 'crow' && e.tele > 0) {
      const k = 1 - e.tele / .8, p = S.player;
      ctx.globalAlpha = .35 + k * .5; ctx.strokeStyle = '#ff6a5f'; ctx.lineWidth = 3 + k * 3; ctx.beginPath(); ctx.arc(e.x, e.y, e.r * (1.6 - k * .3), 0, TAU); ctx.stroke();
      ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
  }
  function drawEyes(e) {
    const r = e.r, boss = e.type === 'boss', y = e.boss === 'treant' ? -r * .35 : e.boss === 'crow' ? -r * .55 : e.type === 'golem' ? -r * .2 : e.type === 'vine' ? 0 : -r * .15, gap = r * (boss ? .26 : .3);
    const col = boss ? '#ff5a4a' : e.type === 'wisp' ? '#e8fbff' : e.type === 'golem' ? '#9dffc0' : '#ffe9a0', born = Math.min(1, (S.t - (e.born ?? -9)) / .35);
    if (boss || e.type === 'golem') { glow(e.x - gap, e.y + y, boss ? 12 : 6, col, .8); glow(e.x + gap, e.y + y, boss ? 12 : 6, col, .8); }
    ctx.globalAlpha = born; ctx.fillStyle = col; const s = boss ? 4 : 1.8;
    ctx.beginPath(); ctx.ellipse(e.x - gap, e.y + y, s * 1.2, s, 0, 0, TAU); ctx.ellipse(e.x + gap, e.y + y, s * 1.2, s, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  function drawPlayer() {
    const p = S.player, bob = p.moving ? Math.abs(Math.sin(p.walk)) * 2 : Math.sin(S.t * 2) * .6, f = p.face;
    if (p.inv > 0 && Math.floor(p.inv * 20) % 2) return;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#0008'; ctx.beginPath(); ctx.ellipse(0, 13, 12, 4.5, 0, 0, TAU); ctx.fill();
    // legs
    const step = p.moving ? Math.sin(p.walk) * 3 : 0;
    ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.ellipse(-4 + step, 11, 3, 2.4, 0, 0, TAU); ctx.ellipse(4 - step, 11, 3, 2.4, 0, 0, TAU); ctx.fill();
    ctx.translate(0, -bob);
    // cape flutters behind the walking direction
    const flap = reduceMotion ? 0 : Math.sin(S.t * 6) * 2 + (p.moving ? 4 : 0);
    ctx.fillStyle = '#1d4a52'; ctx.beginPath(); ctx.moveTo(-8, -6); ctx.quadraticCurveTo(-f * (12 + flap), 4, -f * (8 + flap), 13); ctx.lineTo(f * 6, 11); ctx.closePath(); ctx.fill();
    const cloak = ctx.createLinearGradient(-11, -18, 11, 12); cloak.addColorStop(0, '#4fa3a8'); cloak.addColorStop(.55, '#2e6a73'); cloak.addColorStop(1, '#1b3f47');
    ctx.fillStyle = cloak; ctx.beginPath(); ctx.moveTo(0, -19); ctx.quadraticCurveTo(12, -11, 11, 11); ctx.quadraticCurveTo(0, 14, -11, 11); ctx.quadraticCurveTo(-12, -11, 0, -19); ctx.fill();
    ctx.strokeStyle = '#ffd77a55'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-10, 9); ctx.quadraticCurveTo(0, 12, 10, 9); ctx.stroke(); // hem trim
    // scarf
    ctx.fillStyle = '#c8553d'; ctx.beginPath(); ctx.ellipse(0, -3, 7.5, 2.6, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-f * 4, -3); ctx.quadraticCurveTo(-f * (10 + flap), 0, -f * (13 + flap), 4 + Math.sin(S.t * 9)); ctx.lineTo(-f * (11 + flap), 6); ctx.quadraticCurveTo(-f * 8, 2, -f * 2, -1); ctx.fill();
    // hood and face
    ctx.fillStyle = '#245760'; ctx.beginPath(); ctx.arc(0, -9, 7.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#10262b'; ctx.beginPath(); ctx.ellipse(f * 2, -8, 5, 4.6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f1d6b0'; ctx.beginPath(); ctx.ellipse(f * 2.5, -7.5, 3.6, 3.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(f * 2.5 + f * 1.2 - .6, -8.4, 1.2, 1.4);
    // arm + chain to the lantern
    const lp = lanternPos();
    ctx.strokeStyle = '#2e6a73'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(f * 6, -4); ctx.lineTo(lp.x - p.x, lp.y - p.y - 9 + bob); ctx.stroke();
    ctx.restore();
  }
  function lanternPos() { const p = S.player, sw = reduceMotion ? 0 : Math.sin(S.t * 3) * 2; return { x: p.x + p.face * 13 + sw * .5, y: p.y + 3 + Math.abs(sw) * .5 }; }
  function drawLantern(lp) {
    const fl = flick();
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(lp.x, lp.y - 10); ctx.lineTo(lp.x, lp.y - 7); ctx.stroke();
    ctx.fillStyle = '#3a2a18'; ctx.beginPath(); ctx.moveTo(lp.x - 5, lp.y - 5); ctx.lineTo(lp.x, lp.y - 8.5); ctx.lineTo(lp.x + 5, lp.y - 5); ctx.fill();
    ctx.fillRect(lp.x - 5, lp.y + 5, 10, 2.2);
    ctx.fillStyle = `rgba(255,${200 + fl * 20 | 0},120,1)`; ctx.fillRect(lp.x - 3.8, lp.y - 5, 7.6, 10);
    ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.ellipse(lp.x, lp.y + 1, 1.8, 3 * fl, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 1.2; ctx.strokeRect(lp.x - 3.8, lp.y - 5, 7.6, 10); ctx.beginPath(); ctx.moveTo(lp.x, lp.y - 5); ctx.lineTo(lp.x, lp.y + 5); ctx.stroke();
  }
  function drawDarkness(cx, cy, night) {
    const LW = Math.ceil(canvas.width / 2), LH = Math.ceil(canvas.height / 2);
    if (darkCv.width !== LW || darkCv.height !== LH) { darkCv.width = LW; darkCv.height = LH; }
    dctx.globalCompositeOperation = 'source-over'; dctx.setTransform(1, 0, 0, 1, 0, 0); dctx.clearRect(0, 0, LW, LH);
    dctx.fillStyle = `rgba(4,6,18,${night})`; dctx.fillRect(0, 0, LW, LH);
    dctx.globalCompositeOperation = 'destination-out';
    const k = view.k / 2; dctx.setTransform(k, 0, 0, k, LW / 2 - cx * k, LH / 2 - cy * k);
    const st = A.light();
    for (const [x, y, r, a] of lights) { dctx.globalAlpha = Math.max(0, Math.min(1, a)); dctx.drawImage(st, x - r, y - r, r * 2, r * 2); }
    dctx.globalAlpha = 1; dctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(darkCv, 0, 0, canvas.width, canvas.height);
  }
  const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  function flameTongue(x, y, h, w) {
    ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * .8, y - h * .6, x, y - h); ctx.quadraticCurveTo(x + w * .8, y - h * .6, x + w, y); ctx.quadraticCurveTo(x, y + w * .6, x - w, y); ctx.fill();
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!S) { drawIdle(); return; }
    const p = S.player, t = S.t;
    let cx = p.x, cy = p.y;
    if (shake > 0 && !reduceMotion) { cx += (Math.random() - .5) * 12 * shake; cy += (Math.random() - .5) * 12 * shake; }
    const world = () => ctx.setTransform(view.k, 0, 0, view.k, canvas.width / 2 - cx * view.k, canvas.height / 2 - cy * view.k);
    world();
    drawGround(cx, cy);
    const inView = (x, y, m = 60) => Math.abs(x - cx) < view.hw + m && Math.abs(y - cy) < view.hh + m;
    // Scorched ground under fire pools
    for (const q of S.pools) { if (!inView(q.x, q.y)) continue; const a = Math.min(1, (q.life - q.t) * 2, q.t * 6); ctx.globalAlpha = .35 * a; ctx.drawImage(A.glowSprite('#ff4a10'), q.x - q.r * 1.1, q.y - q.r * 1.1, q.r * 2.2, q.r * 2.2); ctx.globalAlpha = 1; }
    for (const fx of S.fx) if (fx.kind === 'die') { const k = fx.t / .5; ctx.globalAlpha = (1 - k) * .55; ctx.fillStyle = '#1a1030'; ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (.8 + k * 1.4), 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    // Embers on the ground
    for (const gm of S.gems) {
      if (!inView(gm.x, gm.y)) continue;
      const bob = Math.sin(t * 4 + gm.x) * 1.5;
      if (gm.kind === 'gem') { const sp = A.gemSprite(gm.def.color, gm.def.r), sx = Math.abs(Math.cos(t * 3 + gm.y)) * .5 + .5; ctx.drawImage(sp.img, gm.x - sp.size / 2 * sx, gm.y - sp.size / 2 + bob, sp.size * sx, sp.size); }
      else if (gm.kind === 'tea') { ctx.fillStyle = '#e8d2b0'; ctx.beginPath(); ctx.roundRect(gm.x - 6, gm.y - 5 + bob, 12, 10, 3); ctx.fill(); ctx.fillStyle = '#7ad89a'; ctx.fillRect(gm.x - 4, gm.y - 4 + bob, 8, 3); ctx.strokeStyle = '#e8d2b0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(gm.x + 7, gm.y + bob, 3, -1.2, 1.2); ctx.stroke(); }
      else { ctx.fillStyle = '#6a4220'; ctx.beginPath(); ctx.roundRect(gm.x - 12, gm.y - 8 + bob, 24, 17, 3); ctx.fill(); ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.roundRect(gm.x - 12, gm.y - 11 + bob, 24, 7, 3); ctx.fill(); ctx.fillStyle = '#ffd77a'; ctx.fillRect(gm.x - 12, gm.y - 4 + bob, 24, 2.5); ctx.fillRect(gm.x - 2, gm.y - 11 + bob, 4, 20); }
    }
    for (const sd of S.seeds) {
      if (!inView(sd.x, sd.y)) continue;
      const pulse = sd.arm > 0 ? .4 : .7 + Math.sin(t * 8 + sd.ph) * .3;
      ctx.fillStyle = '#3a2030'; ctx.beginPath(); ctx.ellipse(sd.x, sd.y + 3, 6, 2.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = sd.color; ctx.globalAlpha = pulse; ctx.beginPath();
      for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + sd.ph; ctx.ellipse(sd.x + Math.cos(a) * 3.2, sd.y + Math.sin(a) * 3.2, 2.6, 1.6, a, 0, TAU); }
      ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#fff3c0'; ctx.beginPath(); ctx.arc(sd.x, sd.y, 1.8, 0, TAU); ctx.fill();
    }
    // Shadows sorted by y so the horde layers naturally
    const vis = S.enemies.filter(e => inView(e.x, e.y));
    vis.sort((a, b) => a.y - b.y);
    for (const e of vis) drawEnemy(e);
    drawFog(cx, cy);
    drawPlayer();

    // Light sources for the night map
    const lp = lanternPos(), fl = flick();
    lights = [[lp.x, lp.y, 280 * fl, 1], [p.x, p.y, 130, 1]];
    for (const s of S.shots) lights.push([s.x, s.y, s.kind === 'ember' ? 60 : 42, .7]);
    for (const q of S.pools) lights.push([q.x, q.y, q.r * 2, Math.min(1, (q.life - q.t) * 2) * .9 * flick(q.x)]);
    for (const b of S.beams) lights.push([b.x, b.y, b.r * 4, b.t < .16 ? b.t / .16 : 1 - (b.t - .16) / .34]);
    for (const f of S.flares) lights.push([f.x, f.y, f.R * 1.5, 1 - f.t / .45]);
    for (const q of S.arcs) for (const [x, y] of q.nodes) lights.push([x, y, 70, 1 - q.t / .28]);
    for (const q of S.slashes) lights.push([q.x + q.dir * q.reach * .6, q.y, q.reach * 1.2, 1 - q.t / .25]);
    for (const q of S.blasts) lights.push([q.x, q.y, q.R * 2.2, 1 - q.t / .35]);
    for (const sd of S.seeds) if (inView(sd.x, sd.y)) lights.push([sd.x, sd.y, 34, .45]);
    const beacon = S.build.weapons.beacon && wstat('beacon');
    if (beacon) for (const a of beaconRays(beacon)) for (let k = .25; k <= 1; k += .25) lights.push([p.x + Math.cos(a) * beacon.radius * k, p.y + Math.sin(a) * beacon.radius * k, 46, .55]);
    for (const fx of S.fx) if (fx.kind === 'evo') lights.push([p.x, p.y, 300 + fx.t * 400, 1 - fx.t / 1.2]);
    for (const fx of S.fx) if (fx.kind === 'lvl') lights.push([p.x, p.y, 200 + fx.t * 500, 1 - fx.t / .8]);
    const halo = S.build.weapons.halo && wstat('halo'), orbs = halo ? haloOrbs(halo) : [];
    for (const o of orbs) lights.push([o.x, o.y, 60, .65]);
    let gl = 0;
    for (const gm of S.gems) if (gl < 140 && inView(gm.x, gm.y)) { gl++; lights.push([gm.x, gm.y, gm.kind === 'chest' ? 110 : gm.kind === 'tea' ? 40 : gm.r * 5, gm.kind === 'gem' ? .35 : .8]); }
    for (const [x, y] of shrooms) lights.push([x, y, 46, .4]);
    for (const e of vis) if (e.type === 'wisp') lights.push([e.x, e.y, 46, .3]);
    if (S.boss && !S.boss.dead && S.boss.boss === 'eclipse') lights.push([S.boss.x, S.boss.y, S.boss.r * 2.2, .35]);
    const night = t > 520 ? .92 - (t - 520) / 80 * .62 : .92;
    drawDarkness(cx, cy, night);
    world();

    // Everything that glows sits above the darkness
    ctx.globalCompositeOperation = 'lighter';
    glow(lp.x, lp.y, 70 * fl, '#ffb35c', .55);
    for (const [x, y, col] of shrooms) glow(x, y, 14, col, .5 + Math.sin(t * 2 + x) * .2);
    for (const q of S.pools) {
      if (!inView(q.x, q.y)) continue;
      const a = Math.min(1, (q.life - q.t) * 2, q.t * 6);
      glow(q.x, q.y, q.r * 1.2, q.evo ? '#ff3a1a' : '#ff6a2a', (q.evo ? .7 : .5) * a);
      if (q.evo) for (let i = 0; i < 5; i++) { const ph = (t * 1.5 + i * .37 + q.x * .01) % 1, ang = i * 2.4 + q.y, d = q.r * .5 * ((i * 37) % 10) / 10; ctx.globalAlpha = (1 - ph) * a; ctx.strokeStyle = '#ffd08a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q.x + Math.cos(ang) * d, q.y + Math.sin(ang) * d * .6, 2 + ph * 6, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1;
      for (let i = 0; i < (q.evo ? 14 : 9); i++) {
        const ang = i / (q.evo ? 14 : 9) * TAU + q.x, d = q.r * (.2 + (i % 3) * .25), fx = q.x + Math.cos(ang) * d, fy = q.y + Math.sin(ang) * d * .6;
        const h = (10 + (i % 4) * 4) * (1 + Math.sin(t * 14 + i * 2.1) * .25) * a;
        ctx.fillStyle = q.evo ? (i % 2 ? '#ff3a1a' : '#ff7a2a') : i % 2 ? '#ff7a2a' : '#ffb347'; ctx.globalAlpha = .75; flameTongue(fx, fy, h, 4.5);
        ctx.fillStyle = '#fff1b0'; ctx.globalAlpha = .6; flameTongue(fx, fy, h * .5, 2);
      }
      ctx.globalAlpha = 1;
    }
    for (const gm of S.gems) { if (!inView(gm.x, gm.y)) continue; const c = gm.kind === 'gem' ? gm.def.color : gm.kind === 'tea' ? '#9dffb4' : '#fff2b0'; glow(gm.x, gm.y, gm.kind === 'chest' ? 40 + Math.sin(t * 4) * 6 : gm.r * 3, c, .55); }
    for (const fx of S.fx) if (fx.kind === 'die') glow(fx.x, fx.y, fx.r * 2.2, fx.color, (1 - fx.t / .5) * .5);
    ctx.globalCompositeOperation = 'source-over';
    for (const e of vis) { drawEyes(e); if (e.stunT > 0) { ctx.fillStyle = '#ffe08a'; for (let i = 0; i < 3; i++) { const a = t * 6 + i * TAU / 3; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * e.r * .8, e.y - e.r - 4 + Math.sin(a) * 3, 1.8, 0, TAU); ctx.fill(); } } if (e.slowT > 0) { ctx.fillStyle = '#ff6a2a88'; ctx.fillRect(e.x - e.r * .6, e.y + e.r * .7, e.r * 1.2, 2); } }
    if (S.boss && !S.boss.dead) { ctx.globalCompositeOperation = 'lighter'; drawBossGlow(S.boss); ctx.globalCompositeOperation = 'source-over'; }
    drawLantern(lp);
    ctx.globalCompositeOperation = 'lighter';
    if (beacon) for (const a of beaconRays(beacon)) {
      ctx.save(); ctx.translate(lp.x, lp.y); ctx.rotate(a);
      const w = beacon.evolved ? 16 : 11, g = ctx.createLinearGradient(0, 0, beacon.radius, 0);
      g.addColorStop(0, rgba(beacon.color, .85)); g.addColorStop(1, rgba(beacon.color, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(beacon.radius, -w); ctx.lineTo(beacon.radius, w); ctx.lineTo(0, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(0, -1, beacon.radius * .8, 2);
      ctx.restore();
    }
    for (const sd of S.seeds) if (inView(sd.x, sd.y)) glow(sd.x, sd.y, sd.evo ? 16 : 12, sd.color, sd.arm > 0 ? .3 : .6 + Math.sin(t * 8 + sd.ph) * .3);
    for (const o of orbs) {
      for (let k = 1; k <= 3; k++) { const a = S.haloA - k * .12, pr = Math.hypot(o.x - p.x, o.y - p.y), base = Math.atan2(o.y - p.y, o.x - p.x) - k * .12; glow(p.x + Math.cos(base) * pr, p.y + Math.sin(base) * pr, 12, '#ffb35c', .35 / k); void a; }
      if (halo.evolved) { ctx.fillStyle = '#ff8a2a'; ctx.globalAlpha = .7; for (let k = 0; k < 3; k++) { const a = t * 9 + k * 2.1 + o.x; flameTongue(o.x + Math.cos(a) * 3, o.y + 4, 14 + Math.sin(t * 20 + k) * 3, 5); } ctx.globalAlpha = 1; }
      glow(o.x, o.y, (halo.evolved ? 36 : 26) * fl, halo.evolved ? '#ffb347' : '#ffd77a', .9); ctx.fillStyle = '#fff4cf'; ctx.beginPath(); ctx.arc(o.x, o.y, halo.evolved ? 7.5 : 5.5, 0, TAU); ctx.fill();
    }
    for (const s of S.shots) {
      if (s.kind === 'ember') {
        const k = s.evo ? 1.6 : 1;
        glow(s.x, s.y, 18 * k, s.color || '#ffb35c', .9);
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx));
        if (s.evo) { const tail = ctx.createLinearGradient(-34, 0, 0, 0); tail.addColorStop(0, 'rgba(255,90,30,0)'); tail.addColorStop(1, 'rgba(255,140,60,.9)'); ctx.fillStyle = tail; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(0, -6); ctx.lineTo(0, 6); ctx.fill(); }
        ctx.fillStyle = s.evo ? '#ff6a2a' : '#ff9a3c'; ctx.beginPath(); ctx.ellipse(-4, 0, 11 * k, 3.2 * k, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.ellipse(0, 0, 6 * k, 2 * k, 0, 0, TAU); ctx.fill(); ctx.restore();
      } else if (s.kind === 'wing') {
        glow(s.x, s.y, s.r * 2.2, s.color, .8);
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.spin);
        ctx.fillStyle = s.evo ? '#ffe6c0' : '#ffc48a';
        for (let b = 0; b < (s.evo ? 3 : 2); b++) { ctx.rotate(TAU / (s.evo ? 3 : 2)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s.r * .9, -s.r * .9, s.r * 1.3, 0); ctx.quadraticCurveTo(s.r * .7, -s.r * .3, 0, 0); ctx.fill(); }
        ctx.fillStyle = '#3a2a18'; ctx.fillRect(-3.5, -4.5, 7, 9); ctx.fillStyle = '#fff1c0'; ctx.fillRect(-2.2, -3, 4.4, 6);
        ctx.restore();
      } else {
        const blink = .6 + .4 * Math.sin(t * 12 + s.wob * 3);
        if (s.evo) { glow(s.x, s.y, 16, '#bfe8ff', blink); ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(t * 6 + s.wob); ctx.fillStyle = '#f2fbff'; ctx.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? 1.6 : 4.5, a = k / 8 * TAU; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); ctx.restore(); }
        else { glow(s.x, s.y, 14, '#b8ff7a', blink); ctx.fillStyle = '#f3ffd0'; ctx.beginPath(); ctx.arc(s.x, s.y, 2.4, 0, TAU); ctx.fill(); }
      }
    }
    for (const b of S.beams) {
      const a = Math.max(0, b.t < .16 ? b.t / .16 : 1 - (b.t - .16) / .34), w = b.r * (b.t < .16 ? .25 : .7);
      const bc = b.color || '#fff2b0', col = ctx.createLinearGradient(0, b.y - 420, 0, b.y); col.addColorStop(0, rgba(bc, 0)); col.addColorStop(1, rgba(bc, .85 * a));
      ctx.fillStyle = col; ctx.fillRect(b.x - w / 2, b.y - 420, w, 420);
      ctx.fillStyle = `rgba(255,255,255,${.9 * a})`; ctx.fillRect(b.x - w / 6, b.y - 420, w / 3, 420);
      if (b.evo) { ctx.fillStyle = rgba('#ffd77a', .8 * a); ctx.beginPath(); ctx.moveTo(b.x, b.y + 6); ctx.lineTo(b.x - w * .7, b.y - 26); ctx.lineTo(b.x + w * .7, b.y - 26); ctx.fill(); }
      glow(b.x, b.y, b.r * 1.6, bc, a);
      if (b.t >= .16) { const k = (b.t - .16) / .34; ctx.strokeStyle = rgba(bc, 1 - k); ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * (.6 + k), b.r * (.3 + k * .5), 0, 0, TAU); ctx.stroke(); }
    }
    for (const f of S.flares) {
      const k = f.t / .45, R = f.R * (.25 + k * .75);
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.color || '#7fe8ff'; ctx.lineWidth = (f.evo ? 12 : 8) * (1 - k) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#e8fdff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, R * .8, 0, TAU); ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + k; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * R * .85, f.y + Math.sin(a) * R * .85); ctx.lineTo(f.x + Math.cos(a) * R * 1.08, f.y + Math.sin(a) * R * 1.08); ctx.stroke(); }
      if (k < .3) glow(f.x, f.y, f.R * .6, f.evo ? '#fff0b0' : '#bff6ff', (.3 - k) * 2);
      ctx.globalAlpha = 1;
    }
    for (const q of S.arcs) {
      const a = 1 - q.t / .28;
      ctx.globalAlpha = a; ctx.lineJoin = 'round';
      for (const [w, c] of [[q.evo ? 7 : 5, q.color], [1.6, '#ffffff']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); q.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
      for (const [x, y] of q.nodes) glow(x, y, q.evo ? 30 : 20, q.color, a);
      ctx.globalAlpha = 1;
    }
    for (const q of S.slashes) {
      const k = q.t / .25, a0 = q.dir > 0 ? -1.15 : Math.PI - 1.15, sweep = 2.3 * Math.min(1, k * 2.2);
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = q.color; ctx.lineCap = 'round';
      for (const [rr, w] of [[q.reach * .92, q.evo ? 14 : 10], [q.reach * .78, 4], [q.reach * 1.02, 2]]) {
        ctx.lineWidth = w; ctx.beginPath();
        if (q.dir > 0) ctx.arc(q.x, q.y, rr, a0, a0 + sweep); else ctx.arc(q.x, q.y, rr, Math.PI + 1.15, Math.PI + 1.15 - sweep, true);
        ctx.stroke();
      }
      glow(q.x + q.dir * q.reach * .7, q.y, q.reach * .5, q.color, .6 * (1 - k));
      ctx.globalAlpha = 1;
    }
    for (const q of S.blasts) {
      const k = q.t / .35;
      glow(q.x, q.y, q.R * (1 + k * .5), q.color, 1 - k);
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ffe0a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, q.y, q.R * (.4 + k * .8), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
    }
    for (const fx of S.fx) if (fx.kind === 'crit') { const k = fx.t / .25; ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + fx.x; ctx.beginPath(); ctx.moveTo(fx.x + Math.cos(a) * (6 + k * 10), fx.y + Math.sin(a) * (6 + k * 10)); ctx.lineTo(fx.x + Math.cos(a) * (12 + k * 20), fx.y + Math.sin(a) * (12 + k * 20)); ctx.stroke(); } glow(fx.x, fx.y, 22, fx.color, (1 - k) * .8); ctx.globalAlpha = 1; }
    for (const fx of S.fx) if (fx.kind === 'evo') {
      const k = fx.t / 1.2;
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = fx.color; ctx.lineWidth = 6 * (1 - k) + 1;
      ctx.beginPath(); ctx.arc(p.x, p.y, 30 + k * 220, 0, TAU); ctx.stroke();
      for (let i = 0; i < 16; i++) { const a = i / 16 * TAU + k * 2; ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * (20 + k * 60), p.y + Math.sin(a) * (20 + k * 60)); ctx.lineTo(p.x + Math.cos(a) * (40 + k * 160), p.y + Math.sin(a) * (40 + k * 160)); ctx.stroke(); }
      glow(p.x, p.y, 120, fx.color, 1 - k); ctx.globalAlpha = 1;
    }
    for (const fx of S.fx) if (fx.kind === 'lvl') { const k = fx.t / .8; ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = 4 * (1 - k) + 1; ctx.beginPath(); ctx.arc(p.x, p.y, 20 + k * 120, 0, TAU); ctx.stroke(); glow(p.x, p.y, 60, '#ffd77a', (1 - k) * .8); ctx.globalAlpha = 1; }
    for (const q of S.parts) { if (q.smoke) continue; const a = 1 - q.t / q.life; ctx.globalAlpha = a; ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (.6 + a * .5), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (const q of S.parts) if (q.smoke) { ctx.globalAlpha = (1 - q.t / q.life) * .4; ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1 + q.t * 3), 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const q of S.bullets) {
      glow(q.x, q.y, q.r * 2.4, '#7a5aff', .6);
      ctx.fillStyle = '#140a2c'; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#d8c8ff'; ctx.lineWidth = 2; ctx.stroke();
    }
    for (const fx of S.fx) if (fx.kind === 'up') { const k = fx.t / 1.2, y = p.y - 34 - k * 26; ctx.globalAlpha = Math.min(1, (1 - k) * 3); ctx.font = `800 ${Math.round(18 * (k < .1 ? 1.6 - k * 6 : 1))}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.strokeStyle = '#0a0612'; ctx.lineWidth = 3; ctx.strokeText(fx.icon, p.x, y); ctx.fillStyle = fx.color; ctx.fillText(fx.icon, p.x, y); ctx.globalAlpha = 1; }
    // Damage numbers pop, then float
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (const q of S.texts) {
      const big = q.crit || (typeof q.text === 'number' && q.text >= 30), pop = q.t < .1 ? (q.crit ? 2 : 1.5) - q.t * (q.crit ? 10 : 5) : 1;
      ctx.font = `${q.crit ? 900 : 800} ${Math.round((q.crit ? 17 : big ? 15 : 12) * pop)}px system-ui,sans-serif`;
      ctx.globalAlpha = Math.min(1, (.7 - q.t) * 4); ctx.strokeStyle = '#0a0612'; ctx.lineWidth = 3; ctx.strokeText(q.text, q.x, q.y); ctx.fillStyle = q.color; ctx.fillText(q.text, q.x, q.y);
    }
    ctx.globalAlpha = 1;
    // Player HP bar
    const hpw = 34, hpr = Math.max(0, p.hp / S.mods.maxHp);
    ctx.fillStyle = '#0a0612cc'; ctx.beginPath(); ctx.roundRect(p.x - hpw / 2 - 1, p.y + 17, hpw + 2, 6, 3); ctx.fill();
    ctx.fillStyle = hpr > .35 ? '#7dffb2' : '#ff6a5f'; ctx.beginPath(); ctx.roundRect(p.x - hpw / 2, p.y + 18, hpw * hpr, 4, 2); ctx.fill();
    drawHud();
  }
  function drawHud() {
    const { dpr, cw, ch } = view, t = S.t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // vignette, red pulse on low health, warm dawn
    const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * .35, cw / 2, ch / 2, Math.hypot(cw, ch) * .6);
    const low = S.player.hp / S.mods.maxHp < .3 && mode === 'play';
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, low ? `rgba(120,10,20,${.45 + Math.sin(t * 6) * .15})` : 'rgba(0,0,0,.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
    if (flashT > 0) { ctx.fillStyle = `rgba(255,240,210,${flashT * 1.2})`; ctx.fillRect(0, 0, cw, ch); }
    if (t > 520) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,140,70,${Math.min(1, (t - 520) / 80) * .12})`; ctx.fillRect(0, 0, cw, ch); ctx.globalCompositeOperation = 'source-over'; }
    // XP bar
    ctx.fillStyle = '#0a0f1ce6'; ctx.fillRect(0, 0, cw, 9);
    const xw = cw * Math.min(1, S.xp / S.need), xg = ctx.createLinearGradient(0, 0, cw, 0); xg.addColorStop(0, '#ff8a4a'); xg.addColorStop(1, '#ffe08a');
    ctx.fillStyle = xg; ctx.fillRect(0, 0, xw, 9); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(0, 0, xw, 3);
    if (xw > 4) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(A.glowSprite('#ffd77a'), xw - 14, -10, 28, 28); ctx.globalCompositeOperation = 'source-over'; }
    ctx.textBaseline = 'middle';
    // level badge
    ctx.fillStyle = '#0d1522e6'; ctx.beginPath(); ctx.arc(26, 32, 15, 0, TAU); ctx.fill(); ctx.strokeStyle = '#ffb35c'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#ffe2a8'; ctx.textAlign = 'center'; ctx.font = '800 13px system-ui,sans-serif'; ctx.fillText(S.level, 26, 33);
    ctx.font = '700 8px system-ui,sans-serif'; ctx.fillStyle = '#ffb35c'; ctx.fillText('LV', 26, 22);
    // clock with the night's progress from moon to sun
    ctx.shadowColor = '#000'; ctx.shadowBlur = 6;
    ctx.font = '800 22px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(C.clock(t), cw / 2, 28);
    ctx.shadowBlur = 0;
    const bw = 104, bx = cw / 2 - bw / 2, prog = t / C.DURATION;
    ctx.fillStyle = '#ffffff22'; ctx.fillRect(bx, 45, bw, 2); ctx.fillStyle = '#ffd77a'; ctx.fillRect(bx, 45, bw * prog, 2);
    ctx.fillStyle = '#dfe6ff'; ctx.beginPath(); ctx.arc(bx + bw * prog, 46, 4, 0, TAU); ctx.fill(); ctx.fillStyle = '#0d1522'; ctx.beginPath(); ctx.arc(bx + bw * prog + 2, 45, 3.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb35c'; ctx.beginPath(); ctx.arc(bx + bw + 8, 46, 3.5, 0, TAU); ctx.fill();
    // kills
    ctx.textAlign = 'right'; ctx.font = '700 13px system-ui,sans-serif'; ctx.fillStyle = '#e6edf8'; ctx.shadowBlur = 4; ctx.fillText(`처치 ${S.kills.toLocaleString('ko-KR')}`, cw - 12, 24); ctx.shadowBlur = 0;
    // Carried arts and charms with level pips
    ctx.textAlign = 'center'; let x = 56, slotRow = 0;
    const items = [...Object.entries(S.build.weapons).map(([i, l]) => [S.build.evolved[i] ? C.EVOLUTIONS[i] : C.WEAPONS[i], l, true, S.build.evolved[i], S.build.polish[i] || 0]), ...Object.entries(S.build.charms).map(([i, l]) => [C.CHARMS[i], l, false])];
    for (const [def, lv, weapon, evo, pol] of items) {
      ctx.fillStyle = evo ? '#2a1d0ee6' : weapon ? '#121b2ae6' : '#1a1626e6'; ctx.beginPath(); ctx.roundRect(x - 12, 20, 24, 24, weapon ? 6 : 12); ctx.fill();
      ctx.strokeStyle = evo ? '#ffd77a' : def.color + '99'; ctx.lineWidth = evo ? 2 : 1.2; ctx.stroke();
      if (evo) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(A.glowSprite('#ffb35c'), x - 18, 14, 36, 36); ctx.globalCompositeOperation = 'source-over'; }
      ctx.font = '700 13px system-ui,sans-serif'; ctx.fillStyle = def.color; ctx.fillText(def.icon, x, 32);
      for (let i = 0; i < C.MAX_LEVEL; i++) { ctx.fillStyle = i < lv ? def.color : '#ffffff26'; ctx.fillRect(x - 10 + i * 4.4, 47, 3, 3); }
      if (pol) { ctx.font = '700 8px system-ui,sans-serif'; ctx.fillStyle = '#fff2b0'; ctx.fillText('✶'.repeat(pol), x, 17); }
      x += 28;
      if (x > cw / 2 - 70 && x < cw / 2 + 70 && slotRow === 0) { x = 56; slotRow = 1; ctx.translate(0, 34); }
    }
    if (slotRow) ctx.translate(0, -34);
    ctx.textBaseline = 'alphabetic';
    const boss = S.boss && !S.boss.dead ? S.boss : null;
    // Boss entrance: letterbox bars while the banner shows
    if (boss && bannerT > 0 && bannerText.endsWith('출현')) { const k = Math.min(1, bannerT, (2.4 - bannerT) * 4); ctx.fillStyle = '#000c'; ctx.fillRect(0, 0, cw, 30 * k); ctx.fillRect(0, ch - 30 * k, cw, 30 * k); }
    if (bannerT > 0) {
      const a = Math.min(1, bannerT, (2.4 - bannerT) * 5), y = ch * .24;
      ctx.globalAlpha = a; ctx.font = '850 22px system-ui,sans-serif';
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(A.glowSprite('#ffb35c'), cw / 2 - 160, y - 40, 320, 70); ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 4; ctx.strokeStyle = '#1a0e06'; ctx.strokeText(bannerText, cw / 2, y); ctx.fillStyle = '#ffe2a8'; ctx.fillText(bannerText, cw / 2, y);
      ctx.globalAlpha = 1;
    }
    if (boss) {
      const w = Math.min(380, cw - 40), bx2 = (cw - w) / 2, by = ch - 34;
      ctx.fillStyle = '#0a0612d9'; ctx.beginPath(); ctx.roundRect(bx2 - 3, by - 3, w + 6, 16, 5); ctx.fill();
      const bg = ctx.createLinearGradient(bx2, 0, bx2 + w, 0); bg.addColorStop(0, '#7a3cff'); bg.addColorStop(1, '#ff6ab4');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect(bx2, by, w * Math.max(0, boss.hp / boss.maxHp), 10, 3); ctx.fill();
      ctx.strokeStyle = '#c8a6ff66'; ctx.lineWidth = 1; ctx.beginPath(); ctx.roundRect(bx2 - 3, by - 3, w + 6, 16, 5); ctx.stroke();
      ctx.font = '800 12px system-ui,sans-serif'; ctx.fillStyle = '#f2e8ff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4; ctx.fillText(boss.name, cw / 2, by - 9); ctx.shadowBlur = 0;
      const sx = (boss.x - S.player.x) * view.k / dpr, sy = (boss.y - S.player.y) * view.k / dpr;
      if (Math.abs(sx) > cw / 2 || Math.abs(sy) > ch / 2) {
        const a = Math.atan2(sy, sx), ex = cw / 2 + Math.cos(a) * (Math.min(cw, ch) / 2 - 26), ey = ch / 2 + Math.sin(a) * (Math.min(cw, ch) / 2 - 26);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.globalAlpha = .7 + Math.sin(t * 8) * .3; ctx.fillStyle = '#ff6a5f'; ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-8, -9); ctx.lineTo(-4, 0); ctx.lineTo(-8, 9); ctx.fill(); ctx.restore(); ctx.globalAlpha = 1;
      }
    }
    drawChestPanel();
    if (stick) {
      ctx.fillStyle = '#ffffff10'; ctx.beginPath(); ctx.arc(stick.ox, stick.oy, 42, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd77a55'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#ffd77a66'; ctx.beginPath(); ctx.arc(stick.ox + stick.dx * 40, stick.oy + stick.dy * 40, 16, 0, TAU); ctx.fill();
    }
  }
  const idle = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * TAU }));
  function drawIdle() {
    const { dpr, cw, ch } = view, t = performance.now() / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    groundPattern ||= ctx.createPattern(A.ground(), 'repeat');
    ctx.save(); ctx.translate(-t * 6 % 256, 0); ctx.fillStyle = groundPattern; ctx.fillRect(0, 0, cw + 256, ch); ctx.restore();
    const vg = ctx.createRadialGradient(cw / 2, ch * .62, 40, cw / 2, ch * .62, Math.hypot(cw, ch) * .6);
    vg.addColorStop(0, 'rgba(4,6,18,.35)'); vg.addColorStop(1, 'rgba(4,6,18,.92)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'lighter';
    for (const f of idle) glow(f.x * cw + Math.sin(t + f.p) * 14, f.y * ch + Math.cos(t * .7 + f.p) * 10, 10, '#d8ff8a', .45 + Math.sin(t * 3 + f.p) * .3);
    glow(cw / 2, ch * .62, 160, '#ffb35c', .35);
    ctx.globalCompositeOperation = 'source-over';
  }
  function loop(t) {
    const dt = Math.min(.05, (t - lastTime) / 1000 || 0); lastTime = t;
    if (hitStop > 0) hitStop -= dt;
    else if (mode === 'play') update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // ---------- Input ----------
  ui.start.addEventListener('click', () => { if (mode === 'paused') setPaused(false); else newGame(); });
  ui.pause.addEventListener('click', () => setPaused(mode === 'play'));
  addEventListener('keydown', e => {
    if (e.target.closest?.('input,select,textarea')) return;
    if (mode === 'levelup' && /^Digit[1-3]$|^Numpad[1-3]$/.test(e.code)) { choose(+e.code.slice(-1) - 1); e.preventDefault(); return; }
    if (e.code === 'KeyP' || e.code === 'Escape') { if (mode === 'play' || mode === 'paused') { setPaused(mode === 'play'); e.preventDefault(); } return; }
    if ((e.code === 'Enter' || e.code === 'Space') && (mode === 'ready' || mode === 'over') && document.activeElement === canvas) { newGame(); e.preventDefault(); return; }
    const move = /^Arrow|^Key[WASD]$/.test(e.code);
    if (move && mode === 'play') { keys.add(e.code); if (e.code.startsWith('Arrow')) e.preventDefault(); }
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); setPaused(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
  addEventListener('resize', fit);
  const local = e => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  canvas.addEventListener('pointerdown', e => {
    if (mode !== 'play') return;
    const q = local(e); stick = { id: e.pointerId, ox: q.x, oy: q.y, dx: 0, dy: 0, mag: 0 };
    canvas.setPointerCapture(e.pointerId); e.preventDefault();
  });
  canvas.addEventListener('pointermove', e => {
    if (!stick || stick.id !== e.pointerId) return;
    const q = local(e), dx = q.x - stick.ox, dy = q.y - stick.oy, m = Math.hypot(dx, dy), mag = Math.min(1, m / 40);
    Object.assign(stick, m ? { dx: dx / m * mag, dy: dy / m * mag, mag } : { dx: 0, dy: 0, mag: 0 });
  });
  const endStick = e => { if (stick && stick.id === e.pointerId) stick = null; };
  canvas.addEventListener('pointerup', endStick); canvas.addEventListener('pointercancel', endStick);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  try { ui.sound.checked = localStorage.getItem(SOUND_KEY) === '1'; } catch { /* ignore */ }
  ui.sound.addEventListener('change', () => { try { localStorage.setItem(SOUND_KEY, ui.sound.checked ? '1' : '0'); } catch { /* ignore */ } });

  // Test hooks: read-only snapshot plus helpers for automated browser checks.
  window.__lanternKeeper = {
    get mode() { return mode; },
    summary: () => S && dmgSummary(),
    snapshot: () => S && { dmgBy: { ...S.dmgBy }, crits: S.crits, t: S.t, level: S.level, xp: S.xp, need: S.need, hp: S.player.hp, maxHp: S.mods.maxHp, kills: S.kills, enemies: S.enemies.length, gems: S.gems.length,
      shots: S.shots.length, pools: S.pools.length, beams: S.beams.length, bullets: S.bullets.length, weapons: { ...S.build.weapons }, charms: { ...S.build.charms }, evolved: { ...S.build.evolved }, polish: { ...S.build.polish }, chest: S.chest ? S.chest.items.map(d => d.name) : null, arcs: S.arcs.length, slashes: S.slashes.length, blasts: S.blasts.length, seeds: S.seeds.length,
      boss: S.boss && !S.boss.dead ? S.boss.boss : null, player: { x: S.player.x, y: S.player.y }, score: S.score ?? null, pending: S.pending },
    choices: () => choices.map(c => ({ ...c })),
    choose, setGod: on => { god = !!on; },
    setTime: t => { S.t = t; }, addXp: v => gainXp(v),
    spawn: (type, n = 1, dist = 120) => { for (let i = 0; i < n; i++) { const a = i / n * TAU; spawnEnemy(type, S.player.x + Math.cos(a) * dist, S.player.y + Math.sin(a) * dist); } },
    spawnBoss: i => spawnBoss(C.BOSSES[i]), killBoss: () => S.boss && hit(S.boss, S.boss.hp + 1),
    grant: (kind, id, level = 1) => { for (let i = 0; i < level; i++) S.build = C.applyChoice(S.build, { kind, id }); S.mods = C.modifiers(S.build); },
    openChest: () => openChest(),
    evolve: id => { S.build = C.applyChoice(S.build, { kind: 'evolve', id }); S.mods = C.modifiers(S.build); },
    enemyStatus: () => S.enemies.map(e => ({ stun: e.stunT > 0, slow: e.slowT > 0 })),
    setMove: v => { botMove = v; },
    step: (sec, dt = 1 / 30) => { for (let i = 0; i < sec / dt && mode === 'play'; i++) update(dt); return mode; },
    enemyList: () => S.enemies.map(e => [e.x, e.y, e.r]),
    gemList: () => S.gems.map(g => [g.x, g.y]),
    hurt: n => { S.player.inv = 0; hurtPlayer(n); }, clear: () => { S.enemies = []; S.bullets = []; }
  };

  fit(); renderBest();
  ui.start.disabled = false; ui.start.textContent = '시작';
  requestAnimationFrame(loop);
})();
