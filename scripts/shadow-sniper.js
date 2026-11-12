'use strict';
const sniperEl=id=>document.getElementById(id);
let sniper=new SniperGame(),sniperReady=false,sniperEngine,sniperScene,sniperBest=0,renderedMission=-1,renderedState='',lastMessage='',drag=null;
const aimKeys=new Set();let sniperNotesKey='',sniperHistoryKey='';
let sniperReducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
try{const saved=localStorage.getItem('shadowSniperReducedMotion');if(saved!==null)sniperReducedMotion=saved==='1';}catch{}
sniperEl('reduceMotion').checked=sniperReducedMotion;
sniperEl('reduceMotion').onchange=e=>{sniperReducedMotion=e.target.checked;try{localStorage.setItem('shadowSniperReducedMotion',sniperReducedMotion?'1':'0');}catch{}};
try{sniperBest=Math.max(0,Number(localStorage.getItem('shadowSniperBest'))||0);}catch{}
sniperEl('sniperBest').textContent=sniperBest.toLocaleString('ko-KR');
function sniperBindOption(id,key,apply){const el=sniperEl(id);try{el.checked=localStorage.getItem(key)==='1';}catch{}apply(el.checked);el.onchange=()=>{apply(el.checked);try{localStorage.setItem(key,el.checked?'1':'0');}catch{}};}
sniperBindOption('requireObservation','shadowSniperRequireObservation',value=>{sniper.requireObservation=value;});
sniperBindOption('autoReload','shadowSniperAutoReload',value=>{sniper.autoReload=value;sniper.maybeAutoReload();});
function sniperApplyOptions(){sniper.autoReload=sniperEl('autoReload').checked;sniper.requireObservation=sniperEl('requireObservation').checked;}
let sniperDragSensitivity=1;
try{const value=Number(localStorage.getItem('shadowSniperDragSensitivity'));if([.7,1,1.4].includes(value))sniperDragSensitivity=value;}catch{}
sniperEl('dragSensitivity').value=String(sniperDragSensitivity);
sniperEl('dragSensitivity').onchange=e=>{const value=Number(e.target.value);sniperDragSensitivity=[.7,1,1.4].includes(value)?value:1;try{localStorage.setItem('shadowSniperDragSensitivity',String(sniperDragSensitivity));}catch{}};
let sniperMissionBests=[],sniperSavedReport=null;
try{const saved=JSON.parse(localStorage.getItem('shadowSniperMissionBests'));if(Array.isArray(saved))sniperMissionBests=SNIPER_MISSIONS.map((_,i)=>sniperBestRecord(null,saved[i],i));}catch{}
function sniperMessage(text){if(lastMessage!==text){lastMessage=text;sniperEl('sniperStatus').textContent=text;}}
function sniperClearInput(){aimKeys.clear();drag=null;sniper.holding=false;}
function sniperSync(){
 const s=sniper,m=s.config;sniperEl('missionHud').textContent=String(s.mission+1).padStart(2,'0')+' / '+String(SNIPER_MISSIONS.length).padStart(2,'0');sniperEl('timerHud').textContent=s.remaining.toFixed(1);sniperEl('ammoHud').textContent=s.reloadLeft>0?`장전 ${s.reloadLeft.toFixed(1)}초`:`${s.mag} / ${s.reserve}`;sniperEl('scoreHud').textContent=s.score.toLocaleString('ko-KR');sniperEl('focusText').textContent=Math.ceil(s.focus)+'%';sniperEl('focusBar').style.width=s.focus+'%';sniperEl('alertText').textContent=Math.round(s.alert)+'%';sniperEl('alertBar').style.width=s.alert+'%';sniperEl('targetProgress').textContent=`남은 표적 ${s.targetsLeft}명 · 관찰 기록 ${s.observations.size}명`;sniperEl('scopeBtn').setAttribute('aria-pressed',String(s.scoped));sniperEl('focusBtn').setAttribute('aria-pressed',String(s.holding));sniperEl('scopeLabel').textContent=s.scoped?' / SCOPE ×2.3':' / 관찰 모드';
 const notes=s.observationNotes(),notesKey=JSON.stringify(notes);if(notesKey!==sniperNotesKey){sniperNotesKey=notesKey;sniperEl('noteCount').textContent=notes.length;sniperEl('observationList').replaceChildren(...notes.map(n=>{const item=document.createElement('li');item.textContent=n.description;return item;}));}
 const historyKey=JSON.stringify(s.missionHistory);if(historyKey!==sniperHistoryKey){sniperHistoryKey=historyKey;const summary=s.campaignSummary;sniperEl('campaignSummary').textContent=summary.completed?`완료 ${summary.completed}/${SNIPER_MISSIONS.length} · 정확도 ${summary.accuracy}% · S 등급 ${summary.perfect}개 · ${summary.seconds}초`:'완료한 미션이 없습니다.';sniperEl('missionHistoryList').replaceChildren(...s.missionHistory.map(r=>{const li=document.createElement('li');li.textContent=`${SNIPER_MISSIONS[r.mission].name} · ${r.grade} · ${r.shots}발 · ${r.seconds}초`;return li;}));}
 if(s.report&&s.report!==sniperSavedReport&&['success','won'].includes(s.state)){sniperSavedReport=s.report;sniperMissionBests[s.mission]=sniperBestRecord(sniperMissionBests[s.mission],s.report,s.mission);try{localStorage.setItem('shadowSniperMissionBests',JSON.stringify(sniperMissionBests));}catch{}}
 const best=sniperMissionBests[s.mission];sniperEl('missionBest').textContent=best?`이 미션 최고 기록: ${best.grade} · ${best.shots}발 · ${best.seconds}초`:'이 미션 최고 기록: 아직 없습니다.';
 sniperEl('reloadMeter').hidden=s.reloadLeft<=0;sniperEl('reloadProgress').value=s.reloadProgress;
 sniperEl('skipShotBtn').hidden=s.state!=='shot';
 const playing=s.state==='running';for(const id of ['scopeBtn','fireBtn','reloadBtn','focusBtn'])sniperEl(id).disabled=!playing;
 sniperEl('fireBtn').disabled=!playing||!s.scoped||s.cooldown>0||s.reloadLeft>0;
 sniperEl('reloadBtn').disabled=!playing||s.reloadLeft>0||s.mag===3||s.reserve===0;
 sniperEl('focusBtn').disabled=!playing||!s.scoped||s.reloadLeft>0;
 sniperEl('pauseSniper').disabled=!['running','shot','paused'].includes(s.state);sniperEl('pauseSniper').textContent=s.state==='paused'?'계속하기 P':'일시정지 P';
 let intel='스코프로 인물을 약 1초간 관찰하면 외형 단서를 확인합니다.';if((playing||s.state==='shot')&&s.scoped&&s.inspected)intel=s.identification>=1?s.inspected.desc:`인물 관찰 중… ${Math.floor(s.identification*100)}%`;
 if(sniperEl('targetIntel').textContent!==intel){sniperEl('targetIntel').textContent=intel;sniperEl('fieldIntel').textContent=intel;}
 if(renderedMission!==s.mission){renderedMission=s.mission;sniperEl('briefCode').textContent=m.code;sniperEl('briefTitle').textContent=m.name;sniperEl('briefText').textContent=m.brief;sniperEl('clueList').replaceChildren(...m.clues.map(c=>{const span=document.createElement('span');span.textContent=c;return span;}));sniperEl('missionSteps').replaceChildren(...SNIPER_MISSIONS.map((_,i)=>{const span=document.createElement('span');span.className=i<s.mission?'done':i===s.mission?'active':'';return span;}));sniperScene?.buildCity();}
 sniperMessage(s.feedback);
 if(renderedState===s.state)return;renderedState=s.state;sniperClearInput();sniperEl('missionOverlay').hidden=playing||s.state==='shot';sniperEl('restartCampaign').hidden=!['success','failed','won'].includes(s.state);const action=sniperEl('missionAction');action.disabled=!sniperReady;
 if(s.state==='briefing'){sniperEl('overlayCode').textContent=m.code;sniperEl('missionTitle').textContent=m.name;sniperEl('missionBrief').textContent=m.brief;sniperEl('overlayClues').textContent=m.clues.join(' / ');action.textContent='임무 시작';}
 else if(s.state==='paused'){sniperEl('overlayCode').textContent='OPERATION PAUSED';sniperEl('missionTitle').textContent='작전 일시정지';sniperEl('missionBrief').textContent='시간과 표적 이동이 멈췄습니다. 준비되면 임무를 계속하세요.';sniperEl('overlayClues').textContent='';action.textContent='계속하기';}
 else if(['success','failed','won'].includes(s.state)){const won=s.state==='won',success=s.state==='success';sniperEl('overlayCode').textContent=won?'ALL OPERATIONS COMPLETE':success?'TARGETS CONFIRMED':'OPERATION FAILED';sniperEl('missionTitle').textContent=won?'모든 임무를 완수했습니다':success?'임무 완수':'작전 중단';sniperEl('missionBrief').textContent=s.state==='failed'?s.failure:`누적 ${s.score.toLocaleString('ko-KR')}점 · 명중 ${s.totalHits}/${s.totalShots}발. ${won?'모든 장소에서 윌리를 찾았습니다.':'다음 작전 브리핑을 확인하세요.'}`;sniperEl('overlayClues').textContent=s.state==='failed'?'재도전하면 현재 미션의 점수와 탄약이 초기화됩니다.':`정확도 ${s.totalShots?Math.round(s.totalHits/s.totalShots*100):0}% · 남은 시간 ${s.remaining.toFixed(1)}초`;action.textContent=won?'새 작전 시작':success?'다음 미션 브리핑':'이 미션 재도전';if(s.report)sniperEl('overlayClues').textContent=`${s.report.grade} 등급 · 이번 미션 ${s.report.shots}발 · 정확도 ${s.report.accuracy}% · 관찰 ${s.report.observed}명 · ${s.report.seconds}초`;if(s.state!=='success'){sniperBest=Math.max(sniperBest,s.score);try{localStorage.setItem('shadowSniperBest',String(sniperBest));}catch{}sniperEl('sniperBest').textContent=sniperBest.toLocaleString('ko-KR');window.dispatchEvent(new CustomEvent('partygame:score',{detail:{gameId:'shadow-sniper',score:s.score,wave:s.mission+1}}));}}
}
function sniperRestart(){sniper=new SniperGame();sniperApplyOptions();renderedState='';renderedMission=-1;sniperSync();}
sniperEl('missionAction').onclick=()=>{if(!sniperReady)return;if(sniper.state==='briefing')sniper.start();else if(sniper.state==='paused')sniper.pause();else if(sniper.state==='success')sniper.next();else if(sniper.state==='failed')sniper.retry();else if(sniper.state==='won')sniperRestart();sniperSync();sniperEl('gameCanvas').focus({preventScroll:true});};
sniperEl('restartCampaign').onclick=sniperRestart;
sniperEl('skipShotBtn').onclick=()=>{sniper.skipShot();sniperSync();sniperEl('gameCanvas').focus({preventScroll:true});};
function sniperShoot(){if(sniper.state==='running'&&!sniper.scoped){sniper.feedback='먼저 스코프를 켜서 표적을 확인하세요.';}else sniper.shoot();sniperSync();}
sniperEl('scopeBtn').onclick=()=>{sniper.scope();sniperSync();};sniperEl('fireBtn').onclick=sniperShoot;sniperEl('reloadBtn').onclick=()=>{sniper.reload();sniperSync();};sniperEl('focusBtn').onclick=()=>{if(sniper.state==='running'&&sniper.scoped&&sniper.reloadLeft===0&&sniper.focus>0)sniper.holding=!sniper.holding;sniperSync();};sniperEl('pauseSniper').onclick=()=>{sniper.pause();sniperSync();};
function sniperPoint(e){const r=sniperEl('gameCanvas').getBoundingClientRect(),scale=Math.min(r.width/960,r.height/540);return{x:(e.clientX-r.left-(r.width-960*scale)/2)/scale,y:(e.clientY-r.top-(r.height-540*scale)/2)/scale};}
const sniperCanvas=sniperEl('gameCanvas');
sniperCanvas.addEventListener('pointermove',e=>{if(sniper.state!=='running')return;const p=sniperPoint(e);if(e.pointerType==='touch'&&drag?.id===e.pointerId){sniper.aimAt(drag.aim.x+(p.x-drag.start.x)*drag.gain,drag.aim.y+(p.y-drag.start.y)*drag.gain);}else if(e.pointerType!=='touch')sniper.aimAt(p.x,p.y);});
sniperCanvas.addEventListener('pointerdown',e=>{if(sniper.state!=='running')return;if(e.button===2){sniper.scope();sniperSync();return;}if(e.button!==0)return;const p=sniperPoint(e);if(e.pointerType==='touch'){if(drag)return;sniperCanvas.setPointerCapture(e.pointerId);drag={id:e.pointerId,start:p,aim:{...sniper.aim},gain:sniperDragSensitivity/(sniper.scoped?1.7:1)};}else{sniper.aimAt(p.x,p.y);if(sniper.scoped)sniperShoot();}});
for(const type of ['pointerup','pointercancel','lostpointercapture'])sniperCanvas.addEventListener(type,e=>{if(drag?.id===e.pointerId)drag=null;});sniperCanvas.addEventListener('contextmenu',e=>e.preventDefault());
addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;const key=e.key.toLowerCase();if((key===' '||key==='enter')&&e.target.closest('button,a'))return;if(![' ','f','r','shift','p','escape','arrowleft','arrowright','arrowup','arrowdown'].includes(key))return;e.preventDefault();if(e.repeat)return;if(key==='p'||key==='escape')sniper.pause();else if(key===' '){sniper.scope();}else if(key==='f')sniperShoot();else if(key==='r')sniper.reload();else if(key==='shift'){if(sniper.state==='running'&&sniper.scoped&&sniper.focus>0)sniper.holding=true;}else aimKeys.add(key);sniperSync();});addEventListener('keyup',e=>{aimKeys.delete(e.key.toLowerCase());if(e.key==='Shift')sniper.holding=false;});
function suspendSniper(){sniperClearInput();if(sniper.state==='running'||sniper.state==='shot')sniper.pause();sniperSync();}addEventListener('blur',suspendSniper);document.addEventListener('visibilitychange',()=>{if(document.hidden)suspendSniper();});
function makeSniperScene(){return class extends Phaser.Scene {
 constructor(){super('ShadowOperation');}
 create(){sniperScene=this;this.city=this.add.container(0,0);this.bg=this.add.graphics();this.figures=this.add.graphics();this.blood=this.add.graphics();this.city.add([this.bg,this.figures,this.blood]);this.lens=this.add.graphics();this.reticle=this.add.graphics();this.hint=this.add.text(20,510,'',{fontFamily:'system-ui',fontSize:'12px',color:'#b2d5d3',backgroundColor:'#101a29cc',padding:{x:8,y:5}});this.buildCity();sniperReady=true;renderedState='';sniperSync();}
 buildCity(){if(!this.bg)return;const g=this.bg,m=sniper.config;g.clear();g.fillStyle(m.color).fillRect(0,0,960,540);
  const poly=(points,color)=>g.fillStyle(color).fillPoints(points.map(([x,y])=>({x,y})),true);
  if(m.theme==='harbor'){
   g.fillStyle(0x79acbe).fillRect(0,0,960,140);g.fillStyle(0xe9d391).fillCircle(820,55,29);
   for(let i=0;i<8;i++){const x=i*133;g.fillStyle([0xd8b49a,0x96b9af,0xc7a7a4][i%3]).fillRect(x,40+(i%3)*14,110,110);g.fillStyle(0xe5c8a4).fillRect(x-4,38+(i%3)*14,118,7);for(let j=0;j<4;j++)g.fillStyle(0x536e77).fillRect(x+12+j*23,68+(i%3)*14,10,25);}
   g.fillStyle(0x4a98ab).fillRect(0,132,960,63);for(let i=0;i<38;i++){g.lineStyle(1,0xb2d9d0,.5).lineBetween(i*29%960,145+i%4*12,i*29%960+17,145+i%4*12);}
   for(let i=0;i<4;i++){const x=115+i*220;poly([[x-45,160],[x+45,160],[x+28,177],[x-27,177]],[0x975b58,0xb4b8a3,0x55798b,0xcda57c][i]);g.lineStyle(2,0xd6cbaa).lineBetween(x,105,x,162);poly([[x-3,108],[x-3,154],[x-37,151]],0xe3d8bd);}
   g.fillStyle(0xc1b29c).fillRect(0,195,960,345);for(let y=205;y<540;y+=26){g.lineStyle(1,0xa99e8e,.5).lineBetween(0,y,960,y);for(let x=(y%52?15:0);x<960;x+=80)g.lineBetween(x,y,x,y+26);}
   for(let i=0;i<6;i++){const x=35+i*166;g.fillStyle(0x735a52).fillRect(x,176,110,25);for(let j=0;j<6;j++)g.fillStyle(j%2?0xe0c7a0:0x9e6970).fillRect(x-3+j*20,167,20,14);for(let j=0;j<5;j++)g.fillStyle([0xe2b26b,0x95a574,0xca857b][j%3]).fillCircle(x+13+j*20,194,6);}
   for(const x of [12,920])for(let j=0;j<4;j++){g.fillStyle(0x9a7855).fillRect(x,265+j*62,28,28);g.lineStyle(1,0x665140).strokeRect(x+3,268+j*62,22,22);}
   for(let i=0;i<5;i++){const x=120+i*170,y=298+(i%2)*94;g.fillStyle(0x9a795e).fillRect(x-23,y-9,46,12);g.fillStyle(0x7b6856).fillRect(x-19,y+3,4,8).fillRect(x+15,y+3,4,8);for(let j=0;j<7;j++)g.fillStyle([0xe3ac6f,0xae6d6f,0x7e9e74][j%3]).fillCircle(x-17+j*5,y-9,3);g.fillStyle(0x8e7462).fillRoundedRect(x+42,y-6,14,18,3);g.fillStyle(0x74977b).fillCircle(x+49,y-10,10);g.fillStyle(0xd5bc83).fillCircle(x+49,y-13,3);}
   g.lineStyle(1,0x6f7771).lineBetween(0,30,960,80);for(let i=0;i<27;i++){const x=i*38;poly([[x,30+x/19],[x+20,31+x/19],[x+10,48+x/19]],[0xc87577,0xe0c780,0x6b9a91][i%3]);}
  }else if(m.theme==='festival'){
   for(let i=0;i<48;i++)g.fillStyle(0xe3d5e9,.35).fillCircle(i*167%960,10+i*37%115,1);
   g.lineStyle(5,0xa88ba7).strokeCircle(790,83,80);g.lineStyle(2,0x6c668c).lineBetween(790,83,745,170).lineBetween(790,83,835,170);
   for(let i=0;i<12;i++){const a=i*Math.PI/6,x=790+Math.cos(a)*80,y=83+Math.sin(a)*80;g.lineStyle(1,0xaf9eb6,.6).lineBetween(790,83,x,y);g.fillStyle([0xe2ae9c,0xa9bfd6,0xd5bf7d][i%3]).fillRoundedRect(x-8,y-5,16,13,3);g.fillStyle(0xf8e3ae).fillCircle(x,y-7,2);}
   g.fillStyle(0x7f617d).fillRect(97,100,136,51);poly([[80,100],[165,29],[250,100]],0xb77e88);g.fillStyle(0xe4c58f).fillRect(160,44,4,103);for(let i=0;i<4;i++)g.fillStyle(0xd3c4a5).fillRoundedRect(111+i*32,116,16,22,3);
   g.fillStyle(0x51516a).fillRect(0,155,960,385);for(let y=160;y<540;y+=24){g.lineStyle(1,0x78748a,.28).lineBetween(0,y,960,y);}
   for(let row=0;row<2;row++){g.lineStyle(1,0xd0bcaa,.6).lineBetween(0,20+row*55,960,45+row*55);for(let i=0;i<26;i++){const x=15+i*38,y=20+row*55+x/38;g.fillStyle([0xd9a1a9,0xe8d490,0xa5cdd0][i%3],.2).fillCircle(x,y,10);g.fillStyle([0xf6b3bb,0xf9df9a,0x9fe4df][i%3]).fillCircle(x,y,3);}}
   for(const x of [10,920])for(let j=0;j<3;j++){g.lineStyle(1,0xa89cba).lineBetween(x+12,270+j*72,x+15,310+j*72);g.fillStyle([0xdf8f9c,0x94becd,0xcfb570][j]).fillEllipse(x+12,260+j*72,20,27);}
   for(let i=0;i<130;i++){const x=(i*157)%960,y=155+(i*97)%375;g.fillStyle([0xb58d9d,0xc7b880,0x84aca7][i%3],.6).fillRect(x,y,2,4);}
   for(let i=0;i<5;i++){const x=130+i*174,y=227+(i%3)*90;g.lineStyle(2,[0xc698b0,0x90bbb9,0xd7c388][i%3],.5).strokeCircle(x,y,14);g.lineStyle(1,0xaca6bb,.6).lineBetween(x-22,y,x+22,y).lineBetween(x,y-22,x,y+22);g.fillStyle(0xdccba1,.6).fillCircle(x,y,3);}
  }else if(['garden','pier','station'].includes(m.theme)){
   if(m.theme==='garden'){
    g.fillStyle(0xbdded1).fillRect(0,0,960,170);g.fillStyle(0xf5e3a9).fillCircle(805,47,25);
    for(let i=0;i<9;i++){const x=i*120;g.fillStyle(0x508776).fillCircle(x,115,50);g.fillStyle(0x80ae88).fillCircle(x+18,94,35);}
    g.fillStyle(0xa4c9b7).fillRect(290,55,335,105);poly([[270,55],[455,6],[645,55]],0xcee6de);
    for(let i=0;i<8;i++){g.lineStyle(3,0x6b9690).lineBetween(292+i*47,57,292+i*47,158);g.lineStyle(1,0xeff4d8,.8).lineBetween(302+i*43,62,302+i*43,143);}
    g.fillStyle(0x91b688).fillRect(0,160,960,380);g.fillStyle(0xd7cdb1).fillRect(0,175,960,340);
    for(let i=0;i<90;i++){const x=i*137%960,y=180+i*67%340;g.lineStyle(1,0xb9b49b,.5).lineBetween(x,y,x+25,y);}
    for(const x of [22,925])for(let y=210;y<520;y+=70){g.fillStyle(0x658d67).fillCircle(x,y,20);for(let j=0;j<4;j++)g.fillStyle([0xf1b6c1,0xe9d780,0xc2b5df][j%3]).fillCircle(x-10+j*7,y-8+j%2*8,4);}
   }else if(m.theme==='pier'){
    g.fillStyle(0xe9baa4).fillRect(0,0,960,100);g.fillStyle(0xf6dda4).fillCircle(720,53,32);g.fillStyle(0x719eac).fillRect(0,100,960,90);
    for(let i=0;i<35;i++){const x=i*117%960,y=110+i*13%70;g.lineStyle(2,0xf0d9b1,.45).lineBetween(x,y,x+35,y);}
    g.fillStyle(0xd7ba8c).fillRect(0,180,960,360);g.fillStyle(0xb89679).fillRect(40,180,880,360);
    for(let y=190;y<540;y+=22){g.lineStyle(1,0x806d62,.5).lineBetween(40,y,920,y);for(let x=60;x<920;x+=110)g.fillStyle(0x725f55,.5).fillCircle(x,y+4,1);}
    g.lineStyle(5,0xe2c4a0).lineBetween(40,164,920,164);for(let x=45;x<940;x+=70)g.fillStyle(0x8d7567).fillRect(x,153,6,37);
    for(const x of [80,365,835]){g.fillStyle(0x756f79).fillRect(x,75,4,77);poly([[x-40,122],[x+42,122],[x+28,138],[x-25,138]],0x8b6271);poly([[x-3,78],[x-3,115],[x-32,115]],0xf4dfb9);}
    for(const x of [14,930]){g.fillStyle(0x8a7064).fillRect(x,60,7,120);for(let i=0;i<5;i++)poly([[x+3,63],[x-45+i*19,35+i%2*17],[x-35+i*18,74]],0x627d69);}
   }else{
    g.fillStyle(0x617b8d).fillRect(0,0,960,160);g.fillStyle(0xbfcaca).fillRect(0,20,960,16);
    for(let x=0;x<960;x+=120){poly([[x,0],[x+60,57],[x+120,0]],0x405c71);g.lineStyle(3,0x8fa4ae).lineBetween(x,0,x+60,57).lineBetween(x+60,57,x+120,0);}
    g.fillStyle(0x365973).fillRoundedRect(24,65,912,98,17);g.fillStyle(0xe0b776).fillRect(25,133,910,8);
    for(let i=0;i<15;i++){const x=45+i*59;g.fillStyle(0xa8c7cb).fillRoundedRect(x,78,40,37,4);g.fillStyle(0x607f91).fillRect(x+4,104,32,7);}
    g.fillStyle(0xc1bcae).fillRect(0,163,960,377);g.fillStyle(0xe5c171).fillRect(0,164,960,8);
    for(let y=185;y<540;y+=32){g.lineStyle(1,0x9d9f99,.6).lineBetween(0,y,960,y);for(let x=(y%64?0:48);x<960;x+=96)g.lineBetween(x,y,x,y+32);}
    for(const x of [25,925]){g.fillStyle(0x4e697a).fillRect(x,0,10,220);g.fillStyle(0x304a60).fillRect(x-10,206,30,10);}
    g.fillStyle(0x263d50).fillRoundedRect(360,13,240,42,4);g.fillStyle(0xe6c990).fillRect(377,26,112,5).fillRect(377,38,84,4);
    g.fillStyle(0xe9e6cc).fillCircle(558,34,16);g.lineStyle(2,0x405969).lineBetween(558,34,558,23).lineBetween(558,34,566,38);
   }
   for(const o of sniper.obstacles){
    if(m.theme==='garden'){g.fillStyle(0x8a8670).fillRoundedRect(o.x-o.rx,o.y-o.ry,o.rx*2,o.ry*2,8);g.fillStyle(0x63845e).fillEllipse(o.x,o.y-6,53,26);for(let j=0;j<7;j++)g.fillStyle([0xeaa6b8,0xebd277,0xb49dd0][j%3]).fillCircle(o.x-22+j*7,o.y-7+(j%2)*6,4);}
    else{g.fillStyle(m.theme==='pier'?0x9e7371:0x667f81).fillRect(o.x-o.rx,o.y-10,o.rx*2,8).fillRect(o.x-o.rx,o.y+1,o.rx*2,5);g.fillStyle(0x5a666b).fillRect(o.x-o.rx+3,o.y+6,4,6).fillRect(o.x+o.rx-7,o.y+6,4,6);}
   }
  }else{
   poly([[0,148],[140,8],[290,151]],0xbfd0db);poly([[200,153],[410,0],[610,153]],0xd6e0e4);poly([[510,153],[760,9],[960,153]],0xb9cbdc);poly([[335,55],[410,0],[482,55],[441,46],[412,66],[387,45]],0xf0ece5);
   g.fillStyle(0xd6e2e3).fillRect(0,155,960,385);g.fillStyle(0xb8cfd8,.6).fillEllipse(465,340,890,310);for(let y=170;y<540;y+=46){g.lineStyle(1,0xa1becd,.4).lineBetween(0,y,960,y+15);}
   for(let i=0;i<4;i++){const x=80+i*235;g.fillStyle(0x9a7771).fillRect(x,105,142,57);poly([[x-15,106],[x+70,53],[x+156,106]],0xeaf0e9);poly([[x-15,106],[x+70,68],[x+156,106]],0x817185);g.fillStyle(0xdfc393).fillRect(x+15,121,25,23);g.fillRect(x+95,121,25,23);g.fillStyle(0x66596b).fillRect(x+61,125,22,37);}
   for(const x of [13,932])for(let j=0;j<4;j++){const y=230+j*76;g.fillStyle(0x7c8c88).fillRect(x-2,y-8,5,40);poly([[x-25,y+12],[x,y-45],[x+25,y+12]],0x4d8076);poly([[x-19,y-5],[x,y-45],[x+19,y-5]],0xe8eeea);}
   for(let i=0;i<5;i++){const x=100+i*181;g.lineStyle(2,0xa3b5ba,.6).lineBetween(x,165,x+20,162).lineBetween(x+9,171,x+29,168);}
   for(let i=0;i<4;i++){const x=140+i*215,y=222+(i%3)*89;g.fillStyle(0x9f8a80).fillRect(x-18,y-7,36,4).fillRect(x-18,y,36,4);g.fillStyle(0x7d7e86).fillRect(x-15,y+3,3,8).fillRect(x+12,y+3,3,8);g.fillStyle(0xe8eeea).fillRect(x-19,y-9,38,3);g.lineStyle(2,[0xc27f8c,0x869ab8][i%2]).lineBetween(x+33,y-12,x+42,y+12).lineBetween(x+39,y-13,x+48,y+11);}
   g.fillStyle(0xe9eeeb).fillCircle(587,146,14).fillCircle(587,124,10);g.fillStyle(0x66596b).fillRect(576,110,22,6).fillRect(581,101,12,12);g.fillStyle(0xdb9274).fillTriangle(593,124,609,126,593,128);g.fillStyle(0x8e9ba3).fillCircle(584,121,1).fillCircle(590,121,1);
  }
 }
 drawPerson(g,a){const fallen=a.dead,pose=a.pose||sniperActorPose(a,sniper.elapsed),ease=fallen?1-Math.pow(1-Math.min(1,a.fallTime/1.05),3):0,angle=fallen?ease*1.5*(a.fallDir||1):pose.lean,cos=Math.cos(angle),sin=Math.sin(angle),baseX=a.x+ease*5*(a.fallDir||1),baseY=a.y+(fallen?0:pose.bob),t=sniper.elapsed+a.phase;
   const pt=(x,y)=>({x:baseX+x*cos-y*sin,y:baseY+x*sin+y*cos}),shape=(arr,c)=>g.fillStyle(c).fillPoints(arr.map(([x,y])=>pt(x,y)),true),rect=(x,y,w,h,c)=>shape([[x,y],[x+w,y],[x+w,y+h],[x,y+h]],c),circle=(x,y,r,c)=>{const p=pt(x,y);g.fillStyle(c).fillCircle(p.x,p.y,r);},line=(x,y,x2,y2,w,c)=>{const p=pt(x,y),q=pt(x2,y2);g.lineStyle(w,c).lineBetween(p.x,p.y,q.x,q.y);};
   const left=fallen?{x:-15,y:-18}:pose.left,right=fallen?{x:16,y:-19}:pose.right,legL=fallen?{x:-5,y:0}:pose.legL,legR=fallen?{x:5,y:0}:pose.legR;
   g.fillStyle(0x233846,.18).fillEllipse(a.x+ease*16*(a.fallDir||1),a.y+2,24+ease*29,5);line(-3,-15,legL.x,legL.y,4,0x344b71);line(3,-15,legR.x,legR.y,4,0x344b71);rect(-8,-34,16,22,a.coat);line(-7,-29,left.x,left.y,4,a.coat);line(7,-29,right.x,right.y,4,a.coat);circle(left.x,left.y,2,a.skin);circle(right.x,right.y,2,a.skin);circle(0,-40,5,a.skin||0xe6c6a2);
   if(a.stripes)for(let i=0;i<4;i++)rect(-8,-32+i*5,16,2.5,0xf0e8d6);
   if(a.cap){rect(-6,-47,12,5,0x506888);rect(-7,-43,15,2,0x506888);}if(a.helmet){circle(0,-44,6,0xe8ca76);rect(-8,-43,16,3,0xe8ca76);}if(a.visor){rect(-7,-45,14,7,0x435d69);rect(-6,-44,12,3,0x9de9d1);}
   if(a.hat==='beanie'){circle(0,-45,6,0xd25460);rect(-7,-45,14,4,0xf3e6d1);circle(0,-52,2.5,0xf3e6d1);}if(a.hat==='sailor'){rect(-7,-48,14,5,0xe4e4d8);rect(-6,-43,12,2,0x526b8a);}if(a.hat==='chef'){rect(-6,-52,12,10,0xf2ead8);circle(-4,-53,4,0xf2ead8);circle(3,-55,5,0xf2ead8);circle(7,-52,3,0xf2ead8);rect(-6,-29,12,14,0xf0e6d6);}if(a.hat==='beret'){circle(-2,-46,7,0x816590);rect(-7,-44,14,3,0x816590);}if(a.hat==='sunhat'||a.hat==='explorer'){rect(-10,-44,20,3,0xe3c391);rect(-5,-50,10,7,0xd5b17b);}if(a.hat==='clown'){for(let j=0;j<5;j++)circle(-7+j*3.5,-45-Math.sin(j)*3,3.5,[0xc87982,0x8bbdc3,0xe7cf82][j%3]);circle(1,-39,2,0xdf6d77);}if(a.hat==='tophat'){rect(-6,-56,12,14,0x404155);rect(-9,-44,18,3,0x404155);rect(-6,-47,12,3,0xc8b88f);}
   if(['garden','fisher','boater'].includes(a.hat)){const color=a.hat==='garden'?0x5c8662:a.hat==='fisher'?0xa58a62:0xe7ca91;rect(-6,-50,12,8,color);rect(-10,-44,20,3,color);rect(-6,-46,12,2,a.hat==='boater'?0xb7757a:0x455e57);}
   if(a.hat==='headband')rect(-6,-45,12,2,0xf1ead5);
   if(a.hat==='band'){rect(-6,-53,12,11,0x4c647a);rect(-8,-44,16,2,0xe2c385);circle(0,-55,3,0xd7a976);}
   if(a.hat==='baker'){circle(-3,-48,5,0xf2e7cf);circle(3,-48,5,0xf2e7cf);rect(-6,-46,12,4,0xf2e7cf);rect(-5,-29,10,16,0xab7b60);}
   if(a.role==='정원사'){rect(-6,-24,12,12,0x4d7667);line(-5,-32,-4,-22,2,0x4d7667);line(5,-32,4,-22,2,0x4d7667);}
   if(a.role==='과학자'){line(0,-33,0,-13,1,0x829b9c);rect(-6,-25,4,5,0x9cbcc5);}
   if(!fallen){const glance=(a.motion?.gaze??pose.facing??1)*1.2;circle(-2+glance,-41,.65,0x394754);circle(2+glance,-41,.65,0x394754);}
   if(a.glasses){for(const x of [-3,3]){const p=pt(x,-40);g.lineStyle(.8,0x3d4651).strokeCircle(p.x,p.y,2.4);}line(-1,-40,1,-40,.6,0x3d4651);}
   if(a.scarf){rect(-7,-35,14,3.5,a.scarf);rect(3,-32,4,9,a.scarf);}if(a.case){line(9,-20,16,-20,1,0x6f737b);rect(7,-17,13,10,a.target?0x19202b:0x71615b);rect(12,-15,2,2,0xadb2b0);}
   if(fallen)return;
   const action=a.action,steam=(x,y)=>{for(let i=0;i<3;i++){const h=(t*8+i*5)%16;circle(x+Math.sin(t*2+i)*2,y-h,1,0xf4e9d1);}},note=(x,y)=>{circle(x,y,2,0xeacb7f);line(x+2,y,x+2,y-8,1,0xeacb7f);line(x+2,y-8,x+6,y-6,1,0xeacb7f);};
   if(action==='water'){rect(12,-22,13,10,0x749eae);line(22,-19,31,-23,3,0x749eae);for(let i=0;i<4;i++){const q=(pose.prop+i*.23)%1;circle(30+q*6,-22+q*20,1,0x9cd6de);}rect(29,-3,12,6,0xb28b69);line(35,-4,35,-13,2,0x6c9d69);circle(35,-14,4,0xe6bd8d);}
   if(action==='read'){shape([[-11,-32],[0,-29],[11,-32],[11,-20],[0,-17],[-11,-20]],0xeee3c6);line(0,-29,0,-17,1,0x987f74);for(let j=0;j<3;j++){line(-8,-28+j*3,-3,-27+j*3,.6,0x9a9583);line(3,-27+j*3,8,-28+j*3,.6,0x9a9583);}if(pose.prop>.8)line(0,-29,5,-32+(pose.prop-.8)*50,1,0xf7efd9);}
   if(action==='fish'){line(right.x,right.y,31,-65,1.5,0x8b755f);line(31,-65,41,-5+Math.sin(t*1.8)*3,.7,0xc5d4ce);circle(41,-3+Math.sin(t*1.8)*3,2,0xe79885);}
   if(action==='balloon')for(let j=0;j<3;j++){const x=-6+j*13+pose.prop*4,y=-68-(j%2)*12;line(right.x,right.y,x,y+7,.7,0xe3d6be);const p=pt(x,y);g.fillStyle([0xe99fa9,0x8ccbd3,0xe9cf82][j]).fillEllipse(p.x,p.y,12,16);circle(x-2,y-3,2,0xf7e9d5);}
   if(action==='inspect'){line(right.x,right.y,right.x+6,right.y-7,2,0x6b727d);const p=pt(right.x+7,right.y-10);g.lineStyle(1.7,0xb6d9dc).strokeCircle(p.x,p.y,5);}
   if(action==='stretch'){rect(-4,-28,8,7,0xe8eee1);line(-2,-27,2,-27,1,0x44888f);}
   if(action==='drum'){rect(-12,-22,24,14,0xb37178);rect(-13,-24,26,3,0xf0d7a4);rect(-13,-10,26,3,0xe3bd83);for(let i=0;i<4;i++)line(-10+i*6,-21,-7+i*6,-11,1,0xf0d7a4);line(left.x,left.y,0,-23,1.5,0xdfbc88);line(right.x,right.y,5,-23,1.5,0xdfbc88);}
   if(action==='knead'){rect(8,-15,28,4,0xa18163);line(11,-11,11,0,2,0x806a59);line(33,-11,33,0,2,0x806a59);const p=pt(22,-18);g.fillStyle(0xf1dcb0).fillEllipse(p.x,p.y,14+Math.sin(t*3.2)*2,6);line(left.x,left.y,right.x,right.y,4,0xb9976f);}
   if(action==='photo'){const y=pose.prop?-41:-26;rect(-7,y,14,8,0x3f4d59);circle(0,y+4,3,0x8da9ba);circle(0,y+4,1.5,0x203c50);if(!sniperReducedMotion&&pose.prop&&t%4>1.95&&t%4<2.12){line(8,y,16,y-7,2,0xfff1b0);line(10,y+2,20,y+2,2,0xfff1b0);}}
   if(action==='carry'){rect(-14,-27,28,17,0xb48a5f);rect(-12,-24,24,2,0xe5bc80);line(-12,-12,12,-25,2,0x816449);line(-12,-25,12,-12,2,0x816449);}
   if(action==='paint'){line(23,-39,18,0,2,0x9c7758);line(29,-39,37,0,2,0x9c7758);rect(19,-43,21,24,0xe5c58e);rect(21,-41,17,19,0xf4ead5);shape([[22,-24],[28,-35],[36,-24]],0x7fae9a);circle(33,-37,3,0xe6b268);circle(left.x,left.y,5,0xb88c67);circle(left.x-2,left.y,1.5,0xd96573);line(right.x,right.y,right.x+6,right.y-4,1,0x485979);}
   if(action==='cook'||action==='serve'){rect(14,-16,24,4,0xb58a63);line(17,-12,17,0,2,0x82644d);line(35,-12,35,0,2,0x82644d);if(action==='cook'){rect(17,-22,18,6,0x445564);line(15,-21,11,-21,2,0x445564);line(right.x,right.y,26,-23,1.5,0xc7a16d);steam(26,-25);}else{line(right.x-7,right.y+1,right.x+9,right.y+1,2,0xece4ce);circle(right.x,right.y-2,4,0xd4a068);steam(right.x,right.y-8);}}
   if(action==='repair'){rect(15,-14,23,12,0x657c8a);rect(22,-18,8,4,0x455569);line(right.x,right.y,right.x+1,right.y-9,2,0xac8660);rect(right.x-4,right.y-11,10,4,0x8b9ba4);if(Math.sin(t*3.2)<-.8){line(24,-18,22,-23,1,0xf4ce81);line(29,-18,32,-23,1,0xf4ce81);}}
   if(action==='juggle')for(let i=0;i<3;i++){const q=t*2.8+i*Math.PI*2/3;circle(Math.cos(q)*17,-39-Math.max(0,Math.sin(q))*28,3,[0xe8c869,0xd77c9a,0x90cbb9][i]);}
   if(action==='play'){circle(7,-24,7,0xc89559);circle(7,-24,2.5,0x4e555e);line(9,-27,18,-42,4,0xcba574);line(5,-20,18,-41,.7,0xf3d4a0);line(right.x,right.y,7,-24,1,0xe9c6a1);for(let i=0;i<2;i++)note(19+i*10,-47-(t*9+i*12)%25);}
   if(action==='dance')note(-21,-48-(t*8)%16);
   if(action==='startle'){line(-13,-54,-17,-59,1.5,0xffe1a0);line(13,-54,17,-59,1.5,0xffe1a0);}
   if(action==='clap'&&Math.abs(Math.sin(t*3.2))<.3){line(-4,-38,-8,-42,1,0xffe1a0);line(4,-38,8,-42,1,0xffe1a0);}
   if(action==='ski'||action==='skate'){for(const foot of [legL,legR])line(foot.x-9,foot.y+2,foot.x+13,foot.y+2,2,action==='ski'?0xb96480:0x81929e);if(action==='ski'){line(left.x,left.y,left.x-8,3,1,0x6e7d8e);line(right.x,right.y,right.x+8,3,1,0x6e7d8e);}for(let i=0;i<3;i++)circle(-pose.facing*(17+i*4),2-(t*8+i*3)%8,1.3,0xf8f5e8);}
   if(action==='shovel'){line(left.x,left.y,right.x+7,-3,2,0x9b7c62);rect(right.x+3,-7,10,7,0x8197a5);for(let i=0;i<4;i++){const q=(t*.7+i*.1)%1;circle(24+q*13,-3-Math.sin(q*Math.PI)*18,1.5,0xf9f6ed);}}
   if(action==='snowman'){circle(29,-8,10,0xf6f4eb);circle(29,-22,7,0xf6f4eb);circle(27,-24,1,0x5a6678);circle(31,-24,1,0x5a6678);shape([[29,-22],[38,-20],[29,-19]],0xe5a36f);circle(right.x,right.y,3,0xf6f4eb);}
   if(action==='sip'){rect(right.x-3,right.y-3,7,7,0xf0e1c4);line(right.x+4,right.y-1,right.x+6,right.y+2,1.5,0xf0e1c4);steam(right.x,right.y-7);}
   if(action==='shop'){rect(18,-17,19,13,0xb28c64);for(let i=0;i<4;i++)circle(20+i*5,-19,3,[0xe1a86c,0x93b58b][i%2]);line(18,-12,37,-12,1,0xe2b98b);}
   if(action==='talk'&&(a.motion?.partner==null||Math.floor(sniper.elapsed*1.4)%2===Number(a.id>a.motion.partner))){const side=pose.facing||1,x=side>0?9:-31;rect(x,-60,22,12,0xf3ebd8);shape([[side*11,-48],[side*11,-44],[side*16,-48]],0xf3ebd8);for(let i=0;i<3;i++)circle(x+5+i*6,-54,1+(Math.sin(t*3-i)>0?.5:0),0x677787);}
 }
 drawPeople(){const g=this.figures;g.clear();for(const a of [...sniper.actors].sort((a,b)=>a.y-b.y)){
   if(a.hidden&&!a.dead){g.fillStyle(0x9ba8ae).fillRect(a.x-17,a.y-55,35,55);g.lineStyle(1,0x778b9c,.8);for(let j=0;j<8;j++)g.lineBetween(a.x-16,a.y-51+j*6,a.x+17,a.y-51+j*6);g.fillStyle(0xe3e6d8).fillRect(a.x-19,a.y-57,39,5);continue;}this.drawPerson(g,a);
   if(a.dead&&a.fallTime>.25){g.fillStyle(0x9a3e4a,.55);for(let i=0;i<5;i++)g.fillEllipse(a.x+(a.fallDir||1)*(13+i*4),a.y+2+(i%2),3+(i%2),1.5);}
  }
  if(!sniperReducedMotion&&sniper.config.theme==='snow'){g.fillStyle(0xf5f5e9,.7);for(let i=0;i<45;i++){const x=(i*137+sniper.elapsed*4)%960,y=(i*97+sniper.elapsed*10)%540;g.fillCircle(x,y,1+(i%2)*.5);}}
  for(const p of sniperAmbient(sniper.config.theme,sniper.elapsed,sniperReducedMotion)){
   if(p.kind==='butterfly'){g.fillStyle(p.color,.85).fillEllipse(p.x-p.wing/2,p.y,p.wing,3).fillEllipse(p.x+p.wing/2,p.y,p.wing,3);g.lineStyle(1,0x77696d).lineBetween(p.x,p.y-2,p.x,p.y+2);}
   else if(p.kind==='water')g.lineStyle(1.5,0xf3e2c2,p.alpha).lineBetween(p.x,p.y,p.x+18,p.y);
   else if(p.kind==='light')g.fillStyle(0xffd3a2,p.alpha).fillCircle(p.x,p.y,8);
   else if(p.kind==='signal')g.fillStyle(0xb8e9c2,p.alpha).fillRect(p.x,p.y,10,3);
  }
  const b=this.blood;b.clear();if(!sniperReducedMotion)for(const p of sniper.particles)b.fillStyle(0xb84450,Math.min(1,p.life/.25)).fillCircle(p.x,p.y,p.size);
 }
 drawBulletTime(r,shot){const t=Math.min(1,shot.clock/shot.flight);r.fillStyle(0x060c16,.8).fillRect(0,0,960,42).fillRect(0,498,960,42);
   if(sniperReducedMotion)return;
   if(!shot.impacted){const bx=-65+t*665,by=415-t*145,angle=Math.atan2(-145,665),cos=Math.cos(angle),sin=Math.sin(angle),p=(x,y)=>({x:bx+x*cos-y*sin,y:by+x*sin+y*cos});
     for(let i=0;i<8;i++){const a=p(-29-i*18,0),b=p(-48-i*18,0);r.lineStyle(Math.max(1,5-i*.5),0xffd99b,.6-i*.065).lineBetween(a.x,a.y,b.x,b.y);}r.fillStyle(0xf2c786).fillPoints([p(-25,-5),p(10,-5),p(23,0),p(10,5),p(-25,5)],true);r.fillStyle(0xaf7950).fillPoints([p(-26,-5),p(-19,-5),p(-19,5),p(-26,5)],true);r.lineStyle(1,0xffedc4).lineBetween(p(-17,-3).x,p(-17,-3).y,p(10,-3).x,p(10,-3).y);
     for(let i=0;i<12;i++){const x=(i*173-shot.clock*210)%1100,y=65+(i*53)%400;r.lineStyle(1,0xc7d6d3,.12).lineBetween(x,y,x+42,y-10);}
   }else{const f=Math.max(0,1-(shot.clock-shot.flight)/.25);r.lineStyle(2,0xe6b993,f*.5).strokeCircle(600,270,15+(1-f)*28);}
 }
 update(_,delta){const dt=Math.min(delta/1000,.05);if(sniper.state==='running'){const speed=sniper.scoped?95:220;sniper.aimAt(sniper.aim.x+(Number(aimKeys.has('arrowright'))-Number(aimKeys.has('arrowleft')))*speed*dt,sniper.aim.y+(Number(aimKeys.has('arrowdown'))-Number(aimKeys.has('arrowup')))*speed*dt);}sniper.step(dt);const s=sniper,cinema=(s.state==='shot'||s.state==='paused'&&s.pausedFrom==='shot')&&s.shot,zoom=cinema?(sniperReducedMotion?2.3:2+Math.min(1,cinema.clock/cinema.flight)*1.4):s.scoped?2.3:1,ax=cinema?cinema.x:s.aim.x,ay=cinema?cinema.y:s.aim.y;this.city.setScale(zoom).setPosition(cinema?600-ax*zoom:ax*(1-zoom),cinema?270-ay*zoom:ay*(1-zoom));this.drawPeople();const g=this.lens,r=this.reticle;g.clear();r.clear();
   if(cinema){this.drawBulletTime(r,cinema);}else if(s.scoped){const radius=160;g.lineStyle(1600,0x030912,.95).strokeCircle(ax,ay,radius+800);g.lineStyle(2,0x97bdb3,.7).strokeCircle(ax,ay,radius);g.lineStyle(9,0x162735,.8).strokeCircle(ax,ay,radius+6);const drift=s.sway(),cx=ax+drift.x,cy=ay+drift.y;r.lineStyle(1,0xb9ddd0,.8).lineBetween(cx-radius+18,cy,cx-10,cy).lineBetween(cx+10,cy,cx+radius-18,cy).lineBetween(cx,cy-radius+18,cx,cy-10).lineBetween(cx,cy+10,cx,cy+radius-18);r.lineStyle(1,0xb9ddd0,.5);for(let i=-3;i<=3;i++){if(i===0)continue;r.lineBetween(cx+i*25,cy-4,cx+i*25,cy+4);r.lineBetween(cx-4,cy+i*25,cx+4,cy+i*25);}r.fillStyle(s.holding?0x86edce:0xf3ba83).fillCircle(cx,cy,2);if(s.inspected)r.lineStyle(2,0x9ee5d1,.6).strokeCircle(ax,ay,13+s.identification*7);
   }else{r.lineStyle(1,0xc1d4e5,.65).strokeCircle(ax,ay,11).lineBetween(ax-18,ay,ax-6,ay).lineBetween(ax+6,ay,ax+18,ay).lineBetween(ax,ay-18,ax,ay-6).lineBetween(ax,ay+6,ax,ay+18);}
   if(!cinema&&s.impact?.life>0){const ix=(s.impact.x-ax)*zoom+ax,iy=(s.impact.y-ay)*zoom+ay;r.lineStyle(2,0xfad4ac,s.impact.life/.55).strokeCircle(ix,iy,7+(1-s.impact.life/.55)*20);}if(!cinema&&s.shotFlash>0){r.fillStyle(0xffdfa9,s.shotFlash*.5).fillRect(0,0,960,540);r.lineStyle(3,0xf7c391,.6).lineBetween(500,570,ax,ay);}
   this.hint.setText(cinema?(cinema.impacted?'IMPACT / 슬로모션 명중':'BULLET TIME / 0.08×  ·  총알 추적'):s.state==='running'?(s.reloadLeft>0?`RELOADING ${s.reloadLeft.toFixed(1)}s`:s.scoped?`OPTICS ×2.3  ·  ${s.holding?'FOCUS '+Math.round(s.steadiness*100)+'%':'SHIFT / 집중으로 흔들림 감소'}`:'OBSERVATION  ·  SPACE / 스코프로 표적 확인'):'SHADOW OPERATIONS / '+s.config.code);sniperSync();
 }
};}
try{if(!window.Phaser)throw Error('Phaser load failed');sniperEngine=new Phaser.Game({type:Phaser.CANVAS,width:960,height:540,canvas:sniperCanvas,parent:sniperCanvas.parentElement,input:{keyboard:false,mouse:false,touch:false},backgroundColor:'#172a3b',antialias:true,scene:makeSniperScene(),audio:{noAudio:true},banner:false,scale:{mode:Phaser.Scale.NONE},callbacks:{postBoot:()=>{sniperMessage('준비 완료. 브리핑을 확인하고 임무를 시작하세요.');}}});}
catch(error){console.error(error);sniperEl('missionTitle').textContent='게임을 불러오지 못했습니다';sniperEl('missionBrief').textContent='인터넷 연결과 브라우저의 그래픽 지원을 확인한 뒤 새로고침해 주세요.';sniperMessage('게임 엔진 로딩 실패. 새로고침해 주세요.');}
