// Uses Wrangler's authenticated session; never reads or prints credentials.
import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
for(const file of await readdir('web/fonts')){
 if(!/^(core|kr-[a-f0-9]{4})\.woff$/.test(file))continue;
 const result=spawnSync('npx',['wrangler','r2','object','put',`lpp-private-records/app-assets/fonts/${file}`,'--file',`web/fonts/${file}`,'--content-type','font/woff','--remote'],{stdio:'inherit'});
 if(result.status!==0)process.exit(result.status||1);
}
