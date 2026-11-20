'use strict';
// Browser test for 들키면 재수. Needs Playwright on NODE_PATH. Run: node scripts/test-exam-sneak-browser.cjs
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium,devices}=require('playwright');
const root=path.resolve(__dirname,'..'),results=path.resolve(root,process.env.EXAM_TEST_RESULTS||'test-results');fs.mkdirSync(results,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{const uri=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+decodeURIComponent(uri));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/arcade/exam-sneak.html`;let browser;
 const prep=async ctx=>{await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());await ctx.route('**/scripts/firebase-client.js',r=>r.fulfill({contentType:'text/javascript',body:'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}'}));};
 const calm=page=>page.evaluate(()=>{for(const s of examUI.game.staff){s.state='desk';s.t=999;}});
 try{
  browser=await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:undefined);
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}});await prep(ctx);const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.examUI&&window.ExamCore);
  assert(await page.locator('#menuView').isVisible());await page.click('[data-level="2"]');assert.equal(await page.locator('[data-level="2"]').getAttribute('aria-pressed'),'true');await page.click('[data-level="1"]');
  await page.click('#startBtn');assert(await page.locator('#introView').isVisible());await page.evaluate(()=>examUI.step(60*3));assert.equal(await page.evaluate(()=>examUI.game.phase),'exam');assert(await page.locator('#overlay').isHidden());
  assert.equal(await page.locator('#hudQ').textContent(),'0/15');{const col=await page.locator('.es-col').boundingBox(),head=await page.evaluate(()=>document.querySelector('site-header').getBoundingClientRect().bottom);assert(col.y>=head-1&&col.y+col.height<=1002,`desktop column visible: ${JSON.stringify(col)}`);}
  // Holding Space pulls the AI pen out and solves fast while nobody looks.
  await calm(page);await page.keyboard.down('Space');await page.evaluate(()=>examUI.step(60*5));
  assert(await page.evaluate(()=>examUI.game.devT===1&&examUI.game.q>=2),'AI solved questions');assert(await page.locator('#aiBtn').evaluate(b=>b.classList.contains('on')));
  await page.screenshot({path:path.join(results,'exam-sneak-ai.png')});
  await page.keyboard.up('Space');await page.evaluate(()=>examUI.step(30));assert.equal(await page.evaluate(()=>examUI.game.devT),0,'releasing hides the pen');
  // Being watched with the pen out raises suspicion and turns the cone red; hidden pen lets it cool down.
  await page.evaluate(()=>{const g=examUI.game,s=g.staff[0];s.state='scan';s.t=999;s.sweep=0;s.x=320;s.y=96;s.dir=Math.PI/2;});await page.keyboard.down('Space');await page.evaluate(()=>examUI.step(60));
  const s1=await page.evaluate(()=>examUI.game.susp);assert(s1>20,`suspicion rose ${s1}`);await page.screenshot({path:path.join(results,'exam-sneak-spotted.png')});await page.keyboard.up('Space');
  await page.evaluate(()=>{examUI.game.staff[0].state='desk';examUI.game.staff[0].t=999;});await page.keyboard.down('KeyD');await page.evaluate(()=>examUI.step(60));await page.keyboard.up('KeyD');assert(await page.evaluate(v=>examUI.game.susp<v,s1),'act cools down');
  // Mobile-style hold on the honest button.
  const before=await page.evaluate(()=>examUI.game.prog+examUI.game.q);await page.locator('#solveBtn').scrollIntoViewIfNeeded();const sb=await page.locator('#solveBtn').boundingBox();await page.mouse.move(sb.x+sb.width/2,sb.y+sb.height/2);await page.mouse.down();await page.evaluate(()=>examUI.step(60*2));await page.mouse.up();
  assert(await page.evaluate(b=>examUI.game.prog+examUI.game.q>b,before),'honest solving progresses');
  // A staring proctor opens the excuse picker; key 1 answers it and the proctor replies.
  await page.evaluate(()=>{const g=examUI.game,s=g.staff[0];s.state='check';s.x=380;s.y=g.staff[0].y;g.checkCd=99;examUI.step(60*9);});await page.waitForSelector('#excuseBox:not([hidden])');assert.equal(await page.locator('#excuseList button').count(),3);await page.screenshot({path:path.join(results,'exam-sneak-excuse.png')});
  await page.keyboard.press('Digit1');await page.evaluate(()=>examUI.step(2));await page.waitForSelector('#excuseBox',{state:'hidden'});{const d=await page.evaluate(()=>[examUI.game.excuses,examUI.game.staff[0].sayT,examUI.game.staff[0].state,examUI.game.phase,examUI.paused]);assert(d[0]===1&&d[1]>0,JSON.stringify(d));}await page.screenshot({path:path.join(results,'exam-sneak-reply.png')});
  await page.evaluate(()=>{const g=examUI.game;g.susp=0;examUI.step(60*6);for(const s of g.staff){s.state='desk';s.t=999;s.x=320;s.y=96;}});
  // Pause freezes the clock.
  await page.keyboard.press('p');assert(await page.locator('#pauseView').isVisible());const t0=await page.evaluate(()=>examUI.game.timeLeft);await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>examUI.game.timeLeft),t0);await page.click('#resumeBtn');
  // End of period: perk choice, then period 2 with a roaming proctor.
  await page.evaluate(()=>{examUI.game.timeLeft=.01;examUI.step(2);});await page.waitForSelector('#breakView:not([hidden])');assert.equal(await page.locator('#perkList .es-perk').count(),3);await page.screenshot({path:path.join(results,'exam-sneak-break.png')});
  await page.locator('#perkList .es-perk').first().click();assert.equal(await page.evaluate(()=>[examUI.game.period,examUI.game.staff.length].join()),'1,2');assert.equal(await page.locator('#perkBox li b').count(),1);
  // Lunch metal detector after period 2.
  await page.evaluate(()=>{examUI.step(60*3);examUI.game.timeLeft=.01;examUI.step(2);});await page.waitForSelector('#searchView:not([hidden])');await page.click('[data-hide="restroom"]');await page.waitForSelector('#breakView:not([hidden])');
  await page.locator('#perkList .es-perk').first().click();await page.evaluate(()=>examUI.step(60*3));assert(await page.evaluate(()=>examUI.game.lockDevice>15),'restroom hides the pen for a while');
  // Period 3 → 4 → results with stored best score.
  await page.evaluate(()=>{examUI.game.timeLeft=.01;examUI.step(2);});await page.locator('#perkList .es-perk').first().click();await page.evaluate(()=>examUI.step(60*3));
  assert.equal(await page.evaluate(()=>examUI.game.staff.length),3);await calm(page);await page.evaluate(()=>{const g=examUI.game;g.staff[2].state='peek';g.staff[2].x=g.staff[2].x-30;g.staff[2].t=999;examUI.step(30);});await page.screenshot({path:path.join(results,'exam-sneak-period4.png')});
  await page.evaluate(()=>{examUI.game.timeLeft=.01;examUI.step(2);});await page.waitForSelector('#resultView:not([hidden])');assert.equal(await page.locator('#resultStats>div').count(),6);assert.equal(await page.locator('#resultSubjects li').count(),4);assert.match(await page.locator('#resultHeadline').textContent(),/^\[/);
  assert(Number(await page.evaluate(()=>localStorage.getItem('examSneakBest')))>0);await page.screenshot({path:path.join(results,'exam-sneak-result.png')});
  // Getting caught ends the run without a best score.
  await page.click('#retryBtn');await page.evaluate(()=>examUI.step(60*3));await page.evaluate(()=>{examUI.game.susp=99.9;examUI.game.devT=1;const s=examUI.game.staff[0];s.state='scan';s.t=999;s.sweep=0;s.dir=Math.PI/2;});await page.keyboard.down('Space');await page.evaluate(()=>examUI.step(30));await page.keyboard.up('Space');
  assert.equal(await page.evaluate(()=>examUI.game.phase),'caught');await page.waitForSelector('#resultView:not([hidden])',{timeout:5000});assert.match(await page.locator('#resultKicker').textContent(),/CAUGHT/);
  assert.deepEqual(errors,[]);await ctx.close();
  // Phone: the game column fits, no horizontal scroll, the hold buttons work with touch.
  const phone=await browser.newContext({...devices['iPhone 13']});await prep(phone);const mp=await phone.newPage(),merr=[];mp.on('pageerror',e=>merr.push(e.message));
  await mp.goto(url);await mp.waitForFunction(()=>window.examUI);assert(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await mp.locator('#startBtn').tap();await mp.evaluate(()=>examUI.step(60*3));const col=await mp.locator('.es-col').boundingBox();const head=await mp.evaluate(()=>document.querySelector('site-header').getBoundingClientRect().bottom);assert(col.width<=390&&col.y>=head-1&&col.y+col.height<=mp.viewportSize().height+2,`whole column visible under the header: ${JSON.stringify(col)} head ${head}`);
  await mp.locator('#aiBtn').scrollIntoViewIfNeeded();const ab=await mp.locator('#aiBtn').boundingBox();assert(ab.height>=44,'thumb-sized buttons');
  await mp.evaluate(()=>{for(const s of examUI.game.staff){s.state='desk';s.t=999;}});
  const cdp=await phone.newCDPSession(mp),pt={x:ab.x+ab.width/2,y:ab.y+ab.height/2};await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt]});await mp.evaluate(()=>examUI.step(60*2));
  assert(await mp.evaluate(()=>examUI.game.input.ai&&examUI.game.devT===1),'touch hold pulls the pen');await mp.screenshot({path:path.join(results,'exam-sneak-phone.png')});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mp.waitForTimeout(50);assert(!(await mp.evaluate(()=>examUI.game.input.ai)),'touch release');
  assert.deepEqual(merr,[]);
  console.log('PASS: menu/level, intro, AI hold solves, release hides, spotted raises suspicion, act cools down, honest hold, pause, perk break, lunch search, 4 periods, result/best, caught, phone layout + touch hold');
 }finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
