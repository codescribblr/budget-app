// Validate without printing configuration values: build settings can contain secrets.
function validatePublicKey(key, project) {
  // Opaque publishable keys do not encode their project. The online preflight
  // below must verify them against the pinned project before any build starts.
  if (typeof key === 'string' && /^sb_publishable_[A-Za-z0-9_-]{20,256}$/.test(key)) return;
  let payload;
  try {
    if (typeof key !== 'string' || key.split('.').length !== 3) throw Error();
    payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url'));
  } catch { throw Error('Expected a publishable or legacy anonymous Supabase key'); }
  if (payload?.ref !== project || payload?.role !== 'anon') {
    throw Error('Public Supabase key must belong to the configured project and have anonymous privileges');
  }
}

export function validateCloudConfig(config, target) {
  const check=(condition,message)=>{if(!condition)throw Error(message);};
  check(['staging','production'].includes(target),'Unknown deployment target');
  check(config.environment===target,'Panel environment does not match workflow');
  const env=config.buildEnv || {};
  check(!env.SUPABASE_SERVICE_ROLE_KEY && !env.SUPABASE_SECRET_KEY,'Service credentials must be scoped to runtime');
  // Also reject a private key accidentally saved under a different public name.
  check(!Object.entries(env).some(([name,value]) => name.startsWith('NEXT_PUBLIC_') && typeof value === 'string' && value.startsWith('sb_secret_')), 'Secret keys must never enter public build variables');
  if(target==='staging') {
    if(env.NEXT_PUBLIC_DEPLOYMENT_MODE==='smoke') {
      check(env.NEXT_PUBLIC_SUPABASE_URL==='https://staging-disabled.invalid' && env.NEXT_PUBLIC_SUPABASE_ANON_KEY==='staging-placeholder','Smoke staging must use placeholder credentials');
    } else {
      check(env.NEXT_PUBLIC_DEPLOYMENT_MODE==='staging','Staging must explicitly enable its access restrictions');
      check(env.NEXT_PUBLIC_SUPABASE_URL==='https://nmqlddimigebtlaophbv.supabase.co','Staging must use the approved testing project');
      validatePublicKey(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'nmqlddimigebtlaophbv');
      check(env.SCHEDULED_JOBS_ENABLED==='false','Scheduled jobs must stay disabled in staging');
      check(env.NEXT_PUBLIC_LOGROCKET_ENABLED==='false','Staging session recording must stay disabled');
      check(!Object.keys(env).some(key=>/^(?:STRIPE_|SMTP_|RESEND_|GOOGLE_|OPENAI_|TELLER_CLIENT_|VAPID_PRIVATE_KEY|ENCRYPTION_KEY)/.test(key)),'Provider credentials must not enter the staging build');
    }
  } else {
    check(env.NEXT_PUBLIC_STAGING_GOOGLE_CHECK !== '1','Production cannot enable staging Google checks');
    check(!['smoke','staging'].includes(env.NEXT_PUBLIC_DEPLOYMENT_MODE),'Production cannot use a staging mode');
    check(env.NEXT_PUBLIC_SUPABASE_URL==='https://yhmexgwdytmyqourkivz.supabase.co','Production must use its configured project');
    validatePublicKey(env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'yhmexgwdytmyqourkivz');
  }
}

export async function verifyCloudSupabaseKey(config, target, fetcher = fetch) {
  validateCloudConfig(config, target);
  const env = config.buildEnv;
  if (env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'smoke') return;
  try {
    const response = await fetcher(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10_000),
    });
    await response.body?.cancel();
    if (response.status !== 200) throw Error();
  } catch {
    // Never include upstream bodies, request headers or an underlying error:
    // they can contain the credential. Wrong-project, revoked and unreachable
    // keys all stop the release before packaging or promotion.
    throw Error('Supabase public-key preflight failed for the configured project');
  }
}
