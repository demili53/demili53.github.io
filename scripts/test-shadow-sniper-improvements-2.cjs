const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const box=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'sniper-core.js'),'utf8')+';this.Game=SniperGame;',box);
const fresh=()=>new box.Game(()=>.37),advance=(g,t)=>{for(let i=0;i<Math.ceil(t/.05);i++)g.step(.05);};
// 11: focusing settles gradually; pause freezes both energy and stability.
let g=fresh();g.start();g.scoped=true;g.holding=true;g.step(.05);assert(g.steadiness>0&&g.steadiness<.5);advance(g,.8);assert(g.steadiness>.95);
g.pause();const steady=g.steadiness;advance(g,1);assert.equal(g.steadiness,steady);g.pause();advance(g,.5);assert(g.steadiness<.02);
console.log('PASS 11: gradual focusing and pause');
// 12: occupations produce different real travel distances and exertion, not just labels.
function soloRole(role){const game=fresh();game.mission=1;game.loadMission();game.start();const actor=game.actors.find(a=>a.role===role);game.actors=[actor];game.obstacles=[];Object.assign(actor.motion,{x:400,y:300,vx:0,vy:0,state:'travel',timer:10,route:[],goal:{x:520,y:300}});return game;}
const athlete=soloRole('운동선수'),reader=soloRole('독서가');advance(athlete,1);advance(reader,1);assert(athlete.actors[0].x>reader.actors[0].x+2);assert(athlete.actors[0].motion.fatigue<reader.actors[0].motion.fatigue);
console.log('PASS 12: occupation-specific travel and fatigue');
// 13: short-term visit memory prefers a fresh nearby attraction, with a bounded history.
g=fresh();g.mission=1;g.loadMission();g.actors=g.actors.slice(0,3);g.obstacles=[];
g.actors.forEach((a,i)=>{Object.assign(a,{x:[400,340,460][i],y:i?300:350,hidden:false,origin:400,originY:350});Object.assign(a.motion,{x:a.x,y:a.y,stationary:i>0,state:'activity',visitCooldown:0,socialCooldown:9});});
let actor=g.actors[0];g.interests=g.actors.slice(1).map(a=>({id:a.id,x:a.x,y:a.y,kind:'play'}));
actor.motion.recentVisits=[{id:g.actors[1].id,until:25}];assert(g.chooseInterest(actor));assert.equal(actor.motion.visit.id,g.actors[2].id);
for(let id=0;id<5;id++){actor.motion.visit={id};g.setBehavior(actor,'observe','look',1);}assert.equal(actor.motion.recentVisits.length,3);
g.loadMission();assert(g.actors.every(a=>a.motion.recentVisits.length===0));
console.log('PASS 13: varied destinations with bounded visit memory');
// 14: the notebook contains only seen appearances, never target flags or live positions.
g=fresh();assert.equal(g.observationNotes().length,0);g.updateObservation(g.actors[2],1.2);g.updateObservation(g.actors[2],1.2);const notes=g.observationNotes();assert.equal(notes.length,1);assert.equal(notes[0].description,g.actors[2].desc);assert.deepEqual(Object.keys(notes[0]),['number','description']);g.loadMission();assert.equal(g.observationNotes().length,0);
console.log('PASS 14: appearance-only observation notebook');
// 15: optional observation lock blocks premature shots without classifying civilians as targets.
g=fresh();g.start();g.scoped=true;g.requireObservation=true;actor=g.actors[0];g.aimAt(actor.x,actor.y-24);assert.equal(g.shoot().kind,'unobserved');assert.equal(g.mag,3);assert.equal(g.totalShots,0);
g.updateObservation(actor,1.2);assert.equal(g.shoot().kind,'target');g.skipShot();g.next();assert.equal(g.requireObservation,true);
g=fresh();g.start();g.scoped=true;g.requireObservation=true;actor=g.actors[1];g.updateObservation(actor,1.2);g.aimAt(actor.x,actor.y-24);assert.equal(g.shoot().kind,'protected');
console.log('PASS 15: optional observation-before-fire guard');
// 16: auto reload starts only after the shot, respects pause and handles a partial reserve.
g=fresh();g.start();g.autoReload=true;g.scoped=true;g.mag=1;g.reserve=2;g.aimAt(30,40);g.shoot();assert.equal(g.reloadLeft,0);g.skipShot();assert.equal(g.reloadLeft,1.6);
g.pause();advance(g,2);assert.equal(g.reloadLeft,1.6);g.pause();advance(g,1.7);assert.equal(g.mag,2);assert.equal(g.reserve,0);g.mag=0;assert.equal(g.maybeAutoReload(),false);
g=fresh();g.start();g.mag=0;assert.equal(g.maybeAutoReload(),false);
console.log('PASS 16: opt-in auto reload and partial reserves');
// 17 is verified by real CDP touch input: precise sensitivity and persistent preference.
// 18: reload feedback follows simulation time and freezes with the game.
g=fresh();g.start();g.mag=1;assert(g.reload());assert.equal(g.reloadProgress,0);advance(g,.8);assert(Math.abs(g.reloadProgress-.5)<.001);g.pause();const progress=g.reloadProgress;advance(g,1);assert.equal(g.reloadProgress,progress);g.pause();advance(g,1);assert.equal(g.reloadProgress,0);assert.equal(g.mag,3);
console.log('PASS 18: reload progress and paused timing');
// 19: campaign recap aggregates completed missions only and survives a failed retry.
function hitTarget(game){game.scoped=true;game.cooldown=0;const a=game.actors[0];game.aimAt(a.x,a.y-24);game.shoot();game.skipShot();}
g=fresh();assert.equal(g.campaignSummary.completed,0);assert.equal(g.campaignSummary.accuracy,0);g.start();hitTarget(g);g.next();g.start();g.scoped=true;g.aimAt(30,40);g.shoot();g.skipShot();advance(g,.2);hitTarget(g);
assert.equal(g.campaignSummary.completed,2);assert.equal(g.campaignSummary.shots,3);assert.equal(g.campaignSummary.accuracy,67);assert.equal(g.campaignSummary.perfect,1);
g.next();g.start();g.fail('test');g.retry();assert.equal(g.campaignSummary.completed,2);assert.equal(fresh().campaignSummary.completed,0);
console.log('PASS 19: campaign recap and retry boundaries');

// 20: validate persisted records and compare only within the same mission.
const best=box.sniperBestRecord,record={mission:0,grade:'A',shots:1,seconds:30};
assert.equal(best(null,{...record,seconds:NaN},0),null);assert.equal(best(null,{...record,shots:-1},0),null);assert.equal(best(null,record,1),null);
assert.equal(best(record,{...record,grade:'B',seconds:1},0).grade,'A');assert.equal(best(record,{...record,seconds:20},0).seconds,20);assert.equal(best(record,{...record,seconds:40},0).seconds,30);assert.equal(best(record,{...record,grade:'S'},0).grade,'S');
console.log('PASS 20: validated local best record ordering and mission isolation');
