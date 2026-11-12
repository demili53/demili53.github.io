/* Fictional hidden-character arcade missions. */
'use strict';
function makeWillyCrowd(stage){
 const roles=[
 {role:'선원',coat:0x669ab5,hat:'sailor',desc:'선원 모자 · 파란 외투'},
 {role:'요리사',coat:0xe6d8ba,hat:'chef',desc:'높은 요리사 모자 · 흰 앞치마'},
 {role:'화가',coat:0xb398ca,hat:'beret',case:true,desc:'보라 베레모 · 화구 가방'},
 {role:'관광객',coat:0xebbd78,hat:'sunhat',camera:true,desc:'밀짚모자 · 카메라'},
 {role:'정비사',coat:0xd79268,helmet:true,desc:'노란 안전모 · 주황 작업복'},
 {role:'광대',coat:0x7fb3aa,hat:'clown',desc:'무지개 머리 · 초록 의상'},
 {role:'탐험가',coat:0x9aa16a,hat:'explorer',case:true,desc:'탐험 모자 · 갈색 가방'},
 {role:'음악가',coat:0x6a84b5,hat:'tophat',instrument:true,desc:'높은 검은 모자 · 악기'},
 {role:'우편배달부',coat:0x8499ae,cap:true,case:true,desc:'푸른 모자 · 우편 가방'},
 {role:'스키어',coat:0xe7a7aa,visor:true,desc:'분홍 외투 · 초록 고글'},
 {role:'줄무늬 관광객',coat:0xca727a,stripes:true,hat:'sunhat',glasses:true,desc:'빨강 줄무늬 · 밀짚모자 · 안경'},
 {role:'빨간 모자 관광객',coat:0x7fa0b4,hat:'beanie',glasses:true,desc:'빨간 털모자 · 파란 옷 · 안경'},
 {role:'닮은 관광객',coat:0xd4656a,stripes:true,hat:'beanie',glasses:true,desc:'빨강 줄무늬 · 빨간 털모자 · 안경 · 가방과 스카프 없음'},
 {role:'정원사',coat:0x79a573,hat:'garden',desc:'초록 챙모자 · 멜빵 작업복'},
 {role:'독서가',coat:0xb889ad,hat:'beret',glasses:true,desc:'자주색 외투 · 책 · 베레모'},
 {role:'낚시꾼',coat:0xc6a16b,hat:'fisher',desc:'갈색 낚시 모자 · 낚싯대'},
 {role:'풍선 상인',coat:0xeab27c,hat:'boater',desc:'리본 모자 · 색색의 풍선'},
 {role:'과학자',coat:0xe0e9df,glasses:true,hat:'none',desc:'흰 실험 가운 · 확대경'},
 {role:'운동선수',coat:0x65babc,hat:'headband',desc:'청록 운동복 · 흰 머리띠'},
 {role:'드러머',coat:0xc78594,hat:'band',desc:'군악대 모자 · 작은 북'},
 {role:'제빵사',coat:0xe3c8a4,hat:'baker',desc:'갈색 앞치마 · 둥근 제빵 모자'}];
 const cols=[9,11,13,12,13,14][stage],rows=[3,4,4,4,4,4][stage],gap=820/(cols-1),people=[];
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const i=row*cols+col,role=roles[(i*5+stage*3)%roles.length];people.push({...role,x:70+col*gap+(i*11%17)-8,y:(stage===0?265+row*94:196+row*89)+(i*17%23)-11,range:4+(i*7%8),speed:.16+(i%4)*.05,skin:[0xe6c6a2,0xbe917a,0x947767,0xf2d4b5][i%4]});}
 const slot=people.splice([15,28,20,31,35,43][stage],1)[0];
 return {extras:people,position:slot};
}
const SNIPER_MISSIONS = [
 {name:'북적이는 항구 시장',code:'01 / HARBOR MARKET',theme:'harbor',time:100,color:0x8fbdc8,accent:0xf5ba83,brief:'항구 시장의 사람들 속에서 윌리를 찾아보세요. 빨강·흰 줄무늬 옷, 빨간 털모자, 둥근 안경에 검은 가방까지 모두 확인해야 합니다.',clues:['빨강·흰 줄무늬 + 빨간 털모자','둥근 안경','검은 서류 가방'],targets:[],extras:[]},
 {name:'한밤의 별빛 축제',code:'02 / STARLIGHT FESTIVAL',theme:'festival',time:110,color:0x302b59,accent:0xe2b2ec,brief:'불빛과 공연으로 가득한 축제에서 윌리를 찾아보세요. 이번에는 줄무늬 옷과 빨간 털모자, 둥근 안경에 노란 스카프를 두르고 있습니다. 닮은 관광객에게 주의하세요.',clues:['빨강·흰 줄무늬 + 빨간 털모자','둥근 안경','노란 스카프'],targets:[],extras:[]},
 {name:'눈꽃 산장 마을',code:'03 / SNOWY VILLAGE',theme:'snow',time:120,color:0x9bb6cf,accent:0xb5e7e1,brief:'눈 내리는 산장 마을에 윌리가 숨어 있습니다. 빨간 줄무늬 옷과 털모자, 안경, 초록 스카프를 찾아보세요. 때때로 이동식 가림막 뒤에 숨으니 모습을 드러낼 때를 기다리세요.',clues:['빨강·흰 줄무늬 + 빨간 털모자','둥근 안경','초록 스카프 · 가림막 주의'],targets:[],extras:[]}
];
SNIPER_MISSIONS.push(
 {name:'햇살 가득 식물원',code:'04 / BOTANICAL GARDEN',theme:'garden',time:125,color:0xb2d4bb,accent:0xe5c583,brief:'온실과 화단 사이에서 윌리를 찾으세요. 정원사와 독서가, 나비를 관찰하는 과학자가 모였습니다. 파란 스카프를 확인하세요.',clues:['빨강·흰 줄무늬 + 빨간 털모자','둥근 안경','파란 스카프']},
 {name:'노을빛 해변 산책로',code:'05 / SUNSET PIER',theme:'pier',time:130,color:0xe8b99e,accent:0xf2d38b,brief:'노을이 지는 해변 산책로에서 윌리를 찾으세요. 낚시와 풍선, 북 연주에 시선을 빼앗기지 마세요. 보라 스카프가 마지막 단서입니다.',clues:['빨강·흰 줄무늬 + 빨간 털모자','둥근 안경','보라 스카프']},
 {name:'분주한 중앙역',code:'06 / CENTRAL STATION',theme:'station',time:140,color:0x9eafba,accent:0xe7bd72,brief:'열차가 도착한 중앙역에서 마지막 윌리를 찾으세요. 책을 읽는 승객과 빵을 만드는 상인 사이, 주황 스카프를 찾아보세요.',clues:['빨강·흰 줄무늬 + 빨간 털모자','둥근 안경','주황 스카프']}
);
SNIPER_MISSIONS.forEach((m,i)=>{const c=makeWillyCrowd(i);m.extras=c.extras;m.targets=[{...c.position,role:'윌리',coat:0xd85b61,stripes:true,hat:'beanie',glasses:true,case:i===0,scarf:[null,0xf5d16a,0x6ed2a3,0x6ba8e5,0xbc91d9,0xf1a261][i],camera:false,instrument:false,visor:false,helmet:false,cap:false,cover:i===2,desc:m.clues.join(' · '),target:true}];});
// Activity poses drive both movement and rendering, so visible bodies and hit tests stay together.
function sniperActivity(actor,theme){
 const byTheme={
  harbor:{'선원':'carry','요리사':'cook','화가':'paint','관광객':'photo','정비사':'repair','광대':'juggle','탐험가':'shop','음악가':'play','우편배달부':'walk','스키어':'sip','줄무늬 관광객':'photo','빨간 모자 관광객':'shop','닮은 관광객':'talk','윌리':'walk'},
  festival:{'선원':'clap','요리사':'serve','화가':'paint','관광객':'photo','정비사':'repair','광대':'juggle','탐험가':'dance','음악가':'play','우편배달부':'dance','스키어':'clap','줄무늬 관광객':'photo','빨간 모자 관광객':'sip','닮은 관광객':'wave','윌리':'dance'},
  snow:{'선원':'shovel','요리사':'serve','화가':'paint','관광객':'photo','정비사':'shovel','광대':'snowman','탐험가':'skate','음악가':'play','우편배달부':'walk','스키어':'ski','줄무늬 관광객':'snowman','빨간 모자 관광객':'sip','닮은 관광객':'wave','윌리':'walk'}
 };const newRoles={'정원사':'water','독서가':'read','낚시꾼':'fish','풍선 상인':'balloon','과학자':'inspect','운동선수':'stretch','드러머':'drum','제빵사':'knead'};
 return newRoles[actor.role]||(byTheme[theme]||byTheme[theme==='pier'?'harbor':'festival'])[actor.role]||'walk';
}
const sniperClamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function sniperAmbient(theme,time,reduced=false){
 if(reduced||!Number.isFinite(time))return [];
 if(theme==='garden')return Array.from({length:7},(_,i)=>({kind:'butterfly',x:85+i*125+Math.sin(time*.65+i)*17,y:116+Math.cos(time*.9+i*2)*12,wing:2+Math.abs(Math.sin(time*6+i))*3,color:i%2?0xefca82:0xcda5c9}));
 if(theme==='harbor'||theme==='pier')return Array.from({length:10},(_,i)=>({kind:'water',x:(30+i*97+time*6)%940,y:(theme==='pier'?115:145)+i%3*10,alpha:.15+(Math.sin(time*1.5+i)+1)*.16}));
 if(theme==='festival')return Array.from({length:12},(_,i)=>({kind:'light',x:15+i*76,y:20+(15+i*76)/38,alpha:.08+(Math.sin(time*1.1+i)+1)*.08}));
 if(theme==='station')return Array.from({length:4},(_,i)=>({kind:'signal',x:400+i*22,y:45,alpha:.3+(Math.sin(time*.8+i)+1)*.3}));
 return [];
}
// Ground footprints of the tables, planters and benches drawn by buildCity.
function sniperObstacles(theme){
 if(theme==='harbor')return Array.from({length:5},(_,i)=>{const x=120+i*170,y=298+(i%2)*94;return[{x,y,rx:26,ry:14},{x:x+49,y,rx:13,ry:16}];}).flat();
 if(theme==='snow')return Array.from({length:4},(_,i)=>({x:140+i*215,y:222+(i%3)*89,rx:22,ry:14}));
 if(['garden','pier','station'].includes(theme))return Array.from({length:4},(_,i)=>({x:150+i*220,y:245+(i%2)*160,rx:theme==='garden'?30:23,ry:theme==='garden'?19:12}));
 return [];
}
// Visibility graph paths go around inflated ground footprints, not through furniture.
function sniperClearPath(from,to,obstacles){
 return !obstacles.some(o=>{
  let enter=0,leave=1;
  for(const [axis,radius] of [['x',o.rx+14],['y',o.ry+10]]){
   const delta=to[axis]-from[axis],min=o[axis]-radius,max=o[axis]+radius;
   if(Math.abs(delta)<1e-8){if(from[axis]<=min||from[axis]>=max)return false;}
   else{let a=(min-from[axis])/delta,b=(max-from[axis])/delta;if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);leave=Math.min(leave,b);if(enter>=leave)return false;}
  }
  return enter<leave&&leave>0&&enter<1;
 });
}
function sniperRoute(from,to,obstacles,minY){
 if(sniperClearPath(from,to,obstacles))return [{...to}];
 const nodes=[{x:from.x,y:from.y},{...to}];
 for(const o of obstacles)for(const sx of [-1,1])for(const sy of [-1,1]){
  const p={x:o.x+sx*(o.rx+16),y:o.y+sy*(o.ry+12)};
  if(p.x>=48&&p.x<=912&&p.y>=minY&&p.y<=498&&sniperClearPath(p,p,obstacles))nodes.push(p);
 }
 const costs=nodes.map(()=>Infinity),previous=nodes.map(()=>-1),visited=new Set();costs[0]=0;
 for(let step=0;step<nodes.length;step++){
  let current=-1;for(let i=0;i<nodes.length;i++)if(!visited.has(i)&&(current<0||costs[i]<costs[current]))current=i;
  if(current<0||!Number.isFinite(costs[current]))break;if(current===1){const route=[];for(let i=1;i!==0;i=previous[i])route.unshift(nodes[i]);return route;}
  visited.add(current);
  for(let next=0;next<nodes.length;next++)if(!visited.has(next)&&sniperClearPath(nodes[current],nodes[next],obstacles)){
   const cost=costs[current]+Math.hypot(nodes[current].x-nodes[next].x,nodes[current].y-nodes[next].y);
   if(cost<costs[next]){costs[next]=cost;previous[next]=current;}
  }
 }
 return [];
}
function sniperCollisionCourse(position,velocity,neighbor){
 const rx=neighbor.x-position.x,ry=neighbor.y-position.y,vx=velocity.x-neighbor.vx,vy=velocity.y-neighbor.vy,v2=vx*vx+vy*vy;
 if(v2<1)return null;
 const time=(rx*vx+ry*vy)/v2;
 if(time<=0||time>1.6)return null;
 const clearance=Math.hypot(rx-vx*time,(ry-vy*time)*1.4);
 return clearance<30?{time,clearance}:null;
}
function sniperActorPose(a,time){
 const t=time+a.phase,beat=Math.sin(t*3.2),cycle=(t%4)/4;
 const pose={x:a.motion?.x??a.origin,y:a.motion?.y??a.originY,lean:0,bob:0,left:{x:-11,y:-18},right:{x:11,y:-19},legL:{x:-5,y:0},legR:{x:5,y:0},prop:cycle,action:a.action,facing:a.motion?.facing??1};
 if(['walk','carry','ski','skate'].includes(a.action)){
  const travel=Math.sin(time*.48+a.phase),range=a.action==='ski'?25:a.action==='skate'?20:17;
  if(!a.motion){pose.x+=travel*range;pose.y+=Math.sin(time*.68+a.phase)*3;pose.facing=Math.cos(time*.48+a.phase)<0?-1:1;}
  const pace=a.motion?Math.min(1.5,Math.hypot(a.motion.vx,a.motion.vy)/18):1,stride=Math.sin(a.motion?.gait??t*5.5)*pace;
  pose.legL.x-=stride*5;pose.legR.x+=stride*5;pose.legL.y=-Math.max(0,stride)*3;pose.legR.y=-Math.max(0,-stride)*3;pose.bob=-Math.abs(stride)*1.1;pose.left.y+=stride*4;pose.right.y-=stride*4;pose.lean=(a.motion?.state==='flee'?.12:.045)*pose.facing*pace;
  const run=a.motion?.runBlend||0;pose.lean+=run*.06*pose.facing;pose.legL.y-=Math.max(0,stride)*run*2;pose.legR.y-=Math.max(0,-stride)*run*2;pose.left.y-=run*(5+stride*2);pose.right.y-=run*(5-stride*2);
  if(a.action==='carry'){pose.left={x:-13,y:-25};pose.right={x:13,y:-25};pose.lean=-.06;}
  if(a.action==='ski'||a.action==='skate'){pose.lean=pose.facing*.1*pace;pose.left={x:-18,y:-24+stride*3};pose.right={x:18,y:-21-stride*3};pose.legL={x:-8,y:0};pose.legR={x:8,y:-1};}
 }else if(a.action==='photo'){
  const raised=cycle>.2&&cycle<.8;pose.left={x:-5,y:raised?-39:-24};pose.right={x:5,y:raised?-39:-24};pose.lean=raised?-.04:.04;pose.prop=raised?1:0;
 }else if(a.action==='paint'){
  pose.left={x:-13,y:-23};pose.right={x:24+Math.sin(t*2)*2,y:-33+Math.cos(t*2.4)*7};pose.lean=.08;
 }else if(a.action==='cook'||a.action==='serve'){
  pose.left={x:-14,y:-25};pose.right={x:18+Math.sin(t*3)*4,y:-24-Math.abs(beat)*9};pose.lean=.08;pose.prop=(t%2.5)/2.5;
 }else if(a.action==='repair'){
  pose.right={x:21,y:-18-Math.max(0,beat)*15};pose.left={x:13,y:-20};pose.lean=.2;pose.bob=2;
 }else if(a.action==='dance'){
  pose.lean=beat*.16;pose.bob=-Math.abs(Math.sin(t*4))*3;pose.left={x:-17-Math.cos(t*4)*3,y:-36+beat*10};pose.right={x:17,y:-36-beat*10};pose.legL={x:-9+beat*4,y:-Math.max(0,beat)*4};pose.legR={x:9+beat*4,y:-Math.max(0,-beat)*4};
 }else if(a.action==='juggle'){
  pose.left={x:-12,y:-28+beat*6};pose.right={x:12,y:-28-beat*6};pose.bob=beat*.5;
 }else if(a.action==='play'){
  pose.left={x:-4,y:-30+beat*2};pose.right={x:15,y:-30-beat*2};pose.lean=beat*.07;
 }else if(a.action==='clap'){
  const spread=2+Math.abs(beat)*10;pose.left={x:-spread,y:-32};pose.right={x:spread,y:-32};pose.bob=-Math.abs(beat);
 }else if(a.action==='wave'||a.action==='talk'){
  pose.right={x:15+beat*5,y:a.action==='wave'?-48:-31+beat*4};pose.left={x:-12,y:-22};pose.lean=beat*.04;
  if(a.action==='talk'&&pose.facing<0){pose.left={x:-pose.right.x,y:pose.right.y};pose.right={x:12,y:-22};}
 }else if(a.action==='sip'){
  const lift=(1-Math.cos(cycle*Math.PI*2))/2;pose.right={x:13-lift*8,y:-24-lift*14};pose.left={x:-10,y:-22};pose.lean=beat*.025;pose.prop=lift;
 }else if(a.action==='shop'){
  pose.right={x:14+Math.max(0,beat)*9,y:-24+beat*5};pose.left={x:-12,y:-20};pose.lean=Math.max(0,beat)*.12;
 }else if(a.action==='shovel'||a.action==='snowman'){
  const bend=(Math.sin(t*2)+1)/2;pose.lean=bend*.28;pose.bob=bend*4;pose.left={x:6+bend*3,y:-23+bend*7};pose.right={x:17,y:-29+bend*16};pose.prop=bend;
 }else if(a.action==='startle'){
  pose.left={x:-14,y:-40};pose.right={x:14,y:-40};pose.bob=3;pose.lean=-.08*pose.facing;
 }else if(a.action==='look'){
  pose.right={x:12,y:-30};pose.lean=Math.sin(t*1.4)*.04;
 }else if(a.action==='water'){
  pose.right={x:19+beat*2,y:-22};pose.left={x:4,y:-22};pose.lean=.1;pose.prop=(t%2)/2;
 }else if(a.action==='read'){
  pose.left={x:-8,y:-28};pose.right={x:8,y:-28+Math.sin(t*1.5)};pose.lean=.035;pose.prop=(t%5)/5;
 }else if(a.action==='fish'){
  pose.left={x:6,y:-26};pose.right={x:16,y:-30+Math.sin(t*1.8)*3};pose.lean=beat*.03;
 }else if(a.action==='balloon'){
  pose.left={x:-12,y:-25};pose.right={x:12,y:-32+beat*2};pose.prop=Math.sin(t*1.4);
 }else if(a.action==='inspect'){
  pose.right={x:10+beat*3,y:-39};pose.left={x:-9,y:-22};pose.lean=.08+beat*.03;
 }else if(a.action==='stretch'){
  pose.left={x:-13,y:-45-beat*7};pose.right={x:13,y:-45+beat*7};pose.lean=beat*.14;pose.legL.x=-8;pose.legR.x=8;
 }else if(a.action==='drum'){
  pose.left={x:-12,y:-23+beat*7};pose.right={x:12,y:-23-beat*7};pose.bob=-Math.abs(beat);
 }else if(a.action==='knead'){
  pose.left={x:12,y:-20+beat*3};pose.right={x:22,y:-20+beat*3};pose.lean=.1+Math.max(0,beat)*.1;
 }else if(a.action==='rest'){
  pose.left={x:-8,y:-16};pose.right={x:8,y:-16};pose.lean=.1;pose.bob=1+Math.sin(t*2.6)*.7;
 }
 if(a.motion&&!['travel','flee','return'].includes(a.motion.state))pose.bob+=Math.sin(t*1.8)*.35;
 // Blend changes of posture while keeping the authoritative ground position exact.
 if(a.motion?.blend<1&&a.motion.fromPose){const old=a.motion.fromPose,k=a.motion.blend;
  for(const key of ['lean','bob'])pose[key]=old[key]+(pose[key]-old[key])*k;
  for(const key of ['left','right','legL','legR'])for(const axis of ['x','y'])pose[key][axis]=old[key][axis]+(pose[key][axis]-old[key][axis])*k;
 }
 return pose;
}
class SniperGame {
  constructor(random=Math.random){this.random=random;this.state='briefing';this.mission=0;this.score=0;this.totalShots=0;this.totalHits=0;this.checkpoint={score:0,shots:0,hits:0};this.aim={x:480,y:285};this.loadMission();}
  loadMission(){const m=SNIPER_MISSIONS[this.mission];this.elapsed=0;this.remaining=m.time;this.mag=3;this.reserve=9;this.reloadLeft=0;this.cooldown=0;this.alert=0;this.focus=100;this.holding=false;this.scoped=false;this.identification=0;this.inspected=null;this.identifyId=null;this.feedback='표적을 확인한 뒤 스코프를 켜고 사격하세요.';this.shotFlash=0;this.impact=null;this.shot=null;this.particles=[];this.pausedFrom='running';this.failure='';this.actors=[...m.targets,...m.extras].map((a,i)=>({...a,id:i,origin:a.x,originY:a.y,x:a.x,action:sniperActivity(a,m.theme),phase:i*1.3,speed:a.speed||.32,range:a.range||35,dead:false,hidden:false,fallTime:0,hitX:0,hitY:0}));const swap=1+Math.floor(this.random()*(this.actors.length-1)),target=this.actors[0],other=this.actors[swap];for(const k of ['origin','originY','x','y','phase']){const v=target[k];target[k]=other[k];other[k]=v;}this.initCrowd();for(const a of this.actors){a.pose=sniperActorPose(a,0);a.x=a.pose.x;a.y=a.pose.y;}this.aim={x:480,y:285};}
  initCrowd(){
    this.observations=new Set();this.identifyGrace=0;
    this.steadiness=0;this.shotHistory=[];
    this.requireObservation??=false;
    this.autoReload??=false;
    this.report=null;this.missionHistory??=[];
    this.obstacles=sniperObstacles(this.config.theme);
    for(const a of this.actors){
      a.homeAction=a.action;
      const stationary=['paint','cook','repair','shop','snowman','shovel','play','water','fish','knead','drum'].includes(a.action);
      a.motion={x:a.origin,y:a.originY,vx:0,vy:0,gait:a.phase,facing:a.id%2?1:-1,
        state:'activity',timer:1+this.random()*4,pace:(14+this.random()*11)*({'운동선수':1.1,'우편배달부':1.08,'독서가':.85,'낚시꾼':.88,'정원사':.92}[a.role]||1),
        curiosity:.75+((a.id*7)%5)*.125,sociability:.6+(a.id%5)*.15,courage:this.random(),stationary,goal:{x:a.origin,y:a.originY},blend:1,fromPose:null,
        reaction:null,escapeLeft:0,stuck:0,route:[],replans:0,fear:0,socialCooldown:3+this.random()*5,partner:null,recentPartners:[],
        yielding:0,runBlend:0,gaze:a.id%2?1:-1,vigilance:0,alarmCount:0,progressDistance:Infinity,
        fatigue:0,fatigueRate:a.role==='운동선수'?.65:a.case?1.12:1,visit:null,visitCooldown:2+(a.id%4),lastVisit:null,recentVisits:[]};
      // Some initial crowd slots border a prop. Resolve before the first visible frame.
      this.constrainActor(a);
      a.origin=a.motion.x;a.originY=a.motion.y;
    }
    this.interests=this.actors.filter(a=>['play','paint','cook','snowman','water','knead','drum'].includes(a.homeAction))
      .map(a=>({id:a.id,x:a.origin,y:a.originY,kind:a.homeAction}));
  }
  setBehavior(a,state,action,seconds){
    const b=a.motion;if(state!=='social'&&b.partner!==null){const partner=this.actors.find(n=>n.id===b.partner);b.partner=null;b.socialCooldown=8;if(partner?.motion.partner===a.id){partner.motion.partner=null;partner.motion.timer=0;}}
    if(b.visit&&!['travel','visiting'].includes(state)){
      b.lastVisit=b.visit.id;
      b.recentVisits=[{id:b.visit.id,until:this.elapsed+25},...b.recentVisits.filter(v=>v.id!==b.visit.id&&v.until>this.elapsed)].slice(0,3);
      b.visit=null;b.visitCooldown=7;
    }
    b.state=state;b.timer=seconds;b.stuck=0;
    if(a.action!==action){b.fromPose=a.pose;b.blend=0;a.action=action;}
  }
  constrainActor(a){
    const b=a.motion,minY=this.config.theme==='harbor'?235:178;
    b.x=sniperClamp(b.x,48,912);b.y=sniperClamp(b.y,minY,498);
    for(const o of this.obstacles){const rx=o.rx+16,ry=o.ry+12,dx=b.x-o.x,dy=b.y-o.y;
      if(Math.abs(dx)<rx&&Math.abs(dy)<ry){
        if(rx-Math.abs(dx)<ry-Math.abs(dy)){b.x=o.x+(dx<0?-rx:rx);b.vx=0;}
        else{b.y=o.y+(dy<0?-ry:ry);b.vy=0;}
      }
    }
  }
  chooseDestination(a,away){
    const b=a.motion,minY=this.config.theme==='harbor'?235:178;
    const candidates=[];
    for(let attempt=0;attempt<12;attempt++){
      const angle=away?Math.atan2(b.y-away.y,b.x-away.x)+(this.random()-.5)*1.4:this.random()*Math.PI*2;
      const distance=away?55+this.random()*50:(25+this.random()*65)*b.curiosity;
      const x=sniperClamp(b.x+Math.cos(angle)*distance,Math.max(48,a.origin-100),Math.min(912,a.origin+100));
      const y=sniperClamp(b.y+Math.sin(angle)*distance*.45,Math.max(minY,a.originY-30),Math.min(498,a.originY+30));
      if(Math.hypot(x-b.x,y-b.y)<12)continue;
      if(this.obstacles.some(o=>Math.abs(x-o.x)<o.rx+16&&Math.abs(y-o.y)<o.ry+12))continue;
      const goal={x,y},crowding=this.actors.reduce((sum,n)=>sum+(n.id!==a.id&&!n.dead?Math.max(0,45-Math.hypot(n.x-x,n.y-y)):0),0);
      const danger=away||b.fear>.2&&b.threat;
      const score=(danger?Math.hypot(x-danger.x,y-danger.y)-Math.hypot(b.x-danger.x,b.y-danger.y):Math.hypot(x-b.x,y-b.y)*.2)-crowding;
      candidates.push({goal,score});
    }
    candidates.sort((left,right)=>right.score-left.score);
    for(const candidate of candidates)if(this.planRoute(a,candidate.goal)){b.replans=0;return true;}
    b.goal={x:b.x,y:b.y};b.route=[];return false;
  }
  planRoute(a,goal){
    const b=a.motion,route=sniperRoute(b,goal,this.obstacles,this.config.theme==='harbor'?235:178);
    if(!route.length)return false;b.goal={...goal};b.route=route;b.progressDistance=Math.hypot(route[0].x-b.x,route[0].y-b.y);return true;
  }
  advanceRoute(a){
    const b=a.motion;
    // Follow the farthest currently visible waypoint to avoid stopping at every corner.
    for(let i=b.route.length-1;i>0;i--)if(sniperClearPath(b,b.route[i],this.obstacles)){
      b.route.splice(0,i);b.progressDistance=Infinity;b.stuck=0;break;
    }
    while(b.route.length>1&&Math.hypot(b.route[0].x-b.x,b.route[0].y-b.y)<5){b.route.shift();b.progressDistance=Infinity;b.stuck=0;}
  }
  interestHost(spot){
    const host=this.actors.find(n=>n.id===spot.id),focus=spot.focus||spot;
    return host&&!host.dead&&!host.hidden&&['activity','observe'].includes(host.motion.state)&&Math.hypot(host.motion.x-focus.x,host.motion.y-focus.y)<14?host:null;
  }
  restDuration(a){return sniperClamp((a.motion.fatigue-.3)/.12,2,6);}
  interestPreference(a,kind){
    const favorites={'독서가':['paint','water'],'과학자':['repair','water'],'운동선수':['play','drum'],'우편배달부':['cook','knead']};
    return (a.camera?25:['play','drum'].includes(kind)?18:8)+(favorites[a.role]?.includes(kind)?22:0);
  }
  chooseInterest(a){
    const b=a.motion;if(b.stationary||b.reaction||b.fatigue>.65||b.fear>.2||b.vigilance>0||b.visitCooldown>0||a.hidden)return false;
    const candidates=[];
    for(const spot of this.interests){
      const host=this.interestHost(spot);
      if(spot.id===a.id||!host)continue;
      for(const slot of [-1,1]){
        const goal={x:spot.x+slot*48,y:spot.y+12};
        if(goal.x<48||goal.x>912||goal.y>498||Math.abs(goal.x-a.origin)>120||Math.abs(goal.y-a.originY)>60)continue;
        if(this.actors.some(n=>!n.dead&&n.id!==a.id&&(n.motion.visit?.id===spot.id&&n.motion.visit.slot===slot||Math.hypot(n.x-goal.x,n.y-goal.y)<24)))continue;
        if(!sniperClearPath(goal,goal,this.obstacles))continue;
        const distance=Math.hypot(goal.x-b.x,goal.y-b.y);
        const preference=this.interestPreference(a,spot.kind);
        candidates.push({spot,slot,goal,score:preference-distance*.2-(b.recentVisits.some(v=>v.id===spot.id&&v.until>this.elapsed)?35:0)+this.random()*8});
      }
    }
    candidates.sort((a,b)=>b.score-a.score);
    for(const c of candidates){if(!this.planRoute(a,c.goal))continue;
      b.visit={id:c.spot.id,slot:c.slot,focus:{x:c.spot.x,y:c.spot.y},action:a.camera?'photo':['play','drum'].includes(c.spot.kind)?'clap':'look'};b.replans=0;
      this.setBehavior(a,'travel','walk',12);return true;
    }
    return false;
  }
  tryConversation(a){
    const b=a.motion;if(a.dead||a.hidden||b.stationary||b.fear>.2||b.socialCooldown>0||b.fatigue>.65||b.reaction||b.vigilance>0||!['activity','observe'].includes(b.state))return false;
    const partner=this.actors.filter(n=>n.id!==a.id&&!b.recentPartners.some(v=>v.id===n.id&&v.until>this.elapsed)&&!n.motion.recentPartners.some(v=>v.id===a.id&&v.until>this.elapsed)&&!n.dead&&!n.hidden&&!n.motion.stationary&&!n.motion.reaction&&n.motion.fatigue<=.65&&n.motion.fear<.2&&n.motion.vigilance===0&&n.motion.socialCooldown<=0&&['activity','observe'].includes(n.motion.state))
      .sort((p,q)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(q.x-a.x,q.y-a.y))
      .find(n=>{const distance=Math.hypot(n.x-a.x,n.y-a.y);return distance>28&&distance<78&&Math.abs(n.y-a.y)<25&&sniperClearPath(b,n.motion,this.obstacles);});
    if(!partner)return false;
    const duration=(1.8+this.random()*1.7)*(b.sociability+partner.motion.sociability)/2;this.setBehavior(a,'social','talk',duration);this.setBehavior(partner,'social','talk',duration);
    for(const [person,other] of [[a,partner],[partner,a]])person.motion.recentPartners=[{id:other.id,until:this.elapsed+30},...person.motion.recentPartners.filter(v=>v.id!==other.id&&v.until>this.elapsed)].slice(0,2);
    b.partner=partner.id;partner.motion.partner=a.id;b.facing=partner.x>a.x?1:-1;partner.motion.facing=-b.facing;return true;
  }
  alertCrowd(x,y){
    for(const a of this.actors){if(a.dead)continue;const b=a.motion,d=Math.hypot(a.x-x,a.y-y);
      b.reaction={delay:.12+d/800+this.random()*.35,x,y};b.fear=Math.min(1,b.fear+.4+Math.max(0,1-d/500)*.6);
      b.alarmCount++;b.vigilance=Math.min(16,6+b.alarmCount*2);
    }
  }
  stepCrowd(dt){
    // Snapshot positions so avoidance is independent of actor update order.
    const neighbors=this.actors.filter(a=>!a.dead).map(a=>({id:a.id,x:a.motion.x,y:a.motion.y,vx:a.motion.vx,vy:a.motion.vy}));
    for(const a of this.actors){
      if(a.dead){a.fallTime=Math.min(1.2,a.fallTime+dt);continue;}
      const b=a.motion;b.timer-=dt;b.blend=Math.min(1,b.blend+dt*4);b.fear=Math.max(0,b.fear-dt*.055);b.socialCooldown=Math.max(0,b.socialCooldown-dt);
      b.visitCooldown=Math.max(0,b.visitCooldown-dt);
      if(b.visit&&!this.interestHost(b.visit))this.setBehavior(a,'observe','look',.8);
      b.yielding=Math.max(0,b.yielding-dt);b.vigilance=Math.max(0,b.vigilance-dt);if(b.vigilance===0)b.alarmCount=0;
      if(b.state==='social'){const partner=this.actors.find(n=>n.id===b.partner);if(a.hidden||!partner||partner.dead||partner.hidden||partner.motion.partner!==a.id||Math.hypot(partner.motion.x-b.x,partner.motion.y-b.y)>90||Math.abs(partner.motion.y-b.y)>35||!sniperClearPath(b,partner.motion,this.obstacles))b.timer=0;else b.facing=partner.x>a.x?1:-1;}
      if(b.reaction){b.reaction.delay-=dt;if(b.reaction.delay<=0){
        b.threat={x:b.reaction.x,y:b.reaction.y};b.reaction=null;
        this.setBehavior(a,'startled','startle',.35+b.courage*.4);
      }}
      if(b.state==='startled'&&b.timer<=0){
        this.chooseDestination(a,b.threat);b.escapeLeft=1.8+(1-b.courage)*1.8;
        this.setBehavior(a,'flee','walk',b.escapeLeft);
      }else if(b.state==='social'&&b.timer<=0){
        this.setBehavior(a,'observe','look',1);
      }else if(b.state==='resting'&&b.timer<=0&&b.fatigue>.4&&!b.reaction&&b.fear<=.2){
        b.timer=this.restDuration(a);
      }else if(['visiting','resting'].includes(b.state)&&b.timer<=0){
        this.setBehavior(a,'observe','look',.8);
      }else if(b.state==='activity'&&b.timer<=0){
        if(b.fatigue>.68&&b.vigilance===0&&!b.reaction&&b.fear<=.2)this.setBehavior(a,'resting','rest',this.restDuration(a));
        else if(!this.tryConversation(a)&&!this.chooseInterest(a)){
          if(b.stationary){this.setBehavior(a,'observe','look',.8+this.random()*1.4);}
          else if(this.chooseDestination(a)){this.setBehavior(a,'travel',['carry','ski','skate'].includes(a.homeAction)?a.homeAction:'walk',7);}
          else this.setBehavior(a,'observe','look',1);
        }
      }else if(b.state==='observe'&&b.timer<=0){
        if(b.alarmCount>=2&&b.vigilance>0)this.setBehavior(a,'observe','look',1.5);
        else this.setBehavior(a,'activity',a.homeAction,2+this.random()*4);
      }else if(b.state==='recover'&&b.timer<=0){
        const homeDanger=b.threat&&Math.hypot(a.origin-b.threat.x,a.originY-b.threat.y);
        if(b.fear>.35&&b.threat&&homeDanger<90&&homeDanger+10<Math.hypot(b.x-b.threat.x,b.y-b.threat.y))b.timer=1.2;
        else if(this.planRoute(a,{x:a.origin,y:a.originY})){b.replans=0;this.setBehavior(a,'return','walk',12);}
        else this.setBehavior(a,'observe','look',1);
      }
      const moving=['travel','flee','return'].includes(b.state);
      if(moving)this.advanceRoute(a);
      if(moving&&b.stuck>.75&&b.replans<2){this.planRoute(a,b.goal);b.replans++;b.stuck=0;}
      const waypoint=b.route[0]||b.goal,dx=waypoint.x-b.x,dy=waypoint.y-b.y,dist=Math.hypot(b.goal.x-b.x,b.goal.y-b.y),wayDistance=Math.hypot(dx,dy);
      if(moving&&(dist<4||b.timer<=0||b.stuck>1.4)&&(b.state!=='flee'||b.timer<b.escapeLeft-.4)){
        if(b.state==='flee')this.setBehavior(a,'recover','look',1.2+this.random()*1.5);
        else if(b.visit&&dist<4){b.facing=b.visit.focus.x>b.x?1:-1;this.setBehavior(a,'visiting',b.visit.action,2.5+this.random()*2);}
        else if(b.state==='return'||b.stationary)this.setBehavior(a,'activity',a.homeAction,2+this.random()*3);
        else this.setBehavior(a,'observe',this.random()<.45?'wave':'look',.8+this.random()*1.8);
      }
      const walking=['travel','flee','return'].includes(b.state),speed=b.pace*(b.state==='flee'?1.5+b.fear*.4:1+b.fear*.15)*(a.homeAction==='ski'||a.homeAction==='skate'?1.25:1)*(1-b.fatigue*.22);
      let vx=walking?dx/Math.max(1,wayDistance)*Math.min(speed,wayDistance*2):0,vy=walking?dy/Math.max(1,wayDistance)*Math.min(speed,wayDistance*2):0;
      if(walking){
        // Predict the closest approach; one walker yields while the other keeps priority.
        const desiredVelocity={x:vx,y:vy};
        for(const n of neighbors){if(n.id===a.id)continue;
          const course=sniperCollisionCourse(b,desiredVelocity,n);
          if(course&&(a.id>n.id||Math.hypot(n.vx,n.vy)<2)){
            b.yielding=.3;const side=a.id<n.id?-1:1;
            vx*=.55;vy*=.55;
            if(Math.abs(desiredVelocity.x)>=Math.abs(desiredVelocity.y))vy+=side*speed*.35;
            else vx+=side*speed*.35;
          }
        }
        for(const n of neighbors){if(n.id===a.id)continue;const nx=b.x-n.x,ny=(b.y-n.y)*1.6,d=Math.hypot(nx,ny);
          if(d<38){const strength=(38-d)/38*speed*1.8;vx+=(d>.01?nx/d:a.id<n.id?-1:1)*strength;vy+=ny/Math.max(1,d)*strength;
            // Pick opposite passing sides instead of getting stuck face-to-face.
            if(Math.abs(ny)<18)vy+=(a.id<n.id?-1:1)*strength*.55;
          }
        }
        for(const o of this.obstacles){const nx=b.x+vx*.45-o.x,ny=b.y+vy*.45-o.y;
          if(Math.abs(nx)<o.rx+22&&Math.abs(ny)<o.ry+16){vy+=(b.y<o.y?-1:1)*speed;vx*=.65;}
        }
      }
      const desired=Math.hypot(vx,vy);if(desired>speed){vx*=speed/desired;vy*=speed/desired;}
      const smooth=1-Math.exp(-dt*(b.state==='flee'?7:4));b.vx+=(vx-b.vx)*smooth;b.vy+=(vy-b.vy)*smooth;
      const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;this.constrainActor(a);
      const traveled=Math.hypot(b.x-oldX,b.y-oldY);b.gait+=traveled*.28;
      const effort=traveled/Math.max(dt,.001);b.fatigue=sniperClamp(b.fatigue+dt*(effort>28?.085*b.fatigueRate:effort>4?.012*b.fatigueRate:b.state==='resting'?-.12:-.055),0,1);
      // Detect circling as well as complete stops, using progress toward the next waypoint.
      const progress=Math.hypot(waypoint.x-b.x,waypoint.y-b.y);
      if(!walking||progress<b.progressDistance-.3){b.stuck=0;b.progressDistance=progress;}
      else if(b.yielding===0)b.stuck+=dt;
      if(walking&&Math.abs(b.vx)>3)b.facing=b.vx<0?-1:1;
      b.runBlend+=(sniperClamp((Math.hypot(b.vx,b.vy)-24)/16,0,1)-b.runBlend)*(1-Math.exp(-dt*6));
      const gaze= !walking&&b.vigilance>0&&b.threat?(b.threat.x>b.x?1:-1):b.facing;
      b.gaze+=(gaze-b.gaze)*(1-Math.exp(-dt*5));
      a.pose=sniperActorPose(a,this.elapsed);a.x=a.pose.x;a.y=a.pose.y;
      a.hidden=Boolean(a.cover&&Math.sin(this.elapsed*.9)>.3);
    }
  }
  actorAt(x,y,inspect=false){
    // Match the rendered lean/bob and front-to-back painter order.
    return [...this.actors].sort((a,b)=>b.y-a.y||b.id-a.id).find(a=>{
      if(a.dead||a.hidden)return false;const p=a.pose,dx=x-a.x,dy=y-a.y-p.bob,c=Math.cos(p.lean),s=Math.sin(p.lean);
      const localX=dx*c+dy*s,localY=-dx*s+dy*c;
      return Math.abs(localX)<(inspect?23:10)&&localY>(inspect?-55:-46)&&localY<(inspect?8:2);
    });
  }
  updateObservation(a,dt){
    if(a){
      if(a.id!==this.identifyId){this.identifyId=a.id;this.identification=0;}
      this.identification=this.observations.has(a.id)?1:Math.min(1,this.identification+dt/1.1);
      this.identifyGrace=.22;if(this.identification===1)this.observations.add(a.id);
    }else{
      this.identifyGrace=Math.max(0,this.identifyGrace-dt);
      if(this.identifyGrace===0){this.identification=0;this.identifyId=null;}
    }
    this.inspected=a;
  }
  observationNotes(query=''){
    return [...this.observations].map(id=>this.actors.find(a=>a.id===id)).filter(Boolean).map((a,i)=>({number:i+1,description:a.desc})).filter(note=>note.description.toLocaleLowerCase().includes(String(query).trim().toLocaleLowerCase()));
  }
  get campaignSummary(){
    const completed=this.missionHistory.length,shots=this.missionHistory.reduce((n,r)=>n+r.shots,0);
    return {completed,shots,accuracy:shots?Math.round(completed/shots*100):0,seconds:Math.round(this.missionHistory.reduce((n,r)=>n+r.seconds,0)*10)/10,perfect:this.missionHistory.filter(r=>r.grade==='S').length};
  }
  get config(){return SNIPER_MISSIONS[this.mission];}
  get targetsLeft(){return this.actors.filter(a=>a.target&&!a.dead).length;}
  start(){if(this.state!=='briefing')return false;this.state='running';return true;}
  pause(){if(this.state==='running'||this.state==='shot'){this.pausedFrom=this.state;this.state='paused';this.holding=false;return true;}if(this.state==='paused'){this.state=this.pausedFrom;return true;}return false;}
  scope(){if(this.state!=='running')return false;this.scoped=!this.scoped;this.identification=0;this.holding=false;return true;}
  reload(){if(this.state!=='running'||this.reloadLeft>0||this.mag===3||this.reserve<=0)return false;this.reloadLeft=1.6;this.holding=false;this.feedback='재장전 중…';return true;}
  maybeAutoReload(){return Boolean(this.autoReload&&this.mag===0&&this.reload());}
  get reloadProgress(){return this.reloadLeft>0?sniperClamp(1-this.reloadLeft/1.6,0,1):0;}
  fail(reason){if(this.state!=='running')return;this.state='failed';this.failure=reason;this.holding=false;}
  retry(){if(this.state!=='failed')return false;Object.assign(this,{score:this.checkpoint.score,totalShots:this.checkpoint.shots,totalHits:this.checkpoint.hits});this.loadMission();this.state='briefing';return true;}
  next(){if(this.state!=='success'||this.mission>=SNIPER_MISSIONS.length-1)return false;this.mission++;this.checkpoint={score:this.score,shots:this.totalShots,hits:this.totalHits};this.loadMission();this.state='briefing';return true;}
  sway(){const strength=5.2-4.1*this.steadiness;return{x:Math.sin(this.elapsed*2.3)*strength,y:Math.cos(this.elapsed*1.7)*strength*.65};}
  moveAim(dx,dy,dt){
    if(this.state!=='running'||![dx,dy,dt].every(Number.isFinite)||dt<=0)return false;
    const length=Math.max(1,Math.hypot(dx,dy)),speed=(this.scoped?95:220)*(this.holding?.5:1)*Math.min(dt,.05);
    return this.aimAt(this.aim.x+dx/length*speed,this.aim.y+dy/length*speed);
  }
  aimAt(x,y){if(!Number.isFinite(x)||!Number.isFinite(y))return false;this.aim.x=Math.max(25,Math.min(935,x));this.aim.y=Math.max(35,Math.min(510,y));return true;}
  step(dt){if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.05,dt);if(this.state==='shot'){this.stepShot(dt);return;}if(this.state!=='running')return;this.updateParticles(dt);this.elapsed+=dt;this.remaining=Math.max(0,this.remaining-dt);this.cooldown=Math.max(0,this.cooldown-dt);this.shotFlash=Math.max(0,this.shotFlash-dt);if(this.impact)this.impact.life-=dt;
    if(this.reloadLeft>0){this.reloadLeft-=dt;if(this.reloadLeft<=0){this.reloadLeft=0;const n=Math.min(3-this.mag,this.reserve);this.mag+=n;this.reserve-=n;this.feedback='재장전 완료. 표적을 확인하세요.';}}
    if(this.holding&&this.scoped&&this.reloadLeft===0){this.focus=Math.max(0,this.focus-dt*32);if(this.focus===0)this.holding=false;}else this.focus=Math.min(100,this.focus+dt*18);
    const steadyTarget=this.holding&&this.scoped&&this.focus>0&&this.reloadLeft===0?1:0;
    this.steadiness+=(steadyTarget-this.steadiness)*(1-Math.exp(-dt*(steadyTarget?5:9)));
    this.stepCrowd(dt);
    const a=this.scoped?this.actorAt(this.aim.x,this.aim.y,true):null;
    this.updateObservation(a,dt);
    if(this.remaining===0)this.fail('작전 시간이 초과되었습니다.');
  }
  updateParticles(dt){for(const p of this.particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=75*dt;}this.particles=this.particles.filter(p=>p.life>0);}
  stepShot(dt){const shot=this.shot;shot.clock+=dt;this.shotFlash=Math.max(0,this.shotFlash-dt);this.updateParticles(dt);for(const a of this.actors)if(a.dead)a.fallTime=Math.min(1.2,a.fallTime+dt);
    if(!shot.impacted&&shot.clock>=shot.flight){shot.impacted=true;this.resolveShot();}
    if(shot.clock>=shot.duration){
      if(!this.report&&['success','won'].includes(shot.outcome)){
        const shots=this.totalShots-this.checkpoint.shots;
        this.report={mission:this.mission,shots,accuracy:Math.round(100/Math.max(1,shots)),observed:this.observations.size,seconds:Math.round((this.config.time-this.remaining)*10)/10,grade:shots===1?(this.remaining>=this.config.time*.5?'S':'A'):'B'};
        this.missionHistory.push({...this.report});
      }
      this.state=shot.outcome;this.feedback=shot.message;this.shot=null;this.cooldown=.15;
      const message=this.feedback;if(this.maybeAutoReload())this.feedback=message+' 빈 탄창을 자동 재장전합니다.';
    }
  }
  skipShot(){
    if(this.state!=='shot'||!this.shot)return false;
    this.stepShot(Math.max(0,this.shot.duration-this.shot.clock)+.001);
    for(const a of this.actors)if(a.dead)a.fallTime=1.2;
    this.particles=[];this.shotFlash=0;return true;
  }
  resolveShot(){const shot=this.shot,a=shot.actor;this.impact={x:shot.x,y:shot.y,life:.55};shot.outcome='running';
    this.shotHistory.push({number:this.shotHistory.length+1,result:a?(a.target?'표적 명중':'오인 사격'):'빗나감',seconds:Math.round(this.elapsed*10)/10});if(this.shotHistory.length>12)this.shotHistory.shift();
    if(a){a.dead=true;a.fallTime=0;a.hitX=shot.x;a.hitY=shot.y;a.fallDir=a.id%2?-1:1;
      for(let i=0;i<18;i++){const angle=-1.45+i*.115,speed=15+(i*13%34);this.particles.push({x:shot.x,y:shot.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-15,life:.45+(i%5)*.14,max:1.1,size:1+(i%3)*.45});}
      if(!a.target){shot.outcome='failed';this.failure='다른 인물을 오인 사격했습니다. 윌리의 단서를 모두 확인하세요.';shot.message=this.failure;return;}
      this.totalHits++;this.score+=500;this.alert=Math.min(100,this.alert+8);shot.message='윌리 명중 확인. 다음 장소를 확인하세요.';
      if(this.targetsLeft===0){this.score+=Math.ceil(this.remaining)*8+Math.max(0,100-Math.round(this.alert))*3;shot.outcome=this.mission===SNIPER_MISSIONS.length-1?'won':'success';}
    }else{this.alert=Math.min(100,this.alert+24);this.alertCrowd(shot.x,shot.y);shot.message='빗나갔습니다. 놀란 사람들이 흩어집니다. 경계도가 상승했습니다.';if(this.alert>=100){shot.outcome='failed';this.failure='발사 위치가 노출되어 작전을 중단합니다.';}}
    if(shot.outcome==='running'&&this.mag===0&&this.reserve===0){shot.outcome='failed';this.failure='탄약을 모두 소진했습니다.';}
  }
  get tacticalWarning(){
    if(!['running','paused','shot'].includes(this.state))return '';
    const messages=[];if(this.remaining<=15)messages.push('시간 주의: 15초 이하');
    if(this.alert>=72)messages.push('노출 주의: 추가 실수가 작전을 끝낼 수 있습니다');
    if(this.mag+this.reserve<=3)messages.push('탄약 주의: 남은 탄약 3발 이하');
    return messages.join(' · ');
  }
  get shotReadiness(){
    if(this.state!=='running')return '작전 진행 중에 사격할 수 있습니다.';
    if(!this.scoped)return '스코프를 켜세요.';
    if(this.reloadLeft>0)return '재장전 중입니다.';
    if(this.cooldown>0)return '다음 사격을 준비하고 있습니다.';
    if(this.mag<=0)return this.reserve?'탄창이 비었습니다. 재장전하세요.':'남은 탄약이 없습니다.';
    if(this.requireObservation){const drift=this.sway(),actor=this.actorAt(this.aim.x+drift.x/2.3,this.aim.y+drift.y/2.3);if(!actor||!this.observations.has(actor.id))return '조준한 인물의 관찰을 완료하세요.';}
    return '사격 준비 완료 · 외형 단서를 다시 확인하세요.';
  }
  shoot(){if(this.state!=='running'||!this.scoped||this.cooldown>0||this.reloadLeft>0)return {kind:'blocked'};if(this.mag<=0){this.feedback=this.reserve?'탄창이 비었습니다. R 또는 재장전을 누르세요.':'남은 탄약이 없습니다.';return {kind:'empty'};}
    const drift=this.sway(),x=this.aim.x+drift.x/2.3,y=this.aim.y+drift.y/2.3;const a=this.actorAt(x,y);
    if(this.requireObservation&&(!a||!this.observations.has(a.id))){this.feedback='관찰을 완료한 인물에게만 발사할 수 있습니다. 스코프로 외형을 확인하세요.';return {kind:'unobserved'};}
    this.mag--;this.totalShots++;this.shotFlash=.16;
    this.holding=false;this.shot={x,y,actor:a||null,clock:0,flight:1.05,duration:2.45,impacted:false,outcome:'running',message:'',startAim:{...this.aim}};this.state='shot';this.feedback='BULLET TIME · 총알이 날아갑니다…';return {kind:a?(a.target?'target':'protected'):'miss',actor:a,x,y};
  }
}

// Local records contain only validated mission results; ranking is grade, shots, then time.
function sniperBestRecord(previous, candidate, mission){
 const clean=r=>r&&r.mission===mission&&Number.isInteger(mission)&&mission>=0&&mission<SNIPER_MISSIONS.length&&['S','A','B'].includes(r.grade)&&Number.isInteger(r.shots)&&r.shots>=1&&r.shots<=12&&Number.isFinite(r.seconds)&&r.seconds>=0?{mission,grade:r.grade,shots:r.shots,seconds:r.seconds}:null;
 const old=clean(previous),next=clean(candidate);if(!old)return next;if(!next)return old;
 const rank={S:3,A:2,B:1};
 return rank[next.grade]>rank[old.grade]||(next.grade===old.grade&&(next.shots<old.shots||(next.shots===old.shots&&next.seconds<old.seconds)))?next:old;
}
