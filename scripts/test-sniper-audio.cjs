'use strict';
const assert=require('node:assert/strict'),{SniperAudio}=require('./sniper-audio.js');
class Param{setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
class Node{constructor(){this.gain=new Param();this.frequency=new Param();}connect(){}disconnect(){this.disconnected=true;}start(at){this.started=at;}stop(at){this.stopped=at;if(at===undefined)this.onended?.();}}
class Context{
 static count=0;
 constructor(){Context.count++;this.currentTime=0;this.state='suspended';this.destination={};this.oscillators=[];}
 createGain(){return new Node();}createOscillator(){const n=new Node();this.oscillators.push(n);return n;}
 async resume(){this.state='running';}async close(){this.state='closed';}
 advance(t){this.currentTime+=t;for(const n of this.oscillators)if(n.onended&&n.stopped<=this.currentTime)n.onended();}
}
const game=()=>({state:'running',mission:0,shot:null,impact:null,reloadLeft:0,mag:3});
(async()=>{
 const previous=globalThis.AudioContext,document=globalThis.document;
 globalThis.AudioContext=Context;globalThis.document={hidden:false};
 try{
  const a=new SniperAudio(),g=game();a.update(g);g.state='shot';g.shot={};a.update(g);assert.equal(Context.count,0);
  assert.equal(await a.setEnabled(true),true);const c=a._context;a.update(g);assert.equal(c.oscillators.length,0,'enabling cannot replay an old shot');
  g.shot={};a.update(g);assert.equal(c.oscillators.length,2);a.update(g);assert.equal(c.oscillators.length,2,'one shot cue per identity');
  for(let i=0;i<100;i++){g.shot={};a.update(g);}assert.equal(c.oscillators.length,2,'rapid shots throttle');
  c.advance(.3);g.impact={};a.update(g);assert.equal(c.oscillators.length,3);a.update(g);assert.equal(c.oscillators.length,3);
  g.state='paused';a.update(g);assert.equal(a._voices.size,0);c.advance(.3);g.state='shot';a.update(g);assert.equal(c.oscillators.length,3,'resume cannot replay an impact');
  g.state='success';g.shot=null;a.update(g);assert.equal(c.oscillators.length,6);a.update(g);assert.equal(c.oscillators.length,6);
  c.advance(.5);g.state='running';g.reloadLeft=1;g.mag=1;a.update(g);g.reloadLeft=0;g.mag=3;a.update(g);assert.equal(c.oscillators.length,8);
  c.advance(.5);g.state='failed';a.update(g);assert.equal(c.oscillators.length,10);
  await a.setEnabled(false);assert.equal(a._voices.size,0);g.state='shot';g.shot={};a.update(g);await a.setEnabled(true);a.update(g);assert.equal(c.oscillators.length,10,'muted cues stay consumed');
  globalThis.document.hidden=true;g.shot={};a.update(g);assert.equal(c.oscillators.length,10);globalThis.document.hidden=false;a.update(g);assert.equal(c.oscillators.length,10,'hidden events do not replay');
  a.setVolume(0);g.shot={};a.update(g);assert.equal(c.oscillators.length,10);a.setVolume(.6);assert.equal(a._master.gain.value,.6);a.update(g);assert.equal(c.oscillators.length,10);assert.equal(a.setVolume(NaN),.6);assert.equal(a.setVolume(2),1);
  const next=game();a.update(next);next.state='shot';next.shot={};c.advance(.5);a.update(next);assert.equal(c.oscillators.length,12);
  for(let i=0;i<100;i++){c.advance(.04);next.shot={};a.update(next);assert(a._voices.size<=6);}
  c.advance(1);assert.equal(a._voices.size,0);assert(c.oscillators.every(n=>n.disconnected));a.dispose();a.dispose();assert.equal(c.state,'closed');assert.equal(await a.setEnabled(true),false);
  globalThis.AudioContext=undefined;const noAPI=new SniperAudio();assert.equal(await noAPI.setEnabled(true),false);noAPI.update(game());noAPI.dispose();
  globalThis.AudioContext=class{constructor(){throw Error('blocked');}};const blocked=new SniperAudio();assert.equal(await blocked.setEnabled(true),false);assert.equal(blocked.enabled,false);blocked.dispose();
  console.log('PASS 40: opt-in audio, shot/impact/reload/result cues, deduplication, mute/hidden/pause, volume, bounded voices and unavailable API');
 }finally{if(previous===undefined)delete globalThis.AudioContext;else globalThis.AudioContext=previous;if(document===undefined)delete globalThis.document;else globalThis.document=document;}
})().catch(e=>{console.error(e);process.exitCode=1;});
