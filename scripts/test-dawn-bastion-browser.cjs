// NODE_PATH must contain Playwright. Game engines and artwork are real; cloud account writes are mocked.
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
    catch { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(root, '404.html'))); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1360, height: 1000 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/googletagmanager|googlesyndication|google-analytics/, route => route.abort());
    await page.route('**/scripts/firebase-client.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}' }));
    await page.route('**/scripts/firebase-game-ranking.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'export function initializeGameRanking(){}' }));
    await page.goto(base + '/');
    await page.waitForFunction(() => ready);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://partygame.pe.kr/');
    assert.equal(await page.locator('site-header nav a').count(), 2);
    await page.click('#start'); await page.click('#build');
    await page.getByRole('button', { name: /연사탑 · 60 에테르/ }).click();
    assert.equal(await page.locator('#gold').textContent(), '60');
    await page.getByRole('button', { name: /강화 → Lv.2/ }).click();
    assert.equal(await page.locator('#gold').textContent(), '0');
    await page.click('#returnBattle');
    await page.keyboard.down('d'); await page.waitForTimeout(180); await page.keyboard.up('d');
    assert.ok(await page.evaluate(() => game.player.x > 360));
    await page.keyboard.press('p'); const time = await page.evaluate(() => game.time);
    await page.waitForTimeout(100); assert.equal(await page.evaluate(() => game.time), time); await page.click('#start');
    await page.setViewportSize({ width: 390, height: 844 }); await page.locator('#gameCanvas').scrollIntoViewIfNeeded();
    const rect = await page.locator('#gameCanvas').boundingBox(), cdp = await page.context().newCDPSession(page);
    const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
    const before = await page.evaluate(() => game.player.x);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 50, y }] });
    await page.waitForTimeout(180); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    assert.ok((await page.evaluate(() => game.player.x)) > before); assert.equal(await page.evaluate(() => stick), null);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.evaluate(() => { game.wave=10;game.waveTime=28;game.spawned=game.spawnLimit;game.enemies=[];game.shots=[];game.score=1000;window.addEventListener('partygame:score',e=>{window.result=e.detail},{once:true}); });
    await page.waitForFunction(() => game.state === 'won'); await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.result.gameId), 'dawn-bastion');
    assert.equal(await page.evaluate(() => Number(localStorage.getItem('dawnBastionBest'))), 3150);
    await page.click('#start'); await page.click('#build');
    await page.evaluate(() => {game.gold=500;game.build(0,'arrow');game.build(1,'cannon');game.build(2,'frost');for(const [x,y,kind] of [[230,280,'enemy'],[470,330,'runner'],[300,490,'boss']]){game.spawn(kind==='boss');Object.assign(game.enemies.at(-1),{x,y,runner:kind==='runner',hp:500,maxHp:600,speed:0});}game.effects=[];renderShop();sync();});
    await page.waitForTimeout(80);
    if (process.env.UPDATE_SHARE_IMAGES === '1') {
      await makeShare(browser, await page.locator('#gameCanvas').screenshot(), path.join(root,'site-share.png'), '새벽의 요새', '무료 타워 디펜스', '방어전 · 돌격전 · 요새전', '타워 건설 / 강화 카드 / 보스 방어');
    }
    for(const old of ['/arcade/dawn-bastion.html','/arcade/']){await page.goto(base+old);await page.waitForURL(base+'/');await page.waitForFunction(()=>ready);}
    const missing=await page.goto(base+'/blog/posts/removed.html');assert.equal(missing.status(),404);assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, follow');
    await page.goto(base+'/arcade/space-shooter.html');await page.waitForFunction(()=>typeof ex!=='undefined'&&document.querySelector('#startBtn'));
    await page.click('#startBtn');await page.waitForTimeout(1400);assert(await page.locator('#gameOverlay').evaluate(el=>el.classList.contains('hidden')));
    if(process.env.UPDATE_SHARE_IMAGES==='1')await makeShare(browser,await page.locator('#gameCanvas').screenshot(),path.join(root,'assets/games/space-shooter/share-v2.png'),'우주 비행기 슈팅','잠깐, 다른 전장으로','기체 선택 · 자동 발사 · 보스전','PC·모바일 브라우저에서 플레이');
    await page.click('#pauseBtn');assert((await page.locator('#statusEl').textContent()).includes('일시정지'));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    console.log('PASS: real Phaser defense at /, build/upgrade, pause, touch, victory/records, legacy redirects, removed-content 404, two-game navigation and airplane gameplay');
  } finally { if(browser)await browser.close();server.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
async function makeShare(browser, png, output, title, subtitle, modes, detail){
  const preview=await browser.newPage({viewport:{width:1200,height:630}});
  try{
    const html='<html lang="ko"><meta charset="UTF-8"><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:radial-gradient(ellipse at 20% 0%,#234a3f,#0c1720 75%);font-family:system-ui,sans-serif;color:#f7eedb;display:flex;align-items:center;gap:20px;padding:48px}.copy{width:565px}.brand{font-size:18px;letter-spacing:4px;color:#a4e6d0}h1{font-size:57px;line-height:1.2;margin:24px 0 12px;letter-spacing:-2px}.subtitle{font-size:32px;color:#edc78e;margin:0 0 34px}.modes{font-size:21px;color:#c5e9dc}.detail{font-size:17px;color:#a1bbb0}.url{margin-top:38px;font-size:18px;color:#85bcaa}img{width:520px;height:520px;object-fit:contain;background:#122329;border:1px solid #51756a;border-radius:22px}</style><div class="copy"><div class="brand">PARTYGAME</div><h1>'+title+'</h1><p class="subtitle">'+subtitle+'</p><p class="modes">'+modes+'</p><p class="detail">'+detail+'</p><p class="url">partygame.pe.kr</p></div><img src="data:image/png;base64,'+png.toString('base64')+'"></html>';
    await preview.setContent(html);await preview.locator('img').evaluate(img=>img.decode());await preview.screenshot({path:output});
  }finally{await preview.close();}
}
