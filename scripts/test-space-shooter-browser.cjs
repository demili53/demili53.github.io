const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const server = http.createServer((req, res) => {
    const file = path.resolve(root, '.' + new URL(req.url, 'http://localhost').pathname);
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    try {
      res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' })[path.extname(file)] || 'application/octet-stream');
      res.end(fs.readFileSync(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
    const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route(/googletagmanager|googlesyndication|google-analytics/, route => route.abort());
    await page.route('**/scripts/firebase-client.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}' }));
    await page.route('**/scripts/firebase-game-ranking.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'export function initializeGameRanking(){}' }));
    await page.goto(`http://127.0.0.1:${server.address().port}/arcade/space-shooter.html`);
    await page.waitForFunction(() => typeof player !== 'undefined' && player && game.isRunning());
    await page.click('#overlayStartBtn');
    await page.waitForFunction(() => pBullets.length > 0);
    // Freeze the engine; exercise deterministic simulation steps against the real page.
    await page.evaluate(() => game.stop());
    const check = async (label, fn) => { assert.equal(await page.evaluate(fn), true, label); console.log('PASS:', label); };
    await check('1. movement, focus, input loss and pause freeze', () => {
      resetGame(); startGame(); keys.KeyD = true; update(.1); const straight = player.x - W / 2;
      resetGame(); startGame(); keys.KeyD = true; keys.KeyS = true; update(.1);
      const diagonal = Math.hypot(player.x - W / 2, player.y - (H - 90));
      resetGame(); startGame(); keys.KeyD = true; focusMode = true; update(.1);
      const slow = player.x - W / 2;
      suspendInput(); const before = JSON.stringify([player, stars, particles, waveTimer]); update(1);
      return Math.abs(straight - diagonal) < .001 && slow < straight / 2 && state === 'paused' && !keys.KeyD && before === JSON.stringify([player, stars, particles, waveTimer]);
    });
    await check('2. seven weapons preserve level and cooldown, HUD tracks state', () => {
      resetGame(); startGame(); player.level = 7; player.cooldown = .3;
      for (const key of WEAPON_KEYS) { changeWeapon(key); pBullets = []; playerFire(); if (!pBullets.length || player.level !== 7 || player.cooldown !== .3) return false; }
      return el('weaponSelect').options.length === 7 && levelEl.textContent.includes('Lv.7') && el('bombBtn').textContent.includes('2');
    });
    await check('3. shield blocks one hit then health takes damage', () => {
      resetGame(); startGame(); applyItem('shield'); const hp = player.lives; hitPlayer();
      if (player.lives !== hp || player.shield !== 0 || hitsTaken !== 0) return false;
      player.invuln = 0; hitPlayer(); return player.lives === hp - 1 && hitsTaken === 1;
    });
    await check('4. nearby items attract and distant items do not', () => {
      resetGame(); startGame(); items = [{ x: player.x + 60, y: player.y, vy: 0, kind: 'power' }, { x: 20, y: 20, vy: 0, kind: 'life' }];
      update(.1); if (!(items[0].x < player.x + 60) || items[1].x !== 20) return false;
      for (let i = 0; i < 10; i++) update(.05);
      return player.level === 2;
    });
    await check('5. boss overdrive and defeat advance exactly once', () => {
      resetGame(); startGame(); wave = 5; spawnBoss(); const b = enemies[0]; b.entering = false; b.y = 90; b.hp = b.maxHp * .4; b.fireCd = 0;
      update(.01); if (!b.enraged || b.fireCd >= 1) return false;
      b.hp = 0; update(.01);
      return wave === 6 && !bossActive && state === 'reward' && rewardWave === 5 && kills === 1 && eBullets.length === 0;
    });
    await check('6. boss attack warning has a readable lead-in', () => {
      resetGame(); startGame(); wave = 10; spawnBoss(); const b = enemies[0]; b.entering = false; b.y = 90; b.fireCd = .35;
      update(.1); if (eBullets.length || b.fireCd >= .4) return false;
      update(.3); return eBullets.length > 0 && b.fireCd > .4;
    });
    await check('7. wave reward pauses and cannot be bypassed', () => {
      resetGame(); startGame(); wave = 3; waveTimer = WAVE_LEN - .01; update(.02);
      startGame(); bomb(); const before = JSON.stringify([player, enemies, items]); update(2);
      return state === 'reward' && wave === 4 && rewardWave === 3 && before === JSON.stringify([player, enemies, items]) && el('rewardChoices').children.length === 4;
    });
    await page.locator('#rewardChoices button').first().click();
    assert.equal(await page.evaluate(() => state === 'playing' && player.level === 2 && player.invuln >= 1), true);
    await check('8. combo expiry and bomb score are consistent', () => {
      resetGame(); startGame(); spawnEnemy(); bomb();
      if (score <= 0 || combo !== 1 || kills !== 1) return false;
      spawnTimer = 99; update(2.6); return combo === 0 && maxCombo === 1;
    });
    await check('9. game over emits once and reports run statistics', () => {
      resetGame(); startGame(); window.testScores = [];
      window.addEventListener('partygame:score', e => window.testScores.push(e.detail));
      score = 1234; kills = 8; maxCombo = 6; elapsed = 42; player.lives = 1;
      hitPlayer(); gameOver();
      return state === 'over' && window.testScores.length === 1 && window.testScores[0].score === 1234 && overlayText.textContent.includes('격추 8대') && overlayText.textContent.includes('42초');
    });
    await check('10. loadout storage and restart reset temporary upgrades', () => {
      selectedShip = 'speed'; preferredWeapon = 'railgun'; saveLoadout(); resetGame();
      const saved = JSON.parse(localStorage.getItem('spaceShooterLoadout'));
      return saved.ship === 'speed' && player.ship === 'speed' && player.weapon === 'railgun' && player.shield === 0 && kills === 0 && maxCombo === 0 && !focusMode;
    });
    await require('./test-space-shooter-expansion.cjs')(check, page);
    await require('./test-space-shooter-tactics.cjs')(check, page);
    await page.evaluate(() => { selectedShip = 'speed'; preferredWeapon = 'railgun'; saveLoadout(); });
    await page.reload();
    await page.waitForFunction(() => typeof player !== 'undefined' && player && game.isRunning());
    assert.equal(await page.evaluate(() => player.ship === 'speed' && player.weapon === 'railgun'), true);
    await page.click('#overlayStartBtn');
    await page.evaluate(() => { player.invuln = 3; wave = 10; spawnBoss(); player.level = 7; applyItem('shield'); });
    await page.waitForTimeout(1600);
    fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
    await page.evaluate(() => { player.invuln = 0; });
    await page.screenshot({ path: path.join(root, 'test-results/space-shooter-upgraded-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('#combatPauseBtn');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(root, 'test-results/space-shooter-upgraded-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.click('#overlayStartBtn');
    await page.click('#focusBtn');
    assert.equal(await page.locator('#focusBtn').getAttribute('aria-pressed'), 'true');
    await page.evaluate(() => { game.stop(); rewardWave = 10; showReward(); });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(root, 'test-results/space-shooter-upgraded-reward.png'), fullPage: true });
    await page.locator('#rewardChoices button').last().click();
    assert.equal(await page.evaluate(() => state), 'playing');
    await page.setViewportSize({ width: 320, height: 740 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, '320px page has no horizontal overflow');
    await page.evaluate(() => { rewardWave = 12; showReward(); });
    const bounds = await page.locator('#gameOverlay').boundingBox();
    const lastChoice = await page.locator('#rewardChoices button').last().boundingBox();
    assert(lastChoice.y + lastChoice.height <= bounds.y + bounds.height, 'all four rewards fit at 320px');
    await page.click('#rewardModeBtn');
    assert.equal(await page.evaluate(() => rewardMode), 'modules');
    const switchBounds = await page.locator('#rewardModeBtn').boundingBox();
    assert(switchBounds.y + switchBounds.height <= bounds.y + bounds.height, 'refit switch fits at 320px');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(root, 'test-results/space-shooter-refit-mobile.png'), fullPage: true });
    await page.click('#rewardModeBtn');
    await page.locator('#rewardChoices button').last().click();
    await page.evaluate(() => { el('gameCanvas').dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch' })); });
    assert.equal(await page.evaluate(() => pointerIsTouch && pointerControlEnabled), true);
    await page.evaluate(() => { el('gameCanvas').dispatchEvent(new PointerEvent('pointercancel')); });
    assert.equal(await page.evaluate(() => pointerControlEnabled), false);
    await page.locator('#gameCanvas').focus();
    await page.evaluate(() => { dashCooldown = 0; charge = 100; });
    await page.keyboard.press('r');
    assert.equal(await page.evaluate(() => dashCooldown), 5);
    await page.keyboard.press('c');
    assert.equal(await page.evaluate(() => overdriveTime), 4);
    await page.click('#fullscreenBtn');
    await page.waitForFunction(() => document.fullscreenElement === el('gameShell'));
    const fullscreenFit = await page.evaluate(() => {
      const board = el('gameViewport').getBoundingClientRect(), controls = el('gameControls').getBoundingClientRect();
      return Math.abs(board.width / board.height - .75) < .02 && board.top >= 0 && controls.bottom <= innerHeight && controls.width <= innerWidth;
    });
    assert.equal(fullscreenFit, true, 'mobile fullscreen keeps board and controls within view');
    await page.evaluate(() => document.exitFullscreen());
    await check('120-second combat simulation has bounded entities and valid progression', () => {
      resetGame(); startGame(); player.level = 10; player.invuln = 999;
      for (let frame = 0; frame < 2400; frame++) {
        update(.05);
        if (state === 'reward') el('rewardChoices').firstElementChild.click();
        if (state !== 'playing' || !Number.isFinite(player.x + player.y + score) || enemies.length > 40 || eBullets.length > 180 || notices.length > 20) return false;
      }
      return elapsed > 110 && wave >= 5 && kills > 10;
    });
    assert.deepEqual(errors, []);
    console.log('PASS: real engine render, reload persistence, mobile layout, reward buttons and no runtime errors');
  } finally { if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; });
