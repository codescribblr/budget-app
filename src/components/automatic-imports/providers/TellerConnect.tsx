'use client';

import { useState } from 'react';
import { useTellerConnect } from 'teller-connect-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CreditCard } from 'lucide-react';

interface TellerConnectProps {
  onSuccess: (enrollment: {
    accessToken: string;
    enrollmentId: string;
    institutionName: string;
    userId: string;
  }) => void;
  onError?: (error: Error) => void;
  targetAccountId?: number;
  isHistorical?: boolean;
}

export default function TellerConnect({
  onSuccess,
  onError,
  targetAccountId,
  isHistorical,
}: TellerConnectProps) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applicationId = process.env.NEXT_PUBLIC_TELLER_APPLICATION_ID;
  
  if (!applicationId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Teller Application ID not configured. Please set NEXT_PUBLIC_TELLER_APPLICATION_ID in your environment variables.
        </AlertDescription>
      </Alert>
    );
  }

  const { open, ready } = useTellerConnect({
    applicationId,
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
    },
  });

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
          onClick={() => open()}
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
