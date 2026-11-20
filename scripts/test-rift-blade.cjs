'use strict';
// Rules tests for 던전엔드레곤 (formerly 균열의 검, rebuilt 2026-11-20). Run: node scripts/test-rift-blade.cjs
const assert=require('node:assert/strict'),{RiftGame,RIFT_HEROES,RIFT_BLESSINGS,RIFT_REGIONS,RIFT_BOSSES,RIFT_DASH,RIFT_WEAPONS,RIFT_ELEMENTS,RIFT_WEAPON_MAX,RIFT_ENEMIES,RIFT_AFFIXES}=require('./rift-core.js');
const seeded=s=>()=>((s=Math.imul(s^s>>>15,1|s)+0x6D2B79F5|0,((s^s>>>7)>>>0)/4294967296));
const run=(g,sec,input={})=>{for(let i=0;i<sec*60;i++)g.step(1/60,input);};
const fresh=(hero='blade',weapon)=>{const g=new RiftGame(hero,seeded(7),weapon);g.start();g.queue=[];g.enemies=[];return g;};
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

// Weapons: three per hero, each with its own combo and element; chosen only before the run.
for(const h of Object.keys(RIFT_HEROES)){assert.equal(RIFT_WEAPONS[h].length,3);for(const w of RIFT_WEAPONS[h]){assert(RIFT_ELEMENTS[w.elem],w.id);assert.equal(w.basic.length,3);}}
g=new RiftGame('blade',seeded(1),'ember');assert.equal(g.weaponId,'ember');assert(!g.setWeapon('frost'));assert(g.setWeapon('twin'));g.start();assert(!g.setWeapon('steel'));assert.equal(g.weaponId,'twin');
const firstHit=(hero,weapon,setup)=>{const g=fresh(hero,weapon);setup?.(g);const e=dummy(g,'grunt',g.player.x+70,g.player.y);e.hp=e.maxHp=99999;g.attack();run(g,.5);return {g,e,dmg:99999-e.hp};};
assert(firstHit('blade','ember').dmg>firstHit('blade','steel').dmg*1.2,'great sword hits harder');
{const {g,e}=firstHit('blade','ember');assert(e.burn,'fire burns');const hp=e.hp;run(g,1.2);assert(e.hp<hp,'burn ticks');}
{const g=fresh('arcanist','storm'),e=dummy(g,'grunt',g.player.x+300,g.player.y);e.hp=e.maxHp=9999;g.attack();run(g,.2);assert(e.hp<9999,'zap lands instantly');assert.equal(g.shots.length,0);}
{const g=fresh('ranger','venom'),e=dummy(g,'grunt',g.player.x+200,g.player.y);e.hp=e.maxHp=99999;for(let i=0;i<4;i++){g.attack();run(g,.35);}assert(e.poison&&e.poison.stacks>=3,'poison stacks');}
{const g=fresh('arcanist','frost'),e=dummy(g,'grunt',g.player.x+200,g.player.y);e.hp=e.maxHp=99999;for(let i=0;i<6&&!(e.freeze>0);i++){g.attack();run(g,.4);}assert(e.freeze>0,'chill stacks freeze');}
{const g=fresh('ranger','blaze'),a=dummy(g,'grunt',g.player.x+200,g.player.y),b=dummy(g,'grunt',g.player.x+250,g.player.y+20);a.hp=a.maxHp=b.hp=b.maxHp=99999;g.attack();run(g,.6);assert(a.hp<99999&&b.hp<99999,'fire bolt splashes');}
{const g=fresh('blade','twin');g.random=()=>0;const a=dummy(g,'grunt',g.player.x+60,g.player.y),b=dummy(g,'grunt',g.player.x+60,g.player.y+90);a.hp=a.maxHp=b.hp=b.maxHp=99999;g.attack();run(g,.3);assert(b.hp<99999,'shock arcs to a neighbour');}
// Upgrades: forge cards and boss clears raise the weapon level, which raises damage and awakens a trait at level 3.
{const g=fresh();g.random=()=>0;g.clearT=0;run(g,1.3);assert.equal(g.state,'choice');assert(g.offers.includes('forge'));assert(g.choose('forge'));assert.equal(g.wlv,2);}
{const g=new RiftGame('blade',seeded(2));g.start();g.fight=2;g.beginFight();g.enemies=[];g.clearT=0;run(g,1.3);assert.equal(g.wlv,2,'boss clear upgrades');assert.equal(g.state,'choice');assert(!g.offers.includes('forge'));}
assert(firstHit('blade','steel',g=>{g.wlv=5;}).dmg>firstHit('blade','steel').dmg*1.3,'weapon level raises damage');
{const g=fresh('blade','steel');g.wlv=3;const e=dummy(g,'grunt',g.player.x+60,g.player.y);e.hp=e.maxHp=99999;for(let i=0;i<3;i++){g.attack();run(g,.47);}assert(g.shots.some(s=>s.kind==='wave')||e.hp<99999-200,'awakened sword wave');}
{const g=fresh();g.wlv=RIFT_WEAPON_MAX;assert(!g.upgradeWeapon());assert(g.legendary);}
// Monsters: new types behave as designed; elites carry an affix.
assert.equal(Object.keys(RIFT_ENEMIES).length,8);assert.equal(RIFT_BOSSES[4].id,'dragon');for(const r of RIFT_REGIONS)for(const f of r.fights)for(const t of f)assert(RIFT_ENEMIES[t],t);
{const g=fresh(),e=dummy(g,'slime',g.player.x+200,g.player.y);g.damageEnemy(e,{dmg:99999,kb:0,kind:'skill'});assert.equal(g.alive.filter(x=>x.type==='slime'&&x.small).length,2,'slime splits');const sm=g.alive[0];g.damageEnemy(sm,{dmg:99999,kb:0,kind:'skill'});assert.equal(g.alive.length,1,'small slimes do not split');}
{const g=fresh(),sh=dummy(g,'shaman',g.player.x+300,g.player.y),a=dummy(g,'grunt',g.player.x+250,g.player.y+40);sh.cd=0;g.step(1/60,{});assert(a.ward>0,'shaman wards an ally');const hp=a.hp;g.damageEnemy(a,{dmg:a.ward-1,kb:0,kind:'skill'});assert.equal(a.hp,hp,'ward absorbs damage');}
{const g=fresh(),e=dummy(g,'shaman',g.player.x+300,g.player.y);e.cd=0;g.step(1/60,{});assert(g.hazards.some(h=>h.kind==='skull'),'lone shaman throws a skull');}
{const g=fresh(),e=dummy(g,'imp',g.player.x+300,g.player.y);e.cd=0;g.step(1/60,{});const h=g.hazards.find(h=>h.kind==='bomb');assert(h&&Math.abs(h.x-g.player.x)<40,'imp bombs the player position');}
{const g=fresh(),e=dummy(g,'hound',g.player.x+200,g.player.y);e.cd=0;g.step(1/60,{});assert(g.hazards.some(h=>h.kind==='pounce'));run(g,.7);assert(g.player.hp<g.player.maxHp,'hound pounce lands');}
{const g=fresh();g.random=()=>.3;const e=g.makeEnemy('grunt',{x:500,y:400,elite:true});assert(RIFT_AFFIXES[e.affix]);assert(e.maxHp>RIFT_ENEMIES.grunt.hp*2);}
{const g=fresh();g.random=()=>.3;const e=g.makeEnemy('grunt',{x:500,y:400,elite:true});assert.equal(e.affix,'iron');e.state='idle';e.cd=99;g.enemies.push(e);const hp=e.hp;g.damageEnemy(e,{dmg:100,kb:200,launch:400,kind:'basic'});assert(hp-e.hp<=82,'iron reduces damage');assert(!e.air&&e.vx===0,'iron ignores light knockback');
 g.player.hp=50;g.damageEnemy(e,{dmg:99999,kb:0,kind:'skill'});assert(g.player.hp>50,'elite kill heals');}
{const g=fresh();g.random=()=>.6;const e=g.makeEnemy('grunt',{x:500,y:400,elite:true});assert.equal(e.affix,'volatile');g.enemies.push(e);g.damageEnemy(e,{dmg:99999,kb:0,kind:'skill'});assert(g.hazards.some(h=>h.kind==='burst'),'volatile elite explodes');}
{const g=new RiftGame('blade',seeded(2));g.start();g.region=4;g.fight=1;g.beginFight();assert(g.queue.some(q=>q.elite),'second fight has an elite');}
// Bosses add phase-two patterns once enraged; the dragon has its own set.
{const g=new RiftGame('blade',seeded(4));g.start();g.region=4;g.fight=2;g.beginFight();const d=g.enemies[0];assert.equal(d.boss.id,'dragon');for(const n of ['breath','tail','fireball','wing','dive','inferno']){g.hazards=[];d.state='idle';g.bossAttack(d,n);assert(g.hazards.length>0,n);}
 g.hazards=[];d.state='idle';g.bossAttack(d,'wing');g.player.inv=0;g.player.dash=0;const x0=g.player.x;g.hitstop=0;run(g,1.4);assert(g.player.hp<g.player.maxHp&&g.player.x<x0,'wing gust pushes');}
for(const [r,n] of [[0,'ripple'],[1,'thorns'],[2,'blizzard'],[3,'meteor']]){const g=new RiftGame('blade',seeded(5));g.start();g.region=r;g.fight=2;g.beginFight();const b=g.enemies[0];assert(b.boss.rage.includes(n));b.state='idle';g.bossAttack(b,n);assert(g.hazards.length>=2,n);}
{const h={shape:'circle',x:0,y:0,rx:200,ry:100,ring:110};const g=fresh();assert(!g.inHazard(h,0,0)&&g.inHazard(h,150,0),'ripple rings are hollow');}
// Death ends the run; full deterministic campaigns can be completed by a careful bot for every hero.
g=fresh();g.player.hp=5;g.hitPlayer(50);assert.equal(g.state,'lost');
function bot(g){const p=g.player,t=g.nearestTarget(2000);if(!t)return{x:(480-p.x)/200,y:0};
 if((g.hazards.some(h=>h.wind>0&&h.wind<.18&&g.inHazard(h,p.x,p.y))||g.shots.some(s=>!s.friendly&&Math.abs(s.x-p.x)<70&&Math.abs(s.y-p.y)<25))&&p.dashCd<=0){p.face=t.x>p.x?1:-1;g.dashMove();}
 if(p.rift>=100)g.ultimate();if(p.mp>60)g.skill();const want=g.heroId==='blade'?70:260,dx=t.x-p.x,dy=t.y-p.y;
 return{x:Math.abs(dx)>want+30?Math.sign(dx):Math.abs(dx)<want-40&&g.heroId!=='blade'?-Math.sign(dx):0,y:Math.abs(dy)>12?Math.sign(dy):0,attack:Math.abs(dx)<want+60&&Math.abs(dy)<30};}
for(const [hero,weapon] of Object.entries(RIFT_WEAPONS).flatMap(([h,ws])=>ws.map(w=>[h,w.id]))){g=new RiftGame(hero,seeded(1),weapon);g.start();let n=0;while(['playing','choice'].includes(g.state)&&n++<60*60*20){if(g.state==='choice'){g.choose(g.offers[0]);continue;}g.step(1/60,bot(g));g.drainEvents();}
 assert.equal(g.state,'won',hero+'/'+weapon+' campaign');assert(g.score>50000);assert.equal(g.region,4);}
console.log('PASS: monsters/elites/boss phases, weapons/elements/upgrades, heroes/combo/launch, skill & ultimate gating, projectiles/pierce, telegraph timing, perfect dodge, interrupts, archer dodge, boss stagger/enrage, pause freeze, blessings, defeat and full campaigns');
