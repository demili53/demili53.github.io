'use strict';
// 운빨좆망겜 — pure rules. No DOM. Node: require('./fog-core.js'); browser: window.FogCore.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FogCore=api;})(typeof self!=='undefined'?self:this,function(){

const COLS=7,ROWS=5,CELL=60,W=600,H=780,BX=90;
const BOARD_Y={opp:60,me:420};
const LANE={left:50,right:550,top:30,gap:390,bottom:750};
const SPAWN={x:50,y:390};
const BASE={opp:{x:50,y:30},me:{x:50,y:750}};
const START={opp:{r:4,c:0},me:{r:0,c:0}};
const PATHS={opp:[[50,390],[550,390],[550,30],[50,30]],me:[[50,390],[550,390],[550,750],[50,750]]};
const OTHER={me:'opp',opp:'me'};
const SCOUT_TIME={1:10,2:8,3:5,4:4};
const POP_CAP=20,BASE_HP=20,FINAL_STAGE=20;

const HEROES={
 scout:{name:'정찰병',pop:1,dmg:9,rate:.5,range:1.6,color:'#7fd17a',proj:'dart',skill:'신호탄',skillDesc:'안개 칸 3곳의 정체를 엿봅니다',cd:28,desc:'빠른 연사. 인구 1이라 정찰은 10초'},
 archer:{name:'궁수',pop:1,dmg:15,rate:.9,range:2.7,color:'#e8c25a',proj:'arrow',skill:'화살비',skillDesc:'가장 몰린 곳에 3초간 화살비',cd:22,desc:'긴 사거리 단일 공격'},
 guard:{name:'창기사',pop:2,dmg:30,rate:1.05,range:1.5,color:'#7aa6e8',proj:'spear',slow:.35,skill:'대지 울림',skillDesc:'보드 주변 몬스터를 4초간 크게 둔화',cd:26,desc:'근접 강타, 맞은 적 둔화'},
 pyro:{name:'화염술사',pop:2,dmg:15,rate:1,range:2.1,color:'#ff7a45',proj:'fire',splash:48,skill:'불꽃 장벽',skillDesc:'선두 몬스터 자리에 6초간 불길',cd:24,desc:'폭발 범위 피해'},
 storm:{name:'뇌전술사',pop:3,dmg:28,rate:1.15,range:2.4,color:'#9d8cff',proj:'bolt',chain:2,skill:'낙뢰',skillDesc:'체력이 가장 많은 적 3마리에 벼락',cd:30,desc:'번개가 2번 더 튐'},
 warden:{name:'수호자',pop:4,dmg:58,rate:1.4,range:2,color:'#f0f0f8',proj:'holy',aura:.18,skill:'성역',skillDesc:'본부 체력 +3, 8초간 피해 무시',cd:50,desc:'주변 8칸 아군 공격력 +18%'}
};
const HERO_ORDER=['scout','archer','guard','pyro','storm','warden'];
const SUMMON_WEIGHT={scout:30,archer:30,guard:16,pyro:14,storm:7,warden:3};
const ALLY_WEIGHT={scout:6,archer:10,guard:22,pyro:22,storm:24,warden:16};

const MONSTERS={
 crawler:{name:'껍질벌레',hp:42,speed:44,armor:0,bounty:4,leak:1},
 runner:{name:'날쌘쥐',hp:26,speed:78,armor:0,bounty:3,leak:1},
 brute:{name:'바위등딱지',hp:130,speed:30,armor:5,bounty:9,leak:2},
 jelly:{name:'분열 젤리',hp:80,speed:36,armor:0,bounty:6,leak:1,split:'jellet'},
 jellet:{name:'꼬마 젤리',hp:24,speed:58,armor:0,bounty:2,leak:1},
 moth:{name:'치유 나방',hp:60,speed:46,armor:0,bounty:7,leak:1,healer:true},
 bat:{name:'그림자 박쥐',hp:44,speed:96,armor:0,bounty:5,leak:1,flying:true},
 shell:{name:'방패 거북',hp:220,speed:26,armor:8,bounty:12,leak:2,aura:4},
 mudgiant:{name:'진흙 거인',hp:2400,flatHp:true,speed:22,armor:4,bounty:120,leak:6,boss:true},
 fogqueen:{name:'안개 여왕',hp:7000,flatHp:true,speed:26,armor:2,bounty:200,leak:6,boss:true},
 ironbeetle:{name:'강철 딱정왕',hp:9000,flatHp:true,speed:20,armor:10,bounty:300,leak:8,boss:true},
 abyss:{name:'심연의 눈',hp:11000,flatHp:true,speed:18,armor:10,bounty:500,leak:12,boss:true}
};
const BOSSES={5:'mudgiant',10:'fogqueen',15:'ironbeetle',20:'abyss'};
const WEATHER={
 clear:{name:'맑음',desc:'특별한 효과 없음'},
 mist:{name:'짙은 안개',desc:'영웅 사거리 -15%'},
 redmoon:{name:'붉은 달',desc:'몬스터 속도 +18%, 처치 보상 +40%'},
 gold:{name:'황금 바람',desc:'처치 보상 +60%'},
 thunder:{name:'뇌우',desc:'5초마다 벼락이 몬스터를 내리침'},
 frost:{name:'서리',desc:'몬스터 속도 -12%'}
};
const RIVALS=[
 {name:'붉은 송곳니 부족',style:'raider',desc:'정찰을 서두르는 공격형'},
 {name:'잿빛 까마귀 결사',style:'turtle',desc:'방어를 다지는 수비형'},
 {name:'녹슨 망치 형제단',style:'greedy',desc:'자원을 모아 강화하는 성장형'}
];
const LAIRS={
 nest:{name:'벌레 둥지',hp:320,crystal:90,ore:40},
 hive:{name:'안개 벌집',hp:640,crystal:150,ore:70},
 den:{name:'거대 굴',hp:1100,crystal:240,ore:110}
};

function rng(seed){let a=seed>>>0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function pickWeighted(r,table){let sum=0;for(const k in table)sum+=table[k];let x=r()*sum;for(const k in table){x-=table[k];if(x<0)return k;}return Object.keys(table)[0];}
const cellCenter=(side,r,c)=>({x:BX+c*CELL+CELL/2,y:BOARD_Y[side]+r*CELL+CELL/2});
function cellAt(x,y){for(const side of ['opp','me']){const by=BOARD_Y[side];if(x>=BX&&x<BX+COLS*CELL&&y>=by&&y<by+ROWS*CELL)return{side,r:Math.floor((y-by)/CELL),c:Math.floor((x-BX)/CELL)};}return null;}
const hpMul=s=>1+.28*(s-1)+.016*(s-1)*(s-1);
const summonCost=n=>Math.min(130,45+n*5);
const upgradeCost=lv=>40+lv*30;
const REPAIR_COST=55;

function pathLength(pts){let l=0;for(let i=1;i<pts.length;i++)l+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);return l;}

// Fog layout is generated once relative to the start corner and mirrored for the opponent, so both boards are equally lucky.
function makeLayout(r){
 const cells=[];for(let rr=0;rr<ROWS;rr++)for(let c=0;c<COLS;c++)if(rr+c>1)cells.push({rr,c});
 for(let i=cells.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
 const out={};const key=(a)=>a.rr+','+a.c;
 const far=cells.filter(a=>a.rr+a.c>=3),lairs=far.slice(0,5);lairs.forEach(a=>{const d=a.rr+a.c;out[key(a)]={type:'lair',kind:d>=8?'den':d>=5?'hive':'nest'};});
 const rest=cells.filter(a=>!out[key(a)]);
 const plan=['crystal','crystal','crystal','crystal','crystal','ore','ore','ore','ore','ally','ally','ally','ally','chest','shrine','trap'];
 plan.forEach((t,i)=>{out[key(rest[i])]={type:t};});
 return out;
}

function makeBoard(side,layout){
 const cells=[];for(let r=0;r<ROWS;r++){const row=[];for(let c=0;c<COLS;c++){const rr=side==='me'?r:ROWS-1-r,k=rr+','+c,item=layout[k]||{type:'empty'};row.push({fog:rr+c>1,content:item.type,kind:item.kind||null,peek:false,lair:null,unit:null});}cells.push(row);}
 return cells;
}

function makeSide(side,layout,ai){
 return{side,cells:makeBoard(side,layout),crystal:100,ore:50,baseHp:BASE_HP,collapsed:false,shield:0,summons:0,upLv:0,skills:Object.fromEntries(HERO_ORDER.map(k=>[k,0])),rps:null,ai:!!ai,aiT:0,kills:0,lairs:0,allies:0,scouted:0,leaks:0};
}

class FogGame{
 constructor(opts={}){
  this.seed=opts.seed??((Math.random()*1e9)|0);this.r=rng(this.seed);
  const layout=makeLayout(this.r);
  this.sides={me:makeSide('me',layout,opts.meAI),opp:makeSide('opp',layout,opts.oppAI!==false)};
  this.units=[];this.monsters=[];this.shots=[];this.zones=[];this.events=[];this.nextId=1;
  this.stage=1;this.phase='prep';this.prepT=opts.firstPrep??15;this.queue=[];this.spawnT=0;this.time=0;this.state='playing';this.result=null;
  this.score=0;this.aiLevel=opts.aiLevel??1;this.weather='clear';this.rival=RIVALS[Math.floor(this.r()*RIVALS.length)];this.lastIncome=null;
  // both sides start with two heroes on the start cell area
  for(const s of ['me','opp']){this.addUnit(s,'archer');this.addUnit(s,'scout');}
 }
 emit(type,data){this.events.push(Object.assign({type},data));if(this.events.length>400)this.events.shift();}
 drainEvents(){const e=this.events;this.events=[];return e;}
 popUsed(side){let p=0;for(const u of this.units)if(u.side===side)p+=HEROES[u.type].pop;return p;}
 unitAt(side,r,c){const id=this.sides[side].cells[r][c].unit;return id?this.units.find(u=>u.id===id):null;}
 freeCell(side,near){
  const s=this.sides[side],st=near||START[side];let best=null,bd=1e9;
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const cell=s.cells[r][c];if(cell.fog||cell.unit||cell.lair)continue;const d=Math.abs(r-st.r)+Math.abs(c-st.c);if(d<bd){bd=d;best={r,c};}}
  return best;
 }
 addUnit(side,type,at){
  const pos=at&&!this.sides[side].cells[at.r][at.c].unit?at:this.freeCell(side,at);if(!pos)return null;
  const u={id:this.nextId++,side,type,r:pos.r,c:pos.c,cd:.3+this.r()*.4,scout:null,kills:0,star:1,face:1,fire:0};
  this.units.push(u);this.sides[side].cells[pos.r][pos.c].unit=u.id;this.emit('spawnUnit',{id:u.id,side,type,r:pos.r,c:pos.c});return u;
 }
 removeUnit(u){const cell=this.sides[u.side].cells[u.r][u.c];if(cell.unit===u.id)cell.unit=null;this.units=this.units.filter(x=>x!==u);}
 canSummon(side){const s=this.sides[side];return this.state==='playing'&&!s.collapsed&&s.crystal>=summonCost(s.summons)&&this.popUsed(side)+1<=POP_CAP&&!!this.freeCell(side);}
 summon(side,forced){
  const s=this.sides[side];if(!this.canSummon(side))return null;
  // never roll a hero whose population would overflow the cap
  const room=POP_CAP-this.popUsed(side),table={};for(const k of HERO_ORDER)if(HEROES[k].pop<=room)table[k]=SUMMON_WEIGHT[k];
  const type=forced&&table[forced]?forced:pickWeighted(this.r,table);
  s.crystal-=summonCost(s.summons);s.summons++;const u=this.addUnit(side,type);this.emit('summon',{side,type,id:u.id});return u;
 }
 canUpgrade(side){const s=this.sides[side];return s.ore>=upgradeCost(s.upLv)&&s.upLv<10;}
 upgrade(side){const s=this.sides[side];if(this.state!=='playing'||!this.canUpgrade(side))return false;s.ore-=upgradeCost(s.upLv);s.upLv++;this.emit('upgrade',{side,lv:s.upLv});return true;}
 canRepair(side){const s=this.sides[side];return s.ore>=REPAIR_COST&&s.baseHp<BASE_HP&&!s.collapsed;}
 repair(side){const s=this.sides[side];if(this.state!=='playing'||!this.canRepair(side))return false;s.ore-=REPAIR_COST;s.baseHp=Math.min(BASE_HP,s.baseHp+4);this.emit('repair',{side});return true;}
 // A fog cell can be scouted when it touches a revealed cell (4 directions).
 scoutable(side,r,c){const cells=this.sides[side].cells;if(!cells[r]?.[c]?.fog||cells[r][c].unit)return false;return[[1,0],[-1,0],[0,1],[0,-1]].some(([dr,dc])=>{const n=cells[r+dr]?.[c+dc];return n&&!n.fog&&!n.lair;});}
 dropTarget(side,r,c,from){const cell=this.sides[side].cells[r]?.[c];if(!cell)return null;if(cell.lair)return null;if(cell.fog)return this.scoutable(side,r,c)?'scout':null;if(cell.unit){const o=this.units.find(x=>x.id===cell.unit),u=from&&this.units.find(x=>x.id===from);if(u&&o&&o!==u&&!o.scout&&o.type===u.type&&o.star===u.star&&o.star<3)return'merge';return'swap';}return'move';}
 dropUnit(side,id,r,c){
  if(this.state!=='playing')return false;const u=this.units.find(x=>x.id===id&&x.side===side);if(!u||u.scout)return false;
  const t=this.dropTarget(side,r,c,id);if(!t||(u.r===r&&u.c===c))return false;const cells=this.sides[side].cells;
  if(t==='merge'){const o=this.unitAt(side,r,c);this.removeUnit(u);o.star++;o.kills+=u.kills;o.cd=Math.min(o.cd,.2);this.emit('merge',{side,id:o.id,type:o.type,star:o.star,...cellCenter(side,r,c)});return true;}
  if(t==='swap'){const o=this.unitAt(side,r,c);if(!o||o.scout)return false;cells[u.r][u.c].unit=o.id;cells[r][c].unit=u.id;[o.r,o.c,u.r,u.c]=[u.r,u.c,r,c];this.emit('move',{id:u.id});this.emit('move',{id:o.id});return true;}
  cells[u.r][u.c].unit=null;u.r=r;u.c=c;cells[r][c].unit=u.id;
  if(t==='scout'){const total=SCOUT_TIME[HEROES[u.type].pop];u.scout={t:total,total};this.emit('scoutStart',{side,id:u.id,r,c,total});}
  else this.emit('move',{id:u.id});
  return true;
 }
 finishScout(u){
  const s=this.sides[u.side],cell=s.cells[u.r][u.c];u.scout=null;s.scouted++;const at=cellCenter(u.side,u.r,u.c);
  if(cell.content==='lair'){const L=LAIRS[cell.kind];cell.lair={kind:cell.kind,hp:L.hp*(1+.12*(this.stage-1)),max:L.hp*(1+.12*(this.stage-1))};cell.fog=false;this.removeUnit(u);this.emit('scoutFail',{side:u.side,r:u.r,c:u.c,x:at.x,y:at.y,kind:cell.kind});return;}
  cell.fog=false;cell.peek=false;const kind=cell.content;cell.content='empty';
  if(kind==='crystal'){const v=50+this.stage*6;s.crystal+=v;this.emit('loot',{side:u.side,res:'crystal',v,x:at.x,y:at.y});}
  else if(kind==='ore'){const v=30+this.stage*4;s.ore+=v;this.emit('loot',{side:u.side,res:'ore',v,x:at.x,y:at.y});}
  else if(kind==='chest'){const c=70+this.stage*8,o=40+this.stage*5;s.crystal+=c;s.ore+=o;this.emit('loot',{side:u.side,res:'chest',v:c,v2:o,x:at.x,y:at.y});}
  else if(kind==='trap'){u.stun=6;this.emit('trap',{side:u.side,x:at.x,y:at.y,id:u.id});}
  else if(kind==='shrine'){const roll=Math.floor(this.r()*3);let text;if(roll===0){for(const k of HERO_ORDER)s.skills[k]=0;text='모든 스킬 재사용 대기 초기화';}else if(roll===1&&s.upLv<10){s.upLv++;text=`무료 강화 → ${s.upLv}단계`;}else{s.baseHp=Math.min(BASE_HP,s.baseHp+4);s.crystal+=40;text='본부 체력 +4, 수정 +40';}this.emit('shrine',{side:u.side,x:at.x,y:at.y,text});}
  else if(kind==='ally'){s.rps={r:u.r,c:u.c,t:10,round:1};this.emit('ally',{side:u.side,x:at.x,y:at.y});}
  else this.emit('reveal',{side:u.side,x:at.x,y:at.y});
 }
 // Rock-paper-scissors with a found ally: 0 rock, 1 scissors, 2 paper. Draw = play again.
 playRps(side,pick){
  const s=this.sides[side];if(!s.rps||this.state!=='playing')return null;pick=((pick|0)%3+3)%3;const foe=Math.floor(this.r()*3);
  let res=pick===foe?'draw':((pick+1)%3===foe?'win':'lose');
  if(res==='draw'&&s.rps.round>=3)res='lose';
  const at=cellCenter(side,s.rps.r,s.rps.c),info={side,pick,foe,res,x:at.x,y:at.y};
  if(res==='draw'){s.rps.round++;s.rps.t=10;this.emit('rps',info);return info;}
  if(res==='win'){const room=POP_CAP-this.popUsed(side),table={};for(const k of HERO_ORDER)if(HEROES[k].pop<=room)table[k]=ALLY_WEIGHT[k];
   if(Object.keys(table).length&&this.freeCell(side,s.rps)){const u=this.addUnit(side,pickWeighted(this.r,table),this.freeCell(side,s.rps));info.hero=u.type;s.allies++;}else{s.crystal+=90;info.hero=null;}}
  s.rps=null;this.emit('rps',info);return info;
 }
 skillReady(side,type){const s=this.sides[side];return s.skills[type]<=0&&this.units.some(u=>u.side===side&&u.type===type&&!u.scout)&&!s.collapsed;}
 boardBox(side,pad=0){const y=BOARD_Y[side];return{x0:BX-pad,y0:y-pad,x1:BX+COLS*CELL+pad,y1:y+ROWS*CELL+pad};}
 nearBoard(side,m,pad=80){const b=this.boardBox(side,pad);return m.x>=b.x0&&m.x<=b.x1&&m.y>=b.y0&&m.y<=b.y1;}
 skillPower(side,type){const n=this.units.filter(u=>u.side===side&&u.type===type&&!u.scout).reduce((a,u)=>a+u.star,0);return Math.sqrt(Math.max(1,n))*(1+.15*this.sides[side].upLv)*hpMul(this.stage)**.75;}
 useSkill(side,type){
  if(this.state!=='playing'||!this.skillReady(side,type))return false;const s=this.sides[side],P=this.skillPower(side,type);
  const near=this.monsters.filter(m=>this.nearBoard(side,m,110));
  if(type==='scout'){const fog=[];s.cells.forEach((row,r)=>row.forEach((c,ci)=>{if(c.fog&&!c.peek)fog.push({r,c:ci});}));if(!fog.length)return false;for(let i=0;i<3&&fog.length;i++){const k=Math.floor(this.r()*fog.length),f=fog.splice(k,1)[0];s.cells[f.r][f.c].peek=true;this.emit('peek',{side,...cellCenter(side,f.r,f.c)});}}
  else if(type==='archer'){if(!near.length)return false;let best=near[0],bn=-1;for(const m of near){const n=near.filter(o=>Math.hypot(o.x-m.x,o.y-m.y)<80).length;if(n>bn){bn=n;best=m;}}this.zones.push({kind:'volley',side,x:best.x,y:best.y,r:78,t:3,max:3,dps:34*P});}
  else if(type==='guard'){if(!near.length)return false;for(const m of near){m.slowT=4;m.slowF=Math.max(m.slowF||0,m.boss?.35:.65);}this.emit('quake',{side,box:this.boardBox(side,40)});}
  else if(type==='pyro'){if(!near.length)return false;const lead=near.reduce((a,b)=>b.dist>a.dist?b:a);this.zones.push({kind:'fire',side,x:lead.x,y:lead.y,r:62,t:6,max:6,dps:26*P});}
  else if(type==='storm'){const pool=this.monsters.filter(m=>m.hp>0);if(!pool.length)return false;pool.sort((a,b)=>b.hp-a.hp).slice(0,3).forEach(m=>{this.emit('thunder',{side,x:m.x,y:m.y});this.damage(m,180*P,side,true);});}
  else if(type==='warden'){s.baseHp=Math.min(BASE_HP,s.baseHp+3);s.shield=8;this.emit('sanctuary',{side,...BASE[side]});}
  s.skills[type]=HEROES[type].cd;this.emit('skill',{side,type});return true;
 }
 startNow(){if(this.phase==='prep'&&this.state==='playing'){this.prepT=0;return true;}return false;}
 // Each stage gets a theme so waves feel different; bosses come every 5 stages.
 waveTheme(stage){if(BOSSES[stage])return'boss';if(stage<4)return'basic';return['swarm','armored','jelly','mixed','night'][stage%5];}
 waveFor(stage){
  const list=[],boss=BOSSES[stage],theme=this.waveTheme(stage),n=boss?Math.round(4+stage*.5):Math.round(7+stage*1.6);
  const pool={basic:{crawler:6,runner:stage>=2?3:0,brute:stage>=3?2:0},swarm:{runner:6,crawler:3,bat:stage>=9?3:0},armored:{brute:5,crawler:3,shell:stage>=11?3:0,moth:stage>=7?1:0},jelly:{jelly:5,crawler:3,moth:stage>=7?2:0},mixed:{crawler:3,runner:3,brute:2,jelly:stage>=6?2:0,moth:stage>=7?1:0,bat:stage>=9?2:0,shell:stage>=11?1:0},night:{bat:stage>=9?5:0,runner:4,moth:stage>=7?2:0,brute:2},boss:{crawler:3,runner:2,brute:stage>=10?2:0,shell:stage>=15?1:0}}[theme];
  const gap={runner:.55,bat:.5,brute:1.4,shell:1.6,jelly:1.1,moth:1,crawler:.9};
  for(let i=0;i<n;i++){const k=pickWeighted(this.r,Object.fromEntries(Object.entries(pool).filter(([,w])=>w>0)));list.push({kind:k,gap:gap[k]||.9});}
  if(theme==='swarm')for(let i=0;i<Math.floor(stage/3);i++)list.splice(Math.floor(this.r()*list.length),0,{kind:'runner',gap:.25},{kind:'runner',gap:.25});
  if(boss)list.splice(Math.floor(n/2),0,{kind:boss,gap:2.5});
  return list;
 }
 rollWeather(){const keys=Object.keys(WEATHER);this.weather=BOSSES[this.stage]||this.stage<3?'clear':keys[Math.floor(this.r()*keys.length)];this.emit('weather',{weather:this.weather,stage:this.stage});this.thunderT=5;}
 targetSide(stage){return stage%2===1?'opp':'me';}
 routeFor(target){
  const pts=PATHS[target].map(p=>p.slice());
  if(this.sides[target].collapsed){const o=OTHER[target];pts.push([BASE[o].x,BASE[o].y]);return{pts,target:o};}
  return{pts,target};
 }
 spawnMonster(kind,from){
  const M=MONSTERS[kind],mul=(M.flatHp?1:hpMul(this.stage))*[.8,1,1.12][this.aiLevel],route=from?{pts:from.pts,target:from.target}:this.routeFor(this.targetSide(this.stage));
  const m={id:this.nextId++,kind,hp:M.hp*mul,max:M.hp*mul,abT:3,phase:0,harden:0,speed:M.speed*(1+Math.min(.35,this.stage*.012))*(this.weather==='redmoon'?1.18:this.weather==='frost'?.88:1),armor:M.armor*(1+this.stage*.05),bounty:Math.round(M.bounty*(1+.07*(this.stage-1))),leak:M.leak,boss:!!M.boss,pts:route.pts,target:route.target,seg:1,x:route.pts[0][0],y:route.pts[0][1],dist:0,slowT:0,slowF:0,burn:0,hitT:0,wob:this.r()*6};
  if(!M.boss&&!from&&this.stage>=8&&this.r()<.1){m.elite=true;m.hp*=2.2;m.max*=2.2;m.bounty*=3;m.leak+=1;}
  if(from){m.x=from.x+(this.r()-.5)*16;m.y=from.y+(this.r()-.5)*16;m.seg=from.seg;m.dist=from.dist;}
  this.monsters.push(m);this.emit('spawn',{id:m.id,kind,boss:m.boss});if(m.boss)this.emit('boss',{kind});return m;
 }
 damage(m,amount,side,pierce){
  if(m.hp<=0)return 0;const armor=(m.armor+(m.auraArmor||0))*(m.harden>0?3:1),dealt=pierce?amount:Math.max(amount*.3,amount-armor);m.hp-=dealt;m.hitT=.12;
  if(m.hp<=0){const s=this.sides[side],bm=this.weather==='redmoon'?1.4:this.weather==='gold'?1.6:1;m.bounty=Math.round(m.bounty*bm);s.crystal+=m.bounty;s.kills++;if(side==='me')this.score+=m.boss?1500:Math.round(m.bounty*5);this.emit('kill',{id:m.id,kind:m.kind,side,x:m.x,y:m.y,bounty:m.bounty,boss:m.boss});
   const M=MONSTERS[m.kind];if(M.split)for(let i=0;i<2;i++)this.spawnMonster(M.split,m);}
  return dealt;
 }
 unitRange(u){return HEROES[u.type].range*CELL*(this.weather==='mist'?.85:1)*(1+.08*(u.star-1));}
 unitDamage(u){
  const s=this.sides[u.side];let mul=(1+.15*s.upLv)*[1,1,1.9,3.4][u.star];
  for(const o of this.units)if(o!==u&&o.side===u.side&&o.type==='warden'&&!o.scout&&Math.abs(o.r-u.r)<=1&&Math.abs(o.c-u.c)<=1)mul*=1+HEROES.warden.aura;
  return HEROES[u.type].dmg*mul;
 }
 step(dt){
  if(this.state!=='playing')return;this.time+=dt;
  for(const side of ['me','opp']){const s=this.sides[side];for(const k of HERO_ORDER)if(s.skills[k]>0)s.skills[k]=Math.max(0,s.skills[k]-dt);if(s.shield>0)s.shield=Math.max(0,s.shield-dt);
   if(s.rps){s.rps.t-=dt;if(s.rps.t<=0)this.playRps(side,Math.floor(this.r()*3));}
   if(s.ai)this.aiThink(side,dt);}
  // phases
  if(this.phase==='prep'){this.prepT-=dt;if(this.prepT<=0){this.phase='wave';this.queue=this.waveFor(this.stage);this.spawnT=0;this.emit('waveStart',{stage:this.stage,target:this.targetSide(this.stage),boss:BOSSES[this.stage]||null});}}
  else if(this.phase==='wave'){
   if(this.weather==='thunder'){this.thunderT-=dt;if(this.thunderT<=0){this.thunderT=5;const pool=this.monsters.filter(m=>m.hp>0);if(pool.length){const m=pool[Math.floor(this.r()*pool.length)];this.emit('thunder',{side:'none',x:m.x,y:m.y});const side=this.nearBoard('me',m,60)?'me':'opp';this.damage(m,m.max*.08+20,side,true);}}}
   this.spawnT-=dt;while(this.queue.length&&this.spawnT<=0){const q=this.queue.shift();this.spawnMonster(q.kind);this.spawnT+=q.gap;}
   if(!this.queue.length&&!this.monsters.length)this.clearStage();
  }
  // scouting
  for(const u of this.units.slice())if(u.scout){u.scout.t-=dt;if(u.scout.t<=0)this.finishScout(u);}
  // lairs slowly regrow when nobody hits them
  for(const side of ['me','opp'])for(const row of this.sides[side].cells)for(const c of row)if(c.lair){c.lair.idle=(c.lair.idle||0)+dt;if(c.lair.idle>3)c.lair.hp=Math.min(c.lair.max,c.lair.hp+c.lair.max*.02*dt);}
  this.monsterAbilities(dt);
  // monsters move
  for(const m of this.monsters){
   if(m.slowT>0){m.slowT-=dt;if(m.slowT<=0)m.slowF=0;}if(m.hitT>0)m.hitT-=dt;
   let move=m.speed*(1-(m.slowF||0)*(MONSTERS[m.kind].flying?.5:1))*dt;
   while(move>0&&m.seg<m.pts.length){const [tx,ty]=m.pts[m.seg],dx=tx-m.x,dy=ty-m.y,d=Math.hypot(dx,dy);if(d<=move){m.x=tx;m.y=ty;m.dist+=d;move-=d;m.seg++;}else{m.x+=dx/d*move;m.y+=dy/d*move;m.dist+=move;move=0;}}
   if(m.seg>=m.pts.length)this.reachBase(m);
  }
  // zones
  for(const z of this.zones){z.t-=dt;for(const m of this.monsters)if(Math.hypot(m.x-z.x,m.y-z.y)<z.r)this.damage(m,z.dps*dt,z.side,true);}
  this.zones=this.zones.filter(z=>z.t>0);
  // units fire
  for(const u of this.units){
   if(u.scout)continue;if(u.stun>0){u.stun-=dt;continue;}u.cd-=dt;if(u.fire>0)u.fire-=dt;if(u.cd>0)continue;const H=HEROES[u.type],c=cellCenter(u.side,u.r,u.c),R=this.unitRange(u);
   let tgt=null;for(const m of this.monsters){if(m.hp<=0)continue;if(Math.hypot(m.x-c.x,m.y-c.y)<=R&&(!tgt||m.dist>tgt.dist))tgt=m;}
   if(tgt){this.fire(u,c,{m:tgt.id,x:tgt.x,y:tgt.y});continue;}
   let lair=null;const cells=this.sides[u.side].cells;for(let r=0;r<ROWS;r++)for(let cc=0;cc<COLS;cc++){const L=cells[r][cc].lair;if(!L)continue;const lc=cellCenter(u.side,r,cc);if(Math.hypot(lc.x-c.x,lc.y-c.y)<=R+8&&(!lair||L.hp<lair.L.hp))lair={L,r,c:cc,x:lc.x,y:lc.y};}
   if(lair){this.fire(u,c,{lair:[lair.r,lair.c],x:lair.x,y:lair.y});continue;}
   u.cd=.1;
  }
  // projectiles
  for(const p of this.shots){
   const m=p.m?this.monsters.find(x=>x.id===p.m):null;if(m){p.tx=m.x;p.ty=m.y;}
   const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy),sp=p.speed*dt;
   if(d<=sp){p.done=true;this.impact(p,m);}else{p.x+=dx/d*sp;p.y+=dy/d*sp;}
  }
  this.shots=this.shots.filter(p=>!p.done);
  this.monsters=this.monsters.filter(m=>m.hp>0&&!m.gone);
  if(this.phase==='wave'&&!this.queue.length&&!this.monsters.length)this.clearStage();
 }
 fire(u,c,t){const H=HEROES[u.type];u.cd=H.rate;u.fire=.18;u.face=t.x<c.x?-1:1;this.shots.push({id:this.nextId++,x:c.x,y:c.y-10,tx:t.x,ty:t.y,m:t.m||null,lair:t.lair||null,side:u.side,type:u.type,dmg:this.unitDamage(u),speed:H.proj==='spear'?620:H.proj==='bolt'?900:480,uid:u.id});this.emit('shoot',{side:u.side,type:u.type,uid:u.id});}
 impact(p,m){
  const H=HEROES[p.type];
  if(p.lair){const cell=this.sides[p.side].cells[p.lair[0]][p.lair[1]];if(cell.lair){cell.lair.hp-=p.dmg;cell.lair.idle=0;this.emit('hit',{x:p.tx,y:p.ty,type:p.type,lair:true});if(cell.lair.hp<=0)this.clearLair(p.side,p.lair[0],p.lair[1]);}return;}
  if(!m){if(H.splash)this.emit('hit',{x:p.tx,y:p.ty,type:p.type});return;}
  const u=this.units.find(x=>x.id===p.uid),wasAlive=m.hp>0;
  if(H.splash){for(const o of this.monsters)if(Math.hypot(o.x-m.x,o.y-m.y)<=H.splash)this.damage(o,o===m?p.dmg:p.dmg*.6,p.side);}
  else this.damage(m,p.dmg,p.side);
  if(H.slow&&m.hp>0){m.slowT=Math.max(m.slowT,1.1);m.slowF=Math.max(m.slowF||0,m.boss?H.slow*.5:H.slow);}
  if(H.chain){let from=m,hit=new Set([m.id]);for(let i=0;i<H.chain;i++){let nx=null,nd=95;for(const o of this.monsters){if(hit.has(o.id)||o.hp<=0)continue;const d=Math.hypot(o.x-from.x,o.y-from.y);if(d<nd){nd=d;nx=o;}}if(!nx)break;hit.add(nx.id);this.emit('chain',{x1:from.x,y1:from.y,x2:nx.x,y2:nx.y});this.damage(nx,p.dmg*.7,p.side);from=nx;}}
  if(u&&wasAlive&&m.hp<=0)u.kills++;
  this.emit('hit',{x:m.x,y:m.y,type:p.type,boss:m.boss});
 }
 clearLair(side,r,c){const s=this.sides[side],cell=s.cells[r][c],L=LAIRS[cell.lair.kind],k=1+.1*(this.stage-1);const cr=Math.round(L.crystal*k),or=Math.round(L.ore*k);s.crystal+=cr;s.ore+=or;s.lairs++;if(side==='me')this.score+=400;const at=cellCenter(side,r,c);this.emit('lairDown',{side,x:at.x,y:at.y,crystal:cr,ore:or,kind:cell.lair.kind});cell.lair=null;cell.content='empty';}
 monsterAbilities(dt){
  for(const m of this.monsters)m.auraArmor=0;
  for(const m of this.monsters.slice()){
   if(m.hp<=0)continue;const M=MONSTERS[m.kind];if(m.harden>0)m.harden-=dt;
   if(M.aura)for(const o of this.monsters)if(o!==m&&Math.hypot(o.x-m.x,o.y-m.y)<70)o.auraArmor=Math.max(o.auraArmor,M.aura*(1+this.stage*.05));
   m.abT-=dt;if(m.abT>0)continue;
   if(M.healer){m.abT=1.6;let healed=false;for(const o of this.monsters)if(o!==m&&o.hp>0&&o.hp<o.max&&Math.hypot(o.x-m.x,o.y-m.y)<75){o.hp=Math.min(o.max,o.hp+o.max*.08);healed=true;}if(healed)this.emit('heal',{x:m.x,y:m.y});}
   else if(m.kind==='mudgiant'){m.abT=.5;const f=m.hp/m.max;if((m.phase===0&&f<.66)||(m.phase===1&&f<.33)){m.phase++;for(let i=0;i<3;i++)this.spawnMonster('crawler',m);this.emit('bossSkill',{kind:m.kind,x:m.x,y:m.y,text:'진흙 덩이 분리!'});}}
   else if(m.kind==='fogqueen'){m.abT=6;const side=m.target,cells=this.sides[side].cells,opts=[];cells.forEach((row,r)=>row.forEach((c,cc)=>{if(!c.fog&&!c.unit&&!c.lair&&r+(side==='me'?0:0)>=0){const rr=side==='me'?r:ROWS-1-r;if(rr+cc>1)opts.push({r,c:cc});}}));
    if(opts.length){const o=opts[Math.floor(this.r()*opts.length)];cells[o.r][o.c].fog=true;cells[o.r][o.c].content='empty';cells[o.r][o.c].peek=false;const at=cellCenter(side,o.r,o.c);this.emit('refog',{side,x:at.x,y:at.y});}
    if(m.phase===0&&m.hp<m.max*.5){m.phase=1;for(let i=0;i<3;i++)this.spawnMonster('moth',m);this.emit('bossSkill',{kind:m.kind,x:m.x,y:m.y,text:'나방 떼 소환!'});}}
   else if(m.kind==='ironbeetle'){m.abT=8;m.harden=3;this.emit('bossSkill',{kind:m.kind,x:m.x,y:m.y,text:'강철 껍질! 방어력 3배'});}
   else if(m.kind==='abyss'){m.abT=7;const side=m.target,rc=Math.floor(this.r()*(COLS-2))+1,rr=Math.floor(this.r()*(ROWS-2))+1;let n=0;for(const u of this.units)if(u.side===side&&Math.abs(u.r-rr)<=1&&Math.abs(u.c-rc)<=1&&!u.scout){u.stun=2.5;n++;}
    const at=cellCenter(side,rr,rc);this.emit('gaze',{side,x:at.x,y:at.y,n});m.phase=(m.phase+1)%2;if(m.phase===0)for(let i=0;i<2;i++)this.spawnMonster('bat',m);}
   else m.abT=99;
  }
 }
 reachBase(m){
  const s=this.sides[m.target];m.gone=true;
  if(s.collapsed){return;}
  if(s.shield>0){this.emit('blocked',{side:m.target,...BASE[m.target]});return;}
  s.baseHp=Math.max(0,s.baseHp-m.leak);s.leaks+=m.leak;this.emit('leak',{side:m.target,dmg:m.leak,...BASE[m.target]});
  if(s.baseHp<=0)this.collapse(m.target);
 }
 collapse(side){
  const s=this.sides[side];s.collapsed=true;this.emit('collapse',{side,...BASE[side]});
  for(const u of this.units.filter(x=>x.side===side))this.removeUnit(u);
  // monsters still walking to the fallen base continue along the left lane (blue route) to the other base
  for(const m of this.monsters)if(m.target===side&&!m.gone){m.pts=m.pts.concat([[BASE[OTHER[side]].x,BASE[OTHER[side]].y]]);m.target=OTHER[side];}
  if(side==='me'){this.state='lost';this.result='lose';this.finalScore();}
  else{this.sides.me.crystal+=200;this.score+=3000;}
 }
 clearStage(){
  if(this.phase!=='wave'||this.state!=='playing')return;const st=this.stage;
  for(const side of ['me','opp']){const s=this.sides[side];if(s.collapsed)continue;const base=30+st*6,interest=Math.min(30,Math.floor(s.crystal*.08)),ore=12+st*2;s.crystal+=base+interest;s.ore+=ore;if(side==='me')this.lastIncome={base,interest,ore};}
  if(!this.sides.me.collapsed)this.score+=st*120;
  this.emit('stageClear',{stage:st,income:this.lastIncome});
  if(st>=FINAL_STAGE){this.state='won';this.result='win';this.finalScore();return;}
  this.stage++;this.phase='prep';this.prepT=10;this.rollWeather();
 }
 finalScore(){const s=this.sides.me;this.score+=Math.max(0,s.baseHp)*150+s.lairs*100;this.emit('over',{result:this.result,score:this.score});}
 nextBoss(){for(let s=this.stage;s<=FINAL_STAGE;s++)if(BOSSES[s])return{stage:s,kind:BOSSES[s],...MONSTERS[BOSSES[s]],hp:MONSTERS[BOSSES[s]].hp};return null;}

 // ---------- opponent AI (also drives the "me" side in tests) ----------
 coverage(side,r,c,range){
  const ctr=cellCenter(side,r,c),R=range*CELL;let n=0;const paths=[this.routeFor('me').pts,this.routeFor('opp').pts];
  for(const pts of paths)for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i],L=Math.hypot(x1-x0,y1-y0);for(let d=0;d<L;d+=20){const x=x0+(x1-x0)*d/L,y=y0+(y1-y0)*d/L;if(Math.hypot(x-ctr.x,y-ctr.y)<=R)n+=(this.routeFor(this.targetSide(this.stage)).pts===pts?1:1);}}
  return n;
 }
 aiThink(side,dt){
  const s=this.sides[side];if(s.collapsed)return;s.aiT-=dt;if(s.aiT>0)return;
  const lvl=side==='me'?1.2:this.aiLevel;s.aiT=Math.max(.35,1.2-lvl*.35);
  if(s.rps){this.playRps(side,Math.floor(this.r()*3));return;}
  const mine=this.units.filter(u=>u.side===side),idle=mine.filter(u=>!u.scout);
  // skills
  for(const k of HERO_ORDER){if(!this.skillReady(side,k))continue;const near=this.monsters.filter(m=>this.nearBoard(side,m,110));
   if(k==='scout'||(k==='warden'&&(s.baseHp<=15||near.some(m=>m.boss&&m.target===side)))||(['archer','pyro','guard'].includes(k)&&(near.length>=4||near.some(m=>m.boss)))||(k==='storm'&&this.monsters.some(m=>m.boss||m.hp>500))){this.useSkill(side,k);return;}}
  if(s.baseHp<=12&&this.canRepair(side)){this.repair(side);return;}
  // merge two identical heroes when possible (frees a cell and population)
  for(const a of idle){const b=idle.find(o=>o!==a&&o.type===a.type&&o.star===a.star&&o.star<3);if(b){const keep=this.coverage(side,a.r,a.c,HEROES[a.type].range)>=this.coverage(side,b.r,b.c,HEROES[b.type].range)?a:b,drop=keep===a?b:a;if(this.dropUnit(side,drop.id,keep.r,keep.c))return;}}
  const style=side==='opp'?this.rival.style:'balanced';
  const reserve=(this.stage>=6?20:0)+(style==='greedy'?40:0);
  if(s.crystal-reserve>=summonCost(s.summons)&&this.canSummon(side)){this.summon(side);return;}
  if(this.canUpgrade(side)&&(style==='greedy'||s.baseHp>12||s.ore>REPAIR_COST+upgradeCost(s.upLv))){this.upgrade(side);return;}
  // scouting: send the cheapest idle hero when enough defenders stay home
  const scouting=mine.filter(u=>u.scout).length,maxScouts=(this.phase==='prep'?2:1+(this.stage>=8?1:0))+(style==='raider'?1:0)-(style==='turtle'&&this.phase==='wave'?1:0);
  if(scouting<maxScouts&&idle.length>=(style==='turtle'?4:3)){
   const opts=[];s.cells.forEach((row,r)=>row.forEach((cell,c)=>{if(this.scoutable(side,r,c)){let w=1+this.r();if(cell.peek)w+=cell.content==='lair'?-5:3;opts.push({r,c,w});}}));
   if(opts.length){opts.sort((a,b)=>b.w-a.w);const pool=idle.slice().sort((a,b)=>HEROES[a.type].pop-HEROES[b.type].pop||this.coverage(side,a.r,a.c,HEROES[a.type].range)-this.coverage(side,b.r,b.c,HEROES[b.type].range));
    const u=pool[0];if(opts[0].w>0&&this.dropUnit(side,u.id,opts[0].r,opts[0].c))return;}
  }
  // positioning: move the hero with the worst coverage to the best free spot
  let worst=null,wv=1e9;for(const u of idle){const v=this.coverage(side,u.r,u.c,HEROES[u.type].range);if(v<wv){wv=v;worst=u;}}
  if(worst){let best=null,bv=wv;for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){const cell=s.cells[r][c];if(cell.fog||cell.unit||cell.lair)continue;const v=this.coverage(side,r,c,HEROES[worst.type].range);if(v>bv+3){bv=v;best={r,c};}}
   if(best)this.dropUnit(side,worst.id,best.r,best.c);}
 }
}

return{FogGame,WEATHER,RIVALS,HEROES,HERO_ORDER,MONSTERS,BOSSES,LAIRS,COLS,ROWS,CELL,W,H,BX,BOARD_Y,LANE,SPAWN,BASE,START,PATHS,SCOUT_TIME,POP_CAP,BASE_HP,FINAL_STAGE,cellCenter,cellAt,summonCost,upgradeCost,REPAIR_COST,hpMul,pathLength,rng};
});
