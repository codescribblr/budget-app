'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  User, 
  Key, 
  Database, 
  Sparkles, 
  Copy, 
  Users, 
  Download,
  Trash2
} from 'lucide-react';

const settingsNavItems = [
  {
    title: 'Features',
    href: '/settings',
    icon: Sparkles,
    description: 'Manage optional features',
  },
  {
    title: 'Password',
    href: '/settings/password',
    icon: Key,
    description: 'Change your password',
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

  return (
    <nav className={cn('flex flex-col gap-1', className)}>
      {settingsNavItems.map((item) => {
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

