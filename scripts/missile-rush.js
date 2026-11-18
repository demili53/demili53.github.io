// Missile Rush: vertical endless shooter. Enemies pour from the top, the launcher at the bottom
// fires automatically and grows through level-up upgrade cards and boss-driven missile evolution.
(() => {
  const C = window.MissileRushCore;
  const W = 480, H = 760, LINE = 742;
  const canvas = document.getElementById('rushCanvas');
  const ctx = canvas.getContext('2d');
  const $ = id => document.getElementById(id);
  const ui = {
    wave: $('waveHud'), hp: $('hpHud'), level: $('levelHud'), score: $('scoreHud'), xpBar: $('xpBar'), xpText: $('xpText'),
    overlay: $('rushOverlay'), overlayKicker: $('overlayKicker'), overlayTitle: $('overlayTitle'), overlayText: $('overlayText'),
    start: $('startRush'), choices: $('upgradeChoices'), pause: $('pauseRush'), status: $('rushStatus'),
    tier: $('tierName'), stats: $('weaponStats'), owned: $('upgradeList'), best: $('rushBest'), banner: $('rushBanner'),
    sound: $('rushSound'), motion: $('rushMotion')
  };
  const BEST_KEY = 'partygame.missileRush.best';
  const readBest = () => { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || { score: 0, wave: 0 }; } catch { return { score: 0, wave: 0 }; } };
  const writeBest = v => { try { localStorage.setItem(BEST_KEY, JSON.stringify(v)); } catch { /* storage unavailable */ } };

  const stars = Array.from({ length: 90 }, () => ({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.6 + .3, v: Math.random() * 40 + 20 }));
  let S; // game state
  let mode = 'ready'; // ready | play | choose | paused | over
  let lastTime = 0, hudTimer = 0, shake = 0;
  const keys = new Set();
  let drag = null;

  function fresh() {
    return {
      player: { x: W / 2, y: 690, hp: 5, maxHp: 5, inv: 0 },
      missiles: [], enemies: [], bullets: [], gems: [], parts: [], texts: [],
      levels: {}, tier: 1, level: 1, xp: 0, score: 0, kills: 0, pendingLevels: 0,
      wave: 0, queue: [], spawnTimer: 0, nextWaveTimer: 0, fireTimer: 0, droneTimer: 0, time: 0, choices: [], bannerTimer: 0
    };
  }
  const stats = () => C.weaponStats(S.levels, S.tier);

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
    S.queue = q; S.spawnGap = plan.spawnGap; S.spawnTimer = 1.4;
    if (plan.boss) spawn('boss');
    banner(plan.boss ? `WAVE ${n} · 보스 출현` : `WAVE ${n}`);
    say(plan.boss ? '거대 요새선이 접근합니다. 처치하면 미사일이 진화합니다!' : `${n}웨이브 · 적 ${q.length}기 접근`);
  }
  function spawn(type, x, y) {
    const st = C.enemyStats(type, S.wave);
    const e = { type, x: x ?? (30 + Math.random() * (W - 60)), y: y ?? -st.r, hp: st.hp, maxHp: st.hp, speed: st.speed, r: st.r, score: st.score, xp: st.xp, color: st.color, t: Math.random() * 6, fire: 1.5 + Math.random() * 1.5, flash: 0, dir: Math.random() < .5 ? -1 : 1 };
    if (type === 'boss') { e.x = W / 2; e.fire = 2.2; e.summon = 4; }
    S.enemies.push(e);
    return e;
  }

  // ---------- Combat ----------
  function fire() {
    const st = stats();
    const n = st.count, spread = Math.min(.16, .5 / n);
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      const a = -Math.PI / 2 + k * spread;
      S.missiles.push({ x: S.player.x + k * 9, y: S.player.y - 26, vx: Math.cos(a) * st.speed, vy: Math.sin(a) * st.speed, dmg: st.damage, pierce: st.pierce, homing: st.homing, hit: new Set(), r: 4 + S.tier * .7, color: st.color, blast: st.blast, crit: st.crit, small: false });
    }
    if (S.time - lastShotSound > .09) { beep(520 + S.tier * 60, .06, 'triangle', .025, -260); lastShotSound = S.time; }
  }
  function fireDrones() {
    const st = stats();
    for (let d = 0; d < st.drones; d++) {
      const side = d === 0 ? -1 : 1;
      S.missiles.push({ x: S.player.x + side * 44, y: S.player.y - 4, vx: side * 60, vy: -460, dmg: st.damage * .55, pierce: 0, homing: 3, hit: new Set(), r: 3, color: '#a8fff0', blast: 0, crit: st.crit, small: true });
    }
  }
  function nearestEnemy(x, y) {
    let best = null, bd = Infinity;
    for (const e of S.enemies) { if (e.y < -10 || e.y > y + 20) continue; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < bd) { bd = d; best = e; } }
    return best;
  }
  function damage(e, amount, crit, x, y) {
    e.hp -= amount; e.flash = .08;
    if (crit) floatText(x, y - 10, '치명!', '#ffe27a');
    if (e.hp <= 0 && !e.dead) kill(e);
  }
  function kill(e) {
    e.dead = true; S.kills++; S.score += e.score;
    burst(e.x, e.y, e.color, e.type === 'boss' ? 70 : 12 + e.r * .6);
    shake = Math.max(shake, e.type === 'boss' ? 16 : e.r > 18 ? 4 : 0);
    beep(e.type === 'boss' ? 90 : 180 + Math.random() * 60, e.type === 'boss' ? .7 : .14, 'sawtooth', .035, -120);
    const gemCount = e.type === 'boss' ? 12 : 1;
    for (let i = 0; i < gemCount; i++) S.gems.push({ x: e.x + (Math.random() - .5) * e.r, y: e.y + (Math.random() - .5) * e.r, v: e.type === 'boss' ? Math.ceil(e.xp / gemCount) : e.xp, vy: 40 + Math.random() * 30, vx: (Math.random() - .5) * 60 });
    if (e.type === 'splitter') for (const s of [-1, 1]) { const sh = spawn('shard', e.x + s * 12, e.y); sh.dir = s; }
    if (e.type === 'boss') evolve();
  }
  function evolve() {
    const p = S.player;
    p.hp = Math.min(p.maxHp, p.hp + 2);
    S.score += 500 * S.wave;
    if (S.tier < C.EVOLUTIONS.length) {
      S.tier++;
      const evo = C.evolution(S.tier);
      banner(`미사일 진화 · ${evo.name}`);
      say(`보스 격파! 미사일이 ${evo.name}(으)로 진화했습니다. 피해 ×${evo.mult}`);
    } else {
      banner('보스 격파 · 최종 진화 유지');
      say('최종 진화 상태입니다. 보너스 점수와 내구도 회복을 획득했습니다.');
    }
    beep(330, .5, 'triangle', .05, 600);
    renderLoadout();
  }
  function hurtPlayer(reason) {
    const p = S.player;
    if (p.inv > 0) return;
    p.hp--; p.inv = 1.1; shake = Math.max(shake, 10);
    burst(p.x, p.y, '#ff8a7a', 18);
    beep(120, .3, 'square', .05, -60);
    say(reason);
    if (p.hp <= 0) gameOver();
  }
  function gainXp(v) {
    S.xp += v;
    let need = C.xpToNext(S.level);
    while (S.xp >= need) { S.xp -= need; S.level++; S.pendingLevels++; need = C.xpToNext(S.level); }
    if (S.pendingLevels && mode === 'play') openChoices();
  }

  // ---------- Upgrades ----------
  function openChoices() {
    S.choices = C.rollChoices(S.levels);
    if (!S.choices.length) { S.pendingLevels = 0; S.score += 300; say('모든 업그레이드 완료! 레벨업 보너스 300점'); return; }
    mode = 'choose';
    ui.choices.replaceChildren(...S.choices.map((id, i) => {
      const def = C.UPGRADES.find(u => u.id === id), lv = S.levels[id] || 0;
      const b = document.createElement('button');
      b.className = 'rush-card'; b.type = 'button'; b.dataset.upgrade = id;
      b.innerHTML = `<kbd>${i + 1}</kbd><span class="ico" aria-hidden="true">${def.icon}</span><b></b><small></small><em>Lv.${lv} → ${lv + 1} / ${def.max}</em>`;
      b.querySelector('b').textContent = def.name;
      b.querySelector('small').textContent = def.desc(lv);
      b.addEventListener('click', () => pick(id));
      return b;
    }));
    showOverlay('LEVEL UP · Lv.' + (S.level - S.pendingLevels + 1), '무기 업그레이드 선택', '세 가지 중 하나를 고르세요. 숫자키 1·2·3으로도 선택할 수 있습니다.', false);
    ui.choices.hidden = false;
    ui.choices.querySelector('button')?.focus({ preventScroll: true });
  }
  function pick(id) {
    if (mode !== 'choose') return;
    S.levels = C.applyUpgrade(S.levels, id);
    if (id === 'armor') { S.player.maxHp++; S.player.hp = S.player.maxHp; }
    const def = C.UPGRADES.find(u => u.id === id);
    say(`${def.name} Lv.${S.levels[id]} 장착 완료`);
    beep(660, .18, 'triangle', .04, 400);
    S.pendingLevels--;
    hideOverlay(); mode = 'play';
    renderLoadout();
    if (S.pendingLevels > 0) openChoices();
    canvas.focus({ preventScroll: true });
  }

  // ---------- Update ----------
  function update(dt) {
    S.time += dt;
    const p = S.player, st = stats();
    // movement
    const kx = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
    const ky = (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
    p.x += kx * 380 * dt; p.y += ky * 300 * dt;
    p.x = Math.max(24, Math.min(W - 24, p.x)); p.y = Math.max(470, Math.min(712, p.y));
    if (p.inv > 0) p.inv -= dt;

    // weapons
    S.fireTimer -= dt;
    if (S.fireTimer <= 0) { fire(); S.fireTimer += st.interval; if (S.fireTimer < 0) S.fireTimer = 0; }
    if (st.drones) { S.droneTimer -= dt; if (S.droneTimer <= 0) { fireDrones(); S.droneTimer = .75; } }

    // waves
    if (S.queue.length) {
      S.spawnTimer -= dt;
      if (S.spawnTimer <= 0) { spawn(S.queue.pop()); S.spawnTimer = S.spawnGap * (.6 + Math.random() * .8); }
    } else if (!S.enemies.length) {
      if (S.nextWaveTimer <= 0) { S.nextWaveTimer = 2.2; S.score += S.wave * 50; if (S.wave) banner(`WAVE ${S.wave} 클리어 +${S.wave * 50}`); }
      S.nextWaveTimer -= dt;
      if (S.nextWaveTimer <= 0) startWave(S.wave + 1);
    }

    // missiles
    for (const m of S.missiles) {
      if (m.homing) {
        const t = nearestEnemy(m.x, m.y);
        if (t) {
          const cur = Math.atan2(m.vy, m.vx), want = Math.atan2(t.y - m.y, t.x - m.x);
          let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          const turn = Math.max(-1, Math.min(1, d)) * m.homing * 2.6 * dt;
          const sp = Math.hypot(m.vx, m.vy), a = cur + turn;
          m.vx = Math.cos(a) * sp; m.vy = Math.sin(a) * sp;
        }
      }
      m.x += m.vx * dt; m.y += m.vy * dt;
      if (Math.random() < .5) S.parts.push({ x: m.x, y: m.y + 6, vx: (Math.random() - .5) * 30, vy: 60, life: .25, max: .25, r: m.small ? 1.5 : 2.4, color: m.color });
      for (const e of S.enemies) {
        if (e.dead || m.hit.has(e)) continue;
        if ((e.x - m.x) ** 2 + (e.y - m.y) ** 2 > (e.r + m.r) ** 2) continue;
        m.hit.add(e);
        const crit = Math.random() < m.crit, dmg = m.dmg * (crit ? 2 : 1);
        damage(e, dmg, crit, m.x, m.y);
        if (m.blast) {
          explosion(m.x, m.y, m.blast, m.color);
          for (const o of S.enemies) if (o !== e && !o.dead && (o.x - m.x) ** 2 + (o.y - m.y) ** 2 < (m.blast + o.r) ** 2) damage(o, dmg * .5, false, o.x, o.y);
        } else spark(m.x, m.y, m.color);
        if (--m.pierce < 0) { m.dead = true; break; }
      }
      if (m.y < -30 || m.x < -30 || m.x > W + 30 || m.y > H + 30) m.dead = true;
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
        case 'boss':
          if (e.y < 140) e.y += e.speed * 2 * dt;
          else { e.x += e.dir * 70 * dt; if (e.x < 80 || e.x > W - 80) e.dir *= -1; }
          e.fire -= dt;
          if (e.fire <= 0 && e.y > 60) {
            e.fire = Math.max(1.2, 2.4 - S.wave * .03);
            const n = 7 + Math.min(6, Math.floor(S.wave / 5));
            for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i - (n - 1) / 2) * .19; S.bullets.push({ x: e.x, y: e.y + 40, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, r: 5 }); }
          }
          e.summon -= dt;
          if (e.summon <= 0) { e.summon = 5; for (const s of [-1, 1]) spawn('drone', e.x + s * 50, e.y + 20); }
          break;
        case 'shard': e.y += e.speed * dt; e.x += e.dir * 50 * dt; break;
        default: e.y += e.speed * dt; e.x += Math.sin(e.t * 1.3) * 18 * dt;
      }
      e.x = Math.max(e.r, Math.min(W - e.r, e.x));
      if (e.type !== 'boss' && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r + 16) ** 2) { e.dead = true; burst(e.x, e.y, e.color, 10); hurtPlayer('적과 충돌했습니다! 내구도 -1'); }
      else if (e.y - e.r > LINE) { e.dead = true; hurtPlayer(`${C.ENEMIES[e.type].name}이(가) 방어선을 돌파했습니다! 내구도 -1`); }
      if (mode === 'over') return;
    }

    // enemy bullets
    for (const b of S.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < (b.r + 12) ** 2) { b.dead = true; hurtPlayer('적 탄환에 피격! 내구도 -1'); if (mode === 'over') return; }
      if (b.y > H + 10 || b.x < -10 || b.x > W + 10) b.dead = true;
    }

    // xp gems
    for (const g of S.gems) {
      const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy);
      if (d < st.magnet) { const sp = 480 * (1 - d / (st.magnet * 1.4)) + 160; g.x += dx / d * sp * dt; g.y += dy / d * sp * dt; }
      else { g.vx *= .96; g.x += g.vx * dt; g.y += g.vy * dt; }
      if (d < 22) { g.dead = true; gainXp(g.v); beep(900 + Math.random() * 200, .04, 'sine', .02); }
      else if (g.y > H + 10) g.dead = true;
    }

    // effects
    for (const q of S.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= .94; q.vy *= .94; q.life -= dt; }
    for (const t of S.texts) { t.y -= 30 * dt; t.life -= dt; }
    S.missiles = S.missiles.filter(o => !o.dead);
    S.enemies = S.enemies.filter(o => !o.dead);
    S.bullets = S.bullets.filter(o => !o.dead);
    S.gems = S.gems.filter(o => !o.dead);
    S.parts = S.parts.filter(o => o.life > 0);
    if (S.parts.length > 600) S.parts.splice(0, S.parts.length - 600);
    S.texts = S.texts.filter(o => o.life > 0);
    if (S.bannerTimer > 0) { S.bannerTimer -= dt; if (S.bannerTimer <= 0) ui.banner.hidden = true; }
    for (const s of stars) { s.y += s.v * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; } }
    if (shake > 0) shake = Math.max(0, shake - dt * 40);
  }
  function aimShot(x, y, speed) {
    const a = Math.atan2(S.player.y - y, S.player.x - x);
    S.bullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5 });
  }
  function burst(x, y, color, n) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = Math.random() * 220 + 40; S.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: .5 + Math.random() * .4, max: .9, r: Math.random() * 3 + 1.5, color }); }
  }
  function spark(x, y, color) { for (let i = 0; i < 4; i++) S.parts.push({ x, y, vx: (Math.random() - .5) * 160, vy: (Math.random() - .5) * 160, life: .2, max: .2, r: 1.8, color }); }
  function explosion(x, y, r, color) { S.parts.push({ x, y, vx: 0, vy: 0, life: .25, max: .25, r, color, ring: true }); spark(x, y, color); }
  function floatText(x, y, text, color) { if (S.texts.length < 30) S.texts.push({ x, y, text, color, life: .7 }); }

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

    for (const gm of S.gems) { ctx.fillStyle = gm.v > 2 ? '#7cf5ff' : '#8dffb0'; ctx.beginPath(); ctx.moveTo(gm.x, gm.y - 5); ctx.lineTo(gm.x + 4, gm.y); ctx.lineTo(gm.x, gm.y + 5); ctx.lineTo(gm.x - 4, gm.y); ctx.fill(); }
    for (const e of S.enemies) drawEnemy(e);
    for (const m of S.missiles) drawMissile(m);
    ctx.fillStyle = '#ff7b9c';
    for (const b of S.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffe1ea'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * .45, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff7b9c'; }
    for (const q of S.parts) {
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      if (q.ring) { ctx.strokeStyle = q.color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1.2 - q.life / q.max * .6), 0, Math.PI * 2); ctx.stroke(); }
      else { ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.globalAlpha = 1;
    drawPlayer();
    ctx.font = '800 12px Pretendard Variable, sans-serif'; ctx.textAlign = 'center';
    for (const t of S.texts) { ctx.globalAlpha = Math.min(1, t.life * 2); ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y); }
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
    ctx.restore();
  }
  function drawMissile(m) {
    const a = Math.atan2(m.vy, m.vx);
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(a + Math.PI / 2);
    const L = m.small ? 9 : 10 + S.tier * 2.2, w = m.small ? 2.2 : 2.6 + S.tier * .5;
    ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = S.tier >= 3 ? 10 : 4;
    ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(w, -L * .45); ctx.lineTo(w, L * .55); ctx.lineTo(w * 1.9, L); ctx.lineTo(-w * 1.9, L); ctx.lineTo(-w, L * .55); ctx.lineTo(-w, -L * .45); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = '#ffffffcc'; ctx.fillRect(-w * .45, -L * .55, w * .9, L * .45);
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.moveTo(-w, L); ctx.lineTo(0, L + 6 + Math.random() * 6); ctx.lineTo(w, L); ctx.fill();
    ctx.restore();
  }
  function drawPlayer() {
    const p = S.player, st = stats();
    if (p.inv > 0 && Math.floor(p.inv * 14) % 2) return;
    ctx.save(); ctx.translate(p.x, p.y);
    // drones
    for (let d = 0; d < st.drones; d++) { const s = d === 0 ? -1 : 1; ctx.save(); ctx.translate(s * 44, 2 + Math.sin(S.time * 4 + d) * 3); ctx.fillStyle = '#5ee6cf'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 8); ctx.lineTo(-8, 0); ctx.fill(); ctx.fillStyle = '#e8fffb'; ctx.fillRect(-2, -3, 4, 4); ctx.restore(); }
    // treads + hull
    ctx.fillStyle = '#26364c'; ctx.fillRect(-26, 6, 52, 14); ctx.fillStyle = '#3d5574';
    for (let i = -22; i < 24; i += 8) ctx.fillRect(i, 9, 4, 8);
    ctx.fillStyle = '#4fd1b8'; ctx.beginPath(); ctx.moveTo(-22, 8); ctx.lineTo(-16, -8); ctx.lineTo(16, -8); ctx.lineTo(22, 8); ctx.closePath(); ctx.fill();
    // launcher tubes reflect missile count
    const tubes = Math.min(7, st.count);
    for (let i = 0; i < tubes; i++) { const k = i - (tubes - 1) / 2; ctx.fillStyle = '#d7f7ef'; ctx.fillRect(k * 7 - 2.5, -26, 5, 18); ctx.fillStyle = st.color; ctx.fillRect(k * 7 - 2.5, -28, 5, 4); }
    ctx.fillStyle = '#1d6b62'; ctx.beginPath(); ctx.arc(0, -4, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = st.color; ctx.beginPath(); ctx.arc(0, -4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // magnet range hint
    ctx.strokeStyle = '#8dffb018'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p.x, p.y, st.magnet, 0, Math.PI * 2); ctx.stroke();
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
        ctx.moveTo(-r * 1.4, -r * .5); ctx.lineTo(-r * .6, -r * .9); ctx.lineTo(r * .6, -r * .9); ctx.lineTo(r * 1.4, -r * .5); ctx.lineTo(r * 1.1, r * .4); ctx.lineTo(r * .35, r * .85); ctx.lineTo(-r * .35, r * .85); ctx.lineTo(-r * 1.1, r * .4); break;
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0b0f1ecc';
    if (e.type === 'tank') { ctx.fillRect(-r * .55, -r * .2, r * 1.1, r * .4); }
    else if (e.type === 'gunner') { ctx.fillRect(-3, 0, 6, r * 1.2); }
    else if (e.type === 'splitter') { ctx.beginPath(); ctx.arc(-r * .35, 0, r * .3, 0, Math.PI * 2); ctx.arc(r * .35, 0, r * .3, 0, Math.PI * 2); ctx.fill(); }
    else if (e.type === 'boss') { ctx.fillRect(-r * .8, -r * .3, r * 1.6, r * .35); ctx.fillStyle = '#ffd36e'; for (const s of [-1, 0, 1]) { ctx.beginPath(); ctx.arc(s * r * .55, r * .5, 6, 0, Math.PI * 2); ctx.fill(); } }
    else { ctx.beginPath(); ctx.arc(0, 0, r * .25, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    if (e.hp < e.maxHp || e.type === 'boss') {
      const bw = e.type === 'boss' ? 160 : r * 2, by = e.type === 'boss' ? e.y - r - 16 : e.y - r - 8;
      ctx.fillStyle = '#0008'; ctx.fillRect(e.x - bw / 2, by, bw, e.type === 'boss' ? 6 : 3);
      ctx.fillStyle = e.type === 'boss' ? '#ff5a6a' : '#9dffb4'; ctx.fillRect(e.x - bw / 2, by, bw * Math.max(0, e.hp / e.maxHp), e.type === 'boss' ? 6 : 3);
    }
  }

  // ---------- HUD / DOM ----------
  function renderHud() {
    if (!S) return;
    ui.wave.textContent = String(Math.max(1, S.wave));
    ui.hp.textContent = `${S.player.hp} / ${S.player.maxHp}`;
    ui.hp.classList.toggle('danger', S.player.hp <= 2);
    ui.level.textContent = 'Lv.' + S.level;
    ui.score.textContent = S.score.toLocaleString('ko-KR');
    const need = C.xpToNext(S.level);
    ui.xpBar.style.width = Math.min(100, S.xp / need * 100) + '%';
    ui.xpText.textContent = `${S.xp} / ${need} XP`;
  }
  function renderLoadout() {
    const st = stats(), evo = C.evolution(S.tier);
    ui.tier.textContent = evo.name; ui.tier.style.color = evo.color;
    document.querySelectorAll('#evoTrack span').forEach((el, i) => { el.style.background = i < S.tier ? C.EVOLUTIONS[i].color : ''; });
    const rows = [['피해', st.damage.toFixed(1)], ['초당 발사', (1 / st.interval).toFixed(1) + '회'], ['동시 발사', st.count + '발'], ['관통', st.pierce + '회'], ['유도', st.homing ? st.homing + '단계' : '없음'], ['폭발 반경', st.blast || '없음'], ['드론', st.drones + '기'], ['치명타', Math.round(st.crit * 100) + '%']];
    ui.stats.replaceChildren(...rows.map(([k, v]) => { const li = document.createElement('li'); li.innerHTML = '<span></span><b></b>'; li.firstChild.textContent = k; li.lastChild.textContent = v; return li; }));
    const owned = C.UPGRADES.filter(u => S.levels[u.id]);
    if (!owned.length) { const li = document.createElement('li'); li.className = 'empty'; li.textContent = '레벨업하면 업그레이드 카드를 선택합니다.'; ui.owned.replaceChildren(li); }
    else ui.owned.replaceChildren(...owned.map(u => { const li = document.createElement('li'); li.textContent = `${u.icon} ${u.name}`; const b = document.createElement('b'); b.textContent = `${S.levels[u.id]} / ${u.max}`; li.append(b); return li; }));
  }
  function renderBest() { const b = readBest(); ui.best.textContent = `${b.score.toLocaleString('ko-KR')}점 · ${b.wave}웨이브`; }
  function say(text) { ui.status.textContent = text; }
  function banner(text) { ui.banner.textContent = text; ui.banner.hidden = false; S.bannerTimer = 2; }
  function showOverlay(kicker, title, text, withButton, buttonLabel) {
    ui.overlayKicker.textContent = kicker; ui.overlayTitle.textContent = title; ui.overlayText.textContent = text;
    ui.start.hidden = !withButton; if (buttonLabel) ui.start.textContent = buttonLabel;
    ui.choices.hidden = true; ui.overlay.hidden = false;
  }
  function hideOverlay() { ui.overlay.hidden = true; ui.choices.hidden = true; }

  // ---------- Layout ----------
  // Keep the whole battlefield (launcher included) visible below the sticky site header.
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
    if (on && mode === 'play') { mode = 'paused'; ui.pause.textContent = '계속하기'; showOverlay('PAUSED', '일시정지', '계속하기 버튼이나 P 키를 눌러 전투를 이어가세요.', true, '계속하기'); }
    else if (!on && mode === 'paused') { mode = 'play'; ui.pause.textContent = '일시정지'; hideOverlay(); canvas.focus({ preventScroll: true }); }
  }
  function gameOver() {
    mode = 'over';
    ui.pause.disabled = true;
    const best = readBest(), record = S.score > best.score;
    if (record) writeBest({ score: S.score, wave: S.wave });
    renderBest(); renderHud();
    showOverlay('GAME OVER', record ? '새 최고 기록!' : '방어선 붕괴', `${S.wave}웨이브 · Lv.${S.level} · 처치 ${S.kills}기 · ${C.evolution(S.tier).name}\n점수 ${S.score.toLocaleString('ko-KR')}점`, true, '다시 도전');
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
    if (mode === 'choose' && /^Digit[1-3]$/.test(e.code)) { const id = S.choices[+e.code.slice(5) - 1]; if (id) pick(id); e.preventDefault(); return; }
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
    p.x = Math.max(24, Math.min(W - 24, drag.px + (q.x - drag.sx) * 1.15));
    p.y = Math.max(470, Math.min(712, drag.py + (q.y - drag.sy) * 1.15));
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
    snapshot: () => S && { wave: S.wave, level: S.level, tier: S.tier, score: S.score, hp: S.player.hp, enemies: S.enemies.length, missiles: S.missiles.length, levels: { ...S.levels }, choices: [...S.choices] },
    player: () => S && { x: S.player.x, y: S.player.y },
    freeze: () => { if (mode === 'play') mode = 'frozen'; },
    grantXp: v => gainXp(v),
    killBoss: () => { const b = S.enemies.find(e => e.type === 'boss') || spawn('boss'); damage(b, b.hp + 1, false, b.x, b.y); },
    startWave: n => { S.enemies = []; S.queue = []; startWave(n); }
  };

  S = null; renderBest(); fitStage();
  ui.start.disabled = false; ui.start.textContent = '전투 시작';
  requestAnimationFrame(loop);
})();
