'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useFeature } from '@/contexts/FeatureContext';
import {
  User,
  Key,
  Database,
  Sparkles,
  Copy,
  Users,
  Download,
  Trash2,
  Crown,
  UserPlus,
  RefreshCw,
  FileText,
  Bell
} from 'lucide-react';

const settingsNavItems = [
  {
    title: 'Features',
    href: '/settings',
    icon: Sparkles,
    description: 'Manage optional features',
  },
  {
    title: 'Subscription',
    href: '/settings/subscription',
    icon: Crown,
    description: 'Manage your subscription',
  },
  {
    title: 'Password',
    href: '/settings/password',
    icon: Key,
    description: 'Change your password',
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Manage notification preferences',
  },
  {
    title: 'Automatic Imports',
    href: '/settings/automatic-imports',
    icon: RefreshCw,
    description: 'Manage automatic transaction imports',
    featureKey: 'automatic_imports',
  },
  {
    title: 'Import Templates',
    href: '/settings/import-templates',
    icon: FileText,
    description: 'Manage CSV import mapping templates',
  },
  {
    title: 'Duplicates',
    href: '/settings/duplicates',
    icon: Copy,
    description: 'Find duplicate transactions',
  },
  {
    title: 'Merchants',
    href: '/settings/merchants',
    icon: Users,
    description: 'Manage merchant groups',
  },
  {
    title: 'Backup',
    href: '/settings/backup',
    icon: Download,
    description: 'Export and restore data',
  },
  {
    title: 'Data',
    href: '/settings/data',
    icon: Database,
    description: 'Import or clear data',
  },
  {
    title: 'Collaborators',
    href: '/settings/collaborators',
    icon: UserPlus,
    description: 'Manage account collaborators',
  },
  {
    title: 'Account',
    href: '/settings/account',
    icon: Trash2,
    description: 'Delete your account',
  },
];

interface SettingsSidebarProps {
  className?: string;
}

export function SettingsSidebar({ className }: SettingsSidebarProps) {
  const pathname = usePathname();
  const automaticImportsEnabled = useFeature('automatic_imports');

  return (
    <nav className={cn('flex flex-col gap-1', className)}>
      {settingsNavItems
        .filter((item) => {
          // If item has a featureKey, check if feature is enabled
          if ('featureKey' in item && item.featureKey) {
            switch (item.featureKey) {
              case 'automatic_imports':
                return automaticImportsEnabled;
              default:
                return true;
            }
          }
          // No feature requirement, show item
          return true;
        })
        .map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.title}</span>
            </Link>
          );
        })}
    </nav>
  );
}

export { settingsNavItems };


