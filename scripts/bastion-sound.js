/* Optional synthesized feedback. No audio resources or autoplay; at most four voices. */
class BastionSound {
 constructor(){this.context=null;this.enabled=false;this.level=.2;this.voices=new Set();this.game=null;this.lastSerial=0;this.lastSound=-Infinity;}
 async enable(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;if(!this.context)this.context=new Audio();await this.context.resume();this.enabled=this.context.state==='running';return this.enabled;}catch{this.enabled=false;return false;}}
 stop(){for(const voice of this.voices){try{voice.osc.stop();}catch{}voice.osc.disconnect();voice.gain.disconnect();}this.voices.clear();}
 disable(){this.enabled=false;this.stop();}
 update(model){
  if(this.game!==model){this.stop();this.game=model;this.lastSerial=model.nextFxId;this.lastSound=-Infinity;}
  if(!this.enabled||!['running','building'].includes(model.state)){this.stop();this.lastSerial=model.nextFxId;return;}
  const tones={muzzle:[640,320,.065,.035],cannonMuzzle:[140,60,.12,.07],laser:[860,230,.12,.045],sniperShot:[1100,180,.1,.06],lightning:[480,140,.09,.04],venomCloud:[280,140,.1,.035],gravityWell:[160,60,.14,.055],shockwave:[220,80,.15,.06],bossDeath:[330,65,.22,.08],levelup:[440,880,.18,.05]};
  let tone=null;for(const effect of model.effects)if(effect.serial>this.lastSerial&&tones[effect.kind])tone=tones[effect.kind];this.lastSerial=model.nextFxId;
  if(!tone||this.level<=0||this.voices.size>=4||this.context.currentTime-this.lastSound<.09)return;
  const [from,to,duration,gain]=tone,now=this.context.currentTime;this.lastSound=now;
  const osc=this.context.createOscillator(),amp=this.context.createGain();osc.type='triangle';osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(to,now+duration);amp.gain.setValueAtTime(.0001,now);amp.gain.exponentialRampToValueAtTime(Math.max(.0001,gain*this.level),now+.006);amp.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(amp);amp.connect(this.context.destination);
  const voice={osc,gain:amp};this.voices.add(voice);osc.onended=()=>{this.voices.delete(voice);osc.disconnect();amp.disconnect();};osc.start(now);osc.stop(now+duration+.01);
 }
}
