'use strict';
const assert=require('node:assert/strict');const {RiftAudio}=require('./rift-audio');
class Parameter{setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
class Node{constructor(){this.gain=new Parameter();this.frequency=new Parameter();this.onended=null;this.disconnected=false;}connect(){}disconnect(){this.disconnected=true;}start(at){this.started=at;}stop(at){this.stopped=at;if(at===undefined)this.onended?.();}}
class FakeAudioContext{
 static created=0;
 constructor(){FakeAudioContext.created++;this.currentTime=0;this.state='suspended';this.destination={};this.oscillators=[];this.gains=[];}
 createGain(){const n=new Node();this.gains.push(n);return n;}
 createOscillator(){const n=new Node();this.oscillators.push(n);return n;}
 async resume(){this.state='running';}
 async close(){this.state='closed';}
 advance(time){this.currentTime+=time;for(const n of this.oscillators)if(n.onended&&n.stopped<=this.currentTime)n.onended();}
}
const game=()=>({state:'playing',stage:0,wave:0,relics:[],effects:[]});
const append=(g,kind,text='')=>g.effects.push({kind,text});
(async()=>{
 const previous=globalThis.AudioContext;globalThis.AudioContext=FakeAudioContext;
 try{
  const audio=new RiftAudio(),g=game();assert.equal(audio.enabled,false);audio.sync(g);append(g,'attack');audio.sync(g);assert.equal(FakeAudioContext.created,0,'disabled sync must not create AudioContext');
  audio.setEnabled(true);assert.equal(FakeAudioContext.created,0,'settings must not trigger autoplay');assert.equal(await audio.unlock(),true);assert.equal(FakeAudioContext.created,1);const context=audio._context;
  audio.sync(g);assert.equal(context.oscillators.length,0,'old effects must not play after enabling/unlock');append(g,'attack');audio.sync(g);assert.equal(context.oscillators.length,1);audio.sync(g);assert.equal(context.oscillators.length,1,'same effect identity plays once');
  for(let i=0;i<150;i++){append(g,'hit');audio.sync(g);}assert.equal(context.oscillators.length,1,'burst of hit events is rate limited');
  context.advance(.2);assert.equal(audio._voices.size,0);assert(context.oscillators.every(n=>n.disconnected));append(g,'hit');audio.sync(g);assert.equal(context.oscillators.length,3);
  g.state='paused';append(g,'ultimate');audio.sync(g);assert.equal(audio._voices.size,0,'pause immediately clears active voices');context.advance(.5);g.state='playing';audio.sync(g);assert.equal(context.oscillators.length,3,'paused effects cannot replay on resume');
  g.state='talents';append(g,'levelup');audio.sync(g);context.advance(.8);g.state='playing';audio.sync(g);assert.equal(context.oscillators.length,3,'tree/menu effects are silent');
  append(g,'levelup');audio.sync(g);assert.equal(context.oscillators.length,6);context.advance(.5);append(g,'text','−24');audio.sync(g);assert.equal(context.oscillators.length,8,'unicode damage cue');
  context.advance(.3);append(g,'text','-12');audio.sync(g);assert.equal(context.oscillators.length,10,'ASCII damage cue');
  context.advance(.4);g.wave=1;audio.sync(g);assert.equal(context.oscillators.length,12,'boss-wave transition');audio.sync(g);assert.equal(context.oscillators.length,12);
  context.advance(2);append(g,'text','PHASE II');audio.sync(g);assert.equal(context.oscillators.length,14,'phase cue');
  g.state='upgrade';audio.sync(g);context.advance(.5);g.state='playing';g.stage=1;g.wave=0;g.relics.push('test-relic');audio.sync(g);assert.equal(context.oscillators.length,17,'upgrade return gives relic cue');
  context.advance(.5);audio.setEnabled(false);append(g,'awakening');audio.sync(g);audio.setEnabled(true);audio.sync(g);assert.equal(context.oscillators.length,17,'muted effects do not replay');
  const next=game();append(next,'ultimate');audio.sync(next);assert.equal(context.oscillators.length,17,'new game primes existing effects');append(next,'skill');audio.sync(next);assert.equal(context.oscillators.length,19);
  // Long-running frequent combat does not accumulate live voices or retain old effects.
  for(let i=0;i<200;i++){context.advance(.045);next.effects=[{kind:i%2?'awakening':'hit'}];audio.sync(next);assert(audio._voices.size<=12);}
  context.advance(2);assert.equal(audio._voices.size,0);assert(context.oscillators.every(n=>n.disconnected));
  append(next,'attack');audio.sync(next);assert(audio._voices.size>0);audio.dispose();audio.dispose();assert.equal(context.state,'closed');assert.equal(audio._voices.size,0);assert.equal(audio.enabled,false);assert.equal(await audio.unlock(),false);audio.sync(next);
  globalThis.AudioContext=undefined;const unavailable=new RiftAudio();unavailable.setEnabled(true);assert.equal(await unavailable.unlock(),false);unavailable.sync(game());unavailable.dispose();
  globalThis.AudioContext=class{constructor(){throw Error('audio unavailable');}};const failed=new RiftAudio();assert.equal(await failed.unlock(),false);failed.sync(game());failed.dispose();
  console.log('PASS: opt-in/lazy audio, effect identity deduplication, paused/menu/muted silence, game replacement, per-cue throttles, damage/level/boss/relic cues, bounded voices, ended cleanup, dispose and unavailable audio');
 }finally{if(previous===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=previous;}
})().catch(e=>{console.error(e);process.exitCode=1;});
