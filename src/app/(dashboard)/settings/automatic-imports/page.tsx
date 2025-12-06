'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Mail, CreditCard, AlertCircle } from 'lucide-react';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import ImportSetupCard from '@/components/automatic-imports/ImportSetupCard';
import IntegrationSelector from '@/components/automatic-imports/IntegrationSelector';

interface AutomaticImportSetup {
  id: number;
  source_type: string;
  integration_name: string | null;
  bank_name: string | null;
  is_active: boolean;
  last_successful_fetch_at: string | null;
  last_error: string | null;
  error_count: number;
  estimated_monthly_cost: number | null;
}

export default function AutomaticImportsPage() {
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const [setups, setSetups] = useState<AutomaticImportSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (!permissionsLoading) {
      fetchSetups();
    }
  }, [permissionsLoading]);

  const fetchSetups = async () => {
    try {
      const response = await fetch('/api/automatic-imports/setups');
      if (!response.ok) throw new Error('Failed to fetch setups');
      const data = await response.json();
      setSetups(data.setups || []);
    } catch (error) {
      console.error('Error fetching import setups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetupCreated = () => {
    setShowCreateDialog(false);
    fetchSetups();
  };

  const handleSetupDeleted = () => {
    fetchSetups();
  };

  if (permissionsLoading || loading) {
    return <div>Loading...</div>;
  }

  if (!isEditor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Automatic Imports</CardTitle>
          <CardDescription>
            You don't have permission to manage automatic imports. Only editors and owners can configure automatic imports.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automatic Imports</h1>
          <p className="text-muted-foreground mt-2">
            Set up automatic transaction imports from your bank accounts. Transactions will be queued for review before import.
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Import Setup
        </Button>
      </div>

      {setups.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Import Setups</CardTitle>
            <CardDescription>
              Get started by creating your first automatic import setup. You can use email forwarding or connect via API integrations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Setup
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {setups.map((setup) => (
            <ImportSetupCard
              key={setup.id}
              setup={setup}
              onDeleted={handleSetupDeleted}
              onUpdated={fetchSetups}
            />
          ))}
        </div>
      )}

      <IntegrationSelector
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreated={handleSetupCreated}
      />
    </div>
  );
}
