'use strict';
// 들키면 재수 — procedural art (top-down exam room + close-up desk). Browser: window.ExamArt.
(function(){
const C=window.ExamCore;
const SKINS=['#f2c9a0','#e8b98f','#d9a477','#f5d3b3','#c98f63'];
const HAIRS=['#1d1a1c','#2b211c','#3a2a20','#4b3527','#151719','#5a3b2a','#272033'];
const SHIRTS=['#3d5a80','#6a4c93','#2a9d8f','#8d99ae','#e76f51','#457b9d','#6d597a','#52796f','#b5838d','#3a506b'];
const ANS='①②③④⑤';
function hash(n){n=(n^61)^(n>>>16);n=n+(n<<3);n^=n>>>4;n=Math.imul(n,0x27d4eb2d);n^=n>>>15;return n>>>0;}
function rr(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
let roomCache=null;
function room(){
 if(roomCache)return roomCache;
 const cv=document.createElement('canvas');cv.width=C.W;cv.height=C.H;const g=cv.getContext('2d');
 // floor: warm wood strips
 g.fillStyle='#b98d5e';g.fillRect(0,0,C.W,C.H);
 for(let y=60;y<C.H;y+=24)for(let x=-((y/24|0)%2)*60;x<C.W;x+=120){const h=hash(x*7+y*13);g.fillStyle=`hsl(${30+h%6},${38+h%8}%,${50+(h>>4)%8}%)`;g.fillRect(x+1,y+1,118,22);}
 g.fillStyle='#0000000d';for(let y=60;y<C.H;y+=24)g.fillRect(0,y,C.W,1);
 // front wall + blackboard
 g.fillStyle='#e9e2d2';g.fillRect(0,0,C.W,60);g.fillStyle='#cfc5af';g.fillRect(0,56,C.W,6);
 g.fillStyle='#6d4f33';rr(g,112,8,416,46,4);g.fill();g.fillStyle='#24453a';rr(g,118,12,404,38,3);g.fill();
 g.fillStyle='#ffffff10';g.fillRect(124,16,180,8);
 // speaker
 g.fillStyle='#4a4a52';rr(g,22,14,36,24,5);g.fill();g.fillStyle='#2a2a30';for(let i=0;i<4;i++)for(let j=0;j<3;j++){g.beginPath();g.arc(30+i*7,20+j*6,1.6,0,7);g.fill();}
 // windows on the left wall
 for(let y=110;y<C.H-40;y+=150){g.fillStyle='#9fc6dd';g.fillRect(0,y,10,110);g.fillStyle='#e2f2fb88';g.fillRect(2,y+4,4,40);g.fillStyle='#7c8b95';g.fillRect(0,y+54,10,3);}
 const sun=g.createLinearGradient(0,0,180,0);sun.addColorStop(0,'#fff6d240');sun.addColorStop(1,'#fff6d200');g.fillStyle=sun;g.fillRect(10,60,170,C.H);
 // door on the right wall with a small window
 g.fillStyle='#7a5636';g.fillRect(C.W-10,C.DOOR.y-38,10,76);g.fillStyle='#a9cbe0';g.fillRect(C.W-8,C.DOOR.y-14,6,28);
 // front desk
 g.fillStyle='#00000026';rr(g,236,74,176,40,6);g.fill();g.fillStyle='#7b5838';rr(g,232,68,176,38,6);g.fill();g.fillStyle='#93704c';rr(g,236,71,168,30,4);g.fill();
 g.fillStyle='#f6f2e8';g.save();g.translate(268,80);g.rotate(-.08);g.fillRect(0,0,30,20);g.restore();g.fillRect(350,78,34,14);g.fillStyle='#d9534f';g.fillRect(352,80,8,10);
 // desks
 for(let r=0;r<C.ROWS;r++)for(let c=0;c<C.COLS;c++){const x=C.deskX(c),y=C.deskY(r)-12;
  g.fillStyle='#0000002a';rr(g,x-33,y-15,70,36,5);g.fill();
  g.fillStyle='#c9a36f';rr(g,x-35,y-18,70,34,5);g.fill();g.fillStyle='#d9b886';rr(g,x-32,y-15,64,26,3);g.fill();
  g.fillStyle='#8c8c94';g.fillRect(x-30,y+16,4,6);g.fillRect(x+26,y+16,4,6);
  // chair
  g.fillStyle='#5b6b7a';rr(g,x-18,y+30,36,18,5);g.fill();g.fillStyle='#46525e';rr(g,x-18,y+44,36,6,3);g.fill();
  // exam sheet + number tag
  g.fillStyle='#fbfaf5';g.save();g.translate(x-12,y-12);g.rotate((hash(r*9+c)%7-3)*.02);g.fillRect(0,0,24,20);g.fillStyle='#c7c2b6';for(let i=0;i<4;i++)g.fillRect(3,4+i*4,18,1);g.restore();
  g.fillStyle='#ffffffcc';g.fillRect(x+16,y-15,14,8);g.fillStyle='#555';g.font='bold 7px system-ui';g.textAlign='center';g.fillText(String(r*5+c+1).padStart(2,'0'),x+23,y-9);
 }
 roomCache=cv;return cv;
}
function student(ctx,r,c,t,o={}){
 const h=hash(r*31+c*7+3),x=C.deskX(c),y=C.deskY(r)+16,skin=SKINS[h%5],hair=HAIRS[(h>>3)%7],shirt=o.me?'#ff8a3d':SHIRTS[(h>>6)%10];
 const bob=Math.sin(t*1.7+h)*1.2,lean=o.lean||0;
 ctx.save();ctx.translate(x+lean,y+bob);
 ctx.fillStyle='#00000030';ctx.beginPath();ctx.ellipse(0,10,22,10,0,0,7);ctx.fill();
 ctx.fillStyle=shirt;ctx.beginPath();ctx.ellipse(0,8,20,11,0,0,7);ctx.fill();
 // arms on the desk
 ctx.fillStyle=shirt;ctx.beginPath();ctx.ellipse(-14,-6,6,11,.35,0,7);ctx.ellipse(14,-6,6,11,-.35,0,7);ctx.fill();
 ctx.fillStyle=skin;ctx.beginPath();ctx.arc(-11,-16,4,0,7);ctx.arc(12+(o.write?Math.sin(t*18)*2:0),-16,4,0,7);ctx.fill();
 ctx.fillStyle=skin;ctx.beginPath();ctx.arc(0,0,11,0,7);ctx.fill();
 ctx.fillStyle=hair;ctx.beginPath();ctx.arc(0,1.5,11.4,Math.PI*1.05,Math.PI*1.95+.2,true);ctx.fill();ctx.beginPath();ctx.arc(0,2,10.6,0,Math.PI*2);ctx.fill();
 if((h>>9)%3===0){ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(0,11,6,5,0,0,7);ctx.fill();}
 if(o.sweat){ctx.font='13px system-ui';ctx.textAlign='center';ctx.fillText(o.sweat>70?'😱':'💦',15,-10+Math.sin(t*9)*2);}
 if(o.me){ctx.strokeStyle='#ffd166';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.arc(0,0,17,0,7);ctx.stroke();ctx.setLineDash([]);}
 if(o.ring){ctx.fillStyle='#ffffff';ctx.font='16px system-ui';ctx.textAlign='center';ctx.fillText('📱',18+Math.sin(t*40)*2,-14);}
 if(o.sneeze){ctx.font='15px system-ui';ctx.textAlign='center';ctx.fillText(o.sneeze==='tell'?'😣':'🤧',0,-20);}
 ctx.restore();
}
function cone(ctx,s,view,state){
 if(!view)return;const r=view.range;
 const grd=ctx.createRadialGradient(s.x,s.y,10,s.x,s.y,r);
 const col=state==='spot'?'255,70,70':state==='seen'?'255,170,60':'255,236,150';
 grd.addColorStop(0,`rgba(${col},.38)`);grd.addColorStop(.6,`rgba(${col},.16)`);grd.addColorStop(1,`rgba(${col},0)`);
 ctx.fillStyle=grd;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.arc(s.x,s.y,r,s.dir-view.fov,s.dir+view.fov);ctx.closePath();ctx.fill();
 ctx.strokeStyle=`rgba(${col},.35)`;ctx.lineWidth=1;ctx.stroke();
}
function proctor(ctx,s,t){
 const coat=s.kind==='chief'?'#2f3e5c':s.kind==='roam'?'#6b4f3a':'#3f5f4a';
 ctx.save();ctx.translate(s.x,s.y);
 ctx.fillStyle='#00000035';ctx.beginPath();ctx.ellipse(2,6,22,14,0,0,7);ctx.fill();
 ctx.rotate(s.dir-Math.PI/2);
 ctx.fillStyle=coat;ctx.beginPath();ctx.ellipse(0,-2,21,13,0,0,7);ctx.fill();
 ctx.fillStyle='#ffd23f';ctx.fillRect(13,-8,7,9);
 ctx.fillStyle='#f0c8a0';ctx.beginPath();ctx.arc(0,2,12,0,7);ctx.fill();
 ctx.fillStyle=s.kind==='door'?'#777':'#2a2a2a';ctx.beginPath();ctx.arc(0,-2,12,Math.PI,0);ctx.fill();
 ctx.fillStyle='#222';ctx.fillRect(-7,6,5,2);ctx.fillRect(3,6,5,2);// glasses
 ctx.strokeStyle='#222';ctx.lineWidth=1.3;ctx.strokeRect(-8,4,6,5);ctx.strokeRect(2,4,6,5);
 ctx.restore();
 if(s.state!=='away'){ctx.fillStyle='#ffffffdd';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillText(s.name,s.x,s.y+30);}
 if(s.sayT>0&&s.say){ctx.font='bold 12px system-ui';const tw=Math.min(230,ctx.measureText(s.say).width)+16,bx=Math.max(tw/2+4,Math.min(C.W-tw/2-4,s.x)),by=Math.max(22,s.y-58),a=Math.min(1,s.sayT*3);ctx.globalAlpha=a;ctx.fillStyle='#fffbe8';rr(ctx,bx-tw/2,by-12,tw,24,10);ctx.fill();ctx.strokeStyle='#33333355';ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.moveTo(Math.max(bx-tw/2+10,Math.min(bx+tw/2-10,s.x))-5,by+12);ctx.lineTo(s.x,by+22);ctx.lineTo(Math.max(bx-tw/2+10,Math.min(bx+tw/2-10,s.x))+5,by+12);ctx.fill();ctx.fillStyle='#222';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.say,bx,by,230);ctx.textBaseline='alphabetic';ctx.globalAlpha=1;}
 if(s.bubble){const bx=s.x+14,by=s.y-30+Math.sin(t*8)*1.5;ctx.fillStyle='#fff';rr(ctx,bx-12,by-13,24,22,8);ctx.fill();ctx.beginPath();ctx.moveTo(bx-6,by+8);ctx.lineTo(bx-10,by+14);ctx.lineTo(bx,by+8);ctx.fill();
  ctx.font=(s.bubble.length===1&&/[!?]/.test(s.bubble)?'bold 16px':'13px')+' system-ui';ctx.fillStyle=s.bubble==='!'?'#e63946':'#333';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(s.bubble,bx,by-2);ctx.textBaseline='alphabetic';}
}
function deviceGlow(ctx,g,t){
 if(g.devT<=0)return;const p=C.PLAYER,a=g.devT*(g.aiReady?.55:.3);
 const grd=ctx.createRadialGradient(p.x+16,p.y-12,2,p.x+16,p.y-12,46);grd.addColorStop(0,`rgba(90,230,255,${a})`);grd.addColorStop(1,'rgba(90,230,255,0)');ctx.fillStyle=grd;ctx.beginPath();ctx.arc(p.x+16,p.y-12,46,0,7);ctx.fill();
}
function board(ctx,g){
 ctx.fillStyle='#f3f1e6';ctx.font='bold 15px system-ui';ctx.textAlign='center';
 ctx.fillText(`${g.period+1}교시 · ${g.P.name}`,320,30);ctx.font='11px system-ui';ctx.fillStyle='#cfe3d6';ctx.fillText('전자기기 소지 금지 · 들키면 재수',320,45);
 // clock
 const x=590,y=31,m=Math.max(0,g.timeLeft)/g.P.time;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,19,0,7);ctx.fill();ctx.strokeStyle='#333';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle=m<.2?'#ffb3b3':'#e5f0ff';ctx.beginPath();ctx.moveTo(x,y);ctx.arc(x,y,16,-Math.PI/2,-Math.PI/2+Math.PI*2*m);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#222';ctx.beginPath();ctx.moveTo(x,y);const a=-Math.PI/2+Math.PI*2*m;ctx.lineTo(x+Math.cos(a)*14,y+Math.sin(a)*14);ctx.stroke();
}
function drawRoom(ctx,g,t){
 ctx.drawImage(room(),0,0);board(ctx,g);
 const views=g.staff.map(s=>g.viewOf(s));
 g.staff.forEach((s,i)=>{const v=views[i];if(!v)return;const seenMe=g.sees(s)>0;cone(ctx,s,v,seenMe&&g.devOut?'spot':seenMe?'seen':'calm');});
 for(let r=0;r<C.ROWS;r++)for(let c=0;c<C.COLS;c++){
  const me=r===C.SEAT.r&&c===C.SEAT.c,ring=g.ring&&g.ring.r===r&&g.ring.c===c,sn=g.sneeze&&g.sneeze.r===r&&g.sneeze.c===c?g.sneeze.phase:null;
  student(ctx,r,c,t,{sweat:me&&g.susp>40?g.susp:0,me,ring,sneeze:sn,write:me?(g.input.solve&&g.devT===0):((hash(r*5+c)+Math.floor(t*.5))%3!==0),lean:me&&g.input.act?Math.sin(t*3)*2:0});
 }
 deviceGlow(ctx,g,t);
 g.staff.forEach(s=>proctor(ctx,s,t));
 if(g.spotted>0){ctx.fillStyle=`rgba(255,40,40,${Math.min(.25,g.spotted)})`;ctx.fillRect(0,0,C.W,C.H);}
}
// Close-up of my desk: answer sheet, question, pencil, and the AI pen sliding out of the sleeve.
function drawDesk(ctx,g,t){
 const w=ctx.canvas.width,h=ctx.canvas.height;
 const wood=ctx.createLinearGradient(0,0,0,h);wood.addColorStop(0,'#c99a63');wood.addColorStop(1,'#a87843');ctx.fillStyle=wood;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#00000012';for(let i=0;i<9;i++)ctx.fillRect(0,12+i*17,w,1);
 // OMR sheet
 ctx.fillStyle='#fffdf6';rr(ctx,14,12,150,h-24,4);ctx.fill();ctx.fillStyle='#e07a5f';ctx.fillRect(14,12,150,14);ctx.fillStyle='#fff';ctx.font='bold 9px system-ui';ctx.textAlign='left';ctx.fillText('OMR 답안지',20,22);
 const n=g.P.q;for(let i=0;i<n;i++){const col=i<8?0:1,row=i%8,x=20+col*74,y=36+row*((h-50)/8);ctx.fillStyle='#777';ctx.font='8px system-ui';ctx.fillText(String(i+1),x,y+3);
  for(let k=0;k<5;k++){const bx=x+14+k*11;ctx.strokeStyle='#e07a5f';ctx.lineWidth=.8;ctx.beginPath();ctx.ellipse(bx,y,3.5,4.5,0,0,7);ctx.stroke();
   const a=g.answers[i];if(a&&a.mark===k+1){ctx.fillStyle=a.method==='ai'?'#1d3557':'#333';ctx.fill();}}}
 // question paper
 ctx.fillStyle='#fbfaf4';ctx.save();ctx.translate(184,10);ctx.rotate(-.015);rr(ctx,0,0,268,h-18,4);ctx.fill();
 ctx.fillStyle='#222';ctx.font='bold 13px system-ui';ctx.textAlign='left';const qn=Math.min(g.q+1,n);ctx.fillText(g.q>=n?'답안 작성 완료!':`${qn}. 다음 글을 읽고 물음에 답하시오.`,12,22);
 ctx.fillStyle='#c9c4b8';for(let i=0;i<5;i++)ctx.fillRect(12,34+i*13,230-(i===4?90:0),3);
 for(let k=0;k<5;k++){ctx.fillStyle='#555';ctx.font='11px system-ui';ctx.fillText(ANS[k],14+k*50,h-34);ctx.fillStyle='#d6d1c6';ctx.fillRect(28+k*50,h-38,26,3);}
 ctx.fillStyle='#2a9d8f33';ctx.fillRect(12,h-28,244*Math.min(1,g.prog),5);ctx.fillStyle=g.part.ai>g.part.honest?'#48cae4':'#2a9d8f';ctx.fillRect(12,h-28,244*Math.min(1,g.prog),2);
 ctx.restore();
 // pencil hand when solving honestly
 const solving=g.input.solve&&g.devT===0&&g.phase==='exam';
 ctx.save();ctx.translate(410+(solving?Math.sin(t*16)*6:0),h-34+(solving?Math.cos(t*22)*2:0));ctx.rotate(-.7);ctx.fillStyle='#f4c430';ctx.fillRect(-4,-46,8,46);ctx.fillStyle='#333';ctx.beginPath();ctx.moveTo(-4,0);ctx.lineTo(4,0);ctx.lineTo(0,9);ctx.fill();ctx.fillStyle='#e9a0a0';ctx.fillRect(-4,-52,8,6);ctx.restore();
 // sleeve and the AI pen
 const d=g.devT,sx=w-150;
 ctx.fillStyle='#ff8a3d';rr(ctx,sx+40,h-70,140,80,26);ctx.fill();ctx.fillStyle='#e8762c';ctx.fillRect(sx+40,h-70,16,80);
 ctx.fillStyle='#f2c9a0';ctx.beginPath();ctx.ellipse(sx+40,h-34,20,16,0,0,7);ctx.fill();
 if(d>0){const px=sx+30-d*96,py=h-58;ctx.save();ctx.translate(px,py);
  ctx.fillStyle='#1b1f27';rr(ctx,0,0,104,40,8);ctx.fill();ctx.fillStyle='#2b313d';rr(ctx,4,4,96,32,6);ctx.fill();
  const ok=g.aiReady,msg=g.lockDevice>0?'화장실에 둠':g.battery<=0?'배터리 0%':g.jam>0?'NO SIGNAL':d<1?'부팅…':g.q>=n?'완료 ✓':g.input.ai?'분석 중'+'.'.repeat(1+Math.floor(t*4)%3):`AI 답 ${ANS[(hash(g.q+g.period*17)%5)]}`;
  ctx.fillStyle=ok?'#5ae6ff':'#ff7b7b';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(msg,52,24);
  ctx.fillStyle='#5ae6ff55';ctx.fillRect(8,30,88*(g.battery/g.batteryMax),3);
  ctx.restore();}
 const face=g.phase==='caught'?'😵':g.input.act?'😇':g.susp>70?'😱':g.susp>35?'😅':g.input.ai&&g.devT>=1?'😏':'';if(face&&g.phase!=='intro'){ctx.font='28px system-ui';ctx.textAlign='center';ctx.fillText(face,w-60,34+Math.sin(t*5)*3);}
}
function icon(ctx,kind){
 const w=ctx.canvas.width;ctx.clearRect(0,0,w,w);ctx.save();ctx.scale(w/48,w/48);
 if(kind==='eye'){ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(24,24,20,12,0,0,7);ctx.fill();ctx.fillStyle='#e63946';ctx.beginPath();ctx.arc(24,24,8,0,7);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(24,24,4,0,7);ctx.fill();}
 else if(kind==='battery'){ctx.fillStyle='#5ae6ff';rr(ctx,6,14,32,20,4);ctx.fill();ctx.fillRect(38,20,4,8);ctx.fillStyle='#0b2530';ctx.font='bold 14px system-ui';ctx.textAlign='center';ctx.fillText('AI',22,29);}
 else if(kind==='paper'){ctx.fillStyle='#fbfaf4';ctx.fillRect(10,6,28,36);ctx.fillStyle='#c9c4b8';for(let i=0;i<5;i++)ctx.fillRect(14,12+i*6,20,2);ctx.fillStyle='#e07a5f';ctx.beginPath();ctx.arc(30,36,4,0,7);ctx.fill();}
 ctx.restore();
}
window.ExamArt={drawRoom,drawDesk,icon,room,hash,ANS};
})();
