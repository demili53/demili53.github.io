'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/rift-advanced-check');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{const uri=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(uri.endsWith('/')?uri+'index.html':uri));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:undefined);
  const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.stack||e.message));
  await page.route('**/scripts/firebase-client.js',r=>r.fulfill({contentType:'text/javascript',body:'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}'}));
  const url=`http://127.0.0.1:${server.address().port}/arcade/rift-blade.html`;
  const frame=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const screenshot=async name=>{await page.evaluate(()=>scrollTo(0,0));await frame();await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});};
  const raw=async name=>{await frame();const uri=await page.evaluate(()=>riftCanvas.toDataURL());fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(uri.split(',')[1],'base64'));};
  const state=()=>page.evaluate(()=>({stage:rift.stage,wave:rift.wave,classId:rift.classId,difficultyId:rift.difficultyId,hp:rift.player.hp,mp:rift.player.mp,coins:rift.coins,relics:rift.relics,cd:rift.player.cd,stats:rift.stats,objective:rift.objective,time:rift.time}));
  await page.goto(url);await page.waitForFunction(()=>typeof rift!=='undefined'&&typeof RiftSave!=='undefined');
  assert.equal(await page.evaluate(()=>riftAudio.enabled),false);assert.equal(await page.evaluate(()=>riftAudio._context),null);
  for(const difficulty of ['veteran','normal','story']){await page.click(`[data-difficulty="${difficulty}"]`);assert.equal(await page.evaluate(()=>rift.difficultyId),difficulty);assert.equal(await page.locator(`[data-difficulty="${difficulty}"]`).getAttribute('aria-pressed'),'true');}
  await page.click('[data-class="archer"]');await page.click('#motionToggle');
  assert.equal(await page.locator('html').getAttribute('data-reduced-motion'),'true');
  await page.click('#soundToggle');await page.waitForFunction(()=>document.getElementById('soundToggle').getAttribute('aria-pressed')==='true');
  const audioSupported=await page.evaluate(()=>typeof AudioContext==='function'||typeof webkitAudioContext==='function');
  if(audioSupported)assert.equal(await page.evaluate(()=>riftAudio._context?.state),'running');
  await page.click('#startBtn');await page.waitForFunction(()=>rift.state==='playing');await frame();
  for(const difficulty of ['story','normal','veteran'])assert(await page.locator(`[data-difficulty="${difficulty}"]`).isDisabled());
  assert((await page.locator('#objectiveTitle').textContent()).length>0);assert((await page.locator('#objectiveStatus').textContent()).length>0);
  assert(await page.evaluate(()=>!!rift.objective),'region objective should exist after starting');

  // Actual synthesized cue from a user-enabled AudioContext, then mute prevents any voice.
  if(audioSupported){const voices=await page.evaluate(()=>{rift.player.cd.attack=0;rift.action('attack');riftAudio.sync(rift);return riftAudio._voices.size;});assert(voices>0);}
  await page.click('#soundToggle');assert.equal(await page.evaluate(()=>riftAudio.enabled),false);
  assert.equal(await page.evaluate(()=>{rift.player.cd.attack=0;rift.action('attack');riftAudio.sync(rift);return riftAudio._voices.size;}),0);
  const dodge=await page.evaluate(()=>{rift.player.cd.dash=0;rift.player.mp=30;rift.action('dash');const hp=rift.player.hp;rift.hitPlayer(18);return{hp,after:rift.player.hp,count:rift.stats.perfectDodges};});
  assert.equal(dodge.hp,dodge.after);assert.equal(dodge.count,1);await frame();assert((await page.locator('#dodgeText').textContent()).includes('1'));

  // Produce actual enemy loot, inspect the rendering, and collect by proximity.
  await page.evaluate(()=>{rift.player.dash=0;const enemy=rift.enemies[0];enemy.x=680;enemy.y=340;rift.hurtEnemy(enemy,99999,0);rift.pause();});
  assert((await page.evaluate(()=>rift.pickups.length))>0);await raw('loot-drops');
  const loot=await page.evaluate(()=>{const item=rift.pickups.find(p=>p.kind==='gold'),before=rift.coins;rift.pause();rift.player.x=item.x;rift.player.y=item.y;rift.step(.01);return{before,after:rift.coins,value:item.value,collected:!rift.pickups.includes(item)};});
  assert(loot.collected);assert.equal(loot.after-loot.before,loot.value);

  // Complete only the first dungeon using real kill/reward/wave transitions.
  await page.evaluate(()=>{rift.player.x=150;rift.player.y=350;for(let wave=0;wave<2;wave++){for(const enemy of rift.enemies)rift.hurtEnemy(enemy,99999,0);rift.step(.01);}rift.player.hp=rift.player.maxHp-95;rift.player.potions=2;rift.coins=700;});
  await page.waitForFunction(()=>rift.state==='upgrade'&&!document.getElementById('campShop').hidden);
  assert.equal(await page.evaluate(()=>rift.stage),0);assert.equal(await page.evaluate(()=>rift.stats.stagesCleared),1);
  assert(await page.evaluate(()=>rift.objective.complete&&rift.objective.claimed));assert.equal(await page.locator('#objectiveStatus').getAttribute('data-complete'),'true');
  assert.equal(await page.locator('#upgradeChoices [data-upgrade]').count(),3);assert.equal(await page.locator('#shopChoices [data-purchase]').count(),3);
  await page.setViewportSize({width:390,height:844});await frame();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // Every camp control must be reachable, including when the overlay needs scrolling.
  for(const selector of ['#shopChoices [data-purchase="heal"]','#shopChoices [data-purchase="potion"]','#shopChoices [data-purchase="training"]','#relicReroll','#upgradeChoices [data-upgrade]']){
   const button=page.locator(selector).first();await button.scrollIntoViewIfNeeded();
   assert(await button.evaluate(el=>{const b=el.getBoundingClientRect(),o=document.getElementById('riftOverlay').getBoundingClientRect();return b.left>=o.left-1&&b.right<=o.right+1&&b.top>=o.top-1&&b.bottom<=o.bottom+1;}),selector+' must fit inside reachable camp overlay');
  }
  await screenshot('mobile-camp');
  const purchases=await page.evaluate(()=>({hp:rift.player.hp,potions:rift.player.potions,damage:rift.player.damage,coins:rift.coins,offers:rift.shopOffers.map(({id,cost})=>({id,cost}))}));
  for(const id of ['heal','potion','training']){await page.click(`[data-purchase="${id}"]`);await frame();assert(await page.locator(`[data-purchase="${id}"]`).isDisabled());}
  assert.equal(await page.evaluate(()=>rift.player.hp),purchases.hp+80);assert.equal(await page.evaluate(()=>rift.player.potions),purchases.potions+1);assert.equal(await page.evaluate(()=>rift.player.damage),purchases.damage+3);
  assert.equal(await page.evaluate(()=>rift.coins),purchases.coins-purchases.offers.reduce((sum,o)=>sum+o.cost,0));
  const rerollBefore=await page.evaluate(()=>({options:[...rift.upgradeOptions],coins:rift.coins}));await page.click('#relicReroll');await frame();
  const rerollAfter=await page.evaluate(()=>({options:[...rift.upgradeOptions],coins:rift.coins,left:rift.rerollsRemaining}));assert.equal(rerollAfter.coins,rerollBefore.coins-60);assert.equal(rerollAfter.left,0);assert(rerollAfter.options.some(id=>!rerollBefore.options.includes(id)));assert(await page.locator('#relicReroll').isDisabled());
  const selected=await page.locator('#upgradeChoices [data-upgrade]').first().getAttribute('data-upgrade');await page.locator('#upgradeChoices [data-upgrade]').first().click();await page.waitForFunction(()=>rift.stage===1&&rift.state==='playing');assert(await page.evaluate(id=>rift.relics.includes(id),selected));

  // A real synergy definition supplies the pair, so the UI test does not duplicate its registry.
  const synergy=await page.evaluate(()=>{const s=RIFT_SYNERGIES[0];rift.relics=[...new Set([...rift.relics,...s.relics])];return{name:s.name,id:s.id};});
  await frame();assert((await page.locator('#synergyList p.active').allTextContents()).some(text=>text.includes(synergy.name)));assert(await page.evaluate(id=>rift.activeSynergies.some(s=>s.id===id),synergy.id));
  await page.setViewportSize({width:1440,height:1080});
  await page.evaluate(()=>{rift.wave=1;rift.spawn();const boss=rift.enemies.find(e=>e.type==='boss');rift.hurtEnemy(boss,Math.ceil(boss.maxHp*.6),0);rift.pause();});
  assert(await page.evaluate(()=>rift.enemies.some(e=>e.elite)));assert(await page.evaluate(()=>rift.enemies.some(e=>e.type==='boss'&&e.enraged)));await raw('elite-and-enraged-boss');

  // Save a nontrivial paused checkpoint, reload, restore through UI and verify exact values.
  await page.evaluate(()=>{rift.player.hp=rift.player.maxHp-37;rift.player.mp=58;rift.player.cd.skill=1.35;rift.player.cd.ultimate=4.75;rift.player.x=215;rift.player.y=365;});
  await page.click('#saveRunBtn');assert((await page.locator('#runMessage').textContent()).includes('저장했습니다'));
  const saved=await state();assert.equal(await page.evaluate(()=>RiftSave.has()),true);
  await page.reload();await page.waitForFunction(()=>typeof rift!=='undefined'&&!document.getElementById('continueRun').hidden);
  assert.equal(await page.locator('html').getAttribute('data-reduced-motion'),'true');assert.equal(await page.locator('#motionToggle').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#soundToggle').getAttribute('aria-pressed'),'false');
  await page.click('#continueRun');assert.equal(await page.evaluate(()=>rift.state),'paused');assert.deepEqual(await state(),saved);
  const pixels=await page.evaluate(()=>riftCanvas.toDataURL());await page.waitForTimeout(180);assert.deepEqual(await state(),saved);assert.equal(await page.evaluate(()=>riftCanvas.toDataURL()),pixels);
  await screenshot('restored-checkpoint');await page.click('#startBtn');await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>rift.state),'playing');assert((await page.evaluate(()=>rift.time))>saved.time);
  await page.evaluate(()=>{rift.player.inv=0;rift.player.perfectWindow=0;rift.player.shield=0;rift.hitPlayer(99999);});await page.waitForFunction(()=>rift.state==='lost'&&!document.getElementById('runResults').hidden);
  assert.equal(await page.locator('#runResults>div').count(),6);assert((await page.locator('#runResults').textContent()).includes('정밀 회피'));assert.equal(await page.evaluate(()=>RiftSave.has()),false);
  await screenshot('expedition-result');assert.deepEqual(errors,[]);
  console.log('PASS: difficulty selection/lock, AudioContext opt-in/mute, reduced-motion persistence, perfect dodge, loot collection, mobile camp reachability, all shop purchases/guards, relic reroll/cost, synergy/objective UI, elite/enrage rendering, exact paused save/reload/continue, resume and result statistics');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
