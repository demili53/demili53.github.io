const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),model=html.match(/<script id="gameLogic">([\s\S]*?)<\/script>/)[1],ui=fs.readFileSync(path.join(__dirname,'bastion-convenience.js'),'utf8');
const context=vm.createContext({});vm.runInContext(model+'\n'+ui+'\nthis.testApi={Game:BastionGame,quickRepair:bastionQuickRepair,typing:bastionTypingTarget,categories:BASTION_SHOP_CATEGORIES,types:TYPES,nextSlot:bastionNextSlot};',context);
const {Game,quickRepair,typing,categories,types}=context.testApi;
for(const state of ['running','building']){
 const game=new Game(()=>.5);game.state=state;game.core=240;game.gold=90;assert(quickRepair(game));assert.equal(game.state,state);assert.equal(game.core,300);assert.equal(game.gold,30);assert.equal(game.runStats.repairs,1);assert.equal(quickRepair(game),false);assert.equal(game.runStats.repairs,1);
}
for(const state of ['idle','paused','reward','won','lost']){const game=new Game(()=>.5);game.state=state;game.core=100;const before=JSON.stringify(game);assert.equal(quickRepair(game),false);assert.equal(JSON.stringify(game),before);}
const poor=new Game(()=>.5);poor.state='running';poor.core=100;poor.gold=59;assert.equal(quickRepair(poor),false);
const failed={state:'running',gold:100,core:200,repair(){throw Error('unexpected');}};assert.throws(()=>quickRepair(failed),/unexpected/);assert.equal(failed.state,'running');
for(const tagName of ['INPUT','TEXTAREA','SELECT'])assert(typing({tagName}));assert(typing({tagName:'DIV',isContentEditable:true}));assert(typing({tagName:'SPAN',closest(){return {};}}));assert.equal(typing({tagName:'BUTTON'}),false);
const mapped=Object.values(categories).flatMap(c=>c.types||[]);assert.equal(new Set(mapped).size,mapped.length);assert.deepEqual(mapped.slice().sort(),Object.keys(types).sort());
console.log('PASS: quick repair real economy/state guards/restoration, typing exclusions and complete disjoint tower filters');

{const next=context.testApi.nextSlot,slots=[{tower:{}},{tower:null},{tower:{}},{tower:null}];assert.equal(next(slots,0,false),1);assert.equal(next(slots,1,true),2);assert.equal(next(slots,3,true),0);assert.equal(next([],0,false),-1);assert.equal(next([{tower:{}}],0,false),-1);assert.equal(next(slots,50,false),1);}
console.log('PASS: bounded cyclic slot selection');
