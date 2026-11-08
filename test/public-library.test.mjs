import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash,webcrypto} from 'node:crypto';
import vm from 'node:vm';
const catalog=JSON.parse(await readFile('web/library/catalog.json','utf8'));
test('public library contains exactly the approved 11 unique audio files and JPEG covers',async()=>{
 assert.equal(catalog.records.length,11);assert.equal(new Set(catalog.records.map(r=>r.id)).size,11);
 for(const record of catalog.records){const audio=await readFile('web/'+record.publicAudio);assert.equal(createHash('sha256').update(audio).digest('hex'),record.id);assert.equal(audio.length,record.size);const cover=await readFile('web/'+record.cover);assert.equal(cover[0],255);assert.equal(cover[1],216);assert.ok(cover.length<512*1024);assert.ok(!('feelings'in record));}
});
test('default library merges by fingerprint and preserves local edits and audio',async()=>{
 const context={window:{},crypto:webcrypto,localStorage:{getItem:()=>null},fetch:async()=>({ok:true,json:async()=>catalog}),Blob,URL,navigator:{},setTimeout};
 vm.runInNewContext(await readFile('web/device.js','utf8'),context);
 const original={...catalog.records[0],title:'My edited title',favorite:true,blob:new Blob(['cached']),feelingCount:3};const writes=[];
 const merged=await context.window.LPPDevice.seedLibrary([original],async t=>writes.push(t));
 assert.equal(merged.length,11);assert.equal(new Set(merged.map(t=>t.id)).size,11);const kept=merged.find(t=>t.id===original.id);assert.equal(kept.title,original.title);assert.equal(kept.favorite,true);assert.equal(kept.blob,original.blob);assert.equal(kept.feelingCount,3);assert.equal(writes.length,11);
});
