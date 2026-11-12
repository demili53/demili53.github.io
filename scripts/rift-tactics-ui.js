'use strict';
const riftActionLabels={attack:'기본 공격',skill:'직업 스킬',burst:'광역 스킬',special:'특수기',ultimate:'궁극기',awakening:'각성기',dash:'대시',potion:'물약',guard:'방어 · 반격',focus:'집중 해방'};
const riftCombatLog=new RiftCombatLog();
let riftBindingCapture=null,riftCombatVersion=-1,riftAchievementKey='',riftAchievementToastUntil=0;

function riftBindingsUI(){
 $('bindingList').replaceChildren();
 for(const action of Object.keys(RIFT_DEFAULT_BINDINGS)){const b=document.createElement('button'),label=document.createElement('span'),key=document.createElement('kbd');b.dataset.bind=action;label.textContent=riftActionLabels[action];key.textContent=riftBindingCapture===action?'입력…':riftControls.label(action);b.classList.toggle('listening',riftBindingCapture===action);b.setAttribute('aria-label',`${riftActionLabels[action]} 키 ${riftControls.label(action)} 변경`);b.append(label,key);$('bindingList').append(b);}
 document.querySelectorAll('[data-action] kbd').forEach(k=>{k.textContent=riftControls.label(k.closest('[data-action]').dataset.action);});
 $('aimAssistToggle').textContent='조준 보조 '+(riftControls.assist?'켜짐':'꺼짐');$('aimAssistToggle').setAttribute('aria-pressed',String(riftControls.assist));
}
$('controlsPanel').addEventListener('toggle',()=>{if($('controlsPanel').open&&rift.state==='playing')riftPause();if(!$('controlsPanel').open){riftBindingCapture=null;riftBindingsUI();}riftClearInput();});
$('bindingList').onclick=event=>{const b=event.target.closest('[data-bind]');if(!b)return;if(rift.state==='playing')riftPause();riftBindingCapture=b.dataset.bind;riftBindingsUI();$('bindingMessage').textContent=`${riftActionLabels[riftBindingCapture]}에 쓸 키를 누르세요. Esc로 취소합니다.`;document.querySelector(`[data-bind="${riftBindingCapture}"]`).focus();};
window.addEventListener('keydown',event=>{if(!riftBindingCapture||event.ctrlKey||event.metaKey||event.altKey)return;event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return;const action=riftBindingCapture;if(event.key==='Escape'){riftBindingCapture=null;$('bindingMessage').textContent='키 변경을 취소했습니다.';}else{const result=riftControls.setBinding(action,event.key);if(result.ok){riftBindingCapture=null;$('bindingMessage').textContent=`${riftActionLabels[action]} → ${riftControls.label(action)}${result.saved?' · 저장했습니다.':' · 이번 방문에만 적용됩니다.'}`;}else $('bindingMessage').textContent=result.message;}riftClearInput();riftBindingsUI();document.querySelector(`[data-bind="${action}"]`).focus();},true);
$('resetBindings').onclick=()=>{riftControls.reset();riftBindingCapture=null;riftClearInput();riftBindingsUI();$('bindingMessage').textContent='키와 조준 보조를 기본 설정으로 복원했습니다.';};
$('aimAssistToggle').onclick=()=>{riftControls.setAssist(!riftControls.assist);riftClearInput();riftBindingsUI();};
$('practiceMode').onchange=()=>{if(rift.practice){rift.setMode($('practiceMode').value);riftClearInput();riftUI();}};

function riftAchievementUI(){
 const data=RiftAchievements.load(),unlocked=data.unlocked;$('achievementCount').textContent=`${Object.keys(unlocked).length} / ${RIFT_ACHIEVEMENTS.length} 달성`;$('achievementList').replaceChildren();
 for(const badge of RIFT_ACHIEVEMENTS){const item=document.createElement('article'),icon=document.createElement('span'),title=document.createElement('b'),desc=document.createElement('small'),state=document.createElement('em');item.dataset.achievement=badge.id;item.classList.toggle('unlocked',Boolean(unlocked[badge.id]));icon.textContent=unlocked[badge.id]?'✦':'◇';icon.setAttribute('aria-hidden','true');title.textContent=badge.name;desc.textContent=badge.desc;state.textContent=unlocked[badge.id]?'달성 · '+new Date(unlocked[badge.id]).toLocaleDateString('ko-KR',{timeZone:'Asia/Seoul'}):'미달성';item.append(icon,title,desc,state);$('achievementList').append(item);}
}
function riftTacticsUI(){
 const p=rift.player,f=rift.focusInfo||{value:0,max:100,active:false,remaining:0,ready:false},g=rift.guardInfo||{};
 $('focusValue').textContent=f.active?`${f.remaining.toFixed(1)}초 강화 중`:`${Math.floor(f.value)} / ${f.max}`;$('focusBar').style.width=(f.active?f.remaining/6:f.value/f.max)*100+'%';$('focusBar').classList.toggle('active',f.active);
 $('guardCd').textContent=g.counterReady?'반격 준비 · 기본 공격':g.perfect?'정밀 방어':g.active?'피해 감소 중':p.cd.guard>0?p.cd.guard.toFixed(1)+'초':`마력 ${rift.skillCost('guard')}`;
 $('focusCd').textContent=f.active?'피해 +20%':f.ready?'집중 해방 준비':'직접 명중으로 충전';document.querySelector('[data-action="focus"]').disabled=rift.state!=='playing'||!f.ready;
 document.querySelector('[data-action="guard"]').classList.toggle('counter-ready',Boolean(g.counterReady));
 $('inputQueue').textContent=riftControls.pending?`${riftActionLabels[riftControls.pending.action]} 예약`:'';
 $('riftStatus').textContent=`${riftControls.label('attack')} 공격 · ${riftControls.label('skill')} / ${riftControls.label('burst')} 스킬 · ${riftControls.label('guard')} 방어 · ${riftControls.label('focus')} 집중 · ${riftControls.label('dash')} 대시 · T 성장 · P 정지`;
 if(rift.practice){$('practiceMode').value=rift.trainingMode;$('practiceMode').disabled=!['playing','paused'].includes(rift.state);$('practiceMetrics').textContent=`정밀 방어 ${rift.trainingParries} · 받은 피해 ${Math.round(rift.trainingDamageTaken)}`;$('runMessage').textContent=rift.trainingModeInfo.desc.replace(/Q/g,riftControls.label('guard'))+' 훈련 중 체력과 마력이 회복됩니다.';}
 riftCombatLog.update(rift);$('combatSummary').textContent=`정밀 방어 ${rift.stats.parries||0} · 반격 ${rift.stats.counters||0} · 집중 ${rift.stats.focusUses||0}`;
 if(riftCombatVersion!==riftCombatLog.version){riftCombatVersion=riftCombatLog.version;$('combatLog').replaceChildren();for(const entry of riftCombatLog.entries){const li=document.createElement('li'),time=document.createElement('time'),text=document.createElement('span');li.dataset.kind=entry.kind;time.textContent=`${String(Math.floor(entry.time/60)).padStart(2,'0')}:${String(Math.floor(entry.time%60)).padStart(2,'0')}`;text.textContent=entry.text;li.append(time,text);$('combatLog').append(li);}if(!riftCombatLog.entries.length){const li=document.createElement('li');li.textContent='전투를 시작하면 피해·정밀 방어·반격·돌파를 기록합니다.';$('combatLog').append(li);}}
 const key=[rift.runId,Boolean(rift.practice),rift.state,rift.stats.stagesCleared,rift.stats.parries,rift.stats.focusUses,rift.stats.maxCombo,rift.weaponRank,rift.specializationId].join('|');
 if(key!==riftAchievementKey){riftAchievementKey=key;const ids=RiftAchievements.record(rift);if(ids.length){riftAchievementUI();$('achievementToast').textContent='업적 달성 · '+ids.map(id=>RIFT_ACHIEVEMENTS.find(b=>b.id===id).name).join(' · ');riftAchievementToastUntil=Date.now()+7000;$('achievementToast').hidden=false;}}
 if(riftAchievementToastUntil&&Date.now()>riftAchievementToastUntil){$('achievementToast').hidden=true;riftAchievementToastUntil=0;}
}

function riftDrawTactics(){
 const p=rift.player,t=riftSettings.reducedMotion?0:rift.time;
 if(p.focusTime>0){riftRune(p.x,p.y+3,43,'#f6ce77cc',t*.5);riftGlow(p.x,p.y-47,77,'#ffdb8130');for(let i=0;i<5;i++){const x=p.x+Math.sin(i*3+t)*27,y=p.y-((t*37+i*21)%110);riftLine(x,y,x,y-9,1.2,'#ffe0a6aa');}riftText('집중 해방',p.x,p.y-135,11,'#ffdf9d','center');}
 if(p.guardWindow>0){ctx.save();ctx.translate(p.x+p.face*30,p.y-50);ctx.scale(p.face,1);const perfect=p.parryWindow>0,color=perfect?'#d7f5ff':'#83b5d5';riftPlate([[-6,-37],[21,-27],[24,15],[5,39],[-13,16]],['#b9eaff55','#5282a233','#253a5a33']);ctx.strokeStyle=color;ctx.lineWidth=perfect?3:1.5;ctx.beginPath();ctx.moveTo(-6,-37);ctx.lineTo(21,-27);ctx.lineTo(24,15);ctx.lineTo(5,39);ctx.lineTo(-13,16);ctx.closePath();ctx.stroke();riftLine(5,-24,5,22,2,color);riftLine(-6,-6,17,-6,2,color);ctx.restore();}
 if(p.counterWindow>0)riftText('반격 · '+riftControls.label('attack'),p.x,p.y-119,11,'#d1edff','center');
 for(const e of rift.enemies){if(e.hp<=0)continue;
  if(e.type==='sentinel'){const active=rift.enemyShieldActive(e),color=active?'#b8d6f0':'#657c91';ctx.save();ctx.translate(e.x+e.face*23,e.y-48);ctx.scale(e.face,1);if(!active)ctx.rotate(.28);riftPlate([[-14,-35],[14,-35],[21,-24],[18,21],[0,38],[-18,21],[-21,-24]],['#ccd9de',color,'#34475e']);riftPlate([[-9,-26],[9,-26],[12,16],[0,27],[-12,16]],['#436d87','#27435e','#182c45']);riftLine(0,-24,0,24,2,'#d8cba0');riftLine(-9,-4,9,-4,2,'#d8cba0');riftCircle(0,-4,4,'#f4dc9b');ctx.restore();riftText(active?'방패병 · 정면 방어':'방패병 · 빈틈',e.x,e.y-132,10,active?'#c6dbe9':'#e8bd9b','center');}
  if(e.type==='acolyte'){const x=e.x,y=e.y-98;ctx.save();ctx.strokeStyle='#adf0be';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y,16,6,0,0,Math.PI*2);ctx.stroke();riftPlate([[x-7,y+10],[x,y+2],[x+7,y+10],[x,y+21]],['#e0f9c9','#75c99a','#357568']);riftGlow(x,y+10,21,'#a2ffb53a');ctx.restore();riftText(e.healCast>0?'치유 시전 · 공격으로 중단':'치유사',x,e.y-125,10,'#b9edc4','center');if(e.healCast>0){const target=rift.enemies.find(v=>v.id===e.healTargetId&&v.hp>0);if(target){ctx.save();ctx.setLineDash([6,6]);riftLine(e.x,e.y-65,target.x,target.y-50,2,'#a2f2b6aa');ctx.restore();riftRune(target.x,target.y+2,37,'#a7eebea0',t);ctx.fillStyle='#0d2923';ctx.fillRect(x-27,y-20,54,4);ctx.fillStyle='#b4ebac';ctx.fillRect(x-27,y-20,54*Math.max(0,1-e.healCast/1.1),4);}}}
 }
 const target=rift.enemies.find(e=>e.id===riftControls.targetId&&e.hp>0);if(riftControls.assist&&target&&Math.abs(target.y-p.y)<90&&Math.abs(target.x-p.x)<650){const x=target.x,y=target.y-60;ctx.strokeStyle='#e2d29d';ctx.lineWidth=1.5;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*31,y-15);ctx.lineTo(x+side*39,y-15);ctx.lineTo(x+side*39,y+15);ctx.lineTo(x+side*31,y+15);ctx.stroke();}}
}
riftBindingsUI();riftAchievementUI();
