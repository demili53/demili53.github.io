'use strict';
// A bounded, session-only account of observed combat outcomes, never saved as game state.
var RiftCombatLog=class RiftCombatLog{
 constructor(){this.game=null;this.previous=null;this.entries=[];this.version=0;}
 add(kind,text,time,amount=0){const last=this.entries[0];if(amount&&last?.kind===kind&&time-last.time<1){last.amount+=amount;last.time=time;last.text=(kind==='dealt'?'가한 피해 ':'받은 피해 ')+Math.round(last.amount);this.version++;return;}this.entries.unshift({kind,text,time,amount});this.entries.length=Math.min(24,this.entries.length);this.version++;}
 update(game){const s=game.stats,p=game.player,next={time:game.time,state:game.state,stage:game.stage,wave:game.wave,level:p.level,kills:game.kills,damageDealt:s.damageDealt,damageTaken:s.damageTaken,parries:s.parries||0,counters:s.counters||0,focusUses:s.focusUses||0,breaks:s.breaks,perfectDodges:s.perfectDodges,trainingClock:game.trainingTime||0,mode:game.trainingMode||'campaign'};if(this.game!==game||!this.previous||next.time<this.previous.time||next.mode!==this.previous.mode||next.trainingClock<this.previous.trainingClock||['damageDealt','damageTaken','parries','counters','focusUses','perfectDodges'].some(key=>next[key]<this.previous[key])){this.game=game;this.entries=[];this.version++;this.previous=next;return;}const before=this.previous;this.previous=next;const time=game.time;
  for(const [field,kind,label]of [['damageDealt','dealt','가한 피해 '],['damageTaken','taken','받은 피해 ']]){const diff=next[field]-before[field];if(diff>0)this.add(kind,label+Math.round(diff),time,diff);}
  for(const [field,kind,label]of [['parries','parry','정밀 방어 · 반격 준비'],['counters','counter','반격 명중'],['focusUses','focus','전투 집중 발동'],['breaks','break','보스 무력화'],['perfectDodges','dodge','정밀 회피']])if(next[field]>before[field])this.add(kind,label+(next[field]-before[field]>1?' ×'+(next[field]-before[field]):''),time);
  if(next.kills>before.kills)this.add('kill',`적 ${next.kills-before.kills}명 처치`,time);
  if(next.level>before.level)this.add('level',`레벨 ${next.level} 달성`,time);
  if(next.stage!==before.stage||next.wave!==before.wave)this.add('stage',`지역 ${next.stage+1} · ${next.wave===0?'선봉대':'수문장'} 전투`,time);
  if(next.state!==before.state&&['won','lost','upgrade'].includes(next.state))this.add('result',({won:'균열 봉인 성공',lost:'원정 종료',upgrade:'지역 돌파 · 보급소 도착'})[next.state],time);
 }
};
if(typeof module!=='undefined'&&module.exports)module.exports={RiftCombatLog};
