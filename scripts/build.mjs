import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd(),web=path.join(root,'web');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.svg':'image/svg+xml','.wav':'audio/wav','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
const files=['index.html','style.css','app.js','reactive.js','cloud.js','emotion.js','emotion-model.js','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','sample.wav','fonts/font.css','fonts/OFL.txt','fonts/font-info.json','fonts/PoVF.ttf'];
const assets={};for(const file of files){const bytes=await readFile(path.join(web,file));assets['/'+file]={type:types[path.extname(file)]||'application/octet-stream',body:bytes.toString('base64')}}
await rm(path.join(root,'dist'),{recursive:true,force:true});await mkdir('dist/server',{recursive:true});
await writeFile('dist/server/assets.js','export default '+JSON.stringify(assets)+';\n');
await writeFile('dist/server/index.js',await readFile('worker/index.js'));
await writeFile('dist/server/emotion-model.js',await readFile('web/emotion-model.js'));
await mkdir('dist/.openai',{recursive:true});await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log('Built LPP Worker. Music and font binaries are served from private object storage.');
