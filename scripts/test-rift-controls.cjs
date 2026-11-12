'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {RiftGame}=require('./rift-core');
const {RiftControls,RIFT_DEFAULT_BINDINGS}=require('./rift-controls');
function fixture(){const game=new RiftGame();game.start();game.containers=[];game.enemies=[{id:7,type:'guard',x:280,y:340,hp:10000,maxHp:10000,face:-1,stun:100,wind:0,cd:100,flash:0}];return game;}
function memory(){const data=new Map();return{getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value)};}

test('remapping persists, keeps movement reserved, and rejects duplicate/corrupt settings',()=>{
 const store=memory(),controls=new RiftControls(store);assert.deepEqual(controls.bindings,RIFT_DEFAULT_BINDINGS);assert(controls.setBinding('attack','Z').ok);assert.equal(controls.actionFor('z'),'attack');assert.equal(controls.actionFor('j'),null);assert(!controls.setBinding('skill','z').ok);for(const key of ['w','a','s','d','p','t','Escape','ArrowLeft','!'])assert(!controls.setBinding('skill',key).ok);assert(!controls.setBinding('__proto__','x').ok);controls.setAssist(true);const loaded=new RiftControls(store);assert.equal(loaded.bindings.attack,'z');assert.equal(loaded.assist,true);assert.equal(loaded.label('dash'),'SPACE');store.setItem('riftBladeControlsV1',JSON.stringify({version:1,assist:true,bindings:{...RIFT_DEFAULT_BINDINGS,skill:'j'}}));assert.deepEqual(new RiftControls(store).bindings,RIFT_DEFAULT_BINDINGS);store.setItem('riftBladeControlsV1','not-json');assert.doesNotThrow(()=>new RiftControls(store));const blocked=new RiftControls({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});assert.deepEqual(blocked.setBinding('attack','z'),{ok:true,saved:false});
});

test('skill gates and invalid game states cannot queue or spend resources',()=>{
 const game=fixture(),controls=new RiftControls(null);assert(!controls.trigger(game,'special'));assert(!controls.trigger(game,'ultimate'));assert(!controls.trigger(game,'awakening'));assert(!controls.trigger(game,'focus'));game.player.mp=0;assert(!controls.trigger(game,'guard'));assert.equal(controls.pending,null);for(const state of ['ready','paused','talents','upgrade','won','lost']){game.state=state;const before=JSON.stringify(game);for(const action of Object.keys(RIFT_DEFAULT_BINDINGS))assert(!controls.trigger(game,action));assert.equal(JSON.stringify(game),before);}
});

test('a 0.2-second buffered skill fires once at common frame rates and fractional boundaries',()=>{
 for(const dt of [1/30,1/60,1/120,.025,.033,.04]){const game=fixture(),controls=new RiftControls(null);game.player.cd.skill=.2;assert(!controls.trigger(game,'skill'));assert.equal(controls.pending.action,'skill');let fired=0;for(let frame=0;frame<Math.ceil(.35/dt);frame++){game.step(dt);if(controls.update(game,dt))fired++;}assert.equal(fired,1,'buffer dropped at dt='+dt);assert.equal(game.effects.filter(effect=>effect.kind==='skill').length,1);assert.equal(controls.pending,null);}
});

test('buffer excludes basic attacks and cancels on pause, replacement, guard or focus',()=>{
 const game=fixture(),controls=new RiftControls(null);game.player.cd.attack=.1;controls.trigger(game,'attack');assert.equal(controls.pending,null);game.player.cd.skill=.21;controls.trigger(game,'skill');assert.equal(controls.pending,null);game.player.cd.skill=.1;controls.trigger(game,'skill');assert(controls.pending);game.pause();assert(!controls.update(game,.04));assert.equal(controls.pending,null);game.pause();controls.trigger(game,'skill');assert(!controls.update(fixture(),.04));assert.equal(controls.pending,null);controls.trigger(game,'skill');assert(controls.trigger(game,'guard'));assert.equal(controls.pending,null);game.player.cd.skill=.1;controls.trigger(game,'skill');game.player.focus=100;assert(controls.trigger(game,'focus'));assert.equal(controls.pending,null);assert.equal(game.stats.focusUses,1);controls.clear();assert.equal(controls.targetId,null);
});

test('assist uses actual strict attack bounds instead of turning toward un-hittable boundary targets',()=>{
 const game=fixture(),controls=new RiftControls(null);controls.setAssist(true);game.enemies=[{...game.enemies[0],id:1,x:230,y:376},{...game.enemies[0],id:2,x:290,y:340}];assert(controls.trigger(game,'attack'));assert.equal(controls.targetId,2);assert.equal(game.player.face,1);assert.equal(game.enemies[0].hp,10000);assert(game.enemies[1].hp<10000);game.player.cd.attack=0;game.enemies=[{...game.enemies[0],id:3,x:game.player.x-game.effectiveRange('attack'),y:340}];controls.aim(game,'attack');assert.equal(controls.targetId,null);
});

test('assist turns toward living targets without widening range or redirecting area skills',()=>{
 const game=fixture(),controls=new RiftControls(null);controls.setAssist(true);game.enemies=[{...game.enemies[0],id:1,x:225,hp:0},{...game.enemies[0],id:2,x:200},{...game.enemies[0],id:3,x:300,y:450}];const originalX=game.player.x,originalY=game.player.y;assert(controls.trigger(game,'attack'));assert.equal(controls.targetId,2);assert.equal(game.player.face,-1);assert.equal(game.player.x,originalX);assert.equal(game.player.y,originalY);assert.equal(game.enemies[2].hp,10000);controls.aim(game,'burst');assert.equal(controls.targetId,null);assert.equal(game.player.face,-1);
});

test('the real frame loop preserves assisted held attacks while moving and honors remapped attack keys',()=>{
 const game=fixture(),controls=new RiftControls(null);game.enemies[0].x=190;controls.setAssist(true);controls.setBinding('attack','z');const keys=new Set(['d','z']);const source=fs.readFileSync(require.resolve('./rift-blade.js'),'utf8'),start=source.lastIndexOf('function riftFrame(ms){');assert(start>=0);const context=vm.createContext({rift:game,riftLast:1000,riftKeys:keys,riftTouches:new Map(),riftControls:controls,riftDraw(){},riftPortrait(){},riftUI(){},riftManageSave(){},riftAudio:{sync(){}},requestAnimationFrame(){}});vm.runInContext(source.slice(start),context);context.riftFrame(1040);assert(game.player.x>240,'movement must remain active');assert.equal(game.player.face,-1,'assist must run after movement changes facing');assert(game.enemies[0].hp<10000,'held attack must hit the target behind the movement direction');keys.delete('d');for(let frame=2;frame<=10;frame++)context.riftFrame(1000+frame*40);assert(game.stats.damageDealt>22,'holding the remapped key must repeat basics');keys.delete('z');keys.add('j');game.player.cd.attack=0;const before=game.stats.damageDealt;context.riftFrame(1440);assert.equal(game.stats.damageDealt,before,'old binding must stop attacking');
});

test('the real keyboard handler preserves native controls and modifiers without duplicating repeat actions',()=>{
 const game=fixture(),controls=new RiftControls(null),keys=new Set(),source=fs.readFileSync(require.resolve('./rift-blade.js'),'utf8');const start=source.indexOf("window.addEventListener('keydown',e=>{if(/INPUT"),end=source.indexOf("\nwindow.addEventListener('keyup'",start);let handler;const context=vm.createContext({rift:game,riftKeys:keys,riftControls:controls,riftMappedAction:key=>controls.actionFor(key),riftInputAction:action=>controls.trigger(game,action),riftPause:()=>{game.pause();controls.clear();keys.clear();},riftTree:()=>game.toggleTalents(),window:{addEventListener(type,fn){assert.equal(type,'keydown');handler=fn;}}});vm.runInContext(source.slice(start,end),context);function fire(overrides={}){let prevented=false;const event={key:'j',repeat:false,ctrlKey:false,metaKey:false,altKey:false,target:{tagName:'CANVAS',closest(){return null;}},preventDefault(){prevented=true;},...overrides};handler(event);return prevented;}
 for(const modifier of ['ctrlKey','metaKey','altKey'])assert(!fire({[modifier]:true}));for(const tagName of ['INPUT','TEXTAREA','SELECT'])assert(!fire({target:{tagName}}));assert(!fire({target:{tagName:'DIV',isContentEditable:true}}));for(const tagName of ['BUTTON','SUMMARY','A'])assert(!fire({key:' ',target:{tagName,closest(){return this;}}}));assert.equal(game.stats.damageDealt,0);assert.equal(keys.size,0);assert(fire());const damage=game.stats.damageDealt;game.player.cd.attack=0;assert(fire({repeat:true}));assert.equal(game.stats.damageDealt,damage);assert(keys.has('j'));assert(fire({key:'p'}));assert.equal(game.state,'paused');assert.equal(keys.size,0);
});
