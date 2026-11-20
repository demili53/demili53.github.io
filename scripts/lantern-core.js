// Lantern Keeper rules: a ten-minute night of survival in a shadow forest.
// Pure data and functions shared by the browser game (scripts/lantern-keeper.js) and node tests.
(function (root) {
  const DURATION = 600; // seconds until dawn
  const MAX_WEAPONS = 5, MAX_CHARMS = 4, MAX_LEVEL = 5;
  const MAX_ENEMIES = 320;
  const BASE = { hp: 100, speed: 150, magnet: 85 };

  // Eleven lantern arts. Each array is indexed by level - 1.
  const WEAPONS = {
    ember: { name: '불씨 화살', icon: '➶', color: '#ffb35c', desc: '가장 가까운 그림자에게 불씨를 쏩니다.',
      damage: [10, 12, 14, 17, 21], cooldown: [.85, .8, .72, .64, .55], count: [1, 1, 2, 2, 3], pierce: [1, 1, 1, 2, 2], speed: 430 },
    halo: { name: '등불 고리', icon: '◎', color: '#ffd77a', desc: '주위를 도는 불꽃이 닿는 적을 태웁니다.',
      damage: [7, 8, 10, 12, 15], count: [2, 3, 3, 4, 5], radius: [64, 68, 74, 80, 88], spin: [2.6, 2.8, 3, 3.2, 3.5], tick: .45 },
    firefly: { name: '반딧불 떼', icon: '✦', color: '#b8ff7a', desc: '적을 쫓아가는 반딧불을 풀어 놓습니다.',
      damage: [7, 8, 9, 11, 14], cooldown: [1.6, 1.5, 1.4, 1.25, 1.1], count: [2, 3, 4, 5, 6], speed: 260 },
    sunbeam: { name: '빛기둥', icon: '❘', color: '#fff2b0', desc: '하늘에서 빛기둥이 떨어져 주변을 태웁니다.',
      damage: [24, 28, 34, 41, 50], cooldown: [2.6, 2.4, 2.2, 2, 1.7], count: [1, 2, 2, 3, 4], radius: [34, 36, 38, 42, 46] },
    pool: { name: '불꽃 웅덩이', icon: '♨', color: '#ff7a4a', desc: '오래 타오르는 불길을 바닥에 남깁니다.',
      damage: [5, 6, 7, 9, 11], cooldown: [3, 2.9, 2.8, 2.6, 2.4], count: [1, 1, 2, 2, 3], radius: [44, 48, 54, 60, 68], duration: [2.5, 3, 3, 3.5, 4], tick: .35 },
    flare: { name: '섬광', icon: '✸', color: '#7fe8ff', desc: '빛을 터뜨려 주변 적을 밀어냅니다.',
      damage: [14, 17, 20, 24, 30], cooldown: [3.4, 3.2, 3, 2.7, 2.3], radius: [110, 120, 135, 150, 170], knock: [140, 150, 165, 180, 200] },
    chain: { name: '불똥 사슬', icon: 'ϟ', color: '#ffe66b', desc: '불똥이 적 사이를 튀며 연달아 태웁니다.',
      damage: [12, 14, 16, 19, 23], cooldown: [1.4, 1.3, 1.2, 1.1, .95], count: [1, 1, 2, 2, 3], jumps: [3, 4, 4, 5, 6], radius: [150, 155, 160, 170, 180] },
    wing: { name: '날개 등잔', icon: '⟲', color: '#ffc48a', desc: '던진 등잔이 날아갔다 돌아오며 길 위의 적을 벱니다.',
      damage: [14, 16, 19, 22, 27], cooldown: [2.2, 2.1, 2, 1.85, 1.7], count: [1, 1, 1, 2, 2], radius: [14, 15, 16, 18, 20], speed: 340, duration: 1.3 },
    whip: { name: '달빛 채찍', icon: '☾', color: '#cfe0ff', desc: '바라보는 쪽을 넓게 후려칩니다.',
      damage: [16, 19, 22, 26, 32], cooldown: [1.3, 1.25, 1.15, 1.05, .95], count: [1, 1, 2, 2, 2], radius: [90, 95, 100, 108, 118] },
    beacon: { name: '등대 광선', icon: '✺', color: '#fff6c8', desc: '등불에서 뻗은 광선이 천천히 돌며 쓸어 냅니다.',
      damage: [6, 7, 9, 11, 14], count: [1, 1, 2, 2, 3], radius: [150, 165, 175, 190, 205], spin: [1.4, 1.5, 1.6, 1.75, 1.9], tick: .35 },
    seed: { name: '씨앗 지뢰', icon: '✿', color: '#ff9ad0', desc: '지나간 자리에 빛 씨앗을 심어, 다가온 적을 터뜨립니다.',
      damage: [22, 26, 31, 37, 45], cooldown: [1.6, 1.5, 1.4, 1.3, 1.15], count: [1, 1, 2, 2, 3], radius: [48, 52, 56, 62, 70], duration: 12 }
  };
  // Evolutions: a Lv.5 art plus its paired charm (any level) can evolve once.
  const EVOLUTIONS = {
    ember: { charm: 'oil', name: '혜성 화살', icon: '☄', color: '#ff8a3c', desc: '맞으면 폭발하는 혜성을 쏩니다.', damage: 1.5, count: 1, blast: 46 },
    halo: { charm: 'shade', name: '태양 고리', icon: '☀', color: '#ffb347', desc: '더 크고 뜨거운 불꽃 고리가 돕니다.', damage: 1.6, count: 2, radius: 1.25 },
    firefly: { charm: 'lodestone', name: '별무리', icon: '✧', color: '#bfe8ff', desc: '빠른 별빛이 두 배로 쏟아집니다.', damage: 1.4, count: 6, speed: 1.5 },
    sunbeam: { charm: 'wick', name: '하늘 창', icon: '⇣', color: '#e6d0ff', desc: '굵은 빛의 창이 연달아 꽂힙니다.', damage: 1.6, count: 3, radius: 1.4 },
    pool: { charm: 'cloak', name: '용암 들판', icon: '♒', color: '#ff4a2a', desc: '크게 번지는 용암이 적을 느리게 합니다.', damage: 1.6, radius: 1.4, duration: 1.5, slow: .5 },
    flare: { charm: 'boots', name: '새벽 파동', icon: '❂', color: '#ffe08a', desc: '두 번 퍼지는 파동이 적을 잠시 멈춥니다.', damage: 1.5, radius: 1.25, stun: .8, double: true },
    chain: { charm: 'lodestone', name: '뇌화 사슬', icon: '⚡', color: '#fff27a', desc: '튀는 횟수가 두 배가 되고 더 세게 태웁니다.', damage: 1.5, jumps: 2 },
    wing: { charm: 'boots', name: '쌍날개 등잔', icon: '❖', color: '#ffd9a8', desc: '등잔이 하나 더 날고, 모든 적을 꿰뚫습니다.', damage: 1.6, count: 1, radius: 1.3 },
    beacon: { charm: 'oil', name: '태양 등대', icon: '☼', color: '#ffe27a', desc: '광선이 두 갈래 늘고 더 멀리, 더 뜨겁게 뻗습니다.', damage: 1.5, count: 2, radius: 1.35 },
    seed: { charm: 'wick', name: '불꽃 정원', icon: '❀', color: '#ff6ab0', desc: '씨앗이 더 많이 심기고, 터진 자리에 불길이 남습니다.', damage: 1.5, count: 2, radius: 1.2, garden: true },
    whip: { charm: 'cloak', name: '초승달 낫', icon: '◐', color: '#e8f0ff', desc: '양쪽을 베고, 맞힌 만큼 체력을 되찾습니다.', damage: 1.6, radius: 1.3, both: true, heal: 1 }
  };
  // Six charms (passives). value is per level.
  const CHARMS = {
    oil: { name: '등잔 기름', icon: '◆', color: '#ffb35c', desc: '모든 피해 +10%', stat: 'damage', value: .10 },
    wick: { name: '긴 심지', icon: '⌇', color: '#ffd77a', desc: '재사용 대기 −7%', stat: 'cooldown', value: .07 },
    boots: { name: '이슬 장화', icon: '➹', color: '#9fd7ff', desc: '이동 속도 +8%', stat: 'speed', value: .08 },
    shade: { name: '넓은 갓', icon: '◠', color: '#fff2b0', desc: '공격 범위 +10%', stat: 'area', value: .10 },
    lodestone: { name: '자석돌', icon: '◈', color: '#c891ff', desc: '불씨 줍는 거리 +30%', stat: 'magnet', value: .30 },
    cloak: { name: '털 망토', icon: '♜', color: '#9dffb4', desc: '최대 체력 +20, 초당 회복 +0.3', stat: 'hp', value: 20 }
  };
  const WEAPON_IDS = Object.keys(WEAPONS), CHARM_IDS = Object.keys(CHARMS);
  const STAT_LABELS = { damage: '피해', count: '개수', cooldown: '대기', radius: '범위', pierce: '관통', jumps: '튐', duration: '지속' };

  // Shadows of the forest. hp scales with time (hpScale), the rest is fixed.
  const ENEMIES = {
    moth: { name: '그림자 나방', hp: 8, speed: 68, r: 10, damage: 6, xp: 1, color: '#7b6cff', from: 0 },
    bat: { name: '밤박쥐', hp: 6, speed: 104, r: 9, damage: 5, xp: 1, color: '#c06cff', from: 50 },
    vine: { name: '이끼 덩굴', hp: 32, speed: 40, r: 15, damage: 10, xp: 3, color: '#4fae7a', from: 110 },
    wisp: { name: '떠도는 망령', hp: 20, speed: 82, r: 12, damage: 8, xp: 2, color: '#8fd8ff', from: 200 },
    golem: { name: '돌이끼 수호자', hp: 110, speed: 36, r: 22, damage: 16, xp: 8, color: '#8a9a70', from: 320 }
  };
  const BOSSES = [
    { id: 'treant', at: 180, name: '늪의 거목', hp: 1400, speed: 34, r: 40, damage: 22, color: '#5b8c4a', xp: 40 },
    { id: 'crow', at: 360, name: '까마귀 여왕', hp: 3600, speed: 60, r: 34, damage: 20, color: '#6a5a9a', xp: 60 },
    { id: 'eclipse', at: 540, name: '일식의 그림자', hp: 8000, speed: 46, r: 46, damage: 30, color: '#3a2f6a', xp: 90 }
  ];
  const GEMS = [{ value: 1, color: '#ffcf6a', r: 4 }, { value: 4, color: '#ff8a4a', r: 5.5 }, { value: 12, color: '#ff5fa0', r: 7 }];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const xpToNext = level => Math.round(5 + (level - 1) * 4 + Math.pow(level - 1, 1.5));
  const hpScale = t => 1 + t / 180 + Math.pow(t / 450, 2);
  // Enemies arriving per second ramps from 1.4 to about 20 near dawn.
  const spawnRate = t => 1.2 + t * .022 + Math.pow(t / 240, 2);
  const enemyCap = t => Math.min(MAX_ENEMIES, Math.round(50 + t * .4));

  function enemyMix(t) {
    const w = { moth: Math.max(1, 6 - t / 100) };
    if (t >= ENEMIES.bat.from) w.bat = 3;
    if (t >= ENEMIES.vine.from) w.vine = 2 + t / 200;
    if (t >= ENEMIES.wisp.from) w.wisp = 2 + t / 150;
    if (t >= ENEMIES.golem.from) w.golem = .6 + t / 400;
    return w;
  }
  function pickEnemy(t, rng = Math.random) {
    const w = enemyMix(t); let sum = 0;
    for (const k in w) sum += w[k];
    let r = rng() * sum;
    for (const k in w) { r -= w[k]; if (r <= 0) return k; }
    return 'moth';
  }
  function enemyStats(type, t) {
    const e = ENEMIES[type]; if (!e) throw new Error('unknown enemy ' + type);
    return { type, name: e.name, hp: Math.round(e.hp * hpScale(t)), speed: e.speed, r: e.r, damage: e.damage, xp: e.xp, color: e.color };
  }
  function bossAt(t0, t1) { return BOSSES.find(b => b.at > t0 && b.at <= t1) || null; }
  // Encirclement events: a ring of moths closes in every 90 seconds (not on boss minutes).
  const ringAt = (t0, t1) => { for (let at = 90; at < DURATION; at += 90) if (at > t0 && at <= t1 && !BOSSES.some(b => b.at === at)) return at; return 0; };
  function gemFor(xp) { return xp >= 12 ? GEMS[2] : xp >= 4 ? GEMS[1] : GEMS[0]; }

  function newBuild() { return { weapons: { ember: 1 }, charms: {}, evolved: {}, polish: {} }; }
  const MAX_POLISH = 3, POLISH = .12; // starlight polish: +12% damage per stack on a Lv.5 art
  function modifiers(build) {
    const lv = id => build.charms[id] || 0;
    return {
      damage: 1 + lv('oil') * CHARMS.oil.value,
      cooldown: 1 - lv('wick') * CHARMS.wick.value,
      speed: 1 + lv('boots') * CHARMS.boots.value,
      area: 1 + lv('shade') * CHARMS.shade.value,
      magnet: 1 + lv('lodestone') * CHARMS.lodestone.value,
      maxHp: BASE.hp + lv('cloak') * CHARMS.cloak.value,
      regen: lv('cloak') * .3
    };
  }
  // Effective stats of one weapon at its level with charm modifiers applied.
  // An evolved art keeps Lv.5 numbers, then applies its evolution multipliers and special effect.
  function weaponStats(id, level, mods = modifiers(newBuild()), evolved = false, polish = 0) {
    const w = WEAPONS[id]; if (!w) throw new Error('unknown weapon ' + id);
    const i = clamp(level, 1, MAX_LEVEL) - 1, pick = k => Array.isArray(w[k]) ? w[k][i] : w[k];
    const s = { id, level: i + 1, damage: pick('damage') * mods.damage, color: w.color, name: w.name };
    for (const k of ['count', 'pierce', 'speed', 'spin', 'tick', 'duration', 'knock', 'jumps']) if (w[k] !== undefined) s[k] = pick(k);
    if (w.cooldown) s.cooldown = pick('cooldown') * mods.cooldown;
    if (w.radius) s.radius = pick('radius') * mods.area;
    const e = evolved && EVOLUTIONS[id];
    if (e) {
      s.evolved = true; s.color = e.color; s.name = e.name;
      s.damage *= e.damage;
      if (e.count) s.count = (s.count || 1) + e.count;
      if (e.radius && s.radius) s.radius *= e.radius;
      if (e.speed && s.speed) s.speed *= e.speed;
      if (e.duration && s.duration) s.duration *= e.duration;
      if (e.jumps && s.jumps) s.jumps *= e.jumps;
      if (s.cooldown) s.cooldown *= .9;
      for (const k of ['blast', 'slow', 'stun', 'double', 'both', 'heal', 'garden']) if (e[k] !== undefined) s[k] = e[k];
      if (id === 'wing') s.pierce = Infinity;
    }
    if (polish) { s.polish = polish; s.damage *= 1 + POLISH * polish; }
    return s;
  }
  const canEvolve = (build, id) => (build.weapons[id] || 0) >= MAX_LEVEL && (build.charms[EVOLUTIONS[id].charm] || 0) > 0 && !(build.evolved || {})[id];

  // Level-up offers: upgrades for what you carry, new items while slots remain.
  function candidates(build) {
    const out = [];
    const nW = Object.keys(build.weapons).length, nC = Object.keys(build.charms).length;
    for (const id of WEAPON_IDS) {
      const lv = build.weapons[id] || 0;
      if (lv ? lv < MAX_LEVEL : nW < MAX_WEAPONS) out.push({ kind: 'weapon', id, level: lv + 1 });
    }
    for (const id of CHARM_IDS) {
      const lv = build.charms[id] || 0;
      if (lv ? lv < MAX_LEVEL : nC < MAX_CHARMS) out.push({ kind: 'charm', id, level: lv + 1 });
    }
    for (const id in build.weapons) if (canEvolve(build, id)) out.push({ kind: 'evolve', id, level: MAX_LEVEL + 1 });
    for (const id in build.weapons) if (build.weapons[id] >= MAX_LEVEL && ((build.polish || {})[id] || 0) < MAX_POLISH) out.push({ kind: 'polish', id, level: ((build.polish || {})[id] || 0) + 1 });
    return out;
  }
  function rollChoices(build, rng = Math.random, n = 3) {
    const pool = candidates(build);
    if (!pool.length) return [{ kind: 'heal', id: 'tea', level: 0 }];
    const out = [];
    while (out.length < n && pool.length) {
      const nW = Object.keys(build.weapons).length;
      // Evolutions first; upgrades of owned arts weigh more than new ones so builds come together.
      const weights = pool.map(c => (c.kind === 'evolve' ? 6 : c.kind === 'polish' ? .7 : c.kind === 'weapon' && c.level > 1 ? 2 : c.level > 1 ? 1.3 : c.kind === 'weapon' && nW >= 3 ? .6 : 1));
      let r = rng() * weights.reduce((a, b) => a + b, 0), i = 0;
      for (; i < pool.length - 1; i++) { r -= weights[i]; if (r <= 0) break; }
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }
  function applyChoice(build, choice) {
    const next = { weapons: { ...build.weapons }, charms: { ...build.charms }, evolved: { ...(build.evolved || {}) }, polish: { ...(build.polish || {}) } };
    if (choice.kind === 'evolve') { if (!canEvolve(build, choice.id)) throw new Error('cannot evolve ' + choice.id); next.evolved[choice.id] = true; }
    else if (choice.kind === 'weapon') next.weapons[choice.id] = Math.min(MAX_LEVEL, (next.weapons[choice.id] || 0) + 1);
    else if (choice.kind === 'charm') next.charms[choice.id] = Math.min(MAX_LEVEL, (next.charms[choice.id] || 0) + 1);
    else if (choice.kind === 'polish') { if ((build.weapons[choice.id] || 0) < MAX_LEVEL) throw new Error('polish needs Lv.5'); next.polish[choice.id] = Math.min(MAX_POLISH, (next.polish[choice.id] || 0) + 1); }
    else if (choice.kind !== 'heal') throw new Error('unknown choice ' + choice.kind);
    return next;
  }
  // What the next level actually changes, e.g. "피해 12→14 · 개수 1→2".
  function upgradeText(id, level, evolved = false) {
    const fmt = (k, v) => k === 'cooldown' ? v.toFixed(2) + '초' : k === 'duration' ? v.toFixed(1) + '초' : String(Math.round(v));
    const before = level > MAX_LEVEL ? weaponStats(id, MAX_LEVEL) : weaponStats(id, level - 1), after = weaponStats(id, Math.min(level, MAX_LEVEL), undefined, evolved || level > MAX_LEVEL);
    const parts = [];
    for (const k in STAT_LABELS) if (before[k] !== undefined && after[k] !== undefined && fmt(k, before[k]) !== fmt(k, after[k]) && Number.isFinite(after[k])) parts.push(`${STAT_LABELS[k]} ${fmt(k, before[k])}→${fmt(k, after[k])}`);
    return parts.slice(0, 3).join(' · ');
  }
  function describe(choice) {
    if (choice.kind === 'heal') return { name: '따뜻한 차', icon: '☕', color: '#ffcf9a', text: '체력 30 회복', tag: '회복', hint: '' };
    if (choice.kind === 'polish') { const w = WEAPONS[choice.id]; return { name: `${w.name} 연마`, icon: '✶', color: w.color, text: `피해 +${Math.round(POLISH * 100)}% (연마 ${choice.level}/${MAX_POLISH})`, tag: '별빛 연마', hint: 'Lv.5 무기를 더 단단하게' }; }
    if (choice.kind === 'evolve') {
      const e = EVOLUTIONS[choice.id];
      return { name: e.name, icon: e.icon, color: e.color, text: e.desc, tag: '진화', hint: `${WEAPONS[choice.id].name} + ${CHARMS[e.charm].name} · ${upgradeText(choice.id, MAX_LEVEL + 1)}` };
    }
    if (choice.kind === 'weapon') {
      const w = WEAPONS[choice.id], e = EVOLUTIONS[choice.id];
      return { name: w.name, icon: w.icon, color: w.color, text: choice.level === 1 ? w.desc : upgradeText(choice.id, choice.level), tag: choice.level === 1 ? '새로 얻기' : `Lv.${choice.level}`, hint: `Lv.5 + ${CHARMS[e.charm].name} → ${e.name}` };
    }
    const c = CHARMS[choice.id], pairs = WEAPON_IDS.filter(id => EVOLUTIONS[id].charm === choice.id).map(id => EVOLUTIONS[id].name);
    return { name: c.name, icon: c.icon, color: c.color, text: c.desc, tag: choice.level === 1 ? '새로 얻기' : `Lv.${choice.level}`, hint: pairs.length ? `진화 재료: ${pairs.join(', ')}` : '' };
  }
  // Starlight chest from a boss: three free upgrades, evolutions first, then art levels, then polish/charms.
  function chestRolls(build, rng = Math.random, n = 3) {
    const picks = [];
    for (let i = 0; i < n; i++) {
      const pool = candidates(build).filter(c => c.kind !== 'weapon' || c.level > 1);
      if (!pool.length) break;
      const tier = ['evolve', 'weapon', 'polish', 'charm'].map(k => pool.filter(c => c.kind === k)).find(l => l.length);
      const pick = tier[Math.floor(rng() * tier.length)];
      build = applyChoice(build, pick); picks.push(pick);
    }
    return { build, picks };
  }
  const score = (time, kills, level, dawn) => Math.floor(time) * 10 + kills * 2 + (level - 1) * 30 + (dawn ? 5000 : 0);
  const clock = t => { const s = Math.max(0, Math.floor(t)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

  const api = { MAX_POLISH, POLISH, chestRolls, DURATION, MAX_WEAPONS, MAX_CHARMS, MAX_LEVEL, MAX_ENEMIES, BASE, WEAPONS, CHARMS, EVOLUTIONS, WEAPON_IDS, CHARM_IDS, canEvolve, upgradeText, ENEMIES, BOSSES, GEMS,
    xpToNext, hpScale, spawnRate, enemyCap, enemyMix, pickEnemy, enemyStats, bossAt, ringAt, gemFor,
    newBuild, modifiers, weaponStats, candidates, rollChoices, applyChoice, describe, score, clock };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LanternCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
