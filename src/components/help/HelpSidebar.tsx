'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Sparkles,
  GraduationCap,
  MessageCircleQuestion,
  LifeBuoy,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface NavSection {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

interface NavItem {
  label: string;
  href: string;
}

const navigationSections: NavSection[] = [
  {
    label: 'Getting Started',
    icon: BookOpen,
    items: [
      { label: 'Welcome & Overview', href: '/help/getting-started/welcome' },
      { label: 'Quick Start Guide', href: '/help/getting-started/quick-start' },
      { label: 'Core Concepts', href: '/help/getting-started/core-concepts' },
      { label: 'Your First Budget', href: '/help/getting-started/first-budget' },
    ],
  },
  {
    label: 'Features',
    icon: Layers,
    items: [
      { label: 'Dashboard', href: '/help/features/dashboard' },
      { label: 'Accounts & Credit Cards', href: '/help/features/accounts' },
      { label: 'Budget Categories', href: '/help/features/categories' },
      { label: 'Transactions', href: '/help/features/transactions' },
      { label: 'Money Movement', href: '/help/features/money-movement' },
      { label: 'CSV Import', href: '/help/features/csv-import' },
      { label: 'Merchants', href: '/help/features/merchants' },
      { label: 'Goals', href: '/help/features/goals' },
      { label: 'Loans', href: '/help/features/loans' },
      { label: 'Pending Checks', href: '/help/features/pending-checks' },
      { label: 'Income Buffer', href: '/help/features/income-buffer' },
      { label: 'Reports', href: '/help/features/reports' },
    ],
  },
  {
    label: 'Wizards',
    icon: Sparkles,
    items: [
      { label: 'Budget Setup Wizard', href: '/help/wizards/budget-setup' },
      { label: 'Income Buffer Wizard', href: '/help/wizards/income-buffer' },
    ],
  },
  {
    label: 'FAQ',
    icon: MessageCircleQuestion,
    items: [
      { label: 'General Questions', href: '/help/faq/general' },
      { label: 'Getting Started', href: '/help/faq/getting-started' },
      { label: 'Envelope Budgeting', href: '/help/faq/envelope-budgeting' },
      { label: 'Advanced Features', href: '/help/faq/advanced' },
      { label: 'Troubleshooting', href: '/help/faq/troubleshooting' },
    ],
  },
  {
    label: 'Support',
    icon: LifeBuoy,
    items: [
      { label: 'Contact Support', href: '/help/support/contact' },
      { label: 'Report a Bug', href: '/help/support/report-bug' },
      { label: 'Feature Requests', href: '/help/support/feature-request' },
    ],
  },
];

export function HelpSidebar() {
  const pathname = usePathname();
  const [expandedSections, setExpandedSections] = useState<string[]>(() => {
    // Auto-expand section containing current page
    const currentSection = navigationSections.find(section =>
      section.items.some(item => pathname.startsWith(item.href))
    );
    return currentSection ? [currentSection.label] : ['Getting Started'];
  });

  const toggleSection = (label: string) => {
    setExpandedSections(prev =>
      prev.includes(label)
        ? prev.filter(l => l !== label)
        : [...prev, label]
    );
  };

  return (
    <nav className="space-y-1">
      {navigationSections.map((section) => {
        const Icon = section.icon;
        const isExpanded = expandedSections.includes(section.label);
        const hasActiveItem = section.items.some(item => pathname.startsWith(item.href));

        return (
          <div key={section.label}>
            <button
              onClick={() => toggleSection(section.label)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md',
                'hover:bg-muted transition-colors',
                hasActiveItem && 'bg-muted'
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span>{section.label}</span>
              </div>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isExpanded && 'transform rotate-180'
                )}
              />
            </button>
            
            {isExpanded && (
              <div className="ml-6 mt-1 space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'block px-3 py-1.5 text-sm rounded-md transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

