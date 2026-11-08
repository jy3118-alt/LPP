// Original six-direction PoVF mapping, kept explicit for future data analysis.
export const EMOTIONS=['Happy','Scared','Surprise','Sad','Disgust','Angry'];
export const EMOTION_COLORS={Neutral:'#9B9B9B',Happy:'#FFD34E',Scared:'#AA7DFF',Surprise:'#67D9FF',Sad:'#5587FF',Disgust:'#8BCC58',Angry:'#FF5757'};
export const FONT_AXES=['wdth','ital','slnt','opsz','yopq','wght'];
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
  return {schemaVersion:1,mappingVersion:'povf-six-directions-v1',x,y,angle,intensity,axes,fontAxes,normalized,dominant,label,color:EMOTION_COLORS[dominant]};
}
