// One unchanged, approved atlas. The same residents now share the viewport;
// scrolling never reassigns them to different paper panels or resets a route.
const frames=[
 [31,84,351,423],[416,84,329,423],[808,84,277,426],[1158,84,347,421],
 [47,564,288,398],[429,564,293,399],[797,567,287,396],[1181,567,293,396]
];
const walk=[4,5,6,7];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const override=new URLSearchParams(location.search).get('motion')==='reduce';
const starts=[[.15,.36],[.80,.28],[.32,.80],[.75,.68],[.51,.47]];

function createPixelResidents(){
 const atlas=new Image(),actors=[],prints=[];let tinted;
 const layer=document.createElement('div');layer.className='po-roam-layer';layer.setAttribute('role','group');layer.setAttribute('aria-label','Little Po visitors');
 const traceLayer=document.createElement('div');traceLayer.className='po-trace-layer';traceLayer.setAttribute('aria-hidden','true');
 const status=document.createElement('p');status.className='sr-only';status.setAttribute('role','status');
 document.body.append(traceLayer,layer,status);
 const summary=document.body.dataset;
 let loaded=false,still=false,W=0,H=0,sw=56,sh=61.6,count=5,raf=0,last=0,serial=0,obstacles=[],lastRefresh=-Infinity,layoutDirty=false;
 const pointer={x:-1000,y:-1000},dialog=document.querySelector('#dialog');
 const moving=a=>a.mode==='walk'||a.mode==='hurry';
 function random(a){a.seed=(Math.imul(a.seed,1664525)+1013904223)>>>0;return a.seed/4294967296}
 function inside(x,y){return x>=sw*.5+8&&x<=W-sw*.5-8&&y>=sh+12&&y<=H-16}
 function free(x,y){return inside(x,y)&&!obstacles.some(r=>x>r.l&&x<r.r&&y>r.t&&y<r.b)}
 function setMode(a,mode,seconds){a.mode=mode;a.time=seconds;a.elapsed=0}
 function destination(a,near=false){
  let x=a.x,y=a.y;
  for(let i=0;i<32;i++){
   if(near){const angle=random(a)*Math.PI*2,range=70+random(a)*130;x=a.x+Math.cos(angle)*range;y=a.y+Math.sin(angle)*range}
   else{x=sw/2+12+random(a)*(W-sw-24);y=sh+16+random(a)*(H-sh-38)}
   if(free(x,y)&&Math.hypot(x-a.x,y-a.y)>(near?45:Math.min(W*.25,180)))break;
  }
  if(free(x,y)){a.tx=x;a.ty=y}
  else{a.tx=a.x;a.ty=a.y}
 }
 function footprint(a,side=0){
  const mark=document.createElement('i');mark.className='po-footprint';
  // Traces belong to the document even though the visitors roam the viewport.
  const length=Math.hypot(a.vx,a.vy)||1,px=-a.vy/length,py=a.vx/length;
  Object.assign(mark.style,{left:`${a.x+px*side*3}px`,top:`${scrollY+a.y+py*side*3}px`,transform:`translate(-50%,-50%) rotate(${Math.atan2(a.vy,a.vx)*180/Math.PI}deg)`});
  traceLayer.append(mark);prints.push(mark);if(prints.length>48)prints.shift().remove();
  summary.pixelTraces=String(++serial);
  setTimeout(()=>{mark.remove();const i=prints.indexOf(mark);if(i>=0)prints.splice(i,1)},9200);
 }
 function react(a){
  footprint(a,-1);footprint(a,1);status.textContent='Po left orange footprints.';
  if(still)return;
  a.paint=5;a.jump=.55;a.lastPrint=a.distance;a.nearCooldown=7;a.meetCooldown=7;
  destination(a,true);setMode(a,'hurry',3.2);wake();
 }
 for(let i=0;i<5;i++){
  const button=document.createElement('button');button.type='button';button.className='po-resident';button.hidden=true;
  button.setAttribute('aria-label',`Po ${i+1} — Leave orange footprints`);button.title='Leave orange footprints';button.dataset.resident=String(i+1);
  const canvas=document.createElement('canvas');canvas.width=80;canvas.height=88;canvas.setAttribute('aria-hidden','true');button.append(canvas);layer.append(button);
  const a={button,ctx:canvas.getContext('2d'),index:i,seed:78241+i*449,key:'',x:0,y:0,tx:0,ty:0,vx:0,vy:0,direction:i%2?-1:1,
   distance:i*5,lastPrint:0,mode:i===1?'hurry':i===4?'inspect':'walk',time:i===1?2.6:i===4?2:7+i*1.8,elapsed:0,baseSpeed:24+i*3,
   paint:0,jump:0,hover:false,focus:false,nearCooldown:0,meetCooldown:3+i,blocked:0,initialized:false,active:false};
  actors.push(a);
  button.addEventListener('click',()=>react(a));
  button.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse'){a.hover=true;wake()}});
  button.addEventListener('pointerleave',()=>{a.hover=false;wake()});
  button.addEventListener('focus',()=>{a.focus=button.matches(':focus-visible');wake()});
  button.addEventListener('blur',()=>{a.focus=false;wake()});
 }
 function refresh(){
  if(!W)return;
  // Read layout only on scroll/resize, never in the simulation loop.
  const time=performance.now();if(time-lastRefresh<120)return;lastRefresh=time;
  obstacles=[];
  for(const e of document.querySelectorAll('button:not(.po-resident),a,input,select,textarea,.mobile-nav,.mini-player')){
   if(e.closest('.panel')?.getAttribute('aria-hidden')==='true')continue;
   const r=e.getBoundingClientRect();
   if(r.width&&r.height&&r.bottom>0&&r.top<H&&r.right>0&&r.left<W){
    obstacles.push({l:r.left-sw*.4-6,r:r.right+sw*.4+6,t:r.top-5,b:r.bottom+sh*.88+6});
   }
  }
  // Scrolling may bring a control under a resident; yield its pointer hit area
  // until it has walked clear. Navigation always stays above the visitors.
  for(const a of actors)if(a.active)a.button.style.pointerEvents=free(a.x,a.y)?'auto':'none';
 }
 function measure(){
  const oldW=W,oldH=H;W=document.documentElement.clientWidth;H=innerHeight;
  if(oldW&&(oldW!==W||oldH!==H)){for(const mark of prints)mark.remove();prints.length=0}
  const small=W<650;sw=small?44.8:56;sh=small?49.28:61.6;count=small?3:5;still=override||document.documentElement.dataset.motion==='off';
  Object.assign(summary,{pixelMotion:still?'still':'roaming',pixelCapacity:String(count),pixelVisible:String(count),pixelSpace:'viewport',pixelScale:'0.70'});
  for(const a of actors){
   a.active=a.index<count;a.button.hidden=!loaded||!a.active;
   if(!a.initialized){a.x=W*starts[a.index][0];a.y=H*starts[a.index][1];a.initialized=true}
   else if(oldW&&oldH){a.x*=W/oldW;a.y*=H/oldH;a.tx*=W/oldW;a.ty*=H/oldH}
   a.x=clamp(a.x,sw/2+8,W-sw/2-8);a.y=clamp(a.y,sh+12,H-16);
  }
  lastRefresh=-Infinity;refresh();layoutDirty=false;
  for(const a of actors){
   if(!free(a.x,a.y)){
    destination(a);if(free(a.tx,a.ty)){a.x=a.tx;a.y=a.ty}
   }
   if(!a.tx||!free(a.tx,a.ty))destination(a);
   if(loaded&&a.active)paint(a,false);
  }
  if(still){cancelAnimationFrame(raf);raf=0;last=0}else wake();
 }
 function draw(a,frame){
  const key=`${frame}/${a.direction}`;if(key===a.key)return;a.key=key;
  const [sx,sy,w,h]=frames[frame],scale=72/423,ctx=a.ctx;
  ctx.clearRect(0,0,80,88);ctx.imageSmoothingEnabled=false;ctx.save();ctx.translate(40,88);ctx.scale(a.direction,1);
  ctx.drawImage(tinted,sx,sy,w,h,-Math.round(w*scale/2),-Math.round(h*scale),Math.round(w*scale),Math.round(h*scale));ctx.restore();
  a.button.dataset.frame=String(frame);a.button.dataset.direction=String(a.direction);
 }
 function paint(a,walking){
  const watch=(a.hover||a.focus)&&!a.paint;
  let frame=1;
  if(!still){
   if(walking)frame=walk[Math.floor(a.distance/3.8)%4];
   else if(watch||a.mode==='look'||a.mode==='greet')frame=0;
   else if(a.mode==='inspect')frame=[1,2,3,2,0][Math.min(4,Math.floor(a.elapsed/.48))];
  }
  const hop=!still&&a.jump>0?Math.sin((1-a.jump/.55)*Math.PI)*(W<650?10:15):0;
  a.button.style.transform=`translate3d(${(a.x-sw/2).toFixed(2)}px,${(a.y-sh-hop).toFixed(2)}px,0)`;
  a.button.style.pointerEvents=free(a.x,a.y)?'auto':'none';
  draw(a,frame);
  Object.assign(a.button.dataset,{action:still?'still':watch?'look':a.mode,x:a.x.toFixed(1),y:a.y.toFixed(1),targetX:a.tx.toFixed(1),targetY:a.ty.toFixed(1),travel:a.distance.toFixed(1),hop:hop.toFixed(1)});
 }
 function update(a,dt){
  a.paint=Math.max(0,a.paint-dt);a.jump=Math.max(0,a.jump-dt);
  a.nearCooldown=Math.max(0,a.nearCooldown-dt);a.meetCooldown=Math.max(0,a.meetCooldown-dt);
  if((a.hover||a.focus)&&!a.paint){a.vx=0;a.vy=0;paint(a,false);return}
  if(!a.nearCooldown&&!a.paint&&Math.hypot(pointer.x-a.x,pointer.y-(a.y-sh*.45))<72){
   setMode(a,'look',1.3);a.nearCooldown=8;
  }
  a.time-=dt;a.elapsed+=dt;
  if(a.time<=0){
   if(moving(a)&&a.mode!=='hurry')setMode(a,random(a)>.45?'inspect':'rest',1.3+random(a)*1.2);
   else{const hurry=random(a)>.80;setMode(a,hurry?'hurry':'walk',hurry?2.4+random(a)*1.6:8+random(a)*9);destination(a)}
  }
  if(!moving(a)){a.vx=0;a.vy=0;paint(a,false);return}
  let dx=a.tx-a.x,dy=a.ty-a.y,length=Math.hypot(dx,dy);
  if(length<6){setMode(a,random(a)>.4?'inspect':'rest',1+random(a)*1.8);paint(a,false);return}
  dx/=length;dy/=length;
  for(const other of actors){
   if(other===a||!other.active)continue;
   const ox=a.x-other.x,oy=a.y-other.y,d=Math.hypot(ox,oy);
   if(d<sw*1.15&&d>.01){
    dx+=ox/d*(1-d/(sw*1.15))*2.2;dy+=oy/d*(1-d/(sw*1.15))*2.2;
    if(d<sw*.85&&!a.meetCooldown&&!other.meetCooldown&&!a.paint&&!other.paint){
     setMode(a,'greet',.85);setMode(other,'greet',.85);a.meetCooldown=other.meetCooldown=12;
     a.direction=other.x>a.x?1:-1;other.direction=-a.direction;paint(a,false);return;
    }
   }
  }
  length=Math.hypot(dx,dy)||1;
  const speed=a.baseSpeed*(W<650?.72:1)*(a.mode==='hurry'?1.7:1),blend=1-Math.exp(-dt*5);
  a.vx+=(dx/length*speed-a.vx)*blend;a.vy+=(dy/length*speed-a.vy)*blend;
  const x=a.x+a.vx*dt,y=a.y+a.vy*dt;
  let nx=a.x,ny=a.y;
  if(free(x,y)){nx=x;ny=y;a.blocked=0}
  else{
   // Axis sliding lets a path go around control rectangles without jumping.
   if(free(x,a.y))nx=x;if(free(nx,y))ny=y;
   a.blocked+=dt;if(a.blocked>.18){destination(a);a.blocked=0}
   // A newly scrolled control can envelop the current position. It already
   // owns hit testing; allow a short escape toward a free target.
   if(!free(a.x,a.y)&&inside(x,y)){nx=x;ny=y}
  }
  const travelled=Math.hypot(nx-a.x,ny-a.y);a.distance+=travelled;a.x=nx;a.y=ny;
  if(Math.abs(a.vx)>2)a.direction=a.vx>0?1:-1;
  if(a.paint&&a.distance-a.lastPrint>7){footprint(a,Math.floor(a.distance/7)%2?1:-1);a.lastPrint=a.distance}
  paint(a,travelled>.03);
 }
 function tick(time){
  raf=0;if(document.hidden||still||!loaded||dialog.open){last=0;return}if(layoutDirty&&time-lastRefresh>=120){refresh();layoutDirty=false}
  // Run movement on display frames; sprite poses still follow distance.
  const dt=last?Math.min(.06,(time-last)/1000):0;last=time;
  for(const a of actors)if(a.active)update(a,dt);
  raf=requestAnimationFrame(tick);
 }
 function wake(){if(loaded&&!still&&!document.hidden&&!dialog.open&&!raf)raf=requestAnimationFrame(tick)}
 function scheduleRefresh(){layoutDirty=true;if(still){lastRefresh=-Infinity;refresh();layoutDirty=false}else wake()}
 addEventListener('pointermove',event=>{if(event.pointerType==='mouse'){pointer.x=event.clientX;pointer.y=event.clientY}},{passive:true});
 document.addEventListener('pointerleave',()=>{pointer.x=pointer.y=-1000;for(const a of actors)a.hover=false});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){cancelAnimationFrame(raf);raf=0;last=0;summary.pixelMotion='paused'}
  else{summary.pixelMotion=still?'still':'roaming';lastRefresh=-Infinity;refresh();layoutDirty=false;wake()}
 });
 reduced.addEventListener('change',measure);addEventListener('resize',measure);addEventListener('scroll',scheduleRefresh,{passive:true});new MutationObserver(scheduleRefresh).observe(document.body,{attributes:true,attributeFilter:['class']});new MutationObserver(scheduleRefresh).observe(document.querySelector('#tracks'),{childList:true});new MutationObserver(scheduleRefresh).observe(dialog,{attributes:true,attributeFilter:['open']});new MutationObserver(measure).observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
 atlas.src='./assets/pixel-po/po-approved.png';
 atlas.decode().then(()=>{
  // Keep the original alpha, skin, outlines and yellow spots. Recolor only cobalt fabric.
  tinted=document.createElement('canvas');tinted.width=atlas.width;tinted.height=atlas.height;
  const ctx=tinted.getContext('2d',{willReadFrequently:true});ctx.drawImage(atlas,0,0);
  const pixels=ctx.getImageData(0,0,tinted.width,tinted.height),d=pixels.data;
  for(let i=0;i<d.length;i+=4){const r=d[i],g=d[i+1],b=d[i+2];if(d[i+3]&&b>r*1.45&&b>g*1.35&&b>65){const light=b/255;d[i]=Math.round(255*light);d[i+1]=Math.round(90*light);d[i+2]=0;}}
  ctx.putImageData(pixels,0,0);loaded=true;summary.pixelAsset='approved-second';summary.pixelState='ready';measure()}).catch(error=>{
  summary.pixelState='error';status.textContent='Could not load Po.';console.error('Po sprites:',error.message);
 });
 return {measure,refresh};
}

createPixelResidents();
