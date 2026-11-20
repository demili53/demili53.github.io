'use strict';
// 균열의 검 — game loop, input, effects, HUD and menus.
(()=>{
const $=id=>document.getElementById(id);
const canvas=$('riftCanvas'),ctx=canvas.getContext('2d'),A=RiftArt,W=960,H=540;
const light=document.createElement('canvas');light.width=480;light.height=270;const lctx=light.getContext('2d');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let touchUI=matchMedia('(pointer:coarse)').matches||navigator.maxTouchPoints>0;if(touchUI)document.documentElement.classList.add('rb-touch');
addEventListener('touchstart',()=>{if(!touchUI){touchUI=true;document.documentElement.classList.add('rb-touch');}},{passive:true});
let heroId='blade';try{const s=localStorage.getItem('riftBladeHeroV2');if(RIFT_HEROES[s])heroId=s;}catch{}
let game=new RiftGame(heroId),last=0,fx=[],texts=[],flashes=[],shake=0,hpTrail=1,banner=null,dpr=1,ultDim=0,tint=null;
let best=0;try{best=Number(localStorage.getItem('riftBladeBestV2'))||0;}catch{}
window.rift=game;

// ---------------- audio ----------------
const audio={ctx:null,on:false,
 init(){if(this.ctx||!window.AudioContext&&!window.webkitAudioContext)return;this.ctx=new(window.AudioContext||window.webkitAudioContext)();this.master=this.ctx.createGain();this.master.gain.value=.32;this.master.connect(this.ctx.destination);},
 tone(f,d,type='sine',v=.3,slide=0){if(!this.on||!this.ctx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f*slide),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(this.master);o.start(t);o.stop(t+d+.02);},
 noise(d,v=.3,freq=1200){if(!this.on||!this.ctx)return;const t=this.ctx.currentTime,n=Math.floor(this.ctx.sampleRate*d),buf=this.ctx.createBuffer(1,n,this.ctx.sampleRate),data=buf.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);const s=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();f.type='bandpass';f.frequency.value=freq;f.Q.value=.8;g.gain.value=v;s.buffer=buf;s.connect(f).connect(g).connect(this.master);s.start(t);},
 play(name){const m={slash:()=>this.noise(.12,.25,2400),hit:()=>{this.noise(.08,.35,900);this.tone(120,.1,'square',.12,.5);},heavy:()=>{this.noise(.18,.45,500);this.tone(80,.22,'sawtooth',.18,.4);},shoot:()=>this.tone(880,.08,'triangle',.12,.5),dash:()=>this.noise(.16,.2,3200),hurt:()=>{this.tone(200,.2,'sawtooth',.2,.5);this.noise(.1,.3,600);},perfect:()=>{this.tone(1320,.25,'sine',.2);this.tone(1980,.3,'sine',.12);},kill:()=>this.tone(520,.18,'triangle',.15,.4),boss:()=>{this.tone(70,.9,'sawtooth',.25,.6);},ult:()=>{this.tone(220,.6,'sawtooth',.2,3);this.noise(.5,.3,1500);},impact:()=>this.noise(.2,.3,300),choose:()=>{this.tone(660,.12,'sine',.18);this.tone(990,.2,'sine',.14);},win:()=>[523,659,784,1046].forEach((f,i)=>setTimeout(()=>this.tone(f,.4,'triangle',.18),i*120))};(m[name]||(()=>{}))();}
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
function buildHeroCards(){const box=$('heroCards');box.replaceChildren();for(const [id,h] of Object.entries(RIFT_HEROES)){const b=document.createElement('button');b.className='hero-card';b.dataset.hero=id;b.setAttribute('aria-pressed',String(id===heroId));const c=document.createElement('canvas');c.width=180;c.height=200;c.setAttribute('aria-hidden','true');const name=document.createElement('b'),role=document.createElement('small'),stat=document.createElement('span');name.textContent=h.name;role.textContent=h.role;stat.textContent=`체력 ${h.hp} · 마력 ${h.mp}`;b.append(c,name,role,stat);b.onclick=()=>{heroId=id;try{localStorage.setItem('riftBladeHeroV2',id);}catch{}game=new RiftGame(id);window.rift=game;buildHeroCards();};box.append(b);drawPortrait(c,id);}$('heroDesc').textContent=`${RIFT_HEROES[heroId].title} · ${RIFT_HEROES[heroId].desc}`;}
function drawPortrait(c,id,t=0){const g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,c.width,c.height);const gr=g.createRadialGradient(90,110,10,90,110,110);gr.addColorStop(0,A.alpha(RIFT_HEROES[id].color,.35));gr.addColorStop(1,A.alpha(RIFT_HEROES[id].color,0));g.fillStyle=gr;g.fillRect(0,0,180,200);g.scale(1.45,1.45);const fake={heroId:id};A.heroFigure(g,{x:62,y:128,z:0,face:1,act:null,dash:0,hurt:0,moving:false},fake,t,false);}
$('startBtn').onclick=startGame;
function startGame(){audio.init();if(game.state!=='ready'){game=new RiftGame(heroId);window.rift=game;}game.start();window.rift=game;fx=[];texts=[];hpTrail=1;show(null);canvas.focus();}
function togglePause(){if(game.state==='playing'||game.state==='paused'){game.pause();keys.clear();attackHeld=false;show(game.state==='paused'?'pauseView':null);if(game.state==='playing')canvas.focus();}}
$('pauseBtn').onclick=togglePause;$('resumeBtn').onclick=togglePause;
$('quitBtn').onclick=()=>{game=new RiftGame(heroId);window.rift=game;buildHeroCards();show('menuView');};
$('retryBtn').onclick=()=>{game=new RiftGame(heroId);window.rift=game;startGame();};
$('heroBtn').onclick=()=>{game=new RiftGame(heroId);window.rift=game;buildHeroCards();show('menuView');};
function showChoices(){const box=$('choiceCards');box.replaceChildren();game.offers.forEach((id,i)=>{const b=RIFT_BLESSINGS.find(x=>x.id===id),r=game.rank(id),el=document.createElement('button');el.className='bless-card';el.dataset.bless=id;const icon=document.createElement('i'),name=document.createElement('b'),desc=document.createElement('small'),pips=document.createElement('em');icon.textContent=b.icon;name.textContent=b.name;desc.textContent=b.desc;pips.textContent='◆'.repeat(r+1)+'◇'.repeat(b.max-r-1);el.append(icon,name,pips,desc);el.onclick=()=>{if(game.choose(id)){audio.play('choose');show(null);canvas.focus();}};el.style.animationDelay=i*.07+'s';box.append(el);});
 const nextBoss=game.fight===1,nextRegion=game.fight===2;$('choiceSub').textContent=nextRegion?`${RIFT_REGIONS[game.region].name} 정복! 체력 40% 회복 · 다음은 ${RIFT_REGIONS[game.region+1].name}`:nextBoss?`다음 전투: ${RIFT_BOSSES[game.region].name}`:'다음 전투를 위한 힘을 고르세요';show('choiceView');setTimeout(()=>box.querySelector('button')?.focus(),30);}
function showResult(){const won=game.state==='won';if(game.score>best){best=game.score;try{localStorage.setItem('riftBladeBestV2',String(best));}catch{}}
 $('resultKicker').textContent=won?'THE RIFT IS SEALED':'THE ABYSS REMAINS';$('resultTitle').textContent=won?'균열을 봉인했습니다':'검이 꺾였습니다';
 const reached=won?'모든 지역':`${RIFT_REGIONS[game.region].name} ${game.fight===2?'수문장':game.fight+1+'번째 전투'}`;
 const rows=[['점수',game.score.toLocaleString()],['도달',reached],['시간',`${Math.floor(game.time/60)}분 ${String(Math.floor(game.time%60)).padStart(2,'0')}초`],['처치',game.kills],['최대 콤보',game.maxCombo],['완벽 회피',game.perfects]];
 $('resultStats').replaceChildren(...rows.map(([k,v])=>{const d=document.createElement('div'),s=document.createElement('small'),b=document.createElement('b');s.textContent=k;b.textContent=v;d.append(s,b);return d;}));
 $('resultBest').textContent=`최고 기록 ${best.toLocaleString()}점`;updateBest();show('resultView');audio.play(won?'win':'hurt');}
function updateBest(){$('bestScore').textContent=best?best.toLocaleString()+'점':'아직 기록이 없습니다';}

// ---------------- effects ----------------
const heroColor=()=>RIFT_HEROES[game.heroId].color;
function spark(x,y,n,color,speed=260,size=3,life=.4,kind='spark'){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,s=speed*(.35+Math.random()*.8);fx.push({kind,x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s*.7-40,life:life*(.6+Math.random()*.6),max:life,size:size*(.6+Math.random()*.8),color});}}
function addText(x,y,text,color,size=18,life=.8){texts.push({x,y,text,color,size,life,max:life,vy:-70});}
function handleEvents(){
 for(const e of game.drainEvents()){
  if(e.type==='hit'){const c=e.kind==='dot'?'#ffd28a':e.kind==='chain'?'#bfe8ff':heroColor();spark(e.x,e.y-50-e.z,e.heavy?16:8,c,e.heavy?380:240,e.heavy?4:3);fx.push({kind:'impact',x:e.x,y:e.y-50-e.z,life:.16,max:.16,size:e.heavy?60:36,color:c});addText(e.x+(Math.random()-.5)*20,e.y-90-e.z-(e.boss?60:0),String(e.dmg),e.crit?'#ffe27a':'#ffffff',e.crit?26:e.heavy?22:17);shake=Math.max(shake,e.heavy?7:2.5);flashes.push({x:e.x,y:e.y-50,r:e.heavy?140:80,color:c,life:.12,max:.12});audio.play(e.heavy?'heavy':'hit');}
  else if(e.type==='kill'){spark(e.x,e.y-50,e.boss?60:22,'#ff7fd0',e.boss?520:320,4,e.boss?1.2:.6,'shard');for(let i=0;i<(e.boss?12:4);i++)fx.push({kind:'wisp',x:e.x+(Math.random()-.5)*30,y:e.y-40,vx:(Math.random()-.5)*30,vy:-60-Math.random()*60,life:1.2,max:1.2,size:6,color:'#d9b8ff'});if(e.boss){shake=18;flashes.push({x:e.x,y:e.y-90,r:600,color:'#ffffff',life:.5,max:.5});addText(e.x,e.y-220,'격파!','#ffe27a',44,1.6);}audio.play(e.boss?'heavy':'kill');}
  else if(e.type==='slash')fx.push({kind:'arc',x:e.x,y:e.y,face:e.face,range:e.range,step:e.step,ult:e.kind==='ult',life:e.kind==='ult'?.32:.2,max:e.kind==='ult'?.32:.2,color:heroColor()}),audio.play('slash');
  else if(e.type==='ring')fx.push({kind:'ring',x:e.x,y:e.y,rx:e.rx,ry:e.ry,life:.35,max:.35,color:e.kind==='arcanist'?'#bfeaff':heroColor()}),shake=Math.max(shake,4);
  else if(e.type==='shoot'){fx.push({kind:'impact',x:game.player.x+e.face*34,y:game.player.y-48,life:.1,max:.1,size:22,color:heroColor()});audio.play('shoot');}
  else if(e.type==='blast'){spark(e.x,e.y-20,26,'#ffb35c',420,4,.6);fx.push({kind:'ring',x:e.x,y:e.y,rx:e.r*1.3,ry:e.r*.6,life:.4,max:.4,color:'#ffcf8a'});flashes.push({x:e.x,y:e.y-30,r:220,color:'#ffb35c',life:.25,max:.25});shake=Math.max(shake,9);audio.play('impact');}
  else if(e.type==='dash'){for(let i=0;i<8;i++)fx.push({kind:'dust',x:e.x-e.face*i*6,y:e.y,vx:-e.face*(40+Math.random()*60),vy:-10-Math.random()*20,life:.45,max:.45,size:8+Math.random()*6,color:'#c8c0b8'});audio.play('dash');}
  else if(e.type==='perfect'){addText(e.x,e.y-130,'완벽 회피!','#9fe8ff',24,1);fx.push({kind:'ring',x:e.x,y:e.y,rx:160,ry:70,life:.5,max:.5,color:'#9fe8ff'});tint={color:'#6fc8ff',life:.5,max:.5};audio.play('perfect');}
  else if(e.type==='hurt'){addText(e.x,e.y-120,'-'+e.dmg,'#ff6b6b',22);shake=Math.max(shake,8);tint={color:'#ff2a3a',life:.3,max:.3};spark(e.x,e.y-55,10,'#ff6b6b',240,3);audio.play('hurt');}
  else if(e.type==='impact'){const big=['slam','quake','charge','beam','nova'].includes(e.kind);shake=Math.max(shake,big?9:3);if(e.shape==='circle')for(let i=0;i<10;i++)fx.push({kind:'dust',x:e.h.x+(Math.random()-.5)*e.h.rx*1.4,y:e.h.y+(Math.random()-.5)*e.h.ry,vx:(Math.random()-.5)*90,vy:-20-Math.random()*40,life:.6,max:.6,size:10+Math.random()*10,color:e.kind==='ice'?'#dff6ff':e.kind==='fire'?'#ff9a5c':'#a89a8a'});if(big)audio.play('impact');}
  else if(e.type==='enrage'){addText(e.x,e.y-240,'격노!','#ff6b6b',34,1.4);shake=12;flashes.push({x:e.x,y:e.y-100,r:400,color:'#ff3a3a',life:.4,max:.4});audio.play('boss');}
  else if(e.type==='stagger'){addText(e.x,e.y-220,'무력화','#ffe27a',28,1.2);spark(e.x,e.y-120,24,'#ffe27a',300,4);}
  else if(e.type==='chain')fx.push({kind:'bolt',x1:e.x1,y1:e.y1-50,x2:e.x2,y2:e.y2-50,life:.22,max:.22,seed:Math.random()*99});
  else if(e.type==='land')for(let i=0;i<6;i++)fx.push({kind:'dust',x:e.x+(Math.random()-.5)*40,y:e.y,vx:(Math.random()-.5)*80,vy:-15,life:.4,max:.4,size:9,color:'#b8b0a8'});
  else if(e.type==='act'&&e.kind==='ult'){ultDim=.9;flashes.push({x:game.player.x,y:game.player.y-60,r:300,color:heroColor(),life:.3,max:.3});addText(game.player.x,game.player.y-150,RIFT_HEROES[game.heroId].ult.name,heroColor(),30,1.1);audio.play('ult');}
  else if(e.type==='fight'){const r=RIFT_REGIONS[e.region];banner={title:e.fight===0?r.name:`${r.name} · 두 번째 전투`,sub:e.fight===0?r.sub:'SECOND CLASH',color:r.color,life:2.2,max:2.2};}
  else if(e.type==='boss'){banner={title:e.name,sub:'GUARDIAN OF THE RIFT',color:RIFT_BOSSES[game.region].color,life:2.6,max:2.6,boss:true};audio.play('boss');}
 }
}
function updateFx(dt){
 for(const p of fx){p.life-=dt;if(p.vx!==undefined){p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.kind==='spark'||p.kind==='shard')p.vy+=520*dt;if(p.kind==='dust'){p.vx*=.9;p.vy*=.9;}}}
 fx=fx.filter(p=>p.life>0);if(fx.length>700)fx.splice(0,fx.length-700);
 for(const t of texts){t.life-=dt;t.y+=t.vy*dt;t.vy*=.92;}texts=texts.filter(t=>t.life>0);
 for(const f of flashes)f.life-=dt;flashes=flashes.filter(f=>f.life>0);
 shake=Math.max(0,shake-dt*40);ultDim=Math.max(0,ultDim-dt*1.1);if(banner){banner.life-=dt;if(banner.life<=0)banner=null;}if(tint){tint.life-=dt;if(tint.life<=0)tint=null;}
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
   else{const a0=p.step===1?.9:-1.3,a1=p.step===1?-1.2:1.1,span=a1-a0,cur=a0+span*Math.min(1,k*1.6);g.beginPath();g.ellipse(0,0,R,R*.62,0,a0,cur,span<0);g.ellipse(0,0,R*.62,R*.38,0,cur,a0,span>0);g.closePath();const gr=g.createRadialGradient(0,0,R*.4,0,0,R);gr.addColorStop(0,A.alpha(p.color,0));gr.addColorStop(.7,A.alpha(p.color,q*.55));gr.addColorStop(1,A.alpha('#ffffff',q));g.fillStyle=gr;g.fill();}
   g.restore();}
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
 for(const a of actors){const o=a.hero?game.player:a.e,big=a.e?.boss?2.4:a.e?.type==='brute'?1.5:1,k=1/(1+(o.z||0)/120);A.ellipse(g,o.x,o.y+2,26*big*k,8*big*k,'rgba(0,0,0,.38)');}
 if(game.player.dash>0||game.player.act?.kind==='ult'){g.save();g.globalAlpha=.25;for(let i=1;i<4;i++){A.heroFigure(g,{...game.player,x:game.player.x-game.player.face*i*22},game,t,false);}g.restore();}
 for(const a of actors){if(a.hero){const p=game.player;g.save();if(p.inv>0&&p.hurt<=0&&p.dash<=0&&!p.act&&Math.floor(t*20)%2)g.globalAlpha=.55;A.heroFigure(g,p,game,t,false);g.restore();}
  else{const e=a.e;g.save();if(e.dead&&!e.boss){g.globalAlpha=Math.max(0,1-e.deadT/.9);}if(e.boss)A.bossFigure(g,e,t);else A.enemyFigure(g,e,t);g.restore();}}
 for(const s of game.shots)A.shot(g,s,t);
 drawFx(g,t);
 for(const h of game.hazards)if(h.wind<=0)A.hazard(g,h,t);
 drawLighting(g,t,region);
 // enemy health bars
 for(const e of game.alive){if(e.boss||e.hp>=e.maxHp)continue;const w=e.type==='brute'?54:40,y=e.y-(e.type==='brute'?140:105)-e.z;g.fillStyle='#0b0d16cc';g.fillRect(e.x-w/2-1,y-1,w+2,6);g.fillStyle=e.hp<e.maxHp*.3?'#ff6b6b':'#ff9a7a';g.fillRect(e.x-w/2,y,w*e.hp/e.maxHp,4);}
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
 if(full){g.globalAlpha=.6+.4*Math.sin(t*8);txt(g,`L · ${h.ult.name} 준비!`,80,98,13,'#ffd0f0','left',900);g.globalAlpha=1;}
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
 if(banner){const q=banner.life/banner.max,a=Math.min(1,(1-q)*6,q*3);g.globalAlpha=a;g.fillStyle='rgba(6,8,16,.55)';g.fillRect(0,H/2-62,W,96);g.fillStyle=A.alpha(banner.color,.8);g.fillRect(W/2-180*a,H/2-62,360*a,2);g.fillRect(W/2-180*a,H/2+32,360*a,2);txt(g,banner.sub,W/2,H/2-30,12,banner.color,'center',800);txt(g,banner.title,W/2,H/2+14,banner.boss?40:36,'#ffffff','center',900);g.globalAlpha=1;}
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
