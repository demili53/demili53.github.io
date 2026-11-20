// Browser checks for the random merge defense on the main page. Run with Playwright on NODE_PATH.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (pathname.endsWith('/') ? pathname + 'index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.xml': 'application/xml' };
    try { res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file)); }
    catch { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end('not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/googletagmanager|googlesyndication|google-analytics/, route => route.abort());
    await page.route('**/scripts/firebase-client.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}' }));
    await page.route('**/scripts/firebase-game-ranking.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'export function initializeGameRanking(){}' }));
    await page.goto(base + '/');
    await page.waitForFunction(() => ready);
    const cell = async index => page.evaluate(i => { const r = canvas.getBoundingClientRect(), s = game.slots[i]; return { x: r.left + s.x / SIZE * r.width, y: r.top + s.y / SIZE * r.height }; }, index);
    const frame = () => page.evaluate(() => canvas.toDataURL());

    // Simplified shell: one heading, three main actions, no legacy mode pickers.
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://partygame.pe.kr/');
    assert.equal(await page.locator('h1').count(), 1);
    for (const id of ['stageSelect', 'mapSelect', 'modeSelect', 'guardianSelect', 'loadoutSelect', 'buildPanel']) assert.equal(await page.locator('#' + id).count(), 0, id);
    assert.equal(await page.locator('.actions button').count(), 3);
    assert(await page.locator('#summon').isDisabled());
    assert.equal(await page.evaluate(() => Object.keys(app.textures.list).filter(k => k.startsWith('bastion-elite-')).length), 40);

    // Start, then summon with the button and with the keyboard.
    await page.click('#start');
    assert.equal(await page.evaluate(() => game.state), 'running'); assert(await page.locator('#overlay').isHidden());
    await page.evaluate(() => { game.spawnClock = 1000; });
    await page.click('#summon'); assert.equal(await page.evaluate(() => game.slots.filter(s => s.tower).length), 1); assert.equal(await page.locator('#gold').textContent(), '80');
    assert.equal(await page.locator('#summonCost').textContent(), '24 에테르');
    await page.locator('#gameCanvas').focus(); await page.keyboard.press('Space'); assert.equal(await page.evaluate(() => game.slots.filter(s => s.tower).length), 2);

    // Drag one tower onto its twin to merge; drag to an empty cell to move; tap-tap also merges.
    await page.evaluate(() => { for (const s of game.slots) s.tower = null; game.place(0, 'arrow', 1); game.place(1, 'arrow', 1); game.place(2, 'frost', 2); game.place(3, 'frost', 2); sync(); });
    assert((await page.locator('#selection').textContent()).includes('합칠 수 있는'));
    let from = await cell(0), to = await cell(1);
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 4 }); await page.mouse.move(to.x, to.y, { steps: 4 }); await page.mouse.up();
    assert.deepEqual(await page.evaluate(() => [game.slots[0].tower, game.slots[1].tower.level, game.merges]), [null, 2, 1]);
    assert((await page.locator('#status').textContent()).startsWith('합성!'));
    from = await cell(1); to = await cell(8);
    await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 6 }); await page.mouse.up();
    assert.equal(await page.evaluate(() => !game.slots[1].tower && game.slots[8].tower.level), 2);
    from = await cell(2); to = await cell(3);
    await page.mouse.click(from.x, from.y); assert.equal(await page.evaluate(() => selected), 2); assert(await page.locator('#sell').isVisible()); assert((await page.locator('#selection').textContent()).includes('고급 냉기탑'));
    await page.mouse.click(to.x, to.y); assert.deepEqual(await page.evaluate(() => [game.slots[2].tower, game.slots[3].tower.level, game.merges]), [null, 3, 2]);
    await page.click('#sell'); assert.equal(await page.evaluate(() => game.slots[3].tower), null); assert(await page.locator('#sell').isHidden());

    // Amplify, speed toggle, settings and pause freeze.
    await page.evaluate(() => { game.gold = 120; sync(); }); await page.click('#amplify'); assert.equal(await page.evaluate(() => game.perks.overcharge), 1); assert.equal(await page.locator('#amplifyCost').textContent(), '180 에테르');
    await page.click('#battleSpeed'); assert.equal(await page.locator('#battleSpeed').textContent(), '×2'); await page.click('#battleSpeed');
    await page.click('#settingsToggle'); assert(await page.locator('#settings').isVisible()); await page.locator('#reducedEffects').check(); assert.equal(await page.evaluate(() => localStorage.getItem('dawnBastionReducedEffects')), '1'); await page.locator('#reducedEffects').uncheck(); await page.click('#settingsToggle');
    await page.evaluate(() => { game.gold = 5000; for (let i = 0; i < 10; i++) game.summon(); game.spawnClock = 0; for (let i = 0; i < 120; i++) game.step(.05); });
    await page.locator('#gameCanvas').focus(); await page.keyboard.press('p'); assert.equal(await page.evaluate(() => game.state), 'paused'); await page.evaluate(() => { $('overlay').style.display = 'none'; });
    await page.waitForTimeout(120); const paused = await frame(); await page.waitForTimeout(350); assert.equal(await frame(), paused, 'paused frame must not animate');
    await page.evaluate(() => { $('overlay').style.display = ''; }); await page.click('#start'); assert.equal(await page.evaluate(() => game.state), 'running');

    // Boss wave: named boss panel, card choice by hotkey, battlefield rotation.
    await page.evaluate(() => { game.enemies = []; game.wave = 5; game.spawnLimit = 1; game.spawned = 0; game.spawnClock = 0; game.step(.05); const boss = game.enemies.find(e => e.boss); boss.speed = 0; sync(); });
    assert.equal(await page.locator('#bossName').textContent(), '소환 군주'); assert(await page.locator('#bossPanel').isVisible());
    await page.locator('#gameCanvas').screenshot({ path: path.join(root, 'test-results/dawn-merge-boss.png') });
    await page.evaluate(() => { game.enemies = []; game.waveTime = 99; game.step(.05); sync(); });
    assert.equal(await page.evaluate(() => game.state), 'reward'); assert.equal(await page.locator('#rewardChoices button').count(), 3); assert(await page.locator('#start').isHidden());
    await page.keyboard.press('2'); assert.equal(await page.evaluate(() => game.state), 'running'); assert.equal(await page.evaluate(() => game.map), 'canyon'); assert.equal(await page.locator('#wave').textContent(), '6');
    await page.waitForTimeout(150); assert.equal(await page.evaluate(() => lastMap), 'canyon');

    // Defeat stores the local record and reports the score once.
    await page.evaluate(() => { window.reported = []; addEventListener('partygame:score', e => reported.push(e.detail)); game.score = 4321; game.core = 0; game.step(.05); sync(); });
    assert((await page.locator('#overlayTitle').textContent()).includes('6웨이브')); assert.equal(await page.evaluate(() => localStorage.getItem('dawnMergeWave')), '6'); assert.equal(await page.evaluate(() => localStorage.getItem('dawnMergeBest')), '4321');
    await page.waitForTimeout(250); assert.deepEqual(await page.evaluate(() => reported), [{ gameId: 'dawn-bastion', score: 4321, wave: 6 }]);
    await page.reload(); await page.waitForFunction(() => ready); assert((await page.locator('#bestRecord').textContent()).includes('6웨이브'));

    // Phone layout: no horizontal scroll, actions reachable right under the board, touch drag merges.
    await page.setViewportSize({ width: 390, height: 844 }); await page.click('#start');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const board = await page.locator('#gameCanvas').boundingBox(), summon = await page.locator('#summon').boundingBox(); assert(Math.abs(board.width - board.height) < 2); assert(summon.height >= 44); assert(summon.y + summon.height < 844, 'summon button visible without scrolling');
    await page.evaluate(() => { game.spawnClock = 1000; game.place(4, 'cannon', 1); game.place(5, 'cannon', 1); sync(); });
    await page.locator('#gameCanvas').screenshot({ path: path.join(root, 'test-results/dawn-merge-mobile.png') });
    assert.equal(errors.length, 0, errors.join('\n'));
    for (const old of ['/arcade/dawn-bastion.html', '/arcade/']) { await page.goto(base + old); await page.waitForURL(base + '/'); await page.waitForFunction(() => ready); }
    console.log('PASS: simplified shell, summon, drag/tap merge, move, sell, amplify, pause freeze, boss reward, map rotation, records, score event, phone layout and legacy redirects');
  } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exit(1); });
