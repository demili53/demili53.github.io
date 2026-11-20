/* 윌리를 찾아서 저격해라 — vector art for scenes, props, people and the wanted poster.
   Everything is drawn in world units (1600 × 900), so the same calls render the overview and the magnified scope crisply. */
'use strict';
(function (root) {
const C = root.SniperCore;
const TOP_COLORS = { stripe: '#d8434b', green: '#4f9a5a', blue: '#3f6fb5', yellow: '#e9c247', purple: '#8a5bb3', check: '#b65a3c', white: '#ece8de', orange: '#e4853a' };

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f)));
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
function ell(ctx, x, y, rx, ry, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
function circle(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
function poly(ctx, pts, color) { ctx.fillStyle = color; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }
function vgrad(ctx, y0, y1, stops) { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g; }
function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

/* ---------- Backgrounds (static part) ---------- */
const SCENES = {
  harbor(ctx, st) {
    const H = st.horizon;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#8ec8e8'], [1, '#d7eef2']]); ctx.fillRect(0, 0, 1600, H);
    circle(ctx, 1320, 90, 46, '#fff4c4'); ctx.globalAlpha = .25; circle(ctx, 1320, 90, 80, '#fff4c4'); ctx.globalAlpha = 1;
    ctx.fillStyle = vgrad(ctx, 200, H, [[0, '#4d9cb8'], [1, '#2f7893']]); ctx.fillRect(0, 210, 1600, H - 210);
    for (let i = 0; i < 9; i++) { const x = 60 + i * 180, h = 110 + hash(i) * 70, c = ['#e4b08f', '#9cc4b6', '#d79c9c', '#e9d38f', '#a9b7d9'][i % 5];
      ctx.fillStyle = c; ctx.fillRect(x, 210 - h, 150, h); ctx.fillStyle = shade(c, .82); ctx.fillRect(x + 120, 210 - h, 30, h);
      poly(ctx, [[x - 8, 210 - h], [x + 75, 210 - h - 34], [x + 158, 210 - h]], '#b45b4a');
      ctx.fillStyle = '#4f6a78'; for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) ctx.fillRect(x + 18 + k * 40, 210 - h + 22 + r * 34, 18, 22); }
    for (const [x, c] of [[250, '#c2564d'], [690, '#f1f1e6'], [1100, '#3c6e91']]) {
      poly(ctx, [[x - 90, 270], [x + 90, 270], [x + 65, 300], [x - 70, 300]], c); ctx.fillStyle = '#6b4b36'; ctx.fillRect(x - 3, 160, 6, 112);
      poly(ctx, [[x + 4, 166], [x + 4, 258], [x + 70, 252]], '#f7f2e2'); poly(ctx, [[x - 4, 180], [x - 4, 258], [x - 55, 254]], '#efe6cc'); }
    ctx.fillStyle = '#8d7a66'; ctx.fillRect(0, H - 14, 1600, 14);
    ctx.fillStyle = vgrad(ctx, H, 900, [[0, '#cdbca0'], [1, '#b79f80']]); ctx.fillRect(0, H, 1600, 900 - H);
    ctx.strokeStyle = 'rgba(110,90,70,.28)'; ctx.lineWidth = 1.2;
    for (let y = H + 18, row = 0; y < 900; y += 14 + row * 2.2, row++) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1600, y); ctx.stroke(); const step = 40 + row * 7; for (let x = (row % 2) * step / 2; x < 1600; x += step) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 14 + row * 2.2); ctx.stroke(); } }
    // bunting
    ctx.strokeStyle = '#6d5a4a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 120); ctx.quadraticCurveTo(800, 200, 1600, 120); ctx.stroke();
    for (let i = 0; i < 32; i++) { const x = 25 + i * 50, t = x / 1600, y = (1 - t) * (1 - t) * 120 + 2 * (1 - t) * t * 200 + t * t * 120; poly(ctx, [[x - 11, y - 2], [x + 11, y - 2], [x, y + 20]], ['#d8434b', '#f2c94c', '#3f9fb5', '#f4f1e6'][i % 4]); }
  },
  festival(ctx, st) {
    const H = st.horizon;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#120f2e'], [.7, '#2c2157'], [1, '#4a2d5f']]); ctx.fillRect(0, 0, 1600, H);
    for (let i = 0; i < 110; i++) circle(ctx, hash(i) * 1600, hash(i + 50) * (H - 80), .8 + hash(i + 9) * 1.4, `rgba(255,248,220,${.35 + hash(i + 3) * .5})`);
    circle(ctx, 240, 80, 34, '#f6eecf'); circle(ctx, 254, 72, 30, '#120f2e');
    // ferris wheel
    ctx.strokeStyle = '#7d5f98'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(1240, 170, 140, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; ctx.beginPath(); ctx.moveTo(1240, 170); ctx.lineTo(1240 + Math.cos(a) * 140, 170 + Math.sin(a) * 140); ctx.stroke(); }
    ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(1180, H); ctx.lineTo(1240, 170); ctx.lineTo(1300, H); ctx.stroke();
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; rr(ctx, 1240 + Math.cos(a) * 140 - 14, 170 + Math.sin(a) * 140 - 4, 28, 22, 5); ctx.fillStyle = ['#e48a8a', '#f2d27a', '#8ec6e0'][i % 3]; ctx.fill(); }
    // far stalls skyline
    for (let i = 0; i < 8; i++) { const x = i * 200 - 20; poly(ctx, [[x, H], [x, H - 70], [x + 90, H - 120], [x + 180, H - 70], [x + 180, H]], i % 2 ? '#3a2c55' : '#44325f'); ctx.fillStyle = '#ffcf7a'; ctx.globalAlpha = .55; ctx.fillRect(x + 60, H - 60, 60, 36); ctx.globalAlpha = 1; }
    ctx.fillStyle = vgrad(ctx, H, 900, [[0, '#3b3150'], [1, '#2a2338']]); ctx.fillRect(0, H, 1600, 900 - H);
    for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(${hash(i) > .5 ? '255,214,150' : '170,150,220'},${.08 + hash(i + 7) * .14})`; ctx.fillRect(hash(i + 1) * 1600, H + hash(i + 2) * (900 - H), 3, 2); }
  },
  snow(ctx, st) {
    const H = st.horizon;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#a9c6e0'], [1, '#e6eff6']]); ctx.fillRect(0, 0, 1600, H);
    for (const [x, w, h, c] of [[0, 520, 220, '#c4d4e4'], [380, 640, 280, '#b1c4d8'], [900, 760, 240, '#c0d1e2']]) { poly(ctx, [[x, H - 60], [x + w / 2, H - 60 - h], [x + w, H - 60]], c); poly(ctx, [[x + w / 2 - w * .12, H - 60 - h * .76], [x + w / 2, H - 60 - h], [x + w / 2 + w * .12, H - 60 - h * .76], [x + w / 2 + w * .04, H - 60 - h * .7], [x + w / 2 - w * .05, H - 60 - h * .72]], '#f7fafc'); }
    for (let i = 0; i < 5; i++) { const x = 70 + i * 320, y = H - 10; ctx.fillStyle = '#8a6250'; ctx.fillRect(x, y - 90, 170, 90); ctx.fillStyle = '#6d4c3e'; ctx.fillRect(x + 130, y - 90, 40, 90);
      poly(ctx, [[x - 18, y - 88], [x + 85, y - 150], [x + 188, y - 88]], '#f5f8fb'); ctx.fillStyle = '#ffd98a'; ctx.fillRect(x + 25, y - 64, 30, 26); ctx.fillRect(x + 90, y - 64, 30, 26); ctx.fillStyle = '#5b3d31'; ctx.fillRect(x + 64, y - 52, 22, 52); }
    ctx.fillStyle = vgrad(ctx, H, 900, [[0, '#eef3f8'], [1, '#d6e2ee']]); ctx.fillRect(0, H, 1600, 900 - H);
    ctx.strokeStyle = 'rgba(150,175,200,.35)'; ctx.lineWidth = 3; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(hash(i) * 1600, H + 20 + hash(i + 4) * 200); ctx.bezierCurveTo(400 + hash(i + 1) * 800, 500, 300 + hash(i + 2) * 900, 700, hash(i + 3) * 1600, 900); ctx.stroke(); }
  },
  garden(ctx, st) {
    const H = st.horizon;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#cfe9e0'], [1, '#eaf5ea']]); ctx.fillRect(0, 0, 1600, H);
    ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3;
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * 200, H); ctx.lineTo(i * 200, 90); ctx.stroke(); }
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(0, 90 + k * 70); ctx.lineTo(1600, 90 + k * 70); ctx.stroke(); }
    ctx.strokeStyle = '#7fa79b'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 90); ctx.quadraticCurveTo(800, -60, 1600, 90); ctx.stroke();
    for (let i = 0; i < 16; i++) { const x = i * 105 + 20, h = 120 + hash(i) * 120; ell(ctx, x, H - h * .5, 60, h * .55, ['#5f9a6c', '#4a8a63', '#7bb07a'][i % 3]); ell(ctx, x + 20, H - h * .7, 36, h * .35, shade(['#5f9a6c', '#4a8a63', '#7bb07a'][i % 3], 1.15)); }
    for (let i = 0; i < 70; i++) circle(ctx, hash(i) * 1600, H - hash(i + 5) * 160, 4, ['#f1a6b7', '#f6dc7a', '#c7b2ec', '#ffffff'][i % 4]);
    ctx.fillStyle = vgrad(ctx, H, 900, [[0, '#d8d2bd'], [1, '#c8bfa3']]); ctx.fillRect(0, H, 1600, 900 - H);
    ctx.fillStyle = 'rgba(120,110,85,.18)'; for (let i = 0; i < 180; i++) { const y = H + hash(i) * (900 - H), s = .5 + (y - H) / (900 - H); ell(ctx, hash(i + 3) * 1600, y, 16 * s, 6 * s, 'rgba(120,110,85,.14)'); }
  },
  pier(ctx, st) {
    const H = st.horizon;
    ctx.fillStyle = vgrad(ctx, 0, 250, [[0, '#4b3f78'], [.45, '#e07a6a'], [1, '#f7c58a']]); ctx.fillRect(0, 0, 1600, 250);
    circle(ctx, 980, 228, 64, '#ffe1a0'); ctx.globalAlpha = .3; circle(ctx, 980, 228, 120, '#ffd08a'); ctx.globalAlpha = 1;
    ctx.fillStyle = vgrad(ctx, 250, H, [[0, '#d9876e'], [.3, '#8a6f8f'], [1, '#4c6f8f']]); ctx.fillRect(0, 250, 1600, H - 250);
    ctx.strokeStyle = 'rgba(255,214,160,.55)'; ctx.lineWidth = 2; for (let i = 0; i < 14; i++) { const w = 120 - i * 6; ctx.beginPath(); ctx.moveTo(980 - w / 2 + hash(i) * 20, 262 + i * 8); ctx.lineTo(980 + w / 2, 262 + i * 8); ctx.stroke(); }
    poly(ctx, [[180, 246], [300, 246], [282, 262], [196, 262]], '#3b2f45'); ctx.fillStyle = '#3b2f45'; ctx.fillRect(238, 180, 4, 66); poly(ctx, [[242, 186], [242, 242], [290, 240]], '#4c3d55');
    ctx.fillStyle = vgrad(ctx, H - 10, 900, [[0, '#e9cf9f'], [1, '#d7b47e']]); ctx.fillRect(0, H - 10, 1600, 910 - H);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.moveTo(0, H - 10); for (let x = 0; x <= 1600; x += 40) ctx.lineTo(x, H - 4 + Math.sin(x * .05) * 5); ctx.lineTo(1600, H - 10); ctx.fill();
    ctx.fillStyle = '#a77a55'; poly(ctx, [[640, 900], [960, 900], [880, H + 40], [720, H + 40]], '#b4875e');
    ctx.strokeStyle = 'rgba(90,60,40,.35)'; ctx.lineWidth = 2; for (let i = 0; i < 26; i++) { const y = H + 40 + Math.pow(i / 26, 1.4) * (860 - H); const t = (y - H - 40) / (860 - H); ctx.beginPath(); ctx.moveTo(720 - t * 80, y); ctx.lineTo(880 + t * 80, y); ctx.stroke(); }
    for (let i = 0; i < 120; i++) ell(ctx, hash(i) * 1600, H + hash(i + 1) * (900 - H), 3, 1.4, 'rgba(160,120,80,.25)');
  },
  station(ctx, st) {
    const H = st.horizon;
    ctx.fillStyle = vgrad(ctx, 0, H, [[0, '#5d6f7f'], [1, '#8796a1']]); ctx.fillRect(0, 0, 1600, H);
    for (let i = 0; i < 5; i++) { const x = 40 + i * 320; ctx.fillStyle = '#b9d0dc'; rr(ctx, x, 40, 240, 200, [120, 120, 6, 6]); ctx.fill(); ctx.strokeStyle = '#5a6b78'; ctx.lineWidth = 4; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * 60, 50); ctx.lineTo(x + k * 60, 240); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x + 240, 150); ctx.stroke(); }
    ctx.fillStyle = '#2f4250'; rr(ctx, 120, H - 130, 1360, 110, 24); ctx.fill(); ctx.fillStyle = '#c9a65a'; ctx.fillRect(120, H - 52, 1360, 10);
    for (let i = 0; i < 18; i++) { ctx.fillStyle = '#a9c8d3'; rr(ctx, 150 + i * 74, H - 112, 52, 44, 6); ctx.fill(); }
    ctx.fillStyle = '#1b2731'; rr(ctx, 650, 250, 300, 60, 6); ctx.fill();
    ctx.fillStyle = '#ffcf6a'; for (let r = 0; r < 3; r++) ctx.fillRect(668, 262 + r * 15, 200 - r * 40, 7);
    ctx.fillStyle = vgrad(ctx, H, 900, [[0, '#cfc8b8'], [1, '#b8b0a0']]); ctx.fillRect(0, H, 1600, 900 - H);
    ctx.fillStyle = '#e1c063'; ctx.fillRect(0, H + 6, 1600, 8);
    ctx.strokeStyle = 'rgba(90,85,75,.25)'; ctx.lineWidth = 1.5;
    for (let i = -10; i <= 26; i++) { ctx.beginPath(); ctx.moveTo(800 + (i - 8) * 60, H + 14); ctx.lineTo(800 + (i - 8) * 150, 900); ctx.stroke(); }
    for (let k = 0; k < 12; k++) { const y = H + 14 + Math.pow(k / 12, 1.6) * (886 - H); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1600, y); ctx.stroke(); }
  }
};

/* ---------- Props ---------- */
const PROPS = {
  stall(ctx, w, h, i) { const c = ['#d8434b', '#3f9fb5', '#e9a33a'][i % 3];
    ctx.fillStyle = '#7b5a40'; ctx.fillRect(-w * .48, -h, w * .04, h); ctx.fillRect(w * .44, -h, w * .04, h);
    rr(ctx, -w * .5, -h * .45, w, h * .45, 4); ctx.fillStyle = '#8f6a4c'; ctx.fill(); ctx.fillStyle = '#a87f5c'; ctx.fillRect(-w * .5, -h * .45, w, h * .08);
    for (let k = 0; k < 9; k++) circle(ctx, -w * .42 + k * w * .105, -h * .48, w * .04, ['#f08a3a', '#e8d14a', '#6cb05a', '#d64545'][k % 4]);
    for (let k = 0; k < 8; k++) { ctx.fillStyle = k % 2 ? '#f6f0e2' : c; ctx.beginPath(); ctx.moveTo(-w * .52 + k * w * .13, -h); ctx.lineTo(-w * .52 + (k + 1) * w * .13, -h); ctx.lineTo(-w * .52 + (k + 1) * w * .13, -h * .78); ctx.arc(-w * .52 + (k + .5) * w * .13, -h * .78, w * .065, 0, Math.PI); ctx.fill(); } },
  crates(ctx, w, h) { for (const [x, y, s] of [[-w * .5, -h * .62, .55], [-w * .02, -h * .62, .52], [-w * .28, -h, .5]]) { const sw = w * s; ctx.fillStyle = '#a7774c'; ctx.fillRect(x, y, sw, sw * .7 > h * .62 ? h * .62 : sw * .7); ctx.strokeStyle = '#7a5434'; ctx.lineWidth = 2; ctx.strokeRect(x + 2, y + 2, sw - 4, Math.min(sw * .7, h * .62) - 4); ctx.beginPath(); ctx.moveTo(x + 2, y + 2); ctx.lineTo(x + sw - 2, y + Math.min(sw * .7, h * .62) - 2); ctx.stroke(); } },
  barrel(ctx, w, h) { rr(ctx, -w / 2, -h, w, h, w * .3); ctx.fillStyle = '#8a5a36'; ctx.fill(); ctx.fillStyle = '#5c5c5c'; ctx.fillRect(-w / 2, -h * .8, w, 3); ctx.fillRect(-w / 2, -h * .25, w, 3); ctx.fillStyle = 'rgba(255,255,255,.15)'; ctx.fillRect(-w * .3, -h, w * .12, h); },
  lamp(ctx, w, h, i, t) { ctx.fillStyle = '#3b4650'; ctx.fillRect(-w * .12, -h * .9, w * .24, h * .9); rr(ctx, -w / 2, -h, w, h * .16, 4); ctx.fill(); circle(ctx, 0, -h * .92, w * .28, '#ffe6a3'); },
  tent(ctx, w, h, i) { const c = ['#c44f6b', '#3e7fb0', '#d39b3a'][i % 3];
    ctx.fillStyle = shade(c, .75); ctx.fillRect(-w * .5, -h * .72, w, h * .72); ctx.fillStyle = '#ffd28a'; ctx.globalAlpha = .9; ctx.fillRect(-w * .38, -h * .6, w * .76, h * .34); ctx.globalAlpha = 1;
    rr(ctx, -w * .5, -h * .3, w, h * .3, 3); ctx.fillStyle = '#6d4a36'; ctx.fill();
    poly(ctx, [[-w * .58, -h * .7], [0, -h], [w * .58, -h * .7]], c); for (let k = 0; k < 5; k++) poly(ctx, [[-w * .58 + k * w * .232, -h * .7], [-w * .58 + (k + .5) * w * .232, -h * .62], [-w * .58 + (k + 1) * w * .232, -h * .7]], k % 2 ? '#f6efe0' : shade(c, 1.15));
    for (let k = 0; k < 6; k++) circle(ctx, -w * .3 + k * w * .12, -h * .5, w * .035, ['#f6a3c0', '#ffe28a', '#9ad7e8'][k % 3]); },
  lantern(ctx, w, h, i, t) { ctx.fillStyle = '#2f2a3c'; ctx.fillRect(-w * .08, -h * .85, w * .16, h * .85); const glow = .55 + Math.sin(t * 3 + i) * .08;
    ctx.globalAlpha = .25; circle(ctx, 0, -h * .84, w * 1.2, '#ffcf7a'); ctx.globalAlpha = 1; rr(ctx, -w * .4, -h, w * .8, h * .32, w * .3); ctx.fillStyle = `rgba(240,90,70,${.75 + glow * .25})`; ctx.fill(); ctx.fillStyle = '#2f2a3c'; ctx.fillRect(-w * .3, -h, w * .6, 4); ctx.fillRect(-w * .3, -h * .7, w * .6, 4); },
  bench(ctx, w, h) { ctx.fillStyle = '#7b5536'; for (const y of [-h, -h * .72]) ctx.fillRect(-w / 2, y, w, h * .14); ctx.fillRect(-w / 2, -h * .48, w, h * .16); ctx.fillStyle = '#3d3d44'; ctx.fillRect(-w * .44, -h * .34, w * .05, h * .34); ctx.fillRect(w * .39, -h * .34, w * .05, h * .34); },
  drum(ctx, w, h) { rr(ctx, -w / 2, -h * .8, w, h * .8, 8); ctx.fillStyle = '#b8434f'; ctx.fill(); ell(ctx, 0, -h * .8, w / 2, h * .16, '#f2e6cf'); ctx.strokeStyle = '#e8c26a'; ctx.lineWidth = 2; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.moveTo(-w / 2 + k * w / 5, -h * .76); ctx.lineTo(-w / 2 + (k + .5) * w / 5, -h * .05); ctx.stroke(); } },
  pine(ctx, w, h) { ctx.fillStyle = '#6a4a35'; ctx.fillRect(-w * .08, -h * .16, w * .16, h * .16);
    for (const [b, t, s] of [[.12, .6, .5], [.36, .85, .35], [.6, 1, .18]]) { poly(ctx, [[-w * s, -h * b], [0, -h * t - h * .05], [w * s, -h * b]], '#3f7059'); poly(ctx, [[-w * s * .9, -h * b - 2], [-w * s * .3, -h * (b + .05)], [0, -h * t - h * .05], [w * s * .2, -h * (b + .06)], [w * s * .9, -h * b - 2]], '#f2f6f8'); } },
  snowman(ctx, w, h) { circle(ctx, 0, -h * .28, w * .45, '#f6f8fb'); circle(ctx, 0, -h * .68, w * .32, '#f6f8fb'); ctx.fillStyle = '#26303a'; ctx.fillRect(-w * .25, -h, w * .5, h * .14); ctx.fillRect(-w * .35, -h * .88, w * .7, h * .04);
    circle(ctx, -w * .1, -h * .72, 2.5, '#26303a'); circle(ctx, w * .1, -h * .72, 2.5, '#26303a'); poly(ctx, [[0, -h * .66], [w * .28, -h * .63], [0, -h * .61]], '#ee8a3a'); ctx.fillStyle = '#c94a4a'; ctx.fillRect(-w * .3, -h * .5, w * .6, h * .06); },
  sled(ctx, w, h) { rr(ctx, -w / 2, -h * .8, w, h * .45, 6); ctx.fillStyle = '#c2493f'; ctx.fill(); ctx.strokeStyle = '#4b4b52'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-w * .45, -h * .1); ctx.lineTo(w * .5, -h * .1); ctx.quadraticCurveTo(w * .62, -h * .2, w * .55, -h * .45); ctx.stroke(); },
  signpost(ctx, w, h) { ctx.fillStyle = '#6a4a35'; ctx.fillRect(-w * .08, -h, w * .16, h); rr(ctx, -w * .5, -h * .9, w, h * .28, 4); ctx.fillStyle = '#9a6b4b'; ctx.fill(); ctx.fillStyle = '#f2f6f8'; ctx.fillRect(-w * .52, -h * .92, w * 1.04, 6); ctx.fillStyle = '#f4e9d8'; ctx.fillRect(-w * .3, -h * .8, w * .6, 4); },
  planter(ctx, w, h, i) { rr(ctx, -w / 2, -h * .45, w, h * .45, 8); ctx.fillStyle = '#a58468'; ctx.fill(); ctx.fillStyle = '#8b6d55'; ctx.fillRect(-w / 2, -h * .45, w, 8);
    for (let k = 0; k < 7; k++) { const x = -w * .42 + k * w * .14; ell(ctx, x, -h * .62, w * .1, h * .3, k % 2 ? '#4f8d5e' : '#67a86c'); circle(ctx, x, -h * .86, 6, ['#f1a6b7', '#f6dc7a', '#c7b2ec'][(k + i) % 3]); } },
  fountain(ctx, w, h, i, t) { ell(ctx, 0, -h * .06, w / 2, h * .12, '#8f9aa0'); rr(ctx, -w / 2, -h * .35, w, h * .3, 10); ctx.fillStyle = '#b8c0c4'; ctx.fill(); ell(ctx, 0, -h * .35, w / 2, h * .1, '#9fc9da');
    ctx.fillStyle = '#b8c0c4'; ctx.fillRect(-w * .1, -h * .8, w * .2, h * .45); ell(ctx, 0, -h * .8, w * .3, h * .06, '#a9b2b6');
    ctx.strokeStyle = 'rgba(210,240,255,.85)'; ctx.lineWidth = 2; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(0, -h * .84); ctx.quadraticCurveTo(k * w * .12, -h * (1.02 + Math.sin(t * 4 + k) * .02), k * w * .2, -h * .38); ctx.stroke(); } },
  palm(ctx, w, h) { ctx.strokeStyle = '#8a6a48'; ctx.lineWidth = w * .12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(w * .1, -h * .5, 0, -h * .86); ctx.stroke();
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * .45; ctx.fillStyle = k % 2 ? '#4f8d5e' : '#3e7a4f'; ctx.beginPath(); ctx.moveTo(0, -h * .86); ctx.quadraticCurveTo(Math.cos(a) * w * .35, -h * .86 + Math.sin(a) * h * .14 - 20, Math.cos(a) * w * .5, -h * .82 + Math.abs(Math.cos(a)) * h * .08); ctx.quadraticCurveTo(Math.cos(a) * w * .3, -h * .86 + Math.sin(a) * h * .08, 0, -h * .84); ctx.fill(); } },
  umbrella(ctx, w, h, i) { const c = ['#e4574f', '#3fa3c4', '#f2b544', '#7bc27a'][i % 4]; ctx.fillStyle = '#e8e1d2'; ctx.fillRect(-w * .03, -h * .86, w * .06, h * .86);
    ctx.beginPath(); ctx.moveTo(-w / 2, -h * .72); ctx.quadraticCurveTo(0, -h * 1.02, w / 2, -h * .72); ctx.closePath(); ctx.fillStyle = c; ctx.fill();
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(-w / 2 + k * w / 4 + w / 8, -h * .74); ctx.quadraticCurveTo(-w / 2 + k * w / 4 + w / 8 + w * .02, -h * .9, 0, -h * .93); ctx.lineTo(-w / 2 + (k + 1) * w / 4, -h * .72); ctx.fillStyle = k % 2 ? '#f6efe2' : c; ctx.fill(); }
    ell(ctx, w * .3, -2, w * .28, h * .03, 'rgba(0,0,0,.12)'); },
  lifeguard(ctx, w, h) { ctx.fillStyle = '#f2efe8'; ctx.fillRect(-w * .45, -h * .6, w * .1, h * .6); ctx.fillRect(w * .35, -h * .6, w * .1, h * .6); ctx.fillRect(-w * .45, -h * .3, w * .9, 6);
    rr(ctx, -w / 2, -h, w, h * .45, 6); ctx.fillStyle = '#e15a4c'; ctx.fill(); ctx.fillStyle = '#f2efe8'; ctx.fillRect(-w * .38, -h * .9, w * .76, h * .14); poly(ctx, [[-w * .56, -h * .98], [0, -h * 1.08], [w * .56, -h * .98]], '#c64a3e'); },
  boat(ctx, w, h) { ctx.beginPath(); ctx.moveTo(-w / 2, -h * .8); ctx.lineTo(w / 2, -h * .8); ctx.quadraticCurveTo(w * .4, -h * .05, 0, -h * .05); ctx.quadraticCurveTo(-w * .4, -h * .05, -w / 2, -h * .8); ctx.fillStyle = '#3f7fa8'; ctx.fill(); ctx.fillStyle = '#f2efe8'; ctx.fillRect(-w / 2, -h * .8, w, h * .12); ctx.fillStyle = '#8a5d3b'; ctx.fillRect(-w * .1, -h * .76, w * .2, h * .1); },
  cooler(ctx, w, h) { rr(ctx, -w / 2, -h, w, h, 6); ctx.fillStyle = '#3fa3c4'; ctx.fill(); ctx.fillStyle = '#f2efe8'; ctx.fillRect(-w / 2, -h, w, h * .28); },
  pillar(ctx, w, h) { const g = ctx.createLinearGradient(-w * .4, 0, w * .4, 0); g.addColorStop(0, '#9aa6ad'); g.addColorStop(.4, '#d5dade'); g.addColorStop(1, '#8a959c'); ctx.fillStyle = g; ctx.fillRect(-w * .4, -h, w * .8, h); ctx.fillStyle = '#7c878e'; ctx.fillRect(-w * .5, -h * .05, w, h * .05); ctx.fillRect(-w * .5, -h, w, h * .04); },
  kiosk(ctx, w, h) { rr(ctx, -w / 2, -h * .6, w, h * .6, 6); ctx.fillStyle = '#2f5d4f'; ctx.fill(); ctx.fillStyle = '#f6e7c6'; ctx.fillRect(-w * .42, -h * .55, w * .84, h * .2); for (let k = 0; k < 6; k++) { ctx.fillStyle = ['#e4574f', '#f2b544', '#3fa3c4'][k % 3]; ctx.fillRect(-w * .4 + k * w * .14, -h * .53, w * .1, h * .16); }
    ctx.fillStyle = '#c94a3e'; rr(ctx, -w * .55, -h, w * 1.1, h * .22, 8); ctx.fill(); ctx.fillStyle = '#fff3d6'; ctx.font = `bold ${h * .12}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('NEWS', 0, -h * .85); },
  clockPost(ctx, w, h, i, t) { ctx.fillStyle = '#2f3d48'; ctx.fillRect(-w * .08, -h * .8, w * .16, h * .8); circle(ctx, 0, -h * .86, w * .5, '#2f3d48'); circle(ctx, 0, -h * .86, w * .42, '#f4f0e2');
    ctx.strokeStyle = '#2f3d48'; ctx.lineWidth = 3; const a = t * .1; ctx.beginPath(); ctx.moveTo(0, -h * .86); ctx.lineTo(Math.sin(a) * w * .3, -h * .86 - Math.cos(a) * w * .3); ctx.moveTo(0, -h * .86); ctx.lineTo(Math.sin(a / 12) * w * .2, -h * .86 - Math.cos(a / 12) * w * .2); ctx.stroke(); }
};

function drawProp(ctx, stage, p, t) {
  const s = C.depthScale(stage, p.y);
  ell(ctx, p.x, p.y, p.rx * 1.05, p.ry * 1.05, 'rgba(20,25,35,.18)');
  ctx.save(); ctx.translate(p.x, p.y + 4); (PROPS[p.kind] || PROPS.crates)(ctx, p.w * s, p.h * s, p.id, t); ctx.restore();
}

/* ---------- People ---------- */
function drawHat(ctx, hat, f) {
  if (hat === 'beanie') { ctx.fillStyle = '#d23f48'; ctx.beginPath(); ctx.arc(0, -61, 10.2, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#f4ede0'; rr(ctx, -10.8, -62.5, 21.6, 4.6, 2); ctx.fill(); circle(ctx, 0, -72.5, 3.6, '#f4ede0'); ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let k = -2; k <= 2; k++) ctx.fillRect(k * 3.6 - .6, -70, 1.2, 7.5); }
  else if (hat === 'cap') { ctx.fillStyle = '#2f5fa8'; ctx.beginPath(); ctx.arc(0, -61, 9.8, Math.PI, 0); ctx.fill(); ell(ctx, f * 9, -61, 8, 2.4, '#244c88'); circle(ctx, 0, -70.6, 1.6, '#244c88'); }
  else if (hat === 'straw') { ell(ctx, 0, -62, 17, 4, '#e3c37a'); ctx.fillStyle = '#e8cc87'; rr(ctx, -8.5, -71, 17, 10, 4); ctx.fill(); ctx.fillStyle = '#b8473f'; ctx.fillRect(-8.5, -64.5, 17, 2.6); }
  else if (hat === 'beret') { ell(ctx, f * 2, -67, 11.5, 5, '#24242a'); circle(ctx, f * 2, -72, 1.5, '#24242a'); }
  else if (hat === 'bowler') { ell(ctx, 0, -62, 13.5, 3, '#6b4630'); ctx.fillStyle = '#7b5238'; ctx.beginPath(); ctx.arc(0, -63, 8.6, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#3c2a1f'; ctx.fillRect(-8.6, -64.4, 17.2, 2); }
}
function drawTorso(ctx, top) {
  const base = TOP_COLORS[top];
  rr(ctx, -10, -52, 20, 26, 6); ctx.fillStyle = base; ctx.fill();
  ctx.save(); rr(ctx, -10, -52, 20, 26, 6); ctx.clip();
  if (top === 'stripe') { ctx.fillStyle = '#f6f0e4'; for (let y = -50; y < -26; y += 6) ctx.fillRect(-11, y, 22, 3); }
  if (top === 'check') { ctx.strokeStyle = 'rgba(40,20,10,.45)'; ctx.lineWidth = 1.4; for (let k = -12; k <= 12; k += 5) { ctx.beginPath(); ctx.moveTo(k, -53); ctx.lineTo(k, -25); ctx.moveTo(-11, -52 + (k + 12)); ctx.lineTo(11, -52 + (k + 12)); ctx.stroke(); } }
  ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fillRect(4, -53, 7, 28); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(-10, -53, 3, 28);
  ctx.restore();
}
function drawPerson(ctx, stage, p, t, opt = {}) {
  const s = C.depthScale(stage, p.y) * p.build, f = p.facing || 1, walking = (p.state === 'walk' || p.state === 'flee') && !p.dead;
  const swing = walking ? Math.sin(p.stride) : 0, bob = walking ? -Math.abs(Math.cos(p.stride)) * 1.6 : Math.sin(t * 1.7 + p.phase) * .4;
  const top = TOP_COLORS[p.look.top];
  ell(ctx, p.x, p.y + 1, 15 * s * (1 + p.fall * 1.4), 4 * s, 'rgba(20,25,35,.24)');
  ctx.save(); ctx.translate(p.x, p.y); ctx.scale(s, s);
  if (p.dead) { const k = 1 - Math.pow(1 - p.fall, 3); ctx.rotate(k * 1.45 * p.fallDir); ctx.translate(0, -k * 3); }
  else if (p.state === 'flee') ctx.rotate(.09 * f);
  ctx.translate(0, bob);
  // balloon string goes behind the body
  const hand = { x: 13 * f, y: -34 };
  if (p.look.item === 'balloon' && !p.dead) { const bx = 16 * f + Math.sin(t * 1.3 + p.phase) * 4, by = -118; ctx.strokeStyle = 'rgba(80,80,80,.8)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.quadraticCurveTo(hand.x + 6, -80, bx, by + 13); ctx.stroke(); ell(ctx, bx, by, 10, 13, '#e0363f'); ell(ctx, bx - 3.5, by - 4, 2.6, 4, 'rgba(255,255,255,.55)'); poly(ctx, [[bx - 2, by + 13], [bx + 2, by + 13], [bx, by + 16]], '#c22c35'); }
  if (p.look.item === 'backpack') { rr(ctx, -f * 15 - 7, -52, 13, 22, 4); ctx.fillStyle = '#4c8a46'; ctx.fill(); ctx.fillStyle = '#3c6f37'; ctx.fillRect(-f * 15 - 6, -40, 11, 4); }
  // legs
  const leg = (dx, a) => { ctx.save(); ctx.translate(dx, -27); ctx.rotate(a); rr(ctx, -3.6, 0, 7.2, 25, 3); ctx.fillStyle = p.pants; ctx.fill(); ell(ctx, 1.5 * f, 25.5, 5.4, 2.8, '#2a2523'); ctx.restore(); };
  leg(-4, swing * .45); leg(4, -swing * .45);
  // back arm
  const arm = (side, a, front) => { ctx.save(); ctx.translate(side * 9, -48); ctx.rotate(a); rr(ctx, -3.2, 0, 6.4, 18, 3); ctx.fillStyle = front ? top : shade(top, .82); ctx.fill(); if (p.look.top === 'stripe') { ctx.fillStyle = front ? '#f6f0e4' : '#d9d2c4'; ctx.fillRect(-3.2, 5, 6.4, 2.4); ctx.fillRect(-3.2, 11, 6.4, 2.4); } circle(ctx, 0, 19, 3.2, p.skin); ctx.restore(); };
  const fleeing = p.state === 'flee' && !p.dead, idle = p.state === 'idle' && !p.dead;
  let backA = -swing * .5, frontA = swing * .5;
  if (fleeing) { backA = 2.6; frontA = -2.6; }
  else if (idle && p.action === 'wave') frontA = -2.7 * f + Math.sin(t * 7 + p.phase) * .25;
  else if (idle && p.action === 'phone') frontA = -2.5 * f;
  else if (idle && p.action === 'chat') frontA = -.7 * f + Math.sin(t * 3 + p.phase) * .3;
  arm(-f, backA * f, false);
  drawTorso(ctx, p.look.top);
  // items on the body
  if (p.look.item === 'bag') { ctx.strokeStyle = '#1d1d22'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8 * f, -51); ctx.lineTo(9 * f, -30); ctx.stroke(); rr(ctx, 6 * f - 6, -32, 13, 11, 2); ctx.fillStyle = '#1f2026'; ctx.fill(); ctx.fillStyle = '#9aa0a6'; ctx.fillRect(6 * f - 1, -29, 3, 2); }
  if (p.look.item === 'camera') { ctx.strokeStyle = '#2b2b30'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, -52); ctx.lineTo(0, -42); ctx.lineTo(6, -52); ctx.stroke(); rr(ctx, -6, -44, 12, 8, 2); ctx.fillStyle = '#2b2b30'; ctx.fill(); circle(ctx, 0, -40, 2.6, '#7fa7c4'); circle(ctx, 0, -40, 1.2, '#203040'); }
  if (p.look.item === 'backpack') { ctx.fillStyle = '#3c6f37'; ctx.fillRect(-f * 7 - 1.5, -52, 3, 20); }
  // head
  circle(ctx, 0, -58, 9.4, p.skin);
  ctx.fillStyle = p.hair; ctx.beginPath(); ctx.arc(-f * 1.2, -60, 9.6, Math.PI * .95, Math.PI * 2.05); ctx.fill(); circle(ctx, -f * 8, -57, 3, p.hair);
  circle(ctx, -f * 7.6, -57, 2.2, shade(p.skin.length === 7 ? p.skin : '#e3b48f', .9));
  if (!p.dead) {
    const blink = ((t * .29 + p.phase * .37) % 1) < .03, ex = f * 2.6;
    if (blink) { ctx.fillStyle = '#2b2522'; ctx.fillRect(ex - 3.6, -59, 2.8, .9); ctx.fillRect(ex + 1, -59, 2.8, .9); }
    else { circle(ctx, ex - 2.2, -58.6, 1.15, '#2b2522'); circle(ctx, ex + 2.4, -58.6, 1.15, '#2b2522'); }
    ctx.fillStyle = 'rgba(230,120,110,.35)'; circle(ctx, ex - 3.2, -55.2, 1.6, 'rgba(230,120,110,.3)'); circle(ctx, ex + 3.6, -55.2, 1.6, 'rgba(230,120,110,.3)');
    if (fleeing) circle(ctx, ex + .2, -53.4, 1.6, '#6b2f2a'); else { ctx.strokeStyle = '#8a4c40'; ctx.lineWidth = .9; ctx.beginPath(); ctx.arc(ex + .2, -55.4, 2.1, .2 * Math.PI, .8 * Math.PI); ctx.stroke(); }
  }
  if (p.look.glasses === 'round') { ctx.strokeStyle = '#26242a'; ctx.lineWidth = 1; const ex = f * 2.6; ctx.beginPath(); ctx.arc(ex - 2.2, -58.6, 2.9, 0, Math.PI * 2); ctx.moveTo(ex + 5.3, -58.6); ctx.arc(ex + 2.4, -58.6, 2.9, 0, Math.PI * 2); ctx.moveTo(ex + .7, -58.8); ctx.lineTo(ex - .5, -58.8); ctx.stroke(); }
  if (p.look.glasses === 'sun') { const ex = f * 2.6; ctx.fillStyle = '#1c1c22'; rr(ctx, ex - 5.4, -60.6, 5.2, 3.8, 1.4); ctx.fill(); rr(ctx, ex + .2, -60.6, 5.2, 3.8, 1.4); ctx.fill(); ctx.fillRect(ex - .4, -59.6, 1, 1); }
  if (p.look.item === 'scarfY' || p.look.item === 'scarfB') { const c = p.look.item === 'scarfY' ? '#f2c230' : '#3a8ad6'; rr(ctx, -9, -51.5, 18, 5, 2.4); ctx.fillStyle = c; ctx.fill(); rr(ctx, f * 3, -48, 5, 12, 2); ctx.fillStyle = shade(c.replace('#', '').length ? c : '#f2c230', .9); ctx.fill(); }
  drawHat(ctx, p.look.hat, f);
  arm(f, frontA * f, true);
  if (idle && p.action === 'phone') { rr(ctx, f * 8, -62, 4, 7, 1); ctx.fillStyle = '#26303a'; ctx.fill(); }
  ctx.restore();
  // alarm mark above startled people
  if (!p.dead && p.alarm > 0 && !opt.noMarks) {
    const y = p.y - 92 * s, a = Math.min(1, p.alarm * 2);
    ctx.globalAlpha = a; rr(ctx, p.x - 3.5 * s, y, 7 * s, 13 * s, 2 * s); ctx.fillStyle = '#ffcf4a'; ctx.fill(); circle(ctx, p.x, y + 17 * s, 2.6 * s, '#ffcf4a'); ctx.globalAlpha = 1;
  }
}

/* ---------- Animated ambience drawn over the static background ---------- */
function drawAmbient(ctx, stage, t, reduced) {
  if (reduced) return;
  const id = stage.loc.id, H = stage.horizon;
  if (id === 'harbor' || id === 'pier') {
    for (let i = 0; i < 5; i++) { const x = ((i * 337 + t * (24 + i * 5)) % 1800) - 100, y = 110 + i * 22 + Math.sin(t * 1.4 + i) * 8, w = Math.sin(t * 8 + i * 2) * 5; ctx.strokeStyle = '#3a4650'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 9, y - w); ctx.quadraticCurveTo(x - 4, y - 4, x, y); ctx.quadraticCurveTo(x + 4, y - 4, x + 9, y - w); ctx.stroke(); }
    for (let i = 0; i < 16; i++) { const a = Math.max(0, Math.sin(t * 2 + i * 1.7)); ctx.fillStyle = `rgba(255,250,225,${.6 * a})`; ctx.fillRect((i * 97 + 30) % 1600, 225 + (i * 41) % (H - 240), 14, 2); }
  }
  if (id === 'festival') {
    for (let i = 0; i < 3; i++) { const P = 4.4, c = (t + i * 1.5) % P, k = c / 1.4; if (k > 1) continue; const cx = 220 + i * 420 + (Math.floor((t + i * 1.5) / P) * 173) % 240, cy = 70 + i * 30, col = ['#ffcf6b', '#f59ad6', '#8fe3ff'][i];
      ctx.globalAlpha = 1 - k; for (let j = 0; j < 18; j++) { const a = j * Math.PI / 9, r = 8 + k * 70; circle(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r + k * k * 18, 2.6, col); } ctx.globalAlpha = 1; }
    for (let row = 0; row < 2; row++) for (let i = 0; i < 30; i++) { const x = i * 55 + row * 26, y = 40 + row * 70 + Math.sin(x / 1600 * Math.PI) * 50; circle(ctx, x, y, 5, `rgba(255,${200 + (i % 3) * 20},140,${.55 + Math.sin(t * 3 + i + row) * .3})`); }
  }
  if (id === 'snow') { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 90; i++) { const x = (i * 173 + t * (14 + i % 5 * 4) + Math.sin(t + i) * 10) % 1600, y = (i * 97 + t * (40 + i % 7 * 6)) % 900; ctx.beginPath(); ctx.arc(x, y, 1.4 + (i % 3) * .8, 0, Math.PI * 2); ctx.fill(); } }
  if (id === 'garden') for (let i = 0; i < 8; i++) { const x = 100 + ((i * 213 + t * 18) % 1400), y = H + 40 + (i * 77) % 300 + Math.sin(t * 2 + i) * 20, w = 3 + Math.abs(Math.sin(t * 12 + i)) * 5; ell(ctx, x - w / 2, y, w, 4, ['#f1a6b7', '#f6dc7a', '#c7b2ec'][i % 3]); ell(ctx, x + w / 2, y, w, 4, ['#f1a6b7', '#f6dc7a', '#c7b2ec'][i % 3]); }
  if (id === 'station') { for (let k = 0; k < 6; k++) { const on = Math.sin(t * 1.6 + k) > -.2; ctx.fillStyle = on ? '#ffcf6a' : 'rgba(255,207,106,.25)'; ctx.fillRect(668 + (k % 3) * 70, 304 - 10, 50, 5); } }
}
// Light and haze over the whole scene (in front of people) for depth.
function drawAtmosphere(ctx, stage) {
  const id = stage.loc.id, H = stage.horizon;
  ctx.fillStyle = vgrad(ctx, H - 20, H + 140, [[0, 'rgba(255,255,255,.18)'], [1, 'rgba(255,255,255,0)']]); ctx.fillRect(0, H - 20, 1600, 160);
  const tint = { festival: 'rgba(40,20,90,.16)', pier: 'rgba(255,140,80,.08)', snow: 'rgba(170,210,255,.08)', station: 'rgba(255,230,180,.05)' }[id];
  if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, 1600, 900); }
  if (id === 'festival') for (const p of stage.props) if (p.kind === 'lantern' || p.kind === 'tent') { const g = ctx.createRadialGradient(p.x, p.y - 30, 10, p.x, p.y - 30, 220); g.addColorStop(0, 'rgba(255,190,110,.22)'); g.addColorStop(1, 'rgba(255,190,110,0)'); ctx.fillStyle = g; ctx.fillRect(p.x - 230, p.y - 260, 460, 460); }
}

function drawBackground(ctx, stage) { (SCENES[stage.loc.id] || SCENES.harbor)(ctx, stage); }

// Props and people in depth order, culled to the visible world rectangle.
function drawWorld(ctx, stage, t, view, opt = {}) {
  const items = [];
  for (const p of stage.props) if (!view || (p.x + p.w > view.x0 && p.x - p.w < view.x1 && p.y > view.y0 && p.y - p.h * 1.2 < view.y1)) items.push([p.y, 0, p]);
  for (const p of stage.people) if (!view || (p.x + 60 > view.x0 && p.x - 60 < view.x1 && p.y + 10 > view.y0 && p.y - 130 < view.y1)) items.push([p.y, 1, p]);
  items.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, kind, obj] of items) kind ? drawPerson(ctx, stage, obj, t, opt) : drawProp(ctx, stage, obj, t);
}

// Wanted poster portrait: the target drawn large, facing the viewer.
function drawPoster(ctx, w, h, look) {
  ctx.fillStyle = '#efe2c2'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(120,90,50,.15)'; for (let i = 0; i < 40; i++) ctx.fillRect(hash(i) * w, hash(i + 9) * h, 2 + hash(i + 3) * 6, 1);
  ctx.strokeStyle = '#8a6a42'; ctx.lineWidth = 3; ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.fillStyle = '#4a2f1c'; ctx.font = `900 ${Math.round(w * .13)}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('WANTED', w / 2, h * .16);
  ctx.fillStyle = '#d7c7a2'; ctx.fillRect(w * .14, h * .22, w * .72, h * .62);
  const fake = { look, skin: '#f1d2b6', hair: '#5a3a22', pants: '#2e3d5c', build: 1, x: 0, y: 900, facing: 1, state: 'idle', action: 'look', phase: 0, stride: 0, fall: 0, dead: false, alarm: 0 };
  const stage = { horizon: 0 };
  ctx.save(); ctx.beginPath(); ctx.rect(w * .14, h * .22, w * .72, h * .62); ctx.clip(); ctx.translate(w / 2, h * .82); const k = h * .62 * .86 / 96; ctx.scale(k, k); ctx.translate(0, -900);
  drawPerson(ctx, stage, fake, 0, { noMarks: true }); ctx.restore();
  ctx.fillStyle = '#4a2f1c'; ctx.font = `800 ${Math.round(w * .085)}px system-ui, sans-serif`; ctx.fillText('윌리', w / 2, h * .93);
}

root.SniperArt = { drawBackground, drawAmbient, drawAtmosphere, drawWorld, drawPerson, drawProp, drawPoster, TOP_COLORS };
})(typeof globalThis !== 'undefined' ? globalThis : this);
