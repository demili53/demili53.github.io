'use strict';
const path=require('node:path');
module.exports=async function testSniperTools(page,assert){
 await page.setViewportSize({width:1280,height:1000});
 await page.evaluate(()=>{sniperRestart();sniper.start();sniperSync();});

 // 35: real browser fullscreen enters and exits without replacing game state.
 assert(await page.evaluate(()=>document.fullscreenEnabled));
 const mission=await page.evaluate(()=>sniper.mission);
 await page.click('#fullscreenSniper');await page.waitForFunction(()=>document.fullscreenElement?.id==='sniperGamePanel'&&document.getElementById('fullscreenSniper').getAttribute('aria-pressed')==='true');
 assert.equal(await page.locator('#fullscreenSniper').getAttribute('aria-pressed'),'true');
 assert.equal(await page.evaluate(()=>sniper.mission),mission);
 await page.click('#fullscreenSniper');await page.waitForFunction(()=>!document.fullscreenElement&&document.getElementById('fullscreenSniper').getAttribute('aria-pressed')==='false');
 assert.equal(await page.locator('#fullscreenSniper').getAttribute('aria-pressed'),'false');
 console.log('PASS 35: real fullscreen entry/exit and mission continuity');

 // 36: actual DOM order matches the visual control order and persists.
 await page.locator('#leftHanded').check();
 assert.equal(await page.locator('.sniper-controls > button').first().getAttribute('id'),'fireBtn');
 assert.equal(await page.evaluate(()=>localStorage.getItem('shadowSniperLeftHanded')),'1');
 await page.locator('#leftHanded').uncheck();
 assert.equal(await page.locator('.sniper-controls > button').first().getAttribute('id'),'scopeBtn');
 await page.locator('#leftHanded').check();
 console.log('PASS 36: left-handed control order and saved preference');

 // 37: clue checks are manual and keyboard-operable, without affecting shots or score.
 const before=await page.evaluate(()=>({score:sniper.score,shots:sniper.totalShots}));const scoped=await page.evaluate(()=>sniper.scoped);
 await page.locator('#clueList .sniper-clue').first().focus();await page.keyboard.press('Space');
 assert.equal(await page.locator('#clueList .sniper-clue').first().getAttribute('aria-pressed'),'true');
 await page.locator('#clueList .sniper-clue').first().focus();await page.keyboard.press('Space');
 assert.equal(await page.locator('#clueList .sniper-clue').first().getAttribute('aria-pressed'),'false');assert.equal(await page.evaluate(()=>sniper.scoped),scoped);assert(await page.locator('#clueList .sniper-clue').first().evaluate(el=>el===document.activeElement));
 assert.deepEqual(await page.evaluate(()=>({score:sniper.score,shots:sniper.totalShots})),before);
 await page.locator('#clueList .sniper-clue').first().click();
 console.log('PASS 37: manual clue checklist, keyboard activation and no scoring side effects');

 // 38: only observed appearance can be pinned; filters leave pins visible.
 assert.equal(await page.locator('#pinnedNoteList li').count(),0);
 await page.evaluate(()=>{sniper.updateObservation(sniper.actors[0],1.2);sniper.updateObservation(sniper.actors[1],1.2);document.getElementById('observationNotes').open=true;sniperSync();});
 await page.locator('#observationList li button').first().focus();await page.keyboard.press('Enter');assert(await page.locator('#observationList li button').first().evaluate(el=>el===document.activeElement));
 assert.equal(await page.locator('#pinnedNoteList li').count(),1);
 const pinned=await page.locator('#pinnedNoteList').textContent();
 await page.locator('#noteSearch').fill('없는외형검색');assert.equal(await page.locator('#observationList li').count(),0);
 assert.equal(await page.locator('#pinnedNoteList').textContent(),pinned);
 await page.locator('#pinnedNoteList button').click();assert.equal(await page.locator('#pinnedNoteList li').count(),0);
 await page.locator('#noteSearch').fill('');await page.locator('#observationList li button').first().click();
 await page.evaluate(()=>{if(sniper.state==='paused')sniper.pause();sniper.fail('test retry');sniper.retry();sniperSync();});
 assert.equal(await page.locator('#pinnedNoteList li').count(),0);
 assert.equal(await page.locator('#clueList [aria-pressed="true"]').count(),0);
 assert.equal(await page.locator('#noteSearch').inputValue(),'');
 console.log('PASS 38: observed memo pins, filtering/removal and retry reset');

 // 39: modal help freezes the game; keys cannot fire or resume behind it.
 await page.click('#missionAction');await page.click('#helpSniper');
 assert(await page.locator('#controlsHelp').isVisible());assert.equal(await page.evaluate(()=>sniper.state),'paused');
 const paused=await page.evaluate(()=>({time:sniper.remaining,shots:sniper.totalShots}));
 await page.keyboard.press('f');await page.keyboard.press('p');await page.waitForTimeout(150);
 assert.deepEqual(await page.evaluate(()=>({time:sniper.remaining,shots:sniper.totalShots})),paused);
 await page.locator('#controlsHelp button').click();assert.equal(await page.evaluate(()=>sniper.state),'paused');
 assert.equal(await page.evaluate(()=>document.activeElement.id),'helpSniper');
 await page.click('#helpSniper');await page.keyboard.press('Escape');
 assert(await page.locator('#controlsHelp').isHidden());assert.equal(await page.evaluate(()=>sniper.state),'paused');
 console.log('PASS 39: modal help pauses, blocks game keys and restores focus without auto-resuming');

 // 40: a real user gesture unlocks WebAudio; volume persists but sound never autoplays on reload.
 assert.equal(await page.evaluate(()=>sniperAudio.enabled),false);
 await page.locator('#sniperSound').check();await page.waitForFunction(()=>sniperAudio.enabled&&sniperAudio.available===true);
 await page.locator('#sniperVolume').focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowRight');
 const volume=await page.evaluate(()=>sniperAudio.volume);assert(volume>0&&volume<1);
 assert.equal(Number(await page.evaluate(()=>localStorage.getItem('shadowSniperVolume')))/100,volume);
 await page.locator('#sniperSound').uncheck();assert.equal(await page.evaluate(()=>sniperAudio.enabled),false);
 await page.locator('#sniperSound').check();await page.waitForFunction(()=>sniperAudio.enabled);
 await page.reload();await page.waitForFunction(()=>sniperReady);
 assert.equal(await page.evaluate(()=>sniperAudio.enabled),false);assert.equal(await page.locator('#sniperSound').isChecked(),false);
 assert.equal(await page.evaluate(()=>sniperAudio.volume),volume);
 assert(await page.locator('#leftHanded').isChecked());assert.equal(await page.locator('.sniper-controls > button').first().getAttribute('id'),'fireBtn');
 console.log('PASS 40 browser: real audio activation, mute, volume persistence and no reload autoplay');

 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(__dirname,'../test-results/willy-tools-desktop.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(__dirname,'../test-results/willy-tools-mobile.png'),fullPage:true});
};
