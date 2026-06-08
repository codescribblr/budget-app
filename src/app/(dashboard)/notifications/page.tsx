import { Suspense } from 'react';
import NotificationsPage from '@/components/notifications/NotificationsPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function Notifications() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <NotificationsPage />
    </Suspense>
  );
}




