'use strict';
// 균열의 검 — procedural art: region backdrops, rigged characters, bosses, telegraphs and particles.
const RiftArt=(()=>{
 const TAU=Math.PI*2,W=960,H=540;
 const bgCache=new Map();
 const rnd=seed=>()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 const shade=(hex,amt)=>{const n=parseInt(hex.slice(1,7),16);let r=n>>16,g=n>>8&255,b=n&255;const f=v=>Math.max(0,Math.min(255,Math.round(amt<0?v*(1+amt):v+(255-v)*amt)));return'#'+[f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('');};
 const alpha=(hex,a)=>hex.slice(0,7)+Math.round(Math.max(0,Math.min(1,a))*255).toString(16).padStart(2,'0');
 function glow(g,x,y,r,color){const gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,color);gr.addColorStop(1,alpha(color,0));g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,TAU);g.fill();}
 function poly(g,pts,fill,stroke,lw=2){g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.lineJoin='round';g.stroke();}}
 function ellipse(g,x,y,rx,ry,fill,stroke,lw=2){g.beginPath();g.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);if(fill){g.fillStyle=fill;g.fill();}if(stroke){g.strokeStyle=stroke;g.lineWidth=lw;g.stroke();}}
 const OUT='#0b0d16';

 // ---------------- backgrounds ----------------
 const REGION_STYLE=[
  {sky:['#2b1d33','#6b3a3f','#d98a55'],far:'#2a2030',mid:'#3a2c38',floor:['#4a4048','#2a2430'],line:'#5c5058',dark:'#160f1c',light:'#ffb070',fog:'#e7a37a'},
  {sky:['#0d2420','#1d4a3c','#4c8a63'],far:'#12302a',mid:'#1a3d32',floor:['#2f4a35','#18291e'],line:'#3d5c44',dark:'#06140f',light:'#b9f7a0',fog:'#9fe0b0'},
  {sky:['#0b1830','#1e3f63','#7cc0e0'],far:'#162c48',mid:'#20405f',floor:['#9ab9cf','#4a6a86'],line:'#c8e2f2',dark:'#07122a',light:'#bfeaff',fog:'#d4f1ff'},
  {sky:['#1a0806','#4d1408','#c2441c'],far:'#2a0c08',mid:'#3b130c',floor:['#3a2420','#1a0d0b'],line:'#5a3328',dark:'#120403',light:'#ffa260',fog:'#ff7a40'},
  {sky:['#0a0418','#2a0d3e','#a0307a'],far:'#1c0a2c',mid:'#2b1040',floor:['#2a1c3c','#120a20'],line:'#5a3a7a',dark:'#07020f',light:'#ff7fc8',fog:'#c47dff'}
 ];
 function floor(g,s,r){
  const top=268,gr=g.createLinearGradient(0,top,0,H);gr.addColorStop(0,s.floor[0]);gr.addColorStop(1,s.floor[1]);g.fillStyle=gr;g.fillRect(0,top,W,H-top);
  g.strokeStyle=alpha(s.line,.55);g.lineWidth=1.5;
  for(let i=0;i<9;i++){const y=top+Math.pow(i/8,1.6)*(H-top);g.globalAlpha=.25+.5*i/8;g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
  g.globalAlpha=.35;for(let i=-12;i<=12;i++){g.beginPath();g.moveTo(W/2+i*42,top);g.lineTo(W/2+i*150,H);g.stroke();}
  g.globalAlpha=1;
  for(let i=0;i<70;i++){const x=r()*W,y=top+20+r()*(H-top-20),w=8+r()*30;g.fillStyle=alpha(i%2?s.line:s.dark,.25+r()*.25);g.beginPath();g.ellipse(x,y,w,w*.18,0,0,TAU);g.fill();}
  const edge=g.createLinearGradient(0,top-6,0,top+30);edge.addColorStop(0,alpha(s.dark,.9));edge.addColorStop(1,alpha(s.dark,0));g.fillStyle=edge;g.fillRect(0,top-6,W,36);
 }
 function skyline(g,color,base,amp,step,r,fn){g.fillStyle=color;g.beginPath();g.moveTo(0,H);g.lineTo(0,base);for(let x=0;x<=W+step;x+=step){fn?fn(x,r):g.lineTo(x,base-r()*amp);}g.lineTo(W,H);g.closePath();g.fill();}
 function buildBackground(region){
  const c=document.createElement('canvas');c.width=W*2;c.height=H*2;const g=c.getContext('2d');g.scale(2,2);const s=REGION_STYLE[region],r=rnd(97+region*31);
  const sky=g.createLinearGradient(0,0,0,300);sky.addColorStop(0,s.sky[0]);sky.addColorStop(.6,s.sky[1]);sky.addColorStop(1,s.sky[2]);g.fillStyle=sky;g.fillRect(0,0,W,300);
  for(let i=0;i<60;i++){g.fillStyle=`rgba(255,255,255,${.15+r()*.5})`;g.fillRect(r()*W,r()*150,1.2,1.2);}
  if(region===0){
   glow(g,700,190,170,'#ffb26b66');ellipse(g,700,190,46,46,'#ffd29a');
   skyline(g,'#3a2635',230,0,1,r,(x,r)=>{const h=x%180<30?90:x%90<20?55:25;g.lineTo(x,230-h-r()*8);g.lineTo(x+30,230-h-r()*8);});
   skyline(g,s.far,268,0,60,r,(x,r)=>{const t=x%240<40;g.lineTo(x,t?150:205);g.lineTo(x+20,t?140:205);g.lineTo(x+40,t?150:205);g.lineTo(x+60,205);});
   // great gate
   g.fillStyle='#2c2230';g.fillRect(330,95,300,175);poly(g,[[320,95],[480,40],[640,95]],'#2c2230');
   g.fillStyle='#120c16';g.beginPath();g.moveTo(400,270);g.lineTo(400,160);g.arc(480,160,80,Math.PI,0);g.lineTo(560,270);g.fill();
   g.strokeStyle='#4a3a42';g.lineWidth=3;for(let x=410;x<560;x+=18){g.beginPath();g.moveTo(x,270);g.lineTo(x,110+Math.abs(480-x)*.5);g.stroke();}
   for(const bx of [250,710]){g.fillStyle='#7a2a2a';poly(g,[[bx,110],[bx+40,110],[bx+40,200],[bx+20,185],[bx,200]],'#7a2a2a',OUT,1.5);g.fillStyle='#e9b77d';g.beginPath();g.arc(bx+20,145,9,0,TAU);g.fill();}
  }else if(region===1){
   for(let i=0;i<7;i++){g.fillStyle=`rgba(190,255,200,${.04+i*.01})`;poly(g,[[100+i*130,0],[160+i*130,0],[260+i*130,300],[180+i*130,300]],g.fillStyle);}
   for(let layer=0;layer<3;layer++){const col=[s.far,s.mid,'#0f241b'][layer];for(let i=0;i<9;i++){const x=r()*W,w=18+layer*14+r()*20;g.fillStyle=col;g.fillRect(x-w/2,0,w,275);g.beginPath();g.ellipse(x,40+r()*60,70+layer*20,50,0,0,TAU);g.fill();}}
   for(let i=0;i<26;i++){const x=r()*W;g.strokeStyle='#2c5a3c';g.lineWidth=2;g.beginPath();g.moveTo(x,0);g.quadraticCurveTo(x+10,60,x-4,40+r()*120);g.stroke();}
   for(let i=0;i<12;i++){const x=r()*W,y=262+r()*12;g.fillStyle='#d8f7a0';g.beginPath();g.ellipse(x,y-6,7,4,0,Math.PI,0);g.fill();g.fillStyle='#e8f0d0';g.fillRect(x-1.5,y-6,3,7);glow(g,x,y-6,16,'#c8ff9a55');}
  }else if(region===2){
   glow(g,480,80,300,'#7ce0ff22');
   g.fillStyle=s.far;g.beginPath();g.moveTo(0,0);for(let x=0;x<=W;x+=24){g.lineTo(x,0);g.lineTo(x+12,30+r()*90);}g.lineTo(W,0);g.fill();
   skyline(g,s.mid,268,0,40,r,(x,r)=>{g.lineTo(x,200-r()*60);g.lineTo(x+20,190-r()*80);});
   for(let i=0;i<9;i++){const x=40+r()*880,y=255+r()*15,hgt=40+r()*70;poly(g,[[x-14,y],[x-4,y-hgt],[x+8,y-hgt*.7],[x+16,y]],'#8fdcff',OUT,1.5);poly(g,[[x-4,y-hgt],[x+2,y],[x-10,y]],'#e6faff88');glow(g,x,y-hgt*.5,50,'#8fdcff33');}
  }else if(region===3){
   glow(g,480,300,420,'#ff5a2044');
   skyline(g,s.far,250,0,70,r,(x,r)=>{g.lineTo(x,240-r()*40);g.lineTo(x+35,180-r()*90);g.lineTo(x+55,235);});
   for(const px of [140,330,630,820]){g.fillStyle='#1c0a08';g.fillRect(px-22,90,44,180);g.fillStyle='#2e120c';g.fillRect(px-28,82,56,14);g.fillRect(px-28,256,56,14);g.strokeStyle='#ff6a2a55';g.lineWidth=2;g.beginPath();g.moveTo(px-8,110);g.lineTo(px+4,170);g.lineTo(px-6,230);g.stroke();}
   poly(g,[[400,268],[420,225],[540,225],[560,268]],'#2a0e0a',OUT,2);glow(g,480,215,90,'#ff8a3a66');
  }else{
   glow(g,480,120,380,'#c03aa044');
   g.save();g.translate(480,120);for(let i=0;i<3;i++){g.strokeStyle=['#ff7fd0','#ffd0f0','#ffffff'][i];g.lineWidth=[16,6,2][i];g.globalAlpha=[.35,.7,1][i];g.beginPath();g.moveTo(-10,-110);g.lineTo(12,-50);g.lineTo(-14,0);g.lineTo(10,60);g.lineTo(-6,130);g.stroke();}g.restore();
   for(let i=0;i<10;i++){const x=r()*W,y=40+r()*190,w=20+r()*50;poly(g,[[x-w,y],[x+w,y],[x+w*.5,y+w*.7],[x-w*.3,y+w*.9]],s.mid,OUT,1.5);g.fillStyle='#4a2a6a';g.fillRect(x-w,y-3,w*2,5);}
  }
  floor(g,s,r);
  if(region===4){g.strokeStyle='#ff7fd044';g.lineWidth=2;for(let i=0;i<6;i++){g.beginPath();g.ellipse(480,410,120+i*70,30+i*18,0,0,TAU);g.stroke();}}
  if(region===3){g.strokeStyle='#ff6a2a';g.lineWidth=2.5;for(let i=0;i<9;i++){let x=r()*W,y=300+r()*220;g.beginPath();g.moveTo(x,y);for(let k=0;k<5;k++){x+=(r()-.3)*50;y+=(r()-.5)*16;g.lineTo(x,y);}g.stroke();}}
  if(region===2){g.fillStyle='#ffffff22';for(let i=0;i<40;i++)ellipse(g,r()*W,300+r()*230,10+r()*30,3,'#ffffff1a');}
  return c;
 }
 function background(g,region,t,reduced){
  if(!bgCache.has(region))bgCache.set(region,buildBackground(region));
  g.drawImage(bgCache.get(region),0,0,W,H);const s=REGION_STYLE[region];
  // animated: drifting fog bands and torches / lava pulses
  g.save();for(let i=0;i<3;i++){const y=250+i*22,off=reduced?0:(t*(8+i*5))%W;g.globalAlpha=.08+i*.03;const gr=g.createLinearGradient(0,y-30,0,y+30);gr.addColorStop(0,alpha(s.fog,0));gr.addColorStop(.5,alpha(s.fog,1));gr.addColorStop(1,alpha(s.fog,0));g.fillStyle=gr;g.save();g.translate(off,0);g.fillRect(-W,y-30,W*2,60);g.restore();}g.restore();
  if(region===0)for(const tx of [140,820])torch(g,tx,215,t,'#ffb35c');
  if(region===3)for(const tx of [230,730])torch(g,tx,240,t,'#ff7a30');
  if(region===4){g.save();g.globalCompositeOperation='lighter';glow(g,480,120,120+Math.sin(t*2)*15,'#ff7fd033');g.restore();}
  if(region===1&&!reduced){g.save();g.globalCompositeOperation='lighter';for(let i=0;i<5;i++){g.globalAlpha=.05+.04*Math.sin(t*.7+i);poly(g,[[90+i*190,0],[140+i*190,0],[250+i*190,280],[170+i*190,280]],'#d8ffd0');}g.restore();}
 }
 function torch(g,x,y,t,color){g.fillStyle='#2a1c18';g.fillRect(x-4,y,8,40);poly(g,[[x-10,y],[x+10,y],[x+6,y+8],[x-6,y+8]],'#4a3428',OUT,1.5);
  const f=Math.sin(t*14+x)*2,f2=Math.cos(t*11+x)*2;g.save();g.globalCompositeOperation='lighter';glow(g,x,y-10,60,alpha(color,.35));
  poly(g,[[x-9,y],[x-5+f,y-16],[x+f2,y-30],[x+5-f,y-15],[x+9,y]],alpha(color,.9));poly(g,[[x-4,y],[x+f*.5,y-17],[x+4,y]],'#fff3c8');g.restore();}
 const lightsOf=region=>[[140,205,150,REGION_STYLE[region].light],[820,205,150,REGION_STYLE[region].light]].filter(()=>region===0||region===3).concat(region===4?[[480,120,260,'#ff7fd0']]:region===2?[[480,80,300,'#9fe2ff']]:region===1?[[480,0,340,'#c8ffb0']]:region===3?[[480,215,200,'#ff8a3a']]:[[700,190,260,'#ffb26b']]);

 // ---------------- rigged figures ----------------
 function limb(g,x1,y1,x2,y2,w1,w2,color,hi){
  const a=Math.atan2(y2-y1,x2-x1),nx=Math.sin(a),ny=-Math.cos(a);
  g.beginPath();g.moveTo(x1+nx*w1,y1+ny*w1);g.lineTo(x2+nx*w2,y2+ny*w2);g.arc(x2,y2,w2,a-Math.PI/2,a+Math.PI/2);g.lineTo(x1-nx*w1,y1-ny*w1);g.arc(x1,y1,w1,a+Math.PI/2,a+Math.PI*1.5);g.closePath();
  g.fillStyle=color;g.fill();g.strokeStyle=OUT;g.lineWidth=2;g.stroke();
  if(hi){g.strokeStyle=hi;g.lineWidth=Math.max(1,w2*.5);g.beginPath();g.moveTo(x1+nx*w1*.45,y1+ny*w1*.45);g.lineTo(x2+nx*w2*.45,y2+ny*w2*.45);g.stroke();}
 }
 const pt=(x,y,a,l)=>[x+Math.sin(a)*l,y+Math.cos(a)*l];
 function weapon(g,kind,x,y,a,pal,t,glowC){
  g.save();g.translate(x,y);g.rotate(-a);
  if(kind==='sword'){g.fillStyle='#3a2a20';g.fillRect(-2.5,-6,5,14);poly(g,[[-10,-6],[10,-6],[8,-2],[-8,-2]],pal.trim,OUT,1.5);
   poly(g,[[-4,-6],[4,-6],[3,-52],[0,-60],[-3,-52]],'#e8f2f8',OUT,1.5);g.strokeStyle=glowC||pal.glow;g.lineWidth=1.5;g.beginPath();g.moveTo(0,-8);g.lineTo(0,-56);g.stroke();}
  else if(kind==='staff'){g.fillStyle='#4a3428';g.fillRect(-2,-58,4,76);g.strokeStyle=OUT;g.lineWidth=1.5;g.strokeRect(-2,-58,4,76);poly(g,[[-8,-56],[0,-72],[8,-56],[0,-50]],pal.trim,OUT,1.5);
   g.save();g.globalCompositeOperation='lighter';glow(g,0,-64,20+Math.sin(t*6)*3,alpha(pal.glow,.8));g.restore();ellipse(g,0,-64,5,5,'#ffffff');}
  else if(kind==='bow'){g.strokeStyle='#5a3c22';g.lineWidth=4;g.beginPath();g.arc(-14,0,30,-1.2,1.2);g.stroke();g.strokeStyle=OUT;g.lineWidth=1;g.stroke();g.strokeStyle='#e8e0c8';g.lineWidth=1;g.beginPath();g.moveTo(-14+Math.cos(-1.2)*30,Math.sin(-1.2)*30);g.lineTo(-14+Math.cos(1.2)*30,Math.sin(1.2)*30);g.stroke();}
  else if(kind==='spear'){g.fillStyle='#3a2a24';g.fillRect(-2,-50,4,70);poly(g,[[-5,-50],[0,-68],[5,-50]],'#9aa4b4',OUT,1.5);}
  else if(kind==='blade'){poly(g,[[-3,-4],[3,-4],[5,-40],[0,-48],[-4,-38]],'#8e96a8',OUT,1.5);g.fillStyle='#2a2028';g.fillRect(-2,-4,4,10);}
  else if(kind==='maul'){g.fillStyle='#3a2a24';g.fillRect(-3,-46,6,62);poly(g,[[-16,-62],[16,-62],[18,-42],[-18,-42]],'#5e6472',OUT,2);g.fillStyle=alpha(pal.glow,.8);g.fillRect(-12,-55,24,4);}
  else if(kind==='hammer'){g.fillStyle='#3a2a24';g.fillRect(-4,-60,8,80);poly(g,[[-26,-82],[26,-82],[30,-56],[-30,-56]],'#6a5a48',OUT,2.5);poly(g,[[-22,-78],[22,-78],[24,-72],[-24,-72]],pal.trim);}
  else if(kind==='flamesword'){poly(g,[[-5,-6],[5,-6],[4,-74],[0,-84],[-4,-74]],'#3a2020',OUT,1.5);g.save();g.globalCompositeOperation='lighter';for(let i=0;i<6;i++){const yy=-12-i*12,f=Math.sin(t*16+i)*4;poly(g,[[-6,yy],[f,yy-18],[6,yy]],alpha('#ff8a3a',.7));}glow(g,0,-45,40,'#ff6a2a55');g.restore();g.fillStyle='#2a1a14';g.fillRect(-3,-6,6,16);poly(g,[[-12,-6],[12,-6],[10,-1],[-10,-1]],'#c8862a',OUT,1.5);}
  else if(kind==='dagger'){poly(g,[[-3,-4],[3,-4],[4,-34],[0,-44],[-3,-34]],'#d8e2f0',OUT,1.5);g.strokeStyle=glowC||'#ffe66a';g.lineWidth=1.2;g.beginPath();g.moveTo(0,-6);g.lineTo(0,-38);g.stroke();poly(g,[[-8,-4],[8,-4],[6,0],[-6,0]],'#c8a040',OUT,1.2);g.fillStyle='#2a2028';g.fillRect(-2,0,4,9);
   g.save();g.globalCompositeOperation='lighter';if(Math.sin(t*23+x)>.3){g.strokeStyle='#fff6a0';g.lineWidth=1.2;g.beginPath();g.moveTo(2,-40);g.lineTo(7,-30);g.lineTo(1,-26);g.lineTo(6,-16);g.stroke();}glow(g,0,-24,16,'#ffe66a44');g.restore();}
  else if(kind==='stormrod'){g.fillStyle='#3a3448';g.fillRect(-2,-60,4,78);g.strokeStyle=OUT;g.lineWidth=1.5;g.strokeRect(-2,-60,4,78);poly(g,[[-9,-58],[-3,-74],[0,-64],[3,-76],[9,-58],[0,-54]],'#c8a040',OUT,1.5);
   g.save();g.globalCompositeOperation='lighter';glow(g,0,-68,22+Math.sin(t*14)*4,'#ffe66aaa');g.strokeStyle='#fffbd0';g.lineWidth=1.3;g.beginPath();const k=Math.floor(t*12);for(let i=0;i<4;i++){const a2=(k*1.7+i*1.57)%TAU;g.moveTo(0,-68);g.lineTo(Math.cos(a2)*9,-68+Math.sin(a2)*9);g.lineTo(Math.cos(a2+.4)*15,-68+Math.sin(a2+.4)*15);}g.stroke();g.restore();ellipse(g,0,-68,4,4,'#ffffff');}
  else if(kind==='venombow'){g.strokeStyle='#2e4a24';g.lineWidth=4.5;g.beginPath();g.arc(-12,0,27,-1.25,1.25);g.stroke();g.strokeStyle=OUT;g.lineWidth=1;g.stroke();for(const sg of [-1,1]){poly(g,[[-12+Math.cos(1.25*sg)*27,Math.sin(1.25*sg)*27],[-4+Math.cos(1.25*sg)*27,Math.sin(1.25*sg)*27+sg*6],[-14+Math.cos(1.1*sg)*27,Math.sin(1.1*sg)*27]],'#9dff6a',OUT,1);}
   g.strokeStyle='#d8f0c0';g.lineWidth=1;g.beginPath();g.moveTo(-12+Math.cos(-1.25)*27,Math.sin(-1.25)*27);g.lineTo(-12+Math.cos(1.25)*27,Math.sin(1.25)*27);g.stroke();g.save();g.globalCompositeOperation='lighter';glow(g,-12,0,18,'#9dff6a33');g.restore();}
  else if(kind==='crossbow'){g.fillStyle='#4a3020';g.fillRect(-4,-26,8,40);g.strokeStyle=OUT;g.lineWidth=1.5;g.strokeRect(-4,-26,8,40);g.strokeStyle='#6a4a2a';g.lineWidth=5;g.beginPath();g.moveTo(-22,-14);g.quadraticCurveTo(0,-30,22,-14);g.stroke();g.strokeStyle=OUT;g.lineWidth=1;g.stroke();
   g.strokeStyle='#e8d8b0';g.lineWidth=1;g.beginPath();g.moveTo(-22,-14);g.lineTo(0,-6);g.lineTo(22,-14);g.stroke();poly(g,[[-2,-32],[2,-32],[0,-42]],'#ff8a3a',OUT,1);g.save();g.globalCompositeOperation='lighter';glow(g,0,-36,14+Math.sin(t*15)*3,'#ff8a3a99');g.restore();}
  else if(kind==='icestaff'){g.fillStyle='#bcd6e6';g.fillRect(-2,-70,4,92);poly(g,[[-10,-70],[0,-98],[10,-70],[0,-62]],'#bff0ff',OUT,1.5);g.save();g.globalCompositeOperation='lighter';glow(g,0,-80,28,'#9fe2ffaa');g.restore();}
  g.restore();
 }
 // Upgraded weapons glow: brighter per level, a white core from awakening (3), a gold halo and motes when legendary (6).
 function tierAura(g,x,y,a,lv,col,t){if(lv<2)return;g.save();g.translate(x,y);g.rotate(-a);g.globalCompositeOperation='lighter';
  const k=(lv-1)/5,pulse=.75+.25*Math.sin(t*6),gold=lv>=6;
  for(let i=0;i<4;i++)glow(g,0,-12-i*14,(10+k*16)*pulse,alpha(gold&&i%2?'#ffd86a':col,.16+k*.22));
  if(lv>=3){g.strokeStyle=alpha('#ffffff',.25+k*.35);g.lineWidth=2+k*2;g.beginPath();g.moveTo(0,-6);g.lineTo(0,-58);g.stroke();}
  if(gold)for(let i=0;i<5;i++){const q=(t*.9+i/5)%1;ellipse(g,Math.sin(t*3+i*2)*9,-8-q*64,1.8*(1-q)+.6,1.8*(1-q)+.6,alpha('#ffe9a0',1-q));}
  g.restore();}
 // A biped drawn facing right; `o.face` mirrors it. Pose angles are in radians from straight down.
 function figure(g,o){
  const pal=o.pal,s=o.scale||1,p=o.pose;
  g.save();g.translate(o.x,o.y-(o.z||0));g.scale(o.face*s,s);
  const bob=p.bob||0,hipY=-40+bob,shY=-70+bob,lean=p.lean||0,hipX=0,shX=Math.sin(lean)*30,wide=o.wide||1;
  if(o.cape){const sw=Math.sin((o.t||0)*4)*4+(p.capeLift||0);g.fillStyle=o.cape;g.beginPath();g.moveTo(shX-8,shY+2);g.quadraticCurveTo(shX-30-sw,shY+30,shX-26-sw*2,hipY+28);g.lineTo(shX-6,hipY+20);g.closePath();g.fill();g.strokeStyle=OUT;g.lineWidth=2;g.stroke();}
  // back leg & arm
  if(!o.noLegs){const [kx,ky]=pt(hipX-4,hipY,p.legB,21),[fx,fy]=pt(kx,ky,p.legB-(p.kneeB||0),20);limb(g,hipX-4,hipY,kx,ky,6.5*wide,5,shade(pal.cloth,-.25));limb(g,kx,ky,fx,fy,5,4.5,shade(pal.boot,-.2));ellipse(g,fx+4,fy+1,7,3.5,shade(pal.boot,-.3),OUT,1.5);}
  {const [ex,ey]=pt(shX-6*wide,shY+4,p.armB,15),[hx,hy]=pt(ex,ey,p.armB-(p.elbowB||0),14);limb(g,shX-6*wide,shY+4,ex,ey,5*wide,4.2,shade(pal.cloth2,-.25));limb(g,ex,ey,hx,hy,4.2,3.8,shade(pal.skinArm||pal.skin,-.2));if(o.backWeapon){const wb=p.armB-(p.elbowB||0)+(p.weaponB||0);if(o.tier)tierAura(g,hx,hy,wb,o.tier,o.glow,o.t);weapon(g,o.backWeapon,hx,hy,wb,pal,o.t,o.glow);}if(o.shield){g.save();g.translate(hx,hy);poly(g,[[-6,-26],[16,-26],[18,10],[5,24],[-8,10]],pal.metal,OUT,2.5);poly(g,[[0,-20],[12,-20],[12,6],[5,14],[0,6]],shade(pal.metal,.25));g.restore();}}
  // torso
  if(o.robe){poly(g,[[hipX-14*wide,hipY+30],[shX-12*wide,shY],[shX+12*wide,shY],[hipX+16*wide,hipY+30]],pal.cloth,OUT,2);poly(g,[[shX-3,shY],[shX+5,shY],[hipX+6,hipY+30],[hipX-2,hipY+30]],shade(pal.cloth,.18));}
  poly(g,[[hipX-10*wide,hipY+4],[shX-13*wide,shY],[shX+13*wide,shY],[hipX+11*wide,hipY+4]],pal.cloth2,OUT,2.2);
  poly(g,[[shX-10*wide,shY+2],[shX+11*wide,shY+2],[hipX+8*wide,hipY-6],[hipX-7*wide,hipY-6]],pal.metal,OUT,1.8);
  poly(g,[[shX+2,shY+3],[shX+10*wide,shY+3],[hipX+6*wide,hipY-8],[hipX+1,hipY-8]],shade(pal.metal,.3));
  g.fillStyle=pal.trim;g.fillRect(hipX-10*wide,hipY-4,21*wide,5);g.strokeStyle=OUT;g.lineWidth=1.5;g.strokeRect(hipX-10*wide,hipY-4,21*wide,5);
  // front leg
  if(!o.noLegs){const [kx,ky]=pt(hipX+4,hipY,p.legA,21),[fx,fy]=pt(kx,ky,p.legA-(p.kneeA||0),20);limb(g,hipX+4,hipY,kx,ky,7*wide,5.5,pal.cloth,shade(pal.cloth,.25));limb(g,kx,ky,fx,fy,5.5,4.8,pal.boot,shade(pal.boot,.3));ellipse(g,fx+5,fy+1,7.5,3.8,pal.boot,OUT,1.5);}
  else{const sway=Math.sin((o.t||0)*3)*5;g.fillStyle=pal.cloth;g.beginPath();g.moveTo(hipX-14,hipY-2);g.quadraticCurveTo(hipX-18+sway,hipY+26,hipX-10+sway*2,hipY+44);g.lineTo(hipX-2+sway,hipY+34);g.lineTo(hipX+4+sway*1.5,hipY+46);g.lineTo(hipX+10+sway,hipY+32);g.lineTo(hipX+16,hipY-2);g.closePath();g.fill();g.strokeStyle=OUT;g.lineWidth=2;g.stroke();}
  // shoulder pad, head
  ellipse(g,shX+6*wide,shY+3,9*wide,6.5,pal.metal,OUT,2);ellipse(g,shX+8*wide,shY+1,4*wide,2.5,shade(pal.metal,.4));
  const hx=shX+3+Math.sin(lean)*6,hy=shY-12+(p.head||0);
  g.save();g.translate(hx,hy);g.rotate(p.headTilt||0);
  if(o.helm==='hood'){poly(g,[[-13,6],[-12,-8],[0,-17],[12,-8],[14,6],[8,10],[-8,10]],pal.hood||pal.cloth,OUT,2);ellipse(g,3,0,8,8,'#05060c');ellipse(g,6,-1,1.8,1.8,o.eye);ellipse(g,1,-1,1.6,1.6,o.eye);}
  else if(o.helm==='helm'){ellipse(g,0,0,11.5,12,pal.metal,OUT,2);poly(g,[[1,-3],[13,-4],[13,3],[1,3]],'#05060c');ellipse(g,8,0,2,1.6,o.eye);g.save();g.globalCompositeOperation='lighter';glow(g,8,0,7,alpha(o.eye,.8));g.restore();ellipse(g,-2,-6,6,3,shade(pal.metal,.35));if(o.horns){poly(g,[[-6,-9],[-14,-24],[-2,-11]],pal.trim,OUT,1.5);poly(g,[[4,-11],[10,-26],[9,-9]],pal.trim,OUT,1.5);}if(o.crest){poly(g,[[-10,-8],[-4,-16],[6,-14],[-2,-8]],o.crest,OUT,1.5);}}
  else{ellipse(g,0,0,11,11.5,pal.skin,OUT,2);g.fillStyle=pal.hair;g.beginPath();g.moveTo(-12,2);g.quadraticCurveTo(-13,-14,2,-13);g.quadraticCurveTo(13,-12,12,-3);g.lineTo(5,-6);g.lineTo(-2,-3);g.lineTo(-6,4);g.closePath();g.fill();g.strokeStyle=OUT;g.lineWidth=1.8;g.stroke();
   if(o.hat){poly(g,[[-16,-6],[18,-8],[4,-12],[2,-34],[-6,-12]],o.hat,OUT,2);}
   ellipse(g,6,1,1.8,2.4,'#151826');g.fillStyle=pal.skin;g.fillRect(8,4,3,1.5);if(o.band){g.fillStyle=o.band;g.fillRect(-11,-7,20,3);g.beginPath();g.moveTo(-11,-6);g.lineTo(-20,-2+Math.sin((o.t||0)*6)*3);g.lineTo(-11,-3);g.fill();}}
  g.restore();
  // front arm + weapon
  {const ax=shX+7*wide,ay=shY+4,[ex,ey]=pt(ax,ay,p.armF,15),[hx2,hy2]=pt(ex,ey,p.armF-(p.elbowF||0),14);limb(g,ax,ay,ex,ey,5.5*wide,4.5,pal.cloth2,shade(pal.cloth2,.25));limb(g,ex,ey,hx2,hy2,4.5,4,pal.skinArm||pal.skin);if(o.weapon){const wa=p.armF-(p.elbowF||0)+(p.weaponA||0);if(o.tier)tierAura(g,hx2,hy2,wa,o.tier,o.glow,o.t);weapon(g,o.weapon,hx2,hy2,wa,pal,o.t,o.glow);}}
  g.restore();
 }
 function poseFor(state,q,t,kind){
  const p={legA:.12,legB:-.12,kneeA:.15,kneeB:.15,armF:.35,elbowF:-.5,armB:-.15,elbowB:-.3,lean:0,bob:Math.sin(t*3)*1.2,head:0,headTilt:0,weaponA:0,weaponB:0};
  if(state==='run'){const c=t*13;p.legA=Math.sin(c)*.75;p.legB=-Math.sin(c)*.75;p.kneeA=-.2-Math.max(0,Math.cos(c))*.9;p.kneeB=-.2-Math.max(0,-Math.cos(c))*.9;p.armB=Math.sin(c)*.6;p.lean=.14;p.bob=-Math.abs(Math.sin(c))*3;p.armF=.5-Math.sin(c)*.3;}
  else if(state==='dash'){p.legA=.9;p.legB=-.9;p.kneeA=-.4;p.kneeB=-.6;p.lean=.5;p.armF=1.2;p.armB=-1;p.bob=4;p.capeLift=-14;}
  else if(state==='hurt'){p.lean=-.3;p.armF=-.6;p.armB=.7;p.headTilt=-.25;p.legA=-.2;p.legB=.3;}
  else if(state==='air'){p.lean=-.6;p.legA=.6;p.legB=-.4;p.armF=-1.8;p.armB=2;p.headTilt=-.4;}
  else if(state==='wind'){p.lean=-.12;p.armF=-2.2;p.elbowF=-.6;p.armB=.5;p.legA=.35;p.legB=-.35;p.kneeA=-.25;}
  else if(state==='strike'){p.lean=.25;p.armF=1.5;p.elbowF=-.15;p.armB=-.6;p.legA=.5;p.legB=-.5;p.kneeA=-.3;}
  else if(state==='attack'){
   if(kind==='swing0'){const k=easeOut(q);p.armF=-2.4+k*3.9;p.elbowF=-.5+k*.4;p.lean=-.1+k*.35;p.legA=.45;p.legB=-.45;}
   else if(kind==='swing1'){const k=easeOut(q);p.armF=1.6-k*3.4;p.elbowF=-.2;p.lean=.2;p.legA=.5;p.legB=-.4;p.weaponA=-.3;}
   else if(kind==='swing2'){const k=q<.35?q/.35:1;p.armF=-3+easeOut(k)*4.6;p.elbowF=-.2;p.lean=-.25+k*.6;p.legA=.7;p.legB=-.6;p.kneeA=-.5;p.bob=k*4;}
   else if(kind==='spin'){p.armF=1.6;p.elbowF=0;p.armB=-1.6;p.lean=.1;p.legA=.5;p.legB=-.5;}
   else if(kind==='cast'){const k=Math.sin(Math.min(1,q*1.6)*Math.PI);p.armF=1.2+k*.5;p.elbowF=-.1;p.armB=-.4-k*.6;p.lean=.1;p.legA=.35;p.legB=-.3;p.weaponA=-.4;}
   else if(kind==='raise'){p.armF=-2.9;p.elbowF=0;p.armB=-2.4;p.lean=-.15;p.legA=.3;p.legB=-.3;p.weaponA=0;}
   else if(kind==='draw'){p.armF=1.57;p.elbowF=0;p.armB=1.45;p.elbowB=-1.2;p.lean=.06;p.legA=.4;p.legB=-.35;p.weaponA=-1.57;}
   else if(kind==='lunge'){const k=easeOut(q);p.armF=-2.6+k*4.2;p.lean=.45*k;p.legA=.9;p.legB=-.8;p.kneeA=-.6;p.bob=6*k;}
  }
  return p;
 }
 const easeOut=q=>1-Math.pow(1-Math.max(0,Math.min(1,q)),3);
 const HERO_PAL={
  blade:{skin:'#f1c7a2',hair:'#e9edf5',cloth:'#2d4a63',cloth2:'#3b6d86',metal:'#a9b9c6',trim:'#d8b26a',boot:'#3a2c28',glow:'#7fe6d3'},
  arcanist:{skin:'#f3cfb0',hair:'#4a3270',cloth:'#3d2a66',cloth2:'#5a3f8f',metal:'#c9b8f0',trim:'#e8c770',boot:'#2a2238',glow:'#b9a2ff'},
  ranger:{skin:'#e9bb94',hair:'#7a4a2a',cloth:'#33502c',cloth2:'#4f7a3d',metal:'#b3a27a',trim:'#d9c58a',boot:'#4a3424',glow:'#a6eb8f'}
 };
 const ENEMY_PAL={
  grunt:{skin:'#5a5468',cloth:'#2a2638',cloth2:'#3a3450',metal:'#6e6a82',trim:'#a04070',boot:'#1e1a28',glow:'#ff5fa8'},
  archer:{skin:'#4a4458',cloth:'#22242e',cloth2:'#33323f',metal:'#4a4a5a',trim:'#6a8a5a',boot:'#1a1a22',glow:'#9dff7a',hood:'#1c1e28'},
  brute:{skin:'#5c5464',cloth:'#2e2a36',cloth2:'#463e52',metal:'#7c7890',trim:'#c0604a',boot:'#221e28',glow:'#ff8a5a'},
  wraith:{skin:'#9ab0c8',cloth:'#3a4a6a',cloth2:'#4a5a80',metal:'#6a7aa0',trim:'#a0c8ff',boot:'#20283a',glow:'#a0e8ff',hood:'#2a3550'}
 };
 function heroFigure(g,p,game,t,flash){
  const h=game.heroId,a=p.act;let state=p.dash>0?'dash':p.hurt>0?'hurt':a?'attack':p.moving?'run':'idle',kind='',q=a?a.t/a.dur:0;
  if(a){if(h==='blade')kind=a.kind==='basic'?'swing'+a.step:a.kind==='skill'?'spin':'lunge';else if(h==='arcanist')kind=a.kind==='ult'?'raise':'cast';else kind=a.kind==='ult'?'raise':'draw';}
  const pose=poseFor(state,q,t,kind),pal0=flash?FLASH_PAL:HERO_PAL[h],w=game.weapon,art=w?.art||(h==='blade'?'sword':h==='arcanist'?'staff':'bow');
  const ec=w&&typeof RIFT_ELEMENTS!=='undefined'?RIFT_ELEMENTS[w.elem].color:pal0.glow,pal=flash?pal0:{...pal0,glow:ec};
  if(art==='dagger'&&state==='attack'){pose.armB=pose.armF-.9;pose.elbowB=-.3;}
  const spinning=a&&kind==='spin';
  g.save();if(spinning){g.translate(p.x,0);g.scale(Math.cos(q*TAU*2)>=0?1:-1,1);g.translate(-p.x,0);}
  figure(g,{x:p.x,y:p.y,z:p.z,face:p.face,scale:1.08,pose,pal,t,cape:h==='blade'?'#8a2e3a':h==='arcanist'?'#2a1f4a':'#3e5a2a',weapon:art,backWeapon:art==='dagger'?'dagger':null,tier:game.wlv||1,helm:h==='ranger'?'hood':'none',hat:h==='arcanist'?'#3a2a6a':null,band:h==='blade'?'#c43a48':null,eye:'#a6eb8f',robe:h==='arcanist',glow:pal.glow});
  g.restore();
 }
 const FLASH_PAL={skin:'#ffffff',hair:'#ffffff',cloth:'#ffffff',cloth2:'#ffffff',metal:'#ffffff',trim:'#ffffff',boot:'#ffffff',glow:'#ffffff',hood:'#ffffff'};
 function enemyFigure(g,e,t){
  const st=e.dead?'air':e.air||e.z>0?'air':e.stun>0?'hurt':e.state==='wind'?'wind':e.state==='recover'||e.state==='dash'?'strike':(e.state==='enter'||Math.abs(e.vx)>1||e.moving)?'run':'idle';
  const flash=e.flash>0,pal=flash?FLASH_PAL:ENEMY_PAL[e.type],pose=poseFor(st==='run'?'run':st,0,t+e.id,'');const eye=flash?'#ffffff':ENEMY_PAL[e.type].glow;
  if(e.type==='archer'&&(st==='wind'||st==='idle')){Object.assign(pose,poseFor('attack',0,t,'draw'));}
  if(e.freeze>0)g.filter='saturate(.3) brightness(1.35) hue-rotate(160deg)';
  if(e.type==='grunt')figure(g,{x:e.x,y:e.y,z:e.z,face:e.face,scale:1,pose,pal,t:t+e.id,weapon:'spear',helm:'helm',eye,crest:flash?null:'#a04070',cape:'#3a1830'});
  else if(e.type==='archer')figure(g,{x:e.x,y:e.y,z:e.z,face:e.face,scale:.96,pose,pal,t:t+e.id,weapon:'bow',helm:'hood',eye,cape:'#1a1c24'});
  else if(e.type==='brute')figure(g,{x:e.x,y:e.y,z:e.z,face:e.face,scale:1.42,wide:1.35,pose,pal,t:t+e.id,weapon:'maul',helm:'helm',horns:true,eye,shield:true});
  else if(e.type==='wraith'){const fl=8+Math.sin(t*3+e.id)*5;figure(g,{x:e.x,y:e.y,z:e.z+fl,face:e.face,scale:1.05,pose,pal,t:t+e.id,weapon:'blade',helm:'hood',eye,noLegs:true,robe:true});}
  g.filter='none';
 }
 // ---------------- bosses ----------------
 function bossFigure(g,e,t){
  const b=e.boss,flash=e.flash>0,st=e.state==='stagger'?'hurt':e.state==='wind'?'wind':e.state==='recover'||e.state==='dash'?'strike':'idle',pose=poseFor(st,0,t,''),dead=e.dead;
  g.save();if(dead){g.globalAlpha=Math.max(0,1-e.deadT/0.9);}
  if(e.enraged&&!flash){g.save();g.globalCompositeOperation='lighter';glow(g,e.x,e.y-90,130,alpha(b.color,.25+.1*Math.sin(t*8)));g.restore();}
  if(b.id==='warden'){const pal=flash?FLASH_PAL:{skin:'#6a5a50',cloth:'#3a2c24',cloth2:'#5a4430',metal:'#8a7a62',trim:'#e8b85a',boot:'#2a2018',glow:'#ffcf7a'};figure(g,{x:e.x,y:e.y,face:e.face,scale:2,wide:1.3,pose,pal,t,weapon:'hammer',helm:'helm',horns:true,eye:'#ffcf7a',cape:'#6a1e1e'});}
  else if(b.id==='knight'){const pal=flash?FLASH_PAL:{skin:'#4a2a22',cloth:'#2a1410',cloth2:'#4a1e14',metal:'#3c2a2a',trim:'#ff8a3a',boot:'#1a0c0a',glow:'#ff8a3a'};figure(g,{x:e.x,y:e.y,face:e.face,scale:1.95,wide:1.15,pose,pal,t,weapon:'flamesword',helm:'helm',horns:true,eye:'#ffb35c',cape:'#5a1408'});}
  else if(b.id==='witch'){const pal=flash?FLASH_PAL:{skin:'#cfe6f2',cloth:'#2a4a6a',cloth2:'#3a6a90',metal:'#bfe6ff',trim:'#e6fbff',boot:'#20304a',glow:'#9fe2ff',hood:'#1e3450'};figure(g,{x:e.x,y:e.y,z:18+Math.sin(t*2)*8,face:e.face,scale:1.75,pose,pal,t,weapon:'icestaff',helm:'hood',eye:'#e6fbff',noLegs:true,robe:true});
   if(!flash){g.save();g.translate(e.x,e.y-18-Math.sin(t*2)*8-150);for(let i=0;i<5;i++)poly(g,[[-24+i*12,0],[-18+i*12,-18-(i%2)*10],[-12+i*12,0]],'#dff6ff',OUT,1.5);g.restore();}}
  else if(b.id==='treant')treant(g,e,t,flash);
  else devourer(g,e,t,flash);
  g.restore();
 }
 function treant(g,e,t,flash){
  const x=e.x,y=e.y,f=e.face,sw=Math.sin(t*1.5)*3,wind=e.state==='wind';g.save();g.translate(x,y);g.scale(f,1);
  const bark=flash?'#ffffff':'#4a3424',bark2=flash?'#ffffff':'#6a4a30',leaf=flash?'#ffffff':'#3f7a3a';
  for(const s of [-1,1]){poly(g,[[s*14,0],[s*34,-4],[s*28,-30],[s*12,-40]],bark,OUT,2.5);}
  poly(g,[[-40,-30],[-46,-150],[-20,-200],[30,-205],[48,-150],[42,-30]],bark,OUT,3);
  g.strokeStyle=shade(bark,-.3);g.lineWidth=3;for(let i=0;i<5;i++){g.beginPath();g.moveTo(-30+i*15,-40);g.quadraticCurveTo(-34+i*15+sw,-110,-26+i*14,-190);g.stroke();}
  const armA=wind?-1.2:.3;for(const [ax,s] of [[38,1],[-38,-1]]){g.save();g.translate(ax,-150);g.rotate(s*(armA+sw*.02));poly(g,[[-14,0],[14,0],[s*74,58],[s*84,78],[s*62,92],[s*30,60]],bark2,OUT,2.5);for(let k=0;k<3;k++)poly(g,[[s*(60+k*8),80+k*4],[s*(70+k*10),104+k*2],[s*(64+k*8),84+k*4]],bark2,OUT,1.5);g.restore();}
  for(let i=0;i<7;i++){ellipse(g,-60+i*20+Math.sin(t+i)*3,-215-Math.abs(3-i)*-8,34,24,shade(leaf,(i%3)*.08),OUT,2);}
  const eyeC=flash?'#ffffff':e.enraged?'#ff7a5a':'#c8ff8a';g.save();g.globalCompositeOperation='lighter';glow(g,8,-150,18,alpha(eyeC,.8));glow(g,26,-150,18,alpha(eyeC,.8));g.restore();ellipse(g,8,-150,5,3,eyeC);ellipse(g,26,-150,5,3,eyeC);
  poly(g,[[4,-120],[30,-120],[26,-110],[8,-110]],'#1a0e08');
  g.restore();
 }
 function devourer(g,e,t,flash){
  const x=e.x,y=e.y-120-Math.sin(t*1.6)*10,open=e.state==='wind'?1:.35+.15*Math.sin(t*3);g.save();
  ellipse(g,e.x,e.y,90,22,'#00000055');
  for(let i=0;i<8;i++){const a=i/8*TAU+t*.4,len=110+Math.sin(t*2+i)*20;g.strokeStyle=flash?'#ffffff':'#5a1a4a';g.lineWidth=14-i%3*3;g.lineCap='round';g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+Math.cos(a)*len*.6+Math.sin(t*3+i)*20,y+Math.sin(a)*len*.6,x+Math.cos(a)*len,y+Math.sin(a)*len*.7+40);g.stroke();g.strokeStyle=OUT;g.lineWidth=2;g.stroke();}
  ellipse(g,x,y,82,74,flash?'#ffffff':'#3a0e34',OUT,3);ellipse(g,x-18,y-24,40,28,flash?'#ffffff':'#5a1a52');
  for(let i=0;i<10;i++){const a=i/10*TAU;g.strokeStyle='#ff7fd088';g.lineWidth=2;g.beginPath();g.moveTo(x+Math.cos(a)*40,y+Math.sin(a)*36);g.lineTo(x+Math.cos(a)*78,y+Math.sin(a)*70);g.stroke();}
  ellipse(g,x,y,44,44*open,'#0a0210',OUT,2.5);
  g.save();g.globalCompositeOperation='lighter';glow(g,x,y,60,e.enraged?'#ff5a8a99':'#ff7fd077');g.restore();
  const look=Math.max(-1,Math.min(1,(e.face)));ellipse(g,x+look*10,y,16,16*Math.max(.3,open),'#ffe0f4');ellipse(g,x+look*14,y,6,9*Math.max(.3,open),'#2a0018');
  g.restore();
 }
 // ---------------- telegraphs ----------------
 function hazard(g,h,t){
  const q=h.wind>0?1-h.wind/h.maxWind:1,live=h.wind<=0,a=live?Math.max(0,h.life/.35):1;
  const col=h.kind==='ice'?'#8fe0ff':h.kind==='root'?'#a6e070':h.kind==='fire'||h.kind==='beam'&&false?'#ff8a3a':'#ff5a5a';
  g.save();g.globalAlpha=a;
  if(h.shape==='circle'){
   if(!live){ellipse(g,h.x,h.y,h.rx,h.ry,alpha(col,.12),alpha(col,.75),2);ellipse(g,h.x,h.y,h.rx*q,h.ry*q,alpha(col,.28));g.setLineDash([6,6]);g.lineDashOffset=-t*30;ellipse(g,h.x,h.y,h.rx*.82,h.ry*.82,null,alpha('#ffffff',.35),1);g.setLineDash([]);}
   else{g.globalCompositeOperation='lighter';ellipse(g,h.x,h.y,h.rx*(1+.2*(1-a)),h.ry*(1+.2*(1-a)),alpha(col,.45*a));
    if(h.kind==='root'){for(let i=0;i<6;i++){const xx=h.x+Math.cos(i)*h.rx*.5,yy=h.y+Math.sin(i*2)*h.ry*.4;poly(g,[[xx-6,yy],[xx,yy-40*a],[xx+6,yy]],'#7a5a30');}}
    else if(h.kind==='ice'){for(let i=0;i<5;i++){const xx=h.x+Math.cos(i*1.3)*h.rx*.5,yy=h.y+Math.sin(i*2.1)*h.ry*.4;poly(g,[[xx-7,yy],[xx,yy-50*a],[xx+7,yy]],'#dff6ff');}}
    else if(h.kind==='fire'){for(let i=0;i<5;i++){const xx=h.x+Math.cos(i*1.7)*h.rx*.45;poly(g,[[xx-9,h.y],[xx,h.y-60*a],[xx+9,h.y]],'#ffb35c');}}}
  }else if(h.shape==='rect'){
   const w=h.x2-h.x1;if(!live){g.fillStyle=alpha(col,.13);g.fillRect(h.x1,h.y-h.h,w,h.h*2);g.strokeStyle=alpha(col,.7);g.lineWidth=2;g.strokeRect(h.x1,h.y-h.h,w,h.h*2);g.fillStyle=alpha(col,.28);const dirR=h.kind==='charge'?h.tx>h.x1+w/2:true;g.fillRect(dirR?h.x1:h.x2-w*q,h.y-h.h,w*q,h.h*2);}
   else{g.globalCompositeOperation='lighter';const gr=g.createLinearGradient(0,h.y-h.h,0,h.y+h.h);gr.addColorStop(0,alpha(col,0));gr.addColorStop(.5,alpha(h.kind==='beam'?'#ffffff':col,.85*a));gr.addColorStop(1,alpha(col,0));g.fillStyle=gr;g.fillRect(h.x1,h.y-h.h*1.3,w,h.h*2.6);}
  }else if(h.shape==='line'){
   g.lineCap='round';if(!live){g.strokeStyle=alpha(col,.18);g.lineWidth=h.w*1.6;g.beginPath();g.moveTo(h.x1,h.y1);g.lineTo(h.x2,h.y2);g.stroke();g.strokeStyle=alpha(col,.7);g.lineWidth=2;g.setLineDash([8,6]);g.stroke();g.setLineDash([]);}
  }else if(h.shape==='aim'&&!live){g.strokeStyle=alpha(col,.25+q*.5);g.lineWidth=1+q*2;g.setLineDash([10,8]);g.lineDashOffset=-t*60;g.beginPath();g.moveTo(h.x1,h.y1-40);const len=Math.hypot(h.x2-h.x1,h.y2-h.y1)||1,L=Math.min(len,700);g.lineTo(h.x1+(h.x2-h.x1)/len*L,h.y1-40+(h.y2-h.y1)/len*L);g.stroke();g.setLineDash([]);}
  g.restore();
 }
 // Element statuses drawn over an enemy: burn flames, poison bubbles, chill frost, a frozen ice shell.
 function status(g,e,t){
  if(e.dead)return;const sc=e.boss?2:e.type==='brute'?1.4:1,top=e.y-e.z-(e.boss?190:e.type==='brute'?130:90),mid=e.y-e.z-50*sc;
  g.save();
  if(e.freeze>0){g.globalCompositeOperation='source-over';const w=26*sc,h=60*sc;poly(g,[[e.x-w,e.y-e.z],[e.x-w*1.1,mid-h*.2],[e.x-w*.5,mid-h*.7],[e.x+w*.4,mid-h*.75],[e.x+w*1.1,mid-h*.1],[e.x+w,e.y-e.z]],'rgba(170,225,255,.32)','rgba(230,250,255,.8)',1.5);
   g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1.2;g.beginPath();g.moveTo(e.x-w*.5,mid-h*.5);g.lineTo(e.x-w*.1,mid);g.lineTo(e.x+w*.4,mid-h*.3);g.stroke();}
  g.globalCompositeOperation='lighter';
  if(e.burn){for(let i=0;i<4*sc;i++){const q=(t*1.8+i*.29+e.id*.17)%1,x=e.x+Math.sin(i*2.3+e.id)*14*sc,y=mid+20*sc-q*55*sc;g.fillStyle=alpha(q<.4?'#ffd27a':'#ff6a2a',.75*(1-q));g.beginPath();g.moveTo(x-5*(1-q)*sc,y);g.quadraticCurveTo(x,y-14*(1-q)*sc,x+5*(1-q)*sc,y);g.fill();}glow(g,e.x,mid,34*sc,'#ff6a2a33');}
  if(e.poison){const n=e.poison.stacks;for(let i=0;i<n+1;i++){const q=(t*.9+i*.21+e.id*.3)%1;ellipse(g,e.x+Math.sin(i*1.9+t*2)*16*sc,mid+10-q*50*sc,(2+n*.4)*(1-q*.5),(2+n*.4)*(1-q*.5),alpha('#9dff6a',.7*(1-q)));}glow(g,e.x,mid,(20+n*4)*sc,alpha('#6aff3a',.08+n*.025));}
  if(e.chill){g.globalCompositeOperation='source-over';const st=e.chill.stacks,need=e.boss?7:5;ellipse(g,e.x,e.y+2,30*sc,9*sc,null,alpha('#bfeaff',.35+st*.12),2);for(let i=0;i<need;i++){const x=e.x-(need-1)*5+i*10;poly(g,[[x,top-6],[x+4,top-1],[x,top+4],[x-4,top-1]],i<st?'#bfeaff':'rgba(191,234,255,.2)');}}
  g.restore();
 }
 function shot(g,s,t){
  g.save();g.translate(s.x,s.y-(s.z||40));const a=Math.atan2(s.vy*.6,s.vx);g.rotate(a);
  if(s.kind==='arrow'||s.kind==='lance'){const L=s.kind==='lance'?52:30,c=s.friendly?(s.kind==='lance'?'#d8ffc0':'#f4f0dc'):'#ff9a9a';g.globalCompositeOperation='lighter';g.strokeStyle=alpha(s.friendly?'#a6eb8f':'#ff5a5a',.5);g.lineWidth=s.kind==='lance'?10:5;g.beginPath();g.moveTo(-L*1.6,0);g.lineTo(0,0);g.stroke();g.globalCompositeOperation='source-over';g.strokeStyle=c;g.lineWidth=2.5;g.beginPath();g.moveTo(-L,0);g.lineTo(L*.3,0);g.stroke();poly(g,[[L*.3+8,0],[L*.3-2,-5],[L*.3-2,5]],c);}
  else if(s.kind==='bolt'||s.kind==='orb'){const r=s.kind==='orb'?16:9;g.globalCompositeOperation='lighter';glow(g,0,0,r*3,'#b9a2ffaa');for(let i=1;i<5;i++)ellipse(g,-i*r*.9,Math.sin(t*20+i)*3,r*(1-i*.18),r*(1-i*.18)*.8,alpha('#9b7cff',.5-i*.1));ellipse(g,0,0,r*.7,r*.7,'#ffffff');}
  else if(s.kind==='wave'){g.globalCompositeOperation='lighter';const q=Math.min(1,s.life/.6);for(let i=0;i<3;i++){g.strokeStyle=alpha(i?'#7fe6d3':'#ffffff',q*(i?.5:.95));g.lineWidth=i?10-i*3:3;g.beginPath();g.ellipse(-i*14,0,16,38-i*6,0,-1.35,1.35);g.stroke();}glow(g,0,0,46,alpha('#7fe6d3',.35*q));}
  else if(s.kind==='ice'||s.kind==='iceorb'){const big=s.kind==='iceorb',r=big?18:9;g.globalCompositeOperation='lighter';glow(g,0,0,r*2.8,'#9fe2ff88');for(let i=1;i<4;i++)ellipse(g,-i*r*1.1,Math.sin(t*14+i)*2,r*(1-i*.22)*.7,r*(1-i*.22)*.4,alpha('#cff4ff',.4-i*.1));g.globalCompositeOperation='source-over';
   if(big){g.rotate(t*5);for(let i=0;i<6;i++){g.rotate(TAU/6);poly(g,[[0,-4],[r*.9,0],[0,4]],'#e6fbff');}ellipse(g,0,0,6,6,'#ffffff');}else poly(g,[[r*1.3,0],[0,-r*.45],[-r*1.1,0],[0,r*.45]],'#e6fbff','#5ab8e8',1);}
  else if(s.kind==='venom'){g.globalCompositeOperation='lighter';g.strokeStyle='#9dff6a66';g.lineWidth=6;g.beginPath();g.moveTo(-44,Math.sin(t*30)*2);g.quadraticCurveTo(-22,-4,0,0);g.stroke();g.globalCompositeOperation='source-over';g.strokeStyle='#d0e8b0';g.lineWidth=2.5;g.beginPath();g.moveTo(-26,0);g.lineTo(8,0);g.stroke();poly(g,[[16,0],[6,-5],[6,5]],'#9dff6a',OUT,1);g.globalCompositeOperation='lighter';glow(g,10,0,12,'#9dff6a99');}
  else if(s.kind==='firebolt'){g.globalCompositeOperation='lighter';for(let i=0;i<6;i++)glow(g,-i*9,Math.sin(t*25+i)*3,16-i*2,alpha(i<2?'#ffd27a':'#ff6a2a',.7-i*.1));g.globalCompositeOperation='source-over';g.strokeStyle='#3a2414';g.lineWidth=3;g.beginPath();g.moveTo(-18,0);g.lineTo(8,0);g.stroke();poly(g,[[18,0],[6,-6],[6,6]],'#ffcf8a',OUT,1);}
  else if(s.kind==='seed'){g.globalCompositeOperation='lighter';glow(g,0,0,22,'#c8ff8a88');ellipse(g,0,0,8,6,'#b8f070');}
  else{g.globalCompositeOperation='lighter';glow(g,0,0,24,'#ff7fd088');poly(g,[[12,0],[-6,-6],[-12,0],[-6,6]],'#ffe0f4');}
  g.restore();
 }
 return{W,H,background,lightsOf,REGION_STYLE,heroFigure,enemyFigure,bossFigure,hazard,shot,status,weapon,tierAura,glow,poly,ellipse,alpha,shade,figure,poseFor,HERO_PAL,torch};
})();
