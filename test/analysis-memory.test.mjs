import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile('web/reactive.js','utf8');
const code=source.slice(source.indexOf('  async function decodeAnalysis('),source.indexOf('  async function startProbe('));
function audioBuffer(channels,rate){return {length:channels[0].length,numberOfChannels:channels.length,sampleRate:rate,getChannelData:i=>channels[i]}}
function setup(offlineFails=false){
 let fetches=0,usedOffline=0,usedPlayback=0;const decoded=audioBuffer([Float32Array.from([1,.5,0,-.5]),Float32Array.from([-1,.5,0,.5])],22050);
 const context={decodeAudioData:async()=>{usedPlayback++;return decoded},createBuffer:(_channels,length,rate)=>audioBuffer([new Float32Array(length)],rate)};
 class Offline {constructor(channels,length,rate){assert.equal(channels,1);assert.equal(length,1);assert.equal(rate,22050)}async decodeAudioData(){usedOffline++;if(offlineFails)throw Error('unsupported');return decoded}}
 const scope=vm.createContext({window:{OfflineAudioContext:Offline},context,fetch:async()=>{fetches++;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}}});vm.runInContext(code,scope);
 return {scope,stats:()=>({fetches,usedOffline,usedPlayback})};
}
test('analysis decodes at a lower sample rate and downmixes without touching playback',async()=>{
 const {scope,stats}=setup();const result=await scope.decodeAnalysis('/record.m4a');
 assert.equal(result.sampleRate,22050);assert.equal(result.numberOfChannels,1);assert.deepEqual(Array.from(result.getChannelData(0)),[0,.5,0,0]);assert.deepEqual(stats(),{fetches:1,usedOffline:1,usedPlayback:0});
});
test('analysis falls back if offline decoding is not supported',async()=>{
 const {scope,stats}=setup(true);const result=await scope.decodeAnalysis('/record.m4a');
 assert.equal(result.numberOfChannels,1);assert.deepEqual(stats(),{fetches:2,usedOffline:1,usedPlayback:1});
});

test('a track change during analysis decoding starts analysis for the new track',async()=>{
 let release;const first=new Promise(resolve=>{release=resolve});const calls=[];const second={duration:90};
 const audio={paused:false,currentSrc:'',src:'first',currentTime:0,playbackRate:1};
 const context={state:'running',currentTime:0,createBufferSource(){return {playbackRate:{},connect(){},start(){}}}};
 const scope=vm.createContext({audio,context,visible:true,motion:()=>true,startingProbe:null,suspendingProbe:null,decodedURL:'',decodedBuffer:null,decodeJob:null,sourceNode:null,sourceOffset:0,sourceTime:0,sourceRate:1,analyser:{},status:null,queueMicrotask,decodeAnalysis:url=>{calls.push(url);return url==='first'?first:Promise.resolve(second)}});
 vm.runInContext(source.slice(source.indexOf('  async function startProbe('),source.indexOf('  async function unlock(')),scope);
 const pending=scope.startProbe();audio.src='second';release({duration:90});await pending;
 for(let i=0;i<5;i++)await Promise.resolve();
 assert.deepEqual(calls,['first','second']);assert.equal(scope.sourceNode.buffer,second);
});
