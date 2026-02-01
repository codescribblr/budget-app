'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { useFeature } from '@/contexts/FeatureContext';
import { PushNotificationSetup } from '@/components/notifications/PushNotificationSetup';

interface NotificationType {
  id: string;
  name: string;
  description: string | null;
  category: string;
}

// List of implemented notification types
const IMPLEMENTED_NOTIFICATION_TYPES = new Set([
  'recurring_transaction_upcoming',
  'recurring_transaction_insufficient_funds',
  'recurring_transaction_amount_changed',
  'subscription_trial_ending',
  'subscription_payment_failed',
  'system_notification',
]);

interface NotificationPreference {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  settings: Record<string, any>;
}

export default function NotificationPreferencesPage() {
  const recurringTransactionsEnabled = useFeature('recurring_transactions');
  const [loading, setLoading] = useState(true);
  const [notificationTypes, setNotificationTypes] = useState<NotificationType[]>([]);
  const [preferences, setPreferences] = useState<Record<string, NotificationPreference>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [typesResponse, prefsResponse] = await Promise.all([
        fetch('/api/notifications/types'),
        fetch('/api/notifications/preferences'),
      ]);

      if (typesResponse.ok && prefsResponse.ok) {
        const typesData = await typesResponse.json();
        const prefsData = await prefsResponse.json();
        
        setNotificationTypes(typesData.notificationTypes || []);
        setPreferences(prefsData.preferences || {});
      }
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (typeId: string, channel: 'email' | 'inApp', enabled: boolean) => {
    const current = preferences[typeId] || { emailEnabled: true, inAppEnabled: true, settings: {} };
    const updated = {
      ...current,
      [channel === 'email' ? 'emailEnabled' : 'inAppEnabled']: enabled,
    };

    setPreferences({
      ...preferences,
      [typeId]: updated,
    });

    // Save immediately
    try {
      const response = await fetch(`/api/notifications/preferences/${typeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailEnabled: updated.emailEnabled,
          inAppEnabled: updated.inAppEnabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preference');
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to update notification preference');
      // Revert on error
      setPreferences({
        ...preferences,
        [typeId]: current,
      });
    }
  };

  const handleSettingChange = async (typeId: string, key: string, value: any) => {
    const current = preferences[typeId] || { emailEnabled: true, inAppEnabled: true, settings: {} };
    const updated = {
      ...current,
      settings: {
        ...current.settings,
        [key]: value,
      },
    };

    setPreferences({
      ...preferences,
      [typeId]: updated,
    });

    // Save immediately
    try {
      const response = await fetch(`/api/notifications/preferences/${typeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailEnabled: updated.emailEnabled,
          inAppEnabled: updated.inAppEnabled,
          settings: updated.settings,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preference');
      }
    } catch (error) {
      console.error('Error updating preference:', error);
      toast.error('Failed to update notification preference');
      // Revert on error
      setPreferences({
        ...preferences,
        [typeId]: current,
      });
    }
  };

  // Filter out recurring transaction notifications if feature is disabled
  // Also filter out the missed recurring transaction notification (removed feature)
  const filteredTypes = notificationTypes.filter(type => {
    // Remove missed recurring transaction notification completely
    if (type.id === 'recurring_transaction_missed') {
      return false;
    }
    if (type.category === 'recurring_transactions') {
      return recurringTransactionsEnabled;
    }
    return true;
  });

  const groupedTypes = filteredTypes.reduce((acc, type) => {
    const category = type.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(type);
    return acc;
  }, {} as Record<string, NotificationType[]>);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Notification Preferences</h2>
        <p className="text-muted-foreground mt-1">
          Control how and when you receive notifications
        </p>
      </div>

      <PushNotificationSetup />

      {Object.entries(groupedTypes).map(([category, types]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="capitalize">{category.replace('_', ' ')}</CardTitle>
            <CardDescription>
              Manage notifications for {category.replace('_', ' ')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {types.map((type) => {
              const pref = preferences[type.id] || { emailEnabled: true, inAppEnabled: true, settings: {} };
              const isImplemented = IMPLEMENTED_NOTIFICATION_TYPES.has(type.id);
              return (
                <div key={type.id} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{type.name}</h3>
                    {!isImplemented && (
                      <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                    )}
                  </div>
                  {type.description && (
                    <p className="text-sm text-muted-foreground">{type.description}</p>
                  )}
                  <div className="space-y-3 pl-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0 -mt-px" />
                        <Label 
                          htmlFor={`${type.id}-email`} 
                          className={`leading-none mb-0 ${!isImplemented ? 'text-muted-foreground' : ''}`}
                        >
                          Email
                        </Label>
                      </div>
                      <Switch
                        id={`${type.id}-email`}
                        checked={pref.emailEnabled}
                        onCheckedChange={(checked) => handleToggle(type.id, 'email', checked)}
                        disabled={!isImplemented}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground shrink-0 -mt-px" />
                        <div className="flex flex-col">
                          <Label 
                            htmlFor={`${type.id}-inapp`} 
                            className={`leading-none mb-0 ${!isImplemented ? 'text-muted-foreground' : ''}`}
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
                        checked={pref.inAppEnabled}
                        onCheckedChange={(checked) => handleToggle(type.id, 'inApp', checked)}
                        disabled={!isImplemented}
                      />
                    </div>
                    <div className="pl-6 text-xs text-muted-foreground">
                      Note: Notifications will always appear in the app (bell icon). This setting controls push notifications to your device.
                    </div>
                    {type.id === 'recurring_transaction_upcoming' && isImplemented && (
                      <div className="flex items-center gap-2 pl-6">
                        <Label htmlFor={`${type.id}-days`} className="text-sm">Remind me</Label>
                        <Input
                          id={`${type.id}-days`}
                          type="number"
                          value={pref.settings?.reminder_days_before || 2}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 2;
                            handleSettingChange(type.id, 'reminder_days_before', value);
                          }}
                          onBlur={(e) => {
                            const value = parseInt(e.target.value) || 2;
                            handleSettingChange(type.id, 'reminder_days_before', value);
                          }}
                          min={0}
                          max={30}
                          className="w-20"
                        />
                        <Label htmlFor={`${type.id}-days`} className="text-sm">days before</Label>
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




