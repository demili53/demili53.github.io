/* 윌리를 찾아서 저격해라 — game loop, camera, scope, input, sound and page UI. */
'use strict';
(function () {
const C = window.SniperCore, A = window.SniperArt, W = C.WORLD.width, H = C.WORLD.height;
const $ = id => document.getElementById(id);
const canvas = $('ssCanvas'), ctx = canvas.getContext('2d'), stageEl = canvas.parentElement;
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Sound: short synthesized cues, off until the player turns them on ---------- */
const sound = {
  ctx: null, on: false,
  async enable(on) { this.on = on; if (!on) return; try { this.ctx ||= new (window.AudioContext || window.webkitAudioContext)(); await this.ctx.resume(); } catch { this.on = false; } },
  tone(freq, dur, type = 'sine', gain = .2, slide = 0) { if (!this.on || !this.ctx) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, c.currentTime); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur); g.gain.setValueAtTime(gain, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + dur); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + dur); },
  noise(dur, gain = .35, freq = 1200) { if (!this.on || !this.ctx) return; const c = this.ctx, b = c.createBuffer(1, c.sampleRate * dur, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = gain; s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start(); },
  shot() { this.noise(.35, .5, 2400); this.tone(90, .25, 'triangle', .3, -50); },
  hit() { this.tone(160, .18, 'square', .12, -90); },
  miss() { this.noise(.15, .2, 4000); this.tone(1400, .25, 'sine', .06, -900); },
  clear() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, .22, 'triangle', .14), i * 110)); },
  fail() { [330, 247, 196].forEach((f, i) => setTimeout(() => this.tone(f, .3, 'sawtooth', .07), i * 160)); }
};

/* ---------- State ---------- */
let run = new C.SniperRun(), dpr = 1, scale = 1, cw = 0, ch = 0, bg = null, bgKey = '', last = performance.now(), lastState = '', scored = false;
let best = Number(store.get('shadowSniperBest')) || 0;
const keys = new Set();
let drag = null, pointerInside = false, popups = [];
window.__shadowSniper = { get run() { return run; }, set run(v) { run = v; lastState = ''; syncUI(); }, step: dt => step(dt), render: () => render(), toWorld: (x, y) => toWorld(x, y), toScreen: (x, y) => toScreen(x, y) };

function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = stageEl.getBoundingClientRect(); cw = Math.max(320, Math.round(r.width * dpr)); ch = Math.max(180, Math.round(r.height * dpr));
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; bgKey = ''; }
}
// The world (16:9) is fitted inside the canvas; letterbox space shows the scene's edge color.
function view() { const s = Math.min(cw / W, ch / H); return { s, ox: (cw - W * s) / 2, oy: (ch - H * s) / 2 }; }
function toWorld(px, py) { const v = view(); return { x: (px * dpr - v.ox) / v.s, y: (py * dpr - v.oy) / v.s }; }
function toScreen(x, y) { const v = view(); return { x: (v.ox + x * v.s) / dpr, y: (v.oy + y * v.s) / dpr }; }
function ensureBackground() {
  const key = `${run.stage.seed}:${cw}x${ch}`;
  if (bgKey === key) return; bgKey = key;
  bg ||= document.createElement('canvas'); bg.width = cw; bg.height = ch;
  const b = bg.getContext('2d'), v = view();
  b.fillStyle = '#0b1220'; b.fillRect(0, 0, cw, ch);
  b.setTransform(v.s, 0, 0, v.s, v.ox, v.oy); A.drawBackground(b, run.stage); b.setTransform(1, 0, 0, 1, 0, 0);
}

/* ---------- Loop ---------- */
function step(dt) {
  if (run.state === 'play') {
    const ax = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0), ay = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
    if (ax || ay) { const sp = (run.steady ? 160 : 420) * dt / Math.hypot(ax, ay); run.setAim(run.aim.x + ax * sp, run.aim.y + ay * sp); }
  }
  const before = run.shot && run.shot.resolved, prevState = run.state;
  run.update(dt);
  if (run.shot && !before && run.shot.resolved) onImpact(run.shot);
  if (prevState === 'shot' && run.state !== 'shot' && run.state !== 'paused') popups = [];
  for (const p of popups) p.life -= dt; popups = popups.filter(p => p.life > 0);
  if (run.state !== lastState) syncUI();
}
function frame(now) {
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  resize(); step(dt); render();
  requestAnimationFrame(frame);
}
function onImpact(shot) {
  const h = shot.hit;
  if (h.kind === 'person' && h.person.target) { sound.hit(); popups.push({ text: shot.head ? '정밀 명중!' : '명중!', color: '#ffd27a', life: 1.6 }); }
  else if (h.kind === 'person') { sound.hit(); popups.push({ text: h.person.decoy ? '가짜 윌리!' : '엉뚱한 사람!', color: '#ff8a7a', life: 1.6 }); }
  else { sound.miss(); popups.push({ text: h.kind === 'prop' ? '가림막에 막힘' : '빗나감', color: '#d7e2ee', life: 1.4 }); }
}

/* ---------- Rendering ---------- */
function render() {
  ensureBackground();
  const v = view(), t = run.elapsed, shot = run.shot || (run.state === 'paused' && run.pausedFrom === 'shot' ? run.shot : null);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (shot) { renderBulletTime(v, shot); return; }
  ctx.drawImage(bg, 0, 0);
  ctx.setTransform(v.s, 0, 0, v.s, v.ox, v.oy);
  A.drawAmbient(ctx, run.stage, t, reduced); A.drawWorld(ctx, run.stage, t, null); A.drawAtmosphere(ctx, run.stage);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  vignette(.55);
  if (run.state === 'play' || run.state === 'paused') renderScope(v, t);
  renderHud(v);
}
function vignette(strength) {
  const g = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * .35, cw / 2, ch / 2, Math.max(cw, ch) * .72);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(3,6,14,${strength})`); ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
}
const MAG = 3.2;
function scopeRadius() { return Math.min(cw, ch) * .22; }
function renderScope(v, t) {
  const R = scopeRadius(), cx = v.ox + run.aim.x * v.s, cy = v.oy + run.aim.y * v.s, k = v.s * MAG;
  // dim everything outside the lens
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, cw, ch); ctx.arc(cx, cy, R + 10 * dpr, 0, Math.PI * 2, true); ctx.fillStyle = 'rgba(4,8,16,.38)'; ctx.fill('evenodd'); ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
  ctx.setTransform(k, 0, 0, k, cx - run.aim.x * k, cy - run.aim.y * k);
  const half = R / k, vw = { x0: run.aim.x - half, x1: run.aim.x + half, y0: run.aim.y - half, y1: run.aim.y + half };
  A.drawBackground(ctx, run.stage); A.drawAmbient(ctx, run.stage, t, reduced); A.drawWorld(ctx, run.stage, t, vw); A.drawAtmosphere(ctx, run.stage);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // lens shading and glare
  const lg = ctx.createRadialGradient(cx, cy, R * .55, cx, cy, R); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,10,20,.55)'); ctx.fillStyle = lg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.fillStyle = 'rgba(160,220,255,.05)'; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();
  ctx.lineWidth = 8 * dpr; ctx.strokeStyle = '#121a24'; ctx.beginPath(); ctx.arc(cx, cy, R + 4 * dpr, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 2 * dpr; ctx.strokeStyle = '#4c6478'; ctx.beginPath(); ctx.arc(cx, cy, R + 9 * dpr, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 6 * dpr; ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.beginPath(); ctx.arc(cx, cy, R - 14 * dpr, 3.5, 4.4); ctx.stroke();
  // reticle follows the breathing sway: the bullet goes exactly where it points
  const sw = run.sway(), rx = cx + sw.x * k, ry = cy + sw.y * k, lw = Math.max(1, dpr);
  ctx.strokeStyle = 'rgba(20,24,30,.9)'; ctx.lineWidth = lw * 1.6; ctx.beginPath();
  ctx.moveTo(rx - R, ry); ctx.lineTo(rx - 9 * dpr, ry); ctx.moveTo(rx + 9 * dpr, ry); ctx.lineTo(rx + R, ry); ctx.moveTo(rx, ry - R); ctx.lineTo(rx, ry - 9 * dpr); ctx.moveTo(rx, ry + 9 * dpr); ctx.lineTo(rx, ry + R); ctx.stroke();
  ctx.lineWidth = lw * 3.5; ctx.beginPath(); ctx.moveTo(rx - R, ry); ctx.lineTo(rx - R * .55, ry); ctx.moveTo(rx + R * .55, ry); ctx.lineTo(rx + R, ry); ctx.moveTo(rx, ry + R * .55); ctx.lineTo(rx, ry + R); ctx.stroke();
  ctx.lineWidth = lw; for (let i = 1; i <= 4; i++) { const d = i * R * .11; ctx.beginPath(); ctx.moveTo(rx + d, ry - 3 * dpr); ctx.lineTo(rx + d, ry + 3 * dpr); ctx.moveTo(rx - d, ry - 3 * dpr); ctx.lineTo(rx - d, ry + 3 * dpr); ctx.moveTo(rx - 3 * dpr, ry + d); ctx.lineTo(rx + 3 * dpr, ry + d); ctx.stroke(); }
  ctx.fillStyle = run.steady ? '#3fe0b0' : '#e8463c'; ctx.beginPath(); ctx.arc(rx, ry, 2.2 * dpr, 0, Math.PI * 2); ctx.fill();
  if (run.steady || run.breath < 1) { ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 4 * dpr; ctx.beginPath(); ctx.arc(cx, cy, R + 18 * dpr, -Math.PI * .75, -Math.PI * .25); ctx.stroke(); ctx.strokeStyle = run.steady ? '#3fe0b0' : '#9ab'; ctx.beginPath(); ctx.arc(cx, cy, R + 18 * dpr, -Math.PI * .75, -Math.PI * .75 + Math.PI * .5 * run.breath); ctx.stroke(); }
}
function renderBulletTime(v, shot) {
  const k = shot.clock, fly = Math.min(1, k / C.FLIGHT), zoomIn = 1 - Math.pow(1 - Math.min(1, k / .35), 3), z = 1 + (reduced ? 1.6 : 2.2) * zoomIn;
  let shake = 0; if (!reduced && shot.resolved && shot.hit.kind === 'person') shake = Math.sin(k * 90) * 6 * dpr * Math.max(0, 1 - (k - C.FLIGHT) / .3);
  const s = v.s * z; let fx = cw * .5, fy = ch * .55;
  ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, cw, ch);
  // camera: scale z around the shot point, easing the shot point toward the frame focus
  const px = v.ox + shot.x * v.s, py = v.oy + shot.y * v.s, cxp = px + (fx - px) * zoomIn, cyp = py + (fy - py) * zoomIn;
  // keep the camera inside the world so the frame never shows the edge of the map
  const clampT = (t, span, view) => span >= view ? Math.min(0, Math.max(view - span, t)) : (view - span) / 2;
  const tx = clampT(cxp - shot.x * s, C.WORLD.width * s, cw), ty = clampT(cyp - shot.y * s, C.WORLD.height * s, ch);
  ctx.setTransform(s, 0, 0, s, tx + shake, ty + shake * .6);
  fx = tx + shot.x * s; fy = ty + shot.y * s;
  A.drawBackground(ctx, run.stage); A.drawAmbient(ctx, run.stage, run.elapsed, reduced);
  const half = Math.max(cw, ch) / s; A.drawWorld(ctx, run.stage, run.elapsed, { x0: shot.x - half, x1: shot.x + half, y0: shot.y - half, y1: shot.y + half }); A.drawAtmosphere(ctx, run.stage);
  // dust or sparks at the impact point
  if (shot.resolved && (shot.hit.kind !== 'person') && !reduced) { const d = Math.min(1, (k - C.FLIGHT) / 1.2); for (let i = 0; i < 9; i++) { const a = -Math.PI + i * Math.PI / 8, r = 3 + d * (18 + (i % 3) * 6); ctx.fillStyle = `rgba(225,215,195,${.6 * (1 - d)})`; ctx.beginPath(); ctx.arc(shot.x + Math.cos(a) * r, shot.y + Math.sin(a) * r * .5 - d * 8, 2.5 + d * 4, 0, Math.PI * 2); ctx.fill(); } }
  if (shot.resolved && shot.hit.kind === 'person' && !reduced) { const d = Math.min(1, (k - C.FLIGHT) / .9); for (let i = 0; i < 14; i++) { const a = -1.2 - i * .16, r = d * (10 + (i % 4) * 7); ctx.fillStyle = `rgba(150,30,40,${.85 * (1 - d)})`; ctx.beginPath(); ctx.arc(shot.x + Math.cos(a) * r * shot.hit.person.fallDir * -1, shot.y + Math.sin(a) * r + d * d * 14, 1.6, 0, Math.PI * 2); ctx.fill(); } }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  vignette(.7);
  // bullet with a heat trail, flying in from the bottom right
  if (!shot.resolved) {
    const sx = cw * 1.05, sy = ch * 1.05, bx = sx + (fx - sx) * fly, by = sy + (fy - sy) * fly, ang = Math.atan2(fy - sy, fx - sx);
    if (!reduced) for (let i = 0; i < 14; i++) { const q = i * 18 * dpr; ctx.strokeStyle = `rgba(255,220,160,${.55 - i * .038})`; ctx.lineWidth = (6 - i * .35) * dpr; ctx.beginPath(); ctx.moveTo(bx - Math.cos(ang) * q, by - Math.sin(ang) * q); ctx.lineTo(bx - Math.cos(ang) * (q + 18 * dpr), by - Math.sin(ang) * (q + 18 * dpr)); ctx.stroke(); }
    ctx.save(); ctx.translate(bx, by); ctx.rotate(ang); ctx.fillStyle = '#e8b45c'; ctx.beginPath(); ctx.moveTo(14 * dpr, 0); ctx.lineTo(4 * dpr, -4 * dpr); ctx.lineTo(-14 * dpr, -4 * dpr); ctx.lineTo(-14 * dpr, 4 * dpr); ctx.lineTo(4 * dpr, 4 * dpr); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#a8763a'; ctx.fillRect(-14 * dpr, -4 * dpr, 6 * dpr, 8 * dpr); ctx.restore();
    if (!reduced) for (let i = 0; i < 10; i++) { const x = ((i * 173 - k * 900) % (cw + 200) + cw + 200) % (cw + 200) - 100, y = (i * 97 * dpr) % ch; ctx.strokeStyle = 'rgba(200,215,230,.12)'; ctx.lineWidth = dpr; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60 * dpr, y - 25 * dpr); ctx.stroke(); }
  } else if (shot.hit.kind === 'person') {
    const d = Math.min(1, (k - C.FLIGHT) / .6), c = shot.hit.person.target ? (shot.head ? '#ffd27a' : '#ffffff') : '#ff7a6a', r = (10 + d * 8) * dpr;
    ctx.strokeStyle = c; ctx.globalAlpha = 1 - d * .6; ctx.lineWidth = 3 * dpr; ctx.beginPath(); for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { ctx.moveTo(fx + a * r * .45, fy + b * r * .45); ctx.lineTo(fx + a * r, fy + b * r); } ctx.stroke(); ctx.globalAlpha = 1;
  }
  // cinema bars
  ctx.fillStyle = 'rgba(2,4,10,.92)'; const bar = ch * .09; ctx.fillRect(0, 0, cw, bar); ctx.fillRect(0, ch - bar, cw, bar);
  ctx.fillStyle = 'rgba(220,230,240,.75)'; ctx.font = `600 ${12 * dpr}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(shot.resolved ? 'IMPACT' : 'BULLET TIME  ·  0.1×', cw / 2, ch - bar / 2 + 4 * dpr);
  for (const p of popups) { const a = Math.min(1, p.life / .4), y = fy - 70 * dpr - (1.6 - p.life) * 22 * dpr; ctx.globalAlpha = a; ctx.font = `900 ${30 * dpr}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.lineWidth = 6 * dpr; ctx.strokeStyle = 'rgba(10,8,4,.8)'; ctx.strokeText(p.text, fx, y); ctx.fillStyle = p.color; ctx.fillText(p.text, fx, y); ctx.globalAlpha = 1; }
}
function renderHud(v) {
  if (!['play', 'paused', 'shot'].includes(run.state) && !(run.state === 'paused')) return;
  const u = dpr, pad = 14 * u, loc = run.location;
  ctx.textBaseline = 'middle';
  // left: location
  glass(pad, pad, 200 * u, 44 * u); ctx.fillStyle = '#ffb35c'; ctx.font = `700 ${10 * u}px system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.fillText(`STAGE ${run.level + 1}${loc.tier ? ` · ${loc.tier + 1}회차` : ''}`, pad + 12 * u, pad + 14 * u);
  ctx.fillStyle = '#f2f6ff'; ctx.font = `800 ${15 * u}px system-ui, sans-serif`; ctx.fillText(loc.name, pad + 12 * u, pad + 31 * u);
  // center: time bar
  const bw = Math.min(360 * u, cw * .34), bx = (cw - bw) / 2, frac = run.time / loc.time;
  glass(bx - 10 * u, pad, bw + 20 * u, 44 * u); ctx.fillStyle = 'rgba(255,255,255,.12)'; rrFill(bx, pad + 27 * u, bw, 7 * u, 4 * u);
  ctx.fillStyle = frac < .2 ? '#ff6b5c' : frac < .45 ? '#ffc35c' : '#5fe0b5'; rrFill(bx, pad + 27 * u, bw * frac, 7 * u, 4 * u);
  ctx.fillStyle = '#dfe8f5'; ctx.font = `700 ${12 * u}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(`${Math.ceil(run.time)}초`, cw / 2, pad + 13 * u);
  // right: lives, score
  const rw = 190 * u, rx = cw - pad - rw; glass(rx, pad, rw, 44 * u);
  for (let i = 0; i < 3; i++) heart(rx + 20 * u + i * 22 * u, pad + 22 * u, 7.5 * u, i < run.lives);
  ctx.fillStyle = '#ffd9a8'; ctx.font = `800 ${17 * u}px system-ui, sans-serif`; ctx.textAlign = 'right'; ctx.fillText(run.score.toLocaleString('ko-KR'), rx + rw - 12 * u, pad + 22 * u);
  // bottom-left: shots left before the target bolts
  const left = C.MAX_MISSES - run.misses; glass(pad, ch - pad - 38 * u, 150 * u, 38 * u);
  ctx.fillStyle = '#b8c7d9'; ctx.font = `600 ${11 * u}px system-ui, sans-serif`; ctx.textAlign = 'left'; ctx.fillText('기회', pad + 12 * u, ch - pad - 19 * u);
  for (let i = 0; i < C.MAX_MISSES; i++) { ctx.fillStyle = i < left ? '#e8b45c' : 'rgba(255,255,255,.18)'; rrFill(pad + 48 * u + i * 26 * u, ch - pad - 29 * u, 9 * u, 20 * u, 3 * u); }
  ctx.textBaseline = 'alphabetic';
}
function glass(x, y, w, h) { ctx.fillStyle = 'rgba(8,14,26,.62)'; rrFill(x, y, w, h, 10 * dpr); ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = dpr; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, 10 * dpr) : ctx.rect(x, y, w, h); ctx.stroke(); }
function rrFill(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, Math.max(0, w), h, r) : ctx.rect(x, y, Math.max(0, w), h); ctx.fill(); }
function heart(x, y, r, full) { ctx.fillStyle = full ? '#ff5f6d' : 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(x, y + r * .9); ctx.bezierCurveTo(x - r * 1.6, y - r * .2, x - r * .8, y - r * 1.3, x, y - r * .45); ctx.bezierCurveTo(x + r * .8, y - r * 1.3, x + r * 1.6, y - r * .2, x, y + r * .9); ctx.fill(); }

/* ---------- Page UI ---------- */
function stars(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); }
function drawPosterCard() { const pc = $('ssPoster'), r = Math.min(2, window.devicePixelRatio || 1); pc.width = 220 * r; pc.height = 280 * r; const p = pc.getContext('2d'); p.setTransform(r, 0, 0, r, 0, 0); A.drawPoster(p, 220, 280, C.targetLook(run.location)); $('ssClues').replaceChildren(...run.clues.map(c => Object.assign(document.createElement('li'), { textContent: c }))); }
function syncUI() {
  const st = run.state; if (st === lastState) return; const prev = lastState; lastState = st;
  keys.clear(); drag = null; run.setSteady(false);
  const overlay = $('ssOverlay'), btn = $('ssAction'), loc = run.location;
  overlay.hidden = st === 'play' || st === 'shot';
  $('ssPause').disabled = !['play', 'shot', 'paused'].includes(st); $('ssPause').textContent = st === 'paused' ? '계속하기' : '일시정지';
  $('ssFire').disabled = st !== 'play'; $('ssSteady').disabled = st !== 'play'; $('ssSkip').hidden = st !== 'shot';
  if (prev === '' || st === 'brief') drawPosterCard();
  const set = (kicker, title, text, label) => { $('ssKicker').textContent = kicker; $('ssTitle').textContent = title; $('ssText').textContent = text; btn.textContent = label; };
  if (st === 'brief') set(`STAGE ${run.level + 1}${loc.tier ? ` · ${loc.tier + 1}회차` : ''}`, loc.name, `수배 전단의 단서 네 가지가 모두 맞는 사람이 윌리입니다.\n${run.clues.join(' · ')}\n단서가 하나만 다른 변장 인물 ${loc.decoys}명이 섞여 있어요.`, '임무 시작');
  else if (st === 'paused') set('PAUSED', '일시정지', '준비되면 계속하세요.', '계속하기');
  else if (st === 'clear') { sound.clear(); const r = run.result, b = r.breakdown; set(`${stars(r.stars)}  STAGE CLEAR`, `${r.name} 완료`, `+${r.gained.toLocaleString('ko-KR')}점  (기본 ${b.base} · 남은 시간 ${b.time} · 남은 기회 ${b.misses}${b.head ? ` · 정밀 ${b.head}` : ''}${b.tier ? ` · 회차 ${b.tier}` : ''})\n누적 ${run.score.toLocaleString('ko-KR')}점 · ${r.seconds}초`, '다음 장소'); }
  else if (st === 'failed') { sound.fail(); set(`남은 목숨 ${run.lives}`, '작전 실패', run.message + '\n같은 장소에서 새 군중으로 다시 도전합니다.', '다시 도전'); }
  else if (st === 'over') {
    sound.fail(); const newBest = run.score > best; if (newBest) { best = run.score; store.set('shadowSniperBest', String(best)); }
    set('GAME OVER', newBest ? '새 최고 기록!' : '작전 종료', `${run.message}\n최종 ${run.score.toLocaleString('ko-KR')}점 · ${run.clears.length}곳 완료`, '처음부터');
    if (!scored) { scored = true; window.dispatchEvent(new CustomEvent('partygame:score', { detail: { gameId: 'shadow-sniper', score: run.score, wave: run.level + 1 } })); }
  }
  $('ssBest').textContent = best ? `${best.toLocaleString('ko-KR')}점` : '아직 기록이 없습니다';
  $('ssStatus').textContent = st === 'play' ? '단서를 모두 확인한 뒤 쏘세요.' : '';
}
function action() {
  const st = run.state;
  if (st === 'brief') run.begin(); else if (st === 'paused') run.pause(); else if (st === 'clear' || st === 'failed') run.next();
  else if (st === 'over') { run = new C.SniperRun(); scored = false; }
  syncUI(); canvas.focus({ preventScroll: true });
}
function fire() { if (run.state !== 'play') return; const r = run.fire(); if (r.kind !== 'blocked') sound.shot(); syncUI(); }
$('ssAction').onclick = action;
$('ssPause').onclick = () => { run.pause(); syncUI(); };
$('ssSkip').onclick = () => { if (run.skip()) { popups = []; syncUI(); canvas.focus({ preventScroll: true }); } };
$('ssFire').onclick = fire;
const steadyOn = e => { e.preventDefault(); run.setSteady(true); }, steadyOff = () => run.setSteady(false);
$('ssSteady').addEventListener('pointerdown', steadyOn); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) $('ssSteady').addEventListener(ev, steadyOff);
$('ssSound').onchange = async e => { await sound.enable(e.target.checked); e.target.checked = sound.on; };

/* ---------- Input ---------- */
canvas.addEventListener('pointermove', e => {
  if (run.state !== 'play') return;
  if (e.pointerType === 'touch') { if (drag?.id !== e.pointerId) return; const v = view(), k = dpr / v.s * 1.15; run.setAim(drag.ax + (e.clientX - drag.x) * k, drag.ay + (e.clientY - drag.y) * k); return; }
  const p = toWorld(e.offsetX, e.offsetY); run.setAim(p.x, p.y);
});
canvas.addEventListener('pointerdown', e => {
  canvas.focus({ preventScroll: true });
  if (run.state !== 'play') return;
  if (e.pointerType === 'touch') { canvas.setPointerCapture(e.pointerId); drag = { id: e.pointerId, x: e.clientX, y: e.clientY, ax: run.aim.x, ay: run.aim.y }; return; }
  if (e.button === 0) { const p = toWorld(e.offsetX, e.offsetY); run.setAim(p.x, p.y); fire(); }
});
for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, e => { if (drag?.id === e.pointerId) drag = null; });
canvas.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('keydown', e => {
  if (e.target.closest && e.target.closest('input,select,textarea')) return;
  const k = e.key.toLowerCase();
  if ((k === ' ' || k === 'enter') && e.target.closest && e.target.closest('button,a')) return;
  if (k === 'p' || k === 'escape') { e.preventDefault(); run.pause(); syncUI(); return; }
  if (run.state !== 'play') { if ((k === 'enter' || k === ' ') && !$('ssOverlay').hidden) { e.preventDefault(); action(); } return; }
  if (k === 'shift') { run.setSteady(true); return; }
  if (k === ' ' || k === 'f' || k === 'enter') { e.preventDefault(); if (!e.repeat) fire(); return; }
  if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(k)) { e.preventDefault(); keys.add(k); }
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys.delete(k); if (k === 'shift') run.setSteady(false); });
function suspend() { keys.clear(); drag = null; if (run.state === 'play' || run.state === 'shot') { run.pause(); syncUI(); } }
addEventListener('blur', suspend); document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change', e => { reduced = e.matches; });

resize(); syncUI(); $('ssAction').disabled = false; requestAnimationFrame(t => { last = t; frame(t); });
window.__shadowSniper.ready = true;
})();
