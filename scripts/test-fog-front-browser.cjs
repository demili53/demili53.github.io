'use strict';
// Browser test for 운빨좆망겜. Needs Playwright on NODE_PATH. Run: node scripts/test-fog-front-browser.cjs
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..'),results=path.resolve(root,process.env.FOG_TEST_RESULTS||'test-results');fs.mkdirSync(results,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{const uri=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+decodeURIComponent(uri));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/arcade/fog-front.html`;let browser;
 const prep=async ctx=>{await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await ctx.route('**/scripts/firebase-client.js',r=>r.fulfill({contentType:'text/javascript',body:'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}'}));};
 const toScreen=async(page,side,r,c)=>{const box=await page.locator('#fogCanvas').boundingBox(),p=await page.evaluate(([s,r,c])=>FogCore.cellCenter(s,r,c),[side,r,c]);return{x:box.x+p.x/600*box.width,y:box.y+p.y/780*box.height};};
 try{
  browser=await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:undefined);
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}});await prep(ctx);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.fogUI&&document.querySelectorAll('[data-skill]').length===6);
  assert(await page.locator('#menuView').isVisible());await page.click('[data-level="2"]');assert.equal(await page.locator('[data-level="2"]').getAttribute('aria-pressed'),'true');await page.click('[data-level="1"]');
  await page.click('#startBtn');assert(await page.evaluate(()=>fogUI.running));assert(await page.locator('#overlay').isHidden());
  assert.equal(await page.locator('#hudPop').textContent(),'2/20');assert.equal(await page.locator('#hudCrystal').textContent(),'100');
  // Drag a hero from the start corner onto a fog cell next to revealed land: scouting starts.
  const id=await page.evaluate(()=>{const g=fogUI.game;g.sides.opp.ai=false;const u=g.units.find(x=>x.side==='me'&&x.r===0&&x.c===0)||g.units.find(x=>x.side==='me');return u.id;});
  const from=await page.evaluate(i=>{const u=fogUI.game.units.find(x=>x.id===i);return[u.r,u.c];},id),target=await page.evaluate(()=>{const g=fogUI.game;for(let r=0;r<5;r++)for(let c=0;c<7;c++)if(g.scoutable('me',r,c))return[r,c];});
  const a=await toScreen(page,'me',...from),b=await toScreen(page,'me',...target);await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});
  await page.screenshot({path:path.join(results,'fog-front-drag.png')});await page.mouse.up();
  const sc=await page.evaluate(i=>fogUI.game.units.find(x=>x.id===i).scout,id);assert(sc&&sc.total>=4,'scouting started by drag and drop');
  // Summon button spends crystal and adds a hero.
  await page.evaluate(()=>{fogUI.game.sides.me.crystal=500;});await page.waitForTimeout(80);await page.click('#summonBtn');assert.equal(await page.evaluate(()=>fogUI.game.units.filter(u=>u.side==='me').length),3);
  // Skill button fires when the hero exists.
  await page.evaluate(()=>{const g=fogUI.game;g.addUnit('me','warden');g.sides.me.baseHp=12;});await page.waitForTimeout(80);await page.click('[data-skill="warden"]');assert.equal(await page.evaluate(()=>fogUI.game.sides.me.baseHp),15);
  assert(await page.locator('[data-skill="warden"] .cdn').textContent());
  // Ally RPS popup appears and resolves on click.
  await page.evaluate(()=>{fogUI.game.sides.me.rps={r:0,c:1,t:10,round:3};});await page.waitForSelector('#rpsBox:not([hidden])');await page.screenshot({path:path.join(results,'fog-front-rps.png')});
  await page.click('#rpsBox [data-rps="0"]');await page.waitForTimeout(80);assert(await page.locator('#rpsBox').isHidden());
  // Play into a wave; monsters spawn and the HUD stage moves on after clearing.
  await page.evaluate(()=>{const g=fogUI.game;g.startNow();fogUI.step(60*6);});await page.waitForTimeout(200);assert(await page.evaluate(()=>fogUI.game.phase==='wave'||fogUI.game.stage>1));
  await page.screenshot({path:path.join(results,'fog-front-wave.png')});
  // Boss stage renders its intro card.
  await page.evaluate(()=>{const g=fogUI.game;g.monsters=[];g.queue=[];g.stage=10;g.phase='prep';g.prepT=0;fogUI.step(60*8);});await page.waitForTimeout(400);
  assert(await page.evaluate(()=>fogUI.game.monsters.some(m=>m.kind==='fogqueen')));await page.screenshot({path:path.join(results,'fog-front-boss.png')});
  // Pause freezes the rules.
  await page.keyboard.press('p');assert(await page.locator('#pauseView').isVisible());const t0=await page.evaluate(()=>fogUI.game.time);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>fogUI.game.time),t0);await page.click('#resumeBtn');
  // Defeat shows results and stores the best score.
  await page.evaluate(()=>{const g=fogUI.game;g.score=4321;g.collapse('me');});await page.waitForSelector('#resultView:not([hidden])',{timeout:5000});
  assert.equal(await page.locator('#resultStats>div').count(),6);assert(Number(await page.evaluate(()=>localStorage.getItem('fogFrontBest')))>=4321);
  await page.click('#retryBtn');assert.equal(await page.evaluate(()=>[fogUI.running,fogUI.game.stage].join()),'true,1');
  assert.deepEqual(errors,[]);await ctx.close();
  // Phone: whole game column fits the width, no horizontal scroll, tapping works.
  const phone=await browser.newContext({...devices['iPhone 13']});await prep(phone);const mp=await phone.newPage(),merr=[];mp.on('pageerror',e=>merr.push(e.message));
  await mp.goto(url);await mp.waitForFunction(()=>window.fogUI);assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await mp.locator('#startBtn').tap();await mp.waitForTimeout(700);const col=await mp.locator('.ff-col').boundingBox();assert(col.width<=390&&col.height<=700,`column ${col.width}x${col.height}`);
  const mid=await mp.evaluate(()=>{const g=fogUI.game;const u=g.units.find(x=>x.side==='me');return u.id;});const p0=await toScreen(mp,'me',0,0);await mp.touchscreen.tap(p0.x,p0.y);
  await mp.screenshot({path:path.join(results,'fog-front-phone.png')});assert.deepEqual(merr,[]);
  console.log('PASS: menu, start, drag-to-scout, summon, skill button, RPS popup, wave, boss intro, pause freeze, defeat/best score/retry, phone layout');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
