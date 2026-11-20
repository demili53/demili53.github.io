/* 새벽의 요새 — 그림. 전장 배경, 타워, 적 스프라이트를 캔버스에 미리 그려 둡니다. */
(function (root) {
  'use strict';
  const D = root.Dawn, TAU = Math.PI * 2, ART_SCALE = 2;
  const sheet = (w, h, scale = ART_SCALE) => { const c = document.createElement('canvas'); c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale); const g = c.getContext('2d'); g.scale(scale, scale); return [c, g]; };
  const seeded = seed => () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  // amount > 0 이면 흰색 쪽으로, < 0 이면 검정 쪽으로 섞습니다.
  const tone = (hex, amount) => { const [r, g, b] = rgb(hex), to = amount > 0 ? 255 : 0, k = Math.abs(amount); return `rgb(${Math.round(r + (to - r) * k)},${Math.round(g + (to - g) * k)},${Math.round(b + (to - b) * k)})`; };
  const alpha = (hex, a) => { const [r, g, b] = rgb(hex); return `rgba(${r},${g},${b},${a})`; };
  const circle = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); };
  const ellipse = (g, x, y, rx, ry, rot = 0) => { g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); };
  const poly = (g, points) => { g.beginPath(); for (let i = 0; i < points.length; i += 2) i ? g.lineTo(points[i], points[i + 1]) : g.moveTo(points[i], points[i + 1]); g.closePath(); };
  const rounded = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const linear = (g, x1, y1, x2, y2, stops) => { const lg = g.createLinearGradient(x1, y1, x2, y2); stops.forEach((c, i) => lg.addColorStop(i / (stops.length - 1), c)); return lg; };
  const radial = (g, x, y, r, stops, fx = x, fy = y) => { const rg = g.createRadialGradient(fx, fy, 0, x, y, r); stops.forEach((c, i) => rg.addColorStop(i / (stops.length - 1), c)); return rg; };
  const INK = '#0d1418';

  const PALETTES = {
    grove: { ground: '#24392f', dark: '#16261f', light: '#35543f', path: '#6d5c45', plaza: '#26363a', accent: '#8cdbb7', tint: '#ffd9a0' },
    canyon: { ground: '#40322b', dark: '#2a201c', light: '#5b4638', path: '#84684c', plaza: '#332d2f', accent: '#f3ba77', tint: '#ffb27a' },
    glacier: { ground: '#27405a', dark: '#182a3d', light: '#3a5f7f', path: '#8198ab', plaza: '#253445', accent: '#8ecbfa', tint: '#bfe4ff' },
    marsh: { ground: '#27362a', dark: '#18231c', light: '#3c5236', path: '#625f42', plaza: '#27312c', accent: '#a8ed72', tint: '#c8f0a0' },
    volcano: { ground: '#33252a', dark: '#1f1518', light: '#55312c', path: '#5f4842', plaza: '#2c2529', accent: '#ff9455', tint: '#ff9a6a' },
    ruins: { ground: '#2e2b43', dark: '#1c1a2c', light: '#474167', path: '#787089', plaza: '#29273c', accent: '#c69cff', tint: '#d8b8ff' }
  };

  function traceTrack(g) { g.beginPath(); D.TRACK.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); }

  function decoration(g, kind, x, y, s, random, P) {
    g.save(); g.translate(x, y);
    if (kind === 'grove') {
      g.fillStyle = 'rgba(0,0,0,.28)'; ellipse(g, 3, 5, 15 * s, 11 * s); g.fill();
      for (let i = 0; i < 5; i++) { const a = random() * TAU, d = random() * 8 * s, r = (7 + random() * 6) * s; g.fillStyle = tone('#2f6b48', (random() - .5) * .3); circle(g, Math.cos(a) * d, Math.sin(a) * d, r); g.fill(); }
      g.fillStyle = 'rgba(190,240,170,.22)'; circle(g, -3 * s, -4 * s, 4 * s); g.fill();
    } else if (kind === 'canyon' || kind === 'ruins') {
      const n = 6, pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU, r = (8 + random() * 7) * s; pts.push(Math.cos(a) * r, Math.sin(a) * r * .8); }
      g.fillStyle = 'rgba(0,0,0,.3)'; g.translate(2, 4); poly(g, pts); g.fill(); g.translate(-2, -4);
      g.fillStyle = kind === 'ruins' ? '#5a5576' : '#7a614d'; poly(g, pts); g.fill(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.14)'; poly(g, [pts[6], pts[7], pts[8], pts[9], pts[10], pts[11], 0, 0]); g.fill();
      if (kind === 'ruins') { g.strokeStyle = alpha(P.accent, .5); g.lineWidth = 1.2; circle(g, 0, 0, 3 * s); g.stroke(); }
    } else if (kind === 'glacier') {
      for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i - 1) * .7, h = (12 + random() * 10) * s, w = 4.5 * s, cx = (i - 1) * 6 * s; g.fillStyle = i === 1 ? '#cfeeff' : '#8fc6ec'; poly(g, [cx + Math.cos(a) * h, Math.sin(a) * h, cx + w, 4, cx - w, 4]); g.fill(); g.strokeStyle = 'rgba(20,50,80,.5)'; g.lineWidth = 1; g.stroke(); }
    } else if (kind === 'marsh') {
      g.fillStyle = 'rgba(70,120,80,.55)'; ellipse(g, 0, 0, 13 * s, 8 * s); g.fill();
      g.fillStyle = 'rgba(150,220,120,.3)'; ellipse(g, -3 * s, -2 * s, 5 * s, 3 * s); g.fill();
      g.strokeStyle = '#7fae5c'; g.lineWidth = 1.4; for (let i = 0; i < 4; i++) { const ox = (random() - .5) * 18 * s; g.beginPath(); g.moveTo(ox, 3); g.lineTo(ox + (random() - .5) * 6, -(8 + random() * 10) * s); g.stroke(); }
    } else if (kind === 'volcano') {
      g.fillStyle = radial(g, 0, 0, 16 * s, ['rgba(255,170,80,.9)', 'rgba(255,90,40,.5)', 'rgba(255,60,20,0)']); ellipse(g, 0, 0, 16 * s, 10 * s); g.fill();
      g.strokeStyle = 'rgba(255,200,120,.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-10 * s, 0); for (let i = 0; i < 5; i++) g.lineTo(-10 * s + i * 5 * s, (random() - .5) * 6 * s); g.stroke();
    }
    g.restore();
  }

  function background(theme) {
    const P = PALETTES[theme] || PALETTES.grove, [c, g] = sheet(720, 720), random = seeded(theme.length * 7919 + theme.charCodeAt(0) * 31 + theme.charCodeAt(1));
    g.fillStyle = radial(g, 360, 360, 520, [P.light, P.ground, P.dark]); g.fillRect(0, 0, 720, 720);
    for (let i = 0; i < 320; i++) { const x = random() * 720, y = random() * 720, r = 8 + random() * 34; g.fillStyle = random() < .5 ? alpha(P.dark, .1 + random() * .1) : alpha(P.light, .07 + random() * .08); ellipse(g, x, y, r, r * (.5 + random() * .4), random() * 3); g.fill(); }
    for (let i = 0; i < 900; i++) { g.fillStyle = random() < .5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)'; g.fillRect(random() * 720, random() * 720, 1 + random() * 2, 1 + random() * 2); }
    // 길 바깥 가장자리의 지형 장식
    for (let i = 0; i < 46; i++) { const side = i % 4, t = 20 + random() * 680, off = 4 + random() * 16, x = side === 0 ? t : side === 1 ? 720 - off : side === 2 ? t : off, y = side === 0 ? off : side === 1 ? t : side === 2 ? 720 - off : t; decoration(g, theme, x, y, .7 + random() * .6, random, P); }
    // 길
    g.lineJoin = 'round'; g.lineCap = 'round';
    traceTrack(g); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 70; g.stroke();
    traceTrack(g); g.strokeStyle = tone(P.path, -.45); g.lineWidth = 62; g.stroke();
    traceTrack(g); g.strokeStyle = P.path; g.lineWidth = 54; g.stroke();
    traceTrack(g); g.strokeStyle = alpha('#ffffff', .07); g.lineWidth = 36; g.stroke();
    for (let d = 0; d < D.TRACK_LENGTH; d += 7) { const p = D.trackPoint(d), side = (random() - .5) * 46, x = p.x - p.dy * side, y = p.y + p.dx * side, w = 3 + random() * 5; g.fillStyle = random() < .55 ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.1)'; ellipse(g, x, y, w, w * .7, random() * 3); g.fill(); }
    g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2.5;
    for (let d = 120; d < D.TRACK_LENGTH - 60; d += 74) { const p = D.trackPoint(d); if (D.TRACK.some(t => Math.hypot(t[0] - p.x, t[1] - p.y) < 40)) continue; g.save(); g.translate(p.x, p.y); g.rotate(Math.atan2(p.dy, p.dx)); g.beginPath(); g.moveTo(-6, -9); g.lineTo(4, 0); g.lineTo(-6, 9); g.stroke(); g.restore(); }
    // 차원문 받침과 수정 제단
    const [px, py] = D.TRACK[0];
    g.fillStyle = radial(g, px, py, 44, ['#1a0f2b', '#241538', 'rgba(36,21,56,0)']); circle(g, px, py, 44); g.fill();
    g.strokeStyle = '#3d2a57'; g.lineWidth = 6; circle(g, px, py, 31); g.stroke(); g.strokeStyle = 'rgba(190,140,255,.35)'; g.lineWidth = 1.5; circle(g, px, py, 34.5); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.35)'; circle(g, D.CORE.x + 2, D.CORE.y + 4, 40); g.fill();
    g.fillStyle = linear(g, 0, D.CORE.y - 38, 0, D.CORE.y + 38, [tone(P.plaza, .28), tone(P.plaza, -.1)]); circle(g, D.CORE.x, D.CORE.y, 38); g.fill();
    g.strokeStyle = tone(P.plaza, -.5); g.lineWidth = 2; g.stroke();
    g.strokeStyle = alpha('#ffe7b0', .5); g.lineWidth = 2; circle(g, D.CORE.x, D.CORE.y, 30); g.stroke();
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.fillStyle = alpha('#ffe7b0', .55); circle(g, D.CORE.x + Math.cos(a) * 34, D.CORE.y + Math.sin(a) * 34, 1.8); g.fill(); }
    // 타워를 세우는 광장
    g.fillStyle = 'rgba(0,0,0,.4)'; rounded(g, 110, 114, 500, 500, 30); g.fill();
    g.fillStyle = linear(g, 0, 108, 0, 612, [tone(P.plaza, .16), P.plaza, tone(P.plaza, -.18)]); rounded(g, 108, 108, 504, 504, 30); g.fill();
    g.save(); rounded(g, 108, 108, 504, 504, 30); g.clip();
    for (let i = 0; i < 70; i++) { const x = 108 + random() * 504, y = 108 + random() * 504, r = 10 + random() * 40; g.fillStyle = random() < .5 ? 'rgba(0,0,0,.07)' : 'rgba(255,255,255,.035)'; ellipse(g, x, y, r, r * .6, random() * 3); g.fill(); }
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.5; for (let i = 1; i < 4; i++) { const v = 124 + i * 118; g.beginPath(); g.moveTo(v, 120); g.lineTo(v, 600); g.moveTo(120, v); g.lineTo(600, v); g.stroke(); }
    g.restore();
    g.strokeStyle = tone(P.plaza, .35); g.lineWidth = 2; rounded(g, 109, 109, 502, 502, 29); g.stroke();
    g.strokeStyle = alpha(P.accent, .28); g.lineWidth = 1.5; rounded(g, 116, 116, 488, 488, 23); g.stroke();
    for (const cell of D.CELLS) {
      const x = cell.x - 47, y = cell.y - 47;
      g.fillStyle = 'rgba(255,255,255,.06)'; rounded(g, x, y + 1.5, 94, 94, 18); g.fill();
      g.fillStyle = linear(g, 0, y, 0, y + 94, [tone(P.plaza, -.52), tone(P.plaza, -.3)]); rounded(g, x, y, 94, 94, 18); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.5; g.stroke();
      g.fillStyle = radial(g, cell.x, cell.y, 44, [alpha(P.accent, .1), alpha(P.accent, 0)]); circle(g, cell.x, cell.y, 44); g.fill();
      g.strokeStyle = alpha(P.accent, .22); g.lineWidth = 1.2; circle(g, cell.x, cell.y, 30); g.stroke();
      g.strokeStyle = alpha(P.accent, .3); g.lineWidth = 2; for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { g.beginPath(); g.moveTo(cell.x + sx * 38, cell.y + sy * 30); g.lineTo(cell.x + sx * 38, cell.y + sy * 38); g.lineTo(cell.x + sx * 30, cell.y + sy * 38); g.stroke(); }
    }
    // 가장자리 어둠
    g.fillStyle = radial(g, 360, 360, 540, ['rgba(0,0,0,0)', 'rgba(0,0,0,0)', 'rgba(3,6,10,.5)']); g.fillRect(0, 0, 720, 720);
    return c;
  }

  // ── 타워 ──
  function towerBase(g, type, tier) {
    const tc = D.TIERS[tier - 1].color, col = D.TOWERS[type].color, oct = []; for (let i = 0; i < 8; i++) { const a = (i + .5) / 8 * TAU; oct.push(Math.cos(a) * 39, Math.sin(a) * 39); }
    g.fillStyle = 'rgba(0,0,0,.4)'; ellipse(g, 2, 7, 38, 34); g.fill();
    if (tier >= 5) { g.fillStyle = tc; for (let i = 0; i < 8; i++) { g.save(); g.rotate(i / 8 * TAU); poly(g, [36, -6, 47, 0, 36, 6]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke(); g.restore(); } }
    g.fillStyle = linear(g, -30, -39, 30, 39, ['#6d7c83', '#465259', '#262f35']); poly(g, oct); g.fill(); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(oct[8], oct[9] + 1.5); g.lineTo(oct[10], oct[11] + 1.5); g.lineTo(oct[12] + 1.5, oct[13]); g.stroke();
    if (tier >= 3) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.fillStyle = tone(tc, -.2); circle(g, Math.cos(a) * 34.5, Math.sin(a) * 34.5, 1.8); g.fill(); }
    g.save(); g.shadowColor = tc; g.shadowBlur = 2 + tier * 2; g.strokeStyle = tc; g.lineWidth = tier >= 4 ? 4 : 3; circle(g, 0, 0, 29); g.stroke(); g.restore();
    if (tier === 6) { g.strokeStyle = '#ffe3a6'; g.lineWidth = 1.2; circle(g, 0, 0, 32.5); g.stroke(); }
    g.fillStyle = radial(g, 0, 0, 27, [tone(col, -.5), tone(col, -.74), '#10171b']); circle(g, 0, 0, 27); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.5; g.stroke();
    // 등급 보석
    for (let i = 0; i < tier; i++) { const x = (i - (tier - 1) / 2) * 9, y = 36; g.fillStyle = tc; poly(g, [x, y - 4.5, x + 3.6, y, x, y + 4.5, x - 3.6, y]); g.fill(); g.strokeStyle = INK; g.lineWidth = 1.2; g.stroke(); g.fillStyle = 'rgba(255,255,255,.6)'; poly(g, [x, y - 3, x + 1.6, y - .5, x, y]); g.fill(); }
  }
  const metal = g => linear(g, 0, -10, 0, 10, ['#3a444a', '#aab7bd', '#59656c', '#252d32']);
  const outline = (g, width = 1.6) => { g.strokeStyle = INK; g.lineWidth = width; g.lineJoin = 'round'; g.stroke(); };
  function towerHead(g, type, tier) {
    const col = D.TOWERS[type].color, hi = tone(col, .55), lo = tone(col, -.45), big = 1 + (tier - 1) * .035; g.scale(big, big);
    if (type === 'arrow') {
      g.fillStyle = linear(g, 0, -6, 0, 6, ['#a8845a', '#6a4a2e']); rounded(g, -18, -5.5, 32, 11, 3); g.fill(); outline(g);
      g.lineCap = 'round'; g.strokeStyle = INK; g.lineWidth = 8; g.beginPath(); g.moveTo(6, -23); g.quadraticCurveTo(24, 0, 6, 23); g.stroke();
      g.strokeStyle = linear(g, 0, -23, 0, 23, [hi, col, lo]); g.lineWidth = 5; g.stroke();
      g.strokeStyle = 'rgba(240,250,240,.75)'; g.lineWidth = 1.1; g.beginPath(); g.moveTo(6, -22); g.lineTo(-9, 0); g.lineTo(6, 22); g.stroke();
      const bolts = tier >= 5 ? [-5, 0, 5] : tier >= 3 ? [-3.5, 3.5] : [0];
      for (const y of bolts) { g.strokeStyle = '#e9f1ec'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(-9, y); g.lineTo(24, y); g.stroke(); g.fillStyle = hi; poly(g, [22, y - 4, 33, y, 22, y + 4]); g.fill(); outline(g, 1); }
      g.fillStyle = metal(g); circle(g, -4, 0, 5.5); g.fill(); outline(g, 1.3);
    } else if (type === 'cannon') {
      g.fillStyle = '#2b3338'; rounded(g, -17, -14, 24, 28, 6); g.fill(); outline(g);
      g.fillStyle = lo; circle(g, -13, -14, 4); g.fill(); outline(g, 1.2); circle(g, -13, 14, 4); g.fill(); outline(g, 1.2);
      const w = tier >= 4 ? 11 : 9.5;
      g.fillStyle = linear(g, 0, -w, 0, w, ['#2a3237', '#9aa8ae', '#566168', '#1d2428']); rounded(g, -8, -w, 38, w * 2, 4); g.fill(); outline(g);
      g.fillStyle = linear(g, 0, -w, 0, w, [lo, hi, col, lo]); g.fillRect(1, -w, 4, w * 2); g.fillRect(12, -w, 4, w * 2);
      rounded(g, 24, -w - 2, 9, w * 2 + 4, 3); g.fill(); outline(g);
      g.fillStyle = '#0a0e11'; ellipse(g, 32.5, 0, 2.2, w - 3); g.fill();
      if (tier >= 3) { g.fillStyle = hi; circle(g, -8, 0, 3.5); g.fill(); outline(g, 1); }
    } else if (type === 'laser') {
      g.fillStyle = linear(g, 0, -9, 0, 9, ['#444c58', '#272d36']); rounded(g, -18, -9, 28, 18, 8); g.fill(); outline(g);
      g.strokeStyle = INK; g.lineWidth = 5.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(6, -6.5); g.lineTo(28, -6.5); g.moveTo(6, 6.5); g.lineTo(28, 6.5); g.stroke();
      g.strokeStyle = '#aeb9c2'; g.lineWidth = 3; g.stroke();
      g.save(); g.shadowColor = col; g.shadowBlur = 8; g.fillStyle = linear(g, 16, 0, 38, 0, [col, '#ffffff']); poly(g, [16, 0, 26, -6, 38, 0, 26, 6]); g.fill(); g.restore(); outline(g, 1.2);
      g.fillStyle = radial(g, -9, 0, 6.5, ['#ffffff', col, lo]); circle(g, -9, 0, 6); g.fill(); outline(g, 1.2);
      if (tier >= 3) { g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-2, -9); g.lineTo(8, -9); g.moveTo(-2, 9); g.lineTo(8, 9); g.stroke(); }
    } else if (type === 'flame') {
      g.fillStyle = '#2c3338'; rounded(g, -4, -4.5, 24, 9, 2); g.fill(); outline(g);
      g.fillStyle = radial(g, -9, 0, 13, [hi, col, lo], -13, -4); circle(g, -9, 0, 12); g.fill(); outline(g);
      g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-9, -12); g.lineTo(-9, 12); g.stroke();
      g.fillStyle = metal(g); poly(g, [16, -5, 30, -10, 30, 10, 16, 5]); g.fill(); outline(g);
      g.fillStyle = radial(g, 31, 0, 8, ['#fff3c0', '#ffb347', 'rgba(255,120,40,0)']); ellipse(g, 31, 0, 6, 8); g.fill();
      if (tier >= 3) { g.fillStyle = hi; circle(g, 6, 0, 3); g.fill(); outline(g, 1); }
    } else if (type === 'frost') {
      const shard = (angle, len, w) => { g.save(); g.rotate(angle); g.fillStyle = linear(g, 0, 6, 0, -len, ['#2c5f94', col, '#f2fbff']); poly(g, [0, -len, w, -len * .35, 0, 8, -w, -len * .35]); g.fill(); outline(g, 1.4); g.fillStyle = 'rgba(255,255,255,.45)'; poly(g, [0, -len, -w, -len * .35, 0, -len * .3]); g.fill(); g.restore(); };
      g.fillStyle = radial(g, 0, 4, 22, ['rgba(220,244,255,.55)', 'rgba(140,200,250,0)']); circle(g, 0, 4, 22); g.fill();
      const extra = Math.min(4, 1 + Math.floor(tier / 2));
      for (let i = 0; i < extra; i++) { const a = (i % 2 ? 1 : -1) * (.75 + Math.floor(i / 2) * .7); shard(a, 18 + (i < 2 ? 4 : 0), 5.5); }
      shard(Math.PI, 12, 5); shard(0, 28, 8.5);
    } else if (type === 'tesla') {
      g.fillStyle = '#2a2433'; ellipse(g, 0, 12, 19, 9); g.fill(); outline(g);
      const rings = 3 + (tier >= 4 ? 1 : 0);
      for (let i = 0; i < rings; i++) { const y = 9 - i * 7, rx = 16 - i * 3; g.fillStyle = linear(g, -rx, 0, rx, 0, ['#5d4634', '#e0ad76', '#8a6444', '#3d2c20']); ellipse(g, 0, y, rx, 5); g.fill(); outline(g, 1.3); }
      const top = 9 - rings * 7 - 4;
      g.fillStyle = '#3b3346'; g.fillRect(-2.5, top, 5, 12); g.strokeStyle = INK; g.lineWidth = 1.2; g.strokeRect(-2.5, top, 5, 12);
      g.save(); g.shadowColor = col; g.shadowBlur = 12; g.fillStyle = radial(g, 0, top - 3, 9, ['#ffffff', col, lo], -2, top - 6); circle(g, 0, top - 3, 8 + tier * .4); g.fill(); g.restore(); outline(g, 1.3);
    } else if (type === 'venom') {
      const spikes = 6 + tier; g.fillStyle = '#39413a';
      for (let i = 0; i < spikes; i++) { g.save(); g.rotate(i / spikes * TAU); poly(g, [18, -4, 27, 0, 18, 4]); g.fill(); outline(g, 1.1); g.restore(); }
      g.fillStyle = linear(g, -20, -20, 20, 20, ['#6f7b70', '#3b443d', '#20261f']); circle(g, 0, 0, 20); g.fill(); outline(g);
      g.fillStyle = radial(g, 0, 0, 15, ['#f0ffc4', col, lo], -4, -5); circle(g, 0, 0, 14.5); g.fill(); outline(g, 1.3);
      g.fillStyle = 'rgba(255,255,255,.55)'; circle(g, -5, -5, 3); g.fill(); circle(g, 5, 2, 2); g.fill(); circle(g, -2, 7, 1.5); g.fill();
      g.strokeStyle = 'rgba(30,60,20,.45)'; g.lineWidth = 1; circle(g, 5, 2, 3.4); g.stroke(); circle(g, -5, -5, 4.6); g.stroke();
    }
  }
  const ROTATING = { arrow: true, cannon: true, laser: true, flame: true };
  const towerCache = new Map();
  function tower(type, tier) {
    const key = type + tier; let entry = towerCache.get(key);
    if (!entry) {
      const [base, bg] = sheet(110, 110); bg.translate(55, 55); towerBase(bg, type, tier);
      const [head, hg] = sheet(110, 110); hg.translate(55, 55); towerHead(hg, type, tier);
      entry = { base, head, rotating: !!ROTATING[type], size: 110 }; towerCache.set(key, entry);
    }
    return entry;
  }
  // 버튼이나 안내문에 넣는 작은 타워 그림
  function towerIcon(type, tier, size = 48) { const [c, g] = sheet(size, size), t = tower(type, tier); g.drawImage(t.base, 0, 0, size, size); if (t.rotating) { g.translate(size / 2, size / 2); g.rotate(-Math.PI / 2); g.drawImage(t.head, -size / 2, -size / 2, size, size); } else g.drawImage(t.head, 0, 0, size, size); return c; }

  // ── 적 ──
  // 원화는 세 종류(붉은 병사, 주황 질주자, 보랏빛 군주)이고 색조를 돌려 종류를 나눕니다.
  const LOOKS = {
    grunt: { src: 'enemy', hue: 0, sat: 1, lum: 1, color: '#d9523f' },
    armored: { src: 'enemy', hue: 205, sat: .38, lum: 1.02, color: '#8fa2b5' },
    regenerator: { src: 'enemy', hue: 118, sat: .9, lum: .98, color: '#62c46a' },
    berserker: { src: 'enemy', hue: -18, sat: 1.25, lum: .72, color: '#a8242c' },
    shieldbearer: { src: 'enemy', hue: 42, sat: 1.05, lum: 1.06, color: '#e0b54a' },
    healer: { src: 'enemy', hue: 165, sat: .85, lum: 1.05, color: '#57cbb9' },
    runner: { src: 'runner', hue: 0, sat: 1, lum: 1, color: '#f08c2e' },
    splitter: { src: 'runner', hue: 255, sat: .9, lum: .95, color: '#c060d8' },
    shard: { src: 'runner', hue: 255, sat: .9, lum: 1.1, color: '#d98bea' },
    wisp: { src: 'runner', hue: 165, sat: .8, lum: 1.15, color: '#7fe0f0' },
    stalker: { src: 'runner', hue: 215, sat: .7, lum: .7, color: '#5a62c8' },
    summoner: { src: 'boss', hue: 0, sat: 1, lum: 1, color: '#a56ee0' },
    bulwark: { src: 'boss', hue: -62, sat: .85, lum: 1.02, color: '#5f9bea' },
    jammer: { src: 'boss', hue: 72, sat: 1, lum: .98, color: '#ea5f8e' }
  };
  function shiftHue(data, hue, sat, lum) {
    const d = data.data, turn = hue / 360;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255, max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2; let h = 0, s = 0;
      if (max !== min) { const span = max - min; s = l > .5 ? span / (2 - max - min) : span / (max + min); h = max === r ? (g - b) / span + (g < b ? 6 : 0) : max === g ? (b - r) / span + 2 : (r - g) / span + 4; h /= 6; }
      h = (h + turn + 1) % 1; s = Math.min(1, s * sat); const L = Math.min(1, l * lum), q = L < .5 ? L * (1 + s) : L + s - L * s, p = 2 * L - q;
      const ch = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
      d[i] = ch(h + 1 / 3) * 255; d[i + 1] = ch(h) * 255; d[i + 2] = ch(h - 1 / 3) * 255;
    }
  }
  let atlas = null, atlasFrames = null; const enemyCache = new Map();
  function fallbackEnemy(look, frame, px) {
    const [c, g] = sheet(px, px, 1), u = px / 100, step = [0, -3, 0, 3][frame] * u; g.translate(px / 2, px / 2);
    g.fillStyle = tone(look.color, -.5); ellipse(g, -16 * u + step, 36 * u, 10 * u, 6 * u); g.fill(); ellipse(g, 16 * u - step, 36 * u, 10 * u, 6 * u); g.fill();
    g.fillStyle = radial(g, 0, 0, 38 * u, [tone(look.color, .35), look.color, tone(look.color, -.5)], -10 * u, -14 * u); ellipse(g, 0, 2 * u, 32 * u, 34 * u); g.fill(); g.strokeStyle = INK; g.lineWidth = 3 * u; g.stroke();
    g.fillStyle = tone(look.color, -.6); poly(g, [-22 * u, -24 * u, -30 * u, -44 * u, -10 * u, -30 * u]); g.fill(); poly(g, [22 * u, -24 * u, 30 * u, -44 * u, 10 * u, -30 * u]); g.fill();
    g.fillStyle = '#fff4c8'; ellipse(g, 6 * u, -6 * u, 5 * u, 6 * u); g.fill(); ellipse(g, 22 * u, -6 * u, 4 * u, 5 * u); g.fill(); g.fillStyle = INK; circle(g, 8 * u, -5 * u, 2.2 * u); g.fill(); circle(g, 23 * u, -5 * u, 2 * u); g.fill();
    return c;
  }
  // 한 종류의 걷기 프레임 4장. 캔버스 가운데 아래가 발 위치입니다.
  function enemyFrames(kind) {
    let frames = enemyCache.get(kind); if (frames) return frames;
    const look = LOOKS[kind] || LOOKS.grunt, px = look.src === 'boss' ? 240 : 128; frames = [];
    for (let i = 0; i < 4; i++) {
      let canvas = null;
      if (atlas) {
        try {
          const f = atlasFrames[look.src + '-' + i].frame, k = (px - 4) / Math.max(f.w, f.h), [c, g] = sheet(px, px, 1), w = f.w * k, h = f.h * k;
          g.imageSmoothingQuality = 'high'; g.drawImage(atlas, f.x, f.y, f.w, f.h, (px - w) / 2, px - h - 2, w, h);
          if (look.hue || look.sat !== 1 || look.lum !== 1) { const data = g.getImageData(0, 0, px, px); shiftHue(data, look.hue, look.sat, look.lum); g.putImageData(data, 0, 0); }
          canvas = c;
        } catch { canvas = null; }
      }
      frames.push(canvas || fallbackEnemy(look, i, px));
    }
    if (atlas) enemyCache.set(kind, frames);
    return frames;
  }
  function load(base = '/assets/games/dawn-bastion/') {
    return Promise.all([
      new Promise(resolve => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = base + 'characters-v2.png'; }),
      fetch(base + 'characters-v2.json').then(r => r.ok ? r.json() : null).catch(() => null)
    ]).then(([image, json]) => { if (image && json?.frames) { atlas = image; atlasFrames = json.frames; enemyCache.clear(); } return !!atlas; });
  }
  const glowCache = new Map();
  function glow(color) { let c = glowCache.get(color); if (!c) { const made = sheet(64, 64, 1); c = made[0]; made[1].fillStyle = radial(made[1], 32, 32, 32, [alpha(color, .9), alpha(color, .35), alpha(color, 0)]); made[1].fillRect(0, 0, 64, 64); glowCache.set(color, c); } return c; }
  const bgCache = new Map();
  function backgroundFor(theme) { let c = bgCache.get(theme); if (!c) { if (bgCache.size >= 2) bgCache.delete(bgCache.keys().next().value); c = background(theme); bgCache.set(theme, c); } return c; }

  root.DawnArt = { load, background: backgroundFor, tower, towerIcon, enemyFrames, glow, LOOKS, PALETTES, tone, alpha, helpers: { circle, ellipse, poly, rounded, linear, radial } };
})(typeof globalThis !== 'undefined' ? globalThis : this);
