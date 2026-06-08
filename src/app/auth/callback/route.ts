import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const plan = searchParams.get('plan') // 'premium' or null

  if (code) {
    // Create the response first
    const forwardedHost = request.headers.get('x-forwarded-host')
    const isLocalEnv = process.env.NODE_ENV === 'development'

    let redirectUrl: string
    if (isLocalEnv) {
      redirectUrl = `${origin}${next}`
    } else if (forwardedHost) {
      redirectUrl = `https://${forwardedHost}${next}`
    } else {
      redirectUrl = `${origin}${next}`
    }

    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // Always check for pending invitations sent to user's email first (unless already going to an invite)
      if (!next.startsWith('/invite/')) {
        try {
          const adminSupabase = createServiceRoleClient();
          const { data: invitations } = await adminSupabase
            .from('account_invitations')
            .select('token')
            .eq('email', user.email?.toLowerCase() || '')
            .is('accepted_at', null)
            .order('created_at', { ascending: true })
            .limit(1);

          // If user has pending invites, redirect to choice page where they can
          // accept the invitation or create their own account
          if (invitations && invitations.length > 0) {
            const newRedirectUrl = isLocalEnv
              ? `${origin}/invitations/choose`
              : forwardedHost
              ? `https://${forwardedHost}/invitations/choose`
              : `${origin}/invitations/choose`;
            
            return NextResponse.redirect(newRedirectUrl);
          }

          // No pending invitations - check if user already has a budget account
          // If not, create one automatically (this is a new user signing up normally)
          const { data: existingAccounts } = await adminSupabase
            .from('budget_accounts')
            .select('id')
            .eq('owner_id', user.id)
            .is('deleted_at', null)
            .limit(1);

          const existingCookie = request.cookies.get('active_account_id');
          
          if (!existingAccounts || existingAccounts.length === 0) {
            // User doesn't have an owned account
            // Check if they have shared accounts (collaborator accounts)
            const { data: sharedAccounts } = await adminSupabase
              .from('account_users')
              .select('account_id')
              .eq('user_id', user.id)
              .eq('status', 'active')
              .limit(1);

            if (sharedAccounts && sharedAccounts.length > 0) {
              // User is a collaborator without their own account - set shared account as active
              if (!existingCookie) {
                response.cookies.set('active_account_id', sharedAccounts[0].account_id.toString(), {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                  maxAge: 60 * 60 * 24 * 365, // 1 year
                });
              }
            } else {
              // User has no accounts at all - create one automatically (new user signing up normally)
              const accountName = user.email?.split('@')[0] || 'My Budget';
              const { data: newAccount, error: accountError } = await adminSupabase
                .from('budget_accounts')
                .insert({
                  owner_id: user.id,
                  name: accountName,
                })
                .select('id')
                .single();

              if (!accountError && newAccount) {
                // Add user as owner in account_users
                await adminSupabase
                  .from('account_users')
                  .insert({
                    account_id: newAccount.id,
                    user_id: user.id,
                    role: 'owner',
                    status: 'active',
                    accepted_at: new Date().toISOString(),
                  });

                // Set the newly created account as the active account
                response.cookies.set('active_account_id', newAccount.id.toString(), {
                  httpOnly: true,
                  secure: process.env.NODE_ENV === 'production',
                  sameSite: 'lax',
                  maxAge: 60 * 60 * 24 * 365, // 1 year
                });
              }
            }
          } else {
            // User already has an owned account - set the first one as active if no cookie is set
            if (!existingCookie) {
              response.cookies.set('active_account_id', existingAccounts[0].id.toString(), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 365, // 1 year
              });
            }
          }
        } catch (err) {
          // If check fails, continue with normal redirect
          console.error('Error checking invitations or creating account in callback:', err);
        }
      }

      // Handle premium plan checkout for OAuth signups
      if (plan === 'premium' && !next.startsWith('/invite/')) {
        // Redirect to subscription page which will handle checkout creation
        const checkoutRedirectUrl = isLocalEnv
          ? `${origin}/settings/subscription?checkout=premium`
          : forwardedHost
          ? `https://${forwardedHost}/settings/subscription?checkout=premium`
          : `${origin}/settings/subscription?checkout=premium`;
        
        return NextResponse.redirect(checkoutRedirectUrl);
      }

      return response
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}


