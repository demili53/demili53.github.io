const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const dir = path.join(__dirname, '..', 'assets', 'tarot');
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
const js = fs.readFileSync(path.join(__dirname, 'tarot.js'), 'utf8');
assert(js.includes('crypto.getRandomValues'), 'unbiased random draw');
console.log('PASS: 78 tarot cards with images, names and meanings');
