import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const app=await readFile('web/app.js','utf8');
const reactive=await readFile('web/reactive.js','utf8');
const visibilityLine=(source)=>source.split('\n').find(line=>line.trimStart().startsWith("document.addEventListener('visibilitychange'"));
function target(){const handlers={};return {handlers,addEventListener(name,fn){handlers[name]=fn}}}

test('visibility changes save playback and reconcile the actual resumed audio state',()=>{
 const document={...target(),hidden:false,documentElement:{dataset:{}}},window=target();
 const audio={paused:false,currentTime:32},seen=[],saved=[],timers=[];
 const scope=vm.createContext({document,window,current:{id:'record'},audio,refreshPlayback:()=>seen.push({paused:audio.paused,time:audio.currentTime}),savePlayback:force=>saved.push({force,paused:audio.paused,time:audio.currentTime}),requestAnimationFrame:fn=>timers.push(fn),setTimeout:fn=>{timers.push(fn);return timers.length},clearTimeout:()=>{}});
 vm.runInContext(app.slice(app.indexOf('let returnRefreshTimer=0;'),app.indexOf('const time=')),scope);
 vm.runInContext(visibilityLine(app),scope);
 document.hidden=true;document.handlers.visibilitychange();assert.deepEqual(saved,[{force:true,paused:false,time:32}]);assert.equal(document.documentElement.dataset.paused,'true');
 audio.currentTime=48;document.hidden=false;document.handlers.visibilitychange();assert.deepEqual(seen.at(-1),{paused:false,time:48});
 audio.paused=true;audio.currentTime=49;for(const fn of timers.splice(0))fn();assert.deepEqual(seen.at(-1),{paused:true,time:49});
 document.hidden=true;document.handlers.visibilitychange();const count=seen.length;for(const fn of timers.splice(0))fn();assert.equal(seen.length,count);
});

test('hiding stops only the analysis source; returning leaves audible audio state intact',async()=>{
 const document={...target(),hidden:false};let stopped=0,disconnected=0,suspended=0,restarted=0,painted=0;
 const audio={paused:false,currentTime:42};
 const scope=vm.createContext({document,audio,visible:true,frame:12,suspendingProbe:null,sourceNode:{stop(){stopped++},disconnect(){disconnected++}},context:{state:'running',suspend(){suspended++;return Promise.resolve()}},cancelAnimationFrame:()=>{},playbackSession:()=>{},startProbe:()=>{restarted++},kick:()=>{painted++}});
 vm.runInContext(reactive.slice(reactive.indexOf('  function stopProbe()'),reactive.indexOf('  function alignProbe()')),scope);
 vm.runInContext(visibilityLine(reactive),scope);
 document.hidden=true;document.handlers.visibilitychange();await Promise.resolve();assert.equal(stopped,1);assert.equal(disconnected,1);assert.equal(suspended,1);assert.equal(audio.paused,false);assert.equal(audio.currentTime,42);
 document.hidden=false;document.handlers.visibilitychange();assert.equal(restarted,1);assert.equal(painted,1);assert.equal(audio.paused,false);assert.equal(audio.currentTime,42);
});
