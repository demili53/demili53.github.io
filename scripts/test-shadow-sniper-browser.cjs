// Browser test for "윌리를 찾아서 저격해라". Run: node scripts/test-shadow-sniper-browser.cjs (needs playwright)
const http = require('http'), fs = require('fs'), path = require('path'), assert = require('assert');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };

(async () => {
  const server = http.createServer((req, res) => {
    const file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(fs.readFileSync(file));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/arcade/shadow-sniper.html`;
  const browser = await chromium.launch();
  const errors = [];
  const open = async options => {
    const page = await browser.newPage(options);
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/googletagmanager|googlesyndication|gstatic|firebase/, r => r.abort());
    await page.route('**/scripts/firebase-game-ranking.js*', r => r.fulfill({ contentType: 'text/javascript', body: 'export function initializeGameRanking(){}' }));
    await page.goto(url); await page.waitForFunction(() => window.__shadowSniper?.ready);
    return page;
  };
  try {
    const page = await open({ viewport: { width: 1280, height: 900 } });
    assert.strictEqual(await page.locator('h1').count(), 1);
    assert.strictEqual(await page.locator('#ssSound').isChecked(), false, 'sound starts off');
    assert.match(await page.locator('#ssClues').innerText(), /털모자/);
    assert.strictEqual(await page.locator('#ssOverlay').isVisible(), true);

    // Armory: four rifles, the start button waits until one is picked (keyboard 1-4 works too).
    assert.strictEqual(await page.locator('#ssChoices .ss-choice').count(), 4);
    assert.strictEqual(await page.locator('#ssAction').isVisible(), false);
    await page.keyboard.press('1');
    assert.strictEqual(await page.evaluate(() => window.__shadowSniper.run.weapon), 'scout');
    assert.match(await page.locator('#ssLoadout').innerText(), /정찰 소총/);
    // Start, aim with the mouse, and shoot Willy once he is in the open.
    await page.click('#ssAction');
    assert.strictEqual(await page.evaluate(() => window.__shadowSniper.run.state), 'play');
    const target = await page.evaluate(() => {
      const S = window.__shadowSniper, run = S.run, t = run.target;
      run.sway = () => ({ x: 0, y: 0 });
      t.x = 800; t.y = 760; t.state = 'idle'; t.timer = 99;
      run.stage.props = run.stage.props.filter(o => !(Math.abs(o.x - 800) < 220 && o.y > 700));
      for (const p of run.stage.people) if (p !== t && Math.abs(p.x - 800) < 60) p.x = 150;
      const b = SniperCore.personBox(run.stage, t);
      return S.toScreen(t.x, t.y - b.h * 0.55);
    });
    const box = await page.locator('#ssCanvas').boundingBox();
    await page.mouse.move(box.x + target.x, box.y + target.y);
    await page.mouse.down(); await page.mouse.up();
    assert.strictEqual(await page.evaluate(() => window.__shadowSniper.run.state), 'shot');
    assert.strictEqual(await page.locator('#ssSkip').isVisible(), true);
    await page.click('#ssSkip');
    await page.waitForFunction(() => window.__shadowSniper.run.state === 'clear');
    assert.match(await page.locator('#ssKicker').innerText(), /STAGE CLEAR/);
    assert.strictEqual(await page.locator('#ssChoices .ss-choice').count(), 3, 'three upgrades offered');
    assert.strictEqual(await page.locator('#ssAction').isVisible(), false);
    const picked = await page.locator('#ssChoices .ss-choice').first().getAttribute('data-choice');
    await page.locator('#ssChoices .ss-choice').first().click();
    if (picked !== 'medkit') assert.strictEqual(await page.evaluate(id => window.__shadowSniper.run.mods[id], picked), 1);
    assert.strictEqual(await page.evaluate(() => window.__shadowSniper.run.level), 1);

    // Keyboard: Enter starts, arrows aim, P pauses and resumes.
    await page.keyboard.press('Enter');
    const before = await page.evaluate(() => ({ ...window.__shadowSniper.run.aim }));
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(300); await page.keyboard.up('ArrowRight');
    assert.ok(await page.evaluate(x => window.__shadowSniper.run.aim.x > x, before.x), 'arrow keys move the scope');
    // E uses the rifle's special ability once per stage.
    assert.strictEqual(await page.locator('#ssAbility').isEnabled(), true);
    await page.keyboard.press('e');
    assert.ok(await page.evaluate(() => window.__shadowSniper.run.focus), 'focus is active');
    assert.strictEqual(await page.locator('#ssAbility').isEnabled(), false);
    await page.keyboard.press('p');
    assert.strictEqual(await page.evaluate(() => window.__shadowSniper.run.state), 'paused');
    const t0 = await page.evaluate(() => window.__shadowSniper.run.time); await page.waitForTimeout(300);
    assert.strictEqual(await page.evaluate(() => window.__shadowSniper.run.time), t0, 'clock frozen while paused');
    await page.keyboard.press('p');
    assert.strictEqual(await page.evaluate(() => window.__shadowSniper.run.state), 'play');

    // Game over sends the score event once and stores the best score.
    const detail = await page.evaluate(() => new Promise(resolve => {
      const got = []; addEventListener('partygame:score', e => got.push(e.detail));
      const run = window.__shadowSniper.run; run.lives = 1; run.time = 0.01; window.__shadowSniper.step(0.05);
      window.__shadowSniper.run = run; setTimeout(() => resolve(got), 200);
    }));
    assert.strictEqual(detail.length, 1); assert.strictEqual(detail[0].gameId, 'shadow-sniper');
    assert.match(await page.locator('#ssKicker').innerText(), /GAME OVER/);
    assert.match(await page.locator('#ssBest').innerText(), /점/);
    await page.click('#ssAction');
    assert.strictEqual(await page.evaluate(() => window.__shadowSniper.run.state), 'armory', 'a new run goes back to the armory');

    // Phone: the page fits, touch drags the scope.
    await page.close();
    const phone = await open({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    assert.ok(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no sideways scroll at 390px');
    await phone.tap('#ssChoices [data-choice="rapid"]'); await phone.waitForTimeout(150);
    await phone.tap('#ssAction'); await phone.waitForTimeout(150);
    const cbox = await phone.locator('#ssCanvas').boundingBox(); assert.ok(cbox.width > 300 && cbox.height > 150);
    const aim0 = await phone.evaluate(() => ({ ...window.__shadowSniper.run.aim }));
    const cdp = await phone.context().newCDPSession(phone);
    const pt = (x, y) => [{ x: cbox.x + x, y: cbox.y + y, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(100, 80) });
    for (let i = 1; i <= 5; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(100 + i * 12, 80) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok(await phone.evaluate(x => window.__shadowSniper.run.aim.x > x + 10, aim0.x), 'touch drag moves the scope');
    assert.strictEqual(await phone.evaluate(() => window.__shadowSniper.run.state), 'play', 'a drag does not fire');
    await phone.waitForTimeout(150);
    await phone.tap('#ssFire'); await phone.waitForTimeout(50);
    assert.strictEqual(await phone.evaluate(() => window.__shadowSniper.run.shotsFired), 1, 'the fire button shoots');

    assert.deepStrictEqual(errors, []);
    console.log('shadow-sniper browser test passed');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
