'use strict';
// Rules test for 운빨좆망겜. Run: node scripts/test-fog-front.cjs
const assert=require('node:assert/strict');
const F=require('./fog-core.js');
const {FogGame,HEROES,SCOUT_TIME,ROWS,COLS,BASE_HP}=F;
const quiet=g=>{g.sides.opp.ai=false;return g;};
const clearBoard=(g,side)=>{for(const u of g.units.filter(x=>x.side===side))g.removeUnit(u);};

// Layout: both boards get the same fog contents (mirrored), start area of 3 cells is revealed.
{const g=new FogGame({seed:7});const count=side=>{const n={};g.sides[side].cells.flat().forEach(c=>{n[c.content]=(n[c.content]||0)+1;});return n;};
 assert.deepEqual(count('me'),count('opp'));assert.equal(count('me').lair,5);
 assert.equal(g.sides.me.cells.flat().filter(c=>!c.fog).length,3);assert(!g.sides.me.cells[0][0].fog&&!g.sides.opp.cells[ROWS-1][0].fog);
 for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++)assert.equal(g.sides.me.cells[r][c].content,g.sides.opp.cells[ROWS-1-r][c].content);
 assert.equal(g.units.filter(u=>u.side==='me').length,2);}

// Scouting: only fog cells touching revealed land; time depends on population (10/8/5/4s); scouts cannot fight.
assert.deepEqual(SCOUT_TIME,{1:10,2:8,3:5,4:4});
for(const type of ['scout','guard','storm','warden']){
 const g=quiet(new FogGame({seed:3}));clearBoard(g,'me');const cells=g.sides.me.cells;cells[1][1].content='crystal';
 const u=g.addUnit('me',type,{r:0,c:1});assert(!g.scoutable('me',3,3));assert(!g.dropUnit('me',u.id,3,3));
 assert.equal(g.dropTarget('me',1,1),'scout');const before=g.sides.me.crystal;assert(g.dropUnit('me',u.id,1,1));
 const t=SCOUT_TIME[HEROES[type].pop];assert.equal(u.scout.total,t);
 g.monsters.push({id:999,kind:'crawler',hp:50,max:50,x:F.cellCenter('me',1,1).x,y:F.cellCenter('me',1,1).y,pts:[[0,0],[0,0]],seg:0,dist:0,speed:0,armor:0,target:'me',leak:1,bounty:1});
 for(let i=0;i<(t-.2)*60;i++)g.step(1/60);assert(cells[1][1].fog&&u.scout,'still scouting');assert.equal(g.shots.length,0,'scouting hero never fires');
 for(let i=0;i<30;i++)g.step(1/60);assert(!cells[1][1].fog&&!u.scout);assert(g.sides.me.crystal>before,'crystal found');}

// Scout failure: hitting a lair kills the scout, reveals the lair; heroes in range attack it and get the reward.
{const g=quiet(new FogGame({seed:5}));clearBoard(g,'me');const cells=g.sides.me.cells;cells[0][2].content='lair';cells[0][2].kind='nest';
 const s=g.addUnit('me','scout',{r:0,c:1}),a=g.addUnit('me','archer',{r:1,c:0});g.dropUnit('me',s.id,0,2);
 for(let i=0;i<10.2*60;i++)g.step(1/60);assert(!g.units.includes(s),'scout died');assert(cells[0][2].lair&&!cells[0][2].fog);
 g.addUnit('me','warden',{r:0,c:1});const cr=g.sides.me.crystal;for(let i=0;i<60*60&&cells[0][2].lair;i++){g.phase='prep';g.prepT=99;g.step(1/60);}
 assert(!cells[0][2].lair,'lair destroyed');assert(g.sides.me.crystal>=cr+80);assert.equal(g.sides.me.lairs,1);assert(g.units.includes(a));}

// Allies: rock-paper-scissors. Win = free hero, lose = nothing, draw = replay.
{let wins=0,losses=0,draws=0;for(let seed=1;seed<60;seed++){const g=quiet(new FogGame({seed}));g.sides.me.rps={r:0,c:1,t:10,round:1};const n=g.units.length;const res=g.playRps('me',0);
  if(res.res==='win'){wins++;assert.equal(g.units.length,n+1);assert(!g.sides.me.rps);}else if(res.res==='lose'){losses++;assert.equal(g.units.length,n);assert(!g.sides.me.rps);}else{draws++;assert(g.sides.me.rps);}
  if(res.res!=='draw')assert.equal(res.res,(res.pick+1)%3===res.foe?'win':'lose');}
 assert(wins&&losses&&draws);}

// Summon spends crystal, respects population 20 and free cells; merging two equal heroes makes a 2-star and frees population.
{const g=quiet(new FogGame({seed:9}));clearBoard(g,'me');g.sides.me.cells.flat().forEach(c=>{c.fog=false;c.content='empty';});g.sides.me.crystal=99999;
 while(g.canSummon('me'))g.summon('me');assert.equal(g.popUsed('me')<=20,true);assert(g.popUsed('me')>=17);
 const g2=quiet(new FogGame({seed:9}));clearBoard(g2,'me');const a=g2.addUnit('me','archer',{r:0,c:0}),b=g2.addUnit('me','archer',{r:0,c:1});
 assert.equal(g2.dropTarget('me',0,1,a.id),'merge');const dmg=g2.unitDamage(b);assert(g2.dropUnit('me',a.id,0,1));assert.equal(b.star,2);assert(!g2.units.includes(a));assert.equal(g2.popUsed('me'),1);assert(g2.unitDamage(b)>dmg*1.8);
 const c=g2.addUnit('me','guard',{r:1,c:0});assert.equal(g2.dropTarget('me',0,1,c.id),'swap');}

// Waves: odd stages go to the opponent's base, even stages to mine; a leak costs base HP.
{const g=new FogGame({seed:2});assert.equal(g.targetSide(1),'opp');assert.equal(g.targetSide(2),'me');
 assert(g.waveFor(5).some(q=>q.kind==='mudgiant'));assert(g.waveFor(20).some(q=>q.kind==='abyss'));assert(g.waveFor(9).length>8);
 const q=quiet(new FogGame({seed:2}));clearBoard(q,'me');clearBoard(q,'opp');q.stage=2;q.phase='wave';q.queue=[];const m=q.spawnMonster('runner');assert.equal(m.target,'me');
 for(let i=0;i<60*40&&q.monsters.length;i++)q.step(1/60);assert.equal(q.sides.me.baseHp,BASE_HP-1);}

// Opponent collapse: its monsters continue down the left lane (blue route) to my base.
{const g=quiet(new FogGame({seed:4}));clearBoard(g,'me');clearBoard(g,'opp');g.stage=1;g.phase='wave';g.queue=[];
 const m=g.spawnMonster('crawler');g.sides.opp.baseHp=1;g.collapse('opp');assert(g.sides.opp.collapsed);assert.equal(m.target,'me');
 const fresh=g.spawnMonster('runner');assert.equal(fresh.target,'me');assert.deepEqual(fresh.pts[fresh.pts.length-1],[F.BASE.me.x,F.BASE.me.y]);
 for(let i=0;i<60*120&&g.monsters.length;i++)g.step(1/60);assert(g.sides.me.baseHp<BASE_HP);}

// My base at 0 ends the game.
{const g=quiet(new FogGame({seed:4}));g.sides.me.baseHp=1;g.stage=2;const m=g.spawnMonster('runner');m.leak=3;m.seg=m.pts.length;g.step(1/60);assert.equal(g.state,'lost');assert.equal(g.result,'lose');}

// Skills: need a matching idle hero; cooldowns apply; warden shields the base.
{const g=quiet(new FogGame({seed:6}));clearBoard(g,'me');assert(!g.useSkill('me','warden'));g.addUnit('me','warden',{r:0,c:0});g.sides.me.baseHp=10;
 assert(g.useSkill('me','warden'));assert.equal(g.sides.me.baseHp,13);assert(g.sides.me.shield>0);assert(!g.useSkill('me','warden'));
 g.addUnit('me','scout',{r:0,c:1});assert(g.useSkill('me','scout'));assert.equal(g.sides.me.cells.flat().filter(c=>c.peek).length,3);
 g.addUnit('me','storm',{r:1,c:0});g.stage=2;const m=g.spawnMonster('brute');const hp=m.hp;assert(g.useSkill('me','storm'));assert(m.hp<hp);}

// Monster variety: jellies split, bosses use abilities, fog queen re-fogs land.
{const g=quiet(new FogGame({seed:8}));clearBoard(g,'me');g.stage=6;const j=g.spawnMonster('jelly');g.damage(j,99999,'me',true);assert.equal(g.monsters.filter(m=>m.kind==='jellet').length,2);
 const q=quiet(new FogGame({seed:8}));clearBoard(q,'me');q.sides.me.cells.flat().forEach(c=>{c.fog=false;});q.stage=10;const fq=q.spawnMonster('fogqueen');fq.speed=0;
 for(let i=0;i<60*7;i++)q.step(1/60);assert(q.sides.me.cells.flat().some(c=>c.fog),'fog queen re-fogged a cell');}

// Full AI vs AI games finish, and some stages see the boss die.
{for(const seed of [11,12]){const g=new FogGame({seed,meAI:true});let t=0,bosses=0;while(g.state==='playing'&&t<3600){g.step(1/30);t+=1/30;for(const e of g.drainEvents())if(e.type==='kill'&&e.boss)bosses++;}
  assert(g.state==='won'||g.state==='lost');assert(g.stage>=12,`AI reached stage ${g.stage}`);assert(bosses>=1);}}

console.log('PASS: mirrored fog layout, scouting adjacency/times/no-fight, lair failure and siege reward, RPS allies, summon cap, merge, alternating waves, collapse route, defeat, skills, monster abilities, AI full games');
