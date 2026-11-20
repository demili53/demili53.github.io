'use strict';
// 운빨좆망겜 — procedural art. Every sprite is drawn once into an offscreen canvas and cached.
(function(root){
const cache=new Map();
function mk(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
function cached(key,w,h,draw){let c=cache.get(key);if(!c){c=mk(w,h);draw(c.getContext('2d'),w,h);cache.set(key,c);}return c;}
function alpha(hex,a){const n=parseInt(hex.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
function shade(hex,k){const n=parseInt(hex.slice(1),16);let r=n>>16&255,g=n>>8&255,b=n&255;const f=v=>Math.max(0,Math.min(255,Math.round(k>0?v+(255-v)*k:v*(1+k))));return'#'+[f(r),f(g),f(b)].map(v=>v.toString(16).padStart(2,'0')).join('');}
function hash(x,y,s=0){let h=(x*374761393+y*668265263+s*982451653)|0;h=(h^(h>>>13))*1274126177|0;return((h^(h>>>16))>>>0)/4294967296;}
function ell(g,x,y,rx,ry,fill){g.beginPath();g.ellipse(x,y,rx,ry,0,0,Math.PI*2);g.fillStyle=fill;g.fill();}
function rr(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
function grad(g,x0,y0,x1,y1,stops){const gr=g.createLinearGradient(x0,y0,x1,y1);stops.forEach(([o,c])=>gr.addColorStop(o,c));return gr;}
function rad(g,x,y,r0,r1,stops){const gr=g.createRadialGradient(x,y,r0,x,y,r1);stops.forEach(([o,c])=>gr.addColorStop(o,c));return gr;}

// ---------------- heroes (original chibi soldiers) ----------------
const HERO_LOOK={
 scout:{cloak:'#3f8f4a',trim:'#a6e39a',skin:'#f1c9a5',hat:'hood'},
 archer:{cloak:'#b0812a',trim:'#ffe08a',skin:'#e9bf98',hat:'cap'},
 guard:{cloak:'#355f9e',trim:'#a9c8ff',skin:'#f0caa6',hat:'helm'},
 pyro:{cloak:'#a4361f',trim:'#ffb067',skin:'#f3cfae',hat:'wizard'},
 storm:{cloak:'#4b3a9a',trim:'#c9bdff',skin:'#e8c4a4',hat:'circlet'},
 warden:{cloak:'#c9ccd8',trim:'#ffd76a',skin:'#f0caa6',hat:'crown'}
};
function drawHero(g,type,star,frame){
 const L=HERO_LOOK[type],cx=36,by=60,bob=frame?1.5:0;
 ell(g,cx,by+2,17,5,'rgba(0,0,0,.35)');
 if(star>1){g.save();g.globalAlpha=.55;ell(g,cx,by+2,22,7,star>2?'rgba(255,190,80,.6)':'rgba(140,200,255,.55)');g.restore();}
 g.save();g.translate(0,-bob);
 // legs
 g.fillStyle='#2b2333';rr(g,cx-9,by-12,7,12,3);g.fill();rr(g,cx+2,by-12,7,12,3);g.fill();
 // body / cloak
 g.fillStyle=grad(g,cx-14,by-34,cx+14,by-8,[[0,shade(L.cloak,.18)],[1,shade(L.cloak,-.35)]]);
 g.beginPath();g.moveTo(cx-15,by-8);g.quadraticCurveTo(cx-16,by-30,cx,by-34);g.quadraticCurveTo(cx+16,by-30,cx+15,by-8);g.closePath();g.fill();
 g.strokeStyle=L.trim;g.lineWidth=2;g.beginPath();g.moveTo(cx,by-32);g.lineTo(cx,by-9);g.stroke();
 g.fillStyle=shade(L.cloak,-.5);g.fillRect(cx-14,by-17,28,3);g.fillStyle=L.trim;g.fillRect(cx-3,by-18,6,5);
 // head
 ell(g,cx,by-42,11,11,L.skin);
 g.fillStyle='#2a1d1a';ell(g,cx-4,by-41,1.7,2.2,'#2a1d1a');ell(g,cx+4,by-41,1.7,2.2,'#2a1d1a');
 ell(g,cx-6.5,by-37.5,2.2,1.3,'rgba(255,120,120,.45)');ell(g,cx+6.5,by-37.5,2.2,1.3,'rgba(255,120,120,.45)');
 // headgear
 g.fillStyle=L.cloak;
 if(L.hat==='hood'){g.fillStyle=shade(L.cloak,-.1);g.beginPath();g.moveTo(cx-13,by-38);g.quadraticCurveTo(cx-14,by-58,cx+2,by-58);g.quadraticCurveTo(cx+15,by-55,cx+13,by-38);g.quadraticCurveTo(cx,by-50,cx-13,by-38);g.fill();}
 else if(L.hat==='cap'){g.fillStyle=shade(L.cloak,.1);g.beginPath();g.ellipse(cx,by-48,12,7,0,Math.PI,0);g.fill();g.fillStyle='#d23b3b';g.beginPath();g.moveTo(cx+6,by-52);g.quadraticCurveTo(cx+18,by-62,cx+16,by-50);g.closePath();g.fill();}
 else if(L.hat==='helm'){g.fillStyle=grad(g,cx-12,by-56,cx+12,by-40,[[0,'#dfe8f5'],[1,'#7b8aa3']]);g.beginPath();g.ellipse(cx,by-45,12.5,11,0,Math.PI,0);g.fill();g.fillRect(cx-12.5,by-46,25,4);g.fillStyle='#d8433b';g.beginPath();g.moveTo(cx-2,by-56);g.quadraticCurveTo(cx+12,by-66,cx+16,by-52);g.quadraticCurveTo(cx+6,by-58,cx+2,by-55);g.fill();}
 else if(L.hat==='wizard'){g.fillStyle=shade(L.cloak,-.15);g.beginPath();g.moveTo(cx-15,by-46);g.lineTo(cx+15,by-46);g.lineTo(cx+5,by-70);g.quadraticCurveTo(cx+12,by-66,cx+14,by-72);g.lineTo(cx-2,by-62);g.closePath();g.fill();g.fillStyle=L.trim;g.fillRect(cx-13,by-48,26,3);}
 else if(L.hat==='circlet'){g.fillStyle='#2e2346';g.beginPath();g.ellipse(cx,by-46,12,8,0,Math.PI,0);g.fill();g.strokeStyle='#e7d7ff';g.lineWidth=2;g.beginPath();g.ellipse(cx,by-47,12,4,0,0,Math.PI*2);g.stroke();ell(g,cx,by-51,3,3,'#9ef0ff');}
 else if(L.hat==='crown'){g.fillStyle=grad(g,cx-12,by-60,cx+12,by-44,[[0,'#ffffff'],[1,'#a9adbb']]);g.beginPath();g.ellipse(cx,by-45,12.5,11,0,Math.PI,0);g.fill();g.fillStyle='#ffd76a';g.beginPath();g.moveTo(cx-9,by-52);g.lineTo(cx-6,by-60);g.lineTo(cx-2,by-54);g.lineTo(cx,by-62);g.lineTo(cx+2,by-54);g.lineTo(cx+6,by-60);g.lineTo(cx+9,by-52);g.closePath();g.fill();}
 // weapon
 g.lineCap='round';
 if(type==='scout'){g.strokeStyle='#cfd6e0';g.lineWidth=2.5;g.beginPath();g.moveTo(cx+12,by-22);g.lineTo(cx+20,by-32);g.stroke();g.beginPath();g.moveTo(cx-12,by-22);g.lineTo(cx-20,by-30);g.stroke();}
 if(type==='archer'){g.strokeStyle='#7a4a1f';g.lineWidth=3;g.beginPath();g.arc(cx+14,by-26,13,-1.2,1.2);g.stroke();g.strokeStyle='#efe3c2';g.lineWidth=1;g.beginPath();g.moveTo(cx+14+13*Math.cos(-1.2),by-26+13*Math.sin(-1.2));g.lineTo(cx+14+13*Math.cos(1.2),by-26+13*Math.sin(1.2));g.stroke();}
 if(type==='guard'){g.strokeStyle='#8b6a3e';g.lineWidth=3;g.beginPath();g.moveTo(cx+15,by-6);g.lineTo(cx+18,by-58);g.stroke();g.fillStyle='#e6edf7';g.beginPath();g.moveTo(cx+18,by-66);g.lineTo(cx+22,by-56);g.lineTo(cx+14,by-56);g.closePath();g.fill();
  g.fillStyle=grad(g,cx-22,by-34,cx-8,by-10,[[0,'#6f97d6'],[1,'#2c4a7f']]);rr(g,cx-24,by-34,14,22,6);g.fill();g.strokeStyle='#cfe0ff';g.lineWidth=1.5;g.stroke();}
 if(type==='pyro'){g.strokeStyle='#5b3a22';g.lineWidth=3;g.beginPath();g.moveTo(cx+14,by-4);g.lineTo(cx+16,by-44);g.stroke();ell(g,cx+16,by-48,7,7,'rgba(255,120,40,.35)');ell(g,cx+16,by-48,4,5,'#ffcf5a');ell(g,cx+16,by-47,2,3,'#fff4c0');}
 if(type==='storm'){ell(g,cx+15,by-30,9,9,'rgba(150,140,255,.35)');ell(g,cx+15,by-30,5.5,5.5,'#b9f2ff');g.strokeStyle='#ffffff';g.lineWidth=1.2;g.beginPath();g.moveTo(cx+11,by-34);g.lineTo(cx+15,by-30);g.lineTo(cx+13,by-28);g.lineTo(cx+18,by-25);g.stroke();}
 if(type==='warden'){g.fillStyle=grad(g,cx-26,by-40,cx-6,by-6,[[0,'#ffffff'],[1,'#9aa0b4']]);g.beginPath();g.moveTo(cx-26,by-38);g.lineTo(cx-6,by-38);g.lineTo(cx-6,by-18);g.quadraticCurveTo(cx-16,by-6,cx-26,by-18);g.closePath();g.fill();g.strokeStyle='#ffd76a';g.lineWidth=2;g.stroke();g.fillStyle='#ffd76a';g.fillRect(cx-17,by-34,2,16);g.fillRect(cx-22,by-28,12,2);
  g.strokeStyle='#d9dde8';g.lineWidth=3.5;g.beginPath();g.moveTo(cx+12,by-10);g.lineTo(cx+20,by-52);g.stroke();}
 g.restore();
 // stars
 if(star>1){for(let i=0;i<star;i++){const x=cx-(star-1)*6+i*12;star5(g,x,10,5,star>2?'#ffcf4a':'#9fd4ff');}}
}
function star5(g,x,y,r,fill){g.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rad=i%2?r*.45:r;g.lineTo(x+Math.cos(a)*rad,y+Math.sin(a)*rad);}g.closePath();g.fillStyle=fill;g.fill();g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=1;g.stroke();}
function hero(type,star=1,frame=0){return cached(`h:${type}:${star}:${frame}`,72,72,g=>drawHero(g,type,star,frame));}

// ---------------- monsters ----------------
function drawMonster(g,kind,frame,s){
 const cx=s/2,cy=s/2+s*.08,f=frame?1:-1;
 ell(g,cx,cy+s*.26,s*.3,s*.08,'rgba(0,0,0,.35)');
 if(kind==='crawler'){
  g.strokeStyle='#3b2a1c';g.lineWidth=2.2;for(let i=-1;i<=1;i++){const lx=cx+i*7;g.beginPath();g.moveTo(lx,cy+4);g.lineTo(lx-6,cy+12+f*i*2);g.moveTo(lx,cy+4);g.lineTo(lx+6,cy+12-f*i*2);g.stroke();}
  g.fillStyle=grad(g,cx,cy-14,cx,cy+10,[[0,'#9bc25a'],[1,'#3f5d22']]);g.beginPath();g.ellipse(cx,cy,15,11,0,0,Math.PI*2);g.fill();
  g.strokeStyle='rgba(20,30,10,.6)';g.lineWidth=1.5;for(let i=-1;i<=1;i++){g.beginPath();g.ellipse(cx+i*6,cy,2,10,0,0,Math.PI*2);g.stroke();}
  ell(g,cx+13,cy-2,6,6,'#5d3f22');ell(g,cx+15,cy-4,1.6,1.6,'#ffdf6a');
  g.strokeStyle='#5d3f22';g.lineWidth=1.3;g.beginPath();g.moveTo(cx+16,cy-6);g.quadraticCurveTo(cx+22,cy-14,cx+25,cy-12);g.stroke();
 }else if(kind==='runner'){
  g.strokeStyle='#8c7a7a';g.lineWidth=2;g.beginPath();g.moveTo(cx-12,cy+2);g.quadraticCurveTo(cx-24,cy-2+f*3,cx-26,cy-10);g.stroke();
  g.fillStyle='#3a3238';[[-7,1],[6,-1]].forEach(([dx,o])=>{rr(g,cx+dx-2,cy+4+o*f*2,4,8,2);g.fill();});
  g.fillStyle=grad(g,cx,cy-10,cx,cy+8,[[0,'#a7a0ad'],[1,'#5a5160']]);g.beginPath();g.ellipse(cx,cy,13,8,0,0,Math.PI*2);g.fill();
  g.fillStyle='#8f8797';g.beginPath();g.ellipse(cx+11,cy-3,7,6,-.3,0,Math.PI*2);g.fill();
  ell(g,cx+9,cy-10,3.5,4.5,'#d99aa8');ell(g,cx+14,cy-4,1.5,1.5,'#ff4040');ell(g,cx+18,cy-2,1.5,1.2,'#ff9aa8');
 }else if(kind==='brute'){
  g.fillStyle='#4a4038';[[-10,1],[-3,-1],[4,1],[11,-1]].forEach(([dx,o])=>{rr(g,cx+dx-3,cy+4,6,9+o*f,3);g.fill();});
  g.fillStyle=grad(g,cx,cy-18,cx,cy+8,[[0,'#a59b8c'],[1,'#4f463d']]);g.beginPath();g.moveTo(cx-19,cy+6);g.quadraticCurveTo(cx-18,cy-18,cx,cy-19);g.quadraticCurveTo(cx+18,cy-18,cx+19,cy+6);g.closePath();g.fill();
  g.strokeStyle='rgba(40,30,20,.6)';g.lineWidth=1.5;[[-8,-8],[4,-12],[8,-2],[-4,0]].forEach(([dx,dy])=>{g.beginPath();g.moveTo(cx+dx,cy+dy);g.lineTo(cx+dx+6,cy+dy+3);g.lineTo(cx+dx+2,cy+dy+8);g.stroke();});
  ell(g,cx+18,cy+1,6,5,'#6d6156');ell(g,cx+20,cy,1.5,1.5,'#ff8a3a');
  g.fillStyle='#7fae6a';g.beginPath();g.ellipse(cx-6,cy-17,5,2.5,-.4,0,Math.PI*2);g.fill();
 }else if(kind==='jelly'||kind==='jellet'){
  const k=kind==='jelly'?1:.62,sq=frame?1.08:.94;g.fillStyle=grad(g,cx,cy-16*k,cx,cy+10*k,[[0,'rgba(170,255,190,.95)'],[1,'rgba(40,150,90,.95)']]);g.beginPath();g.ellipse(cx,cy+2,15*k*sq,13*k/sq,0,Math.PI,0);g.quadraticCurveTo(cx+15*k*sq,cy+10*k,cx,cy+10*k);g.quadraticCurveTo(cx-15*k*sq,cy+10*k,cx-15*k*sq,cy+2);g.fill();
  ell(g,cx-5*k,cy-6*k,4*k,3*k,'rgba(255,255,255,.55)');ell(g,cx-4*k,cy,2*k,2.4*k,'#0d3320');ell(g,cx+4*k,cy,2*k,2.4*k,'#0d3320');if(kind==='jelly'){ell(g,cx+2,cy+5,3,2,'rgba(20,90,50,.5)');}
 }else if(kind==='moth'){
  g.globalAlpha=.9;[-1,1].forEach(d=>{g.fillStyle=grad(g,cx,cy-16,cx+d*20,cy+8,[[0,'#f5e6ff'],[1,'#b48ad8']]);g.beginPath();g.moveTo(cx,cy-2);g.quadraticCurveTo(cx+d*24,cy-22-f*4,cx+d*20,cy+2);g.quadraticCurveTo(cx+d*10,cy+10,cx,cy+4);g.fill();ell(g,cx+d*12,cy-7,3,3,'#7fffd0');});g.globalAlpha=1;
  g.fillStyle='#6b4a7d';g.beginPath();g.ellipse(cx,cy,4,11,0,0,Math.PI*2);g.fill();ell(g,cx,cy-11,4,4,'#8a68a0');g.strokeStyle='#cbb3e0';g.lineWidth=1;g.beginPath();g.moveTo(cx-2,cy-14);g.quadraticCurveTo(cx-6,cy-22,cx-9,cy-20);g.moveTo(cx+2,cy-14);g.quadraticCurveTo(cx+6,cy-22,cx+9,cy-20);g.stroke();
 }else if(kind==='bat'){
  g.fillStyle='#2b2140';[-1,1].forEach(d=>{g.beginPath();g.moveTo(cx,cy-2);g.quadraticCurveTo(cx+d*14,cy-14-f*6,cx+d*22,cy-6-f*4);g.lineTo(cx+d*18,cy);g.lineTo(cx+d*13,cy-3);g.lineTo(cx+d*9,cy+3);g.closePath();g.fill();});
  ell(g,cx,cy,6,7,'#3c2f58');g.fillStyle='#3c2f58';g.beginPath();g.moveTo(cx-5,cy-5);g.lineTo(cx-4,cy-12);g.lineTo(cx-1,cy-6);g.moveTo(cx+5,cy-5);g.lineTo(cx+4,cy-12);g.lineTo(cx+1,cy-6);g.fill();ell(g,cx-2.2,cy-2,1.4,1.4,'#ff5af0');ell(g,cx+2.2,cy-2,1.4,1.4,'#ff5af0');
 }else if(kind==='shell'){
  g.fillStyle='#3d5a4a';[[-11,1],[-4,-1],[4,1],[11,-1]].forEach(([dx,o])=>{rr(g,cx+dx-3,cy+4,6,8+o*f,3);g.fill();});
  g.fillStyle=grad(g,cx,cy-18,cx,cy+8,[[0,'#7fc0a0'],[1,'#2b5a44']]);g.beginPath();g.ellipse(cx,cy,20,15,0,Math.PI,0);g.lineTo(cx+20,cy+5);g.lineTo(cx-20,cy+5);g.closePath();g.fill();
  g.strokeStyle='#d8f0c8';g.lineWidth=1.4;[[0,-8],[-9,-3],[9,-3]].forEach(([dx,dy])=>{g.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;g.lineTo(cx+dx+Math.cos(a)*5,cy+dy+Math.sin(a)*4);}g.closePath();g.stroke();});
  g.fillStyle=grad(g,cx-28,cy-16,cx-18,cy+6,[[0,'#ffe9a8'],[1,'#b0812a']]);rr(g,cx-30,cy-14,10,20,4);g.fill();ell(g,cx+21,cy-1,5,4.5,'#4f7a62');ell(g,cx+23,cy-2,1.3,1.3,'#ffef6a');
 }else if(kind==='mudgiant'){
  g.fillStyle='#4b3424';rr(g,cx-18,cy+8,12,18,5);g.fill();rr(g,cx+6,cy+8,12,18,5);g.fill();
  g.fillStyle=grad(g,cx,cy-36,cx,cy+18,[[0,'#9a7350'],[1,'#4a301e']]);g.beginPath();g.moveTo(cx-28,cy+14);g.quadraticCurveTo(cx-34,cy-30,cx,cy-38);g.quadraticCurveTo(cx+34,cy-30,cx+28,cy+14);g.closePath();g.fill();
  g.fillStyle='#5a3c26';rr(g,cx-40,cy-16+f*2,13,30,6);g.fill();rr(g,cx+27,cy-16-f*2,13,30,6);g.fill();
  ell(g,cx-8,cy-18,4,3,'#ffcf5a');ell(g,cx+8,cy-18,4,3,'#ffcf5a');g.fillStyle='#2a1a10';g.fillRect(cx-9,cy-6,18,4);
  g.fillStyle='#6f9a4e';ell(g,cx-12,cy-33,6,3,'#6f9a4e');ell(g,cx+10,cy-34,4,2,'#86b35d');
 }else if(kind==='fogqueen'){
  g.globalAlpha=.85;g.fillStyle=grad(g,cx-40,cy-30,cx+40,cy+10,[[0,'#d9e3ff'],[1,'#6e7dbb']]);
  [-1,1].forEach(d=>{g.beginPath();g.moveTo(cx,cy-6);g.quadraticCurveTo(cx+d*48,cy-44-f*4,cx+d*42,cy+4);g.quadraticCurveTo(cx+d*24,cy+2,cx,cy+4);g.fill();});g.globalAlpha=1;
  g.fillStyle=grad(g,cx,cy-24,cx,cy+22,[[0,'#f2f4ff'],[1,'#8790c4']]);g.beginPath();g.ellipse(cx,cy+2,10,22,0,0,Math.PI*2);g.fill();
  ell(g,cx,cy-24,10,10,'#eef1ff');ell(g,cx-4,cy-25,2.2,2.6,'#5bd0ff');ell(g,cx+4,cy-25,2.2,2.6,'#5bd0ff');
  g.strokeStyle='#cfd8ff';g.lineWidth=1.5;g.beginPath();g.moveTo(cx-4,cy-33);g.quadraticCurveTo(cx-10,cy-46,cx-16,cy-44);g.moveTo(cx+4,cy-33);g.quadraticCurveTo(cx+10,cy-46,cx+16,cy-44);g.stroke();
 }else if(kind==='ironbeetle'){
  g.strokeStyle='#22262e';g.lineWidth=4;for(let i=-1;i<=1;i++){const lx=cx+i*13;g.beginPath();g.moveTo(lx,cy+6);g.lineTo(lx-9,cy+22+f*i*2);g.moveTo(lx,cy+6);g.lineTo(lx+9,cy+22-f*i*2);g.stroke();}
  g.fillStyle=grad(g,cx-30,cy-24,cx+30,cy+16,[[0,'#d5dde8'],[.5,'#6a7686'],[1,'#2a313c']]);g.beginPath();g.ellipse(cx-2,cy,30,20,0,0,Math.PI*2);g.fill();
  g.strokeStyle='#1d222a';g.lineWidth=2;g.beginPath();g.moveTo(cx-2,cy-20);g.lineTo(cx-2,cy+20);g.stroke();
  g.fillStyle='#3a434f';g.beginPath();g.ellipse(cx+28,cy-2,11,10,0,0,Math.PI*2);g.fill();
  g.fillStyle='#c8d2de';g.beginPath();g.moveTo(cx+32,cy-8);g.quadraticCurveTo(cx+44,cy-30,cx+50,cy-28);g.quadraticCurveTo(cx+44,cy-18,cx+38,cy-4);g.fill();ell(g,cx+33,cy-1,2.4,2.4,'#ff5a3a');
 }else if(kind==='abyss'){
  g.strokeStyle='#3b1446';g.lineWidth=6;g.lineCap='round';for(let i=0;i<6;i++){const a=Math.PI*.15+i*Math.PI*.14;g.beginPath();g.moveTo(cx,cy);g.quadraticCurveTo(cx+Math.cos(a)*30+f*4,cy+Math.sin(a)*34,cx+Math.cos(a)*40,cy+Math.sin(a)*44-f*3);g.stroke();}
  g.fillStyle=rad(g,cx,cy-6,4,40,[[0,'#5a1f6e'],[1,'#1a0822']]);g.beginPath();g.arc(cx,cy-6,36,0,Math.PI*2);g.fill();
  g.fillStyle=rad(g,cx,cy-6,2,24,[[0,'#fff6d6'],[.4,'#ffcf5a'],[1,'#c23a1a']]);g.beginPath();g.ellipse(cx,cy-6,24,18,0,0,Math.PI*2);g.fill();
  g.fillStyle='#120414';g.beginPath();g.ellipse(cx+f*2,cy-6,5,14,0,0,Math.PI*2);g.fill();ell(g,cx-6,cy-12,3,3,'rgba(255,255,255,.8)');
 }
}
const MONSTER_SIZE={crawler:48,runner:44,brute:56,jelly:48,jellet:36,moth:52,bat:50,shell:64,mudgiant:96,fogqueen:100,ironbeetle:110,abyss:116};
function monster(kind,frame=0){const s=MONSTER_SIZE[kind]||48;return cached(`m:${kind}:${frame}`,s,s,g=>drawMonster(g,kind,frame,s));}

// ---------------- items & icons ----------------
function drawCrystal(g,s){const c=s/2;[[c-7,c+4,6,15,'#3d7ad6'],[c+7,c+5,5,12,'#5a95f0'],[c,c,8,20,'#8cc6ff']].forEach(([x,y,w,h,col])=>{g.fillStyle=grad(g,x-w,y-h,x+w,y+h/2,[[0,shade(col,.5)],[1,shade(col,-.4)]]);g.beginPath();g.moveTo(x,y-h);g.lineTo(x+w,y-h*.4);g.lineTo(x+w*.7,y+h*.35);g.lineTo(x-w*.7,y+h*.35);g.lineTo(x-w,y-h*.4);g.closePath();g.fill();g.strokeStyle='rgba(255,255,255,.55)';g.lineWidth=1;g.beginPath();g.moveTo(x,y-h);g.lineTo(x,y+h*.3);g.stroke();});}
function drawOre(g,s){const c=s/2;g.fillStyle=grad(g,c-14,c-12,c+14,c+12,[[0,'#8a8f98'],[1,'#3a3d45']]);g.beginPath();g.moveTo(c-15,c+8);g.lineTo(c-12,c-6);g.lineTo(c-2,c-13);g.lineTo(c+11,c-9);g.lineTo(c+16,c+4);g.lineTo(c+6,c+12);g.lineTo(c-8,c+12);g.closePath();g.fill();[[c-5,c-3],[c+6,c+1],[c-1,c+6],[c+3,c-7]].forEach(([x,y])=>{ell(g,x,y,2.6,2,'#ffcf5a');ell(g,x-.6,y-.6,1,1,'#fff3c0');});}
function drawChest(g,s){const c=s/2;g.fillStyle='#6b3f1f';rr(g,c-15,c-6,30,18,3);g.fill();g.fillStyle='#8b5428';g.beginPath();g.moveTo(c-15,c-4);g.quadraticCurveTo(c,c-18,c+15,c-4);g.closePath();g.fill();g.fillStyle='#ffcf5a';g.fillRect(c-15,c-5,30,3);g.fillRect(c-2,c-6,4,10);ell(g,c,c+2,2.2,2.2,'#2a1608');}
function drawAlly(g,s){const c=s/2;ell(g,c,c-7,7,7,'#f2e6c8');g.fillStyle='#f2e6c8';g.beginPath();g.moveTo(c-12,c+13);g.quadraticCurveTo(c-12,c,c,c);g.quadraticCurveTo(c+12,c,c+12,c+13);g.closePath();g.fill();g.strokeStyle='#ffcf5a';g.lineWidth=2;g.beginPath();g.arc(c,c-7,10,Math.PI*1.1,Math.PI*1.9);g.stroke();}
function drawLairIcon(g,s){const c=s/2;ell(g,c,c+4,15,9,'#1a0f12');ell(g,c,c+3,11,6,'#05030a');ell(g,c-4,c+2,1.8,1.4,'#ff3b3b');ell(g,c+4,c+2,1.8,1.4,'#ff3b3b');g.strokeStyle='#3a2a20';g.lineWidth=2;for(let i=0;i<5;i++){const a=Math.PI+i*Math.PI/4;g.beginPath();g.moveTo(c+Math.cos(a)*14,c+4+Math.sin(a)*8);g.lineTo(c+Math.cos(a)*19,c+4+Math.sin(a)*12);g.stroke();}}
function drawPop(g,s){const c=s/2;ell(g,c,c-6,6,6,'#ff5a5a');g.fillStyle='#ff5a5a';g.beginPath();g.moveTo(c-11,c+12);g.quadraticCurveTo(c-11,c,c,c);g.quadraticCurveTo(c+11,c,c+11,c+12);g.closePath();g.fill();}
function drawShrine(g,s){const c=s/2;g.fillStyle='#5b5f6e';rr(g,c-12,c+4,24,10,2);g.fill();g.fillStyle=grad(g,c-7,c-14,c+7,c+4,[[0,'#c3c7d4'],[1,'#6c7080']]);rr(g,c-7,c-12,14,18,3);g.fill();ell(g,c,c-14,8,8,'rgba(140,230,255,.35)');ell(g,c,c-14,4,4,'#bff3ff');}
function drawTrap(g,s){const c=s/2;g.strokeStyle='#9a9fa8';g.lineWidth=2.5;g.beginPath();g.arc(c,c+3,12,Math.PI,0);g.stroke();g.beginPath();g.arc(c,c+3,12,0,Math.PI);g.stroke();g.fillStyle='#c9ced6';for(let i=0;i<7;i++){const a=Math.PI+i*Math.PI/6;g.beginPath();g.moveTo(c+Math.cos(a)*12,c+3+Math.sin(a)*12);g.lineTo(c+Math.cos(a)*7,c+3+Math.sin(a)*7);g.lineTo(c+Math.cos(a+.2)*12,c+3+Math.sin(a+.2)*12);g.fill();}ell(g,c,c+3,3,3,'#7a3a2a');}
const ICON_DRAW={shrine:drawShrine,trap:drawTrap,crystal:drawCrystal,ore:drawOre,chest:drawChest,ally:drawAlly,lair:drawLairIcon,pop:drawPop};
function icon(name,s=40){return cached(`i:${name}:${s}`,s,s,(g)=>{g.save();g.scale(s/40,s/40);ICON_DRAW[name](g,40);g.restore();});}

// ---------------- terrain ----------------
function tile(variant,side){return cached(`t:${variant}:${side}`,60,60,(g)=>{
 const base=side==='opp'?['#33402f','#2f3b2c']:['#3a4a33','#344430'];
 g.fillStyle=base[variant%2];g.fillRect(0,0,60,60);
 for(let i=0;i<26;i++){const x=hash(i,variant,3)*60,y=hash(variant,i,5)*60,v=hash(i,i,variant);g.fillStyle=v>.5?'rgba(140,180,100,.18)':'rgba(10,20,8,.22)';g.fillRect(x,y,2,v>.8?4:2);}
 if(hash(variant,9)>.55){g.fillStyle='rgba(120,120,110,.35)';ell(g,10+hash(variant,2)*40,10+hash(variant,4)*40,5,3.5,'rgba(110,110,100,.45)');}
 if(hash(variant,7)>.6){g.strokeStyle='rgba(150,200,110,.35)';g.lineWidth=1;const x=8+hash(variant,8)*44,y=20+hash(variant,6)*30;for(let k=-1;k<=1;k++){g.beginPath();g.moveTo(x,y);g.lineTo(x+k*3,y-6);g.stroke();}}
 g.strokeStyle='rgba(0,0,0,.28)';g.lineWidth=1;g.strokeRect(.5,.5,59,59);
 g.fillStyle='rgba(255,255,255,.04)';g.fillRect(1,1,58,2);
});}
function fogPuff(){return cached('fogpuff',128,128,(g)=>{g.fillStyle=rad(g,64,64,0,64,[[0,'rgba(196,204,222,.95)'],[.55,'rgba(150,160,184,.55)'],[1,'rgba(120,130,156,0)']]);g.fillRect(0,0,128,128);});}
function glow(color,s=128){return cached(`g:${color}:${s}`,s,s,(g)=>{g.fillStyle=rad(g,s/2,s/2,0,s/2,[[0,color],[1,'rgba(0,0,0,0)']]);g.fillRect(0,0,s,s);});}

function base(side,broken){return cached(`b:${side}:${broken?1:0}`,80,90,(g)=>{
 const flag=side==='me'?'#4aa3ff':'#ff5a5a';ell(g,40,82,30,7,'rgba(0,0,0,.4)');
 g.fillStyle=grad(g,14,30,66,84,[[0,'#8e8a86'],[1,'#4a4642']]);
 if(broken){g.beginPath();g.moveTo(12,84);g.lineTo(14,46);g.lineTo(26,52);g.lineTo(34,40);g.lineTo(46,56);g.lineTo(58,44);g.lineTo(68,84);g.closePath();g.fill();g.fillStyle='#2a2522';[[24,64],[48,70],[36,58]].forEach(([x,y])=>{g.fillRect(x,y,6,4);});ell(g,40,78,20,4,'rgba(30,20,15,.6)');return;}
 g.fillRect(14,40,52,44);g.fillStyle='#5c5753';for(let i=0;i<5;i++)g.fillRect(14+i*11,32,7,10);
 g.fillStyle=grad(g,28,10,52,40,[[0,'#a29d98'],[1,'#5e5955']]);g.fillRect(28,18,24,26);g.fillStyle='#5c5753';for(let i=0;i<3;i++)g.fillRect(28+i*9,12,6,8);
 g.fillStyle='#1b1512';rr(g,33,62,14,22,6);g.fill();g.fillStyle='rgba(255,200,90,.85)';g.fillRect(37,26,6,8);g.fillRect(20,50,5,7);g.fillRect(55,50,5,7);
 g.strokeStyle='#3a2a1a';g.lineWidth=2;g.beginPath();g.moveTo(40,12);g.lineTo(40,-2+4);g.stroke();g.fillStyle=flag;g.beginPath();g.moveTo(41,2);g.lineTo(58,7);g.lineTo(41,12);g.closePath();g.fill();
 g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1;for(let y=48;y<84;y+=8){g.beginPath();g.moveTo(14,y);g.lineTo(66,y);g.stroke();}
});}

root.FogArt={hero,monster,icon,tile,fogPuff,glow,base,alpha,shade,hash,ell,rr,grad,rad,star5,HERO_LOOK,MONSTER_SIZE,mk};
})(typeof self!=='undefined'?self:this);
