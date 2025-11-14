'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Menu } from 'lucide-react';
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  const getButtonVariant = (path: string) => {
    return isActive(path) ? 'secondary' : 'outline';
  };

  const handleNavigation = (path: string) => {
    setMobileMenuOpen(false);
    window.location.href = path;
  };

  return (
    <>
      {/* Title and Navigation Row */}
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

        {/* Navigation Links - Desktop */}
        {showNavigation && (
          <>
            {/* Mobile Menu */}
            <div className="lg:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px]">
                  <SheetHeader>
                    <SheetTitle>Navigation</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col gap-2 mt-6">
                    <Button
                      variant={getButtonVariant('/')}
                      onClick={() => handleNavigation('/')}
                      className="justify-start"
                    >
                      Dashboard
                    </Button>
                    <Button
                      variant={getButtonVariant('/transactions')}
                      onClick={() => handleNavigation('/transactions')}
                      className="justify-start"
                    >
                      Transactions
                    </Button>
                    <Button
                      variant={getButtonVariant('/import')}
                      onClick={() => handleNavigation('/import')}
                      className="justify-start"
                    >
                      Import
                    </Button>
                    <Button
                      variant={getButtonVariant('/money-movement')}
                      onClick={() => handleNavigation('/money-movement')}
                      className="justify-start"
                    >
                      Money Movement
                    </Button>
                    <Button
                      variant={getButtonVariant('/reports')}
                      onClick={() => handleNavigation('/reports')}
                      className="justify-start"
                    >
                      Reports
                    </Button>
                    <Button
                      variant={getButtonVariant('/reports/trends')}
                      onClick={() => handleNavigation('/reports/trends')}
                      className="justify-start ml-4"
                    >
                      Trends
                    </Button>
                    <Button
                      variant={getButtonVariant('/income')}
                      onClick={() => handleNavigation('/income')}
                      className="justify-start"
                    >
                      Income
                    </Button>
                    <Button
                      variant={getButtonVariant('/merchants')}
                      onClick={() => handleNavigation('/merchants')}
                      className="justify-start"
                    >
                      Merchants
                    </Button>
                    <Button
                      variant={getButtonVariant('/settings')}
                      onClick={() => handleNavigation('/settings')}
                      className="justify-start"
                    >
                      Settings
                    </Button>
                    <Separator className="my-2" />
                    <SignOutButton />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex flex-wrap gap-2 justify-end">
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
          </>
        )}
      </div>

      {/* Action Buttons Row */}
      {actions && (
        <div className="flex justify-end gap-2">
          {actions}
        </div>
      )}

      <Separator />
    </>
  );
}

