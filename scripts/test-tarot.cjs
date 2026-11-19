const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'tarot');
const { cards } = JSON.parse(fs.readFileSync(path.join(dir, 'cards.json'), 'utf8'));
assert.equal(cards.length, 78);
assert.equal(cards.filter(c => c.arcana === 'major').length, 22);
for (const suit of ['wands', 'cups', 'swords', 'pentacles']) assert.equal(cards.filter(c => c.suit === suit).length, 14, suit);
assert.equal(new Set(cards.map(c => c.id)).size, 78);
for (const c of cards) {
  assert(c.ko && c.en && c.meaning, c.id);
  assert(fs.existsSync(path.join(dir, c.img)), c.img);
}
for (const file of ['back.jpg', 'share.jpg']) assert(fs.existsSync(path.join(dir, file)), file);
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'tarot-readings.js'), 'utf8'), sandbox);
const readings = sandbox.window.TAROT_READINGS;
for (const c of cards) {
  const r = readings[c.id];
  assert(Array.isArray(r) && r.length === 10, `${c.id}: reading fields`);
  assert(Number.isInteger(r[0]) && r[0] >= -2 && r[0] <= 2, `${c.id}: polarity`);
  for (const text of r.slice(1)) assert(typeof text === 'string' && text.length > 5 && !text.endsWith('.'), `${c.id}: text`);
}
assert.equal(Object.keys(readings).length, 78);
const js = fs.readFileSync(path.join(__dirname, 'tarot.js'), 'utf8');
assert(js.includes('crypto.getRandomValues'), 'unbiased random draw');
const html = fs.readFileSync(path.join(root, 'fortune', 'tarot.html'), 'utf8');
assert(html.indexOf('/scripts/tarot-readings.js') < html.indexOf('/scripts/tarot.js'), 'readings load first');
assert.match(html, /<textarea id="question"/);
console.log('PASS: 78 tarot cards with images, meanings and topic readings');
