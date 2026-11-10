import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('emotion changes only while the pointer is held down',async()=>{
 const source=await readFile('web/emotion.js','utf8');
 const listener=source.match(/pad\.addEventListener\('pointermove',event=>\{if\(dragging\)\{event\.preventDefault\(\);pointer\(event\)\}\}\);/);
 assert.ok(listener,'pointer movement must be gated by dragging');
 let move;const calls=[];const scope=vm.createContext({dragging:false,pad:{addEventListener(_name,fn){move=fn}},pointer:event=>calls.push(event.clientX)});
 vm.runInContext(listener[0],scope);
 const event={clientX:30,preventDefault(){}};
 move(event);assert.deepEqual(calls,[]);
 scope.dragging=true;move(event);assert.deepEqual(calls,[30]);
 scope.dragging=false;move(event);assert.deepEqual(calls,[30]);
});
