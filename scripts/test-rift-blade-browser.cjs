const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),results=path.resolve(root,process.env.RIFT_TEST_RESULTS||'test-results');fs.mkdirSync(results,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{
  const uri=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+(uri.endsWith('/')?uri+'index.html':uri));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:undefined);
  const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1,hasTouch:true}),errors=[];
  const capturePage=async name=>{await page.evaluate(()=>{scrollTo(0,0);return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});await page.screenshot({path:path.join(results,name),fullPage:true});};
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/scripts/firebase-client.js',r=>r.fulfill({contentType:'text/javascript',body:'export const app={},auth={currentUser:null},authReady=Promise.resolve();export function onAuthStateChanged(a,cb){queueMicrotask(()=>cb(null));return()=>{}}export async function signOut(){}'}));
  await page.goto(`http://127.0.0.1:${server.address().port}/arcade/rift-blade.html`);
  await page.waitForFunction(()=>typeof rift!=='undefined');
  assert.equal(await page.locator('site-header nav a').count(),5);
  assert.equal(await page.locator('#classChoices [data-class]').count(),6);assert.equal(await page.locator('#stageList li').count(),6);
  await page.click('[data-class="warrior"]');await page.click('#startBtn');
  assert.equal(await page.evaluate(()=>rift.state),'playing');
  const startX=await page.evaluate(()=>rift.player.x);
  await page.keyboard.down('d');await page.waitForTimeout(250);await page.keyboard.up('d');
  assert((await page.evaluate(()=>rift.player.x))>startX+20);
  await page.evaluate(()=>{const e=rift.enemies[0];e.x=rift.player.x+60;e.y=rift.player.y;});
  await page.keyboard.press('j');assert((await page.evaluate(()=>rift.combo))>0);
  const mana=await page.evaluate(()=>({mp:rift.player.mp,cost:rift.skillCost('skill')}));
  await page.keyboard.press('k');assert((await page.evaluate(()=>rift.player.mp))<mana.mp-mana.cost+4);
  fs.mkdirSync(results,{recursive:true});
  await capturePage('rift-blade-desktop.png');
  await page.keyboard.press('p');await page.waitForTimeout(50);
  const frozen=await page.evaluate(()=>({state:JSON.stringify(rift),canvas:riftCanvas.toDataURL()}));
  await page.waitForTimeout(180);
  assert.deepEqual(await page.evaluate(()=>({state:JSON.stringify(rift),canvas:riftCanvas.toDataURL()})),frozen);
  await page.click('#startBtn');
  // The tree is a real pause state: spending changes stats, but nothing advances.
  await page.click('#treeBtn');await page.waitForFunction(()=>rift.state==='talents');
  const treeBefore=await page.evaluate(()=>({time:rift.time,hp:rift.player.hp,damage:rift.player.damage,sp:rift.skillPoints}));
  assert(await page.locator('[data-node="mastery"]').isDisabled());
  await page.click('[data-node="power"]');await page.waitForTimeout(120);
  assert.deepEqual(await page.evaluate(()=>({time:rift.time,hp:rift.player.hp,damage:rift.player.damage,sp:rift.skillPoints})),{...treeBefore,damage:treeBefore.damage+5,sp:treeBefore.sp-1});
  assert(await page.locator('[data-node="power"]').isDisabled());
  await page.click('#closeTreeBtn');await page.waitForFunction(()=>rift.state==='playing');
  assert.equal(await page.evaluate(()=>rift.ultimateUnlocked),false);
  assert(await page.locator('[data-action="ultimate"]').isDisabled());
  await page.evaluate(()=>rift.gainXP(120));
  await page.waitForFunction(()=>rift.ultimateUnlocked&&!document.querySelector('[data-action="ultimate"]').disabled);
  assert((await page.locator('#xpText').textContent()).includes('/'));
  assert.equal(await page.locator('#skillPoints').textContent(),String(await page.evaluate(()=>rift.skillPoints)));
  // Level rewards and class-specific branches are chosen while combat is frozen.
  await page.click('#treeBtn');await page.waitForFunction(()=>rift.state==='talents');
  const rewardBefore=await page.evaluate(()=>({damage:rift.player.damage,count:rift.pendingLevelRewards,time:rift.time}));
  await page.click('[data-level-reward="power"]');
  assert.equal(await page.evaluate(()=>rift.player.damage),rewardBefore.damage+3);
  assert.equal(await page.evaluate(()=>rift.pendingLevelRewards),rewardBefore.count-1);
  assert.equal(await page.evaluate(()=>rift.time),rewardBefore.time);
  assert(await page.locator('[data-branch="technique2"]').isDisabled());
  await page.click('[data-branch="technique"]');assert.equal(await page.evaluate(()=>rift.branchRanks.technique),1);
  assert(await page.locator('[data-branch="technique2"]').isDisabled());
  await page.evaluate(()=>rift.gainXP(rift.xpNeeded));
  await page.waitForFunction(()=>!document.querySelector('[data-branch="technique2"]').disabled);
  await page.click('[data-branch="technique2"]');assert.equal(await page.evaluate(()=>rift.branchRanks.technique2),1);
  assert(await page.locator('[data-action="awakening"]').isDisabled());
  assert(await page.locator('[data-specialization]').first().isDisabled());
  await page.click('[data-skill-rank="skill"]');assert.equal(await page.evaluate(()=>rift.skillRanks.skill),1);
  await page.click('[data-skill-rank="skill"]');assert.equal(await page.evaluate(()=>rift.skillRanks.skill),2);
  assert(await page.locator('[data-skill-rank="skill"]').isDisabled());
  await page.evaluate(()=>rift.gainXP(rift.xpNeeded));
  await page.waitForFunction(()=>!document.querySelector('[data-specialization]').disabled);
  await page.locator('[data-specialization]').first().click();
  assert(await page.evaluate(()=>rift.awakeningUnlocked));
  assert(await page.locator('[data-specialization]').nth(1).isDisabled());
  await page.evaluate(()=>rift.gainXP(rift.xpNeeded));
  await page.waitForFunction(()=>!document.querySelector('[data-skill-rank="skill"]').disabled);
  await page.click('[data-skill-rank="skill"]');assert.equal(await page.evaluate(()=>rift.skillRanks.skill),3);
  assert(await page.locator('[data-skill-rank="skill"]').isDisabled());
  await page.locator('#closeTreeBtn').focus();await page.keyboard.press('Tab');
  assert(await page.evaluate(()=>document.activeElement.closest('.skill-tree-card')!==null));
  await capturePage('rift-branches-desktop.png');await page.click('#closeTreeBtn');
  await page.evaluate(()=>{rift.player.mp=rift.player.maxMp;});await page.keyboard.press('r');
  assert(await page.evaluate(()=>rift.effects.some(e=>e.kind==='awakening')));
  await page.evaluate(()=>{rift.player.mp=rift.player.maxMp;});

  const ultimateMana=await page.evaluate(()=>({mp:rift.player.mp,cost:rift.skillCost('ultimate')}));
  await page.keyboard.press('u');assert((await page.evaluate(()=>rift.player.mp))<ultimateMana.mp-ultimateMana.cost+4);
  assert(await page.evaluate(()=>rift.effects.some(e=>e.kind==='ultimate'&&e.classId==='warrior')));
  await page.evaluate(()=>{for(const e of rift.enemies)rift.hurtEnemy(e,999);rift.step(.01);for(const e of rift.enemies)rift.hurtEnemy(e,999);rift.step(.01);});
  await page.waitForFunction(()=>!document.getElementById('upgradeChoices').hidden);assert.equal(await page.locator('[data-upgrade]').count(),3);const firstRelic=await page.locator('[data-upgrade]').first().getAttribute('data-upgrade');await page.locator('[data-upgrade]').first().click();assert((await page.evaluate(()=>rift.relics)).includes(firstRelic));
  assert.equal(await page.evaluate(()=>rift.stage),1);
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('[data-move="right"]').scrollIntoViewIfNeeded();
  const b=await page.locator('[data-move="right"]').boundingBox(),cdp=await page.context().newCDPSession(page),x=await page.evaluate(()=>rift.player.x);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+b.width/2,y:b.y+b.height/2}]});
  await page.waitForTimeout(220);await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert((await page.evaluate(()=>rift.player.x))>x+15);assert.equal(await page.evaluate(()=>riftTouches.size),0);
  await capturePage('rift-blade-mobile.png');
  for(let stage=1;stage<6;stage++){await page.evaluate(()=>{for(let wave=0;wave<2;wave++){for(const e of rift.enemies)rift.hurtEnemy(e,99999);rift.step(.01);}});if(stage<5){await page.waitForFunction(()=>!document.getElementById('upgradeChoices').hidden);assert.equal(await page.locator('[data-upgrade]').count(),3);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));if(stage===1){await capturePage('rift-relics-mobile.png');assert(await page.evaluate(()=>{const panel=document.getElementById('riftOverlay').getBoundingClientRect();return [...document.querySelectorAll('[data-upgrade]')].every(b=>b.getBoundingClientRect().bottom<=panel.bottom+1);}));}await page.locator('[data-upgrade]').first().click();assert.equal(await page.evaluate(()=>rift.stage),stage+1);assert.equal(await page.locator('#relicCollection li').count(),stage+1);}}
  await page.waitForFunction(()=>rift.state==='won'&&riftSaved);
  assert((await page.evaluate(()=>Number(localStorage.getItem('riftBladeBest'))))>0);
  await page.click('#startBtn');assert.equal(await page.evaluate(()=>rift.stage),0);assert.equal(await page.evaluate(()=>rift.score),0);
  await page.waitForFunction(()=>rift.state==='ready'&&!document.getElementById('classChoices').hidden);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const readyFits=await page.evaluate(()=>{const o=document.getElementById('riftOverlay'),b=o.getBoundingClientRect(),s=document.getElementById('startBtn').getBoundingClientRect();return s.bottom<=b.bottom+1&&s.top>=b.top;});assert(readyFits,'mobile class selection and start button must fit the overlay');
  await capturePage('rift-blade-mobile-ready.png');await page.click('#startBtn');
  await page.evaluate(()=>{rift.player.hp=1;rift.hitPlayer(20);});
  await page.waitForFunction(()=>document.getElementById('overlayTitle').textContent.includes('의지'));
  await page.click('#startBtn');assert(await page.evaluate(()=>rift.player.hp===rift.player.maxHp));
  // Select each class through the actual UI and capture raw, frozen canvas pixels.
  await page.setViewportSize({width:1440,height:1080});let shareCanvas;
  for(const [classIndex,classId] of ['warrior','mage','brawler','archer','assassin','paladin'].entries()){
   const stage=classIndex;
   await page.evaluate(()=>{rift=new RiftGame();riftSaved=false;riftClearInput();});
   await page.waitForFunction(()=>!document.getElementById('classChoices').hidden);
   await page.click(`[data-class="${classId}"]`);
   assert.equal(await page.evaluate(()=>rift.classId),classId);
   await page.waitForFunction(id=>document.querySelector(`[data-class="${id}"]`).getAttribute('aria-pressed')==='true',classId);
   assert.equal(await page.locator(`[data-class="${classId}"]`).getAttribute('aria-pressed'),'true');
   await page.click('#startBtn');
   assert(await page.locator('[data-action="special"]').isDisabled());
   await page.evaluate(()=>rift.gainXP(rift.xpNeeded));
   await page.waitForFunction(()=>!document.querySelector('[data-action="special"]').disabled);
   await page.keyboard.press('e');
   assert(await page.evaluate(()=>rift.effects.some(e=>e.kind==='special'&&e.classId===rift.classId)));
   assert((await page.evaluate(()=>rift.player.cd.special))>0);
   await page.evaluate(()=>{rift.player.mp=rift.player.maxMp;});
   const classSkill=await page.evaluate(()=>({name:RIFT_CLASSES[rift.classId].skills.skill.name,mp:rift.player.mp,cost:rift.skillCost('skill')}));
   assert.equal(await page.locator('#skillName').textContent(),classSkill.name);
   await page.keyboard.press('k');
   assert((await page.evaluate(()=>rift.player.mp))<classSkill.mp-classSkill.cost+4);
   await page.evaluate(()=>{rift.gainXP(450);});await page.click('#treeBtn');
   await page.waitForFunction(()=>rift.state==='talents');
   await page.locator('[data-specialization]').nth(classIndex%2).click();
   const chosen=await page.evaluate(()=>rift.specializationId);assert(chosen);
   await page.locator('[data-skill-rank="awakening"]').click();assert.equal(await page.evaluate(()=>rift.skillRanks.awakening),1);
   await page.click('#closeTreeBtn');
   await page.evaluate(stage=>{rift.stage=stage;rift.wave=1;rift.spawn();rift.effects=[];rift.time=1.2;rift.player.x=410;rift.player.y=365;rift.player.face=1;rift.player.mp=rift.player.maxMp;rift.player.cd.awakening=0;rift.action('awakening');rift.step(.04);rift.pause();},stage);
   await page.waitForTimeout(70);
   assert(await page.evaluate(()=>rift.effects.some(e=>e.kind==='awakening'&&e.classId===rift.classId)));
   const raw=await page.evaluate(()=>riftCanvas.toDataURL());
   await page.waitForTimeout(120);assert.equal(await page.evaluate(()=>riftCanvas.toDataURL()),raw);
   const pixels=Buffer.from(raw.split(',')[1],'base64');
   fs.writeFileSync(path.join(results,`rift-graphics-${classId}.png`),pixels);
   fs.writeFileSync(path.join(results,`rift-dungeon-${stage+1}.png`),pixels);
   if(classId==='warrior')shareCanvas=pixels;
  }
  // Trigger each real boss AI pattern, then render the warning and active attack.
  for(let stage=0;stage<6;stage++){
   await page.evaluate(stage=>{rift=new RiftGame();rift.stage=stage;rift.wave=1;rift.start();const boss=rift.enemies.find(e=>e.type==='boss');rift.enemies=[boss];boss.x=650;boss.y=365;boss.cd=0;rift.player.x=550;rift.player.y=365;rift.player.inv=99;rift.step(.01);rift.pause();},stage);
   await page.waitForTimeout(60);
   assert(await page.evaluate(()=>rift.hazards.length>0&&rift.hazards.every(h=>h.wind>=.75)));
   const warning=await page.evaluate(()=>riftCanvas.toDataURL());
   fs.writeFileSync(path.join(results,`rift-boss-warning-${stage+1}.png`),Buffer.from(warning.split(',')[1],'base64'));
   await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>riftCanvas.toDataURL()),warning);
   await page.evaluate(()=>{rift.pause();for(let i=0;i<26;i++)rift.step(.04);rift.pause();});await page.waitForTimeout(60);
   assert(await page.evaluate(()=>rift.hazards.some(h=>h.wind===0&&h.triggered)));
   const active=await page.evaluate(()=>riftCanvas.toDataURL());assert.notEqual(active,warning);
   fs.writeFileSync(path.join(results,`rift-boss-active-${stage+1}.png`),Buffer.from(active.split(',')[1],'base64'));
   await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>riftCanvas.toDataURL()),active);
  }
  assert.deepEqual(errors,[]);
  if(process.env.UPDATE_SHARE_IMAGES==='1'){
   const cover=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
   await cover.setContent('<html><style>body{margin:0;background:#121c29;color:#eee4ce;font-family:system-ui;display:flex;align-items:center;gap:30px;padding:55px;height:520px}h1{font-size:64px;margin:22px 0}p{font-size:24px;color:#a9becb;line-height:1.6}small{color:#d6b079;letter-spacing:4px}img{width:650px;border:1px solid #526371;border-radius:12px}</style><div><small>PARTYGAME ORIGINAL</small><h1>균열의 검</h1><p>여섯 영웅,<br>나만의 성장.</p><small>ACTION RPG</small></div><img src="data:image/png;base64,'+shareCanvas.toString('base64')+'"></html>');
   await cover.locator('img').evaluate(i=>i.decode());fs.mkdirSync(path.join(root,'assets/games/rift-blade'),{recursive:true});
   await cover.screenshot({path:path.join(root,'assets/games/rift-blade/share.png')});
  }
  console.log('PASS: six regions/12 waves, six boss warning/active visuals and freeze, random relic choice/mobile fit/collection, six classes, specializations/ranks/awakening, modal focus, progression, mobile touch/layout, full campaign, records, defeat/restart and no runtime errors');
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
