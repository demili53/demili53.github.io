// NODE_PATH must provide Playwright. Firebase is mocked; the real canvas game runs.
// node scripts/test-lantern-keeper-browser.cjs
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const game = page => page.evaluate(() => window.__lanternKeeper.snapshot());
const mode = page => page.evaluate(() => window.__lanternKeeper.mode);

(async () => {
  const server = http.createServer((req, res) => {
    const uri = new URL(req.url, 'http://localhost').pathname;
    const file = path.resolve(root, '.' + (uri.endsWith('/') ? uri + 'index.html' : uri));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    try { res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const out = path.join(root, 'test-results'); fs.mkdirSync(out, { recursive: true });
  const errors = [];
  let browser;
  const open = async options => {
    const page = await browser.newPage(options);
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/googletagmanager|googlesyndication|google-analytics/, r => r.abort());
    await page.route('**/scripts/firebase-client.js', r => r.fulfill({ contentType: 'text/javascript', body: 'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}' }));
    await page.route('**/scripts/firebase-game-ranking.js*', r => r.fulfill({ contentType: 'text/javascript', body: 'export function initializeGameRanking(o){window.rankingGame=o.gameId;addEventListener("partygame:score",e=>{window.lastScore=e.detail})}' }));
    await page.goto(`${origin}/arcade/lantern-keeper.html`);
    await page.waitForFunction(() => window.__lanternKeeper && !document.getElementById('lkStart').disabled);
    return page;
  };
  try {
    browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : undefined);
    const page = await open({ viewport: { width: 1440, height: 1000 } });
    assert.equal(await page.locator('site-header nav a[href="/arcade/lantern-keeper.html"]').count(), 1, 'menu entry');
    assert.equal(await page.locator('site-header nav [aria-current="page"]').getAttribute('href'), '/arcade/lantern-keeper.html');
    assert.equal(await page.evaluate(() => window.rankingGame), 'lantern-keeper');
    // Simple menus: the start screen has one button and no option clutter.
    assert.equal(await page.locator('#lkOverlay button:visible').count(), 1);

    await page.click('#lkStart');
    assert.equal(await mode(page), 'play');
    await page.waitForTimeout(2500);
    let s = await game(page);
    assert(s.t > 1.5 && s.enemies > 0, 'shadows arrive');
    assert(s.shots > 0 || s.kills > 0, 'ember darts fire on their own');
    const before = s.player;
    await page.keyboard.down('KeyD'); await page.waitForTimeout(500); await page.keyboard.up('KeyD');
    s = await game(page);
    assert(s.player.x > before.x + 40, 'WASD moves the keeper');
    await page.screenshot({ path: path.join(out, 'lantern-keeper-start.png') });

    // Level up: XP opens a three-way choice; picking one adds it to the build.
    await page.evaluate(() => window.__lanternKeeper.addXp(5));
    await page.waitForFunction(() => window.__lanternKeeper.mode === 'levelup');
    assert.equal(await page.locator('.lk-choice').count(), 3);
    await page.screenshot({ path: path.join(out, 'lantern-keeper-levelup.png') });
    const offer = await page.evaluate(() => window.__lanternKeeper.choices());
    const t0 = (await game(page)).t; await page.waitForTimeout(300);
    assert.equal((await game(page)).t, t0, 'time stops while choosing');
    await page.keyboard.press('Digit2');
    s = await game(page);
    assert.equal(await mode(page), 'play'); assert.equal(s.level, 2);
    const pick = offer[1];
    assert.equal((pick.kind === 'weapon' ? s.weapons : s.charms)[pick.id], pick.level);
    // Two levels at once queue two choices.
    await page.evaluate(() => window.__lanternKeeper.addXp(40));
    await page.waitForFunction(() => window.__lanternKeeper.mode === 'levelup');
    while (await mode(page) === 'levelup') await page.locator('.lk-choice').first().click();
    assert((await game(page)).level >= 4);

    // Every art works in the real loop.
    await page.evaluate(() => { const k = window.__lanternKeeper; k.setGod(true); k.clear(); for (const id of ['halo', 'firefly', 'sunbeam', 'pool', 'flare']) k.grant('weapon', id, 5); k.spawn('vine', 24, 90); });
    await page.waitForTimeout(3500);
    s = await game(page);
    assert(s.kills > 10, 'arts kill shadows');
    assert(s.gems > 0 || s.level > 4, 'shadows drop embers');
    await page.screenshot({ path: path.join(out, 'lantern-keeper-arts.png') });

    // Bosses: spawn, show, and leave a starlight chest.
    await page.evaluate(() => { const k = window.__lanternKeeper; k.clear(); k.spawnBoss(2); let left = 3.1; while (left > 0) { const t = k.snapshot().t; k.step(left); left -= k.snapshot().t - t; if (k.mode === 'levelup') k.choose(0); } });
    s = await game(page);
    assert.equal(s.boss, 'eclipse'); assert(s.bullets > 0, 'eclipse fires shadow rings');
    await page.screenshot({ path: path.join(out, 'lantern-keeper-boss.png') });
    await page.evaluate(() => window.__lanternKeeper.killBoss());
    await page.waitForTimeout(100);
    assert.equal((await game(page)).boss, null);

    // Pause with P, stays paused, resumes.
    await page.keyboard.press('KeyP'); assert.equal(await mode(page), 'paused');
    await page.keyboard.press('KeyP'); assert.equal(await mode(page), 'play');

    // Dawn: reaching 10:00 wins with the dawn bonus and reports the score.
    await page.evaluate(() => { const k = window.__lanternKeeper; k.clear(); k.setTime(599.5); });
    await page.waitForFunction(() => window.__lanternKeeper.mode === 'over' || window.__lanternKeeper.mode === 'levelup');
    while (await mode(page) === 'levelup') await page.locator('.lk-choice').first().click();
    await page.waitForFunction(() => window.__lanternKeeper.mode === 'over');
    s = await game(page);
    assert(s.score >= 5000 + 5990, 'dawn bonus');
    assert.match(await page.locator('#lkTitle').innerText(), /새벽이 밝았다/);
    assert.equal((await page.evaluate(() => window.lastScore)).gameId, 'lantern-keeper');
    assert.match(await page.locator('#lkBest').innerText(), /점 · 10:00/);

    // Defeat: losing all HP ends the night.
    await page.click('#lkStart');
    await page.evaluate(() => window.__lanternKeeper.hurt(999));
    assert.equal(await mode(page), 'over');
    assert.match(await page.locator('#lkTitle').innerText(), /등불이 꺼졌다/);

    // Mobile: drag joystick moves the keeper; layout fits.
    const phone = await open({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await phone.click('#lkStart');
    const box = await phone.locator('#lkCanvas').boundingBox();
    assert(box.width <= 390 && box.height > box.width, 'portrait stage on phones');
    const p0 = (await game(phone)).player;
    await phone.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await phone.mouse.down();
    await phone.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2, { steps: 4 });
    await phone.waitForTimeout(600); await phone.mouse.up();
    assert((await game(phone)).player.x < p0.x - 40, 'drag moves left');
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal scroll');
    await phone.screenshot({ path: path.join(out, 'lantern-keeper-mobile.png') });

    assert.deepEqual(errors, []);
    console.log('PASS: lantern keeper browser — menu, auto attack, movement, level-up choices, all arts, boss, pause, dawn, defeat, mobile drag');
  } finally {
    await browser?.close(); server.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
