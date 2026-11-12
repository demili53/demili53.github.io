const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const box=vm.createContext({});vm.runInContext(fs.readFileSync(__dirname+'/sniper-core.js','utf8')+';this.Game=SniperGame;',box);
const fresh=()=>new box.Game(()=>.37);
function solo(){const g=fresh();g.actors=g.actors.slice(0,1);g.obstacles=[];g.interests=[];const a=g.actors[0];Object.assign(a,{x:400,y:350,origin:400,originY:350});Object.assign(a.motion,{x:400,y:350,vx:0,vy:0,state:'activity',stationary:false,timer:100});g.random=()=>0;return g;}
// 31: curiosity affects real planned roam distance, not emergency escape distance.
let g=solo(),a=g.actors[0];a.motion.curiosity=.75;assert(g.chooseDestination(a));const cautious=a.motion.goal.x-400;a.motion.curiosity=1.25;assert(g.chooseDestination(a));assert(a.motion.goal.x-400>cautious*1.5);a.motion.curiosity=.75;g.chooseDestination(a,{x:300,y:350});const escape=JSON.stringify(a.motion.goal);a.motion.curiosity=1.25;g.chooseDestination(a,{x:300,y:350});assert.equal(JSON.stringify(a.motion.goal),escape);assert(g.actors.every(n=>n.motion.curiosity>=.75&&n.motion.curiosity<=1.25));console.log('PASS 31: personality-based roam distance and unchanged escape behavior');

// 32: reciprocal conversation breaks if a crowd movement separates or obscures partners.
function pair(){const g=fresh();g.actors=g.actors.slice(0,2);g.obstacles=[];g.actors.forEach((a,i)=>{Object.assign(a,{x:400+i*45,y:350,hidden:false});Object.assign(a.motion,{x:a.x,y:a.y,vx:0,vy:0,stationary:false,state:'activity',timer:100,socialCooldown:0});});assert(g.tryConversation(g.actors[0]));return g;}
g=pair();g.actors[1].motion.x=520;g.stepCrowd(.05);assert(g.actors.every(a=>a.motion.partner===null&&a.motion.state!=='social'));
g=pair();g.obstacles=[{x:422,y:350,rx:2,ry:12}];g.stepCrowd(.05);assert(g.actors.every(a=>a.motion.partner===null));console.log('PASS 32: separated or occluded conversations release both partners');

// 33: a highly scored unreachable point must not prevent choosing a reachable fallback.
g=solo();a=g.actors[0];a.motion.curiosity=1;g.obstacles=[{x:450,y:350,rx:10,ry:300}];let sample=0;g.random=()=>{const index=sample++;return index===0?0:index===1?1:index%2===0?.5:.1;};assert.equal(g.planRoute(a,{x:490,y:350}),false);assert(g.chooseDestination(a));assert(a.motion.goal.x<400);assert(a.motion.route.length>0);console.log('PASS 33: blocked preferred routes fall back to reachable destinations');

// 34: wait at the safer location while the home remains near a recent shot, then return.
g=solo();g.start();a=g.actors[0];a.origin=350;Object.assign(a.motion,{state:'recover',timer:0,fear:.8,threat:{x:350,y:350}});g.step(.05);assert.equal(a.motion.state,'recover');assert(a.motion.timer>1);g.pause();const snapshot=JSON.stringify(a.motion);for(let i=0;i<20;i++)g.step(.05);assert.equal(JSON.stringify(a.motion),snapshot);g.pause();a.motion.fear=.2;a.motion.timer=0;g.step(.05);assert.equal(a.motion.state,'return');assert.equal(a.motion.goal.x,350);
g=solo();g.start();a=g.actors[0];a.origin=350;Object.assign(a.motion,{state:'recover',timer:0,fear:.8,threat:{x:800,y:350}});g.step(.05);assert.equal(a.motion.state,'return');console.log('PASS 34: threat-aware home return, fading memory and pause freeze');
