'use strict';
// 들키면 재수 — pure rules. No DOM. Node: require('./exam-core.js'); browser: window.ExamCore.
// Fiction: a comedy stealth game about a made-up "AI pen" on a made-up exam day.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ExamCore=api;})(typeof self!=='undefined'?self:this,function(){

const W=640,H=720,COLS=5,ROWS=5;
const deskX=c=>80+c*120,deskY=r=>200+r*96;
const SEAT={r:3,c:2};
const PLAYER={x:deskX(SEAT.c),y:deskY(SEAT.r)+16};
const AISLES=[22,140,260,380,500,618];
const FRONT_Y=128,BACK_Y=672;
const DOOR={x:634,y:300};
const SPEAKER={x:40,y:30};
const PERIODS=[
 {name:'국어',q:15,time:80,staff:['chief']},
 {name:'수학',q:15,time:85,staff:['chief','roam']},
 {name:'영어',q:15,time:80,staff:['chief','roam']},
 {name:'한국사·탐구',q:15,time:80,staff:['chief','roam','door']}
];
const LEVELS=[
 {name:'느긋한 감독관',gain:.7,speed:.85,range:.9,calm:1.25},
 {name:'보통',gain:1,speed:1,range:1,calm:1},
 {name:'매의 눈',gain:1.3,speed:1.15,range:1.1,calm:.85}
];
const BASE={honestTime:7.5,aiTime:2.1,honestAcc:.4,aiAcc:.9,guess:.2,pull:.35,hide:.22,battery:100,drainOut:1.2,drainUse:2,recharge:40,decay:5,actDecay:13,gain:70,warnAt:55};
const PERKS={
 silent:{name:'무음 진동 모드',desc:'감독관이 바로 옆을 지나도 기기 소리·불빛을 눈치채지 못합니다.'},
 sleeve:{name:'소매 속 거치대',desc:'기기를 꺼내고 숨기는 시간이 절반이 됩니다.'},
 turbo:{name:'고속 추론 칩',desc:'AI가 문제를 30% 더 빨리 풉니다.'},
 verify:{name:'검산 모드',desc:'AI 정답률 +6%. 자신만만하게 틀리는 일이 줄어듭니다.'},
 powerbank:{name:'초소형 보조배터리',desc:'배터리를 40 채우고 최대치가 30 늘어납니다.'},
 poker:{name:'포커페이스',desc:'의심도가 1.6배 빨리 가라앉습니다.'},
 radar:{name:'눈치 9단',desc:'감독관이 고개를 들기 전 신호가 더 일찍 보입니다.'},
 study:{name:'벼락치기 효과',desc:'직접 풀기가 35% 빨라지고 정답률 +15%.'},
 guess:{name:'찍기의 신',desc:'못 푼 문제를 찍을 때 정답 확률이 20%에서 40%로.'},
 cover:{name:'지우개 커버',desc:'기기를 들켜도 의심도가 30% 덜 오릅니다.'},
 actor:{name:'연기파 수험생',desc:'시치미 떼기 효과가 두 배가 됩니다.'}
};
const HIDES=[
 {id:'case',name:'필통 속 지우개인 척',risk:.35,note:'걸릴 확률 35%'},
 {id:'sock',name:'양말 속에 쏙',risk:.18,note:'걸릴 확률 18% · 땀 때문에 배터리 −20'},
 {id:'restroom',name:'화장실 휴지통 뒤',risk:.05,note:'걸릴 확률 5% · 3교시 처음 20초 동안 기기 없음'}
];
const GRADES=[96,89,77,60,40,23,11,4,0];

function rng(seed){let s=(seed>>>0)||1;return()=>{s^=s<<13;s>>>=0;s^=s>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const angNorm=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
function gradeOf(pct){for(let i=0;i<GRADES.length;i++)if(pct>=GRADES[i])return i+1;return 9;}

class ExamGame{
 constructor(o={}){
  this.seed=o.seed??(Date.now()&0xffffff);this.rand=rng(this.seed);this.level=clamp(o.level??1,0,2);this.L=LEVELS[this.level];
  this.period=0;this.perks={};this.batteryMax=BASE.battery;this.battery=BASE.battery;this.results=[];this.score=0;this.checks=0;this.caughtTimes=0;
  this.events=[];this.input={ai:false,solve:false,act:false};this.time=0;this.phase='intro';this.introT=2.4;this.startSusp=0;this.lockDevice=0;
  this.setupPeriod();
 }
 emit(type,data={}){this.events.push({type,...data});}
 drainEvents(){const e=this.events;this.events=[];return e;}
 has(p){return !!this.perks[p];}
 setupPeriod(){
  const P=PERIODS[this.period];this.P=P;this.timeLeft=P.time;this.q=0;this.prog=0;this.part={honest:0,ai:0};this.answers=[];
  this.susp=this.startSusp;this.startSusp=0;this.devT=0;this.jam=0;this.endT=0;this.periodChecks=0;this.ring=null;this.sneeze=null;this.checkCd=0;this.seenNow=false;this.spotted=0;
  this.staff=P.staff.map((k,i)=>this.makeStaff(k,i));this.schedule=this.makeSchedule();
 }
 makeStaff(kind,i){
  const s={id:i,kind,dir:Math.PI/2,state:'desk',t:3+this.rand()*3,path:[],sweep:0,bubble:'',tell:0,stare:null};
  if(kind==='chief'){s.x=320;s.y=96;s.name='정감독';}
  else if(kind==='roam'){s.x=AISLES[0];s.y=BACK_Y;s.name='부감독';s.state='walk';s.path=this.patrolPath(s);}
  else{s.x=DOOR.x+30;s.y=DOOR.y;s.dir=Math.PI;s.name='복도 감독';s.state='away';s.t=6+this.rand()*4;}
  return s;
 }
 patrolPath(s){
  // Walk only along aisles: reach the nearer end (front/back) on the current x, cross, go down/up another aisle.
  const pts=[],mid=(FRONT_Y+BACK_Y)/2;let y=s.y<mid?FRONT_Y:BACK_Y;
  const onAisle=AISLES.some(x=>Math.abs(x-s.x)<6);
  if(Math.abs(s.y-y)>4&&onAisle)pts.push([s.x,y]);
  const a=AISLES.filter(x=>Math.abs(x-s.x)>10),x1=a[Math.floor(this.rand()*a.length)];
  pts.push([x1,y]);y=y===FRONT_Y?BACK_Y:FRONT_Y;pts.push([x1,y]);
  if(this.rand()<.5){const a2=AISLES.filter(x=>x!==x1),x2=a2[Math.floor(this.rand()*a2.length)];pts.push([x2,y]);}
  return pts;
 }
 makeSchedule(){
  const pool=['phone','announce','doze','jam','sneeze'],T=this.P.time,list=[],n=2+(this.period>=2?1:0);
  for(let i=0;i<n;i++){const t=T*(.2+.65*(i+this.rand()*.8)/n);list.push({at:T-t,type:pool[Math.floor(this.rand()*pool.length)],done:false});}
  if(this.period===0)list[0].type='announce';
  return list;
 }
 get acc(){return{honest:clamp(BASE.honestAcc+(this.has('study')?.15:0),0,1),ai:clamp(BASE.aiAcc+(this.has("verify")?.06:0),0,.97)};}
 get devOut(){return this.devT>.15;}
 get aiReady(){return this.devT>=1&&this.battery>0&&this.jam<=0&&this.phase==='exam';}
 start(){if(this.phase==='intro'){this.phase='exam';this.emit('periodStart',{period:this.period,name:this.P.name});}}
 sees(s){
  const view=this.viewOf(s);if(!view)return 0;
  const dx=PLAYER.x-s.x,dy=PLAYER.y-s.y,d=Math.hypot(dx,dy);
  if(d<64&&!this.has('silent')&&s.state!=='doze')return .55;
  if(d>view.range*this.L.range)return 0;
  if(Math.abs(angNorm(Math.atan2(dy,dx)-s.dir))>view.fov)return 0;
  return clamp(1.2-d/(view.range*this.L.range)*.6,.4,1.2);
 }
 viewOf(s){
  switch(s.state){
   case 'desk':return{fov:.32,range:150};
   case 'tell':return{fov:.32,range:150};
   case 'scan':return{fov:.62,range:620};
   case 'walk':case 'turn':return{fov:.6,range:270};
   case 'check':return{fov:.6,range:280};
   case 'stare':return{fov:.9,range:260};
   case 'peek':return{fov:.5,range:420};
   case 'listen':return{fov:.25,range:120};
   case 'return':return{fov:.5,range:200};
   case 'rush':return{fov:.4,range:160};
   case 'glance':return{fov:.5,range:300};
   default:return null;
  }
 }
 moveTo(s,x,y,sp,dt){const dx=x-s.x,dy=y-s.y,d=Math.hypot(dx,dy);if(d<1)return true;const k=Math.min(1,sp*dt/d);s.x+=dx*k;s.y+=dy*k;s.dir=Math.atan2(dy,dx);return d<=sp*dt;}
 turnTo(s,a,rate,dt){const d=angNorm(a-s.dir),m=rate*dt;s.dir=angNorm(s.dir+(Math.abs(d)<=m?d:Math.sign(d)*m));}
 tellTime(){return(this.has('radar')?1.5:.9)*this.L.calm;}
 staffStep(s,dt){
  const sp=48*this.L.speed*(1+this.period*.06);s.t-=dt;s.bubble='';
  switch(s.state){
   case 'desk':s.dir=Math.PI/2;if(s.t<=0){s.state='tell';s.t=this.tellTime();}break;
   case 'tell':s.bubble='!';if(s.t<=0){s.state='scan';s.t=3+this.rand()*2.5;s.sweep=this.rand()*6;this.emit('look',{who:s.name});}break;
   case 'scan':s.sweep+=dt*.9;s.dir=Math.PI/2+Math.sin(s.sweep)*.75;s.bubble='👀';
    if(s.t<=0){if(this.rand()<.35&&this.period>0){s.state='walk';s.path=this.patrolPath(s);}else{s.state='return';}}break;
   case 'return':if(this.moveTo(s,320,96,sp,dt)){s.state='desk';s.t=(4+this.rand()*4)*this.L.calm;}break;
   case 'walk':{
    if(!s.path.length){if(s.kind==='chief'){s.state='return';break;}s.path=this.patrolPath(s);}
    const [x,y]=s.path[0];s.sweep+=dt*1.6;
    if(this.moveTo(s,x,y,sp,dt)){s.path.shift();if(this.rand()<.3){s.state='turn';s.t=this.tellTime();s.turnTo=s.dir+Math.PI;}}
    else s.dir+=Math.sin(s.sweep)*.35;
    if(s.kind==='roam'&&this.rand()<dt*.04){s.state='turn';s.t=this.tellTime();s.turnTo=s.dir+Math.PI;}
    break;}
   case 'turn':s.bubble='?';if(s.t<=0){s.state='glance';s.t=1.6+this.rand();s.dir=angNorm(s.turnTo);}break;
   case 'glance':s.bubble='👀';if(s.t<=0){s.state='walk';}break;
   case 'away':s.x=DOOR.x+30;if(s.t<=0){s.state='peektell';s.t=this.tellTime();}break;
   case 'peektell':s.x=DOOR.x+14;s.bubble='!';if(s.t<=0){s.state='peek';s.t=2.5+this.rand()*2;s.x=DOOR.x;s.sweep=0;}break;
   case 'peek':s.sweep+=dt;s.dir=Math.PI+Math.sin(s.sweep*1.3)*.5;s.bubble='👀';if(s.t<=0){s.state='away';s.t=(6+this.rand()*6)*this.L.calm;}break;
   case 'check':{const tx=AISLES[3],ty=PLAYER.y;s.bubble='?';if(this.moveTo(s,tx,ty,sp*1.25,dt)){s.state='stare';s.t=3.4;this.emit('stare',{who:s.name});}break;}
   case 'stare':s.bubble='❗';this.turnTo(s,Math.atan2(PLAYER.y-s.y,PLAYER.x-s.x),4,dt);
    if(s.t<=0){this.susp=Math.max(0,this.susp-22);s.state=s.kind==='chief'?'return':'walk';s.path=s.kind==='roam'?this.patrolPath(s):[];this.emit('stareEnd',{who:s.name});}break;
   case 'rush':{const tg=this.ring;if(!tg||s.t<=0){s.state=s.kind==='chief'?'return':(s.kind==='door'?'away':'walk');s.t=4;s.path=s.kind==='roam'?this.patrolPath(s):[];break;}
    if(s.kind==='door'){s.state='away';break;}
    const tx=AISLES[tg.c<2?tg.c:tg.c+1],ty=deskY(tg.r);if(this.moveTo(s,tx,ty,sp*1.6,dt))s.dir=Math.atan2(deskY(tg.r)-s.y,deskX(tg.c)-s.x);s.bubble='💢';break;}
   case 'listen':s.bubble='🔊';this.turnTo(s,Math.atan2(SPEAKER.y-s.y,SPEAKER.x-s.x),5,dt);if(s.t<=0){s.state=s.kind==='chief'?'return':(s.kind==='door'?'away':'walk');s.t=5;}break;
   case 'doze':s.bubble='💤';s.dir=Math.PI/2+.2;if(s.t<=0){s.state='tell';s.t=.6;}break;
  }
 }
 fireEvent(ev){
  const staff=this.staff;
  switch(ev.type){
   case 'phone':{const seats=[];for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)if(!(r===SEAT.r&&c===SEAT.c)&&(Math.abs(r-SEAT.r)+Math.abs(c-SEAT.c))>1)seats.push({r,c});
    this.ring=seats[Math.floor(this.rand()*seats.length)];this.ring.t=7;staff.forEach(s=>{if(s.state!=='stare'&&s.state!=='check'){s.state='rush';s.t=7;}});this.emit('event',{kind:'phone',text:'📱 누군가의 휴대폰이 울렸다! 감독관들이 그쪽으로 달려간다.'});break;}
   case 'announce':staff.forEach(s=>{if(s.state!=='stare'&&s.state!=='check'){s.state='listen';s.t=3.6;}});this.emit('event',{kind:'announce',text:'🔊 "종료 시각을 알려 드립니다…" 모두 스피커를 본다.'});break;
   case 'doze':{const c=staff.find(s=>s.kind==='chief');if(c&&(c.state==='desk'||c.state==='tell')){c.state='doze';c.t=5;this.emit('event',{kind:'doze',text:'💤 정감독이 꾸벅꾸벅 존다.'});}else this.fireEvent({type:'announce'});break;}
   case 'jam':this.jam=7;this.emit('event',{kind:'jam',text:'📡 전파 점검 중! 잠시 AI가 연결되지 않는다.'});break;
   case 'sneeze':{const c=SEAT.c+(this.rand()<.5?-1:1);this.sneeze={r:SEAT.r,c,t:1.2,phase:'tell'};this.emit('event',{kind:'sneeze',text:'🤧 옆자리 "에…에…" 감독관이 곧 이쪽을 본다!'});break;}
  }
 }
 setInput(k,v){this.input[k]=!!v;}
 step(dt){
  if(dt>.1)dt=.1;this.time+=dt;
  if(this.phase==='intro'){this.introT-=dt;if(this.introT<=0)this.start();return;}
  if(this.phase!=='exam')return;
  const inp=this.input;
  // events
  for(const ev of this.schedule)if(!ev.done&&this.timeLeft<=ev.at){ev.done=true;this.fireEvent(ev);}
  if(this.ring){this.ring.t-=dt;if(this.ring.t<=0)this.ring=null;}
  if(this.sneeze){const z=this.sneeze;z.t-=dt;if(z.t<=0&&z.phase==='tell'){z.phase='go';z.t=2;this.emit('sneeze');
    let best=null,bd=1e9;for(const s of this.staff){if(s.kind==='door'||s.state==='stare'||s.state==='check')continue;const d=Math.hypot(s.x-deskX(z.c),s.y-deskY(z.r));if(d<bd){bd=d;best=s;}}
    if(best){best.state='glance';best.t=2;best.dir=Math.atan2(deskY(z.r)-best.y,deskX(z.c)-best.x);}}
   else if(z.t<=0)this.sneeze=null;}
  if(this.jam>0)this.jam-=dt;if(this.lockDevice>0)this.lockDevice-=dt;
  for(const s of this.staff)this.staffStep(s,dt);
  // device
  const wantOut=inp.ai&&!inp.act&&this.lockDevice<=0;
  const pull=BASE.pull*(this.has('sleeve')?.5:1),hide=BASE.hide*(this.has('sleeve')?.5:1);
  const wasOut=this.devOut;
  this.devT=clamp(this.devT+(wantOut?dt/pull:-dt/hide),0,1);
  if(this.devOut&&!wasOut)this.emit('deviceOut');if(!this.devOut&&wasOut)this.emit('deviceIn');
  if(this.devT>0)this.battery=Math.max(0,this.battery-dt*(this.aiReady&&inp.ai?BASE.drainUse:BASE.drainOut));
  if(this.battery<=0&&this.devT>0&&!this.batteryWarned){this.batteryWarned=true;this.emit('battery');}
  // solving
  if(this.q<this.P.q){
   if(this.aiReady&&inp.ai){const r=dt/(BASE.aiTime*(this.has('turbo')?.7:1));this.prog+=r;this.part.ai+=r;}
   else if(inp.solve&&!inp.act&&this.devT===0){const r=dt/(BASE.honestTime*(this.has('study')?.65:1));this.prog+=r;this.part.honest+=r;}
   if(this.prog>=1){const tot=this.part.ai+this.part.honest,acc=(this.part.ai*this.acc.ai+this.part.honest*this.acc.honest)/tot;
    const method=this.part.ai>=this.part.honest?'ai':'honest',correct=this.rand()<acc;this.answers.push({method,correct,mark:1+Math.floor(this.rand()*5)});
    this.emit('answer',{q:this.q,method,mark:this.answers[this.q].mark});this.q++;this.prog=0;this.part={honest:0,ai:0};
    if(this.q>=this.P.q){this.endT=1.2;this.emit('allDone');}}
  }
  // suspicion
  let seen=0;for(const s of this.staff){const v=this.sees(s);if(v>seen)seen=v;}
  this.seenNow=seen>0;
  if(seen&&this.devOut){const g=BASE.gain*seen*this.L.gain*(this.has('cover')?.7:1)*(this.devT>=1?1:.6);this.susp+=g*dt;this.spotted=.3;}
  else{let d=0;if(!this.devOut)d+=BASE.decay;if(inp.act&&!this.devOut)d+=BASE.actDecay*(this.has('actor')?2:1)*(seen?1.3:1);this.susp-=d*(this.has('poker')?1.6:1)*dt;}
  if(this.spotted>0)this.spotted-=dt;
  this.susp=clamp(this.susp,0,100);
  if(this.susp>=100){this.caught();return;}
  if(this.checkCd>0)this.checkCd-=dt;
  if(this.susp>=BASE.warnAt&&this.checkCd<=0&&!this.staff.some(s=>s.state==='check'||s.state==='stare')){
   let best=null,bd=1e9;for(const s of this.staff){if(s.kind==='door')continue;const d=Math.hypot(s.x-PLAYER.x,s.y-PLAYER.y);if(d<bd){bd=d;best=s;}}
   if(best){best.state='check';this.checkCd=6;best.path=[];this.checks++;this.periodChecks++;this.emit('check',{who:best.name});}
  }
  // clock
  this.timeLeft-=dt;
  if(this.endT>0){this.endT-=dt;if(this.endT<=0)this.finishPeriod();}
  else if(this.timeLeft<=0){this.timeLeft=0;this.finishPeriod();}
 }
 caught(){this.phase='caught';this.devT=1;this.caughtTimes++;this.emit('caught',{period:this.period});}
 finishPeriod(){
  const guessRate=this.has('guess')?.4:BASE.guess;
  while(this.answers.length<this.P.q){this.answers.push({method:'guess',correct:this.rand()<guessRate,mark:1+Math.floor(this.rand()*5)});}
  const correct=this.answers.filter(a=>a.correct).length,ai=this.answers.filter(a=>a.method==='ai').length,honest=this.answers.filter(a=>a.method==='honest').length;
  const timeBonus=Math.round(Math.max(0,this.timeLeft)*10),clean=this.periodChecks===0?500:0;
  const pts=correct*100+timeBonus+clean;this.score+=pts;
  this.results.push({name:this.P.name,correct,total:this.P.q,ai,honest,guess:this.P.q-ai-honest,checks:this.periodChecks,pts});
  this.emit('periodEnd',{period:this.period,correct,pts});
  this.devT=0;this.input={ai:false,solve:false,act:false};
  if(this.period>=PERIODS.length-1){this.phase='done';this.emit('done',this.summary());return;}
  this.battery=Math.min(this.batteryMax,this.battery+BASE.recharge);this.batteryWarned=false;
  this.offers=this.makeOffers();this.phase=this.period===1?'search':'break';
 }
 makeOffers(){const left=Object.keys(PERKS).filter(k=>!this.perks[k]);const out=[];while(out.length<3&&left.length)out.push(left.splice(Math.floor(this.rand()*left.length),1)[0]);return out;}
 chooseHide(id){
  if(this.phase!=='search')return null;const h=HIDES.find(x=>x.id===id);if(!h)return null;
  const busted=this.rand()<h.risk;if(id==='sock')this.battery=Math.max(0,this.battery-20);if(id==='restroom')this.lockDevice=20;
  if(busted)this.startSusp=50;this.phase='break';this.emit('search',{id,busted});return{busted};
 }
 choosePerk(id){
  if(this.phase!=='break'||!this.offers.includes(id))return false;this.perks[id]=true;
  if(id==='powerbank'){this.batteryMax+=30;this.battery=Math.min(this.batteryMax,this.battery+40);}
  this.emit('perk',{id});this.period++;this.phase='intro';this.introT=2.4;this.setupPeriod();return true;
 }
 summary(){
  const total=this.results.reduce((a,r)=>a+r.total,0)||1,correct=this.results.reduce((a,r)=>a+r.correct,0),ai=this.results.reduce((a,r)=>a+r.ai,0);
  const honest=this.results.reduce((a,r)=>a+r.honest,0),pct=correct/total*100;return{correct,total,pct,grade:gradeOf(pct),score:this.score,checks:this.checks,aiShare:ai/total,honestShare:honest/total,caught:this.phase==='caught'};
 }
}

return{W,H,COLS,ROWS,SEAT,PLAYER,AISLES,FRONT_Y,BACK_Y,DOOR,SPEAKER,PERIODS,LEVELS,BASE,PERKS,HIDES,deskX,deskY,gradeOf,angNorm,ExamGame};
});
