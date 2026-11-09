// Validate without printing configuration values: build settings can contain secrets.
export function validateCloudConfig(config, target) {
  const check=(condition,message)=>{if(!condition)throw Error(message);};
  check(['staging','production'].includes(target),'Unknown deployment target');
  check(config.environment===target,'Panel environment does not match workflow');
  const env=config.buildEnv || {};
  if(target==='staging') {
    if(env.NEXT_PUBLIC_DEPLOYMENT_MODE==='smoke') {
      check(env.NEXT_PUBLIC_SUPABASE_URL==='https://staging-disabled.invalid' && env.NEXT_PUBLIC_SUPABASE_ANON_KEY==='staging-placeholder','Smoke staging must use placeholder credentials');
    } else {
      check(env.NEXT_PUBLIC_DEPLOYMENT_MODE==='staging','Staging must explicitly enable its access restrictions');
      check(env.NEXT_PUBLIC_SUPABASE_URL==='https://nmqlddimigebtlaophbv.supabase.co','Staging must use the approved testing project');
      let payload;try{payload=JSON.parse(Buffer.from(env.NEXT_PUBLIC_SUPABASE_ANON_KEY.split('.')[1],'base64url'));}catch{throw Error('Invalid testing anonymous key');}
      check(payload.ref==='nmqlddimigebtlaophbv' && payload.role==='anon','Staging anonymous key must belong to the testing project');
      check(env.SCHEDULED_JOBS_ENABLED==='false','Scheduled jobs must stay disabled in staging');
      check(env.NEXT_PUBLIC_LOGROCKET_ENABLED==='false','Staging session recording must stay disabled');
      check(!env.SUPABASE_SERVICE_ROLE_KEY,'Service credentials must be scoped to runtime');
      check(!Object.keys(env).some(key=>/^(?:STRIPE_|SMTP_|RESEND_|GOOGLE_|OPENAI_|TELLER_CLIENT_|VAPID_PRIVATE_KEY|ENCRYPTION_KEY)/.test(key)),'Provider credentials must not enter the staging build');
    }
  } else {
    check(env.NEXT_PUBLIC_STAGING_GOOGLE_CHECK !== '1','Production cannot enable staging Google checks');
    check(!['smoke','staging'].includes(env.NEXT_PUBLIC_DEPLOYMENT_MODE),'Production cannot use a staging mode');
    check(env.NEXT_PUBLIC_SUPABASE_URL==='https://yhmexgwdytmyqourkivz.supabase.co','Production must use its configured project');
    check(env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length>40,'Missing production anonymous key');
  }
}
