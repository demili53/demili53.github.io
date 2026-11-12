const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const box=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'sniper-core.js'),'utf8')+';this.Game=SniperGame;this.ambient=sniperAmbient;',box);
const fresh=()=>new box.Game(()=>.37),advance=(g,t)=>{for(let i=0;i<Math.ceil(t/.05);i++)g.step(.05);};
// 01: malformed input must never poison the simulation or spend time/ammunition.
let g=fresh();g.start();const initial=JSON.stringify(g);for(const dt of [NaN,Infinity,-1,0,undefined])g.step(dt);
assert.equal(JSON.stringify(g),initial);assert.equal(g.aimAt(NaN,200),false);assert.equal(g.aimAt(200,Infinity),false);assert.equal(JSON.stringify(g),initial);
g.aimAt(-100,999);assert.equal(g.aim.x,25);assert.equal(g.aim.y,510);
console.log('PASS: improvement 01 input/time guards');
// 02: smooth out obsolete corners, but never shortcut through a table.
g=fresh();let a=g.actors[0];Object.assign(a.motion,{x:340,y:300});g.obstacles=[];
a.motion.route=[{x:350,y:270},{x:440,y:270},{x:460,y:300}];g.advanceRoute(a);assert.equal(a.motion.route.length,1);assert.equal(a.motion.route[0].x,460);
g.obstacles=[{x:400,y:300,rx:20,ry:20}];assert(g.planRoute(a,{x:460,y:300}));g.advanceRoute(a);assert(a.motion.route.length>1);
console.log('PASS: improvement 02 visible-waypoint shortcuts');
// 03: neither side can pull an alarmed character into a conversation.
function pair(){const game=fresh();game.start();game.actors=game.actors.slice(0,2);game.obstacles=[];game.actors.forEach((a,i)=>{Object.assign(a,{x:400+i*55,y:300,hidden:false});Object.assign(a.motion,{x:a.x,y:a.y,stationary:false,state:'activity',timer:10,socialCooldown:0});});return game;}
g=pair();g.actors[1].motion.vigilance=3;assert.equal(g.tryConversation(g.actors[0]),false);g.actors[1].motion.vigilance=0;assert(g.tryConversation(g.actors[0]));assert.equal(g.tryConversation(g.actors[1]),false);
g.actors[1].dead=true;g.step(.05);assert.notEqual(g.actors[0].motion.state,'social');assert.equal(g.actors[0].motion.partner,null);
console.log('PASS: improvement 03 reciprocal conversation guards');
// 04: a departed performer must not leave a ghost attraction or locked visitor seat.
g=pair();const host=g.actors[0],visitor=g.actors[1];g.interests=[{id:host.id,x:host.x,y:host.y,kind:'play'}];visitor.origin=visitor.x;visitor.originY=visitor.y;visitor.motion.visitCooldown=0;
host.motion.x+=40;assert.equal(g.chooseInterest(visitor),false);host.motion.x=host.x;assert(g.chooseInterest(visitor));host.motion.x+=40;g.step(.05);assert.equal(visitor.motion.visit,null);assert.equal(visitor.motion.state,'observe');
console.log('PASS: improvement 04 live attraction/seat cleanup');
// 05: tiny aim slips preserve progress; completed identities are remembered without tracking through cover.
g=fresh();a=g.actors[0];g.updateObservation(a,.6);const progress=g.identification;g.updateObservation(null,.1);assert.equal(g.inspected,null);g.updateObservation(a,.1);assert(g.identification>progress);
g.updateObservation(a,.5);assert(g.observations.has(a.id));g.updateObservation(null,.5);assert.equal(g.identification,0);g.updateObservation(a,.01);assert.equal(g.identification,1);
g.updateObservation(g.actors[1],.01);assert(g.identification<.1);g.loadMission();assert.equal(g.observations.size,0);
console.log('PASS: improvement 05 observation grace and mission memory');
// 06: skip resolves the shot once; a paused cinematic cannot be advanced.
g=fresh();g.start();g.scoped=true;a=g.actors[0];g.aimAt(a.x,a.y-24);g.shoot();g.pause();assert.equal(g.skipShot(),false);g.pause();assert(g.skipShot());assert.equal(g.state,'success');assert.equal(g.totalHits,1);const resultScore=g.score;assert.equal(g.skipShot(),false);assert.equal(g.score,resultScore);
g=fresh();g.start();g.scoped=true;g.aimAt(30,40);g.shoot();g.skipShot();assert.equal(g.state,'running');assert.equal(g.alert,24);assert.equal(g.totalShots,1);
console.log('PASS: improvement 06 cinematic skip resolves once');
// 07: results describe the current mission and cannot be awarded twice by skip/retry.
g=fresh();g.start();g.scoped=true;a=g.actors[0];g.aimAt(a.x,a.y-24);g.shoot();g.skipShot();assert.equal(g.report.grade,'S');assert.equal(g.report.shots,1);assert.equal(g.report.accuracy,100);assert.equal(g.missionHistory.length,1);
g.skipShot();assert.equal(g.missionHistory.length,1);g.next();assert.equal(g.report,null);g.start();g.scoped=true;g.aimAt(30,40);g.shoot();g.skipShot();advance(g,.2);a=g.actors[0];g.aimAt(a.x,a.y-24);g.shoot();g.skipShot();assert.equal(g.report.grade,'B');assert.equal(g.report.shots,2);assert.equal(g.missionHistory.length,2);
console.log('PASS: improvement 07 per-mission performance reports');
// 08/09 are verified by the real-browser regression: preference persistence and keyboard/focus.
// 10: ambient animation is bounded, deterministic, and disabled by the visual preference.
for(const theme of ['garden','harbor','pier','festival','station']){
 const first=JSON.stringify(box.ambient(theme,1));assert.equal(JSON.stringify(box.ambient(theme,1)),first);assert.notEqual(JSON.stringify(box.ambient(theme,2)),first);
 assert(box.ambient(theme,2).length<=12);assert.equal(box.ambient(theme,2,true).length,0);assert.equal(box.ambient(theme,NaN).length,0);
}
g=fresh();g.start();advance(g,.5);g.pause();const atmosphere=JSON.stringify(box.ambient('garden',g.elapsed));advance(g,1);assert.equal(JSON.stringify(box.ambient('garden',g.elapsed)),atmosphere);
console.log('PASS: improvement 10 bounded ambient animation and pause');
