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
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
    const page = await browser.newPage({ viewport: { width: 1360, height: 1000 }, hasTouch: true });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/googletagmanager|googlesyndication|google-analytics/, route => route.abort());
    await page.route('**/scripts/firebase-client.js', route => route.fulfill({ contentType: 'text/javascript', body: 'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}' }));
    await page.route('**/scripts/firebase-game-ranking.js*', route => route.fulfill({ contentType: 'text/javascript', body: 'export function initializeGameRanking(){}' }));
    await page.goto(base + '/');
    await page.waitForFunction(() => ready);
    assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://partygame.pe.kr/');
    assert.equal(await page.locator('site-header nav a').count(), 5);
    await page.click('#start'); await page.click('#build');
    assert.equal(await page.locator('[data-weapon]').count(),9);
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
    assert.equal(await page.evaluate(()=>Object.keys(app.textures.list).filter(k=>k.startsWith('tower-base-')).length),9);
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
      await makeShare(browser, await page.locator('#gameCanvas').screenshot(), path.join(root,'site-share.png'), '새벽의 요새', '무료 타워 디펜스', '방어전 · 돌격전 · 요새전', '9종 무기 / 전용 이펙트 / 보스 방어');
    }

    for(const map of ['grove','canyon','glacier','marsh','volcano','ruins']){
      await page.evaluate(map=>{
        selectedMap=map;resetMode('classic');game.state='building';game.gold=10000;
        const types=Object.keys(TYPES);game.slots.forEach((s,i)=>game.build(i,types[i]));
        game.enemies=['armored','regenerator','splitter','wisp','berserker','shard','grunt'].map((kind,i)=>({id:i+1,kind,x:105+i*85,y:100,hp:90,maxHp:100,r:12,speed:0,slow:0,cd:100,runner:kind==='shard'}));
        game.enemies.push({id:8,x:360,y:560,hp:700,maxHp:800,r:23,boss:true,kind:'grunt',speed:0,slow:0,cd:100});
        game.emit('venomCloud',200,460,55,0xa8ed72,.7);game.emit('gravityWell',510,400,110,0x92a7ff,.6);game.emit('sniperShot',200,240,145,0xffe3a1,.3,-.4);for(const effect of game.effects)effect.life=effect.max*.6;game.time=3;setState('paused');$('overlay').style.display='none';
      },map);
      await page.waitForTimeout(100);
      await page.locator('#gameCanvas').screenshot({path:path.join(root,'test-results/bastion-graphics-'+map+'.png')});
      const frame=await page.locator('#gameCanvas').screenshot();await page.waitForTimeout(120);assert(frame.equals(await page.locator('#gameCanvas').screenshot()),'Scenery freezes on '+map);
    }

    assert.equal(await page.evaluate(()=>Object.keys(app.textures.list).filter(k=>k.startsWith('bastion-elite-')).length),24);
    await page.locator('#reducedEffects').check();await page.waitForTimeout(80);
    const reducedFrame=await page.locator('#gameCanvas').screenshot();await page.waitForTimeout(120);assert(reducedFrame.equals(await page.locator('#gameCanvas').screenshot()));await page.locator('#reducedEffects').uncheck();
    await page.evaluate(()=>{$('overlay').style.display='';selectedStage=-1;resetMode('classic');});
    await page.click('#start');await page.evaluate(()=>{game.gold=1000;game.spawnClock=100;});await page.locator('#gameCanvas').focus();await page.keyboard.press('2');assert.equal(await page.evaluate(()=>selected),1);assert.equal(await page.evaluate(()=>game.state),'building');await page.locator('[data-weapon="arrow"]').click();await page.keyboard.press('u');assert.equal(await page.evaluate(()=>game.slots[1].tower.level),2);await page.keyboard.press('Escape');await page.keyboard.press('p');await page.keyboard.press('3');assert.equal(await page.evaluate(()=>game.state),'paused');await page.evaluate(()=>resetMode('classic'));

    // Ten-cycle upgrade: purchase repeat, aiming controls, stats, speed, codex and safe wave finish.
    await page.click('#start');await page.evaluate(()=>{game.gold=1000;game.spawnClock=100;});await page.locator('#gameCanvas').focus();await page.keyboard.press('1');await page.locator('[data-weapon="arrow"]').click();
    await page.getByRole('button',{name:/조준: 가까운 적/}).click();assert.equal(await page.evaluate(()=>game.slots[0].tower.priority),'core');assert((await page.getByRole('button',{name:/강화 → Lv.2/}).textContent()).includes('15.0 → 24.8'));
    await page.keyboard.press('2');await page.locator('#repeatBuild').click();assert.equal(await page.evaluate(()=>game.slots[1].tower.type),'arrow');await page.keyboard.press('Escape');
    await page.click('#battleSpeed');assert.equal(await page.evaluate(()=>battleSpeed),2);assert.equal(await page.locator('#battleSpeed').getAttribute('aria-pressed'),'true');await page.click('#pause');const stopped=await page.evaluate(()=>game.time);await page.waitForTimeout(160);assert.equal(await page.evaluate(()=>game.time),stopped);await page.click('#battleSpeed');
    assert.equal(await page.locator('#codexEntries li').count(),9);assert((await page.locator('#waveIntel').textContent()).includes('W1'));
    await page.click('#start');await page.evaluate(()=>{game.spawned=game.spawnLimit;game.enemies=[];game.waveTime=1;sync();});assert(await page.locator('#finishWave').isVisible());await page.click('#finishWave');assert.equal(await page.evaluate(()=>game.state),'reward');assert.equal(await page.locator('#finishWave').isVisible(),false);
    await page.evaluate(()=>resetMode('classic'));
    await page.locator('#stageChoice').selectOption('0');
    assert.equal(await page.evaluate(()=>game.stage),0);assert(await page.locator('input[name="map"]').first().isDisabled());
    await page.click('#start');assert(await page.locator('#stageChoice').isDisabled());
    await page.evaluate(()=>{game.wave=game.rules.waves;game.waveTime=game.rules.waveSeconds;game.spawned=game.spawnLimit;game.enemies=[];game.step(.05);sync();});
    assert(await page.locator('#battleReport').isVisible());assert.equal(await page.locator('#reportStats div').count(),6);await page.setViewportSize({width:390,height:844});await page.locator('#nextStage').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const nextRect=await page.locator('#nextStage').boundingBox();assert(nextRect.x>=0&&nextRect.x+nextRect.width<=390);await page.locator('#gameCanvas').screenshot({path:path.join(root,'test-results/bastion-result-mobile.png')});await page.setViewportSize({width:1360,height:1000});assert(await page.locator('#nextStage').isVisible());assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('dawnBastionStageClears')).includes(0)),true);
    await page.click('#nextStage');assert.equal(await page.evaluate(()=>game.stage),1);assert.equal(await page.evaluate(()=>game.map),'canyon');assert.equal(await page.evaluate(()=>game.state),'idle');
    await page.locator('#stageChoice').selectOption('5');await page.click('#start');
    await page.evaluate(()=>{game.wave=game.rules.waves;game.waveTime=game.rules.waveSeconds;game.spawned=game.spawnLimit;game.enemies=[];game.step(.05);sync();});assert(await page.locator('#nextStage').isHidden());
    await page.reload();await page.waitForFunction(()=>ready);assert.equal(await page.evaluate(()=>stageClears.includes(0)&&stageClears.includes(5)),true);assert.equal(await page.evaluate(()=>stageMedals[0]),2);assert((await page.locator('#stageChoice option[value="0"]').textContent()).includes('★★'));
    await page.locator('#stageChoice').selectOption('3');assert.equal(await page.evaluate(()=>game.map),'marsh');assert.equal(await page.locator('[data-enemy="regenerator"]').getAttribute('data-active'),'true');await page.locator('#stageChoice').selectOption('-1');assert.equal(await page.evaluate(()=>game.stage),-1);assert.equal(await page.locator('input[name="map"]').first().isDisabled(),false);

    // Second ten-cycle expansion: presets, specialization, relocation, barrier, missions and logs.
    await page.locator('#stageChoice').selectOption('0');await page.locator('#missionChoice').selectOption('noRepair');await page.locator('#loadoutChoice').selectOption('balanced');assert((await page.locator('#loadoutHelp').textContent()).includes('135'));
    await page.click('#start');assert.equal(await page.evaluate(()=>game.mission),'noRepair');assert.equal(await page.evaluate(()=>game.slots.filter(s=>s.tower).length),2);assert.equal(await page.evaluate(()=>game.gold),45);
    await page.evaluate(()=>{game.gold=5000;game.spawnClock=1000;});await page.locator('#gameCanvas').focus();await page.keyboard.press('1');await page.keyboard.press('u');await page.keyboard.press('u');await page.getByRole('button',{name:/특성화 · 고출력/}).click();assert.equal(await page.evaluate(()=>game.slots[0].tower.specialization),'power');
    await page.locator('#relocateChoices summary').click();await page.getByRole('button',{name:'2번 지점으로 이동',exact:true}).click();assert.equal(await page.evaluate(()=>game.slots[1].tower.specialization),'power');assert.equal(await page.evaluate(()=>game.slots[0].tower),null);await page.keyboard.press('Escape');
    await page.click('#barrier');assert((await page.evaluate(()=>game.barrierTime))>0);await page.locator('#showCoverage').check();assert.equal(await page.evaluate(()=>localStorage.getItem('dawnBastionCoverage')),'1');
    await page.evaluate(()=>{game.spawned=game.spawnLimit;game.enemies=[];game.waveTime=1;sync();});await page.click('#finishWave');assert.equal(await page.locator('#waveLog tr').count(),1);await page.click('#rerollRewards');assert(await page.locator('#rerollRewards').isDisabled());await page.locator('#rewardChoices button').first().click();
    await page.evaluate(()=>{game.wave=game.rules.waves;game.waveTime=1;game.spawned=game.spawnLimit;game.enemies=[];sync();});await page.click('#finishWave');assert.equal(await page.evaluate(()=>game.missionSatisfied()),true);assert((await page.locator('#reportAdvice').textContent()).includes('달성 +500점'));
    await page.reload();await page.waitForFunction(()=>ready);assert(await page.locator('#showCoverage').isChecked());await page.locator('#showCoverage').uncheck();
    for(const old of ['/arcade/dawn-bastion.html','/arcade/']){await page.goto(base+old);await page.waitForURL(base+'/');await page.waitForFunction(()=>ready);}
    const missing=await page.goto(base+'/blog/posts/removed.html');assert.equal(missing.status(),404);assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, follow');
    await page.goto(base+'/arcade/space-shooter.html');await page.waitForFunction(()=>typeof ex!=='undefined'&&document.querySelector('#startBtn'));
    await page.click('#startBtn');await page.waitForTimeout(1400);assert(await page.locator('#gameOverlay').evaluate(el=>el.classList.contains('hidden')));
    if(process.env.UPDATE_SHARE_IMAGES==='1')await makeShare(browser,await page.locator('#gameCanvas').screenshot(),path.join(root,'assets/games/space-shooter/share-v2.png'),'우주 비행기 슈팅','잠깐, 다른 전장으로','기체 선택 · 자동 발사 · 보스전','PC·모바일 브라우저에서 플레이');
    await page.click('#pauseBtn');assert((await page.locator('#statusEl').textContent()).includes('일시정지'));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    assert.deepEqual(errors,[]);
    console.log('PASS: real Phaser defense at /, build/upgrade, pause, touch, victory/records, legacy redirects, removed-content 404, three-game navigation and airplane gameplay');
  } finally { if(browser)await browser.close();server.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
async function makeShare(browser, png, output, title, subtitle, modes, detail){
  const preview=await browser.newPage({viewport:{width:1200,height:630}});
  try{
    const html='<html lang="ko"><meta charset="UTF-8"><style>*{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:radial-gradient(ellipse at 20% 0%,#234a3f,#0c1720 75%);font-family:system-ui,sans-serif;color:#f7eedb;display:flex;align-items:center;gap:20px;padding:48px}.copy{width:565px}.brand{font-size:18px;letter-spacing:4px;color:#a4e6d0}h1{font-size:57px;line-height:1.2;margin:24px 0 12px;letter-spacing:-2px}.subtitle{font-size:32px;color:#edc78e;margin:0 0 34px}.modes{font-size:21px;color:#c5e9dc}.detail{font-size:17px;color:#a1bbb0}.url{margin-top:38px;font-size:18px;color:#85bcaa}img{width:520px;height:520px;object-fit:contain;background:#122329;border:1px solid #51756a;border-radius:22px}</style><div class="copy"><div class="brand">PARTYGAME</div><h1>'+title+'</h1><p class="subtitle">'+subtitle+'</p><p class="modes">'+modes+'</p><p class="detail">'+detail+'</p><p class="url">partygame.pe.kr</p></div><img src="data:image/png;base64,'+png.toString('base64')+'"></html>';
    await preview.setContent(html);await preview.locator('img').evaluate(img=>img.decode());await preview.screenshot({path:output});
  }finally{await preview.close();}
}
