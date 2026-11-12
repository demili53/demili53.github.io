const assert = require('node:assert/strict');
const progress = require('./bastion-progress.js');
const makeStorage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
const game = patch => ({ state: 'running', time: 5, mode: 'classic', map: 'grove', stage: -1, score: 150, wave: 1, rules: { waves: 10 }, kills: 3, perfectWaves: 0, bestCombo: 0, runStats: { damage: 80, relocations: 0 }, slots: [], waveHistory: [], stageMedal() { return this.stage >= 0 && this.state === 'won' ? 2 : 0; }, ...patch });
{
  const row = { at: 1700000000000, outcome: 'won', mode: 'classic', map: 'grove', stage: -1, score: 1000, wave: 10, waves: 10, kills: 99, seconds: 60, perfect: 3, medal: 0 };
  const clean = progress.cleanHistory([null, { ...row, mode: '<script>' }, { ...row, stage: 8 }, { ...row, at: Infinity }, { ...row, wave: 11 }, { ...row, score: '100' }, row]);
  assert.equal(clean.length, 1); assert.deepEqual(clean[0], row);
  assert.equal(progress.cleanHistory(Array(30).fill(row)).length, 10);
  assert.deepEqual(progress.cleanHistory({}), []);
  assert.deepEqual(progress.cleanAchievements(['first_win', '__proto__', 'first_win', 'final_stage']), ['first_win', 'final_stage']);
}
{
  const storage = makeStorage(), store = progress.createStore(storage, 8, () => 1700000000000), current = game({ state: 'won' });
  store.observe(current); store.observe(current); store.observe(current);
  assert.equal(store.snapshot().history.length, 1, 'Repeated UI updates cannot duplicate a finished run');
  assert.deepEqual(store.snapshot().unlocked, ['first_win']);
  const copy = store.snapshot(); copy.history[0].score = 999999; copy.unlocked.push('final_stage');
  assert.equal(store.snapshot().history[0].score, 150); assert.deepEqual(store.snapshot().unlocked, ['first_win']);
  const loaded = progress.createStore(storage); assert.equal(loaded.snapshot().history.length, 1); assert.deepEqual(loaded.snapshot().unlocked, ['first_win']);
  const idle = game({ state: 'idle', perfectWaves: 10, bestCombo: 100, stage: 7 });
  assert.deepEqual(progress.earned(idle), [], 'Browsing a prepared stage never grants an achievement');
  assert.deepEqual(progress.earned(game({ state: 'won', time: 0, kills: 0, runStats: {}, waveHistory: [] })), [], 'No achievement without gameplay evidence');
}
{
  const store = progress.createStore(makeStorage(), 8, () => 1700000000000);
  for (let i = 0; i < 12; i++) store.observe(game({ state: i % 2 ? 'won' : 'lost', score: i }));
  assert.equal(store.snapshot().history.length, 10); assert.equal(store.snapshot().history[0].score, 11); assert.equal(store.snapshot().history[9].score, 2);
  const all = game({ state: 'won', stage: 7, perfectWaves: 1, bestCombo: 10, runStats: { damage: 100, relocations: 1 }, slots: ['arrow', 'cannon', 'frost', 'laser', 'tesla'].map(type => ({ tower: { type } })) });
  assert.equal(progress.earned(all).length, 6);
  assert.equal(progress.earned({ ...all, slots: Array(8).fill({ tower: { type: 'arrow' } }) }).includes('five_weapons'), false);
}
{
  const blocked = { getItem() { return null; }, setItem() { throw new Error('quota'); } };
  const store = progress.createStore(blocked, 8, () => 1700000000000), current = game({ state: 'lost' });
  store.observe(current); store.observe(current); assert.equal(store.snapshot().history.length, 1); assert.equal(store.snapshot().available, false);
  assert.doesNotThrow(() => progress.createStore({ getItem() { throw new Error('denied'); } }));
}
{
  assert.equal(progress.recommendation([1, 2, 0, 3, 0, 0, 0, 0]).index, 2);
  assert.equal(progress.recommendation([3, 2, 3, 1, 3, 2, 3, 3]).index, 3);
  assert.equal(progress.recommendation(Array(8).fill(3)).index, 7);
  assert.equal(progress.recommendation(['3', -1, Infinity]).index, 0);
  assert.equal(progress.recommendation(null).index, 0);
}
console.log('PASS progression: history sanitization/cap/dedup, persistent gameplay-only achievements, snapshots, blocked storage and next-stage recommendations');

// Detailed records remain detached from live game objects and every nested returned snapshot.
{
  const storage = makeStorage(), store = progress.createStore(storage, 8, () => 1700000000000);
  const current = game({ state: 'won', guardian: 'scout', mission: 'compact', slots: [{ tower: { type: 'arrow', level: 3, specialization: 'rapid' } }, null, { tower: { type: 'banner', level: 2 } }], perks: { power: 2, supply: 1, bounty: 999, invalid: 2 } });
  store.observe(current); const captured = store.snapshot().history[0].loadout;
  assert.deepEqual(captured, { towers: [{ slot: 0, type: 'arrow', level: 3, specialization: 'rapid' }, { slot: 2, type: 'banner', level: 2, specialization: null }], perks: [{ id: 'power', count: 2 }, { id: 'supply', count: 1 }], guardian: 'scout', mission: 'compact' });
  current.slots[0].tower.level = 1; current.perks.power = 0;
  captured.towers[0].level = 99; captured.perks[0].count = 99; captured.guardian = 'gunner';
  const unchanged = store.snapshot().history[0].loadout;
  assert.equal(unchanged.towers[0].level, 3); assert.equal(unchanged.perks[0].count, 2); assert.equal(unchanged.guardian, 'scout');
  const reloaded = progress.createStore(storage).snapshot().history[0].loadout;
  assert.deepEqual(reloaded, unchanged);
  assert.deepEqual(progress.cleanLoadout({ towers: [null, { slot: 0, type: 'arrow', level: 999, specialization: '<script>' }, { slot: 0, type: 'cannon', level: 2 }, { slot: -1, type: 'laser' }, { slot: 1, type: '__proto__' }], perks: [{ id: 'power', count: 2 }, { id: 'power', count: 1 }, { id: 'haste', count: Infinity }, { id: '__proto__', count: 1 }], guardian: '<script>', mission: 'bad' }), { towers: [{ slot: 0, type: 'arrow', level: 1, specialization: null }], perks: [{ id: 'power', count: 2 }], guardian: null, mission: 'none' });
  assert.equal(progress.cleanLoadout(null), null);
}
// Filters preserve source history and don't expose nested references.
{
  const store = progress.createStore(makeStorage(), 8, () => 1700000000000);
  store.observe(game({ state: 'won', slots: [{ tower: { type: 'arrow', level: 2 } }] }));store.observe(game({ state: 'lost' }));
  const history = store.snapshot().history;
  assert.equal(progress.filterHistory(history, 'all').length, 2);assert.equal(progress.filterHistory(history, 'won').length, 1);assert.equal(progress.filterHistory(history, 'lost').length, 1);assert.equal(progress.filterHistory(history, 'unknown').length, 2);
  const won = progress.filterHistory(history, 'won');won[0].loadout.towers[0].level = 99;assert.equal(history[1].loadout.towers[0].level, 2);assert.equal(history.length, 2);assert.deepEqual(progress.filterHistory(null), []);
}
// Progress represents only the current active run, while unlocking rules still require actual gameplay.
{
  const current = game({ bestCombo: 7, perfectWaves: 0, stage: 7, rules: { waves: 10 }, waveHistory: [{}, {}, {}], slots: ['arrow','arrow','banner','frost'].map(type => ({ tower: { type } })), runStats: { relocations: 1 } });
  const items = Object.fromEntries(progress.achievementProgress(current).map(item => [item.id, item]));
  assert.equal(items.combo_ten.value, 7);assert.equal(items.combo_ten.target, 10);assert.equal(items.five_weapons.value, 3);assert.equal(items.final_stage.value, 3);assert.equal(items.final_stage.target, 10);assert.equal(items.relocation.value, 1);
  const paused = progress.achievementProgress({ ...current, state: 'paused' });assert.equal(paused.find(item => item.id === 'combo_ten').value, 7);
  for(const state of ['idle','won','lost']){const values=progress.achievementProgress({ ...current, state });assert(values.every(item => !item.active&&item.value===0));}
  assert.deepEqual(progress.earned({ ...current, state: 'idle', bestCombo: 10 }), []);
  assert(progress.achievementProgress(game({ stage: 0 })).find(item => item.id==='final_stage').text.includes('8단계'));
}
console.log('PASS progression expansion: immutable detailed records, bounded loadout validation, old record compatibility, outcome filters and active-run achievement progress');
