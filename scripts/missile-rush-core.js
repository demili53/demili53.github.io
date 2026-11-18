// Missile Rush rules: weapon upgrades, missile evolution and enemy scaling.
// Pure functions shared by the browser game and node tests.
(function (root) {
  const UPGRADES = [
    { id: 'damage', name: '탄두 강화', icon: '✹', max: 10, desc: lv => `미사일 피해 +25% (현재 ×${(1 + lv * 0.25).toFixed(2)})` },
    { id: 'rate', name: '고속 장전', icon: '⟳', max: 8, desc: lv => `발사 속도 +15% (현재 ×${(1 + lv * 0.15).toFixed(2)})` },
    { id: 'multi', name: '다연장 발사대', icon: '⋔', max: 6, desc: lv => `한 번에 발사하는 미사일 +1 (현재 ${1 + lv}발)` },
    { id: 'homing', name: '유도 장치', icon: '◎', max: 3, desc: lv => `가까운 적을 추적하는 힘 강화 (현재 ${lv}단계)` },
    { id: 'pierce', name: '관통 탄두', icon: '➹', max: 4, desc: lv => `관통 +1 · 미사일 한 발로 적 ${lv + 2}기까지 명중` },
    { id: 'blast', name: '폭발 탄두', icon: '✺', max: 4, desc: lv => `명중 시 주변 폭발 · 반경 ${blastRadius(lv + 1)}` },
    { id: 'drone', name: '측면 드론', icon: '◇', max: 2, desc: lv => `소형 유도탄을 쏘는 드론 +1 (현재 ${lv}기)` },
    { id: 'crit', name: '치명 조준', icon: '✦', max: 5, desc: lv => `치명타 확률 +8% · 피해 2배 (현재 ${lv * 8}%)` },
    { id: 'armor', name: '장갑 보강', icon: '⬢', max: 5, desc: () => '최대 내구도 +1 · 내구도 전부 회복' },
    { id: 'magnet', name: '자석 회수기', icon: '∩', max: 3, desc: lv => `경험치 결정 회수 범위 +45 (현재 ${magnetRadius(lv)})` }
  ];
  const EVOLUTIONS = [
    { tier: 1, name: 'Mk.I 소형 미사일', color: '#ffd27a', mult: 1 },
    { tier: 2, name: 'Mk.II 고폭 미사일', color: '#ff9f5a', mult: 1.35 },
    { tier: 3, name: 'Mk.III 플라즈마 미사일', color: '#7ce8ff', mult: 1.8 },
    { tier: 4, name: 'Mk.IV 반물질 미사일', color: '#c891ff', mult: 2.4 },
    { tier: 5, name: 'Mk.V 성운 파괴탄', color: '#9dffb4', mult: 3.2 }
  ];
  const ENEMIES = {
    drone: { name: '정찰 드론', hp: 3, speed: 95, r: 13, score: 10, xp: 1, color: '#ff6f7d', from: 1 },
    zig: { name: '지그재그 전투기', hp: 4, speed: 80, r: 14, score: 15, xp: 2, color: '#ffb35c', from: 2 },
    tank: { name: '중장갑 운반선', hp: 14, speed: 42, r: 22, score: 35, xp: 4, color: '#8fa8ff', from: 3 },
    gunner: { name: '포격기', hp: 7, speed: 52, r: 17, score: 30, xp: 3, color: '#ff73d0', from: 4 },
    splitter: { name: '분열 모함', hp: 10, speed: 58, r: 19, score: 30, xp: 3, color: '#7ff0c8', from: 6 },
    shard: { name: '분열 파편', hp: 2, speed: 120, r: 9, score: 5, xp: 1, color: '#7ff0c8', from: 99 },
    boss: { name: '거대 요새선', hp: 420, speed: 22, r: 54, score: 900, xp: 30, color: '#ff5a5a', from: 99 }
  };
  const BOSS_EVERY = 5;

  function blastRadius(lv) { return lv > 0 ? 30 + lv * 16 : 0; }
  function magnetRadius(lv) { return 90 + lv * 45; }
  function xpToNext(level) { return Math.round(6 + level * 4 + Math.pow(level, 1.55)); }
  function hpScale(wave) { return 1 + (wave - 1) * 0.28 + Math.pow(Math.max(0, wave - 1), 1.45) * 0.035; }
  function isBossWave(wave) { return wave % BOSS_EVERY === 0; }
  function evolution(tier) { return EVOLUTIONS[Math.max(0, Math.min(EVOLUTIONS.length - 1, tier - 1))]; }

  function weaponStats(levels, tier) {
    const lv = id => levels[id] || 0;
    const evo = evolution(tier || 1);
    return {
      damage: 1.4 * (1 + lv('damage') * 0.25) * evo.mult,
      interval: 0.42 / (1 + lv('rate') * 0.15),
      count: 1 + lv('multi'),
      homing: lv('homing'),
      pierce: lv('pierce'),
      blast: blastRadius(lv('blast')),
      drones: lv('drone'),
      crit: lv('crit') * 0.08,
      magnet: magnetRadius(lv('magnet')),
      speed: 560 + (tier - 1) * 40,
      color: evo.color
    };
  }

  // Returns up to three distinct upgrade ids that are not yet at max level.
  function rollChoices(levels, rng) {
    const random = rng || Math.random;
    const pool = UPGRADES.filter(u => (levels[u.id] || 0) < u.max).map(u => u.id);
    const picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    return picks;
  }

  function applyUpgrade(levels, id) {
    const def = UPGRADES.find(u => u.id === id);
    if (!def) throw new Error('unknown upgrade ' + id);
    const current = levels[id] || 0;
    if (current >= def.max) return levels;
    return Object.assign({}, levels, { [id]: current + 1 });
  }

  // Wave composition: how many of each enemy type, scaled with the wave number.
  function wavePlan(wave) {
    const plan = [];
    const total = Math.round(14 + wave * 4.5);
    const types = Object.keys(ENEMIES).filter(k => ENEMIES[k].from <= wave);
    const weights = { drone: 5, zig: 3, tank: 2, gunner: 2, splitter: 1.6 };
    const sum = types.reduce((s, t) => s + weights[t], 0);
    for (const t of types) plan.push([t, Math.max(1, Math.round(total * weights[t] / sum))]);
    return { total: plan.reduce((s, p) => s + p[1], 0), plan, boss: isBossWave(wave), spawnGap: Math.max(0.22, 1.05 - wave * 0.045) };
  }

  function enemyStats(type, wave) {
    const base = ENEMIES[type];
    const bossMult = type === 'boss' ? 1 + (wave / BOSS_EVERY - 1) * 0.9 : 1;
    return {
      hp: Math.round(base.hp * hpScale(wave) * bossMult * 10) / 10,
      speed: base.speed * (1 + Math.min(0.6, wave * 0.018)),
      r: base.r,
      score: Math.round(base.score * (1 + wave * 0.1)),
      xp: base.xp,
      color: base.color
    };
  }

  const api = { UPGRADES, EVOLUTIONS, ENEMIES, BOSS_EVERY, blastRadius, magnetRadius, xpToNext, hpScale, isBossWave, evolution, weaponStats, rollChoices, applyUpgrade, wavePlan, enemyStats };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MissileRushCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
