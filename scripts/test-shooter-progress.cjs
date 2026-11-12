const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Progress = require('./shooter-progress.js');
const storage = initial => {
  const values = new Map(initial ? [[Progress.STORAGE_KEY, initial]] : []);
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
const run = (id, extra = {}) => ({ id, kills: 2, seconds: 12.5, wave: 2, score: 200, perfectWaves: 0, grazes: 0, ...extra });

{
  const store = storage(), tracker = Progress.create(store);
  const first = tracker.record(run('first', { wave: 6, kills: 50, perfectWaves: 3, grazes: 20, score: 30000 }));
  assert.deepEqual(first.newMedals, ['first_clear', 'ace', 'untouchable', 'grazer', 'score_master']);
  tracker.record(run('first', { score: 90000 }));
  assert.equal(tracker.snapshot().runs, 1);
  assert.equal(tracker.snapshot().bestScore, 30000);
  const restored = Progress.create(store);
  assert.deepEqual(restored.snapshot(), tracker.snapshot());
  restored.record(run('first'));
  assert.equal(restored.snapshot().runs, 1, 'deduplication survives reload');
  for (let i = 2; i <= 10; i++) {
    const result = restored.record(run('run-' + i));
    assert.deepEqual(result.newMedals, i === 10 ? ['veteran'] : []);
  }
  assert.equal(restored.snapshot().totalKills, 68);
  assert.equal(restored.snapshot().totalSeconds, 125);
  assert.equal(restored.snapshot().bestWave, 6);
  assert.equal(restored.snapshot().bestScore, 30000);
  const detached = restored.snapshot(); detached.medals.length = 0; detached.runs = 500;
  assert.equal(restored.snapshot().medals.length, 6);
  assert.equal(restored.snapshot().runs, 10);
  first.snapshot.medals.push('fake');
  assert(!tracker.snapshot().medals.includes('fake'));
}
console.log('PASS: totals, monotonic bests, medal thresholds, persisted deduplication and detached snapshots');

{
  const tracker = Progress.create();
  const invalid = [null, [], {}, run(''), run(' '.repeat(3)), run('x'.repeat(129)), run('bad', { score: NaN }), run('bad', { wave: -1 }), run('bad', { seconds: Infinity }), run('bad', { kills: '4' }), Object.create(run('inherited'))];
  const getter = run('getter'); Object.defineProperty(getter, 'score', { get() { throw new Error('must not invoke'); } }); invalid.push(getter);
  invalid.forEach(value => tracker.record(value));
  assert.equal(tracker.snapshot().runs, 0);
  for (const saved of ['invalid JSON', 'null', '[]', '{"version":2,"runs":100}']) assert.equal(Progress.create(storage(saved)).snapshot().runs, 0);
  const tampered = '{"version":1,"runs":-1,"totalKills":"99","totalSeconds":1e999,"bestWave":8,"bestScore":500,"medals":["ace","ace","__proto__",null],"recentIds":[null,1,"old"],"__proto__":{"polluted":true}}';
  const safe = Progress.create(storage(tampered));
  assert.deepEqual(safe.snapshot(), { version: 1, runs: 0, totalKills: 0, totalSeconds: 0, bestWave: 8, bestScore: 500, medals: ['ace'] });
  safe.record(run('old')); assert.equal(safe.snapshot().runs, 0);
  assert.equal({}.polluted, undefined);
  safe.record(run('__proto__')); assert.equal(safe.snapshot().runs, 1, 'IDs are values, never prototype keys');
}
console.log('PASS: malformed runs, corrupt saves, future versions, inherited fields and prototype payloads');

{
  const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  const tracker = Progress.create(blocked);
  tracker.record(run('offline')); tracker.record(run('offline'));
  assert.equal(tracker.snapshot().runs, 1);
  const store = storage(), bounded = Progress.create(store);
  for (let i = 0; i < 105; i++) bounded.record(run('id-' + i));
  const saved = JSON.parse(store.getItem(Progress.STORAGE_KEY));
  assert.equal(saved.recentIds.length, 100);
  assert.equal(saved.recentIds[0], 'id-5');
  bounded.record(run('id-104')); assert.equal(bounded.snapshot().runs, 105);
  tracker.record(run('large', { kills: Number.MAX_VALUE, seconds: Number.MAX_VALUE }));
  tracker.record(run('large-2', { kills: Number.MAX_VALUE, seconds: Number.MAX_VALUE }));
  assert(Number.isFinite(tracker.snapshot().totalKills));
  assert(Number.isFinite(tracker.snapshot().totalSeconds));
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(require.resolve('./shooter-progress.js'), 'utf8'), context);
  assert.equal(typeof context.ShooterProgress.create, 'function');
  assert.equal(context.ShooterProgress.create().snapshot().version, 1);
}
console.log('PASS: blocked storage, bounded recent IDs, finite aggregates and browser global');
