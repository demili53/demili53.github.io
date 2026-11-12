const assert=require('node:assert/strict');const {RiftGame,RIFT_CLASSES,RIFT_BRANCHES,RIFT_SPECIALIZATIONS}=require('./rift-core');
const advance=(g,n,input={})=>{for(let i=0;i<n;i++)g.step(.04,input);};
let g=new RiftGame();assert(!g.action('skill'));g.start();const p=g.player,e=g.enemies[0];e.x=p.x+55;e.y=p.y;const hp=e.hp;assert(g.action('attack'));assert(e.hp<hp);assert(!g.action('attack'));assert.equal(g.combo,1);
const far=g.enemies[1];far.x=p.x+50;far.y=p.y+100;const farHp=far.hp;g.player.cd.attack=0;g.action('attack');assert.equal(far.hp,farHp);
p.mp=0;assert(!g.action('skill'));p.mp=100;assert(g.action('skill'));assert.equal(p.mp,76);assert(!g.action('skill'));
g.pause();const frozen=JSON.stringify(g);advance(g,30,{right:true,attack:true});assert.equal(JSON.stringify(g),frozen);assert(!g.action('dash'));g.pause();
assert(g.action('dash'));const before=p.hp;g.hitPlayer(100);assert.equal(p.hp,before);advance(g,9);g.hitPlayer(10);assert.equal(p.hp,before-10);
p.hp=20;assert(g.action('potion'));assert.equal(p.hp,105);assert.equal(p.potions,2);p.potions=0;p.cd.potion=0;assert(!g.action('potion'));
g=new RiftGame();g.start();advance(g,100,{left:true,up:true});assert.equal(g.player.x,35);assert.equal(g.player.y,245);
// Exercise real damage/rewards for all six waves and all three bosses.
g=new RiftGame();g.start();for(let stage=0;stage<3;stage++){for(let wave=0;wave<2;wave++){for(const enemy of g.enemies)g.hurtEnemy(enemy,999);const once=g.score;for(const enemy of g.enemies)g.hurtEnemy(enemy,999);assert.equal(g.score,once);g.step(.01);}if(stage<2){assert.equal(g.state,'upgrade');assert(!g.action('attack'));const damage=g.player.damage;assert(g.upgrade('power'));assert.equal(g.player.damage,damage+8);assert(!g.upgrade('power'));}}
assert.equal(g.state,'won');assert(g.player.level>1);assert(g.score>4000);const won=JSON.stringify(g);advance(g,50);assert.equal(JSON.stringify(g),won);
g=new RiftGame();g.start();g.player.hp=5;g.hitPlayer(10);assert.equal(g.state,'lost');assert(!g.action('potion'));
// Telegraphs give the player time to leave the marked area; projectile collision deals damage.
g=new RiftGame();g.start();g.enemies=[{id:1,x:280,y:340,hp:100,maxHp:100,type:'guard',cd:0,wind:0,stun:0,flash:0}];g.step(.01);assert(g.enemies[0].wind>0);g.player.y=450;advance(g,15);assert.equal(g.player.hp,160);g.projectiles=[{x:g.player.x,y:g.player.y-25,vx:0,life:2}];g.step(.01);assert.equal(g.player.hp,144);assert.equal(g.projectiles.length,0);
console.log('PASS: attacks/range/lanes, mana/cooldowns, pause freeze, dodge immunity, potions, movement bounds, XP/level rewards, upgrade guards, full campaign, victory/defeat, telegraph evasion and projectiles');
// Every class has a distinct working combat profile and explicit effect metadata.
for(const id of Object.keys(RIFT_CLASSES)){
 const game=new RiftGame(id),spec=RIFT_CLASSES[id];assert.equal(game.classId,id);assert.equal(game.player.maxHp,spec.hp);assert.equal(game.player.maxMp,spec.mp);game.start();assert(!game.setClass('mage'));assert(!game.action('ultimate'));assert(!game.action('unknown'));
 const target=game.enemies[0];target.hp=target.maxHp=2000;target.x=game.player.x+spec.skills.attack.range-10;target.y=game.player.y;assert(game.action('attack'));assert(target.hp<2000);const visual=game.effects.find(e=>e.kind==='attack');assert.equal(visual.classId,id);assert.equal(visual.range,spec.skills.attack.range);
 game.gainXP(180);assert.equal(game.player.level,3);assert.equal(game.skillPoints,5);assert(game.ultimateUnlocked);game.player.mp=game.player.maxMp;target.x=game.player.x+50;const before=target.hp;assert(game.action('ultimate'));assert(target.hp<before);assert.equal(game.player.mp,game.player.maxMp-65);assert(!game.action('ultimate'));
 assert(!game.spendPoint('power'));assert(game.toggleTalents());const frozen=JSON.stringify(game);advance(game,50,{right:true,attack:true});assert.equal(JSON.stringify(game),frozen);assert(!game.action('skill'));assert(!game.canSpendPoint('mastery'));assert(game.spendPoint('power'));assert(game.spendPoint('flow'));assert(game.canSpendPoint('mastery'));assert(game.spendPoint('mastery'));assert.equal(game.skillPoints,2);assert(game.spendPoint('guard'));assert(game.spendPoint('guard'));assert.equal(game.skillPoints,0);assert(!game.spendPoint('guard'));assert(game.skillCooldown('skill')<spec.skills.skill.cooldown);assert(game.toggleTalents());
}
g=new RiftGame('mage');assert(g.setClass('brawler'));assert.equal(g.player.hp,185);assert(!g.setClass('__proto__'));assert.equal(new RiftGame('__proto__').classId,'warrior');
g.start();g.gainXP(1000);g.toggleTalents();const maxHp=g.player.maxHp;for(let i=0;i<3;i++)assert(g.spendPoint('guard'));assert.equal(g.player.maxHp,maxHp+75);const unused=g.skillPoints;assert(!g.spendPoint('guard'));assert.equal(g.skillPoints,unused);assert(!g.spendPoint('toString'));g.toggleTalents();const health=g.player.hp;g.hitPlayer(100);assert.equal(g.player.hp,health-82);
console.log('PASS: six class profiles, class switch guards, ranges, effect identity, multi-level XP/SP awards, ultimate gate/cost/cooldown, talent freeze/prerequisites/caps, resource and defense upgrades');
for(const id of Object.keys(RIFT_CLASSES)){
 const game=new RiftGame(id);game.start();assert(!game.action('special'));game.gainXP(50);assert.equal(game.player.level,2);assert.equal(game.xpNeeded,70);assert.equal(game.pendingLevelRewards,1);assert(game.specialUnlocked);
 const target=game.enemies[0];target.hp=2000;target.x=game.player.x+65;target.y=game.player.y;game.player.hp=40;const mana=game.player.mp,x=game.player.x;
 assert(game.action('special'));assert.equal(game.player.mp,mana-RIFT_CLASSES[id].skills.special.cost);assert(!game.action('special'));
 if(id==='warrior'){assert.equal(game.player.shield,4);const hp=game.player.hp;game.hitPlayer(20);assert.equal(game.player.hp,hp-7);}
 if(id==='mage')assert.equal(target.slow,3);
 if(id==='brawler'){assert.equal(game.player.haste,5);assert(game.skillCooldown('attack')<RIFT_CLASSES[id].skills.attack.cooldown);}
 if(id==='archer')assert(game.combo>=3);
 if(id==='assassin'){assert.equal(game.player.x,x+105);assert(game.player.inv>0);assert(target.hp<2000);}
 if(id==='paladin'){assert.equal(game.player.hp,85);assert.equal(game.player.shield,3);}
 game.toggleTalents();const freeze=JSON.stringify(game);advance(game,50);assert.equal(JSON.stringify(game),freeze);assert(!game.canLearnBranch('technique2'));assert(game.learnBranch('technique'));assert(!game.learnBranch('technique'));assert(!game.learnBranch('technique2'));assert(!game.learnBranch('missing'));
 const damage=game.player.damage;assert(game.chooseLevelReward('power'));assert.equal(game.player.damage,damage+3);assert(!game.chooseLevelReward('power'));
 game.gainXP(160);assert.equal(game.player.level,4);assert.equal(game.pendingLevelRewards,2);assert(game.canLearnBranch('technique2'));for(const n of RIFT_BRANCHES[id])if(!game.branchRanks[n.id])assert(game.learnBranch(n.id));assert.equal(Object.values(game.branchRanks).reduce((a,b)=>a+b),6);assert(!game.learnBranch('survival2'));assert(!game.chooseLevelReward('invalid'));
 const maxHp=game.player.maxHp,maxMp=game.player.maxMp;assert(game.chooseLevelReward('vital'));assert(game.chooseLevelReward('focus'));assert.equal(game.player.maxHp,maxHp+15);assert.equal(game.player.maxMp,maxMp+10);assert.equal(game.player.bonusRegen,1);assert.equal(game.pendingLevelRewards,0);
}
// Slow reduces pursuit while lasting only its explicit timer; special buffs end in active play.
g=new RiftGame('mage');g.start();g.enemies=[{id:0,type:'guard',x:800,y:340,hp:200,maxHp:200,cd:5,wind:0,stun:0,flash:0,slow:2}];advance(g,10);assert(g.enemies[0].x>785);assert(g.enemies[0].slow<2);
g=new RiftGame('paladin');g.start();g.gainXP(210);g.toggleTalents();assert(g.learnBranch('focus'));assert(g.learnBranch('focus2'));assert(g.learnBranch('survival'));assert(g.learnBranch('survival2'));assert(g.skillCost('special')<32);g.toggleTalents();g.player.hp=10;g.action('special');assert.equal(g.player.hp,80);assert.equal(g.player.shield,5);g.enemies=[{id:0,type:'guard',x:900,y:245,hp:500,maxHp:500,cd:10,wind:0,stun:0,flash:0}];advance(g,126);assert.equal(g.player.shield,0);
g=new RiftGame('brawler');g.start();g.gainXP(210);g.toggleTalents();g.learnBranch('technique');g.learnBranch('technique2');g.toggleTalents();g.player.hp=50;g.enemies[0].x=g.player.x+30;g.enemies[0].y=g.player.y;g.action('attack');assert(g.player.hp>50);
console.log('PASS: six distinct specials, shield/slow/haste/multishot/blink/healing, timed status freeze/expiry, 36 class branches, tier/parent/points guards, fast XP curve and one-time level rewards');
for(const [classId,specs] of Object.entries(RIFT_SPECIALIZATIONS))for(const spec of specs){
 const game=new RiftGame(classId);assert(game.getSkill('awakening').name);assert(!game.awakeningUnlocked);game.start();assert(!game.action('awakening'));assert(!game.chooseSpecialization(spec.id));game.toggleTalents();assert(!game.chooseSpecialization(spec.id));game.gainXP(320);assert.equal(game.player.level,5);const hp=game.player.maxHp;assert(game.chooseSpecialization(spec.id));assert.equal(game.specializationId,spec.id);assert.equal(game.specialization.name,spec.name);assert(game.awakeningUnlocked);assert.equal(game.player.maxHp,hp+(spec.bonuses.maxHp||0));const selected=JSON.stringify(game);assert(!game.chooseSpecialization(specs.find(s=>s.id!==spec.id).id));assert.equal(JSON.stringify(game),selected);
 const beforePoints=game.skillPoints,cost=game.skillCost('awakening'),mult=game.damageMultiplier('awakening');assert(game.upgradeSkill('awakening'));assert.equal(game.skillRanks.awakening,1);assert.equal(game.skillPoints,beforePoints-1);assert(game.skillCost('awakening')<cost);assert(game.damageMultiplier('awakening')>mult);assert(!game.action('awakening'));const frozen=JSON.stringify(game);advance(game,30);assert.equal(JSON.stringify(game),frozen);game.toggleTalents();
 const target=game.enemies[0];target.hp=10000;target.x=game.player.x+35;target.y=game.player.y;game.player.mp=game.player.maxMp;const mana=game.player.mp;assert(game.action('awakening'));assert(target.hp<10000);assert.equal(game.player.mp,mana-game.skillCost('awakening'));assert(!game.action('awakening'));assert(game.player.inv>0);const fx=game.effects.find(e=>e.kind==='awakening');assert.equal(fx.specializationId,spec.id);assert.equal(fx.rank,1);assert.equal(fx.color,spec.color);
 if(spec.awakening.slow)assert.equal(target.slow,spec.awakening.slow);if(spec.awakening.shield)assert(game.player.shield>=spec.awakening.shield);if(spec.awakening.haste)assert(game.player.haste>=spec.awakening.haste);
}
g=new RiftGame();g.start();g.toggleTalents();assert(!g.upgradeSkill('skill'));assert(!g.upgradeSkill('attack'));assert(!g.upgradeSkill('toString'));g.gainXP(50);const sp=g.skillPoints;assert(g.upgradeSkill('skill'));assert.equal(g.skillPoints,sp-1);assert(!g.upgradeSkill('skill'));assert(!g.upgradeSkill('ultimate'));g.gainXP(160);assert(g.upgradeSkill('skill'));assert(!g.upgradeSkill('skill'));g.gainXP(240);assert(g.upgradeSkill('skill'));const capped=JSON.stringify(g);assert(!g.upgradeSkill('skill'));assert.equal(JSON.stringify(g),capped);g.skillPoints=0;assert(!g.upgradeSkill('burst'));
function specialized(classId,id){const game=new RiftGame(classId);game.start();game.gainXP(320);game.toggleTalents();game.chooseSpecialization(id);game.toggleTalents();game.enemies=[{id:0,type:'guard',x:game.player.x+30,y:game.player.y,hp:10000,maxHp:10000,cd:10,wind:0,stun:0,flash:0}];return game;}
g=specialized('warrior','berserker');g.player.hp=50;g.action('attack');assert(g.player.hp>50);assert(g.damageMultiplier('attack')>1.2);
g=specialized('warrior','guardian');let health2=g.player.hp;g.hitPlayer(100);assert.equal(g.player.hp,health2-80);g.action('special');assert.equal(g.player.shield,6);
g=specialized('mage','frost');g.action('attack');assert.equal(g.enemies[0].slow,2);assert.equal(g.regenRate,13);
g=specialized('mage','fire');assert(g.damageMultiplier('skill')>RIFT_CLASSES.mage.skills.skill.mult);assert(g.skillCost('skill')<25);
g=specialized('brawler','striker');assert(g.skillCooldown('skill')<2.4);const x2=g.player.x;g.step(.04,{right:true});assert(g.player.x>x2+RIFT_CLASSES.brawler.speed*.04);
g=specialized('brawler','iron');assert(g.player.maxHp>=245);health2=g.player.hp;g.hitPlayer(100);assert.equal(g.player.hp,health2-82);
g=specialized('archer','sniper');assert.equal(g.effectiveRange('attack'),445);assert(g.damageMultiplier('attack')>1.1);
g=specialized('archer','ranger');g.action('attack');assert.equal(g.combo,2);
g=specialized('assassin','reaper');assert(g.damageMultiplier('special')>RIFT_CLASSES.assassin.skills.special.mult*1.5);
g=specialized('assassin','vampire');g.player.hp=50;g.action('attack');assert(g.player.hp>50);
g=specialized('paladin','saint');g.player.hp=10;g.action('special');assert.equal(g.player.hp,95);assert.equal(g.regenRate,11);
g=specialized('paladin','judge');assert.equal(g.effectiveDamage,g.player.damage+6);assert(g.damageMultiplier('skill')>RIFT_CLASSES.paladin.skills.skill.mult);
console.log('PASS: 12 distinct specializations, one-time Lv5 selection, awakening locks/costs/FX/statuses, rank level gates/SP/caps/utility and concrete passive combat differences');
g=new RiftGame();g.start();g.gainXP(50);g.toggleTalents();g.upgradeSkill('special');g.toggleTalents();g.action('special');assert.equal(g.player.shield,5);assert(g.skillCost('special')<20);
g=new RiftGame('mage');g.start();g.gainXP(50);g.toggleTalents();g.upgradeSkill('special');g.toggleTalents();g.enemies[0].x=g.player.x+40;g.enemies[0].y=g.player.y;g.action('special');assert.equal(g.enemies[0].slow,4);
