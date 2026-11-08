// Independent hosting entry. Never trust OpenAI identity headers on the open internet.
import app from '../dist/server/index.js';
import {createRemoteJWKSet,jwtVerify} from 'jose';
const resolvers=new Map();
function accessKeys(team){
  if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team))throw Error('Invalid Access team');
  if(!resolvers.has(team))resolvers.set(team,createRemoteJWKSet(new URL(`https://${team}/cdn-cgi/access/certs`)));
  return resolvers.get(team);
}
const fail=(status,message)=>new Response(message,{status,headers:{'cache-control':'no-store','content-type':'text/plain; charset=utf-8','x-content-type-options':'nosniff'}});
export function createStandalone(resolveKeys=accessKeys){return {async fetch(request,env,ctx){
  if(!env.BUCKET||!env.LPP_SERVICE_KEY||!env.LPP_ACCESS_TEAM||!env.LPP_ACCESS_AUD||!env.LPP_OWNER_EMAIL)return fail(503,'Private shelf setup is incomplete.');
  // Imports use a separate high-entropy secret, never a browser credential.
  const isService=request.headers.get('x-lpp-service-key')===env.LPP_SERVICE_KEY;
  if(!isService){
    const token=request.headers.get('cf-access-jwt-assertion');
    if(!token||token.length>16384)return fail(401,'Open LPP through its private sign-in address.');
    try{
      const {payload}=await jwtVerify(token,resolveKeys(env.LPP_ACCESS_TEAM),{issuer:`https://${env.LPP_ACCESS_TEAM}`,audience:env.LPP_ACCESS_AUD,algorithms:['RS256'],requiredClaims:['exp','iat','sub','email']});
      if(typeof payload.email!=='string'||payload.email.toLowerCase()!==env.LPP_OWNER_EMAIL.toLowerCase())return fail(403,'This shelf is private.');
    }catch{return fail(401,'Your sign-in has expired. Reload to sign in again.');}
  }
  const headers=new Headers(request.headers);
  headers.delete('oai-authenticated-user-id');headers.delete('oai-authenticated-user-email');
  headers.set('oai-authenticated-user-id','lpp-independent-owner');
  return app.fetch(new Request(request,{headers}),env,ctx);
}}}
export default createStandalone();
