"use client";
import { freshFetch as fetch } from "@/lib/view-freshness";

import { useResourceVersion } from "@/components/new-look/use-resource-version";
import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Mail, CreditCard, AlertCircle, RefreshCw } from "lucide-react";
import { useAccountPermissions } from "@/hooks/use-account-permissions";
import ImportSetupCard from "@/components/automatic-imports/ImportSetupCard";
import IntegrationSelector from "@/components/automatic-imports/IntegrationSelector";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PremiumFeatureGate } from "@/components/subscription/PremiumFeatureGate";
import { toast } from "sonner";

interface AutomaticImportSetup {
  id: number;
  source_type: string;
  integration_name: string | null;
  bank_name: string | null;
  is_active: boolean;
  is_historical: boolean;
  last_successful_fetch_at: string | null;
  last_error: string | null;
  error_count: number;
  estimated_monthly_cost: number | null;
}

export default function AutomaticImportsPage() {
  const version = useResourceVersion("imports", "settings");
  const loaded = useRef(false), request = useRef<AbortController | null>(null);
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const [setups, setSetups] = useState<AutomaticImportSetup[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (!permissionsLoading) void fetchSetups();
    return () => request.current?.abort();
  }, [permissionsLoading, version]);
  const fetchSetups = async () => {
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(!loaded.current); setLoadError(false);
    try {
      const response = await fetch("/api/automatic-imports/setups",{signal:controller.signal,cache:"no-store"});
      if (!response.ok) throw new Error("Could not load import connections.");
      const data = await response.json();
      if (!Array.isArray(data.setups)) throw new Error("Could not read import connections.");
      if (!controller.signal.aborted) {loaded.current = true; setSetups(data.setups);}
    } catch (error) {if (!controller.signal.aborted) setLoadError(true);}
    finally {if (!controller.signal.aborted) setLoading(false);}
  };

  const handleSetupCreated = () => {
    setShowCreateDialog(false);
    fetchSetups();
  };

  const handleSetupDeleted = () => {
    fetchSetups();
  };

  const handleRefreshTellerConnections = async () => {
    setRefreshing(true);
    try {
      const response = await fetch("/api/automatic-imports/teller/refresh");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to refresh Teller connections");
      }
      const data = await response.json();

      // Refresh the setups list
      await fetchSetups();

      const tellerSetups = data.setups || [];
      const needsSetup = tellerSetups.filter(
        (s: any) =>
          !s.is_active ||
          (s.source_config?.account_mappings || []).filter(
            (m: any) => m.enabled,
          ).length === 0,
      );

      if (tellerSetups.length === 0) {
        toast.info("No Teller connections found", {
          description:
            "Connect a bank account via Teller to get started. Note: Connections made before the recent update may need to be reconnected.",
        });
      } else if (needsSetup.length > 0) {
        toast.info(`Found ${tellerSetups.length} Teller connection(s)`, {
          description: `${needsSetup.length} connection(s) need account mapping configuration. Use the settings icon to finish setup.`,
        });
      } else {
        toast.success(`Refreshed ${tellerSetups.length} Teller connection(s)`, {
          description: "All connections are properly configured.",
        });
      }
    } catch (error: any) {
      console.error("Error refreshing Teller connections:", error);
      toast.error(error.message || "Failed to refresh Teller connections");
    } finally {
      setRefreshing(false);
    }
  };

  if (permissionsLoading || loading) {
    return <LoadingSpinner />;
  }

  if (!isEditor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Automatic Imports</CardTitle>
          <CardDescription>
            You don't have permission to manage automatic imports. Only editors
            and owners can configure automatic imports.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loadError && !loaded.current)
    return (
      <div role="alert" className="space-y-4">
        <p>We couldn’t load your import setups.</p>
        <Button onClick={fetchSetups}>Try again</Button>
      </div>
    );

  return (
    <PremiumFeatureGate
      featureName="Automatic Imports"
      featureDescription="Set up automatic transaction imports from your bank accounts. Connect via email forwarding or API integrations like Teller."
    >
      <div className="space-y-6">
        <div className="settings-actions flex items-center justify-between">
          <div data-slot="settings-intro">
            <h1 className="text-3xl font-bold">Automatic Imports</h1>
            <p className="text-muted-foreground mt-2">
              Set up automatic transaction imports from your bank accounts.
              Transactions will be queued for review before import.
            </p>
          </div>
          <div className="flex gap-2">
            {setups.some((s) => s.source_type === "teller") && (
              <Button
                variant="outline"
                onClick={handleRefreshTellerConnections}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh Teller Connections
              </Button>
            )}
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Import Setup
            </Button>
          </div>
        </div>

        {setups.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Import Setups</CardTitle>
              <CardDescription>
                Get started by creating your first automatic import setup. You
                can use email forwarding or connect via API integrations.
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
    </PremiumFeatureGate>
  );
}
