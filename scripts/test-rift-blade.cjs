'use strict';
// Rules tests for the rebuilt 균열의 검 (2026-11-20). Run: node scripts/test-rift-blade.cjs
const assert=require('node:assert/strict'),{RiftGame,RIFT_HEROES,RIFT_BLESSINGS,RIFT_REGIONS,RIFT_BOSSES,RIFT_DASH}=require('./rift-core.js');
const seeded=s=>()=>((s=Math.imul(s^s>>>15,1|s)+0x6D2B79F5|0,((s^s>>>7)>>>0)/4294967296));
const run=(g,sec,input={})=>{for(let i=0;i<sec*60;i++)g.step(1/60,input);};
const fresh=(hero='blade')=>{const g=new RiftGame(hero,seeded(7));g.start();g.queue=[];g.enemies=[];return g;};
const dummy=(g,type='grunt',x=300,y=400)=>{const e=g.makeEnemy(type,{x,y});e.state='idle';e.cd=99;g.enemies.push(e);return e;};

// Setup
assert.equal(Object.keys(RIFT_HEROES).length,3);assert.equal(RIFT_REGIONS.length,5);assert.equal(RIFT_BOSSES.length,5);
let g=new RiftGame('mage?');assert.equal(g.heroId,'blade');assert(g.setHero('ranger'));assert.equal(g.player.maxHp,RIFT_HEROES.ranger.hp);
assert(g.start());assert(!g.setHero('blade'));assert.equal(g.state,'playing');assert(g.queue.length>=RIFT_REGIONS[0].fights[0].length);

// Three-hit combo: third swing launches and costs nothing; combo resets after a pause.
g=fresh();let e=dummy(g,'grunt',g.player.x+70,g.player.y);e.hp=e.maxHp=9999;
for(let i=0;i<3;i++){assert(g.attack()||g.player.buffer);run(g,.5);}assert(e.hp<9999);assert(e.z>0||e.air||e.stun>0);assert.equal(g.combo,3);assert(g.player.rift>0);
run(g,3);assert.equal(g.combo,0);
// Skill needs mana and respects cooldown; ultimate needs a full gauge and grants invulnerability.
g=fresh();e=dummy(g,'grunt',g.player.x+60,g.player.y);e.hp=e.maxHp=9999;const mp=g.player.mp;assert(g.skill());assert.equal(g.player.mp,mp-g.skillCost);run(g,.6);assert(!g.skill());assert(e.hp<9999);
g.player.mp=0;g.player.skillCd=0;assert(!g.skill());assert(!g.ultimate());g.player.rift=100;assert(g.ultimate());assert.equal(g.player.rift,0);assert(g.player.inv>0);
// Ranged heroes fire projectiles that pierce correctly.
for(const hero of ['arcanist','ranger']){g=fresh(hero);e=dummy(g,'grunt',g.player.x+250,g.player.y);e.hp=e.maxHp=9999;g.attack();run(g,.8);assert(e.hp<9999,hero+' shot hits');}
g=fresh('ranger');const a1=dummy(g,'grunt',500,400),a2=dummy(g,'grunt',650,400);a1.hp=a1.maxHp=a2.hp=a2.maxHp=9999;g.player.y=400;g.player.mp=100;g.skill();run(g,.9);assert(a1.hp<9999&&a2.hp<9999,'lance pierces');

// Telegraphs: damage only after the warning; dodging through grants a perfect dodge.
g=fresh();e=dummy(g,'grunt',g.player.x+60,g.player.y);e.cd=0;e.face=-1;const hp=g.player.hp;g.step(1/60,{});assert.equal(e.state,'wind');assert.equal(g.hazards.length,1);assert.equal(g.player.hp,hp);
run(g,.6);assert(g.player.hp<hp,'grunt swing lands');
g=fresh();e=dummy(g,'brute',g.player.x+80,g.player.y);e.cd=0;e.face=-1;g.step(1/60,{});const h=g.hazards[0];while(h.wind>RIFT_DASH.perfect*.6)g.step(1/60,{});g.player.face=1;assert(g.dashMove());run(g,.4);assert.equal(g.perfects,1);assert.equal(g.player.hp,g.player.maxHp);assert(g.player.rift>=18);
// Hitting a winding grunt interrupts it and removes its pending telegraph.
g=fresh();e=dummy(g,'grunt',g.player.x+70,g.player.y);e.cd=0;e.face=-1;g.step(1/60,{});assert.equal(g.hazards.length,1);g.player.inv=5;g.attack();run(g,.2);assert.equal(g.hazards.filter(x=>x.owner===e.id).length,0);
// Archer arrows travel and can be dodged by moving off the lane.
g=fresh();e=dummy(g,'archer',560,g.player.y);e.cd=0;g.step(1/60,{});run(g,.8);assert(g.shots.some(s=>!s.friendly));g.player.y=g.player.y>400?300:500;const hp2=g.player.hp;run(g,1.5);assert.equal(g.player.hp,hp2);

// Boss: enrages once under half, staggers from burst damage, cancels its pending attacks.
g=new RiftGame('blade',seeded(3));g.start();g.fight=2;g.beginFight();const boss=g.enemies[0];assert(boss.boss);
g.damageEnemy(boss,{dmg:boss.maxHp*.11,kb:0,kind:'skill'});assert(!boss.enraged);boss.cd=0;g.hitstop=0;g.step(1/60,{});assert(g.hazards.length>0);g.damageEnemy(boss,{dmg:boss.maxHp*.05,kb:0,kind:'skill'});assert.equal(boss.state,'stagger');assert.equal(g.hazards.filter(x=>x.wind>0).length,0);
g.damageEnemy(boss,{dmg:boss.maxHp*.4,kb:0,kind:'skill'});assert(boss.enraged);
// Pause freezes everything.
g.pause();const frozen=JSON.stringify(g,(k,v)=>k==='random'?undefined:v);run(g,1,{x:1,attack:true});assert.equal(JSON.stringify(g,(k,v)=>k==='random'?undefined:v),frozen);g.pause();

// Clearing a fight offers three distinct blessings; ranks cap; vigor raises max HP.
g=fresh();g.clearT=0;run(g,1.3);assert.equal(g.state,'choice');assert.equal(new Set(g.offers).size,3);assert(!g.choose('nope'));
g.offers=['vigor'];const maxHp=g.player.maxHp;assert(g.choose('vigor'));assert.equal(g.player.maxHp,maxHp+25);assert.equal(g.fight,1);assert.equal(g.state,'playing');
g.blessings.vigor=3;assert(!g.rollOffers().includes('vigor'));
g=fresh();e=dummy(g,'grunt',g.player.x+60,g.player.y);e.hp=e.maxHp=99999;g.attack();run(g,.4);const plain=99999-e.hp;g=fresh();g.blessings.edge=2;e=dummy(g,'grunt',g.player.x+60,g.player.y);e.hp=e.maxHp=99999;g.attack();run(g,.4);assert(99999-e.hp>plain*1.15,'edge blessing raises damage');
assert.equal(RIFT_BLESSINGS.length,12);

// Death ends the run; full deterministic campaigns can be completed by a careful bot for every hero.
g=fresh();g.player.hp=5;g.hitPlayer(50);assert.equal(g.state,'lost');
function bot(g){const p=g.player,t=g.nearestTarget(2000);if(!t)return{x:(480-p.x)/200,y:0};
 if((g.hazards.some(h=>h.wind>0&&h.wind<.18&&g.inHazard(h,p.x,p.y))||g.shots.some(s=>!s.friendly&&Math.abs(s.x-p.x)<70&&Math.abs(s.y-p.y)<25))&&p.dashCd<=0){p.face=t.x>p.x?-1:1;g.dashMove();}
 if(p.rift>=100)g.ultimate();if(p.mp>60)g.skill();const want=g.heroId==='blade'?70:260,dx=t.x-p.x,dy=t.y-p.y;
 return{x:Math.abs(dx)>want+30?Math.sign(dx):Math.abs(dx)<want-40&&g.heroId!=='blade'?-Math.sign(dx):0,y:Math.abs(dy)>12?Math.sign(dy):0,attack:Math.abs(dx)<want+60&&Math.abs(dy)<30};}
for(const [hero,seed] of [['blade',1],['arcanist',1],['ranger',1]]){g=new RiftGame(hero,seeded(seed));g.start();let n=0;while(['playing','choice'].includes(g.state)&&n++<60*60*20){if(g.state==='choice'){g.choose(g.offers[0]);continue;}g.step(1/60,bot(g));g.drainEvents();}
 assert.equal(g.state,'won',hero+' campaign');assert(g.score>50000);assert.equal(g.region,4);}
console.log('PASS: heroes/combo/launch, skill & ultimate gating, projectiles/pierce, telegraph timing, perfect dodge, interrupts, archer dodge, boss stagger/enrage, pause freeze, blessings, defeat and full campaigns');
