/* 1945EX(비행기 게임) 본체: 진행, 입력, 그리기, 소리. 규칙은 space-shooter-core.js, 기체 그림은 shooter-sprites.js. */
(function () {
  'use strict';
  const C = window.ShooterCore, Sprites = window.ShooterSprites, { W, H, clamp } = C;
  const el = id => document.getElementById(id);
  const canvas = el('gameCanvas'), ctx = canvas.getContext('2d');
  const overlay = el('gameOverlay'), overlayTitle = el('overlayTitle'), overlayText = el('overlayText');
  const shipPanel = el('shipChoicePanel'), upgradePanel = el('upgradeChoices'), startBtn = el('overlayStartBtn'), quitBtn = el('quitBtn');
  const rand = (a, b) => a + Math.random() * (b - a);
  const store = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v === null ? fallback : v; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, String(value)); } catch {} }
  };

  let state = 'title';            // title | playing | paused | upgrade | over
  let G = null, clock = 0, pixelScale = 1;
  let selectedShip = C.SHIPS[store.get('spaceShooterShip', '')] ? store.get('spaceShooterShip') : 'balanced';
  let best = Math.max(0, Number(store.get('spaceShooterBest', 0)) || 0);
  let muted = store.get('spaceShooterMuted', 'false') === 'true';
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motionQuery.matches;
  motionQuery.addEventListener?.('change', event => { reduced = event.matches; });
  const keys = {};
  const pointer = { active: false, touch: false, id: null, x: 0, y: 0, anchorX: 0, anchorY: 0, shipX: 0, shipY: 0 };
  const stars = Array.from({ length: 80 }, () => { const layer = Math.floor(Math.random() * 3); return { x: Math.random() * W, y: Math.random() * H, speed: 28 + layer * 46, size: 1 + layer }; });

  // ---------- 소리: 파일 없이 합성음만 쓴다 ----------
  let audio = null, master = null, voices = 0, lastShot = 0, lastGem = 0;
  function ensureAudio() {
    if (audio || muted) return;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    try { audio = new Ctor(); master = audio.createGain(); master.gain.value = .3; master.connect(audio.destination); } catch { audio = null; }
  }
  const SOUNDS = { shot: [700, .04, .012, 'square'], gem: [1250, .05, .03, 'sine'], hit: [95, .3, .1, 'sawtooth'], kill: [210, .1, .05, 'triangle'], power: [660, .2, .06, 'sine'], bomb: [70, .6, .12, 'sawtooth'], boss: [55, .9, .12, 'sawtooth'], pick: [520, .08, .04, 'sine'] };
  function sfx(kind) {
    if (muted || !audio || audio.state !== 'running' || voices >= 8) return;
    const t = audio.currentTime;
    if (kind === 'shot') { if (t - lastShot < .09) return; lastShot = t; }
    if (kind === 'gem') { if (t - lastGem < .05) return; lastGem = t; }
    const [frequency, duration, volume, type] = SOUNDS[kind], osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, t);
    osc.frequency.exponentialRampToValueAtTime(frequency * (kind === 'power' || kind === 'gem' ? 1.6 : .45), t + duration);
    gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(volume, t + .008); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    osc.connect(gain); gain.connect(master); voices += 1;
    osc.onended = () => { voices -= 1; osc.disconnect(); gain.disconnect(); };
    osc.start(t); osc.stop(t + duration + .02);
  }

  // ---------- 진행 ----------
  function newRun(ship) {
    return {
      ship, score: 0, wave: 0, lives: C.SHIPS[ship].lives, bombs: 2, weapon: 'vulcan', level: 1, shield: false, owned: {},
      chain: 0, chainT: 0, bestChain: 0, kills: 0, hits: 0, grazes: 0, time: 0, drought: 0, waveHits: 0,
      player: { x: W / 2, y: H - 90, invuln: 2, cooldown: 0, tilt: 0, dead: 0 },
      shots: [], enemies: [], bullets: [], items: [], gems: [], particles: [], blasts: [], rings: [], texts: [], arcs: [], muzzle: 0, optionT: 0, delayed: [], ghosts: [], hitstop: 0, ghostT: 0, critT: 0, sub: null, subT: 0, beam: null, storm: null, mastery: {},
      boss: null, bossDeath: 0, plan: null, planT: 0, planI: 0, pause: 0, banner: '', bannerT: 0, shake: 0, flash: 0, hurt: 0, ended: false
    };
  }
  function announce(text) { G.banner = text; G.bannerT = 2.2; }
  function startWave(number) {
    G.wave = number; G.plan = C.wavePlan(number); G.planT = 0; G.planI = 0; G.waveHits = 0;
    announce(G.plan.boss ? `WARNING · ${C.bossKindFor(number).name}` : `WAVE ${number}`);
    if (G.plan.boss) sfx('boss');
    say(G.plan.boss ? `웨이브 ${number} 보스 ${C.bossKindFor(number).name} 등장` : `웨이브 ${number}`);
  }
  function startGame() {
    ensureAudio(); audio?.resume?.();
    G = newRun(selectedShip); state = 'playing'; pointer.active = false;
    Object.keys(keys).forEach(key => delete keys[key]);
    startWave(1); showOverlay(null); syncControls();
    canvas.focus({ preventScroll: true });
  }
  function togglePause() {
    if (state === 'playing') { state = 'paused'; showOverlay('pause'); }
    else if (state === 'paused') { state = 'playing'; showOverlay(null); canvas.focus({ preventScroll: true }); }
    syncControls();
  }
  function toTitle() { state = 'title'; G = null; showOverlay('title'); syncControls(); }
  function endRun() {
    if (!G || G.ended) return;
    G.ended = true; state = 'over';
    if (G.score > best) { best = G.score; store.set('spaceShooterBest', best); }
    window.dispatchEvent(new CustomEvent('partygame:score', { detail: { gameId: 'space-shooter', score: G.score, wave: G.wave } }));
    showOverlay('over'); syncControls();
  }

  function addScore(points, x, y, color) {
    const earned = Math.round(points * C.chainMultiplier(G.chain));
    G.score += earned;
    if (x !== undefined) floatText(`+${earned.toLocaleString('en-US')}`, x, y, color || '#fde68a');
    return earned;
  }
  function floatText(text, x, y, color) { if (G.texts.length >= 24) G.texts.shift(); G.texts.push({ text, x: clamp(x, 50, W - 50), y, color, life: .9 }); }
  function burst(x, y, color, count, speed = 200) {
    const n = Math.min(reduced ? Math.min(count, 4) : count, 280 - G.particles.length);
    for (let i = 0; i < n; i += 1) { const a = rand(0, Math.PI * 2), s = rand(40, speed); G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.3, .7), color, size: rand(2, 4) }); }
    if (count >= 10 && !reduced) { if (G.blasts.length >= 30) G.blasts.shift(); G.blasts.push({ x, y, color, r: Math.min(110, 16 + count * 1.3), life: .28 }); }
  }
  function debris(x, y, count) {
    if (reduced) return;
    for (let i = 0; i < count && G.particles.length < 280; i += 1) { const a = rand(0, Math.PI * 2), s = rand(50, 170); G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.5, .95), color: i % 2 ? '#94a3b8' : '#475569', size: rand(3, 6), shard: true, spin: rand(-9, 9) }); }
  }
  function ring(x, y, max, color) { if (reduced) return; if (G.rings.length >= 24) G.rings.shift(); G.rings.push({ x, y, max, color, life: .35 }); }
  function shake(amount) { if (!reduced) G.shake = Math.max(G.shake, amount); }
  function dropItem(x, y, kind) {
    // 무기 상자는 지금 무기를 뺀 것 가운데 세 가지를 돌아가며 보여 준다.
    const pool = C.WEAPON_KEYS.filter(key => key !== G.weapon), cycle = [];
    while (cycle.length < 3 && pool.length) cycle.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    G.items.push({ x, y, kind, age: 0, cycle });
  }
  function sparks(x, y, color, count, angle, spread, speed = 220) {
    if (reduced) return;
    for (let i = 0; i < count && G.particles.length < 280; i += 1) { const a = angle + rand(-spread, spread), v = rand(speed * .4, speed); G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(.12, .3), color, size: rand(1.5, 3) }); }
  }
  function arc(x1, y1, x2, y2, color) {
    if (G.arcs.length >= 24) G.arcs.shift();
    const points = [[x1, y1]], d = Math.hypot(x2 - x1, y2 - y1), n = Math.max(2, Math.round(d / 22));
    for (let i = 1; i < n; i += 1) { const t = i / n; points.push([x1 + (x2 - x1) * t + rand(-9, 9), y1 + (y2 - y1) * t + rand(-9, 9)]); }
    points.push([x2, y2]); G.arcs.push({ points, color, life: .16 });
  }
  /** 폭발: 반경 안의 적에게 피해를 준다. */
  function explode(x, y, radius, damage, color, targets, skip) {
    for (const e of targets) { if (e === skip || e.hp <= 0) continue; const reach = radius + (e.type === 'boss' ? 46 : e.r); if ((e.x - x) ** 2 + (e.y - y) ** 2 < reach * reach) damageEnemy(e, damage); }
    ring(x, y, radius, color); if (!reduced && G.blasts.length < 30) G.blasts.push({ x, y, color, r: radius * 1.1, life: .28 }); sparks(x, y, color, 6, 0, Math.PI, 260);
  }
  function dropGems(x, y, count) { for (let i = 0; i < count && G.gems.length < 90; i += 1) G.gems.push({ x, y, vx: rand(-110, 110), vy: rand(-150, -20), age: 0 }); }

  function killEnemy(e) {
    G.kills += 1; G.chain += 1; G.chainT = 2.6; G.bestChain = Math.max(G.bestChain, G.chain);
    addScore(e.score, e.x, e.y);
    const big = C.ENEMIES[e.type].hp >= 10, tint = C.WEAPONS[G.weapon].color;
    burst(e.x, e.y, '#fca5a5', e.type === 'mini' ? 10 : 18); debris(e.x, e.y, e.type === 'mini' ? 2 : 5); ring(e.x, e.y, e.type === 'mini' ? 26 : 48, '#fecaca');
    sparks(e.x, e.y, tint, e.type === 'mini' ? 3 : 7, 0, Math.PI, 300);
    if (!reduced && G.blasts.length < 30) G.blasts.push({ x: e.x, y: e.y, color: '#ffffff', r: e.r * 1.6, life: .1, small: true });
    if (big) {
      // 큰 적은 연달아 터지고 화면이 아주 잠깐 멈춘다.
      for (let i = 1; i <= 3; i += 1) G.delayed.push({ t: i * .09, x: e.x + rand(-e.r, e.r), y: e.y + rand(-e.r, e.r), color: i % 2 ? '#fbbf24' : tint });
      ring(e.x, e.y, 90, tint); shake(5); G.hitstop = Math.max(G.hitstop, .045);
    }
    if (G.chain > 0 && G.chain % 10 === 0) { floatText(`${G.chain} CHAIN!`, e.x, e.y - 26, '#fb923c'); ring(G.player.x, G.player.y, 130, '#fb923c'); sfx('power'); }
    addMastery();
    dropGems(e.x, e.y, e.type === 'mini' ? 1 : e.type === 'grunt' ? 2 : 4); sfx('kill');
    if (e.type === 'splitter') for (const side of [-1, 1]) G.enemies.push(C.makeEnemy('mini', G.wave, clamp(e.x + side * 16, 16, W - 16), e.y, { move: 'bounce', vx: side * 80, speed: 130 + G.wave * 3 }));
    // 보급: 수송기와 정예기는 확정, 그 밖에는 낮은 확률. 강화가 오래 안 나오면 보장한다.
    let power = e.type === 'carrier' || e.type === 'elite';
    if (e.type === 'carrier') dropItem(e.x + 18, e.y, 'bomb');
    const roll = Math.random();
    if (!power && roll < .05) power = true;
    else if (roll < .11) dropItem(e.x, e.y, 'weapon');
    else if (roll < .125 && G.lives < 6) dropItem(e.x, e.y, 'life');
    G.drought = power ? 0 : G.drought + 1;
    if (G.drought >= 14) { power = true; G.drought = 0; }
    if (power) dropItem(e.x - (e.type === 'carrier' ? 18 : 0), e.y, 'power');
  }
  function damageEnemy(e, amount) { e.hp -= amount; e.flash = .07; }
  function hitPlayer() {
    const p = G.player;
    if (p.invuln > 0 || p.dead > 0 || G.bossDeath > 0) return;
    G.waveHits += 1; G.bullets = []; shake(12); sfx('hit');
    if (G.shield) { G.shield = false; p.invuln = 1.4; burst(p.x, p.y, '#67e8f9', 26); floatText('방어막 소멸', p.x, p.y - 40, '#a5f3fc'); return; }
    G.hits += 1; G.lives -= 1; G.chain = 0; if (!G.owned.keep) G.level = Math.max(1, G.level - 1); G.hurt = .45;
    burst(p.x, p.y, '#fca5a5', 34, 260); debris(p.x, p.y, 8); ring(p.x, p.y, 90, '#fecaca');
    if (G.lives <= 0) { p.dead = 1.1; say('격추되었습니다'); } else { p.invuln = 2.2; say(`피격. 남은 라이프 ${G.lives}`); }
    if (G.boss) G.boss.beam = null;
  }
  function useBomb() {
    if (state !== 'playing' || !G || G.bombs <= 0 || G.player.dead > 0 || G.bossDeath > 0) return;
    const p = G.player, weapon = C.WEAPONS[G.weapon], color = weapon.color;
    G.bombs -= 1; p.invuln = Math.max(p.invuln, 1.8); G.flash = .35; shake(10); sfx('bomb');
    G.bullets.forEach(b => { dropGems(b.x, b.y, 1); sparks(b.x, b.y, '#fde047', 2, -Math.PI / 2, Math.PI, 120); }); G.bullets = [];   // 적탄은 점수 보석으로 바뀐다
    const targets = G.boss && !G.boss.entering ? [...G.enemies, G.boss] : G.enemies;
    targets.forEach(e => damageEnemy(e, 15));
    if (G.boss) G.boss.beam = null;
    const power = C.SHIPS[G.ship].damage * (1 + (G.owned.damage || 0) * .15);
    const fire = (vx, vy, extra) => { if (G.shots.length < 400) G.shots.push(Object.assign({ x: p.x, y: p.y, vx, vy, r: 5, dmg: 6 * power, pierce: 2, kind: G.weapon, color, age: 0, hit: [] }, extra)); };
    // 봄의 마무리는 지금 무기에 따라 달라진다.
    if (G.weapon === 'vulcan') for (let i = 0; i < 48; i += 1) { const a = i / 48 * Math.PI * 2; fire(Math.cos(a) * 620, Math.sin(a) * 620, { pierce: 3 }); }
    else if (G.weapon === 'spread') for (let wave = 0; wave < 3; wave += 1) for (let i = 0; i < 15; i += 1) { const a = -Math.PI / 2 + (i - 7) * .13; fire(Math.cos(a) * (480 + wave * 90), Math.sin(a) * (480 + wave * 90), { bounce: 3, pierce: 1 }); }
    else if (G.weapon === 'laser') G.beam = { t: 1.3, tick: 0, dmg: 9 * power };
    else if (G.weapon === 'missile') for (let i = 0; i < 20; i += 1) { const a = i / 20 * Math.PI * 2; fire(Math.cos(a) * 240, Math.sin(a) * 240, { kind: 'missile', homing: 7, speed: 520, splash: 46, pierce: 0, dmg: 8 * power }); }
    else if (G.weapon === 'plasma') { explode(p.x, p.y - 150, 190, 45 * power, color, targets, null); ring(p.x, p.y - 150, 260, '#ffffff'); for (let i = 0; i < 14; i += 1) { const a = i / 14 * Math.PI * 2; G.shots.push({ x: p.x, y: p.y - 150, vx: Math.cos(a) * 380, vy: Math.sin(a) * 380, r: 6, dmg: 6 * power, pierce: 0, kind: 'plasma', splash: 40, color, age: 0, hit: [] }); } }
    else if (G.weapon === 'chain') G.storm = { t: 1.2, tick: 0, dmg: 14 * power };
    else if (G.weapon === 'wave') for (let i = 0; i < 4; i += 1) G.shots.push({ x: W / 2, y: p.y + 20 + i * 70, vx: 0, vy: -560, r: 6, dmg: 12 * power, pierce: 99, width: W / 2, cancel: true, kind: 'wave', color, age: 0, hit: [] });
    announce(weapon.bomb); ring(p.x, p.y, 430, color); ring(p.x, p.y, 260, '#ffffff'); burst(p.x, p.y, color, 40, 320);
    syncControls();
  }
  /** 지속형 봄: 레이저 포격과 번개 폭풍. */
  function stepBombs(dt, targets) {
    const p = G.player;
    if (G.beam) {
      G.beam.t -= dt; G.beam.tick -= dt;
      if (G.beam.tick <= 0) { G.beam.tick += .08; for (const e of targets) if (e.hp > 0 && e.y < p.y && Math.abs(e.x - p.x) < 34 + (e.type === 'boss' ? 62 : e.r)) { damageEnemy(e, G.beam.dmg); sparks(e.x, e.y, '#86efac', 3, Math.PI / 2, 1.4); } for (const b of G.bullets) if (b.y < p.y && Math.abs(b.x - p.x) < 34 + b.r) b.dead = true; shake(3); }
      if (G.beam.t <= 0) G.beam = null;
    }
    if (G.storm) {
      G.storm.t -= dt; G.storm.tick -= dt;
      if (G.storm.tick <= 0) { G.storm.tick += .3; let from = p; for (const e of targets) if (e.hp > 0 && e.y > -10) { damageEnemy(e, G.storm.dmg); arc(from.x, from.y, e.x, e.y, '#7dd3fc'); from = e; } if (from === p) arc(p.x, p.y, p.x + rand(-120, 120), p.y - rand(120, 300), '#7dd3fc'); G.flash = Math.max(G.flash, .08); }
      if (G.storm.t <= 0) G.storm = null;
    }
  }
  function powerUp() {
    const p = G.player, weapon = C.WEAPONS[G.weapon];
    if (G.level >= C.MAX_LEVEL) { addScore(2000, p.x, p.y - 40, '#67e8f9'); return; }
    G.level += 1; ring(p.x, p.y, 80, weapon.color); sparks(p.x, p.y, weapon.color, 12, -Math.PI / 2, Math.PI, 280);
    if (G.level === C.MAX_LEVEL) { announce(`EX · ${weapon.name}`); floatText(weapon.ex, p.x, p.y - 40, '#fef08a'); ring(p.x, p.y, 200, '#fef08a'); G.flash = .2; sfx('boss'); say(`${weapon.name} EX 단계. ${weapon.ex}`); }
    else floatText('POWER UP', p.x, p.y - 40, '#67e8f9');
  }
  const masteryTier = weapon => C.masteryTier(G.mastery[weapon] || 0);
  const masteryBonus = () => 1 + masteryTier(G.weapon) * .08;
  function addMastery() {
    const before = masteryTier(G.weapon); G.mastery[G.weapon] = (G.mastery[G.weapon] || 0) + 1;
    const tier = masteryTier(G.weapon);
    if (tier > before) { const weapon = C.WEAPONS[G.weapon], p = G.player; floatText(`${weapon.name} 숙련 ${'★'.repeat(tier)}`, p.x, p.y - 56, '#fde68a'); ring(p.x, p.y, 110, '#fde68a'); sparks(p.x, p.y, '#fde68a', 16, -Math.PI / 2, Math.PI, 320); sfx('power'); say(`${weapon.name} 숙련 ${tier}단계. 피해 +${tier * 8}%`); }
  }
  function optionSpots() {
    const p = G.player, count = Math.min(2, G.owned.option || 0), bob = reduced ? 0 : Math.sin(clock * 4) * 3;
    return [-1, 1].slice(0, count).map(side => ({ x: clamp(p.x + side * 34 - p.tilt * 6, 8, W - 8), y: p.y + 14 + bob * side }));
  }
  function collect(item) {
    const p = G.player; sfx('power');
    if (item.kind === 'power') powerUp();
    else if (item.kind === 'weapon') {
      const weapon = itemWeapon(item);
      if (weapon === G.weapon) powerUp();
      else { G.sub = G.weapon; G.weapon = weapon; floatText(C.WEAPONS[weapon].name, p.x, p.y - 40, C.WEAPONS[weapon].color); ring(p.x, p.y, 90, C.WEAPONS[weapon].color); sparks(p.x, p.y, C.WEAPONS[weapon].color, 14, 0, Math.PI, 300); say(`무기 교체: ${C.WEAPONS[weapon].name}. ${C.WEAPONS[weapon].note}`); }
    } else if (item.kind === 'bomb') { if (G.bombs < 5) { G.bombs += 1; floatText('BOMB +1', p.x, p.y - 40, '#c084fc'); } else addScore(2000, p.x, p.y - 40); }
    else if (item.kind === 'life') { G.lives = Math.min(6, G.lives + 1); floatText('LIFE +1', p.x, p.y - 40, '#fb7185'); }
    ring(p.x, p.y, 64, ({ power: '#22d3ee', life: '#fb7185', bomb: '#c084fc' })[item.kind] || '#fde68a');
    syncControls();
  }
  const itemWeapon = item => item.cycle[Math.floor(item.age / 1.4) % item.cycle.length];

  function openUpgrade() {
    state = 'upgrade';
    const choices = C.upgradeChoices(G.owned, G, Math.random);
    upgradePanel.replaceChildren(...choices.map((choice, index) => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'upgrade-card';
      const name = document.createElement('strong'); name.textContent = `${index + 1}. ${choice.name}`;
      const note = document.createElement('span'); note.textContent = choice.note;
      button.append(name, note);
      button.addEventListener('click', () => pickUpgrade(choice.id));
      return button;
    }));
    showOverlay('upgrade'); syncControls();
    upgradePanel.querySelector('button')?.focus({ preventScroll: true });
  }
  function pickUpgrade(id) {
    if (state !== 'upgrade') return;
    G.owned[id] = (G.owned[id] || 0) + 1;
    if (id === 'life') G.lives = Math.min(6, G.lives + 1);
    else if (id === 'bomb') G.bombs = Math.min(5, G.bombs + 2);
    else if (id === 'shield') G.shield = true;
    state = 'playing'; G.player.invuln = Math.max(G.player.invuln, 1.5); sfx('power');
    showOverlay(null); startWave(G.wave + 1); syncControls(); canvas.focus({ preventScroll: true });
  }

  // ---------- 한 걸음 ----------
  function step(dt) {
    clock += dt;
    if (!reduced) stars.forEach(s => { s.y += s.speed * dt; if (s.y > H) { s.y = -2; s.x = Math.random() * W; } });
    if (!G || state !== 'playing') return;
    if (G.hitstop > 0) { G.hitstop -= dt; return; }
    const p = G.player, ship = C.SHIPS[G.ship];
    G.critT = Math.max(0, G.critT - dt);
    G.delayed = G.delayed.filter(d => { d.t -= dt; if (d.t > 0) return true; burst(d.x, d.y, d.color, 12, 240); return false; });
    for (const ghost of G.ghosts) ghost.life -= dt; G.ghosts = G.ghosts.filter(ghost => ghost.life > 0);
    G.time += dt; G.bannerT = Math.max(0, G.bannerT - dt); G.shake = Math.max(0, G.shake - dt * 30); G.flash = Math.max(0, G.flash - dt); G.hurt = Math.max(0, G.hurt - dt);
    for (const list of [G.particles, G.blasts, G.rings, G.texts]) { for (const item of list) item.life -= dt; }
    G.particles = G.particles.filter(q => { q.x += q.vx * dt; q.y += q.vy * dt; return q.life > 0; });
    G.blasts = G.blasts.filter(q => q.life > 0); G.rings = G.rings.filter(q => q.life > 0);
    G.texts = G.texts.filter(q => { q.y -= 26 * dt; return q.life > 0; });
    if (G.chainT > 0) { G.chainT -= dt; if (G.chainT <= 0) G.chain = 0; }

    // 격추 연출이 끝나면 결과 화면으로
    if (p.dead > 0) { p.dead -= dt; if (Math.random() < dt * 14) burst(p.x + rand(-18, 18), p.y + rand(-18, 18), '#fb923c', 10); if (p.dead <= 0) endRun(); return; }

    // 이동: 키보드가 우선, 아니면 마우스 따라가기 / 터치는 끈 만큼
    const focus = keys.ShiftLeft || keys.ShiftRight, speed = ship.speed * (focus ? .45 : 1), beforeX = p.x;
    const kx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0), ky = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
    if (kx || ky) { const n = kx && ky ? Math.SQRT1_2 : 1; p.x += kx * speed * n * dt; p.y += ky * speed * n * dt; pointer.active = false; }
    else if (pointer.active) {
      const tx = pointer.touch ? pointer.shipX + pointer.x - pointer.anchorX : pointer.x, ty = pointer.touch ? pointer.shipY + pointer.y - pointer.anchorY : pointer.y;
      const dx = tx - p.x, dy = ty - p.y, distance = Math.hypot(dx, dy), limit = (pointer.touch ? ship.speed * 2.2 : speed) * dt;
      if (distance > .5) { const move = Math.min(distance, limit); p.x += dx / distance * move; p.y += dy / distance * move; }
    }
    p.x = clamp(p.x, 16, W - 16); p.y = clamp(p.y, 24, H - 24);
    p.tilt += (clamp((p.x - beforeX) / dt / 380, -1, 1) - p.tilt) * Math.min(1, dt * 11);
    p.invuln = Math.max(0, p.invuln - dt);
    // EX 단계에서는 빠르게 움직일 때 잔상이 남는다.
    G.ghostT -= dt;
    if (!reduced && G.level >= C.MAX_LEVEL && G.ghostT <= 0 && Math.abs(p.tilt) > .35) { G.ghostT = .05; if (G.ghosts.length < 8) G.ghosts.push({ x: p.x, y: p.y, life: .22 }); }

    // 자동 발사
    p.cooldown -= dt; G.muzzle = Math.max(0, G.muzzle - dt);
    const power = ship.damage * (1 + (G.owned.damage || 0) * .15);
    const launch = (x, y, shot, scale) => G.shots.push({ x: x + shot.dx, y, vx: shot.vx, vy: shot.vy, r: shot.r, dmg: shot.dmg * power * scale, pierce: shot.pierce + (G.owned.pierce || 0), homing: shot.homing, speed: shot.speed, kind: shot.kind, splash: shot.splash, shards: shot.shards, chain: shot.chain, range: shot.range, width: shot.width, bounce: shot.bounce, cancel: shot.cancel, color: C.WEAPONS[shot.kind].color, age: 0, hit: [] });
    if (p.cooldown <= 0 && G.bossDeath <= 0) {
      p.cooldown += C.fireInterval(G.weapon, G.ship, G.owned.rate);
      for (const shot of C.shots(G.weapon, G.level)) launch(p.x, p.y - 22, shot, 1);
      G.muzzle = .06; sfx('shot');
    }
    // 보조 무기: 직전에 쓰던 무기를 낮은 단계, 절반 화력으로 함께 쏜다.
    if (G.sub && G.bossDeath <= 0) {
      G.subT -= dt;
      if (G.subT <= 0) { G.subT += C.fireInterval(G.sub, G.ship, G.owned.rate) * 1.7; for (const shot of C.shots(G.sub, C.subLevel(G.level))) launch(p.x, p.y - 14, shot, .5 + (G.owned.sub || 0) * .25); }
    }
    // 지원기: 기체 양옆을 따라다니며 발칸을 쏜다.
    if (G.owned.option && G.bossDeath <= 0) {
      G.optionT -= dt;
      if (G.optionT <= 0) { G.optionT += .2; for (const o of optionSpots()) launch(o.x, o.y - 10, { dx: 0, vx: 0, vy: -700, r: 3.5, dmg: .7, pierce: 0, kind: 'vulcan' }, 1); }
    }

    // 웨이브 편성표대로 등장
    if (G.plan && G.bossDeath <= 0) {
      G.planT += dt;
      while (G.planI < G.plan.events.length && G.plan.events[G.planI].t <= G.planT) {
        const event = G.plan.events[G.planI++];
        if (event.type === 'boss') G.boss = C.makeBoss(G.wave);
        else if (G.enemies.length < 44) G.enemies.push(C.makeEnemy(event.type, G.wave, event.x, event.y, event));
      }
      if (!G.plan.boss && G.planI >= G.plan.events.length && !G.enemies.length) {
        // 웨이브 돌파: 무피격이면 보너스
        if (!G.waveHits) { const bonus = 300 * G.wave; G.score += bonus; floatText(`NO MISS +${bonus.toLocaleString('en-US')}`, W / 2, H * .42, '#a5f3fc'); }
        startWave(G.wave + 1);
      }
    }

    // 아군 탄
    const targets = G.boss && !G.boss.entering && G.bossDeath <= 0 ? [...G.enemies, G.boss] : G.enemies;
    stepBombs(dt, targets);
    const fresh = [];
    for (const s of G.shots) {
      s.age += dt;
      if (s.homing && s.age < 2.2) {
        let target = null, nearest = Infinity;
        for (const e of targets) { if (e.hp <= 0 || e.y > s.y + 40) continue; const d = (e.x - s.x) ** 2 + (e.y - s.y) ** 2; if (d < nearest) { nearest = d; target = e; } }
        const current = Math.atan2(s.vy, s.vx), wanted = target ? Math.atan2(target.y - s.y, target.x - s.x) : -Math.PI / 2;
        const delta = ((wanted - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI, next = current + clamp(delta, -s.homing * dt, s.homing * dt), v = Math.min(s.speed, Math.hypot(s.vx, s.vy) + 600 * dt);
        s.vx = Math.cos(next) * v; s.vy = Math.sin(next) * v;
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.bounce > 0 && (s.x < 4 || s.x > W - 4)) { s.vx = -s.vx; s.x = clamp(s.x, 4, W - 4); s.bounce -= 1; sparks(s.x, s.y, s.color, 3, s.vx > 0 ? 0 : Math.PI, .8); }
      if (s.cancel) for (const b of G.bullets) if (!b.dead && Math.abs(b.x - s.x) < s.width + b.r && Math.abs(b.y - s.y) < 12 + b.r) { b.dead = true; G.score += 10; sparks(b.x, b.y, s.color, 3, -Math.PI / 2, Math.PI, 140); }
      for (const e of targets) {
        if (e.hp <= 0 || s.hit.includes(e)) continue;
        const halfW = s.width || s.r, halfH = s.width ? 10 : s.r;
        const touching = e.type === 'boss' ? Math.abs(s.x - e.x) < 62 + halfW && Math.abs(s.y - e.y) < 34 + halfH : s.width ? Math.abs(s.x - e.x) < e.r + halfW && Math.abs(s.y - e.y) < e.r + halfH : (s.x - e.x) ** 2 + (s.y - e.y) ** 2 < (e.r + s.r) ** 2;
        if (!touching) continue;
        const crit = G.owned.crit && Math.random() < .05 + G.owned.crit * .1, dealt = s.dmg * (crit ? 2 : 1), hx = s.width ? clamp(s.x, e.x - e.r, e.x + e.r) : s.x;
        damageEnemy(e, dealt * masteryBonus()); s.hit.push(e);
        if (crit && G.critT <= 0) { G.critT = .25; floatText('CRIT', hx, s.y - 12, '#fef08a'); }
        if (!reduced && G.blasts.length < 30) G.blasts.push({ x: hx, y: s.y, color: crit ? '#fef08a' : s.color, r: crit ? 22 : 12, life: .1, small: true });
        sparks(hx, s.y, crit ? '#fef08a' : s.color, crit ? 6 : 2, Math.PI / 2, 1.1);
        if (s.chain) {
          // 번개: 가까운 적으로 차례로 옮겨 붙는다.
          let from = e, left = s.chain; const struck = [e];
          while (left > 0) {
            let next = null, nearest = s.range * s.range;
            for (const other of targets) { if (other.hp <= 0 || struck.includes(other)) continue; const d = (other.x - from.x) ** 2 + (other.y - from.y) ** 2; if (d < nearest) { nearest = d; next = other; } }
            if (!next) break;
            damageEnemy(next, dealt * .7); arc(from.x, from.y, next.x, next.y, s.color); struck.push(next); from = next; left -= 1;
          }
        }
        if (s.splash) {
          explode(s.x, s.y, s.splash, dealt * .6, s.color, targets, e);
          if (s.shards) for (let i = 0; i < s.shards; i += 1) { const a = i / s.shards * Math.PI * 2 + .3; fresh.push({ x: s.x, y: s.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, r: 3.5, dmg: s.dmg * .3, pierce: 0, kind: 'plasma', shard: true, color: s.color, age: 0, hit: [e] }); }
          s.dead = true; break;
        }
        if (s.pierce > 0) s.pierce -= 1; else { s.dead = true; break; }
      }
      if (s.shard && s.age > .35) s.dead = true;
      if (s.y < -30 || s.y > H + 30 || s.x < -30 || s.x > W + 30) s.dead = true;
    }
    if (G.shots.length + fresh.length < 400) G.shots.push(...fresh);
    G.shots = G.shots.filter(s => !s.dead);

    // 적
    for (const e of G.enemies) {
      e.flash = Math.max(0, (e.flash || 0) - dt);
      if (!reduced && e.maxHp >= 6 && e.hp < e.maxHp * .4 && Math.random() < dt * 9 && G.particles.length < 280) G.particles.push({ x: e.x + rand(-6, 6), y: e.y - 8, vx: rand(-14, 14), vy: -50, life: rand(.3, .55), color: Math.random() < .4 ? '#fb923c' : '#64748b', size: rand(2, 4) });
      for (const b of C.stepEnemy(e, dt, p, G.wave)) if (G.bullets.length < 220) G.bullets.push(b);
      if (e.hp > 0 && !e.gone && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < (e.r + 9) ** 2) { hitPlayer(); if (p.invuln > 0 || G.lives <= 0) e.hp = Math.min(e.hp, 0); }
    }
    const dead = G.enemies.filter(e => e.hp <= 0);
    G.enemies = G.enemies.filter(e => e.hp > 0 && !e.gone);
    dead.forEach(killEnemy);

    // 보스
    const boss = G.boss;
    if (boss) {
      boss.flash = Math.max(0, (boss.flash || 0) - dt);
      if (G.bossDeath > 0) {
        G.bossDeath -= dt;
        if (Math.random() < dt * 16) { burst(boss.x + rand(-70, 70), boss.y + rand(-36, 36), Math.random() < .5 ? '#fbbf24' : '#f0abfc', 14); shake(5); }
        if (G.bossDeath <= 0) {
          burst(boss.x, boss.y, '#ffffff', 60, 380); debris(boss.x, boss.y, 26); ring(boss.x, boss.y, 240, '#ffffff'); ring(boss.x, boss.y, 160, C.bossKind(boss).color);
          G.flash = .35; shake(16); sfx('boss'); G.chain += 5; G.chainT = 2.6; addScore(boss.score, boss.x, boss.y, '#f0abfc'); dropGems(boss.x, boss.y, 24);
          dropItem(boss.x - 20, boss.y, 'power'); dropItem(boss.x + 20, boss.y, 'weapon'); G.boss = null; G.pause = 1.5;
        }
      } else {
        for (const b of C.stepBoss(boss, dt, p, Math.random)) if (G.bullets.length < 220) G.bullets.push(b);
        if (boss.beam?.phase === 'active' && p.y > boss.y + 20 && Math.abs(p.x - boss.beam.x) < boss.beam.width / 2 + 3) hitPlayer();
        if (!boss.entering && Math.abs(p.x - boss.x) < 66 && Math.abs(p.y - boss.y) < 38) hitPlayer();
        if (boss.hp <= 0) { G.bossDeath = 1.5; G.bullets = []; boss.beam = null; boss.wallGap = null; announce('TARGET DESTROYED'); say('보스 격파'); }
      }
    } else if (G.pause > 0) { G.pause -= dt; if (G.pause <= 0 && G.plan.boss) { openUpgrade(); return; } }

    // 적탄
    const extra = [];
    for (const b of G.bullets) {
      const spawned = C.stepBullet(b, dt, p);
      if (spawned) extra.push(...spawned);
      if (b.dead || p.invuln > 0) continue;
      const d2 = (b.x - p.x) ** 2 + (b.y - p.y) ** 2;
      if (d2 < (b.r * .7 + 3) ** 2) { hitPlayer(); break; }
      if (!b.grazed && d2 < (b.r + 22) ** 2) { b.grazed = true; G.grazes += 1; G.score += 20; if (!reduced && G.particles.length < 280) G.particles.push({ x: p.x, y: p.y, vx: rand(-90, 90), vy: rand(-90, 90), life: .3, color: '#fbbf24', size: 2 }); }
    }
    G.bullets = G.bullets.filter(b => !b.dead).concat(extra);
    for (const a of G.arcs) a.life -= dt; G.arcs = G.arcs.filter(a => a.life > 0);

    // 보석과 아이템
    for (const gem of G.gems) {
      gem.age += dt;
      if (gem.age < .35) { gem.x += gem.vx * dt; gem.y += gem.vy * dt; gem.vy += 300 * dt; }
      else { const dx = p.x - gem.x, dy = p.y - gem.y, d = Math.hypot(dx, dy) || 1, v = 380 + gem.age * 500; gem.x += dx / d * v * dt; gem.y += dy / d * v * dt; if (d < 18) { gem.dead = true; G.score += Math.round(50 * C.chainMultiplier(G.chain)); sfx('gem'); if (!reduced && G.particles.length < 260) G.particles.push({ x: p.x + rand(-10, 10), y: p.y + rand(-10, 10), vx: rand(-30, 30), vy: rand(-110, -50), life: .25, color: '#fde047', size: 2 }); } }
    }
    G.gems = G.gems.filter(gem => !gem.dead);
    const reach = 80 * (G.owned.magnet ? 2 : 1);
    for (const item of G.items) {
      item.age += dt; item.y += 70 * dt;
      const dx = p.x - item.x, dy = p.y - item.y, d = Math.hypot(dx, dy) || 1;
      if (d < reach) { item.x += dx / d * 300 * dt; item.y += dy / d * 300 * dt; }
      if (d < 22) { item.dead = true; collect(item); } else if (item.y > H + 20) item.dead = true;
    }
    G.items = G.items.filter(item => !item.dead);
  }
  function update(dt) {
    // 프레임이 밀려도 빠른 탄이 적을 뚫고 지나가지 않게 잘게 나눠 계산한다.
    const steps = Math.max(1, Math.ceil(dt / (1 / 60)));
    for (let i = 0; i < steps; i += 1) step(dt / steps);
  }

  // ---------- 그리기 ----------
  const makeCanvas = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
  const rgba = (hex, a) => `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${a})`;
  const glowCache = new Map(), spriteCache = new Map();
  function glowSprite(color) {
    let c = glowCache.get(color);
    if (!c) {
      c = makeCanvas(64, 64); const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, rgba(color, 1)); grad.addColorStop(.35, rgba(color, .45)); grad.addColorStop(1, rgba(color, 0));
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64); glowCache.set(color, c);
    }
    return c;
  }
  function glow(x, y, color, radius, alpha = 1) {
    const before = ctx.globalAlpha, mode = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = before * clamp(alpha, 0, 1);
    ctx.drawImage(glowSprite(color), x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = before; ctx.globalCompositeOperation = mode;
  }
  function sprite(key, w, h, flash) {
    const id = `${key}:${w}x${h}:${flash ? 1 : 0}`;
    let c = spriteCache.get(id);
    if (!c) {
      const raw = makeCanvas(w * 2, h * 2); Sprites.render(raw.getContext('2d'), key, raw.width, raw.height);
      c = makeCanvas(w * 2, h * 2); const g = c.getContext('2d');
      g.shadowColor = 'rgba(2,6,23,.85)'; g.shadowBlur = 5; g.drawImage(raw, c.width * .04, c.height * .04, c.width * .92, c.height * .92); g.shadowBlur = 0;
      g.globalCompositeOperation = 'source-atop';
      const shade = g.createLinearGradient(0, 0, 0, c.height);
      shade.addColorStop(0, 'rgba(255,255,255,.14)'); shade.addColorStop(.5, 'rgba(255,255,255,0)'); shade.addColorStop(1, 'rgba(2,6,23,.28)');
      g.fillStyle = flash ? 'rgba(255,255,255,.85)' : shade; g.fillRect(0, 0, c.width, c.height);
      spriteCache.set(id, c);
    }
    return c;
  }
  function rounded(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function bar(x, y, w, h, ratio, from, to) {
    ctx.fillStyle = 'rgba(2,6,23,.72)'; rounded(x, y, w, h, h / 2); ctx.fill();
    const filled = w * clamp(ratio, 0, 1);
    if (filled > 1) { const fill = ctx.createLinearGradient(x, 0, x + w, 0); fill.addColorStop(0, from); fill.addColorStop(1, to); ctx.fillStyle = fill; rounded(x, y, Math.max(h, filled), h, h / 2); ctx.fill(); }
  }
  function flame(x, y, width, length, color) {
    const grad = ctx.createLinearGradient(0, y, 0, y + length);
    grad.addColorStop(0, 'rgba(255,255,255,.95)'); grad.addColorStop(.3, rgba(color, .85)); grad.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(x - width, y); ctx.quadraticCurveTo(x, y + length * 1.25, x + width, y); ctx.closePath(); ctx.fill();
  }

  const nebula = new Image(); nebula.decoding = 'async'; nebula.src = '/assets/games/space-shooter/space-nebula-v2.png?v=20260824';
  let nebulaTile = null;
  const SECTORS = [{ name: '청색 성운', tint: '#164e63', planet: ['#7dd3fc', '#0c4a6e', '#bae6fd'] }, { name: '자홍 전선', tint: '#701a75', planet: ['#f0abfc', '#581c87', null] }, { name: '황금 회랑', tint: '#78350f', planet: ['#fcd34d', '#78350f', '#fde68a'] }];
  const sector = () => SECTORS[Math.floor((Math.max(1, G ? G.wave : 1) - 1) / 5) % SECTORS.length];
  function drawBackground() {
    const base = ctx.createLinearGradient(0, 0, 0, H); base.addColorStop(0, '#0b1026'); base.addColorStop(1, '#05060f');
    ctx.fillStyle = base; ctx.fillRect(0, 0, W, H);
    if (!nebulaTile && nebula.complete && nebula.naturalWidth) {
      // 원본과 상하 반전본을 이어 붙여 끊김 없이 흐르게 한다.
      const w = W + 36, h = Math.round(w * nebula.naturalHeight / nebula.naturalWidth);
      nebulaTile = makeCanvas(w, h * 2); const g = nebulaTile.getContext('2d');
      g.imageSmoothingQuality = 'high'; g.drawImage(nebula, 0, 0, w, h); g.translate(0, h * 2); g.scale(1, -1); g.drawImage(nebula, 0, 0, w, h);
    }
    if (nebulaTile) { const scroll = reduced ? 0 : (clock * 12) % nebulaTile.height; ctx.globalAlpha = .8; ctx.drawImage(nebulaTile, -18, scroll - nebulaTile.height); ctx.drawImage(nebulaTile, -18, scroll); ctx.globalAlpha = 1; }
    const look = sector(), span = H + 420, travel = reduced ? 300 : clock * 9, cycle = Math.floor(travel / span), radius = 54 + (cycle * 37) % 34;
    ctx.save(); ctx.globalAlpha = .5; ctx.translate(70 + (cycle * 173) % (W - 140), travel % span - 210);
    const body = ctx.createRadialGradient(-radius * .35, -radius * .4, radius * .1, 0, 0, radius);
    body.addColorStop(0, look.planet[0]); body.addColorStop(.75, look.planet[1]); body.addColorStop(1, '#020617');
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.fill();
    if (look.planet[2]) { ctx.strokeStyle = look.planet[2]; ctx.globalAlpha = .32; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(0, 0, radius * 1.7, radius * .34, -.35, 0, Math.PI * 2); ctx.stroke(); }
    ctx.restore();
    const mood = ctx.createLinearGradient(0, 0, 0, H);
    mood.addColorStop(0, rgba(look.tint, .42)); mood.addColorStop(.55, rgba(look.tint, .12)); mood.addColorStop(1, rgba(look.tint, .22));
    ctx.fillStyle = mood; ctx.fillRect(0, 0, W, H);
    stars.forEach((s, index) => {
      const twinkle = reduced ? 1 : .65 + Math.sin(clock * 3.3 + index * 1.7) * .35;
      if (s.size >= 3) { glow(s.x, s.y, '#a5f3fc', 5, .7 * twinkle); ctx.fillStyle = 'rgba(240,253,255,.95)'; ctx.fillRect(s.x - .75, s.y - (reduced ? .75 : 5), 1.5, reduced ? 1.5 : 7); }
      else { ctx.fillStyle = `rgba(203,213,225,${(.35 + s.size * .18) * twinkle})`; ctx.fillRect(s.x, s.y, s.size * .8, s.size * (reduced ? .8 : 1.6)); }
    });
    const vignette = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, H * .74);
    vignette.addColorStop(0, 'rgba(2,6,23,0)'); vignette.addColorStop(1, 'rgba(2,6,23,.55)');
    ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
  }

  const ENGINES = { power: [[-.14, .8], [0, .9], [.14, .8]], balanced: [[-.1, .6], [0, 1], [.1, .6]], speed: [[-.042, .9], [.042, .9]] };
  const THRUST = { power: '#f97316', balanced: '#38bdf8', speed: '#facc15' };
  function drawPlayer() {
    const p = G.player, size = 64, flicker = reduced ? .5 : .5 + Math.sin(clock * 26) * .25 + Math.sin(clock * 77) * .12;
    if (p.dead > 0) return;
    const weaponColor = C.WEAPONS[G.weapon].color;
    for (const ghost of G.ghosts) { ctx.globalAlpha = ghost.life / .22 * .35; ctx.drawImage(sprite(`player-${G.ship}`, size, size), ghost.x - size / 2, ghost.y - size / 2, size, size); } ctx.globalAlpha = 1;
    for (const o of optionSpots()) {
      glow(o.x, o.y + 12, THRUST[G.ship], 7, .8);
      ctx.drawImage(sprite(`player-${G.ship}`, 26, 26), o.x - 13, o.y - 13, 26, 26);
      ctx.strokeStyle = rgba(weaponColor, .7); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(o.x, o.y, 15, reduced ? 0 : clock * 3, (reduced ? 0 : clock * 3) + 4); ctx.stroke();
    }
    if (G.level >= C.MAX_LEVEL) {
      // EX 단계: 기체 둘레에 무기 색 기운이 돈다.
      const spin = reduced ? 0 : clock * 2.6;
      glow(p.x, p.y, weaponColor, 44, .28 + (reduced ? 0 : Math.sin(clock * 6) * .08));
      ctx.save(); ctx.translate(p.x, p.y); ctx.strokeStyle = rgba(weaponColor, .8); ctx.lineWidth = 1.5; ctx.lineCap = 'round';
      for (let i = 0; i < 4; i += 1) { ctx.beginPath(); ctx.arc(0, 0, 40, spin + i * Math.PI / 2, spin + i * Math.PI / 2 + .7); ctx.stroke(); }
      ctx.restore();
    }
    if (G.muzzle > 0 && !reduced) { glow(p.x, p.y - 30, weaponColor, 20, G.muzzle / .06 * .9); glow(p.x, p.y - 30, '#ffffff', 9, G.muzzle / .06); }
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt * .1); ctx.scale(1 - Math.abs(p.tilt) * .16, 1);
    ctx.globalAlpha = p.invuln > 0 && !reduced && Math.floor(clock * 11) % 2 ? .35 : 1;
    ctx.globalCompositeOperation = 'lighter';
    for (const [offset, power] of ENGINES[G.ship]) { flame(offset * size, size * .4, size * .05 * (.7 + power * .5), size * (.3 + flicker * .22) * power, THRUST[G.ship]); glow(offset * size, size * .43, THRUST[G.ship], size * .2 * power, .7); }
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(sprite(`player-${G.ship}`, size, size), -size / 2, -size / 2, size, size);
    ctx.restore();
    if (G.shield) {
      const spin = reduced ? 0 : clock * 1.7;
      ctx.save(); ctx.translate(p.x, p.y);
      const bubble = ctx.createRadialGradient(0, 0, 18, 0, 0, 36);
      bubble.addColorStop(0, 'rgba(103,232,249,0)'); bubble.addColorStop(.8, 'rgba(103,232,249,.16)'); bubble.addColorStop(1, 'rgba(165,243,252,.55)');
      ctx.fillStyle = bubble; ctx.beginPath(); ctx.arc(0, 0, 36, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#cffafe'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i += 1) { ctx.beginPath(); ctx.arc(0, 0, 36, spin + i * 2.094, spin + i * 2.094 + 1.2); ctx.stroke(); }
      ctx.restore();
    }
    // 피격 판정은 기체 중심의 작은 점이다. 느린 이동 중에는 또렷하게 보여 준다.
    if (keys.ShiftLeft || keys.ShiftRight) { glow(p.x, p.y, '#f8fafc', 9, .9); ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke(); }
  }
  function drawEnemy(e) {
    const size = C.ENEMIES[e.type].size, pulse = reduced ? .5 : .5 + Math.sin(clock * 9 + e.x) * .5;
    ctx.save(); ctx.translate(e.x, e.y);
    if (e.locked && e.wait > 0 && !reduced) ctx.translate(Math.sin(clock * 55) * 1.5, 0);
    glow(0, -size * .4, '#fb923c', size * .28, .4 + pulse * .3);
    ctx.drawImage(sprite(e.type, size, size), -size / 2, -size / 2, size, size);
    if (e.flash > 0 && !reduced) { ctx.globalAlpha = .8; ctx.drawImage(sprite(e.type, size, size, true), -size / 2, -size / 2, size, size); }
    ctx.restore();
    if (e.locked && e.wait > 0) { ctx.save(); ctx.strokeStyle = 'rgba(251,146,60,.75)'; ctx.lineWidth = 2; ctx.setLineDash([7, 7]); ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.aimX, e.aimY); ctx.stroke(); ctx.restore(); }
    if (e.aim > 0) { ctx.save(); ctx.strokeStyle = `rgba(248,113,113,${(1 - e.aim / .8 * .6).toFixed(2)})`; ctx.lineWidth = 1 + (1 - e.aim / .8) * 3; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + Math.cos(e.aimAngle) * 900, e.y + Math.sin(e.aimAngle) * 900); ctx.stroke(); ctx.restore(); }
    if (e.hp < e.maxHp && e.maxHp >= 10) bar(e.x - 18, e.y + size / 2 + 2, 36, 4, e.hp / e.maxHp, '#22d3ee', '#a5f3fc');
  }
  function drawBoss(boss) {
    const kind = C.bossKind(boss), w = 214, h = 150, pulse = reduced ? .5 : .5 + Math.sin(clock * 8) * .5, rage = C.bossEnraged(boss);
    if (boss.beam) {
      const active = boss.beam.phase === 'active', left = boss.beam.x - boss.beam.width / 2, top = boss.y + 30;
      ctx.save();
      if (active) {
        const core = ctx.createLinearGradient(left, 0, left + boss.beam.width, 0);
        core.addColorStop(0, 'rgba(244,63,94,.15)'); core.addColorStop(.3, 'rgba(251,113,133,.85)'); core.addColorStop(.5, 'rgba(255,255,255,.98)'); core.addColorStop(.7, 'rgba(251,113,133,.85)'); core.addColorStop(1, 'rgba(244,63,94,.15)');
        ctx.fillStyle = core; ctx.fillRect(left, top, boss.beam.width, H - top); glow(boss.beam.x, top + 6, '#fb7185', boss.beam.width * 1.1, .9);
      } else { ctx.fillStyle = 'rgba(251,191,36,.14)'; ctx.fillRect(left, top, boss.beam.width, H - top); ctx.strokeStyle = '#fbbf24'; ctx.setLineDash([8, 6]); ctx.strokeRect(left, top, boss.beam.width, H - top); }
      ctx.restore();
    }
    if (boss.wallGap !== null) {
      ctx.save(); ctx.fillStyle = 'rgba(134,239,172,.14)'; ctx.fillRect(boss.wallGap - 50, boss.y + 50, 100, H);
      ctx.strokeStyle = '#86efac'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.strokeRect(boss.wallGap - 50, boss.y + 50, 100, H);
      ctx.fillStyle = '#bbf7d0'; ctx.font = 'bold 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('안전 틈', boss.wallGap, 230); ctx.restore();
    }
    ctx.save(); ctx.translate(boss.x, boss.y);
    if (G.bossDeath > 0 && !reduced) ctx.translate(rand(-3, 3), rand(-3, 3));
    glow(0, -h * .3, kind.color, 60, .4 + pulse * .3);
    if (rage) glow(0, 0, '#ef4444', 130, .3 + pulse * .25);
    ctx.drawImage(sprite(`boss-${kind.id}`, w, h), -w / 2, -h / 2, w, h);
    if (boss.flash > 0 && !reduced) { ctx.globalAlpha = .7; ctx.drawImage(sprite(`boss-${kind.id}`, w, h, true), -w / 2, -h / 2, w, h); ctx.globalAlpha = 1; }
    // 손상 단계: 체력이 줄수록 선체에서 불꽃이 튄다.
    const damage = 1 - clamp(boss.hp / boss.maxHp, 0, 1);
    if (damage > .3 && !reduced) for (let i = 0; i < Math.ceil(damage * 4); i += 1) { const seed = Math.floor(clock * 7) * 7 + i * 13; glow(Math.sin(seed * 1.7) * w * .32, Math.cos(seed * 2.3) * h * .25, i % 2 ? '#fbbf24' : '#fb7185', 7 + (seed % 5), .8); }
    ctx.restore();
  }
  function drawShot(s) {
    const r = s.r;
    glow(s.x, s.y, s.color, r * 2.2 + 4, .6);
    ctx.fillStyle = s.color;
    if (s.kind === 'laser') { rounded(s.x - r * .5, s.y - 15, r, 30, r * .5); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(s.x - r * .17, s.y - 13, r * .34, 24); }
    else if (s.kind === 'missile') {
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vy, s.vx) + Math.PI / 2);
      flame(0, r * .8, r * .5, 9, '#fb923c'); ctx.fillStyle = s.color; ctx.beginPath(); ctx.moveTo(0, -r * 1.8); ctx.lineTo(r * .8, r); ctx.lineTo(-r * .8, r); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -r * .5, r * .3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    } else if (s.kind === 'plasma') {
      const pulse = reduced ? 1 : 1 + Math.sin(clock * 30 + s.x) * .12;
      glow(s.x, s.y, s.color, r * 3 * pulse, .5); ctx.beginPath(); ctx.arc(s.x, s.y, r * pulse, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(s.x - r * .2, s.y - r * .2, r * .5, 0, Math.PI * 2); ctx.fill();
      if (!s.shard) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(s.x, s.y, r * 1.5, r * .5, reduced ? .5 : clock * 9, 0, Math.PI * 2); ctx.stroke(); }
    } else if (s.kind === 'chain') {
      ctx.save(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.shadowColor = s.color; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(s.x, s.y - 14);
      const jag = reduced ? 0 : Math.floor(clock * 40);
      for (let i = 1; i <= 4; i += 1) ctx.lineTo(s.x + (((i + jag) % 2) * 2 - 1) * 4.5, s.y - 14 + i * 7);
      ctx.stroke(); ctx.restore();
    } else if (s.kind === 'wave') {
      const w = s.width || 20;
      ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(Math.atan2(s.vx, -s.vy)); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      for (const [width, color, alpha] of [[7, s.color, .45], [3.5, s.color, .9], [1.5, '#ffffff', 1]]) { ctx.globalAlpha = alpha; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(-w, 9); ctx.quadraticCurveTo(0, -13, w, 9); ctx.stroke(); }
      ctx.restore();
    } else { ctx.beginPath(); ctx.ellipse(s.x, s.y, r * .7, r * 1.6, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(s.x, s.y - r * .2, r * .28, r * .9, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  function drawBullet(b) {
    const color = b.color || '#fda4af';
    ctx.save(); ctx.translate(b.x, b.y); glow(0, 0, color, b.r * 2.4 + 3, .55); ctx.fillStyle = color;
    if (b.kind === 'missile') { ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2); flame(0, b.r * .7, b.r * .45, 9, '#fde047'); ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, -b.r * 1.6); ctx.lineTo(b.r * .75, b.r); ctx.lineTo(0, b.r * .65); ctx.lineTo(-b.r * .75, b.r); ctx.closePath(); ctx.fill(); }
    else if (b.kind === 'mine') {
      ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 8; k += 1) { ctx.save(); ctx.rotate(Math.PI / 8 + k * Math.PI / 4); ctx.fillRect(b.r - 1, -1.5, 6, 3); ctx.restore(); }
      ctx.fillStyle = b.fuse < .5 || Math.floor(b.fuse * 5) % 2 ? '#fef3c7' : '#7c2d12'; ctx.beginPath(); ctx.arc(0, 0, b.r * .4, 0, Math.PI * 2); ctx.fill();
    } else if (b.kind === 'needle') { ctx.rotate(Math.atan2(b.vy, b.vx)); rounded(-b.r * 3.5, -b.r * .6, b.r * 7, b.r * 1.2, b.r * .6); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillRect(-b.r, -b.r * .22, b.r * 4, b.r * .44); }
    else { ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(0, 0, b.r * .48, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = .55; ctx.strokeStyle = '#450a0a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, b.r + 1, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  function drawItem(item) {
    const weapon = item.kind === 'weapon' ? C.WEAPONS[itemWeapon(item)] : null;
    const color = item.kind === 'power' ? '#22d3ee' : weapon ? weapon.color : item.kind === 'life' ? '#fb7185' : '#c084fc';
    const label = item.kind === 'power' ? 'P' : weapon ? weapon.letter : item.kind === 'life' ? '♥' : 'B', pulse = reduced ? .5 : .5 + Math.sin(clock * 4.5 + item.x) * .5;
    ctx.save(); ctx.translate(item.x, item.y); glow(0, 0, color, 22 + pulse * 5, .55);
    ctx.save(); ctx.rotate(reduced ? 0 : clock * 1.4); ctx.strokeStyle = rgba(color, .8); ctx.lineWidth = 1.5; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    const box = ctx.createLinearGradient(0, -11, 0, 11); box.addColorStop(0, '#ffffff'); box.addColorStop(.25, color); box.addColorStop(1, rgba(color, .75));
    ctx.fillStyle = box; rounded(-11, -11, 22, 22, 6); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#0f172a'; ctx.font = 'bold 14px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 1); ctx.restore();
  }
  function drawHud() {
    const scrim = ctx.createLinearGradient(0, 0, 0, 62); scrim.addColorStop(0, 'rgba(2,6,23,.78)'); scrim.addColorStop(1, 'rgba(2,6,23,0)');
    ctx.fillStyle = scrim; ctx.fillRect(0, 0, W, 62);
    const boss = G.boss;
    if (boss?.entering && !reduced) {
      ctx.save(); ctx.globalAlpha = .7;
      for (const y of [108, H - 78]) { ctx.fillStyle = '#7f1d1d'; ctx.fillRect(0, y, W, 12); ctx.fillStyle = '#fbbf24'; ctx.beginPath(); for (let x = -40 + (clock * 83) % 28; x < W + 20; x += 28) { ctx.moveTo(x, y + 12); ctx.lineTo(x + 10, y); ctx.lineTo(x + 20, y); ctx.lineTo(x + 10, y + 12); ctx.closePath(); } ctx.fill(); }
      ctx.restore();
    }
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.fillStyle = '#f8fafc'; ctx.font = 'bold 20px system-ui, sans-serif'; ctx.fillText(G.score.toLocaleString('en-US'), 12, 9);
    if (G.chain > 1) {
      const fresh = clamp(G.chainT / 2.6, 0, 1), pop = reduced ? 0 : Math.max(0, fresh - .9) * 60;
      ctx.font = `bold ${Math.round(14 + pop)}px system-ui, sans-serif`; ctx.fillStyle = G.chain >= 20 ? '#fb923c' : '#fcd34d';
      ctx.fillText(`×${C.chainMultiplier(G.chain).toFixed(1)} · ${G.chain} CHAIN`, 12, 34); bar(12, 53, 96, 3, fresh, '#f59e0b', '#fde68a');
    }
    ctx.textAlign = 'right'; ctx.font = 'bold 13px system-ui, sans-serif';
    for (let i = 0; i < Math.max(G.lives, C.SHIPS[G.ship].lives); i += 1) { ctx.fillStyle = i < G.lives ? '#fb7185' : 'rgba(148,163,184,.35)'; ctx.fillText('♥', W - 12 - i * 14, 10); }
    for (let i = 0; i < G.bombs; i += 1) { glow(W - 18 - i * 14, 36, '#c084fc', 7, .9); ctx.fillStyle = '#e9d5ff'; ctx.beginPath(); ctx.arc(W - 18 - i * 14, 36, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.textAlign = 'center';
    if (boss && !boss.entering) {
      const kind = C.bossKind(boss), rage = C.bossEnraged(boss);
      ctx.fillStyle = 'rgba(2,6,23,.78)'; rounded(96, 20, W - 192, 14, 7); ctx.fill();
      bar(100, 23, W - 200, 8, boss.hp / boss.maxHp, rage ? '#e11d48' : kind.color, rage ? '#fda4af' : '#ffffff');
      ctx.fillStyle = '#fb7185'; ctx.fillRect(100 + (W - 200) * .5 - 1, 21, 2, 12);
      ctx.font = 'bold 11px system-ui, sans-serif'; ctx.fillStyle = rage ? '#fecdd3' : kind.color; ctx.fillText(`${kind.name}${rage ? ' · 과부하' : ''}`, W / 2, 6);
      if (boss.rest > 0 && G.bossDeath <= 0) { ctx.fillStyle = '#fde68a'; ctx.fillText(`다음 · ${C.ATTACK_NAMES[C.nextAttack(boss)]}`, W / 2, 38); }
    } else { ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillStyle = '#a5f3fc'; ctx.fillText(`WAVE ${G.wave}`, W / 2, 10); ctx.font = '11px system-ui'; ctx.fillStyle = '#94a3b8'; ctx.fillText(sector().name, W / 2, 28); }
    // 하단: 무기와 강화 단계
    const weapon = C.WEAPONS[G.weapon];
    ctx.textAlign = 'left'; ctx.font = 'bold 12px system-ui, sans-serif'; ctx.fillStyle = weapon.color; ctx.fillText(weapon.name, 12, H - 24);
    const offset = ctx.measureText(weapon.name).width + 20;
    for (let i = 0; i < C.MAX_LEVEL - 1; i += 1) { ctx.fillStyle = i < G.level ? weapon.color : 'rgba(148,163,184,.3)'; rounded(offset + i * 11, H - 22, 8, 8, 2); ctx.fill(); }
    if (G.sub) { const subWeapon = C.WEAPONS[G.sub]; ctx.fillStyle = rgba(subWeapon.color, .85); ctx.font = '11px system-ui, sans-serif'; ctx.fillText(`+ ${subWeapon.name}`, offset + 82, H - 23); ctx.font = 'bold 12px system-ui, sans-serif'; }
    const stars = masteryTier(G.weapon); if (stars) { ctx.fillStyle = '#fde68a'; ctx.fillText('★'.repeat(stars), 12, H - 40); }
    const ex = G.level >= C.MAX_LEVEL; if (ex) glow(offset + 67, H - 18, '#fef08a', 12, reduced ? .6 : .5 + Math.sin(clock * 6) * .3);
    ctx.fillStyle = ex ? '#fef08a' : 'rgba(148,163,184,.4)'; ctx.fillText('EX', offset + 58, H - 24);
    if (!G.plan.boss) { bar(12, H - 9, W - 24, 3, G.planI / Math.max(1, G.plan.events.length), '#0891b2', '#67e8f9'); }
    if (G.bannerT > 0) {
      const alert = G.banner.startsWith('WARNING'), accent = alert ? '#fb7185' : G.banner.startsWith('TARGET') ? '#fbbf24' : '#67e8f9', enter = reduced ? 1 : clamp((2.2 - G.bannerT) / .18, 0, 1);
      ctx.save(); ctx.globalAlpha = Math.min(1, G.bannerT) * enter; ctx.translate(W / 2, 170); ctx.scale(1, .6 + enter * .4);
      const band = ctx.createLinearGradient(-W / 2, 0, W / 2, 0); band.addColorStop(0, 'rgba(2,6,23,0)'); band.addColorStop(.18, 'rgba(2,6,23,.9)'); band.addColorStop(.82, 'rgba(2,6,23,.9)'); band.addColorStop(1, 'rgba(2,6,23,0)');
      ctx.fillStyle = band; ctx.fillRect(-W / 2, -24, W, 48);
      const line = ctx.createLinearGradient(-W / 2, 0, W / 2, 0); line.addColorStop(0, rgba(accent, 0)); line.addColorStop(.5, accent); line.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = line; ctx.fillRect(-W / 2, -25, W, 2); ctx.fillRect(-W / 2, 23, W, 2);
      ctx.fillStyle = alert ? '#fecdd3' : '#ecfeff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 22px system-ui'; ctx.shadowColor = accent; ctx.shadowBlur = 10; ctx.fillText(G.banner, 0, 1); ctx.restore();
    }
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
    G.texts.forEach(n => { const size = reduced ? 13 : 13 + Math.max(0, n.life - .7) * 22; ctx.save(); ctx.globalAlpha = Math.min(1, n.life * 2); ctx.font = `bold ${size.toFixed(1)}px system-ui`; ctx.lineWidth = 3; ctx.strokeStyle = '#020617'; ctx.strokeText(n.text, n.x, n.y); ctx.fillStyle = n.color; ctx.fillText(n.text, n.x, n.y); ctx.restore(); });
  }
  function draw() {
    ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high'; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    drawBackground();
    if (!G) return;
    ctx.save();
    if (G.shake > 0) ctx.translate(rand(-G.shake, G.shake) * .5, rand(-G.shake, G.shake) * .5);
    G.gems.forEach(gem => { glow(gem.x, gem.y, '#fde047', 9, .8); ctx.save(); ctx.translate(gem.x, gem.y); ctx.rotate(Math.PI / 4 + (reduced ? 0 : gem.age * 6)); ctx.fillStyle = '#fef9c3'; ctx.fillRect(-3, -3, 6, 6); ctx.restore(); });
    G.items.forEach(drawItem);
    if (!reduced) { ctx.save(); ctx.globalAlpha = .3; ctx.lineCap = 'round'; ctx.globalCompositeOperation = 'lighter'; G.shots.forEach(s => { ctx.strokeStyle = s.color; ctx.lineWidth = Math.max(1.5, s.r * .7); ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * .035, s.y - s.vy * .035); ctx.stroke(); }); ctx.restore(); }
    if (G.beam) {
      const p = G.player, fade = clamp(G.beam.t / .25, 0, 1), half = 34 * (reduced ? 1 : .9 + Math.sin(clock * 50) * .1);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade;
      const core = ctx.createLinearGradient(p.x - half, 0, p.x + half, 0);
      core.addColorStop(0, 'rgba(134,239,172,0)'); core.addColorStop(.3, 'rgba(134,239,172,.8)'); core.addColorStop(.5, '#ffffff'); core.addColorStop(.7, 'rgba(134,239,172,.8)'); core.addColorStop(1, 'rgba(134,239,172,0)');
      ctx.fillStyle = core; ctx.fillRect(p.x - half, 0, half * 2, p.y - 20); ctx.restore();
      glow(p.x, p.y - 26, '#86efac', 46, fade);
    }
    G.shots.forEach(drawShot);
    G.enemies.forEach(drawEnemy);
    if (G.boss) drawBoss(G.boss);
    G.bullets.forEach(drawBullet);
    drawPlayer();
    G.blasts.forEach(blast => { const span = blast.small ? .1 : .28, t = 1 - blast.life / span, radius = blast.r * (.45 + t * .7); glow(blast.x, blast.y, blast.color, radius, (1 - t) * .9); glow(blast.x, blast.y, '#ffffff', radius * .5, (1 - t) * (1 - t)); });
    ctx.save(); ctx.lineCap = 'round';
    G.particles.forEach(q => {
      const alpha = clamp(q.life * 2, 0, 1);
      if (q.shard) { ctx.save(); ctx.globalAlpha = alpha; ctx.translate(q.x, q.y); ctx.rotate(q.spin * q.life); ctx.fillStyle = q.color; ctx.beginPath(); ctx.moveTo(-q.size, -q.size * .5); ctx.lineTo(q.size, 0); ctx.lineTo(-q.size * .4, q.size * .7); ctx.closePath(); ctx.fill(); ctx.restore(); return; }
      glow(q.x, q.y, q.color, q.size * 2.4, alpha); ctx.globalAlpha = alpha; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = q.size * .45; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * .025, q.y - q.vy * .025); ctx.stroke();
    });
    ctx.restore();
    if (G.arcs.length) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const a of G.arcs) {
        const alpha = clamp(a.life / .16, 0, 1);
        for (const [width, color] of [[6, a.color], [2, '#ffffff']]) { ctx.globalAlpha = alpha * (width > 3 ? .5 : 1); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); a.points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
        const end = a.points[a.points.length - 1]; glow(end[0], end[1], a.color, 16, alpha);
      }
      ctx.restore();
    }
    G.rings.forEach(r => { const t = 1 - r.life / .35; ctx.save(); ctx.globalAlpha = (1 - t) * .8; ctx.strokeStyle = r.color; ctx.lineWidth = 3 * (1 - t) + 1; ctx.beginPath(); ctx.arc(r.x, r.y, 6 + r.max * t, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); });
    ctx.restore();
    if (G.flash > 0 && !reduced) { ctx.fillStyle = `rgba(207,250,254,${(G.flash / .35 * .28).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
    const danger = G.lives === 1 && G.player.dead <= 0 ? (reduced ? .2 : .12 + (.5 + Math.sin(clock * 3.8) * .5) * .16) : 0, edge = Math.max(danger, G.hurt / .45 * .45);
    if (edge > 0) { const grad = ctx.createRadialGradient(W / 2, H / 2, H * .34, W / 2, H / 2, H * .78); grad.addColorStop(0, 'rgba(225,29,72,0)'); grad.addColorStop(1, `rgba(225,29,72,${edge.toFixed(3)})`); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H); }
    drawHud();
  }

  // ---------- 화면 덮개와 버튼 ----------
  const statusEl = el('statusEl');
  function say(text) { if (statusEl) statusEl.textContent = text; }
  function showOverlay(mode) {
    overlay.classList.toggle('hidden', !mode);
    shipPanel.classList.toggle('hidden', mode !== 'title' && mode !== 'over');
    upgradePanel.classList.toggle('hidden', mode !== 'upgrade');
    startBtn.classList.toggle('hidden', mode === 'upgrade');
    quitBtn.classList.toggle('hidden', mode !== 'pause');
    if (mode === 'title') { overlayTitle.textContent = '1945EX'; overlayText.textContent = `기체를 고르고 출격하세요. 최고 ${best.toLocaleString('en-US')}점`; startBtn.textContent = '출격'; }
    else if (mode === 'pause') { overlayTitle.textContent = '일시정지'; overlayText.textContent = `점수 ${G.score.toLocaleString('en-US')} · 웨이브 ${G.wave}`; startBtn.textContent = '계속하기'; }
    else if (mode === 'upgrade') { overlayTitle.textContent = '보스 격파'; overlayText.textContent = '강화 하나를 고르세요.'; }
    else if (mode === 'over') {
      overlayTitle.textContent = `게임 오버 · ${C.grade(G.score)}`; startBtn.textContent = '다시 출격';
      overlayText.textContent = `점수 ${G.score.toLocaleString('en-US')} · 최고 ${best.toLocaleString('en-US')} · 웨이브 ${G.wave} · 격추 ${G.kills} · 최대 ${G.bestChain} 연쇄`;
      say(`게임 오버. 점수 ${G.score}`);
    }
    if (mode && mode !== 'upgrade') startBtn.focus({ preventScroll: true });
  }
  function syncControls() {
    const playing = state === 'playing';
    el('bombBtn').disabled = !playing || !G || G.bombs <= 0;
    el('bombBtn').textContent = `💣 봄 ${G ? G.bombs : 2}`;
    el('pauseBtn').disabled = state !== 'playing' && state !== 'paused';
    el('pauseBtn').textContent = state === 'paused' ? '▶' : '⏸';
    el('pauseBtn').setAttribute('aria-label', state === 'paused' ? '계속하기' : '일시정지');
    el('soundBtn').textContent = muted ? '🔇' : '🔊';
    el('soundBtn').setAttribute('aria-label', muted ? '소리 켜기' : '소리 끄기'); el('soundBtn').setAttribute('aria-pressed', String(!muted));
  }
  function toggleSound() {
    muted = !muted; store.set('spaceShooterMuted', muted);
    if (muted) audio?.suspend?.(); else { ensureAudio(); audio?.resume?.(); }
    syncControls();
  }
  const shell = el('gameShell');
  async function toggleFullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await shell.requestFullscreen(); } catch { say('전체화면을 사용할 수 없습니다.'); } }

  shipPanel.querySelectorAll('.ship-choice').forEach(button => {
    const art = button.querySelector('canvas');
    if (art) Sprites.render(art.getContext('2d'), `player-${button.dataset.ship}`, art.width, art.height);
    button.setAttribute('aria-pressed', String(button.dataset.ship === selectedShip));
    button.addEventListener('click', () => {
      selectedShip = button.dataset.ship; store.set('spaceShooterShip', selectedShip);
      shipPanel.querySelectorAll('.ship-choice').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    });
  });
  startBtn.addEventListener('click', () => { if (state === 'paused') togglePause(); else if (state === 'title' || state === 'over') startGame(); });
  quitBtn.addEventListener('click', toTitle);
  el('bombBtn').addEventListener('click', () => { useBomb(); canvas.focus({ preventScroll: true }); });
  el('pauseBtn').addEventListener('click', togglePause);
  el('soundBtn').addEventListener('click', toggleSound);
  el('fullscreenBtn').addEventListener('click', toggleFullscreen);
  if (!document.fullscreenEnabled) el('fullscreenBtn').disabled = true;

  // ---------- 입력 ----------
  document.addEventListener('keydown', event => {
    if (event.target?.matches?.('input, select, textarea')) return;
    if (state === 'upgrade' && /^(Digit|Numpad)[1-3]$/.test(event.code)) { event.preventDefault(); if (!event.repeat) upgradePanel.children[Number(event.code.slice(-1)) - 1]?.click(); return; }
    if (event.target?.closest?.('button') && ['Space', 'Enter'].includes(event.code)) return;
    keys[event.code] = true;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) event.preventDefault();
    if (event.repeat) return;
    if (event.code === 'KeyB' || event.code === 'KeyX') useBomb();
    else if (event.code === 'KeyP' || event.code === 'Escape') togglePause();
    else if (event.code === 'KeyF') toggleFullscreen();
    else if (event.code === 'KeyM') toggleSound();
    else if ((event.code === 'Space' || event.code === 'Enter') && (state === 'title' || state === 'over')) startGame();
  });
  document.addEventListener('keyup', event => { keys[event.code] = false; });
  function point(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * W / rect.width, y: (event.clientY - rect.top) * H / rect.height }; }
  canvas.addEventListener('pointerdown', event => {
    if (state !== 'playing') return;
    if (event.pointerType === 'touch' && pointer.id !== null && event.pointerId !== pointer.id) { useBomb(); return; }   // 두 번째 손가락은 봄
    if (event.pointerType === 'mouse' && event.button === 2) { useBomb(); return; }
    const at = point(event);
    Object.assign(pointer, { active: true, touch: event.pointerType !== 'mouse', id: event.pointerId, x: at.x, y: at.y, anchorX: at.x, anchorY: at.y, shipX: G.player.x, shipY: G.player.y });
    try { canvas.setPointerCapture(event.pointerId); } catch {}
  });
  canvas.addEventListener('pointermove', event => {
    if (state !== 'playing') return;
    if (event.pointerType === 'mouse') { const at = point(event); Object.assign(pointer, { active: true, touch: false, x: at.x, y: at.y }); }
    else if (event.pointerId === pointer.id) { const at = point(event); pointer.x = at.x; pointer.y = at.y; }
  });
  for (const name of ['pointerup', 'pointercancel']) canvas.addEventListener(name, event => { if (event.pointerId === pointer.id) { pointer.id = null; if (pointer.touch) pointer.active = false; } });
  canvas.addEventListener('pointerleave', event => { if (event.pointerType === 'mouse') pointer.active = false; });
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  function suspend() { Object.keys(keys).forEach(key => delete keys[key]); pointer.active = false; pointer.id = null; if (state === 'playing') togglePause(); }
  window.addEventListener('blur', suspend);
  document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });

  // ---------- 화면 크기와 반복 ----------
  function resize() { pixelScale = Math.min(2, window.devicePixelRatio || 1); canvas.width = Math.round(W * pixelScale); canvas.height = Math.round(H * pixelScale); }
  window.addEventListener('resize', resize); resize();
  let last = 0, running = true;
  function frame(now) {
    if (running) { update(Math.min(.05, Math.max(0, (now - last) / 1000) || .016)); draw(); }
    last = now; requestAnimationFrame(frame);
  }
  showOverlay('title'); syncControls();
  requestAnimationFrame(now => { last = now; requestAnimationFrame(frame); });

  // 브라우저 검증용 창구. 게임 진행에는 쓰지 않는다.
  window.ShooterGame = {
    get state() { return state; }, get run() { return G; }, get best() { return best; },
    start(ship) { if (ship && C.SHIPS[ship]) selectedShip = ship; startGame(); }, update, draw, startWave, useBomb, hitPlayer, pickUpgrade, togglePause, toTitle,
    give(kind) { collect({ kind, age: 0, cycle: [G.weapon] }); },
    spawn(type, x, y, extra) { const e = C.makeEnemy(type, G.wave, x, y, extra); G.enemies.push(e); return e; },
    freeze(value) { running = !value; }, setReduced(value) { reduced = Boolean(value); }
  };
})();
