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
    assert.equal(await page.locator('[data-weapon]').count(),6);
    await page.locator('[data-weapon="arrow"]').click();
    assert.equal(await page.locator('#gold').textContent(), '60');
    await page.getByRole('button', { name: /강화 → Lv.2/ }).click();
    assert.equal(await page.locator('#gold').textContent(), '0');
    await page.click('#returnBattle');
    // A direct slot click opens the contextual shop without pausing the simulation.
    await page.locator('#gameCanvas').scrollIntoViewIfNeeded();
    const field=await page.locator('#gameCanvas').boundingBox();
    await page.mouse.click(field.x+field.width*.5,field.y+field.height*215/720);
    assert.equal(await page.evaluate(()=>game.state),'building');
    assert(await page.locator('#buildPanel').isVisible());
    const liveTime=await page.evaluate(()=>game.time);await page.waitForTimeout(180);
    assert((await page.evaluate(()=>game.time))>liveTime);
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>game.state),'running');
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
    const mobileField=await page.locator('#gameCanvas').boundingBox();
    await page.touchscreen.tap(mobileField.x+mobileField.width*505/720,mobileField.y+mobileField.height*.5);
    assert(await page.locator('#buildPanel').isVisible());
    const popup=await page.locator('#buildPanel').boundingBox();
    assert(popup.x>=0&&popup.x+popup.width<=390&&popup.y>=0&&popup.y+popup.height<=844);
    if(process.env.UI_SCREENSHOT)await page.screenshot({path:process.env.UI_SCREENSHOT});
    await page.evaluate(()=>{game.gold=500;});await page.waitForTimeout(160);
    assert(await page.locator('[data-weapon="laser"]').isEnabled());
    await page.locator('[data-weapon="laser"]').click();assert.equal(await page.evaluate(()=>game.slots[2].tower.type),'laser');
    await page.click('#closeBuild');assert.equal(await page.evaluate(()=>game.state),'running');
    await page.evaluate(() => { game.wave=10;game.waveTime=28;game.spawned=game.spawnLimit;game.enemies=[];game.shots=[];game.score=1000;window.addEventListener('partygame:score',e=>{window.result=e.detail},{once:true}); });
    await page.waitForFunction(() => game.state === 'won'); await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => window.result.gameId), 'dawn-bastion');
    assert.equal(await page.evaluate(() => Number(localStorage.getItem('dawnBastionBest'))), 3150);
    await page.click('#start'); await page.click('#build');
    await page.evaluate(() => {
      game.gold=5000;['arrow','cannon','frost','laser','tesla','flame'].forEach((type,i)=>{game.build(i,type);game.upgrade(i);});game.enemies=[];game.spawnClock=100;game.player.cd=100;
      for(const [x,y] of [[450,200],[550,300],[600,360],[600,460],[450,520],[530,530],[180,460],[130,480],[300,490]]){game.spawn();Object.assign(game.enemies.at(-1),{x,y,hp:3000,maxHp:3000,speed:0,cd:100});}
      game.effects=[];game.state='running';for(let i=0;i<3;i++)game.step(.05);setState('paused');renderShop();sync();
    });
    assert.equal(await page.evaluate(()=>Object.keys(app.textures.list).filter(k=>k.startsWith('tower-base-')).length),6);
    for(const kind of ['laser','lightning','flame'])assert(await page.evaluate(kind=>game.effects.some(e=>e.kind===kind),kind),kind);
    const frozen=await page.evaluate(()=>JSON.stringify(game));await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>JSON.stringify(game)),frozen);
    await page.setViewportSize({width:1360,height:1000});
    await page.waitForTimeout(80);
    const pausedFrame=await page.locator('#gameCanvas').screenshot();
    await page.waitForTimeout(100);
    assert.ok(pausedFrame.equals(await page.locator('#gameCanvas').screenshot()),'Charge sigils and weapon spectacle must freeze when paused');
    if(process.env.FX_SCREENSHOT)await page.locator('#gameCanvas').screenshot({path:process.env.FX_SCREENSHOT});
    const combatEffects=await page.evaluate(()=>game.effects);
    await page.evaluate(()=>{
      game.emit('explosion',180,220,65,0xf3ba77,.6,0,3);
      game.emit('bossDeath',530,180,30,0xc69cff,.8,0,3);
      game.emit('frost',200,530,120,0x8ecbfa,.7,0,3);
      game.emit('shockwave',360,360,220,0xa5ffe6,.7);
      game.emit('cannonMuzzle',150,240,18,0xf3ba77,.16,0,3);
      for(const f of game.effects){f.life=f.max*.6;}
    });
    await page.waitForTimeout(80);
    if(process.env.FX_SCREENSHOT)await page.locator('#gameCanvas').screenshot({path:process.env.FX_SCREENSHOT.replace('.png','-burst.png')});
    await page.locator('#reducedEffects').check();assert.equal(await page.evaluate(()=>localStorage.getItem('dawnBastionReducedEffects')),'1');await page.locator('#reducedEffects').uncheck();
    await page.evaluate(effects=>{game.effects=effects;},combatEffects);
    await page.waitForTimeout(80);
    if (process.env.UPDATE_SHARE_IMAGES === '1') {
      await makeShare(browser, await page.locator('#gameCanvas').screenshot(), path.join(root,'site-share.png'), '새벽의 요새', '무료 타워 디펜스', '방어전 · 돌격전 · 요새전', '6종 무기 / 전용 이펙트 / 보스 방어');
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
