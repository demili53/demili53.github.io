// Missile Rush game loop. The fleet auto-fires; the player only steers it through operator gate rows
// (+n, −n, ×n, ÷n) that change the unit count, and unit count is firepower.
// Rules live in missile-rush-core.js, drawing in missile-rush-render.js; this file owns state, simulation, input and DOM.
(() => {
  const C = window.MissileRushCore;
  const W = C.FIELD.w, H = C.FIELD.h, LINE = C.FIELD.line;
  const GATE_H = 44, SOLO_W = 100, STEP = 1 / 60;
  const canvas = document.getElementById('rushCanvas');
  const view = window.MissileRushRender(canvas, C, { GATE_H, SOLO_W });
  const $ = id => document.getElementById(id);
  const ui = {
    wave: $('waveHud'), units: $('unitsHud'), power: $('powerHud'), score: $('scoreHud'), unitBar: $('unitBar'), unitText: $('unitText'),
    overlay: $('rushOverlay'), kicker: $('overlayKicker'), title: $('overlayTitle'), text: $('overlayText'), start: $('startRush'),
    pause: $('pauseRush'), status: $('rushStatus'), tier: $('tierName'), weapon: $('weaponName'), weaponDesc: $('weaponDesc'),
    stats: $('weaponStats'), best: $('rushBest'), banner: $('rushBanner'), sound: $('rushSound'), motion: $('rushMotion')
  };
  const BEST_KEY = 'partygame.missileRush.best';
  const readBest = () => { try { return { score: 0, wave: 0, peak: 0, ...JSON.parse(localStorage.getItem(BEST_KEY)) }; } catch { return { score: 0, wave: 0, peak: 0 }; } };
  const writeBest = v => { try { localStorage.setItem(BEST_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  let S = null;            // run state, null before the first game
  let mode = 'ready';      // ready | play | paused | over | frozen (test only)
  let last = 0, acc = 0, hudTimer = 0, drag = null;
  const keys = new Set();

  function fresh() {
    return {
      time: 0, player: { x: W / 2, y: 660, vx: 0, vy: 0, inv: 0 },
      units: C.START_UNITS, shown: C.START_UNITS, peak: C.START_UNITS, tier: 1, weapon: 'missile', wlevels: { missile: 1 },
      score: 0, kills: 0, combo: 0, comboTimer: 0, bestCombo: 0, caught: 0,
      wave: 0, script: null, cursor: 0, waveT: 0, looped: false, hold: false, intermission: 0.6, pending: [],
      rows: [], crates: [], enemies: [], shots: [], bullets: [], bolts: [], parts: [], texts: [], ripples: [],
      fireTimer: 0, beam: null, recoil: 0, pulse: 0, warn: 0, freeze: 0, bannerTimer: 0,
      fx: { shake: 0, flash: 0, flashColor: '#ffffff' }
    };
  }
  const stats = () => C.squadStats(S.units, S.tier, S.weapon, S.wlevels[S.weapon]);

  // ---------- Audio (generated, optional) ----------
  let audio = null, lastShot = 0;
  function beep(freq, dur, type = 'square', vol = .04, slide = 0) {
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

  // ---------- Effects ----------
  const part = p => { if (S.parts.length < 700) S.parts.push(p); };
  function burst(x, y, color, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = 40 + Math.random() * 220; part({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: .5 + Math.random() * .4, max: .9, r: 1.5 + Math.random() * 3, color }); } }
  function spark(x, y, color) { for (let i = 0; i < 3; i++) part({ x, y, vx: (Math.random() - .5) * 160, vy: (Math.random() - .5) * 160, life: .2, max: .2, r: 1.8, color }); }
  function blastFx(x, y, r, color) { part({ x, y, vx: 0, vy: 0, life: .34, max: .34, r, color, ring: true }); part({ x, y, vx: 0, vy: 0, life: .22, max: .22, r: r * 1.5, color, flash: true }); }
  function debris(x, y, color, n, r) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, sp = 60 + Math.random() * 200; part({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: .6 + Math.random() * .5, max: 1.1, r: 2 + Math.random() * Math.min(5, r / 5), color, chunk: true, rot: Math.random() * 6, spin: (Math.random() - .5) * 14 }); }
    for (let i = 0; i < Math.min(8, 2 + r / 8); i++) part({ x: x + (Math.random() - .5) * r, y: y + (Math.random() - .5) * r, vx: (Math.random() - .5) * 40, vy: -20 - Math.random() * 30, life: .7 + Math.random() * .5, max: 1.2, r: r * (.5 + Math.random() * .5), color: '#1a2233', smoke: true });
  }
  function floatText(x, y, text, color, size) { if (S.texts.length < 30) S.texts.push({ x, y, text, color, size: size || 13, life: .9 }); }
  const shake = v => { S.fx.shake = Math.max(S.fx.shake, v); };
  const flash = (a, color) => { S.fx.flash = Math.max(S.fx.flash, a); S.fx.flashColor = color; };
  function say(text) { ui.status.textContent = text; }
  function banner(text, time = 2) { ui.banner.hidden = true; void ui.banner.offsetWidth; ui.banner.textContent = text; ui.banner.hidden = false; S.bannerTimer = time; }

  // ---------- Waves ----------
  function startWave(n) {
    S.wave = n; S.script = C.buildWave(n); S.cursor = 0; S.waveT = 0; S.looped = false; S.pending = []; S.intermission = 0;
    const boss = S.script.boss ? C.bossFor(n) : null;
    banner(boss ? `WAVE ${n} · ${boss.name}` : `WAVE ${n}`);
    say(boss ? `${boss.name} 접근! ${boss.hint}.` : `${n}웨이브 · 적 ${S.script.enemies}기`);
  }
  function runEvent(ev) {
    if (S.looped && (ev.kind === 'boss' || ev.kind === 'crate')) return;
    if (ev.kind === 'gates') dropRow(ev.lanes);
    else if (ev.kind === 'crate') dropCrate();
    else if (ev.kind === 'boss') { spawn('boss'); S.warn = 2.6; beep(110, .5, 'sawtooth', .05, 60); }
    else for (const s of ev.spawns) S.pending.push({ t: S.waveT + s.d, type: s.type, x: 26 + s.x * (W - 52) });
  }
  function stepTimeline(dt) {
    if (S.intermission > 0) { S.intermission -= dt; if (S.intermission <= 0) startWave(S.wave + 1); return; }
    if (S.hold) return;
    S.waveT += dt;
    const ev = S.script.events;
    while (S.cursor < ev.length && ev[S.cursor].t <= S.waveT) runEvent(ev[S.cursor++]);
    for (const p of S.pending) if (!p.done && p.t <= S.waveT) { p.done = true; spawn(p.type, p.x); }
    if (S.pending.length && S.pending.every(p => p.done)) S.pending = [];
    const bossAlive = S.enemies.some(e => e.type === 'boss' && !e.dead);
    if (S.cursor >= ev.length && bossAlive && S.waveT > S.script.duration) { // keep the boss fight supplied
      S.looped = true; S.waveT = S.script.loopFrom; S.cursor = ev.findIndex(e => e.t >= S.script.loopFrom);
    }
    if (S.cursor >= ev.length && !S.pending.length && !S.enemies.length && !S.rows.some(r => !r.solo)) {
      const bonus = S.wave * 60;
      S.score += bonus; S.intermission = 1.8;
      banner(`WAVE ${S.wave} 클리어 +${bonus}`, 1.6); beep(520, .3, 'triangle', .04, 400);
    }
  }
  function spawn(type, x, y) {
    const st = C.enemyStats(type, S.wave);
    const e = { type, x: x ?? W / 2, y: y ?? -st.r - 4, hp: st.hp, maxHp: st.hp, speed: st.speed, r: st.r, score: st.score, color: st.color, name: C.ENEMIES[type].name, t: Math.random() * 6, age: 0, bank: 0, flash: 0, fire: 1.2 + Math.random() * 1.4, dir: Math.random() < .5 ? -1 : 1, phase: 'in', timer: 0, tx: 0 };
    if (type === 'boss') { const b = C.bossFor(S.wave); Object.assign(e, { x: W / 2, boss: b.id, name: b.name, fire: 2.2, summon: 4, burst: 0, alt: 1, dash: 6, phase: 'hover', hitCd: 0 }); }
    S.enemies.push(e);
    return e;
  }
  function dropRow(lanes, gates) {
    const row = { y: -GATE_H, vy: 96 + Math.min(60, S.wave * 2.5), lanes, age: 0, gates: (gates || C.rollRow(S.wave, S.units, lanes)).map(g => ({ ...g, dmg: 0, flash: 0 })) };
    S.rows.push(row);
    return row;
  }
  // A single loose gate (thrown by the divider boss): only costs units if the fleet is under it.
  function dropSolo(gate, x, y, vy) { S.rows.push({ y, vy, lanes: 1, solo: clamp(x, SOLO_W / 2, W - SOLO_W / 2), age: 0, gates: [{ ...gate, shifts: C.MAX_SHIFTS, dmg: 0, flash: 0 }] }); }
  const gateSpan = (row, i) => row.solo ? [row.solo - SOLO_W / 2, row.solo + SOLO_W / 2] : [i * W / row.lanes, (i + 1) * W / row.lanes];
  function gateAt(row, x) { for (let i = 0; i < row.gates.length; i++) { const [a, b] = gateSpan(row, i); if (x >= a && x < b) return i; } return row.solo ? -1 : C.laneOf(x, row.lanes); }
  function dropCrate(id, x, y) { S.crates.push({ id: id || C.rollWeapon(S.weapon), x: x ?? 60 + Math.random() * (W - 120), y: y ?? -24, vy: 86, t: Math.random() * 6 }); }

  // ---------- Fleet ----------
  function setUnits(n, reason) {
    const before = S.units;
    S.units = C.clampUnits(n); S.peak = Math.max(S.peak, S.units); S.pulse = .35;
    const d = S.units - before;
    if (d) floatText(S.player.x, S.player.y - stats().radius - 30, (d > 0 ? '+' : '') + d + '기', d > 0 ? '#9dffb4' : '#ff8f86', 15);
    if (reason) say(reason);
    if (S.units <= 0) gameOver();
  }
  function loseUnits(n, reason) {
    if (n <= 0 || mode !== 'play') return;
    S.combo = 0;
    shake(6 + Math.min(10, n * 2)); flash(.22, '#ff3b3b');
    burst(S.player.x, S.player.y, '#ff8a7a', 10 + n * 3);
    beep(120, .25, 'square', .05, -60);
    setUnits(S.units - n, `${reason} 유닛 -${n}`);
  }
  function passGate(row, i) {
    const gate = row.gates[i], before = S.units, after = C.applyOperator(before, gate), good = after >= before;
    const [a, b] = gateSpan(row, i), cx = (a + b) / 2, color = good ? '#9dffb4' : '#ff8f86';
    row.dead = true; S.caught++;
    burst(cx, row.y, color, 22); blastFx(cx, row.y, 70, color);
    beep(good ? 700 : 200, good ? .2 : .3, 'triangle', .05, good ? 500 : -120);
    if (good) { S.score += Math.max(0, after - before) * 5; S.freeze = Math.max(S.freeze, .03); } else { shake(8); S.combo = 0; }
    banner(`${C.gateLabel(gate)} · ${before} → ${after}기`, .9);
    setUnits(after, `${C.OPERATORS[gate.op].name} 관문 ${C.gateLabel(gate)} 통과 · ${before}기 → ${after}기`);
    renderLoadout();
  }
  function catchCrate(c) {
    const r = C.pickWeapon({ weapon: S.weapon, levels: S.wlevels }, c.id), w = C.WEAPONS[c.id], swapped = S.weapon !== r.weapon;
    S.weapon = r.weapon; S.wlevels = r.levels; S.beam = null; S.fireTimer = 0;
    c.dead = true; S.score += 30;
    burst(c.x, c.y, w.color, 20); blastFx(c.x, c.y, 60, w.color); beep(520, .25, 'triangle', .05, 700);
    const lv = S.wlevels[S.weapon];
    banner(swapped ? `${w.name} Lv.${lv}` : r.leveled ? `${w.name} 강화 Lv.${lv}` : `${w.name} 최대 · 증원 +${r.bonus}`, 1.2);
    say(swapped ? `${w.name}(으)로 교체. ${w.desc}.` : r.leveled ? `${w.name} Lv.${lv} 강화. 피해 +20%.` : `${w.name} 최대 레벨. 증원 ${r.bonus}기.`);
    if (r.bonus) setUnits(S.units + r.bonus);
    renderLoadout();
  }

  // ---------- Weapons ----------
  function fire() {
    const st = stats(), p = S.player, n = st.count;
    if (!n) return;
    S.recoil = 1;
    if (st.beam) return fireBeam(st);
    if (st.chain) return fireChain(st);
    const y0 = p.y - st.radius * .6 - 10;
    if (st.wave) {
      S.shots.push({ kind: 'wave', x: p.x, y: y0, vx: 0, vy: -st.speed, w: 18, maxW: st.wave, dmg: st.damage, hit: new Set(), color: st.color, r: 6 });
      part({ x: p.x, y: y0, vx: 0, vy: 0, life: .1, max: .1, r: 26, color: st.color, flash: true });
    } else {
      const width = Math.min(st.radius * 1.6, n * 9);
      for (let i = 0; i < n; i++) {
        const k = n === 1 ? 0 : i / (n - 1) - .5;
        const a = -Math.PI / 2 + (st.spread ? k * st.spread * 2 : st.homing ? k * 1.1 : 0);
        const m = { kind: st.weapon, x: p.x + k * width, y: y0, vx: Math.cos(a) * st.speed + (st.spread || st.homing ? 0 : k * 40), vy: Math.sin(a) * st.speed, dmg: st.damage, pierce: st.pierce, homing: st.homing, blast: st.blast, hit: new Set(), r: (st.blast ? 6 : st.spread ? 3 : 3.5) + S.tier * .6 + Math.min(3, st.damage / 8), color: st.color };
        if (st.spread) m.life = .85; // pellets fade out, so the shotgun rewards getting close
        S.shots.push(m);
        if (i % 2 === 0 || n < 5) part({ x: m.x, y: m.y + 4, vx: 0, vy: 0, life: .09, max: .09, r: 15, color: st.color, flash: true });
      }
    }
    if (S.time - lastShot > .09) { beep((st.blast ? 240 : st.wave ? 320 : 520) + S.tier * 60, .06, 'triangle', .025, -260); lastShot = S.time; }
  }
  // The lowest bendable gate over a column soaks up shots aimed through it.
  function blockerAt(x, half, below) {
    let best = null;
    for (const row of S.rows) {
      if (row.dead || row.y >= below) continue;
      for (let i = 0; i < row.gates.length; i++) { const [a, b] = gateSpan(row, i); if (x + half > a && x - half < b && C.shiftable(row.gates[i]) && (!best || row.y > best.row.y)) best = { row, i }; }
    }
    return best;
  }
  function hitGate(row, i, dmg, st) {
    const g = row.gates[i], cost = C.shiftCost(st.dps, S.wave);
    g.flash = .06; g.dmg += dmg;
    if (g.dmg < cost) return;
    g.dmg -= cost;
    const prev = C.gateLabel(g), [a, b] = gateSpan(row, i);
    Object.assign(g, C.shiftGate(g));
    floatText((a + b) / 2, row.y - GATE_H / 2 - 6, `${prev} → ${C.gateLabel(g)}`, '#ffe27a');
    beep(880, .06, 'sine', .03, 200);
  }
  function fireBeam(st) {
    const p = S.player, half = st.beam / 2, block = blockerAt(p.x, half, p.y), top = block ? block.row.y : -10;
    for (const e of S.enemies) if (!e.dead && e.y < p.y && e.y + e.r > top && Math.abs(e.x - p.x) < e.r + half) { damage(e, st.damage); if (Math.random() < .3) spark(p.x + (Math.random() - .5) * st.beam, e.y + e.r * .6, st.color); }
    if (block) hitGate(block.row, block.i, st.damage, st);
    S.beam = { top: block ? top + GATE_H / 2 : -10, w: st.beam, color: st.color, life: .14 };
    if (S.time - lastShot > .2) { beep(900 + S.tier * 40, .12, 'sawtooth', .012, -100); lastShot = S.time; }
  }
  // Lightning: instant bolts to the nearest enemies, each jumping on to neighbours for 60% damage.
  function fireChain(st) {
    const p = S.player, y0 = p.y - st.radius * .6;
    const near = S.enemies.filter(e => !e.dead && e.y > -10 && e.y < p.y + 10).sort((a, b) => ((a.x - p.x) ** 2 + (a.y - p.y) ** 2) - ((b.x - p.x) ** 2 + (b.y - p.y) ** 2));
    const block = blockerAt(p.x, 8, p.y);
    if (block && (!near.length || block.row.y > near[0].y)) { // a gate straight overhead takes the volley
      hitGate(block.row, block.i, st.damage * st.count, st);
      S.bolts.push({ pts: [[p.x, y0], [p.x, block.row.y + GATE_H / 2]], life: .14, color: st.color });
      return;
    }
    const used = new Set();
    for (let k = 0; k < st.count && k < near.length; k++) {
      let cur = near[k], dmg = st.damage;
      const pts = [[p.x + (k - (st.count - 1) / 2) * 12, y0]];
      for (let j = 0; cur && j <= st.chain; j++) {
        used.add(cur); pts.push([cur.x, cur.y]); damage(cur, dmg); spark(cur.x, cur.y, st.color); dmg *= .6;
        let next = null, bd = 130 * 130;
        for (const e of S.enemies) { if (e.dead || used.has(e)) continue; const d = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2; if (d < bd) { bd = d; next = e; } }
        cur = next;
      }
      S.bolts.push({ pts, life: .14, color: st.color });
    }
    if (near.length && S.time - lastShot > .15) { beep(1300, .08, 'square', .018, -900); lastShot = S.time; }
  }
  function damage(e, amount) { e.hp -= amount; e.flash = .08; if (e.hp <= 0 && !e.dead) kill(e); }
  function kill(e) {
    const boss = e.type === 'boss';
    e.dead = true; S.kills++; S.combo++; S.comboTimer = 2.5; S.bestCombo = Math.max(S.bestCombo, S.combo);
    S.score += Math.round(e.score * C.comboMultiplier(S.combo));
    burst(e.x, e.y, e.color, boss ? 70 : 12 + e.r * .6); blastFx(e.x, e.y, e.r * (boss ? 3.2 : 2.2), e.color); debris(e.x, e.y, e.color, boss ? 26 : Math.round(3 + e.r / 5), e.r);
    if (S.combo >= 5 && S.combo % 5 === 0) floatText(e.x, e.y - e.r - 8, `${S.combo} COMBO`, '#ffe27a', 14);
    shake(boss ? 16 : e.r > 18 ? 4 : 0);
    beep(boss ? 90 : 180 + Math.random() * 60, boss ? .7 : .14, 'sawtooth', .035, -120);
    if (e.type === 'splitter') for (const s of [-1, 1]) { const sh = spawn('shard', e.x + s * 12, e.y); sh.dir = s; }
    if (boss) {
      flash(.5, '#ffffff'); S.freeze = .12;
      for (let i = 0; i < 5; i++) blastFx(e.x + (Math.random() - .5) * e.r * 2, e.y + (Math.random() - .5) * e.r, e.r * (1 + Math.random()), '#ffd27a');
      for (const o of S.enemies) if (!o.dead && o !== e) { o.dead = true; burst(o.x, o.y, o.color, 8); }
      S.bullets = []; S.pending = []; S.cursor = S.script ? S.script.events.length : 0;
      S.score += 500 * S.wave;
      const evolved = S.tier < C.EVOLUTIONS.length;
      if (evolved) S.tier++;
      banner(evolved ? `탄두 진화 · ${C.evolution(S.tier).name}` : '보스 격파');
      setUnits(S.units + C.BOSS_REWARD_UNITS, `${e.name} 격파! ${evolved ? C.evolution(S.tier).name + '(으)로 진화, ' : ''}증원 ${C.BOSS_REWARD_UNITS}기와 무기 상자 도착.`);
      dropCrate(undefined, e.x, e.y); beep(330, .5, 'triangle', .05, 600);
      renderLoadout();
    }
  }

  // ---------- Simulation ----------
  function step(dt) {
    S.time += dt;
    const p = S.player;
    // steering: keys ease toward a target speed so the fleet has weight; dragging sets position directly
    const kx = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
    const ky = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
    p.vx += (kx * 420 - p.vx) * Math.min(1, dt * 14); p.vy += (ky * 320 - p.vy) * Math.min(1, dt * 14);
    p.x += p.vx * dt; p.y += p.vy * dt; clampPlayer();
    if (p.inv > 0) p.inv -= dt;
    if (S.pulse > 0) S.pulse -= dt;
    if (S.recoil > 0) S.recoil = Math.max(0, S.recoil - dt * 9);
    if (S.warn > 0) S.warn -= dt;
    if (S.comboTimer > 0 && (S.comboTimer -= dt) <= 0) S.combo = 0;
    S.shown += (S.units - S.shown) * Math.min(1, dt * 10);
    let st = stats();

    S.fireTimer -= dt;
    if (S.fireTimer <= 0) { fire(); S.fireTimer = Math.max(0, S.fireTimer + st.interval); }
    if (S.beam && (S.beam.life -= dt) <= 0) S.beam = null;
    stepTimeline(dt);

    // gate rows
    for (const row of S.rows) {
      row.y += row.vy * dt; row.age += dt;
      for (const g of row.gates) if (g.flash > 0) g.flash -= dt;
      if (Math.abs(row.y - p.y) < GATE_H / 2 + 4) { const i = gateAt(row, p.x); if (i >= 0) { passGate(row, i); if (mode === 'over') return; st = stats(); } }
      if (row.y - GATE_H > H) row.dead = true;
    }
    // weapon crates
    for (const c of S.crates) {
      c.y += c.vy * dt; c.t += dt;
      if ((c.x - p.x) ** 2 + (c.y - p.y) ** 2 < (st.radius * .8 + 20) ** 2) { catchCrate(c); st = stats(); }
      else if (c.y > H + 30) c.dead = true;
    }
    stepShots(dt, st);
    stepEnemies(dt, st);
    if (mode === 'over') return;
    st = stats();
    for (const b of S.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.r + st.radius * .7) ** 2) { b.dead = true; if (p.inv <= 0) { p.inv = .3; loseUnits(1, '피격!'); if (mode === 'over') return; st = stats(); } }
      if (b.y > H + 12 || b.x < -12 || b.x > W + 12) b.dead = true;
    }
    for (const q of S.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .94; q.vy *= .94; q.life -= dt; if (q.chunk) { q.rot += q.spin * dt; q.vy += 260 * dt; } }
    for (const t of S.texts) { t.y -= 30 * dt; t.life -= dt; }
    for (const b of S.bolts) b.life -= dt;
    for (const r of S.ripples) r.life -= dt;
    const alive = o => !o.dead, lit = o => o.life > 0;
    S.rows = S.rows.filter(alive); S.crates = S.crates.filter(alive); S.shots = S.shots.filter(alive); S.enemies = S.enemies.filter(alive); S.bullets = S.bullets.filter(alive);
    S.parts = S.parts.filter(lit); S.texts = S.texts.filter(lit); S.bolts = S.bolts.filter(lit); S.ripples = S.ripples.filter(lit);
    if (S.bannerTimer > 0 && (S.bannerTimer -= dt) <= 0) ui.banner.hidden = true;
  }
  function clampPlayer() { const p = S.player, r = Math.min(64, stats().radius); p.x = clamp(p.x, r, W - r); p.y = clamp(p.y, 470, LINE - 30 - r * .5); }
  function nearestEnemy(x, y) { let best = null, bd = Infinity; for (const e of S.enemies) { if (e.dead || e.y < -10 || e.y > y + 20) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } } return best; }
  function stepShots(dt, st) {
    for (const m of S.shots) {
      if (m.homing) {
        const t = nearestEnemy(m.x, m.y);
        if (t) {
          const cur = Math.atan2(m.vy, m.vx); let d = Math.atan2(t.y - m.y, t.x - m.x) - cur;
          while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          const sp = Math.hypot(m.vx, m.vy), a = cur + clamp(d, -1, 1) * m.homing * 2.4 * dt;
          m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp;
        }
      }
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.life !== undefined && (m.life -= dt) <= 0) { m.dead = true; continue; }
      const wave = m.kind === 'wave', half = wave ? (m.w = Math.min(m.maxW, m.w + 170 * dt)) : m.r;
      if (!wave && Math.random() < .35) part({ x: m.x, y: m.y + 6, vx: (Math.random() - .5) * 30, vy: 60, life: .22, max: .22, r: 2, color: m.color });
      for (const row of S.rows) { // bendable gates absorb shots
        if (row.dead || Math.abs(m.y - row.y) > GATE_H / 2 + m.r) continue;
        for (let i = 0; i < row.gates.length; i++) { const [a, b] = gateSpan(row, i); if (m.x + half > a && m.x - half < b && C.shiftable(row.gates[i])) { m.dead = true; spark(m.x, m.y, '#e6f0ff'); hitGate(row, i, m.dmg, st); break; } }
        if (m.dead) break;
      }
      if (m.dead) continue;
      for (const e of S.enemies) {
        if (e.dead || m.hit.has(e)) continue;
        if (wave ? Math.abs(e.x - m.x) > half + e.r || Math.abs(e.y - m.y) > 10 + e.r : (e.x - m.x) ** 2 + (e.y - m.y) ** 2 > (e.r + m.r) ** 2) continue;
        m.hit.add(e); damage(e, m.dmg); spark(wave ? e.x : m.x, m.y, m.color);
        if (m.blast) { blastFx(m.x, m.y, m.blast, m.color); for (const o of S.enemies) if (o !== e && !o.dead && (o.x - m.x) ** 2 + (o.y - m.y) ** 2 < (m.blast + o.r) ** 2) damage(o, m.dmg * .6); }
        if (!wave && --m.pierce < 0) { m.dead = true; break; }
      }
      if (m.y < -30 || m.x < -30 || m.x > W + 30 || m.y > H + 30) m.dead = true;
    }
  }
  const aimShot = (x, y, speed) => { const a = Math.atan2(S.player.y - y, S.player.x - x); S.bullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5 }); };
  function stepEnemies(dt, st) {
    const p = S.player;
    for (const e of S.enemies) {
      if (e.dead) continue;
      e.t += dt; e.age += dt; if (e.flash > 0) e.flash -= dt;
      const x0 = e.x;
      switch (e.type) {
        case 'zig': e.y += e.speed * dt; e.x += Math.cos(e.t * 3) * 150 * dt; break;
        case 'gunner':
          e.y += (e.y < 170 ? e.speed : e.speed * .35) * dt; e.fire -= dt;
          if (e.fire <= 0 && e.y > 0) { e.fire = Math.max(1.1, 2.6 - S.wave * .05); aimShot(e.x, e.y + e.r, 210); }
          break;
        case 'bomber': // levels off high up, strafes and drops slow bombs
          e.y += (e.y < 130 ? e.speed * 1.6 : e.speed * .12) * dt;
          if (e.y >= 130) { e.x += e.dir * 70 * dt; if (e.x < 40 || e.x > W - 40) e.dir = e.x < 40 ? 1 : -1; e.fire -= dt; if (e.fire <= 0) { e.fire = Math.max(1, 1.9 - S.wave * .03); S.bullets.push({ x: e.x, y: e.y + e.r, vx: 0, vy: 150, r: 7, bomb: true }); } }
          break;
        case 'dasher': // flies in, locks on, then dives at where the fleet was
          if (e.phase === 'in') { e.y += e.speed * 1.7 * dt; if (e.y >= 150) { e.phase = 'aim'; e.timer = .7; e.tx = p.x; } }
          else if (e.phase === 'aim') { e.flash = .04; e.x += (e.tx - e.x) * Math.min(1, dt * 3); if ((e.timer -= dt) <= 0) e.phase = 'dive'; }
          else e.y += 540 * dt;
          break;
        case 'boss': stepBoss(e, dt); break;
        case 'shard': e.y += e.speed * dt; e.x += e.dir * 50 * dt; break;
        default: e.y += e.speed * dt; e.x += Math.sin(e.t * 1.3) * 18 * dt;
      }
      e.x = clamp(e.x, e.r, W - e.r);
      e.bank += (clamp((e.x - x0) / dt * .004, -.45, .45) - e.bank) * Math.min(1, dt * 8); // lean into turns
      const reach = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (e.type === 'boss') { if (e.hitCd <= 0 && reach < (e.r * .9 + st.radius * .8) ** 2) { e.hitCd = 1.5; loseUnits(C.contactLoss('boss'), `${e.name}에 들이받힘!`); } }
      else if (reach < (e.r + st.radius * .8) ** 2) { e.dead = true; burst(e.x, e.y, e.color, 10); loseUnits(C.contactLoss(e.type), `${e.name}과(와) 충돌!`); }
      else if (e.y - e.r > LINE) { e.dead = true; S.ripples.push({ x: e.x, life: .6 }); loseUnits(C.breachLoss(e.type), `${e.name} 방어선 돌파!`); }
      if (mode === 'over') return;
      st = stats();
    }
  }
  // Each boss keeps one signature pattern on top of basic gunfire.
  function stepBoss(e, dt) {
    const p = S.player, wv = S.wave;
    if (e.hitCd > 0) e.hitCd -= dt;
    if (e.y < 130 && e.phase === 'hover') { e.y += e.speed * 2.4 * dt; return; }
    e.fire -= dt; e.summon -= dt;
    const fan = (n, speed, gap) => { for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i - (n - 1) / 2) * gap; S.bullets.push({ x: e.x, y: e.y + 40, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5 }); } };
    const sway = speed => { e.x += e.dir * speed * dt; if (e.x < 80 || e.x > W - 80) e.dir = e.x < 80 ? 1 : -1; };
    switch (e.boss) {
      case 'carrier':
        sway(150);
        if (e.fire <= 0) { aimShot(e.x, e.y + 30, 230); e.burst++; e.fire = e.burst % 3 ? .14 : Math.max(1, 1.9 - wv * .02); }
        if (e.summon <= 0) { e.summon = 3.8; for (const s of [-1, 0, 1]) spawn('zig', e.x + s * 44, e.y + 26); }
        break;
      case 'divider':
        e.x += clamp(p.x - e.x, -60, 60) * dt;
        if (e.fire <= 0) { e.fire = Math.max(1.6, 3.4 - wv * .03); fan(11, 135, .26); }
        if (e.summon <= 0) { e.summon = Math.max(1.8, 2.8 - wv * .02); dropSolo(S.units >= 10 && Math.random() < .3 ? { op: '÷', v: 2 } : { op: '-', v: 2 + Math.floor(wv / 5) + Math.floor(S.units / 30) }, p.x, e.y + 46, 170); }
        break;
      case 'hydra':
        if (e.phase === 'hover') {
          sway(55); e.dash -= dt;
          if (e.fire <= 0) { e.fire = Math.max(.3, .5 - wv * .004); e.alt *= -1; aimShot(e.x + e.alt * e.r * .9, e.y + 14, 240); }
          if (e.dash <= 0) { e.phase = 'aim'; e.dash = .9; e.tx = p.x; }
        } else if (e.phase === 'aim') { e.flash = .05; if ((e.dash -= dt) <= 0) e.phase = 'dive'; }
        else if (e.phase === 'dive') { e.y += 560 * dt; e.x += clamp(e.tx - e.x, -200, 200) * dt * 3; if (e.y > 600) e.phase = 'rise'; }
        else { e.y -= 240 * dt; if (e.y <= 130) { e.y = 130; e.phase = 'hover'; e.dash = 6.5; } }
        break;
      default:
        sway(70);
        if (e.fire <= 0) { e.fire = Math.max(1.2, 2.4 - wv * .03); fan(7 + Math.min(6, Math.floor(wv / 5)), 170, .19); }
        if (e.summon <= 0) { e.summon = 5; for (const s of [-1, 1]) spawn('drone', e.x + s * 50, e.y + 20); }
    }
  }

  // ---------- HUD / DOM ----------
  function renderHud() {
    if (!S) return;
    const st = stats();
    ui.wave.textContent = String(Math.max(1, S.wave));
    ui.units.textContent = S.units + '기'; ui.units.classList.toggle('danger', S.units <= 2);
    ui.power.textContent = Math.round(st.dps).toLocaleString('ko-KR');
    ui.score.textContent = S.score.toLocaleString('ko-KR');
    ui.unitBar.style.width = Math.min(100, Math.log(1 + S.units) / Math.log(1 + C.MAX_UNITS) * 100) + '%';
    ui.unitText.textContent = `최대 ${S.peak}기 · 한도 ${C.MAX_UNITS}`;
  }
  function renderLoadout() {
    const st = stats(), evo = C.evolution(S.tier), w = C.WEAPONS[st.weapon], f = C.composition(S.units);
    ui.weapon.textContent = `${w.name} Lv.${st.level} / ${C.WEAPON_MAX_LEVEL}`; ui.weapon.style.color = w.color; ui.weaponDesc.textContent = w.desc;
    ui.tier.textContent = evo.name; ui.tier.style.color = evo.color;
    document.querySelectorAll('#evoTrack span').forEach((el, i) => { el.style.background = i < S.tier ? C.EVOLUTIONS[i].color : ''; });
    const rows = [['초당 피해', Math.round(st.dps).toLocaleString('ko-KR')], ['중포함', f.heavy + '척'], ['전투기', f.fighter + '기'], ['포대', f.light + '기']];
    ui.stats.replaceChildren(...rows.map(([k, v]) => { const li = document.createElement('li'); const a = document.createElement('span'), b = document.createElement('b'); a.textContent = k; b.textContent = v; li.append(a, b); return li; }));
  }
  function renderBest() { const b = readBest(); ui.best.textContent = `${b.score.toLocaleString('ko-KR')}점 · ${b.wave}웨이브 · 최대 ${b.peak}기`; }
  function showOverlay(kicker, title, text, button) { ui.kicker.textContent = kicker; ui.title.textContent = title; ui.text.textContent = text; ui.start.textContent = button; ui.overlay.hidden = false; }

  // ---------- Layout: keep the whole battlefield visible below the sticky site header ----------
  const panel = $('rushPanel'), stage = canvas.parentElement;
  const headerHeight = () => document.querySelector('site-header')?.getBoundingClientRect().height || 0;
  function fitStage() {
    const above = stage.getBoundingClientRect().top - panel.getBoundingClientRect().top;
    stage.style.width = Math.max(240, Math.min(panel.clientWidth, (innerHeight - headerHeight() - above - 10) * W / H)) + 'px';
  }
  function scrollToStage() { const top = panel.getBoundingClientRect().top + scrollY - headerHeight() - 4; if (Math.abs(top - scrollY) > 8) scrollTo({ top: Math.max(0, top), behavior: 'instant' }); }
  addEventListener('resize', fitStage);
  new ResizeObserver(fitStage).observe(panel);

  // ---------- Flow ----------
  function newGame() {
    S = fresh(); mode = 'play'; acc = 0;
    ui.overlay.hidden = true; ui.pause.disabled = false; ui.pause.textContent = '일시정지';
    renderLoadout(); renderHud(); fitStage(); scrollToStage();
    canvas.focus({ preventScroll: true });
  }
  function setPaused(on) {
    if (on && mode === 'play') { mode = 'paused'; ui.pause.textContent = '계속하기'; showOverlay('PAUSED', '일시정지', 'P 키나 버튼으로 계속합니다.', '계속하기'); }
    else if (!on && mode === 'paused') { mode = 'play'; ui.pause.textContent = '일시정지'; ui.overlay.hidden = true; canvas.focus({ preventScroll: true }); }
  }
  function gameOver() {
    if (mode === 'over') return;
    mode = 'over'; ui.pause.disabled = true;
    const best = readBest(), record = S.score > best.score;
    if (record) writeBest({ score: S.score, wave: S.wave, peak: Math.max(best.peak, S.peak) });
    else if (S.peak > best.peak) writeBest({ ...best, peak: S.peak });
    renderBest(); renderHud(); renderLoadout();
    showOverlay(`GAME OVER · ${C.grade(S.wave)} 등급`, record ? '새 최고 기록!' : '부대 전멸', `${S.score.toLocaleString('ko-KR')}점\n${S.wave}웨이브 · 최대 ${S.peak}기 · ${S.bestCombo} 콤보`, '다시 도전');
    window.dispatchEvent(new CustomEvent('partygame:score', { detail: { gameId: 'missile-rush', score: S.score, wave: S.wave } }));
  }
  function loop(t) {
    const dt = Math.min(.1, (t - last) / 1000 || 0); last = t;
    if (mode === 'play') {
      if (S.freeze > 0) S.freeze -= dt; // hit-stop: big moments hold for a few frames
      else { acc += dt; for (let i = 0; acc >= STEP && i < 5 && mode === 'play'; i++) { step(STEP); acc -= STEP; } if (acc > STEP) acc = 0; }
      if (S.fx.shake > 0) S.fx.shake = Math.max(0, S.fx.shake - dt * 40);
      if (S.fx.flash > 0) S.fx.flash = Math.max(0, S.fx.flash - dt * 2.2);
      if ((hudTimer -= dt) <= 0) { renderHud(); hudTimer = .1; }
    }
    view.draw(S, { mode, dt, calm: ui.motion.checked });
    requestAnimationFrame(loop);
  }

  // ---------- Input ----------
  ui.start.addEventListener('click', () => { if (mode === 'paused') setPaused(false); else newGame(); });
  ui.pause.addEventListener('click', () => setPaused(mode === 'play'));
  addEventListener('keydown', e => {
    if (e.target.closest?.('input,select,textarea')) return;
    const arrow = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code);
    if (e.code === 'KeyP' || e.code === 'Escape') { if (mode === 'play' || mode === 'paused') { setPaused(mode === 'play'); e.preventDefault(); } return; }
    if ((e.code === 'Enter' || e.code === 'Space') && (mode === 'ready' || mode === 'over') && document.activeElement === canvas) { newGame(); e.preventDefault(); return; }
    if (mode === 'play' && (arrow || /^Key[WASD]$/.test(e.code))) { keys.add(e.code); if (arrow) e.preventDefault(); }
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); setPaused(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
  const toField = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  canvas.addEventListener('pointerdown', e => { if (mode !== 'play') return; const q = toField(e); drag = { id: e.pointerId, sx: q.x, sy: q.y, px: S.player.x, py: S.player.y }; canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
  canvas.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId || mode !== 'play') return;
    const q = toField(e), p = S.player;
    p.x = drag.px + (q.x - drag.sx) * 1.15; p.y = drag.py + (q.y - drag.sy) * 1.15; p.vx = p.vy = 0; clampPlayer();
  });
  const endDrag = e => { if (drag && drag.id === e.pointerId) drag = null; };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  for (const [el, key] of [[ui.sound, 'sound'], [ui.motion, 'motion']]) {
    try { el.checked = localStorage.getItem('partygame.missileRush.' + key) === '1'; } catch { /* ignore */ }
    el.addEventListener('change', () => { try { localStorage.setItem('partygame.missileRush.' + key, el.checked ? '1' : '0'); } catch { /* ignore */ } });
  }

  // Test hooks: a read-only snapshot plus deterministic helpers for the automated browser checks.
  window.__missileRush = {
    get mode() { return mode; },
    snapshot: () => S && { wave: S.wave, tier: S.tier, score: S.score, units: S.units, peak: S.peak, combo: S.combo, weapon: S.weapon, wlevel: S.wlevels[S.weapon], enemies: S.enemies.length, shots: S.shots.length + (S.beam ? 1 : 0) + S.bolts.length, bullets: S.bullets.length, rows: S.rows.map(r => r.gates.map(g => C.gateLabel(g))), crates: S.crates.map(c => c.id), boss: S.enemies.find(e => e.type === 'boss')?.boss || null, fleet: C.composition(S.units) },
    player: () => S && { x: S.player.x, y: S.player.y },
    freeze: () => { if (mode === 'play') mode = 'frozen'; },
    hold: () => { S.hold = true; S.intermission = 0; S.rows = []; S.crates = []; S.pending = []; S.enemies = []; S.bullets = []; S.shots = []; }, // stop the wave script
    startWave: n => { S.hold = false; S.enemies = []; S.rows = []; S.bullets = []; startWave(n); },
    setUnits: n => setUnits(n),
    passGate: (op, v) => passGate({ y: S.player.y, lanes: 1, solo: S.player.x, gates: [{ op, v, shifts: 0, dmg: 0, flash: 0 }] }, 0),
    dropRow: (gates, above = 150) => { const row = dropRow(gates.length, gates.map(g => ({ ...g, shifts: C.MAX_SHIFTS }))); row.y = S.player.y - above; },
    pickWeapon: id => catchCrate({ id, x: S.player.x, y: S.player.y }),
    dropCrate: id => dropCrate(id, S.player.x, S.player.y - 150),
    spawnAbove: (type, dy = 380) => spawn(type, S.player.x, S.player.y - dy),
    killBoss: () => { const b = S.enemies.find(e => e.type === 'boss') || spawn('boss'); damage(b, b.hp + 1); }
  };

  renderBest(); fitStage();
  ui.start.disabled = false; ui.start.textContent = '전투 시작';
  requestAnimationFrame(loop);
})();
