import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createBackupStorage,storageConfig} from '../private-backup.mjs';
const PROJECT='prj_dQWPLSBz8NQBAbIupqMbDscPRqeU';
class OperationError extends Error {}
function need(ok,message){if(!ok)throw new OperationError(message);}
async function api(path,query={},method='GET',body) {
  const url=new URL('https://api.vercel.com'+path);
  url.searchParams.set('teamId',process.env.VERCEL_ORG_ID);
  for(const[k,v]of Object.entries(query))url.searchParams.set(k,v);
  const r=await fetch(url,{method,headers:{Authorization:'Bearer '+process.env.VERCEL_TOKEN,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(25000)});
  need(r.ok,`Vercel ${path} returned HTTP ${r.status}`);
  return r.status===204?{}:r.json();
}
async function pages(path,key,query={}) {
  const rows=[];let until;
  for(let n=0;n<30;n++) {
    const data=await api(path,{...query,limit:100,...(until?{until}: {})});
    need(Array.isArray(data[key]),'Unexpected inventory response');rows.push(...data[key]);
    if(!data.pagination?.next)return rows;
    need(data.pagination.next!==until,'Inventory pagination did not advance');until=data.pagination.next;
  }
  throw new OperationError('Inventory exceeded page limit');
}
function mask(value){process.stdout.write('::add-mask::'+value.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A')+'\n');}
async function main(){
  const operation=JSON.parse(await readFile(new URL('./vercel-operation.json',import.meta.url),'utf8'));
  need(Date.now()<Date.parse(operation.expiresAt),'Transition window expired');
  need(['inventory','maintenance','redirect'].includes(operation.action),'Unimplemented transition action');
  need(process.env.VERCEL_PROJECT_ID===PROJECT&&process.env.VERCEL_ORG_ID?.startsWith('team_'),'Vercel project/team mismatch');
  need(process.env.VERCEL_TOKEN&&process.env.CLOUD_BACKUP_TOKEN&&process.env.BACKUP_ENCRYPTION_KEY,'Required credential unavailable');
  need(process.env.CLOUD_BACKUP_URL==='https://cloud.jrwdev.com'&&process.env.CLOUD_BACKUP_APP_ID==='19','Private recovery destination mismatch');
  const project=await api(`/v9/projects/${PROJECT}`);
  const deployments=await pages('/v6/deployments','deployments',{projectId:PROJECT});
  const domains=await pages(`/v9/projects/${PROJECT}/domains`,'domains');
  const aliases=await pages('/v4/aliases','aliases',{projectId:PROJECT});
  const envs=(await api(`/v10/projects/${PROJECT}/env`,{decrypt:'false'})).envs;
  const shared=await api('/v1/env',{projectId:PROJECT});
  need(Array.isArray(envs)&&envs.length>=25,'Environment inventory unexpectedly incomplete');
  const sharedRows=Array.isArray(shared)?shared:shared.envs??shared.data;
  need(Array.isArray(sharedRows)&&sharedRows.length===0&&!shared.pagination?.next,'Shared environment requires reconciliation');
  const decrypted=[];
  for(const row of envs) {
    const d=await api(`/v1/projects/${PROJECT}/env/${encodeURIComponent(row.id)}`);
    need(d.id===row.id&&d.key===row.key&&typeof d.value==='string'&&d.decrypted!==false,'Environment retrieval mismatch');
    mask(d.value);decrypted.push({...row,value:d.value});
  }
  const snapshot={format:'BUDGET-VERCEL-RECOVERY-1',checkedAt:new Date().toISOString(),project,deployments,domains,aliases,envs:decrypted,shared};
  const storage=createBackupStorage(storageConfig({...process.env,BACKUP_STORAGE_BACKEND:'cloud-panel'}));
  const object=`verification/vercel-cutover-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}.zip.enc`;
  const stored=await storage.upload(object,Buffer.from(JSON.stringify(snapshot)));
  need(stored.verified&&stored.replicaAt,'Encrypted recovery snapshot not verified on both servers');
  if(operation.action!=='inventory'){
    need(project.ssoProtection?.deploymentType==='all_except_custom_domains','Existing Vercel deployment protection changed');
    need(Object.keys(project.protectionBypass??{}).length===0&&aliases.every(x=>Object.keys(x.protectionBypass??{}).length===0),'Vercel public bypass requires review');
    need(domains.length===1&&domains[0].name==='budget-app-one-lime.vercel.app','Unexpected production domain');
    if(operation.action==='redirect'){
      const r=await fetch('https://everydollarbudget.app/api/health/ready',{redirect:'error',signal:AbortSignal.timeout(10000)});
      need(r.ok,'Canonical release is not ready');const health=await r.json();
      need(health.status==='ready'&&health.releaseId===operation.expectedRelease,'Canonical release differs from the approved transition');
    }
    // A transition deployment must not inherit live application credentials.
    // Preview/development settings remain intact; the complete prior values are
    // in the verified encrypted snapshot above.
    const productionRows=envs.filter(x=>x.target?.includes('production'));
    need(productionRows.every(x=>!x.gitBranch&&!x.customEnvironmentIds?.length),'Special environment scope requires review');
    for(const row of productionRows){
      const target=row.target.filter(x=>x!=='production');
      // Production-only entries are removed after verified recovery export;
      // entries shared with preview/development keep those targets unchanged.
      if(target.length)await api(`/v9/projects/${PROJECT}/env/${encodeURIComponent(row.id)}`,{},'PATCH',{target});
      else await api(`/v9/projects/${PROJECT}/env/${encodeURIComponent(row.id)}`,{},'DELETE');
    }
    const remaining=(await api(`/v10/projects/${PROJECT}/env`,{decrypt:'false'})).envs;
    need(remaining.every(x=>!x.target?.includes('production')),'Production credentials still attached to Vercel');
    const dir='.vercel-transition',func=dir+'/.vercel/output/functions/transition.func';
    await mkdir(func,{recursive:true});
    await writeFile(dir+'/.vercel/project.json',JSON.stringify({projectId:PROJECT,orgId:process.env.VERCEL_ORG_ID}));
    await writeFile(dir+'/vercel.json',JSON.stringify({version:2,crons:[],git:{deploymentEnabled:false}}));
    await writeFile(dir+'/.vercel/output/config.json',JSON.stringify({version:3,routes:[{src:'/.*',dest:'/transition'}],crons:[]}));
    await writeFile(func+'/.vc-config.json',JSON.stringify({runtime:'nodejs22.x',handler:'index.cjs',launcherType:'Nodejs',shouldAddHelpers:false,maxDuration:10}));
    await copyFile(new URL('./vercel-transition.cjs',import.meta.url),func+'/index.cjs');
    await writeFile(func+'/transition-mode.json',JSON.stringify({mode:operation.action}));
    const result=spawnSync('npx',['--yes','vercel@65.14.0','deploy','--prebuilt','--prod','--yes','--cwd',dir,'--token',process.env.VERCEL_TOKEN],{encoding:'utf8',timeout:300000,maxBuffer:2*1024*1024});
    if(result.status!==0){
      // CLI output can mention project configuration; retain only recognizable
      // error headlines, never environment values or raw command arguments.
      const error=(result.stderr??'').split('\n').filter(x=>/^Error:/.test(x)).join('\n');
      throw new OperationError('Vercel transition deployment failed'+(error?': '+error.slice(0,700):''));
    }
    const after=await api(`/v9/projects/${PROJECT}`);
    need(after.crons?.definitions?.length===0,'Old Vercel scheduler definitions remain');
    const probe=await fetch('https://budget-app-one-lime.vercel.app/transactions?cutover_probe=1',{redirect:'manual',signal:AbortSignal.timeout(15000)});
    need(probe.headers.get('x-budget-transition')===operation.action,'Stable Vercel hostname did not receive the transition');
    need(probe.status===(operation.action==='maintenance'?503:307),'Transition response status mismatch');
    if(operation.action==='redirect'){
      const target=new URL(probe.headers.get('location'));need(target.origin==='https://everydollarbudget.app'&&target.pathname==='/transactions'&&target.searchParams.get('cutover_probe')==='1','Deep-link routing mismatch');
    }
    console.log(JSON.stringify({transition:operation.action,productionDeployment:after.targets?.production?.id,cronDefinitions:after.crons.definitions.length,productionEnvironmentVariables:0,stableHostnameStatus:probe.status}));
  }
  console.log(JSON.stringify({action:operation.action,recoveryObject:object,encryptedReadbackVerified:stored.verified,replicaAt:stored.replicaAt,project:{id:project.id,name:project.name,crons:project.crons,ssoProtection:project.ssoProtection,productionDeployment:project.targets?.production?.id,protectionBypassCount:Object.keys(project.protectionBypass??{}).length},environmentCount:envs.length,domains:domains.map(x=>({name:x.name,redirect:x.redirect,gitBranch:x.gitBranch})),deploymentCount:deployments.length,aliases:aliases.map(x=>({alias:x.alias,deployment:x.deployment?.id??x.deploymentId,protectionBypassCount:Object.keys(x.protectionBypass??{}).length})),recentDeployments:deployments.slice(0,5).map(x=>({id:x.uid,url:x.url,target:x.target,state:x.state}))}));
}
main().catch(error=>{console.error(error instanceof OperationError?error.message:'Vercel transition stopped; sensitive error details suppressed');process.exitCode=1;});
