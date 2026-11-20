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
      enemies: [], shots: [], gems: [], pools: [], beams: [], flares: [], texts: [], parts: [], bullets: [],
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
    const e = { ...C.enemyStats(type, S.t), id: S.id++, x, y, kx: 0, ky: 0, flash: 0, haloT: -9, phase: Math.random() * TAU };
    e.maxHp = e.hp; S.enemies.push(e); return e;
  }
  function spawnBoss(def) {
    const { x, y } = edgePoint(10);
    const e = { type: 'boss', boss: def.id, name: def.name, hp: def.hp, maxHp: def.hp, speed: def.speed, r: def.r, damage: def.damage, xp: def.xp, color: def.color,
      id: S.id++, x, y, kx: 0, ky: 0, flash: 0, haloT: -9, phase: 0, skill: 3, dash: 0, tele: 0 };
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
    while (S.xp >= S.need) { S.xp -= S.need; S.level++; S.need = C.xpToNext(S.level); S.pending++; }
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
  const hash = (x, y) => { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  function drawGround(cx, cy) {
    ctx.fillStyle = '#13201b'; ctx.fillRect(cx - view.hw - 2, cy - view.hh - 2, view.hw * 2 + 4, view.hh * 2 + 4);
    const T = 90, x0 = Math.floor((cx - view.hw) / T) - 1, x1 = Math.floor((cx + view.hw) / T) + 1, y0 = Math.floor((cy - view.hh) / T) - 1, y1 = Math.floor((cy + view.hh) / T) + 1;
    for (let tx = x0; tx <= x1; tx++) for (let ty = y0; ty <= y1; ty++) {
      const h = hash(tx, ty), h2 = hash(ty + 7, tx - 3), bx = tx * T, by = ty * T;
      if (h < .22) { ctx.fillStyle = '#18291f'; ctx.beginPath(); ctx.ellipse(bx + h2 * T, by + h * 300 % T, 40 + h2 * 30, 26 + h * 40, 0, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = '#2b4a33'; ctx.lineWidth = 1.4; ctx.beginPath();
      for (let i = 0; i < 3; i++) { const gx = bx + hash(tx * 3 + i, ty) * T, gy = by + hash(tx, ty * 3 + i) * T; ctx.moveTo(gx, gy); ctx.lineTo(gx - 3, gy - 7); ctx.moveTo(gx, gy); ctx.lineTo(gx + 3, gy - 6); }
      ctx.stroke();
      if (h2 > .86) { ctx.fillStyle = '#3a4a46'; ctx.beginPath(); ctx.ellipse(bx + h * T, by + h2 * T * .5, 9, 6, 0, 0, TAU); ctx.fill(); }
      if (h > .93) { ctx.fillStyle = h2 > .5 ? '#c8a6ff' : '#ffe3a1'; ctx.beginPath(); ctx.arc(bx + h2 * T, by + h * T * .7, 2.2, 0, TAU); ctx.fill(); }
      if (h2 < .05) { // old tree stump
        const sx = bx + T * .5, sy = by + T * .5; ctx.fillStyle = '#2a2219'; ctx.beginPath(); ctx.ellipse(sx, sy, 16, 11, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = '#3d3224'; ctx.beginPath(); ctx.ellipse(sx, sy - 2, 10, 6, 0, 0, TAU); ctx.stroke();
      }
    }
  }
  function drawEnemy(e) {
    const flash = e.flash > 0, t = S.t, body = flash ? '#ffffff' : e.color;
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.fillStyle = '#0006'; ctx.beginPath(); ctx.ellipse(0, e.r * .9, e.r * .9, e.r * .35, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = body;
    if (e.type === 'moth' || e.type === 'bat') {
      const flap = Math.sin(t * (e.type === 'bat' ? 22 : 14) + e.id) * .5 + .6;
      ctx.beginPath();
      if (e.type === 'moth') { ctx.ellipse(-e.r * .8, -2, e.r * .9, e.r * flap, -.4, 0, TAU); ctx.ellipse(e.r * .8, -2, e.r * .9, e.r * flap, .4, 0, TAU); }
      else { ctx.moveTo(0, 0); ctx.lineTo(-e.r * 1.6, -e.r * flap); ctx.lineTo(-e.r * .7, e.r * .3); ctx.moveTo(0, 0); ctx.lineTo(e.r * 1.6, -e.r * flap); ctx.lineTo(e.r * .7, e.r * .3); }
      ctx.fill(); ctx.fillStyle = flash ? '#fff' : '#1c1530'; ctx.beginPath(); ctx.ellipse(0, 0, e.r * .45, e.r * .8, 0, 0, TAU); ctx.fill();
    } else if (e.type === 'vine') {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = i / 10 * TAU + Math.sin(t * 2 + e.id) * .1, r = i % 2 ? e.r * .75 : e.r * 1.1; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ctx.fill(); ctx.fillStyle = flash ? '#fff' : '#2c6a49'; ctx.beginPath(); ctx.arc(0, 0, e.r * .6, 0, TAU); ctx.fill();
    } else if (e.type === 'wisp') {
      ctx.globalAlpha = .8; ctx.beginPath(); ctx.moveTo(-e.r, 0); ctx.quadraticCurveTo(-e.r, -e.r * 1.2, 0, -e.r * 1.2); ctx.quadraticCurveTo(e.r, -e.r * 1.2, e.r, 0);
      for (let i = 0; i < 4; i++) ctx.lineTo(e.r - (i + .5) * e.r / 2, e.r * (i % 2 ? .6 : 1.3) + Math.sin(t * 6 + i) * 2);
      ctx.lineTo(-e.r, e.r); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    } else if (e.type === 'golem') {
      ctx.beginPath(); ctx.roundRect(-e.r, -e.r, e.r * 2, e.r * 1.9, e.r * .45); ctx.fill();
      ctx.fillStyle = flash ? '#fff' : '#5e7a48'; ctx.beginPath(); ctx.ellipse(-e.r * .2, -e.r * .85, e.r * .8, e.r * .35, 0, 0, TAU); ctx.fill();
    } else drawBoss(e, flash);
    ctx.restore();
  }
  function drawBoss(e, flash) {
    const r = e.r, t = S.t;
    if (e.boss === 'treant') {
      ctx.fillStyle = flash ? '#fff' : '#4a3626'; ctx.beginPath(); ctx.roundRect(-r * .55, -r * .9, r * 1.1, r * 1.8, r * .2); ctx.fill();
      ctx.fillStyle = flash ? '#fff' : e.color; for (const [x, y, s] of [[-r * .6, -r * 1, .65], [r * .6, -r * 1, .65], [0, -r * 1.35, .8]]) { ctx.beginPath(); ctx.arc(x, y, r * s, 0, TAU); ctx.fill(); }
    } else if (e.boss === 'crow') {
      const flap = e.tele > 0 ? .2 : Math.sin(t * 8) * .5 + .6;
      ctx.fillStyle = flash ? '#fff' : e.color; ctx.beginPath(); ctx.moveTo(0, -r * .2); ctx.lineTo(-r * 1.9, -r * flap); ctx.lineTo(-r * .6, r * .5); ctx.lineTo(0, r * .2); ctx.lineTo(r * .6, r * .5); ctx.lineTo(r * 1.9, -r * flap); ctx.closePath(); ctx.fill();
      ctx.fillStyle = flash ? '#fff' : '#241c3a'; ctx.beginPath(); ctx.ellipse(0, 0, r * .45, r * .75, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e6b84a'; ctx.beginPath(); ctx.moveTo(-5, -r * .55); ctx.lineTo(5, -r * .55); ctx.lineTo(0, -r * .9); ctx.fill();
      if (e.tele > 0) { ctx.strokeStyle = '#ff6a5f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r * 1.3, 0, TAU); ctx.stroke(); }
    } else {
      ctx.fillStyle = '#7b6cff33'; ctx.beginPath(); ctx.arc(0, 0, r * 1.35 + Math.sin(t * 3) * 4, 0, TAU); ctx.fill();
      ctx.fillStyle = flash ? '#fff' : '#120c26'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#b9a8ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    }
  }
  function drawEyes(e) {
    const r = e.r, boss = e.type === 'boss', y = e.boss === 'treant' ? -r * .4 : e.type === 'golem' ? -r * .2 : -r * .15, gap = r * (boss ? .3 : .32);
    ctx.fillStyle = boss ? '#ff5a4a' : e.type === 'wisp' ? '#e8fbff' : '#ffe9a0';
    ctx.beginPath(); ctx.arc(e.x - gap, e.y + y, boss ? 4 : 1.8, 0, TAU); ctx.arc(e.x + gap, e.y + y, boss ? 4 : 1.8, 0, TAU); ctx.fill();
  }
  function drawPlayer() {
    const p = S.player, bob = p.moving ? Math.sin(p.walk) * 1.5 : 0;
    if (p.inv > 0 && Math.floor(p.inv * 20) % 2) return;
    ctx.save(); ctx.translate(p.x, p.y + bob);
    ctx.fillStyle = '#0007'; ctx.beginPath(); ctx.ellipse(0, 13 - bob, 11, 4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2e6a73'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.quadraticCurveTo(12, -10, 11, 12); ctx.lineTo(-11, 12); ctx.quadraticCurveTo(-12, -10, 0, -18); ctx.fill();
    ctx.fillStyle = '#1d3d45'; ctx.beginPath(); ctx.arc(0, -8, 7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f1d6b0'; ctx.beginPath(); ctx.arc(p.face * 2, -7, 4.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function lanternPos() { const p = S.player, sw = Math.sin(S.t * 3) * 2; return { x: p.x + p.face * 12, y: p.y + 2 + sw }; }
  function glow(x, y, r, color, a = 1) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'transparent');
    ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!S) { drawIdle(); return; }
    const p = S.player;
    let cx = p.x, cy = p.y;
    if (shake > 0 && !reduceMotion) { cx += (Math.random() - .5) * 10 * shake; cy += (Math.random() - .5) * 10 * shake; }
    ctx.setTransform(view.k, 0, 0, view.k, canvas.width / 2 - cx * view.k, canvas.height / 2 - cy * view.k);
    drawGround(cx, cy);
    const inView = (x, y, m = 60) => Math.abs(x - cx) < view.hw + m && Math.abs(y - cy) < view.hh + m;
    for (const q of S.pools) { if (!inView(q.x, q.y)) continue; const a = Math.min(1, (q.life - q.t) * 2); ctx.globalAlpha = .28 * a; ctx.fillStyle = '#ff6a2a'; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    for (const e of S.enemies) if (inView(e.x, e.y)) drawEnemy(e);
    drawPlayer();
    // Night: darkness with the lantern's pool of light; it lifts as dawn approaches.
    const lp = lanternPos(), night = S.t > 520 ? .8 - (S.t - 520) / 80 * .55 : .8;
    const g = ctx.createRadialGradient(lp.x, lp.y, 90, lp.x, lp.y, 360);
    g.addColorStop(0, 'rgba(4,6,16,0)'); g.addColorStop(1, `rgba(4,6,16,${night})`);
    ctx.fillStyle = g; ctx.fillRect(cx - view.hw - 2, cy - view.hh - 2, view.hw * 2 + 4, view.hh * 2 + 4);
    ctx.globalCompositeOperation = 'lighter';
    glow(lp.x, lp.y, 60, '#ffb35c55');
    for (const q of S.pools) if (inView(q.x, q.y)) glow(q.x, q.y, q.r * 1.1, '#ff6a2a26', Math.min(1, (q.life - q.t) * 2));
    for (const gm of S.gems) { if (!inView(gm.x, gm.y)) continue; const c = gm.kind === 'gem' ? gm.def.color : gm.kind === 'tea' ? '#9dffb4' : '#fff2b0'; glow(gm.x, gm.y, gm.r * 3, c + '66'); }
    ctx.globalCompositeOperation = 'source-over';
    for (const gm of S.gems) {
      if (!inView(gm.x, gm.y)) continue;
      if (gm.kind === 'gem') { ctx.fillStyle = gm.def.color; ctx.beginPath(); ctx.moveTo(gm.x, gm.y - gm.r); ctx.lineTo(gm.x + gm.r * .7, gm.y); ctx.lineTo(gm.x, gm.y + gm.r); ctx.lineTo(gm.x - gm.r * .7, gm.y); ctx.fill(); }
      else if (gm.kind === 'tea') { ctx.fillStyle = '#e8d2b0'; ctx.fillRect(gm.x - 6, gm.y - 5, 12, 10); ctx.fillStyle = '#9dffb4'; ctx.fillRect(gm.x - 4, gm.y - 4, 8, 3); }
      else { ctx.fillStyle = '#8a5a2a'; ctx.fillRect(gm.x - 11, gm.y - 8, 22, 16); ctx.fillStyle = '#ffd77a'; ctx.fillRect(gm.x - 11, gm.y - 2, 22, 3); ctx.fillRect(gm.x - 2, gm.y - 8, 4, 16); }
    }
    for (const e of S.enemies) if (inView(e.x, e.y)) drawEyes(e);
    // Lantern
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(lp.x - 4, lp.y - 5, 8, 10); ctx.fillStyle = '#ffd77a'; ctx.fillRect(lp.x - 2.5, lp.y - 3, 5, 6);
    ctx.globalCompositeOperation = 'lighter';
    const halo = S.build.weapons.halo && C.weaponStats('halo', S.build.weapons.halo, S.mods);
    if (halo) for (const o of haloOrbs(halo)) { glow(o.x, o.y, 22, '#ffd77a88'); ctx.fillStyle = '#fff1c4'; ctx.beginPath(); ctx.arc(o.x, o.y, 6, 0, TAU); ctx.fill(); }
    for (const s of S.shots) {
      if (s.kind === 'ember') { glow(s.x, s.y, 14, '#ffb35c99'); ctx.strokeStyle = '#ffe0a8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * .03, s.y - s.vy * .03); ctx.stroke(); }
      else { glow(s.x, s.y, 12, '#b8ff7a88'); ctx.fillStyle = '#eaffc8'; ctx.beginPath(); ctx.arc(s.x, s.y, 2.6, 0, TAU); ctx.fill(); }
    }
    for (const b of S.beams) {
      const a = b.t < .16 ? b.t / .16 : 1 - (b.t - .16) / .34;
      ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = '#fff2b0'; ctx.fillRect(b.x - b.r * .35, b.y - 400, b.r * .7, 400);
      glow(b.x, b.y, b.r * 1.4, '#fff2b0aa'); ctx.globalAlpha = 1;
    }
    for (const f of S.flares) { const k = f.t / .45; ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#7fe8ff'; ctx.lineWidth = 6 * (1 - k) + 1; ctx.beginPath(); ctx.arc(f.x, f.y, f.R * (.3 + k * .7), 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    for (const q of S.parts) { ctx.globalAlpha = 1 - q.t / q.life; ctx.fillStyle = q.color; ctx.fillRect(q.x - q.r / 2, q.y - q.r / 2, q.r, q.r); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    for (const q of S.bullets) { ctx.fillStyle = '#2a1850'; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill(); ctx.strokeStyle = '#c8b0ff'; ctx.lineWidth = 2; ctx.stroke(); }
    ctx.font = '700 12px system-ui,sans-serif'; ctx.textAlign = 'center';
    for (const q of S.texts) { ctx.globalAlpha = 1 - q.t / .7; ctx.fillStyle = '#000a'; ctx.fillText(q.text, q.x + 1, q.y + 1); ctx.fillStyle = q.color; ctx.fillText(q.text, q.x, q.y); }
    ctx.globalAlpha = 1;
    // Player HP bar
    const hpw = 34, hpr = p.hp / S.mods.maxHp;
    ctx.fillStyle = '#000a'; ctx.fillRect(p.x - hpw / 2, p.y + 18, hpw, 4); ctx.fillStyle = hpr > .35 ? '#7dffb2' : '#ff6a5f'; ctx.fillRect(p.x - hpw / 2, p.y + 18, hpw * hpr, 4);
    drawHud();
  }
  function drawHud() {
    const { dpr, cw, ch } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0a0f1c'; ctx.fillRect(0, 0, cw, 8);
    ctx.fillStyle = '#ffcf6a'; ctx.fillRect(0, 0, cw * Math.min(1, S.xp / S.need), 8);
    ctx.textBaseline = 'top'; ctx.fillStyle = '#fff'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4;
    ctx.font = '800 22px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText(C.clock(S.t), cw / 2, 16);
    ctx.font = '700 13px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.fillText(`Lv.${S.level}`, 12, 18);
    ctx.textAlign = 'right'; ctx.fillText(`처치 ${S.kills.toLocaleString('ko-KR')}`, cw - 12, 18);
    // Carried arts and charms
    ctx.textAlign = 'center'; ctx.font = '700 13px system-ui,sans-serif';
    let x = 22;
    for (const [id, lv] of [...Object.entries(S.build.weapons).map(([i, l]) => [C.WEAPONS[i], l]), ...Object.entries(S.build.charms).map(([i, l]) => [C.CHARMS[i], l])]) {
      ctx.fillStyle = '#0a0f1ccc'; ctx.fillRect(x - 11, 40, 22, 22); ctx.fillStyle = id.color; ctx.fillText(id.icon, x, 44);
      ctx.font = '700 8px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(lv, x + 8, 56); ctx.font = '700 13px system-ui,sans-serif';
      x += 25;
    }
    ctx.shadowBlur = 0;
    if (bannerT > 0) { ctx.globalAlpha = Math.min(1, bannerT); ctx.font = '800 20px system-ui,sans-serif'; ctx.fillStyle = '#000a'; ctx.fillText(bannerText, cw / 2 + 1, ch * .22 + 1); ctx.fillStyle = '#ffe2a8'; ctx.fillText(bannerText, cw / 2, ch * .22); ctx.globalAlpha = 1; }
    const boss = S.boss && !S.boss.dead ? S.boss : null;
    if (boss) {
      const w = Math.min(360, cw - 40);
      ctx.fillStyle = '#000b'; ctx.fillRect((cw - w) / 2, ch - 30, w, 12); ctx.fillStyle = '#c86cff'; ctx.fillRect((cw - w) / 2, ch - 30, w * Math.max(0, boss.hp / boss.maxHp), 12);
      ctx.font = '700 11px system-ui,sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(boss.name, cw / 2, ch - 46);
      // Arrow toward an off-screen boss
      const sx = (boss.x - S.player.x) * view.k / dpr, sy = (boss.y - S.player.y) * view.k / dpr;
      if (Math.abs(sx) > cw / 2 || Math.abs(sy) > ch / 2) {
        const a = Math.atan2(sy, sx), ex = cw / 2 + Math.cos(a) * (Math.min(cw, ch) / 2 - 26), ey = ch / 2 + Math.sin(a) * (Math.min(cw, ch) / 2 - 26);
        ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = '#ff6a5f'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -8); ctx.lineTo(-8, 8); ctx.fill(); ctx.restore();
      }
    }
    if (stick) {
      ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(stick.ox, stick.oy, 40, 0, TAU); ctx.stroke();
      ctx.fillStyle = '#ffffff55'; ctx.beginPath(); ctx.arc(stick.ox + stick.dx * 40, stick.oy + stick.dy * 40, 16, 0, TAU); ctx.fill();
    }
    ctx.textBaseline = 'alphabetic';
  }
  const idle = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), p: Math.random() * TAU }));
  function drawIdle() {
    const { dpr, cw, ch } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0b1310'; ctx.fillRect(0, 0, cw, ch);
    const t = performance.now() / 1000;
    ctx.globalCompositeOperation = 'lighter';
    for (const f of idle) glow(f.x * cw + Math.sin(t + f.p) * 12, f.y * ch + Math.cos(t * .7 + f.p) * 10, 10, '#ffd77a55');
    glow(cw / 2, ch * .62, 140, '#ffb35c33');
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
