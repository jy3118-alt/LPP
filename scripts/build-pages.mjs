import {cp,readFile,writeFile,mkdir,rm} from 'node:fs/promises';
await rm('pages-dist',{recursive:true,force:true});await mkdir('pages-dist',{recursive:true});await cp('web','pages-dist',{recursive:true});
let html=await readFile('pages-dist/index.html','utf8');html=html.replace('cloud.js?v=lpp-cloud-v4','device.js?v=lpp-device-v1');await writeFile('pages-dist/index.html',html);
const manifest=JSON.parse(await readFile('pages-dist/manifest.webmanifest','utf8'));Object.assign(manifest,{id:'./',start_url:'./',scope:'./'});await writeFile('pages-dist/manifest.webmanifest',JSON.stringify(manifest));
let sw=await readFile('pages-dist/sw.js','utf8');sw=sw.replace('lpp-shell-cloud-v5','lpp-shell-device-v1').replace('./cloud.js?v=lpp-cloud-v4','./device.js?v=lpp-device-v1');await writeFile('pages-dist/sw.js',sw);
for(const file of ['index.html','app.js','emotion.js','sw.js']){const content=await readFile('pages-dist/'+file,'utf8');await writeFile('pages-dist/'+file,content.replaceAll('lpp-cloud-v4','lpp-device-v1'))}
await rm('pages-dist/cloud.js');await writeFile('pages-dist/.nojekyll','');
console.log('Built device-only GitHub Pages app. No music, private data, server or credentials included.');
