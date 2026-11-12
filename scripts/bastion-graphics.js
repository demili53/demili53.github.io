/* Deterministic scenery uses no combat RNG or independent animation timers. */
function drawBastionTerrain(g, map) {
 const palettes={grove:[0x102c29,0x193e32,0x274d3b,0x9bbe80],canyon:[0x30252b,0x54372e,0x765044,0xe5ad72],glacier:[0x132a40,0x23465c,0x3c6475,0xafe9f3]};
 const [deep,base,stone,light]=palettes[map];
 const polygon=(coords,color,alpha=1)=>{g.fillStyle(color,alpha);g.fillPoints(coords.map(([x,y])=>({x,y})),true);};
 const noise=n=>{const v=Math.sin(n*127.1+43.7)*43758.5453;return v-Math.floor(v);};
 g.clear();g.fillStyle(deep);g.fillRect(0,0,720,720);
 // Layered terrain patches replace the uniform square grid.
 for(let i=0;i<170;i++){const x=noise(i*3)*720,y=noise(i*3+1)*720,r=12+noise(i*3+2)*38;g.fillStyle(i%3?base:stone,.12+noise(i+30)*.12);g.fillEllipse(x,y,r*2,r);}
 // Fine ground grain is baked into the static background once per map.
 for(let i=0;i<1800;i++){const x=noise(i*11+1700)*720,y=noise(i*11+1701)*720;g.fillStyle(i%4?light:deep,i%4?.025:.14);g.fillEllipse(x,y,1+noise(i+1900)*4,.7+noise(i+1901)*2);}
 const lanes=map==='grove'?[0,1,2,3]:map==='canyon'?[1,3]:[0,2];
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
  if(map==='grove'){
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
 const t=reduced?0:model.time,map=model.map,color=map==='grove'?0xd4ef9b:map==='canyon'?0xffc07a:0xd0f3ff;
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
 if(e.kind==='armored'){
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
