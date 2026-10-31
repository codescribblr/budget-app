"use client";
import { freshFetch as fetch } from "@/lib/view-freshness";

import { useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { useFeature } from "@/contexts/FeatureContext";
import { usePathname } from "next/navigation";
import { useResourceVersion } from "@/components/new-look/use-resource-version";
import { budgetRequest } from "@/lib/budget-request";
import { PushNotificationSetup } from "@/components/notifications/PushNotificationSetup";

interface NotificationType {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

// List of implemented notification types
const IMPLEMENTED_NOTIFICATION_TYPES = new Set([
  "recurring_transaction_upcoming",
  "recurring_transaction_insufficient_funds",
  "recurring_transaction_amount_changed",
  "recurring_transaction_new",
  "budget_category_over_limit",
  "budget_low_balance",
  "subscription_trial_ending",
  "subscription_payment_failed",
  "system_notification",
]);

interface NotificationPreference {
  revision?: string | null;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  settings: Record<string, any>;
}

export default function NotificationPreferencesPage() {
  const modern = usePathname().startsWith("/new");
  const version = useResourceVersion("settings");
  const loaded = useRef(false), requestId = useRef(0);
  const dirty = useRef(new Set<string>());
  const [userId, setUserId] = useState("");
  const [saveError, setSaveError] = useState("");
  const recurringTransactionsEnabled = useFeature("recurring_transactions");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notificationTypes, setNotificationTypes] = useState<
    NotificationType[]
  >([]);
  const [preferences, setPreferences] = useState<
    Record<string, NotificationPreference>
  >({});

  useEffect(() => {
    fetchData();
    return () => { requestId.current++; };
  }, [version]);

  const fetchData = async () => {
    const id = ++requestId.current;
    try {
      setLoading(!loaded.current);
      setLoadError(false);
      const [typesResponse, prefsResponse] = await Promise.all([
        fetch("/api/notifications/types"),
        fetch("/api/notifications/preferences"),
      ]);

      if (!typesResponse.ok || !prefsResponse.ok)
        throw new Error("Could not load preferences");
      {
        const typesData = await typesResponse.json();
        const prefsData = await prefsResponse.json();

        if (id !== requestId.current) return;
        loaded.current = true;
        setUserId(prefsData.userId);
        setNotificationTypes(typesData.notificationTypes || []);
        setPreferences(previous => ({ ...prefsData.preferences, ...Object.fromEntries(Object.entries(previous).filter(([key]) => dirty.current.has(key))) }));
      }
    } catch (error) {
      if (id !== requestId.current) return;
      setLoadError(true);
      console.error("Error fetching notification preferences:", error);
      toast.error("Failed to load notification preferences");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const savePreference = async (typeId: string, patch: Record<string, unknown>) => {
    if (saving || (modern && !userId)) return;
    const current = preferences[typeId];
    dirty.current.add(typeId);
    setSaving(true); setSaveError("");
    try {
      const result = await budgetRequest<{revision?: string}>(`/api/notifications/preferences/${typeId}`, {
        ...patch, ...(modern ? {expectedRevision: current?.revision ?? null, expectedUserId: userId} : {}),
      }, "PATCH");
      dirty.current.delete(typeId);
      setPreferences(previous => ({ ...previous, [typeId]: { ...previous[typeId], ...patch, revision: result.revision } }));
      void fetchData();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Your preference could not be saved.");
    } finally { setSaving(false); }
  };
  const handleToggle = (typeId: string, channel: "email" | "inApp", enabled: boolean) =>
    savePreference(typeId, { [channel === "email" ? "emailEnabled" : "inAppEnabled"]: enabled });
  const handleSettingChange = (typeId: string, key: string, value: number) =>
    savePreference(typeId, { settings: { ...preferences[typeId]?.settings, [key]: value } });

  // Filter out recurring transaction notifications if feature is disabled
  // Also filter out the missed recurring transaction notification (removed feature)
  const filteredTypes = notificationTypes.filter((type) => {
    // Remove missed recurring transaction notification completely
    if (type.id === "recurring_transaction_missed") {
      return false;
    }
    if (type.category === "recurring_transactions") {
      return recurringTransactionsEnabled;
    }
    return true;
  });

  const groupedTypes = filteredTypes.reduce(
    (acc, type) => {
      const category = type.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(type);
      return acc;
    },
    {} as Record<string, NotificationType[]>,
  );

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (loadError && !loaded.current)
    return (
      <div role="alert" className="space-y-4">
        <p>We couldn’t load your notification preferences.</p>
        <Button onClick={fetchData}>Try again</Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div data-slot="settings-intro">
        <h2 className="text-2xl font-bold">Notification Preferences</h2>
        <p className="text-muted-foreground mt-1">
          Control how and when you receive notifications
        </p>
      </div>

      {(saveError || loadError) && <div className="nl-notice" role="alert">
        <p>{saveError || "Could not refresh your saved preferences. Your last loaded settings are still shown."}</p>
        <Button variant="outline" onClick={() => { dirty.current.clear(); setSaveError(""); void fetchData(); }}>Reload saved preferences</Button>
      </div>}
      <PushNotificationSetup />

      {Object.entries(groupedTypes).map(([category, types]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="capitalize">
              {category.replace("_", " ")}
            </CardTitle>
            <CardDescription>
              Manage notifications for {category.replace("_", " ")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {types.map((type) => {
              const pref = preferences[type.id] || {
                emailEnabled: true,
                inAppEnabled: true,
                settings: {},
              };
              const isImplemented = IMPLEMENTED_NOTIFICATION_TYPES.has(type.id);
              return (
                <div key={type.id} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{type.name}</h3>
                    {!isImplemented && (
                      <Badge variant="outline" className="text-xs">
                        Coming Soon
                      </Badge>
                    )}
                  </div>
                  {type.description && (
                    <p className="text-sm text-muted-foreground">
                      {type.description}
                    </p>
                  )}
                  <div className="notification-channels space-y-3 pl-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0 -mt-px" />
                        <Label
                          htmlFor={`${type.id}-email`}
                          className={`leading-none mb-0 ${!isImplemented ? "text-muted-foreground" : ""}`}
                        >
                          Email
                        </Label>
                      </div>
                      <Switch
                        id={`${type.id}-email`}
                        aria-label={`${type.name}: email`}
                        checked={pref.emailEnabled}
                        onCheckedChange={(checked) =>
                          handleToggle(type.id, "email", checked)
                        }
                        disabled={!isImplemented || saving}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground shrink-0 -mt-px" />
                        <div className="flex flex-col">
                          <Label
                            htmlFor={`${type.id}-inapp`}
                            className={`leading-none mb-0 ${!isImplemented ? "text-muted-foreground" : ""}`}
                          >
                            Push Notifications
                          </Label>
                          <span className="text-xs text-muted-foreground">
                            Receive on device when app is closed
                          </span>
                        </div>
                      </div>
                      <Switch
                        id={`${type.id}-inapp`}
                        aria-label={`${type.name}: device push`}
                        checked={pref.inAppEnabled}
                        onCheckedChange={(checked) =>
                          handleToggle(type.id, "inApp", checked)
                        }
                        disabled={!isImplemented || saving}
                      />
                    </div>
                    <div className="pl-6 text-xs text-muted-foreground">
                      Note: Notifications will always appear in the app (bell
                      icon). This setting controls push notifications to your
                      device.
                    </div>
                    {type.id === "recurring_transaction_upcoming" &&
                      isImplemented && (
                        <div className="flex items-center gap-2 pl-6">
                          <Label
                            htmlFor={`${type.id}-days`}
                            className="text-sm"
                          >
                            Remind me
                          </Label>
                          <Input
                            id={`${type.id}-days`}
                            type="number"
                            key={`${type.id}-days-${pref.settings?.reminder_days_before ?? 2}`}
                            defaultValue={
                              pref.settings?.reminder_days_before ?? 2
                            }
                            disabled={saving}
                            onFocus={() => dirty.current.add(type.id)}
                          onBlur={(e) => {
                              if (
                                !e.target.validity.valid ||
                                e.target.value === ""
                              )
                                return;
                              const value = Number(e.target.value);
                              handleSettingChange(
                                type.id,
                                "reminder_days_before",
                                value,
                              );
                            }}
                            min={0}
                            max={30}
                            className="w-20"
                          />
                          <Label
                            htmlFor={`${type.id}-days`}
                            className="text-sm"
                          >
                            days before
                          </Label>
                        </div>
                      )}
                    {type.id === "budget_low_balance" && isImplemented && (
                      <div className="flex items-center gap-2 pl-6">
                        <Label
                          htmlFor={`${type.id}-threshold`}
                          className="text-sm"
                        >
                          Alert when balance below
                        </Label>
                        <Input
                          id={`${type.id}-threshold`}
                          type="number"
                          key={`${type.id}-threshold-${pref.settings?.low_balance_threshold ?? 100}`}
                          defaultValue={
                            pref.settings?.low_balance_threshold ?? 100
                          }
                          disabled={saving}
                          onFocus={() => dirty.current.add(type.id)}
                          onBlur={(e) => {
                            if (
                              !e.target.validity.valid ||
                              e.target.value === ""
                            )
                              return;
                            const value = Number(e.target.value);
                            handleSettingChange(
                              type.id,
                              "low_balance_threshold",
                              value,
                            );
                          }}
                          min={0}
                          step={1}
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>
                  {types.indexOf(type) < types.length - 1 && <Separator />}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
