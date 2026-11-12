/* Deterministic scenery uses no combat RNG or independent animation timers. */
function drawBastionTerrain(g, map) {
 const palettes={grove:[0x102c29,0x193e32,0x274d3b,0x9bbe80],canyon:[0x30252b,0x54372e,0x765044,0xe5ad72],glacier:[0x132a40,0x23465c,0x3c6475,0xafe9f3],marsh:[0x182d26,0x344936,0x526144,0xc0db7c],volcano:[0x241d27,0x483035,0x68413c,0xffad69],ruins:[0x211e36,0x37304d,0x5a506d,0xd9baf4]};
 const [deep,base,stone,light]=palettes[map];
 const polygon=(coords,color,alpha=1)=>{g.fillStyle(color,alpha);g.fillPoints(coords.map(([x,y])=>({x,y})),true);};
 const noise=n=>{const v=Math.sin(n*127.1+43.7)*43758.5453;return v-Math.floor(v);};
 g.clear();g.fillStyle(deep);g.fillRect(0,0,720,720);
 // Layered terrain patches replace the uniform square grid.
 for(let i=0;i<170;i++){const x=noise(i*3)*720,y=noise(i*3+1)*720,r=12+noise(i*3+2)*38;g.fillStyle(i%3?base:stone,.12+noise(i+30)*.12);g.fillEllipse(x,y,r*2,r);}
 // Fine ground grain is baked into the static background once per map.
 for(let i=0;i<1800;i++){const x=noise(i*11+1700)*720,y=noise(i*11+1701)*720;g.fillStyle(i%4?light:deep,i%4?.025:.14);g.fillEllipse(x,y,1+noise(i+1900)*4,.7+noise(i+1901)*2);}
 const lanes=MAPS[map].lanes;
 for(const side of lanes){const x=side===1?720:side===3?0:360,y=side===0?0:side===2?720:360;
  g.lineStyle(86,deep,.8);g.lineBetween(x,y,360,360);g.lineStyle(66,stone,.35);g.lineBetween(x,y,360,360);
  for(let n=0;n<10;n++){const t=n/10,px=x+(360-x)*t,py=y+(360-y)*t;g.fillStyle(light,.07);g.fillRoundedRect(px-18,py-11,36,22,4);}
 }
 // Ruined, inset plaza with a raised stone rim and radial masonry.
 g.fillStyle(0x030c17,.4);g.fillEllipse(360,373,472,446);g.fillStyle(stone,.6);g.fillCircle(360,360,222);g.fillStyle(deep,.75);g.fillCircle(360,360,209);
 for(let i=0;i<24;i++){const a=i*Math.PI/12;g.lineStyle(2,deep,.8);g.lineBetween(360+Math.cos(a)*210,360+Math.sin(a)*210,360+Math.cos(a)*223,360+Math.sin(a)*223);}
 g.lineStyle(1,light,.23);g.strokeCircle(360,360,222);g.strokeCircle(360,360,208);g.lineStyle(1,light,.09);g.strokeCircle(360,360,110);
 // Broken flagstones: quiet contrast keeps projectiles and enemies legible.
 for(let row=-5;row<=5;row++)for(let col=-5;col<=5;col++){
  const x=360+col*38+(row%2)*19,y=360+row*34;if(Math.hypot(x-360,y-360)>184)continue;
  const n=(row+6)*31+col+6,j=noise(n)*3;
  polygon([[x-17,y-14+j],[x+15,y-15],[x+18,y+11],[x+12,y+15],[x-16,y+14]],stone,.15+noise(n+71)*.09);
  g.lineStyle(1,light,.055);g.lineBetween(x-16,y-13,x+14,y-14);
  if(n%7===0){g.lineStyle(1,deep,.7);g.lineBetween(x-10,y-12,x+2,y+2);g.lineBetween(x+2,y+2,x,y+13);}
 }
 for(let i=0;i<58;i++){
  const x=24+noise(i*7+500)*672,y=24+noise(i*7+501)*672;
  if(Math.hypot(x-360,y-360)<250||lanes.some(side=>(side%2?Math.abs(y-360):Math.abs(x-360))<65))continue;
  const size=16+noise(i+800)*21;g.fillStyle(0x030c13,.35);g.fillEllipse(x+5,y+12,size*1.9,size*.7);
  if(map==='marsh'){
   g.fillStyle(0x0b2521,.8);g.fillEllipse(x,y+10,size*2.5,size);g.lineStyle(1,0x9bab67,.3);g.strokeEllipse(x,y+10,size*2,size*.6);
   for(let k=0;k<4;k++){const px=x-12+k*9;g.lineStyle(2,0x8b9f55,.8);g.lineBetween(px,y+10,px+3,y-18-k%2*8);g.fillStyle(0xc6d381);g.fillEllipse(px+3,y-20-k%2*8,4,9);}
   g.fillStyle(0x83b56c,.7);g.fillCircle(x-size*.7,y+8,4);
  }else if(map==='volcano'){
   polygon([[x-size,y+12],[x-size*.6,y-size],[x+size*.4,y-size*.7],[x+size,y+14]],0x342d38);
   polygon([[x-size*.6,y-size],[x,y-8],[x+size*.4,y-size*.7]],0x62505a);
   g.lineStyle(5,0xe15d35,.25);g.lineBetween(x-12,y+9,x+2,y-4);g.lineBetween(x+2,y-4,x+14,y+5);g.lineStyle(2,0xffb16a,.9);g.lineBetween(x-12,y+9,x+2,y-4);g.lineBetween(x+2,y-4,x+14,y+5);
  }else if(map==='ruins'){
   polygon([[x-11,y-size],[x+8,y-size-4],[x+13,y+13],[x-14,y+13]],0x625b78);polygon([[x+8,y-size-4],[x+17,y-size+2],[x+19,y+10],[x+13,y+13]],0x39334e);
   g.lineStyle(2,0xc7aae9,.65);g.lineBetween(x-5,y-18,x+4,y-10);g.lineBetween(x+4,y-10,x-5,y-3);g.lineStyle(1,0x9b8cae,.5);g.lineBetween(x-8,y-size+4,x-10,y+8);
  }else if(map==='grove'){
   g.fillStyle(0x392e28);g.fillRoundedRect(x-4,y-size*.5,8,size*.5+20,2);g.lineStyle(1,0x85674b,.6);g.lineBetween(x-1,y-10,x-1,y+16);
   // Uneven, overlapping branch tiers with needle highlights and shadowed undersides.
   for(let tier=0;tier<5;tier++){
    const cy=y+4-tier*size*.32,w=size*(1-tier*.15);
    polygon([[x,cy-size*.9],[x-w*.43,cy-size*.3],[x-w*.8,cy-4],[x-w,cy+5],[x-w*.4,cy+2],[x-w*.15,cy+9],[x+w*.25,cy+4],[x+w*.8,cy+7],[x+w*.6,cy-7]],tier%2?0x24553e:0x1c4635);
    polygon([[x,cy-size*.9],[x-w*.6,cy-6],[x-w*.15,cy+3],[x+w*.15,cy-5]],0x3b7452,.75);
    for(let k=0;k<4;k++){const py=cy-size*.55+k*size*.15,px=x-w*(.05+k*.09);g.lineStyle(1,0x85ac6b,.23);g.lineBetween(px,py,px-w*.23,py+5);}
   }
   g.fillStyle(0x608955,.32);g.fillEllipse(x-8,y+17,19,5);
  }else if(map==='canyon'){
   polygon([[x-size,y+10],[x-size*.8,y-size*.6],[x+size*.3,y-size],[x+size,y],[x+size*.6,y+14]],0x825640);
   polygon([[x-size*.8,y-size*.6],[x+size*.3,y-size],[x+size*.65,y-size*.3],[x,y]],0xa16e50);
   polygon([[x+size*.3,y-size],[x+size,y],[x+size*.6,y+14],[x,y+7]],0x51382f,.8);
   for(let k=0;k<4;k++){const py=y-size*.5+k*size*.18;g.lineStyle(1,k%2?0xd3a275:0x39252a,.45);g.lineBetween(x-size*.65,py+5,x+size*.45,py);}
   g.lineStyle(2,0x38262b,.7);g.lineBetween(x-size*.8,y+3,x+size*.7,y-3);
   polygon([[x-size*.9,y+14],[x-size*.4,y+9],[x-size*.2,y+19],[x-size,y+21]],0x9b7053);
  }else{
   polygon([[x,y-size*1.5],[x-size*.6,y],[x,y+15],[x+size*.5,y-2]],0x72b6cc);
   polygon([[x,y-size*1.5],[x,y+15],[x+size*.5,y-2]],0x39738e);
   polygon([[x,y-size*1.5],[x-size*.14,y-2],[x-size*.6,y]],0xb4e6e9,.5);
   g.fillStyle(0xc8edf1,.3);g.fillEllipse(x,y+14,size*1.6,7);
   g.lineStyle(1,0x9ee5f4,.25);g.lineBetween(x+size*.5,y+10,x+size,y+23);g.lineBetween(x+size,y+23,x+size*.7,y+34);g.lineBetween(x+size,y+23,x+size*1.3,y+21);
   g.lineStyle(1,0xd4fbff,.75);g.lineBetween(x,y-size*1.5,x-size*.6,y);g.lineBetween(x,y-size*1.5,x,y+10);
  }
 }
 // Entrance beacons communicate the actual enemy approach directions.
 for(const side of lanes){const x=side===1?694:side===3?26:360,y=side===0?26:side===2?694:360;
  g.fillStyle(light,.07);g.fillCircle(x,y,34);g.lineStyle(2,light,.6);g.strokeCircle(x,y,20);
  const a=Math.atan2(360-y,360-x);polygon([[x+Math.cos(a)*12,y+Math.sin(a)*12],[x+Math.cos(a+2.4)*10,y+Math.sin(a+2.4)*10],[x+Math.cos(a-2.4)*10,y+Math.sin(a-2.4)*10]],light,.8);
 }
 for(let i=0;i<6;i++){g.lineStyle(8,0x020a14,.07);g.strokeRect(i*7,i*7,720-i*14,720-i*14);}
}
function drawBastionAtmosphere(g,model,reduced) {
 const t=reduced?0:model.time,map=model.map,color=map==='grove'?0xd4ef9b:map==='canyon'||map==='volcano'?0xffc07a:map==='marsh'?0xc0db7c:map==='ruins'?0xd9baf4:0xd0f3ff;
 for(let i=0;i<22;i++){
  const x=(i*137.7+Math.sin(t*.3+i)*10+720)%720,y=(i*89.3+(map==='glacier'?t*11:-t*4)+7200)%720;
  g.fillStyle(color,.15+(Math.sin(t+i)+1)*.1);g.fillCircle(x,y,map==='glacier'?1.6:1.2);
 }
 // Faceted crystal: bevel, inner light and a pedestal give the objective volume.
 g.fillStyle(0x071a23,.85);g.fillEllipse(360,384,57,15);g.lineStyle(2,0x587d83,.8);g.strokeEllipse(360,381,52,13);
 const poly=(pts,c,a=1)=>{g.fillStyle(c,a);g.fillPoints(pts.map(([x,y])=>({x,y})),true);};
 poly([[360,330],[376,358],[360,384],[344,358]],0x68bdaa);
 poly([[360,330],[356,355],[344,358]],0xd1ffed);poly([[360,330],[376,358],[365,354]],0x8ff3d6);
 poly([[344,358],[356,355],[360,384]],0x358b89);poly([[365,354],[376,358],[360,384]],0x1e666d);
 poly([[356,355],[360,340],[365,354],[360,373]],0xdcfff2,.8);
 g.lineStyle(1,0xe3fff3,.8);g.lineBetween(360,331,345,358);
 // Crystal halo and engraved compass beneath the combat actors.
 g.fillStyle(0x7ee7d0,.04);g.fillCircle(360,360,69);g.lineStyle(1,0xa6f8e1,.3);g.strokeEllipse(360,373,90,30);
 for(let i=0;i<8;i++){const a=i*Math.PI/4+t*.12;g.fillStyle(0xb9ffe8,.55);g.fillCircle(360+Math.cos(a)*49,360+Math.sin(a)*18+373,1.5);}
}
function drawBastionEnemyArmor(g,e,y,t,reduced) {
 const poly=(coords,c)=>{g.fillStyle(c);g.fillPoints(coords.map(([x,y])=>({x,y})),true);};
 const x=e.x;
 if(e.kind==='wisp'){
  g.lineStyle(2,0xb1eaff,.65);g.strokeEllipse(x,y+5,27,38);g.lineStyle(1,0x90bddf,.4);g.lineBetween(x-10,y+12,x-16,y+26);g.lineBetween(x+8,y+12,x+14,y+28);
 }else if(e.kind==='berserker'){
  poly([[x-19,y-9],[x-25,y-23],[x-10,y-13]],0xd78861);poly([[x+19,y-9],[x+25,y-23],[x+10,y-13]],0xd78861);
  if(e.hp<=e.maxHp*.5){g.lineStyle(2,0xff754e,.8);g.strokeCircle(x,y,24);}
 }else if(e.kind==='armored'){
  poly([[x-18,y-12],[x-9,y-16],[x-5,y-5],[x-16,y]],0x8399af);poly([[x+18,y-12],[x+9,y-16],[x+5,y-5],[x+16,y]],0x536b85);
  poly([[x-13,y-2],[x-4,y-7],[x+4,y],[x-4,y+17],[x-13,y+11]],0x24364d);g.lineStyle(2,0xb6d0df,.9);g.lineBetween(x-10,y-1,x-5,y+11);
  g.lineStyle(1,0xe2edec,.8);g.lineBetween(x-17,y-11,x-10,y-14);g.lineBetween(x+10,y-14,x+17,y-11);
  g.fillStyle(0x718794);g.fillCircle(x-7,y+1,2);g.lineStyle(1,0x93b6c9);g.lineBetween(x-7,y+3,x-7,y+10);
 }else if(e.kind==='regenerator'){
  poly([[x-10,y-10],[x-15,y+14],[x-6,y+10],[x,y+18],[x+9,y+11],[x+12,y-8]],0x244b3c);
  g.lineStyle(1,0x8bba6b,.7);g.lineBetween(x-10,y-8,x-6,y+10);g.lineBetween(x+9,y-7,x+6,y+10);
  g.lineStyle(3,0x5b6c45);g.lineBetween(x+17,y-20,x+17,y+18);g.fillStyle(0xa4ffba);g.fillCircle(x+17,y-22,4);g.lineStyle(1,0xa4ffba,.6);g.strokeCircle(x+17,y-22,8);
  g.lineStyle(1,0x88edb1,.35);g.strokeEllipse(x,y+17,36,12);
 }else if(e.kind==='splitter'){
  g.lineStyle(2,0xefaaff,.85);g.lineBetween(x-7,y-10,x+2,y-3);g.lineBetween(x+2,y-3,x-3,y+4);g.lineBetween(x-3,y+4,x+5,y+12);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3+(reduced?0:t*.6),px=x+Math.cos(a)*22,py=y+Math.sin(a)*16;poly([[px,py-7],[px+4,py],[px,py+7],[px-4,py]],0xd99afa);}
 }else if(e.boss){
  poly([[x-19,y-32],[x-23,y-46],[x-8,y-39],[x,y-53],[x+8,y-39],[x+23,y-46],[x+19,y-32]],0xc4a0eb);g.fillStyle(0xffe0a3);g.fillCircle(x,y-39,3);
 }
}
// Weapon textures are generated once; each silhouette communicates its firing style.
function finishBastionWeapon(g,type,c){
 if(type==='banner'){g.clear();g.fillStyle(0x455962);g.fillRoundedRect(27,13,6,39,2);g.fillStyle(0xf9dca0);g.fillCircle(30,11,4);g.fillStyle(0xa77b45);g.fillPoints([{x:33,y:15},{x:55,y:19},{x:50,y:29},{x:55,y:37},{x:33,y:33}],true);g.fillStyle(0xffe4aa);g.fillPoints([{x:41,y:20},{x:46,y:26},{x:41,y:32},{x:37,y:26}],true);g.fillStyle(0xc0a67c);g.fillEllipse(30,51,24,7);return;}
 if(['sniper','venom','gravity'].includes(type)){
  g.clear();
  if(type==='sniper'){
   g.fillStyle(0x152735);g.fillRoundedRect(16,22,27,20,5);g.fillStyle(0x8a795d);g.fillRoundedRect(25,26,36,12,3);g.fillStyle(0xd9c79b);g.fillRect(32,27,28,3);g.fillStyle(0x243542);g.fillRect(55,26,6,12);
   g.fillStyle(0x405b66);g.fillRoundedRect(24,17,19,8,3);g.fillStyle(0xb5eee0);g.fillCircle(41,21,3);g.lineStyle(1,0x152735);for(let x=37;x<53;x+=4)g.lineBetween(x,31,x,36);
   g.fillStyle(0xc3b48b);g.fillRect(20,23,4,18);g.fillStyle(0x142532);g.fillCircle(29,32,5);g.fillStyle(0x879c9b);g.fillCircle(28,31,3);
  }else if(type==='venom'){
   g.fillStyle(0x263b36);g.fillRoundedRect(17,19,27,26,5);g.lineStyle(3,0x658071);g.lineBetween(30,32,53,32);g.fillStyle(0x162e31);g.fillRoundedRect(44,26,16,12,3);g.fillStyle(0xa2d96c);g.fillRect(52,28,6,8);
   for(const y of [23,41]){g.fillStyle(0x34564d);g.fillRoundedRect(17,y-6,24,12,5);g.fillStyle(0x9bd66a);g.fillRoundedRect(20,y-4,17,8,3);g.fillStyle(0xd8fca6);g.fillRect(23,y-3,10,2);g.fillStyle(0x233b3b);g.fillRect(18,y-6,3,12);g.fillRect(37,y-6,3,12);}
   g.fillStyle(0x061c1c);g.fillCircle(58,32,3);g.lineStyle(2,0x9ad575);g.strokeCircle(30,32,5);
  }else{
   g.fillStyle(0x1b213c);g.fillCircle(32,32,21);g.lineStyle(5,0x536389);g.strokeCircle(32,32,18);g.lineStyle(2,0xa8baff);g.strokeCircle(32,32,15);g.fillStyle(0x050d22);g.fillCircle(32,32,11);g.lineStyle(1,0x889eff);g.strokeEllipse(32,32,23,11);g.fillStyle(0xd4d9ff);g.fillCircle(32,32,3);
   for(let i=0;i<3;i++){const a=i*Math.PI*2/3,x=32+Math.cos(a)*19,y=32+Math.sin(a)*19;g.fillStyle(0x9badd6);g.fillRoundedRect(x-4,y-4,8,8,2);g.fillStyle(0xe4ecff);g.fillCircle(x-1,y-1,1.5);}
  }
 }else{
  // Small mechanical cuts preserve the established silhouettes and muzzle positions.
  if(['arrow','cannon','flame','laser'].includes(type)){
   g.lineStyle(1,0x061524,.55);for(let x=34;x<48;x+=4)g.lineBetween(x,29,x,34);
   g.fillStyle(0xf1ffe9,.65);g.fillCircle(27,27,1.3);g.fillStyle(0x071420,.7);g.fillCircle(27,38,2);
  }
  if(type==='cannon'){g.lineStyle(2,0x4d5557);g.lineBetween(36,24,36,40);g.lineStyle(1,0xffefbb,.6);g.lineBetween(24,23,48,23);}
  if(type==='frost'){g.lineStyle(1,0xffffff,.8);g.lineBetween(32,14,27,31);g.lineBetween(27,31,32,49);g.lineBetween(27,31,43,32);}
 }
}
// Four cached poses per elite: idle, alternating stride and attack.
function createBastionEliteTextures(scene){
 const result={};
 for(const kind of ['armored','regenerator','splitter','wisp','berserker','shard','shieldbearer','healer']){
  result[kind]=[];
  for(let pose=0;pose<4;pose++){
   const g=scene.make.graphics({},false),step=pose===1?-3:pose===2?3:0,attack=pose===3?6:0;
   const poly=(p,c,a=1)=>{g.fillStyle(c,a);g.fillPoints(p.map(([x,y])=>({x,y})),true);};
   const line=(x,y,xx,yy,w,c,a=1)=>{g.lineStyle(w,c,a);g.lineBetween(x,y,xx,yy);};
   if(kind==='shieldbearer'){
    // A compact armored carrier behind a wide, translucent hexagonal energy shield.
    for(const [x,d]of [[47,step],[64,-step]]){g.fillStyle(0x183c49);g.fillRoundedRect(x-6,56,12,22+d,3);g.fillStyle(0x668f9b);g.fillRoundedRect(x-6,60,12,13,3);g.fillStyle(0x18303e);g.fillRoundedRect(x-8,76+d,16,7,3);line(x-4,63,x+3,63,1,0xb5dcd9);}
    poly([[40,30],[62,28],[74,43],[66,65],[43,64],[34,47]],0x305d6a);poly([[44,32],[56,30],[56,62],[44,59]],0x8bbfc1);poly([[56,30],[65,34],[68,57],[56,62]],0x4c808e);
    poly([[42,16],[56,11],[69,20],[65,34],[43,35],[37,27]],0x60949e);poly([[42,17],[55,13],[55,32],[41,28]],0xa4d0cc);g.fillStyle(0x102d3c);g.fillRoundedRect(43,23,22,7,2);line(46,26,61,26,2,0xb1fff1);
    poly([[66,34],[78,29],[84,40],[77,51],[68,46]],0x4f7c89);line(74,34,79,39,2,0xb4d5ca);
    const shift=attack*.6;
    poly([[22-shift,25],[43-shift,35],[45-shift,63],[23-shift,82],[5-shift,64],[5-shift,36]],0x173c4b,.94);
    poly([[22-shift,29],[39-shift,38],[40-shift,61],[23-shift,76],[10-shift,61],[10-shift,39]],0x54d7c8,.42);
    g.lineStyle(2,0x8ffff0,.9);g.strokePoints([{x:22-shift,y:27},{x:42-shift,y:36},{x:43-shift,y:62},{x:23-shift,y:79},{x:7-shift,y:63},{x:7-shift,y:38}],true);
    line(23-shift,34,23-shift,70,1,0xc3fff1,.75);line(12-shift,46,35-shift,46,1,0xc3fff1,.45);line(12-shift,58,35-shift,58,1,0xc3fff1,.45);
    g.fillStyle(0xd5fff1);g.fillCircle(23-shift,52,4);g.lineStyle(1,0xb1fff1,.7);g.strokeCircle(23-shift,52,8);
   }else if(kind==='healer'){
    // Ivory mantle and a suspended mint orb distinguish the healer from the dark green regenerator.
    g.fillStyle(0x344c59);g.fillRoundedRect(34+step,72,12,10,3);g.fillRoundedRect(51-step,72,12,10,3);
    poly([[36,30],[59,30],[67,77],[54,73],[47,83],[34,76],[26,79]],0xb4c9c4);poly([[37,33],[47,36],[43,76],[31,73]],0xedf1d9);poly([[51,34],[58,32],[64,72],[54,67]],0x82a9ab);line(39,39,34,68,2,0xc2aa69);line(54,38,60,68,2,0xdcd5a2);
    poly([[31,31],[34,17],[47,7],[62,20],[64,32],[56,41],[39,40]],0xd8e4d9);poly([[36,27],[47,16],[58,26],[55,36],[40,36]],0x254352);poly([[33,23],[47,8],[46,16],[37,30]],0xf7f4dc);line(40,29,45,29,2,0xa8fff1);line(50,29,55,29,2,0xa8fff1);
    poly([[35,39],[47,46],[59,39],[56,49],[47,53],[38,48]],0x698d8f);line(37,41,47,47,1,0xe4d8a9);line(47,47,57,41,1,0xe4d8a9);
    g.fillStyle(0xe9ce88);g.fillCircle(47,54,3);line(73,32-attack,73,82,3,0x7d9c9d);line(72,34-attack,72,80,1,0xe1e3be);
    g.lineStyle(2,0xbdb77e);g.strokeEllipse(73,20-attack,21,27);g.fillStyle(0xa0fff0,.12);g.fillCircle(73,20-attack,14);g.fillStyle(0x72daca);g.fillCircle(73,20-attack,7);g.fillStyle(0xe8fff2);g.fillCircle(71,18-attack,3);
    line(66,36-attack,73,31-attack,2,0xd7d9b3);g.fillStyle(0xc8e6d1);g.fillCircle(63,47,5);
   }else if(kind==='armored'){
    // Broad steel silhouette, overlapping greaves, shield and visor.
    for(const [x,d]of [[35,step],[59,-step]]){g.fillStyle(0x182837);g.fillRoundedRect(x-6,57,12,23+d,3);g.fillStyle(0x78909c);g.fillRoundedRect(x-7,61,13,12,3);g.fillStyle(0x354f62);g.fillRoundedRect(x-9,75+d,17,8,3);line(x-5,64,x+4,64,1,0xc3d7d6);}
    poly([[30,32],[61,30],[69,48],[59,65],[34,65],[26,49]],0x263e52);poly([[32,33],[47,29],[48,60],[35,59]],0x8da7b3);poly([[48,30],[61,33],[61,57],[48,60]],0x506d84);
    for(const x of [25,65]){poly([[x-11,32],[x-5,24],[x+9,27],[x+12,39],[x,44],[x-10,40]],0x617e94);line(x-8,31,x+6,29,2,0xc4dad9);}
    g.fillStyle(0x3e566b);g.fillRoundedRect(35,13,25,24,7);poly([[36,19],[47,12],[48,35],[36,30]],0x9bb3bc);g.fillStyle(0x0b1927);g.fillRect(38,23,21,6);line(40,25,56,25,2,0xf6c77d);
    const sx=21-attack*.4;poly([[sx-13,42],[sx,36],[sx+14,43],[sx+11,65],[sx,77],[sx-12,65]],0x152d40);poly([[sx-11,44],[sx,39],[sx,72],[sx-10,63]],0x597a91);line(sx-11,44,sx,39,2,0xd2dcd3);line(sx,42,sx,66,2,0xe1c18a);line(sx-6,51,sx+6,51,2,0xe1c18a);
    line(74,38-attack,76,69-attack,4,0x9eb4bd);poly([[75,34-attack],[82,47-attack],[74,50-attack]],0xd8e8e1);
   }else if(kind==='regenerator'){
    poly([[39,29],[57,29],[66,76],[54,72],[47,83],[37,75],[26,78]],0x183d36);poly([[39,31],[48,34],[45,77],[32,72]],0x41715a);poly([[51,33],[56,31],[63,73],[54,68]],0x294e43);line(40,38,35,70,2,0xa5b574);line(54,38,59,67,1,0xa5b574);
    poly([[33,32],[34,19],[47,10],[61,21],[63,33],[54,40],[40,38]],0x386453);poly([[38,25],[47,18],[56,26],[55,36],[41,36]],0x091d24);line(41,29,45,29,2,0xc0ffac);line(50,29,54,29,2,0xc0ffac);
    line(71,26-attack,71,83,4,0x705a40);line(70,30-attack,70,80,1,0xb3a171);g.fillStyle(0xa5ef9e,.15);g.fillCircle(71,20-attack,14);poly([[71,8-attack],[78,20-attack],[71,30-attack],[64,20-attack]],0x91df9d);poly([[71,8-attack],[71,30-attack],[66,20-attack]],0xe0f8b1);g.lineStyle(2,0xb8bb78);g.strokeCircle(71,20-attack,10);
    g.fillStyle(0x789b6c);g.fillCircle(62,48,5);g.fillStyle(0xc0b47f);g.fillCircle(45,46,3);
   }else if(kind==='wisp'){
    g.fillStyle(0x72cafa,.06);g.fillCircle(48,43,32);g.fillStyle(0x99e0ff,.1);g.fillEllipse(48,43,45,62);
    poly([[48,13],[64,28],[61,49],[72,72],[56,65],[50,85],[43,68],[26,77],[35,51],[32,29]],0x4d83ac,.8);
    poly([[48,17],[57,31],[53,48],[57+step,66],[47,59],[39-step,72],[43,48],[37,31]],0xbceeff,.9);poly([[40,30],[47,24],[56,31],[53,42],[41,42]],0x142c52);
    line(41,34,45,35,2,0xe8ffff);line(50,35,54,34,2,0xe8ffff);
    line(31,42,22-attack,56,3,0x9cdbf2,.75);line(62,42,73+attack,53,3,0x9cdbf2,.75);
   }else if(kind==='berserker'){
    for(const [x,d]of [[37,step],[58,-step]]){line(x,57,x+d,77,11,0x4c3036);g.fillStyle(0x292331);g.fillRoundedRect(x+d-7,74,15,9,3);}
    poly([[32,30],[57,27],[68,44],[59,62],[35,64],[25,46]],0x9c5848);poly([[35,34],[47,31],[47,57],[34,54]],0xc27a59);poly([[47,32],[57,33],[60,53],[48,57]],0x713b3c);line(38,43,45,47,2,0x4b2932);line(50,47,57,42,2,0x4b2932);
    poly([[30,31],[18,17],[23,36],[14,33],[26,47],[32,39]],0x323241);poly([[62,31],[75,17],[69,37],[80,33],[68,48],[61,39]],0x323241);
    poly([[37,17],[49,12],[61,21],[58,35],[42,37],[34,28]],0x824b42);poly([[37,20],[30,8],[41,15]],0xe4ba86);poly([[56,17],[68,7],[62,27]],0xe4ba86);line(40,25,46,27,2,0xffdc85);line(51,27,56,24,2,0xffdc85);
    line(76,39-attack,72,77-attack,4,0x745b49);poly([[75,36-attack],[88,39-attack],[87,53-attack],[73,49-attack]],0xa9b6bb);line(87,40-attack,86,52-attack,2,0xe4eddf);
    g.fillStyle(0x423644);g.fillRect(34,58,27,7);g.fillStyle(0xdfb376);g.fillRect(45,59,7,5);
   }else{
    // A fractured crystal organism; shards use the same material at a smaller scale.
    for(const [x,d]of [[34,step],[60,-step]]){poly([[x,54],[x+8,62],[x+d+6,80],[x+d-5,75]],0x6a477e);}
    poly([[48,17],[68,35],[63,62],[48,72],[29,57],[27,34]],0x53355f);poly([[48,17],[48,70],[29,57],[27,34]],0xa079b6);poly([[48,17],[68,35],[48,43]],0xd6aae4);poly([[48,43],[68,35],[63,62],[48,70]],0x7f5498);
    for(const [x,y]of [[25,29],[69,28],[26,53],[70,52]])poly([[x,y-12],[x+7,y],[x,y+10],[x-6,y]],0xaf86c9);
    line(48,23,43,37,2,0xffd4ff);line(43,37,52,46,2,0xffd4ff);line(52,46,45,60,2,0xffd4ff);line(34,39,41,41,2,0x241e3e);line(55,41,62,38,2,0x241e3e);
    if(attack){g.lineStyle(2,0xf4c4ff,.8);g.strokeCircle(48,44,29);}
   }
   const key='bastion-elite-'+kind+'-'+pose;g.generateTexture(key,96,96);g.destroy();result[kind].push({key,frame:undefined});
  }
 }
 return result;
}
function drawBastionSpecialEffect(front,back,f,reduced){
 if(!['venomCloud','gravityWell','sniperShot'].includes(f.kind))return false;
 const life=Math.max(0,f.life/f.max),age=1-life,t=reduced?.45:age;
 if(f.kind==='venomCloud'){
  for(let i=0;i<(reduced?3:7);i++){const a=i*2.399,r=f.r*(.2+.65*t),x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r*.7;back.fillStyle(0x8bca59,life*.12);back.fillEllipse(x,y,24+t*23,14+t*13);}
  back.lineStyle(1,f.color,life*.55);back.strokeEllipse(f.x,f.y,f.r*1.7,f.r);
  if(!reduced)for(let i=0;i<9;i++){const a=i*2.399+f.serial,r=f.r*(.2+t*.8),x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r*.7-t*18;front.fillStyle(i%2?0xd8ff92:f.color,life*.8);front.fillCircle(x,y,1.4+(i%3));}
 }else if(f.kind==='gravityWell'){
  const r=f.r*(1-t*.85);back.fillStyle(0x171e43,life*.15);back.fillCircle(f.x,f.y,r);back.lineStyle(2,f.color,life*.6);back.strokeEllipse(f.x,f.y,r*2,r*1.2);
  back.lineStyle(1,0xdce3ff,life*.5);back.strokeEllipse(f.x,f.y,r*1.5,r*1.5);front.fillStyle(0xdce3ff,life*.8);front.fillCircle(f.x,f.y,3+life*3);
  if(!reduced)for(let i=0;i<10;i++){const a=i*Math.PI/5+t*2.8,x=f.x+Math.cos(a)*r,y=f.y+Math.sin(a)*r;front.lineStyle(1,f.color,life*.75);front.lineBetween(x,y,f.x+Math.cos(a-.15)*(r+12),f.y+Math.sin(a-.15)*(r+12));}
 }else{
  const x=f.x+Math.cos(f.angle)*f.r,y=f.y+Math.sin(f.angle)*f.r;front.lineStyle(6,f.color,life*.13);front.lineBetween(f.x,f.y,x,y);front.lineStyle(1.5,0xfff2c4,life*.9);front.lineBetween(f.x,f.y,x,y);front.lineStyle(1,f.color,life*.8);front.strokeCircle(x,y,7+t*13);
  if(!reduced)for(let i=0;i<4;i++){const a=i*Math.PI/2+.5;front.lineBetween(x+Math.cos(a)*9,y+Math.sin(a)*9,x+Math.cos(a)*(13+t*10),y+Math.sin(a)*(13+t*10));}
 }
 return true;
}

// Shield strength and brief heal feedback share the caller's combat clock; no timers or particles.
function drawBastionSupportStatus(g,e,y,time,reduced){
 if(e.kind==='shieldbearer'&&e.shield>0){
  const ratio=Math.max(0,Math.min(1,e.shield/(e.maxShield||e.shield)));
  g.fillStyle(0x76eedc,.025+ratio*.035);g.fillEllipse(e.x,y,53,63);
  g.lineStyle(1.5,0x8df9e7,.35+ratio*.35);g.strokeEllipse(e.x,y,53,63);
  g.fillStyle(0x143344,.9);g.fillRoundedRect(e.x-17,y+33,34,4,2);g.fillStyle(0x8df9e7,.9);g.fillRoundedRect(e.x-17,y+33,34*ratio,4,2);
 }
 if(e.kind==='healer'&&e.healFlash>0){
  const strength=Math.min(1,e.healFlash/.5),progress=reduced?.4:1-strength;
  g.lineStyle(1.5,0xd8ffe8,strength*.7);g.strokeEllipse(e.x,y+18,35+progress*35,12+progress*12);
  g.fillStyle(0xc9ffdc,strength*.9);g.fillRoundedRect(e.x-2,y-36-progress*6,4,14,1);g.fillRoundedRect(e.x-7,y-31-progress*6,14,4,1);
 }
}
// Guardian identity accents stay below the painted actor and follow the shared combat clock.
function drawBastionGuardianBadge(g,p,guardian,time,reduced){
 if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
 const kind=['guardian','scout','gunner'].includes(guardian)?guardian:'guardian';
 const color=kind==='scout'?0x91e9c5:kind==='gunner'?0xf2bd83:0xa4d8ef;
 const x=p.x-21,y=p.y+13;
 g.fillStyle(0x0b2230,.85);g.fillCircle(x,y,7.5);g.lineStyle(1,color,.8);g.strokeCircle(x,y,7.5);
 if(kind==='scout'){
  g.lineStyle(1.5,color,.95);
  for(const offset of [-2,2]){g.lineBetween(x-3+offset,y-3,x+offset,y);g.lineBetween(x+offset,y,x-3+offset,y+3);}
 }else if(kind==='gunner'){
  g.lineStyle(1.5,color,.95);g.strokeCircle(x,y,3.2);g.lineBetween(x-5,y,x+5,y);g.lineBetween(x,y-5,x,y+5);
 }else{
  g.fillStyle(color,.9);g.fillPoints([{x,y:y-4},{x:x+3.5,y:y-1},{x:x+2.5,y:y+3},{x,y:y+5},{x:x-2.5,y:y+3},{x:x-3.5,y:y-1}],true);
 }
 if(kind==='scout'&&!reduced&&p.inv>0){
  const angle=Number.isFinite(p.moveAngle)?p.moveAngle:Math.PI/2,dx=Math.cos(angle),dy=Math.sin(angle);
  const fade=Math.min(1,p.inv/.35);
  for(let i=0;i<2;i++){const offset=13+i*8;g.lineStyle(1.5,color,fade*(.35-i*.1));g.lineBetween(p.x-dx*offset,p.y-dy*offset,p.x-dx*(offset+6),p.y-dy*(offset+6));}
 }
}
// Telegraph the charge toward the objective before movement begins. Geometry is bounded and deterministic.
function drawBastionBossCharge(g,e,time,reduced){
 if(!e?.boss||e.hp<=0||!Number.isFinite(e.x)||!Number.isFinite(e.y))return;
 const windup=Math.max(0,Math.min(1,Number(e.chargeWindup)||0)),charging=Math.max(0,Math.min(1.2,Number(e.chargeTime)||0));
 if(!windup&&!charging)return;
 const dx=360-e.x,dy=360-e.y,length=Math.hypot(dx,dy),ux=length?dx/length:0,uy=length?dy/length:-1;
 const radius=Number.isFinite(e.r)?e.r:23;
 if(windup>0){
  const progress=reduced?.5:1-windup,r=radius+10+(reduced?3:windup*11);
  g.fillStyle(0xffa47d,.035);g.fillCircle(e.x,e.y,r);g.lineStyle(2,0xffc398,.55+progress*.3);g.strokeCircle(e.x,e.y,r);
  g.lineStyle(1.5,0xffa882,.5);
  const count=Math.min(24,Math.floor(Math.max(0,length-radius-24)/22));
  for(let i=0;i<count;i++){const start=radius+18+i*22,end=Math.min(length-12,start+10);if(end>start)g.lineBetween(e.x+ux*start,e.y+uy*start,e.x+ux*end,e.y+uy*end);}
  const ahead=radius+24,ax=e.x+ux*ahead,ay=e.y+uy*ahead;
  g.lineStyle(2,0xffd8ae,.85);g.lineBetween(ax-ux*8-uy*5,ay-uy*8+ux*5,ax,ay);g.lineBetween(ax-ux*8+uy*5,ay-uy*8-ux*5,ax,ay);
 }else{
  g.lineStyle(1.5,0xffb089,.65);g.strokeEllipse(e.x,e.y+radius*.5,radius*2.2,radius);
  if(!reduced){
   const strength=Math.min(1,charging/.25);
   for(let i=-1;i<=1;i++){const side=i*(radius*.65),start=radius+6,end=start+16+(i===0?10:0),x=e.x-uy*side,y=e.y+ux*side;g.lineStyle(i===0?2:1.5,0xffb687,strength*(i===0?.6:.4));g.lineBetween(x-ux*start,y-uy*start,x-ux*end,y-uy*end);}
  }
 }
}
