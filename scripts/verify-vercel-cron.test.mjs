import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyVercelCron} from './verify-vercel-cron.mjs';
const env={VERCEL_TOKEN:'private-fixture',VERCEL_PROJECT_ID:'project-fixture',VERCEL_ORG_ID:'team_fixture'};
test('requires a production-scoped private cron secret without decrypting values',async()=>{
 let called;
 assert.equal(await verifyVercelCron(env,async(url,options)=>{called={url,options};return Response.json({envs:[{key:'CRON_SECRET',target:['production'],type:'sensitive'}]});}),true);
 assert.equal(called.url.searchParams.get('decrypt'),'false');assert.equal(called.options.redirect,'error');
 for(const row of [null,{key:'CRON_SECRET',target:['preview'],type:'encrypted'},{key:'CRON_SECRET',target:['production'],type:'plain'},{key:'ANOTHER_SECRET',target:['production'],type:'encrypted'}])await assert.rejects(verifyVercelCron(env,async()=>Response.json({envs:row?[row]:[]})),/Configure a private production CRON_SECRET/);
});
test('stops when verification is unavailable',async()=>{
 await assert.rejects(verifyVercelCron({},async()=>{throw Error('must not fetch');}),/credentials are unavailable/);
 await assert.rejects(verifyVercelCron(env,async()=>new Response('',{status:403})),/HTTP 403/);
 await assert.rejects(verifyVercelCron(env,async()=>Response.json({})),/invalid environment metadata/);
});
