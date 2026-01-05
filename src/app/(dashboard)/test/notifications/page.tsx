'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function TestNotificationsPage() {
  const [loading, setLoading] = useState(false);
  const [notificationType, setNotificationType] = useState<'upcoming' | 'insufficient_funds' | 'amount_changed'>('upcoming');
  const [recurringTransactionId, setRecurringTransactionId] = useState<string>('');
  const [merchantName, setMerchantName] = useState('Test Merchant');
  const [expectedAmount, setExpectedAmount] = useState('100.00');

  const handleTest = async () => {
    try {
      setLoading(true);

      const body: any = {
        type: notificationType,
      };

      // Add optional fields
      if (recurringTransactionId) {
        body.recurringTransactionId = parseInt(recurringTransactionId);
      } else {
        body.merchantName = merchantName;
        body.expectedAmount = parseFloat(expectedAmount);
      }

      const response = await fetch('/api/test/notifications/recurring-transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create test notification');
      }

      toast.success(`Test ${notificationType} notification created successfully!`, {
        description: `Notification ID: ${data.notificationId}`,
      });
    } catch (error: any) {
      console.error('Error creating test notification:', error);
      toast.error('Failed to create test notification', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Test Recurring Transaction Notifications</h1>
        <p className="text-muted-foreground mt-2">
          Create test notifications to verify email and in-app notifications are working correctly.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Test Notification</CardTitle>
          <CardDescription>
            Choose a notification type and either use an existing recurring transaction or provide test data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="type">Notification Type</Label>
            <Select
              value={notificationType}
              onValueChange={(value: any) => setNotificationType(value)}
            >
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming Transaction</SelectItem>
                <SelectItem value="insufficient_funds">Insufficient Funds</SelectItem>
                <SelectItem value="amount_changed">Amount Changed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rtId">Recurring Transaction ID (Optional)</Label>
            <Input
              id="rtId"
              type="number"
              placeholder="Leave empty to use test data"
              value={recurringTransactionId}
              onChange={(e) => setRecurringTransactionId(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              If provided, will use the existing recurring transaction. Otherwise, will create a test one.
            </p>
          </div>

          {!recurringTransactionId && (
            <>
              <div className="space-y-2">
                <Label htmlFor="merchant">Merchant Name</Label>
                <Input
                  id="merchant"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="Test Merchant"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Expected Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={expectedAmount}
                  onChange={(e) => setExpectedAmount(e.target.value)}
                  placeholder="100.00"
                />
              </div>
            </>
          )}

          <Button
            onClick={handleTest}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Creating Notification...
              </>
            ) : (
              'Create Test Notification'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Check Notification Preferences</h3>
            <p className="text-sm text-muted-foreground">
              Make sure your notification preferences are enabled at{' '}
              <a href="/settings/notifications" className="text-primary underline">
                Settings → Notifications
              </a>
              . Enable both email and in-app notifications for the type you want to test.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Create Test Notification</h3>
            <p className="text-sm text-muted-foreground">
              Select a notification type above and click "Create Test Notification". The notification will be sent immediately based on your preferences.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Check Your Notifications</h3>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>
                <strong>In-App:</strong> Check the notification bell icon in the top navigation
              </li>
              <li>
                <strong>Email:</strong> Check your email inbox (may take a few moments)
              </li>
              <li>
                <strong>Push:</strong> Check your device for push notifications (requires push notifications enabled)
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. Test Scheduled Notifications</h3>
            <p className="text-sm text-muted-foreground">
              For "Upcoming" notifications, if you have reminder_days_before set, the notification may be scheduled.
              You can manually trigger scheduled notifications by calling:{' '}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                GET /api/cron/send-notifications
              </code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


