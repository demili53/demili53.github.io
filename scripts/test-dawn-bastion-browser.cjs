// Run with Playwright available on NODE_PATH. Uses the real PixiJS CDN build.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    try {
      res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html; charset=utf-8' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'application/octet-stream');
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1360, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/googletagmanager|googlesyndication|google-analytics/, route => route.abort());
    await page.goto(`http://127.0.0.1:${server.address().port}/arcade/dawn-bastion.html`);
    await page.waitForFunction(() => !document.getElementById('start').disabled);
    await page.click('#start');
    await page.click('#build');
    await page.getByRole('button', { name: /연사탑 · 60 에테르/ }).click();
    assert.equal(await page.locator('#gold').textContent(), '60');
    await page.getByRole('button', { name: /강화 → Lv.2/ }).click();
    assert.equal(await page.locator('#gold').textContent(), '0');
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
    await page.screenshot({ path: path.join(root, 'test-results/dawn-bastion-desktop.png'), fullPage: true });
    await page.click('#returnBattle');
    await page.keyboard.down('d'); await page.waitForTimeout(250); await page.keyboard.up('d');
    assert.ok(await page.evaluate(() => game.player.x > 360));
    await page.keyboard.press('p');
    const time = await page.evaluate(() => game.time);
    await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => game.time), time);
    await page.click('#start');
    await page.evaluate(() => { game.player.hp = 0; });
    await page.waitForFunction(() => game.state === 'lost');
    await page.click('#start');
    assert.equal(await page.locator('#gold').textContent(), '120');
    assert.equal(await page.evaluate(() => game.slots.filter(slot => slot.tower).length), 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('#build');
    await page.screenshot({ path: path.join(root, 'test-results/dawn-bastion-mobile.png'), fullPage: true });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.click('#returnBattle');
    const rect = await page.locator('#gameCanvas').boundingBox();
    const cdp = await page.context().newCDPSession(page);
    const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 60, y }] });
    await page.waitForTimeout(250);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(await page.evaluate(() => game.player.x > 360));
    assert.equal(await page.evaluate(() => stick), null);
    // Verify final-wave result, persisted local best, and ranking event payload.
    await page.evaluate(() => {
      window.addEventListener('partygame:score', e => { window.result = e.detail; }, { once: true });
      game.wave = 10; game.waveTime = 28; game.spawned = game.spawnLimit;
      game.enemies = []; game.score = 1000;
    });
    await page.waitForFunction(() => game.state === 'won');
    assert.equal(await page.evaluate(() => window.result.gameId), 'dawn-bastion');
    assert.equal(await page.evaluate(() => Number(localStorage.getItem('dawnBastionBest'))), 3150);
    assert.deepEqual(errors, []);
    console.log('PASS: real Pixi, desktop/mobile, build/upgrade, keyboard/touch, pause, loss/restart, victory, local record and score event');
  } finally {
    if (browser) await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
