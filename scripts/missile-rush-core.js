// Missile Rush rules: falling operator capsules change the squad size, squad size is firepower.
// Pure functions shared by the browser game and node tests.
(function (root) {
  const START_UNITS = 3;
  const MAX_UNITS = 300;
  const OPERATORS = {
    '+': { label: '+', good: true, name: '증원' },
    '-': { label: '−', good: false, name: '손실' },
    '×': { label: '×', good: true, name: '복제' },
    '÷': { label: '÷', good: false, name: '분할' }
  };
  const EVOLUTIONS = [
    { tier: 1, name: 'Mk.I 소형 미사일', color: '#ffd27a', mult: 1 },
    { tier: 2, name: 'Mk.II 고폭 미사일', color: '#ff9f5a', mult: 1.35 },
    { tier: 3, name: 'Mk.III 플라즈마 미사일', color: '#7ce8ff', mult: 1.8 },
    { tier: 4, name: 'Mk.IV 반물질 미사일', color: '#c891ff', mult: 2.4 },
    { tier: 5, name: 'Mk.V 성운 파괴탄', color: '#9dffb4', mult: 3.2 }
  ];
  const ENEMIES = {
    drone: { name: '정찰 드론', hp: 3, speed: 95, r: 13, score: 10, color: '#ff6f7d', from: 1 },
    zig: { name: '지그재그 전투기', hp: 4, speed: 80, r: 14, score: 15, color: '#ffb35c', from: 2 },
    tank: { name: '중장갑 운반선', hp: 14, speed: 42, r: 22, score: 35, color: '#8fa8ff', from: 3 },
    gunner: { name: '포격기', hp: 7, speed: 52, r: 17, score: 30, color: '#ff73d0', from: 4 },
    splitter: { name: '분열 모함', hp: 10, speed: 58, r: 19, score: 30, color: '#7ff0c8', from: 6 },
    shard: { name: '분열 파편', hp: 2, speed: 120, r: 9, score: 5, color: '#7ff0c8', from: 99 },
    boss: { name: '거대 요새선', hp: 420, speed: 22, r: 54, score: 900, color: '#ff5a5a', from: 99 }
  };
  const BOSS_EVERY = 5;
  const BOSS_REWARD_UNITS = 5;

  function hpScale(wave) { return 1 + (wave - 1) * 0.28 + Math.pow(Math.max(0, wave - 1), 1.45) * 0.035; }
  function isBossWave(wave) { return wave % BOSS_EVERY === 0; }
  function evolution(tier) { return EVOLUTIONS[Math.max(0, Math.min(EVOLUTIONS.length - 1, tier - 1))]; }
  function clampUnits(n) { return Math.max(0, Math.min(MAX_UNITS, Math.floor(n))); }

  // Squad firepower: every unit adds the same damage per second. Volleys are capped for
  // readability, so each missile carries the share of the units it stands for.
  function squadStats(units, tier) {
    const evo = evolution(tier || 1);
    const n = Math.max(0, units);
    const interval = 0.34;
    const count = Math.min(n, 12);
    const unitDamage = 1.2 * evo.mult;
    return {
      units: n,
      interval,
      count,
      damage: count ? unitDamage * n / count : 0,
      dps: unitDamage * n / interval,
      speed: 560 + ((tier || 1) - 1) * 40,
      pierce: Math.min(3, Math.floor(n / 40)),
      radius: 12 + 5.2 * Math.sqrt(Math.min(n, 90)),
      color: evo.color
    };
  }

  function applyOperator(units, gate) {
    const v = gate.v;
    switch (gate.op) {
      case '+': return clampUnits(units + v);
      case '-': return clampUnits(units - v);
      case '×': return clampUnits(units * v);
      case '÷': return clampUnits(Math.max(1, Math.floor(units / v)));
      default: throw new Error('unknown operator ' + gate.op);
    }
  }

  function gateLabel(gate) { return OPERATORS[gate.op].label + gate.v; }
  function isGood(gate) { return OPERATORS[gate.op].good; }

  // Shooting a capsule bends its value toward the player's favour: − shrinks then flips to +, + grows.
  // × and ÷ are fixed so multiplying gates stay rare and meaningful.
  function shiftGate(gate) {
    if (gate.op === '+') return { op: '+', v: Math.min(99, gate.v + 1) };
    if (gate.op === '-') return gate.v > 1 ? { op: '-', v: gate.v - 1 } : { op: '+', v: 1 };
    return gate;
  }
  function shiftable(gate) { return gate.op === '+' || gate.op === '-'; }

  // Random capsule for the current wave. Big squads see more penalties, tiny squads more help.
  function rollOperator(wave, units, rng) {
    const random = rng || Math.random;
    const pressure = Math.min(1, units / 60);
    const w = { '+': 5 - pressure * 2, '-': 2 + pressure * 2.5, '×': units < 2 ? 0.4 : 1.1 - pressure * .5, '÷': units < 8 ? 0 : .4 + pressure * 1.1 };
    let roll = random() * (w['+'] + w['-'] + w['×'] + w['÷']);
    let op = '+';
    for (const k of ['+', '-', '×', '÷']) { roll -= w[k]; if (roll < 0) { op = k; break; } }
    const scale = 1 + Math.floor(wave / 4);
    let v;
    if (op === '+') v = 1 + Math.floor(random() * (2 + scale * 2));
    else if (op === '-') v = 1 + Math.floor(random() * (1 + scale * 2 + units * .15));
    else if (op === '×') v = random() < .8 ? 2 : 3;
    else v = random() < .75 ? 2 : 3;
    return { op, v };
  }

  // A pair of side-by-side capsules always offers one helpful and one harmful choice.
  function rollPair(wave, units, rng) {
    const random = rng || Math.random;
    let a = rollOperator(wave, units, random), b = rollOperator(wave, units, random);
    for (let i = 0; i < 20 && isGood(a) === isGood(b); i++) b = rollOperator(wave, units, random);
    if (isGood(a) === isGood(b)) b = isGood(a) ? { op: '-', v: 1 + Math.floor(wave / 3) } : { op: '+', v: 2 + Math.floor(wave / 3) };
    return random() < .5 ? [a, b] : [b, a];
  }

  // Units lost when an enemy rams the squad or slips past the defense line.
  function contactLoss(type) { return type === 'boss' ? 0 : Math.max(1, Math.round(ENEMIES[type].r / 7)); }
  function breachLoss(type) { return type === 'boss' ? 0 : Math.max(1, Math.round(ENEMIES[type].r / 11)); }

  // Wave composition: how many of each enemy type, scaled with the wave number.
  function wavePlan(wave) {
    const plan = [];
    const total = Math.round(14 + wave * 4.5);
    const types = Object.keys(ENEMIES).filter(k => ENEMIES[k].from <= wave);
    const weights = { drone: 5, zig: 3, tank: 2, gunner: 2, splitter: 1.6 };
    const sum = types.reduce((s, t) => s + weights[t], 0);
    for (const t of types) plan.push([t, Math.max(1, Math.round(total * weights[t] / sum))]);
    return {
      total: plan.reduce((s, p) => s + p[1], 0), plan, boss: isBossWave(wave),
      spawnGap: Math.max(0.22, 1.05 - wave * 0.045),
      gateGap: Math.max(1.5, 2.8 - wave * 0.06)
    };
  }

  function enemyStats(type, wave) {
    const base = ENEMIES[type];
    const bossMult = type === 'boss' ? 1 + (wave / BOSS_EVERY - 1) * 0.9 : 1;
    return {
      hp: Math.round(base.hp * hpScale(wave) * bossMult * 10) / 10,
      speed: base.speed * (1 + Math.min(0.6, wave * 0.018)),
      r: base.r,
      score: Math.round(base.score * (1 + wave * 0.1)),
      color: base.color
    };
  }

  // Damage a capsule must absorb per value step: about one second of the squad's focused fire,
  // a little more in later waves, so bending a gate always costs time spent not shooting enemies.
  function shiftCost(dps, wave) { return Math.max(4, dps * Math.min(1.6, 0.8 + wave * 0.02)); }

  const api = { START_UNITS, MAX_UNITS, OPERATORS, EVOLUTIONS, ENEMIES, BOSS_EVERY, BOSS_REWARD_UNITS, hpScale, isBossWave, evolution, clampUnits, squadStats, applyOperator, gateLabel, isGood, shiftGate, shiftable, rollOperator, rollPair, contactLoss, breachLoss, wavePlan, enemyStats, shiftCost };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MissileRushCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
