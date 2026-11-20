'use strict';
// 균열의 검 — pure game rules. No DOM, no canvas: the renderer reads state and drains `events`.
const RIFT_FLOOR={left:40,right:920,top:290,bottom:505};
const RIFT_HEROES={
 blade:{name:'검사',title:'균열의 검사',role:'근접 · 연속 베기',desc:'세 번째 베기로 적을 띄우고, 회전베기로 포위를 뚫습니다.',color:'#7fe6d3',hp:190,mp:100,speed:235,atk:23,
  basic:[{dur:.28,at:.11,kind:'melee',range:105,width:42,mult:1,kb:70},{dur:.28,at:.11,kind:'melee',range:105,width:42,mult:1.15,kb:70},{dur:.44,at:.17,kind:'melee',range:125,width:48,mult:2,kb:180,launch:470,heavy:true}],
  skill:{name:'회전베기',cost:30,cd:2.4,dur:.52,hits:[{at:.16,kind:'ring',rx:135,ry:58,mult:1.5,kb:120},{at:.34,kind:'ring',rx:145,ry:62,mult:1.7,kb:190,launch:380,heavy:true}]},
  ult:{name:'균열참',dur:.95,hits:[{at:.25,kind:'lane',range:620,width:70,mult:2.6,kb:60},{at:.5,kind:'lane',range:620,width:70,mult:2.6,kb:60},{at:.75,kind:'lane',range:640,width:80,mult:4,kb:260,launch:560,heavy:true}]}},
 arcanist:{name:'마법사',title:'별빛 마법사',role:'원거리 · 빙결 제어',desc:'마력탄으로 거리를 벌리고, 서리 폭발로 적을 얼립니다.',color:'#b9a2ff',hp:120,mp:140,speed:215,atk:18,
  basic:[{dur:.3,at:.12,kind:'shot',speed:640,mult:1.1,r:11,shot:'bolt'},{dur:.3,at:.12,kind:'shot',speed:640,mult:1.2,r:11,shot:'bolt'},{dur:.46,at:.2,kind:'shot',speed:560,mult:2.1,r:18,shot:'orb',pierce:3,kb:150,heavy:true}],
  skill:{name:'서리 폭발',cost:34,cd:3,dur:.5,hits:[{at:.22,kind:'ring',rx:175,ry:78,mult:2.1,kb:90,freeze:1.8,heavy:true}]},
  ult:{name:'유성우',dur:1,hits:[{at:.2,kind:'meteors',count:7,r:80,mult:3.3}]}},
 ranger:{name:'궁수',title:'바람 궁수',role:'원거리 · 관통 사격',desc:'가장 빠른 영웅. 관통 화살로 일렬의 적을 꿰뚫습니다.',color:'#a6eb8f',hp:130,mp:110,speed:255,atk:16,
  basic:[{dur:.24,at:.09,kind:'shot',speed:980,mult:1,r:8,shot:'arrow'},{dur:.24,at:.09,kind:'shot',speed:980,mult:1.05,r:8,shot:'arrow'},{dur:.4,at:.15,kind:'fan',count:3,spread:.14,speed:980,mult:1.1,r:8,shot:'arrow',heavy:true}],
  skill:{name:'관통 사격',cost:26,cd:2.1,dur:.48,hits:[{at:.24,kind:'shot',speed:1250,mult:3,r:14,shot:'lance',pierce:99,kb:200,heavy:true}]},
  ult:{name:'화살비',dur:1.15,hits:[{at:.15,kind:'rain',width:430,duration:1.6,ticks:9,mult:1.15}]}}
};
const RIFT_ENEMIES={
 grunt:{name:'균열 병사',hp:105,speed:105,dmg:16,range:78,wind:.5,cd:1.35,score:100},
 archer:{name:'그림자 궁수',hp:78,speed:92,dmg:14,range:440,wind:.72,cd:2.1,score:120,ranged:true},
 brute:{name:'철갑 거인',hp:320,speed:66,dmg:30,range:120,wind:.85,cd:2.4,score:220,armor:true},
 wraith:{name:'망령',hp:95,speed:130,dmg:19,range:330,wind:.6,cd:2.3,score:150,float:true}
};
const RIFT_BOSSES=[
 {id:'warden',name:'철갑 수문장',hp:1700,speed:85,dmg:26,cd:1.7,patterns:['slam','charge','quake'],color:'#f1b46a'},
 {id:'treant',name:'고목 수호자',hp:2300,speed:60,dmg:26,cd:1.7,patterns:['erupt','volley','slam','summon'],color:'#9be07a'},
 {id:'witch',name:'서리 마녀',hp:2800,speed:100,dmg:28,cd:1.6,patterns:['beam','erupt','nova','volley'],color:'#9fe2ff'},
 {id:'knight',name:'화염 기사',hp:3400,speed:110,dmg:31,cd:1.5,patterns:['charge','slam','beam','erupt'],color:'#ff9a5c'},
 {id:'devourer',name:'균열 포식자',hp:4300,speed:75,dmg:34,cd:1.4,patterns:['beam','nova','erupt','volley','summon','quake'],color:'#ff6fa8'}
];
const RIFT_REGIONS=[
 {name:'잿빛 성문',sub:'THE ASHEN GATE',color:'#e9b77d',fights:[['grunt','grunt','grunt','grunt'],['grunt','grunt','archer','grunt','archer']]},
 {name:'이끼 숲',sub:'MOSSWOOD',color:'#9be07a',fights:[['grunt','archer','wraith','grunt','archer'],['brute','grunt','grunt','wraith','archer']]},
 {name:'서리 동굴',sub:'FROST HOLLOW',color:'#9fe2ff',fights:[['wraith','wraith','archer','grunt','grunt','archer'],['brute','archer','wraith','grunt','brute']]},
 {name:'화염 제단',sub:'EMBER ALTAR',color:'#ff9a5c',fights:[['brute','grunt','archer','wraith','grunt','archer'],['brute','brute','wraith','archer','wraith','grunt']]},
 {name:'균열의 심장',sub:'HEART OF THE RIFT',color:'#ff6fa8',fights:[['brute','wraith','archer','wraith','grunt','archer','grunt'],['brute','brute','archer','archer','wraith','wraith','grunt']]}
];
const RIFT_BLESSINGS=[
 {id:'edge',name:'예리한 칼날',desc:'모든 피해 +15%',max:3,icon:'⚔'},
 {id:'swift',name:'질풍',desc:'이동 속도 +12% · 대시 대기 −0.15초',max:2,icon:'➶'},
 {id:'leech',name:'피의 맹약',desc:'준 피해의 3%만큼 체력 회복',max:3,icon:'♥'},
 {id:'flow',name:'마력의 샘',desc:'마력 회복 +45%',max:2,icon:'✦'},
 {id:'resonance',name:'균열 공명',desc:'균열 게이지 충전 +35%',max:2,icon:'◈'},
 {id:'guard',name:'강철 피부',desc:'받는 피해 −12%',max:3,icon:'⛨'},
 {id:'execute',name:'처형자',desc:'체력 30% 이하의 적에게 피해 +40%',max:2,icon:'✖'},
 {id:'afterimage',name:'잔상',desc:'대시로 통과한 적에게 공격력의 80% 피해',max:2,icon:'≋'},
 {id:'chain',name:'연쇄 번개',desc:'기본 공격 4회마다 주변 적 2명에게 번개',max:2,icon:'ϟ'},
 {id:'vigor',name:'생명력',desc:'최대 체력 +25 · 즉시 25 회복',max:3,icon:'✚'},
 {id:'riposte',name:'반격의 호흡',desc:'완벽 회피 후 다음 공격 피해 2배',max:1,icon:'↺'},
 {id:'artistry',name:'기술 연마',desc:'기술 마력 −20% · 기술 피해 +20%',max:2,icon:'✧'}
];
const RIFT_DASH={time:.2,speed:760,inv:.3,cd:.72,perfect:.2};
const clampN=(v,a,b)=>Math.max(a,Math.min(b,v));

class RiftGame{
 constructor(heroId='blade',random=Math.random){
  this.random=typeof random==='function'?random:Math.random;
  this.state='ready';this.setHero(Object.hasOwn(RIFT_HEROES,heroId)?heroId:'blade');
 }
 setHero(id){
  if(this.state!=='ready'||!Object.hasOwn(RIFT_HEROES,id))return false;
  const h=RIFT_HEROES[id];this.heroId=id;this.hero=h;
  this.region=0;this.fight=0;this.time=0;this.score=0;this.kills=0;this.combo=0;this.comboT=0;this.maxCombo=0;this.perfects=0;this.damageTaken=0;this.fightDamage=0;
  this.blessings={};this.offers=[];this.enemies=[];this.hazards=[];this.shots=[];this.blasts=[];this.rains=[];this.queue=[];this.events=[];
  this.hitstop=0;this.slow=0;this.clearT=0;this.serial=0;this.basicCount=0;
  this.player={x:220,y:400,z:0,vz:0,vx:0,face:1,hp:h.hp,maxHp:h.hp,mp:h.mp,maxMp:h.mp,rift:0,inv:0,hurt:0,dash:0,dashCd:0,dashStart:-9,perfectUsed:true,riposte:false,skillCd:0,act:null,step:0,stepT:0,buffer:null,moving:false,dashHits:[]};
  return true;
 }
 rank(id){return this.blessings[id]||0;}
 get damageMult(){return 1+.15*this.rank('edge');}
 get speed(){return this.hero.speed*(1+.12*this.rank('swift'));}
 get dashCooldown(){return RIFT_DASH.cd-.15*this.rank('swift');}
 get mpRegen(){return 9*(1+.45*this.rank('flow'));}
 get guard(){return Math.min(.6,.12*this.rank('guard'));}
 get skillCost(){return Math.round(this.hero.skill.cost*(1-.2*this.rank('artistry')));}
 get regionData(){return RIFT_REGIONS[this.region];}
 get isBossFight(){return this.fight===2;}
 get enemyScale(){return{hp:1+this.region*.42,dmg:1+this.region*.22};}
 get alive(){return this.enemies.filter(e=>!e.dead);}
 emit(type,data={}){this.events.push({type,...data});if(this.events.length>300)this.events.splice(0,this.events.length-300);}
 drainEvents(){const e=this.events;this.events=[];return e;}

 start(){if(this.state!=='ready')return false;this.state='playing';this.beginFight();return true;}
 pause(){if(this.state==='playing'){this.state='paused';return true;}if(this.state==='paused'){this.state='playing';return true;}return false;}
 beginFight(){
  this.enemies=[];this.hazards=[];this.shots=[];this.blasts=[];this.rains=[];this.queue=[];this.clearT=0;this.fightDamage=0;
  const p=this.player;p.x=200;p.y=400;p.z=0;p.vz=0;p.act=null;p.buffer=null;
  if(this.isBossFight){
   const b=RIFT_BOSSES[this.region],s=this.enemyScale;
   this.enemies.push(this.makeEnemy('boss',{x:780,y:390,hp:Math.round(b.hp*(1+this.region*.08)),boss:b,dmgMult:s.dmg}));
   this.emit('boss',{name:b.name});
  }else{
   const roster=this.regionData.fights[this.fight],list=[...roster,...roster.slice(0,Math.ceil(roster.length/2))];list.forEach((type,i)=>this.queue.push({type,delay:.35+i*(i<3?.45:1.1),side:i%3===2?-1:1}));
   this.emit('fight',{region:this.region,fight:this.fight});
  }
 }
 makeEnemy(type,o={}){
  const d=type==='boss'?o.boss:RIFT_ENEMIES[type],s=this.enemyScale,hp=o.hp||Math.round(d.hp*s.hp);
  return{id:++this.serial,type,x:o.x??(o.side<0?-40:1000),y:o.y??clampN(300+this.random()*190,RIFT_FLOOR.top+10,RIFT_FLOOR.bottom-10),z:0,vz:0,vx:0,vy:0,face:-1,hp,maxHp:hp,
   dmgMult:o.dmgMult||s.dmg,state:'enter',t:0,cd:.6+this.random()*.8,flash:0,stun:0,freeze:0,air:false,dead:false,deadT:0,boss:o.boss||null,enraged:false,pattern:0,dash:null,hitBy:{}};
 }

 // ---------- player actions ----------
 canAct(){const p=this.player;return this.state==='playing'&&p.hurt<=0&&p.dash<=0&&p.z<=0;}
 attack(){return this.tryAction('basic');}
 skill(){return this.tryAction('skill');}
 ultimate(){return this.tryAction('ult');}
 tryAction(kind){
  const p=this.player;if(this.state!=='playing')return false;
  if(p.act&&!this.cancellable(kind)){p.buffer={kind,t:.3};return false;}
  if(p.hurt>0||p.dash>0){p.buffer={kind,t:.3};return false;}
  if(kind==='skill'&&(p.skillCd>0||p.mp<this.skillCost))return false;
  if(kind==='ult'&&p.rift<100)return false;
  let def;
  if(kind==='basic'){if(p.stepT<=0)p.step=0;def=this.hero.basic[p.step];p.step=(p.step+1)%3;p.stepT=.75;this.basicCount++;}
  else if(kind==='skill'){def=this.hero.skill;p.mp-=this.skillCost;p.skillCd=this.hero.skill.cd;}
  else{def=this.hero.ult;p.rift=0;p.inv=Math.max(p.inv,def.dur);}
  const target=this.nearestTarget(kind==='basic'?520:700);if(target&&Math.abs(target.x-p.x)>8)p.face=target.x>p.x?1:-1;
  p.act={kind,step:kind==='basic'?(p.step+2)%3:0,t:0,dur:def.dur,hits:def.hits||[def],fired:0,def};p.buffer=null;
  this.emit('act',{kind,step:p.act.step,hero:this.heroId});
  return true;
 }
 cancellable(next){const a=this.player.act;if(!a)return true;if(a.kind==='ult')return false;const last=a.hits[a.hits.length-1];return a.fired>=a.hits.length&&a.t>=last.at+.06&&(next!=='basic'||a.kind==='basic'||a.t>=a.dur*.85);}
 dashMove(){
  const p=this.player;if(this.state!=='playing'||p.dashCd>0||p.hurt>0&&p.hurt>.12||p.act?.kind==='ult')return false;
  p.act=null;p.dash=RIFT_DASH.time;p.dashCd=this.dashCooldown;p.inv=Math.max(p.inv,RIFT_DASH.inv);p.dashStart=this.time;p.perfectUsed=false;p.dashHits=[];p.hurt=0;
  this.emit('dash',{x:p.x,y:p.y,face:p.face});return true;
 }
 nearestTarget(maxD){const p=this.player;let best=null,bd=maxD;for(const e of this.alive){if(e.state==='enter'&&(e.x<0||e.x>960))continue;const d=Math.abs(e.x-p.x)+Math.abs(e.y-p.y)*1.6;if(d<bd){bd=d;best=e;}}return best;}
 fireHit(h){
  const p=this.player,atk=this.hero.atk*this.damageMult,skill=p.act.kind!=='basic',mult=h.mult*(skill?1+.2*this.rank('artistry'):1);
  const base={dmg:atk*mult,kb:h.kb||40,launch:h.launch||0,heavy:!!h.heavy,freeze:h.freeze||0,kind:p.act.kind};
  if(h.kind==='melee'||h.kind==='lane'){
   let n=0;for(const e of this.alive){const dx=(e.x-p.x)*p.face;if(dx>-25&&dx<h.range+(e.boss?45:0)&&Math.abs(e.y-p.y)<h.width+(e.boss?30:0)){this.damageEnemy(e,base);n++;}}
   this.emit('slash',{x:p.x,y:p.y,face:p.face,range:h.range,kind:p.act.kind,step:p.act.step,hit:n>0});
  }else if(h.kind==='ring'){
   for(const e of this.alive)if(((e.x-p.x)/(h.rx+(e.boss?40:0)))**2+((e.y-p.y)/(h.ry+(e.boss?20:0)))**2<=1)this.damageEnemy(e,{...base,kb:base.kb,dir:Math.sign(e.x-p.x)||p.face});
   this.emit('ring',{x:p.x,y:p.y,rx:h.rx,ry:h.ry,kind:this.heroId});
  }else if(h.kind==='shot'||h.kind==='fan'){
   const n=h.count||1;for(let i=0;i<n;i++){const a=(i-(n-1)/2)*(h.spread||0);this.shots.push({id:++this.serial,friendly:true,x:p.x+p.face*30,y:p.y,z:48,vx:Math.cos(a)*h.speed*p.face,vy:Math.sin(a)*h.speed*.35,r:h.r,life:1.1,dmg:base.dmg,kb:base.kb,launch:0,heavy:base.heavy,pierce:h.pierce||1,hit:[],kind:h.shot,skill:p.act.kind});}
   this.emit('shoot',{x:p.x,y:p.y,face:p.face,kind:h.shot});
  }else if(h.kind==='meteors'){
   const targets=this.alive.slice().sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));
   for(let i=0;i<h.count;i++){const t=targets[i%Math.max(1,targets.length)],x=t?t.x+(i>=targets.length?(this.random()-.5)*160:0):p.x+p.face*(120+i*80),y=t?t.y+(i>=targets.length?(this.random()-.5)*60:0):p.y;this.blasts.push({x:clampN(x,40,920),y:clampN(y,RIFT_FLOOR.top,RIFT_FLOOR.bottom),r:h.r,t:.35+i*.12,max:.35+i*.12,dmg:base.dmg,kind:'meteor',launch:380});}
  }else if(h.kind==='rain'){
   this.rains.push({x:p.x+p.face*(h.width/2+40),y:p.y,w:h.width,h:150,t:h.duration,max:h.duration,tick:0,interval:h.duration/h.ticks,dmg:base.dmg});this.emit('rain',{x:p.x,face:p.face});
  }
 }
 damageEnemy(e,o){
  if(e.dead)return 0;const p=this.player;
  let dmg=o.dmg*(e.hp<=e.maxHp*.3?1+.4*this.rank('execute'):1);
  if(p.riposte&&o.kind!=='dot'){dmg*=2;p.riposte=false;}
  dmg=Math.max(1,Math.round(dmg*(.92+this.random()*.16)));
  const dealt=Math.min(e.hp,dmg);e.hp-=dmg;e.flash=.12;
  const leech=.03*this.rank('leech');if(leech)p.hp=Math.min(p.maxHp,p.hp+dealt*leech);
  if(o.kind!=='dot'&&o.kind!=='chain'){
   p.rift=Math.min(100,p.rift+(o.kind==='ult'?0:(o.kind==='basic'?3.2:2.2))*(1+.35*this.rank('resonance')));
   this.combo++;this.comboT=2.2;this.maxCombo=Math.max(this.maxCombo,this.combo);
   this.hitstop=Math.max(this.hitstop,o.heavy?.085:.045);
  }
  const dir=o.dir||Math.sign(e.x-p.x)||p.face,armored=e.boss||e.type==='brute'&&e.state==='wind';
  if(!armored){
   e.vx=dir*o.kb*(e.type==='brute'?.45:1);e.stun=Math.max(e.stun,o.heavy?.5:.28);
   if(e.state==='wind'){e.state='idle';e.cd=Math.max(e.cd,.6);this.cancelOwned(e);}
   if(o.launch&&e.type!=='brute'){e.vz=o.launch;e.air=true;}
  }else if(e.boss)this.staggerBoss(e,dealt);
  if(o.freeze)e.freeze=Math.max(e.freeze,o.freeze);
  this.emit('hit',{x:e.x,y:e.y,z:e.z,dmg,heavy:o.heavy,boss:!!e.boss,kind:o.kind,id:e.id,crit:dmg>=this.hero.atk*3});
  if(e.hp<=0)this.killEnemy(e);
  else if(e.boss&&!e.enraged&&e.hp<=e.maxHp*.5){e.enraged=true;this.emit('enrage',{x:e.x,y:e.y,name:e.boss.name});}
  return dealt;
 }
 staggerBoss(e,dealt){e.poise=(e.poise||0)+dealt;if(e.poise>=e.maxHp*.12&&e.state!=='stagger'){e.poise=0;e.state='stagger';e.t=1.4;this.cancelOwned(e);e.dash=null;this.emit('stagger',{x:e.x,y:e.y});}}
 cancelOwned(e){this.hazards=this.hazards.filter(h=>h.owner!==e.id||h.wind<=0);}
 killEnemy(e){
  e.dead=true;e.deadT=0;e.hp=0;this.kills++;this.cancelOwned(e);
  const pts=e.boss?3000+this.region*1000:RIFT_ENEMIES[e.type].score;this.score+=Math.round(pts*(1+this.region*.25)*(1+Math.min(this.combo,50)/50));
  this.hitstop=Math.max(this.hitstop,e.boss?.35:.07);if(e.boss)this.slow=Math.max(this.slow,1.1);
  this.player.mp=Math.min(this.player.maxMp,this.player.mp+(e.boss?60:6));
  this.emit('kill',{x:e.x,y:e.y,z:e.z,type:e.type,boss:!!e.boss,id:e.id});
 }
 hitPlayer(dmg,src={}){
  const p=this.player;if(this.state!=='playing')return 0;
  if(p.inv>0){
   if(p.dash>0&&!p.perfectUsed&&this.time-p.dashStart<=RIFT_DASH.perfect){p.perfectUsed=true;this.perfects++;this.slow=Math.max(this.slow,.55);p.rift=Math.min(100,p.rift+18);p.mp=Math.min(p.maxMp,p.mp+10);if(this.rank('riposte')){p.riposte=true;p.dashCd=0;}this.score+=150;this.emit('perfect',{x:p.x,y:p.y});}
   return 0;
  }
  const d=Math.max(1,Math.round(dmg*(1-this.guard)));p.hp=Math.max(0,p.hp-d);this.damageTaken+=d;this.fightDamage+=d;
  p.inv=.75;p.hurt=.26;p.act=null;p.buffer=null;p.vx=(src.dir||(src.x!=null?Math.sign(p.x-src.x):-p.face)||1)*260;this.combo=0;
  this.emit('hurt',{x:p.x,y:p.y,dmg:d});
  if(p.hp<=0){this.state='lost';this.emit('defeat',{});}
  return d;
 }

 // ---------- simulation ----------
 step(rawDt,input={}){
  if(this.state!=='playing')return;rawDt=clampN(rawDt,0,.05);
  if(this.hitstop>0){this.hitstop=Math.max(0,this.hitstop-rawDt);return;}
  let dt=rawDt;if(this.slow>0){this.slow=Math.max(0,this.slow-rawDt);dt*=.35;}
  this.time+=dt;this.updatePlayer(dt,input);this.updateQueue(dt);
  for(const e of this.enemies)this.updateEnemy(e,dt);
  this.updateHazards(dt);this.updateShots(dt);this.updateBlasts(dt);
  this.comboT-=dt;if(this.comboT<=0)this.combo=0;
  this.enemies=this.enemies.filter(e=>!e.dead||(e.deadT+=dt)<.9);
  this.checkClear(dt);
 }
 updatePlayer(dt,input){
  const p=this.player;
  for(const k of ['inv','hurt','skillCd','dashCd'])p[k]=Math.max(0,p[k]-dt);p.stepT-=dt;
  p.mp=Math.min(p.maxMp,p.mp+this.mpRegen*dt);
  if(p.buffer){p.buffer.t-=dt;if(p.buffer.t<=0)p.buffer=null;}
  let mx=clampN(Number(input.x)||0,-1,1),my=clampN(Number(input.y)||0,-1,1);const len=Math.hypot(mx,my);if(len>1){mx/=len;my/=len;}
  if(p.dash>0){p.dash-=dt;p.x+=p.face*RIFT_DASH.speed*dt;
   if(this.rank('afterimage'))for(const e of this.alive)if(!p.dashHits.includes(e.id)&&Math.abs(e.x-p.x)<38&&Math.abs(e.y-p.y)<40){p.dashHits.push(e.id);this.damageEnemy(e,{dmg:this.hero.atk*this.damageMult*.8*this.rank('afterimage'),kb:20,kind:'dot'});}
  }else if(p.hurt>0){p.x+=p.vx*dt;p.vx*=Math.pow(.02,dt);}
  else if(p.act){
   const a=p.act;a.t+=dt;
   if(a.kind==='basic'&&a.t<a.def.at)p.x+=p.face*(this.heroId==='blade'?150:40)*dt;
   while(a.fired<a.hits.length&&a.t>=a.hits[a.fired].at){this.fireHit(a.hits[a.fired]);a.fired++;
    if(a.kind==='basic'&&this.rank('chain')&&this.basicCount%4===0&&a.fired===1)this.chainLightning();}
   if(a.t>=a.dur)p.act=null;
   else if(a.kind!=='ult'&&a.fired>=a.hits.length&&len>.3&&a.t>a.dur*.7)p.act=null;
  }else{
   p.x+=mx*this.speed*dt;p.y+=my*this.speed*.62*dt;if(Math.abs(mx)>.15)p.face=mx>0?1:-1;
  }
  p.moving=!p.act&&p.dash<=0&&p.hurt<=0&&len>.15;
  if(!p.act&&p.buffer&&this.canAct()){const b=p.buffer;p.buffer=null;this.tryAction(b.kind);}
  else if(p.act&&p.buffer&&this.cancellable(p.buffer.kind)){const b=p.buffer;p.buffer=null;p.act=null;this.tryAction(b.kind);}
  if(input.attack&&!p.act&&this.canAct())this.attack();
  p.x=clampN(p.x,RIFT_FLOOR.left,RIFT_FLOOR.right);p.y=clampN(p.y,RIFT_FLOOR.top,RIFT_FLOOR.bottom);
 }
 chainLightning(){
  const p=this.player,targets=this.alive.slice().sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)).slice(0,2);
  for(const t of targets){this.emit('chain',{x1:p.x,y1:p.y,x2:t.x,y2:t.y});this.damageEnemy(t,{dmg:this.hero.atk*this.damageMult*(.9+.6*this.rank('chain')),kb:30,kind:'chain'});}
 }
 updateQueue(dt){
  if(!this.queue.length)return;const active=this.alive.length;
  for(const q of this.queue)q.delay-=dt;
  while(this.queue.length&&this.queue[0].delay<=0&&active+1<=6){const q=this.queue.shift();this.enemies.push(this.makeEnemy(q.type,{side:q.side}));if(this.alive.length>=6)break;}
 }
 updateEnemy(e,dt){
  if(e.dead)return;const p=this.player;
  e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);
  const frozen=e.freeze>0;if(frozen)e.freeze=Math.max(0,e.freeze-dt);
  if(e.air||e.z>0){e.vz-=1500*dt;e.z+=e.vz*dt;e.x+=e.vx*dt;if(e.z<=0){e.z=0;e.vz=0;if(e.air){e.air=false;e.stun=Math.max(e.stun,.45);this.emit('land',{x:e.x,y:e.y});}}}
  else if(e.vx){e.x+=e.vx*dt;e.vx*=Math.pow(.004,dt);if(Math.abs(e.vx)<5)e.vx=0;}
  e.x=e.state==='enter'?e.x:clampN(e.x,RIFT_FLOOR.left,RIFT_FLOOR.right);
  if(e.stun>0||e.air||e.z>0)return;
  const pace=frozen?.25:e.enraged?1.25:1;dt*=pace;
  if(e.boss)return this.updateBoss(e,dt);
  const d=RIFT_ENEMIES[e.type],dx=p.x-e.x,dy=p.y-e.y;
  if(e.state==='enter'){e.x+=Math.sign(480-e.x)*d.speed*1.3*dt;e.face=Math.sign(480-e.x)||-1;if(e.x>70&&e.x<890)e.state='idle';return;}
  if(e.state==='dash'){const k=Math.min(1,dt/Math.max(.001,e.dash.t));e.x+=(e.dash.x-e.x)*k;e.y+=(e.dash.y-e.y)*k;e.dash.t-=dt;if(e.dash.t<=0){e.state='idle';e.dash=null;e.cd=d.cd;}return;}
  if(e.state==='wind'){e.t-=dt;if(e.t<=0){e.state='recover';e.t=.35;}return;}
  if(e.state==='recover'){e.t-=dt;if(e.t<=0){e.state='idle';e.cd=d.cd*(.8+this.random()*.4);}return;}
  e.cd-=dt;e.face=dx>=0?1:-1;
  const want=d.ranged?(Math.abs(dx)<220?-1:Math.abs(dx)>d.range?1:0):e.type==='wraith'?(Math.abs(dx)>d.range-30?1:0):(Math.abs(dx)>d.range-12?1:0);
  // keep a little vertical spacing so groups don't stack on one lane
  let sep=0;for(const o of this.alive)if(o!==e&&Math.abs(o.x-e.x)<40&&Math.abs(o.y-e.y)<26)sep+=e.y>=o.y?1:-1;
  e.x+=want*Math.sign(dx)*d.speed*dt;e.y+=clampN(dy*(d.ranged?.6:1.4),-d.speed*.7,d.speed*.7)*dt+sep*30*dt;e.y=clampN(e.y,RIFT_FLOOR.top,RIFT_FLOOR.bottom);
  const inRange=Math.abs(dx)<=d.range&&Math.abs(dy)<(d.ranged||e.type==='wraith'?70:34);
  if(e.cd<=0&&inRange)this.enemyAttack(e,d);
 }
 enemyAttack(e,d){
  const p=this.player,dmg=d.dmg*e.dmgMult;e.state='wind';e.t=d.wind+.05;
  if(e.type==='grunt')this.addHazard({shape:'rect',x1:e.face>0?e.x:e.x-d.range,x2:e.face>0?e.x+d.range:e.x,y:e.y,h:30,wind:d.wind,dmg,owner:e.id,kind:'slash'});
  else if(e.type==='brute')this.addHazard({shape:'circle',x:e.x+e.face*70,y:e.y,rx:95,ry:42,wind:d.wind,dmg,owner:e.id,kind:'slam'});
  else if(e.type==='archer')this.addHazard({shape:'aim',x1:e.x,y1:e.y,x2:p.x,y2:p.y,wind:d.wind,dmg,owner:e.id,kind:'arrow'});
  else if(e.type==='wraith'){const tx=clampN(e.x+Math.sign(p.x-e.x)*330,60,900),ty=clampN(p.y,RIFT_FLOOR.top,RIFT_FLOOR.bottom);this.addHazard({shape:'line',x1:e.x,y1:e.y,x2:tx,y2:ty,w:34,wind:d.wind,dmg,owner:e.id,kind:'dash'});}
 }
 addHazard(h){h.maxWind=h.wind;h.life=.35;h.done=false;this.hazards.push(h);return h;}
 inHazard(h,x,y){
  if(h.shape==='circle')return((x-h.x)/h.rx)**2+((y-h.y)/h.ry)**2<=1;
  if(h.shape==='rect')return x>=h.x1-12&&x<=h.x2+12&&Math.abs(y-h.y)<=h.h;
  if(h.shape==='line'){const vx=h.x2-h.x1,vy=h.y2-h.y1,l2=vx*vx+vy*vy||1,t=clampN(((x-h.x1)*vx+(y-h.y1)*vy)/l2,0,1);return Math.hypot(x-(h.x1+vx*t),(y-(h.y1+vy*t))*1.3)<=h.w;}
  return false;
 }
 updateHazards(dt){
  const p=this.player;
  for(const h of this.hazards){
   if(h.wind>0){h.wind-=dt;if(h.wind>0)continue;}
   if(!h.done){h.done=true;const owner=this.enemies.find(e=>e.id===h.owner);
    if(h.shape==='aim'){const a=Math.atan2(h.y2-h.y1,h.x2-h.x1),sp=h.speed||560;this.shots.push({id:++this.serial,friendly:false,x:h.x1,y:h.y1,z:46,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:12,life:1.6,dmg:h.dmg,kind:h.kind==='seed'?'seed':h.kind==='shard'?'shard':'arrow',hit:[]});}
    else{if(h.kind==='dash'&&owner&&!owner.dead){owner.state='dash';owner.dash={x:h.x2,y:h.y2,t:.18};}
     if(h.kind==='charge'&&owner&&!owner.dead){owner.state='dash';owner.dash={x:h.tx,y:owner.y,t:.3};}
     if(this.inHazard(h,p.x,p.y))this.hitPlayer(h.dmg,{x:h.x??h.x1});
     this.emit('impact',{kind:h.kind,x:h.x??(h.x1+h.x2)/2,y:h.y??h.y1,shape:h.shape,h});}
   }
   h.life-=dt;
  }
  this.hazards=this.hazards.filter(h=>h.wind>0||h.life>0);
 }
 updateShots(dt){
  const p=this.player;
  for(const s of this.shots){
   s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
   if(s.y<RIFT_FLOOR.top-30||s.y>RIFT_FLOOR.bottom+20||s.x<-60||s.x>1020)s.life=0;
   if(s.life<=0)continue;
   if(s.friendly){for(const e of this.alive){if(s.hit.includes(e.id))continue;const reach=s.r+(e.boss?55:22);if(Math.abs(e.x-s.x)<reach&&Math.abs(e.y-s.y)<reach*.9+(e.boss?20:8)){s.hit.push(e.id);this.damageEnemy(e,{dmg:s.dmg,kb:s.kb||45,heavy:s.heavy,kind:s.skill,dir:Math.sign(s.vx)});s.pierce--;if(s.pierce<=0){s.life=0;break;}}}}
   else if(Math.abs(p.x-s.x)<s.r+16&&Math.abs(p.y-s.y)<s.r+18){const dealt=this.hitPlayer(s.dmg,{dir:Math.sign(s.vx)});if(dealt||p.dash<=0)s.life=0;}
  }
  this.shots=this.shots.filter(s=>s.life>0);
 }
 updateBlasts(dt){
  for(const b of this.blasts){b.t-=dt;if(b.t<=0&&!b.done){b.done=true;for(const e of this.alive)if(((e.x-b.x)/(b.r+(e.boss?40:0)))**2+((e.y-b.y)/(b.r*.5+(e.boss?20:0)))**2<=1)this.damageEnemy(e,{dmg:b.dmg,kb:120,launch:b.launch,heavy:true,kind:'ult',dir:Math.sign(e.x-b.x)||1});this.emit('blast',{x:b.x,y:b.y,r:b.r});}}
  this.blasts=this.blasts.filter(b=>!b.done||b.t>-.4);
  for(const r of this.rains){r.t-=dt;r.tick-=dt;if(r.tick<=0&&r.t>0){r.tick=r.interval;for(const e of this.alive)if(Math.abs(e.x-r.x)<=r.w/2&&Math.abs(e.y-r.y)<=r.h)this.damageEnemy(e,{dmg:r.dmg,kb:10,kind:'dot'});}}
  this.rains=this.rains.filter(r=>r.t>0);
 }
 // ---------- bosses ----------
 updateBoss(e,dt){
  const p=this.player,b=e.boss,dx=p.x-e.x;
  if(e.state==='enter')e.state='idle';
  if(e.state==='stagger'){e.t-=dt;if(e.t<=0){e.state='idle';e.cd=.8;}return;}
  if(e.state==='dash'){const k=Math.min(1,dt/Math.max(.001,e.dash.t));e.x+=(e.dash.x-e.x)*k;e.y+=(e.dash.y-e.y)*k;e.dash.t-=dt;if(e.dash.t<=0){e.state='recover';e.t=.5;e.dash=null;}return;}
  if(e.state==='wind'||e.state==='recover'){e.t-=dt;if(e.t<=0){if(e.state==='wind'){e.state='recover';e.t=.55;}else{e.state='idle';e.cd=b.cd*(e.enraged?.62:1);}}return;}
  e.face=dx>=0?1:-1;e.cd-=dt;
  const desired=150;if(Math.abs(dx)>desired)e.x+=Math.sign(dx)*b.speed*dt;e.y+=clampN(p.y-e.y,-b.speed*.6,b.speed*.6)*dt;e.y=clampN(e.y,RIFT_FLOOR.top+10,RIFT_FLOOR.bottom-10);
  if(e.cd<=0){const list=b.patterns;const name=list[e.pattern%list.length];e.pattern+=1+(this.random()<.35?1:0);this.bossAttack(e,name);}
 }
 bossAttack(e,name){
  const p=this.player,b=e.boss,dmg=b.dmg*e.dmgMult,fast=e.enraged?.8:1;let wind=.9*fast;
  const H=o=>this.addHazard({owner:e.id,dmg,...o});
  if(name==='slam'){H({shape:'circle',x:e.x+e.face*90,y:e.y,rx:150,ry:62,wind,kind:'slam'});if(e.enraged)H({shape:'circle',x:e.x-e.face*90,y:e.y,rx:120,ry:52,wind:wind+.35,kind:'slam'});}
  else if(name==='charge'){const tx=e.face>0?900:60;H({shape:'rect',x1:Math.min(e.x,tx),x2:Math.max(e.x,tx),y:e.y,h:44,wind,kind:'charge',tx});}
  else if(name==='quake'){for(let i=0;i<4;i++)H({shape:'circle',x:clampN(e.x+e.face*(110+i*150),60,900),y:clampN(e.y+(p.y-e.y)*(i+1)/4,RIFT_FLOOR.top,RIFT_FLOOR.bottom),rx:80,ry:36,wind:wind*.7+i*.22,kind:'quake'});wind+=.66;}
  else if(name==='erupt'){const n=e.enraged?5:4;for(let i=0;i<n;i++)H({shape:'circle',x:clampN(p.x+(i?(this.random()-.5)*300:0),60,900),y:clampN(p.y+(i?(this.random()-.5)*130:0),RIFT_FLOOR.top,RIFT_FLOOR.bottom),rx:62,ry:28,wind:wind+i*.12,kind:b.id==='witch'?'ice':b.id==='knight'||b.id==='devourer'?'fire':'root'});wind+=n*.12;}
  else if(name==='volley'){const n=e.enraged?7:5,base=Math.atan2(p.y-e.y,p.x-e.x);for(let i=0;i<n;i++){const a=base+(i-(n-1)/2)*.2;H({shape:'aim',x1:e.x,y1:e.y-10,x2:e.x+Math.cos(a)*700,y2:e.y+Math.sin(a)*700,wind:wind*.8,kind:b.id==='treant'?'seed':'shard',speed:430,dmg:dmg*.6});}}
  else if(name==='beam'){H({shape:'rect',x1:40,x2:920,y:p.y,h:30,wind:wind+.15,kind:'beam'});if(e.enraged)H({shape:'rect',x1:40,x2:920,y:clampN(p.y+(p.y>400?-80:80),RIFT_FLOOR.top,RIFT_FLOOR.bottom),h:30,wind:wind+.55,kind:'beam'});wind+=.2;}
  else if(name==='nova'){H({shape:'circle',x:e.x,y:e.y,rx:230,ry:100,wind:wind+.25,kind:'nova'});wind+=.25;}
  else if(name==='summon'){if(this.alive.length<4)for(let i=0;i<2;i++)this.enemies.push(this.makeEnemy(i?'archer':'grunt',{side:i?-1:1}));wind=.6;}
  e.state='wind';e.t=wind+.05;this.emit('bossCast',{name,x:e.x,y:e.y});
 }
 // ---------- progression ----------
 checkClear(dt){
  if(this.queue.length||this.alive.length)return;
  this.clearT+=dt;if(this.clearT<1.1)return;
  if(this.fightDamage===0)this.score+=500*(1+this.region);
  if(this.isBossFight&&this.region===RIFT_REGIONS.length-1){this.score+=Math.max(0,Math.round(20000-this.time*12));this.state='won';this.emit('victory',{});return;}
  if(this.isBossFight){const p=this.player;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.4);}
  this.offers=this.rollOffers();this.state=this.offers.length?'choice':'playing';
  if(this.state==='playing')this.advance();
 }
 rollOffers(){const pool=RIFT_BLESSINGS.filter(b=>this.rank(b.id)<b.max),out=[];while(pool.length&&out.length<3)out.push(pool.splice(Math.floor(this.random()*pool.length),1)[0].id);return out;}
 choose(id){
  if(this.state!=='choice'||!this.offers.includes(id))return false;const b=RIFT_BLESSINGS.find(x=>x.id===id);if(this.rank(id)>=b.max)return false;
  this.blessings[id]=this.rank(id)+1;if(id==='vigor'){this.player.maxHp+=25;this.player.hp=Math.min(this.player.maxHp,this.player.hp+25);}
  this.offers=[];this.state='playing';this.advance();return true;
 }
 advance(){if(this.fight<2)this.fight++;else{this.fight=0;this.region++;}this.beginFight();}
 get progress(){return this.region*3+this.fight;}
}
if(typeof module!=='undefined')module.exports={RiftGame,RIFT_HEROES,RIFT_ENEMIES,RIFT_BOSSES,RIFT_REGIONS,RIFT_BLESSINGS,RIFT_FLOOR,RIFT_DASH};
