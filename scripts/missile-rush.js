// Missile Rush: vertical endless shooter. Operator capsules (+n, −n, ×n, ÷n) fall with the enemy waves;
// catching one changes how many launchers are in the squad, and every launcher adds firepower.
// Weapon crates swap or level up the squad's weapon, and four bosses rotate every fifth wave.
(() => {
  const C = window.MissileRushCore;
  const W = 480, H = 760, LINE = 742;
  const canvas = document.getElementById('rushCanvas');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const ui = {
    wave: $('waveHud'), units: $('unitsHud'), power: $('powerHud'), score: $('scoreHud'), unitBar: $('unitBar'), unitText: $('unitText'),
    overlay: $('rushOverlay'), overlayKicker: $('overlayKicker'), overlayTitle: $('overlayTitle'), overlayText: $('overlayText'),
    start: $('startRush'), pause: $('pauseRush'), status: $('rushStatus'),
    tier: $('tierName'), weapon: $('weaponName'), weaponDesc: $('weaponDesc'), stats: $('weaponStats'), log: $('gateLog'), best: $('rushBest'), banner: $('rushBanner'),
    sound: $('rushSound'), motion: $('rushMotion')
  };
  const BEST_KEY = 'partygame.missileRush.best';
  const readBest = () => { try { return { score: 0, wave: 0, peak: 0, ...JSON.parse(localStorage.getItem(BEST_KEY)) }; } catch { return { score: 0, wave: 0, peak: 0 }; } };
  const writeBest = v => { try { localStorage.setItem(BEST_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };

  const GATE_W = 78, GATE_H = 40, SHOWN_UNITS = 90, SPACING = 5.2;
  const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.6 + .3, v: Math.random() * 40 + 20 }));
  // Sunflower layout: unit i sits at radius SPACING·√i, so the squad grows as a tidy disc.
  const formation = Array.from({ length: SHOWN_UNITS }, (_, i) => ({ x: Math.cos(i * 2.39996) * SPACING * Math.sqrt(i) * 1.15, y: Math.sin(i * 2.39996) * SPACING * Math.sqrt(i) * .8 }));
  let S; // game state
  let mode = 'ready'; // ready | play | paused | over
  let lastTime = 0, hudTimer = 0, shake = 0;
  const keys = new Set();
  let drag = null;

  function fresh() {
    return {
      player: { x: W / 2, y: 680, inv: 0 },
      units: C.START_UNITS, peak: C.START_UNITS, shown: C.START_UNITS, pulse: 0,
      missiles: [], enemies: [], bullets: [], gates: [], crates: [], parts: [], texts: [], log: [],
      weapon: 'missile', wlevels: { missile: 1 }, crateTimer: 12, beam: null,
      tier: 1, score: 0, kills: 0, caught: 0,
      wave: 0, queue: [], spawnTimer: 0, gateTimer: 2, nextWaveTimer: 0, fireTimer: 0, time: 0, bannerTimer: 0, pairId: 0
    };
  }
  const stats = () => C.squadStats(S.units, S.tier, S.weapon, S.wlevels[S.weapon]);

  // ---------- Audio (optional, generated) ----------
  let audio = null, lastShotSound = 0;
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

  // ---------- Waves ----------
  function startWave(n) {
    S.wave = n;
    const plan = C.wavePlan(n);
    const q = [];
    for (const [type, count] of plan.plan) for (let i = 0; i < (plan.boss ? Math.ceil(count / 2) : count); i++) q.push(type);
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [q[i], q[j]] = [q[j], q[i]]; }
    S.queue = q; S.spawnGap = plan.spawnGap; S.gateGap = plan.gateGap; S.spawnTimer = 1.4; S.gateTimer = Math.min(S.gateTimer, 1);
    const boss = plan.boss ? C.bossFor(n) : null;
    if (boss) spawn('boss');
    banner(boss ? `WAVE ${n} · ${boss.name}` : `WAVE ${n}`);
    say(boss ? `${boss.name} 접근! ${boss.hint}. 부대를 최대한 불려서 맞서세요.` : `${n}웨이브 · 적 ${q.length}기 접근`);
  }
  function spawn(type, x, y) {
    const st = C.enemyStats(type, S.wave);
    const e = { type, x: x ?? (30 + Math.random() * (W - 60)), y: y ?? -st.r, hp: st.hp, maxHp: st.hp, speed: st.speed, r: st.r, score: st.score, color: st.color, t: Math.random() * 6, fire: 1.5 + Math.random() * 1.5, flash: 0, dir: Math.random() < .5 ? -1 : 1 };
    if (type === 'boss') { const b = C.bossFor(S.wave); Object.assign(e, { x: W / 2, fire: 2.2, summon: 4, boss: b.id, name: b.name, burst: 0, alt: 1, dash: 6, phase: 'hover', hitCd: 0 }); }
    S.enemies.push(e);
    return e;
  }
  function makeGate(g, x, pairId) {
    return { op: g.op, v: g.v, shifts: C.MAX_SHIFTS, x, y: -GATE_H, vy: 92 + Math.min(70, S.wave * 3), dmg: 0, flash: 0, pairId, wob: Math.random() * 6 };
  }
  function dropCrate(id, x, y) { S.crates.push({ id: id || C.rollWeapon(S.weapon), x: x ?? 50 + Math.random() * (W - 100), y: y ?? -24, vy: 84, t: Math.random() * 6 }); }
  function catchCrate(c) {
    const r = C.pickWeapon({ weapon: S.weapon, levels: S.wlevels }, c.id), w = C.WEAPONS[c.id];
    const swapped = S.weapon !== r.weapon;
    S.weapon = r.weapon; S.wlevels = r.levels; S.beam = null; S.fireTimer = 0;
    c.dead = true; S.score += 30;
    burst(c.x, c.y, w.color, 20); beep(520, .25, 'triangle', .05, 700);
    const lv = S.wlevels[S.weapon];
    banner(swapped ? `무기 교체 · ${w.name} Lv.${lv}` : r.leveled ? `${w.name} 강화 · Lv.${lv}` : `${w.name} 최대 레벨 · 증원 +${r.bonus}`, 1.2);
    say(swapped ? `${w.name}(으)로 교체했습니다. ${w.desc}.` : r.leveled ? `${w.name} Lv.${lv}(으)로 강화했습니다. 피해 +20%.` : `${w.name}은(는) 이미 최대 레벨이라 증원 ${r.bonus}기를 받았습니다.`);
    if (r.bonus) setUnits(S.units + r.bonus);
    renderLoadout();
  }
  function spawnGates(forcePair) {
    if (forcePair === undefined && S.gates.some(g => g.y < GATE_H * 2)) return; // keep rows from overlapping
    const pair = forcePair ?? Math.random() < .55;
    if (pair) {
      const id = ++S.pairId;
      const [a, b] = C.rollPair(S.wave, S.units);
      S.gates.push(makeGate(a, W * .27, id), makeGate(b, W * .73, id));
    } else {
      S.gates.push(makeGate(C.rollOperator(S.wave, S.units), 50 + Math.random() * (W - 100), 0));
    }
  }

  // ---------- Squad ----------
  function setUnits(n, reason, color) {
    const before = S.units;
    S.units = C.clampUnits(n);
    S.peak = Math.max(S.peak, S.units);
    S.pulse = .35;
    const d = S.units - before;
    if (d) floatText(S.player.x, S.player.y - stats().radius - 18, (d > 0 ? '+' : '') + d + '기', color || (d > 0 ? '#9dffb4' : '#ff8f86'));
    if (reason) say(reason);
    if (S.units <= 0) gameOver();
  }
  function loseUnits(n, reason) {
    if (n <= 0 || mode !== 'play') return;
    shake = Math.max(shake, 6 + Math.min(10, n * 2));
    burst(S.player.x, S.player.y, '#ff8a7a', 10 + n * 3);
    beep(120, .25, 'square', .05, -60);
    setUnits(S.units - n, `${reason} 유닛 -${n}`);
  }
  function catchGate(gate) {
    const before = S.units;
    const after = C.applyOperator(before, gate);
    const good = after >= before;
    S.caught++;
    S.log.unshift({ label: C.gateLabel(gate), before, after, good });
    S.log.length = Math.min(S.log.length, 8);
    for (const o of S.gates) if (o !== gate && gate.pairId && o.pairId === gate.pairId) { o.dead = true; burst(o.x, o.y, '#8aa0c0', 6); }
    gate.dead = true;
    burst(gate.x, gate.y, good ? '#9dffb4' : '#ff8f86', 18);
    beep(good ? 700 : 200, good ? .2 : .3, 'triangle', .05, good ? 500 : -120);
    if (!good) shake = Math.max(shake, 8);
    banner(`${C.gateLabel(gate)} · ${before} → ${after}기`, .9);
    if (good) S.score += Math.max(0, after - before) * 5;
    setUnits(after, `${C.OPERATORS[gate.op].name} 캡슐 ${C.gateLabel(gate)} 획득 · 부대 ${before}기 → ${after}기`);
    renderLoadout();
  }

  // ---------- Combat ----------
  function fire() {
    const st = stats(), p = S.player;
    const n = st.count;
    if (!n) return;
    if (st.beam) { fireBeam(st); return; }
    const width = Math.min(st.radius * 1.6, n * 9), y0 = p.y - st.radius * .6 - 10;
    for (let i = 0; i < n; i++) {
      const k = n === 1 ? 0 : i / (n - 1) - .5;
      const a = -Math.PI / 2 + (st.spread ? k * st.spread * 2 : st.homing ? k * 1.1 : 0);
      const m = { x: p.x + k * width, y: y0, vx: Math.cos(a) * st.speed + (st.spread || st.homing ? 0 : k * 40), vy: Math.sin(a) * st.speed, dmg: st.damage, pierce: st.pierce, homing: st.homing, blast: st.blast, hit: new Set(), r: (st.blast ? 6 : st.spread ? 3 : 3.5) + S.tier * .6 + Math.min(3, st.damage / 8), color: st.color, kind: st.weapon };
      if (st.spread) m.life = .62; // pellets fade out, so the shotgun rewards getting close
      S.missiles.push(m);
    }
    if (S.time - lastShotSound > .09) { beep((st.blast ? 240 : 520) + S.tier * 60, .06, 'triangle', .025, -260); lastShotSound = S.time; }
  }
  // Laser: an instant column. It burns every enemy in line, but a shootable capsule in the way soaks it up.
  function fireBeam(st) {
    const p = S.player, half = st.beam / 2;
    let top = -10, blocker = null;
    for (const g of S.gates) if (!g.dead && C.shiftable(g) && g.y < p.y && Math.abs(g.x - p.x) < GATE_W / 2 + half && g.y > top) { top = g.y; blocker = g; }
    for (const e of S.enemies) if (!e.dead && e.y < p.y && e.y + e.r > top && Math.abs(e.x - p.x) < e.r + half) { damage(e, st.damage); if (Math.random() < .3) spark(p.x + (Math.random() - .5) * st.beam, e.y + e.r * .6, st.color); }
    if (blocker) hitGate(blocker, st.damage, st);
    S.beam = { top: blocker ? top + GATE_H / 2 : -10, w: st.beam, color: st.color, life: .14 };
    if (S.time - lastShotSound > .2) { beep(900 + S.tier * 40, .12, 'sawtooth', .012, -100); lastShotSound = S.time; }
  }
  function hitGate(g, dmg, st) {
    const cost = C.shiftCost(st.dps, S.wave);
    g.flash = .06; g.dmg += dmg;
    if (g.dmg < cost) return;
    g.dmg -= cost;
    const prev = C.gateLabel(g);
    Object.assign(g, C.shiftGate(g));
    floatText(g.x, g.y - GATE_H / 2 - 6, `${prev} → ${C.gateLabel(g)}`, '#ffe27a');
    beep(880, .06, 'sine', .03, 200);
  }
  function nearestEnemy(x, y) {
    let best = null, bd = Infinity;
    for (const e of S.enemies) { if (e.dead || e.y < -10 || e.y > y + 20) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function damage(e, amount) {
    e.hp -= amount; e.flash = .08;
    if (e.hp <= 0 && !e.dead) kill(e);
  }
  function kill(e) {
    e.dead = true; S.kills++; S.score += e.score;
    burst(e.x, e.y, e.color, e.type === 'boss' ? 70 : 12 + e.r * .6);
    shake = Math.max(shake, e.type === 'boss' ? 16 : e.r > 18 ? 4 : 0);
    beep(e.type === 'boss' ? 90 : 180 + Math.random() * 60, e.type === 'boss' ? .7 : .14, 'sawtooth', .035, -120);
    if (e.type === 'splitter') for (const s of [-1, 1]) { const sh = spawn('shard', e.x + s * 12, e.y); sh.dir = s; }
    if (e.type === 'boss') { evolve(); dropCrate(undefined, e.x, e.y); }
  }
  function evolve() {
    S.score += 500 * S.wave;
    if (S.tier < C.EVOLUTIONS.length) {
      S.tier++;
      const evo = C.evolution(S.tier);
      banner(`탄두 진화 · ${evo.name}`);
      setUnits(S.units + C.BOSS_REWARD_UNITS, `보스 격파! 탄두가 ${evo.name}(으)로 진화했고 증원 ${C.BOSS_REWARD_UNITS}기와 무기 상자가 도착합니다.`);
    } else {
      banner('보스 격파 · 최종 진화 유지');
      setUnits(S.units + C.BOSS_REWARD_UNITS, `최종 진화 상태입니다. 보너스 점수와 증원 ${C.BOSS_REWARD_UNITS}기를 획득했습니다.`);
    }
    beep(330, .5, 'triangle', .05, 600);
    renderLoadout();
  }
  const gateHit = (g, x, y, r) => Math.abs(x - g.x) < GATE_W / 2 + r && Math.abs(y - g.y) < GATE_H / 2 + r;

  // ---------- Update ----------
  function update(dt) {
    S.time += dt;
    const p = S.player;
    let st = stats();
    // movement
    const kx = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
    const ky = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
    p.x += kx * 380 * dt; p.y += ky * 300 * dt;
    clampPlayer();
    if (p.inv > 0) p.inv -= dt;
    if (S.pulse > 0) S.pulse -= dt;
    S.shown += (S.units - S.shown) * Math.min(1, dt * 10);

    // weapons
    S.fireTimer -= dt;
    if (S.fireTimer <= 0) { fire(); S.fireTimer += st.interval; if (S.fireTimer < 0) S.fireTimer = 0; }

    // waves and operator capsules
    if (S.queue.length) {
      S.spawnTimer -= dt;
      if (S.spawnTimer <= 0) { spawn(S.queue.pop()); S.spawnTimer = S.spawnGap * (.6 + Math.random() * .8); }
    } else if (!S.enemies.length) {
      if (S.nextWaveTimer <= 0) { S.nextWaveTimer = 2.2; S.score += S.wave * 50; if (S.wave) banner(`WAVE ${S.wave} 클리어 +${S.wave * 50}`); }
      S.nextWaveTimer -= dt;
      if (S.nextWaveTimer <= 0) startWave(S.wave + 1);
    }
    if (S.wave) { S.gateTimer -= dt; if (S.gateTimer <= 0) { spawnGates(); S.gateTimer = S.gateGap * (.8 + Math.random() * .4); } }

    // weapon crates
    S.crateTimer -= dt;
    if (S.crateTimer <= 0 && S.wave) { dropCrate(); S.crateTimer = 17 + Math.random() * 7; }
    for (const c of S.crates) {
      c.y += c.vy * dt; c.t += dt;
      if ((c.x - p.x) ** 2 + (c.y - p.y) ** 2 < (st.radius * .8 + 20) ** 2) { catchCrate(c); if (mode === 'over') return; st = stats(); }
      else if (c.y > H + 30) c.dead = true;
    }
    if (S.beam) { S.beam.life -= dt; if (S.beam.life <= 0) S.beam = null; }

    // missiles
    for (const m of S.missiles) {
      if (m.homing) {
        const t = nearestEnemy(m.x, m.y);
        if (t) {
          const cur = Math.atan2(m.vy, m.vx), want = Math.atan2(t.y - m.y, t.x - m.x);
          let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          const sp = Math.hypot(m.vx, m.vy), a = cur + Math.max(-1, Math.min(1, d)) * m.homing * 2.4 * dt;
          m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp;
        }
      }
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (m.life !== undefined && (m.life -= dt) <= 0) { m.dead = true; continue; }
      if (Math.random() < .4) S.parts.push({ x: m.x, y: m.y + 6, vx: (Math.random() - .5) * 30, vy: 60, life: .22, max: .22, r: 2, color: m.color });
      for (const g of S.gates) {
        if (g.dead || !C.shiftable(g) || !gateHit(g, m.x, m.y, m.r)) continue;
        m.dead = true; spark(m.x, m.y, '#e6f0ff'); hitGate(g, m.dmg, st);
        break;
      }
      if (m.dead) continue;
      for (const e of S.enemies) {
        if (e.dead || m.hit.has(e)) continue;
        if ((e.x - m.x) ** 2 + (e.y - m.y) ** 2 > (e.r + m.r) ** 2) continue;
        m.hit.add(e);
        damage(e, m.dmg);
        if (m.blast) {
          S.parts.push({ x: m.x, y: m.y, vx: 0, vy: 0, life: .28, max: .28, r: m.blast, color: m.color, ring: true });
          for (const o of S.enemies) if (o !== e && !o.dead && (o.x - m.x) ** 2 + (o.y - m.y) ** 2 < (m.blast + o.r) ** 2) damage(o, m.dmg * .6);
        }
        spark(m.x, m.y, m.color);
        if (--m.pierce < 0) { m.dead = true; break; }
      }
      if (m.y < -30 || m.x < -30 || m.x > W + 30 || m.y > H + 30) m.dead = true;
    }

    // capsules
    for (const g of S.gates) {
      if (g.dead) continue;
      g.y += g.vy * dt; g.wob += dt; if (g.flash > 0) g.flash -= dt;
      const dx = Math.max(0, Math.abs(p.x - g.x) - GATE_W / 2), dy = Math.max(0, Math.abs(p.y - g.y) - GATE_H / 2);
      if (dx * dx + dy * dy < (st.radius * .75) ** 2) { catchGate(g); if (mode === 'over') return; st = stats(); }
      else if (g.y - GATE_H / 2 > H) g.dead = true;
    }

    // enemies
    for (const e of S.enemies) {
      if (e.dead) continue;
      e.t += dt; if (e.flash > 0) e.flash -= dt;
      switch (e.type) {
        case 'zig': e.y += e.speed * dt; e.x += Math.cos(e.t * 3) * 150 * dt; break;
        case 'gunner':
          e.y += (e.y < 170 ? e.speed : e.speed * .35) * dt;
          e.fire -= dt;
          if (e.fire <= 0 && e.y > 0) { e.fire = Math.max(1.1, 2.6 - S.wave * .05); aimShot(e.x, e.y + e.r, 210); }
          break;
        case 'boss': updateBoss(e, dt, st); break;
        case 'shard': e.y += e.speed * dt; e.x += e.dir * 50 * dt; break;
        default: e.y += e.speed * dt; e.x += Math.sin(e.t * 1.3) * 18 * dt;
      }
      e.x = Math.max(e.r, Math.min(W - e.r, e.x));
      if (e.type === 'boss') { if (e.hitCd <= 0 && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r * .9 + st.radius * .8) ** 2) { e.hitCd = 1.5; loseUnits(C.contactLoss('boss'), `${e.name}에 들이받혔습니다!`); } }
      else if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r + st.radius * .8) ** 2) { e.dead = true; burst(e.x, e.y, e.color, 10); loseUnits(C.contactLoss(e.type), `${C.ENEMIES[e.type].name}과(와) 충돌!`); }
      else if (e.type !== 'boss' && e.y - e.r > LINE) { e.dead = true; loseUnits(C.breachLoss(e.type), `${C.ENEMIES[e.type].name}이(가) 방어선을 돌파!`); }
      if (mode === 'over') return;
      st = stats();
    }

    // enemy bullets
    for (const b of S.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.r + st.radius * .7) ** 2) {
        b.dead = true;
        if (p.inv <= 0) { p.inv = .3; loseUnits(1, '적 탄환에 피격!'); if (mode === 'over') return; st = stats(); }
      }
      if (b.y > H + 10 || b.x < -10 || b.x > W + 10) b.dead = true;
    }

    // effects
    for (const q of S.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .94; q.vy *= .94; q.life -= dt; }
    for (const t of S.texts) { t.y -= 30 * dt; t.life -= dt; }
    S.missiles = S.missiles.filter(o => !o.dead);
    S.enemies = S.enemies.filter(o => !o.dead);
    S.bullets = S.bullets.filter(o => !o.dead);
    S.gates = S.gates.filter(o => !o.dead);
    S.crates = S.crates.filter(o => !o.dead);
    S.parts = S.parts.filter(o => o.life > 0);
    if (S.parts.length > 600) S.parts.splice(0, S.parts.length - 600);
    S.texts = S.texts.filter(o => o.life > 0);
    if (S.bannerTimer > 0) { S.bannerTimer -= dt; if (S.bannerTimer <= 0) ui.banner.hidden = true; }
    for (const s of stars) { s.y += s.v * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
    if (shake > 0) shake = Math.max(0, shake - dt * 40);
  }
  // Each boss keeps one signature pattern on top of basic gunfire.
  function updateBoss(e, dt, st) {
    const p = S.player, wv = S.wave;
    if (e.hitCd > 0) e.hitCd -= dt;
    if (e.y < 130 && e.phase === 'hover') { e.y += e.speed * 2.4 * dt; return; }
    e.fire -= dt; e.summon -= dt;
    const fan = (n, speed, gap) => { for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i - (n - 1) / 2) * gap; S.bullets.push({ x: e.x, y: e.y + 40, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5 }); } };
    const sway = speed => { e.x += e.dir * speed * dt; if (e.x < 80 || e.x > W - 80) e.dir = e.x < 80 ? 1 : -1; };
    switch (e.boss) {
      case 'carrier': // fast strafing, fighter squadrons, aimed triple bursts
        sway(150);
        if (e.fire <= 0) { aimShot(e.x, e.y + 30, 230); e.burst++; e.fire = e.burst % 3 ? .14 : Math.max(1, 1.9 - wv * .02); }
        if (e.summon <= 0) { e.summon = 3.6; for (const s of [-1, 0, 1]) spawn('zig', e.x + s * 44, e.y + 26); }
        break;
      case 'divider': { // stalks the squad's column and lobs − and ÷ capsules at it
        e.x += Math.max(-60, Math.min(60, p.x - e.x)) * dt;
        if (e.fire <= 0) { e.fire = Math.max(1.6, 3.4 - wv * .03); fan(11, 135, .26); }
        if (e.summon <= 0) {
          e.summon = Math.max(1.7, 2.7 - wv * .02);
          const g = makeGate(S.units >= 8 && Math.random() < .3 ? { op: '÷', v: 2 } : { op: '-', v: 2 + Math.floor(wv / 5) + Math.floor(S.units / 25) }, Math.max(GATE_W / 2, Math.min(W - GATE_W / 2, p.x)), 0);
          g.y = e.y + 44; g.vy = 165; S.gates.push(g);
        }
        break;
      }
      case 'hydra': // twin turrets take turns, then the whole ship rams down the screen
        if (e.phase === 'hover') {
          sway(55); e.dash -= dt;
          if (e.fire <= 0) { e.fire = Math.max(.3, .5 - wv * .004); e.alt *= -1; aimShot(e.x + e.alt * e.r * .9, e.y + 14, 240); }
          if (e.dash <= 0) { e.phase = 'aim'; e.dash = .9; e.tx = p.x; }
        } else if (e.phase === 'aim') { e.flash = .05; e.dash -= dt; if (e.dash <= 0) e.phase = 'dive'; }
        else if (e.phase === 'dive') { e.y += 560 * dt; e.x += Math.max(-200, Math.min(200, e.tx - e.x)) * dt * 3; if (e.y > 600) e.phase = 'rise'; }
        else { e.y -= 240 * dt; if (e.y <= 130) { e.y = 130; e.phase = 'hover'; e.dash = 6.5; } }
        break;
      default: // fortress: wide bullet fans and drone escorts
        sway(70);
        if (e.fire <= 0) { e.fire = Math.max(1.2, 2.4 - wv * .03); fan(7 + Math.min(6, Math.floor(wv / 5)), 170, .19); }
        if (e.summon <= 0) { e.summon = 5; for (const s of [-1, 1]) spawn('drone', e.x + s * 50, e.y + 20); }
    }
  }
  function clampPlayer() {
    const p = S.player, r = Math.min(70, stats().radius);
    p.x = Math.max(r, Math.min(W - r, p.x)); p.y = Math.max(470, Math.min(LINE - 30 - r * .5, p.y));
  }
  function aimShot(x, y, speed) {
    const a = Math.atan2(S.player.y - y, S.player.x - x);
    S.bullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5 });
  }
  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = Math.random() * 220 + 40; S.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: .5 + Math.random() * .4, max: .9, r: Math.random() * 3 + 1.5, color }); }
  }
  function spark(x, y, color) { for (let i = 0; i < 3; i++) S.parts.push({ x, y, vx: (Math.random() - .5) * 160, vy: (Math.random() - .5) * 160, life: .2, max: .2, r: 1.8, color }); }
  function floatText(x, y, text, color) { if (S.texts.length < 30) S.texts.push({ x, y, text, color, life: .9 }); }

  // ---------- Render ----------
  function draw() {
    ctx.save();
    if (shake && !ui.motion.checked) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a0f24'); g.addColorStop(.6, '#121634'); g.addColorStop(1, '#1d1530');
    ctx.fillStyle = g; ctx.fillRect(-20, -20, W + 40, H + 40);
    for (const s of stars) { ctx.globalAlpha = .35 + s.s * .3; ctx.fillStyle = '#cfe0ff'; ctx.fillRect(s.x, s.y, s.s, s.s * 2.2); }
    ctx.globalAlpha = 1;
    // defense line
    ctx.strokeStyle = '#ff6f7d55'; ctx.setLineDash([10, 8]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, LINE); ctx.lineTo(W, LINE); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#ff8a9360'; ctx.font = '700 10px Pretendard Variable, sans-serif'; ctx.fillText('DEFENSE LINE', 8, LINE + 13);
    if (!S) { ctx.restore(); return; }

    for (const gt of S.gates) drawGate(gt);
    for (const c of S.crates) drawCrate(c);
    if (S.beam) drawBeam();
    for (const e of S.enemies) drawEnemy(e);
    for (const m of S.missiles) drawMissile(m);
    ctx.fillStyle = '#ff7b9c';
    for (const b of S.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffe1ea'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * .45, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff7b9c'; }
    for (const q of S.parts) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      if (q.ring) { ctx.strokeStyle = q.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1.1 - q.life / q.max * .6), 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    drawSquad();
    ctx.font = '800 13px Pretendard Variable, sans-serif'; ctx.textAlign = 'center';
    for (const t of S.texts) { ctx.globalAlpha = Math.min(1, t.life * 2); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y); }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    ctx.restore();
  }
  function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function drawGate(gt) {
    const good = C.isGood(gt), mult = gt.op === '×' || gt.op === '÷';
    const base = good ? (mult ? '#3fd7ff' : '#4fe39a') : (mult ? '#ff5f9e' : '#ff6a5f');
    ctx.save(); ctx.translate(gt.x, gt.y + Math.sin(gt.wob * 3) * 2);
    ctx.shadowColor = base; ctx.shadowBlur = 16;
    ctx.fillStyle = gt.flash > 0 ? '#ffffff' : base + '33';
    roundRect(-GATE_W / 2, -GATE_H / 2, GATE_W, GATE_H, 12); ctx.fill();
    ctx.shadowBlur = 0; ctx.lineWidth = 2.5; ctx.strokeStyle = base; ctx.stroke();
    if (C.shiftable(gt)) { // progress toward the next value step
      const cost = C.shiftCost(stats().dps, S.wave);
      ctx.fillStyle = '#ffe27a'; ctx.fillRect(-GATE_W / 2 + 8, GATE_H / 2 - 6, (GATE_W - 16) * Math.min(1, gt.dmg / cost), 3);
    }
    ctx.fillStyle = '#ffffff'; ctx.font = '900 22px Pretendard Variable, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(C.gateLabel(gt), 0, 0);
    ctx.restore(); ctx.textBaseline = 'alphabetic';
  }
  function drawCrate(c) {
    const w = C.WEAPONS[c.id], r = 19;
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(Math.sin(c.t * 2) * .12);
    ctx.shadowColor = w.color; ctx.shadowBlur = 18; ctx.fillStyle = '#101a2c'; ctx.strokeStyle = w.color; ctx.lineWidth = 3;
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = w.color; ctx.font = '900 18px Pretendard Variable, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(w.icon, 0, 1);
    ctx.rotate(-Math.sin(c.t * 2) * .12); ctx.font = '800 10px Pretendard Variable, sans-serif'; ctx.fillStyle = '#e6f0ff';
    ctx.fillText(c.id === S.weapon ? (S.wlevels[c.id] >= C.WEAPON_MAX_LEVEL ? w.name + ' +3기' : w.name + ' 강화') : w.name, 0, r + 11);
    ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function drawBeam() {
    const b = S.beam, p = S.player, y1 = p.y - 14;
    ctx.save(); ctx.globalAlpha = Math.min(1, b.life / .1);
    ctx.shadowColor = b.color; ctx.shadowBlur = 16; ctx.fillStyle = b.color + '88'; ctx.fillRect(p.x - b.w / 2, b.top, b.w, y1 - b.top);
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - b.w / 6, b.top, b.w / 3, y1 - b.top);
    ctx.restore();
  }
  function drawMissile(m) {
    if (m.kind === 'scatter') { ctx.globalAlpha = Math.min(1, m.life * 4); ctx.fillStyle = m.color; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; return; }
    if (m.kind === 'blast') { ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#fff5'; ctx.beginPath(); ctx.arc(m.x - 1.5, m.y - 1.5, m.r * .4, 0, Math.PI * 2); ctx.fill(); return; }
    const a = Math.atan2(m.vy, m.vx);
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(a + Math.PI / 2);
    const L = 9 + S.tier * 2, w = 2.2 + S.tier * .45;
    ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = S.tier >= 3 ? 10 : 4;
    ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(w, -L * .45); ctx.lineTo(w, L * .55); ctx.lineTo(w * 1.9, L); ctx.lineTo(-w * 1.9, L); ctx.lineTo(-w, L * .55); ctx.lineTo(-w, -L * .45); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffffffcc'; ctx.fillRect(-w * .45, -L * .55, w * .9, L * .45);
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(-w, L); ctx.lineTo(0, L + 5 + Math.random() * 5); ctx.lineTo(w, L); ctx.fill();
    ctx.restore();
  }
  function drawSquad() {
    const p = S.player, st = stats();
    if (p.inv > 0 && Math.floor(p.inv * 20) % 2) return;
    const n = Math.min(SHOWN_UNITS, Math.round(S.shown)), scale = 1 + Math.max(0, S.pulse) * .5;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = '#4fd1b814'; ctx.beginPath(); ctx.ellipse(0, 0, st.radius * 1.1, st.radius * .8, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = n - 1; i >= 0; i--) {
      const f = formation[i];
      ctx.save(); ctx.translate(f.x * scale, f.y * scale);
      ctx.fillStyle = '#26364c'; ctx.fillRect(-6, 2, 12, 4);
      ctx.fillStyle = i === 0 ? '#7ff0d8' : '#4fd1b8'; ctx.beginPath(); ctx.moveTo(-5, 3); ctx.lineTo(-3.5, -3); ctx.lineTo(3.5, -3); ctx.lineTo(5, 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#d7f7ef'; ctx.fillRect(-1.2, -9, 2.4, 7);
      ctx.fillStyle = st.color; ctx.fillRect(-1.2, -10, 2.4, 2);
      ctx.restore();
    }
    ctx.restore();
    // squad size badge
    const label = S.units + '', by = p.y - st.radius * .8 - 20;
    ctx.font = '900 16px Pretendard Variable, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const bw = Math.max(34, ctx.measureText(label).width + 18);
    ctx.fillStyle = S.units <= 2 ? '#ff6a5fdd' : '#0b1320dd'; roundRect(p.x - bw / 2, by - 12, bw, 24, 12); ctx.fill();
    ctx.strokeStyle = st.color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillText(label, p.x, by + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function drawEnemy(e) {
    ctx.save(); ctx.translate(e.x, e.y);
    const col = e.flash > 0 ? '#ffffff' : e.color, r = e.r;
    ctx.fillStyle = col; ctx.strokeStyle = '#0b0f1e'; ctx.lineWidth = 2;
    ctx.beginPath();
    switch (e.type) {
      case 'drone': ctx.moveTo(0, r); ctx.lineTo(r, -r * .7); ctx.lineTo(0, -r * .3); ctx.lineTo(-r, -r * .7); break;
      case 'zig': ctx.moveTo(0, r); ctx.lineTo(r * .5, -r); ctx.lineTo(r * 1.1, -r * .2); ctx.lineTo(0, r * .2); ctx.lineTo(-r * 1.1, -r * .2); ctx.lineTo(-r * .5, -r); break;
      case 'tank': for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } break;
      case 'gunner': ctx.moveTo(0, r); ctx.lineTo(r, 0); ctx.lineTo(0, -r); ctx.lineTo(-r, 0); break;
      case 'shard': ctx.moveTo(0, r); ctx.lineTo(r * .7, 0); ctx.lineTo(0, -r); ctx.lineTo(-r * .7, 0); break;
      case 'splitter': ctx.arc(0, 0, r, 0, Math.PI * 2); break;
      case 'boss':
        if (e.boss === 'carrier') { ctx.moveTo(-r * 1.6, -r * .25); ctx.lineTo(-r * 1.1, -r * .6); ctx.lineTo(r * 1.1, -r * .6); ctx.lineTo(r * 1.6, -r * .25); ctx.lineTo(r * 1.2, r * .35); ctx.lineTo(r * .3, r * .55); ctx.lineTo(0, r * .95); ctx.lineTo(-r * .3, r * .55); ctx.lineTo(-r * 1.2, r * .35); }
        else if (e.boss === 'divider') { for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + e.t * .4, q = i % 2 ? r * .82 : r * 1.12; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } }
        else if (e.boss === 'hydra') { ctx.moveTo(-r * 1.3, -r * .7); ctx.lineTo(-r * .5, -r * .8); ctx.lineTo(0, -r * .45); ctx.lineTo(r * .5, -r * .8); ctx.lineTo(r * 1.3, -r * .7); ctx.lineTo(r * 1.25, r * .3); ctx.lineTo(r * .9, r * .95); ctx.lineTo(r * .55, r * .3); ctx.lineTo(0, r * .55); ctx.lineTo(-r * .55, r * .3); ctx.lineTo(-r * .9, r * .95); ctx.lineTo(-r * 1.25, r * .3); }
        else { ctx.moveTo(-r * 1.4, -r * .5); ctx.lineTo(-r * .6, -r * .9); ctx.lineTo(r * .6, -r * .9); ctx.lineTo(r * 1.4, -r * .5); ctx.lineTo(r * 1.1, r * .4); ctx.lineTo(r * .35, r * .85); ctx.lineTo(-r * .35, r * .85); ctx.lineTo(-r * 1.1, r * .4); }
        break;
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0b0f1ecc';
    if (e.type === 'tank') { ctx.fillRect(-r * .55, -r * .2, r * 1.1, r * .4); }
    else if (e.type === 'gunner') { ctx.fillRect(-3, 0, 6, r * 1.2); }
    else if (e.type === 'splitter') { ctx.beginPath(); ctx.arc(-r * .35, 0, r * .3, 0, Math.PI * 2); ctx.arc(r * .35, 0, r * .3, 0, Math.PI * 2); ctx.fill(); }
    else if (e.type === 'boss' && e.boss === 'carrier') { ctx.fillRect(-r * 1.1, -r * .3, r * 2.2, r * .16); ctx.fillStyle = '#ffe9b0'; for (const s of [-1, -.5, 0, .5, 1]) ctx.fillRect(s * r * .9 - 3, -r * .05, 6, 6); }
    else if (e.type === 'boss' && e.boss === 'divider') { ctx.beginPath(); ctx.arc(0, 0, r * .55, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffd9ea'; ctx.font = '900 34px Pretendard Variable, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('÷', 0, 1); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; }
    else if (e.type === 'boss' && e.boss === 'hydra') { ctx.fillRect(-r * .3, -r * .3, r * .6, r * .4); ctx.fillStyle = e.phase === 'aim' || e.phase === 'dive' ? '#ff5a5a' : '#ffd36e'; for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(s * r * .9, r * .2, 7, 0, Math.PI * 2); ctx.fill(); } }
    else if (e.type === 'boss') { ctx.fillRect(-r * .8, -r * .3, r * 1.6, r * .35); ctx.fillStyle = '#ffd36e'; for (const s of [-1, 0, 1]) { ctx.beginPath(); ctx.arc(s * r * .55, r * .5, 6, 0, Math.PI * 2); ctx.fill(); } }
    else { ctx.beginPath(); ctx.arc(0, 0, r * .25, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    if (e.hp < e.maxHp || e.type === 'boss') {
      const bw = e.type === 'boss' ? 160 : r * 2, by = e.type === 'boss' ? e.y - r - 16 : e.y - r - 8;
      ctx.fillStyle = '#0008'; ctx.fillRect(e.x - bw / 2, by, bw, e.type === 'boss' ? 6 : 3);
      ctx.fillStyle = e.type === 'boss' ? '#ff5a6a' : '#9dffb4'; ctx.fillRect(e.x - bw / 2, by, bw * Math.max(0, e.hp / e.maxHp), e.type === 'boss' ? 6 : 3);
      if (e.type === 'boss') { ctx.fillStyle = '#ffe1e1'; ctx.font = '800 11px Pretendard Variable, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.name, e.x, by - 5); ctx.textAlign = 'left'; }
    }
  }

  // ---------- HUD / DOM ----------
  function renderHud() {
    if (!S) return;
    const st = stats();
    ui.wave.textContent = String(Math.max(1, S.wave));
    ui.units.textContent = S.units + '기';
    ui.units.classList.toggle('danger', S.units <= 2);
    ui.power.textContent = Math.round(st.dps).toLocaleString('ko-KR');
    ui.score.textContent = S.score.toLocaleString('ko-KR');
    ui.unitBar.style.width = Math.min(100, Math.log(1 + S.units) / Math.log(1 + C.MAX_UNITS) * 100) + '%';
    ui.unitText.textContent = `최대 ${S.peak}기 · 한도 ${C.MAX_UNITS}`;
  }
  function renderLoadout() {
    const st = stats(), evo = C.evolution(S.tier);
    ui.tier.textContent = evo.name; ui.tier.style.color = evo.color;
    document.querySelectorAll('#evoTrack span').forEach((el, i) => { el.style.background = i < S.tier ? C.EVOLUTIONS[i].color : ''; });
    const w = C.WEAPONS[st.weapon];
    ui.weapon.textContent = `${w.name} Lv.${st.level} / ${C.WEAPON_MAX_LEVEL}`; ui.weapon.style.color = w.color; ui.weaponDesc.textContent = w.desc;
    const trait = st.beam ? ['빔 폭', st.beam] : st.blast ? ['폭발 반경', st.blast] : st.homing ? ['유도', st.homing + '단계'] : st.spread ? ['확산', Math.round(st.spread * 115) + '°'] : ['관통', st.pierce + '회'];
    const rows = [['유닛', st.units + '기'], ['초당 피해', Math.round(st.dps).toLocaleString('ko-KR')], ['동시 발사', st.beam ? '빔' : st.count + '발'], ['무기 배율', '×' + (w.mult * (1 + (st.level - 1) * .2)).toFixed(2)], trait, ['진화 배율', '×' + evo.mult]];
    ui.stats.replaceChildren(...rows.map(([k, v]) => { const li = document.createElement('li'); li.innerHTML = '<span></span><b></b>'; li.firstChild.textContent = k; li.lastChild.textContent = v; return li; }));
    if (!S.log.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = '떨어지는 연산 캡슐을 받으면 여기에 기록됩니다.'; ui.log.replaceChildren(li); }
    else ui.log.replaceChildren(...S.log.map(l => { const li = document.createElement('li'); const s = document.createElement('span'); s.textContent = l.label; s.className = l.good ? 'good' : 'bad'; const b = document.createElement('b'); b.textContent = `${l.before} → ${l.after}기`; li.append(s, b); return li; }));
  }
  function renderBest() { const b = readBest(); ui.best.textContent = `${b.score.toLocaleString('ko-KR')}점 · ${b.wave}웨이브 · 최대 ${b.peak}기`; }
  function say(text) { ui.status.textContent = text; }
  function banner(text, time = 2) { ui.banner.textContent = text; ui.banner.hidden = false; S.bannerTimer = time; }
  function showOverlay(kicker, title, text, buttonLabel) {
    ui.overlayKicker.textContent = kicker; ui.overlayTitle.textContent = title; ui.overlayText.textContent = text;
    ui.start.textContent = buttonLabel; ui.overlay.hidden = false;
  }
  function hideOverlay() { ui.overlay.hidden = true; }

  // ---------- Layout ----------
  // Keep the whole battlefield (squad included) visible below the sticky site header.
  const panel = $('rushPanel'), stage = canvas.parentElement;
  const headerHeight = () => document.querySelector('site-header')?.getBoundingClientRect().height || 0;
  function fitStage() {
    const above = stage.getBoundingClientRect().top - panel.getBoundingClientRect().top;
    const avail = innerHeight - headerHeight() - above - 10;
    stage.style.width = Math.max(240, Math.min(panel.clientWidth, avail * W / H)) + 'px';
  }
  function scrollToStage() {
    const top = panel.getBoundingClientRect().top + scrollY - headerHeight() - 4;
    if (Math.abs(top - scrollY) > 8) scrollTo({ top: Math.max(0, top), behavior: 'instant' });
  }
  addEventListener('resize', fitStage);
  new ResizeObserver(fitStage).observe(panel);

  // ---------- Flow ----------
  function newGame() {
    S = fresh(); mode = 'play'; shake = 0;
    hideOverlay(); renderLoadout(); renderHud();
    ui.pause.disabled = false; ui.pause.textContent = '일시정지';
    S.nextWaveTimer = 0.01; S.wave = 0;
    fitStage(); scrollToStage();
    canvas.focus({ preventScroll: true });
  }
  function setPaused(on) {
    if (on && mode === 'play') { mode = 'paused'; ui.pause.textContent = '계속하기'; showOverlay('PAUSED', '일시정지', '계속하기 버튼이나 P 키를 눌러 전투를 이어가세요.', '계속하기'); }
    else if (!on && mode === 'paused') { mode = 'play'; ui.pause.textContent = '일시정지'; hideOverlay(); canvas.focus({ preventScroll: true }); }
  }
  function gameOver() {
    if (mode === 'over') return;
    mode = 'over';
    ui.pause.disabled = true;
    const best = readBest(), record = S.score > best.score;
    if (record) writeBest({ score: S.score, wave: S.wave, peak: S.peak });
    else if (S.peak > best.peak) writeBest({ ...best, peak: S.peak });
    renderBest(); renderHud(); renderLoadout();
    showOverlay('GAME OVER', record ? '새 최고 기록!' : '부대 전멸', `${S.wave}웨이브 · 최대 ${S.peak}기 · 처치 ${S.kills}기 · 캡슐 ${S.caught}개\n${C.WEAPONS[S.weapon].name} Lv.${S.wlevels[S.weapon]} · ${C.evolution(S.tier).name} · 점수 ${S.score.toLocaleString('ko-KR')}점`, '다시 도전');
    window.dispatchEvent(new CustomEvent('partygame:score', { detail: { gameId: 'missile-rush', score: S.score, wave: S.wave } }));
  }
  function loop(t) {
    const dt = Math.min(.05, (t - lastTime) / 1000 || 0); lastTime = t;
    if (mode === 'play') {
      update(dt);
      hudTimer -= dt; if (hudTimer <= 0) { renderHud(); hudTimer = .1; }
    } else if (!S) for (const s of stars) { s.y += s.v * dt; if (s.y > H) s.y = 0; }
    draw();
    requestAnimationFrame(loop);
  }

  // ---------- Input ----------
  ui.start.addEventListener('click', () => { if (mode === 'paused') setPaused(false); else newGame(); });
  ui.pause.addEventListener('click', () => setPaused(mode === 'play'));
  addEventListener('keydown', e => {
    if (e.target.closest?.('input,select,textarea')) return;
    const gameKey = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code);
    if (e.code === 'KeyP' || e.code === 'Escape') { if (mode === 'play' || mode === 'paused') { setPaused(mode === 'play'); e.preventDefault(); } return; }
    if ((e.code === 'Enter' || e.code === 'Space') && (mode === 'ready' || mode === 'over') && document.activeElement === canvas) { newGame(); e.preventDefault(); return; }
    if (mode === 'play' && (gameKey || /^Key[WASD]$/.test(e.code))) { keys.add(e.code); if (gameKey) e.preventDefault(); }
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => { keys.clear(); setPaused(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
  const toLogical = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  canvas.addEventListener('pointerdown', e => { if (mode !== 'play') return; const q = toLogical(e); drag = { id: e.pointerId, sx: q.x, sy: q.y, px: S.player.x, py: S.player.y }; canvas.setPointerCapture(e.pointerId); e.preventDefault(); });
  canvas.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId || mode !== 'play') return;
    const q = toLogical(e), p = S.player;
    p.x = drag.px + (q.x - drag.sx) * 1.15;
    p.y = drag.py + (q.y - drag.sy) * 1.15;
    clampPlayer();
  });
  const endDrag = e => { if (drag && drag.id === e.pointerId) drag = null; };
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  try { ui.sound.checked = localStorage.getItem('partygame.missileRush.sound') === '1'; ui.motion.checked = localStorage.getItem('partygame.missileRush.motion') === '1'; } catch { /* ignore */ }
  ui.sound.addEventListener('change', () => { try { localStorage.setItem('partygame.missileRush.sound', ui.sound.checked ? '1' : '0'); } catch { /* ignore */ } });
  ui.motion.addEventListener('change', () => { try { localStorage.setItem('partygame.missileRush.motion', ui.motion.checked ? '1' : '0'); } catch { /* ignore */ } });

  // Test hooks (read-only snapshot + deterministic helpers for automated browser checks).
  window.__missileRush = {
    get mode() { return mode; },
    snapshot: () => S && { weapon: S.weapon, wlevel: S.wlevels[S.weapon], crates: S.crates.map(c => c.id), boss: S.enemies.find(e => e.type === 'boss')?.boss || null, bullets: S.bullets.length, wave: S.wave, tier: S.tier, score: S.score, units: S.units, peak: S.peak, enemies: S.enemies.length, missiles: S.missiles.length, gates: S.gates.map(g => C.gateLabel(g)), log: S.log.map(l => l.label) },
    player: () => S && { x: S.player.x, y: S.player.y },
    freeze: () => { if (mode === 'play') mode = 'frozen'; },
    catchGate: (op, v) => catchGate({ op, v, x: S.player.x, y: S.player.y, pairId: 0 }),
    dropGates: (pair = true) => spawnGates(pair),
    // Drops a capsule right above the squad so the real fall/catch path is exercised.
    dropOnSquad: (op, v) => { const g = makeGate({ op, v }, S.player.x, 0); g.y = S.player.y - 140; S.gates.push(g); },
    setUnits: n => setUnits(n),
    holdCrates: () => { S.crates = []; S.crateTimer = Infinity; },
    spawnAbove: type => spawn(type, S.player.x, S.player.y - 380),
    pickWeapon: id => catchCrate({ id, x: S.player.x, y: S.player.y }),
    dropCrate: id => dropCrate(id, S.player.x, S.player.y - 150),
    killBoss: () => { const b = S.enemies.find(e => e.type === 'boss') || spawn('boss'); damage(b, b.hp + 1); },
    startWave: n => { S.enemies = []; S.queue = []; startWave(n); }
  };

  S = null; renderBest(); fitStage();
  ui.start.disabled = false; ui.start.textContent = '전투 시작';
  requestAnimationFrame(loop);
})();
