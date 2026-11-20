'use strict';
// 던전엔드레곤 (formerly 균열의 검) — game loop, input, effects, HUD and menus.
(()=>{
const $=id=>document.getElementById(id);
const canvas=$('riftCanvas'),ctx=canvas.getContext('2d'),A=RiftArt,W=960,H=540;
const light=document.createElement('canvas');light.width=480;light.height=270;const lctx=light.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let touchUI=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;if(touchUI)document.documentElement.classList.add('rb-touch');
addEventListener('touchstart',()=>{if(!touchUI){touchUI=true;document.documentElement.classList.add('rb-touch');}},{passive:true});
let heroId='blade';try{const s=localStorage.getItem('riftBladeHeroV2');if(RIFT_HEROES[s])heroId=s;}catch{}
let weaponPick={};try{weaponPick=JSON.parse(localStorage.getItem('riftBladeWeaponV2')||'{}')||{};}catch{}
const weaponOf=id=>RIFT_WEAPONS[id].some(w=>w.id===weaponPick[id])?weaponPick[id]:RIFT_WEAPONS[id][0].id;
const newGame=()=>new RiftGame(heroId,undefined,weaponOf(heroId));
const elemColor=el=>RIFT_ELEMENTS[el]?.color||'#ffffff';
let game=newGame(),cutin=null,last=0,fx=[],texts=[],flashes=[],shake=0,hpTrail=1,banner=null,dpr=1,ultDim=0,tint=null;
let best=0;try{best=Number(localStorage.getItem('riftBladeBestV2'))||0;}catch{}
window.rift=game;

// ---------------- audio ----------------
const audio={ctx:null,on:false,
 init(){if(this.ctx||!window.AudioContext&&!window.webkitAudioContext)return;this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.32;this.master.connect(this.ctx.destination);},
 tone(f,d,type='sine',v=.3,slide=0){if(!this.on||!this.ctx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(this.master);o.start(t);o.stop(t+d+.02);},
 noise(d,v=.3,freq=1200){if(!this.on||!this.ctx)return;const t=this.ctx.currentTime,n=Math.floor(this.ctx.sampleRate*d),buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate),data=buf.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();f.type='bandpass';f.frequency.value=freq;f.Q.value=.8;g.gain.value=v;s.buffer=buf;s.connect(f).connect(g).connect(this.master);s.start(t);},
 play(name){const m={slash:()=>this.noise(.12,.25,2400),hit:()=>{this.noise(.08,.35,900);this.tone(120,.1,'square',.12,.5);},heavy:()=>{this.noise(.18,.45,500);this.tone(80,.22,'sawtooth',.18,.4);},shoot:()=>this.tone(880,.08,'triangle',.12,.5),dash:()=>this.noise(.16,.2,3200),hurt:()=>{this.tone(200,.2,'sawtooth',.2,.5);this.noise(.1,.3,600);},perfect:()=>{this.tone(1320,.25,'sine',.2);this.tone(1980,.3,'sine',.12);},kill:()=>this.tone(520,.18,'triangle',.15,.4),boss:()=>{this.tone(70,.9,'sawtooth',.25,.6);},ult:()=>{this.tone(220,.6,'sawtooth',.2,3);this.noise(.5,.3,1500);},impact:()=>this.noise(.2,.3,300),zap:()=>{this.noise(.1,.3,4200);this.tone(1600,.08,'square',.08,.3);},freeze:()=>{this.tone(1800,.25,'sine',.12,.6);this.noise(.15,.2,5000);},forge:()=>{[392,523,784].forEach((f,i)=>setTimeout(()=>this.tone(f,.35,'triangle',.2),i*90));this.noise(.2,.25,2600);},choose:()=>{this.tone(660,.12,'sine',.18);this.tone(990,.2,'sine',.14);},win:()=>[523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.tone(f,.4,'triangle',.18),i*120))};(m[name]||(()=>{}))();}
};
try{audio.on=localStorage.getItem('riftBladeSoundV2')==='1';}catch{}
$('soundToggle').checked=audio.on;$('soundToggle').onchange=e=>{audio.on=e.target.checked;if(audio.on){audio.init();audio.ctx?.resume?.();}try{localStorage.setItem('riftBladeSoundV2',audio.on?'1':'0');}catch{}};

// ---------------- input ----------------
const keys=new Set(),stick={x:0,y:0,id:null};let attackHeld=false;
const KEYMAP={j:'attack',z:'attack',k:'skill',x:'skill',l:'ult',c:'ult',' ':'dash',shift:'dash'};
function doAction(a){if(game.state!=='playing')return;if(a==='attack')game.attack();else if(a==='skill')game.skill();else if(a==='ult')game.ultimate();else if(a==='dash'){const ix=moveVector().x;if(Math.abs(ix)>.2)game.player.face=ix>0?1:-1;game.dashMove();}}
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)&&document.activeElement?.tagName!=='INPUT')e.preventDefault();
 if(k==='p'||k==='escape'){togglePause();return;}
 if(e.repeat)return;keys.add(k);if(KEYMAP[k]){if(KEYMAP[k]==='attack')attackHeld=true;doAction(KEYMAP[k]);}
 if(k==='enter'&&game.state==='ready')startGame();});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys.delete(k);if(KEYMAP[k]==='attack')attackHeld=false;});
addEventListener('blur',()=>{keys.clear();attackHeld=false;stick.x=stick.y=0;if(game.state==='playing')togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&game.state==='playing')togglePause();});
function moveVector(){let x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),y=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);if(stick.id!==null){x=stick.x;y=stick.y;}return{x,y};}
const pad=$('stickZone'),knob=$('stickKnob');
pad.addEventListener('pointerdown',e=>{stick.id=e.pointerId;try{pad.setPointerCapture(e.pointerId);}catch{}moveStick(e);audio.init();});
pad.addEventListener('pointermove',e=>{if(e.pointerId===stick.id)moveStick(e);});
const endStick=e=>{if(e.pointerId!==stick.id)return;stick.id=null;stick.x=stick.y=0;knob.style.transform='';};pad.addEventListener('pointerup',endStick);pad.addEventListener('pointercancel',endStick);
function moveStick(e){const r=pad.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,max=r.width*.38;let dx=e.clientX-cx,dy=e.clientY-cy;const l=Math.hypot(dx,dy);if(l>max){dx*=max/l;dy*=max/l;}stick.x=Math.abs(dx/max)<.18?0:dx/max;stick.y=Math.abs(dy/max)<.18?0:dy/max;knob.style.transform=`translate(${dx}px,${dy}px)`;}
document.querySelectorAll('[data-pad]').forEach(b=>{const a=b.dataset.pad;b.addEventListener('pointerdown',e=>{e.preventDefault();audio.init();b.classList.add('down');if(a==='attack')attackHeld=true;doAction(a);});const up=()=>{b.classList.remove('down');if(a==='attack')attackHeld=false;};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);});
canvas.addEventListener('pointerdown',()=>{canvas.focus();audio.init();});

// ---------------- menus ----------------
const overlay=$('riftOverlay');
function show(view){overlay.hidden=!view;for(const v of ['menuView','choiceView','pauseView','resultView'])$(v).hidden=v!==view;}
function buildHeroCards(){const box=$('heroCards');box.replaceChildren();for(const [id,h] of Object.entries(RIFT_HEROES)){const b=document.createElement('button');b.className='hero-card';b.dataset.hero=id;b.setAttribute('aria-pressed',String(id===heroId));const c=document.createElement('canvas');c.width=180;c.height=200;c.setAttribute('aria-hidden','true');const name=document.createElement('b'),role=document.createElement('small'),stat=document.createElement('span');name.textContent=h.name;role.textContent=h.role;stat.textContent=`체력 ${h.hp} · 마력 ${h.mp}`;b.append(c,name,role,stat);b.onclick=()=>{heroId=id;try{localStorage.setItem('riftBladeHeroV2',id);}catch{}game=newGame();window.rift=game;buildHeroCards();};box.append(b);drawPortrait(c,id);}buildWeaponCards();}
function buildWeaponCards(){const box=$('weaponCards');box.replaceChildren();const cur=weaponOf(heroId);
 for(const w of RIFT_WEAPONS[heroId]){const el=RIFT_ELEMENTS[w.elem],b=document.createElement('button');b.className='weapon-card';b.dataset.weapon=w.id;b.setAttribute('aria-pressed',String(w.id===cur));b.style.setProperty('--el',el.color);
  const c=document.createElement('canvas');c.width=72;c.height=72;c.setAttribute('aria-hidden','true');const name=document.createElement('b'),tag=document.createElement('small');name.textContent=w.name;tag.textContent=el.name+' 속성';b.append(c,name,tag);
  b.onclick=()=>{weaponPick[heroId]=w.id;try{localStorage.setItem('riftBladeWeaponV2',JSON.stringify(weaponPick));}catch{}game=newGame();window.rift=game;buildWeaponCards();};box.append(b);drawWeaponIcon(c,w,0);}
 const w=RIFT_WEAPONS[heroId].find(x=>x.id===cur),el=RIFT_ELEMENTS[w.elem];
 $('heroDesc').textContent=`${RIFT_HEROES[heroId].title} · ${w.name}: ${w.desc} ${el.name} — ${el.desc}. 강화 3단계 각성: ${w.awaken}`;}
function drawWeaponIcon(c,w,t){const g=c.getContext('2d'),col=elemColor(w.elem);g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,72,72);const gr=g.createRadialGradient(36,38,4,36,38,36);gr.addColorStop(0,A.alpha(col,.35));gr.addColorStop(1,A.alpha(col,0));g.fillStyle=gr;g.fillRect(0,0,72,72);
 const pal={...A.HERO_PAL[heroId],glow:col};g.scale(.78,.78);A.weapon(g,w.art,46,w.art==='bow'||w.art==='venombow'?46:w.art==='crossbow'?64:78,w.art==='bow'||w.art==='venombow'?Math.PI:w.art==='crossbow'?0:-.7,pal,t,col);}
function drawPortrait(c,id,t=0){const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,c.width,c.height);const gr=g.createRadialGradient(90,110,10,90,110,110);gr.addColorStop(0,A.alpha(RIFT_HEROES[id].color,.35));gr.addColorStop(1,A.alpha(RIFT_HEROES[id].color,0));g.fillStyle=gr;g.fillRect(0,0,180,200);g.scale(1.45,1.45);const fake={heroId:id,weapon:RIFT_WEAPONS[id].find(w=>w.id===weaponOf(id)),wlv:1};A.heroFigure(g,{x:62,y:128,z:0,face:1,act:null,dash:0,hurt:0,moving:false},fake,t,false);}
$('startBtn').onclick=startGame;
function startGame(){audio.init();if(game.state!=='ready'){game=newGame();window.rift=game;}game.start();window.rift=game;fx=[];texts=[];hpTrail=1;show(null);canvas.focus();}
function togglePause(){if(game.state==='playing'||game.state==='paused'){game.pause();keys.clear();attackHeld=false;show(game.state==='paused'?'pauseView':null);if(game.state==='playing')canvas.focus();}}
$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;
$('quitBtn').onclick=()=>{game=newGame();window.rift=game;buildHeroCards();show('menuView');};
$('retryBtn').onclick=()=>{game=newGame();window.rift=game;startGame();};
$('heroBtn').onclick=()=>{game=newGame();window.rift=game;buildHeroCards();show('menuView');};
function forgeCard(){const w=game.weapon,n=game.wlv+1;return{icon:'⚒',name:`${w.name} 강화 +${n-1}`,desc:n===3?`각성! ${w.awaken}`:RIFT_WEAPON_LEVELS[n],max:RIFT_WEAPON_MAX};}
function showChoices(){const box=$('choiceCards');box.replaceChildren();game.offers.forEach((id,i)=>{const b=id==='forge'?forgeCard():RIFT_BLESSINGS.find(x=>x.id===id),r=id==='forge'?game.wlv-1:game.rank(id),el=document.createElement('button');el.className='bless-card'+(id==='forge'?' forge':'');el.dataset.bless=id;const icon=document.createElement('i'),name=document.createElement('b'),desc=document.createElement('small'),pips=document.createElement('em');icon.textContent=b.icon;name.textContent=b.name;desc.textContent=b.desc;pips.textContent='◆'.repeat(r+1)+'◇'.repeat(b.max-r-1);el.append(icon,name,pips,desc);el.onclick=()=>{if(game.choose(id)){audio.play('choose');show(null);canvas.focus();}};el.style.animationDelay=i*.07+'s';box.append(el);});
 const nextBoss=game.fight===1,nextRegion=game.fight===2;$('choiceSub').textContent=nextRegion?`${RIFT_REGIONS[game.region].name} 정복! 체력 40% 회복 · ${game.weapon.name} +${game.wlv-1} 강화 · 다음은 ${RIFT_REGIONS[game.region+1].name}`:nextBoss?`다음 전투: ${RIFT_BOSSES[game.region].name}`:'다음 전투를 위한 힘을 고르세요';show('choiceView');setTimeout(()=>box.querySelector('button')?.focus(),30);}
function showResult(){const won=game.state==='won';if(game.score>best){best=game.score;try{localStorage.setItem('riftBladeBestV2',String(best));}catch{}}
 $('resultKicker').textContent=won?'THE RIFT IS SEALED':'THE ABYSS REMAINS';$('resultTitle').textContent=won?'균열을 봉인했습니다':'검이 꺾였습니다';
 const reached=won?'모든 지역':`${RIFT_REGIONS[game.region].name} ${game.fight===2?'수문장':game.fight+1+'번째 전투'}`;
 const rows=[['점수',game.score.toLocaleString()],['도달',reached],['시간',`${Math.floor(game.time/60)}분 ${String(Math.floor(game.time%60)).padStart(2,'0')}초`],['처치',game.kills],['최대 콤보',game.maxCombo],['완벽 회피',game.perfects],['무기',`${game.weapon.name} +${game.wlv-1}`]];
 $('resultStats').replaceChildren(...rows.map(([k,v])=>{const d=document.createElement('div'),s=document.createElement('small'),b=document.createElement('b');s.textContent=k;b.textContent=v;d.append(s,b);return d;}));
 $('resultBest').textContent=`최고 기록 ${best.toLocaleString()}점`;updateBest();show('resultView');audio.play(won?'win':'hurt');}
function updateBest(){$('bestScore').textContent=best?best.toLocaleString()+'점':'아직 기록이 없습니다';}

// ---------------- effects ----------------
const heroColor=()=>RIFT_HEROES[game.heroId].color;
function spark(x,y,n,color,speed=260,size=3,life=.4,kind='spark'){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=speed*(.35+Math.random()*.8);fx.push({kind,x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.7-40,life:life*(.6+Math.random()*.6),max:life,size:size*(.6+Math.random()*.8),color});}}
function addText(x,y,text,color,size=18,life=.8){texts.push({x,y,text,color,size,life,max:life,vy:-70});}
function elemBurst(el,x,y,big){const n=big?8:4;
 if(el==='fire')spark(x,y,n,'#ffb35c',150,3.5,.7,'ember');
 else if(el==='ice')spark(x,y,n,'#dff6ff',300,4,.45,'shard');
 else if(el==='shock'){for(let i=0;i<(big?3:1);i++){const a=Math.random()*Math.PI*2,r=30+Math.random()*30;fx.push({kind:'zap',pts:[[x,y],[x+Math.cos(a)*r,y+Math.sin(a)*r*.6]],life:.12,max:.12,seed:Math.random()*99,color:'#fff6a0'});}}
 else if(el==='poison')spark(x,y,n,'#9dff6a',160,3,.6,'drop');
 else if(el==='wind')for(let i=0;i<n;i++)fx.push({kind:'streak',x:x-20+Math.random()*40,y:y-20+Math.random()*40,vx:(Math.random()<.5?-1:1)*(300+Math.random()*200),vy:0,life:.25,max:.25,size:18+Math.random()*16,color:'#e6fff0'});
 else if(el==='arcane')for(let i=0;i<n;i++)fx.push({kind:'star',x:x+(Math.random()-.5)*40,y:y+(Math.random()-.5)*30,vx:(Math.random()-.5)*60,vy:-40-Math.random()*40,life:.6,max:.6,size:4+Math.random()*3,color:'#d8c8ff'});
 else if(el==='rift'&&big)fx.push({kind:'ring',x,y:y+30,rx:60,ry:22,life:.25,max:.25,color:'#7fe6d3'});}
function handleEvents(){
 for(const e of game.drainEvents()){
  if(e.type==='hit'){const c=e.elem?elemColor(e.elem):e.kind==='chain'?'#bfe8ff':heroColor(),y=e.y-50-e.z;
   if(e.status){spark(e.x,y,3,c,110,2.5,.4,e.elem==='poison'?'drop':'ember');addText(e.x+(Math.random()-.5)*30,y-30-(e.boss?60:0),String(e.dmg),A.shade(c,.35),13,.6);continue;}
   spark(e.x,y,e.heavy?16:8,c,e.heavy?380:240,e.heavy?4:3);fx.push({kind:'impact',x:e.x,y,life:.16,max:.16,size:e.heavy?60:36,color:c});elemBurst(e.elem,e.x,y,e.heavy);
   addText(e.x+(Math.random()-.5)*20,e.y-90-e.z-(e.boss?60:0),String(e.dmg),e.crit?'#ffe27a':e.elem&&e.elem!=='rift'?A.shade(c,.55):'#ffffff',e.crit?26:e.heavy?22:17);shake=Math.max(shake,e.heavy?7:2.5);flashes.push({x:e.x,y,r:e.heavy?140:80,color:c,life:.12,max:.12});audio.play(e.heavy?'heavy':'hit');}
  else if(e.type==='kill'){spark(e.x,e.y-50,e.boss?60:22,'#ff7fd0',e.boss?520:320,4,e.boss?1.2:.6,'shard');if(e.frozen){spark(e.x,e.y-50,26,'#dff6ff',360,5,.8,'shard');addText(e.x,e.y-130,'산산조각!','#bfeaff',18,.8);audio.play('freeze');}if(e.burning)spark(e.x,e.y-40,16,'#ff8a3a',160,4,.9,'ember');for(let i=0;i<(e.boss?12:4);i++)fx.push({kind:'wisp',x:e.x+(Math.random()-.5)*30,y:e.y-40,vx:(Math.random()-.5)*30,vy:-60-Math.random()*60,life:1.2,max:1.2,size:6,color:'#d9b8ff'});if(e.boss){shake=18;flashes.push({x:e.x,y:e.y-90,r:600,color:'#ffffff',life:.5,max:.5});addText(e.x,e.y-220,'격파!','#ffe27a',44,1.6);}audio.play(e.boss?'heavy':'kill');}
  else if(e.type==='slash'){const c=elemColor(e.elem),L=e.kind==='ult'?.32:.22;fx.push({kind:'arc',x:e.x,y:e.y,face:e.face,range:e.range,step:e.step,ult:e.kind==='ult',twin:e.weapon==='twin',lv:e.lv||1,life:L,max:L,color:c});
   for(let i=0;i<(e.lv>=3?7:4);i++){const a=(Math.random()-.5)*1.6,r=e.range*(.6+Math.random()*.4);fx.push({kind:e.elem==='fire'?'ember':'spark',x:e.x+e.face*Math.cos(a)*r,y:e.y-48+Math.sin(a)*r*.6,vx:e.face*(80+Math.random()*120),vy:-30-Math.random()*60,life:.35,max:.35,size:2.5,color:c});}audio.play('slash');}
  else if(e.type==='ring')fx.push({kind:'ring',x:e.x,y:e.y,rx:e.rx,ry:e.ry,life:.35,max:.35,color:e.elem?elemColor(e.elem):heroColor()}),shake=Math.max(shake,4),elemBurst(e.elem,e.x,e.y-30,true);
  else if(e.type==='shoot'){fx.push({kind:'impact',x:game.player.x+e.face*34,y:game.player.y-48,life:.1,max:.1,size:22,color:heroColor()});audio.play('shoot');}
  else if(e.type==='blast'){const c=e.elem&&e.elem!=='arcane'?elemColor(e.elem):'#ffb35c',k=e.small?.55:1;spark(e.x,e.y-20,Math.round(26*k),c,420*k,4,.6);if(e.elem==='fire'||!e.elem)spark(e.x,e.y-20,Math.round(10*k),'#ffd27a',140,4,.9,'ember');fx.push({kind:'ring',x:e.x,y:e.y,rx:e.r*1.3,ry:e.r*.6,life:.4,max:.4,color:A.shade(c,.3)});fx.push({kind:'impact',x:e.x,y:e.y-24,life:.2,max:.2,size:e.r*.8,color:c});flashes.push({x:e.x,y:e.y-30,r:220*k,color:c,life:.25,max:.25});shake=Math.max(shake,9*k);audio.play('impact');}
  else if(e.type==='dash'){for(let i=0;i<8;i++)fx.push({kind:'dust',x:e.x-e.face*i*6,y:e.y,vx:-e.face*(40+Math.random()*60),vy:-10-Math.random()*20,life:.45,max:.45,size:8+Math.random()*6,color:'#c8c0b8'});audio.play('dash');}
  else if(e.type==='perfect'){addText(e.x,e.y-130,'완벽 회피!','#9fe8ff',24,1);fx.push({kind:'ring',x:e.x,y:e.y,rx:160,ry:70,life:.5,max:.5,color:'#9fe8ff'});tint={color:'#6fc8ff',life:.5,max:.5};audio.play('perfect');}
  else if(e.type==='hurt'){addText(e.x,e.y-120,'-'+e.dmg,'#ff6b6b',22);shake=Math.max(shake,8);tint={color:'#ff2a3a',life:.3,max:.3};spark(e.x,e.y-55,10,'#ff6b6b',240,3);audio.play('hurt');}
  else if(e.type==='impact'){const big=['slam','quake','charge','beam','nova','breath','gust','burst','thorn'].includes(e.kind);if(['bomb','burst','breath'].includes(e.kind))spark(e.h.x??(e.h.x1+e.h.x2)/2,(e.h.y??e.h.y1)-20,e.kind==='breath'?10:18,'#ffb35c',300,4,.6,'ember');shake=Math.max(shake,big?9:3);if(e.shape==='circle')for(let i=0;i<10;i++)fx.push({kind:'dust',x:e.h.x+(Math.random()-.5)*e.h.rx*1.4,y:e.h.y+(Math.random()-.5)*e.h.ry,vx:(Math.random()-.5)*90,vy:-20-Math.random()*40,life:.6,max:.6,size:10+Math.random()*10,color:e.kind==='ice'?'#dff6ff':e.kind==='fire'||e.kind==='bomb'||e.kind==='burst'?'#ff9a5c':e.kind==='slime'?'#d07aff':'#a89a8a'});if(big)audio.play('impact');}
  else if(e.type==='enrage'){addText(e.x,e.y-240,'격노!','#ff6b6b',34,1.4);shake=12;flashes.push({x:e.x,y:e.y-100,r:400,color:'#ff3a3a',life:.4,max:.4});audio.play('boss');}
  else if(e.type==='stagger'){addText(e.x,e.y-220,'무력화','#ffe27a',28,1.2);spark(e.x,e.y-120,24,'#ffe27a',300,4);}
  else if(e.type==='chain'){fx.push({kind:'zap',pts:[[e.x1,e.y1-50],[e.x2,e.y2-50]],life:.22,max:.22,seed:Math.random()*99,color:e.elem==='shock'?'#ffe66a':'#8ac8ff'});audio.play('zap');}
  else if(e.type==='zap'){fx.push({kind:'zap',pts:e.pts.map(([x,y],i)=>[x,y-(i?50:58)]),life:e.heavy?.3:.2,max:e.heavy?.3:.2,seed:Math.random()*99,color:'#ffe66a',heavy:e.heavy});const [x,y]=e.pts[e.pts.length-1];if(!e.hit)spark(x,y-50,6,'#ffe66a',200,2.5,.3);audio.play('zap');}
  else if(e.type==='freeze'){addText(e.x,e.y-(e.boss?220:130),'빙결!','#bfeaff',e.boss?26:20,.9);fx.push({kind:'ring',x:e.x,y:e.y,rx:70,ry:26,life:.45,max:.45,color:'#dff6ff'});spark(e.x,e.y-50,14,'#dff6ff',260,4,.6,'shard');audio.play('freeze');}
  else if(e.type==='cloud'){fx.push({kind:'cloud',x:e.x,y:e.y-30,life:.9,max:.9,size:160,color:'#9dff6a'});spark(e.x,e.y-40,18,'#9dff6a',200,3,.9,'drop');if(e.n)addText(e.x,e.y-120,'독 확산','#b8ff8a',16,.8);}
  else if(e.type==='forge'){const w=game.weapon,c=e.legend?'#ffd86a':elemColor(w.elem);fx.push({kind:'pillar',x:e.x,y:e.y,life:1.1,max:1.1,color:c});spark(e.x,e.y-60,30,c,300,3,.9,'ember');flashes.push({x:e.x,y:e.y-70,r:320,color:c,life:.5,max:.5});addText(e.x,e.y-118,e.legend?'전설의 무기!':e.awaken?'무기 각성!':`무기 강화 +${e.lv-1}`,e.legend?'#ffe27a':'#ffffff',e.legend||e.awaken?30:24,1.6);audio.play('forge');}
  else if(e.type==='ward'){for(const t2 of e.targets)fx.push({kind:'zap',pts:[[e.x,e.y-110],[t2.x,t2.y-60]],life:.35,max:.35,seed:Math.random()*99,color:'#7affc8'});fx.push({kind:'ring',x:e.x,y:e.y,rx:80,ry:30,life:.4,max:.4,color:'#7affc8'});}
  else if(e.type==='wardHit')spark(e.x,e.y-55,4,'#7affc8',180,2.5,.3);
  else if(e.type==='wardBreak'){spark(e.x,e.y-55,16,'#7affc8',300,3.5,.5,'shard');addText(e.x,e.y-120,'보호막 파괴','#7affc8',15,.7);audio.play('freeze');}
  else if(e.type==='split'){spark(e.x,e.y-30,14,'#d07aff',260,4,.5,'drop');}
  else if(e.type==='elite'){addText(e.x,e.y-150,'정예 처치! 체력 회복','#ffd86a',18,1.1);spark(e.x,e.y-60,24,'#ffd86a',340,4,.8,'ember');flashes.push({x:e.x,y:e.y-60,r:220,color:'#ffd86a',life:.35,max:.35});}
  else if(e.type==='vamp'){addText(e.x,e.y-130,'+'+e.heal,'#ff5a7a',16,.8);spark(e.x,e.y-60,8,'#ff5a7a',120,3,.6,'ember');}
  else if(e.type==='land')for(let i=0;i<6;i++)fx.push({kind:'dust',x:e.x+(Math.random()-.5)*40,y:e.y,vx:(Math.random()-.5)*80,vy:-15,life:.4,max:.4,size:9,color:'#b8b0a8'});
  else if(e.type==='act'&&e.kind==='ult'){ultDim=.9;cutin={life:1.05,max:1.05,name:RIFT_HEROES[game.heroId].ult.name,hero:RIFT_HEROES[game.heroId].title,color:game.legendary?'#ffd86a':elemColor(game.elem)};flashes.push({x:game.player.x,y:game.player.y-60,r:300,color:heroColor(),life:.3,max:.3});if(reduced)addText(game.player.x,game.player.y-150,RIFT_HEROES[game.heroId].ult.name,heroColor(),30,1.1);audio.play('ult');}
  else if(e.type==='fight'){const r=RIFT_REGIONS[e.region];banner={title:e.fight===0?r.name:`${r.name} · 두 번째 전투`,sub:e.fight===0?r.sub:'SECOND CLASH',color:r.color,life:2.2,max:2.2};}
  else if(e.type==='boss'){banner={title:e.name,sub:'GUARDIAN OF THE RIFT',color:RIFT_BOSSES[game.region].color,life:2.6,max:2.6,boss:true};audio.play('boss');}
 }
}
function updateFx(dt){
 for(const p of fx){p.life-=dt;if(p.vx!==undefined){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.kind==='spark'||p.kind==='shard'||p.kind==='drop')p.vy+=520*dt;else if(p.kind==='ember'){p.vy-=90*dt;p.vx*=.96;}else if(p.kind==='star'){p.vx*=.95;p.vy*=.95;}if(p.kind==='dust'){p.vx*=.9;p.vy*=.9;}}}
 fx=fx.filter(p=>p.life>0);if(fx.length>700)fx.splice(0,fx.length-700);
 for(const t of texts){t.life-=dt;t.y+=t.vy*dt;t.vy*=.92;}texts=texts.filter(t=>t.life>0);
 for(const f of flashes)f.life-=dt;flashes=flashes.filter(f=>f.life>0);
 shake=Math.max(0,shake-dt*40);if(cutin){cutin.life-=dt;if(cutin.life<=0)cutin=null;}ultDim=Math.max(0,ultDim-dt*1.1);if(banner){banner.life-=dt;if(banner.life<=0)banner=null;}if(tint){tint.life-=dt;if(tint.life<=0)tint=null;}
 const p=game.player;hpTrail+=(p.hp/p.maxHp-hpTrail)*Math.min(1,dt*(p.hp/p.maxHp<hpTrail?2.5:10));
}
function drawFx(g,t){
 g.save();
 for(const p of fx){const q=p.life/p.max;
  if(p.kind==='spark'||p.kind==='shard'){g.globalCompositeOperation='lighter';g.strokeStyle=A.alpha(p.color,q);g.lineWidth=p.size*(p.kind==='shard'?1.2:.8);g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-p.vx*.03,p.y-p.vy*.03);g.stroke();}
  else if(p.kind==='dust'){g.globalCompositeOperation='source-over';A.ellipse(g,p.x,p.y-6,p.size*(1.6-q*.6),p.size*.6*(1.6-q*.6),A.alpha(p.color,q*.35));}
  else if(p.kind==='wisp'){g.globalCompositeOperation='lighter';A.glow(g,p.x+Math.sin(t*6+p.y)*4,p.y,p.size*2.4,A.alpha(p.color,q*.7));}
  else if(p.kind==='impact'){g.globalCompositeOperation='lighter';const r=p.size*(1.2-q*.6);g.fillStyle=A.alpha('#ffffff',q);g.beginPath();for(let i=0;i<8;i++){const a=i/8*Math.PI*2+.3,rr=i%2?r*.3:r;g.lineTo(p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr);}g.closePath();g.fill();A.glow(g,p.x,p.y,r*1.3,A.alpha(p.color,q*.6));}
  else if(p.kind==='ring'){g.globalCompositeOperation='lighter';const k=1-q;g.strokeStyle=A.alpha(p.color,q*.9);g.lineWidth=6*q+1;g.beginPath();g.ellipse(p.x,p.y,p.rx*(.3+k*.8),p.ry*(.3+k*.8),0,0,Math.PI*2);g.stroke();}
  else if(p.kind==='arc'){g.globalCompositeOperation='lighter';const k=1-q,f=p.face,R=p.ult?p.range:p.range*.95;g.save();g.translate(p.x+f*(p.ult?R*.5:10),p.y-48);g.scale(f,1);
   if(p.ult){g.fillStyle=A.alpha(p.color,q*.6);g.fillRect(-R*.5,-16-q*10,R*k+20,32+q*20);g.fillStyle=A.alpha('#ffffff',q);g.fillRect(-R*.5,-4,R*k+20,8);}
   else{const arcs=p.twin?[[0,1],[.18,.75]]:[[0,1]];for(const [lag,sz] of arcs){const a0=(p.step===1)!==(lag>0)?.9:-1.3,a1=(p.step===1)!==(lag>0)?-1.2:1.1,span=a1-a0,kk=Math.max(0,Math.min(1,(k-lag)*1.6)),cur=a0+span*kk,Rr=R*sz,inner=.62-Math.min(.2,p.lv*.03);if(kk<=0)continue;
     g.beginPath();g.ellipse(0,0,Rr,Rr*.62,0,a0,cur,span<0);g.ellipse(0,0,Rr*inner,Rr*inner*.62,0,cur,a0,span>0);g.closePath();const gr=g.createRadialGradient(0,0,Rr*.4,0,0,Rr);gr.addColorStop(0,A.alpha(p.color,0));gr.addColorStop(.7,A.alpha(p.color,q*(.45+p.lv*.05)));gr.addColorStop(1,A.alpha('#ffffff',q));g.fillStyle=gr;g.fill();
     g.strokeStyle=A.alpha(p.lv>=6?'#ffe9a0':'#ffffff',q*.9);g.lineWidth=1.5+p.lv*.5;g.beginPath();g.ellipse(0,0,Rr,Rr*.62,0,a0+span*Math.max(0,kk-.45),cur,span<0);g.stroke();
     if(p.lv>=3){g.strokeStyle=A.alpha(p.color,q*.35);g.lineWidth=10;g.beginPath();g.ellipse(0,0,Rr*1.04,Rr*.65,0,a0,cur,span<0);g.stroke();}}}
   g.restore();}
  else if(p.kind==='ember'||p.kind==='star'){g.globalCompositeOperation='lighter';A.glow(g,p.x,p.y,p.size*2.6,A.alpha(p.color,q*.8));if(p.kind==='star'){g.fillStyle=A.alpha('#ffffff',q);g.fillRect(p.x-p.size*.15,p.y-p.size,p.size*.3,p.size*2);g.fillRect(p.x-p.size,p.y-p.size*.15,p.size*2,p.size*.3);}}
  else if(p.kind==='drop'){g.globalCompositeOperation='source-over';A.ellipse(g,p.x,p.y,p.size*.7,p.size,A.alpha(p.color,q*.85));}
  else if(p.kind==='streak'){g.globalCompositeOperation='lighter';g.strokeStyle=A.alpha(p.color,q*.7);g.lineWidth=2;g.beginPath();g.moveTo(p.x,p.y);g.lineTo(p.x-Math.sign(p.vx)*p.size,p.y);g.stroke();}
  else if(p.kind==='cloud'){g.globalCompositeOperation='lighter';const k=1-q;for(let i=0;i<6;i++){const a=i/6*Math.PI*2+k;A.glow(g,p.x+Math.cos(a)*p.size*.5*k,p.y+Math.sin(a)*p.size*.22*k,p.size*.35,A.alpha(p.color,q*.25));}}
  else if(p.kind==='pillar'){g.globalCompositeOperation='lighter';const k=1-q,w=40*(q>.8?(1-q)*5:q);const gr=g.createLinearGradient(0,p.y-420,0,p.y);gr.addColorStop(0,A.alpha(p.color,0));gr.addColorStop(.7,A.alpha(p.color,.55*q));gr.addColorStop(1,A.alpha('#ffffff',.8*q));g.fillStyle=gr;g.fillRect(p.x-w,p.y-420,w*2,420);g.strokeStyle=A.alpha(p.color,q);g.lineWidth=3;g.beginPath();g.ellipse(p.x,p.y,60+k*80,18+k*24,0,0,Math.PI*2);g.stroke();}
  else if(p.kind==='zap'){g.globalCompositeOperation='lighter';const pts=p.pts,c=p.color||'#ffe66a';for(const [w,col] of [[p.heavy?12:8,A.alpha(c,.35*q)],[p.heavy?4:2.5,A.alpha('#ffffff',q)]]){g.strokeStyle=col;g.lineWidth=w;g.lineJoin='round';g.beginPath();g.moveTo(pts[0][0],pts[0][1]);for(let s2=1;s2<pts.length;s2++){const [x1,y1]=pts[s2-1],[x2,y2]=pts[s2],seg=Math.max(3,Math.round(Math.hypot(x2-x1,y2-y1)/26));for(let i=1;i<seg;i++){const k=i/seg,j=Math.sin(p.seed+s2*7+i*3.1+q*20)*14;g.lineTo(x1+(x2-x1)*k-(y2-y1)/Math.hypot(x2-x1,y2-y1||1)*j,y1+(y2-y1)*k+j*.6);}g.lineTo(x2,y2);}g.stroke();}for(const [x,y] of pts.slice(1))A.glow(g,x,y,30,A.alpha(c,.5*q));}
  else if(p.kind==='bolt'){g.globalCompositeOperation='lighter';for(const [w,c] of [[7,'#5aa8ff66'],[2.5,'#e6f6ff']]){g.strokeStyle=c;g.lineWidth=w*q;g.beginPath();g.moveTo(p.x1,p.y1);for(let i=1;i<7;i++){const k=i/7;g.lineTo(p.x1+(p.x2-p.x1)*k+Math.sin(p.seed+i*3.1)*14,p.y1+(p.y2-p.y1)*k+Math.cos(p.seed+i*2.3)*14);}g.lineTo(p.x2,p.y2);g.stroke();}}
 }
 g.restore();
}
// ---------------- rendering ----------------
function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(2,Math.max(1,(window.devicePixelRatio||1)*(r.width/W)));canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);}
new ResizeObserver(resize).observe(canvas);resize();
function render(t){
 const g=ctx;g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
 const sx=shake&&!reduced?(Math.random()-.5)*shake:0,sy=shake&&!reduced?(Math.random()-.5)*shake:0;g.save();g.translate(sx,sy);
 const region=Math.min(game.region,4);A.background(g,region,t,reduced);
 if(ultDim>0){g.fillStyle=`rgba(4,4,12,${ultDim*.45})`;g.fillRect(0,0,W,H);}
 for(const h of game.hazards)if(h.wind>0)A.hazard(g,h,t);
 // rain + falling meteors
 for(const r of game.rains){g.save();g.globalCompositeOperation='lighter';for(let i=0;i<26;i++){const k=((t*2.4+i*.137)%1),x=r.x-r.w/2+((i*73)%r.w),y=r.y-260+k*300;g.strokeStyle='#e6ffd0aa';g.lineWidth=2;g.beginPath();g.moveTo(x,y);g.lineTo(x-6,y-26);g.stroke();}A.ellipse(g,r.x,r.y,r.w/2,40,'#a6eb8f22');g.restore();}
 for(const b of game.blasts)if(!b.done){const k=1-b.t/b.max;A.ellipse(g,b.x,b.y,b.r*k,b.r*.45*k,'#ff8a3a33','#ffb35c99',2);g.save();g.globalCompositeOperation='lighter';const mx=b.x-200*(1-k),my=b.y-420*(1-k);for(let i=0;i<5;i++)A.glow(g,mx-i*14,my-i*28,26-i*4,'#ffb35caa');A.ellipse(g,mx,my,12,12,'#fff2c8');g.restore();}
 // shadows
 const actors=[...game.enemies.map(e=>({y:e.y,e})),{y:game.player.y,hero:true}].sort((a,b)=>a.y-b.y);
 for(const a of actors){const o=a.hero?game.player:a.e,big=(a.e?.boss?(a.e.boss.id==='dragon'?4:2.4):a.e?.type==='brute'?1.5:a.e?.type==='hound'?1.4:1)*(a.e?.scale||1),k=1/(1+(o.z||0)/120);A.ellipse(g,o.x,o.y+2,26*big*k,8*big*k,'rgba(0,0,0,.38)');}
 if(game.player.dash>0||game.player.act?.kind==='ult'){g.save();g.globalAlpha=.25;for(let i=1;i<4;i++){A.heroFigure(g,{...game.player,x:game.player.x-game.player.face*i*22},game,t,false);}g.restore();}
 for(const a of actors){if(a.hero){const p=game.player;g.save();if(p.inv>0&&p.hurt<=0&&p.dash<=0&&!p.act&&Math.floor(t*20)%2)g.globalAlpha=.55;A.heroFigure(g,p,game,t,false);g.restore();}
  else{const e=a.e;g.save();if(e.dead&&!e.boss){g.globalAlpha=Math.max(0,1-e.deadT/.9);}if(e.boss)A.bossFigure(g,e,t);else A.enemyFigure(g,e,t);g.restore();A.status(g,e,t);A.ward(g,e,t);}}
 for(const s of game.shots)A.shot(g,s,t);
 drawFx(g,t);
 for(const h of game.hazards)if(h.wind<=0)A.hazard(g,h,t);
 drawLighting(g,t,region);
 // enemy health bars
 for(const e of game.alive){if(e.boss||e.hp>=e.maxHp&&!e.affix&&!(e.ward>0))continue;const k=e.scale||1,w=(e.type==='brute'?54:40)*(e.affix?1.3:1),y=e.y-(e.type==='brute'?140:e.type==='imp'?110:e.type==='slime'?80:e.type==='hound'?85:105)*k-e.z;g.fillStyle='#0b0d16cc';g.fillRect(e.x-w/2-1,y-1,w+2,6);g.fillStyle=e.affix?'#ffd86a':e.hp<e.maxHp*.3?'#ff6b6b':'#ff9a7a';g.fillRect(e.x-w/2,y,w*e.hp/e.maxHp,4);if(e.ward>0){g.fillStyle='#7affc8';g.fillRect(e.x-w/2,y-4,w*e.ward/e.wardMax,2);}
  if(e.affix){const af=RIFT_AFFIXES[e.affix];g.font="900 11px 'Pretendard Variable',system-ui,sans-serif";g.textAlign='center';g.lineWidth=3;g.strokeStyle='#0b0d16';g.strokeText('정예 · '+af.name,e.x,y-7);g.fillStyle=af.color;g.fillText('정예 · '+af.name,e.x,y-7);}}
 for(const tx of texts){const q=tx.life/tx.max,pop=q>.85?1+(q-.85)*3:1;g.save();g.globalAlpha=Math.min(1,q*2.5);g.font=`900 ${Math.round(tx.size*pop)}px 'Pretendard Variable',system-ui,sans-serif`;g.textAlign='center';g.lineWidth=4;g.strokeStyle='#0b0d16';g.strokeText(tx.text,tx.x,tx.y);g.fillStyle=tx.color;g.fillText(tx.text,tx.x,tx.y);g.restore();}
 g.restore();
 drawHUD(g,t);
 if(tint){g.fillStyle=A.alpha(tint.color,.22*tint.life/tint.max);g.fillRect(0,0,W,H);}
 if(game.slow>0){g.fillStyle='rgba(120,200,255,.06)';g.fillRect(0,0,W,H);}
}
function drawLighting(g,t,region){
 const dark=[.34,.46,.3,.42,.5][region],s=A.REGION_STYLE[region];
 lctx.globalCompositeOperation='source-over';lctx.clearRect(0,0,480,270);lctx.fillStyle=A.alpha(s.dark,dark);lctx.fillRect(0,0,480,270);
 lctx.globalCompositeOperation='destination-out';
 const hole=(x,y,r,a=1)=>{const gr=lctx.createRadialGradient(x/2,y/2,0,x/2,y/2,r/2);gr.addColorStop(0,`rgba(0,0,0,${a})`);gr.addColorStop(1,'rgba(0,0,0,0)');lctx.fillStyle=gr;lctx.beginPath();lctx.arc(x/2,y/2,r/2,0,Math.PI*2);lctx.fill();};
 for(const [x,y,r] of A.lightsOf(region))hole(x,y,r+Math.sin(t*9+x)*6,.9);
 const p=game.player;hole(p.x,p.y-50,230,.95);
 for(const s2 of game.shots)hole(s2.x,s2.y-40,110,.8);for(const f of flashes)hole(f.x,f.y,f.r,f.life/f.max);for(const h of game.hazards)if(h.wind<=0)hole(h.x??(h.x1+h.x2)/2,h.y??h.y1,260,.7);for(const e of game.alive)if(e.boss)hole(e.x,e.y-120,260,.6);
 g.drawImage(light,0,0,W,H);
 g.save();g.globalCompositeOperation='lighter';for(const f of flashes)A.glow(g,f.x,f.y,f.r*.6,A.alpha(f.color,.35*f.life/f.max));A.glow(g,p.x,p.y-50,120,A.alpha(heroColor(),.08));g.restore();
 const vg=g.createRadialGradient(W/2,H/2,H*.45,W/2,H/2,H*.95);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.5)');g.fillStyle=vg;g.fillRect(0,0,W,H);
}
function bar(g,x,y,w,h,v,col,bg='#0b0d16cc',trail){g.fillStyle=bg;g.fillRect(x-2,y-2,w+4,h+4);if(trail!=null){g.fillStyle='#ffe0e0';g.fillRect(x,y,w*Math.max(0,trail),h);}const gr=g.createLinearGradient(0,y,0,y+h);gr.addColorStop(0,A.shade(col,.25));gr.addColorStop(1,A.shade(col,-.2));g.fillStyle=gr;g.fillRect(x,y,w*Math.max(0,Math.min(1,v)),h);g.fillStyle='rgba(255,255,255,.18)';g.fillRect(x,y,w*Math.max(0,Math.min(1,v)),Math.max(1,h*.35));}
function txt(g,s,x,y,size,color,align='left',weight=800){g.font=`${weight} ${size}px 'Pretendard Variable',system-ui,sans-serif`;g.textAlign=align;g.fillStyle=color;g.fillText(s,x,y);}
function drawHUD(g,t){
 if(game.state==='ready')return;const p=game.player,h=RIFT_HEROES[game.heroId];
 g.save();g.fillStyle='rgba(8,10,20,.55)';g.beginPath();g.roundRect(14,12,300,72,12);g.fill();
 A.glow(g,46,48,34,A.alpha(h.color,.35));A.ellipse(g,46,48,24,24,'#121626',h.color,2.5);txt(g,h.name[0],46,56,22,h.color,'center',900);
 txt(g,`${Math.ceil(p.hp)} / ${p.maxHp}`,300,30,11,'#ffd9d9','right',700);
 bar(g,80,34,220,11,p.hp/p.maxHp,p.hp/p.maxHp<.3?'#ff4a5a':'#ff6b7a','#0b0d16cc',hpTrail);bar(g,80,51,220,6,p.mp/p.maxMp,'#7a8cff');
 const full=p.rift>=100;for(let i=0;i<10;i++){const x=80+i*22.2,fill=Math.max(0,Math.min(1,p.rift/10-i));g.fillStyle='#0b0d16cc';g.beginPath();g.moveTo(x,68);g.lineTo(x+9,63);g.lineTo(x+18,68);g.lineTo(x+9,73);g.closePath();g.fill();if(fill>0){g.globalAlpha=fill;g.fillStyle=full?`hsl(${(t*200+i*30)%360},90%,72%)`:'#ff7fd0';g.fill();g.globalAlpha=1;}}
 if(full){g.globalAlpha=.6+.4*Math.sin(t*8);txt(g,`L · ${h.ult.name} 준비!`,192,114,13,'#ffd0f0','left',900);g.globalAlpha=1;}
 // stage pips
 const r=RIFT_REGIONS[Math.min(game.region,4)];txt(g,r.name,W/2,30,15,'#f4ecdf','center',900);
 for(let i=0;i<5;i++)for(let j=0;j<3;j++){const idx=i*3+j,x=W/2-84+idx*12,done=idx<game.progress,cur=idx===game.progress;g.fillStyle=done?r.color:cur?'#ffffff':'rgba(255,255,255,.18)';if(j===2){g.beginPath();g.moveTo(x,40);g.lineTo(x+5,45);g.lineTo(x,50);g.lineTo(x-5,45);g.closePath();g.fill();}else{g.beginPath();g.arc(x,45,cur?3.5:2.5,0,Math.PI*2);g.fill();}}
 // score / combo
 txt(g,game.score.toLocaleString(),W-22,34,22,'#ffe2b0','right',900);txt(g,'SCORE',W-22,48,9,'#b8a88a','right',800);
 if(game.combo>=3){const pulse=1+Math.max(0,game.comboT-1.9)*.8;g.save();g.translate(W-22,96);g.scale(pulse,pulse);txt(g,String(game.combo),0,0,40,game.combo>=30?'#ff9ad8':game.combo>=15?'#ffd27a':'#ffffff','right',900);g.restore();txt(g,'COMBO',W-22,112,10,'#d8c8b0','right',800);g.fillStyle='#ffffff55';g.fillRect(W-92,118,70*Math.max(0,game.comboT/2.2),2);}
 // boss bar
 const boss=game.enemies.find(e=>e.boss&&!e.dead);if(boss){const bw=400,bx=W/2-bw/2+20,by=H-30;g.fillStyle='rgba(8,10,20,.6)';g.beginPath();g.roundRect(bx-14,by-26,bw+28,44,10);g.fill();txt(g,boss.boss.name+(boss.enraged?' · 격노':''),bx,by-8,14,boss.enraged?'#ff8a8a':'#f4ecdf','left',900);if(boss.state==='stagger')txt(g,'무력화',bx+bw,by-8,12,'#ffe27a','right',900);bar(g,bx,by,bw,10,boss.hp/boss.maxHp,boss.enraged?'#ff4a5a':boss.boss.color);g.fillStyle='#ffe27a';g.fillRect(bx,by+12,bw*Math.min(1,(boss.poise||0)/(boss.maxHp*.12)),2);}
 // skills (desktop hints)
 if(!touchUI){const items=[['J','공격',0,1],['K',h.skill.name,p.skillCd/h.skill.cd,p.mp>=game.skillCost?1:.35],['L',h.ult.name,0,full?1:.35],['␣','대시',p.dashCd/game.dashCooldown,1]];items.forEach(([k,n,cd,a],i)=>{const x=24+i*62,y=H-30;g.globalAlpha=a;g.fillStyle='rgba(8,10,20,.6)';g.beginPath();g.roundRect(x-2,y-24,56,40,8);g.fill();if(cd>0){g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x-2,y-24+40*(1-cd),56,40*cd);}txt(g,k,x+26,y-6,13,'#ffe2b0','center',900);txt(g,n,x+26,y+9,9,'#c8d0e0','center',700);g.globalAlpha=1;});}
 // weapon badge
 {const w=game.weapon,c=game.legendary?'#ffd86a':elemColor(w.elem),x=14,y=90;g.fillStyle='rgba(8,10,20,.55)';g.beginPath();g.roundRect(x,y,168,40,10);g.fill();if(game.wlv>=3){g.strokeStyle=A.alpha(c,.5+.3*Math.sin(t*4));g.lineWidth=1.5;g.stroke();}
  A.glow(g,x+20,y+20,16,A.alpha(c,.45));g.fillStyle=c;g.beginPath();g.moveTo(x+20,y+9);g.lineTo(x+29,y+20);g.lineTo(x+20,y+31);g.lineTo(x+11,y+20);g.closePath();g.fill();
  txt(g,`${w.name}${game.wlv>1?' +'+(game.wlv-1):''}`,x+38,y+18,12,'#f4ecdf','left',900);for(let i=0;i<RIFT_WEAPON_MAX-1;i++){g.fillStyle=i<game.wlv-1?c:'rgba(255,255,255,.18)';g.fillRect(x+38+i*13,y+26,10,4);}txt(g,game.legendary?'전설':game.awakened?'각성':RIFT_ELEMENTS[w.elem].name,x+158,y+31,9,c,'right',900);}
 if(cutin&&!reduced){const q=cutin.life/cutin.max,inA=Math.min(1,(1-q)*7),out=Math.min(1,q*4),a=Math.min(inA,out),y=H*.36;g.save();g.globalAlpha=a;g.translate((1-inA)*-W*.6+(1-out)*W*.3,0);
  g.fillStyle='rgba(6,8,18,.78)';g.beginPath();g.moveTo(0,y-46);g.lineTo(W,y-70);g.lineTo(W,y+34);g.lineTo(0,y+58);g.closePath();g.fill();g.fillStyle=A.alpha(cutin.color,.9);g.fillRect(0,y+54,W,3);g.fillRect(0,y-48,W,2);
  g.globalCompositeOperation='lighter';for(let i=0;i<14;i++){const yy=y-40+((i*37)%90),xx=((t*1400+i*170)%(W+200))-100;g.strokeStyle=A.alpha(cutin.color,.35);g.lineWidth=2;g.beginPath();g.moveTo(xx,yy);g.lineTo(xx-120,yy+3);g.stroke();}g.globalCompositeOperation='source-over';
  g.save();g.beginPath();g.moveTo(0,y-46);g.lineTo(W,y-70);g.lineTo(W,y+34);g.lineTo(0,y+58);g.closePath();g.clip();g.translate(150,y+150);g.scale(2.1,2.1);A.heroFigure(g,{x:0,y:0,z:0,face:1,act:{kind:'ult',t:.3,dur:1,step:0},dash:0,hurt:0,moving:false},game,t,false);g.restore();
  txt(g,cutin.hero,300,y-12,14,cutin.color,'left',800);txt(g,cutin.name,300,y+30,44,'#ffffff','left',900);g.restore();}
 if(banner&&!cutin){const q=banner.life/banner.max,a=Math.min(1,(1-q)*6,q*3);g.globalAlpha=a;g.fillStyle='rgba(6,8,16,.55)';g.fillRect(0,H/2-62,W,96);g.fillStyle=A.alpha(banner.color,.8);g.fillRect(W/2-180*a,H/2-62,360*a,2);g.fillRect(W/2-180*a,H/2+32,360*a,2);txt(g,banner.sub,W/2,H/2-30,12,banner.color,'center',800);txt(g,banner.title,W/2,H/2+14,banner.boss?40:36,'#ffffff','center',900);g.globalAlpha=1;}
 if(p.hp/p.maxHp<.3){const vg=g.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,H*.9);vg.addColorStop(0,'rgba(255,0,0,0)');vg.addColorStop(1,`rgba(200,20,40,${.25+.15*Math.sin(t*6)})`);g.fillStyle=vg;g.fillRect(0,0,W,H);}
 g.restore();
}
// ---------------- loop ----------------
let prevState=game.state;
function frame(ms){
 const dt=last?Math.min(.05,(ms-last)/1000):0;last=ms;const t=ms/1000;
 if(game.state==='playing'){const mv=moveVector();game.step(dt,{x:mv.x,y:mv.y,attack:attackHeld});}
 handleEvents();if(game.state==='playing'||game.state==='choice'||game.state==='won'||game.state==='lost')updateFx(game.state==='playing'?dt:dt*.5);
 if(game.state!==prevState){if(game.state==='choice')showChoices();else if(game.state==='won'||game.state==='lost')showResult();prevState=game.state;}
 $('pauseBtn').disabled=!['playing','paused'].includes(game.state);$('pauseBtn').textContent=game.state==='paused'?'계속하기':'일시정지';
 $('riftStatus').textContent=game.state==='ready'?'영웅을 고르고 출정하세요':`${RIFT_REGIONS[Math.min(game.region,4)].name} · ${game.fight===2?'수문장':`전투 ${game.fight+1}`} · 처치 ${game.kills}`;
 if(game.state==='ready'&&!overlay.hidden){const c=document.querySelector(`[data-hero="${heroId}"] canvas`);if(c&&!reduced)drawPortrait(c,heroId,t);}
 render(t);requestAnimationFrame(frame);
}
buildHeroCards();updateBest();show('menuView');requestAnimationFrame(frame);
})();
