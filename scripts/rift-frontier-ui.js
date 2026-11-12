'use strict';
// The second expedition expansion shares the canvas and core state with the main UI.
let riftCampTab='loot',riftFrontierKey='',riftLastCamp=-1,riftPracticeReturn=null;
let riftJournalData=RiftJournal.load(),riftJournalRecorded='';
const riftEnemyNames={guard:'검병',mage:'마법사',brute:'중갑병',ranger:'궁병',wraith:'망령',sentinel:'방패병',acolyte:'치유사',boss:'수문장'};

function riftOfferCards(id,offers,attribute){
 const holder=$(id);holder.replaceChildren();
 for(const offer of offers){const button=document.createElement('button'),name=document.createElement('b'),desc=document.createElement('small'),status=document.createElement('em');
  button.dataset[attribute]=offer.id;button.disabled=!offer.available;name.textContent=offer.name;desc.textContent=offer.desc;
  status.textContent=offer.reason||(offer.cost!=null?`${offer.cost} G`:'선택하기');
  if(offer.rank)name.textContent+=` · ${offer.rank}/3`;
  button.append(name,desc,status);holder.append(button);
 }
}
function riftFrontierUI(){
 const p=rift.player,passive=rift.passiveInfo,camp=rift.state==='upgrade',practice=Boolean(rift.practice);
 $('passiveName').textContent=passive.name;$('passiveDesc').textContent=passive.desc;
 $('passiveProgress').textContent=passive.ready?'효과 준비':`${passive.progress}/${passive.max}`;
 $('passiveBar').style.width=Math.min(100,passive.progress/passive.max*100)+'%';
 $('passiveProgress').classList.toggle('ready',passive.ready);
 const weapon=RIFT_WEAPONS.find(w=>w.id===rift.weaponId),companion=RIFT_COMPANIONS.find(c=>c.id===rift.companionId),route=RIFT_ROUTES.find(r=>r.id===rift.routeId);
 $('weaponName').textContent=weapon?`${weapon.name} · ${rift.weaponRank}/3 조율`:'무기 조율 없음';
 $('weaponDesc').textContent=weapon?weapon.desc:'보급소 대장간에서 무기를 조율하세요.';
 $('companionName').textContent=companion?'동료 · '+companion.name:'동행하는 동료 없음';
 $('routeName').textContent=route?'현재 경로 · '+route.name:'기본 경로';
 $('practiceBtn').disabled=rift.state!=='ready';$('practiceBar').hidden=!practice;
 if(practice){$('saveRunBtn').disabled=true;$('runDifficulty').textContent='직업 훈련';$('goldText').textContent=`누적 피해 ${Math.floor(rift.trainingDamage)}`;$('dodgeText').textContent=`DPS ${rift.trainingDps.toFixed(1)}`;$('runMessage').textContent='훈련 중에는 자원이 회복됩니다. 원정 저장과 기록은 변경되지 않습니다.';if(rift.state==='paused')$('overlayTitle').textContent='훈련 일시정지';}
 if(!camp)riftLastCamp=-1;else if(riftLastCamp!==rift.stage){riftLastCamp=rift.stage;riftCampTab='loot';}
 $('campTabs').hidden=!camp;$('upgradeChoices').hidden=!camp||riftCampTab!=='loot';$('campShop').hidden=!camp||riftCampTab!=='loot';
 $('forgePanel').hidden=!camp||riftCampTab!=='forge';$('routePanel').hidden=!camp||riftCampTab!=='route';
 document.querySelectorAll('[data-camp-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.campTab===riftCampTab)));
 if(camp&&riftCampTab!=='loot'){$('overlayTitle').textContent=riftCampTab==='forge'?'다음 전투를 준비하세요':'어떤 길로 나아갈까요';$('overlayText').textContent=`보유 ${rift.coins} G · 준비 후 보급 · 유물에서 출발하세요.`;}
 const key=[rift.state,rift.stage,rift.coins,rift.weaponId,rift.weaponRank,rift.companionId,rift.pendingRouteId,rift.shrineChoice,p.hp,p.maxHp,p.mp].join('|');
 if(camp&&key!==riftFrontierKey){riftFrontierKey=key;riftOfferCards('forgeChoices',rift.forgeOffers,'forge');riftOfferCards('companionChoices',rift.companionOffers,'companion');riftOfferCards('shrineChoices',rift.shrineOffers,'shrine');
  $('routeChoices').replaceChildren();for(const item of RIFT_ROUTES){const b=document.createElement('button'),name=document.createElement('b'),desc=document.createElement('small');b.dataset.route=item.id;b.setAttribute('aria-pressed',String(rift.pendingRouteId===item.id));name.textContent=item.name;desc.textContent=item.desc;b.append(name,desc);$('routeChoices').append(b);}
 }
 if(!practice&&['lost','won'].includes(rift.state)&&riftJournalRecorded!==rift.runId){riftJournalRecorded=rift.runId;RiftJournal.record(rift);riftJournalData=RiftJournal.load();riftJournalUI();}
}
function riftJournalUI(){
 const data=riftJournalData;$('journalBadge').textContent=`${data.totals.runs}회 원정 · ${data.totals.wins}회 봉인`;
 $('journalTotals').replaceChildren();for(const [label,value] of [['완료 원정',data.totals.runs],['승리',data.totals.wins],['누적 처치',data.totals.kills],['누적 골드',data.totals.gold]]){const el=document.createElement('div'),b=document.createElement('b'),small=document.createElement('small');b.textContent=value.toLocaleString();small.textContent=label;el.append(b,small);$('journalTotals').append(el);}
 $('journalCodex').replaceChildren();for(const [title,items,found] of [['영웅',Object.entries(RIFT_CLASSES).map(([id,c])=>({id,name:c.name})),data.discovered.classes],['적',Object.entries(riftEnemyNames).map(([id,name])=>({id,name})),data.discovered.enemyTypes],['보스',RIFT_STAGES.map((s,i)=>({id:i,name:s.boss})),data.discovered.bosses],['유물',RIFT_RELICS,data.discovered.relics]]){
  const group=document.createElement('section'),heading=document.createElement('h4'),list=document.createElement('div');heading.textContent=`${title} · ${found.length}/${items.length}`;
  for(const item of items){const chip=document.createElement('span'),known=found.includes(item.id);chip.className=known?'discovered':'undiscovered';chip.textContent=known?item.name:'미발견';chip.title=known?item.name:'원정을 진행해 발견하세요';list.append(chip);}group.append(heading,list);$('journalCodex').append(group);
 }
 $('journalRuns').replaceChildren();for(const run of data.runs){const li=document.createElement('li'),b=document.createElement('b'),small=document.createElement('small');b.textContent=`${run.state==='won'?'봉인 성공':'원정 종료'} · ${RIFT_CLASSES[run.classId].name} Lv.${run.level} · ${run.score.toLocaleString()}점`;small.textContent=`${RIFT_DIFFICULTIES[run.difficultyId].name} · ${RIFT_STAGES[run.stage].name} · ${Math.floor(run.time/60)}분 ${Math.floor(run.time%60)}초 · ${new Date(run.endedAt).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'})}`;li.append(b,small);$('journalRuns').append(li);}
 if(!data.runs.length){const li=document.createElement('li');li.textContent='원정을 마치면 결과와 발견 목록을 이 브라우저에 기록합니다.';$('journalRuns').append(li);}
}
document.querySelectorAll('[data-camp-tab]').forEach(b=>b.onclick=()=>{riftCampTab=b.dataset.campTab;riftUI();});
for(const [id,attribute,method] of [['forgeChoices','forge','forge'],['companionChoices','companion','recruit'],['shrineChoices','shrine','chooseShrine'],['routeChoices','route','selectRoute']])$(id).addEventListener('click',event=>{const b=event.target.closest(`[data-${attribute}]`);if(b&&rift[method](b.dataset[attribute])){riftUI();riftSaveNow();}});
$('practiceBtn').onclick=()=>{if(rift.state!=='ready')return;riftPracticeReturn=rift;rift=new RiftPractice(rift.classId);riftClearInput();riftExpeditionKey='';riftFrontierKey='';$('practiceSpec').replaceChildren();for(const spec of RIFT_SPECIALIZATIONS[rift.classId]){const option=document.createElement('option');option.value=spec.id;option.textContent=spec.name;$('practiceSpec').append(option);}$('practiceSpec').value=rift.specializationId;riftUI();riftCanvas.focus({preventScroll:true});};
$('practiceSpec').onchange=()=>{if(rift.practice&&rift.switchSpecialization($('practiceSpec').value)){riftClearInput();riftUI();}};
$('resetTargetBtn').onclick=()=>{if(rift.practice){rift.resetTarget();riftUI();}};
$('exitPracticeBtn').onclick=()=>{if(!rift.practice||!riftPracticeReturn)return;rift=riftPracticeReturn;riftPracticeReturn=null;riftLast=0;riftClearInput();riftExpeditionKey='';riftFrontierKey='';$('runMessage').textContent='훈련을 마쳤습니다. 준비되면 원정을 시작하세요.';riftUI();};

function riftDrawFrontierFloor(){
 for(const box of rift.containers||[]){ctx.save();ctx.translate(box.x,box.y);const tint=box.kind==='urn'?'#9995b8':box.kind==='chest'?'#d7b979':'#9e7859';
  ctx.fillStyle='#050d1777';ctx.beginPath();ctx.ellipse(0,3,22,7,0,0,Math.PI*2);ctx.fill();
  if(box.opened){riftPoly([[-18,0],[-8,-9],[-4,2]],tint);riftPoly([[8,2],[12,-8],[22,0]],'#65523f');ctx.restore();continue;}
  if(box.kind==='urn'){riftPlate([[-10,-32],[10,-32],[8,-25],[17,-12],[13,-2],[-13,-2],[-17,-12],[-8,-25]],['#d7d1df',tint,'#555272']);riftLine(-8,-25,8,-25,2,'#ead6a2');}
  else{riftPlate([[-18,-29],[18,-29],[20,-1],[-20,-1]],['#b99d72',tint,'#594537']);for(const x of [-11,0,11])riftLine(x,-26,x,-3,1,'#4e3b2c');riftLine(-18,-22,18,-22,3,'#c4bd99');riftLine(-19,-8,19,-8,3,'#8b8c7c');if(box.kind==='chest')riftPlate([[-4,-18],[4,-18],[4,-9],[-4,-9]],['#f8df9b','#9f8142']);}
  riftText('파괴 가능',0,-40,8,'#c5c4b6','center');ctx.restore();
 }
}
function riftDrawFrontierEffects(){
 for(const e of rift.enemies){if(e.hp<=0)continue;const top=Math.max(118,e.y-(e.type==='boss'?180:109));if(e.burn>0){for(let i=0;i<4;i++){const x=e.x+(i-1.5)*11,dy=riftSettings.reducedMotion?0:Math.sin(rift.time*7+i)*5;riftPoly([[x-4,e.y-15],[x,e.y-36+dy],[x+5,e.y-15]],'#ffba6980');}riftText('화상',e.x,top,9,'#ffc18e','center');}if(e.fracture>0)riftText('방어 파쇄',e.x,top-12,9,'#eab6ff','center');if(e.broken>0){riftRune(e.x,e.y+3,42,'#ffe0a0bb',rift.time);riftText('무력화',e.x,top-24,13,'#ffe3a1','center');}}
 const p=rift.player;if(rift.weaponId){const color={edge:'#ffe2a1',focus:'#c6b6ff',ward:'#a1e1da'}[rift.weaponId];riftGlow(p.x+p.face*17,p.y-57,15,color+'60');}
 if(rift.companionId){const color={wisp:'#c5b2ff',sprite:'#b2ecb6',sentinel:'#a6dbe9'}[rift.companionId],x=p.x-p.face*38,y=p.y-76+(riftSettings.reducedMotion?0:Math.sin(rift.time*3)*5);riftGlow(x,y,25,color+'50');riftCircle(x,y,6,'#effbf7');riftCircle(x,y,4,color);if(rift.companionId==='sprite'){riftPoly([[x-4,y],[x-20,y-8],[x-15,y+3]],color+'99');riftPoly([[x+4,y],[x+20,y-8],[x+15,y+3]],color+'99');}else if(rift.companionId==='sentinel'){riftPoly([[x-9,y-8],[x+9,y-8],[x+7,y+7],[x,y+13],[x-7,y+7]],color+'60');}else riftRune(x,y,13,color+'b0',rift.time);}
 const boss=rift.enemies.find(e=>e.type==='boss'&&e.hp>0);if(boss){ctx.fillStyle='#141925';ctx.fillRect(360,70,240,4);ctx.fillStyle=boss.broken>0?'#ffdeb0':'#adabdc';ctx.fillRect(360,70,240*(boss.broken>0?1:(boss.stagger||0)/100),4);riftText(boss.broken>0?'방어 붕괴 · 피해 증가':'무력화 '+Math.round(boss.stagger||0)+'%',480,87,8,'#d1c9e0','center');}
 if(rift.practice)riftText('TRAINING · '+Math.floor(rift.trainingDamage)+' DAMAGE',480,112,11,'#acdfd0','center');
}
riftJournalUI();
