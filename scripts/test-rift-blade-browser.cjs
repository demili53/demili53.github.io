'use strict';
// Browser test for the rebuilt 균열의 검. Needs Playwright on NODE_PATH. Run: node scripts/test-rift-blade-browser.cjs
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..'),results=path.resolve(root,process.env.RIFT_TEST_RESULTS||'test-results');fs.mkdirSync(results,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{const uri=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+uri);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/arcade/rift-blade.html`;let browser;
 const prep=async ctx=>{await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await ctx.route('**/scripts/firebase-client.js',r=>r.fulfill({contentType:'text/javascript',body:'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}'}));};
 try{
  browser=await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:undefined);
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}});await prep(ctx);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.rift&&document.querySelectorAll('[data-hero]').length===3);
  assert(await page.locator('#menuView').isVisible());
  await page.click('[data-hero="arcanist"]');assert.equal(await page.evaluate(()=>rift.heroId),'arcanist');assert.equal(await page.locator('[data-hero="arcanist"]').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#weaponCards [data-weapon]').count(),3);await page.click('[data-weapon="storm"]');assert.equal(await page.evaluate(()=>rift.weaponId),'storm');
  assert.match(await page.locator('#heroDesc').textContent(),/뇌전 홀/);
  await page.click('[data-hero="blade"]');assert.equal(await page.evaluate(()=>rift.weaponId),'steel');await page.click('[data-hero="arcanist"]');assert.equal(await page.evaluate(()=>rift.weaponId),'storm','weapon choice remembered per hero');
  await page.click('[data-hero="blade"]');await page.click('[data-weapon="ember"]');await page.click('#startBtn');assert.equal(await page.evaluate(()=>rift.weaponId),'ember');assert.equal(await page.evaluate(()=>rift.state),'playing');assert(await page.locator('#riftOverlay').isHidden());
  const x0=await page.evaluate(()=>rift.player.x);await page.keyboard.down('d');await page.waitForTimeout(300);await page.keyboard.up('d');assert((await page.evaluate(()=>rift.player.x))>x0+30);
  await page.evaluate(()=>{rift.queue=[];const e=rift.makeEnemy('grunt',{x:rift.player.x+60,y:rift.player.y});e.state='idle';e.cd=99;e.hp=e.maxHp=9999;rift.enemies=[e];});
  await page.keyboard.press('j');await page.waitForTimeout(300);assert((await page.evaluate(()=>rift.enemies[0].hp))<9999);
  await page.keyboard.press('k');await page.waitForTimeout(150);assert((await page.evaluate(()=>rift.player.skillCd))>0);
  await page.keyboard.press('Space');assert((await page.evaluate(()=>rift.player.dashCd))>0);
  await page.screenshot({path:path.join(results,'rift-blade-play.png')});
  // Pause freezes the game state.
  await page.keyboard.press('p');assert(await page.locator('#pauseView').isVisible());const frozen=await page.evaluate(()=>JSON.stringify([rift.time,rift.player,rift.enemies]));await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>JSON.stringify([rift.time,rift.player,rift.enemies])),frozen);
  await page.click('#resumeBtn');assert.equal(await page.evaluate(()=>rift.state),'playing');
  // Clearing a fight shows three blessing cards; picking one starts the next fight.
  await page.evaluate(()=>{rift.enemies.forEach(e=>{e.hp=1;});rift.player.inv=99;rift.random=()=>.99;});await page.keyboard.press('j');await page.waitForFunction(()=>rift.state==='choice',null,{timeout:5000});
  assert.equal(await page.locator('#choiceCards [data-bless]').count(),3);await page.screenshot({path:path.join(results,'rift-blade-choice.png')});
  await page.locator('#choiceCards [data-bless]').first().click();assert.equal(await page.evaluate(()=>[rift.state,rift.fight].join()),'playing,1');assert.equal(await page.evaluate(()=>Object.values(rift.blessings).reduce((a,b)=>a+b,0)),1);
  // A forge card upgrades the weapon instead of granting a blessing.
  await page.evaluate(()=>{rift.queue=[];rift.enemies=[];rift.random=()=>0;});await page.waitForFunction(()=>rift.state==='choice',null,{timeout:5000});
  await page.click('#choiceCards [data-bless="forge"]');assert.equal(await page.evaluate(()=>[rift.state,rift.wlv].join()),'playing,2');
  // Each region and boss renders without errors.
  for(let r=0;r<5;r++){await page.evaluate(r=>{rift.region=r;rift.fight=2;rift.beginFight();rift.player.inv=99;rift.enemies[0].cd=0;},r);await page.waitForTimeout(900);}
  await page.screenshot({path:path.join(results,'rift-blade-boss.png')});
  // Defeat shows the result screen and stores the best score.
  await page.evaluate(()=>{rift.score=12345;rift.player.inv=0;rift.player.hp=1;rift.hitPlayer(99);});await page.waitForFunction(()=>!document.getElementById('resultView').hidden);
  assert.equal(await page.locator('#resultStats>div').count(),7);assert.match(await page.locator('#resultStats').textContent(),/화염 대검 \+1/);assert.equal(await page.evaluate(()=>localStorage.getItem('riftBladeBestV2')),'12345');assert.match(await page.locator('#bestScore').textContent(),/12,345/);
  await page.click('#retryBtn');assert.equal(await page.evaluate(()=>[rift.state,rift.region,rift.score].join()),'playing,0,0');
  assert.deepEqual(errors,[]);await ctx.close();
  // Phone: touch pad visible, no horizontal scroll, menu fits, joystick moves the hero.
  const phone=await browser.newContext({...devices['iPhone 13']});await prep(phone);const mp=await phone.newPage(),merr=[];mp.on('pageerror',e=>merr.push(e.message));
  await mp.goto(url);await mp.waitForFunction(()=>window.rift);assert(await mp.locator('.rb-pad').isVisible());assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert(await mp.locator('#startBtn').isVisible());await mp.screenshot({path:path.join(results,'rift-blade-phone-menu.png')});
  await mp.locator('#startBtn').tap();const px=await mp.evaluate(()=>rift.player.x),box=await mp.locator('#stickZone').boundingBox();
  await mp.evaluate(({x,y})=>{const el=document.getElementById('stickZone');el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:7,clientX:x,clientY:y,bubbles:true}));el.dispatchEvent(new PointerEvent('pointermove',{pointerId:7,clientX:x+50,clientY:y,bubbles:true}));},{x:box.x+box.width/2,y:box.y+box.height/2});
  await mp.waitForTimeout(350);assert((await mp.evaluate(()=>rift.player.x))>px+20);
  await mp.locator('[data-pad="attack"]').dispatchEvent('pointerdown');await mp.waitForTimeout(60);assert(await mp.evaluate(()=>rift.player.act!==null||rift.player.step>0));
  await mp.screenshot({path:path.join(results,'rift-blade-phone-play.png')});assert.deepEqual(merr,[]);
  console.log('PASS: hero and weapon select, forge card, start, move/attack/skill/dash keys, pause freeze, blessing choice, five regions/bosses, defeat/best score/retry, phone touch pad and layout');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
