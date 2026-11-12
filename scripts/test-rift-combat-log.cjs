'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {RiftGame}=require('./rift-core');
const {RiftPractice}=require('./rift-practice');
const {RiftCombatLog}=require('./rift-combat-log');
function fixture(){const game=new RiftGame();game.start();game.enemies=[{id:7,type:'guard',x:280,y:340,hp:10000,maxHp:10000,face:-1,stun:100,wind:0,cd:100,flash:0}];game.containers=[];return game;}

test('combat log reports actual damage deltas, groups short bursts and never duplicates unchanged snapshots',()=>{
 const game=fixture(),log=new RiftCombatLog();log.update(game);assert.equal(log.entries.length,0);game.hurtEnemy(game.enemies[0],10,0);log.update(game);game.time=.2;game.hurtEnemy(game.enemies[0],20,0);log.update(game);assert.equal(log.entries.length,1);assert.equal(log.entries[0].amount,30);assert.equal(log.entries[0].text,'가한 피해 30');game.hitPlayer(10);log.update(game);assert.equal(log.entries[0].kind,'taken');assert.equal(log.entries[0].amount,10);const before=JSON.stringify(log.entries),version=log.version;log.update(game);game.pause();game.step(.04);log.update(game);assert.equal(JSON.stringify(log.entries),before);assert.equal(log.version,version);
});

test('parries, counters, focus, breaks, kills, levels and stage outcomes come from real core events',()=>{
 const game=fixture(),log=new RiftCombatLog();log.update(game);game.action('guard');assert.equal(game.hitPlayer(100,game.enemies[0].id),0);log.update(game);assert.equal(log.entries[0].kind,'parry');assert(!log.entries.some(entry=>entry.kind==='taken'));game.action('attack');log.update(game);assert(log.entries.some(entry=>entry.kind==='counter'));game.player.focus=100;game.action('focus');log.update(game);assert.equal(log.entries[0].kind,'focus');game.enemies[0].type='boss';game.enemies[0].stagger=95;game.enemies[0].broken=0;game.enemies[0].breakGuard=0;game.hurtEnemy(game.enemies[0],100,0);log.update(game);assert.equal(log.entries[0].kind,'break');game.hurtEnemy(game.enemies[0],99999,0);log.update(game);assert(log.entries.some(entry=>entry.kind==='kill'));assert(log.entries.some(entry=>entry.kind==='level'));game.step(.01);log.update(game);assert.equal(log.entries[0].kind,'stage');for(const enemy of game.enemies)game.hurtEnemy(enemy,99999);game.step(.01);log.update(game);assert.equal(log.entries[0].kind,'result');assert.equal(log.entries[0].text,'지역 돌파 · 보급소 도착');
});

test('pressure practice parries log no damage while late guard records real mitigated damage',()=>{
 const game=new RiftPractice('warrior'),log=new RiftCombatLog();game.setMode('pressure');game.player.x=600;game.player.y=350;log.update(game);game.trainingCooldown=0;game.step(.01);assert(game.hazards.length);while(game.hazards[0]?.wind>.12)game.step(.01);game.action('guard');while(game.stats.parries===0&&game.hazards.length)game.step(.01);log.update(game);assert.equal(game.trainingParries,1);assert.equal(game.trainingDamageTaken,0);assert.equal(game.player.hp,game.player.maxHp);assert(log.entries.some(entry=>entry.kind==='parry'));assert(!log.entries.some(entry=>entry.kind==='taken'));game.player.inv=0;game.player.parryWindow=0;game.player.guardWindow=.3;assert.equal(game.hitPlayer(8,game.target.id),2);log.update(game);assert.equal(game.trainingDamageTaken,2);assert.equal(log.entries[0].kind,'taken');assert.equal(log.entries[0].amount,2);assert.equal(game.player.hp,game.player.maxHp);
});

test('manual target reset and practice mode changes start a clean combat log',()=>{
 const game=new RiftPractice('warrior'),log=new RiftCombatLog();log.update(game);game.player.x=620;game.action('attack');log.update(game);assert(log.entries.length);assert.equal(game.trainingResets,0);game.resetTarget();log.update(game);assert.deepEqual(log.entries,[]);game.player.cd.attack=0;game.action('attack');log.update(game);assert(log.entries.length);game.setMode('pressure');log.update(game);assert.deepEqual(log.entries,[]);
});

test('automatic dummy replenishment keeps the same training-session combat history',()=>{
 const game=new RiftPractice('warrior'),log=new RiftCombatLog();log.update(game);game.hurtEnemy(game.target,10);log.update(game);assert.equal(log.entries[0].amount,10);game.target.hp=1;game.hurtEnemy(game.target,20);assert.equal(game.trainingResets,1);log.update(game);assert.equal(log.entries[0].kind,'dealt');assert.equal(log.entries[0].amount,30);assert.equal(game.stats.damageDealt,30);
});

test('log bounds history and resets when replacing the game or rewinding its time',()=>{
 const game=fixture(),log=new RiftCombatLog();log.update(game);for(let i=0;i<30;i++){game.time+=1.1;game.hurtEnemy(game.enemies[0],1,0);log.update(game);}assert.equal(log.entries.length,24);assert(log.entries[0].time>log.entries[23].time);const newer=fixture();log.update(newer);assert.deepEqual(log.entries,[]);newer.hurtEnemy(newer.enemies[0],1,0);newer.time=5;log.update(newer);assert(log.entries.length);newer.time=0;log.update(newer);assert.deepEqual(log.entries,[]);
});

test('existing shields mitigate damage and combine with late guard without creating a parry',()=>{
 const game=fixture(),log=new RiftCombatLog();log.update(game);game.player.shield=2;assert.equal(game.hitPlayer(100),35);game.player.inv=0;game.player.guardWindow=.3;game.player.parryWindow=0;assert.equal(game.hitPlayer(100),11);log.update(game);assert.equal(game.stats.parries,0);assert.equal(log.entries[0].amount,46);assert.equal(game.stats.damageTaken,46);
});
