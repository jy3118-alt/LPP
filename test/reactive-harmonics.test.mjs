import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile('web/reactive.js','utf8');
const code=source.slice(source.indexOf('  function angleTable('),source.indexOf('  const lerp='));

test('cached ring harmonics exactly preserve the original waveform',()=>{
 const scope=vm.createContext({angles:new Map(),Math});
 vm.runInContext(code+'\nthis.math={angleTable,phasePair,shiftedSine}',scope);
 for(const points of [48,96])for(const row of scope.math.angleTable(points))for(const n of [3,4,5,6,7,37,63])for(const phase of [-4.3,-.1,0,.7,9.2]){
  const actual=scope.math.shiftedSine(row.waves[n],scope.math.phasePair(phase));
  assert.ok(Math.abs(actual-Math.sin(row.angle*n+phase))<1e-12);
 }
});
