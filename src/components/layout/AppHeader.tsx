'use client';

import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import SignOutButton from '@/components/auth/SignOutButton';
import { ReactNode } from 'react';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  showNavigation?: boolean;
}

export default function AppHeader({ 
  title, 
  subtitle, 
  actions,
  showNavigation = true 
}: AppHeaderProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const getButtonVariant = (path: string) => {
    return isActive(path) ? 'secondary' : 'outline';
  };

  return (
    <>
      {/* Title and Subtitle Row */}
      {(title || subtitle || actions) && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          {/* Title and Subtitle */}
          {(title || subtitle) && (
            <div>
              {title && <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>}
              {subtitle && (
                <p className="text-muted-foreground mt-1">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {actions && (
            <div className="flex gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Navigation Links Row */}
      {showNavigation && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={getButtonVariant('/')}
              onClick={() => window.location.href = '/'}
              size="sm"
              className="md:size-default"
            >
              Dashboard
            </Button>
            <Button
              variant={getButtonVariant('/transactions')}
              onClick={() => window.location.href = '/transactions'}
              size="sm"
              className="md:size-default"
            >
              Transactions
            </Button>
            <Button
              variant={getButtonVariant('/import')}
              onClick={() => window.location.href = '/import'}
              size="sm"
              className="md:size-default"
            >
              Import
            </Button>
            <Button
              variant={getButtonVariant('/money-movement')}
              onClick={() => window.location.href = '/money-movement'}
              size="sm"
              className="md:size-default"
            >
              Money Movement
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={getButtonVariant('/reports')}
                  size="sm"
                  className="md:size-default"
                >
                  Reports
                  <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => window.location.href = '/reports'}>
                  Reports
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.location.href = '/reports/trends'}>
                  Trends
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant={getButtonVariant('/income')}
              onClick={() => window.location.href = '/income'}
              size="sm"
              className="md:size-default"
            >
              Income
            </Button>
            <Button
              variant={getButtonVariant('/merchants')}
              onClick={() => window.location.href = '/merchants'}
              size="sm"
              className="md:size-default"
            >
              Merchants
            </Button>
            <Button
              variant={getButtonVariant('/settings')}
              onClick={() => window.location.href = '/settings'}
              size="sm"
              className="md:size-default"
            >
              Settings
            </Button>
            <SignOutButton />
          </div>
        </div>
      )}

      <Separator />
    </>
  );
}

