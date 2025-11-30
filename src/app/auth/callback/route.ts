import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

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

          // If user has pending invites, redirect to accept the first one
          // DO NOT create an account for users with pending invitations
          if (invitations && invitations.length > 0) {
            const newRedirectUrl = isLocalEnv
              ? `${origin}/invite/${invitations[0].token}`
              : forwardedHost
              ? `https://${forwardedHost}/invite/${invitations[0].token}`
              : `${origin}/invite/${invitations[0].token}`;
            
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

          if (!existingAccounts || existingAccounts.length === 0) {
            // User doesn't have an account - create one automatically
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
            }
          }
        } catch (err) {
          // If check fails, continue with normal redirect
          console.error('Error checking invitations or creating account in callback:', err);
        }
      }

      return response
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

