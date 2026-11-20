// 비행기 게임 브라우저 검증: node scripts/test-space-shooter-browser.cjs
// 오프라인이면 TAILWIND_LOCAL_CSS에 미리 만든 CSS 경로를 준다.
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
  let browser, n = 0;
  const pass = name => { n += 1; console.log(`PASS ${n}. ${name}`); };
  try {
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
    const open = async (viewport) => {
      const page = await browser.newPage({ viewport });
      page.errors = []; page.on('pageerror', e => page.errors.push(e.message));
      await page.route(/googletagmanager|googlesyndication|google-analytics/, route => route.abort());
      if (process.env.TAILWIND_LOCAL_CSS) await page.route(/cdn\.tailwindcss\.com/, route => route.fulfill({ contentType: 'text/javascript', body: `document.head.appendChild(Object.assign(document.createElement('style'),{textContent:${JSON.stringify(fs.readFileSync(process.env.TAILWIND_LOCAL_CSS, 'utf8'))}}));` }));
      await page.route('**/scripts/firebase-game-ranking.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'export function initializeGameRanking(o){window.__ranking=o}' }));
      await page.addInitScript(() => { window.__scores = []; window.addEventListener('partygame:score', e => window.__scores.push(e.detail)); });
      await page.goto(`http://127.0.0.1:${server.address().port}/arcade/space-shooter.html`);
      await page.waitForFunction(() => window.ShooterGame);
      return page;
    };
    const page = await open({ width: 1280, height: 1000 });
    const run = (fn, arg) => page.evaluate(fn, arg);

    assert.equal(await run(() => ShooterGame.state), 'title');
    assert.deepEqual(await run(() => window.__ranking), { gameId: 'space-shooter', gameName: '우주 슈팅' });
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.locator('#gameOverlay').isVisible(), true);
    pass('대기 화면과 순위 연결');

    await page.locator('.ship-choice[data-ship="speed"]').click();
    await page.locator('#overlayStartBtn').click();
    assert.deepEqual(await run(() => [ShooterGame.state, ShooterGame.run.ship, ShooterGame.run.wave, ShooterGame.run.lives]), ['playing', 'speed', 1, 3]);
    assert.equal(await page.locator('#gameOverlay').isVisible(), false);
    pass('기체를 고르고 출격');

    await run(() => ShooterGame.freeze(true));   // 이후는 직접 시간을 진행한다
    const tick = (seconds) => run(s => { for (let i = 0; i < Math.round(s * 60); i += 1) ShooterGame.update(1 / 60); ShooterGame.draw(); }, seconds);

    await run(() => { const G = ShooterGame.run; G.plan.events = []; G.planI = 0; G.enemies = []; ShooterGame.spawn('grunt', G.player.x, 300, { move: 'hover', holdY: 300 }).hp = 3; });
    await tick(1.5);
    assert.deepEqual(await run(() => { const G = ShooterGame.run; return [G.kills, G.chain >= 1, G.score > 0, G.shots.length > 0]; }), [1, true, true, true]);
    pass('자동 발사로 격추하면 점수와 연쇄가 오른다');

    await run(() => { const G = ShooterGame.run; G.plan = { boss: false, events: [{ t: 99, type: 'grunt', x: 0, y: 0 }] }; G.planI = 0; G.planT = 0; G.gems = []; G.items = [{ x: G.player.x, y: G.player.y - 30, kind: 'power', age: 0, cycle: ['spread'] }]; });
    await tick(.5);
    assert.equal(await run(() => ShooterGame.run.level), 2);
    await run(() => { const G = ShooterGame.run; G.weapon = 'vulcan'; G.items = [{ x: G.player.x, y: G.player.y - 30, kind: 'weapon', age: 1.5, cycle: ['laser', 'spread', 'wave'] }]; });   // 1.4초가 지나 두 번째 무기로 바뀐 상자
    await tick(.4);
    assert.equal(await run(() => ShooterGame.run.weapon), 'spread');
    pass('강화 아이템과 무기 교체 아이템');

    await run(() => { const G = ShooterGame.run; G.player.invuln = 0; G.level = 3; G.chain = 9; G.bullets = [{ x: G.player.x, y: G.player.y, vx: 0, vy: 0, r: 5 }]; });
    await tick(.05);
    assert.deepEqual(await run(() => { const G = ShooterGame.run; return [G.lives, G.level, G.chain, G.bullets.length, G.player.invuln > 1]; }), [2, 2, 0, 0, true]);
    await run(() => { const G = ShooterGame.run; G.bullets = [{ x: G.player.x, y: G.player.y, vx: 0, vy: 0, r: 5 }]; });
    await tick(.05);
    assert.equal(await run(() => ShooterGame.run.lives), 2);
    pass('피격하면 라이프와 화력이 줄고 잠시 무적이 된다');

    await run(() => { const G = ShooterGame.run; G.player.invuln = 0; G.shield = true; ShooterGame.hitPlayer(); });
    assert.deepEqual(await run(() => [ShooterGame.run.lives, ShooterGame.run.shield]), [2, false]);
    pass('방어막은 한 번 막아 준다');

    await run(() => { const G = ShooterGame.run; G.player.invuln = 0; G.gems = []; G.bullets = Array.from({ length: 12 }, (_, i) => ({ x: 40 + i * 30, y: 200, vx: 0, vy: 0, r: 5 })); ShooterGame.spawn('grunt', 100, 200, { move: 'hover', holdY: 200 }); });
    await page.keyboard.press('KeyB');
    assert.deepEqual(await run(() => { const G = ShooterGame.run; return [G.bombs, G.bullets.length, G.gems.length >= 12, G.player.invuln > 0]; }), [1, 0, true, true]);
    assert.match(await page.locator('#bombBtn').textContent(), /1/);
    pass('봄은 적탄을 보석으로 바꾼다');

    // 무기: 교체하면 직전 무기가 보조 무기가 되고, 6단계에서 EX가 된다.
    await run(() => { const G = ShooterGame.run; G.enemies = []; G.weapon = 'vulcan'; G.sub = null; G.level = 5; G.items = [{ x: G.player.x, y: G.player.y - 30, kind: 'weapon', age: 0, cycle: ['chain'] }]; });
    await tick(.4);
    assert.deepEqual(await run(() => [ShooterGame.run.weapon, ShooterGame.run.sub]), ['chain', 'vulcan']);
    await tick(.6);
    assert.ok(await run(() => ShooterGame.run.shots.some(s => s.kind === 'vulcan') && ShooterGame.run.shots.some(s => s.kind === 'chain')));
    await run(() => ShooterGame.give('power'));
    assert.equal(await run(() => ShooterGame.run.level), 6);
    await run(() => ShooterGame.give('power'));
    assert.equal(await run(() => ShooterGame.run.level), 6);
    pass('보조 무기와 EX 단계');

    await run(() => { const G = ShooterGame.run; G.shots = []; G.sub = null; G.player.x = 240; const a = ShooterGame.spawn('armored', 240, 300, { move: 'hover', holdY: 300 }), b = ShooterGame.spawn('armored', 300, 280, { move: 'hover', holdY: 280 }); a.hp = a.maxHp = b.hp = b.maxHp = 900; });
    await tick(1);
    assert.ok(await run(() => ShooterGame.run.enemies.every(e => e.hp < 900)));   // 번개가 옆의 적으로 옮겨 붙었다
    await run(() => { const G = ShooterGame.run; G.weapon = 'plasma'; G.shots = []; G.enemies.forEach(e => { e.hp = 900; }); });
    await tick(1.5);
    assert.ok(await run(() => ShooterGame.run.enemies.every(e => e.hp < 900)));   // 폭발이 옆의 적까지 닿았다
    pass('번개 연쇄와 플라즈마 폭발');

    for (const weapon of await run(() => ShooterCore.WEAPON_KEYS)) {
      const left = await run(w => { const G = ShooterGame.run; G.weapon = w; G.bombs = 1; G.shots = []; G.player.invuln = 0; G.player.x = 240; G.player.y = 540; G.enemies = []; for (const x of [200, 280]) { const e = ShooterGame.spawn('armored', x, 300, { move: 'hover', holdY: 300 }); e.hp = e.maxHp = 900; } ShooterGame.useBomb(); return G.bombs; }, weapon);
      assert.equal(left, 0, weapon);
      await tick(1.6);
      assert.ok(await run(() => ShooterGame.run.enemies.some(e => e.hp < 885)), weapon);   // 기본 피해 15보다 더 들어갔다
    }
    pass('무기 7종마다 다른 봄');

    await run(() => { const G = ShooterGame.run; G.weapon = 'laser'; G.mastery = { laser: 14 }; G.enemies = []; G.shots = []; G.beam = null; G.storm = null; ShooterGame.spawn('grunt', G.player.x, 300, { move: 'hover', holdY: 300 }).hp = 1; });
    await tick(1);
    assert.equal(await run(() => ShooterCore.masteryTier(ShooterGame.run.mastery.laser)), 1);
    await run(() => { const G = ShooterGame.run; G.enemies = []; G.bullets = []; G.bombs = 2; G.weapon = 'vulcan'; G.gems = []; });
    pass('무기 숙련');

    await page.keyboard.press('KeyP');
    assert.equal(await run(() => ShooterGame.state), 'paused');
    assert.equal(await page.locator('#quitBtn').isVisible(), true);
    const before = await run(() => ShooterGame.run.time);
    await tick(.5);
    assert.equal(await run(() => ShooterGame.run.time), before);
    await page.keyboard.press('KeyP');
    assert.equal(await run(() => ShooterGame.state), 'playing');
    pass('일시정지 중에는 시간이 멈춘다');

    await run(() => { const G = ShooterGame.run; G.enemies = []; G.bullets = []; ShooterGame.startWave(5); G.player.invuln = 999; G.level = 1; });
    await tick(6);
    assert.deepEqual(await run(() => { const b = ShooterGame.run.boss; return [b.kind, b.entering]; }), ['destroyer', false]);
    await run(() => { ShooterGame.run.boss.hp = 0; });
    await tick(4);
    assert.equal(await run(() => ShooterGame.state), 'upgrade');
    assert.equal(await page.locator('.upgrade-card').count(), 3);
    const scoreBefore = await run(() => ShooterGame.run.score);
    assert.ok(scoreBefore >= 7500);
    await page.keyboard.press('Digit2');
    assert.deepEqual(await run(() => [ShooterGame.state, ShooterGame.run.wave, Object.keys(ShooterGame.run.owned).length]), ['playing', 6, 1]);
    pass('보스 격파 후 강화를 고르면 다음 웨이브');

    await run(() => { const G = ShooterGame.run; G.enemies = []; G.bullets = []; G.plan = { boss: false, events: [] }; G.planI = 0; G.waveHits = 0; });
    await tick(.1);
    assert.equal(await run(() => ShooterGame.run.wave), 7);
    pass('적을 모두 정리하면 다음 웨이브');

    await run(() => { const G = ShooterGame.run; G.player.invuln = 0; G.shield = false; G.lives = 1; G.score = 4321; ShooterGame.hitPlayer(); });
    await tick(2);
    assert.equal(await run(() => ShooterGame.state), 'over');
    assert.deepEqual(await run(() => window.__scores), [{ gameId: 'space-shooter', score: 4321, wave: 7 }]);
    assert.equal(await run(() => localStorage.getItem('spaceShooterBest')), '4321');
    assert.match(await page.locator('#overlayTitle').textContent(), /게임 오버/);
    pass('게임 오버에 점수를 한 번만 보내고 최고 기록을 저장');

    await page.keyboard.press('Enter');
    assert.deepEqual(await run(() => [ShooterGame.state, ShooterGame.run.score, ShooterGame.run.wave]), ['playing', 0, 1]);
    pass('다시 출격');

    // 2분 자동 진행: 값이 깨지거나 개체가 한도를 넘지 않는지 본다.
    const sim = await run(() => {
      const S = ShooterGame; let maxBullets = 0, maxParticles = 0;
      for (let i = 0; i < 120 * 60; i += 1) {
        if (S.state === 'over') S.start('balanced');
        if (S.state === 'upgrade') { S.pickUpgrade('damage'); continue; }
        const G = S.run; G.player.x = 240 + Math.sin(i / 40) * 180; if (i % 600 === 0) G.player.invuln = 6;
        S.update(1 / 60); if (i % 30 === 0) S.draw();
        maxBullets = Math.max(maxBullets, G.bullets.length); maxParticles = Math.max(maxParticles, G.particles.length);
      }
      const G = S.run; return { maxBullets, maxParticles, finite: [G.player.x, G.player.y, G.score, G.time].every(Number.isFinite), wave: G.wave };
    });
    assert.ok(sim.finite && sim.maxBullets <= 260 && sim.maxParticles <= 300, JSON.stringify(sim));
    pass(`2분 자동 진행 (웨이브 ${sim.wave}, 적탄 최대 ${sim.maxBullets})`);
    assert.deepEqual(page.errors, []);
    pass('스크립트 오류 없음');

    const phone = await open({ width: 360, height: 740 });
    assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
    const box = await phone.locator('#gameCanvas').boundingBox();
    assert.ok(Math.abs(box.height / box.width - 4 / 3) < .02);
    for (const id of ['bombBtn', 'pauseBtn', 'soundBtn', 'fullscreenBtn']) { const b = await phone.locator('#' + id).boundingBox(); assert.ok(b.width >= 44 && b.height >= 44, id); }
    await phone.locator('#overlayStartBtn').click();
    await phone.evaluate(() => { ShooterGame.freeze(true); ShooterGame.run.player.x = 240; ShooterGame.run.player.y = 500; });
    await phone.locator('#gameCanvas').dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 7, clientX: box.x + 100, clientY: box.y + 300 });
    await phone.locator('#gameCanvas').dispatchEvent('pointermove', { pointerType: 'touch', pointerId: 7, clientX: box.x + 40, clientY: box.y + 300 });
    await phone.evaluate(() => { for (let i = 0; i < 30; i += 1) ShooterGame.update(1 / 60); });
    const moved = await phone.evaluate(() => ShooterGame.run.player.x);
    assert.ok(Math.abs(moved - (240 - 60 * 480 / box.width)) < 3, String(moved));
    assert.deepEqual(phone.errors, []);
    pass('휴대폰 폭에서 넘침 없이 터치 드래그로 이동');
    console.log(`space-shooter browser: ${n} checks passed`);
  } finally { await browser?.close(); server.close(); }
})().catch(error => { console.error(error); process.exit(1); });
