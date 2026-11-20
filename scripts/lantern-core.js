// Lantern Keeper rules: a ten-minute night of survival in a shadow forest.
// Pure data and functions shared by the browser game (scripts/lantern-keeper.js) and node tests.
(function (root) {
  const DURATION = 600; // seconds until dawn
  const MAX_WEAPONS = 4, MAX_CHARMS = 4, MAX_LEVEL = 5;
  const MAX_ENEMIES = 320;
  const BASE = { hp: 100, speed: 150, magnet: 85 };

  // Six lantern arts. Each array is indexed by level - 1.
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
      damage: [14, 17, 20, 24, 30], cooldown: [3.4, 3.2, 3, 2.7, 2.3], radius: [110, 120, 135, 150, 170], knock: [140, 150, 165, 180, 200] }
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

  function newBuild() { return { weapons: { ember: 1 }, charms: {} }; }
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
  function weaponStats(id, level, mods = modifiers(newBuild())) {
    const w = WEAPONS[id]; if (!w) throw new Error('unknown weapon ' + id);
    const i = clamp(level, 1, MAX_LEVEL) - 1, pick = k => Array.isArray(w[k]) ? w[k][i] : w[k];
    const s = { id, level: i + 1, damage: pick('damage') * mods.damage };
    for (const k of ['count', 'pierce', 'speed', 'spin', 'tick', 'duration', 'knock']) if (w[k] !== undefined) s[k] = pick(k);
    if (w.cooldown) s.cooldown = pick('cooldown') * mods.cooldown;
    if (w.radius) s.radius = pick('radius') * mods.area;
    return s;
  }

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
    return out;
  }
  function rollChoices(build, rng = Math.random, n = 3) {
    const pool = candidates(build);
    if (!pool.length) return [{ kind: 'heal', id: 'tea', level: 0 }];
    const out = [];
    while (out.length < n && pool.length) {
      // Upgrades of owned items weigh a little more so builds come together.
      const weights = pool.map(c => (c.level > 1 ? 1.4 : 1));
      let r = rng() * weights.reduce((a, b) => a + b, 0), i = 0;
      for (; i < pool.length - 1; i++) { r -= weights[i]; if (r <= 0) break; }
      out.push(pool.splice(i, 1)[0]);
    }
    return out;
  }
  function applyChoice(build, choice) {
    const next = { weapons: { ...build.weapons }, charms: { ...build.charms } };
    if (choice.kind === 'weapon') next.weapons[choice.id] = Math.min(MAX_LEVEL, (next.weapons[choice.id] || 0) + 1);
    else if (choice.kind === 'charm') next.charms[choice.id] = Math.min(MAX_LEVEL, (next.charms[choice.id] || 0) + 1);
    else if (choice.kind !== 'heal') throw new Error('unknown choice ' + choice.kind);
    return next;
  }
  function describe(choice) {
    if (choice.kind === 'heal') return { name: '따뜻한 차', icon: '☕', color: '#ffcf9a', text: '체력 30 회복', tag: '회복' };
    const def = choice.kind === 'weapon' ? WEAPONS[choice.id] : CHARMS[choice.id];
    return { name: def.name, icon: def.icon, color: def.color, text: def.desc, tag: choice.level === 1 ? '새로 얻기' : `Lv.${choice.level}` };
  }
  const score = (time, kills, level, dawn) => Math.floor(time) * 10 + kills * 2 + (level - 1) * 30 + (dawn ? 5000 : 0);
  const clock = t => { const s = Math.max(0, Math.floor(t)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

  const api = { DURATION, MAX_WEAPONS, MAX_CHARMS, MAX_LEVEL, MAX_ENEMIES, BASE, WEAPONS, CHARMS, WEAPON_IDS, CHARM_IDS, ENEMIES, BOSSES, GEMS,
    xpToNext, hpScale, spawnRate, enemyCap, enemyMix, pickEnemy, enemyStats, bossAt, ringAt, gemFor,
    newBuild, modifiers, weaponStats, candidates, rollChoices, applyChoice, describe, score, clock };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LanternCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
