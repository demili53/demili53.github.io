/* Browser-local lifetime records. These medals do not change combat or online scores. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ShooterProgress = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STORAGE_KEY = 'spaceShooterProgress';
  const MEDALS = Object.freeze({
    first_clear: '첫 보스 돌파',
    ace: '50기 격추 에이스',
    untouchable: '무피격 3웨이브',
    grazer: '근접 회피 전문가',
    veteran: '10회 출격 베테랑',
    score_master: '30,000점 마스터'
  });
  const medalIds = Object.keys(MEDALS);
  const counters = ['runs', 'totalKills', 'totalSeconds', 'bestWave', 'bestScore'];
  const runFields = ['kills', 'seconds', 'wave', 'score', 'perfectWaves', 'grazes'];
  const own = (object, key) => Object.getOwnPropertyDescriptor(object, key)?.value;
  const numeric = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const validId = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 128;
  const sum = (a, b) => Math.min(Number.MAX_VALUE, a + b);

  function create(storage) {
    const state = { version: 1, runs: 0, totalKills: 0, totalSeconds: 0, bestWave: 0, bestScore: 0, medals: [] };
    let recentIds = [];
    try {
      const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
      if (saved && typeof saved === 'object' && !Array.isArray(saved) && own(saved, 'version') === 1) {
        counters.forEach(key => { const value = own(saved, key); if (numeric(value)) state[key] = value; });
        const medals = own(saved, 'medals');
        if (Array.isArray(medals)) state.medals = [...new Set(medals.filter(id => medalIds.includes(id)))];
        const ids = own(saved, 'recentIds');
        if (Array.isArray(ids)) recentIds = [...new Set(ids.filter(validId))].slice(-100);
      }
    } catch { /* A corrupt save or unavailable storage must not prevent a run. */ }

    function snapshot() { return { ...state, medals: [...state.medals] }; }

    function record(run) {
      let id, values;
      try {
        if (!run || typeof run !== 'object' || Array.isArray(run)) return { newMedals: [], snapshot: snapshot() };
        id = own(run, 'id');
        values = Object.fromEntries(runFields.map(key => [key, own(run, key)]));
        if (!validId(id) || !runFields.every(key => numeric(values[key])) || recentIds.includes(id)) return { newMedals: [], snapshot: snapshot() };
      } catch { return { newMedals: [], snapshot: snapshot() }; }

      state.runs = sum(state.runs, 1);
      state.totalKills = sum(state.totalKills, values.kills);
      state.totalSeconds = sum(state.totalSeconds, values.seconds);
      state.bestWave = Math.max(state.bestWave, values.wave);
      state.bestScore = Math.max(state.bestScore, values.score);
      recentIds.push(id);
      recentIds = recentIds.slice(-100);
      const earned = {
        first_clear: values.wave >= 6,
        ace: values.kills >= 50,
        untouchable: values.perfectWaves >= 3,
        grazer: values.grazes >= 20,
        veteran: state.runs >= 10,
        score_master: values.score >= 30000
      };
      const newMedals = medalIds.filter(key => earned[key] && !state.medals.includes(key));
      state.medals.push(...newMedals);
      try { storage?.setItem(STORAGE_KEY, JSON.stringify({ ...state, recentIds })); } catch { /* Retain the in-memory record. */ }
      return { newMedals, snapshot: snapshot() };
    }

    return Object.freeze({ record, snapshot });
  }

  return Object.freeze({ STORAGE_KEY, MEDALS, create });
});
