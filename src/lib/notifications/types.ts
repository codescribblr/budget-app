export interface NotificationData {
  userId: string;
  budgetAccountId?: number | null;
  notificationTypeId: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  scheduledFor?: Date;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  pushEnabled?: boolean;
  settings?: Record<string, any>;
}

export interface NotificationType {
  id: string;
  name: string;
  description: string | null;
  category: string;
  defaultEnabled: boolean;
  defaultEmailEnabled: boolean;
  defaultInAppEnabled: boolean;
  requiresAccountContext: boolean;
}

export interface Notification {
  id: number;
  userId: string;
  budgetAccountId: number | null;
  notificationTypeId: string;
  title: string;
  message: string;
  actionUrl: string | null;
  actionLabel: string | null;
  metadata: Record<string, any>;
  emailSent: boolean;
  emailSentAt: string | null;
  emailError: string | null;
  inAppCreated: boolean;
  inAppCreatedAt: string | null;
  isRead: boolean;
  readAt: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserNotificationPreference {
  id: number;
  userId: string;
  notificationTypeId: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}




