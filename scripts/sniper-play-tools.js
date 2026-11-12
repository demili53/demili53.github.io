'use strict';
// Player-controlled aids never identify targets or change the campaign score.
class SniperPlayTools {
 constructor({game,pause,refresh}){
  this.game=game;this.pause=pause;this.refresh=refresh;this.actors=null;this.pins=new Set();this.clues=new Set();
  const el=id=>document.getElementById(id);this.el=el;
  const handed=el('leftHanded');try{handed.checked=localStorage.getItem('shadowSniperLeftHanded')==='1';}catch{}
  this.applyHandedness();handed.onchange=()=>{this.applyHandedness();try{localStorage.setItem('shadowSniperLeftHanded',handed.checked?'1':'0');}catch{}};
  const full=el('fullscreenSniper');full.hidden=!document.fullscreenEnabled;
  full.onclick=async()=>{try{if(document.fullscreenElement===el('sniperGamePanel'))await document.exitFullscreen();else await el('sniperGamePanel').requestFullscreen();}catch{el('displayStatus').textContent='이 브라우저에서는 전체화면을 사용할 수 없습니다.';}};
  document.addEventListener('fullscreenchange',()=>{const active=document.fullscreenElement===el('sniperGamePanel');full.textContent=active?'전체화면 닫기':'전체화면';full.setAttribute('aria-pressed',String(active));el('displayStatus').textContent='';});
  const help=el('controlsHelp');el('helpSniper').onclick=()=>{this.pause();help.showModal();};help.addEventListener('close',()=>el('helpSniper').focus({preventScroll:true}));
 }
 applyHandedness(){
  const ids=this.el('leftHanded').checked?['fireBtn','scopeBtn','focusBtn','reloadBtn','pauseSniper']:['scopeBtn','fireBtn','reloadBtn','focusBtn','pauseSniper'];
  const container=this.el('fireBtn').parentElement;for(const id of ids)container.append(this.el(id));
 }
 sync(game){
  if(this.actors===game.actors)return;
  this.actors=game.actors;this.pins.clear();this.clues.clear();this.el('noteSearch').value='';this.renderClues();this.renderPins();
 }
 renderClues(){
  const game=this.game();this.el('clueList').replaceChildren(...game.config.clues.map((text,i)=>{
   const button=document.createElement('button');button.className='sniper-clue';button.type='button';button.textContent=(this.clues.has(i)?'✓ ':'□ ')+text;button.setAttribute('aria-pressed',String(this.clues.has(i)));
   button.onclick=()=>{this.clues.has(i)?this.clues.delete(i):this.clues.add(i);button.textContent=(this.clues.has(i)?'✓ ':'□ ')+text;button.setAttribute('aria-pressed',String(this.clues.has(i)));this.updateClueCount();};return button;
  }));this.updateClueCount();
 }
 updateClueCount(){this.el('clueCheckCount').textContent=`직접 확인한 단서 ${this.clues.size}/${this.game().config.clues.length} · 정답을 자동 판별하지 않습니다.`;}
 focusNote(number){(this.el('observationList').querySelector(`[data-note-number="${number}"]`)||this.el('noteSearch')).focus({preventScroll:true});}
 renderNotes(notes){
  this.el('observationList').replaceChildren(...notes.map(note=>{const li=document.createElement('li'),text=document.createElement('span'),button=document.createElement('button');text.textContent=note.description;button.type='button';button.className='sniper-pin';button.dataset.noteNumber=String(note.number);button.textContent=this.pins.has(note.number)?'고정 해제':'메모 고정';button.setAttribute('aria-pressed',String(this.pins.has(note.number)));button.setAttribute('aria-label',`${note.description} · ${button.textContent}`);button.onclick=()=>{this.pins.has(note.number)?this.pins.delete(note.number):this.pins.add(note.number);this.renderPins();this.refresh();this.focusNote(note.number);};li.append(text,button);return li;}));
 }
 renderPins(){
  const notes=this.game().observationNotes().filter(note=>this.pins.has(note.number));this.el('pinnedNotes').hidden=!notes.length;
  this.el('pinnedNoteList').replaceChildren(...notes.map(note=>{const li=document.createElement('li'),button=document.createElement('button');li.append(document.createTextNode(note.description+' '));button.type='button';button.className='sniper-pin';button.textContent='해제';button.setAttribute('aria-label',note.description+' 고정 해제');button.onclick=()=>{this.pins.delete(note.number);this.renderPins();this.refresh();};li.append(button);return li;}));
 }
}
