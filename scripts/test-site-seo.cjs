const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const origin = 'https://partygame.pe.kr';
const games = [['index.html', '/'], ['arcade/space-shooter.html', '/arcade/space-shooter.html']];
for (const [file, url] of games) {
  const html = read(file);
  assert(html.includes(`rel="canonical" href="${origin}${url}"`), file);
  assert.match(html, /<html lang="ko">/);
  assert.match(html, /<meta name="description" content="[^"]{30,}"/);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, file);
  assert(!html.includes('noindex'), file);
  const data = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
  const entities = data.flatMap(d => d['@graph'] || [d]);
  assert(entities.some(d => d['@type'] === 'VideoGame' && d.url === origin + url), file);
  assert(!entities.some(d => d.aggregateRating || d.review), 'Do not invent ratings');
}
assert.match(read('index.html'), /<script id="gameLogic">/);
assert.match(read('index.html'), /id="gameGuide"/);
assert.match(read('index.html'), /<details>/);
for (const file of ['arcade/index.html', 'arcade/dawn-bastion.html']) {
  assert.match(read(file), /http-equiv="refresh" content="0;url=\/"/);
  assert(read(file).includes(`rel="canonical" href="${origin}/"`));
}
const urls = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
assert.deepEqual(urls.sort(), games.map(([, url]) => origin + url).sort());
assert(!read('robots.txt').includes('blog'));
assert.match(read('404.html'), /noindex, follow/);
for (const dir of ['blog', 'ai-ranking', 'game-ranking', 'webtoon-ranking', 'downloads']) assert(!fs.existsSync(path.join(root, dir)), dir);
for (const file of ['2048.html', 'send-volume-calculator.html', 'ffmpeg-video-joiner.html', 'arcade/zombi-shot.html', 'arcade/vampire-survival.html']) assert(!fs.existsSync(path.join(root, file)), file);
for (const file of ['index.html', 'arcade/space-shooter.html', 'account.html', 'privacy.html', 'terms.html', 'contact.html', '404.html']) {
  const html = read(file);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)[^\"]*"/g)) {
    const url = match[1];
    const target = path.join(root, url.endsWith('/') ? url + 'index.html' : url);
    assert(fs.existsSync(target), `${file}: broken local link ${url}`);
  }
}
const shell = read('scripts/site-layout.js');
assert(!/\/blog\/|\/ai-ranking\/|\/webtoon-ranking\//.test(shell));
console.log('PASS: playable defense homepage, two-game sitemap, metadata/schema, legacy redirects, removed content, local links and 404');
