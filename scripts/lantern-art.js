// Lantern Keeper art: cached sprites (enemies, glows, ground texture) drawn once into offscreen canvases.
// The game (scripts/lantern-keeper.js) only blits them, so hundreds of shadows stay cheap to draw.
(function (root) {
  const TAU = Math.PI * 2, SS = 2; // sprites are supersampled 2x
  const cache = new Map();
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  function rnd(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; }

  // ---------- Soft round glow (white core fading out), tinted per colour ----------
  function glowSprite(color) {
    const key = 'g' + color;
    if (cache.has(key)) return cache.get(key);
    const c = canvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, color); gr.addColorStop(.35, color.length === 7 ? color + '88' : color); gr.addColorStop(1, 'transparent');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); cache.set(key, c); return c;
  }
  // Light stamp for the darkness map: opaque centre, smooth falloff.
  let lightStamp = null;
  function light() {
    if (lightStamp) return lightStamp;
    const c = canvas(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.45, 'rgba(0,0,0,.75)'); gr.addColorStop(.75, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return (lightStamp = c);
  }

  // ---------- Forest floor texture (tiles seamlessly every 256 world units) ----------
  let groundCv = null;
  function ground() {
    if (groundCv) return groundCv;
    const N = 256, c = canvas(N, N), g = c.getContext('2d'), r = rnd(91);
    g.fillStyle = '#14221c'; g.fillRect(0, 0, N, N);
    const blot = (x, y, rad, col) => { for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2); } };
    for (let i = 0; i < 14; i++) blot(r() * N, r() * N, 30 + r() * 50, r() < .5 ? 'rgba(30,52,38,.55)' : 'rgba(10,18,15,.5)');
    for (let i = 0; i < 6; i++) blot(r() * N, r() * N, 20 + r() * 30, 'rgba(48,40,26,.35)'); // bare soil
    for (let i = 0; i < 900; i++) { g.fillStyle = r() < .5 ? 'rgba(60,90,62,.25)' : 'rgba(0,0,0,.18)'; g.fillRect(r() * N, r() * N, 1, 1); }
    return (groundCv = c);
  }

  // ---------- Enemy sprites: frames per type, plus a white "hit" variant ----------
  const FRAMES = { moth: 6, bat: 6, vine: 4, wisp: 6, golem: 2 };
  function enemySprite(type, r, frame, flash) {
    const n = FRAMES[type] || 1, f = ((frame % n) + n) % n, key = `${type}|${r}|${f}|${flash ? 1 : 0}`;
    if (cache.has(key)) return cache.get(key);
    const size = (r * 4.2 + 10), c = canvas(size * SS, size * SS), g = c.getContext('2d');
    g.scale(SS, SS); g.translate(size / 2, size / 2);
    const ph = f / n * TAU;
    (DRAW[type] || DRAW.moth)(g, r, ph);
    if (flash) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(255,250,235,.85)'; g.fillRect(-size, -size, size * 2, size * 2); }
    const out = { img: c, size };
    cache.set(key, out); return out;
  }
  const grad = (g, x0, y0, r0, x1, y1, r1, stops) => { const gr = g.createRadialGradient(x0, y0, r0, x1, y1, r1); stops.forEach(([o, col]) => gr.addColorStop(o, col)); return gr; };
  const DRAW = {
    moth(g, r, ph) {
      const flap = .3 + .7 * (.5 + .5 * Math.cos(ph));
      for (const s of [-1, 1]) {
        g.save(); g.scale(s, 1);
        // fore wing
        g.fillStyle = grad(g, r * .3, -r * .2, 1, r * .9, -r * .6, r * 1.6, [[0, '#4a3a8e'], [.55, '#8f7ae0'], [1, '#d4c6ff']]);
        g.beginPath(); g.moveTo(r * .15, -r * .15); g.bezierCurveTo(r * .5, -r * 1.7 * flap, r * 1.7, -r * 1.6 * flap, r * 1.45, -r * .1); g.quadraticCurveTo(r * .9, r * .25, r * .15, r * .1); g.fill();
        g.strokeStyle = 'rgba(40,24,80,.6)'; g.lineWidth = .8; g.beginPath(); g.moveTo(r * .2, -r * .1); g.quadraticCurveTo(r * .8, -r * .9 * flap, r * 1.3, -r * .5 * flap); g.stroke();
        // hind wing
        g.fillStyle = grad(g, r * .3, r * .3, 1, r * .6, r * .5, r * 1.1, [[0, '#2c2056'], [1, '#7461d8']]);
        g.beginPath(); g.moveTo(r * .15, r * .1); g.quadraticCurveTo(r * 1.3, r * (.4 + .5 * flap), r * .7, r * 1.05); g.quadraticCurveTo(r * .3, r * .8, r * .1, r * .3); g.fill();
        // eye spot
        g.fillStyle = 'rgba(255,236,190,.8)'; g.beginPath(); g.ellipse(r * .95, -r * .7 * flap, r * .22, r * .18 * Math.max(.4, flap), 0, 0, TAU); g.fill();
        g.fillStyle = '#1a1236'; g.beginPath(); g.arc(r * .95, -r * .7 * flap, r * .1, 0, TAU); g.fill();
        // antenna
        g.strokeStyle = '#2a1f4a'; g.lineWidth = 1; g.beginPath(); g.moveTo(r * .1, -r * .7); g.quadraticCurveTo(r * .4, -r * 1.3, r * .6, -r * 1.25); g.stroke();
        g.restore();
      }
      g.fillStyle = grad(g, -r * .1, -r * .3, 1, 0, 0, r * .9, [[0, '#4a3a7a'], [1, '#160f2c']]);
      g.beginPath(); g.ellipse(0, 0, r * .32, r * .85, 0, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = .8; for (let i = -1; i <= 1; i++) { g.beginPath(); g.moveTo(-r * .25, i * r * .3); g.lineTo(r * .25, i * r * .3); g.stroke(); }
    },
    bat(g, r, ph) {
      const flap = Math.cos(ph);
      for (const s of [-1, 1]) {
        g.save(); g.scale(s, 1);
        const tipY = -r * (.2 + .9 * flap), midY = -r * (.1 + .45 * flap);
        g.fillStyle = grad(g, r * .4, 0, 1, r, -r * .2, r * 1.9, [[0, '#4a2a6a'], [1, '#8e4fd0']]);
        g.beginPath(); g.moveTo(r * .2, -r * .2); g.lineTo(r * .9, midY - r * .2); g.lineTo(r * 1.9, tipY);
        g.quadraticCurveTo(r * 1.6, r * .25, r * 1.3, r * .2); g.quadraticCurveTo(r * 1.05, r * .5, r * .8, r * .35); g.quadraticCurveTo(r * .55, r * .55, r * .25, r * .3); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(20,8,34,.7)'; g.lineWidth = .9; g.beginPath(); g.moveTo(r * .9, midY - r * .2); g.lineTo(r * 1.3, r * .2); g.moveTo(r * .9, midY - r * .2); g.lineTo(r * .8, r * .35); g.stroke();
        g.fillStyle = '#2a1640'; g.beginPath(); g.moveTo(r * .12, -r * .45); g.lineTo(r * .4, -r * 1.05); g.lineTo(r * .42, -r * .35); g.fill();
        g.restore();
      }
      g.fillStyle = grad(g, 0, -r * .2, 1, 0, 0, r * .7, [[0, '#4c2c66'], [1, '#1c0f2c']]);
      g.beginPath(); g.ellipse(0, 0, r * .45, r * .62, 0, 0, TAU); g.fill();
    },
    vine(g, r, ph) {
      const sway = Math.sin(ph) * .12;
      g.strokeStyle = '#1f4a30'; g.lineWidth = r * .22; g.lineCap = 'round';
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + sway; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Math.cos(a + .5) * r * .9, Math.sin(a + .5) * r * .9, Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35); g.stroke(); }
      g.fillStyle = '#3f8f5c';
      for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + sway + .35; g.save(); g.translate(Math.cos(a) * r * 1.05, Math.sin(a) * r * 1.05); g.rotate(a); g.beginPath(); g.ellipse(0, 0, r * .32, r * .14, 0, 0, TAU); g.fill(); g.restore(); }
      g.fillStyle = grad(g, -r * .3, -r * .35, 1, 0, 0, r, [[0, '#6cc58a'], [.55, '#2f7a4e'], [1, '#163a26']]);
      g.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, rr = i % 2 ? r * .78 : r * .95; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } g.closePath(); g.fill();
      g.fillStyle = '#d9f2c4'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + .2; g.beginPath(); g.moveTo(Math.cos(a) * r * .9, Math.sin(a) * r * .9); g.lineTo(Math.cos(a) * r * 1.15, Math.sin(a) * r * 1.15); g.lineTo(Math.cos(a + .12) * r * .9, Math.sin(a + .12) * r * .9); g.fill(); }
      g.fillStyle = '#10261a'; g.beginPath(); g.ellipse(0, r * .05, r * .42, r * .3, 0, 0, TAU); g.fill();
    },
    wisp(g, r, ph) {
      const body = new Path2D();
      body.moveTo(-r, 0); body.bezierCurveTo(-r, -r * 1.5, r, -r * 1.5, r, 0);
      for (let i = 0; i <= 4; i++) { const x = r - i * r / 2, y = r * (i % 2 ? .55 : 1.25) + Math.sin(ph + i * 1.3) * r * .18; body.quadraticCurveTo(x + r * .25, y - r * .3, x, y); }
      body.closePath();
      g.fillStyle = grad(g, 0, -r * .5, 1, 0, 0, r * 1.6, [[0, 'rgba(230,250,255,.95)'], [.45, 'rgba(130,200,255,.75)'], [1, 'rgba(60,80,200,.15)']]);
      g.fill(body);
      g.strokeStyle = 'rgba(200,240,255,.5)'; g.lineWidth = 1; g.stroke(body);
      g.fillStyle = 'rgba(20,30,70,.85)'; g.beginPath(); g.ellipse(0, r * .25, r * .22, r * .3 + Math.sin(ph) * r * .06, 0, 0, TAU); g.fill();
    },
    golem(g, r, ph) {
      const lift = Math.sin(ph) * r * .04;
      g.fillStyle = grad(g, -r * .4, -r * .6, 1, 0, 0, r * 1.4, [[0, '#a7ad95'], [.6, '#6b725e'], [1, '#3a3f33']]);
      g.beginPath(); g.moveTo(-r, r * .9); g.lineTo(-r * 1.05, -r * .2); g.quadraticCurveTo(-r * .9, -r * .95 + lift, -r * .1, -r * 1.02 + lift); g.quadraticCurveTo(r * .9, -r * 1 + lift, r * 1.02, -r * .15); g.lineTo(r * .95, r * .9); g.closePath(); g.fill();
      // fists
      g.fillStyle = '#585e4c'; g.beginPath(); g.arc(-r * 1.1, r * .55, r * .32, 0, TAU); g.arc(r * 1.1, r * .55, r * .32, 0, TAU); g.fill();
      // moss cap
      g.fillStyle = grad(g, 0, -r, 1, 0, -r * .8, r, [[0, '#8fcf6a'], [1, '#3d6e30']]);
      g.beginPath(); g.moveTo(-r * .95, -r * .45); g.quadraticCurveTo(-r * .8, -r * 1.15 + lift, 0, -r * 1.12 + lift); g.quadraticCurveTo(r * .85, -r * 1.12 + lift, r * .98, -r * .4);
      for (let i = 0; i <= 6; i++) g.lineTo(r * .98 - i * r * 1.93 / 6, -r * (.4 + (i % 2) * .2));
      g.fill();
      // cracks and rune
      g.strokeStyle = 'rgba(25,28,22,.7)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-r * .5, r * .1); g.lineTo(-r * .2, r * .45); g.lineTo(-r * .35, r * .8); g.moveTo(r * .55, -r * .1); g.lineTo(r * .35, r * .3); g.stroke();
      g.strokeStyle = 'rgba(140,255,190,.75)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-r * .2, r * .35); g.lineTo(0, r * .1); g.lineTo(r * .2, r * .35); g.moveTo(0, r * .1); g.lineTo(0, r * .7); g.stroke();
    }
  };

  // ---------- Gem sprite ----------
  function gemSprite(color, r) {
    const key = `gem|${color}|${r}`;
    if (cache.has(key)) return cache.get(key);
    const size = r * 2.6 + 4, c = canvas(size * SS, size * SS), g = c.getContext('2d');
    g.scale(SS, SS); g.translate(size / 2, size / 2);
    g.fillStyle = color; g.beginPath(); g.moveTo(0, -r * 1.15); g.lineTo(r * .8, -r * .1); g.lineTo(0, r * 1.15); g.lineTo(-r * .8, -r * .1); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(0, -r * 1.15); g.lineTo(r * .8, -r * .1); g.lineTo(0, -r * .05); g.closePath(); g.fill();
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.moveTo(0, r * 1.15); g.lineTo(-r * .8, -r * .1); g.lineTo(0, -r * .05); g.closePath(); g.fill();
    const out = { img: c, size }; cache.set(key, out); return out;
  }

  root.LanternArt = { glowSprite, light, ground, enemySprite, gemSprite, FRAMES, rnd };
})(window);
