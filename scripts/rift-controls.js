'use strict';
// Input preferences and short-lived input queues are separate from expedition saves.
var RIFT_DEFAULT_BINDINGS=Object.freeze({attack:'j',skill:'k',burst:'l',special:'e',ultimate:'u',awakening:'r',dash:' ',potion:'h',guard:'q',focus:'f'});
var RiftControls=class RiftControls{
 constructor(storage){this.storage=storage;this.bindings={...RIFT_DEFAULT_BINDINGS};this.assist=false;this.pending=null;this.targetId=null;try{const raw=this.store?.getItem('riftBladeControlsV1');if(raw){const data=JSON.parse(raw),keys=Object.keys(RIFT_DEFAULT_BINDINGS);if(data?.version===1&&typeof data.assist==='boolean'&&data.bindings&&Object.keys(data.bindings).length===keys.length&&keys.every(a=>Object.hasOwn(data.bindings,a)&&this.validKey(data.bindings[a]))&&new Set(Object.values(data.bindings)).size===keys.length){this.bindings={...data.bindings};this.assist=data.assist;}}}catch{}}
 get store(){return this.storage===undefined?(typeof localStorage==='undefined'?null:localStorage):this.storage;}
 validKey(key){return typeof key==='string'&&(key===' '||/^[a-z0-9]$/.test(key)&&!['w','a','s','d','p','t'].includes(key));}
 actionFor(key){return Object.keys(this.bindings).find(a=>this.bindings[a]===String(key).toLowerCase())||null;}
 label(action){const key=this.bindings[action];return key===' '?'SPACE':(key||'').toUpperCase();}
 save(){try{this.store?.setItem('riftBladeControlsV1',JSON.stringify({version:1,bindings:this.bindings,assist:this.assist}));return true;}catch{return false;}}
 setBinding(action,key){key=String(key).toLowerCase();if(!Object.hasOwn(RIFT_DEFAULT_BINDINGS,action)||!this.validKey(key))return{ok:false,message:'이동키 W A S D, 성장 T, 일시정지 P를 제외한 영문·숫자·Space를 사용하세요.'};const used=this.actionFor(key);if(used&&used!==action)return{ok:false,message:`${this.label(used)} 키는 이미 다른 기술에 지정되어 있습니다.`};this.bindings[action]=key;this.clear();return{ok:true,saved:this.save()};}
 setAssist(value){this.assist=Boolean(value);this.clear();return this.save();}
 reset(){this.bindings={...RIFT_DEFAULT_BINDINGS};this.assist=false;this.clear();return this.save();}
 clear(){this.pending=null;this.targetId=null;}
 available(game,action){const p=game.player;if(game.state!=='playing'||!Object.hasOwn(RIFT_DEFAULT_BINDINGS,action))return false;if(action==='special'&&!game.specialUnlocked||action==='ultimate'&&!game.ultimateUnlocked||action==='awakening'&&!game.awakeningUnlocked)return false;if(action==='potion'&&!p.potions||action==='focus'&&!game.focusInfo?.ready)return false;return p.mp>=game.skillCost(action);}
 aim(game,action){this.targetId=null;if(!this.assist||!['attack','skill','special'].includes(action))return;const p=game.player,skill=game.getSkill(action),range=game.effectiveRange(action);if(!skill||skill.area||!range)return;let nearest=null,distance=Infinity;for(const enemy of game.enemies){const dx=enemy.x-p.x,dy=enemy.y-p.y;if(enemy.hp<=0||Math.abs(dy)>=(skill.width||40)||Math.abs(dx)>=range)continue;const d=Math.hypot(dx,dy);if(d<distance){nearest=enemy;distance=d;}}if(nearest){p.face=nearest.x<p.x?-1:1;this.targetId=nearest.id;}}
 execute(game,action){if(!this.available(game,action)||(game.player.cd[action]||0)>0)return false;this.aim(game,action);return Boolean(game.action(action));}
 trigger(game,action){if(this.execute(game,action)){this.pending=null;return true;}const cd=game.player.cd[action]||0;if(action!=='attack'&&this.available(game,action)&&cd>0&&cd<=.2)this.pending={game,action,remaining:.2};return false;}
 update(game,dt){if(!this.pending)return false;if(this.pending.game!==game||game.state!=='playing'){this.clear();return false;}const pending=this.pending;if(pending.remaining<-.000001){this.clear();return false;}pending.remaining-=Math.max(0,Math.min(.04,dt));if(this.execute(game,pending.action)){this.pending=null;return true;}return false;}
};
if(typeof module!=='undefined'&&module.exports)module.exports={RiftControls,RIFT_DEFAULT_BINDINGS};
