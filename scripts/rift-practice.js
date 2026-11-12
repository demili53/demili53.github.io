/* Isolated, non-persistent class laboratory. Uses the real skills and their cooldowns. */
'use strict';
const RiftPracticeCore=typeof module!=='undefined'&&module.exports?require('./rift-core.js'):{RiftGame,RIFT_CLASSES,RIFT_SPECIALIZATIONS};
class RiftPractice extends RiftPracticeCore.RiftGame {
 constructor(classId='warrior',specializationId=null){
  super(classId,()=>.5,{difficulty:'normal'});
  Object.defineProperty(this,'practice',{value:true,enumerable:true,writable:false,configurable:false});
  // Bootstrap through the ordinary level/stat rules, then supply a fixed training budget.
  super.gainXP(850);this.skillPoints=20;this.pendingLevelRewards=0;
  const paths=RiftPracticeCore.RIFT_SPECIALIZATIONS[this.classId],path=paths.find(s=>s.id===specializationId)||paths[0];
  this.state='talents';if(path)super.chooseSpecialization(path.id);
  this.state='playing';this.effects=[];this.trainingDamage=0;this.trainingHits=0;this.trainingTime=0;this.trainingResets=0;
  this.player.hp=this.player.maxHp;this.player.mp=this.player.maxMp;this.player.potions=5;this.spawn();
 }
 get target(){return this.enemies.find(e=>e.id===900)||null;}
 get trainingDps(){return this.trainingDamage/Math.max(1,this.trainingTime);}
 spawn(){
  this.stage=0;this.wave=0;this.objective=null;this.projectiles=[];this.hazards=[];this.pickups=[];this.containers=[];
  this.enemies=[{id:900,x:650,y:350,hp:5000,maxHp:5000,type:'guard',elite:null,face:-1,cd:1e6,wind:0,stun:1e6,flash:0,slow:0,fracture:0,burn:0,burnTick:0,burnDamage:0,stagger:0,broken:0,breakGuard:0,attackX:650,attackY:350,patternHazards:false}];
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
 hitPlayer(){return 0;}
 hurtEnemy(enemy,damage,knock=0,options={}){
  if(this.state!=='playing'||enemy!==this.target||!Number.isFinite(damage)||damage<=0||damage>Number.MAX_SAFE_INTEGER)return 0;
  const remaining=enemy.hp;
  // Keep the real hit code, including combo, numbers, impact effects and passives.
  // A temporary reservoir prevents its kill/loot branch from executing on the dummy.
  enemy.hp=Number.MAX_VALUE;
  const dealt=super.hurtEnemy(enemy,damage,0,options);
  enemy.hp=remaining-dealt;
  if(enemy.hp<=0){enemy.hp=enemy.maxHp;this.trainingResets++;}
  enemy.x=650;enemy.y=350;enemy.stun=1e6;enemy.wind=0;enemy.cd=1e6;
  this.trainingDamage+=dealt;this.trainingHits++;
  return dealt;
 }
 step(dt,input={}){
  if(this.state!=='playing')return;
  if(!this.target)this.spawn();
  const target=this.target;target.x=650;target.y=350;target.hp=Math.max(1,target.hp);target.stun=1e6;target.wind=0;target.cd=1e6;
  this.projectiles=[];this.hazards=[];this.pickups=[];
  this.player.hp=this.player.maxHp;this.player.mp=this.player.maxMp;
  const before=this.time;super.step(dt,input);
  if(this.trainingHits>0)this.trainingTime+=this.time-before;
  target.x=650;target.y=350;target.stun=1e6;target.wind=0;target.cd=1e6;
  this.player.hp=this.player.maxHp;this.player.mp=this.player.maxMp;
  this.score=0;this.kills=0;this.coins=0;this.projectiles=[];this.hazards=[];this.pickups=[];this.objective=null;
 }
 resetTarget(){
  if(!['playing','paused','talents'].includes(this.state))return false;
  this.spawn();this.effects=[];this.combo=0;this.comboTime=0;this.trainingDamage=0;this.trainingHits=0;this.trainingTime=0;this.trainingResets=0;
  this.stats.damageDealt=0;this.stats.maxCombo=0;
  return true;
 }
 switchSpecialization(id){
  if(!['playing','paused','talents'].includes(this.state)||id===this.specializationId||!RiftPracticeCore.RIFT_SPECIALIZATIONS[this.classId].some(s=>s.id===id))return false;
  const state=this.state,{x,y,face}=this.player,fresh=new RiftPractice(this.classId,id);
  // Start each comparison from the same baseline: no stacked specialization bonuses.
  for(const key of Object.keys(fresh))if(key!=='practice')this[key]=fresh[key];
  this.state=state;Object.assign(this.player,{x,y,face});return true;
 }
}
if(typeof module!=='undefined'&&module.exports)module.exports={RiftPractice};
