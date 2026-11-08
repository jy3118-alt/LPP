import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT} from 'jose';
import {createStandalone} from '../worker/standalone.js';
const {publicKey,privateKey}=await generateKeyPair('RS256');
const app=createStandalone(()=>publicKey);
const env={BUCKET:{},LPP_SERVICE_KEY:'test-service',LPP_ACCESS_TEAM:'test.cloudflareaccess.com',LPP_ACCESS_AUD:'private-app',LPP_OWNER_EMAIL:'owner@example.test'};
const token=async({email='owner@example.test',aud='private-app',issuer='https://test.cloudflareaccess.com',expires='1h'}={})=>new SignJWT({email}).setProtectedHeader({alg:'RS256'}).setSubject('owner-id').setIssuedAt().setIssuer(issuer).setAudience(aud).setExpirationTime(expires).sign(privateKey);
const request=headers=>new Request('https://lpp.example.test/',{headers});
test('independent deployment fails closed and ignores forged identity headers',async()=>{
 assert.equal((await app.fetch(request({}),{})).status,503);
 assert.equal((await app.fetch(request({'oai-authenticated-user-id':'owner','oai-authenticated-user-email':env.LPP_OWNER_EMAIL}),env)).status,401);
 assert.equal((await app.fetch(request({'cf-access-jwt-assertion':'forged'}),env)).status,401);
});
test('Access requires signature, intended issuer, audience, expiry and owner email',async()=>{
 for(const options of [{aud:'other-app'},{issuer:'https://attacker.example'},{expires:'-1h'}])assert.equal((await app.fetch(request({'cf-access-jwt-assertion':await token(options)}),env)).status,401);
 assert.equal((await app.fetch(request({'cf-access-jwt-assertion':await token({email:'other@example.test'})}),env)).status,403);
 const {privateKey:other}=await generateKeyPair('RS256');
 const forged=await new SignJWT({email:env.LPP_OWNER_EMAIL}).setProtectedHeader({alg:'RS256'}).setSubject('fake').setIssuedAt().setIssuer('https://test.cloudflareaccess.com').setAudience(env.LPP_ACCESS_AUD).setExpirationTime('1h').sign(other);
 assert.equal((await app.fetch(request({'cf-access-jwt-assertion':forged}),env)).status,401);
 const ok=await app.fetch(request({'cf-access-jwt-assertion':await token()}),env);
 assert.equal(ok.status,200);assert.match(await ok.text(),/lpp-app-shell/);
});
