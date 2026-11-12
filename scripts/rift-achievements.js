'use strict';
var RIFT_ACHIEVEMENTS=Object.freeze([
 {id:'firstclear',name:'첫 번째 돌파',desc:'지역 하나를 끝까지 돌파하세요.'},
 {id:'complete',name:'균열의 정복자',desc:'여섯 지역을 모두 돌파하고 원정을 완수하세요.'},
 {id:'parry3',name:'흔들림 없는 방어',desc:'한 원정에서 정확한 패링을 3회 성공하세요.'},
 {id:'focus3',name:'몰입의 경지',desc:'한 원정에서 집중을 3회 발동하세요.'},
 {id:'combo30',name:'끊이지 않는 검격',desc:'30연속 명중을 달성하세요.'},
 {id:'forge3',name:'명장의 무기',desc:'무기 조율을 3단계까지 강화하세요.'},
 {id:'specialist',name:'새로운 경지',desc:'레벨 5에 도달하고 전직을 선택하세요.'},
 {id:'veteranwin',name:'숙련자의 증명',desc:'숙련 난이도로 원정을 완수하세요.'}
].map(badge=>Object.freeze(badge)));
var RiftAchievements=(()=>{
 const C=typeof module!=='undefined'&&module.exports?require('./rift-core.js'):{RiftGame,RIFT_CLASSES,RIFT_SPECIALIZATIONS};
 const KEY='riftBladeAchievementsV1',VERSION=1,MAX_BYTES=8192,ids=RIFT_ACHIEVEMENTS.map(badge=>badge.id);
 const fail=()=>{throw Error('Invalid achievements');};
 function plain(value){if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail();}
 function number(value,min=0,max=1e9){if(!Number.isSafeInteger(value)||value<min||value>max)fail();return value;}
 function empty(){return{version:VERSION,unlocked:{}};}
 function read(storage){
  const raw=storageDefault(storage).getItem(KEY);if(raw===null)return empty();if(typeof raw!=='string'||raw.length>MAX_BYTES)fail();const data=JSON.parse(raw);plain(data);
  if(Object.keys(data).length!==2||!Object.hasOwn(data,'version')||!Object.hasOwn(data,'unlocked')||data.version!==VERSION)fail();plain(data.unlocked);
  const keys=Object.keys(data.unlocked);if(keys.length>ids.length)fail();for(const id of keys){if(!ids.includes(id))fail();number(data.unlocked[id],1,8640000000000000);}return data;
 }
 function storageDefault(storage){return storage===undefined?globalThis.localStorage:storage;}
 function eligible(game){
  if(!(game instanceof C.RiftGame)||game.practice||!['playing','paused','talents','upgrade','won','lost'].includes(game.state))fail();
  if(!Object.hasOwn(C.RIFT_CLASSES,game.classId)||!['story','normal','veteran'].includes(game.difficultyId))fail();
  plain(game.stats);const stat=name=>number(Object.hasOwn(game.stats,name)?game.stats[name]:0),level=number(game.player.level,1,1000),rank=number(game.weaponRank,0,3);
  if(![null,'edge','focus','ward'].includes(game.weaponId)||(game.weaponId===null)!==(rank===0))fail();
  if(game.specializationId!==null&&!C.RIFT_SPECIALIZATIONS[game.classId].some(spec=>spec.id===game.specializationId))fail();
  const earned={firstclear:stat('stagesCleared')>=1,complete:game.state==='won',parry3:stat('parries')>=3,focus3:stat('focusUses')>=3,combo30:stat('maxCombo')>=30,forge3:rank===3,specialist:level>=5&&game.specializationId!==null,veteranwin:game.state==='won'&&game.difficultyId==='veteran'};
  return ids.filter(id=>earned[id]);
 }
 return Object.freeze({key:KEY,version:VERSION,
  load(storage){try{return read(storage);}catch{return empty();}},
  record(game,storage){try{
   const earned=eligible(game),data=read(storage),added=earned.filter(id=>!Object.hasOwn(data.unlocked,id));if(!added.length)return[];
   const timestamp=number(Date.now(),1,8640000000000000);for(const id of added)data.unlocked[id]=timestamp;storageDefault(storage).setItem(KEY,JSON.stringify(data));return added;
  }catch{return[];}}
 });
})();
if(typeof module!=='undefined'&&module.exports)module.exports={RiftAchievements,RIFT_ACHIEVEMENTS};
