// Upgrades 41~44: disguised decoys, precision hits, first-shot streaks and the radio hint.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const box=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(__dirname,'sniper-core.js'),'utf8')+';this.Game=SniperGame;this.missions=SNIPER_MISSIONS;',box);
const fresh=()=>new box.Game(),advance=(g,s)=>{for(let i=0;i<Math.ceil(s/.05);i++)g.step(.05);};
const fireAt=(g,a,dy)=>{g.scoped=true;g.cooldown=0;g.aimAt(a.x,a.y+dy);const r=g.shoot();advance(g,2.6);return r;};
// 41: each mission hides near-miss decoys that differ from the target by exactly one clue.
for(const [i,m] of box.missions.entries()){
 const decoys=m.extras.filter(a=>a.decoy),t=m.targets[0];assert.equal(decoys.length,m.decoys);assert(decoys.length>=2);
 for(const d of decoys){assert.equal(d.target,false);assert(d.stripes&&d.hat==='beanie');
  const diffs=[d.glasses!==t.glasses,(d.scarf||null)!==(t.scarf||null),d.case&&d.caseColor!==0x19202b].filter(Boolean).length;assert.equal(diffs,1,`${i} ${d.desc}`);
  assert.notEqual(d.desc,t.desc);}
}
let g=fresh();g.start();const decoy=g.actors.find(a=>a.decoy==='glasses');assert.equal(fireAt(g,decoy,-24).kind,'protected');assert.equal(g.state,'failed');assert(g.failure.includes('가짜 윌리')&&g.failure.includes('안경'));assert.equal(g.shotHistory.at(-1).result,'가짜 윌리 사격');
// 42: head hits earn +250 and are recorded; body hits do not.
g=fresh();g.start();fireAt(g,g.actors[0],-24);assert.equal(g.report.bonus.precision,0);g.next();g.start();fireAt(g,g.actors[0],-41);assert.equal(g.report.bonus.precision,250);assert.equal(g.shotHistory.at(-1).result,'정밀 명중');
// 43: consecutive first-shot clears add a capped streak bonus; retry restores the checkpoint streak.
assert.equal(g.streak,2);assert.equal(g.report.bonus.streak,150);g.next();g.start();g.actors[0].cover=false;g.scoped=true;g.aimAt(30,40);g.shoot();advance(g,2.6);advance(g,3);fireAt(g,g.actors[0],-24);assert.equal(g.streak,0);assert.equal(g.report.bonus.streak,0);
g=fresh();g.start();fireAt(g,g.actors[0],-24);g.next();g.start();fireAt(g,g.actors.find(a=>!a.target),-24);assert.equal(g.streak,0);g.retry();assert.equal(g.streak,1);
// 44: the radio hint is once per mission, points at the target's third, blocks S grade and costs at most 200.
g=fresh();assert.equal(g.radioHint(),false);g.start();assert(g.radioHint());assert.equal(g.radioHint(),false);assert.equal(g.hintZone,Math.min(2,Math.floor(g.actors[0].motion.x/320)));
g.pause();const left=g.hintLeft;advance(g,2);assert.equal(g.hintLeft,left);g.pause();advance(g,6);assert.equal(g.hintLeft,0);
const before=g.score;fireAt(g,g.actors[0],-24);assert.equal(g.report.grade,'A');assert.equal(g.report.bonus.hint,-200);const b=g.report.bonus;assert.equal(g.score-before,b.hit+b.precision+b.time+b.stealth+b.streak+b.hint);
g.next();assert.equal(g.hintUsed,false);
console.log('PASS 41-44: one-clue decoys, precision hits, first-shot streaks and radio hint');
