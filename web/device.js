/* Device-only edition: this module never sends songs or feelings to a server. */
window.LPP_DEVICE_ONLY=true;
(()=>{
 const download=(blob,name)=>{const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),60000)};
 const hash=async file=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))].map(n=>n.toString(16).padStart(2,'0')).join('');
 const dataURL=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Could not read file.'));r.readAsDataURL(blob)});
 async function exportBackup(tracks){try{
  window.LPPToast('Preparing backup…');const records=[];
  for(const track of tracks){if(!track.blob)throw Error('A record is not downloaded.');const {blob,pendingPatch,cloud,...meta}=track;records.push({...meta,cloud:false,audioData:await dataURL(blob)})}
  const feelings=await window.LPPFeelingStore.all();download(new Blob([JSON.stringify({format:'lpp-device-backup',version:1,createdAt:new Date().toISOString(),records,feelings})],{type:'application/json'}),'LPP-backup.json');window.LPPToast('Save your backup in Files.');
 }catch(error){window.LPPToast(error.message||'Could not create backup.')}}
 async function restoreBackup(file,db){
  if(!file)return;if(file.size>512*1024*1024)throw Error('Backup is too large.');
  const input=JSON.parse(await file.text());if(input.format!=='lpp-device-backup'||input.version!==1||!Array.isArray(input.records)||!Array.isArray(input.feelings))throw Error('Choose an LPP backup.');
  const records=[];const feelings=[];
  for(const record of input.records){
   if(!/^[a-f0-9]{64}$/.test(record.id||'')&&!/^[a-f0-9-]{36}$/.test(record.id||''))throw Error('Invalid record.');
   if(typeof record.title!=='string'||typeof record.artist!=='string'||!/^data:(?:audio\/[\w.+-]+|video\/mp4|application\/octet-stream);base64,[A-Za-z0-9+/=]+$/.test(record.audioData||''))throw Error('Invalid audio in backup.');
   const encoded=record.audioData,split=encoded.indexOf(','),binary=atob(encoded.slice(split+1)),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
   const blob=new Blob([bytes],{type:encoded.slice(5,encoded.indexOf(';'))});if(/^[a-f0-9]{64}$/.test(record.id)&&await hash(blob)!==record.id)throw Error('Backup audio checksum does not match.');
   const cover=record.localCover||record.cover;if(cover&&!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(cover))throw Error('Invalid artwork in backup.');
   const {audioData,pendingPatch,coverData,...meta}=record;records.push({...meta,blob,cloud:false,cover,localCover:undefined});
  }
  for(const f of input.feelings){if(typeof f.id!=='string'||typeof f.recordId!=='string'||!Number.isFinite(Date.parse(f.occurredAt))||!f.fontAxes||!Object.entries(f.fontAxes).every(([k,v])=>/^[a-z]{4}$/.test(k)&&Number.isFinite(v)))throw Error('Invalid feeling in backup.');feelings.push({...f,pending:false})}
  await new Promise((resolve,reject)=>{const tx=db.transaction(['tracks','feelings'],'readwrite');for(const record of records)tx.objectStore('tracks').put(record);for(const feeling of feelings)tx.objectStore('feelings').put(feeling);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
  if(navigator.storage?.persist)navigator.storage.persist().catch(()=>{});
 }
 function exportFeelings(entries,format){
  if(format==='json'){download(new Blob([JSON.stringify({schemaVersion:1,feelings:entries},null,2)],{type:'application/json'}),'LPP-feelings.json');return}
  const keys=['id','recordId','title','artist','occurredAt','playbackTime','dominant','label','color','intensity','x','y','angle','checksum','fontAxes','axes','normalized'];
  const cell=value=>{let s=typeof value==='object'?JSON.stringify(value):String(value??'');if(/^[=+@]/.test(s)||/^-[^0-9]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};
  download(new Blob(['\ufeff'+keys.join(',')+'\r\n'+entries.map(f=>keys.map(k=>cell(f[k])).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),'LPP-feelings.csv');
 }
 window.LPPDevice={hash,exportBackup,restoreBackup,exportFeelings};
})();
