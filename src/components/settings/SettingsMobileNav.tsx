'use client';

import { usePathname } from 'next/navigation';
import { settingsNavItems } from './SettingsSidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';

export function SettingsMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  
  const currentItem = settingsNavItems.find((item) => item.href === pathname);

  return (
    <Select
      value={pathname}
      onValueChange={(value) => router.push(value)}
    >
      <SelectTrigger className="w-full">
        <SelectValue>
          {currentItem ? (
            <div className="flex items-center gap-2">
              <currentItem.icon className="h-4 w-4" />
              <span>{currentItem.title}</span>
            </div>
          ) : (
            'Select a section'
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {settingsNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <SelectItem key={item.href} value={item.href}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{item.title}</span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}


