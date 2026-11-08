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
