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
// Three weapons per hero. Each changes the basic combo and adds an element; level 3 awakens a weapon trait, level 6 is legendary.
const RIFT_ELEMENTS={
 rift:{name:'균열',color:'#7fe6d3',desc:'기본 공격 균열 게이지 +40%'},
 fire:{name:'화염',color:'#ff8a3a',desc:'화상: 2.5초 동안 지속 피해'},
 ice:{name:'냉기',color:'#9fe2ff',desc:'냉기 5중첩 시 빙결'},
 shock:{name:'번개',color:'#ffe66a',desc:'30% 확률로 옆의 적에게 전이'},
 poison:{name:'맹독',color:'#9dff6a',desc:'중독이 최대 6중첩까지 쌓임'},
 arcane:{name:'비전',color:'#b9a2ff',desc:'적중마다 마력 회복'},
 wind:{name:'바람',color:'#c8ffe0',desc:'넉백 +50% · 관통 +1'}
};
const RIFT_WEAPON_MAX=6;
const RIFT_WEAPONS={
 blade:[
  {id:'steel',name:'균열 장검',elem:'rift',art:'sword',desc:'균형 잡힌 3연 베기.',awaken:'세 번째 베기가 검기를 날립니다.',
   basic:RIFT_HEROES.blade.basic},
  {id:'ember',name:'화염 대검',elem:'fire',art:'flamesword',desc:'느리지만 넓고 묵직한 베기.',awaken:'강타가 화염 폭발을 일으킵니다.',
   basic:[{dur:.36,at:.15,kind:'melee',range:120,width:50,mult:1.35,kb:110},{dur:.36,at:.15,kind:'melee',range:120,width:50,mult:1.5,kb:110},{dur:.56,at:.24,kind:'melee',range:145,width:58,mult:2.7,kb:240,launch:520,heavy:true}]},
  {id:'twin',name:'뇌명 쌍검',elem:'shock',art:'dagger',desc:'아주 빠른 연속 찌르기. 마지막은 2연타.',awaken:'모든 공격이 번개를 두 번 전이합니다.',
   basic:[{dur:.2,at:.07,kind:'melee',range:92,width:40,mult:.78,kb:40},{dur:.2,at:.07,kind:'melee',range:92,width:40,mult:.84,kb:40},{dur:.38,hits:[{at:.08,kind:'melee',range:100,width:44,mult:.9,kb:60},{at:.2,kind:'melee',range:112,width:46,mult:1.35,kb:170,launch:430,heavy:true}]}]}
 ],
 arcanist:[
  {id:'star',name:'별빛 지팡이',elem:'arcane',art:'staff',desc:'마력탄 두 발 뒤 관통 구체.',awaken:'구체가 적을 추적하고 터집니다.',
   basic:RIFT_HEROES.arcanist.basic},
  {id:'frost',name:'서리 지팡이',elem:'ice',art:'icestaff',desc:'얼음 파편을 흩뿌리고 서리 폭발이 더 오래 얼립니다.',awaken:'얼거나 냉기에 걸린 적이 30% 더 아파합니다.',
   basic:[{dur:.3,at:.12,kind:'fan',count:2,spread:.12,speed:700,mult:.72,r:9,shot:'ice'},{dur:.3,at:.12,kind:'fan',count:2,spread:.12,speed:700,mult:.76,r:9,shot:'ice'},{dur:.46,at:.2,kind:'shot',speed:520,mult:1.9,r:20,shot:'iceorb',pierce:3,kb:100,heavy:true}],
   skill:{freeze:2.6}},
  {id:'storm',name:'뇌전 홀',elem:'shock',art:'stormrod',desc:'가장 가까운 적에게 번개가 바로 꽂힙니다.',awaken:'번개가 한 명 더 튑니다.',
   basic:[{dur:.3,at:.12,kind:'zap',range:400,mult:1.05,jumps:0,kb:40},{dur:.3,at:.12,kind:'zap',range:400,mult:1.1,jumps:1,kb:40},{dur:.48,at:.22,kind:'zap',range:440,mult:1.55,jumps:2,kb:130,heavy:true}]}
 ],
 ranger:[
  {id:'long',name:'바람 장궁',elem:'wind',art:'bow',desc:'멀리 날아가 밀쳐내는 화살.',awaken:'세 번째 사격이 화살 다섯 발이 됩니다.',
   basic:RIFT_HEROES.ranger.basic},
  {id:'venom',name:'독사 단궁',elem:'poison',art:'venombow',desc:'빠른 독화살로 중독을 쌓습니다.',awaken:'중독된 적이 쓰러지면 독이 퍼집니다.',
   basic:[{dur:.22,at:.08,kind:'shot',speed:900,mult:.85,r:8,shot:'venom'},{dur:.22,at:.08,kind:'shot',speed:900,mult:.88,r:8,shot:'venom'},{dur:.4,at:.15,kind:'fan',count:3,spread:.2,speed:900,mult:.9,r:8,shot:'venom',heavy:true}]},
  {id:'blaze',name:'화염 석궁',elem:'fire',art:'crossbow',desc:'느린 폭발 화살. 맞은 곳 주변까지 태웁니다.',awaken:'폭발 범위 +50% · 폭발 피해 80%.',
   basic:[{dur:.34,at:.14,kind:'shot',speed:820,mult:1.3,r:10,shot:'firebolt',splash:70},{dur:.34,at:.14,kind:'shot',speed:820,mult:1.35,r:10,shot:'firebolt',splash:70},{dur:.5,at:.2,kind:'shot',speed:760,mult:2.3,r:14,shot:'firebolt',splash:115,kb:180,heavy:true}]}
 ]
};
const RIFT_WEAPON_LEVELS=['','기본','피해 +10%','각성 · 피해 +10%','피해 +10%','속성 효과 ×1.5 · 피해 +10%','전설 · 궁극기 +30% · 피해 +10%'];
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
 constructor(heroId='blade',random=Math.random,weaponId){
  this.random=typeof random==='function'?random:Math.random;
  this.state='ready';this.setHero(Object.hasOwn(RIFT_HEROES,heroId)?heroId:'blade',weaponId);
 }
 setWeapon(id){
  if(this.state!=='ready')return false;const w=RIFT_WEAPONS[this.heroId].find(x=>x.id===id);if(!w)return false;
  this.weapon=w;this.weaponId=w.id;return true;
 }
 setHero(id,weaponId){
  if(this.state!=='ready'||!Object.hasOwn(RIFT_HEROES,id))return false;
  const h=RIFT_HEROES[id];this.heroId=id;this.hero=h;this.weapon=RIFT_WEAPONS[id][0];this.weaponId=this.weapon.id;if(weaponId)this.setWeapon(weaponId);this.wlv=1;
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
 get weaponMult(){return 1+.1*(this.wlv-1);}
 get awakened(){return this.wlv>=3;}
 get legendary(){return this.wlv>=RIFT_WEAPON_MAX;}
 get elemPower(){return this.wlv>=5?1.5:1;}
 get elem(){return this.weapon.elem;}
 get skillDef(){const m=this.weapon.skill;if(!m)return this.hero.skill;return{...this.hero.skill,hits:this.hero.skill.hits.map(h=>({...h,...m}))};}
 upgradeWeapon(){if(this.wlv>=RIFT_WEAPON_MAX)return false;this.wlv++;this.emit('forge',{lv:this.wlv,awaken:this.wlv===3,legend:this.wlv===RIFT_WEAPON_MAX,x:this.player.x,y:this.player.y});return true;}
 get regionData(){return RIFT_REGIONS[this.region];}
 get isBossFight(){return this.fight===2;}
 get enemyScale(){return{hp:1+this.region*.66,dmg:1+this.region*.36};}
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
  if(kind==='basic'){if(p.stepT<=0)p.step=0;def=this.weapon.basic[p.step];p.step=(p.step+1)%3;p.stepT=.75;this.basicCount++;}
  else if(kind==='skill'){def=this.skillDef;p.mp-=this.skillCost;p.skillCd=this.hero.skill.cd;}
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
  const p=this.player,w=this.weapon,aw=this.awakened,kind=p.act.kind,skill=kind!=='basic';
  const atk=this.hero.atk*this.damageMult*this.weaponMult,mult=h.mult*(skill?1+.2*this.rank('artistry'):1)*(kind==='ult'&&this.legendary?1.3:1);
  const wind=w.elem==='wind';
  const base={dmg:atk*mult,kb:(h.kb||40)*(wind?1.5:1),launch:h.launch||0,heavy:!!h.heavy,freeze:h.freeze||0,kind,elem:w.elem};
  if(h.kind==='melee'||h.kind==='lane'){
   let n=0,fx=p.x+p.face*h.range*.55;for(const e of this.alive){const dx=(e.x-p.x)*p.face;if(dx>-25&&dx<h.range+(e.boss?45:0)&&Math.abs(e.y-p.y)<h.width+(e.boss?30:0)){this.damageEnemy(e,base);n++;fx=e.x;}}
   this.emit('slash',{x:p.x,y:p.y,face:p.face,range:h.range,kind,step:p.act.step,hit:n>0,elem:w.elem,weapon:w.id,lv:this.wlv});
   if(aw&&kind==='basic'&&h.heavy){
    if(w.id==='steel')this.addShot({x:p.x+p.face*40,vx:p.face*820,vy:0,r:22,life:.6,dmg:atk*1.2,kb:90,pierce:99,kind:'wave',skill:'basic',heavy:true});
    if(w.id==='ember'&&n>0)this.blasts.push({x:clampN(fx,40,920),y:p.y,r:95,t:0,max:.01,dmg:atk*1.1,kind:'flame',launch:0,hitKind:'skill',elem:'fire'});
   }
  }else if(h.kind==='ring'){
   for(const e of this.alive)if(((e.x-p.x)/(h.rx+(e.boss?40:0)))**2+((e.y-p.y)/(h.ry+(e.boss?20:0)))**2<=1)this.damageEnemy(e,{...base,dir:Math.sign(e.x-p.x)||p.face});
   this.emit('ring',{x:p.x,y:p.y,rx:h.rx,ry:h.ry,kind:this.heroId,elem:w.elem});
  }else if(h.kind==='shot'||h.kind==='fan'){
   const n=(h.count||1)+(aw&&w.id==='long'&&h.heavy&&kind==='basic'?2:0),spread=h.spread*(n>3?.8:1)||0;
   for(let i=0;i<n;i++){const a=(i-(n-1)/2)*spread;
    const orb=aw&&w.id==='star'&&h.shot==='orb';
    this.addShot({x:p.x+p.face*30,vx:Math.cos(a)*h.speed*p.face,vy:Math.sin(a)*h.speed*.35,r:h.r,dmg:base.dmg,kb:base.kb,heavy:base.heavy,pierce:(h.pierce||1)+(wind?1:0),kind:h.shot,skill:kind,
     splash:orb?80:h.splash?h.splash*(aw&&w.id==='blaze'?1.5:1):0,splashMult:aw&&w.id==='blaze'?.8:.5,homing:orb});}
   this.emit('shoot',{x:p.x,y:p.y,face:p.face,kind:h.shot,elem:w.elem});
  }else if(h.kind==='zap'){
   const pts=[[p.x+p.face*30,p.y]],hit=[];let from=this.nearestTarget(h.range),dmg=base.dmg;
   const jumps=(h.jumps||0)+(aw?1:0);
   if(from){for(let j=0;from&&j<=jumps;j++){hit.push(from.id);pts.push([from.x,from.y-from.z]);this.damageEnemy(from,{...base,dmg,dir:Math.sign(from.x-p.x)||p.face});dmg*=.72;
     const src=from;from=null;let bd=210;for(const e of this.alive){if(hit.includes(e.id))continue;const d=Math.hypot(e.x-src.x,e.y-src.y);if(d<bd){bd=d;from=e;}}}}
   else pts.push([p.x+p.face*h.range*.6,p.y+(this.random()-.5)*30]);
   this.emit('zap',{pts,heavy:!!h.heavy,hit:hit.length>0});
  }else if(h.kind==='meteors'){
   const targets=this.alive.slice().sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x));
   for(let i=0;i<h.count;i++){const t=targets[i%Math.max(1,targets.length)],x=t?t.x+(i>=targets.length?(this.random()-.5)*160:0):p.x+p.face*(120+i*80),y=t?t.y+(i>=targets.length?(this.random()-.5)*60:0):p.y;this.blasts.push({x:clampN(x,40,920),y:clampN(y,RIFT_FLOOR.top,RIFT_FLOOR.bottom),r:h.r,t:.35+i*.12,max:.35+i*.12,dmg:base.dmg,kind:'meteor',launch:380,elem:w.elem});}
  }else if(h.kind==='rain'){
   this.rains.push({x:p.x+p.face*(h.width/2+40),y:p.y,w:h.width,h:150,t:h.duration,max:h.duration,tick:0,interval:h.duration/h.ticks,dmg:base.dmg,elem:w.elem});this.emit('rain',{x:p.x,face:p.face});
  }
 }
 addShot(o){const s={id:++this.serial,friendly:true,y:this.player.y,z:48,life:1.1,launch:0,hit:[],pierce:1,elem:this.weapon.elem,...o};this.shots.push(s);return s;}
 applyStatus(e,o){
  const el=o.elem,pw=this.elemPower,atk=this.hero.atk*this.weaponMult;
  if(el==='fire'){e.burn={t:2.5,tick:e.burn?.tick??.5,dps:atk*.42*pw*(o.heavy?1.4:1)};}
  else if(el==='poison'){const st=Math.min(6,(e.poison?.stacks||0)+1);e.poison={t:4,tick:e.poison?.tick??.5,stacks:st,dps:atk*.13*pw};}
  else if(el==='ice'){const need=e.boss?7:5,st=(e.chill?.stacks||0)+(o.heavy?2:1);
   if(st>=need){e.chill=null;e.freeze=Math.max(e.freeze,(e.boss?.5:1.3)*pw);this.emit('freeze',{x:e.x,y:e.y,id:e.id,boss:!!e.boss});}else e.chill={t:3,stacks:st};}
  else if(el==='shock'){const twin=this.weapon.id==='twin'&&this.awakened;
   if(o.heavy||twin||this.random()<.3*pw){let src=e;const hit=[e.id];for(let j=0;j<(twin?2:1);j++){let best=null,bd=175;for(const t of this.alive){if(hit.includes(t.id))continue;const d=Math.hypot(t.x-src.x,t.y-src.y);if(d<bd){bd=d;best=t;}}if(!best)break;hit.push(best.id);
     this.emit('chain',{x1:src.x,y1:src.y-src.z,x2:best.x,y2:best.y-best.z,elem:'shock'});this.damageEnemy(best,{dmg:o.dmg*.5*pw,kb:0,kind:'chain',elem:'shock',status:true});if(!best.boss)best.stun=Math.max(best.stun,.22);src=best;}}}
  else if(el==='arcane')this.player.mp=Math.min(this.player.maxMp,this.player.mp+1.5);
 }
 updateStatus(e,dt){
  for(const k of ['burn','poison']){const s=e[k];if(!s||e.dead)continue;s.t-=dt;s.tick-=dt;
   if(s.tick<=0){s.tick+=.5;this.damageEnemy(e,{dmg:s.dps*.5*(s.stacks||1),kb:0,kind:'dot',elem:k==='burn'?'fire':'poison',status:true});}
   if(s.t<=0)e[k]=null;}
  if(e.chill){e.chill.t-=dt;if(e.chill.t<=0)e.chill=null;}
 }
 damageEnemy(e,o){
  if(e.dead)return 0;const p=this.player;
  let dmg=o.dmg*(e.hp<=e.maxHp*.3?1+.4*this.rank('execute'):1);
  if(this.weapon.id==='frost'&&this.awakened&&(e.freeze>0||e.chill))dmg*=1.3;
  if(p.riposte&&o.kind!=='dot'){dmg*=2;p.riposte=false;}
  dmg=Math.max(1,Math.round(dmg*(.92+this.random()*.16)));
  const dealt=Math.min(e.hp,dmg);e.hp-=dmg;e.flash=.12;
  const leech=o.status||o.kind==='dot'?0:.03*this.rank('leech');if(leech)p.hp=Math.min(p.maxHp,p.hp+dealt*leech);
  if(o.kind!=='dot'&&o.kind!=='chain'){
   p.rift=Math.min(100,p.rift+(o.kind==='ult'?0:(o.kind==='basic'?3.2*(o.elem==='rift'?1.4:1):2.2))*(1+.35*this.rank('resonance')));
   this.combo++;this.comboT=2.2;this.maxCombo=Math.max(this.maxCombo,this.combo);
   this.hitstop=Math.max(this.hitstop,o.heavy?.085:.045);
  }
  const dir=o.dir||Math.sign(e.x-p.x)||p.face,armored=e.boss||e.type==='brute'&&e.state==='wind';
  if(o.status){if(e.boss)this.staggerBoss(e,dealt*.5);}
  else if(!armored){
   e.vx=dir*o.kb*(e.type==='brute'?.45:1);e.stun=Math.max(e.stun,o.heavy?.5:.28);
   if(e.state==='wind'){e.state='idle';e.cd=Math.max(e.cd,.6);this.cancelOwned(e);}
   if(o.launch&&e.type!=='brute'){e.vz=o.launch;e.air=true;}
  }else if(e.boss)this.staggerBoss(e,dealt);
  if(o.freeze){e.freeze=Math.max(e.freeze,o.freeze*(e.boss?.5:1));e.chill=null;}
  this.emit('hit',{x:e.x,y:e.y,z:e.z,dmg,heavy:o.heavy,boss:!!e.boss,kind:o.kind,id:e.id,crit:dmg>=this.hero.atk*3,elem:o.elem||null,status:!!o.status});
  if(e.hp>0&&o.elem&&!o.status)this.applyStatus(e,o);
  if(e.hp<=0&&!e.dead)this.killEnemy(e);
  else if(e.boss&&!e.enraged&&e.hp<=e.maxHp*.5){e.enraged=true;this.emit('enrage',{x:e.x,y:e.y,name:e.boss.name});}
  return dealt;
 }
 staggerBoss(e,dealt){e.poise=(e.poise||0)+dealt;if(e.poise>=e.maxHp*.12&&e.state!=='stagger'){e.poise=0;e.state='stagger';e.t=1.4;this.cancelOwned(e);e.dash=null;this.emit('stagger',{x:e.x,y:e.y});}}
 cancelOwned(e){this.hazards=this.hazards.filter(h=>h.owner!==e.id||h.wind<=0);}
 killEnemy(e){
  e.dead=true;e.deadT=0;e.hp=0;this.kills++;this.cancelOwned(e);
  if(e.poison&&this.weapon.id==='venom'&&this.awakened){const ids=[];for(const t of this.alive)if(Math.hypot(t.x-e.x,t.y-e.y)<160){const st=Math.min(6,(t.poison?.stacks||0)+3);t.poison={t:4,tick:t.poison?.tick??.5,stacks:st,dps:this.hero.atk*this.weaponMult*.13*this.elemPower};ids.push(t.id);}this.emit('cloud',{x:e.x,y:e.y,n:ids.length});}
  const pts=e.boss?3000+this.region*1000:RIFT_ENEMIES[e.type].score;this.score+=Math.round(pts*(1+this.region*.25)*(1+Math.min(this.combo,50)/50));
  this.hitstop=Math.max(this.hitstop,e.boss?.35:.07);if(e.boss)this.slow=Math.max(this.slow,1.1);
  this.player.mp=Math.min(this.player.maxMp,this.player.mp+(e.boss?60:6));
  this.emit('kill',{x:e.x,y:e.y,z:e.z,type:e.type,boss:!!e.boss,id:e.id,frozen:e.freeze>0,burning:!!e.burn});
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
  this.updateStatus(e,dt);if(e.dead)return;
  const frozen=e.freeze>0;if(frozen)e.freeze=Math.max(0,e.freeze-dt);
  if(e.air||e.z>0){e.vz-=1500*dt;e.z+=e.vz*dt;e.x+=e.vx*dt;if(e.z<=0){e.z=0;e.vz=0;if(e.air){e.air=false;e.stun=Math.max(e.stun,.45);this.emit('land',{x:e.x,y:e.y});}}}
  else if(e.vx){e.x+=e.vx*dt;e.vx*=Math.pow(.004,dt);if(Math.abs(e.vx)<5)e.vx=0;}
  e.x=e.state==='enter'?e.x:clampN(e.x,RIFT_FLOOR.left,RIFT_FLOOR.right);
  if(e.stun>0||e.air||e.z>0)return;
  const pace=(frozen?.25:e.enraged?1.25:1)*(e.chill?1-.09*e.chill.stacks:1);dt*=pace;
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
   if(s.friendly){
    if(s.homing){let best=null,bd=420;for(const e of this.alive){if(s.hit.includes(e.id))continue;const d=Math.hypot(e.x-s.x,e.y-s.y);if(d<bd&&(e.x-s.x)*Math.sign(s.vx)>-20){bd=d;best=e;}}if(best){const sp=Math.hypot(s.vx,s.vy),a=Math.atan2(s.vy,s.vx),want=Math.atan2(best.y-s.y,best.x-s.x);let da=want-a;while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;const na=a+clampN(da,-4*dt,4*dt);s.vx=Math.cos(na)*sp;s.vy=Math.sin(na)*sp;}}
    for(const e of this.alive){if(s.hit.includes(e.id))continue;const reach=s.r+(e.boss?55:22);if(Math.abs(e.x-s.x)<reach&&Math.abs(e.y-s.y)<reach*.9+(e.boss?20:8)){s.hit.push(e.id);this.damageEnemy(e,{dmg:s.dmg,kb:s.kb||45,heavy:s.heavy,kind:s.skill,dir:Math.sign(s.vx),elem:s.elem});
     if(s.splash){for(const o of this.alive)if(o!==e&&((o.x-e.x)/s.splash)**2+((o.y-e.y)/(s.splash*.5))**2<=1)this.damageEnemy(o,{dmg:s.dmg*s.splashMult,kb:60,kind:s.skill,dir:Math.sign(o.x-e.x)||1,elem:s.elem});this.emit('blast',{x:e.x,y:e.y,r:s.splash,elem:s.elem,small:true});}
     s.pierce--;if(s.pierce<=0){s.life=0;break;}}}}
   else if(Math.abs(p.x-s.x)<s.r+16&&Math.abs(p.y-s.y)<s.r+18){const dealt=this.hitPlayer(s.dmg,{dir:Math.sign(s.vx)});if(dealt||p.dash<=0)s.life=0;}
  }
  this.shots=this.shots.filter(s=>s.life>0);
 }
 updateBlasts(dt){
  for(const b of this.blasts){b.t-=dt;if(b.t<=0&&!b.done){b.done=true;for(const e of this.alive)if(((e.x-b.x)/(b.r+(e.boss?40:0)))**2+((e.y-b.y)/(b.r*.5+(e.boss?20:0)))**2<=1)this.damageEnemy(e,{dmg:b.dmg,kb:120,launch:b.launch,heavy:true,kind:b.hitKind||'ult',dir:Math.sign(e.x-b.x)||1,elem:b.elem});this.emit('blast',{x:b.x,y:b.y,r:b.r,elem:b.elem,small:b.kind==='flame'});}}
  this.blasts=this.blasts.filter(b=>!b.done||b.t>-.4);
  for(const r of this.rains){r.t-=dt;r.tick-=dt;if(r.tick<=0&&r.t>0){r.tick=r.interval;for(const e of this.alive)if(Math.abs(e.x-r.x)<=r.w/2&&Math.abs(e.y-r.y)<=r.h)this.damageEnemy(e,{dmg:r.dmg,kb:10,kind:'dot',elem:r.elem});}}
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
  if(this.isBossFight){const p=this.player;p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.4);this.upgradeWeapon();}
  this.offers=this.rollOffers();this.state=this.offers.length?'choice':'playing';
  if(this.state==='playing')this.advance();
 }
 rollOffers(){const pool=RIFT_BLESSINGS.filter(b=>this.rank(b.id)<b.max),out=[];if(this.wlv<RIFT_WEAPON_MAX&&!this.isBossFight&&this.random()<.35)out.push('forge');while(pool.length&&out.length<3)out.push(pool.splice(Math.floor(this.random()*pool.length),1)[0].id);return out;}
 choose(id){
  if(this.state!=='choice'||!this.offers.includes(id))return false;
  if(id==='forge'){if(!this.upgradeWeapon())return false;this.offers=[];this.state='playing';this.advance();return true;}
  const b=RIFT_BLESSINGS.find(x=>x.id===id);if(this.rank(id)>=b.max)return false;
  this.blessings[id]=this.rank(id)+1;if(id==='vigor'){this.player.maxHp+=25;this.player.hp=Math.min(this.player.maxHp,this.player.hp+25);}
  this.offers=[];this.state='playing';this.advance();return true;
 }
 advance(){if(this.fight<2)this.fight++;else{this.fight=0;this.region++;}this.beginFight();}
 get progress(){return this.region*3+this.fight;}
}
if(typeof module!=='undefined')module.exports={RiftGame,RIFT_HEROES,RIFT_WEAPONS,RIFT_ELEMENTS,RIFT_WEAPON_MAX,RIFT_WEAPON_LEVELS,RIFT_ENEMIES,RIFT_BOSSES,RIFT_REGIONS,RIFT_BLESSINGS,RIFT_FLOOR,RIFT_DASH};
