'use strict';
// 운빨좆망겜 — loop, rendering, drag-and-drop scouting, HUD, menus and sound.
(()=>{
const C=FogCore,A=FogArt,$=id=>document.getElementById(id);
const canvas=$('fogCanvas'),ctx=canvas.getContext('2d'),W=C.W,H=C.H,CELL=C.CELL;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let level=1;try{const raw=localStorage.getItem('fogFrontLevel');if(raw==='0'||raw==='1'||raw==='2')level=Number(raw);}catch{}
let best=0;try{best=Number(localStorage.getItem('fogFrontBest'))||0;}catch{}
let game=newGame(),running=false,paused=false,last=0,acc=0,now=0;
let fx=[],texts=[],rings=[],bolts=[],banner=null,shake=0,flash=0,selected=null,drag=null,hover=null,dpr=1;
const unitAnim=new Map();
// round 4: boss intro card, time scale, game speed, tutorial, confetti
const BOSS_TRAIT={mudgiant:'체력이 줄면 진흙 덩이(껍질벌레)를 떨어뜨립니다',fogqueen:'6초마다 내 땅을 다시 안개로 덮고, 절반 체력에 나방을 부릅니다',ironbeetle:'8초마다 3초간 방어력이 3배가 됩니다',abyss:'시선으로 영웅을 굳히고 박쥐를 부릅니다. 새면 본부가 무너집니다'};
let bossIntro=null,timeScale=1,slowT=0,speed=1,confetti=[],oppFellAt=null;
let tut=0;try{tut=Number(localStorage.getItem('fogFrontTutorial'))||0;}catch{}
function tutDone(step){if(tut===step){tut++;try{localStorage.setItem('fogFrontTutorial',String(tut));}catch{}}}
// round 1 visuals: decals, smoke, projectile trails, fog reveal puffs, fireflies, light map
let decals=[],smoke=[],reveals=[],flies=[];const trails=new Map(),fogPrev=new Map();
const light=A.mk(W/2,H/2),lctx=light.getContext('2d');
for(let i=0;i<26;i++)flies.push({x:Math.random()*W,y:Math.random()*H,a:Math.random()*6,s:.3+Math.random()*.7});
function newGame(){const g=new C.FogGame({aiLevel:level});window.fogGame=g;return g;}

// ---------------- audio ----------------
const audio={ctx:null,on:false,last:{},
 init(){if(this.ctx||!(window.AudioContext||window.webkitAudioContext))return;try{this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.28;this.master.connect(this.ctx.destination);}catch{}},
 tone(f,d,type='sine',v=.25,slide=0,delay=0){if(!this.on||!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(this.master);o.start(t);o.stop(t+d+.02);},
 noise(d,v=.25,freq=1200){if(!this.on||!this.ctx)return;const t=this.ctx.currentTime,n=Math.floor(this.ctx.sampleRate*d),buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate),data=buf.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();f.type='bandpass';f.frequency.value=freq;g.gain.value=v;s.buffer=buf;s.connect(f).connect(g).connect(this.master);s.start(t);},
 play(name){if(!this.on)return;const t=performance.now();if(this.last[name]&&t-this.last[name]<45)return;this.last[name]=t;const m={
  shoot:()=>this.tone(900+Math.random()*200,.05,'triangle',.05,.6),hit:()=>this.noise(.05,.08,1800),kill:()=>this.tone(620,.12,'triangle',.1,1.6),
  leak:()=>{this.tone(160,.3,'sawtooth',.2,.5);this.noise(.2,.2,400);},loot:()=>{this.tone(880,.1,'sine',.15);this.tone(1320,.16,'sine',.12,1,.08);},
  fail:()=>{this.tone(300,.25,'square',.12,.4);},summon:()=>{this.tone(520,.12,'sine',.14,1.5);this.tone(780,.2,'sine',.1,1.5,.08);},
  wave:()=>{this.tone(220,.4,'sawtooth',.12,1.3);},boss:()=>{this.tone(70,1,'sawtooth',.22,.6);this.noise(.6,.15,200);},
  skill:()=>{this.tone(440,.3,'triangle',.15,2);this.noise(.25,.12,2400);},thunder:()=>{this.noise(.4,.35,700);this.tone(90,.4,'square',.15,.5);},
  win:()=>[523,659,784,1046].forEach((f,i)=>this.tone(f,.4,'triangle',.16,1,i*.12)),lose:()=>[392,330,262].forEach((f,i)=>this.tone(f,.5,'sawtooth',.12,1,i*.18)),
  clear:()=>{this.tone(660,.15,'sine',.14);this.tone(990,.25,'sine',.12,1,.1);},click:()=>this.tone(700,.04,'square',.05)};(m[name]||(()=>{}))();}
};
try{audio.on=localStorage.getItem('fogFrontSound')==='1';}catch{}
$('soundToggle').checked=audio.on;$('soundToggle').onchange=e=>{audio.on=e.target.checked;if(audio.on){audio.init();audio.ctx?.resume?.();}try{localStorage.setItem('fogFrontSound',audio.on?'1':'0');}catch{}};

// ---------------- canvas setup ----------------
function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(2,Math.max(1,(window.devicePixelRatio||1)*r.width/W));canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);}
addEventListener('resize',resize);resize();
const bg=A.mk(W,H);drawBackground(bg.getContext('2d'));
function drawBackground(g){
 g.fillStyle=A.grad(g,0,0,0,H,[[0,'#121a20'],[.5,'#0d1418'],[1,'#121a1f']]);g.fillRect(0,0,W,H);
 for(let i=0;i<900;i++){const x=A.hash(i,1)*W,y=A.hash(i,2)*H,v=A.hash(i,3);g.fillStyle=v>.6?'rgba(120,150,120,.06)':'rgba(0,0,0,.18)';g.fillRect(x,y,2,2);}
 // roads: the ring around both boards plus the left lane
 const road=(x0,y0,x1,y1)=>{g.strokeStyle='#2c2620';g.lineWidth=40;g.lineCap='round';g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();g.strokeStyle='#3d342b';g.lineWidth=32;g.beginPath();g.moveTo(x0,y0);g.lineTo(x1,y1);g.stroke();};
 road(50,30,550,30);road(550,30,550,750);road(50,390,550,390);road(50,750,550,750);road(50,30,50,750);
 for(let i=0;i<500;i++){const t=A.hash(i,7);let x,y;const k=i%5;if(k===0){x=50+t*500;y=30;}else if(k===1){x=550;y=30+t*720;}else if(k===2){x=50+t*500;y=390;}else if(k===3){x=50+t*500;y=750;}else{x=50;y=30+t*720;}x+=(A.hash(i,8)-.5)*26;y+=(A.hash(i,9)-.5)*26;g.fillStyle=A.hash(i,4)>.5?'rgba(90,76,60,.6)':'rgba(25,20,16,.5)';g.fillRect(x,y,2+A.hash(i,5)*2,2);}
 for(const side of ['opp','me']){const y=C.BOARD_Y[side];g.fillStyle='#1b1712';A.rr(g,C.BX-8,y-8,C.COLS*CELL+16,C.ROWS*CELL+16,8);g.fill();g.strokeStyle=side==='me'?'#3d6f9e':'#9e4a4a';g.lineWidth=2;g.stroke();
  g.fillStyle=side==='me'?'rgba(74,163,255,.9)':'rgba(255,100,100,.9)';g.font='bold 10px sans-serif';g.textAlign='right';if(side==='me')g.fillText('내 보드',C.BX+C.COLS*CELL+4,y+C.ROWS*CELL+19);}
}

// ---------------- helpers ----------------
const center=(side,r,c)=>C.cellCenter(side,r,c);
function toLogical(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
function addText(x,y,text,color='#fff',size=14,life=1.1){texts.push({x,y,text,color,size,life,max:life});}
function burst(x,y,color,n=10,speed=90,size=3,life=.6){if(reduced)n=Math.ceil(n/3);for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=speed*(.3+Math.random()*.9);fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-20,life:life*(.6+Math.random()*.6),max:life,color,size:size*(.6+Math.random()*.8),grav:120});}}
function ring(x,y,color,r0,r1,life=.5,w=3){rings.push({x,y,color,r0,r1,life,max:life,w});}
const HERO_COLOR=Object.fromEntries(C.HERO_ORDER.map(k=>[k,C.HEROES[k].color]));
const RES_NAME={crystal:'수정',ore:'광석'};
function log(msg){const li=document.createElement('li');li.textContent=msg;const list=$('logList');list.prepend(li);while(list.children.length>30)list.lastChild.remove();}
function showBanner(title,sub,color='#fff',life=2.2){banner={title,sub,color,life,max:life};}

// ---------------- events from the rules ----------------
function handleEvents(){
 for(const e of game.drainEvents()){
  const mine=e.side==='me';
  switch(e.type){
   case'shoot':{const u=game.units.find(x=>x.id===e.uid);if(u){const p=center(u.side,u.r,u.c);fx.push({x:p.x+u.face*12,y:p.y-12,vx:0,vy:0,life:.12,max:.12,color:HERO_COLOR[u.type],size:7,grav:0});}if(mine)audio.play('shoot');break;}
   case'hit':burst(e.x,e.y,HERO_COLOR[e.type]||'#fff',e.boss?6:4,70,2.5,.35);if(e.type==='pyro'){ring(e.x,e.y,'#ff9a45',4,C.HEROES.pyro.splash,.35,4);}audio.play('hit');break;
   case'chain':bolts.push({pts:jag(e.x1,e.y1,e.x2,e.y2,5),life:.18,max:.18,color:'#c9bdff'});break;
   case'kill':decals.push({x:e.x,y:e.y+6,r:e.boss?34:12+Math.random()*5,life:e.boss?8:4,max:e.boss?8:4,rot:Math.random()*6});burst(e.x,e.y,e.boss?'#ffcf5a':'#d8f0a0',e.boss?40:12,e.boss?200:110,e.boss?5:3,.7);if(mine)addText(e.x,e.y-14,'+'+e.bounty,'#9fd4ff',12,.9);audio.play('kill');if(e.boss){shake=14;slowT=.5;showBanner(`${C.MONSTERS[e.kind].name} 처치!`,mine?`보상 수정 +${e.bounty}`:'상대가 보스를 쓰러뜨렸습니다','#ffcf5a');log(`${mine?'내가':'상대가'} ${C.MONSTERS[e.kind].name}를 쓰러뜨렸습니다.`);}break;
   case'leak':ring(e.x,e.y,'#ff4a4a',10,60,.5,5);burst(e.x,e.y,'#ff6a4a',14,140,3.5);addText(e.x+30,e.y-8,'-'+e.dmg,'#ff6a6a',18);if(mine){shake=Math.max(shake,8+e.dmg*2);flash=.35;audio.play('leak');}break;
   case'blocked':ring(e.x,e.y,'#ffd76a',20,50,.4,4);break;
   case'scoutStart':{if(mine)tutDone(0);const p=center(e.side,e.r,e.c);burst(p.x,p.y,'#c8d0e0',8,60,4,.5);if(mine)log(`${C.HEROES[game.units.find(u=>u.id===e.id)?.type]?.name||'영웅'} 정찰 시작 (${e.total}초)`);break;}
   case'scoutFail':burst(e.x,e.y,'#ff3b3b',22,140,4,.8);ring(e.x,e.y,'#ff3b3b',6,46,.6,4);addText(e.x,e.y-20,'정찰 실패!','#ff7070',15,1.4);if(mine){audio.play('fail');shake=Math.max(shake,5);log(`${C.LAIRS[e.kind].name}를 만나 정찰병이 쓰러졌습니다. 영웅들이 둥지를 공격합니다.`);}break;
   case'loot':if(e.res==='chest'){burst(e.x,e.y,'#ffcf5a',20,120,3.5);addText(e.x,e.y-18,`+${e.v} 수정 +${e.v2} 광석`,'#ffe08a',13,1.4);if(mine)log(`보물 상자 발견! 수정 ${e.v}, 광석 ${e.v2}`);}else{burst(e.x,e.y,e.res==='crystal'?'#8cc6ff':'#ffcf5a',14,100,3);addText(e.x,e.y-18,`+${e.v} ${RES_NAME[e.res]}`,e.res==='crystal'?'#9fd4ff':'#ffe08a',14,1.3);if(mine)log(`${RES_NAME[e.res]} ${e.v} 확보`);}if(mine)audio.play('loot');break;
   case'trap':burst(e.x,e.y,'#c9ced6',12,90,3);addText(e.x,e.y-20,'덫! 6초 기절','#ffb0b0',14,1.4);if(mine){audio.play('fail');log('정찰 중 덫에 걸렸습니다. 6초 동안 움직이지 못합니다.');}break;
   case'shrine':ring(e.x,e.y,'#8ff0ff',6,60,.9,4);burst(e.x,e.y,'#bff3ff',22,110,3);addText(e.x,e.y-20,'고대 제단','#bff3ff',14,1.6);if(mine){audio.play('clear');log(`고대 제단의 축복: ${e.text}`);flashStatus('제단: '+e.text);}break;
   case'heal':ring(e.x,e.y,'#7fffd0',6,75,.6,2);for(let i=0;i<4;i++)fx.push({x:e.x+(Math.random()-.5)*50,y:e.y+(Math.random()-.5)*30,vx:0,vy:-30,life:.7,max:.7,color:'#7fffb0',size:3,grav:0});break;
   case'bossSkill':addText(e.x,e.y-80,e.text,'#ffb0b0',15,1.6);ring(e.x,e.y,'#ff6a5a',10,90,.7,5);shake=Math.max(shake,6);audio.play('boss');break;
   case'refog':reveals.push({x:e.x,y:e.y,life:.9,max:.9,seed:Math.random()*9,back:true});if(e.side==='me'){log('안개 여왕이 내 땅 한 칸을 다시 안개로 덮었습니다.');}break;
   case'gaze':ring(e.x,e.y,'#ff3bd0',10,95,.8,6);for(let i=0;i<14;i++){const a=Math.random()*6.28;fx.push({x:e.x+Math.cos(a)*80,y:e.y+Math.sin(a)*80,vx:-Math.cos(a)*100,vy:-Math.sin(a)*100,life:.8,max:.8,color:'#ff6af0',size:3,grav:0});}if(e.side==='me'&&e.n){log(`심연의 눈의 시선! 영웅 ${e.n}명이 2.5초 동안 굳었습니다.`);flash=Math.max(flash,.2);}break;
   case'merge':ring(e.x,e.y,e.star>2?'#ffcf4a':'#9fd4ff',6,50,.6,5);burst(e.x,e.y,e.star>2?'#ffcf4a':'#bfe3ff',24,130,3.5);addText(e.x,e.y-30,`${'★'.repeat(e.star)} 합성!`,e.star>2?'#ffe08a':'#bfe3ff',16,1.4);unitAnim.set(e.id,{born:now});if(mine){audio.play('summon');log(`${C.HEROES[e.type].name} ${e.star}성 합성 · 인구와 칸이 하나씩 비었습니다`);}break;
   case'weather':if(e.weather!=='clear'){const W2=C.WEATHER[e.weather];log(`스테이지 ${e.stage} 날씨: ${W2.name} · ${W2.desc}`);}break;
   case'reveal':burst(e.x,e.y,'#b8c4d8',6,50,4,.5);break;
   case'ally':ring(e.x,e.y,'#ffe08a',6,40,.7,3);if(mine){log('안개 속에서 동료를 만났습니다. 가위바위보!');audio.play('loot');}break;
   case'rps':onRps(e);break;
   case'peek':ring(e.x,e.y,'#7fd17a',4,30,.6,2);burst(e.x,e.y,'#bff5a8',6,40,2,.6);break;
   case'lairDown':burst(e.x,e.y,'#ffcf5a',30,170,4,.9);ring(e.x,e.y,'#ffcf5a',8,70,.7,5);addText(e.x,e.y-20,`둥지 토벌! +${e.crystal}/+${e.ore}`,'#ffe08a',14,1.6);if(mine){shake=Math.max(shake,6);audio.play('clear');log(`${C.LAIRS[e.kind].name} 토벌! 수정 ${e.crystal}, 광석 ${e.ore}`);}break;
   case'quake':{const b=e.box;ring((b.x0+b.x1)/2,(b.y0+b.y1)/2,'#8fb8ff',40,300,.7,6);shake=Math.max(shake,6);break;}
   case'thunder':bolts.push({pts:jag(e.x+(Math.random()-.5)*40,-10,e.x,e.y,9),life:.35,max:.35,color:'#e6e0ff',w:4});ring(e.x,e.y,'#c9bdff',6,50,.4,4);burst(e.x,e.y,'#ffffff',12,140,3);flash=Math.max(flash,.15);audio.play('thunder');break;
   case'sanctuary':ring(e.x,e.y,'#ffd76a',10,80,.9,6);burst(e.x,e.y,'#fff3c0',20,90,3);break;
   case'skill':if(mine){audio.play('skill');log(`스킬 · ${C.HEROES[e.type].skill}`);}break;
   case'summon':{if(mine)tutDone(1);const u=game.units.find(x=>x.id===e.id);if(u){const p=center(u.side,u.r,u.c);ring(p.x,p.y,HERO_COLOR[u.type],4,34,.5,3);burst(p.x,p.y,HERO_COLOR[u.type],10,70,3);}if(mine){audio.play('summon');log(`${C.HEROES[e.type].name} 소환 (인구 ${C.HEROES[e.type].pop})`);}break;}
   case'spawnUnit':unitAnim.set(e.id,{born:now});break;
   case'upgrade':if(mine){log(`강화 ${e.lv}단계 · 모든 영웅 공격력 +${e.lv*15}%`);audio.play('summon');}break;
   case'repair':if(mine){const b=C.BASE.me;ring(b.x,b.y,'#7fffb0',8,50,.6,4);log('본부 수리 +4');}break;
   case'waveStart':{const t=e.target==='me'?'내 본부로 내려옵니다':'상대 본부로 올라갑니다';showBanner(`스테이지 ${e.stage}`,e.boss?`보스 출현 · ${C.MONSTERS[e.boss].name}`:t,e.target==='me'?'#9fd4ff':'#ffb0b0');log(`스테이지 ${e.stage} 시작 · ${t}`);audio.play(e.boss?'boss':'wave');break;}
   case'boss':shake=Math.max(shake,10);bossIntro={kind:e.kind,life:3,max:3};break;
   case'stageClear':audio.play('clear');if(e.income&&running){const i=e.income;flashStatus(`스테이지 ${e.stage} 정산 · 수정 +${i.base} 이자 +${i.interest} · 광석 +${i.ore}`,'#0d2a1a','#b8ffd0');log(`스테이지 ${e.stage} 정산: 수정 ${i.base} + 이자 ${i.interest}, 광석 ${i.ore}`);}break;
   case'collapse':{if(e.side==='opp')oppFellAt=game.stage;burst(e.x,e.y,'#ff8a3a',60,220,5,1.2);ring(e.x,e.y,'#ff8a3a',10,140,1,8);shake=18;if(e.side==='opp'){showBanner('상대 본부 붕괴!','이제 홀수 스테이지 몬스터도 왼쪽 길로 내려옵니다','#ffcf5a',3.2);log('상대 본부가 무너졌습니다. 수정 +200, 점수 +3000');}break;}
   case'over':slowT=1.2;if(e.result==='win')for(let i=0;i<160;i++)confetti.push({x:Math.random()*W,y:-Math.random()*H*.6,vx:(Math.random()-.5)*60,vy:60+Math.random()*90,r:Math.random()*6,c:['#ffcf4a','#8fd6ff','#ff7a9a','#9dffb0','#fff'][i%5],life:5});setTimeout(showResult,1400);audio.play(e.result==='win'?'win':'lose');break;
  }
 }
}
function jag(x1,y1,x2,y2,n){const pts=[[x1,y1]];for(let i=1;i<n;i++){const t=i/n;pts.push([x1+(x2-x1)*t+(Math.random()-.5)*18,y1+(y2-y1)*t+(Math.random()-.5)*18]);}pts.push([x2,y2]);return pts;}

// ---------------- rock-paper-scissors ----------------
const RPS_ICON=['✊','✌️','✋'],RPS_NAME=['바위','가위','보'];
document.querySelectorAll('[data-rps]').forEach(b=>b.onclick=()=>{if(!running||paused)return;game.playRps('me',Number(b.dataset.rps));});
function onRps(e){
 if(e.side!=='me'){if(e.res==='win'&&e.hero)log(`상대가 동료 ${C.HEROES[e.hero].name}를 얻었습니다.`);return;}
 const msg=`${RPS_ICON[e.pick]} 대 ${RPS_ICON[e.foe]}`;
 if(e.res==='draw'){$('rpsText').textContent=`${msg} 비겼습니다! 한 번 더.`;addText(e.x,e.y-20,'비김!','#fff',14);return;}
 if(e.res==='win'){addText(e.x,e.y-20,e.hero?`${C.HEROES[e.hero].name} 합류!`:'수정 +90','#ffe08a',15,1.6);burst(e.x,e.y,'#ffe08a',20,120,3.5);log(`가위바위보 승리 (${msg}) · ${e.hero?C.HEROES[e.hero].name+' 합류':'자리가 없어 수정 +90'}`);audio.play('summon');}
 else{addText(e.x,e.y-20,'동료가 떠났습니다','#b4c3d4',13,1.4);log(`가위바위보 패배 (${msg}) · 동료가 떠났습니다`);audio.play('fail');}
}

// ---------------- input: drag and drop ----------------
canvas.addEventListener('pointerdown',e=>{
 audio.init();canvas.focus();if(!running||paused)return;const p=toLogical(e),cell=C.cellAt(p.x,p.y);
 try{canvas.setPointerCapture(e.pointerId);}catch{}
 if(cell&&cell.side==='me'){const u=game.unitAt('me',cell.r,cell.c);
  if(u&&!u.scout&&selected&&selected!==u.id&&game.dropTarget('me',cell.r,cell.c,selected)==='merge'){game.dropUnit('me',selected,cell.r,cell.c);selected=null;showInfo();return;}
  if(u&&!u.scout){drag={id:u.id,sx:p.x,sy:p.y,x:p.x,y:p.y,moved:false,pid:e.pointerId};selected=u.id;showInfo();return;}
  if(selected&&game.dropTarget('me',cell.r,cell.c,selected)&&!(u&&u.scout)){if(game.dropUnit('me',selected,cell.r,cell.c)){audio.play('click');}selected=null;showInfo(cell);return;}
 }
 selected=null;showInfo(cell);
});
canvas.addEventListener('pointermove',e=>{const p=toLogical(e);hover=C.cellAt(p.x,p.y);if(!drag||e.pointerId!==drag.pid)return;drag.x=p.x;drag.y=p.y;if(Math.hypot(p.x-drag.sx,p.y-drag.sy)>8)drag.moved=true;});
const endDrag=e=>{if(!drag||e.pointerId!==drag.pid)return;const d=drag;drag=null;if(!d.moved)return;const cell=C.cellAt(d.x,d.y);if(cell&&cell.side==='me'&&game.dropUnit('me',d.id,cell.r,cell.c)){audio.play('click');selected=null;showInfo();}};
canvas.addEventListener('pointerup',endDrag);canvas.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.pid)drag=null;});
canvas.addEventListener('pointerleave',()=>{hover=null;});
addEventListener('keydown',e=>{
 if(e.target.tagName==='INPUT')return;const k=e.key.toLowerCase();
 if(k==='p'||k==='escape'){togglePause();return;}
 if(!running||paused)return;
 if(k>='1'&&k<='6'){game.useSkill('me',C.HERO_ORDER[Number(k)-1]);}
 else if(k==='q')doSummon();else if(k==='w')game.upgrade('me');else if(k==='e')game.repair('me');
 else if(k===' '){e.preventDefault();game.startNow();}
 else if(k==='f')$('speedBtn').click();
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running&&!paused)togglePause();});

// ---------------- info panel ----------------
function showInfo(cell){
 const box=$('infoBox');box.replaceChildren();const add=(html)=>{const p=document.createElement('p');p.innerHTML=html;box.append(p);};
 const u=selected?game.units.find(x=>x.id===selected):null;
 if(u){const H=C.HEROES[u.type];add(`<b>${H.name}</b> ${'★'.repeat(u.star)} <span class="tag">인구 ${H.pop}</span><span class="tag">정찰 ${C.SCOUT_TIME[H.pop]}초</span>`);add(`${H.desc}<br>공격력 ${Math.round(game.unitDamage(u))} · 사거리 ${H.range}칸 · 처치 ${u.kills}`);add(`스킬 <b>${H.skill}</b>: ${H.skillDesc}`);add('끌어서 안개 칸에 놓으면 정찰, 빈 칸은 이동, 같은 영웅·같은 별이면 합성(최대 3성), 다른 영웅 위는 자리 바꾸기.');return;}
 if(cell){const c=game.sides[cell.side].cells[cell.r][cell.c];
  if(c.lair){const L=C.LAIRS[c.lair.kind];add(`<b>${L.name}</b> 체력 ${Math.ceil(c.lair.hp)}/${Math.round(c.lair.max)}`);add('사거리가 닿는 영웅이 자동으로 공격합니다. 무너뜨리면 수정과 광석을 크게 얻습니다.');return;}
  if(c.fog){add(cell.side==='me'?(game.scoutable('me',cell.r,cell.c)?'<b>안개</b> · 정찰할 수 있는 칸입니다. 영웅을 끌어다 놓으세요.':'<b>안개</b> · 밝혀진 칸과 맞닿아야 정찰할 수 있습니다.'):'<b>상대의 안개</b>');if(c.peek&&cell.side==='me')add(`신호탄으로 엿본 정체: <b>${({lair:'몬스터 둥지',crystal:'수정',ore:'광석',ally:'동료',chest:'보물 상자',shrine:'고대 제단',trap:'덫',empty:'빈 땅'})[c.content]}</b>`);return;}
  const ou=game.unitAt(cell.side,cell.r,cell.c);if(ou){add(`<b>${cell.side==='me'?'':'상대 '}${C.HEROES[ou.type].name}</b> ${'★'.repeat(ou.star)}${ou.scout?' · 정찰 중':''}`);return;}
 }
 add('영웅을 누르면 정보가 보입니다. 끌어서 안개 칸에 놓으면 정찰, 빈 칸에 놓으면 이동합니다.');
}

// ---------------- HUD ----------------
const iconTo=(id,name)=>{const c=$(id),g=c.getContext('2d');g.clearRect(0,0,c.width,c.height);g.drawImage(A.icon(name,c.width),0,0);};
iconTo('icoPop','pop');iconTo('icoCrystal','crystal');iconTo('icoOre','ore');
const skillBtns={};
for(const [i,k] of C.HERO_ORDER.entries()){const H=C.HEROES[k],b=document.createElement('button');b.className='skill locked';b.dataset.skill=k;b.title=`${i+1} · ${H.name} — ${H.skill}: ${H.skillDesc}`;b.setAttribute('aria-label',`${H.name} 스킬 ${H.skill}`);
 const c=document.createElement('canvas');c.width=72;c.height=72;c.getContext('2d').drawImage(A.hero(k,1,0),0,4);const cd=document.createElement('i');cd.className='cd';const n=document.createElement('span');n.className='cdn';b.append(c,cd,n);
 b.onclick=()=>{audio.init();if(running&&!paused&&game.useSkill('me',k)){}else if(running){const H2=C.HEROES[k];if(!game.units.some(u=>u.side==='me'&&u.type===k&&!u.scout))flashStatus(`${H2.name}가 있어야 ${H2.skill}을 쓸 수 있습니다`);}};$('skillBar').append(b);skillBtns[k]={b,cd,n};}
let statusMsg=null;function flashStatus(t,bgc='rgba(60,10,10,.85)',fg='#ffd0d0'){statusMsg={t,life:2.2,bg:bgc,fg};}
function drawBossPortrait(kind){const c=$('bossPortrait'),g=c.getContext('2d');g.clearRect(0,0,68,68);if(!kind)return;const s=A.monster(kind,0),k=Math.min(64/s.width,64/s.height)*1.15;g.drawImage(s,34-s.width*k/2,36-s.height*k/2,s.width*k,s.height*k);}
let hudCache={};
function setText(id,v){if(hudCache[id]!==v){hudCache[id]=v;$(id).textContent=v;}}
function updateHud(){
 const s=game.sides.me;setText('hudPop',`${game.popUsed('me')}/${C.POP_CAP}`);setText('hudStage',`${game.stage}/${C.FINAL_STAGE}`);setText('hudWeather',game.weather==='clear'?'스테이지':`스테이지 · ${C.WEATHER[game.weather].name}`);setText('hudCrystal',String(Math.floor(s.crystal)));setText('hudOre',String(Math.floor(s.ore)));
 const nb=game.nextBoss();const bk=nb?nb.kind:'';if(hudCache.boss!==bk){hudCache.boss=bk;drawBossPortrait(bk);}setText('bossName',nb?nb.name:'없음');setText('bossWhen',nb?(nb.stage===game.stage?'이번 스테이지':`${nb.stage} 스테이지`):'모든 보스 처치');
 setText('summonCost',`수정 ${C.summonCost(s.summons)}`);setText('upgradeCost',`광석 ${C.upgradeCost(s.upLv)} · ${s.upLv}단계`);
 const live=running&&!paused;$('summonBtn').disabled=!live||!game.canSummon('me');$('upgradeBtn').disabled=!live||!game.canUpgrade('me');$('repairBtn').disabled=!live||!game.canRepair('me');$('nextBtn').disabled=!live||game.phase!=='prep';
 setText('prepLeft',game.phase==='prep'?`${Math.ceil(game.prepT)}초 남음`:'웨이브 중');$('pauseBtn').disabled=!running;
 for(const k of C.HERO_ORDER){const {b,cd,n}=skillBtns[k],has=game.units.some(u=>u.side==='me'&&u.type===k&&!u.scout),left=s.skills[k],ready=has&&left<=0;
  const cls='skill'+(has?'':' locked')+(ready?' ready':'');if(b.className!==cls)b.className=cls;cd.style.setProperty('--p',(left/C.HEROES[k].cd)+'turn');const t=left>0?String(Math.ceil(left)):'';if(n.textContent!==t)n.textContent=t;}
 const rps=s.rps;$('rpsBox').hidden=!(running&&rps);if(rps)$('rpsTimer').style.transform=`scaleX(${Math.max(0,rps.t/10)})`;
}
function doSummon(){const u=game.summon('me');if(!u&&running){const s=game.sides.me;flashStatus(game.popUsed('me')>=C.POP_CAP?'인구가 가득 찼습니다':!game.freeCell('me')?'빈 칸이 없습니다. 안개를 정찰해 땅을 넓히세요':`수정이 ${C.summonCost(s.summons)} 필요합니다`);}}
$('speedBtn').onclick=()=>{speed=speed===1?2:1;$('speedBtn').textContent=`속도 ×${speed}`;$('speedBtn').setAttribute('aria-pressed',String(speed===2));};
$('summonBtn').onclick=()=>{audio.init();doSummon();};$('upgradeBtn').onclick=()=>game.upgrade('me');$('repairBtn').onclick=()=>game.repair('me');$('nextBtn').onclick=()=>game.startNow();

// ---------------- menus ----------------
const overlay=$('overlay');
function show(view){overlay.hidden=!view;for(const v of ['menuView','pauseView','resultView'])$(v).hidden=v!==view;}
document.querySelectorAll('[data-level]').forEach(b=>{b.setAttribute('aria-pressed',String(Number(b.dataset.level)===level));b.onclick=()=>{level=Number(b.dataset.level);try{localStorage.setItem('fogFrontLevel',String(level));}catch{}document.querySelectorAll('[data-level]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};});
function start(){audio.init();game=newGame();running=true;paused=false;bossIntro=null;confetti=[];oppFellAt=null;slowT=0;const col=document.querySelector('.ff-col').getBoundingClientRect();if(col.top<0||col.bottom>innerHeight)document.querySelector('.ff-col').scrollIntoView({block:innerWidth<700?'start':'center',behavior:reduced?'auto':'smooth'});fx=[];texts=[];rings=[];bolts=[];selected=null;drag=null;hudCache={};$('logList').replaceChildren();log('전선에 도착했습니다. 영웅을 안개 칸으로 끌어 정찰하세요.');log(`상대: ${game.rival.name} (${game.rival.desc})`);show(null);showInfo();canvas.focus();}
function togglePause(){if(!running)return;paused=!paused;show(paused?'pauseView':null);if(!paused)canvas.focus();}
$('startBtn').onclick=start;$('retryBtn').onclick=start;$('resumeBtn').onclick=togglePause;$('pauseBtn').onclick=togglePause;
const toMenu=()=>{running=false;paused=false;game=newGame();show('menuView');};$('quitBtn').onclick=toMenu;$('menuBtn').onclick=toMenu;
function showResult(){
 running=false;const s=game.sides.me,won=game.result==='win';
 if(game.score>best){best=game.score;try{localStorage.setItem('fogFrontBest',String(best));}catch{}}
 $('resultKicker').textContent=won?'THE FRONT HOLDS':'THE BASE HAS FALLEN';$('resultTitle').textContent=won?'전선을 지켜냈습니다!':`스테이지 ${game.stage}에서 본부가 무너졌습니다`;
 const stats=[['도달 스테이지',game.stage],['처치',s.kills],['둥지 토벌',s.lairs],['정찰',s.scouted],['합류한 동료',s.allies],['점수',game.score.toLocaleString()]];
 const box=$('resultStats');box.replaceChildren();for(const [k,v] of stats){const d=document.createElement('div'),sm=document.createElement('small'),b=document.createElement('b');sm.textContent=k;b.textContent=v;d.append(sm,b);box.append(d);}
 const rv=game.sides.opp.collapsed?`상대 ${game.rival.name}는 ${oppFellAt||game.stage}스테이지에 무너졌습니다. `:`상대 ${game.rival.name}는 아직 버티고 있습니다. `;$('resultBest').textContent=rv+(game.score>=best?'새 최고 기록입니다!':`최고 기록 ${best.toLocaleString()}점`);updateBest();show('resultView');
}
function updateBest(){$('bestScore').textContent=best?`${best.toLocaleString()}점`:'아직 기록이 없습니다';}
updateBest();

// ---------------- rendering ----------------
function render(){
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
 let sx=0,sy=0;if(shake>0&&!reduced){sx=(Math.random()-.5)*shake;sy=(Math.random()-.5)*shake;}
 ctx.save();ctx.translate(sx,sy);
 ctx.drawImage(bg,0,0);
 drawRoutes();drawDecals();drawPortal();
 for(const side of ['opp','me'])drawBoard(side);
 drawZones();
 for(const side of ['opp','me'])drawBase(side);
 drawMonsters();drawUnits();drawTrails();drawShots();drawFog();drawReveals();drawSmoke();
 drawLighting();drawHover();drawDragTargets();drawFx();drawFlies();
 ctx.restore();
 if(flash>0){ctx.fillStyle=`rgba(255,40,40,${flash*.5})`;ctx.fillRect(0,0,W,H);}
 drawBannerAndStatus();
}
function drawRoutes(){
 const target=game.targetSide(game.stage),route=game.routeFor(target).pts,active=running&&(game.phase==='wave'||game.phase==='prep');
 // blue dashed fallback route on the left lane
 const oppDown=game.sides.opp.collapsed;ctx.save();ctx.setLineDash([10,10]);ctx.lineDashOffset=-now*30;ctx.strokeStyle=oppDown?'rgba(90,170,255,.9)':'rgba(90,170,255,.28)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(50,40);ctx.lineTo(50,740);ctx.stroke();ctx.restore();
 if(!active)return;
 // red chevrons flowing along this stage's route
 const len=C.pathLength(route),col=game.phase==='wave'?'rgba(255,80,70,.85)':'rgba(255,80,70,.45)';
 ctx.save();ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';
 for(let d=(now*50)%46;d<len;d+=46){const p=pointAt(route,d),q=pointAt(route,d+6);const a=Math.atan2(q.y-p.y,q.x-p.x);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.beginPath();ctx.moveTo(-5,-6);ctx.lineTo(3,0);ctx.lineTo(-5,6);ctx.stroke();ctx.restore();}
 ctx.restore();
}
function pointAt(pts,d){for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i],l=Math.hypot(x1-x0,y1-y0);if(d<=l)return{x:x0+(x1-x0)*d/l,y:y0+(y1-y0)*d/l};d-=l;}const e=pts[pts.length-1];return{x:e[0],y:e[1]};}
function drawPortal(){const {x,y}=C.SPAWN;ctx.save();ctx.drawImage(A.glow('rgba(170,80,255,.55)',120),x-60,y-60);ctx.translate(x,y);for(let i=0;i<3;i++){ctx.rotate(now*(1+i*.4)*(i%2?-1:1));ctx.strokeStyle=`rgba(${200-i*30},${120+i*30},255,${.8-i*.2})`;ctx.lineWidth=3-i*.6;ctx.beginPath();ctx.ellipse(0,0,18-i*4,10-i*2,0,0,Math.PI*1.4);ctx.stroke();}ctx.restore();A.ell(ctx,x,y,6,4,'#1a0826');}
function drawBoard(side){
 const s=game.sides[side];if(side==='opp'){ctx.fillStyle='rgba(255,170,170,.9)';ctx.font='bold 10px sans-serif';ctx.textAlign='left';ctx.fillText(`상대 · ${game.rival.name}`,C.BX,C.BOARD_Y.opp-12+3);}const st=C.START[side];
 for(let r=0;r<C.ROWS;r++)for(let c=0;c<C.COLS;c++){const cell=s.cells[r][c],x=C.BX+c*CELL,y=C.BOARD_Y[side]+r*CELL;
  if(cell.fog)continue;ctx.drawImage(A.tile((r*7+c*3+(side==='me'?1:5))%6,side),x,y);
  if(r===st.r&&c===st.c){ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(x+2,y+2,CELL-4,CELL-4);ctx.fillStyle='rgba(255,255,255,.75)';ctx.font='bold 9px sans-serif';ctx.textAlign='left';ctx.fillText('START',x+4,y+11);}
  if(cell.lair){const p=center(side,r,c),pulse=.5+.5*Math.sin(now*3+r+c);ctx.drawImage(A.glow(`rgba(255,40,40,${.25+pulse*.25})`,90),p.x-45,p.y-45);ctx.drawImage(A.icon('lair',56),p.x-28,p.y-26);
   const L=cell.lair;hpBar(p.x,y+CELL-8,46,L.hp/L.max,'#ff6a5a');}
 }
}
function hpBar(x,y,w,f,color){ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(x-w/2-1,y-1,w+2,6);ctx.fillStyle=color;ctx.fillRect(x-w/2,y,w*Math.max(0,f),4);}
function drawBase(side){
 const s=game.sides[side],b=C.BASE[side],img=A.base(side,s.collapsed),k=.82;ctx.drawImage(img,b.x-40*k,(side==='opp'?b.y-44:b.y-60),80*k,90*k);
 if(!s.collapsed&&s.baseHp<=10&&Math.random()<(11-s.baseHp)*.03)smoke.push({x:b.x+(Math.random()-.5)*24,y:b.y-(side==='opp'?20:36),vx:(Math.random()-.5)*8,vy:-18-Math.random()*14,life:1.6,max:1.6,size:6+Math.random()*6,fire:s.baseHp<=5&&Math.random()<.5});
 if(s.shield>0){ctx.save();ctx.globalAlpha=.35+.15*Math.sin(now*8);ctx.drawImage(A.glow('rgba(255,215,106,.9)',140),b.x-70,b.y-70);ctx.restore();}
 const ty=side==='opp'?b.y+36:b.y-66;ctx.fillStyle='rgba(0,0,0,.6)';A.rr(ctx,b.x-26,ty-9,52,16,6);ctx.fill();ctx.fillStyle=s.collapsed?'#ff7a7a':s.baseHp<=6?'#ffb07a':'#fff';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(s.collapsed?'붕괴':`${s.baseHp}/${C.BASE_HP}`,b.x,ty+3);
}
function drawUnits(){
 const list=game.units.slice().sort((a,b)=>(a.side===b.side?0:a.side==='opp'?-1:1)||a.r-b.r);
 for(const u of list){
  if(drag&&drag.moved&&drag.id===u.id)continue;const p=center(u.side,u.r,u.c),an=unitAnim.get(u.id),age=an?now-an.born:9,pop=age<.35?1-Math.pow(1-age/.35,3):1;
  if(u.scout)continue;
  const frame=Math.floor(now*2.2+u.id)%2,img=A.hero(u.type,u.star,frame),sc=.82*(u.fire>0?1.06:1)*pop;
  if(selected===u.id){ctx.save();ctx.strokeStyle='rgba(255,255,255,.35)';ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(p.x,p.y,game.unitRange(u),0,Math.PI*2);ctx.stroke();ctx.restore();A.ell(ctx,p.x,p.y+18,22,7,'rgba(255,230,120,.35)');}
  const breathe=1+Math.sin(now*3+u.id)*.015,lunge=u.fire>0?u.fire/.18*4:0;ctx.save();ctx.translate(p.x+u.face*lunge,p.y+22);if(u.face<0)ctx.scale(-1,1);ctx.scale(1,breathe);ctx.drawImage(img,-36*sc,-62*sc,72*sc,72*sc);ctx.restore();
  if(u.side==='opp'){ctx.fillStyle='rgba(255,90,90,.85)';ctx.fillRect(p.x-8,p.y+24,16,2);}
  if(u.stun>0){ctx.save();ctx.translate(p.x,p.y-30);for(let i=0;i<3;i++){const a=now*4+i*2.1;A.star5(ctx,Math.cos(a)*12,Math.sin(a)*4,3.5,'#ffe08a');}ctx.restore();ctx.fillStyle='rgba(120,90,200,.25)';ctx.fillRect(p.x-28,p.y-28,56,56);}
 }
}
function drawMonsters(){
 for(const m of game.monsters.slice().sort((a,b)=>a.y-b.y)){
  const img=A.monster(m.kind,Math.floor(now*6+m.wob)%2),seg=m.pts[Math.min(m.seg,m.pts.length-1)],dx=seg[0]-m.x,flip=dx<-1;
  ctx.save();ctx.translate(m.x,m.y);if(flip)ctx.scale(-1,1);const bob=Math.sin(now*10+m.wob)*1.5;
  if(m.boss){ctx.drawImage(A.glow('rgba(255,60,60,.35)',160),-80,-80);}
  if(m.elite){ctx.drawImage(A.glow('rgba(255,200,60,.5)',70),-35,-41);}
  ctx.drawImage(img,-img.width/2,-img.height/2-6+bob);
  if(m.hitT>0){ctx.globalCompositeOperation='lighter';ctx.globalAlpha=m.hitT*5;ctx.drawImage(img,-img.width/2,-img.height/2-6+bob);}
  ctx.restore();
  if(m.harden>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.4+.2*Math.sin(now*12);ctx.drawImage(A.glow('rgba(200,220,255,.9)',140),m.x-70,m.y-76);ctx.restore();}
  if(C.MONSTERS[m.kind].aura){ctx.strokeStyle='rgba(255,220,120,.3)';ctx.setLineDash([3,5]);ctx.beginPath();ctx.arc(m.x,m.y,70,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);}
  if(m.slowF>0){ctx.strokeStyle='rgba(140,200,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(m.x,m.y+8,14,5,0,0,Math.PI*2);ctx.stroke();}
  if(m.hp<m.max||m.boss||m.elite){const w=m.boss?70:m.elite?34:26;hpBar(m.x,m.y-(m.boss?62:24),w,m.hp/m.max,m.boss?'#ff5a5a':m.elite?'#ffcf4a':'#7fe07a');}
  if(m.boss){ctx.fillStyle='#ffd0d0';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText(C.MONSTERS[m.kind].name,m.x,m.y-68);}
 }
}
function drawShots(){
 for(const p of game.shots){const a=Math.atan2(p.ty-p.y,p.tx-p.x),col=HERO_COLOR[p.type];ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);
  if(p.type==='archer'){ctx.strokeStyle='#e9d9a8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(4,0);ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(6,0);ctx.lineTo(1,-3);ctx.lineTo(1,3);ctx.fill();}
  else if(p.type==='scout'){ctx.fillStyle='#d6f5c8';ctx.fillRect(-5,-1.2,9,2.4);}
  else if(p.type==='guard'){ctx.strokeStyle='rgba(170,200,255,.8)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-16,0);ctx.lineTo(6,0);ctx.stroke();}
  else if(p.type==='pyro'){ctx.drawImage(A.glow('rgba(255,140,50,.9)',40),-20,-20);A.ell(ctx,0,0,5,4,'#fff1b0');}
  else if(p.type==='storm'){ctx.drawImage(A.glow('rgba(170,160,255,.9)',36),-18,-18);A.ell(ctx,0,0,3,3,'#fff');}
  else{ctx.drawImage(A.glow('rgba(255,230,140,.9)',40),-20,-20);A.ell(ctx,0,0,4,4,'#fff');}
  ctx.restore();}
}
function drawZones(){
 for(const z of game.zones){const f=Math.min(1,z.t/.4);
  if(z.kind==='fire'){ctx.save();ctx.globalAlpha=.5*f;ctx.drawImage(A.glow('rgba(255,110,40,.9)',z.r*2.4),z.x-z.r*1.2,z.y-z.r*1.2);ctx.restore();if(Math.random()<.6)fx.push({x:z.x+(Math.random()-.5)*z.r*1.4,y:z.y+(Math.random()-.5)*z.r,vx:0,vy:-40-Math.random()*40,life:.5,max:.5,color:Math.random()<.5?'#ffb347':'#ff5a2a',size:4+Math.random()*3,grav:-20});}
  else if(z.kind==='volley'){ctx.save();ctx.globalAlpha=.25*f;A.ell(ctx,z.x,z.y,z.r,z.r*.55,'#e8c25a');ctx.restore();ctx.strokeStyle='rgba(255,240,190,.85)';ctx.lineWidth=1.5;for(let i=0;i<6;i++){const ax=z.x+(Math.random()-.5)*z.r*1.6,ay=z.y+(Math.random()-.5)*z.r;ctx.beginPath();ctx.moveTo(ax-6,ay-22);ctx.lineTo(ax,ay);ctx.stroke();}}
 }
}
// Fog: a blurred mask of fog cells (rebuilt only when the fog changes) cuts two drifting cloud layers.
const fogMask=A.mk(W,H),fogLayer=A.mk(W,H),fl=fogLayer.getContext('2d');let fogKey='';
const clouds=A.mk(W,H);{const g=clouds.getContext('2d'),puff=A.fogPuff();for(let i=0;i<520;i++){const x=A.hash(i,11)*W,y=A.hash(i,12)*H,s=30+A.hash(i,13)*90;g.globalAlpha=.18+A.hash(i,14)*.3;for(const dx of [-W,0,W])for(const dy of [-H,0,H])g.drawImage(puff,x-s/2+dx,y-s/2+dy,s,s);}g.globalAlpha=1;}
function rebuildFogMask(){const g=fogMask.getContext('2d');g.clearRect(0,0,W,H);g.filter='blur(5px)';g.fillStyle='#fff';
 for(const side of ['opp','me']){const cells=game.sides[side].cells;for(let r=0;r<C.ROWS;r++)for(let c=0;c<C.COLS;c++)if(cells[r][c].fog)g.fillRect(C.BX+c*CELL-1,C.BOARD_Y[side]+r*CELL-1,CELL+2,CELL+2);}
 g.filter='none';}
function drawFog(){
 let key='';for(const side of ['opp','me'])for(const row of game.sides[side].cells)for(const c of row)key+=c.fog?1:0;
 if(key!==fogKey){fogKey=key;rebuildFogMask();}
 fl.globalCompositeOperation='source-over';fl.clearRect(0,0,W,H);fl.fillStyle='#4f5768';fl.fillRect(0,0,W,H);
 const o1=(now*6)%W,o2=(now*-9)%W;fl.globalAlpha=.9;fl.drawImage(clouds,o1,0);fl.drawImage(clouds,o1-W,0);fl.globalAlpha=.55;fl.drawImage(clouds,o2,(now*3)%H-H/2);fl.drawImage(clouds,o2+W,(now*3)%H-H/2);fl.globalAlpha=1;
 fl.globalCompositeOperation='destination-in';fl.drawImage(fogMask,0,0);
 ctx.drawImage(fogLayer,0,0);
 for(const side of ['opp','me']){const s=game.sides[side];
  for(let r=0;r<C.ROWS;r++)for(let c=0;c<C.COLS;c++){const cell=s.cells[r][c];if(!cell.fog)continue;const x=C.BX+c*CELL,y=C.BOARD_Y[side]+r*CELL;
   ctx.strokeStyle='rgba(20,24,34,.16)';ctx.lineWidth=1;ctx.strokeRect(x+.5,y+.5,CELL-1,CELL-1);
   if(side==='me'&&cell.peek){ctx.globalAlpha=.7+.2*Math.sin(now*3);const ic={lair:'lair',crystal:'crystal',ore:'ore',ally:'ally',chest:'chest',shrine:'shrine',trap:'trap'}[cell.content];if(ic)ctx.drawImage(A.icon(ic,34),x+13,y+13);else{ctx.fillStyle='#e6ecf5';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('빈 땅',x+30,y+34);}ctx.globalAlpha=1;}
   const u=cell.unit&&game.units.find(v=>v.id===cell.unit);
   if(u&&u.scout){const p=center(side,r,c);ctx.drawImage(A.glow(side==='me'?'rgba(143,214,255,.45)':'rgba(255,140,140,.4)',80),p.x-40,p.y-40);ctx.globalAlpha=.85;const img=A.hero(u.type,u.star,Math.floor(now*4)%2);ctx.drawImage(img,p.x-24,p.y-30,48,48);ctx.globalAlpha=1;const f=1-u.scout.t/u.scout.total;
    ctx.strokeStyle='rgba(0,0,0,.6)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(p.x,p.y,24,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=side==='me'?'#8fd6ff':'#ff9a9a';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,24,-Math.PI/2,-Math.PI/2+f*Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(Math.ceil(u.scout.t)+'초',p.x,p.y+22);}
  }
 }
}
function drawDragTargets(){
 const id=drag&&drag.moved?drag.id:selected;if(!id)return;const u=game.units.find(x=>x.id===id);if(!u)return;const s=game.sides.me;
 for(let r=0;r<C.ROWS;r++)for(let c=0;c<C.COLS;c++){const t=game.dropTarget('me',r,c,u.id);if(!t||(u.r===r&&u.c===c))continue;const x=C.BX+c*CELL,y=C.BOARD_Y.me+r*CELL,isHover=hover&&hover.side==='me'&&hover.r===r&&hover.c===c;
  if(t==='scout'){ctx.strokeStyle=isHover?'#ffffff':'rgba(143,214,255,.9)';ctx.lineWidth=isHover?3:2;ctx.setLineDash([6,4]);ctx.strokeRect(x+3,y+3,CELL-6,CELL-6);ctx.setLineDash([]);ctx.fillStyle='#e8f6ff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(`정찰 ${C.SCOUT_TIME[C.HEROES[u.type].pop]}초`,x+30,y+35);}
  else if(t==='merge'){ctx.strokeStyle=isHover?'#fff':'#ffcf4a';ctx.lineWidth=isHover?3:2;ctx.strokeRect(x+3,y+3,CELL-6,CELL-6);ctx.fillStyle='rgba(255,207,74,.18)';ctx.fillRect(x+3,y+3,CELL-6,CELL-6);ctx.fillStyle='#ffe08a';ctx.font='bold 11px sans-serif';ctx.textAlign='center';ctx.fillText('합성',x+30,y+12);}
  else if(!s.cells[r][c].unit){ctx.fillStyle=isHover?'rgba(140,255,170,.28)':'rgba(140,255,170,.12)';ctx.fillRect(x+2,y+2,CELL-4,CELL-4);}
 }
 if(drag&&drag.moved){const img=A.hero(u.type,u.star,0);ctx.save();ctx.globalAlpha=.85;ctx.drawImage(img,drag.x-36,drag.y-50);ctx.restore();ctx.strokeStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.arc(drag.x,drag.y,C.HEROES[u.type].range*CELL,0,Math.PI*2);ctx.stroke();}
}
function drawFx(){
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(const p of fx){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size*(.4+.6*p.life/p.max),0,Math.PI*2);ctx.fill();}
 for(const r of rings){const t=1-r.life/r.max;ctx.globalAlpha=1-t;ctx.strokeStyle=r.color;ctx.lineWidth=r.w*(1-t)+.5;ctx.beginPath();ctx.arc(r.x,r.y,r.r0+(r.r1-r.r0)*t,0,Math.PI*2);ctx.stroke();}
 for(const b of bolts){ctx.globalAlpha=b.life/b.max;ctx.strokeStyle=b.color;ctx.lineWidth=b.w||2;ctx.beginPath();b.pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}
 ctx.restore();ctx.globalAlpha=1;
 for(const t of texts){const k=t.life/t.max;ctx.globalAlpha=Math.min(1,k*2);ctx.font=`900 ${t.size}px sans-serif`;ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='rgba(0,0,0,.75)';const y=t.y-(1-k)*26;ctx.strokeText(t.text,t.x,y);ctx.fillStyle=t.color;ctx.fillText(t.text,t.x,y);}
 ctx.globalAlpha=1;
}
function drawHover(){if(!hover||drag||!running)return;const x=C.BX+hover.c*CELL,y=C.BOARD_Y[hover.side]+hover.r*CELL;ctx.strokeStyle='rgba(255,255,255,.28)';ctx.lineWidth=1.5;ctx.strokeRect(x+1.5,y+1.5,CELL-3,CELL-3);}
function drawDecals(){for(const d of decals){ctx.save();ctx.globalAlpha=Math.min(1,d.life/d.max*2)*.55;ctx.translate(d.x,d.y);ctx.rotate(d.rot);A.ell(ctx,0,0,d.r,d.r*.55,'#1a1f12');A.ell(ctx,d.r*.4,d.r*.1,d.r*.35,d.r*.25,'#263018');ctx.restore();}ctx.globalAlpha=1;}
function drawTrails(){ctx.save();ctx.lineCap='round';for(const p of game.shots){const t=trails.get(p.id);if(!t||t.length<2)continue;const col=HERO_COLOR[p.type];for(let i=1;i<t.length;i++){ctx.globalAlpha=i/t.length*.55;ctx.strokeStyle=col;ctx.lineWidth=(p.type==='pyro'||p.type==='warden'?5:2.5)*i/t.length;ctx.beginPath();ctx.moveTo(t[i-1][0],t[i-1][1]);ctx.lineTo(t[i][0],t[i][1]);ctx.stroke();}}ctx.restore();}
function drawReveals(){const puff=A.fogPuff();for(const r of reveals){const k=r.back?r.life/r.max:1-r.life/r.max;for(let i=0;i<5;i++){const a=r.seed+i*1.26,d=k*36,sz=50*(1-k*.4);ctx.globalAlpha=(1-k)*.6;ctx.drawImage(puff,r.x+Math.cos(a)*d-sz/2,r.y+Math.sin(a)*d-sz/2,sz,sz);}ctx.globalAlpha=(1-k)*.5;ctx.drawImage(A.glow('rgba(200,230,255,.8)',80),r.x-40,r.y-40);}ctx.globalAlpha=1;}
function drawSmoke(){for(const p of smoke){const k=p.life/p.max;ctx.globalAlpha=k*.45;A.ell(ctx,p.x,p.y,p.size,p.size,p.fire&&k>.7?'#ff8a3a':'#3a3634');}ctx.globalAlpha=1;}
function drawFlies(){if(reduced)return;ctx.save();ctx.globalCompositeOperation='lighter';for(const f of flies){ctx.globalAlpha=.35+.35*Math.sin(now*3+f.a*5);ctx.drawImage(A.glow('rgba(200,255,150,.9)',14),f.x-7,f.y-7);}ctx.restore();ctx.globalAlpha=1;}
function drawLighting(){
 lctx.setTransform(1,0,0,1,0,0);lctx.globalCompositeOperation='source-over';lctx.clearRect(0,0,W/2,H/2);lctx.fillStyle='rgba(6,10,22,.38)';lctx.fillRect(0,0,W/2,H/2);
 lctx.globalCompositeOperation='destination-out';const hole=A.glow('rgba(255,255,255,1)',128),L=(x,y,r,a=1)=>{lctx.globalAlpha=a;lctx.drawImage(hole,(x-r)/2,(y-r)/2,r,r);};
 for(const u of game.units)if(!u.scout){const p=center(u.side,u.r,u.c);L(p.x,p.y,110,.75);}
 for(const side of ['opp','me']){const b=C.BASE[side];if(!game.sides[side].collapsed)L(b.x,b.y,170,.9);}
 L(C.SPAWN.x,C.SPAWN.y,150,.8);for(const p of game.shots)L(p.x,p.y,60,.6);for(const z of game.zones)L(z.x,z.y,z.r*3,.9);for(const m of game.monsters)if(m.boss)L(m.x,m.y,140,.5);
 for(const r of reveals)L(r.x,r.y,120,r.life/r.max);
 lctx.globalAlpha=1;ctx.drawImage(light,0,0,W,H);
 // warm colour bleed for fire and the portal
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.35;ctx.drawImage(A.glow('rgba(150,70,255,.6)',180),C.SPAWN.x-90,C.SPAWN.y-90);for(const z of game.zones)if(z.kind==='fire')ctx.drawImage(A.glow('rgba(255,120,40,.7)',z.r*3),z.x-z.r*1.5,z.y-z.r*1.5);ctx.restore();
}
function drawBossIntro(){if(!bossIntro)return;const k=bossIntro.life/bossIntro.max,t=1-k,slide=Math.min(1,t*5),out=Math.min(1,k*4),a=Math.min(slide,out);const M=C.MONSTERS[bossIntro.kind];
 ctx.save();ctx.globalAlpha=a*.55;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.globalAlpha=a;const y=300,x=(1-slide)*-W;
 ctx.fillStyle=A.grad(ctx,0,y-70,0,y+70,[[0,'rgba(60,8,12,.95)'],[1,'rgba(20,4,8,.95)']]);ctx.fillRect(x,y-70,W,140);ctx.fillStyle='#ff5a5a';ctx.fillRect(x,y-70,W,3);ctx.fillRect(x,y+67,W,3);
 const img=A.monster(bossIntro.kind,Math.floor(now*4)%2),sc=130/Math.max(img.width,img.height);ctx.drawImage(A.glow('rgba(255,60,60,.5)',200),x+20,y-100);ctx.drawImage(img,x+120-img.width*sc/2*1.3,y-img.height*sc/2*1.3-6,img.width*sc*1.3,img.height*sc*1.3);
 ctx.textAlign='left';ctx.fillStyle='#ff9a9a';ctx.font='bold 12px sans-serif';ctx.fillText('BOSS · 스테이지 '+game.stage,x+230,y-30);ctx.fillStyle='#fff';ctx.font='900 32px sans-serif';ctx.fillText(M.name,x+230,y+6);ctx.fillStyle='#e8c8c8';ctx.font='12px sans-serif';
 const words=(BOSS_TRAIT[bossIntro.kind]||'').split(' ');let line='',ly=y+30;for(const w of words){if(ctx.measureText(line+w).width>340){ctx.fillText(line,x+230,ly);line='';ly+=17;}line+=w+' ';}ctx.fillText(line,x+230,ly);ctx.restore();}
function drawTutorial(){if(!running||paused||tut>2)return;let tx,ty,msg;
 if(tut===0){const u=game.units.find(v=>v.side==='me'&&!v.scout);if(!u)return;const p=center('me',u.r,u.c);let tgt=null;for(let r=0;r<C.ROWS&&!tgt;r++)for(let c=0;c<C.COLS&&!tgt;c++)if(game.scoutable('me',r,c))tgt=center('me',r,c);if(!tgt)return;
  const k=(now*.7)%1,hx=p.x+(tgt.x-p.x)*k,hy=p.y+(tgt.y-p.y)*k;ctx.save();ctx.globalAlpha=Math.sin(k*Math.PI);ctx.drawImage(A.hero(u.type,1,0),hx-24,hy-34,48,48);ctx.restore();ctx.strokeStyle='rgba(255,230,140,.9)';ctx.setLineDash([5,5]);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(tgt.x,tgt.y);ctx.stroke();ctx.setLineDash([]);tx=tgt.x+40;ty=tgt.y+46;msg='영웅을 안개 칸으로 끌어 정찰하세요';}
 else if(tut===1){if(!game.canSummon('me'))return;tx=W/2;ty=H-70;msg='아래 [영웅 소환]으로 영웅을 늘리세요';}
 else{if(game.phase!=='wave')return;tx=W/2;ty=560;msg='길가에 맞닿은 칸의 영웅이 몬스터를 공격합니다';if(game.stage>=3)tutDone(2);}
 ctx.save();ctx.font='bold 13px sans-serif';const w=ctx.measureText(msg).width+24,bx=Math.max(8,Math.min(W-w-8,tx-w/2));ctx.globalAlpha=.85+.15*Math.sin(now*5);ctx.fillStyle='rgba(40,32,8,.92)';A.rr(ctx,bx,ty-16,w,28,10);ctx.fill();ctx.strokeStyle='#ffcf5a';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle='#ffe7a6';ctx.textAlign='left';ctx.fillText(msg,bx+12,ty+3);ctx.restore();}
function drawConfetti(){for(const c of confetti){ctx.save();ctx.translate(c.x,c.y);ctx.rotate(c.r);ctx.fillStyle=c.c;ctx.globalAlpha=Math.min(1,c.life);ctx.fillRect(-4,-2,8,4);ctx.restore();}}
function drawBannerAndStatus(){
 drawTutorial();drawBossIntro();drawConfetti();
 if(running&&game.phase==='prep'){const wt=game.weather!=='clear'?` · ${C.WEATHER[game.weather].name}`:'',tw=wt?250:180;ctx.fillStyle='rgba(0,0,0,.6)';A.rr(ctx,W/2-tw/2,398-14,tw,26,13);ctx.fill();ctx.fillStyle='#e8f2ff';ctx.font='bold 12px sans-serif';ctx.textAlign='center';ctx.fillText(`스테이지 ${game.stage} 준비 · ${Math.ceil(game.prepT)}초${wt}`,W/2,394+8);}
 if(banner&&!bossIntro){const k=banner.life/banner.max,a=Math.min(1,(1-k)*6,k*3);ctx.save();ctx.globalAlpha=a;ctx.fillStyle='rgba(5,8,12,.72)';const by=205;ctx.fillStyle=A.grad(ctx,0,0,W,0,[[0,'rgba(5,8,12,0)'],[.2,'rgba(5,8,12,.78)'],[.8,'rgba(5,8,12,.78)'],[1,'rgba(5,8,12,0)']]);ctx.fillRect(0,by-40,W,72);ctx.fillStyle=banner.color;ctx.font='900 28px sans-serif';ctx.textAlign='center';ctx.fillText(banner.title,W/2,by-4);ctx.fillStyle='#d6e2ee';ctx.font='bold 13px sans-serif';ctx.fillText(banner.sub,W/2,by+20);ctx.restore();}
 if(statusMsg){ctx.save();ctx.globalAlpha=Math.min(1,statusMsg.life*2);ctx.fillStyle=statusMsg.bg;A.rr(ctx,W/2-200,H-46,400,30,10);ctx.fill();ctx.fillStyle=statusMsg.fg;ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText(statusMsg.t,W/2,H-26);ctx.restore();}
}
function updateFx(dt){
 for(const p of fx){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=(p.grav||0)*dt;p.vx*=.96;}fx=fx.filter(p=>p.life>0);if(fx.length>700)fx.splice(0,fx.length-700);
 for(const r of rings)r.life-=dt;rings=rings.filter(r=>r.life>0);for(const b of bolts)b.life-=dt;bolts=bolts.filter(b=>b.life>0);
 for(const t of texts)t.life-=dt;texts=texts.filter(t=>t.life>0);
 for(const d of decals)d.life-=dt;decals=decals.filter(d=>d.life>0);
 for(const p of smoke){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.size+=dt*8;}smoke=smoke.filter(p=>p.life>0);
 for(const r of reveals)r.life-=dt;reveals=reveals.filter(r=>r.life>0);
 for(const f of flies){f.a+=dt*f.s;f.x+=Math.cos(f.a*1.3)*dt*12;f.y+=Math.sin(f.a)*dt*9;if(f.x<0)f.x=W;if(f.x>W)f.x=0;if(f.y<0)f.y=H;if(f.y>H)f.y=0;}
 const live=new Set();for(const p of game.shots){live.add(p.id);let t=trails.get(p.id);if(!t){t=[];trails.set(p.id,t);}t.push([p.x,p.y]);if(t.length>7)t.shift();}for(const id of trails.keys())if(!live.has(id))trails.delete(id);
 for(const side of ['opp','me']){const cells=game.sides[side].cells;for(let r=0;r<C.ROWS;r++)for(let c=0;c<C.COLS;c++){const k=side+r+c,f=cells[r][c].fog,prev=fogPrev.get(k);if(prev===true&&!f){const p=center(side,r,c);reveals.push({x:p.x,y:p.y,life:.9,max:.9,seed:Math.random()*9});}fogPrev.set(k,f);}}
 if(banner){banner.life-=dt;if(banner.life<=0)banner=null;}if(statusMsg){statusMsg.life-=dt;if(statusMsg.life<=0)statusMsg=null;}
 if(bossIntro){bossIntro.life-=dt;if(bossIntro.life<=0)bossIntro=null;}for(const c of confetti){c.x+=c.vx*dt;c.y+=c.vy*dt;c.r+=dt*4;c.life-=dt;}confetti=confetti.filter(c=>c.life>0&&c.y<H+20);
 shake=Math.max(0,shake-dt*30);flash=Math.max(0,flash-dt);
}
function frame(t){
 const dt=Math.min(.05,(t-(last||t))/1000);last=t;now+=dt;
 if(slowT>0)slowT-=dt;timeScale=slowT>0?.3:1;
 if(running&&!paused&&game.state==='playing'){acc+=dt*timeScale*speed;let n=0;while(acc>=1/60&&n<10){game.step(1/60);acc-=1/60;n++;}if(n===10)acc=0;}
 handleEvents();updateFx(dt);render();updateHud();
 requestAnimationFrame(frame);
}
show('menuView');requestAnimationFrame(frame);
window.fogUI={get game(){return game;},get running(){return running;},get paused(){return paused;},start,togglePause,showInfo,step(n=60){for(let i=0;i<n;i++)game.step(1/60);handleEvents();}};
})();
