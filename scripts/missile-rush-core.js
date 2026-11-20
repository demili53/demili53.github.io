// Missile Rush rules. Pure data and functions shared by the browser game and the node tests:
// operator gates, fleet firepower, weapons, enemy formations, wave scripts and bosses.
(function (root) {
  const FIELD = { w: 480, h: 760, line: 742 };
  const START_UNITS = 5;
  const MAX_UNITS = 300;
  const MAX_SHIFTS = 3; // how many times gunfire can bend one gate
  const BOSS_EVERY = 5;
  const BOSS_REWARD_UNITS = 5;
  const WEAPON_MAX_LEVEL = 3;
  const BASE_INTERVAL = 0.34;

  const OPERATORS = {
    '+': { label: '+', good: true, name: '증원' },
    '-': { label: '−', good: false, name: '손실' },
    '×': { label: '×', good: true, name: '복제' },
    '÷': { label: '÷', good: false, name: '분할' }
  };
  const EVOLUTIONS = [
    { tier: 1, name: 'Mk.I 탄두', color: '#ffd27a', mult: 1 },
    { tier: 2, name: 'Mk.II 고폭 탄두', color: '#ff9f5a', mult: 1.35 },
    { tier: 3, name: 'Mk.III 플라즈마 탄두', color: '#7ce8ff', mult: 1.8 },
    { tier: 4, name: 'Mk.IV 반물질 탄두', color: '#c891ff', mult: 2.4 },
    { tier: 5, name: 'Mk.V 성운 탄두', color: '#9dffb4', mult: 3.2 }
  ];
  // mult is total damage relative to the plain missile, traded against what the weapon is good at.
  const WEAPONS = {
    missile: { name: '미사일', icon: 'M', color: '#ffd27a', mult: 1, volley: 12, interval: 0.34, desc: '균형 잡힌 직사 미사일. 레벨마다 관통 +1' },
    scatter: { name: '산탄포', icon: 'S', color: '#ffb35c', mult: 1.3, volley: 14, interval: 0.4, desc: '넓게 퍼지는 산탄. 가까운 무리에 강함' },
    laser: { name: '관통 레이저', icon: 'L', color: '#7ce8ff', mult: 0.6, volley: 1, interval: 0.1, desc: '세로 한 줄의 적 전부를 지속 관통' },
    homing: { name: '유도탄', icon: 'H', color: '#c891ff', mult: 0.8, volley: 8, interval: 0.4, desc: '적을 추적. 빗나가지 않지만 약함' },
    blast: { name: '폭발탄', icon: 'B', color: '#ff7b6b', mult: 0.9, volley: 4, interval: 0.62, desc: '느리지만 명중 지점 주변을 휩쓺' },
    chain: { name: '전격포', icon: 'Z', color: '#ffe066', mult: 0.85, volley: 3, interval: 0.45, desc: '가까운 적에 즉시 꽂히고 주변으로 번짐' },
    wave: { name: '파동포', icon: 'W', color: '#63e6be', mult: 0.7, volley: 1, interval: 0.5, desc: '점점 넓어지며 닿는 적을 모두 관통' }
  };
  const WEAPON_IDS = Object.keys(WEAPONS);
  // The fleet is drawn as mixed craft: 25 units fold into a gunship, 5 into a fighter. Visual only.
  const CRAFTS = { heavy: { name: '중포함', units: 25 }, fighter: { name: '전투기', units: 5 }, light: { name: '포대', units: 1 } };
  const ENEMIES = {
    drone: { name: '정찰 드론', hp: 3, speed: 92, r: 13, score: 10, color: '#ff6f7d', from: 1 },
    zig: { name: '지그재그 전투기', hp: 4, speed: 80, r: 14, score: 15, color: '#ffb35c', from: 2 },
    tank: { name: '중장갑 운반선', hp: 16, speed: 42, r: 22, score: 35, color: '#8fa8ff', from: 3 },
    gunner: { name: '포격기', hp: 7, speed: 52, r: 17, score: 30, color: '#ff73d0', from: 4 },
    bomber: { name: '폭격기', hp: 10, speed: 46, r: 18, score: 35, color: '#ffd43b', from: 6 },
    splitter: { name: '분열 모함', hp: 10, speed: 58, r: 19, score: 30, color: '#7ff0c8', from: 7 },
    dasher: { name: '돌격기', hp: 5, speed: 70, r: 13, score: 30, color: '#ff922b', from: 8 },
    shard: { name: '분열 파편', hp: 2, speed: 120, r: 9, score: 5, color: '#7ff0c8', from: 99 },
    boss: { name: '보스', hp: 420, speed: 22, r: 54, score: 900, color: '#ff5a5a', from: 99 }
  };
  const BOSSES = [
    { id: 'fortress', name: '거대 요새선', color: '#ff5a5a', hp: 1, hint: '부채꼴 탄막과 드론 소환' },
    { id: 'carrier', name: '강습 모함', color: '#ffa94d', hp: 0.85, hint: '빠른 기동, 전투기 편대, 3연사' },
    { id: 'divider', name: '분할 군주', color: '#ff5f9e', hp: 1.1, hint: '부대 위로 손실 관문을 던짐' },
    { id: 'hydra', name: '쌍두 포격함', color: '#b48cff', hp: 1.25, hint: '양쪽 포탑 연사 뒤 돌진' }
  ];
  // Formations: authored shapes instead of random drips. x is 0..1 across the field, d is delay in seconds.
  const FORMATIONS = {
    line: n => span(n).map(x => ({ x, d: 0 })),
    vee: n => span(n).map(x => ({ x, d: Math.abs(x - .5) * 1.6 })),
    wedge: n => span(n).map(x => ({ x, d: (.5 - Math.abs(x - .5)) * 1.6 })),
    column: n => Array.from({ length: n }, (_, i) => ({ x: .5, d: i * .42 })),
    pincer: n => Array.from({ length: n }, (_, i) => ({ x: i % 2 ? .14 : .86, d: Math.floor(i / 2) * .5 })),
    stairs: n => span(n).map((x, i) => ({ x, d: i * .32 })),
    cluster: n => Array.from({ length: n }, (_, i) => ({ x: .5 + Math.cos(i * 2.4) * .16 * Math.sqrt(i), d: i * .12 }))
  };
  const FORMATION_IDS = Object.keys(FORMATIONS);
  function span(n) { return Array.from({ length: n }, (_, i) => n === 1 ? .5 : .1 + .8 * i / (n - 1)); }

  // Small seeded generator so wave scripts are reproducible in tests.
  function seeded(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  const pick = (list, rng) => list[Math.floor(rng() * list.length)];

  function hpScale(wave) { const n = Math.max(0, wave - 1); return 1 + n * 0.9 + n * n * 0.2; }
  function isBossWave(wave) { return wave % BOSS_EVERY === 0; }
  function bossFor(wave) { return BOSSES[(Math.max(1, Math.round(wave / BOSS_EVERY)) - 1) % BOSSES.length]; }
  function evolution(tier) { return EVOLUTIONS[Math.max(0, Math.min(EVOLUTIONS.length - 1, tier - 1))]; }
  function clampUnits(n) { return Math.max(0, Math.min(MAX_UNITS, Math.floor(n))); }
  function clampLevel(lv) { return Math.max(1, Math.min(WEAPON_MAX_LEVEL, lv || 1)); }

  // ---------- Operator gates ----------
  function applyOperator(units, gate) {
    switch (gate.op) {
      case '+': return clampUnits(units + gate.v);
      case '-': return clampUnits(units - gate.v);
      case '×': return clampUnits(units * gate.v);
      case '÷': return clampUnits(Math.max(1, Math.floor(units / gate.v)));
      default: throw new Error('unknown operator ' + gate.op);
    }
  }
  function gateLabel(gate) { return OPERATORS[gate.op].label + gate.v; }
  function isGood(gate) { return OPERATORS[gate.op].good; }
  function shiftable(gate) { return (gate.op === '+' || gate.op === '-') && (gate.shifts === undefined ? MAX_SHIFTS : gate.shifts) > 0; }
  // Gunfire bends a gate toward the player's favour: − shrinks then flips to +, + grows. × and ÷ are fixed.
  function shiftGate(gate) {
    if (!shiftable(gate)) return gate;
    const shifts = (gate.shifts === undefined ? MAX_SHIFTS : gate.shifts) - 1;
    if (gate.op === '+') return { op: '+', v: gate.v + 1, shifts };
    return gate.v > 1 ? { op: '-', v: gate.v - 1, shifts } : { op: '+', v: 1, shifts };
  }
  // Damage a gate soaks up per step: well over a second of the whole fleet's fire, so bending always costs time.
  function shiftCost(dps, wave) { return Math.max(4, dps * Math.min(2.2, 1.3 + wave * 0.03)); }

  function goodGate(wave, units, rng) {
    const multChance = units < 3 ? 0 : units < 30 ? 0.12 : units < 60 ? 0.04 : 0; // doubling a big fleet would end the climb
    if (rng() < multChance) return { op: '×', v: rng() < 0.08 && units < 20 ? 3 : 2 };
    return { op: '+', v: 1 + Math.floor(rng() * (3 + Math.floor(wave / 3))) };
  }
  function badGate(wave, units, rng) {
    if (units >= 10 && rng() < 0.22 + Math.min(0.2, units / 600)) return { op: '÷', v: 2 };
    return { op: '-', v: 2 + Math.floor(rng() * (2 + Math.floor(wave / 2) + units * 0.12)) };
  }
  // A gate row is a wall across the whole field: the fleet must pass through exactly one lane.
  // Every row offers at least one helpful and one harmful lane.
  function rollRow(wave, units, lanes, rng) {
    const random = rng || Math.random;
    const n = lanes === 3 ? 3 : 2;
    const row = [goodGate(wave, units, random), badGate(wave, units, random)];
    if (n === 3) row.push(random() < 0.5 ? goodGate(wave, units, random) : badGate(wave, units, random));
    for (let i = row.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [row[i], row[j]] = [row[j], row[i]]; }
    return row.map(g => ({ op: g.op, v: g.v, shifts: MAX_SHIFTS }));
  }
  function laneOf(x, lanes) { return Math.max(0, Math.min(lanes - 1, Math.floor(x / (FIELD.w / lanes)))); }

  // ---------- Fleet ----------
  function composition(units) {
    const n = clampUnits(units);
    return { heavy: Math.floor(n / 25), fighter: Math.floor(n % 25 / 5), light: n % 5 };
  }
  // Every unit adds the same damage per second whatever the weapon. Volleys are capped for
  // readability, so each shot carries the share of the units it stands for.
  function squadStats(units, tier, weapon, level) {
    const evo = evolution(tier || 1);
    const id = WEAPONS[weapon] ? weapon : 'missile';
    const w = WEAPONS[id], lv = clampLevel(level);
    const n = Math.max(0, units);
    const count = Math.min(n, w.volley);
    const unitDamage = 1.2 * evo.mult * w.mult * (1 + (lv - 1) * 0.2);
    return {
      units: n, weapon: id, level: lv, interval: w.interval, count,
      damage: count ? unitDamage * n * w.interval / BASE_INTERVAL / count : 0,
      dps: unitDamage * n / BASE_INTERVAL,
      speed: (id === 'blast' ? 380 : id === 'homing' ? 460 : id === 'wave' ? 420 : 580) + ((tier || 1) - 1) * 40,
      pierce: id === 'missile' ? Math.min(4, Math.floor(n / 40) + lv - 1) : 0,
      spread: id === 'scatter' ? 0.34 + lv * 0.06 : 0,
      beam: id === 'laser' ? 16 + lv * 8 : 0,
      homing: id === 'homing' ? 2 + lv : 0,
      blast: id === 'blast' ? 40 + lv * 10 : 0,
      chain: id === 'chain' ? 1 + lv : 0,
      wave: id === 'wave' ? 50 + lv * 22 : 0,
      radius: 14 + 4.6 * Math.sqrt(Math.min(n, 110)),
      color: id === 'missile' ? evo.color : w.color
    };
  }
  // Catching a crate: the same weapon levels up (at max it pays bonus units); another swaps in at its remembered level.
  function pickWeapon(state, id) {
    if (!WEAPONS[id]) throw new Error('unknown weapon ' + id);
    const levels = Object.assign({}, state.levels);
    const had = levels[id] || 0, same = id === state.weapon;
    levels[id] = same ? Math.min(WEAPON_MAX_LEVEL, had + 1) : (had || 1);
    return { weapon: id, levels, bonus: same && had >= WEAPON_MAX_LEVEL ? 3 : 0, leveled: same && had < WEAPON_MAX_LEVEL };
  }
  function rollWeapon(current, rng) {
    const random = rng || Math.random;
    if (random() < 0.3) return current;
    return pick(WEAPON_IDS.filter(w => w !== current), random);
  }
  // Units lost when an enemy rams the fleet or slips past the defense line.
  function contactLoss(type) { return type === 'boss' ? 6 : Math.max(1, Math.round(ENEMIES[type].r / 7)); }
  function breachLoss(type) { return type === 'boss' ? 0 : Math.max(1, Math.round(ENEMIES[type].r / 11)); }

  // ---------- Enemies and waves ----------
  function enemyStats(type, wave) {
    const base = ENEMIES[type];
    const boss = type === 'boss' ? bossFor(wave) : null;
    const bossMult = boss ? (1 + (wave / BOSS_EVERY - 1) * 0.9) * boss.hp : 1;
    return {
      hp: Math.round(base.hp * hpScale(wave) * bossMult * 10) / 10,
      speed: base.speed * (1 + Math.min(0.6, wave * 0.018)),
      r: base.r,
      score: Math.round(base.score * (1 + wave * 0.1)),
      color: boss ? boss.color : base.color
    };
  }
  function enemyTypes(wave) { return Object.keys(ENEMIES).filter(k => ENEMIES[k].from <= wave); }
  // How many of a type fit one formation: big ships come in small groups.
  function groupSize(type, wave, rng) {
    const r = ENEMIES[type].r, max = r >= 20 ? 3 : r >= 17 ? 4 : 7;
    return Math.max(2, Math.min(max, 3 + Math.floor(wave / 3) + Math.floor(rng() * 2)));
  }
  // The script of one wave: a timeline of gate rows, enemy formations and one weapon crate.
  // Boss waves keep a lighter loop of rows and escorts running until the boss falls.
  function buildWave(wave, rng) {
    const random = rng || Math.random;
    const boss = isBossWave(wave);
    const types = enemyTypes(wave);
    const gap = Math.max(2.1, 3.4 - wave * 0.07);
    const events = [];
    let t = 1.2, enemies = 0;
    const formation = only => {
      const type = only || pick(types, random), name = pick(FORMATION_IDS, random);
      const spawns = FORMATIONS[name](groupSize(type, wave, random)).map(s => ({ type, x: s.x, d: s.d }));
      events.push({ t, kind: 'formation', name, type, spawns });
      enemies += spawns.length;
    };
    const row = () => events.push({ t, kind: 'gates', lanes: wave >= 3 && random() < 0.45 ? 3 : 2 });
    if (boss) {
      events.push({ t, kind: 'boss' });
      for (let i = 0; i < 8; i++) { t += 4.5; if (i % 2 === 0) row(); else formation(pick(types.filter(k => ENEMIES[k].r < 17), random)); }
      events.splice(3, 0, { t: 12, kind: 'crate' });
      return { wave, boss: true, loopFrom: 5.7, events: events.sort((a, b) => a.t - b.t), duration: t + 4, enemies: enemies + 1 };
    }
    const segments = Math.min(11, 4 + Math.floor(wave * 0.6));
    row();
    for (let i = 0; i < segments; i++) {
      t += gap;
      formation(wave === 1 ? 'drone' : undefined);
      if (i % 2 === 1 && i < segments - 1) { t += gap * 0.75; row(); }
      if (i === Math.floor(segments / 2)) events.push({ t: t + gap * 0.4, kind: 'crate' });
    }
    return { wave, boss: false, events: events.sort((a, b) => a.t - b.t), duration: t + 1, enemies };
  }
  function comboMultiplier(combo) { return 1 + Math.min(50, Math.max(0, combo)) * 0.02; }
  function grade(wave) { return wave >= 20 ? 'S' : wave >= 15 ? 'A' : wave >= 10 ? 'B' : wave >= 5 ? 'C' : 'D'; }

  const api = {
    FIELD, START_UNITS, MAX_UNITS, MAX_SHIFTS, BOSS_EVERY, BOSS_REWARD_UNITS, WEAPON_MAX_LEVEL,
    OPERATORS, EVOLUTIONS, WEAPONS, WEAPON_IDS, CRAFTS, ENEMIES, BOSSES, FORMATIONS, FORMATION_IDS,
    seeded, hpScale, isBossWave, bossFor, evolution, clampUnits,
    applyOperator, gateLabel, isGood, shiftable, shiftGate, shiftCost, rollRow, laneOf,
    composition, squadStats, pickWeapon, rollWeapon, contactLoss, breachLoss,
    enemyStats, enemyTypes, groupSize, buildWave, comboMultiplier, grade
  };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MissileRushCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
