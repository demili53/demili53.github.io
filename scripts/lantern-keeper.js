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
  let choices = [], lastTime = 0, shake = 0, god = false;
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
      enemies: [], shots: [], gems: [], pools: [], beams: [], flares: [], texts: [], parts: [], bullets: [], fx: [],
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
  function addText(x, y, text, color = '#fff') { if (S.texts.length < 70) S.texts.push({ x, y, text, color, t: 0 }); }
  function burst(x, y, color, n = 6, sp = 90) {
    for (let i = 0; i < n && S.parts.length < 400; i++) { const a = Math.random() * TAU, v = sp * (.4 + Math.random()); S.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: .35 + Math.random() * .3, color, r: 1.5 + Math.random() * 2 }); }
  }
  function hit(e, dmg, kx = 0, ky = 0) {
    if (e.dead) return;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg; e.flash = .1;
    if (e.type !== 'boss') { e.kx += kx; e.ky += ky; } else { e.kx += kx * .1; e.ky += ky * .1; }
    if (dmg >= 6 || Math.random() < .3) addText(e.x, e.y - e.r, dmg, dmg >= 30 ? '#ffd77a' : '#ffffff');
    if (S.t - lastHitSound > .07) { lastHitSound = S.t; beep(520 + Math.random() * 200, .04, 'square', .012); }
    if (e.hp <= 0) kill(e);
  }
  function kill(e) {
    e.dead = true; S.kills++;
    if (S.fx.length < 80) S.fx.push({ kind: 'die', x: e.x, y: e.y, r: e.r, color: e.color, t: 0 });
    for (let i = 0; i < (e.type === 'boss' ? 16 : 2) && S.parts.length < 400; i++) S.parts.push({ smoke: true, x: e.x + (Math.random() - .5) * e.r, y: e.y + (Math.random() - .5) * e.r, vx: (Math.random() - .5) * 30, vy: -20 - Math.random() * 20, t: 0, life: .6, color: '#2a1d4a', r: e.r * .4 });
    burst(e.x, e.y, e.color, e.type === 'boss' ? 40 : 7, e.type === 'boss' ? 220 : 90);
    if (e.type === 'boss') {
      S.bossesDown++; S.boss = null; shake = .5;
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
  function fireWeapons(dt) {
    const p = S.player;
    for (const id in S.build.weapons) {
      const s = C.weaponStats(id, S.build.weapons[id], S.mods);
      if (id === 'halo') { haloHits(s, dt); continue; }
      S.cds[id] = (S.cds[id] ?? .3) - dt;
      if (S.cds[id] > 0) continue;
      S.cds[id] = s.cooldown;
      if (id === 'ember') {
        const targets = nearest(p.x, p.y, s.count);
        if (!targets.length) { S.cds[id] = .2; continue; }
        for (let i = 0; i < s.count; i++) {
          const t = targets[i % targets.length], a = Math.atan2(t.y - p.y, t.x - p.x) + (i >= targets.length ? (i - targets.length + 1) * .18 : 0);
          S.shots.push({ kind: 'ember', x: p.x, y: p.y - 6, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, dmg: s.damage, pierce: s.pierce, life: 1.3, r: 5, hits: new Set() });
        }
        beep(760, .05, 'triangle', .015, 200);
      } else if (id === 'firefly') {
        for (let i = 0; i < s.count; i++) { const a = Math.random() * TAU; S.shots.push({ kind: 'firefly', x: p.x, y: p.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, dmg: s.damage, speed: s.speed, pierce: 1, life: 3, r: 4, hits: new Set(), target: null, wob: Math.random() * TAU }); }
      } else if (id === 'sunbeam') {
        const pool = S.enemies.filter(e => !e.dead && Math.abs(e.x - p.x) < view.hw && Math.abs(e.y - p.y) < view.hh);
        for (let i = 0; i < s.count; i++) {
          const e = pool.length ? pool.splice(Math.floor(Math.random() * pool.length), 1)[0] : null;
          S.beams.push({ x: e ? e.x : p.x + (Math.random() - .5) * 300, y: e ? e.y : p.y + (Math.random() - .5) * 220, r: s.radius, dmg: s.damage, t: 0, done: false });
        }
      } else if (id === 'pool') {
        for (let i = 0; i < s.count; i++) {
          const e = nearest(p.x, p.y, 4)[i] ;
          const x = e ? e.x : p.x + (Math.random() - .5) * 200, y = e ? e.y : p.y + (Math.random() - .5) * 200;
          S.pools.push({ x, y, r: s.radius, dmg: s.damage, life: s.duration, tick: s.tick, tt: 0, t: 0 });
        }
      } else if (id === 'flare') {
        S.flares.push({ x: p.x, y: p.y, R: s.radius, t: 0 });
        near(p.x, p.y, s.radius, e => { const d = Math.hypot(e.x - p.x, e.y - p.y) || 1; hit(e, s.damage, (e.x - p.x) / d * s.knock, (e.y - p.y) / d * s.knock); });
        beep(300, .25, 'sine', .04, 500);
      }
    }
  }
  function haloOrbs(s) {
    const out = [];
    for (let i = 0; i < s.count; i++) { const a = S.haloA + i / s.count * TAU; out.push({ x: S.player.x + Math.cos(a) * s.radius, y: S.player.y + Math.sin(a) * s.radius }); }
    return out;
  }
  function haloHits(s, dt) {
    S.haloA += s.spin * dt;
    for (const o of haloOrbs(s)) near(o.x, o.y, 11, e => {
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
      if (e.type === 'boss') speed = bossThink(e, dt, dx, dy, d);
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
      s.x += s.vx * dt; s.y += s.vy * dt;
      near(s.x, s.y, s.r, e => {
        if (s.hits.has(e)) return;
        s.hits.add(e); const v = Math.hypot(s.vx, s.vy) || 1;
        hit(e, s.dmg, s.vx / v * 40, s.vy / v * 40);
        if (--s.pierce <= 0) { s.life = 0; return false; }
      });
    }
    S.shots = S.shots.filter(s => s.life > 0);
    for (const pool of S.pools) {
      pool.t += dt; pool.tt -= dt;
      if (pool.tt <= 0) { pool.tt = pool.tick; near(pool.x, pool.y, pool.r, e => hit(e, pool.dmg)); }
    }
    S.pools = S.pools.filter(q => q.t < q.life);
    for (const beam of S.beams) {
      beam.t += dt;
      if (!beam.done && beam.t >= .16) { beam.done = true; near(beam.x, beam.y, beam.r, e => hit(e, beam.dmg)); burst(beam.x, beam.y, '#fff2b0', 8, 120); }
    }
    S.beams = S.beams.filter(q => q.t < .5);
    for (const f of S.flares) f.t += dt;
    S.flares = S.flares.filter(f => f.t < .45);
    // Enemy bullets
    for (const q of S.bullets) {
      q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
      if (Math.hypot(q.x - p.x, q.y - p.y) < q.r + PLAYER_R - 2) { hurtPlayer(q.damage); q.life = 0; }
    }
    S.bullets = S.bullets.filter(q => q.life > 0);
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
        else if (g.kind === 'chest') { S.pending++; banner('별빛 상자: 추가 강화'); beep(660, .4, 'triangle', .05, 400); }
      }
    }
    S.gems = S.gems.filter(g => !g.taken);
    for (const fx of S.fx) fx.t += dt;
    S.fx = S.fx.filter(fx => fx.t < (fx.kind === 'lvl' ? .8 : .5));
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

  // ---------- Level up ----------
  function openLevelUp() {
    mode = 'levelup';
    choices = C.rollChoices(S.build);
    ui.kicker.textContent = `LEVEL ${S.level}`; ui.title.textContent = '등불이 밝아졌다'; ui.text.textContent = '하나를 고르세요. (1 · 2 · 3 키)';
    ui.start.hidden = true; ui.choices.hidden = false;
    ui.choices.replaceChildren(...choices.map((c, i) => {
      const d = C.describe(c), btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'lk-choice'; btn.dataset.index = i;
      btn.innerHTML = `<i style="color:${d.color};border-color:${d.color}">${d.icon}</i><span><b></b><em></em><small></small></span>`;
      btn.querySelector('b').textContent = d.name; btn.querySelector('em').textContent = d.tag; btn.querySelector('small').textContent = d.text;
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
    ui.status.textContent = `${C.describe(c).name} ${c.kind === 'heal' ? '' : 'Lv.' + c.level} 획득`;
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
    if (on && mode === 'play') { mode = 'paused'; ui.pause.textContent = '계속하기'; showOverlay('PAUSED', '일시정지', '', '계속하기'); }
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
      `${C.clock(S.t)} 버팀 · Lv.${S.level} · 처치 ${S.kills.toLocaleString('ko-KR')}\n점수 ${score.toLocaleString('ko-KR')}점`, '다시 하기');
    ui.status.textContent = dawn ? '밤을 모두 버텼습니다.' : `${C.clock(S.t)}에 쓰러졌습니다.`;
    beep(dawn ? 520 : 160, .7, 'triangle', .05, dawn ? 400 : -80);
    window.dispatchEvent(new CustomEvent('partygame:score', { detail: { gameId: 'lantern-keeper', score, wave: Math.floor(S.t) } }));
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
    for (const fx of S.fx) if (fx.kind === 'lvl') lights.push([p.x, p.y, 200 + fx.t * 500, 1 - fx.t / .8]);
    const halo = S.build.weapons.halo && C.weaponStats('halo', S.build.weapons.halo, S.mods), orbs = halo ? haloOrbs(halo) : [];
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
      glow(q.x, q.y, q.r * 1.2, '#ff6a2a', .5 * a);
      for (let i = 0; i < 9; i++) {
        const ang = i / 9 * TAU + q.x, d = q.r * (.2 + (i % 3) * .25), fx = q.x + Math.cos(ang) * d, fy = q.y + Math.sin(ang) * d * .6;
        const h = (10 + (i % 4) * 4) * (1 + Math.sin(t * 14 + i * 2.1) * .25) * a;
        ctx.fillStyle = i % 2 ? '#ff7a2a' : '#ffb347'; ctx.globalAlpha = .75; flameTongue(fx, fy, h, 4.5);
        ctx.fillStyle = '#fff1b0'; ctx.globalAlpha = .6; flameTongue(fx, fy, h * .5, 2);
      }
      ctx.globalAlpha = 1;
    }
    for (const gm of S.gems) { if (!inView(gm.x, gm.y)) continue; const c = gm.kind === 'gem' ? gm.def.color : gm.kind === 'tea' ? '#9dffb4' : '#fff2b0'; glow(gm.x, gm.y, gm.kind === 'chest' ? 40 + Math.sin(t * 4) * 6 : gm.r * 3, c, .55); }
    for (const fx of S.fx) if (fx.kind === 'die') glow(fx.x, fx.y, fx.r * 2.2, fx.color, (1 - fx.t / .5) * .5);
    ctx.globalCompositeOperation = 'source-over';
    for (const e of vis) drawEyes(e);
    if (S.boss && !S.boss.dead) { ctx.globalCompositeOperation = 'lighter'; drawBossGlow(S.boss); ctx.globalCompositeOperation = 'source-over'; }
    drawLantern(lp);
    ctx.globalCompositeOperation = 'lighter';
    for (const o of orbs) {
      for (let k = 1; k <= 3; k++) { const a = S.haloA - k * .12, pr = Math.hypot(o.x - p.x, o.y - p.y), base = Math.atan2(o.y - p.y, o.x - p.x) - k * .12; glow(p.x + Math.cos(base) * pr, p.y + Math.sin(base) * pr, 12, '#ffb35c', .35 / k); void a; }
      glow(o.x, o.y, 26 * fl, '#ffd77a', .9); ctx.fillStyle = '#fff4cf'; ctx.beginPath(); ctx.arc(o.x, o.y, 5.5, 0, TAU); ctx.fill();
    }
    for (const s of S.shots) {
      if (s.kind === 'ember') {
        glow(s.x, s.y, 18, '#ffb35c', .9);
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx));
        ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.ellipse(-4, 0, 11, 3.2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.ellipse(0, 0, 6, 2, 0, 0, TAU); ctx.fill(); ctx.restore();
      } else {
        const blink = .6 + .4 * Math.sin(t * 12 + s.wob * 3);
        glow(s.x, s.y, 14, '#b8ff7a', blink); ctx.fillStyle = '#f3ffd0'; ctx.beginPath(); ctx.arc(s.x, s.y, 2.4, 0, TAU); ctx.fill();
      }
    }
    for (const b of S.beams) {
      const a = Math.max(0, b.t < .16 ? b.t / .16 : 1 - (b.t - .16) / .34), w = b.r * (b.t < .16 ? .25 : .7);
      const col = ctx.createLinearGradient(0, b.y - 420, 0, b.y); col.addColorStop(0, 'rgba(255,242,176,0)'); col.addColorStop(1, `rgba(255,242,176,${.85 * a})`);
      ctx.fillStyle = col; ctx.fillRect(b.x - w / 2, b.y - 420, w, 420);
      ctx.fillStyle = `rgba(255,255,255,${.9 * a})`; ctx.fillRect(b.x - w / 6, b.y - 420, w / 3, 420);
      glow(b.x, b.y, b.r * 1.6, '#fff2b0', a);
      if (b.t >= .16) { const k = (b.t - .16) / .34; ctx.strokeStyle = `rgba(255,242,176,${1 - k})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * (.6 + k), b.r * (.3 + k * .5), 0, 0, TAU); ctx.stroke(); }
    }
    for (const f of S.flares) {
      const k = f.t / .45, R = f.R * (.25 + k * .75);
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#7fe8ff'; ctx.lineWidth = 8 * (1 - k) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, R, 0, TAU); ctx.stroke();
      ctx.strokeStyle = '#e8fdff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, R * .8, 0, TAU); ctx.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU + k; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * R * .85, f.y + Math.sin(a) * R * .85); ctx.lineTo(f.x + Math.cos(a) * R * 1.08, f.y + Math.sin(a) * R * 1.08); ctx.stroke(); }
      if (k < .3) glow(f.x, f.y, f.R * .6, '#bff6ff', (.3 - k) * 2);
      ctx.globalAlpha = 1;
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
    // Damage numbers pop, then float
    ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    for (const q of S.texts) {
      const big = typeof q.text === 'number' && q.text >= 30, pop = q.t < .1 ? 1.5 - q.t * 5 : 1;
      ctx.font = `800 ${Math.round((big ? 15 : 12) * pop)}px system-ui,sans-serif`;
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
    ctx.textAlign = 'center'; let x = 56;
    const items = [...Object.entries(S.build.weapons).map(([i, l]) => [C.WEAPONS[i], l, true]), ...Object.entries(S.build.charms).map(([i, l]) => [C.CHARMS[i], l, false])];
    for (const [def, lv, weapon] of items) {
      ctx.fillStyle = weapon ? '#121b2ae6' : '#1a1626e6'; ctx.beginPath(); ctx.roundRect(x - 12, 20, 24, 24, weapon ? 6 : 12); ctx.fill();
      ctx.strokeStyle = def.color + '99'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.font = '700 13px system-ui,sans-serif'; ctx.fillStyle = def.color; ctx.fillText(def.icon, x, 32);
      for (let i = 0; i < C.MAX_LEVEL; i++) { ctx.fillStyle = i < lv ? def.color : '#ffffff26'; ctx.fillRect(x - 10 + i * 4.4, 47, 3, 3); }
      x += 28;
    }
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
    if (mode === 'play') update(dt);
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
    snapshot: () => S && { t: S.t, level: S.level, xp: S.xp, need: S.need, hp: S.player.hp, maxHp: S.mods.maxHp, kills: S.kills, enemies: S.enemies.length, gems: S.gems.length,
      shots: S.shots.length, pools: S.pools.length, beams: S.beams.length, bullets: S.bullets.length, weapons: { ...S.build.weapons }, charms: { ...S.build.charms },
      boss: S.boss && !S.boss.dead ? S.boss.boss : null, player: { x: S.player.x, y: S.player.y }, score: S.score ?? null, pending: S.pending },
    choices: () => choices.map(c => ({ ...c })),
    choose, setGod: on => { god = !!on; },
    setTime: t => { S.t = t; }, addXp: v => gainXp(v),
    spawn: (type, n = 1, dist = 120) => { for (let i = 0; i < n; i++) { const a = i / n * TAU; spawnEnemy(type, S.player.x + Math.cos(a) * dist, S.player.y + Math.sin(a) * dist); } },
    spawnBoss: i => spawnBoss(C.BOSSES[i]), killBoss: () => S.boss && hit(S.boss, S.boss.hp + 1),
    grant: (kind, id, level = 1) => { for (let i = 0; i < level; i++) S.build = C.applyChoice(S.build, { kind, id }); S.mods = C.modifiers(S.build); },
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
