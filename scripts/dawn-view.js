/* 새벽의 요새 — 화면. 규칙 엔진의 상태를 Canvas 2D로 그립니다. 게임 규칙은 건드리지 않습니다. */
(function (root) {
  'use strict';
  const D = root.Dawn, Art = root.DawnArt, TAU = Math.PI * 2, { circle, ellipse, poly, rounded, linear, radial } = Art.helpers, { alpha, tone } = Art;
  const WALK = [0, 1, 0, 2], clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = k => 1 - Math.pow(1 - k, 3);
  const hash = n => { const x = Math.sin(n * 127.1) * 43758.5453; return x - Math.floor(x); };

  class View {
    constructor(canvas) { this.canvas = canvas; this.g = canvas.getContext('2d'); this.clock = 0; this.reduced = false; this.game = null; this.reset(); this.resize(); }
    reset() { this.particles = []; this.seen = 0; this.theme = null; this.previousTheme = null; this.blend = 1; this.banner = null; this.shake = 0; this.whiteout = 0; }
    resize() {
      const rect = this.canvas.getBoundingClientRect(), dpr = Math.min(2, root.devicePixelRatio || 1), size = clamp(Math.round((rect.width || 720) * dpr), 240, 1440);
      if (this.canvas.width !== size || this.canvas.height !== size) { this.canvas.width = size; this.canvas.height = size; }
      this.scale = size / D.SIZE;
    }
    toBoard(clientX, clientY) { const rect = this.canvas.getBoundingClientRect(); return { x: (clientX - rect.left) / rect.width * D.SIZE, y: (clientY - rect.top) / rect.height * D.SIZE }; }
    cellAt(x, y) { for (let i = 0; i < D.CELLS.length; i++) if (Math.abs(D.CELLS[i].x - x) <= 56 && Math.abs(D.CELLS[i].y - y) <= 56) return i; return -1; }

    spark(x, y, color, count, speed = 120, life = .5, size = 2.4, gravity = 0) {
      if (this.reduced) return;
      for (let i = 0; i < count && this.particles.length < 280; i++) { const a = Math.random() * TAU, v = speed * (.35 + Math.random() * .65), l = life * (.6 + Math.random() * .4); this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: l, max: l, size: size * (.6 + Math.random() * .8), color, gravity }); }
    }
    intake(game) {
      if (this.game !== game) { this.game = game; this.reset(); this.seen = game.nextFx; }
      for (const f of game.effects) {
        if (f.id <= this.seen) continue;
        if (f.kind === 'death') this.spark(f.x, f.y, '#ffd9a0', 7, 110, .45);
        else if (f.kind === 'bossDeath') { this.spark(f.x, f.y, '#e3b6ff', 46, 260, .9, 3.4); this.shake = .45; }
        else if (f.kind === 'merge') this.spark(f.x, f.y, D.TIERS[f.tier - 1].color, 18, 170, .6, 2.8);
        else if (f.kind === 'summon') this.spark(f.x, f.y, D.TIERS[f.tier - 1].color, 8, 90, .45);
        else if (f.kind === 'blast') this.spark(f.x, f.y, '#ffcf8a', 9, 150, .4, 2.6, 160);
        else if (f.kind === 'leak') { this.shake = .3; this.spark(f.x, f.y, '#ff6f7d', 14, 150, .5); }
        else if (f.kind === 'flash') this.whiteout = .5;
        else if (f.kind === 'amplify') this.spark(360, 360, '#ffd08a', 30, 320, .8, 3);
        else if (f.kind === 'wave') { const boss = D.bossOf(f.value), changed = D.themeOf(f.value) !== D.themeOf(f.value - 1); this.banner = { title: 'WAVE ' + f.value, sub: boss ? boss.name + ' 출현' : changed ? D.THEME_NAMES[D.themeOf(f.value)] : '', boss: !!boss, life: 2.2, max: 2.2 }; }
      }
      this.seen = game.nextFx;
    }

    // ui: { selected, drag: { from, x, y, over }, hints, paused }
    draw(game, ui, dt) {
      const g = this.g, s = this.scale; this.clock += dt; this.intake(game);
      if (this.theme !== game.theme) { this.previousTheme = this.theme; this.theme = game.theme; this.blend = this.previousTheme ? 0 : 1; }
      this.blend = Math.min(1, this.blend + dt / .9); this.shake = Math.max(0, this.shake - dt); this.whiteout = Math.max(0, this.whiteout - dt);
      g.setTransform(s, 0, 0, s, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      if (this.shake > 0 && !this.reduced) g.translate((Math.random() - .5) * this.shake * 14, (Math.random() - .5) * this.shake * 14);
      if (this.blend < 1 && this.previousTheme) g.drawImage(Art.background(this.previousTheme), 0, 0, 720, 720);
      g.globalAlpha = this.blend; g.drawImage(Art.background(this.theme), 0, 0, 720, 720); g.globalAlpha = 1;
      const P = Art.PALETTES[this.theme];
      this.portal(g, game); this.core(g, game, P); this.sockets(g, game, ui);
      this.groundEffects(g, game);
      const enemies = game.enemies.slice().sort((a, b) => a.y - b.y); for (const e of enemies) this.enemy(g, game, e);
      game.cells.forEach((cell, i) => { if (cell.tower) this.tower(g, game, cell, i, ui); });
      this.shots(g, game); this.airEffects(g, game); this.drawParticles(g, dt); this.overlay(g, game, ui, P);
      if (this.banner) { this.banner.life -= dt; if (this.banner.life <= 0) this.banner = null; else this.drawBanner(g, this.banner); }
    }

    portal(g, game) {
      const [x, y] = D.TRACK[0], t = this.clock, boss = !!game.boss && game.state !== 'idle', col = boss ? '#ff6f9d' : '#b58cff';
      g.save(); g.translate(x, y);
      g.fillStyle = radial(g, 0, 0, 27, ['#05030a', '#1b0f33', alpha(col, .55)]); circle(g, 0, 0, 27); g.fill();
      g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const a = t * (1.2 + i * .5) + i * 2.1, r = 12 + i * 6; g.strokeStyle = alpha(col, .75 - i * .15); g.lineWidth = 3 - i * .6; g.beginPath(); g.arc(0, 0, r, a, a + 2.2); g.stroke(); g.beginPath(); g.arc(0, 0, r, a + Math.PI, a + Math.PI + 1.3); g.stroke(); }
      g.globalAlpha = .5 + .15 * Math.sin(t * 3); g.drawImage(Art.glow(col), -52, -52, 104, 104);
      g.restore();
    }
    core(g, game, P) {
      const { x, y } = D.CORE, t = this.clock, ratio = game.core / D.CORE_MAX, hurt = game.coreHit > 0, col = ratio > .5 ? '#ffe7a8' : ratio > .25 ? '#ffb46a' : '#ff6f6f', bob = Math.sin(t * 2) * 2.5;
      g.save(); g.translate(x, y);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = (.55 + .2 * Math.sin(t * (ratio > .25 ? 2.4 : 7))) * (.5 + ratio * .5); g.drawImage(Art.glow(col), -62, -62, 124, 124); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(0,0,0,.35)'; ellipse(g, 0, 16, 13, 5); g.fill();
      g.translate(0, bob - 4);
      g.fillStyle = linear(g, -14, -22, 14, 22, ['#ffffff', col, tone(col, -.45)]); poly(g, [0, -24, 14, -6, 0, 20, -14, -6]); g.fill(); g.strokeStyle = '#3a2a14'; g.lineWidth = 1.6; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)'; poly(g, [0, -24, -14, -6, 0, -2]); g.fill(); g.fillStyle = 'rgba(0,0,0,.14)'; poly(g, [0, -2, 14, -6, 0, 20]); g.fill();
      if (hurt) { g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,90,90,.7)'; poly(g, [0, -24, 14, -6, 0, 20, -14, -6]); g.fill(); }
      g.restore();
      // 내구도 고리
      g.save(); g.translate(x, y); g.lineCap = 'round'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 5; circle(g, 0, 0, 30); g.stroke();
      g.strokeStyle = ratio > .5 ? '#8fe7c8' : ratio > .25 ? '#ffc56e' : '#ff6f7d'; g.lineWidth = 3.4; g.beginPath(); g.arc(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + TAU * ratio); g.stroke(); g.restore();
    }
    sockets(g, game, ui) {
      const t = this.clock, drag = ui.drag;
      if (ui.hints && game.state === 'running' && !drag) {
        const groups = new Map(); game.cells.forEach((c, i) => { if (c.tower && c.tower.tier < D.MAX_TIER) { const key = c.tower.type + c.tower.tier; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(i); } });
        for (const list of groups.values()) if (list.length > 1) for (const i of list) { const c = game.cells[i], col = D.TIERS[c.tower.tier - 1].color, pulse = .45 + .3 * Math.sin(t * 4); g.strokeStyle = alpha(col, pulse); g.lineWidth = 2.5; rounded(g, c.x - 47, c.y - 47, 94, 94, 18); g.stroke(); }
      }
      if (drag) {
        game.cells.forEach((c, i) => {
          if (i === drag.from) return; const merge = game.canMerge(drag.from, i), over = drag.over === i;
          if (merge) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = (over ? .8 : .35) + .15 * Math.sin(t * 6); g.drawImage(Art.glow('#ffe08a'), c.x - 66, c.y - 66, 132, 132); g.restore(); g.strokeStyle = '#ffe08a'; g.lineWidth = over ? 4 : 2.5; rounded(g, c.x - 47, c.y - 47, 94, 94, 18); g.stroke(); }
          else if (over) { g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.5; rounded(g, c.x - 47, c.y - 47, 94, 94, 18); g.stroke(); }
        });
      } else if (ui.selected >= 0 && game.cells[ui.selected]?.tower) { const c = game.cells[ui.selected]; g.strokeStyle = '#ffffff'; g.lineWidth = 3; rounded(g, c.x - 47, c.y - 47, 94, 94, 18); g.stroke(); }
    }

    tower(g, game, cell, index, ui) {
      const t = cell.tower, art = Art.tower(t.type, t.tier), tc = D.TIERS[t.tier - 1].color, now = this.clock, dragged = ui.drag && ui.drag.from === index;
      const pop = clamp((game.time - t.born) / .28, 0, 1), back = pop - 1, scale = pop < 1 ? .6 + .4 * (1 + 2.7 * back * back * back + 1.7 * back * back) : 1;
      g.save(); g.translate(cell.x, cell.y); if (dragged) g.globalAlpha = .3; g.scale(scale, scale);
      if (t.tier >= 4 && !this.reduced) { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = .28 + .1 * Math.sin(now * 3 + index); g.drawImage(Art.glow(tc), -66, -66, 132, 132); g.restore(); }
      if (t.tier === 6 && !this.reduced) { g.save(); g.rotate(now * .6); g.globalCompositeOperation = 'lighter'; g.fillStyle = alpha(tc, .5); for (let i = 0; i < 12; i++) { g.rotate(TAU / 12); poly(g, [43, -2.5, 54 + (i % 2) * 6, 0, 43, 2.5]); g.fill(); } g.restore(); }
      g.drawImage(art.base, -55, -55, 110, 110);
      this.head(g, t, art, now + index);
      if (t.jam > 0) { g.fillStyle = 'rgba(20,24,30,.55)'; circle(g, 0, 0, 30); g.fill(); g.strokeStyle = '#ffe36e'; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-7, -16); g.lineTo(5, -4); g.lineTo(-5, 2); g.lineTo(7, 16); g.stroke(); }
      if (ui.hints && !dragged && game.state === 'running' && !game.reaches(index)) { g.fillStyle = '#ff6f7d'; circle(g, 31, -31, 9); g.fill(); g.strokeStyle = '#1a0d10'; g.lineWidth = 1.5; g.stroke(); g.fillStyle = '#fff'; g.font = '800 13px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 31, -30); }
      g.restore();
    }
    head(g, t, art, phase) {
      g.save();
      if (art.rotating) { g.rotate(t.angle); g.translate(-t.recoil * 34, 0); }
      else { const k = 1 + t.recoil * .7; g.translate(0, Math.sin(phase * 2.2) * 1.2); g.scale(k, k); }
      g.drawImage(art.head, -55, -55, 110, 110);
      if (t.type === 'tesla' && !this.reduced && t.jam <= 0) { g.globalCompositeOperation = 'lighter'; g.globalAlpha = .35 + .25 * Math.sin(phase * 9); g.drawImage(Art.glow(D.TOWERS.tesla.color), -22, -40, 44, 44); }
      g.restore();
    }

    enemy(g, game, e) {
      const boss = !!e.boss, frames = Art.enemyFrames(e.boss || e.kind), h = boss ? 108 : e.r * 3.3 + 10, face = e.dx > .5 ? 1 : e.dx < -.5 ? -1 : e.dy > 0 ? -1 : 1;
      const frame = frames[WALK[Math.floor(e.d / (boss ? 17 : 10)) % 4]], foot = e.y + e.r * .75, hidden = e.kind === 'stalker' && !game.targetable(e), born = clamp((game.time - e.born) / .3, 0, 1);
      g.save(); g.translate(e.x, foot); g.globalAlpha = (hidden ? .32 : e.kind === 'wisp' ? .82 : 1) * born;
      g.fillStyle = 'rgba(0,0,0,.38)'; ellipse(g, 0, 0, e.r * 1.05, e.r * .42); g.fill();
      if (e.slow > 0) { g.strokeStyle = 'rgba(160,215,255,.85)'; g.lineWidth = 2; ellipse(g, 0, 0, e.r * 1.25, e.r * .52); g.stroke(); }
      const bob = Math.abs(Math.sin(e.d / (boss ? 17 : 10) * Math.PI)) * (boss ? 2.5 : 2);
      g.save(); g.scale(face, 1); g.drawImage(frame, -h / 2, -h - bob + 2, h, h);
      const tint = e.hit > 0 ? ['#ffffff', .55] : e.burn > 0 ? ['#ff8a3c', .35] : e.poison > 0 ? ['#9bf05a', .3] : e.slow > 0 ? ['#8fd0ff', .32] : e.heal > 0 ? ['#7dffb0', .4] : e.kind === 'berserker' && e.hp <= e.maxHp * .5 ? ['#ff3b3b', .35] : null;
      if (tint) { g.globalCompositeOperation = 'lighter'; g.globalAlpha *= tint[1]; g.drawImage(Art.glow(tint[0]), -h * .55, -h * .95 - bob, h * 1.1, h * 1.1); }
      g.restore();
      if (e.shield > 0) { const k = e.shield / e.maxShield, col = boss ? '#7fb8ff' : '#ffd66e'; g.fillStyle = alpha(col, .1 + .12 * k); g.strokeStyle = alpha(col, .5 + .4 * k); g.lineWidth = 2; ellipse(g, 0, -h * .42, h * .5, h * .52); g.fill(); g.stroke(); }
      if (e.heal > 0) { g.fillStyle = '#8dffb5'; g.fillRect(-2, -h - 14 - (1 - e.heal * 2) * 8, 4, 12); g.fillRect(-6, -h - 10 - (1 - e.heal * 2) * 8, 12, 4); }
      g.globalAlpha = born;
      if (!hidden && (e.hp < e.maxHp || boss || e.shield > 0)) {
        const w = boss ? 64 : Math.max(24, e.r * 2.2), y = -h - 5, k = clamp(e.hp / e.maxHp, 0, 1);
        g.fillStyle = 'rgba(8,12,16,.8)'; rounded(g, -w / 2 - 1.5, y - 1.5, w + 3, boss ? 8 : 6.5, 3); g.fill();
        g.fillStyle = k > .5 ? '#7be08e' : k > .25 ? '#ffc35e' : '#ff6b6b'; rounded(g, -w / 2, y, Math.max(2, w * k), boss ? 5 : 3.5, 2); g.fill();
        if (e.maxShield > 0 && e.shield > 0) { g.fillStyle = boss ? '#7fb8ff' : '#ffd66e'; rounded(g, -w / 2, y - 4.5, Math.max(2, w * e.shield / e.maxShield), 2.5, 1); g.fill(); }
      }
      g.restore();
      if (!this.reduced && Math.random() < .12) { if (e.burn > 0) this.particles.push({ x: e.x + (Math.random() - .5) * e.r, y: e.y - e.r * .5, vx: 0, vy: -40, life: .4, max: .4, size: 2.6, color: '#ffa04a', gravity: 0 }); else if (e.poison > 0) this.particles.push({ x: e.x + (Math.random() - .5) * e.r, y: e.y - e.r, vx: 0, vy: -22, life: .5, max: .5, size: 2.2, color: '#a8ed72', gravity: 0 }); }
    }

    groundEffects(g, game) {
      for (const f of game.effects) {
        const k = 1 - f.life / f.max, fade = f.life / f.max;
        if (f.kind === 'frost') { const r = f.r * (.25 + .75 * ease(k)); g.fillStyle = radial(g, f.x, f.y, r, ['rgba(160,220,255,0)', alpha('#a8dcff', .16 * fade)]); circle(g, f.x, f.y, r); g.fill(); g.strokeStyle = alpha('#d8f2ff', .7 * fade); g.lineWidth = 2.5; g.stroke(); }
        else if (f.kind === 'cloud') { for (let i = 0; i < 6; i++) { const a = hash(f.id + i) * TAU, d = hash(f.id * 3 + i) * f.r * .55, r = f.r * (.38 + hash(f.id * 7 + i) * .3) * (.7 + .3 * k); g.fillStyle = alpha('#9be860', .2 * fade); circle(g, f.x + Math.cos(a) * d, f.y + Math.sin(a) * d - k * 6, r); g.fill(); } }
        else if (f.kind === 'summon') { const col = D.TIERS[f.tier - 1].color; g.strokeStyle = alpha(col, fade); g.lineWidth = 3; circle(g, f.x, f.y, 20 + 34 * ease(k)); g.stroke(); }
      }
    }
    shots(g, game) {
      for (const s of game.shots) {
        if (s.kind === 'arrow') { const a = s.angle || 0, cx = Math.cos(a), cy = Math.sin(a); g.lineCap = 'round'; g.strokeStyle = alpha(s.color, .35); g.lineWidth = 5; g.beginPath(); g.moveTo(s.x - cx * 16, s.y - cy * 16); g.lineTo(s.x, s.y); g.stroke(); g.strokeStyle = '#f4fff8'; g.lineWidth = 2; g.beginPath(); g.moveTo(s.x - cx * 9, s.y - cy * 9); g.lineTo(s.x + cx * 3, s.y + cy * 3); g.stroke(); }
        else { const total = Math.hypot(s.tx - s.sx, s.ty - s.sy) || 1, p = clamp(Math.hypot(s.x - s.sx, s.y - s.sy) / total, 0, 1), lift = Math.sin(p * Math.PI) * 30; g.fillStyle = 'rgba(0,0,0,.3)'; ellipse(g, s.x, s.y + 4, 6, 3); g.fill(); g.fillStyle = radial(g, s.x, s.y - lift, 7, ['#fff1c9', s.color, '#3a2a18'], s.x - 2, s.y - lift - 2); circle(g, s.x, s.y - lift, 6 + s.tier * .5); g.fill(); g.strokeStyle = '#1a1410'; g.lineWidth = 1.2; g.stroke(); }
      }
    }
    airEffects(g, game) {
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      for (const f of game.effects) {
        const k = 1 - f.life / f.max, fade = f.life / f.max;
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = 1;
        if (f.kind === 'blast') { const r = f.r * (.35 + .65 * ease(k)); g.fillStyle = radial(g, f.x, f.y, r, [alpha('#fff3c9', .9 * fade), alpha(f.color, .55 * fade), alpha('#ff5a2a', 0)]); circle(g, f.x, f.y, r); g.fill(); g.strokeStyle = alpha('#ffd9a0', .7 * fade); g.lineWidth = 3 * fade + .5; circle(g, f.x, f.y, r); g.stroke(); }
        else if (f.kind === 'bolt') { for (const [width, col] of [[5, alpha(f.color, .5 * fade)], [2, alpha('#ffffff', .95 * fade)]]) { g.strokeStyle = col; g.lineWidth = width; g.beginPath(); g.moveTo(f.points[0].x, f.points[0].y - 22); for (let i = 1; i < f.points.length; i++) { const a = i === 1 ? { x: f.points[0].x, y: f.points[0].y - 22 } : f.points[i - 1], b = f.points[i]; for (let j = 1; j <= 4; j++) { const t = j / 4, jit = j < 4 ? (hash(f.id * 13 + i * 7 + j + Math.floor(this.clock * 30)) - .5) * 16 : 0; g.lineTo(a.x + (b.x - a.x) * t + jit, a.y + (b.y - a.y) * t + jit); } } g.stroke(); } for (let i = 1; i < f.points.length; i++) { g.globalAlpha = fade * .8; g.drawImage(Art.glow(f.color), f.points[i].x - 18, f.points[i].y - 18, 36, 36); } }
        else if (f.kind === 'beam') { g.save(); g.translate(f.x, f.y); g.rotate(f.angle); const w = f.width * (.5 + fade * .7); g.fillStyle = linear(g, 0, -w, 0, w, [alpha(f.color, 0), alpha(f.color, .7 * fade), alpha('#ffffff', fade), alpha(f.color, .7 * fade), alpha(f.color, 0)]); g.fillRect(26, -w, f.length - 26, w * 2); g.globalAlpha = fade; g.drawImage(Art.glow(f.color), 6, -24, 48, 48); g.restore(); }
        else if (f.kind === 'cone') { const cos = Math.cos(f.angle), sin = Math.sin(f.angle), spread = Math.tan(f.half); for (let i = 0; i < 9; i++) { const u = (i + 1) / 9, reach = 26 + (f.r - 30) * u * (.35 + .65 * ease(Math.min(1, k * 2.5 + .25))), side = (hash(f.id * 11 + i) - .5) * 2 * reach * spread * .55, r = 7 + reach * spread * .62, x = f.x + cos * reach - sin * side, y = f.y + sin * reach + cos * side; g.globalAlpha = fade * (.75 - u * .4); g.drawImage(Art.glow(u < .3 ? '#fff0b8' : u < .65 ? '#ffb347' : '#ff6a2a'), x - r, y - r, r * 2, r * 2); } g.globalAlpha = 1; }
        else if (f.kind === 'merge') { const col = D.TIERS[f.tier - 1].color, r = 24 + 60 * ease(k); g.strokeStyle = alpha(col, fade); g.lineWidth = 5 * fade + 1; circle(g, f.x, f.y, r); g.stroke(); g.globalAlpha = fade * fade; g.drawImage(Art.glow('#ffffff'), f.x - 70, f.y - 70, 140, 140); g.globalAlpha = 1; g.save(); g.translate(f.x, f.y); g.rotate(k * 1.2); g.fillStyle = alpha(col, .5 * fade); for (let i = 0; i < 8; i++) { g.rotate(TAU / 8); poly(g, [14, 0, 30 + 50 * ease(k), -3, 30 + 50 * ease(k), 3]); g.fill(); } g.restore(); }
        else if (f.kind === 'summon') { const col = D.TIERS[f.tier - 1].color; g.fillStyle = linear(g, 0, f.y - 110, 0, f.y + 10, [alpha(col, 0), alpha(col, .55 * fade)]); g.fillRect(f.x - 20 * fade, f.y - 110, 40 * fade, 120); }
        else if (f.kind === 'amplify') { g.strokeStyle = alpha('#ffd08a', .8 * fade); g.lineWidth = 6 * fade + 1; circle(g, 360, 360, 40 + 460 * ease(k)); g.stroke(); }
        else if (f.kind === 'flash') { g.strokeStyle = alpha('#fff3c4', fade); g.lineWidth = 14 * fade + 2; circle(g, f.x, f.y, 30 + 900 * ease(k)); g.stroke(); }
        else if (f.kind === 'boss') { g.strokeStyle = alpha('#d59bff', fade); g.lineWidth = 4; circle(g, f.x, f.y, 20 + 80 * ease(k)); g.stroke(); circle(g, f.x, f.y, 10 + 50 * ease(k)); g.stroke(); }
        else if (f.kind === 'bossDeath') { const r = 30 + 130 * ease(k); g.fillStyle = radial(g, f.x, f.y, r, [alpha('#ffffff', .9 * fade), alpha('#c58bff', .5 * fade), alpha('#7a3bd0', 0)]); circle(g, f.x, f.y, r); g.fill(); }
        else if (f.kind === 'death') { g.strokeStyle = alpha('#ffe2b0', .7 * fade); g.lineWidth = 2.5 * fade + .5; circle(g, f.x, f.y, (f.r || 12) * (.8 + 1.5 * ease(k))); g.stroke(); }
        else if (f.kind === 'hit') { g.globalAlpha = fade; g.drawImage(Art.glow(f.color), f.x - 12, f.y - 12, 24, 24); }
        else if (f.kind === 'leak') { g.strokeStyle = alpha('#ff5f6d', fade); g.lineWidth = 5 * fade + 1; circle(g, f.x, f.y, 24 + 60 * ease(k)); g.stroke(); }
        else if (f.kind === 'jam') { g.strokeStyle = alpha('#ffe36e', fade); g.lineWidth = 3; circle(g, f.x, f.y, 30 + 20 * k); g.stroke(); }
      }
      g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
      if (!this.reduced) { g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(8,12,16,.8)';
        for (const f of game.effects) { if (f.kind !== 'text' && f.kind !== 'leak') continue; const k = 1 - f.life / f.max, big = f.kind === 'leak'; g.globalAlpha = Math.min(1, f.life / f.max * 1.6); g.font = (big ? '800 20px' : f.value >= 1000 ? '800 14px' : '700 12px') + ' system-ui,sans-serif'; g.fillStyle = big ? '#ff8f98' : f.color; const text = big ? '−' + f.value : String(f.value), y = f.y - k * 20 - (big ? 44 : 0); g.strokeText(text, f.x, y); g.fillText(text, f.x, y); }
        g.globalAlpha = 1; }
      g.restore();
    }
    drawParticles(g, dt) {
      let keep = 0; g.save(); g.globalCompositeOperation = 'lighter';
      for (const p of this.particles) { p.life -= dt; if (p.life <= 0) continue; p.vy += p.gravity * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 1 - 2.2 * dt; p.vy *= 1 - 2.2 * dt; const k = p.life / p.max; g.globalAlpha = k; g.fillStyle = p.color; circle(g, p.x, p.y, p.size * (.4 + .6 * k)); g.fill(); this.particles[keep++] = p; }
      this.particles.length = keep; g.restore();
    }
    overlay(g, game, ui, P) {
      const drag = ui.drag, index = drag ? (drag.over >= 0 ? drag.over : -1) : ui.selected, source = drag ? game.cells[drag.from]?.tower : game.cells[ui.selected]?.tower;
      if (source && index >= 0) { const c = game.cells[index], stats = game.towerStats(source.type, source.tier), col = D.TIERS[source.tier - 1].color; g.fillStyle = alpha(col, .07); circle(g, c.x, c.y, stats.range); g.fill(); g.setLineDash([8, 7]); g.lineDashOffset = -this.clock * 18; g.strokeStyle = alpha(col, .75); g.lineWidth = 2; g.stroke(); g.setLineDash([]); }
      if (drag && source) { const art = Art.tower(source.type, source.tier); g.save(); g.translate(drag.x, drag.y - 8); g.scale(1.12, 1.12); g.globalAlpha = .95; g.drawImage(art.base, -55, -55, 110, 110); if (art.rotating) g.rotate(source.angle); g.drawImage(art.head, -55, -55, 110, 110); g.restore(); }
      // 새벽빛과 경고
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = radial(g, D.CORE.x, D.CORE.y, 520, [alpha(P.tint, .13), alpha(P.tint, .03), alpha(P.tint, 0)]); g.fillRect(0, 0, 720, 720); g.restore();
      const danger = game.core <= D.CORE_MAX * .25 && game.state === 'running' ? .18 + .1 * Math.sin(this.clock * 6) : 0, hit = game.coreHit > 0 ? game.coreHit / .4 * .4 : 0, red = Math.max(danger, hit);
      if (red > 0) { g.fillStyle = radial(g, 360, 360, 520, ['rgba(255,40,60,0)', 'rgba(255,40,60,0)', `rgba(255,40,60,${red})`]); g.fillRect(0, 0, 720, 720); }
      if (this.whiteout > 0) { g.fillStyle = `rgba(255,246,214,${this.whiteout * (this.reduced ? .3 : .9)})`; g.fillRect(0, 0, 720, 720); }
    }
    drawBanner(g, b) {
      const k = 1 - b.life / b.max, a = clamp(k / .12, 0, 1) * clamp(b.life / .5, 0, 1), y = 360 - (1 - ease(clamp(k / .2, 0, 1))) * 20;
      g.save(); g.globalAlpha = a; g.fillStyle = linear(g, 0, 0, 720, 0, ['rgba(8,12,18,0)', b.boss ? 'rgba(48,14,58,.88)' : 'rgba(8,14,20,.85)', b.boss ? 'rgba(48,14,58,.88)' : 'rgba(8,14,20,.85)', 'rgba(8,12,18,0)']); g.fillRect(0, y - 44, 720, 88);
      g.fillStyle = linear(g, 0, 0, 720, 0, ['rgba(255,208,138,0)', b.boss ? '#e3a6ff' : '#ffd08a', 'rgba(255,208,138,0)']); g.fillRect(0, y - 45, 720, 2); g.fillRect(0, y + 43, 720, 2);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = b.boss ? '#f1d0ff' : '#ffe8bd'; g.font = '900 38px system-ui,sans-serif'; g.fillText(b.title, 360, b.sub ? y - 10 : y + 2);
      if (b.sub) { g.font = '700 16px system-ui,sans-serif'; g.fillStyle = b.boss ? '#ffb3c8' : '#bfe9d8'; g.fillText(b.sub, 360, y + 22); }
      g.restore();
    }
  }
  root.DawnView = View;
})(typeof globalThis !== 'undefined' ? globalThis : this);
