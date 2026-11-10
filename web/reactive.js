/* LPP: ten projected ink grooves, driven only by this audio element.
   No microphone, uploads, or synthetic beat triggers. */
(()=>{
  'use strict';
  const audio=document.querySelector('#audio');
  const canvases=[document.querySelector('#reactive-record'),document.querySelector('#mini-reactive')].filter(Boolean);
  const main=canvases[0],status=document.querySelector('#reactive-state');
  if(main)document.body.append(main);
  const anchor=document.querySelector('#cover');
  let context,analyser,silentOutput,bins,wave,previous,smoothedWave,frame=0,lastTime=0,phase=0,spin=0,visible=!document.hidden;
  let startingProbe=null,suspendingProbe=null,sourceNode=null,decodedBuffer=null,decodedURL='',decodeJob=null,sourceOffset=0,sourceTime=0,sourceRate=1;
  let energy=0,bass=0,mid=0,high=0,brightness=0,texture=0,flux=0,hue=20,metricsTime=0;
  const layers=new Float32Array(10),targetLayers=new Float32Array(10);
  const contours=new WeakMap();
  const angles=new Map();
  let analysisAt=0,analysisTarget={energy:0,bass:0,mid:0,high:0,brightness:0,texture:0,flux:0};
  function angleTable(points){if(!angles.has(points)){const table=[];for(let j=0;j<=points;j++){const angle=j/points*Math.PI*2;table.push({angle,cos:Math.cos(angle),sin:Math.sin(angle)})}angles.set(points,table)}return angles.get(points)}
  const lerp=(a,b,t)=>a+(b-a)*t,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');
  const motion=()=>document.documentElement.dataset.motion!=='off';
  function playbackSession(){try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch{}}
  playbackSession();
  function stopProbe(){if(sourceNode){try{sourceNode.stop();sourceNode.disconnect()}catch{}sourceNode=null}}
  function suspendProbe(){stopProbe();if(context&&context.state==='running'){const pending=context.suspend().catch(()=>{});suspendingProbe=pending;pending.finally(()=>{if(suspendingProbe===pending)suspendingProbe=null})}}
  function alignProbe(){if(!sourceNode||!context)return;const predicted=sourceOffset+(context.currentTime-sourceTime)*sourceRate;if(Math.abs(predicted-audio.currentTime)>.25){stopProbe();startProbe()}}
  async function startProbe(){
    if(startingProbe)return startingProbe;
    startingProbe=(async()=>{
      if(!context||!visible||audio.paused||!motion())return false;
      try{
        while(suspendingProbe)await suspendingProbe;if(!visible||audio.paused||!motion())return false;
        if(context.state!=='running')await context.resume();
        const url=audio.currentSrc||audio.src;if(!url)return false;
        if(decodedURL!==url){
          if(!decodeJob||decodeJob.url!==url)decodeJob={url,promise:fetch(url).then(r=>{if(!r.ok)throw Error('No analysis audio');return r.arrayBuffer()}).then(bytes=>context.decodeAudioData(bytes)).then(buffer=>{const rate=22050,ratio=buffer.sampleRate/rate,mono=context.createBuffer(1,Math.ceil(buffer.length/ratio),rate),out=mono.getChannelData(0),left=buffer.getChannelData(0),right=buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1));for(let i=0;i<out.length;i++){const j=Math.min(buffer.length-1,Math.floor(i*ratio));out[i]=(left[j]+right[j])*.5}return mono})};
          const buffer=await decodeJob.promise;
          if((audio.currentSrc||audio.src)!==url)return false;
          decodedBuffer=buffer;decodedURL=url;
        }
        if(!visible||audio.paused||!motion())return false;
        if(sourceNode)return true;
        sourceNode=context.createBufferSource();sourceNode.buffer=decodedBuffer;sourceNode.playbackRate.value=audio.playbackRate;
        sourceOffset=Math.min(audio.currentTime,Math.max(0,decodedBuffer.duration-.01));sourceTime=context.currentTime;sourceRate=audio.playbackRate;
        sourceNode.connect(analyser);sourceNode.start(0,sourceOffset);return true;
      }catch{decodeJob=null;if(status)status.textContent='A QUIET IMPRESSION';return false}
    })();
    try{return await startingProbe}finally{startingProbe=null}
  }
  async function unlock(){
    playbackSession();try{
      if(!context){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return false;context=new AudioContext({latencyHint:'playback'});
        analyser=context.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.75;
        silentOutput=context.createGain();silentOutput.gain.value=0;analyser.connect(silentOutput);silentOutput.connect(context.destination);
        bins=new Uint8Array(analyser.frequencyBinCount);wave=new Float32Array(analyser.fftSize);smoothedWave=new Float32Array(wave.length);previous=new Float32Array(bins.length);
      }
      while(suspendingProbe)await suspendingProbe;if(context.state!=='running')await context.resume();startProbe();return context.state==='running';
    }catch{return false}
  }
  function analyse(){
    if(!analyser||audio.paused||!sourceNode||context.state!=='running'){targetLayers.fill(0);return {energy:0,bass:0,mid:0,high:0,brightness:0,texture:0,flux:0}}
    analyser.getByteFrequencyData(bins);analyser.getFloatTimeDomainData(wave);let rolling=0;for(let j=-8;j<=8;j++)rolling+=wave[(j+wave.length)%wave.length];for(let j=0;j<wave.length;j++){smoothedWave[j]=rolling/17;rolling+=wave[(j+9)%wave.length]-wave[(j-8+wave.length)%wave.length]}
    let squares=0,crossings=0,total=0,weighted=0,rise=0,logSum=0,powerSum=0,count=0;
    for(let i=0;i<wave.length;i++){squares+=wave[i]*wave[i];if(i&&wave[i]*wave[i-1]<0)crossings++}
    const rms=Math.sqrt(squares/wave.length),gate=clamp((rms-.0007)*900);
    const hzPerBin=context.sampleRate/analyser.fftSize;
    function band(low,top){let sum=0,n=0;for(let i=Math.max(1,Math.floor(low/hzPerBin));i<Math.min(bins.length,Math.ceil(top/hzPerBin));i++){sum+=bins[i]/255;n++}return n?sum/n:0}
    for(let i=1;i<bins.length;i++){
      const value=bins[i]/255,power=value*value;
      total+=power;weighted+=power*i*hzPerBin;rise+=Math.max(0,value-previous[i]);previous[i]=value;
      if(i*hzPerBin<10000){logSum+=Math.log(power+.00001);powerSum+=power;count++}
    }
    const centroid=total>0?weighted/total:0;
    const flatness=count&&powerSum>0?Math.exp(logSum/count)/(powerSum/count+.00001):0;
    for(let i=0;i<10;i++){const lower=45*Math.pow(10000/45,i/10),upper=45*Math.pow(10000/45,(i+1)/10);targetLayers[i]=band(lower,upper)*gate}
    return {energy:clamp(rms*5.5),bass:clamp(band(35,220)*1.4)*gate,mid:band(220,2400)*gate,high:clamp(band(2400,10000)*1.5)*gate,brightness:clamp(centroid/6500)*gate,texture:clamp(flatness*1.6+crossings/wave.length*.9)*gate,flux:clamp(rise/bins.length*18)*gate};
  }
  function draw(canvas,small){
    if(!canvas.clientWidth||!canvas.clientHeight)return;
    const width=canvas.width,height=canvas.height,ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.clearRect(0,0,width,height);ctx.save();
    if(small)ctx.scale(width/320,height/320);
    else{const rect=anchor.getBoundingClientRect();if(!rect.width||!rect.height){ctx.restore();return}const dpr=width/canvas.clientWidth;ctx.scale(dpr,dpr);ctx.translate(rect.left+rect.width/2,rect.top+rect.height/2);ctx.scale(rect.width/320,rect.width/320);ctx.translate(-160,-160)}
    const active=motion(),e=active?energy:0,b=active?bass:0,m=active?mid:0,h=active?high:0,t=active?texture:0;
    // The resting record faces the viewer: depth acts through perspective, not a fixed tilt.
    const rx=0,ry=0,rz=active?spin:0;
    const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
    const flow=active?phase:0;
    const points=small?48:96,table=angleTable(points);
    let contour=contours.get(canvas);if(!contour){contour={radius:new Float32Array(10*(points+1)),depth:new Float32Array(10*(points+1))};for(let layer=0;layer<10;layer++)for(let j=0;j<=points;j++)contour.radius[layer*(points+1)+j]=13+layer*10.8;contours.set(canvas,contour)}
    for(let layer=0;layer<10;layer++){
      const radius=13+layer*10.8,band=active?layers[layer]:0;
      const strokeHue=active?clamp(hue+(layer-4.5)*.75+brightness*1.5,8,34):21;
      ctx.strokeStyle=`hsl(${strokeHue.toFixed(1)} 100% ${47+layer*.65+e*2}%)`;
      ctx.lineWidth=small?3.7:2.1+e*1.9+flux*1.5;
      ctx.lineJoin='round';ctx.lineCap='round';
      ctx.beginPath();
      for(let j=0;j<=points;j++){
        const {angle,cos,sin}=table[j];
        const rough=Math.sin(angle*37+layer*2.3+flow*1.7)*.9+Math.sin(angle*63+layer*4-flow)*.45;
        const sample=smoothedWave?smoothedWave[(Math.floor(j/points*smoothedWave.length)+layer*41)%smoothedWave.length]:0;
        const ripple=Math.sin(angle*(3+layer%4)+phase*(2+h*9)+layer)*band*(10+e*75)+sample*e*95+Math.sin(angle*7-phase*3+layer)*flux*13;
        const index=layer*(points+1)+j;
        const targetRadius=Math.max(5,radius*(1+e*.12+flux*.13)+rough*(1+t*8+flux*5)+ripple+Math.sin(angle*5+flow*.7+layer*.5)*.55);
        const r=active?(contour.radius[index]=lerp(contour.radius[index],targetRadius,.16)):targetRadius;
        let x=cos*r,y=sin*r;
        const targetZ=((layer-4.5)*(12+40*b+24*m)+Math.sin(angle*3+flow*1.1+layer*.4)*m*46+Math.sin(angle*7+flow*1.7)*t*35)*e;
        const z=active?(contour.depth[index]=lerp(contour.depth[index],targetZ,.12)):0;
        const yy=y*cx-z*sx,zz=y*sx+z*cx;const xx=x*cy+zz*sy,depth=-x*sy+zz*cy;
        x=xx*cz-yy*sz;y=xx*sz+yy*cz;
        const perspective=520/(520-clamp(depth,-160,160)),px=160+x*perspective,py=160+y*perspective;
        if(!j)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.closePath();ctx.stroke();
      if(!small){ctx.save();ctx.globalAlpha=.32;ctx.lineWidth=.65;ctx.translate(.7,-.45);ctx.stroke();ctx.restore()}
    }
    ctx.restore();
    if(canvas===main&&performance.now()-metricsTime>250){canvas.dataset.layers='10';canvas.dataset.flow=phase.toFixed(4);canvas.dataset.hue=hue.toFixed(1);canvas.dataset.energy=energy.toFixed(4);canvas.dataset.bass=bass.toFixed(4);canvas.dataset.high=high.toFixed(4);canvas.dataset.texture=texture.toFixed(4);canvas.dataset.rotationX=rx.toFixed(4);canvas.dataset.rotationY=ry.toFixed(4);canvas.dataset.depth=((12+40*b+24*m)*e*4.5).toFixed(3)}
  }
  function resize(){for(const canvas of canvases){const width=canvas.clientWidth,height=canvas.clientHeight;if(!width||!height)continue;const dpr=Math.min(devicePixelRatio||1,innerWidth<700?1:1.6);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr)}paint()}
  function paint(){const playerOpen=document.body.classList.contains('player-open');canvases.forEach(canvas=>{if(innerWidth<=930&&(canvas===main?!playerOpen:playerOpen))return;draw(canvas,canvas.id==='mini-reactive')})}
  function loop(now){
    frame=0;if(!visible)return;
        const dt=Math.min(.08,Math.max(0,(now-lastTime)/1000));lastTime=now;
    if(sourceNode&&!audio.paused)alignProbe();
    if(!motion()){targetLayers.fill(0);analysisTarget={energy:0,bass:0,mid:0,high:0,brightness:0,texture:0,flux:0}}
    else if(now-analysisAt>=33){analysisTarget=analyse();analysisAt=now}
    const target=analysisTarget;
    energy=lerp(energy,target.energy,.16);bass=lerp(bass,target.bass,.14);mid=lerp(mid,target.mid,.14);high=lerp(high,target.high,.12);brightness=lerp(brightness,target.brightness,.12);texture=lerp(texture,target.texture,.12);flux=lerp(flux,target.flux,.14);
    for(let i=0;i<10;i++)layers[i]=lerp(layers[i],motion()?targetLayers[i]:0,.12);
    hue=lerp(hue,21-brightness*10+bass*8+flux*2,.07);
    if(motion()){phase+=dt*(1.1+energy*4+flux*5);spin=(spin+dt*.12)%(Math.PI*2)}
    paint();
    if(now-metricsTime>250){metricsTime=now;if(status)status.textContent=audio.paused?'READY TO RESONATE':!analyser?'A QUIET IMPRESSION':motion()?'SHAPED BY YOUR SOUND':'A STILL IMPRESSION'}
    if(motion()||energy>.001)frame=requestAnimationFrame(loop);
  }
  function kick(){if(!frame&&visible){lastTime=performance.now();frame=requestAnimationFrame(loop)}}
  audio.addEventListener('play',()=>{playbackSession();startProbe();kick()});audio.addEventListener('pause',()=>{stopProbe();kick()});audio.addEventListener('ended',()=>{stopProbe();kick()});audio.addEventListener('seeked',()=>{stopProbe();if(!audio.paused)startProbe();kick()});audio.addEventListener('ratechange',()=>{stopProbe();if(!audio.paused)startProbe()});
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(!visible){cancelAnimationFrame(frame);frame=0;suspendProbe()}else{playbackSession();if(!audio.paused)startProbe();kick()}});
  new ResizeObserver(resize).observe(document.querySelector('.now-panel'));
  new ResizeObserver(resize).observe(document.querySelector('#open-player'));
  window.addEventListener('resize',resize);
  window.LPPVisuals={unlock,motionChanged(){if(motion()&&!audio.paused)startProbe();else stopProbe();kick();paint()}};
  resize();kick();
})();
