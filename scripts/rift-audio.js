/* Short, opt-in synthesized cues. No audio files, network calls or autoplay. */
'use strict';
class RiftAudio {
 constructor(){
  this.enabled=false;this.available=null;this._disposed=false;this._context=null;this._master=null;this._unlocking=null;
  this._voices=new Set();this._seen=new WeakSet();this._game=null;this._state='';this._wave=0;this._stage=0;this._relics=0;
  this._lastCue=new Map();this._lastSound=-Infinity;this._maxVoices=12;
 }
 setEnabled(value){
  if(this._disposed)return false;
  this.enabled=Boolean(value);
  // Enabling during an existing effect must not play a stale impact or spell.
  this._prime(this._game);
  if(!this.enabled)this._stopVoices();
  return this.enabled;
 }
 async unlock(){
  if(this._disposed||this.available===false)return false;
  if(this._unlocking)return this._unlocking;
  this._unlocking=(async()=>{
   try{
    if(!this._context){
     const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
     if(typeof Audio!=='function'){this.available=false;return false;}
     this._context=new Audio();this._master=this._context.createGain();this._master.gain.value=.3;this._master.connect(this._context.destination);
    }
    if(this._context.state==='suspended')await this._context.resume();
    if(this._disposed)return false;
    this.available=this._context.state==='running';
    this._prime(this._game);
    return this.available;
   }catch{
    this.available=false;this._stopVoices();
    try{this._master?.disconnect();}catch{}
    try{const closed=this._context?.close();closed?.catch?.(()=>{});}catch{}
    this._master=null;this._context=null;return false;
   }
  })();
  try{return await this._unlocking;}finally{this._unlocking=null;}
 }
 _prime(game){
  if(!game)return;
  for(const effect of game.effects||[])if(effect&&typeof effect==='object')this._seen.add(effect);
  this._state=game.state;this._stage=game.stage;this._wave=game.wave;this._relics=game.relics?.length||0;
 }
 sync(game){
  if(this._disposed||!game||typeof game!=='object')return;
  if(game!==this._game){this._stopVoices();this._game=game;this._seen=new WeakSet();this._lastCue.clear();this._lastSound=-Infinity;this._prime(game);return;}
  const playing=game.state==='playing',events=[];
  if(playing){
   if(this._state==='upgrade'||(game.relics?.length||0)>this._relics)events.push('relic');
   if(game.stage===this._stage&&game.wave===1&&this._wave!==1)events.push('boss');
  }
  for(const effect of game.effects||[]){
   if(!effect||typeof effect!=='object'||this._seen.has(effect))continue;
   this._seen.add(effect);
   if(!playing)continue;
   const kind=effect.kind,text=String(effect.text||'');
   if(kind==='levelup')events.push('levelup');
   else if(kind==='text'&&/^[−-]\s*\d/.test(text))events.push('hurt');
   else if(kind==='text'&&/PHASE|페이즈/i.test(text))events.push('boss');
   else if(['attack','skill','burst','special','ultimate','awakening','hit'].includes(kind))events.push(kind);
  }
  this._prime(game);
  if(!playing){this._stopVoices();return;}
  if(!this.enabled||!this._context||this._context.state!=='running')return;
  const priority={hurt:11,boss:10,relic:9,levelup:8,awakening:7,ultimate:6,burst:5,special:4,skill:3,hit:2,attack:1};
  // Multiple victims can create dozens of effects in one frame. One priority cue is sufficient.
  for(const cue of [...new Set(events)].sort((a,b)=>priority[b]-priority[a]))if(this._play(cue))break;
 }
 _play(cue){
  const context=this._context,now=context?.currentTime;
  if(!Number.isFinite(now)||now-this._lastSound<.035)return false;
  const interval={attack:.1,hit:.075,skill:.16,burst:.25,special:.25,ultimate:.4,awakening:.5,hurt:.22,levelup:.65,boss:1.5,relic:.8}[cue]||.15;
  if(now-(this._lastCue.get(cue)??-Infinity)<interval)return false;
  const sounds={
   attack:[['triangle',380,125,.085,0,.07]],
   hit:[['triangle',175,58,.1,0,.09],['sine',640,260,.045,0,.035]],
   hurt:[['triangle',170,65,.16,0,.09],['sine',93,50,.19,.02,.06]],
   skill:[['triangle',280,820,.14,0,.055],['sine',550,1100,.15,.04,.035]],
   burst:[['sine',110,65,.23,0,.075],['triangle',440,880,.17,.015,.045]],
   special:[['sine',330,440,.13,0,.055],['triangle',660,880,.15,.065,.035]],
   ultimate:[['sine',82,55,.3,0,.08],['triangle',330,660,.2,.02,.045],['sine',990,1320,.18,.1,.025]],
   awakening:[['sine',110,55,.35,0,.07],['triangle',440,880,.23,.02,.04],['sine',660,990,.22,.07,.04],['sine',1320,1760,.2,.14,.025]],
   levelup:[['sine',523.25,523.25,.15,0,.065],['sine',659.25,659.25,.16,.075,.06],['sine',783.99,783.99,.22,.15,.055]],
   boss:[['triangle',110,82.4,.26,0,.065],['sine',164.8,110,.28,.09,.045]],
   relic:[['sine',659.25,659.25,.17,0,.055],['sine',783.99,783.99,.18,.08,.05],['sine',1046.5,1046.5,.24,.16,.045]]
  }[cue];
  if(!sounds||this._voices.size+sounds.length>this._maxVoices)return false;
  this._lastSound=now;this._lastCue.set(cue,now);
  for(const note of sounds)this._tone(now,...note);
  return true;
 }
 _tone(now,type,frequency,endFrequency,duration,delay,volume){
  let oscillator,gain,voice;
  try{
   const context=this._context,start=now+delay,end=start+duration;
   oscillator=context.createOscillator();gain=context.createGain();
   oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);oscillator.frequency.exponentialRampToValueAtTime(endFrequency,end);
   gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(volume,start+.009);gain.gain.exponentialRampToValueAtTime(.0001,end);
   oscillator.connect(gain);gain.connect(this._master);
   voice={oscillator,gain};this._voices.add(voice);
   oscillator.onended=()=>this._release(voice);
   oscillator.start(start);oscillator.stop(end+.015);
  }catch{
   if(voice)this._release(voice);
   else{try{oscillator?.disconnect();}catch{}try{gain?.disconnect();}catch{}}
  }
 }
 _release(voice){
  if(!voice)return;this._voices.delete(voice);voice.oscillator.onended=null;
  try{voice.oscillator.disconnect();}catch{}try{voice.gain.disconnect();}catch{}
 }
 _stopVoices(){for(const voice of [...this._voices]){try{voice.oscillator.stop();}catch{}this._release(voice);}}
 dispose(){
  if(this._disposed)return;
  this._disposed=true;this.enabled=false;this._stopVoices();this._seen=new WeakSet();this._game=null;this._lastCue.clear();
  try{this._master?.disconnect();}catch{}
  try{const closed=this._context?.close();closed?.catch?.(()=>{});}catch{}
  this._master=null;this._context=null;
 }
}
if(typeof module!=='undefined')module.exports={RiftAudio};
