const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const box=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'sniper-core.js'),'utf8')+';this.Game=SniperGame;this.missions=SNIPER_MISSIONS;',box);
const fresh=()=>new box.Game();const advance=(g,seconds)=>{for(let i=0;i<Math.ceil(seconds/.05);i++)g.step(.05);};
function fire(g,a){g.scoped=true;g.cooldown=0;g.aimAt(a.x,a.y-24);return g.shoot();}
function hit(g,a){const result=fire(g,a);advance(g,2.6);return result;}
let g=fresh();assert.equal(g.actors.length,27);g.start();const actor=g.actors[0],time=g.remaining;
assert.equal(fire(g,actor).kind,'target');assert.equal(g.state,'shot');assert.equal(actor.dead,false);assert.equal(g.score,0);assert.equal(g.shoot().kind,'blocked');assert.equal(g.reload(),false);assert.equal(g.scope(),false);
advance(g,.5);assert.equal(actor.dead,false);assert.equal(g.remaining,time);g.pause();const frozen=JSON.stringify(g.shot);advance(g,1);assert.equal(JSON.stringify(g.shot),frozen);g.pause();assert.equal(g.state,'shot');advance(g,.65);assert.equal(actor.dead,true);assert.equal(g.state,'shot');assert(g.particles.length>0);assert.equal(g.totalHits,1);
g.pause();const fall=actor.fallTime,particles=JSON.stringify(g.particles);advance(g,.5);assert.equal(actor.fallTime,fall);assert.equal(JSON.stringify(g.particles),particles);g.pause();advance(g,1.5);assert.equal(g.state,'success');assert(actor.fallTime>=1);assert.equal(g.targetsLeft,0);const score=g.score;assert.equal(g.shoot().kind,'blocked');assert.equal(g.score,score);
g.next();assert.equal(g.actors.length,44);g.start();hit(g,g.actors[0]);assert.equal(g.state,'success');g.next();assert.equal(g.actors.length,52);g.start();advance(g,1);assert(g.actors[0].hidden);const prior=g.score;assert.equal(hit(g,g.actors[0]).kind,'miss');assert.equal(g.score,prior);advance(g,3);assert.equal(g.actors[0].hidden,false);hit(g,g.actors[0]);assert.equal(g.state,'won');assert.equal(g.totalHits,3);
g=fresh();g.start();hit(g,g.actors.find(a=>!a.target));assert.equal(g.state,'failed');assert(g.failure.includes('오인'));assert(g.retry());assert.equal(g.score,0);assert.equal(g.mag,3);assert.equal(g.state,'briefing');
g=fresh();g.start();hit(g,g.actors[0]);g.next();const checkpoint=g.score;g.start();hit(g,g.actors.find(a=>!a.target));g.retry();assert.equal(g.score,checkpoint);assert.equal(g.totalShots,1);assert.equal(g.totalHits,1);
g=fresh();g.start();g.scoped=true;g.aimAt(30,40);for(let i=0;i<3;i++){g.cooldown=0;g.shoot();advance(g,2.6);}assert.equal(g.mag,0);assert.equal(g.alert,72);g.cooldown=0;assert.equal(g.shoot().kind,'empty');assert(g.reload());assert.equal(g.shoot().kind,'blocked');const remaining=g.remaining;g.pause();advance(g,2);assert.equal(g.reloadLeft,1.6);assert.equal(g.remaining,remaining);g.pause();advance(g,1.7);assert.equal(g.mag,3);assert.equal(g.reserve,6);for(let i=0;i<2;i++){g.cooldown=0;g.shoot();advance(g,2.6);}assert.equal(g.state,'failed');assert(g.failure.includes('노출'));
g=fresh();g.start();g.scoped=true;g.holding=true;advance(g,4);assert.equal(g.holding,false);assert(g.focus<20);advance(g,5);assert(g.focus>75);g.remaining=.01;g.step(.05);assert.equal(g.state,'failed');
g=fresh();g.start();g.scoped=true;for(let i=0;i<35;i++){const a=g.actors[0];g.aimAt(a.x,a.y-24);g.step(.05);}assert(g.identification>=1);assert(g.inspected.target);g.aimAt(-100,1000);assert.equal(g.aim.x,25);assert.equal(g.aim.y,510);
for(const [i,m]of box.missions.entries()){const crowd=m.extras;assert(crowd.length>=26+i*10);assert(new Set(crowd.map(a=>a.role)).size>=10);assert.equal(m.targets.length,1);assert(m.targets[0].stripes&&m.targets[0].glasses&&m.targets[0].hat==='beanie');}
g=fresh();g.start();for(let i=0;i<20;i++){g.mag=3;g.reserve=9;g.alert=0;g.cooldown=0;g.scoped=true;g.aimAt(30,40);g.shoot();advance(g,2.6);assert(g.particles.length<=18);}assert(g.actors.every(a=>Number.isFinite(a.x)));
for(let stage=0;stage<3;stage++){
 const game=fresh();game.mission=stage;game.loadMission();game.start();
 assert(new Set(game.actors.map(a=>a.action)).size>=9);
 const initial=game.actors.map(a=>JSON.stringify(a.pose)),animated=new Set();
 for(let frame=0;frame<90;frame++){game.step(.05);game.actors.forEach((a,i)=>{if(JSON.stringify(a.pose)!==initial[i])animated.add(i);assert.equal(a.x,a.pose.x);assert.equal(a.y,a.pose.y);});}
 assert.equal(animated.size,game.actors.length,`${stage}: every character should animate over a full activity cycle`);
 game.pause();const stopped=JSON.stringify(game.actors);advance(game,.8);assert.equal(JSON.stringify(game.actors),stopped);game.pause();
 fire(game,game.actors[0]);const flightPoses=JSON.stringify(game.actors.map(a=>a.pose));advance(game,.5);assert.equal(JSON.stringify(game.actors.map(a=>a.pose)),flightPoses);
 const bounds=fresh();bounds.mission=stage;bounds.loadMission();bounds.start();for(let n=0;n<500;n++){bounds.step(.05);assert(bounds.actors.every(a=>a.x>30&&a.x<930&&a.y>170&&a.y<510));}
}
// Seeded crowd simulations cover long-running steering, reaction timing and recovery.
function seeded(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
for(let stage=0;stage<3;stage++)for(let seed=1;seed<=4;seed++){
 const game=new box.Game(seeded(seed));game.mission=stage;game.loadMission();game.start();
 const initial=game.actors.map(a=>({x:a.x,y:a.y})),traveled=new Set(),states=new Set();
 for(let frame=0;frame<1000;frame++){
  const previous=game.actors.map(a=>({x:a.x,y:a.y}));game.step(.05);
  game.actors.forEach((a,i)=>{
   states.add(a.motion.state);assert(Number.isFinite(a.x)&&Number.isFinite(a.y));
   assert(a.x>=48&&a.x<=912&&a.y>=178&&a.y<=498);
   assert(Math.hypot(a.x-previous[i].x,a.y-previous[i].y)<3,'no teleport while steering');
   assert.equal(a.x,a.pose.x);assert.equal(a.y,a.pose.y);
   if(Math.hypot(a.x-initial[i].x,a.y-initial[i].y)>20)traveled.add(i);
   for(const o of game.obstacles)assert(!(Math.abs(a.x-o.x)<o.rx+11.99&&Math.abs(a.y-o.y)<o.ry+7.99),'avoid solid props');
  });
 }
 assert(traveled.size>=game.actors.length/3,'crowd should explore destinations');
 assert(states.has('activity')&&states.has('travel')&&states.has('observe'));
 game.alertCrowd(480,300);const delays=game.actors.map(a=>a.motion.reaction.delay);
 assert(Math.max(...delays)-Math.min(...delays)>.2,'stagger reactions');
 game.pause();const paused=JSON.stringify(game.actors);advance(game,1);assert.equal(JSON.stringify(game.actors),paused);game.pause();
 const reacted=new Set(),fled=new Set();for(let frame=0;frame<140;frame++){game.step(.05);for(const a of game.actors){if(a.motion.state==='startled')reacted.add(a.id);if(a.motion.state==='flee')fled.add(a.id);}}
 assert.equal(reacted.size,game.actors.length);assert.equal(fled.size,game.actors.length);
 advance(game,12);assert(game.actors.every(a=>!['startled','flee','recover'].includes(a.motion.state)),'resume everyday routines');
}
// A missed shot schedules a response without moving the frozen cinematic crowd.
g=new box.Game(seeded(3));g.mission=1;g.loadMission();g.start();g.actors=g.actors.slice(0,2);
g.actors.forEach((a,i)=>{Object.assign(a.motion,{x:400+i*40,y:300,vx:0,vy:0,goal:{x:440-i*40,y:300},pace:20,state:'travel',timer:7});});
let minGap=Infinity;for(let frame=0;frame<80;frame++){g.step(.05);minGap=Math.min(minGap,Math.hypot(g.actors[0].x-g.actors[1].x,g.actors[0].y-g.actors[1].y));}
assert(minGap>18,'approaching walkers must give each other room');
g=new box.Game(seeded(7));g.start();g.scoped=true;g.aimAt(30,40);g.shoot();advance(g,1.1);
assert(g.actors.every(a=>a.motion.reaction));const shotActors=JSON.stringify(g.actors);advance(g,.5);assert.equal(JSON.stringify(g.actors),shotActors);
// Hit selection follows the visible front character and uses the body's transformed center.
g=new box.Game(seeded(9));const back=g.actors[0],front=g.actors[1];
for(const a of g.actors.slice(2))a.hidden=true;
Object.assign(back,{x:400,y:300,hidden:false});Object.assign(front,{x:400,y:305,hidden:false});
back.pose={...back.pose,bob:0,lean:0};front.pose={...front.pose,bob:3,lean:.2};
assert.equal(g.actorAt(400+24*Math.sin(.2),308-24*Math.cos(.2)),front);
// A walker reaches the other side of a blocking table without entering its footprint.
g=new box.Game(seeded(31));g.mission=1;g.loadMission();g.start();g.actors=g.actors.slice(0,1);
const walker=g.actors[0];g.obstacles=[{x:400,y:300,rx:20,ry:20}];
Object.assign(walker.motion,{x:340,y:300,vx:0,vy:0,pace:24});
assert(g.planRoute(walker,{x:460,y:300}));assert(walker.motion.route.length>1);
g.setBehavior(walker,'travel','walk',20);
for(let i=0;i<240;i++){g.step(.05);assert(!(Math.abs(walker.x-400)<34&&Math.abs(walker.y-300)<30));}
assert(Math.hypot(walker.x-460,walker.y-300)<8,'complete the detour');
// Conversations are reciprocal, pause safely, and are interrupted by danger.
g=new box.Game(seeded(41));g.mission=1;g.loadMission();g.start();g.actors=g.actors.slice(0,2);
g.actors.forEach((a,i)=>{Object.assign(a,{x:400+i*55,y:300,hidden:false});Object.assign(a.motion,{x:a.x,y:a.y,stationary:false,socialCooldown:0,state:'activity',timer:3});});
assert(g.tryConversation(g.actors[0]));assert.equal(g.actors[0].motion.partner,g.actors[1].id);assert.equal(g.actors[1].motion.partner,g.actors[0].id);
assert.equal(g.actors[0].motion.facing,1);assert.equal(g.actors[1].motion.facing,-1);
g.pause();const socialSnapshot=JSON.stringify(g.actors);advance(g,1);assert.equal(JSON.stringify(g.actors),socialSnapshot);g.pause();
g.alertCrowd(400,300);const fear=g.actors[0].motion.fear;advance(g,1.2);assert(g.actors.every(a=>a.motion.partner===null));assert(g.actors.every(a=>['startled','flee'].includes(a.motion.state)));
advance(g,20);assert(g.actors.every(a=>a.motion.fear<fear*.1),'threat memory fades');
// Ordinary unmodified crowds also form conversations, rather than only test fixtures.
g=new box.Game(seeded(13));g.mission=1;g.loadMission();g.start();let socialCount=0;
for(let i=0;i<1000;i++){g.step(.05);socialCount+=g.actors.filter(a=>a.motion.state==='social').length;}
assert(socialCount>0);
// Prediction begins before the short-range separation radius; receding walkers do not yield.
function approachingPair(){const game=new box.Game(seeded(72));game.mission=1;game.loadMission();game.start();game.actors=game.actors.slice(0,2);
 game.actors.forEach((a,i)=>{Object.assign(a,{x:350+i*65,y:300});Object.assign(a.motion,{x:a.x,y:a.y,vx:i?-24:24,vy:0,pace:24,state:'travel',timer:10,route:[],goal:{x:i?300:480,y:300}});});return game;}
g=approachingPair();g.step(.05);assert(g.actors[1].motion.yielding>0);assert(g.actors[0].motion.yielding===0);assert(Math.abs(g.actors[0].x-g.actors[1].x)>38);
g.pause();const yieldSnapshot=JSON.stringify(g.actors);advance(g,1);assert.equal(JSON.stringify(g.actors),yieldSnapshot);
g=approachingPair();g.actors.forEach((a,i)=>{a.motion.vx=i?24:-24;a.motion.goal.x=i?480:300;});g.step(.05);assert(g.actors.every(a=>a.motion.yielding===0));
// Repeated shots extend vigilance; waiting does not immediately resume a cheerful activity.
g=new box.Game(seeded(73));g.start();g.alertCrowd(450,300);const firstVigilance=g.actors[0].motion.vigilance;g.alertCrowd(450,300);
const cautious=g.actors[0];assert(cautious.motion.vigilance>firstVigilance);cautious.motion.reaction=null;g.setBehavior(cautious,'observe','look',.01);g.step(.05);assert.equal(cautious.motion.state,'observe');
advance(g,18);assert.equal(cautious.motion.alarmCount,0);assert.equal(cautious.motion.vigilance,0);
// Running intensity eases in and remains frozen when the game is paused.
g=new box.Game(seeded(74));g.mission=1;g.loadMission();g.start();g.actors=g.actors.slice(0,1);const runner=g.actors[0];
Object.assign(runner.motion,{x:400,y:300,vx:38,vy:0,state:'flee',pace:24,timer:3,escapeLeft:3,fear:1,goal:{x:500,y:300},route:[]});
g.step(.05);assert(runner.motion.runBlend>0&&runner.motion.runBlend<.4);advance(g,.5);assert(runner.motion.runBlend>.6);
g.pause();const runSnapshot=JSON.stringify(runner);advance(g,1);assert.equal(JSON.stringify(runner),runSnapshot);
// Two distinct visitor places can be reserved; a third visitor must choose elsewhere.
g=new box.Game(seeded(81));g.mission=1;g.loadMission();g.start();g.actors=g.actors.slice(0,4);g.obstacles=[];
g.actors.forEach((a,i)=>{const x=[400,330,470,400][i],y=[300,350,350,365][i];Object.assign(a,{x,y,origin:x,originY:y,hidden:false,camera:i===1});Object.assign(a.motion,{x,y,vx:0,vy:0,stationary:i===0,state:i===0?'activity':'observe',timer:100,visitCooldown:0});});
g.interests=[{id:g.actors[0].id,x:400,y:300,kind:'play'}];
assert(g.chooseInterest(g.actors[1]));assert(g.chooseInterest(g.actors[2]));assert.notEqual(g.actors[1].motion.visit.slot,g.actors[2].motion.visit.slot);assert.equal(g.chooseInterest(g.actors[3]),false);
let visited=false;for(let i=0;i<240;i++){g.step(.05);if(g.actors[1].motion.state==='visiting'){assert.equal(g.actors[1].action,'photo');visited=true;break;}}
assert(visited,'reserved destination should be reached before photography starts');
g.pause();const visitSnapshot=JSON.stringify(g.actors);advance(g,1);assert.equal(JSON.stringify(g.actors),visitSnapshot);g.pause();
g.alertCrowd(400,300);advance(g,1.5);assert(g.actors.every(a=>a.motion.visit===null),'danger releases all visitor reservations');
// Fatigue recovers through a real resting state and does not advance while paused.
g=new box.Game(seeded(82));g.mission=1;g.loadMission();g.start();g.actors=g.actors.slice(0,1);g.interests=[];
const tired=g.actors[0];Object.assign(tired.motion,{fatigue:.9,state:'activity',timer:.01,vx:0,vy:0});g.step(.05);assert.equal(tired.motion.state,'resting');assert.equal(tired.action,'rest');
g.pause();const fatigue=tired.motion.fatigue;advance(g,1);assert.equal(tired.motion.fatigue,fatigue);g.pause();advance(g,4);assert(tired.motion.fatigue<.5);
console.log('PASS: purposeful visits, reservation capacity/release, photography, fatigue/rest, predictive yielding, vigilance, routes, conversations, hit alignment, pause/flight freeze and campaign');
