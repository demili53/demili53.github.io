// Missile Rush renderer. Reads the game state and paints one frame; it never changes the simulation.
// Drawn at device resolution. Everything that glows is a cached sprite stamped with additive blending,
// so there is no per-frame shadowBlur even with hundreds of shots on screen.
window.MissileRushRender = function (canvas, C, opt) {
  const W = C.FIELD.w, H = C.FIELD.h, LINE = C.FIELD.line, GATE_H = opt.GATE_H, SOLO_W = opt.SOLO_W;
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * DPR; canvas.height = H * DPR;
  const FONT = 'Pretendard Variable, sans-serif';
  const TAU = Math.PI * 2;
  let clock = 0;

  // ---------- Sprite cache and colour helpers ----------
  const cache = new Map();
  function sprite(key, w, h, paint) {
    let c = cache.get(key);
    if (!c) { c = document.createElement('canvas'); c.width = Math.ceil(w * DPR); c.height = Math.ceil(h * DPR); c.w = w; c.h = h; const g = c.getContext('2d'); g.scale(DPR, DPR); paint(g); cache.set(key, c); }
    return c;
  }
  const stamp = (c, x, y, k = 1) => ctx.drawImage(c, x - c.w * k / 2, y - c.h * k / 2, c.w * k, c.h * k);
  const glow = color => sprite('glow' + color, 64, 64, g => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, color); r.addColorStop(.25, color + 'aa'); r.addColorStop(1, color + '00'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const hex = n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  // Mix a #rrggbb colour toward white (t > 0) or black (t < 0).
  function shade(color, t) { const to = t > 0 ? 255 : 0, k = Math.abs(t); return '#' + [1, 3, 5].map(i => { const c = parseInt(color.slice(i, i + 2), 16); return hex(c + (to - c) * k); }).join(''); }
  const lighter = () => { ctx.globalCompositeOperation = 'lighter'; };
  const normal = () => { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; };
  function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function outlined(text, x, y, fill) { ctx.lineJoin = 'round'; ctx.strokeStyle = '#050a16cc'; ctx.lineWidth = 3.5; ctx.strokeText(text, x, y); ctx.fillStyle = fill; ctx.fillText(text, x, y); }

  // ---------- Backdrop: four sectors, one per boss cycle ----------
  const SECTORS = [
    { sky: ['#070b1f', '#101538', '#1c1433'], clouds: ['#3b5bdb', '#7048e8', '#1098ad'], planet: '#5c7cfa' },
    { sky: ['#0c0a1f', '#221238', '#33142b'], clouds: ['#e64980', '#be4bdb', '#f76707'], planet: '#f783ac' },
    { sky: ['#04141c', '#0b2a33', '#12203a'], clouds: ['#0ca678', '#1c7ed6', '#22b8cf'], planet: '#63e6be' },
    { sky: ['#1a0d0a', '#2e1512', '#201430'], clouds: ['#f08c00', '#e03131', '#9c36b5'], planet: '#ffa94d' }
  ];
  const backdrop = i => sprite('sky' + i, W, H, g => {
    const sec = SECTORS[i], sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, sec.sky[0]); sky.addColorStop(.6, sec.sky[1]); sky.addColorStop(1, sec.sky[2]);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const rnd = C.seeded(17 + i * 101);
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 9; k++) {
      const x = rnd() * W, y = rnd() * H * .85, r = 90 + rnd() * 150, col = sec.clouds[k % 3];
      const c = g.createRadialGradient(x, y, 0, x, y, r); c.addColorStop(0, col + '2e'); c.addColorStop(.5, col + '12'); c.addColorStop(1, col + '00');
      g.fillStyle = c; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let k = 0; k < 150; k++) { g.fillStyle = `rgba(210,225,255,${.12 + rnd() * .3})`; g.fillRect(rnd() * W, rnd() * H, .8, .8); }
  });
  const planet = i => sprite('planet' + i, 150, 150, g => {
    const col = SECTORS[i].planet;
    const halo = g.createRadialGradient(75, 75, 40, 75, 75, 75); halo.addColorStop(0, col + '44'); halo.addColorStop(1, col + '00'); g.fillStyle = halo; g.fillRect(0, 0, 150, 150);
    const body = g.createRadialGradient(58, 56, 4, 75, 75, 48); body.addColorStop(0, shade(col, .45)); body.addColorStop(.55, shade(col, -.25)); body.addColorStop(1, shade(col, -.8));
    g.fillStyle = body; g.beginPath(); g.arc(75, 75, 46, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(75, 75, 46, 0, TAU); g.clip(); g.strokeStyle = '#ffffff14'; g.lineWidth = 5;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.ellipse(75, 44 + k * 16, 60, 7, -.25, 0, TAU); g.stroke(); }
    g.restore();
    g.strokeStyle = shade(col, .5) + '99'; g.lineWidth = 2.5; g.beginPath(); g.ellipse(75, 75, 70, 14, -.3, .12, Math.PI - .12); g.stroke();
  });
  const vignette = () => sprite('vignette', W, H, g => { const v = g.createRadialGradient(W / 2, H * .55, H * .32, W / 2, H * .55, H * .78); v.addColorStop(0, '#00000000'); v.addColorStop(1, '#000000a0'); g.fillStyle = v; g.fillRect(0, 0, W, H); });
  const stars = Array.from({ length: 110 }, () => { const s = Math.random() * 1.7 + .3; return { x: Math.random() * W, y: Math.random() * H, s, v: 12 + s * 34, p: Math.random() * TAU }; });
  const meteors = [];

  function drawBackdrop(S, dt) {
    const sec = S ? Math.floor(Math.max(0, S.wave - 1) / C.BOSS_EVERY) % SECTORS.length : 0;
    ctx.drawImage(backdrop(sec), -20, -20, W + 40, H + 40);
    stamp(planet(sec), 372, (clock * 5) % (H + 400) - 150);
    lighter(); ctx.globalAlpha = .16; // slow aurora in the sector's colours
    for (let i = 0; i < 3; i++) ctx.drawImage(glow(SECTORS[sec].clouds[i]), W * (.5 + .45 * Math.sin(clock * .11 + i * 2.1)) - 190, H * (.28 + .2 * i + .08 * Math.cos(clock * .09 + i)) - 150, 380, 300);
    ctx.globalAlpha = 1; ctx.lineCap = 'round';
    if (Math.random() < dt * .35) meteors.push({ x: Math.random() * W, y: -10, vx: -120 - Math.random() * 160, vy: 380 + Math.random() * 260, life: .9 });
    for (const m of meteors) {
      m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt;
      const k = Math.max(0, m.life / .9), g = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * .09, m.y - m.vy * .09);
      g.addColorStop(0, `rgba(255,255,255,${.8 * k})`); g.addColorStop(1, 'rgba(160,200,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * .09, m.y - m.vy * .09); ctx.stroke();
    }
    if (meteors.length && meteors[0].life <= 0) meteors.shift();
    ctx.lineCap = 'butt'; normal();
    for (const s of stars) {
      s.y += s.v * dt; if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
      ctx.globalAlpha = (.3 + s.s * .28) * (.7 + .3 * Math.sin(clock * 2.4 + s.p));
      ctx.fillStyle = s.s > 1.5 ? '#ffffff' : '#bcd0ff'; ctx.fillRect(s.x, s.y, s.s, s.s * (1 + s.v / 26));
    }
    ctx.globalAlpha = 1;
    // defense line
    const band = ctx.createLinearGradient(0, LINE - 26, 0, H); band.addColorStop(0, '#ff6f7d00'); band.addColorStop(.35, '#ff6f7d1c'); band.addColorStop(1, '#ff6f7d05');
    ctx.fillStyle = band; ctx.fillRect(-20, LINE - 26, W + 40, H - LINE + 46);
    lighter();
    ctx.strokeStyle = '#ff6f7d'; ctx.globalAlpha = .55 + .2 * Math.sin(clock * 3); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-20, LINE); ctx.lineTo(W + 20, LINE); ctx.stroke();
    ctx.globalAlpha = .6; const pulse = glow('#ff8a93');
    for (let i = 0; i < 4; i++) ctx.drawImage(pulse, ((clock * 70 + i * 140) % (W + 80)) - 60, LINE - 5, 44, 10);
    if (S) for (const r of S.ripples) { const k = Math.max(0, r.life / .6); ctx.globalAlpha = k; ctx.drawImage(glow('#ff5a6a'), r.x - 90 * (1.4 - k), LINE - 22, 180 * (1.4 - k), 44); ctx.strokeStyle = '#ffd0d4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(r.x, LINE, 60 * (1 - k) + 6, Math.PI, TAU); ctx.stroke(); }
    normal();
    ctx.fillStyle = '#ffb3ba88'; ctx.font = `700 9px ${FONT}`; ctx.textAlign = 'left'; ctx.fillText('DEFENSE LINE', 8, LINE + 13);
  }

  // ---------- Operator gates ----------
  function gateColor(g) { const mult = g.op === '×' || g.op === '÷'; return C.isGood(g) ? (mult ? '#3fd7ff' : '#4fe39a') : (mult ? '#ff5f9e' : '#ff6a5f'); }
  function drawRow(S, row, dps) {
    const pop = row.age < .3 ? row.age / .3 : 1;
    for (let i = 0; i < row.gates.length; i++) {
      const g = row.gates[i], base = gateColor(g);
      const x0 = row.solo ? row.solo - SOLO_W / 2 : i * W / row.lanes, w = row.solo ? SOLO_W : W / row.lanes, pad = 5;
      const gx = x0 + pad, gw = w - pad * 2, gy = row.y - GATE_H / 2;
      ctx.save(); ctx.globalAlpha = pop;
      // light curtain above the gate so its lane reads from far away
      const tail = ctx.createLinearGradient(0, gy - 90, 0, gy); tail.addColorStop(0, base + '00'); tail.addColorStop(1, base + '30');
      ctx.fillStyle = tail; ctx.fillRect(gx + 8, gy - 90, gw - 16, 92);
      lighter(); ctx.globalAlpha = pop * (.42 + .12 * Math.sin(clock * 5 + i)); ctx.drawImage(glow(base), gx - 22, gy - 20, gw + 44, GATE_H + 40); normal(); ctx.globalAlpha = pop;
      const body = ctx.createLinearGradient(0, gy, 0, gy + GATE_H);
      if (g.flash > 0) { body.addColorStop(0, '#ffffff'); body.addColorStop(1, shade(base, .5)); }
      else { body.addColorStop(0, shade(base, -.35) + 'f2'); body.addColorStop(.5, shade(base, -.62) + 'f2'); body.addColorStop(1, shade(base, -.45) + 'f2'); }
      roundRect(ctx, gx, gy, gw, GATE_H, 12); ctx.fillStyle = body; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = base; ctx.stroke();
      roundRect(ctx, gx + 5, gy + 4, gw - 10, GATE_H * .34, 8); ctx.fillStyle = '#ffffff20'; ctx.fill();
      // posts at both ends make it read as a gate you fly through
      ctx.fillStyle = base; for (const px of [gx + 3, gx + gw - 9]) { roundRect(ctx, px, gy - 5, 6, GATE_H + 10, 3); ctx.fill(); }
      if (g.op === '+' || g.op === '-') { // shots left to bend it, and progress to the next step
        for (let k = 0; k < C.MAX_SHIFTS; k++) { ctx.fillStyle = k < g.shifts ? '#ffe27a' : '#ffffff26'; ctx.fillRect(gx + gw / 2 - 11 + k * 8, gy + GATE_H - 7, 5, 2.5); }
        if (C.shiftable(g)) { ctx.fillStyle = '#ffe27a'; ctx.fillRect(gx + 16, gy + 3, (gw - 32) * Math.min(1, g.dmg / C.shiftCost(dps, S.wave)), 2); }
      }
      ctx.font = `900 24px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      outlined(C.gateLabel(g), gx + gw / 2, row.y - 1, '#ffffff');
      ctx.restore();
    }
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function drawCrate(S, c) {
    const w = C.WEAPONS[c.id], r = 19;
    const hexPath = (rad, rot) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + rot; ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); } ctx.closePath(); };
    ctx.save(); ctx.translate(c.x, c.y);
    const pillar = ctx.createLinearGradient(0, -120, 0, 0); pillar.addColorStop(0, w.color + '00'); pillar.addColorStop(1, w.color + '38');
    ctx.fillStyle = pillar; ctx.fillRect(-9, -120, 18, 120);
    lighter(); stamp(glow(w.color), 0, 0, 1.25 + .15 * Math.sin(c.t * 4)); normal();
    ctx.strokeStyle = w.color + '99'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); hexPath(r + 7, c.t * 1.2); ctx.stroke(); ctx.setLineDash([]);
    const body = ctx.createLinearGradient(0, -r, 0, r); body.addColorStop(0, '#22344f'); body.addColorStop(1, '#0b1322');
    hexPath(r, Math.PI / 6); ctx.fillStyle = body; ctx.fill(); ctx.strokeStyle = w.color; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = w.color; ctx.font = `900 18px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(w.icon, 0, 1);
    ctx.font = `800 10px ${FONT}`;
    outlined(c.id === S.weapon ? (S.wlevels[c.id] >= C.WEAPON_MAX_LEVEL ? w.name + ' +3기' : w.name + ' 강화') : w.name, 0, r + 14, '#e6f0ff');
    ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ---------- Fleet ----------
  // Three hulls share one palette; the nose light takes the weapon colour.
  const CRAFT = {
    light: { w: 16, h: 20, area: 1 },
    fighter: { w: 24, h: 28, area: 2.6 },
    heavy: { w: 38, h: 42, area: 6.5 }
  };
  const craftSprite = (kind, color) => sprite(kind + color, CRAFT[kind].w, CRAFT[kind].h, g => {
    const w = CRAFT[kind].w, h = CRAFT[kind].h;
    g.translate(w / 2, h / 2);
    const hull = (a, b) => { const l = g.createLinearGradient(0, -h / 2, 0, h / 2); l.addColorStop(0, a); l.addColorStop(1, b); return l; };
    g.fillStyle = '#00000055'; g.beginPath(); g.ellipse(0, h * .36, w * .42, h * .1, 0, 0, TAU); g.fill();
    if (kind === 'light') {
      g.fillStyle = '#1c2a3f'; g.fillRect(-6.5, 3.5, 13, 4.5); g.fillStyle = '#3d5574'; for (let x = -5.5; x < 6; x += 3) g.fillRect(x, 4.5, 1.5, 2.5);
      g.fillStyle = hull('#7ff0d8', '#2a9d8a'); g.beginPath(); g.moveTo(-5.5, 5); g.lineTo(-3.5, -1.5); g.lineTo(3.5, -1.5); g.lineTo(5.5, 5); g.closePath(); g.fill();
      g.fillStyle = '#eafffa'; g.fillRect(-1.3, -8, 2.6, 8); g.fillStyle = color; g.fillRect(-1.6, -9.5, 3.2, 2.5);
    } else if (kind === 'fighter') {
      g.fillStyle = hull('#9ad8ff', '#2f6fb3'); g.beginPath(); g.moveTo(0, -12); g.lineTo(4, -2); g.lineTo(11, 7); g.lineTo(4, 6); g.lineTo(2.5, 11); g.lineTo(-2.5, 11); g.lineTo(-4, 6); g.lineTo(-11, 7); g.lineTo(-4, -2); g.closePath(); g.fill();
      g.strokeStyle = '#0b1a30'; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#e8f6ff'; g.beginPath(); g.ellipse(0, -3, 1.8, 4, 0, 0, TAU); g.fill();
      g.fillStyle = color; g.fillRect(-10, 5, 3, 2); g.fillRect(7, 5, 3, 2); g.fillRect(-1, -13, 2, 3);
      g.fillStyle = '#ffd08a'; g.fillRect(-2, 11, 4, 2);
    } else {
      g.fillStyle = hull('#c9b6ff', '#5a3fb0'); g.beginPath(); g.moveTo(-6, -17); g.lineTo(6, -17); g.lineTo(11, -4); g.lineTo(17, 6); g.lineTo(13, 16); g.lineTo(-13, 16); g.lineTo(-17, 6); g.lineTo(-11, -4); g.closePath(); g.fill();
      g.strokeStyle = '#150b33'; g.lineWidth = 1.2; g.stroke();
      g.fillStyle = '#2a1d5c'; g.fillRect(-9, -2, 18, 6); g.fillStyle = '#f1ebff'; g.fillRect(-7, -1, 14, 1.5);
      g.fillStyle = '#e9e2ff'; for (const s of [-1, 1]) g.fillRect(s * 8 - 1.5, -21, 3, 12);
      g.fillStyle = color; for (const s of [-1, 1]) g.fillRect(s * 8 - 2, -21, 4, 3); g.fillRect(-2, 6, 4, 4);
      g.fillStyle = '#ffd08a'; for (const s of [-1, 0, 1]) g.fillRect(s * 7 - 2, 16, 4, 2.5);
    }
  });
  // Lay the craft out as a sunflower disc, big hulls in the middle. Cached per composition.
  const layouts = new Map();
  function layout(units) {
    const f = C.composition(units), key = f.heavy + '/' + f.fighter + '/' + f.light;
    let out = layouts.get(key);
    if (!out) {
      out = []; let area = 0;
      for (const kind of ['heavy', 'fighter', 'light']) for (let i = 0; i < f[kind]; i++) {
        const a = out.length * 2.39996, r = 5.4 * Math.sqrt(area);
        out.push({ kind, x: Math.cos(a) * r * 1.15, y: Math.sin(a) * r * .8 });
        area += CRAFT[kind].area;
      }
      out.sort((p, q) => p.y - q.y); // back rows first so nearer hulls overlap them
      if (layouts.size > 400) layouts.clear();
      layouts.set(key, out);
    }
    return out;
  }
  function drawFleet(S, st) {
    const p = S.player;
    if (p.inv > 0 && Math.floor(p.inv * 20) % 2) return;
    const scale = 1 + Math.max(0, S.pulse) * .4, rx = st.radius * 1.12, ry = st.radius * .82;
    ctx.save(); ctx.translate(p.x, p.y);
    const field = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); field.addColorStop(0, st.color + '30'); field.addColorStop(.8, st.color + '10'); field.addColorStop(1, st.color + '00');
    ctx.save(); ctx.scale(1, ry / rx); ctx.fillStyle = field; ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill();
    ctx.strokeStyle = st.color + '66'; ctx.lineWidth = 1.2; ctx.setLineDash([10, 7]); ctx.lineDashOffset = -clock * 30; ctx.beginPath(); ctx.arc(0, 0, rx * .96 * scale, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
    const tilt = Math.max(-.2, Math.min(.2, p.vx * .0006)); // the whole fleet leans into a turn
    const crafts = layout(Math.round(S.shown));
    for (let i = 0; i < crafts.length; i++) {
      const c = crafts[i], x = c.x * scale, y = c.y * scale + Math.sin(clock * 3 + i * 1.7) * .8 + S.recoil * 2.2;
      lighter(); ctx.globalAlpha = .5 + .3 * Math.random(); stamp(glow('#ffb347'), x, y + CRAFT[c.kind].h * .42, CRAFT[c.kind].w / 70); normal(); // engine glow
      ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); stamp(craftSprite(c.kind, st.color), 0, 0); ctx.restore();
    }
    ctx.restore();
    // unit count badge
    const label = S.units + '', by = p.y - st.radius * .8 - 24, danger = S.units <= 2;
    ctx.font = `900 16px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const bw = Math.max(36, ctx.measureText(label).width + 20);
    lighter(); ctx.globalAlpha = .5; ctx.drawImage(glow(danger ? '#ff6a5f' : st.color), p.x - bw / 2 - 12, by - 22, bw + 24, 44); normal();
    const bd = ctx.createLinearGradient(0, by - 12, 0, by + 12); bd.addColorStop(0, danger ? '#ff8a7a' : '#1b2a44'); bd.addColorStop(1, danger ? '#c23b32' : '#0a1220');
    roundRect(ctx, p.x - bw / 2, by - 12, bw, 24, 12); ctx.fillStyle = bd; ctx.fill(); ctx.strokeStyle = danger ? '#ffd0cb' : st.color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillText(label, p.x, by + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ---------- Shots ----------
  function drawShots(S) {
    lighter(); ctx.lineCap = 'round';
    for (const m of S.shots) { // light streak behind every shot
      if (m.kind === 'wave') continue;
      const len = m.kind === 'scatter' ? .045 : m.kind === 'homing' ? .09 : .06, tx = m.x - m.vx * len, ty = m.y - m.vy * len;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty); g.addColorStop(0, m.color); g.addColorStop(1, m.color + '00');
      ctx.strokeStyle = g; ctx.lineWidth = m.kind === 'blast' ? m.r * 1.5 : m.r * .9; ctx.globalAlpha = m.life !== undefined ? Math.min(1, m.life * 4) : .85;
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const b of S.bullets) { const g = ctx.createLinearGradient(b.x, b.y, b.x - b.vx * .07, b.y - b.vy * .07); g.addColorStop(0, '#ff7b9ccc'); g.addColorStop(1, '#ff7b9c00'); ctx.strokeStyle = g; ctx.lineWidth = b.r * 1.5; ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * .07, b.y - b.vy * .07); ctx.stroke(); }
    for (const m of S.shots) {
      if (m.kind === 'wave') { // widening crescent
        ctx.strokeStyle = m.color; ctx.lineWidth = 5; ctx.globalAlpha = .9; ctx.beginPath(); ctx.moveTo(m.x - m.w, m.y + 8); ctx.quadraticCurveTo(m.x, m.y - 14, m.x + m.w, m.y + 8); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(m.x - m.w, m.y + 8); ctx.quadraticCurveTo(m.x, m.y - 14, m.x + m.w, m.y + 8); ctx.stroke();
        ctx.globalAlpha = .35; ctx.drawImage(glow(m.color), m.x - m.w - 14, m.y - 22, m.w * 2 + 28, 44); ctx.globalAlpha = 1;
      } else stamp(glow(m.color), m.x, m.y, (m.kind === 'blast' ? .62 : .4) + m.r * .03);
    }
    for (const b of S.bullets) stamp(glow(b.bomb ? '#ffd43b' : '#ff7b9c'), b.x, b.y, b.bomb ? .7 : .5);
    for (const b of S.bolts) { // lightning: a jagged line redrawn every frame
      const k = Math.max(0, b.life / .14);
      for (const [width, color] of [[5, b.color], [1.8, '#ffffff']]) {
        ctx.globalAlpha = k * (width > 2 ? .7 : 1); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.beginPath();
        for (let i = 0; i < b.pts.length - 1; i++) {
          const [x0, y0] = b.pts[i], [x1, y1] = b.pts[i + 1], n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 26));
          if (!i) ctx.moveTo(x0, y0);
          for (let j = 1; j <= n; j++) { const t = j / n, jit = j < n ? 9 : 0; ctx.lineTo(x0 + (x1 - x0) * t + (Math.random() - .5) * jit, y0 + (y1 - y0) * t + (Math.random() - .5) * jit); }
        }
        ctx.stroke();
      }
      ctx.globalAlpha = k; for (let i = 1; i < b.pts.length; i++) stamp(glow(b.color), b.pts[i][0], b.pts[i][1], .6);
    }
    ctx.lineCap = 'butt'; normal();
    for (const m of S.shots) {
      if (m.kind === 'wave') continue;
      if (m.kind === 'scatter') { ctx.globalAlpha = Math.min(1, m.life * 4); ctx.fillStyle = '#fff6e0'; ctx.beginPath(); ctx.arc(m.x, m.y, m.r * .8, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; continue; }
      if (m.kind === 'blast') { const g = ctx.createRadialGradient(m.x - 2, m.y - 2, 0, m.x, m.y, m.r); g.addColorStop(0, '#fff3e6'); g.addColorStop(.5, m.color); g.addColorStop(1, shade(m.color, -.5)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, TAU); ctx.fill(); continue; }
      const L = 9 + S.tier * 2, w = 2.2 + S.tier * .45;
      ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(Math.atan2(m.vy, m.vx) + Math.PI / 2);
      ctx.fillStyle = '#ffd08a'; ctx.beginPath(); ctx.moveTo(-w * .9, L); ctx.lineTo(0, L + 7 + Math.random() * 7); ctx.lineTo(w * .9, L); ctx.fill();
      ctx.fillStyle = shade(m.color, -.25); ctx.beginPath(); ctx.moveTo(w, L * .5); ctx.lineTo(w * 2, L); ctx.lineTo(-w * 2, L); ctx.lineTo(-w, L * .5); ctx.fill();
      ctx.fillStyle = m.color; ctx.beginPath(); ctx.moveTo(0, -L); ctx.quadraticCurveTo(w * 1.3, -L * .5, w, L * .7); ctx.lineTo(-w, L * .7); ctx.quadraticCurveTo(-w * 1.3, -L * .5, 0, -L); ctx.fill();
      ctx.fillStyle = '#ffffffd0'; ctx.fillRect(-w * .5, -L * .5, w * .55, L * .9);
      ctx.restore();
    }
    for (const b of S.bullets) {
      ctx.fillStyle = b.bomb ? '#ffb300' : '#ff5c86'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
      ctx.fillStyle = b.bomb ? '#3a2500' : '#fff0f4'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * .5, 0, TAU); ctx.fill();
    }
  }
  function drawBeam(S) {
    const b = S.beam, p = S.player, y1 = p.y - 14, k = Math.min(1, b.life / .1), w = b.w * (.9 + .2 * Math.sin(clock * 60));
    ctx.save(); lighter(); ctx.globalAlpha = k;
    const side = ctx.createLinearGradient(p.x - w * 1.6, 0, p.x + w * 1.6, 0); side.addColorStop(0, b.color + '00'); side.addColorStop(.5, b.color + 'aa'); side.addColorStop(1, b.color + '00');
    ctx.fillStyle = side; ctx.fillRect(p.x - w * 1.6, b.top, w * 3.2, y1 - b.top);
    ctx.fillStyle = b.color; ctx.fillRect(p.x - w / 2, b.top, w, y1 - b.top);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(p.x - w / 5, b.top, w / 2.5, y1 - b.top);
    stamp(glow(b.color), p.x, Math.max(b.top, 0), 1.1 + .3 * Math.sin(clock * 40)); stamp(glow('#ffffff'), p.x, y1, .7);
    ctx.restore(); normal();
  }

  // ---------- Enemies ----------
  function enemyPath(e, r) {
    ctx.beginPath();
    switch (e.type) {
      case 'drone': ctx.moveTo(0, r); ctx.lineTo(r, -r * .7); ctx.lineTo(0, -r * .3); ctx.lineTo(-r, -r * .7); break;
      case 'zig': ctx.moveTo(0, r); ctx.lineTo(r * .5, -r); ctx.lineTo(r * 1.1, -r * .2); ctx.lineTo(0, r * .2); ctx.lineTo(-r * 1.1, -r * .2); ctx.lineTo(-r * .5, -r); break;
      case 'tank': for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + Math.PI / 6; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } break;
      case 'gunner': ctx.moveTo(0, r); ctx.lineTo(r, 0); ctx.lineTo(0, -r); ctx.lineTo(-r, 0); break;
      case 'bomber': ctx.moveTo(-r * 1.3, -r * .1); ctx.lineTo(-r * .5, -r * .7); ctx.lineTo(r * .5, -r * .7); ctx.lineTo(r * 1.3, -r * .1); ctx.lineTo(r * .9, r * .5); ctx.lineTo(r * .3, r * .3); ctx.lineTo(0, r * .8); ctx.lineTo(-r * .3, r * .3); ctx.lineTo(-r * .9, r * .5); break;
      case 'dasher': ctx.moveTo(0, r * 1.4); ctx.lineTo(r * .55, -r * .2); ctx.lineTo(r * .95, -r); ctx.lineTo(0, -r * .5); ctx.lineTo(-r * .95, -r); ctx.lineTo(-r * .55, -r * .2); break;
      case 'shard': ctx.moveTo(0, r); ctx.lineTo(r * .7, 0); ctx.lineTo(0, -r); ctx.lineTo(-r * .7, 0); break;
      case 'splitter': ctx.arc(0, 0, r, 0, TAU); break;
      default:
        if (e.boss === 'carrier') { ctx.moveTo(-r * 1.6, -r * .25); ctx.lineTo(-r * 1.1, -r * .6); ctx.lineTo(r * 1.1, -r * .6); ctx.lineTo(r * 1.6, -r * .25); ctx.lineTo(r * 1.2, r * .35); ctx.lineTo(r * .3, r * .55); ctx.lineTo(0, r * .95); ctx.lineTo(-r * .3, r * .55); ctx.lineTo(-r * 1.2, r * .35); }
        else if (e.boss === 'divider') { for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + e.t * .4, q = i % 2 ? r * .82 : r * 1.12; ctx.lineTo(Math.cos(a) * q, Math.sin(a) * q); } }
        else if (e.boss === 'hydra') { ctx.moveTo(-r * 1.3, -r * .7); ctx.lineTo(-r * .5, -r * .8); ctx.lineTo(0, -r * .45); ctx.lineTo(r * .5, -r * .8); ctx.lineTo(r * 1.3, -r * .7); ctx.lineTo(r * 1.25, r * .3); ctx.lineTo(r * .9, r * .95); ctx.lineTo(r * .55, r * .3); ctx.lineTo(0, r * .55); ctx.lineTo(-r * .55, r * .3); ctx.lineTo(-r * .9, r * .95); ctx.lineTo(-r * 1.25, r * .3); }
        else { ctx.moveTo(-r * 1.4, -r * .5); ctx.lineTo(-r * .6, -r * .9); ctx.lineTo(r * .6, -r * .9); ctx.lineTo(r * 1.4, -r * .5); ctx.lineTo(r * 1.1, r * .4); ctx.lineTo(r * .35, r * .85); ctx.lineTo(-r * .35, r * .85); ctx.lineTo(-r * 1.1, r * .4); }
    }
    ctx.closePath();
  }
  function drawEnemy(e) {
    const r = e.r, boss = e.type === 'boss', hit = e.flash > 0;
    ctx.save(); ctx.translate(e.x, e.y);
    if (!boss) { ctx.rotate(-e.bank); ctx.scale(1 - Math.abs(e.bank) * .35, 1); }
    const fade = !boss && e.age < .25 ? e.age / .25 : 1;
    // halo and engine exhaust (enemies fly downward, so the engines point up)
    lighter(); ctx.globalAlpha = (boss ? .55 : .4) * fade; stamp(glow(e.color), 0, 0, r / (boss ? 13 : 15));
    if (e.type !== 'splitter' && e.boss !== 'divider') {
      ctx.globalAlpha = .9 * fade; const fl = r * (.5 + Math.random() * .35) * (e.phase === 'dive' ? 2 : 1);
      for (const s of boss ? [-.8, 0, .8] : e.type === 'tank' || e.type === 'bomber' ? [-.45, .45] : [0]) {
        const g = ctx.createLinearGradient(0, -r * .6, 0, -r * .6 - fl * 1.6); g.addColorStop(0, '#fff2c0'); g.addColorStop(.4, '#ff9d3c'); g.addColorStop(1, '#ff5a3c00');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(s * r - r * .2, -r * .55); ctx.lineTo(s * r, -r * .6 - fl * 1.6); ctx.lineTo(s * r + r * .2, -r * .55); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade;
    // armoured hull: lit from above, dark keel, bright rim
    const hull = ctx.createLinearGradient(0, -r, 0, r);
    if (hit) { hull.addColorStop(0, '#ffffff'); hull.addColorStop(1, '#ffffff'); }
    else { hull.addColorStop(0, shade(e.color, .35)); hull.addColorStop(.5, e.color); hull.addColorStop(1, shade(e.color, -.55)); }
    enemyPath(e, r); ctx.fillStyle = hull; ctx.fill();
    ctx.lineJoin = 'round'; ctx.strokeStyle = '#070b18'; ctx.lineWidth = boss ? 3 : 2; ctx.stroke();
    ctx.save(); ctx.clip(); ctx.strokeStyle = '#ffffff40'; ctx.lineWidth = boss ? 3 : 2; ctx.translate(0, boss ? 3 : 2); enemyPath(e, r); ctx.stroke(); ctx.restore();
    const eye = (x, y, q, col) => { lighter(); stamp(glow(col), x, y, q / 9); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, q * .45, 0, TAU); ctx.fill(); };
    ctx.fillStyle = '#0b0f1ecc';
    if (e.type === 'tank') { ctx.fillRect(-r * .55, -r * .2, r * 1.1, r * .4); ctx.fillStyle = shade(e.color, .5); ctx.fillRect(-r * .45, -r * .1, r * .9, r * .08); eye(0, r * .5, 4, '#9db4ff'); }
    else if (e.type === 'gunner') { ctx.fillRect(-3.5, 0, 7, r * 1.25); eye(0, -r * .15, 4.5, '#ff73d0'); }
    else if (e.type === 'bomber') { ctx.fillRect(-r * .8, -r * .25, r * 1.6, r * .2); eye(-r * .7, r * .1, 3.5, '#fff3bf'); eye(r * .7, r * .1, 3.5, '#fff3bf'); eye(0, r * .35, 4.5, '#ffb300'); }
    else if (e.type === 'dasher') { const hot = e.phase !== 'in'; eye(0, r * .5, hot ? 6 : 3.5, hot ? '#ff3b3b' : '#ffd8a8'); }
    else if (e.type === 'splitter') { const k = 1 + Math.sin(e.t * 5) * .08; ctx.beginPath(); ctx.arc(-r * .35, 0, r * .3 * k, 0, TAU); ctx.arc(r * .35, 0, r * .3 * k, 0, TAU); ctx.fill(); eye(-r * .35, 0, 3, '#7ff0c8'); eye(r * .35, 0, 3, '#7ff0c8'); }
    else if (e.boss === 'carrier') { ctx.fillRect(-r * 1.1, -r * .3, r * 2.2, r * .16); for (const s of [-1, -.5, 0, .5, 1]) eye(s * r * .9, r * .02, 4 + Math.sin(e.t * 6 + s * 3), '#ffd27a'); }
    else if (e.boss === 'divider') {
      ctx.beginPath(); ctx.arc(0, 0, r * .58, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd9ea'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.lineDashOffset = e.t * 26; ctx.beginPath(); ctx.arc(0, 0, r * .7, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
      lighter(); stamp(glow('#ff5f9e'), 0, 0, 1.1 + .15 * Math.sin(e.t * 4)); ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#fff0f7'; ctx.font = `900 34px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('÷', 0, 1);
    }
    else if (e.boss === 'hydra') { ctx.fillRect(-r * .3, -r * .3, r * .6, r * .4); const hot = e.phase === 'aim' || e.phase === 'dive'; for (const s of [-1, 1]) eye(s * r * .9, r * .2, hot ? 11 : 7, hot ? '#ff5a5a' : '#ffd36e'); }
    else if (boss) { ctx.fillRect(-r * .8, -r * .3, r * 1.6, r * .35); for (const s of [-1, 0, 1]) eye(s * r * .55, r * .5, 6 + Math.sin(e.t * 5 + s), '#ffd36e'); }
    else eye(0, e.type === 'zig' ? r * .1 : 0, r * .3, shade(e.color, .4));
    ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    if (e.type === 'dasher' && e.phase === 'aim') { // dive telegraph
      ctx.strokeStyle = '#ff3b3b88'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -clock * 60; ctx.beginPath(); ctx.moveTo(e.x, e.y + r); ctx.lineTo(e.x, LINE); ctx.stroke(); ctx.setLineDash([]);
    }
    if (e.hp < e.maxHp && !boss) {
      const bw = r * 2.2, by = e.y - r - 9;
      roundRect(ctx, e.x - bw / 2 - 1, by - 1, bw + 2, 5, 2); ctx.fillStyle = '#050a16cc'; ctx.fill();
      ctx.fillStyle = '#9dffb4'; ctx.fillRect(e.x - bw / 2, by, bw * Math.max(0, e.hp / e.maxHp), 3);
    }
  }
  // The boss bar sits at the top of the screen so it never hides behind the fight.
  function drawBossBar(e) {
    const bw = W - 60, x = 30, y = 20, k = Math.max(0, e.hp / e.maxHp);
    roundRect(ctx, x - 2, y - 2, bw + 4, 12, 6); ctx.fillStyle = '#050a16d0'; ctx.fill();
    const hp = ctx.createLinearGradient(x, 0, x + bw, 0); hp.addColorStop(0, '#ffb347'); hp.addColorStop(1, '#ff4d6d');
    roundRect(ctx, x, y, Math.max(8, bw * k), 8, 4); ctx.fillStyle = hp; ctx.fill();
    ctx.fillStyle = '#ffffff55'; ctx.fillRect(x + 4, y + 1.5, Math.max(0, bw * k - 8), 1.5);
    ctx.font = `800 11px ${FONT}`; ctx.textAlign = 'center'; outlined(e.name, W / 2, y + 26, '#ffe1e1'); ctx.textAlign = 'left';
  }
  // Boss alert: hazard stripes slide along two bands while the name flashes.
  function drawWarning(S) {
    const k = Math.min(1, S.warn / .4, (2.6 - S.warn) / .25), boss = C.bossFor(S.wave);
    ctx.save(); ctx.globalAlpha = k * .9;
    for (const y of [186, 250]) {
      ctx.fillStyle = '#ff3b3bcc'; ctx.fillRect(-20, y, W + 40, 12);
      ctx.fillStyle = '#1a0508'; const off = (clock * 90 * (y === 186 ? 1 : -1)) % 28;
      for (let x = -60 + off; x < W + 40; x += 28) { ctx.beginPath(); ctx.moveTo(x, y + 12); ctx.lineTo(x + 12, y); ctx.lineTo(x + 20, y); ctx.lineTo(x + 8, y + 12); ctx.fill(); }
    }
    ctx.fillStyle = '#2a0409cc'; ctx.fillRect(-20, 198, W + 40, 52);
    ctx.globalAlpha = k * (.65 + .35 * Math.sin(clock * 14));
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ff5a5a'; ctx.font = `900 13px ${FONT}`; ctx.fillText('W A R N I N G', W / 2, 212);
    ctx.fillStyle = '#ffffff'; ctx.font = `900 20px ${FONT}`; ctx.fillText(boss.name, W / 2, 234);
    ctx.restore(); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  // ---------- Frame ----------
  function draw(S, v) {
    clock += v.mode === 'play' || !S ? v.dt : 0;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.save();
    if (S && S.fx.shake && !v.calm) ctx.translate((Math.random() - .5) * S.fx.shake, (Math.random() - .5) * S.fx.shake);
    drawBackdrop(S, v.mode === 'play' || !S ? v.dt : 0);
    if (!S) { stamp(vignette(), W / 2, H / 2); ctx.restore(); return; }
    const st = C.squadStats(S.units, S.tier, S.weapon, S.wlevels[S.weapon]);

    for (const row of S.rows) drawRow(S, row, st.dps);
    for (const c of S.crates) drawCrate(S, c);
    if (S.beam) drawBeam(S);
    for (const q of S.parts) { // smoke and hull fragments sit under the lights
      if (!q.smoke && !q.chunk) continue;
      const k = Math.max(0, q.life / q.max);
      if (q.smoke) { ctx.globalAlpha = k * .45; ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1.5 - k * .8), 0, TAU); ctx.fill(); }
      else { ctx.globalAlpha = Math.min(1, k * 2.5); ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = shade(q.color, -.35); ctx.fillRect(-q.r, -q.r * .6, q.r * 2, q.r * 1.2); ctx.fillStyle = shade(q.color, .25); ctx.fillRect(-q.r, -q.r * .6, q.r * 2, q.r * .35); ctx.restore(); }
    }
    ctx.globalAlpha = 1;
    for (const e of S.enemies) drawEnemy(e);
    drawShots(S);
    lighter(); // particles add light instead of covering what is behind them
    for (const q of S.parts) {
      if (q.smoke || q.chunk) continue;
      const k = Math.max(0, q.life / q.max);
      ctx.globalAlpha = k;
      if (q.ring) { ctx.strokeStyle = q.color; ctx.lineWidth = 1 + 4 * k; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1.15 - k * .7), 0, TAU); ctx.stroke(); }
      else if (q.flash) stamp(glow(q.color), q.x, q.y, q.r / 32 * (1.3 - k * .5));
      else { ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (.4 + k * .6), 0, TAU); ctx.fill(); }
    }
    normal();
    drawFleet(S, st);
    ctx.textAlign = 'center';
    for (const t of S.texts) { ctx.globalAlpha = Math.min(1, t.life * 2); ctx.font = `800 ${t.size}px ${FONT}`; outlined(t.text, t.x, t.y, t.color); }
    ctx.globalAlpha = 1;
    if (S.combo >= 3) { // combo counter, pulsing on each kill
      const k = Math.min(1, S.comboTimer / 2.5), pop = 1 + Math.max(0, S.comboTimer - 2.3) * 2;
      ctx.globalAlpha = .35 + .65 * k; ctx.textAlign = 'right';
      ctx.font = `900 ${Math.round(22 * pop)}px ${FONT}`; outlined(S.combo + '', W - 14, 86, '#ffe27a');
      ctx.font = `800 10px ${FONT}`; outlined(`COMBO ×${C.comboMultiplier(S.combo).toFixed(2)}`, W - 14, 100, '#ffd0a5');
      ctx.fillStyle = '#ffe27a'; ctx.fillRect(W - 14 - 70 * k, 105, 70 * k, 2);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
    stamp(vignette(), W / 2, H / 2);
    const boss = S.enemies.find(e => e.type === 'boss');
    if (boss) drawBossBar(boss);
    if (S.warn > 0) drawWarning(S);
    if (S.units <= 2 && v.mode === 'play') { // low-fleet warning along the bottom edge
      ctx.globalAlpha = .18 + .12 * Math.sin(clock * 6); const d = ctx.createLinearGradient(0, H - 150, 0, H); d.addColorStop(0, '#ff3b3b00'); d.addColorStop(1, '#ff3b3b'); ctx.fillStyle = d; ctx.fillRect(-20, H - 150, W + 40, 170); ctx.globalAlpha = 1;
    }
    if (S.fx.flash > 0 && !v.calm) { ctx.globalAlpha = Math.min(.55, S.fx.flash); ctx.fillStyle = S.fx.flashColor; ctx.fillRect(-20, -20, W + 40, H + 40); ctx.globalAlpha = 1; }
    ctx.restore();
  }
  return { draw };
};
