// Original six-direction PoVF mapping, kept explicit for future data analysis.
export const EMOTIONS=['Happy','Scared','Surprise','Sad','Disgust','Angry'];
export const EMOTION_COLORS={Neutral:'#B9BBC6',Happy:'#FFD000',Scared:'#A23CFF',Surprise:'#00DFFF',Sad:'#2864FF',Disgust:'#78F500',Angry:'#FF2448'};
export const FONT_AXES=['wdth','ital','slnt','opsz','yopq','wght'];
function rgb(hex){return hex.slice(1).match(/../g).map(v=>parseInt(v,16))}
function hsl(hex){const [r,g,b]=rgb(hex).map(v=>v/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;let h=0;if(d){if(max===r)h=((g-b)/d)%6;else if(max===g)h=(b-r)/d+2;else h=(r-g)/d+4;h=(h*60+360)%360}return [h,d?d/(1-Math.abs(2*l-1)):0,l]}
function hexFromHsl(h,s,l){const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;const v=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];return '#'+v.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('').toUpperCase()}
export function emotionColor(sector,mix,intensity){if(!intensity)return EMOTION_COLORS.Neutral;const a=hsl(EMOTION_COLORS[EMOTIONS[sector]]),b=hsl(EMOTION_COLORS[EMOTIONS[(sector+1)%6]]),neutral=hsl(EMOTION_COLORS.Neutral);const delta=((b[0]-a[0]+540)%360)-180,h=(a[0]+delta*mix+360)%360;return hexFromHsl(h,neutral[1]+((a[1]+(b[1]-a[1])*mix)-neutral[1])*intensity,neutral[2]+((a[2]+(b[2]-a[2])*mix)-neutral[2])*intensity)}
export function emotionAt(inputX=0,inputY=0){
  let x=Number(inputX),y=Number(inputY);if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('Invalid feeling position.');
  const magnitude=Math.hypot(x,y);if(magnitude>1){x/=magnitude;y/=magnitude}
  const intensity=Math.min(1,magnitude);let angle=(Math.atan2(y,x)*180/Math.PI+90+360)%360;
  if(!intensity)angle=0;
  const sector=Math.floor(angle/60)%6,mix=(angle-sector*60)/60,values=Array(6).fill(100);
  values[sector]+=400*(1-mix)*intensity;values[(sector+1)%6]+=400*mix*intensity;
  const axes=Object.fromEntries(EMOTIONS.map((name,i)=>[name,Math.round(values[i]*1000)/1000]));
  const fontAxes=Object.fromEntries(FONT_AXES.map((tag,i)=>[tag,Math.round(values[i])]));
  const normalized=Object.fromEntries(EMOTIONS.map((name,i)=>[name,Math.round((values[i]-100)/400*1e6)/1e6]));
  const ranked=EMOTIONS.map((name,i)=>({name,value:values[i]-100})).sort((a,b)=>b.value-a.value);
  const dominant=intensity<.015?'Neutral':ranked[0].name;
  const label=intensity<.015?'Neutral':ranked[1].value>ranked[0].value*.28?ranked.slice(0,2).map(v=>v.name).join(' + '):dominant;
  return {schemaVersion:1,mappingVersion:'povf-six-directions-v1',x,y,angle,intensity,axes,fontAxes,normalized,dominant,label,color:emotionColor(sector,mix,intensity),colorVersion:'vivid-continuous-v1'};
}

export function emotionPercentages(feeling){const entries=EMOTIONS.map(name=>({name,value:feeling.normalized[name]||0}));entries.push({name:'Neutral',value:Math.max(0,1-feeling.intensity)});for(const item of entries)item.percent=Math.floor(item.value*100);let remainder=100-entries.reduce((n,v)=>n+v.percent,0);for(const item of [...entries].sort((a,b)=>(b.value*100-b.percent)-(a.value*100-a.percent))){if(remainder--<=0)break;item.percent++}return entries.filter(v=>v.percent>0).sort((a,b)=>b.percent-a.percent)}
