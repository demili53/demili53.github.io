'use strict';
// Rules test for 들키면 재수. Run: node scripts/test-exam-sneak.cjs
const assert=require('node:assert/strict');
const E=require('./exam-core.js');
const {ExamGame,PERIODS,BASE,PLAYER,PERKS,HIDES,gradeOf}=E;
const run=(g,sec)=>{for(let i=0;i<Math.round(sec*60);i++)g.step(1/60);return g.drainEvents();};
const calm=g=>{for(const s of g.staff){s.state='desk';s.t=999;s.x=320;s.y=96;}g.schedule=[];return g;};
const begin=o=>{const g=new ExamGame({seed:11,...o});run(g,3);assert.equal(g.phase,'exam');return calm(g);};
const watch=(g,s=g.staff[0])=>{s.state='scan';s.t=999;s.sweep=0;s.x=320;s.y=96;s.dir=Math.atan2(PLAYER.y-96,PLAYER.x-320);return s;};

// Day layout: 4 periods x 15 questions, more proctors later.
assert.equal(PERIODS.length,4);assert(PERIODS.every(p=>p.q===15));assert.deepEqual(PERIODS.map(p=>p.staff.length),[1,2,2,3]);
{const g=new ExamGame({seed:1});assert.equal(g.phase,'intro');run(g,3);assert.equal(g.phase,'exam');assert.equal(g.staff.length,1);}

// AI pen solves much faster than the pencil, and only once fully out of the sleeve.
{const g=begin();g.setInput('ai',true);run(g,BASE.pull*.9);assert.equal(g.prog,0,'no solving while pulling the pen out');run(g,BASE.aiTime*3);assert(g.q>=2,`AI q ${g.q}`);
 const h=begin();h.setInput('solve',true);run(h,BASE.aiTime*3);assert.equal(h.q,0,'pencil is slow');run(h,BASE.honestTime);assert.equal(h.q,1);
 const both=begin();both.setInput('ai',true);both.setInput('solve',true);run(both,1);assert(both.part.ai>0&&both.part.honest===0,'cannot write by hand while holding the pen');}

// Hidden pen near a calm proctor: nothing happens. Pen out inside a watching cone: suspicion rises.
{const g=begin();g.setInput('ai',true);run(g,2);assert.equal(g.susp,0,'unseen use is free');
 watch(g);run(g,.5);assert(g.seenNow&&g.susp>15,`seen ${g.susp}`);const peak=g.susp;
 g.setInput('ai',false);run(g,3);assert(g.susp<peak,'hidden pen cools down');
 const a=begin();a.susp=40;a.setInput('act',true);run(a,1);const b=begin();b.susp=40;run(b,1);assert(a.susp<b.susp,'acting innocent cools faster');
 const c=begin();c.setInput('act',true);c.setInput('ai',true);run(c,1);assert.equal(c.devT,0,'acting keeps the pen hidden');}

// Suspicion 55 sends the nearest proctor to the desk; 100 means caught.
{const g=begin();g.susp=BASE.warnAt+1;const ev=run(g,.1);assert(ev.some(e=>e.type==='check'));assert.equal(g.staff[0].state,'check');
 run(g,20);assert(g.staff[0].state!=='check'&&g.checks===1,'stare finished and proctor left');assert(g.susp<BASE.warnAt,'stare cools suspicion when the pen stays hidden');
 const c=begin();c.susp=95;watch(c);c.setInput('ai',true);const ev2=run(c,12);assert.equal(c.phase,'caught');assert(ev2.some(e=>e.type==='caught'));
 const before=c.timeLeft;run(c,1);assert.equal(c.timeLeft,before,'caught freezes the rules');}

// Back-turned proctor right next to me still notices a buzzing pen unless it is silenced.
{const g=begin();const s=g.staff[0];s.state='walk';s.path=[[PLAYER.x+40,PLAYER.y]];s.x=PLAYER.x+40;s.y=PLAYER.y;s.dir=0;g.setInput('ai',true);run(g,.6);assert(g.susp>0,'noticed up close');
 const q=begin();q.perks.silent=true;const t=q.staff[0];t.state='glance';t.t=999;t.x=PLAYER.x+40;t.y=PLAYER.y;t.dir=0;q.setInput('ai',true);run(q,.6);assert.equal(q.susp,0,'silent mode');}

// Battery drains while the pen is out; at zero or during a jam the AI stops.
{const g=begin();g.battery=1;g.setInput('ai',true);run(g,2);assert.equal(g.battery,0);const q=g.q;run(g,3);assert.equal(g.q,q,'dead battery');
 const j=begin();j.fireEvent({type:'jam'});j.setInput('ai',true);run(j,3);assert.equal(j.q,0,'jammed');}

// Events: phone ring pulls proctors away, announce turns them to the speaker, sneeze draws a glance next to me.
{const g=begin();g.fireEvent({type:'phone'});assert(g.ring&&g.staff.every(s=>s.state==='rush'));run(g,8);assert(!g.ring);
 const a=begin();a.fireEvent({type:'announce'});assert(a.staff.every(s=>s.state==='listen'));
 const z=begin();z.fireEvent({type:'sneeze'});run(z,1.3);assert(z.staff[0].state==='glance');}

// Period flow: unanswered questions are guessed, perks between periods, metal detector at lunch.
{const g=begin();g.timeLeft=.01;run(g,.1);assert.equal(g.phase,'break');assert.equal(g.results[0].guess,15);assert.equal(g.offers.length,3);assert(g.offers.every(k=>PERKS[k]));
 assert(!g.choosePerk('nope'));const pick=g.offers.includes('sleeve')?'sleeve':g.offers[0];assert(g.choosePerk(pick));assert.equal(g.period,1);assert.equal(g.phase,'intro');
 run(g,3);calm(g);g.timeLeft=.01;run(g,.1);assert.equal(g.phase,'search');assert(!g.choosePerk(g.offers[0]),'hide first');
 const r=g.chooseHide('restroom');assert(r&&g.phase==='break');g.choosePerk(g.offers[0]);run(g,3);assert(g.lockDevice>15);g.setInput('ai',true);run(g,1);assert.equal(g.devT,0,'pen is in the restroom');
 calm(g);g.timeLeft=.01;run(g,.1);g.choosePerk(g.offers[0]);run(g,3);assert.equal(g.staff.length,3);calm(g);g.timeLeft=.01;const ev=run(g,.1);
 assert.equal(g.phase,'done');assert(ev.some(e=>e.type==='done'));assert.equal(g.results.length,4);assert.equal(Object.keys(g.perks).length,3);}
{let busted=0;for(let s=1;s<=200;s++){const g=new ExamGame({seed:s});g.period=1;g.phase='search';if(g.chooseHide('case').busted){busted++;assert.equal(g.startSusp,50);}}assert(busted>40&&busted<100,`case risk ${busted}/200`);}
assert.equal(HIDES.length,3);

// Perks change the numbers they promise.
{const g=begin();g.perks.sleeve=true;g.setInput('ai',true);run(g,BASE.pull*.55);assert.equal(g.devT,1);
 const t=begin(),n=begin();t.perks.turbo=true;for(const x of [t,n]){x.setInput('ai',true);run(x,6);}assert(t.q>n.q);
 const p=begin();p.choosePerk;assert.equal(new ExamGame().acc.ai,BASE.aiAcc);const v=new ExamGame();v.perks.verify=true;assert(v.acc.ai>BASE.aiAcc);}

// Grades and determinism.
assert.deepEqual([100,96,90,80,61,41,24,12,5,0].map(gradeOf),[1,1,2,3,4,5,6,7,8,9]);
{const play=seed=>{const g=new ExamGame({seed});const out=[];for(let i=0;i<60*60;i++){g.setInput('ai',i%300<150);g.step(1/60);out.push(g.susp.toFixed(3));}return out.join();};assert.equal(play(5),play(5));}

// Whole-day bots: careless cheating gets caught, careful cheating beats honest work.
{const bot=(seed,level,mode)=>{const g=new ExamGame({seed,level});let n=0;
  while(!['done','caught'].includes(g.phase)&&n++<60*60*8){
   if(g.phase==='search')g.chooseHide('sock');if(g.phase==='break')g.choosePerk(g.offers[0]);
   const danger=g.staff.some(s=>{const v=g.viewOf(s),d=Math.hypot(PLAYER.x-s.x,PLAYER.y-s.y);return ['tell','turn','peektell','check','stare'].includes(s.state)||d<90||(v&&d<v.range*1.15&&Math.abs(E.angNorm(Math.atan2(PLAYER.y-s.y,PLAYER.x-s.x)-s.dir))<v.fov+.3);});
   if(mode==='greedy')g.setInput('ai',true);else if(mode==='honest')g.setInput('solve',true);
   else{g.setInput('ai',!danger&&g.battery>0);g.setInput('solve',danger||g.battery<=0);}
   g.step(1/30);g.drainEvents();}
  return g.summary();};
 for(const level of [0,1,2]){const greedy=bot(3,level,'greedy');assert(greedy.caught,'greedy is caught');
  let careful=0,honest=0;for(let s=1;s<=8;s++){const c=bot(s*31,level,'careful');assert(!c.caught,`careful bot caught at level ${level} seed ${s}`);careful+=c.correct;honest+=bot(s*31,level,'honest').correct;}
  assert(careful>honest*1.3,`careful ${careful} vs honest ${honest}`);}}

console.log('PASS: day layout, AI vs pencil, sight cones and suspicion, act, desk check, caught, proximity/silent, battery/jam, events, period flow, lunch search, perks, grades, determinism, bot balance');
