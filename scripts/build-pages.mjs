import {cp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
await rm('pages-dist',{recursive:true,force:true});await mkdir('pages-dist',{recursive:true});await cp('web','pages-dist',{recursive:true});
let html=await readFile('pages-dist/index.html','utf8');html=html.replace('cloud.js?v=lpp-cloud-v4','device.js?v=lpp-device-v11');await writeFile('pages-dist/index.html',html);
const manifest=JSON.parse(await readFile('pages-dist/manifest.webmanifest','utf8'));Object.assign(manifest,{id:'./',start_url:'./',scope:'./'});await writeFile('pages-dist/manifest.webmanifest',JSON.stringify(manifest));
let sw=await readFile('pages-dist/sw.js','utf8');sw=sw.replace('lpp-shell-cloud-v5','lpp-shell-device-v11').replace('./cloud.js?v=lpp-cloud-v4','./device.js?v=lpp-device-v11');await writeFile('pages-dist/sw.js',sw);
for(const file of ['index.html','app.js','emotion.js','sw.js']){const content=await readFile('pages-dist/'+file,'utf8');await writeFile('pages-dist/'+file,content.replaceAll('lpp-cloud-v4','lpp-device-v11'))}
const library=JSON.parse(await readFile('web/library/catalog.json','utf8'));const libraryAssets=['./library/catalog.json',...library.records.filter(r=>r.cover).map(r=>'./'+r.cover)];
const finalSW=await readFile('pages-dist/sw.js','utf8');await writeFile('pages-dist/sw.js',finalSW.replace('const ASSETS=[','const ASSETS=['+libraryAssets.map(a=>JSON.stringify(a)).join(',')+','));
await rm('pages-dist/cloud.js');await writeFile('pages-dist/.nojekyll','');
console.log('Built device-only GitHub Pages app. Includes the approved public music library. No feelings, private backups, server or credentials included.');
