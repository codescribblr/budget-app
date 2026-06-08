'use client';

import { useState, useEffect } from 'react';
import { useTellerConnect } from 'teller-connect-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard } from 'lucide-react';

interface TellerConnectProps {
  onOpen?: () => void;
  onExit?: () => void;
  onSuccess: (enrollment: {
    accessToken: string;
    enrollmentId: string;
    institutionName: string;
    userId: string;
  }) => void;
  onError?: (error: Error) => void;
  autoOpen?: boolean;
}

export default function TellerConnect({
  onOpen,
  onExit,
  onSuccess,
  onError,
  autoOpen = false,
}: TellerConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applicationId = process.env.NEXT_PUBLIC_TELLER_APPLICATION_ID;
  // Get environment from public env var (defaults to sandbox for safety)
  // Client component needs NEXT_PUBLIC_ prefix to access env vars
  // Teller supports: 'sandbox' (fake credentials), 'development' (real credentials, not billed), 'production' (live)
  const tellerEnv = process.env.NEXT_PUBLIC_TELLER_ENV || 'sandbox';
  
  if (!applicationId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Teller Application ID not configured. Please set NEXT_PUBLIC_TELLER_APPLICATION_ID in your environment variables.
        </AlertDescription>
      </Alert>
    );
  }

  // Map environment: support 'sandbox', 'development', and 'production'
  // 'development' allows testing real credentials on live site without production billing
  const environment = tellerEnv === 'production' || tellerEnv === 'development' 
    ? tellerEnv 
    : 'sandbox';

  const { open, ready } = useTellerConnect({
    applicationId,
    environment,
    onSuccess: async (authorization) => {
      setConnecting(true);
      setError(null);

      try {
        // Extract enrollment data from authorization
        const enrollment = authorization.enrollment;
        const accessToken = authorization.accessToken;
        const institutionName = enrollment.institution?.name || 'Unknown Bank';
        const enrollmentId = enrollment.id;

        // Call the success callback
        onSuccess({
          accessToken,
          enrollmentId,
          institutionName,
          userId: authorization.user?.id || '',
        });
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to process Teller connection';
        setError(errorMessage);
        if (onError) {
          onError(err instanceof Error ? err : new Error(errorMessage));
        }
      } finally {
        setConnecting(false);
      }
    },
    onEvent: (event) => {
      console.log('Teller Connect event:', event);
    },
    onExit: () => {
      setConnecting(false);
      if (onExit) {
        onExit();
      }
    },
  });

  // Auto-open Teller modal when autoOpen is true and ready
  useEffect(() => {
    if (autoOpen && ready && !connecting) {
      // Call onOpen callback if provided (for tracking/logging purposes)
      if (onOpen) {
        onOpen();
      }
      // Open the Teller modal
      open();
    }
  }, [autoOpen, ready, connecting, open, onOpen]);

  // When autoOpen is true, hide the Card UI since Teller modal will be shown
  if (autoOpen) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Connect with Teller
        </CardTitle>
        <CardDescription>
          Securely connect your bank account via Teller. Transactions will be queued for review before import.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={() => {
            if (onOpen) {
              onOpen();
            }
            open();
          }}
          disabled={!ready || connecting}
          className="w-full"
        >
          {connecting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Connect Bank Account
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground">
          Teller uses bank-level security to connect your accounts. Your credentials are never shared with us.
        </p>
      </CardContent>
    </Card>
  );
}

