'use strict';
const RIFT_STAGES=[{name:'잿빛 성문',sub:'THE ASHEN GATE',color:'#78b6b4'},{name:'심연의 회랑',sub:'HALL OF ECHOES',color:'#ac96ef'},{name:'붉은 왕좌',sub:'THE CRIMSON THRONE',color:'#f09c7c'}];
const RIFT_CLASSES={
 warrior:{name:'검사',desc:'넓은 검격 · 균형 잡힌 생존력',color:'#86e8db',hp:160,mp:100,damage:22,speed:205,regen:8,skills:{
  attack:{name:'삼연 베기',cost:0,cooldown:.29,range:92,width:36,mult:1},skill:{name:'질풍참',cost:24,cooldown:2.7,range:175,width:60,mult:2},burst:{name:'검의 폭풍',cost:48,cooldown:7,range:205,width:120,mult:3.3,area:true},special:{name:'강철의 맹세',cost:20,cooldown:8,range:0,width:0,mult:0,desc:'4초간 받는 피해 65% 감소'},ultimate:{name:'천공 파쇄',cost:65,cooldown:12,range:310,width:155,mult:5.8,area:true}}},
 mage:{name:'마법사',desc:'긴 사거리 · 강력한 광역 마법',color:'#c9a0ff',hp:125,mp:130,damage:20,speed:185,regen:11,skills:{
  attack:{name:'비전 탄환',cost:0,cooldown:.4,range:290,width:27,mult:1.1},skill:{name:'서리 광선',cost:25,cooldown:3.2,range:350,width:45,mult:2.1},burst:{name:'별빛 붕괴',cost:45,cooldown:7.5,range:275,width:115,mult:3.4,area:true},special:{name:'빙결 고리',cost:28,cooldown:8,range:230,width:120,mult:1.3,area:true,desc:'주변 적 3초 둔화'},ultimate:{name:'초신성',cost:65,cooldown:13,range:420,width:170,mult:5.4,area:true}}},
 brawler:{name:'격투가',desc:'빠른 연타 · 강인한 근접 전투',color:'#ffbb7d',hp:185,mp:100,damage:18,speed:235,regen:9,skills:{
  attack:{name:'파쇄 연권',cost:0,cooldown:.2,range:70,width:34,mult:1.2},skill:{name:'철산 붕격',cost:20,cooldown:2.4,range:125,width:55,mult:2.5},burst:{name:'대지 진동',cost:42,cooldown:6.5,range:175,width:105,mult:4,area:true},special:{name:'투기 폭발',cost:24,cooldown:9,range:0,width:0,mult:0,desc:'5초간 이동·연타 속도 증가'},ultimate:{name:'멸룡 연무',cost:65,cooldown:12,range:245,width:140,mult:7,area:true}}},
 archer:{name:'궁수',desc:'정밀한 원거리 사격 · 다중 화살',color:'#9fe8a6',hp:135,mp:110,damage:20,speed:225,regen:9,skills:{attack:{name:'속사',cost:0,cooldown:.32,range:345,width:24,mult:1.1},skill:{name:'관통 화살',cost:22,cooldown:3,range:430,width:32,mult:2.3},burst:{name:'화살비',cost:45,cooldown:7,range:315,width:135,mult:3.3,area:true},special:{name:'삼중 사격',cost:25,cooldown:6,range:370,width:90,mult:.9,hits:3,desc:'전방의 적에게 3연속 명중'},ultimate:{name:'별무리 폭우',cost:65,cooldown:12,range:450,width:180,mult:5.6,area:true}}},
 assassin:{name:'암살자',desc:'그림자 이동 · 치명적인 급습',color:'#eaa0d8',hp:130,mp:105,damage:24,speed:255,regen:9,skills:{attack:{name:'그림자 연격',cost:0,cooldown:.23,range:80,width:30,mult:1},skill:{name:'쌍월 베기',cost:22,cooldown:2.6,range:150,width:48,mult:2.4},burst:{name:'그림자 회오리',cost:42,cooldown:6,range:190,width:100,mult:3.6,area:true},special:{name:'그림자 급습',cost:28,cooldown:7,range:135,width:65,mult:3.2,area:true,desc:'전방 순간이동 후 치명타'},ultimate:{name:'백야의 처형',cost:65,cooldown:12,range:285,width:150,mult:6.8,area:true}}},
 paladin:{name:'성기사',desc:'신성한 방벽 · 치유와 중갑',color:'#ffe1a1',hp:210,mp:115,damage:23,speed:175,regen:8,skills:{attack:{name:'성광 강타',cost:0,cooldown:.38,range:100,width:42,mult:1.2},skill:{name:'빛의 망치',cost:25,cooldown:3.4,range:160,width:75,mult:2.7},burst:{name:'성역 심판',cost:48,cooldown:8,range:215,width:130,mult:3.8,area:true},special:{name:'구원의 방벽',cost:32,cooldown:10,range:0,width:0,mult:0,desc:'체력 45 회복 · 3초 보호막'},ultimate:{name:'여명의 심판',cost:65,cooldown:13,range:325,width:170,mult:6.1,area:true}}}
};
// Each class has three branches, with one foundation and one advanced specialization.
const RIFT_BRANCH_DATA={
 warrior:[['검기 확장','모든 공격 사거리 +25',{range:25}],['검기 파열','스킬 피해 +25%',{skillDamage:.25}],['호흡 조절','마력 소모 15% 감소',{costReduction:.15}],['전장의 흐름','초당 마력 회복 +3',{regen:3}],['방벽 걸음','대시 후 보호막 1.2초',{dashShield:1.2}],['불굴','받는 피해 12% 감소',{reduction:.12}]],
 mage:[['얼음 각인','공격 명중 시 1.5초 둔화',{slow:1.5}],['장거리 술식','모든 공격 사거리 +80',{range:80}],['마력 절약','마력 소모 20% 감소',{costReduction:.2}],['비전 증폭','스킬 피해 +30%',{skillDamage:.3}],['생명 문양','최대 체력 +25',{maxHp:25}],['보호의 순간','대시 후 보호막 1.4초',{dashShield:1.4}]],
 brawler:[['강권','기본 공격 피해 +20%',{basicDamage:.2}],['생명 연타','명중 피해의 6% 체력 회복',{leech:.06}],['투기 연장','투기 폭발 지속시간 +2초',{hasteDuration:2}],['가속 호흡','모든 공격 재사용 시간 15% 감소',{cooldownReduction:.15}],['단련','최대 체력 +35',{maxHp:35}],['금강체','받는 피해 12% 감소',{reduction:.12}]],
 archer:[['장궁 숙련','기본 공격 사거리 +80',{attackRange:80}],['급소 조준','기본 공격 피해 +25%',{basicDamage:.25}],['사냥꾼의 호흡','마력 소모 15% 감소',{costReduction:.15}],['폭풍 화살','스킬 피해 +30%',{skillDamage:.3}],['바람 걸음','이동 속도 +25',{speed:25}],['잔상 회피','대시 재사용 시간 0.4초 감소',{dashReduction:.4}]],
 assassin:[['예리한 칼날','기본 공격 피해 +25%',{basicDamage:.25}],['생명 약탈','명중 피해의 10% 체력 회복',{leech:.1}],['그림자 호흡','모든 공격 재사용 시간 12% 감소',{cooldownReduction:.12}],['완벽한 급습','그림자 급습 피해 +50%',{specialDamage:.5}],['잔영','대시 무적시간 +0.15초',{dashInv:.15}],['밤의 장막','대시 후 보호막 1.4초',{dashShield:1.4}]],
 paladin:[['신성 무기','공격력 +4',{damage:4}],['심판의 권능','스킬 피해 +25%',{skillDamage:.25}],['치유의 기도','구원의 방벽 회복량 +25',{heal:25}],['신성 순환','마력 소모 20% 감소',{costReduction:.2}],['방벽 강화','보호막 지속시간 +2초',{shieldDuration:2}],['성스러운 갑옷','받는 피해 15% 감소',{reduction:.15}]]
};
const RIFT_BRANCHES=Object.fromEntries(Object.entries(RIFT_BRANCH_DATA).map(([id,rows])=>[id,rows.map(([name,desc,bonus],i)=>({id:['technique','technique2','focus','focus2','survival','survival2'][i],name,desc,bonus,parent:i%2?['technique','focus','survival'][(i-1)/2]:null,level:i%2?4:2,max:1}))]));
const RIFT_LOCKED_AWAKENING={name:'전직 각성기',desc:'레벨 5에 전직하면 해금',cost:75,cooldown:18,range:0,width:0,mult:0,area:true};
const RIFT_SPECIALIZATIONS={
 warrior:[
  {id:'berserker',name:'광전사',desc:'기본 피해 +30% · 흡혈 8%',color:'#ff8885',bonuses:{basicDamage:.3,leech:.08},awakening:{name:'혈월 난무',desc:'주변 적을 3번 베며 생명력 흡수',cost:75,cooldown:18,range:270,width:155,mult:3,hits:3,area:true}},
  {id:'guardian',name:'검의 수호자',desc:'받는 피해 20% 감소 · 보호막 +2초',color:'#a8e6ff',bonuses:{reduction:.2,shieldDuration:2},awakening:{name:'수호성의 심판',desc:'광역 심판과 6초 보호막',cost:75,cooldown:18,range:310,width:165,mult:7.6,shield:6,area:true}}
 ],
 mage:[
  {id:'frost',name:'빙결술사',desc:'모든 명중 2초 둔화 · 마력 회복 +2',color:'#a4e8ff',bonuses:{slow:2,regen:2},awakening:{name:'영원의 겨울',desc:'넓은 범위 피해와 6초 둔화',cost:75,cooldown:19,range:430,width:180,mult:7,slow:6,area:true}},
  {id:'fire',name:'화염술사',desc:'스킬 피해 +35% · 기본 마력 소모 10% 감소',color:'#ffac77',bonuses:{skillDamage:.35,costReduction:.1},awakening:{name:'태양의 종말',desc:'화염 폭발로 광범위한 피해',cost:80,cooldown:20,range:380,width:170,mult:9,area:true}}
 ],
 brawler:[
  {id:'striker',name:'질풍권사',desc:'재사용 시간 18% 감소 · 이동 속도 +25',color:'#ffd586',bonuses:{cooldownReduction:.18,speed:25},awakening:{name:'무영 백열권',desc:'5연타와 6초 투기 가속',cost:75,cooldown:17,range:210,width:130,mult:2,hits:5,haste:6,area:true}},
  {id:'iron',name:'금강투사',desc:'최대 체력 +60 · 받는 피해 18% 감소',color:'#d4c9ad',bonuses:{maxHp:60,reduction:.18},awakening:{name:'금강 지축붕괴',desc:'지진 타격과 5초 보호막',cost:75,cooldown:19,range:310,width:170,mult:8,shield:5,area:true}}
 ],
 archer:[
  {id:'sniper',name:'신궁',desc:'사거리 +100 · 기본 피해 +25%',color:'#b4f5d1',bonuses:{range:100,basicDamage:.25},awakening:{name:'천궁 관통',desc:'전방을 끝까지 꿰뚫는 일격',cost:75,cooldown:17,range:650,width:75,mult:10}},
  {id:'ranger',name:'바람추적자',desc:'기본 공격 2연사 · 각 화살 피해 80%',color:'#daee8f',bonuses:{extraHits:1,basicDamage:-.2,speed:15},awakening:{name:'천공 화살폭풍',desc:'세 번 쏟아지는 광역 화살',cost:75,cooldown:18,range:420,width:190,mult:3,hits:3,area:true}}
 ],
 assassin:[
  {id:'reaper',name:'밤의 처형자',desc:'급습 피해 +50% · 스킬 피해 +12%',color:'#f7a4f0',bonuses:{specialDamage:.5,skillDamage:.12},awakening:{name:'무월 처형식',desc:'주변을 베는 강력한 처형',cost:75,cooldown:18,range:305,width:150,mult:10,area:true}},
  {id:'vampire',name:'혈영 추적자',desc:'명중 피해 14% 흡혈 · 최대 체력 +25',color:'#f58aaf',bonuses:{leech:.14,maxHp:25},awakening:{name:'선혈의 연회',desc:'흡혈 4연격으로 전장을 지배',cost:75,cooldown:19,range:250,width:145,mult:2.2,hits:4,area:true}}
 ],
 paladin:[
  {id:'saint',name:'빛의 성인',desc:'회복 스킬 +40 · 초당 마력 회복 +3',color:'#fff1bd',bonuses:{heal:40,regen:3},awakening:{name:'여명의 기적',desc:'체력 100 회복·5초 보호막·빛의 심판',cost:75,cooldown:20,range:280,width:160,mult:6,heal:100,shield:5,area:true}},
  {id:'judge',name:'천벌의 심판관',desc:'공격력 +6 · 스킬 피해 +30%',color:'#ffca88',bonuses:{damage:6,skillDamage:.3},awakening:{name:'천벌의 성창',desc:'거대한 성창으로 광역 심판',cost:80,cooldown:19,range:370,width:165,mult:9,area:true}}
 ]
};
class RiftGame{
 constructor(classId='warrior'){this.state='ready';this.stage=0;this.wave=0;this.time=0;this.score=0;this.kills=0;this.combo=0;this.comboTime=0;this.effects=[];this.enemies=[];this.projectiles=[];this.skillPoints=1;this.talents={power:0,flow:0,guard:0,mastery:0};this.setClass(Object.hasOwn(RIFT_CLASSES,classId)?classId:'warrior');}
 setClass(id){if(this.state!=='ready'||!Object.hasOwn(RIFT_CLASSES,id))return false;this.classId=id;const c=RIFT_CLASSES[id];this.skillPoints=1;this.pendingLevelRewards=0;this.specializationId=null;this.skillRanks={skill:0,burst:0,special:0,ultimate:0,awakening:0};this.branchRanks=Object.fromEntries(RIFT_BRANCHES[id].map(n=>[n.id,0]));this.talents={power:0,flow:0,guard:0,mastery:0};this.player={classId:id,x:240,y:340,hp:c.hp,maxHp:c.hp,mp:c.mp,maxMp:c.mp,level:1,xp:0,damage:c.damage,face:1,inv:0,attack:0,step:0,dash:0,shield:0,haste:0,bonusRegen:0,cd:{attack:0,skill:0,burst:0,special:0,ultimate:0,awakening:0,dash:0,potion:0},potions:3};return true;}
 get xpNeeded(){return 30+this.player.level*20;}
 get specialUnlocked(){return this.player.level>=2;}
 get ultimateUnlocked(){return this.player.level>=3||this.talents.mastery>0;}
 get specialization(){return RIFT_SPECIALIZATIONS[this.classId].find(s=>s.id===this.specializationId)||null;}
 get awakeningUnlocked(){return this.player.level>=5&&!!this.specialization;}
 getSkill(name){if(name==='awakening')return this.specialization?.awakening||RIFT_LOCKED_AWAKENING;return Object.hasOwn(RIFT_CLASSES[this.classId].skills,name)?RIFT_CLASSES[this.classId].skills[name]:null;}
 chooseSpecialization(id){const spec=RIFT_SPECIALIZATIONS[this.classId].find(s=>s.id===id);if(this.state!=='talents'||this.player.level<5||this.specializationId||!spec)return false;this.specializationId=id;this.player.specializationId=id;if(spec.bonuses.maxHp){this.player.maxHp+=spec.bonuses.maxHp;this.player.hp+=spec.bonuses.maxHp;}this.effect(this.player.x,this.player.y,'',spec.color,'levelup',1.5);this.effect(this.player.x,this.player.y-110,spec.name+' 전직',spec.color,'text',1.7);return true;}
 skillRankStatus(name){if(!Object.hasOwn(this.skillRanks,name))return{rank:0,available:false,reason:'강화할 수 없는 기술'};const rank=this.skillRanks[name],level=(rank+1)*2;const reason=rank>=3?'최대 랭크':name==='awakening'&&!this.awakeningUnlocked?'레벨 5 전직 필요':name==='ultimate'&&!this.ultimateUnlocked?'궁극기 해금 필요':this.player.level<level?`레벨 ${level} 필요`:this.skillPoints<1?'포인트 부족':this.state!=='talents'?'스킬트리에서 투자':'';return{rank,available:!reason,reason};}
 canUpgradeSkill(name){return this.skillRankStatus(name).available;}
 upgradeSkill(name){if(!this.canUpgradeSkill(name))return false;this.skillRanks[name]++;this.skillPoints--;return true;}
 branchBonus(key){return RIFT_BRANCHES[this.classId].reduce((sum,n)=>sum+(this.branchRanks[n.id]?n.bonus[key]||0:0),0);}
 bonus(key){return this.branchBonus(key)+(this.specialization?.bonuses[key]||0);}
 get effectiveDamage(){return this.player.damage+this.bonus('damage');}
 get damageReduction(){return 1-(1-this.talents.guard*.06)*(1-this.bonus('reduction'))*(this.player.shield>0?.35:1);}
 get regenRate(){return RIFT_CLASSES[this.classId].regen+this.talents.flow*2+this.player.bonusRegen+this.bonus('regen');}
 effectiveRange(name){const skill=this.getSkill(name);return (skill?.range||0)+(skill?.range?this.bonus('range')+(name==='attack'?this.bonus('attackRange'):0):0);}
 damageMultiplier(name){const skill=this.getSkill(name);if(!skill)return 0;return skill.mult*(name==='attack'?(1+(Math.max(1,this.player.step)-1)*.22)*(1+this.bonus('basicDamage')):(1+this.talents.mastery*.15)*(1+this.bonus('skillDamage')))*(name==='special'?1+this.bonus('specialDamage'):1)*(1+(this.skillRanks[name]||0)*.15);}
 skillCost(name){return Math.ceil((this.getSkill(name)?.cost??0)*(1-this.bonus('costReduction'))*(1-(this.skillRanks[name]||0)*.05));}
 skillCooldown(name){return (this.getSkill(name)?.cooldown??0)*(1-this.talents.flow*.08)*(1-this.bonus('cooldownReduction'))*(name==='attack'&&this.player.haste>0?.62:1);}
 branchStatus(id){const n=RIFT_BRANCHES[this.classId].find(n=>n.id===id);if(!n)return{rank:0,available:false,reason:'없는 전문화'};const rank=this.branchRanks[id];const reason=rank?'습득 완료':this.player.level<n.level?`레벨 ${n.level} 필요`:n.parent&&!this.branchRanks[n.parent]?'이전 노드 필요':this.skillPoints<1?'포인트 부족':this.state!=='talents'?'스킬트리에서 투자':'';return{rank,available:!reason,reason};}
 canLearnBranch(id){return this.branchStatus(id).available;}
 learnBranch(id){if(!this.canLearnBranch(id))return false;const n=RIFT_BRANCHES[this.classId].find(n=>n.id===id);this.branchRanks[id]=1;this.skillPoints--;if(n.bonus.maxHp){this.player.maxHp+=n.bonus.maxHp;this.player.hp+=n.bonus.maxHp;}return true;}
 chooseLevelReward(choice){if(this.pendingLevelRewards<1||!['playing','paused','talents'].includes(this.state)||!['power','vital','focus'].includes(choice))return false;const p=this.player;if(choice==='power')p.damage+=3;if(choice==='vital'){p.maxHp+=15;p.hp=Math.min(p.maxHp,p.hp+15);}if(choice==='focus'){p.maxMp+=10;p.mp=Math.min(p.maxMp,p.mp+10);p.bonusRegen+=1;}this.pendingLevelRewards--;return true;}
 toggleTalents(){if(this.state==='playing'){this.state='talents';return true;}if(this.state==='talents'){this.state='playing';return true;}return false;}
 canSpendPoint(node){return this.state==='talents'&&Object.hasOwn(this.talents,node)&&this.skillPoints>0&&this.talents[node]<3&&(node!=='mastery'||this.talents.power+this.talents.flow+this.talents.guard>=2);}
 spendPoint(node){if(!this.canSpendPoint(node))return false;this.skillPoints--;this.talents[node]++;const p=this.player;if(node==='power')p.damage+=5;if(node==='guard'){p.maxHp+=25;p.hp=Math.min(p.maxHp,p.hp+25);}if(node==='flow'){p.maxMp+=10;p.mp=Math.min(p.maxMp,p.mp+10);}return true;}
 start(){if(this.state!=='ready')return;this.state='playing';this.spawn();}
 spawn(){this.enemies=[];this.projectiles=[];for(let i=0;i<4+this.stage;i++){const type=i%3===2?'mage':'guard',hp=type==='mage'?60+this.stage*15:82+this.stage*20;this.enemies.push({id:i,x:590+(i%3)*105,y:265+(i%3)*65,hp,maxHp:hp,type,face:-1,cd:.8+i*.3,wind:0,stun:0,flash:0,attackX:0,attackY:0});}if(this.wave===1){const hp=340+this.stage*140;this.enemies.push({id:99,x:810,y:350,hp,maxHp:hp,type:'boss',face:-1,cd:2,wind:0,stun:0,flash:0});}}
 pause(){if(this.state==='playing')this.state='paused';else if(this.state==='paused')this.state='playing';}
 effect(x,y,text,color='#f6d7a4',kind='text',life=.7){const e={x,y,text,color,kind,life,max:life,classId:this.classId,specializationId:this.specializationId,facing:this.player.face};this.effects.push(e);if(this.effects.length>100)this.effects.shift();return e;}
 gainXP(amount){if(!Number.isFinite(amount)||amount<=0)return;const p=this.player;p.xp+=amount;while(p.xp>=this.xpNeeded){p.xp-=this.xpNeeded;p.level++;p.damage+=4;p.maxHp+=15;p.hp=Math.min(p.maxHp,p.hp+45);p.mp=Math.min(p.maxMp,p.mp+30);this.skillPoints+=2;this.pendingLevelRewards++;this.effect(p.x,p.y,'','#b0ffe3','levelup',1.1);this.effect(p.x,p.y-100,`LEVEL ${p.level} · SP +2`,'#a5ffe0','text',1.5);}}
 hurtEnemy(e,damage,knock=16){if(e.hp<=0)return;e.hp-=damage;e.flash=.13;e.stun=e.type==='boss'?.12:.35;e.wind=0;e.x=Math.max(35,Math.min(925,e.x+this.player.face*knock));this.combo++;this.comboTime=2.6;this.effect(e.x,e.y-60,String(damage));const hit=this.effect(e.x,e.y-35,'',RIFT_CLASSES[this.classId].color,'hit',.25);hit.targetType=e.type;hit.seed=this.stage*1000+this.wave*100+(e.id||0);if(e.hp<=0){this.kills++;this.score+=e.type==='boss'?600:100;this.gainXP(e.type==='boss'?70:22);const death=this.effect(e.x,e.y,'','#b1ddce','death',.55);death.actor={...e,hp:0};death.targetType=e.type;death.seed=hit.seed;}}
 action(name){if(this.state!=='playing')return false;const p=this.player;if(p.cd[name]>0)return false;
  if(name==='potion'){if(!p.potions||p.hp===p.maxHp)return false;p.potions--;p.hp=Math.min(p.maxHp,p.hp+85);p.cd.potion=1;this.effect(p.x,p.y-70,'+85 HP','#a5ffe0');return true;}
  if(name==='dash'){p.dash=.18;p.inv=.3+this.bonus('dashInv');p.cd.dash=1.2-this.bonus('dashReduction');p.shield=Math.max(p.shield,this.bonus('dashShield'));this.effect(p.x,p.y,'','#a5e9e4','dash',.3);return true;}
  const skill=this.getSkill(name),cost=this.skillCost(name);if(!skill||name==='ultimate'&&!this.ultimateUnlocked||name==='special'&&!this.specialUnlocked||name==='awakening'&&!this.awakeningUnlocked||p.mp<cost)return false;p.mp-=cost;
  p.cd[name]=this.skillCooldown(name);p.attack=['ultimate','awakening'].includes(name)?.45:.22;p.lastAction=name;p.step=name==='attack'?(p.step%3)+1:3;const rank=this.skillRanks[name]||0;
  if(name==='special'){if(this.classId==='warrior')p.shield=4+this.bonus('shieldDuration')+rank;if(this.classId==='brawler')p.haste=5+this.bonus('hasteDuration')+rank;if(this.classId==='paladin'){const heal=Math.min(p.maxHp-p.hp,45+this.bonus('heal')+rank*10);p.hp+=heal;p.shield=3+this.bonus('shieldDuration')+rank;this.effect(p.x,p.y-70,'+'+heal+' HP','#b4ffcc');}if(this.classId==='assassin'){const oldX=p.x;p.x=Math.max(35,Math.min(925,p.x+p.face*105));p.inv=Math.max(p.inv,.45);this.effect(oldX,p.y,String(p.face),RIFT_CLASSES[this.classId].color,'dash',.4);}}
  if(name==='awakening'){if(skill.heal){const heal=Math.min(p.maxHp-p.hp,skill.heal+this.bonus('heal')+rank*15);p.hp+=heal;this.effect(p.x,p.y-70,'+'+heal+' HP','#b4ffcc');}if(skill.shield)p.shield=skill.shield+this.bonus('shieldDuration')+rank;if(skill.haste)p.haste=skill.haste+this.bonus('hasteDuration')+rank;}
  const range=this.effectiveRange(name),wide=skill.width,mult=this.damageMultiplier(name),color=this.specialization?.color||RIFT_CLASSES[this.classId].color;
  const visual=this.effect(p.x,p.y,String(p.face),color,name,name==='awakening'?1:name==='ultimate'?.8:.3);visual.range=range;visual.width=wide;visual.comboStep=p.step;visual.rank=rank;
  if(['ultimate','awakening'].includes(name)){p.inv=Math.max(p.inv,name==='awakening'?1:.65);this.effect(p.x,p.y-110,skill.name,color,'text',1.2);}
  const damage=Math.round(this.effectiveDamage*mult),hits=(skill.hits||1)+(name==='attack'?this.bonus('extraHits'):0);
  for(const e of this.enemies){const dx=(e.x-p.x)*p.face;if(e.hp>0&&Math.abs(e.y-p.y)<wide&&(skill.area?Math.abs(dx)<range:dx>-15&&dx<range)){const slow=Math.max(this.bonus('slow'),name==='special'&&this.classId==='mage'?3+rank:0,skill.slow||0);if(slow)e.slow=Math.max(e.slow||0,slow);for(let hit=0;hit<hits&&e.hp>0;hit++){const dealt=Math.min(e.hp,damage);this.hurtEnemy(e,damage,name==='attack'?['mage','archer'].includes(this.classId)?5:12:['ultimate','awakening'].includes(name)?48:32);if(this.bonus('leech'))p.hp=Math.min(p.maxHp,p.hp+dealt*this.bonus('leech'));}}}
  return true;
 }
 hitPlayer(damage){const p=this.player;if(p.inv>0||this.state!=='playing')return;damage=Math.max(1,Math.round(damage*(1-this.damageReduction)));p.hp=Math.max(0,p.hp-damage);p.inv=.7;this.combo=0;this.effect(p.x,p.y-65,'−'+damage,'#ff8a91');if(!p.hp)this.state='lost';}
 upgrade(choice){if(this.state!=='upgrade'||!['power','vital','mana'].includes(choice))return false;const p=this.player;if(choice==='power')p.damage+=8;if(choice==='vital'){p.maxHp+=40;p.hp+=40;}if(choice==='mana'){p.maxMp+=30;p.mp+=30;}p.hp=Math.min(p.maxHp,p.hp+40);p.mp=p.maxMp;p.potions=Math.min(5,p.potions+1);this.stage++;this.wave=0;p.x=160;p.y=340;this.state='playing';this.spawn();return true;}
 step(dt,input={}){if(this.state!=='playing')return;dt=Math.max(0,Math.min(.04,dt));this.time+=dt;const p=this.player;for(const k in p.cd)p.cd[k]=Math.max(0,p.cd[k]-dt);p.inv=Math.max(0,p.inv-dt);p.attack=Math.max(0,p.attack-dt);p.shield=Math.max(0,p.shield-dt);p.haste=Math.max(0,p.haste-dt);p.mp=Math.min(p.maxMp,p.mp+dt*this.regenRate);this.comboTime-=dt;if(this.comboTime<=0)this.combo=0;
  const dx=Number(!!input.right)-Number(!!input.left),dy=Number(!!input.down)-Number(!!input.up),length=Math.hypot(dx,dy)||1;if(dx)p.face=dx;
  if(p.dash>0){p.x+=p.face*760*dt;p.dash-=dt;}else{const haste=p.haste>0?1.35:1;p.x+=dx/length*(RIFT_CLASSES[this.classId].speed+this.bonus('speed'))*haste*dt;p.y+=dy/length*145*haste*dt;}
  p.x=Math.max(35,Math.min(925,p.x));p.y=Math.max(245,Math.min(465,p.y));p.moving=!!(dx||dy);if(input.attack)this.action('attack');
  this.effects=this.effects.filter(e=>(e.life-=dt)>0);
  for(const e of this.enemies){if(e.hp<=0)continue;e.flash=Math.max(0,e.flash-dt);e.stun=Math.max(0,e.stun-dt);e.slow=Math.max(0,(e.slow||0)-dt);const pace=e.slow>0?.45:1;if(e.stun>0)continue;e.face=p.x<e.x?-1:1;
   if(e.wind>0){e.wind-=dt*pace;if(e.wind<=0){if(e.type==='mage')this.projectiles.push({x:e.x,y:e.y-25,vx:e.face*220,life:4});else if(Math.abs(p.x-e.attackX)<(e.type==='boss'?120:52)&&Math.abs(p.y-e.attackY)<(e.type==='boss'?65:35))this.hitPlayer(e.type==='boss'?28:12);e.cd=e.type==='boss'?1.8:1.25;}continue;}
   e.cd-=dt*pace;const dist=Math.abs(p.x-e.x),lane=Math.abs(p.y-e.y),reach=e.type==='mage'?420:e.type==='boss'?105:46;
   if(dist<reach&&lane<(e.type==='mage'?24:32)&&e.cd<=0){e.wind=e.type==='boss'?.85:.55;e.attackX=p.x;e.attackY=p.y;}
   else if(e.type==='mage'&&dist<260){e.x-=e.face*35*dt*pace;e.y+=Math.sign(p.y-e.y)*30*dt*pace;}
   else{e.x+=e.face*(e.type==='boss'?52:65+this.stage*8)*dt*pace;e.y+=Math.sign(p.y-e.y)*45*dt*pace;}
   e.x=Math.max(35,Math.min(925,e.x));e.y=Math.max(245,Math.min(465,e.y));
  }
  for(const b of this.projectiles){b.x+=b.vx*dt;b.life-=dt;if(Math.abs(b.x-p.x)<22&&Math.abs(b.y-(p.y-25))<22){this.hitPlayer(16);b.life=0;}}this.projectiles=this.projectiles.filter(b=>b.life>0&&b.x>0&&b.x<960);
  if(this.state==='playing'&&this.enemies.every(e=>e.hp<=0)){this.score+=300;if(this.wave===0){this.wave=1;this.spawn();this.effect(480,170,'수문장이 나타났다','#ffc18f','text',2);}else if(this.stage<2)this.state='upgrade';else{this.state='won';this.score+=Math.round(p.hp)*5;}}
 }
}
if(typeof module!=='undefined')module.exports={RiftGame,RIFT_STAGES,RIFT_CLASSES,RIFT_BRANCHES,RIFT_SPECIALIZATIONS};
