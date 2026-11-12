/* Small UI affordances. All purchases continue through the game's own guarded methods. */
const BASTION_SHOP_CATEGORIES={
 all:{label:'전체',types:null},
 single:{label:'단일',types:['arrow','sniper']},
 area:{label:'범위',types:['cannon','laser','tesla','flame','venom']},
 control:{label:'제어',types:['frost','gravity']},
 support:{label:'지원',types:['banner']}
};
function bastionTypingTarget(target){
 return !!target&&(!!target.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)||!!target.closest?.('[contenteditable]:not([contenteditable="false"])'));
}
function bastionQuickRepair(game){
 if(!game||!['running','building'].includes(game.state)||game.gold<60||game.core>=300)return false;
 const state=game.state;
 try{game.state='building';return game.repair();}
 finally{game.state=state;}
}
function bastionNextSlot(slots,current,occupied){
 if(!Array.isArray(slots)||!slots.length)return -1;const start=Number.isInteger(current)&&current>=0&&current<slots.length?current:-1;
 for(let n=1;n<=slots.length;n++){const i=(start+n)%slots.length;if(!!slots[i]?.tower===occupied)return i;}return -1;
}
function installBastionConvenience({getGame,refresh=()=>{},notify=()=>{},getSelected=()=>0,selectSlot=null}){
 if(installBastionConvenience.instance)return installBastionConvenience.instance;
 const choices=document.getElementById('buildChoices'),rewards=document.getElementById('rewardChoices'),toolbar=document.querySelector('.tactical-tools');
 if(!choices||!rewards||!toolbar)throw new Error('Bastion convenience requires the shop, rewards and tactical toolbar.');
 const style=document.createElement('style');style.textContent=`
  .bastion-shop-filter{display:flex;flex-wrap:wrap;gap:5px;margin:9px 0}
  #shopCategoryFilters[hidden],#shopPurchaseOptions[hidden],#movementPad[hidden]{display:none!important}
  #shopPurchaseOptions,#shopSlotNavigation{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0;font-size:12px}
  #shopPurchaseOptions select{padding:7px;border-radius:6px;background:#172a2c;color:#f1e8d4;border:1px solid #658274;max-width:100%}
  #shopSlotNavigation .btn{min-height:44px;padding:8px 10px}
  #movementControls{padding:10px 14px;border-top:1px solid #314148;color:#c7dcd3;font-size:13px}
  #movementToggleLabel{display:flex;align-items:center;gap:7px;min-height:34px}
  #movementPad{display:grid;grid-template-columns:repeat(3,52px);grid-template-rows:repeat(2,48px);gap:6px;justify-content:center;margin:8px auto}
  #movementPad button{min-width:48px;min-height:48px;touch-action:none;user-select:none;-webkit-user-select:none;font-size:23px;padding:4px}
  #movementPad [aria-pressed=true]{background:#526a50;border-color:#f4d79a}
  #movementPad [data-direction=up]{grid-column:2;grid-row:1}#movementPad [data-direction=left]{grid-column:1;grid-row:2}#movementPad [data-direction=down]{grid-column:2;grid-row:2}#movementPad [data-direction=right]{grid-column:3;grid-row:2}
  #movementHelp{font-size:12px;line-height:1.6;color:#afc5ba;margin:4px 0}
  .bastion-shop-filter .btn{padding:7px 10px;font-size:12px;min-height:36px}
  .bastion-shop-filter [aria-pressed=true]{border-color:#edca8b;background:#3b4b3d;color:#ffe2ac}
  #buildChoices [data-weapon][hidden]{display:none!important}
  #rewardShortcutHint{font-size:12px;line-height:1.6;color:#cfddc9;margin:8px 0}
  #quickRepair{white-space:normal;text-align:center}
 `;document.head.append(style);
 const filters=document.createElement('div');filters.id='shopCategoryFilters';filters.className='bastion-shop-filter';filters.setAttribute('role','group');filters.setAttribute('aria-label','타워 종류 필터');
 let category='all',lastGold=null;const categoryButtons=new Map();
 const purchaseOptions=document.createElement('div');purchaseOptions.id='shopPurchaseOptions';
 const sortLabel=document.createElement('label');sortLabel.htmlFor='shopSort';sortLabel.textContent='정렬';const sort=document.createElement('select');sort.id='shopSort';
 for(const [value,label]of [['native','기본 순서'],['cost','가격 낮은 순']]){const option=document.createElement('option');option.value=value;option.textContent=label;sort.append(option);}
 const affordableLabel=document.createElement('label'),affordable=document.createElement('input');affordable.type='checkbox';affordable.id='shopAffordable';affordableLabel.append(affordable,' 구매 가능만');purchaseOptions.append(sortLabel,sort,affordableLabel);
 const nativeOrder=new Map(Object.keys(TYPES).map((type,i)=>[type,i]));
 const observer=new MutationObserver(()=>applyFilters());
 function applyFilters(){
  const weapons=Array.from(choices.querySelectorAll('[data-weapon]'));filters.hidden=purchaseOptions.hidden=weapons.length===0;
  const allowed=BASTION_SHOP_CATEGORIES[category].types,gold=getGame()?.gold||0;lastGold=gold;
  const sorted=weapons.slice().sort((a,b)=>sort.value==='cost'?(TYPES[a.dataset.weapon]?.cost||0)-(TYPES[b.dataset.weapon]?.cost||0)||(nativeOrder.get(a.dataset.weapon)-nativeOrder.get(b.dataset.weapon)):nativeOrder.get(a.dataset.weapon)-nativeOrder.get(b.dataset.weapon));
  if(weapons.some((node,i)=>node!==sorted[i])){
   const focused=document.activeElement;let index=0;const children=Array.from(choices.children).map(node=>node.matches('[data-weapon]')?sorted[index++]:node);
   observer.disconnect();choices.replaceChildren(...children);observer.observe(choices,{childList:true});if(focused?.isConnected&&focused.matches?.('[data-weapon]'))focused.focus({preventScroll:true});
  }
  for(const weapon of weapons)weapon.hidden=(!!allowed&&!allowed.includes(weapon.dataset.weapon))||(affordable.checked&&(TYPES[weapon.dataset.weapon]?.cost||0)>gold);
  for(const [id,button]of categoryButtons)button.setAttribute('aria-pressed',String(id===category));
  const focused=document.activeElement;if(focused?.matches?.('[data-weapon]')&&focused.hidden)categoryButtons.get(category)?.focus({preventScroll:true});
 }
 for(const [id,spec]of Object.entries(BASTION_SHOP_CATEGORIES)){
  const button=document.createElement('button');button.type='button';button.className='btn';button.textContent=spec.label;button.dataset.category=id;button.setAttribute('aria-pressed',String(id==='all'));button.addEventListener('click',()=>{category=id;applyFilters();});filters.append(button);categoryButtons.set(id,button);
 }
 sort.addEventListener('change',applyFilters);affordable.addEventListener('change',applyFilters);
 const slotNavigation=document.createElement('div');slotNavigation.id='shopSlotNavigation';
 function makeSlotButton(id,label,occupied){const button=document.createElement('button');button.id=id;button.type='button';button.className='btn';button.textContent=label;button.onclick=()=>{const game=getGame();if(!game||!['running','building'].includes(game.state)||typeof selectSlot!=='function')return;const next=bastionNextSlot(game.slots,getSelected(),occupied);if(next>=0)selectSlot(next);};slotNavigation.append(button);return button;}
 const nextEmpty=makeSlotButton('nextEmptySlot','다음 빈 지점',false),nextTower=makeSlotButton('nextTowerSlot','다음 타워',true);
 choices.before(slotNavigation,filters,purchaseOptions);observer.observe(choices,{childList:true});
 // Pointer-held pad: state is consumed by the existing game loop, never by a separate timer.
 const movement=document.createElement('div');movement.id='movementControls';const toggleLabel=document.createElement('label');toggleLabel.id='movementToggleLabel';const movementToggle=document.createElement('input');movementToggle.type='checkbox';movementToggle.id='movementPadEnabled';toggleLabel.append(movementToggle,' 화면 이동 버튼');
 const pad=document.createElement('div');pad.id='movementPad';pad.setAttribute('role','group');pad.setAttribute('aria-label','이동 방향 버튼');const movementHelp=document.createElement('p');movementHelp.id='movementHelp';movementHelp.textContent='방향 버튼을 누르고 있는 동안 이동합니다.';movement.append(toggleLabel,pad,movementHelp);toolbar.after(movement);
 try{movementToggle.checked=localStorage.getItem('dawnBastionMovementPad')==='1';}catch{}
 const held=new Map(),directionButtons=new Map(),directions={up:{x:0,y:-1,label:'위로 이동',glyph:'↑'},left:{x:-1,y:0,label:'왼쪽으로 이동',glyph:'←'},down:{x:0,y:1,label:'아래로 이동',glyph:'↓'},right:{x:1,y:0,label:'오른쪽으로 이동',glyph:'→'}};
 let movementGame=null;
 function movementAllowed(){const game=getGame();return !!game&&movementToggle.checked&&!document.hidden&&['running','building'].includes(game.state)&&!!game.rules?.mobile;}
 function showHeld(){for(const [direction,button]of directionButtons)button.setAttribute('aria-pressed',String([...held.values()].some(item=>item.direction===direction)));}
 function clearMovement(){if(!held.size)return;const active=[...held.entries()];held.clear();for(const [id,item]of active){try{if(item.button.hasPointerCapture(id))item.button.releasePointerCapture(id);}catch{}}showHeld();}
 function release(event){if(held.delete(event.pointerId))showHeld();}
 for(const [direction,spec]of Object.entries(directions)){
  const button=document.createElement('button');button.type='button';button.className='btn';button.dataset.direction=direction;button.textContent=spec.glyph;button.setAttribute('aria-label',spec.label);button.setAttribute('aria-pressed','false');
  button.addEventListener('pointerdown',event=>{if(event.button!==0||!movementAllowed())return;event.preventDefault();event.stopPropagation();held.set(event.pointerId,{direction,button});try{button.setPointerCapture(event.pointerId);}catch{}showHeld();});
  for(const eventName of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(eventName,release);
  button.addEventListener('click',event=>event.preventDefault());directionButtons.set(direction,button);pad.append(button);
 }
 const visibility=()=>{if(document.hidden)clearMovement();};window.addEventListener('blur',clearMovement);document.addEventListener('visibilitychange',visibility);window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);
 movementToggle.addEventListener('change',()=>{clearMovement();try{localStorage.setItem('dawnBastionMovementPad',movementToggle.checked?'1':'0');}catch{}update();});
 function getMovement(){if(movementGame!==getGame()){clearMovement();movementGame=getGame();}if(!movementAllowed()){clearMovement();return {x:0,y:0};}let x=0,y=0;for(const item of held.values()){x+=directions[item.direction].x;y+=directions[item.direction].y;}return {x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y))};}
 const hint=document.createElement('p');hint.id='rewardShortcutHint';hint.textContent='보상 단축키: 1 · 2 · 3 (왼쪽부터)';rewards.before(hint);
 const quickRepair=document.createElement('button');quickRepair.id='quickRepair';quickRepair.type='button';quickRepair.className='btn';quickRepair.textContent='빠른 수리 R · 60';quickRepair.disabled=true;toolbar.append(quickRepair);
 function repair(){
  const game=getGame();if(!bastionQuickRepair(game))return false;
  refresh();update();notify('수정 수리 완료 · 에테르 60 사용 · 수정 최대 90 회복');return true;
 }
 // The existing outside-click handler closes the live build popup. Keep this button from closing it.
 quickRepair.addEventListener('pointerdown',event=>event.stopPropagation());quickRepair.addEventListener('click',repair);
 function onKey(event){
  if(event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||bastionTypingTarget(event.target))return;
  const game=getGame();if(!game)return;const key=event.key.toLowerCase();
  if(game.state==='reward'&&/^[1-3]$/.test(key)){
   event.preventDefault();event.stopImmediatePropagation();const button=rewards.querySelectorAll('button')[Number(key)-1];if(button&&!button.disabled)button.click();return;
  }
  if(key==='r'&&['running','building'].includes(game.state)){event.preventDefault();event.stopImmediatePropagation();repair();}
 }
 window.addEventListener('keydown',onKey,true);
 function update(){
  const game=getGame();quickRepair.disabled=!game||!['running','building'].includes(game.state)||game.gold<60||game.core>=300;
  const noRepair=game?.mission==='noRepair';quickRepair.textContent=noRepair?'수리 R · 60 · 무수리 조건 실패':'빠른 수리 R · 60';quickRepair.title='수정 최대 90 회복 · 60 에테르'+(noRepair?' · 구매하면 무수리 도전을 달성할 수 없습니다.':'');
  hint.hidden=game?.state!=='reward';if(lastGold!==game?.gold)applyFilters();
  const selecting=!!game&&['running','building'].includes(game.state)&&typeof selectSlot==='function';nextEmpty.disabled=!selecting||bastionNextSlot(game.slots,getSelected(),false)<0;nextTower.disabled=!selecting||bastionNextSlot(game.slots,getSelected(),true)<0;
  if(movementGame!==game){clearMovement();movementGame=game;}if(!movementAllowed())clearMovement();pad.hidden=!movementToggle.checked;movementHelp.hidden=!movementToggle.checked;movementHelp.textContent=game?.rules?.mobile?'방향 버튼을 누르고 있는 동안 이동합니다.':'요새전에서는 수호자가 이동하지 않습니다.';for(const button of directionButtons.values())button.disabled=!movementAllowed();
 }
 function dispose(){clearMovement();window.removeEventListener('blur',clearMovement);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);movement.remove();slotNavigation.remove();purchaseOptions.remove();observer.disconnect();window.removeEventListener('keydown',onKey,true);filters.remove();hint.remove();quickRepair.remove();style.remove();for(const weapon of choices.querySelectorAll('[data-weapon]'))weapon.hidden=false;delete installBastionConvenience.instance;}
 const api={update,dispose,getMovement};installBastionConvenience.instance=api;applyFilters();update();return api;
}
