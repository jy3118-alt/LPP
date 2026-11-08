/* LPP: ten projected ink grooves, driven only by this audio element.
   No microphone, uploads, or synthetic beat triggers. */
(()=>{
  'use strict';
  const audio=document.querySelector('#audio');
  const canvases=[document.querySelector('#reactive-record'),document.querySelector('#mini-reactive')].filter(Boolean);
  const main=canvases[0],status=document.querySelector('#reactive-state');
  let context,source,analyser,bins,wave,previous,frame=0,lastTime=0,phase=0,visible=!document.hidden;
  let energy=0,bass=0,mid=0,high=0,brightness=0,texture=0,flux=0,hue=20,metricsTime=0;
  const layers=new Float32Array(10),targetLayers=new Float32Array(10);
  const lerp=(a,b,t)=>a+(b-a)*t,clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const motion=()=>document.documentElement.dataset.motion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  async function unlock(){
    try{
      if(!context){
        const AudioContext=window.AudioContext||window.webkitAudioContext;
        if(!AudioContext)return false;
        context=new AudioContext({latencyHint:'playback'});
        source=context.createMediaElementSource(audio);
        // Keep a direct output route even if visualization initialization fails.
        source.connect(context.destination);
        analyser=context.createAnalyser();analyser.fftSize=2048;analyser.smoothingTimeConstant=.65;
        source.connect(analyser);bins=new Uint8Array(analyser.frequencyBinCount);wave=new Float32Array(analyser.fftSize);previous=new Float32Array(bins.length);
      }
      if(context.state!=='running')await context.resume();
      return context.state==='running';
    }catch(error){if(status)status.textContent='A QUIET IMPRESSION';return false}
  }
  function analyse(){
    if(!analyser||audio.paused||context.state!=='running'){targetLayers.fill(0);return {energy:0,bass:0,mid:0,high:0,brightness:0,texture:0,flux:0}}
    analyser.getByteFrequencyData(bins);analyser.getFloatTimeDomainData(wave);
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
    ctx.clearRect(0,0,width,height);ctx.save();ctx.scale(width/320,height/320);
    const active=motion(),e=active?energy:0,b=active?bass:0,m=active?mid:0,h=active?high:0,t=active?texture:0;
    const rx=clamp((Math.sin(phase*.87)*.95+b*1.65-m*.35)*e,-1.1,1.1),ry=clamp((Math.cos(phase*.63)*1.05+m*1.7-h*.8)*e,-1.1,1.1),rz=(Math.sin(phase*.7)*.7+phase*.15)*e;
    const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
    const printFrame=active&&e>.001?Math.floor(phase*18):0;
    const points=small?80:144;
    for(let layer=0;layer<10;layer++){
      const radius=13+layer*10.8,band=active?layers[layer]:0;
      const strokeHue=active?hue+(layer-4.5)*(5+brightness*24+t*20):20;
      ctx.strokeStyle=`hsl(${strokeHue.toFixed(1)} 100% ${50+layer*.35+e*2}%)`;
      ctx.lineWidth=small?3.7:2.1+e*1.9+flux*1.5;
      ctx.lineJoin='round';ctx.lineCap='round';
      ctx.beginPath();
      for(let j=0;j<=points;j++){
        const angle=j/points*Math.PI*2;
        const rough=Math.sin(angle*37+layer*2.3+printFrame*1.7)*.9+Math.sin(angle*63+layer*4-printFrame)*.45;
        const sample=wave?wave[(Math.floor(j/points*wave.length)+layer*41)%wave.length]:0;
        const ripple=Math.sin(angle*(3+layer%4)+phase*(2+h*9)+layer)*band*(10+e*75)+sample*e*95+Math.sin(angle*7-phase*3+layer)*flux*13;
        const r=Math.max(5,radius*(1+e*.12+flux*.13)+rough*(1+t*8+flux*5)+ripple);
        let x=Math.cos(angle)*r+Math.sin(phase*1.2+layer*.42)*e*(4+band*13),y=Math.sin(angle)*r+Math.cos(phase*.9+layer*.35)*e*(4+b*12);
        let z=((layer-4.5)*32*(b+m*.4)+Math.sin(angle*3+phase*2+layer*.4)*m*62+Math.sin(angle*11+phase*4)*t*52)*e;
        const yy=y*cx-z*sx,zz=y*sx+z*cx;const xx=x*cy+zz*sy,depth=-x*sy+zz*cy;
        x=xx*cz-yy*sz;y=xx*sz+yy*cz;
        const perspective=520/(520-clamp(depth,-160,160)),px=160+x*perspective,py=160+y*perspective;
        if(!j)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.closePath();ctx.stroke();
      if(!small){ctx.save();ctx.globalAlpha=.32;ctx.lineWidth=.65;ctx.translate(.7,-.45);ctx.stroke();ctx.restore()}
    }
    ctx.restore();
    if(canvas===main){canvas.dataset.layers='10';canvas.dataset.hue=hue.toFixed(1);canvas.dataset.energy=energy.toFixed(4);canvas.dataset.bass=bass.toFixed(4);canvas.dataset.high=high.toFixed(4);canvas.dataset.texture=texture.toFixed(4);canvas.dataset.rotationX=rx.toFixed(4);canvas.dataset.rotationY=ry.toFixed(4);canvas.dataset.depth=((b+m*.4)*e*144).toFixed(3)}
  }
  function resize(){for(const canvas of canvases){const size=canvas.clientWidth;if(!size)continue;const dpr=Math.min(devicePixelRatio||1,1.8);canvas.width=canvas.height=Math.round(size*dpr)}paint()}
  function paint(){canvases.forEach(canvas=>draw(canvas,canvas.id==='mini-reactive'))}
  function loop(now){
    frame=0;if(!visible)return;
    if(now-lastTime<32){frame=requestAnimationFrame(loop);return}
    const dt=Math.min(.08,Math.max(0,(now-lastTime)/1000));lastTime=now;
    const target=motion()?analyse():{energy:0,bass:0,mid:0,high:0,brightness:0,texture:0,flux:0};
    energy=lerp(energy,target.energy,.42);bass=lerp(bass,target.bass,.36);mid=lerp(mid,target.mid,.32);high=lerp(high,target.high,.32);brightness=lerp(brightness,target.brightness,.25);texture=lerp(texture,target.texture,.32);flux=lerp(flux,target.flux,.45);
    for(let i=0;i<10;i++)layers[i]=lerp(layers[i],motion()?targetLayers[i]:0,.2);
    hue=lerp(hue,20+brightness*650+texture*120+flux*140,.19);
    if(energy>.001)phase+=dt*(.6+energy*6+flux*8);
    paint();
    if(now-metricsTime>250){metricsTime=now;if(status)status.textContent=audio.paused?'READY TO RESONATE':!analyser?'A QUIET IMPRESSION':motion()?'SHAPED BY YOUR SOUND':'A STILL IMPRESSION'}
    if(!audio.paused&&motion()||energy>.001)frame=requestAnimationFrame(loop);
  }
  function kick(){if(!frame&&visible){lastTime=performance.now();frame=requestAnimationFrame(loop)}}
  audio.addEventListener('play',kick);audio.addEventListener('pause',kick);audio.addEventListener('ended',kick);audio.addEventListener('seeked',kick);
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;if(!visible){cancelAnimationFrame(frame);frame=0}else{if(context&&context.state==='suspended'&&!audio.paused)context.resume().catch(()=>{});kick()}});
  new ResizeObserver(resize).observe(document.querySelector('.now-panel'));
  new ResizeObserver(resize).observe(document.querySelector('#open-player'));
  window.LPPVisuals={unlock,motionChanged(){kick();paint()}};
  resize();
})();
