import { TESTING_SUPABASE_URL } from './staging-project';

export type GoogleCheckEnv = {
  [key: string]: string | undefined;
  NEXT_PUBLIC_DEPLOYMENT_MODE?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_STAGING_GOOGLE_CHECK?: string;
  STAGING_GOOGLE_AUTH_EMAILS?: string;
};
export type GoogleCheckUser = {
  email?: string;
  email_confirmed_at?: string;
  identities?: { provider: string }[];
};

function approvedEmails(env: GoogleCheckEnv): string[] {
  const emails = (env.STAGING_GOOGLE_AUTH_EMAILS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return emails.length > 0 && emails.every(email => /^[a-z0-9.!#$%&'+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) ? emails : [];
}
export function stagingGoogleCheckEnabled(env: GoogleCheckEnv): boolean {
  return env.NEXT_PUBLIC_DEPLOYMENT_MODE === 'staging' && env.NEXT_PUBLIC_SUPABASE_URL === TESTING_SUPABASE_URL && env.NEXT_PUBLIC_STAGING_GOOGLE_CHECK === '1' && approvedEmails(env).length > 0;
}
export function isStagingGoogleUser(user: GoogleCheckUser | null | undefined, env: GoogleCheckEnv): boolean {
  return stagingGoogleCheckEnabled(env) && !!user?.email_confirmed_at && !!user.identities?.some(identity => identity.provider === 'google') && approvedEmails(env).includes(user.email?.toLowerCase() || '');
}
