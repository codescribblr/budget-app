'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const allPages = [
  // Getting Started
  { label: 'Welcome & Overview', href: '/help/getting-started/welcome', section: 'Getting Started' },
  { label: 'Quick Start Guide', href: '/help/getting-started/quick-start', section: 'Getting Started' },
  { label: 'Core Concepts', href: '/help/getting-started/core-concepts', section: 'Getting Started' },
  { label: 'Your First Budget', href: '/help/getting-started/first-budget', section: 'Getting Started' },

  // Features
  { label: 'Dashboard', href: '/help/features/dashboard', section: 'Features' },
  { label: 'Accounts & Credit Cards', href: '/help/features/accounts', section: 'Features' },
  { label: 'Budget Categories', href: '/help/features/categories', section: 'Features' },
  { label: 'Transactions', href: '/help/features/transactions', section: 'Features' },
  { label: 'Money Movement', href: '/help/features/money-movement', section: 'Features' },
  { label: 'CSV Import', href: '/help/features/csv-import', section: 'Features' },
  { label: 'Merchants', href: '/help/features/merchants', section: 'Features' },
  { label: 'Goals', href: '/help/features/goals', section: 'Features' },
  { label: 'Loans', href: '/help/features/loans', section: 'Features' },
  { label: 'Pending Checks', href: '/help/features/pending-checks', section: 'Features' },
  { label: 'Income Buffer', href: '/help/features/income-buffer', section: 'Features' },
  { label: 'Reports', href: '/help/features/reports', section: 'Features' },

  // Tutorials
  { label: 'Setting Up Your First Budget', href: '/help/tutorials/first-budget', section: 'Tutorials' },
  { label: 'Importing Transactions', href: '/help/tutorials/importing', section: 'Tutorials' },
  { label: 'Managing Irregular Income', href: '/help/tutorials/irregular-income', section: 'Tutorials' },

  // Wizards
  { label: 'Budget Setup Wizard', href: '/help/wizards/budget-setup', section: 'Wizards' },
  { label: 'Income Buffer Wizard', href: '/help/wizards/income-buffer', section: 'Wizards' },

  // FAQ
  { label: 'General Questions', href: '/help/faq/general', section: 'FAQ' },
  { label: 'Getting Started', href: '/help/faq/getting-started', section: 'FAQ' },
  { label: 'Envelope Budgeting', href: '/help/faq/envelope-budgeting', section: 'FAQ' },
  { label: 'Advanced Features', href: '/help/faq/advanced', section: 'FAQ' },
  { label: 'Troubleshooting', href: '/help/faq/troubleshooting', section: 'FAQ' },

  // Support
  { label: 'Contact Support', href: '/help/support/contact', section: 'Support' },
  { label: 'Report a Bug', href: '/help/support/report-bug', section: 'Support' },
  { label: 'Feature Requests', href: '/help/support/feature-request', section: 'Support' },
];

export function HelpMobileNav() {
  const pathname = usePathname();
  const currentPage = allPages.find(page => page.href === pathname);

  return (
    <Select value={pathname} onValueChange={(value) => {
      window.location.href = value;
    }}>
      <SelectTrigger className="w-full">
        <SelectValue>
          {currentPage ? `${currentPage.section}: ${currentPage.label}` : 'Select a page...'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {['Getting Started', 'Features', 'Tutorials', 'Wizards', 'FAQ', 'Support'].map((section) => (
          <React.Fragment key={section}>
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              {section}
            </div>
            {allPages
              .filter(page => page.section === section)
              .map((page) => (
                <SelectItem key={page.href} value={page.href}>
                  {page.label}
                </SelectItem>
              ))}
          </React.Fragment>
        ))}
      </SelectContent>
    </Select>
  );
}

