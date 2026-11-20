'use strict';
// 들키면 재수 — loop, input, HUD, overlays, sound. Rules live in exam-core.js, drawing in exam-art.js.
(function(){
const C=window.ExamCore,A=window.ExamArt,$=id=>document.getElementById(id);
const room=$('roomCanvas'),rctx=room.getContext('2d'),desk=$('deskCanvas'),dctx=desk.getContext('2d');
const store={get(k,d){try{const v=localStorage.getItem(k);return v===null?d:v;}catch{return d;}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
const ui={game:null,running:false,paused:false,level:Number(store.get('examSneakLevel',1))||0,t:0,caughtT:0};
window.examUI=ui;
const STAFF_NOTE={chief:'정감독: 앞 책상에서 서류를 보다가 고개를 든다. 머리 위 ❗ 가 뜨면 곧 둘러본다.',roam:'부감독: 통로를 돌아다닌다. ❓ 가 뜨면 뒤를 돌아본다. 등 뒤도 조심!',door:'복도 감독: 오른쪽 문 창문으로 가끔 들여다본다.'};

// ---------- sound (off by default) ----------
let actx=null,sound=store.get('examSneakSound','0')==='1';
function beep(f,d=.08,type='square',v=.05){if(!sound)return;try{actx=actx||new (window.AudioContext||window.webkitAudioContext)();const o=actx.createOscillator(),g=actx.createGain();o.type=type;o.frequency.value=f;g.gain.value=v;g.gain.exponentialRampToValueAtTime(.0001,actx.currentTime+d);o.connect(g).connect(actx.destination);o.start();o.stop(actx.currentTime+d);}catch{}}

// ---------- log ----------
function log(text){const li=document.createElement('li');li.textContent=text;const list=$('logList');list.prepend(li);while(list.children.length>14)list.lastChild.remove();}

// ---------- overlays ----------
const views=['menuView','introView','breakView','searchView','pauseView','resultView'];
function show(id){$('overlay').hidden=!id;$('overlay').classList.toggle('passive',id==='introView');views.forEach(v=>$(v).hidden=v!==id);}
function setLevel(l){ui.level=l;store.set('examSneakLevel',l);document.querySelectorAll('[data-level]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.level)===l)));}
function bestScore(){return Number(store.get('examSneakBest',0))||0;}
function renderBest(){const b=bestScore();$('bestScore').textContent=b?b.toLocaleString('ko-KR')+'점':'아직 기록이 없습니다';}

function startGame(){
 ui.game=new C.ExamGame({level:ui.level});ui.running=true;ui.paused=false;ui.caughtT=0;$('logList').innerHTML='';
 fitView();log('📝 수험표 확인 완료. 소매 속 AI 볼펜은… 아직 아무도 모른다.');showIntro();$('pauseBtn').disabled=false;renderPerks();
}
function fitView(){const col=document.querySelector('.es-col'),hd=document.querySelector('site-header'),top=col.getBoundingClientRect().top,head=hd&&getComputedStyle(hd).position==='sticky'?hd.getBoundingClientRect().height:0,want=head+4;if(Math.abs(top-want)>8)window.scrollBy({top:top-want,behavior:'auto'});}
function showIntro(){const g=ui.game;$('introTitle').textContent=`${g.period+1}교시 · ${g.P.name}`;$('introText').textContent=g.P.staff.map(k=>STAFF_NOTE[k]).join(' ');
 $('introKicker').textContent=g.period===0?'시험 시작':`감독관 ${g.P.staff.length}명`;show('introView');}
function showBreak(){
 const g=ui.game,box=$('perkList');box.innerHTML='';const last=g.results[g.results.length-1];
 $('breakText').textContent=`${last.name} 답안지 제출 완료. 채점은 마지막에 공개됩니다. 쉬는 시간에 AI 볼펜을 하나 개조하세요. (배터리 +${C.BASE.recharge})`;
 for(const id of g.offers){const p=C.PERKS[id],b=document.createElement('button');b.className='es-perk';b.dataset.perk=id;b.innerHTML=`<b>${p.name}</b><span>${p.desc}</span>`;
  b.addEventListener('click',()=>{if(g.choosePerk(id)){log(`🔧 ${p.name} 장착.`);renderPerks();showIntro();beep(660,.1,'triangle');}});box.appendChild(b);}
 show('breakView');
}
function showSearch(){
 const g=ui.game,box=$('hideList');box.innerHTML='';
 for(const h of C.HIDES){const b=document.createElement('button');b.className='es-perk';b.dataset.hide=h.id;b.innerHTML=`<b>${h.name}</b><span>${h.note}</span>`;
  b.addEventListener('click',()=>{const r=g.chooseHide(h.id);if(!r)return;log(r.busted?'🚨 금속 탐지기가 삑! "이건 뭐죠?" "…지우개요." 의심도 50으로 시작.':'✅ 금속 탐지기 통과. 휴.');if(r.busted)beep(220,.3,'sawtooth');showBreak();});box.appendChild(b);}
 show('searchView');
}
function grade(n){return n+'등급';}
function showResult(){
 const g=ui.game,s=g.summary(),caught=s.caught;ui.running=false;$('pauseBtn').disabled=true;
 let kicker,title;
 if(caught){kicker='CAUGHT · 부정행위 적발';title=['"수험생, 소매 좀 보여 주세요."','들키면 재수… 내년에 다시 만나요','AI는 정답을 알았지만 감독관은 당신을 알았다'][g.period%3];}
 else if(s.aiShare<.1&&s.honestShare>=.3){kicker='HONEST · 정직한 수험생';title=`진짜 실력으로 ${grade(s.grade)}! 양심 1등급`;}
 else if(s.aiShare<.1){kicker='GUESS MASTER · 찍기 장인';title=`AI도 연필도 거의 안 쓰고 ${grade(s.grade)}… 대단한 배짱`;}
 else if(s.grade<=1){kicker='PERFECT(?) CRIME';title='AI 덕분에 1등급… 양심은 9등급';}
 else if(s.grade<=3){kicker='ESCAPED · 무사 탈출';title=`${grade(s.grade)}, 아무도 눈치채지 못했다`;}
 else{kicker='ESCAPED · 무사 탈출';title=`안 들켰지만 ${grade(s.grade)}… AI도 공부가 필요했다`;}
 $('resultKicker').textContent=kicker;$('resultTitle').textContent=title;
 const stats=[['정답',`${s.correct}/${caught?g.P.q*C.PERIODS.length:s.total}`],['예상 등급',caught?'0점 처리':grade(s.grade)],['점수',caught?'무효':s.score.toLocaleString('ko-KR')],['책상 확인',`${s.checks}회`],['AI 사용',`${Math.round(s.aiShare*100)}%`],['도달',`${g.period+1}교시`]];
 $('resultStats').innerHTML=stats.map(([k,v])=>`<div><small>${k}</small><b>${v}</b></div>`).join('');
 $('resultSubjects').innerHTML=g.results.map(r=>`<li><b>${r.name}</b> ${r.correct}/${r.total} · AI ${r.ai} · 직접 ${r.honest} · 찍기 ${r.guess}</li>`).join('')||'<li>답안지를 내기도 전에 끝났습니다.</li>';
 let best='';if(!caught){const prev=bestScore();if(s.score>prev){store.set('examSneakBest',s.score);best='🎉 최고 기록!';}else best=`최고 기록 ${prev.toLocaleString('ko-KR')}점`;}else best='적발되면 기록이 남지 않습니다(다행히 게임 기록만).';
 $('resultBest').textContent=best;renderBest();show('resultView');
}
function renderPerks(){const g=ui.game,ids=g?Object.keys(g.perks):[];$('perkBox').innerHTML=ids.length?ids.map(id=>`<li><b>${C.PERKS[id].name}</b> ${C.PERKS[id].desc}</li>`).join(''):'<li>아직 개조한 장비가 없습니다. 쉬는 시간마다 하나씩 고릅니다.</li>';}
function pause(on){if(!ui.running||!ui.game||ui.game.phase!=='exam'&&on)return;ui.paused=on;releaseAll();show(on?'pauseView':null);}

// ---------- events from rules ----------
function handle(e){
 const g=ui.game;
 switch(e.type){
  case 'periodStart':show(null);log(`🔔 ${e.name} 시작!`);beep(880,.15,'sine');break;
  case 'look':beep(520,.05);break;
  case 'check':log(`😨 ${e.who}이(가) 내 자리로 온다! 기기를 숨기고 시치미!`);beep(300,.2,'sawtooth',.06);break;
  case 'stare':log(`👁️ ${e.who}: "……" (뚫어지게 본다)`);break;
  case 'stareEnd':log(`😮‍💨 ${e.who}이(가) 돌아갔다.`);break;
  case 'event':log(e.text);beep(440,.1,'triangle');break;
  case 'sneeze':log('🤧 "에취!" 감독관이 옆자리를 쳐다본다.');break;
  case 'answer':if(e.method==='ai'&&Math.random()<.3)log(`🤖 AI: "정답은 ${A.ANS[e.mark-1]}번입니다. 확신 ${90+Math.floor(Math.random()*10)}%."`);beep(e.method==='ai'?1200:700,.03,'sine',.03);break;
  case 'allDone':log('✅ 답안지를 다 채웠다! 남은 시간은 보너스.');break;
  case 'battery':log('🪫 AI 볼펜 배터리가 바닥났다.');break;
  case 'periodEnd':log(`📄 ${C.PERIODS[e.period].name} 답안지 제출.`);releaseAll();break;
  case 'caught':log('🚨 "수험생, 손에 든 거 뭐예요?"');beep(180,.5,'sawtooth',.08);releaseAll();ui.caughtT=1.4;break;
 }
}

// ---------- input ----------
const holds={aiBtn:'ai',solveBtn:'solve',actBtn:'act'};
function setHold(k,v){if(ui.game)ui.game.setInput(k,v);document.querySelector(`[data-hold="${k}"]`)?.classList.toggle('on',v);}
function releaseAll(){for(const k of Object.values(holds))setHold(k,false);}
for(const [id,k] of Object.entries(holds)){const b=$(id);b.dataset.hold=k;
 b.addEventListener('pointerdown',e=>{e.preventDefault();if(!ui.running||ui.paused)return;try{b.setPointerCapture(e.pointerId);}catch{}setHold(k,true);});
 for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,()=>setHold(k,false));
 b.addEventListener('contextmenu',e=>e.preventDefault());}
const keyMap={Space:'ai',KeyJ:'ai',KeyS:'solve',KeyK:'solve',KeyD:'act',KeyL:'act'};
document.addEventListener('keydown',e=>{
 if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
 if(e.composedPath&&e.composedPath().some(n=>n.tagName==='SITE-HEADER'))return;
 if(!ui.running)return;
 if(e.code==='KeyP'||e.code==='Escape'){e.preventDefault();pause(!ui.paused);return;}
 const k=keyMap[e.code];if(k){e.preventDefault();if(!ui.paused&&!e.repeat)setHold(k,true);}
});
document.addEventListener('keyup',e=>{const k=keyMap[e.code];if(k)setHold(k,false);});
window.addEventListener('blur',()=>{releaseAll();if(ui.running&&ui.game?.phase==='exam')pause(true);});
document.querySelectorAll('[data-level]').forEach(b=>b.addEventListener('click',()=>setLevel(Number(b.dataset.level))));
$('startBtn').addEventListener('click',startGame);$('retryBtn').addEventListener('click',startGame);
$('menuBtn').addEventListener('click',()=>{ui.running=false;show('menuView');});
$('quitBtn').addEventListener('click',()=>{ui.running=false;ui.paused=false;$('pauseBtn').disabled=true;show('menuView');});
$('resumeBtn').addEventListener('click',()=>pause(false));$('pauseBtn').addEventListener('click',()=>pause(!ui.paused));
$('soundToggle').checked=sound;$('soundToggle').addEventListener('change',e=>{sound=e.target.checked;store.set('examSneakSound',sound?'1':'0');beep(660);});

// ---------- HUD ----------
function hud(){
 const g=ui.game;if(!g)return;
 $('hudPeriod').textContent=`${g.period+1}교시 ${g.P.name}`;const tl=Math.max(0,Math.ceil(g.timeLeft));$('hudTime').textContent=`${Math.floor(tl/60)}:${String(tl%60).padStart(2,'0')}`;
 $('hudQ').textContent=`${Math.min(g.q,g.P.q)}/${g.P.q}`;
 const sp=Math.round(g.susp);$('suspVal').textContent=sp;$('suspFill').style.width=sp+'%';$('suspFill').className=sp>=C.BASE.warnAt?'hot':sp>=30?'warm':'';
 $('suspMeter').classList.toggle('seen',g.seenNow);
 const bp=Math.round(g.battery/g.batteryMax*100);$('battVal').textContent=Math.round(g.battery);$('battFill').style.width=bp+'%';
 $('hudScore').textContent=g.score.toLocaleString('ko-KR');
 $('aiBtn').classList.toggle('dead',g.battery<=0||g.jam>0||g.lockDevice>0);
 $('aiState').textContent=g.lockDevice>0?`화장실에 둠 ${Math.ceil(g.lockDevice)}초`:g.jam>0?'전파 점검 중':g.battery<=0?'배터리 0':'Space · 꾹 누르기';
}

// ---------- loop ----------
let last=0,acc=0;const STEP=1/60;
function step(n=1){const g=ui.game;if(!g)return;for(let i=0;i<n;i++){const before=g.phase;g.step(STEP);for(const e of g.drainEvents())handle(e);after(before);}}
ui.step=step;
function after(before){const g=ui.game;if(g.phase===before)return;
 if(g.phase==='break')showBreak();else if(g.phase==='search'){log('🍱 점심시간. 금속 탐지기 검사가 있다! 기기를 어디에 숨길까?');showSearch();}else if(g.phase==='done')showResult();}
function frame(now){
 const dt=Math.min(.1,(now-last)/1000||0);last=now;ui.t+=dt;
 const g=ui.game;
 if(g&&ui.running&&!ui.paused){
  if(g.phase==='caught'){if(ui.caughtT>0){ui.caughtT-=dt;if(ui.caughtT<=0)showResult();}}
  else{acc+=dt;while(acc>=STEP){step(1);acc-=STEP;if(!ui.running)break;}}
 }
 if(g){A.drawRoom(rctx,g,ui.t);A.drawDesk(dctx,g,ui.t);hud();if(g.phase==='caught'){rctx.fillStyle=`rgba(200,0,0,${.18+.12*Math.sin(ui.t*14)})`;rctx.fillRect(0,0,C.W,C.H);rctx.font='bold 46px system-ui';rctx.textAlign='center';rctx.fillStyle='#fff';rctx.fillText('적발!',C.W/2,C.H/2);}}
 else drawIdle();
 requestAnimationFrame(frame);
}
let idle=new C.ExamGame({seed:7,level:1});idle.start();
function drawIdle(){idle.step(1/60);idle.drainEvents();if(idle.phase!=='exam'){idle=new C.ExamGame({seed:Math.random()*1e6|0});idle.start();}A.drawRoom(rctx,idle,ui.t);A.drawDesk(dctx,idle,ui.t);}
for(const [id,k] of [['icoEye','eye'],['icoBatt','battery'],['icoPaper','paper']])A.icon($(id).getContext('2d'),k);
setLevel(Math.min(2,Math.max(0,ui.level)));renderBest();renderPerks();show('menuView');requestAnimationFrame(frame);
})();
