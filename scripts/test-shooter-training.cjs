const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const training = require('./shooter-training.js');
const defaults = { wave: 5, level: 5, invincible: true };
for (const config of [undefined, null, [], ['wave', 20], '20', 20, true]) assert.deepEqual(training.normalize(config), defaults);
for (const wave of [1, 5, 10, 15, 20]) assert.equal(training.normalize({ wave }).wave, wave);
for (const wave of [0, 2, 100, NaN, Infinity, '15']) assert.equal(training.normalize({ wave }).wave, 5);
assert.deepEqual(training.normalize({ wave: 20, level: 12, invincible: false }), { wave: 20, level: 10, invincible: false });
assert.equal(training.normalize({ level: -10 }).level, 1);
assert.equal(training.normalize({ level: 6.9 }).level, 6);
for (const level of [NaN, Infinity, -Infinity, '8', null]) assert.equal(training.normalize({ level }).level, 5);
for (const value of [0, 1, 'false', null]) assert.equal(training.normalize({ invincible: value }).invincible, true);
let accessed = false;
const accessors = {};
for (const key of ['wave', 'level', 'invincible']) Object.defineProperty(accessors, key, { get() { accessed = true; throw new Error('should not evaluate accessor'); } });
assert.deepEqual(training.normalize(accessors), defaults); assert.equal(accessed, false);
assert.deepEqual(training.normalize(Object.create({ wave: 20, level: 10, invincible: false })), defaults);
assert.deepEqual(training.normalize(new Proxy({}, { getOwnPropertyDescriptor() { throw new Error('blocked'); } })), defaults);
const revoked = Proxy.revocable({}, {}); revoked.revoke(); assert.deepEqual(training.normalize(revoked.proxy), defaults);
console.log('PASS: allowed waves, integer level limits, strict booleans and safe malformed configuration');

const targets = training.buildTargets({ wave: 20, level: 10 });
assert.deepEqual(targets.map(target => target.x), [140, 240, 340]);
assert(targets.every(target => target.y === 180 && target.hp === 110 && target.maxHp === 110 && target.type === 'grunt' && target.trainingTarget && target.vy === 0 && target.vx === 0 && target.score === 0));
for (const [width, height] of [[40, 40], [100, 120], [320, 480], [960, 720]]) {
  const array = training.buildTargets({}, width, height);
  assert.equal(array.length, 3);
  assert(array.every(target => [target.x, target.y, target.hp].every(Number.isFinite) && target.x - target.w / 2 >= 0 && target.x + target.w / 2 <= width && target.y - target.h / 2 >= 0 && target.y + target.h / 2 <= height));
}
for (const invalid of [NaN, Infinity, 0, -1, '320', null]) assert.deepEqual(training.buildTargets({}, invalid, invalid), training.buildTargets({}));
targets[0].hp = 1; targets[0].x = -1;
assert.equal(targets[1].hp, 110);
assert.equal(training.buildTargets({ wave: 20 })[0].hp, 110);
assert.equal(training.describe({ wave: 15, level: 8, invincible: false }), '훈련 · 웨이브 15 · 무기 Lv.8 · 무적 꺼짐');
const sandbox = {}; vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'shooter-training.js'), 'utf8'), sandbox);
assert.equal(sandbox.ShooterTraining.normalize({ wave: 10 }).wave, 10);
console.log('PASS: stationary finite targets, field bounds, detached arrays, Korean description and browser global');
