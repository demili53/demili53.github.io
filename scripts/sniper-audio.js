/* Optional synthesized mission cues: no assets, autoplay or target-identification hints. */
'use strict';
class SniperAudio {
 constructor(){
  this.enabled=false;this.volume=.3;this.available=null;this._disposed=false;
  this._context=null;this._master=null;this._unlocking=null;this._voices=new Set();
  this._game=null;this._previous=null;this._lastCue=new Map();this._lastSound=-Infinity;
 }
 async setEnabled(value){
  if(this._disposed)return false;
  this.enabled=Boolean(value);this._prime(this._game);
  if(!this.enabled){this._stop();return false;}
  // Call from an explicit checkbox/button gesture; updates never create an AudioContext.
  if(this._unlocking)return this._unlocking;
  this._unlocking=(async()=>{
   try{
    if(!this._context){
     const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
     if(typeof Audio!=='function'){this.available=false;this.enabled=false;return false;}
     this._context=new Audio();this._master=this._context.createGain();
     this._master.gain.value=this.volume;this._master.connect(this._context.destination);
    }
    if(this._context.state==='suspended')await this._context.resume();
    if(this._disposed||!this.enabled)return false;
    this.available=this._context.state==='running';this._prime(this._game);
    if(!this.available)this.enabled=false;
    return this.available;
   }catch{
    this.available=false;this.enabled=false;this._stop();
    try{this._master?.disconnect();}catch{}
    try{this._context?.close()?.catch?.(()=>{});}catch{}
    this._master=null;this._context=null;return false;
   }
  })();
  try{return await this._unlocking;}finally{this._unlocking=null;}
 }
 setVolume(value){
  if(!Number.isFinite(value))return this.volume;
  this.volume=Math.max(0,Math.min(1,value));
  if(this._master)this._master.gain.value=this.volume;
  if(this.volume===0)this._stop();
  return this.volume;
 }
 _prime(game){
  if(game)this._previous={state:game.state,mission:game.mission,shot:game.shot,impact:game.impact,reload:game.reloadLeft,mag:game.mag};
 }
 update(game){
  if(this._disposed||!game||typeof game!=='object')return;
  if(this._game!==game){this._stop();this._game=game;this._lastCue.clear();this._lastSound=-Infinity;this._prime(game);return;}
  const old=this._previous,events=[];
  if(old?.mission===game.mission){
   if(game.state==='shot'&&game.shot&&game.shot!==old.shot)events.push('shot');
   if(['shot','running'].includes(game.state)&&game.impact&&game.impact!==old.impact)events.push('impact');
   if(game.state==='running'&&old.reload>0&&game.reloadLeft===0&&game.mag>old.mag)events.push('reload');
   if(game.state!==old.state&&['success','won','failed'].includes(game.state))events.push(game.state==='failed'?'failure':'success');
  }
  this._prime(game);
  if(game.state==='paused'||globalThis.document?.hidden){this._stop();return;}
  if(!this.enabled||this.volume===0||this._context?.state!=='running')return;
  const priority={success:5,failure:4,reload:3,impact:2,shot:1};
  for(const cue of events.sort((a,b)=>priority[b]-priority[a]))if(this._play(cue))break;
 }
 _play(cue){
  const now=this._context?.currentTime;
  if(!Number.isFinite(now)||now-this._lastSound<.035||now-(this._lastCue.get(cue)??-Infinity)<.12)return false;
  const tones={
   shot:[['triangle',150,55,.12,0,.09],['sine',70,40,.18,0,.07]],
   impact:[['triangle',220,90,.09,0,.07]],
   reload:[['sine',440,440,.08,0,.055],['sine',660,660,.1,.09,.055]],
   success:[['sine',523,523,.13,0,.06],['sine',659,659,.13,.09,.055],['sine',784,784,.2,.18,.05]],
   failure:[['triangle',220,165,.16,0,.055],['sine',165,110,.21,.1,.05]]
  }[cue];
  if(!tones||this._voices.size+tones.length>6)return false;
  this._lastSound=now;this._lastCue.set(cue,now);
  for(const tone of tones)this._tone(now,...tone);
  return true;
 }
 _tone(now,type,frequency,endFrequency,duration,delay,volume){
  let oscillator,gain,voice;
  try{
   const start=now+delay,end=start+duration;
   oscillator=this._context.createOscillator();gain=this._context.createGain();
   oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);
   oscillator.frequency.exponentialRampToValueAtTime(endFrequency,end);
   gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.008);
   gain.gain.exponentialRampToValueAtTime(.0001,end);oscillator.connect(gain);gain.connect(this._master);
   voice={oscillator,gain};this._voices.add(voice);oscillator.onended=()=>this._release(voice);
   oscillator.start(start);oscillator.stop(end+.015);
  }catch{
   if(voice)this._release(voice);
   else{try{oscillator?.disconnect();}catch{}try{gain?.disconnect();}catch{}}
  }
 }
 _release(voice){
  this._voices.delete(voice);voice.oscillator.onended=null;
  try{voice.oscillator.disconnect();}catch{}try{voice.gain.disconnect();}catch{}
 }
 _stop(){for(const voice of [...this._voices]){try{voice.oscillator.stop();}catch{}this._release(voice);}}
 dispose(){
  if(this._disposed)return;this._disposed=true;this.enabled=false;this._stop();
  this._game=null;this._previous=null;this._lastCue.clear();
  try{this._master?.disconnect();}catch{}
  try{this._context?.close()?.catch?.(()=>{});}catch{}
  this._master=null;this._context=null;
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports={SniperAudio};
