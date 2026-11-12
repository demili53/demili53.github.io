const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
let checked = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', '.agents', '.idea', 'node_modules'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(file); continue; }
    if (!file.endsWith('.html')) continue;
    const html = fs.readFileSync(file, 'utf8');
    if (!/<body\b/i.test(html) || /http-equiv="refresh"/.test(html)) continue; // Verification files are not site pages.
    const label = path.relative(root, file);
    // The EXAONE download page intentionally owns its standalone promotional layout.
    if (label.replace(/\\/g, '/') === 'exaone/index.html') {
      for (const tag of ['header', 'main', 'footer']) assert.equal((html.match(new RegExp(`<${tag}\\b`, 'g')) || []).length, 1, label);
      assert.match(html, /rel="canonical" href="https:\/\/partygame\.pe\.kr\/exaone\/"/, label);
      assert.match(html, /href="\/"/, `${label}: return to games`);
      continue;
    }
    assert.equal((html.match(/src="\/scripts\/site-layout\.js"/g) || []).length, 1, label);
    assert.equal((html.match(/<site-header>/g) || []).length, 1, label);
    assert.equal((html.match(/<site-footer>/g) || []).length, 1, label);
    assert.match(html, /<main\b[^>]*\bid="mainContent"[^>]*\btabindex="-1"/, label);
    assert(html.indexOf('<site-header>') < html.indexOf('<main'), label);
    assert(html.indexOf('<site-footer>') > html.lastIndexOf('</main>'), label);
    for (const nav of html.matchAll(/<nav\b[^>]*>[\s\S]*?<\/nav>/g)) {
      const globalLinks = new Set([...nav[0].matchAll(/href="(\/|\/arcade\/|\/blog\/|\/account\.html|\/contact\.html|\/ai-ranking\/|\/game-ranking\/|\/webtoon-ranking\/)"/g)].map(m => m[1]));
      assert(globalLinks.size < 3, `${label}: duplicate global navigation`);
    }
    assert(!html.includes('const firebaseConfig'), `${label}: duplicated Firebase configuration`);
    checked++;
  }
}
walk(root);
for (const file of ['account.html', 'scripts/firebase-game-ranking.js']) {
  assert(fs.readFileSync(path.join(root, file), 'utf8').includes('/scripts/firebase-client.js'), file);
}
assert(checked > 0);
console.log(`PASS: ${checked} pages share header/main/footer; no duplicate global menus or auth initialization`);
