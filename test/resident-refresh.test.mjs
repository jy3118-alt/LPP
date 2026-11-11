import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('resident obstacle layout is read only when the layout changes',async()=>{
 const source=await readFile('web/residents.js','utf8');
 const start=source.indexOf(' function tick(time){'),end=source.indexOf(" addEventListener('pointermove'",start);
 assert.ok(start>=0&&end>start);
 let reads=0;const scope=vm.createContext({raf:0,document:{hidden:false},dialog:{open:false},layoutDirty:false,lastRefresh:-Infinity,still:false,loaded:true,last:0,actors:[],requestAnimationFrame:()=>1,refresh:()=>{reads++},update:()=>{}});
 vm.runInContext(source.slice(start,end),scope);
 scope.tick(1000);scope.tick(1016);scope.tick(1032);assert.equal(reads,0);
 scope.scheduleRefresh();scope.tick(1050);assert.equal(reads,1);
 scope.tick(1066);scope.tick(1082);assert.equal(reads,1);
 scope.dialog.open=true;scope.scheduleRefresh();scope.tick(1300);assert.equal(reads,1);
 scope.dialog.open=false;scope.scheduleRefresh();scope.tick(1320);assert.equal(reads,2);
});
