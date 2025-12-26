'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  initializePushNotifications,
} from '@/lib/push-notifications';
import { toast } from 'sonner';

export function PushNotificationSetup() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    const isSupported = isPushNotificationSupported();
    setSupported(isSupported);

    if (isSupported) {
      const currentPermission = await getNotificationPermission();
      setPermission(currentPermission);
      
      // Check if already subscribed
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        } catch (error) {
          console.error('Error checking subscription:', error);
        }
      }
    }
  };

  const handleEnablePush = async () => {
    if (!supported) {
      toast.error('Push notifications are not supported in this browser');
      return;
    }

    setIsSubscribing(true);

    try {
      // Request permission if needed
      let currentPermission = await getNotificationPermission();
      if (currentPermission === 'default') {
        currentPermission = await requestNotificationPermission();
        setPermission(currentPermission);
      }

      if (currentPermission !== 'granted') {
        toast.error('Notification permission was denied');
        setIsSubscribing(false);
        return;
      }

      // Initialize push notifications (register SW, subscribe, save)
      const success = await initializePushNotifications();

      if (success) {
        setIsSubscribed(true);
        toast.success('Push notifications enabled!');
      } else {
        toast.error('Failed to enable push notifications');
      }
    } catch (error: any) {
      console.error('Error enabling push notifications:', error);
      toast.error(error.message || 'Failed to enable push notifications');
    } finally {
      setIsSubscribing(false);
    }
  };

  if (!supported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser or device.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive notifications on your device even when the app is closed. Works when you add the app to your home screen.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Status</p>
              <div className="flex items-center gap-2">
                {isSubscribed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-muted-foreground">Enabled</span>
                  </>
                ) : permission === 'granted' ? (
                  <>
                    <XCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-muted-foreground">Permission granted, but not subscribed</span>
                  </>
                ) : permission === 'denied' ? (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-muted-foreground">Permission denied</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-muted-foreground">Not enabled</span>
                  </>
                )}
              </div>
            </div>
            {!isSubscribed && permission !== 'denied' && (
              <Button
                onClick={handleEnablePush}
                disabled={isSubscribing}
                size="sm"
              >
                {isSubscribing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enabling...
                  </>
                ) : (
                  'Enable Push Notifications'
                )}
              </Button>
            )}
          </div>

          {permission === 'denied' && (
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Notification permission was denied. Please enable it in your browser settings to receive push notifications.
              </p>
            </div>
          )}

          {isSubscribed && (
            <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ Push notifications are enabled. You'll receive notifications even when the app is closed.
              </p>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Works best when you add the app to your home screen</p>
            <p>• Requires HTTPS in production</p>
            <p>• Notifications work even when the app is closed</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

