/* Isolated, non-persistent class laboratory. Uses the real skills and their cooldowns. */
'use strict';
const RiftPracticeCore=typeof module!=='undefined'&&module.exports?require('./rift-core.js'):{RiftGame,RIFT_CLASSES,RIFT_SPECIALIZATIONS};
const RIFT_PRACTICE_MODES=Object.freeze({
 dummy:Object.freeze({name:'고정 표적',desc:'공격하지 않는 표적에게 기술과 연속 공격을 시험하세요.'}),
 pressure:Object.freeze({name:'가드 훈련',desc:'표적 가까이 다가가 0.95초 공격 예고를 보고 Q 가드와 반격을 연습하세요.'}),
 survival:Object.freeze({name:'탄막 회피',desc:'조준 예고 후 날아오는 단발 화살을 이동·대시·Q 가드로 피하세요.'})
});
class RiftPractice extends RiftPracticeCore.RiftGame {
 constructor(classId='warrior',specializationId=null){
  super(classId,()=>.5,{difficulty:'normal'});
  Object.defineProperty(this,'practice',{value:true,enumerable:true,writable:false,configurable:false});
  // Bootstrap through the ordinary level/stat rules, then supply a fixed training budget.
  super.gainXP(850);this.skillPoints=20;this.pendingLevelRewards=0;
  const paths=RiftPracticeCore.RIFT_SPECIALIZATIONS[this.classId],path=paths.find(s=>s.id===specializationId)||paths[0];
  this.state='talents';if(path)super.chooseSpecialization(path.id);
  this.state='playing';this.effects=[];this.trainingMode='dummy';this.trainingDamage=0;this.trainingHits=0;this.trainingTime=0;this.trainingResets=0;this.trainingParries=0;this.trainingDamageTaken=0;
  this.player.hp=this.player.maxHp;this.player.mp=this.player.maxMp;this.player.potions=5;this.spawn();
 }
 get target(){return this.enemies.find(e=>e.id===900)||null;}
 get trainingDps(){return this.trainingDamage/Math.max(1,this.trainingTime);}
 get trainingModeInfo(){return RIFT_PRACTICE_MODES[this.trainingMode];}
 setMode(mode){
  if(!['playing','paused'].includes(this.state)||!Object.hasOwn(RIFT_PRACTICE_MODES,mode)||mode===this.trainingMode)return false;
  this.trainingMode=mode;return this.resetTarget();
 }
 spawn(){
  this.stage=0;this.wave=0;this.objective=null;this.projectiles=[];this.hazards=[];this.pickups=[];this.containers=[];this.trainingCooldown=1.2;
  this.enemies=[{id:900,x:650,y:350,hp:5000,maxHp:5000,type:this.trainingMode==='survival'?'ranger':'guard',elite:null,face:-1,cd:1e6,wind:0,stun:1e6,flash:0,slow:0,fracture:0,burn:0,burnTick:0,burnDamage:0,stagger:0,broken:0,breakGuard:0,healCast:0,healTargetId:null,attackX:650,attackY:350,patternHazards:false}];
 }
 startObjective(){this.objective=null;}
 updateObjective(){return false;}
 gainXP(){return false;}
 dropLoot(){}
 collectPickup(){return false;}
 offerRelics(){this.upgradeOptions=[];}
 upgrade(){return false;}
 buy(){return false;}
 rerollRelics(){return false;}
 hitPlayer(damage,sourceId=null){
  if(this.state!=='playing'||this.trainingMode==='dummy')return 0;
  const before=this.stats.parries||0,dealt=super.hitPlayer(damage,sourceId);
  this.trainingParries+=(this.stats.parries||0)-before;this.trainingDamageTaken+=dealt;
  // Preserve real guard, dodge and damage feedback while making training nonfatal.
  if(this.state==='lost')this.state='playing';
  this.player.hp=this.player.maxHp;this.score=0;
  return dealt;
 }
 updateTraining(dt){
  const target=this.target,p=this.player;if(this.trainingMode==='dummy'){target.wind=0;return;}
  target.face=p.x<target.x?-1:1;
  if(target.wind>0){
   target.wind=Math.max(0,target.wind-dt);
   if(target.wind===0&&this.trainingMode==='survival'){
    this.fireEnemyProjectile(target);this.projectiles[this.projectiles.length-1].damage=6;
   }
   return;
  }
  this.trainingCooldown=Math.max(0,this.trainingCooldown-dt);
  const nearby=Math.abs(p.x-target.x)<180&&Math.abs(p.y-target.y)<100;
  if(this.trainingCooldown>0||this.trainingMode==='pressure'&&!nearby)return;
  target.attackX=p.x;target.attackY=p.y;target.wind=this.trainingMode==='pressure'?.95:.8;
  this.trainingCooldown=this.trainingMode==='pressure'?1.6:1.8;
  if(this.trainingMode==='pressure')this.hazard(p.x,p.y,60,38,.95,'slam',8,'#d8b88a',target.id);
 }
 hurtEnemy(enemy,damage,knock=0,options={}){
  if(this.state!=='playing'||enemy!==this.target||!Number.isFinite(damage)||damage<=0||damage>Number.MAX_SAFE_INTEGER)return 0;
  const remaining=enemy.hp;
  // Keep the real hit code, including combo, numbers, impact effects and passives.
  // A temporary reservoir prevents its kill/loot branch from executing on the dummy.
  enemy.hp=Number.MAX_VALUE;
  const dealt=super.hurtEnemy(enemy,damage,0,options);
  enemy.hp=remaining-dealt;
  if(enemy.hp<=0){enemy.hp=enemy.maxHp;this.trainingResets++;}
  enemy.x=650;enemy.y=350;enemy.stun=1e6;enemy.cd=1e6;
  if(this.trainingMode==='dummy')enemy.wind=0;
  else if(options.direct!==false){this.trainingCooldown=Math.max(this.trainingCooldown,.9);this.hazards=this.hazards.filter(h=>h.sourceId!==enemy.id||h.wind<=0);}
  this.trainingDamage+=dealt;this.trainingHits++;
  return dealt;
 }
 step(dt,input={}){
  if(this.state!=='playing')return;
  if(!this.target)this.spawn();
  const target=this.target;target.x=650;target.y=350;target.hp=Math.max(1,target.hp);target.stun=1e6;target.cd=1e6;
  if(this.trainingMode!=='survival')this.projectiles=[];if(this.trainingMode!=='pressure')this.hazards=[];this.pickups=[];
  this.player.hp=this.player.maxHp;this.player.mp=this.player.maxMp;
  this.updateTraining(Math.max(0,Math.min(.04,dt)));
  const before=this.time;super.step(dt,input);
  if(this.trainingHits>0||this.trainingMode!=='dummy')this.trainingTime+=this.time-before;
  target.x=650;target.y=350;target.stun=1e6;target.cd=1e6;
  this.player.hp=this.player.maxHp;this.player.mp=this.player.maxMp;
  this.score=0;this.kills=0;this.coins=0;this.pickups=[];this.objective=null;
 }
 resetTarget(){
  if(!['playing','paused','talents'].includes(this.state))return false;
  this.spawn();this.effects=[];this.combo=0;this.comboTime=0;this.trainingDamage=0;this.trainingHits=0;this.trainingTime=0;this.trainingResets=0;this.trainingParries=0;this.trainingDamageTaken=0;
  for(const key of ['damageDealt','damageTaken','maxCombo','perfectDodges','parries','counters','focusUses'])if(Object.hasOwn(this.stats,key))this.stats[key]=0;
  return true;
 }
 switchSpecialization(id){
  if(!['playing','paused','talents'].includes(this.state)||id===this.specializationId||!RiftPracticeCore.RIFT_SPECIALIZATIONS[this.classId].some(s=>s.id===id))return false;
  const state=this.state,mode=this.trainingMode,{x,y,face}=this.player,fresh=new RiftPractice(this.classId,id);if(mode!=='dummy')fresh.setMode(mode);
  // Start each comparison from the same baseline: no stacked specialization bonuses.
  for(const key of Object.keys(fresh))if(key!=='practice')this[key]=fresh[key];
  this.state=state;Object.assign(this.player,{x,y,face});return true;
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports={RiftPractice,RIFT_PRACTICE_MODES};
