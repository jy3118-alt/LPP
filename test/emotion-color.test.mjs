import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emotionAt,EMOTIONS,EMOTION_COLORS} from '../web/emotion-model.js';
const rgb=c=>c.slice(1).match(/../g).map(v=>parseInt(v,16));
test('saturated emotion anchors are exact and color is continuous across category boundaries',()=>{
 for(let i=0;i<6;i++){const a=i*Math.PI/3;assert.equal(emotionAt(Math.sin(a),-Math.cos(a)).color,EMOTION_COLORS[EMOTIONS[i]]);}
 for(let degree=0;degree<360;degree++){const a=degree*Math.PI/180,b=(degree+.05)*Math.PI/180;const one=rgb(emotionAt(Math.sin(a),-Math.cos(a)).color),two=rgb(emotionAt(Math.sin(b),-Math.cos(b)).color);assert.ok(Math.max(...one.map((v,i)=>Math.abs(v-two[i])))<=2);}
 assert.equal(emotionAt().color,EMOTION_COLORS.Neutral);
});

test('displayed seven-emotion percentages total 100 at any intensity',async()=>{
 const {emotionPercentages}=await import('../web/emotion-model.js');
 for(const [x,y] of [[0,0],[.28,-.84],[.5,.1],[-.33,.7],[0,-1]]){const values=emotionPercentages(emotionAt(x,y));assert.equal(values.reduce((n,v)=>n+v.percent,0),100);assert.ok(values.every(v=>Number.isInteger(v.percent)&&v.percent>0));}
});
