'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/rift-frontier-check');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{const uri=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(uri.endsWith('/')?uri+'index.html':uri));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:undefined);
  const context=await browser.newContext({viewport:{width:1440,height:1080},deviceScaleFactor:1,hasTouch:true}),errors=[];
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.stack||error.message)));
  await context.route('**/scripts/firebase-client.js',route=>route.fulfill({contentType:'text/javascript',body:'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}'}));
  const page=await context.newPage(),url=`http://127.0.0.1:${server.address().port}/arcade/rift-blade.html`;
  const frame=(p=page)=>p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const screenshot=async(name,p=page)=>{await p.evaluate(()=>scrollTo(0,0));await frame(p);await p.screenshot({path:path.join(out,name+'.png'),fullPage:true});};
  const raw=async name=>{await frame();const uri=await page.evaluate(()=>riftCanvas.toDataURL());fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(uri.split(',')[1],'base64'));};
  const reachable=async selector=>{const buttons=page.locator(selector);for(let i=0;i<await buttons.count();i++){const button=buttons.nth(i);await button.scrollIntoViewIfNeeded();assert(await button.evaluate(el=>{const b=el.getBoundingClientRect(),o=document.getElementById('riftOverlay').getBoundingClientRect();return b.left>=o.left-1&&b.right<=o.right+1&&b.top>=o.top-1&&b.bottom<=o.bottom+1;}),selector+' must fit inside the scrollable camp overlay');}};
  const fullState=()=>page.evaluate(()=>JSON.parse(JSON.stringify(rift)));
  await page.goto(url);await page.waitForFunction(()=>typeof RiftPractice!=='undefined'&&typeof RiftJournal!=='undefined'&&typeof RIFT_COMPANIONS!=='undefined');

  // Passive descriptions follow actual class selection, including always-on passives.
  const passiveNames=await page.evaluate(()=>Object.entries(RIFT_PASSIVES).map(([id,p])=>({id,name:p.name})));
  for(const {id,name}of passiveNames){await page.click(`[data-class="${id}"]`);await frame();assert.equal(await page.locator('#passiveName').textContent(),name);assert((await page.locator('#passiveProgress').textContent()).length>0);}
  await page.click('[data-class="mage"]');await page.click('#startBtn');
  await page.evaluate(()=>{const e=rift.enemies[0];Object.assign(e,{x:650,y:350,hp:5000,maxHp:5000,stun:500,cd:500});rift.enemies=[e];Object.assign(rift.player,{x:600,y:350,face:1});rift.containers=[];});
  await page.locator('#riftCanvas').focus();await page.keyboard.press('k');
  const burn=await page.evaluate(()=>{rift.pause();return{burn:rift.enemies[0].burn,hp:rift.enemies[0].hp,combo:rift.combo,ready:rift.player.passiveReady};});
  assert(burn.burn>0);assert(burn.ready);await frame();assert.equal(await page.locator('#passiveProgress').textContent(),'효과 준비');await raw('mage-burning-target');
  const dot=await page.evaluate(()=>{rift.pause();for(let i=0;i<17;i++)rift.step(.04);rift.pause();return{hp:rift.enemies[0].hp,combo:rift.combo};});assert(dot.hp<burn.hp);assert.equal(dot.combo,burn.combo);

  // Start a fresh real warrior expedition, then land three keyboard attacks.
  await page.evaluate(()=>{rift=new RiftGame('warrior');riftExpeditionKey='';riftFrontierKey='';riftUI();});await page.click('#startBtn');
  await page.evaluate(()=>{const e=rift.enemies[0];Object.assign(e,{x:650,y:350,hp:5000,maxHp:5000,stun:500,cd:500});rift.enemies=[e];Object.assign(rift.player,{x:600,y:350,face:1});rift.containers=[];});
  for(let i=0;i<3;i++){await page.evaluate(()=>{rift.player.cd.attack=0;rift.enemies[0].x=650;});await page.locator('#riftCanvas').focus();await page.keyboard.press('j');if(i===1){await frame();assert.equal(await page.locator('#passiveProgress').textContent(),'효과 준비');}}
  assert(await page.evaluate(()=>rift.enemies[0].fracture>0));await page.evaluate(()=>rift.pause());await raw('warrior-armor-fracture');

  // Reach the first camp through normal kills and wave progression.
  await page.evaluate(()=>{rift.pause();for(let wave=0;wave<2;wave++){for(const enemy of rift.enemies)rift.hurtEnemy(enemy,99999,0);rift.step(.01);}rift.coins=2000;rift.player.hp=rift.player.maxHp-50;});
  await page.waitForFunction(()=>rift.state==='upgrade'&&!document.getElementById('campTabs').hidden);
  await page.setViewportSize({width:390,height:844});await frame();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.click('[data-camp-tab="forge"]');await frame();assert(await page.locator('#forgePanel').isVisible());assert(await page.locator('#upgradeChoices').isHidden());
  await reachable('[data-camp-tab]');await reachable('#forgeChoices [data-forge]');await reachable('#companionChoices [data-companion]');await screenshot('mobile-forge-camp');
  for(let rank=1;rank<=3;rank++){const before=await page.evaluate(()=>({coins:rift.coins,cost:rift.forgeOffers.find(x=>x.id==='edge').cost}));await page.click('[data-forge="edge"]');await frame();assert.equal(await page.evaluate(()=>rift.weaponId),'edge');assert.equal(await page.evaluate(()=>rift.weaponRank),rank);assert.equal(await page.evaluate(()=>rift.coins),before.coins-before.cost);}
  assert(await page.locator('[data-forge="edge"]').isDisabled());
  await page.click('[data-forge="focus"]');await frame();assert.equal(await page.evaluate(()=>rift.weaponId),'focus');assert.equal(await page.evaluate(()=>rift.weaponRank),1);assert((await page.locator('#weaponName').textContent()).includes('1/3'));
  const companionOffer=await page.evaluate(()=>({coins:rift.coins,cost:rift.companionOffers.find(c=>c.id==='sprite').cost}));await page.click('[data-companion="sprite"]');await frame();assert.equal(await page.evaluate(()=>rift.companionId),'sprite');assert.equal(await page.evaluate(()=>rift.coins),companionOffer.coins-companionOffer.cost);assert(await page.locator('[data-companion="sprite"]').isDisabled());assert((await page.locator('#companionName').textContent()).includes('동료'));
  await page.click('[data-camp-tab="route"]');await frame();await reachable('[data-camp-tab]');await reachable('#routeChoices [data-route]');await reachable('#shrineChoices [data-shrine]');await screenshot('mobile-route-camp');
  await page.click('[data-route="treasure"]');await frame();assert.equal(await page.evaluate(()=>rift.pendingRouteId),'treasure');assert.equal(await page.evaluate(()=>rift.routeId),'standard');assert.equal(await page.locator('[data-route="treasure"]').getAttribute('aria-pressed'),'true');
  const shrine=await page.evaluate(()=>({coins:rift.coins,sp:rift.skillPoints}));await page.click('[data-shrine="wisdom"]');await frame();assert.equal(await page.evaluate(()=>rift.coins),shrine.coins-80);assert.equal(await page.evaluate(()=>rift.skillPoints),shrine.sp+2);assert.equal(await page.evaluate(()=>rift.shrineChoice),'wisdom');for(const id of ['mercy','sacrifice','wisdom'])assert(await page.locator(`[data-shrine="${id}"]`).isDisabled());
  await page.click('[data-camp-tab="loot"]');await page.locator('#upgradeChoices [data-upgrade]').first().click();await page.waitForFunction(()=>rift.state==='playing'&&rift.stage===1);assert.equal(await page.evaluate(()=>rift.routeId),'treasure');assert.equal(await page.evaluate(()=>rift.pendingRouteId),'standard');
  await page.setViewportSize({width:1440,height:1080});

  // A companion tick heals without inventing a hit or a combat reward.
  const heal=await page.evaluate(()=>{for(const e of rift.enemies){e.stun=500;e.cd=500;}rift.player.hp=rift.player.maxHp-40;rift.companionCooldown=0;const hp=rift.player.hp,combo=rift.combo;rift.step(.04);rift.pause();return{hp,after:rift.player.hp,combo,afterCombo:rift.combo,cooldown:rift.companionCooldown};});assert(heal.after>heal.hp);assert.equal(heal.combo,heal.afterCombo);assert(heal.cooldown>0);await raw('sprite-companion');

  // Break a generated environmental prop with the ordinary keyboard attack.
  const prop=await page.evaluate(()=>{rift.pause();const box=rift.containers.find(c=>!c.opened);if(!box)throw Error('No generated breakable container');box.hp=1;rift.player.x=Math.max(35,box.x-65);rift.player.y=box.y;rift.player.face=1;rift.player.cd.attack=0;return{id:box.id,pickups:rift.pickups.length,coins:rift.coins};});
  await page.locator('#riftCanvas').focus();await page.keyboard.press('j');await page.evaluate(()=>rift.pause());
  assert(await page.evaluate(id=>rift.containers.some(c=>c.id===id&&c.opened),prop.id));assert(await page.evaluate(before=>rift.pickups.length>before.pickups||rift.coins>before.coins,prop));await raw('broken-container-loot');

  // A direct hit fills the boss break gauge and cancels only its pending hazards.
  const broken=await page.evaluate(()=>{rift.pause();rift.wave=1;rift.spawn();for(const e of rift.enemies){e.stun=500;e.cd=500;}const boss=rift.enemies.find(e=>e.type==='boss');boss.stagger=99;rift.bossPattern(boss);const pending=rift.hazards.filter(h=>h.sourceId===boss.id).length;rift.hurtEnemy(boss,1,0);rift.pause();return{pending,broken:boss.broken,guard:boss.breakGuard,wind:boss.wind,hazards:rift.hazards.filter(h=>h.sourceId===boss.id&&h.wind>0).length,breaks:rift.stats.breaks};});
  assert(broken.pending>0);assert(broken.broken>0);assert(broken.guard>0);assert.equal(broken.wind,0);assert.equal(broken.hazards,0);assert.equal(broken.breaks,1);await raw('boss-stagger-break');

  // Persist every new field in a real paused checkpoint, then restore through UI.
  await page.evaluate(()=>{rift.player.hp=rift.player.maxHp-27;rift.player.mp=53;rift.player.passiveCharge=2;rift.player.passiveCooldown=1.3;rift.player.cd.skill=1.7;rift.companionCooldown=2.3;const e=rift.enemies[0];Object.assign(e,{burn:2,burnTick:.3,burnDamage:4,fracture:2});});
  await page.click('#saveRunBtn');assert((await page.locator('#runMessage').textContent()).includes('저장했습니다'));const saved=await fullState();assert.equal(saved.weaponId,'focus');assert.equal(saved.companionId,'sprite');assert.equal(saved.routeId,'treasure');assert(saved.containers.length>0);
  await page.reload();await page.waitForFunction(()=>!document.getElementById('continueRun').hidden);await page.click('#continueRun');assert.equal(await page.evaluate(()=>rift.state),'paused');assert.deepEqual(await fullState(),saved);await page.waitForTimeout(160);assert.deepEqual(await fullState(),saved);await screenshot('frontier-checkpoint-restored');

  // Complete one run, verify journal idempotence, discovered items, and reload persistence.
  await page.click('#startBtn');await page.evaluate(()=>{rift.player.inv=0;rift.player.perfectWindow=0;rift.player.shield=0;rift.hitPlayer(99999);});await page.waitForFunction(()=>rift.state==='lost'&&RiftJournal.load().totals.runs===1);
  const journal=await page.evaluate(()=>RiftJournal.load());assert.equal(journal.runs.length,1);assert(journal.discovered.classes.includes('warrior'));assert(journal.discovered.bosses.includes(0));assert(journal.discovered.enemyTypes.includes('boss'));assert(journal.discovered.relics.length>0);
  assert.equal(await page.evaluate(()=>RiftJournal.record(rift)),false);await frame();assert.equal(await page.evaluate(()=>RiftJournal.load().totals.runs),1);
  await page.click('#journalPanel > summary');assert.equal(await page.locator('#journalTotals>div').count(),4);assert.equal(await page.locator('#journalRuns>li').count(),1);assert((await page.locator('#journalCodex .discovered').count())>0);await screenshot('journal-and-codex');
  await page.reload();await frame();assert.deepEqual(await page.evaluate(()=>RiftJournal.load()),journal);assert.equal(await page.locator('#journalRuns>li').count(),1);

  // The training room must preserve both an existing checkpoint and the run journal.
  await page.click('[data-class="mage"]');await page.click('[data-difficulty="veteran"]');
  const stored=await page.evaluate(()=>{const game=new RiftGame('archer');game.start();game.pause();if(!RiftSave.save(game))throw Error('Fixture checkpoint rejected');return{checkpoint:localStorage.getItem(RiftSave.key),journal:localStorage.getItem(RiftJournal.key)};});
  await page.click('#practiceBtn');await page.waitForFunction(()=>rift.practice);assert.equal(await page.locator('#practiceSpec option').count(),2);assert(await page.locator('#saveRunBtn').isDisabled());
  const specs=await page.locator('#practiceSpec option').evaluateAll(items=>items.map(item=>item.value));await page.selectOption('#practiceSpec',specs[1]);assert.equal(await page.evaluate(()=>rift.specializationId),specs[1]);await page.selectOption('#practiceSpec',specs[0]);assert.equal(await page.evaluate(()=>rift.specializationId),specs[0]);
  await page.evaluate(()=>{rift.player.x=600;rift.player.y=350;rift.player.face=1;});await page.locator('#riftCanvas').focus();await page.keyboard.press('k');assert((await page.evaluate(()=>rift.trainingDamage))>0);await frame();assert.equal(await page.evaluate(()=>rift.player.mp),await page.evaluate(()=>rift.player.maxMp));
  await page.click('#treeBtn');assert.equal(await page.evaluate(()=>rift.state),'talents');const practiceFrozen=await fullState();await page.waitForTimeout(140);assert.deepEqual(await fullState(),practiceFrozen);await page.click('#skillTree [data-node="power"]');assert.equal(await page.evaluate(()=>rift.talents.power),1);await page.click('#closeTreeBtn');
  await page.click('#resetTargetBtn');assert.equal(await page.evaluate(()=>rift.trainingDamage),0);assert.equal(await page.evaluate(()=>rift.target.hp),5000);
  await page.evaluate(()=>{for(let i=0;i<400;i++)rift.step(.04,{attack:true});riftUI();riftManageSave();});
  assert.equal(await page.evaluate(()=>rift.stage),0);assert.equal(await page.evaluate(()=>rift.kills),0);assert.equal(await page.evaluate(()=>rift.coins),0);assert.equal(await page.evaluate(()=>localStorage.getItem(RiftSave.key)),stored.checkpoint);assert.equal(await page.evaluate(()=>localStorage.getItem(RiftJournal.key)),stored.journal);
  await page.setViewportSize({width:390,height:844});await frame();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));for(const selector of ['#practiceSpec','#resetTargetBtn','#exitPracticeBtn'])assert(await page.locator(selector).evaluate(el=>{const b=el.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth;}));await screenshot('mobile-practice');
  await page.click('#exitPracticeBtn');assert.equal(await page.evaluate(()=>rift.state),'ready');assert.equal(await page.evaluate(()=>rift.classId),'mage');assert.equal(await page.evaluate(()=>rift.difficultyId),'veteran');assert(await page.locator('#practiceBar').isHidden());assert.equal(await page.evaluate(()=>localStorage.getItem(RiftSave.key)),stored.checkpoint);assert.equal(await page.evaluate(()=>localStorage.getItem(RiftJournal.key)),stored.journal);
  assert.deepEqual(errors,[]);
  console.log('PASS: six passive UIs, keyboard burn/fracture, forge ranks/replacement, companion purchase/healing, mobile camp tabs/reachability, route and shrine guards, container destruction/loot, boss break cancellation/rendering, exact frontier checkpoint restore, idempotent journal/codex, isolated practice/spec/reset/tree pause and mobile layout');
 }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
