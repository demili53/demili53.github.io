/* 비행기 게임 규칙. 화면·입력과 무관한 순수 계산만 담아 node로 검증한다. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShooterCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const W = 480, H = 640, MAX_LEVEL = 6;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  const SHIPS = {
    power: { name: '파워형', note: '공격 +35% · 느림', speed: 270, damage: 1.35, rate: 1.1, lives: 3 },
    balanced: { name: '균형형', note: '라이프 +1', speed: 330, damage: 1, rate: 1, lives: 4 },
    speed: { name: '스피드형', note: '속도·연사 +20%', speed: 400, damage: .85, rate: .82, lives: 3 }
  };
  const WEAPONS = {
    vulcan: { name: '발칸', letter: 'V', color: '#67e8f9', interval: .11, note: '정면 집중 연사', ex: '날개 사격 추가', bomb: '전방위 탄막' },
    spread: { name: '스프레드', letter: 'S', color: '#fde047', interval: .17, note: '넓게 퍼지는 산탄', ex: '벽에 튕기는 탄', bomb: '도탄 산탄' },
    laser: { name: '레이저', letter: 'L', color: '#86efac', interval: .16, note: '적을 꿰뚫는 광선', ex: '굵은 무한 관통', bomb: '레이저 포격' },
    missile: { name: '미사일', letter: 'M', color: '#fda4af', interval: .3, note: '적을 쫓는 유도탄', ex: '명중 시 폭발', bomb: '미사일 일제 사격' },
    plasma: { name: '플라즈마', letter: 'Z', color: '#c4b5fd', interval: .42, note: '느리지만 넓게 터지는 구체', ex: '폭발이 파편으로 갈라짐', bomb: '플라즈마 붕괴' },
    chain: { name: '번개', letter: 'C', color: '#7dd3fc', interval: .2, note: '주변 적으로 옮겨 붙는 전격', ex: '5번 연쇄', bomb: '번개 폭풍' },
    wave: { name: '파동', letter: 'W', color: '#f0abfc', interval: .26, note: '폭넓게 훑는 관통 파동', ex: '적탄을 지움', bomb: '대파동' }
  };
  const WEAPON_KEYS = Object.keys(WEAPONS);

  /** 한 번 발사할 때 나가는 탄 목록. dx는 기체 중심에서의 가로 위치. 단계 6은 무기마다 성질이 바뀌는 EX 단계다. */
  function shots(weapon, level) {
    const lv = clamp(Math.round(level), 1, MAX_LEVEL), ex = lv >= MAX_LEVEL, out = [];
    const add = (dx, vx, vy, r, dmg, extra) => out.push(Object.assign({ dx, vx, vy, r, dmg, pierce: 0, kind: weapon }, extra));
    if (weapon === 'spread') {
      const count = [3, 5, 5, 7, 7, 9][lv - 1];
      for (let i = 0; i < count; i += 1) { const n = i - (count - 1) / 2; add(n * 4, n * 62, -560 + Math.abs(n) * 12, 4.5, lv >= 3 ? 1.3 : 1, ex ? { bounce: 2 } : null); }
    } else if (weapon === 'laser') {
      const lanes = [1, 1, 2, 2, 3, 3][lv - 1];
      for (let i = 0; i < lanes; i += 1) add((i - (lanes - 1) / 2) * (ex ? 16 : 12), 0, -900, ex ? 6 : 3.5, 1.4 + lv * .3, { pierce: ex ? 99 : 3 + lv });
    } else if (weapon === 'missile') {
      const count = [2, 2, 4, 4, 6, 6][lv - 1];
      for (let i = 0; i < count; i += 1) { const n = i - (count - 1) / 2; add(n * 10, n * 70, -260, 5, 2.2 + lv * .2, Object.assign({ homing: 4 + lv * .4, speed: 430 + lv * 15 }, ex ? { splash: 46 } : null)); }
      add(0, 0, -640, 3.5, 1, { kind: 'vulcan' });
    } else if (weapon === 'plasma') {
      const count = [1, 1, 2, 2, 3, 3][lv - 1];
      for (let i = 0; i < count; i += 1) { const n = i - (count - 1) / 2; add(n * 20, n * 46, -390, 8 + lv * .7, 3.6 + lv * 1.1, Object.assign({ splash: 42 + lv * 6 }, ex ? { shards: 6 } : null)); }
    } else if (weapon === 'chain') {
      const count = lv >= 4 ? 2 : 1;
      for (let i = 0; i < count; i += 1) add((i - (count - 1) / 2) * 16, 0, -780, 5, 1.4 + lv * .32, { chain: ex ? 5 : 1 + Math.floor(lv / 2), range: ex ? 170 : 110 + lv * 6 });
    } else if (weapon === 'wave') {
      add(0, 0, -520, 6, 1.5 + lv * .4, Object.assign({ pierce: 99, width: 18 + lv * 6 }, ex ? { cancel: true } : null));
      if (lv >= 4) for (const side of [-1, 1]) add(side * 8, side * 150, -480, 6, .9 + lv * .15, { pierce: 99, width: 14 + lv * 2 });
    } else {
      const lanes = Math.min(lv, 5);
      for (let i = 0; i < lanes; i += 1) add((i - (lanes - 1) / 2) * 9, (i - (lanes - 1) / 2) * 14, -680, 4, ex ? 1.15 : 1);
      if (ex) for (const side of [-1, 1]) add(side * 22, side * 210, -640, 4, 1.15);
    }
    return out;
  }
  /** 보조 무기는 주 무기보다 두 단계 낮게, 최대 3단계로 나간다. */
  const subLevel = level => clamp(level - 2, 1, 3);
  /** 무기 숙련: 그 무기로 15 / 40 / 80기를 격추하면 한 단계씩 오른다. */
  const MASTERY_STEPS = [15, 40, 80];
  const masteryTier = kills => MASTERY_STEPS.filter(step => kills >= step).length;
  function fireInterval(weapon, ship, rateBonus) {
    return WEAPONS[weapon].interval * SHIPS[ship].rate * Math.pow(.92, rateBonus || 0);
  }

  // ---------- 적 ----------
  const ENEMIES = {
    grunt: { hp: 3, score: 100, r: 17, size: 50 },
    shooter: { hp: 6, score: 200, r: 19, size: 58 },
    rusher: { hp: 4, score: 150, r: 16, size: 56 },
    sniper: { hp: 5, score: 300, r: 18, size: 58 },
    splitter: { hp: 10, score: 250, r: 22, size: 62 },
    mini: { hp: 2, score: 60, r: 11, size: 30 },
    armored: { hp: 16, score: 350, r: 20, size: 56 },
    carrier: { hp: 14, score: 400, r: 23, size: 66 },
    elite: { hp: 12, score: 500, r: 21, size: 62 }
  };
  function makeEnemy(type, wave, x, y, extra) {
    const base = ENEMIES[type], hp = Math.round(base.hp * (1 + (Math.max(1, wave) - 1) * .12));
    return Object.assign({ type, x, y, hp, maxHp: hp, r: base.r, score: base.score, age: 0, vx: 0, vy: 0, move: 'down', speed: 95 + wave * 3, fire: 1.2 }, extra);
  }
  const aimed = (x, y, px, py, speed, count, spread, extra) => {
    const base = Math.atan2(py - y, px - x), out = [];
    for (let i = 0; i < count; i += 1) { const a = base + (i - (count - 1) / 2) * spread; out.push(Object.assign({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5, kind: 'orb', color: '#fda4af', age: 0 }, extra)); }
    return out;
  };
  const ringOf = (x, y, count, speed, offset, extra) => {
    const out = [];
    for (let i = 0; i < count; i += 1) { const a = offset + i * Math.PI * 2 / count; out.push(Object.assign({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: 5, kind: 'orb', color: '#fda4af', age: 0 }, extra)); }
    return out;
  };

  /** 적 한 기를 dt만큼 움직인다. 새로 쏜 탄 목록을 돌려준다. */
  function stepEnemy(e, dt, player, wave) {
    const bullets = [], bulletSpeed = 150 + wave * 5;
    e.age += dt;
    if (e.move === 'sine') { e.y += e.speed * dt; e.x = e.baseX + Math.sin(e.age * 2.2 + (e.phase || 0)) * (e.amp || 60); }
    else if (e.move === 'swoop') {
      // 옆에서 들어와 호를 그리며 반대편으로 빠져나간다.
      const t = e.age * (e.speed / 260); e.x = e.fromX + (e.toX - e.fromX) * t / 2.6; e.y = -30 + Math.sin(Math.min(Math.PI, t * 1.2)) * (e.depth || 300);
      if (t * 1.2 >= Math.PI) e.gone = true;
    } else if (e.move === 'hover') {
      if (e.y < e.holdY) e.y += e.speed * 1.3 * dt;
      else if (e.age < e.leaveAt) e.x = clamp(e.x + Math.sin(e.age * 1.4 + (e.phase || 0)) * 55 * dt, 30, W - 30);
      else e.y += e.speed * 1.6 * dt;
    } else if (e.move === 'dive') {
      if (e.y < 80 && !e.locked) e.y += e.speed * 1.6 * dt;
      else if (!e.locked) { e.locked = true; e.wait = .6; e.aimX = player.x; e.aimY = player.y; const dx = player.x - e.x, dy = Math.max(120, player.y - e.y), d = Math.hypot(dx, dy); e.vx = dx / d * (400 + wave * 6); e.vy = dy / d * (400 + wave * 6); }
      else if (e.wait > 0) e.wait -= dt;
      else { e.x += e.vx * dt; e.y += e.vy * dt; }
    } else if (e.move === 'cross') { e.x += e.vx * dt; e.y += Math.sin(e.age * 2) * 12 * dt; }
    else if (e.move === 'bounce') { e.x += e.vx * dt; e.y += e.speed * dt; if (e.x < 16 || e.x > W - 16) { e.vx *= -1; e.x = clamp(e.x, 16, W - 16); } }
    else e.y += e.speed * dt;

    const onScreen = e.y > 10 && e.y < H * .7;
    if (e.type === 'sniper') {
      if (e.aim > 0) { e.aim -= dt; if (e.aim <= 0) { bullets.push({ x: e.x, y: e.y, vx: Math.cos(e.aimAngle) * 470, vy: Math.sin(e.aimAngle) * 470, r: 4, kind: 'needle', color: '#f87171', age: 0 }); e.fire = 2.2; } }
      else if (onScreen && e.y >= e.holdY) { e.fire -= dt; if (e.fire <= 0) { e.aim = .8; e.aimAngle = Math.atan2(player.y - e.y, player.x - e.x); } }
    } else if (onScreen && (e.type === 'shooter' || e.type === 'elite' || e.type === 'armored')) {
      e.fire -= dt;
      if (e.fire <= 0) {
        if (e.type === 'armored') bullets.push(...aimed(e.x, e.y, e.x, e.y + 100, bulletSpeed * .9, 3, .35, { color: '#cbd5e1' }));
        else bullets.push(...aimed(e.x, e.y, player.x, player.y, bulletSpeed, e.type === 'elite' ? 3 : 1 + Math.min(2, Math.floor(wave / 4)), .2, { color: e.type === 'elite' ? '#fde047' : '#e879f9' }));
        e.fire = e.type === 'elite' ? 1.6 : 1.9;
      }
    }
    if (e.y > H + 40 || e.x < -70 || e.x > W + 70) e.gone = true;
    return bullets;
  }

  // ---------- 편대: 무작위 낱개가 아니라 짜인 대형으로 등장한다 ----------
  const FORMATIONS = {
    line: { from: 1, weight: 3, build(w, r, t) { const out = []; for (let i = 0; i < 5; i += 1) out.push({ t, type: 'grunt', x: 80 + i * 80, y: -30, move: 'down' }); return out; } },
    vee: { from: 2, weight: 3, build(w, r, t) { const c = 150 + r() * 180, out = []; for (let i = -2; i <= 2; i += 1) out.push({ t, type: w >= 3 && i === 0 ? 'elite' : 'grunt', x: c + i * 50, y: -30 - Math.abs(i) * 30, move: 'sine', baseX: c + i * 50, amp: 26, speed: 80 + w * 2 }); return out; } },
    stream: { from: 1, weight: 3, build(w, r, t) { const base = 110 + r() * 260, out = []; for (let i = 0; i < 6; i += 1) out.push({ t: t + i * .32, type: 'grunt', x: base, y: -30, move: 'sine', baseX: base, amp: 80, phase: 0, speed: 120 + w * 3 }); return out; } },
    swoop: { from: 2, weight: 3, build(w, r, t) { const left = r() < .5, out = []; for (let i = 0; i < 5; i += 1) out.push({ t: t + i * .3, type: 'grunt', x: left ? -30 : W + 30, y: -30, move: 'swoop', fromX: left ? -30 : W + 30, toX: left ? W + 30 : -30, depth: 260 + r() * 80, speed: 150 + w * 3 }); return out; } },
    gunline: { from: 2, weight: 2, build(w, r, t) { const n = w >= 6 ? 3 : 2, out = []; for (let i = 0; i < n; i += 1) out.push({ t: t + i * .2, type: 'shooter', x: W * (i + 1) / (n + 1), y: -30, move: 'hover', holdY: 90 + r() * 90, leaveAt: 8, phase: i * 2 }); return out; } },
    pincer: { from: 3, weight: 2, build(w, r, t) { const n = w >= 7 ? 4 : 2, out = []; for (let i = 0; i < n; i += 1) out.push({ t: t + Math.floor(i / 2) * .5, type: 'rusher', x: i % 2 ? W - 50 - r() * 60 : 50 + r() * 60, y: -30, move: 'dive' }); return out; } },
    splitters: { from: 4, weight: 2, build(w, r, t) { return [0, 1].map(i => ({ t: t + i * .4, type: 'splitter', x: 130 + i * 220, y: -30, move: 'down', speed: 60 + w * 2 })); } },
    bulwark: { from: 6, weight: 2, build(w, r, t) { const c = 140 + r() * 200; return [{ t, type: 'armored', x: c - 60, y: -30, move: 'down', speed: 50 + w }, { t, type: 'armored', x: c + 60, y: -30, move: 'down', speed: 50 + w }, { t: t + .6, type: 'shooter', x: c, y: -30, move: 'hover', holdY: 80, leaveAt: 9 }]; } },
    snipers: { from: 7, weight: 2, build(w, r, t) { return [0, 1].map(i => ({ t: t + i * .5, type: 'sniper', x: 90 + i * 300, y: -30, move: 'hover', holdY: 70 + r() * 50, leaveAt: 9, phase: i * 3 })); } }
  };
  const isBossWave = wave => wave > 0 && wave % 5 === 0;
  /** 웨이브 편성표. 같은 웨이브 번호는 항상 같은 편성이다. */
  function wavePlan(wave) {
    if (isBossWave(wave)) return { boss: true, events: [{ t: 1.6, type: 'boss' }] };
    const r = rng(wave * 7919 + 13), names = Object.keys(FORMATIONS).filter(name => FORMATIONS[name].from <= wave);
    const count = Math.min(9, 3 + Math.floor(wave / 2)), gap = Math.max(1.9, 3.3 - wave * .07), events = [];
    let t = 1.2, last = '';
    for (let i = 0; i < count; i += 1) {
      const pool = names.filter(name => name !== last), total = pool.reduce((sum, name) => sum + FORMATIONS[name].weight, 0);
      let pick = r() * total, chosen = pool[0];
      for (const name of pool) { pick -= FORMATIONS[name].weight; if (pick <= 0) { chosen = name; break; } }
      events.push(...FORMATIONS[chosen].build(wave, r, t)); last = chosen; t += gap;
    }
    // 세 웨이브마다 보급 수송기가 화면 위를 가로지른다.
    if (wave % 3 === 2) events.push({ t: 4, type: 'carrier', x: -40, y: 70, move: 'cross', vx: 70 });
    events.sort((a, b) => a.t - b.t);
    return { boss: false, events };
  }

  // ---------- 보스 ----------
  const BOSSES = [
    { id: 'destroyer', name: '파괴자', color: '#f0abfc', hp: 1, speed: 1, attacks: ['fan', 'missiles', 'rain'] },
    { id: 'weaver', name: '직조자', color: '#5eead4', hp: .9, speed: 1.5, attacks: ['spiral', 'cross', 'rings'] },
    { id: 'fortress', name: '요새', color: '#fbbf24', hp: 1.3, speed: .55, attacks: ['wall', 'mines', 'beam'] }
  ];
  const ATTACK_NAMES = { fan: '부채꼴 탄막', missiles: '추적 미사일', rain: '탄막 비', spiral: '나선 탄막', cross: '교차 탄막', rings: '연속 고리', wall: '탄막 벽', mines: '기뢰 살포', beam: '레이저' };
  const ATTACK_TIME = { fan: 2.4, missiles: 2, rain: 2.6, spiral: 2.6, cross: 2.4, rings: 2.6, wall: 3.6, mines: 2.2, beam: 3.4 };
  const bossTier = wave => Math.max(1, Math.floor(wave / 5));
  const bossKindFor = wave => BOSSES[(bossTier(wave) - 1) % BOSSES.length];
  function makeBoss(wave) {
    const tier = bossTier(wave), kind = bossKindFor(wave), hp = Math.round((260 + tier * 190) * kind.hp);
    return { type: 'boss', kind: kind.id, tier, x: W / 2, y: -80, r: 46, w: 150, hp, maxHp: hp, score: 5000 + tier * 2500, age: 0, entering: true, attack: -1, attackT: 0, rest: 1.2, emit: 0, volley: 0, beam: null, wallGap: null, dir: 1 };
  }
  const bossKind = boss => BOSSES.find(kind => kind.id === boss.kind) || BOSSES[0];
  const bossEnraged = boss => boss.hp <= boss.maxHp * .5;
  const nextAttack = boss => bossKind(boss).attacks[(boss.attack + 1) % 3];

  /** 보스를 dt만큼 진행한다. 새 탄 목록을 돌려주고, 레이저와 벽의 틈은 boss.beam / boss.wallGap으로 알린다. */
  function stepBoss(boss, dt, player, random) {
    const out = [], kind = bossKind(boss), rage = bossEnraged(boss), speed = (150 + boss.tier * 12) * (rage ? 1.15 : 1), pace = rage ? .75 : 1;
    boss.age += dt;
    if (boss.entering) { boss.y += 70 * dt; if (boss.y >= 96) { boss.y = 96; boss.entering = false; } return out; }
    boss.x += boss.dir * 62 * kind.speed * dt;
    if (boss.x < 90) { boss.x = 90; boss.dir = 1; } else if (boss.x > W - 90) { boss.x = W - 90; boss.dir = -1; }
    if (kind.id === 'weaver') boss.y = 96 + Math.sin(boss.age * 1.5) * 18;

    if (boss.rest > 0) {
      boss.rest -= dt;
      // 벽은 쏘기 전에 틈의 위치를 먼저 알려 준다.
      if (boss.rest <= .6 && nextAttack(boss) === 'wall' && boss.wallGap === null) boss.wallGap = clamp(player.x + (random() - .5) * 200, 70, W - 70);
      if (boss.rest <= 0) { boss.attack = (boss.attack + 1) % 3; boss.attackT = ATTACK_TIME[kind.attacks[boss.attack]]; boss.emit = 0; boss.volley = 0; }
      return out;
    }
    const attack = kind.attacks[boss.attack], x = boss.x, y = boss.y + 30;
    boss.attackT -= dt; boss.emit -= dt;
    const every = interval => { if (boss.emit > 0) return false; boss.emit += interval * pace; boss.volley += 1; return true; };
    if (attack === 'fan') { if (every(.7)) out.push(...aimed(x, y, player.x, player.y, speed, 7 + Math.min(6, boss.tier * 2), .16, { color: '#f0abfc' })); }
    else if (attack === 'missiles') { if (every(.9)) for (let i = 0; i < Math.min(5, 1 + boss.tier); i += 1) out.push({ x: x + (i - Math.min(4, boss.tier) / 2) * 22, y, vx: 0, vy: speed * .75, r: 7, kind: 'missile', color: '#fb923c', homing: 1.3 + boss.tier * .1, age: 0 }); }
    else if (attack === 'rain') { if (every(.085)) out.push({ x: 20 + random() * (W - 40), y: boss.y - 10, vx: (random() - .5) * 40, vy: speed * (.9 + random() * .4), r: 4.5, kind: 'orb', color: '#f0abfc', age: 0 }); }
    else if (attack === 'spiral') { if (every(.075)) { const swing = Math.sin(boss.volley * .32) * 1.0; for (const side of [-1, 1]) out.push({ x: x + side * 18, y, vx: Math.cos(Math.PI / 2 + side * swing) * speed * .85, vy: Math.sin(Math.PI / 2 + side * swing) * speed * .85, r: 5, kind: 'orb', color: '#5eead4', age: 0 }); } }
    else if (attack === 'cross') { if (every(.55)) for (const side of [-1, 1]) for (let k = 0; k < 6; k += 1) { const a = Math.PI / 2 + side * (.1 + k * .15) * (boss.volley % 2 ? 1 : .7); out.push({ x: x + side * 60, y: y - 10, vx: Math.cos(a) * speed * .9, vy: Math.sin(a) * speed * .9, r: 5, kind: 'orb', color: '#99f6e4', age: 0 }); } }
    else if (attack === 'rings') { if (every(.62)) out.push(...ringOf(x, y, 12 + Math.min(8, boss.tier * 2), speed * .75, boss.volley * .26, { color: '#5eead4' })); }
    else if (attack === 'wall') {
      if (every(1.15)) {
        const gap = boss.wallGap === null ? W / 2 : boss.wallGap;
        for (let bx = 15; bx <= W - 15; bx += 30) if (Math.abs(bx - gap) >= 50) out.push({ x: bx, y: boss.y + 20, vx: 0, vy: speed * .72, r: 6, kind: 'orb', color: '#fbbf24', age: 0 });
        boss.wallGap = clamp(gap + (random() < .5 ? -1 : 1) * (70 + random() * 50), 70, W - 70);   // 다음 벽의 틈을 미리 알린다
      }
    } else if (attack === 'mines') { if (every(.9)) for (let i = 0; i < Math.min(5, 2 + boss.tier); i += 1) { const tx = 40 + random() * (W - 80), ty = 230 + random() * 230; out.push({ x, y, vx: (tx - x) * 1.4, vy: (ty - y) * 1.4, r: 9, kind: 'mine', color: '#fb923c', fuse: 1.5, burst: speed * .65, age: 0 }); } }
    else if (attack === 'beam') {
      if (!boss.beam && every(1.6)) boss.beam = { x: clamp(player.x, 40, W - 40), width: 54, phase: 'warning', t: .9 };
      else if (boss.beam) { boss.beam.t -= dt; if (boss.beam.t <= 0) { if (boss.beam.phase === 'warning') { boss.beam.phase = 'active'; boss.beam.t = .5; } else boss.beam = null; } }
    }
    if (boss.attackT <= 0) { boss.rest = rage ? .7 : 1.1; boss.beam = null; if (attack === 'wall') boss.wallGap = null; }
    return out;
  }
  /** 적탄 한 발을 진행한다. 기뢰가 터지면 새 탄 목록을 돌려주고 bullet.dead를 세운다. */
  function stepBullet(b, dt, player) {
    b.age += dt;
    if (b.kind === 'missile' && b.age < 2.2) {
      const speed = Math.hypot(b.vx, b.vy), current = Math.atan2(b.vy, b.vx), target = Math.atan2(player.y - b.y, player.x - b.x);
      const delta = ((target - current + Math.PI * 3) % (Math.PI * 2)) - Math.PI, next = current + clamp(delta, -b.homing * dt, b.homing * dt);
      b.vx = Math.cos(next) * speed; b.vy = Math.sin(next) * speed;
    } else if (b.kind === 'mine') {
      const drag = Math.max(0, 1 - 2.6 * dt); b.vx *= drag; b.vy *= drag; b.fuse -= dt;
      if (b.fuse <= 0) { b.dead = true; return ringOf(b.x, b.y, 8, b.burst, Math.PI / 8, { color: '#fb923c' }); }
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.y > H + 24 || b.y < -40 || b.x < -24 || b.x > W + 24) b.dead = true;
    return null;
  }

  // ---------- 점수와 강화 ----------
  const chainMultiplier = chain => 1 + Math.min(35, Math.max(0, chain)) * .2;
  const UPGRADES = [
    { id: 'damage', name: '화력 증폭', note: '공격력 +15%', max: 4 },
    { id: 'rate', name: '연사 가속', note: '발사 간격 -8%', max: 4 },
    { id: 'life', name: '긴급 수리', note: '라이프 +1', max: 99 },
    { id: 'bomb', name: '봄 보급', note: '봄 +2', max: 99 },
    { id: 'shield', name: '방어막', note: '다음 피격 1회 방어', max: 99 },
    { id: 'magnet', name: '회수 자석', note: '아이템 흡수 범위 2배', max: 1 },
    { id: 'option', name: '지원기', note: '함께 사격하는 지원기 +1 (최대 2)', max: 2 },
    { id: 'pierce', name: '관통탄', note: '모든 탄이 적 1기를 더 꿰뚫음', max: 2 },
    { id: 'crit', name: '치명타', note: '15% 확률로 2배 피해 (중첩 +10%)', max: 3 },
    { id: 'sub', name: '보조 무기 증폭', note: '보조 무기 화력 +25%', max: 2 },
    { id: 'keep', name: '화력 보존', note: '피격해도 화력이 내려가지 않음', max: 1 }
  ];
  /** 보스 격파 후 고를 강화 세 가지. 이미 한도에 닿은 것은 빼고 고른다. */
  function upgradeChoices(owned, state, random) {
    const pool = UPGRADES.filter(u => (owned[u.id] || 0) < u.max && !(u.id === 'life' && state.lives >= 6) && !(u.id === 'shield' && state.shield) && !(u.id === 'bomb' && state.bombs >= 5));
    const picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    return picks;
  }
  const grade = score => score >= 200000 ? 'S' : score >= 80000 ? 'A' : score >= 25000 ? 'B' : 'C';

  return Object.freeze({ W, H, MAX_LEVEL, SHIPS, WEAPONS, WEAPON_KEYS, ENEMIES, BOSSES, ATTACK_NAMES, UPGRADES, clamp, rng, shots, subLevel, masteryTier, MASTERY_STEPS, fireInterval, makeEnemy, stepEnemy, wavePlan, isBossWave,
    makeBoss, bossKind, bossKindFor, bossTier, bossEnraged, nextAttack, stepBoss, stepBullet, chainMultiplier, upgradeChoices, grade, aimed, ringOf });
});
