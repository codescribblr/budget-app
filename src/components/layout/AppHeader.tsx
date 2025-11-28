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
import { AIUsageIndicator } from '@/components/ai/AIUsageIndicator';
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
    if (path === '/dashboard') {
      return pathname === '/dashboard';
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
                  <nav className="flex flex-col mt-6">
                    <button
                      onClick={() => handleNavigation('/dashboard')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/dashboard')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => handleNavigation('/transactions')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/transactions')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      Transactions
                    </button>
                    <button
                      onClick={() => handleNavigation('/import')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/import')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      Import
                    </button>
                    <button
                      onClick={() => handleNavigation('/money-movement')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/money-movement')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      Money Movement
                    </button>
                    <button
                      onClick={() => handleNavigation('/reports')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/reports') && !isActive('/reports/trends') && !isActive('/reports/categories')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      Reports
                    </button>
                    <button
                      onClick={() => handleNavigation('/reports/trends')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/reports/trends')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <span className="flex items-center">
                        <span className="mr-2 text-muted-foreground">└</span>
                        Trends
                      </span>
                    </button>
                    <button
                      onClick={() => handleNavigation('/reports/categories')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/reports/categories')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <span className="flex items-center">
                        <span className="mr-2 text-muted-foreground">└</span>
                        Category Reports
                      </span>
                    </button>
                    <button
                      onClick={() => handleNavigation('/income')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/income')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      Income
                    </button>
                    <button
                      onClick={() => handleNavigation('/merchants')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/merchants')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      Merchants
                    </button>
                    <button
                      onClick={() => handleNavigation('/category-rules')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/category-rules')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      Category Rules
                    </button>
                    <button
                      onClick={() => handleNavigation('/settings')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/settings')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => handleNavigation('/help')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/help') && !isActive('/help/wizards')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      Help Center
                    </button>
                    <button
                      onClick={() => handleNavigation('/help/wizards/budget-setup')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/help/wizards')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <span className="flex items-center">
                        <span className="mr-2 text-muted-foreground">└</span>
                        Budget Setup Wizard
                      </span>
                    </button>
                    <button
                      onClick={() => handleNavigation('/help/wizards/income-buffer')}
                      className={`w-full text-left px-4 py-3 transition-colors border-b ${
                        isActive('/help/wizards/income-buffer')
                          ? 'bg-gray-800 text-white hover:bg-gray-700'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <span className="flex items-center">
                        <span className="mr-2 text-muted-foreground">└</span>
                        Income Buffer Wizard
                      </span>
                    </button>

                    <div className="mt-4 px-4">
                      <SignOutButton />
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex flex-wrap gap-2 justify-end">
              <Button
                variant={getButtonVariant('/dashboard')}
                onClick={() => window.location.href = '/dashboard'}
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
                    variant={getButtonVariant('/reports') || isActive('/reports/trends') || isActive('/reports/categories') ? 'secondary' : 'outline'}
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
                  <DropdownMenuItem onClick={() => window.location.href = '/reports/categories'}>
                    Category Reports
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
                variant={getButtonVariant('/category-rules')}
                onClick={() => window.location.href = '/category-rules'}
                size="sm"
                className="md:size-default"
              >
                Category Rules
              </Button>
              <Button
                variant={getButtonVariant('/settings')}
                onClick={() => window.location.href = '/settings'}
                size="sm"
                className="md:size-default"
              >
                Settings
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={getButtonVariant('/help') || isActive('/help/wizards') ? 'secondary' : 'outline'}
                    size="sm"
                    className="md:size-default"
                  >
                    Help & Support
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.location.href = '/help'}>
                    Help Center
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/help/wizards/budget-setup'}>
                    Budget Setup Wizard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = '/help/wizards/income-buffer'}>
                    Income Buffer Wizard
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AIUsageIndicator />
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

