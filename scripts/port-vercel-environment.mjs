import {createHash,X509Certificate,createPrivateKey} from 'node:crypto';
import {createBackupStorage,storageConfig} from './private-backup.mjs';
const PROJECT='prj_dQWPLSBz8NQBAbIupqMbDscPRqeU';
class TransferError extends Error {}
function need(ok,message){if(!ok)throw new TransferError(message);}
async function request(url,token,method='GET',body){
 const r=await fetch(url,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(25000)});
 if(!r.ok)throw new TransferError(`${new URL(url).hostname} returned HTTP ${r.status}`);
 return r.json();
}
function vercelURL(path,query={}){const u=new URL('https://api.vercel.com'+path);u.searchParams.set('teamId',process.env.VERCEL_ORG_ID);for(const[k,v]of Object.entries(query))u.searchParams.set(k,v);return u;}
function list(data){need(!data.pagination?.next,'Additional Vercel pages require review before transfer');const rows=Array.isArray(data)?data:data.envs??data.data;need(Array.isArray(rows),'Unexpected environment-list response shape');return rows;}
const sha=value=>createHash('sha256').update(value).digest('hex');
function mask(value){process.stdout.write('::add-mask::'+value.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A')+'\n');}
async function main(){
 need(process.env.VERCEL_PROJECT_ID===PROJECT,'Vercel project mismatch');
 need(process.env.VERCEL_ORG_ID?.startsWith('team_'),'Expected Vercel team');
 need(process.env.VERCEL_TOKEN&&process.env.CLOUD_BACKUP_TOKEN&&process.env.BACKUP_ENCRYPTION_KEY,'Transfer credentials unavailable');
 need(process.env.CLOUD_BACKUP_URL==='https://cloud.jrwdev.com'&&process.env.CLOUD_BACKUP_APP_ID==='19','Encrypted transfer destination mismatch');
 need(Date.now()<Date.parse('2026-11-09T00:00:00Z'),'One-time transfer window expired');
 const vt=process.env.VERCEL_TOKEN;
 async function inventory(){const project=list(await request(vercelURL(`/v10/projects/${PROJECT}/env`,{decrypt:'false'}),vt));const shared=list(await request(vercelURL('/v1/env',{projectId:PROJECT}),vt));return {project,shared};}
 const original=await inventory();
 const sourceRows=[...original.shared.map(x=>({...x,source:'shared'})),...original.project.map(x=>({...x,source:'project'}))];
 console.log(JSON.stringify({projectCount:original.project.length,sharedCount:original.shared.length,inventory:sourceRows.map(x=>({key:x.key,target:x.target,source:x.source,gitBranch:!!x.gitBranch,customEnvironments:x.customEnvironmentIds?.length??0}))}));
 need(sourceRows.length>=25,'Vercel inventory unexpectedly incomplete');
 for(const row of sourceRows){need(/^[A-Z][A-Z0-9_]*$/.test(row.key),'Invalid source variable name');need(Array.isArray(row.target)&&row.target.includes('production')&&!row.gitBranch&&!row.deletedAt,'Separate non-production variable needs an isolated destination: '+row.key);need(!(row.customEnvironmentIds?.length),'Custom environment needs separate reconciliation: '+row.key);if(row.source==='shared')need(row.projectId?.includes(PROJECT),'Shared variable not linked to budget app');}
 const resolved=new Map();
 for(const row of sourceRows){
  const path=row.source==='shared'?`/v1/env/${encodeURIComponent(row.id)}`:`/v1/projects/${PROJECT}/env/${encodeURIComponent(row.id)}`;
  const d=await request(vercelURL(path),vt);need(d.key===row.key&&d.id===row.id,'Decrypted variable identity mismatch');need(typeof d.value==='string'&&d.value.length>0&&d.decrypted!==false,'Source value cannot be decrypted: '+row.key);
  mask(d.value);
  const scope=row.key.startsWith('NEXT_PUBLIC_')?'both':'runtime',isSecret=!row.key.startsWith('NEXT_PUBLIC_');
  const prior=resolved.get(row.key);if(prior&&prior.source===row.source)throw new TransferError('Duplicate source key needs review: '+row.key);
  resolved.set(row.key,{key:row.key,value:d.value,scope,isSecret,source:row.source,target:row.target});
 }
 const values=Object.fromEntries([...resolved].map(([k,r])=>[k,r.value]));
 need(values.NEXT_PUBLIC_SUPABASE_URL==='https://yhmexgwdytmyqourkivz.supabase.co','Production Supabase project mismatch');
 for(const [key,role]of [['NEXT_PUBLIC_SUPABASE_ANON_KEY','anon'],['SUPABASE_SERVICE_ROLE_KEY','service_role']]){const jwt=JSON.parse(Buffer.from(values[key].split('.')[1],'base64url'));need(jwt.ref==='yhmexgwdytmyqourkivz'&&jwt.role===role,'Supabase credential mismatch: '+key);}
 need(values.STRIPE_SECRET_KEY?.startsWith('sk_live_')&&values.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.startsWith('pk_live_'),'Expected production Stripe keys');
 need(values.TELLER_ENV==='production'&&values.NEXT_PUBLIC_TELLER_ENV==='production','Expected production Teller selectors');
 const cert=new X509Certificate(values.TELLER_CLIENT_CERT.replaceAll('\\n','\n'));const pk=createPrivateKey(values.TELLER_CLIENT_KEY.replaceAll('\\n','\n'));need(cert.checkPrivateKey(pk),'Teller certificate and private key do not match');
 const metadata=x=>JSON.stringify(x.map(r=>({id:r.id,key:r.key,target:r.target,updatedAt:r.updatedAt,source:r.source})).sort((a,b)=>a.id.localeCompare(b.id)));
 const latest=await inventory();need(metadata([...original.project,...original.shared])===metadata([...latest.project,...latest.shared]),'Vercel environment changed during retrieval');
 const report={checkedAt:new Date().toISOString(),runId:process.env.GITHUB_RUN_ID,appId:19,environment:'production',sourceProjectCount:original.project.length,sourceSharedCount:original.shared.length,sourceEntries:sourceRows.map(({key,target,source})=>({key,target,source})),copiedCount:resolved.size,secretCount:[...resolved.values()].filter(r=>r.isSecret).length,publicCount:[...resolved.values()].filter(r=>!r.isSecret).length,rows:[...resolved.values()].map(({value,...r})=>({...r,digest:sha(value)})),tellerKeyPairValid:true,canonicalAppURLMatches:values.NEXT_PUBLIC_APP_URL==='https://everydollarbudget.app',cronSecretPresent:resolved.has('CRON_SECRET'),systemVariablesCopied:false};
 const payload=Buffer.from(JSON.stringify({format:'BUDGET-ENVIRONMENT-TRANSFER-1',report,variables:[...resolved.values()]}));
 const object=`verification/vercel-env-transfer-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}.zip.enc`;
 const storage=createBackupStorage(storageConfig({...process.env,BACKUP_STORAGE_BACKEND:'cloud-panel'}));
 const stored=await storage.upload(object,payload);
 console.log(JSON.stringify({sourceProjectCount:report.sourceProjectCount,sourceSharedCount:report.sourceSharedCount,variableCount:report.copiedCount,privateRuntime:report.secretCount,publicBuildAndRuntime:report.publicCount,object,encryptedReadbackVerified:stored.verified,replicaAt:stored.replicaAt,productionReleaseStarted:false,canonicalAppURLMatches:report.canonicalAppURLMatches,cronSecretPresent:report.cronSecretPresent}));
}
main().catch(error=>{console.error(error instanceof TransferError?error.message:'Transfer stopped; sensitive error details suppressed.');process.exitCode=1;});
