import {pathToFileURL} from 'node:url';

// Read metadata only; never decrypt or print project environment values.
// https://vercel.com/docs/rest-api/projects/retrieve-the-environment-variables-of-a-project-by-id-or-name
export async function verifyVercelRuntime(env, fetcher=fetch) {
  for(const name of ['VERCEL_TOKEN','VERCEL_PROJECT_ID','VERCEL_ORG_ID'])if(!env[name])throw Error('Vercel preflight credentials are unavailable; deployment stopped.');
  const url=new URL(`https://api.vercel.com/v10/projects/${encodeURIComponent(env.VERCEL_PROJECT_ID)}/env`);
  url.searchParams.set('decrypt','false');
  if(env.VERCEL_ORG_ID.startsWith('team_'))url.searchParams.set('teamId',env.VERCEL_ORG_ID);
  const response=await fetcher(url,{headers:{Authorization:'Bearer '+env.VERCEL_TOKEN},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw Error(`Vercel runtime preflight returned HTTP ${response.status}; deployment stopped.`);
  const data=await response.json();
  const variables=Array.isArray(data.envs)?data.envs:Array.isArray(data)?data:null;
  if(!variables)throw Error('Vercel returned invalid environment metadata; deployment stopped.');
  for (const key of ['CRON_SECRET', 'RESEND_WEBHOOK_SECRET']) {
    const present=variables.some(v=>v.key===key && (Array.isArray(v.target)?v.target.includes('production'):v.target==='production') && ['encrypted','sensitive','secret'].includes(v.type));
    if(!present)throw Error(`Configure a private production ${key} in the Vercel project before deploying. No schema or deployment changes were started.`);
  }
  return true;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  try{await verifyVercelRuntime(process.env);console.log('Vercel production cron/webhook-secret configuration is present.');}
  catch(error){console.error(error instanceof Error && error.message.startsWith('Configure a private')?error.message:'Could not verify Vercel production cron/webhook authentication; deployment stopped before schema changes.');process.exitCode=1;}
}
