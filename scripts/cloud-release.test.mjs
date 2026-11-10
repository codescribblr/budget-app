import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('./cloud-release.mjs',import.meta.url));
test('workflow reports failure before an artifact or build snapshot exists',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cloud-ci-report-'));
 try{
  const fixture=join(dir,'transport.mjs'),output=join(dir,'request.json');
  await writeFile(fixture,`import {writeFileSync} from 'node:fs';globalThis.fetch=async(url,options)=>{writeFileSync(process.env.TEST_OUTPUT,JSON.stringify({url,options}));return new Response(JSON.stringify({recorded:true}),{status:200,headers:{'Content-Type':'application/json'}})};`);
  const env={...process.env,CLOUD_PANEL_URL:'https://panel.example',CLOUD_PANEL_APP_ID:'20',CLOUD_PANEL_DEPLOY_TOKEN:'synthetic-only',GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'2',GITHUB_SHA:'a'.repeat(40),GITHUB_REPOSITORY:'owner/repo',TEST_OUTPUT:output};
  const result=spawnSync(process.execPath,['--import',fixture,script,'ci-report','failure'],{cwd:dir,env,encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const request=JSON.parse(await readFile(output,'utf8'));assert.equal(request.url,'https://panel.example/api/ci/apps/20/builds');assert.equal(request.options.method,'POST');assert.deepEqual(JSON.parse(request.options.body),{runId:'123',attempt:'2',commitSha:'a'.repeat(40),runUrl:'https://github.com/owner/repo/actions/runs/123',status:'failure'});
  assert.ok(!result.stdout.includes('synthetic-only'));
  const invalid=spawnSync(process.execPath,['--import',fixture,script,'ci-report','passed'],{cwd:dir,env,encoding:'utf8'});assert.equal(invalid.status,1);
 }finally{await rm(dir,{recursive:true,force:true})}
});

test('failed-upload cleanup is limited to its own untouched reservation', async(t)=>{
 const state={id:'r-123-2-aaaaaaaaaaaa',ciRunId:'123',idempotencyKey:'123:2',commitSha:'a'.repeat(40),artifactSHA:'b'.repeat(64),envRevision:'revision-1'};
 const release={...state,artifactSha256:state.artifactSHA,status:'uploading',migrationGate:''};
 const cases=[
  {name:'untouched upload is aborted',release,post:true},
  ...['staging','staged','checking','ready','promoting','active_pending_finalize','active','superseded','failed','recovery_required','finalization_failed','aborted'].map(status=>({name:status+' is preserved',release:{...release,status}})),
  {name:'unexpected task is preserved',release:{...release,taskId:5}},
  {name:'migration gate is preserved',release:{...release,migrationGate:'completed'}},
  {name:'another run is rejected',release:{...release,ciRunId:'124'},exit:1},
  {name:'another attempt is rejected',release:{...release,idempotencyKey:'123:1'},exit:1},
  {name:'another artifact is rejected',release:{...release,artifactSha256:'c'.repeat(64)},exit:1},
  {name:'another environment revision is rejected',release:{...release,envRevision:'revision-2'},exit:1},
  {name:'another workflow state is rejected before request',release,state:{...state,idempotencyKey:'123:1'},exit:1,noFetch:true},
  {name:'unreserved release needs no cleanup',release,http:404},
  {name:'authorization failure never changes state',release,http:401,exit:1},
  {name:'missing artifact state needs no cleanup',release,missingState:true,noFetch:true},
 ];
 for(const c of cases)await t.test(c.name,async()=>{
  const dir=await mkdtemp(join(tmpdir(),'cloud-upload-cleanup-'));
  try{
   const transport=join(dir,'transport.mjs'),output=join(dir,'requests.json');
   await writeFile(transport,`import {writeFileSync} from 'node:fs';const calls=[];let aborted=false;globalThis.fetch=async(url,options)=>{calls.push({url,method:options.method});writeFileSync(process.env.TEST_OUTPUT,JSON.stringify(calls));if(options.method==='POST'){if(!url.endsWith('/abort'))throw Error('Unexpected mutation');aborted=true;return Response.json({taskId:1})}return Response.json({...JSON.parse(process.env.TEST_RELEASE),...(aborted?{status:'aborted'}:{})},{status:Number(process.env.TEST_HTTP)||200})};`);
   if(!c.missingState)await writeFile(join(dir,'.cloud-release.json'),JSON.stringify(c.state||state));
   const env={...process.env,CLOUD_PANEL_URL:'https://panel.example',CLOUD_PANEL_APP_ID:'20',CLOUD_PANEL_DEPLOY_TOKEN:'synthetic-only',GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'2',GITHUB_SHA:state.commitSha,TEST_OUTPUT:output,TEST_RELEASE:JSON.stringify(c.release),TEST_HTTP:String(c.http||200)};
   const result=spawnSync(process.execPath,['--import',transport,script,'cleanup-upload'],{cwd:dir,env,encoding:'utf8',timeout:10000});
   assert.equal(result.status,c.exit||0,result.stderr);
   const calls=JSON.parse(await readFile(output,'utf8').catch(e=>{if(e.code==='ENOENT')return '[]';throw e}));
   assert.equal(calls.filter(r=>r.method==='POST').length,c.post?1:0);
   if(c.noFetch)assert.equal(calls.length,0);
   if(c.post){assert.equal(calls.length,3);assert.match(result.stdout,/: aborted/)}
   assert.ok(!result.stdout.includes('synthetic-only'));
  }finally{await rm(dir,{recursive:true,force:true})}
 });
});
