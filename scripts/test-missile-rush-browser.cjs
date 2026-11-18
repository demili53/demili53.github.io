// NODE_PATH must provide Playwright. Firebase is mocked; the real canvas game runs.
// UPDATE_SHARE_IMAGES=1 also regenerates assets/games/missile-rush/share.png.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const game = page => page.evaluate(() => window.__missileRush.snapshot());
const mode = page => page.evaluate(() => window.__missileRush.mode);

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
  const open = async (options) => {
    const page = await browser.newPage(options);
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/googletagmanager|googlesyndication|google-analytics/, r => r.abort());
    await page.route('**/scripts/firebase-client.js', r => r.fulfill({ contentType: 'text/javascript', body: 'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}' }));
    await page.route('**/scripts/firebase-game-ranking.js*', r => r.fulfill({ contentType: 'text/javascript', body: 'export function initializeGameRanking(o){window.rankingGame=o.gameId}' }));
    await page.goto(`${origin}/arcade/missile-rush.html`);
    await page.waitForFunction(() => window.__missileRush && !document.getElementById('startRush').disabled);
    return page;
  };
  try {
    browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : undefined);
    const page = await open({ viewport: { width: 1440, height: 1000 } });
    assert.equal(await page.locator('site-header nav a[href="/arcade/missile-rush.html"]').count(), 1, 'menu entry');
    assert.equal(await page.evaluate(() => window.rankingGame), 'missile-rush');

    await page.click('#startRush');
    await page.waitForTimeout(2500);
    let s = await game(page);
    assert.equal(s.wave, 1); assert(s.missiles > 0, 'auto fire');
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(300); await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(2500);
    s = await game(page);
    assert(s.enemies > 0 || s.score > 0, 'enemies arrive');
    await page.screenshot({ path: path.join(out, 'missile-rush-wave1.png') });

    // Level up: three cards, choose with key 2.
    await page.evaluate(() => window.__missileRush.grantXp(11));
    assert.equal(await mode(page), 'choose');
    assert.equal(await page.locator('#upgradeChoices .rush-card').count(), 3);
    await page.locator('.rush-stage').screenshot({ path: path.join(out, 'missile-rush-levelup.png') });
    const chosen = (await game(page)).choices[1];
    await page.keyboard.press('Digit2');
    s = await game(page);
    assert.equal(s.levels[chosen], 1); assert.equal(await mode(page), 'play');

    // Several pending level-ups chain one card after another.
    await page.evaluate(() => window.__missileRush.grantXp(200));
    let picks = 0;
    while (await mode(page) === 'choose' && picks < 30) { await page.locator('#upgradeChoices .rush-card').first().click(); picks++; }
    assert(picks >= 3, 'chained level ups');
    assert((await page.locator('#upgradeList li:not(.empty)').count()) >= 1);

    // Boss wave and missile evolution.
    await page.evaluate(() => window.__missileRush.startWave(5));
    await page.waitForTimeout(1800);
    assert((await game(page)).enemies >= 1);
    await page.screenshot({ path: path.join(out, 'missile-rush-boss.png') });
    await page.evaluate(() => window.__missileRush.killBoss());
    assert.equal((await game(page)).tier, 2);
    assert.match(await page.locator('#tierName').innerText(), /Mk\.II/);

    // Pause freezes the simulation.
    await page.keyboard.press('KeyP');
    assert.equal(await mode(page), 'paused');
    const frozen = JSON.stringify(await game(page));
    await page.waitForTimeout(400);
    assert.equal(JSON.stringify(await game(page)), frozen);
    await page.keyboard.press('KeyP');
    assert.equal(await mode(page), 'play');

    // Game over sends one score event for the ranking module.
    await page.evaluate(() => { window.scoreEvents = []; addEventListener('partygame:score', e => scoreEvents.push(e.detail)); });
    await page.evaluate(() => window.__missileRush.startWave(40));
    await page.waitForFunction(() => window.__missileRush.mode === 'over' || window.__missileRush.mode === 'choose', null, { timeout: 90000, polling: 200 });
    while (await mode(page) !== 'over') {
      if (await mode(page) === 'choose') await page.locator('#upgradeChoices .rush-card').first().click();
      await page.waitForTimeout(200);
    }
    const events = await page.evaluate(() => window.scoreEvents);
    assert.equal(events.length, 1); assert.equal(events[0].gameId, 'missile-rush'); assert(events[0].score > 0);
    assert.match(await page.locator('#rushBest').innerText(), /웨이브/);
    await page.screenshot({ path: path.join(out, 'missile-rush-gameover.png') });

    // Mobile: drag moves the launcher, layout fits without horizontal scroll.
    const mobile = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await mobile.click('#startRush');
    const canvas = mobile.locator('#rushCanvas');
    const box = await canvas.boundingBox();
    const before = await mobile.evaluate(() => window.__missileRush.player());
    await canvas.dispatchEvent('pointerdown', { pointerId: 1, clientX: box.x + box.width / 2, clientY: box.y + box.height * .8, isPrimary: true });
    await canvas.dispatchEvent('pointermove', { pointerId: 1, clientX: box.x + box.width * .2, clientY: box.y + box.height * .8, isPrimary: true });
    await canvas.dispatchEvent('pointerup', { pointerId: 1 });
    const after = await mobile.evaluate(() => window.__missileRush.player());
    assert(after.x < before.x - 80, `drag moves launcher (${before.x} -> ${after.x})`);
    assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll');
    const fit = await mobile.evaluate(() => { const c = document.getElementById('rushCanvas').getBoundingClientRect(), h = document.querySelector('site-header').getBoundingClientRect(), hud = document.querySelector('.rush-hud').getBoundingClientRect(); return { top: hud.top, header: h.bottom, bottom: c.bottom, height: innerHeight, ratio: c.width / c.height }; });
    assert(fit.top >= fit.header - 1 && fit.bottom <= fit.height + 1, `HUD and whole battlefield visible on phone ${JSON.stringify(fit)}`);
    assert(Math.abs(fit.ratio - 480 / 760) < .01, 'canvas keeps its aspect ratio');
    await mobile.waitForTimeout(1500);
    await mobile.screenshot({ path: path.join(out, 'missile-rush-mobile.png') });

    if (process.env.UPDATE_SHARE_IMAGES === '1') {
      const share = await open({ viewport: { width: 1200, height: 900 } });
      await share.click('#startRush');
      await share.evaluate(() => window.__missileRush.grantXp(500));
      for (let i = 0; i < 40 && await mode(share) === 'choose'; i++) await share.locator('#upgradeChoices .rush-card').first().click();
      for (let i = 0; i < 2; i++) { await share.evaluate(() => window.__missileRush.startWave(5)); await share.evaluate(() => window.__missileRush.killBoss()); }
      await share.evaluate(() => window.__missileRush.startWave(10));
      await share.waitForTimeout(3200);
      await share.evaluate(() => window.__missileRush.freeze());
      const shot = Buffer.from((await share.evaluate(() => document.getElementById('rushCanvas').toDataURL('image/png'))).split(',')[1], 'base64');
      await share.setViewportSize({ width: 1200, height: 630 });
      await share.setContent(`<body style="margin:0;width:1200px;height:630px;background:linear-gradient(120deg,#0a0f24,#1d1530);display:flex;align-items:center;gap:60px;font-family:'Malgun Gothic',sans-serif;color:#fff;overflow:hidden"><img src="data:image/png;base64,${shot.toString('base64')}" style="height:630px;margin-left:110px;box-shadow:0 0 60px #0008"><div><div style="color:#ffad66;letter-spacing:.2em;font-size:18px;font-weight:700">ENDLESS WEAPON UPGRADE</div><h1 style="font-size:86px;margin:16px 0;letter-spacing:-.03em">미사일 러시</h1><p style="font-size:28px;color:#b3c4db;line-height:1.55;margin:0">쏟아지는 적을 막고<br>미사일을 끝없이 업그레이드</p></div></body>`);
      fs.mkdirSync(path.join(root, 'assets/games/missile-rush'), { recursive: true });
      await share.screenshot({ path: path.join(root, 'assets/games/missile-rush/share.png') });
    }
    assert.deepEqual(errors, [], 'no page errors');
    console.log('PASS: missile rush auto-fire, waves, level-up cards (keys/click, chained), boss evolution, pause freeze, game-over score event, mobile drag and layout');
  } finally { await browser?.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
