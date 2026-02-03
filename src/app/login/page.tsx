'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password dialog state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Always check for pending invitations sent to user's email first (unless already going to an invite)
      if (!redirectTo.startsWith('/invite/')) {
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

      // Redirect to the original page or dashboard
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleForgotPasswordClick = () => {
    // Pre-fill the reset email with the current email if available
    setResetEmail(email);
    setResetSuccess(false);
    setShowForgotPassword(true);
  };

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      const supabase = createClient();

      // Send magic link - Supabase will handle whether the email exists
      // We don't reveal if the email is registered for security reasons
      const { error } = await supabase.auth.signInWithOtp({
        email: resetEmail,
        options: {
          // Redirect to password settings page to set a new password after magic link login
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/settings/password')}`,
        },
      });

      // Always show success message, even if email doesn't exist
      // This prevents email enumeration attacks
      setResetSuccess(true);
      setResetLoading(false);
    } catch (err) {
      // Still show success to prevent revealing if email exists
      setResetSuccess(true);
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const supabase = createClient();
      const callbackUrl = redirectTo 
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`
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
      setError('Failed to sign in with Google');
    }
  };

  const handleCloseForgotPassword = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetSuccess(false);
  };

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
          <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
          <CardDescription className="text-center">
            Sign in to your budget account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4 relative">
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
                tabIndex={1}
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={handleForgotPasswordClick}
                  className="text-xs text-primary hover:underline"
                  aria-label="Forgot password"
                  tabIndex={4}
                >
                  Forgot password?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                disabled={loading}
                tabIndex={2}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 mt-2">
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
              tabIndex={3}
            >
              {loading ? 'Signing in...' : 'Sign In'}
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
              onClick={handleGoogleSignIn}
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
              Don't have an account?{' '}
              <Link 
                href={`/signup${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
                className="text-primary hover:underline font-medium"
              >
                Sign up
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

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Passwordless Login</DialogTitle>
            {!resetSuccess && (
              <DialogDescription>
                Enter your email address and we'll send you a magic link to sign in.
              </DialogDescription>
            )}
          </DialogHeader>

          {!resetSuccess ? (
            <form onSubmit={handleSendResetLink}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    autoComplete="email"
                    disabled={resetLoading}
                    autoFocus
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseForgotPassword}
                  disabled={resetLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={resetLoading}>
                  {resetLoading ? 'Sending...' : 'Send Magic Link'}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">
                  If we have an account for <strong>{resetEmail}</strong>, we've sent you a link to sign in.
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                  Check your email and click the link to access your account. You'll be directed to settings where you can set a new password.
                </p>
              </div>

              <DialogFooter>
                <Button onClick={handleCloseForgotPassword} className="w-full">
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

