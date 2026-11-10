import {readFile} from 'node:fs/promises';
import {createBackupStorage,storageConfig} from '../private-backup.mjs';
const PROJECT='prj_dQWPLSBz8NQBAbIupqMbDscPRqeU';
class OperationError extends Error {}
function need(ok,message){if(!ok)throw new OperationError(message);}
async function api(path,query={}) {
  const url=new URL('https://api.vercel.com'+path);
  url.searchParams.set('teamId',process.env.VERCEL_ORG_ID);
  for(const[k,v]of Object.entries(query))url.searchParams.set(k,v);
  const r=await fetch(url,{headers:{Authorization:'Bearer '+process.env.VERCEL_TOKEN},redirect:'error',signal:AbortSignal.timeout(25000)});
  need(r.ok,`Vercel ${path} returned HTTP ${r.status}`);
  return r.json();
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
  need(operation.action==='inventory','Unimplemented transition action');
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
  console.log(JSON.stringify({action:operation.action,recoveryObject:object,encryptedReadbackVerified:stored.verified,replicaAt:stored.replicaAt,project:{id:project.id,name:project.name,crons:project.crons,ssoProtection:project.ssoProtection,productionDeployment:project.targets?.production?.id,protectionBypassCount:Object.keys(project.protectionBypass??{}).length},environmentCount:envs.length,domains:domains.map(x=>({name:x.name,redirect:x.redirect,gitBranch:x.gitBranch})),deploymentCount:deployments.length,aliases:aliases.map(x=>({alias:x.alias,deployment:x.deployment?.id??x.deploymentId,protectionBypassCount:Object.keys(x.protectionBypass??{}).length})),recentDeployments:deployments.slice(0,5).map(x=>({id:x.uid,url:x.url,target:x.target,state:x.state}))}));
}
main().catch(error=>{console.error(error instanceof OperationError?error.message:'Vercel transition stopped; sensitive error details suppressed');process.exitCode=1;});
