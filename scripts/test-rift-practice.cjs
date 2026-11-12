'use strict';
const assert=require('node:assert/strict'),{RiftPractice}=require('./rift-practice'),{RiftGame,RIFT_CLASSES,RIFT_SPECIALIZATIONS}=require('./rift-core');
const advance=(game,seconds,input={})=>{for(let n=0;n<Math.ceil(seconds/.04);n++)game.step(.04,input);};
for(const classId of Object.keys(RIFT_CLASSES))for(const specialization of RIFT_SPECIALIZATIONS[classId]){
 const game=new RiftPractice(classId,specialization.id),p=game.player;
 assert(game instanceof RiftGame);assert.equal(game.practice,true);assert.equal(game.state,'playing');assert.equal(game.specializationId,specialization.id);assert(p.level>=6);assert.equal(game.skillPoints,20);assert.equal(game.pendingLevelRewards,0);
 assert.throws(()=>{game.practice=false;},TypeError);assert.equal(game.target.id,900);assert.equal(game.target.maxHp,5000);
 for(const skill of ['attack','skill','burst','special','ultimate','awakening']){
  p.x=600;p.y=350;p.face=1;p.mp=p.maxMp;p.cd[skill]=0;const cost=game.skillCost(skill),before=p.mp;
  assert(game.action(skill),classId+'/'+specialization.id+'/'+skill);assert.equal(p.mp,before-cost);assert(p.cd[skill]>0);assert(!game.action(skill));
  game.step(.04);assert.equal(p.mp,p.maxMp);assert.equal(p.hp,p.maxHp);
 }
 assert(game.trainingDamage>0);assert.equal(game.trainingDamage,game.stats.damageDealt);assert(game.trainingHits>0);assert(game.trainingDps>0);
 const xp=p.xp,level=p.level;game.gainXP(1000);assert.equal(p.xp,xp);assert.equal(p.level,level);
 p.x=648;p.y=350;p.inv=0;const hp=p.hp;assert.equal(game.hitPlayer(99999),0);assert.equal(p.hp,hp);
 advance(game,3);assert.equal(game.target.x,650);assert.equal(game.target.y,350);assert.equal(game.target.wind,0);assert.equal(game.projectiles.length,0);assert.equal(game.hazards.length,0);
 game.hurtEnemy(game.target,99999);assert.equal(game.target.hp,5000);assert(game.trainingResets>0);assert.equal(game.score,0);assert.equal(game.kills,0);assert.equal(game.coins,0);assert.equal(game.pickups.length,0);assert.equal(game.relics.length,0);assert.equal(game.objective,null);assert.equal(game.stage,0);assert.equal(game.wave,0);assert.equal(game.state,'playing');
 game.pause();p.hp-=13;p.mp-=15;const paused=JSON.stringify(game);advance(game,1,{attack:true,right:true});assert.equal(JSON.stringify(game),paused);assert(!game.action('skill'));
 assert(game.resetTarget());assert.equal(game.trainingDamage,0);assert.equal(game.trainingHits,0);assert.equal(game.trainingDps,0);assert.equal(game.stats.damageDealt,0);assert.equal(game.combo,0);assert.equal(game.effects.length,0);assert.equal(game.state,'paused');assert.equal(p.hp,hp-13);
 game.pause();game.step(.04);assert.equal(p.hp,p.maxHp);assert.equal(p.mp,p.maxMp);assert(game.toggleTalents());const tree=JSON.stringify(game);advance(game,.5);assert.equal(JSON.stringify(game),tree);assert(game.spendPoint('power'));assert(game.learnBranch('technique'));assert(game.upgradeSkill('skill'));assert(game.toggleTalents());
 assert.equal(game.upgrade('power'),false);assert.equal(game.buy('heal'),false);assert.equal(game.rerollRelics(),false);
 const next=RIFT_SPECIALIZATIONS[classId].find(s=>s.id!==specialization.id);game.player.x=402;game.pause();assert(game.switchSpecialization(next.id));assert.equal(game.specializationId,next.id);assert.equal(game.state,'paused');assert.equal(game.player.x,402);assert.equal(game.skillPoints,20);assert.equal(game.trainingDamage,0);assert(!game.switchSpecialization('invalid'));assert(!game.switchSpecialization(next.id));
}
// The training target uses actual attack lanes and range, not unconditional damage.
const archer=new RiftPractice('archer'),warrior=new RiftPractice('warrior');for(const g of [archer,warrior]){g.player.x=400;g.player.y=350;g.action('attack');}assert(archer.trainingDamage>0);assert.equal(warrior.trainingDamage,0);
archer.resetTarget();archer.player.cd.attack=0;archer.player.y=450;archer.action('attack');assert.equal(archer.trainingDamage,0);
const long=new RiftPractice();long.player.x=600;long.player.y=350;advance(long,25,{attack:true});assert(long.trainingDamage>0);assert.equal(long.stage,0);assert.equal(long.wave,0);assert.equal(long.state,'playing');assert(long.effects.length<=100);assert.equal(long.kills,0);
// Damage-over-time keeps the same non-direct combo semantics as real combat.
const mage=new RiftPractice('mage');mage.player.x=600;mage.player.y=350;mage.action('skill');const combo=mage.combo,damage=mage.trainingDamage;advance(mage,.65);assert(mage.trainingDamage>damage);assert.equal(mage.combo,combo);assert.equal(mage.kills,0);
long.target.fracture=3;long.hurtEnemy(long.target,99999);assert.equal(long.target.hp,5000);assert.equal(long.kills,0);assert.equal(long.score,0);assert.equal(long.pickups.length,0);assert(!long.effects.some(e=>e.kind==='death'));assert.equal(long.trainingDamage,long.stats.damageDealt);
// An accidental checkpoint call must not replace the user's real expedition.
const save=require('./rift-save'),data=new Map(),storage={getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};
const campaign=new RiftGame();campaign.start();assert(save.save(campaign,storage));const original=data.get(save.key);assert.equal(save.save(long,storage),false);assert.equal(data.get(save.key),original);
console.log('PASS: six classes/twelve paths, actual costs/cooldowns/ranges, fixed harmless target, nonlethal rewards isolation, damage/DPS reset, pause/tree freeze, passive-safe specialization replacement, training investment and checkpoint rejection');
