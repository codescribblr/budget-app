'use client';

import RentCastIntegrationSettings from '@/components/settings/RentCastIntegrationSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Plug } from 'lucide-react';

export default function IntegrationsSettingsPage() {
  const { isOwner, isLoading } = useAccountPermissions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect third-party services using your own API keys. You control the credentials and usage limits.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Available Integrations
          </CardTitle>
          <CardDescription>
            Enable integrations individually. More integrations will appear here over time.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoadingSpinner className="h-4 w-4" />
              Loading...
            </div>
          ) : !isOwner ? (
            <Alert>
              <AlertDescription>
                Only the account owner can manage integrations and API keys.
              </AlertDescription>
            </Alert>
          ) : (
            <RentCastIntegrationSettings />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
