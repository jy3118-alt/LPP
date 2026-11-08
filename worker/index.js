import assets from './assets.js';
import {emotionAt,EMOTIONS} from './emotion-model.js';
const MAX_AUDIO=50*1024*1024,MAX_JSON=1024*1024;
const ID=/^[a-f0-9]{64}$/;
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
const safeString=(value,max)=>typeof value==='string'?value.trim().slice(0,max):'';
const objectKey=id=>`records/${id}.json`;
async function readRecord(bucket,id){const object=await bucket.get(objectKey(id));return object?JSON.parse(await object.text()):null}
async function readJson(request,max=MAX_JSON){const length=Number(request.headers.get('content-length')||0);if(length>max)throw new HttpError(413,'File is too large.');const text=await request.text();if(text.length>max)throw new HttpError(413,'Request is too large.');try{return JSON.parse(text)}catch{throw new HttpError(400,'Invalid request.')}}
function service(request,env){const key=request.headers.get('x-lpp-service-key');return !!env.LPP_SERVICE_KEY&&!!key&&key===env.LPP_SERVICE_KEY}
async function authorize(request,env){
  if(service(request,env))return 'service';
  const user=request.headers.get('oai-authenticated-user-id');
  if(!user)throw new HttpError(401,'Sign in to your private shelf.');
  const origin=request.headers.get('origin');
  if(origin&&origin!==new URL(request.url).origin)throw new HttpError(403,'This request is not allowed.');
  if(!['GET','HEAD'].includes(request.method)&&request.headers.get('sec-fetch-site')==='cross-site')throw new HttpError(403,'This request is not allowed.');
  const ownerKey='private/owner.json';let owner=await env.BUCKET.get(ownerKey);
  if(!owner){await env.BUCKET.put(ownerKey,JSON.stringify({user}),{onlyIf:{etagDoesNotMatch:'*'}});owner=await env.BUCKET.get(ownerKey)}
  if(!owner||JSON.parse(await owner.text()).user!==user)throw new HttpError(403,'This shelf belongs to another account.');
  return user;
}
function audioMeta(request){let meta;try{meta=JSON.parse(decodeURIComponent(request.headers.get('x-lpp-meta')||''))}catch{throw new HttpError(400,'Missing record details.')}
  const id=meta.hash;if(!ID.test(id||''))throw new HttpError(400,'Invalid file fingerprint.');
  const title=safeString(meta.title,120),artist=safeString(meta.artist,100)||'My music',filename=safeString(meta.filename,240);
  if(!title||!filename||!/\.(mp3|m4a|wav|ogg|flac|aac|aiff|opus)$/i.test(filename))throw new HttpError(415,'Choose an audio file.');
  const type=(request.headers.get('content-type')||'').split(';')[0];if(!type.startsWith('audio/')&&type!=='application/octet-stream'&&type!=='video/mp4')throw new HttpError(415,'Choose an audio file.');
  const length=Number(request.headers.get('content-length'));if(!Number.isSafeInteger(length)||length<=0)throw new HttpError(411,'A file size is required.');if(length>MAX_AUDIO)throw new HttpError(413,'Choose a file under 50 MB.');
  return {id,title,artist,filename,type:type==='video/mp4'?'audio/mp4':type,size:length,duration:Math.max(0,Math.min(86400,Number(meta.duration)||0))};
}
async function putRecord(request,env){const meta=audioMeta(request),old=await readRecord(env.BUCKET,meta.id);if(old)return json({record:old,duplicate:true});
  // Request bodies retain their known Content-Length for R2 streaming.
  await env.BUCKET.put(`audio/${meta.id}`,request.body,{httpMetadata:{contentType:meta.type},sha256:Uint8Array.from(meta.id.match(/../g),x=>parseInt(x,16)).buffer});
  const record={...meta,added:Date.now(),updated:Date.now(),favorite:false,lastPlayed:null,color:['a','b','c','d'][parseInt(meta.id.slice(0,2),16)%4],cloud:true,revision:crypto.randomUUID()};
  const result=await env.BUCKET.put(objectKey(meta.id),JSON.stringify(record),{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'}});
  return json({record:result?record:await readRecord(env.BUCKET,meta.id),duplicate:!result},result?201:200);
}
async function listRecords(env){let cursor,objects=[];do{const result=await env.BUCKET.list({prefix:'records/',limit:1000,cursor});objects.push(...result.objects);cursor=result.truncated?result.cursor:undefined}while(cursor);
  const records=[];for(let i=0;i<objects.length;i+=15){const group=await Promise.all(objects.slice(i,i+15).map(o=>env.BUCKET.get(o.key).then(v=>v?v.text():null).then(t=>t?JSON.parse(t):null)));records.push(...group.filter(Boolean))}
  const counts={};for(const object of await feelingObjects(env)){const id=object.customMetadata?.recordId;if(id)counts[id]=(counts[id]||0)+1}return json({records:records.sort((a,b)=>b.added-a.added).map(record=>({...record,feelingCount:counts[record.id]||0}))});
}
async function patchRecord(request,env,id){const key=objectKey(id),object=await env.BUCKET.get(key);if(!object)throw new HttpError(404,'Record not found.');const record=JSON.parse(await object.text()),input=await readJson(request);const patch={};
  if('title'in input){patch.title=safeString(input.title,120);if(!patch.title)throw new HttpError(400,'Add a title.')}
  if('artist'in input){patch.artist=safeString(input.artist,100);if(!patch.artist)throw new HttpError(400,'Add an artist.')}
  if('favorite'in input){if(typeof input.favorite!=='boolean')throw new HttpError(400,'Invalid favorite.');patch.favorite=input.favorite}
  if('lastPlayed'in input)patch.lastPlayed=Math.min(Date.now(),Math.max(0,Number(input.lastPlayed)||0));
  if('duration'in input)patch.duration=Math.min(86400,Math.max(0,Number(input.duration)||0));
  if('coverData'in input){const match=typeof input.coverData==='string'&&input.coverData.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/);if(!match)throw new HttpError(415,'Choose a JPEG image.');const bytes=Uint8Array.from(atob(match[1]),c=>c.charCodeAt(0));if(bytes.length>512*1024)throw new HttpError(413,'Artwork is too large.');const coverKey=`art/${id}/${crypto.randomUUID()}.jpg`;await env.BUCKET.put(coverKey,bytes,{httpMetadata:{contentType:'image/jpeg'}});patch.coverKey=coverKey;patch.cover='/api/art/'+coverKey.slice(4)}
  const next={...record,...patch,updated:Date.now(),revision:crypto.randomUUID()};const saved=await env.BUCKET.put(key,JSON.stringify(next),{onlyIf:{etagMatches:object.etag},httpMetadata:{contentType:'application/json'}});if(!saved)throw new HttpError(409,'This record changed. Refresh and try again.');return json({record:next});
}
async function streamObject(request,bucket,key){const head=await bucket.head(key);if(!head)throw new HttpError(404,'File not found.');const headers=new Headers({'accept-ranges':'bytes','cache-control':'private, no-cache','x-content-type-options':'nosniff','etag':head.httpEtag});head.writeHttpMetadata(headers);
  const range=request.headers.get('range');let offset=0,length=head.size,status=200;
  if(range){const match=range.match(/^bytes=(\d*)-(\d*)$/);if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'content-range':`bytes */${head.size}`}});if(!match[1]){length=Math.min(head.size,Number(match[2]));offset=head.size-length}else{offset=Number(match[1]);const end=match[2]?Math.min(head.size-1,Number(match[2])):head.size-1;length=end-offset+1}if(offset>=head.size||length<=0)return new Response(null,{status:416,headers:{'content-range':`bytes */${head.size}`}});status=206;headers.set('content-range',`bytes ${offset}-${offset+length-1}/${head.size}`)}
  headers.set('content-length',String(length));if(request.method==='HEAD')return new Response(null,{status,headers});const object=await bucket.get(key,status===206?{range:{offset,length}}:undefined);if(!object)throw new HttpError(404,'File not found.');return new Response(object.body,{status,headers});
}
async function seedAsset(request,env,name){if(!service(request,env))throw new HttpError(403,'Not allowed.');if(!/^fonts\/(?:core|kr-[a-f0-9]{4})\.woff$/.test(name))throw new HttpError(400,'Invalid asset.');const size=Number(request.headers.get('content-length'));if(!size||size>2*1024*1024)throw new HttpError(413,'Invalid asset size.');await env.BUCKET.put(`app-assets/${name}`,request.body,{httpMetadata:{contentType:'font/woff'}});return json({ok:true,name})}
async function saveFeeling(request,env){const input=await readJson(request,16384);if(!ID.test(input.recordId||''))throw new HttpError(400,'Choose a record.');const record=await readRecord(env.BUCKET,input.recordId);if(!record)throw new HttpError(404,'Record not found.');let feeling;try{feeling=emotionAt(input.x,input.y)}catch{throw new HttpError(400,'Choose a feeling.')}const id=/^[a-f0-9-]{36}$/i.test(input.id||'')?input.id:crypto.randomUUID();const key=`feelings/${id}.json`;const old=await env.BUCKET.get(key);if(old)return json({feeling:JSON.parse(await old.text()),duplicate:true});const occurred=Date.parse(input.occurredAt),now=Date.now();const value={...feeling,id,recordId:record.id,title:record.title,artist:record.artist,filename:record.filename,checksum:record.id,occurredAt:Number.isFinite(occurred)&&occurred>1262304000000&&occurred<now+86400000?new Date(occurred).toISOString():new Date(now).toISOString(),receivedAt:new Date(now).toISOString(),playbackTime:Number.isFinite(input.playbackTime)?Math.max(0,Math.min(record.duration||86400,input.playbackTime)):null,duration:record.duration};await env.BUCKET.put(key,JSON.stringify(value),{onlyIf:{etagDoesNotMatch:'*'},httpMetadata:{contentType:'application/json'},customMetadata:{recordId:record.id}});return json({feeling:value},201)}
async function feelingObjects(env){let cursor,all=[];do{const result=await env.BUCKET.list({prefix:'feelings/',limit:1000,cursor,include:['customMetadata']});all.push(...result.objects);cursor=result.truncated?result.cursor:undefined}while(cursor);return all}
async function listFeelings(request,env){const url=new URL(request.url),recordId=url.searchParams.get('record');if(recordId&&!ID.test(recordId))throw new HttpError(400,'Invalid record.');const objects=(await feelingObjects(env)).filter(o=>!recordId||o.customMetadata?.recordId===recordId);const feelings=[];for(let i=0;i<objects.length;i+=15){const rows=await Promise.all(objects.slice(i,i+15).map(o=>env.BUCKET.get(o.key).then(v=>v?v.text():null).then(t=>t?JSON.parse(t):null)));feelings.push(...rows.filter(Boolean))}feelings.sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt));
if(url.searchParams.get('format')==='csv'){const columns=['schemaVersion','mappingVersion','id','recordId','title','artist','filename','checksum','occurredAt','receivedAt','playbackTime','duration','dominant','label','color','intensity','x','y','angle',...EMOTIONS,...EMOTIONS.map(v=>v+'Normalized')];const cell=v=>{let text=String(v??'');if(/^[=+@]/.test(text)||/^-[^0-9]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'};const rows=feelings.map(f=>columns.map(name=>cell(name.endsWith('Normalized')?f.normalized[name.replace('Normalized','')]:EMOTIONS.includes(name)?f.axes[name]:f[name])).join(','));return new Response('\ufeff'+columns.join(',')+'\r\n'+rows.join('\r\n'),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="LPP-feelings.csv"','cache-control':'no-store'}})}
const response=json({schemaVersion:1,feelings});if(url.searchParams.has('download'))response.headers.set('content-disposition','attachment; filename="LPP-feelings.json"');return response}
export default {async fetch(request,env){try{
  const url=new URL(request.url),path=url.pathname;
  if(path.startsWith('/api/')||path.startsWith('/fonts/')&&path.endsWith('.woff')){
    if(!env.BUCKET)throw new HttpError(503,'The private shelf is getting ready.');
    await authorize(request,env);
    if(path==='/api/records'&&request.method==='GET')return await listRecords(env);
    if(path==='/api/feelings'&&request.method==='POST')return await saveFeeling(request,env);
    if(path==='/api/feelings'&&request.method==='GET')return await listFeelings(request,env);
    if(path==='/api/records'&&request.method==='POST')return await putRecord(request,env);
    const match=path.match(/^\/api\/records\/([a-f0-9]{64})$/);
    if(match&&request.method==='PATCH')return await patchRecord(request,env,match[1]);
    if(match&&request.method==='DELETE'){const record=await readRecord(env.BUCKET,match[1]);if(!record)throw new HttpError(404,'Record not found.');await env.BUCKET.delete(objectKey(match[1]));await env.BUCKET.delete([`audio/${match[1]}`,...record.coverKey?[record.coverKey]:[]]);return json({ok:true})}
    const audio=path.match(/^\/api\/audio\/([a-f0-9]{64})$/);if(audio&&['GET','HEAD'].includes(request.method))return await streamObject(request,env.BUCKET,`audio/${audio[1]}`);
    const art=path.match(/^\/api\/art\/([a-f0-9]{64})\/([a-f0-9-]+\.jpg)$/);if(art&&['GET','HEAD'].includes(request.method))return await streamObject(request,env.BUCKET,`art/${art[1]}/${art[2]}`);
    if(path==='/api/admin/asset'&&request.method==='PUT')return await seedAsset(request,env,url.searchParams.get('name')||'');
    if(/^\/fonts\/(?:core|kr-[a-f0-9]{4})\.woff$/.test(path)&&['GET','HEAD'].includes(request.method))return await streamObject(request,env.BUCKET,`app-assets${path}`);
    throw new HttpError(404,'Not found.');
  }
  const asset=assets[path==='/'?'/index.html':path];if(!asset||!['GET','HEAD'].includes(request.method))throw new HttpError(404,'Not found.');
  const bytes=Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':asset.type,'cache-control':path==='/'||path==='/index.html'||path==='/sw.js'?'no-store':'private, max-age=0, must-revalidate','x-content-type-options':'nosniff','referrer-policy':'same-origin','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'"}});
}catch(error){if(!(error instanceof HttpError))console.error('LPP backend:',error.name,error.message);return json({error:error instanceof HttpError?error.message:'The shelf is temporarily unavailable.'},error.status||500)}}};
