'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan'); // 'premium' or null (free)
  const redirectTo = searchParams.get('redirectTo');
  const inviteEmail = searchParams.get('email'); // Pre-fill email from invite
  const isInviteSignup = redirectTo?.startsWith('/invite/');

  const [email, setEmail] = useState(inviteEmail || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      
      // If signing up from invite link, use special endpoint that bypasses email verification
      if (isInviteSignup && redirectTo) {
        // Extract invite token from redirectTo
        const inviteTokenMatch = redirectTo.match(/\/invite\/([^/?]+)/);
        const inviteToken = inviteTokenMatch ? inviteTokenMatch[1] : null;
        
        if (!inviteToken) {
          setError('Invalid invitation link');
          setLoading(false);
          return;
        }

        // Use invite-based signup endpoint (bypasses email verification)
        const signupResponse = await fetch('/api/auth/signup-with-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            inviteToken,
          }),
        });

        const signupData = await signupResponse.json();

        if (!signupResponse.ok) {
          setError(signupData.error || 'Failed to create account');
          setLoading(false);
          return;
        }

        // Sign in the newly created user
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message || 'Account created but failed to sign in. Please try signing in.');
          setLoading(false);
          return;
        }

        // Successfully signed in - redirect to accept invitation
        router.push(redirectTo);
        router.refresh();
        return;
      }

      // Regular signup flow (requires email verification)
      // Preserve redirectTo through email confirmation
      const callbackUrl = redirectTo 
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
        : `${window.location.origin}/auth/callback`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callbackUrl,
        },
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        setSuccess(true);
        setLoading(false);
      } else {
        // Auto-login successful
        // Always check for pending invitations sent to user's email first (unless already going to an invite)
        if (!redirectTo || !redirectTo.startsWith('/invite/')) {
          try {
            const inviteResponse = await fetch('/api/invitations/my-invitations');
            if (inviteResponse.ok) {
              const inviteData = await inviteResponse.json();
              // If there are pending invitations, redirect to the first one
              if (inviteData.invitations && inviteData.invitations.length > 0) {
                const firstInvite = inviteData.invitations[0];
                router.push(`/invite/${firstInvite.token}`);
                router.refresh();
                return;
              }
            }
          } catch (err) {
            // If check fails, continue with normal redirect
            console.error('Error checking invitations:', err);
          }
        }

        // If coming from invite and no pending invites found, redirect to accept invitation
        if (isInviteSignup && redirectTo) {
          router.push(redirectTo);
          router.refresh();
          return;
        }

        // If premium plan selected, redirect to checkout
        if (plan === 'premium') {
          // Create checkout session
          const checkoutResponse = await fetch('/api/subscription/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              successUrl: `${window.location.origin}/dashboard?checkout=success`,
              cancelUrl: `${window.location.origin}/dashboard?checkout=canceled`,
            }),
          });

          if (checkoutResponse.ok) {
            const { url } = await checkoutResponse.json();
            // Redirect to Stripe Checkout
            window.location.href = url;
          } else {
            // If checkout fails, still redirect to dashboard
            router.push(redirectTo || '/dashboard');
            router.refresh();
          }
        } else {
          // Free plan - redirect to dashboard or redirectTo
          router.push(redirectTo || '/dashboard');
          router.refresh();
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const supabase = createClient();
      
      // Build callback URL with redirectTo and plan if present
      const callbackParams = new URLSearchParams();
      if (redirectTo) {
        callbackParams.set('next', redirectTo);
      }
      if (plan) {
        callbackParams.set('plan', plan);
      }
      
      const callbackUrl = callbackParams.toString()
        ? `${window.location.origin}/auth/callback?${callbackParams.toString()}`
        : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('Failed to sign up with Google');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        {/* App Branding - Above Card */}
        <div className="flex items-center gap-3 mb-8">
          <Image
            src="/icon.svg"
            alt="Budget App"
            width={48}
            height={48}
            className="dark:hidden"
          />
          <Image
            src="/icon-darkmode.svg"
            alt="Budget App"
            width={48}
            height={48}
            className="hidden dark:block"
          />
          <div>
            <h1 className="text-2xl font-bold">Budget App</h1>
            <p className="text-sm text-muted-foreground">Envelope Budgeting Made Simple</p>
          </div>
        </div>

        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Check Your Email</CardTitle>
            <CardDescription className="text-center">
              We've sent you a confirmation link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 text-sm text-green-700 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="font-medium mb-2">Account created successfully!</p>
              <p>Please check your email ({email}) and click the confirmation link to activate your account.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/login" className="w-full">
              <Button className="w-full">
                Go to Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      {/* App Branding - Above Card */}
      <div className="flex items-center gap-3 mb-8">
        <Image
          src="/icon.svg"
          alt="Budget App"
          width={48}
          height={48}
          className="dark:hidden"
        />
        <Image
          src="/icon-darkmode.svg"
          alt="Budget App"
          width={48}
          height={48}
          className="hidden dark:block"
        />
        <div>
          <h1 className="text-2xl font-bold">Budget App</h1>
          <p className="text-sm text-muted-foreground">Envelope Budgeting Made Simple</p>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Create Account</CardTitle>
          <CardDescription className="text-center">
            Sign up to start managing your budget
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                disabled={loading}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 mt-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignUp}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>
            
            <div className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link 
                href={`/login${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
                className="text-primary hover:underline font-medium"
              >
                Sign in
              </Link>
            </div>

            <div className="text-xs text-center text-muted-foreground pt-2">
              <Link href="/" className="hover:underline">
                ← Back to home
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">Loading...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}

