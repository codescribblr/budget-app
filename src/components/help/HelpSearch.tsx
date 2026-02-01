'use client';

import { useState, useMemo } from 'react';
import { Search, FileText, HelpCircle, BookOpen, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

// All help pages for search
const allHelpPages = [
  // Getting Started
  { title: 'Welcome to Envelope Budgeting', href: '/help/getting-started/welcome', category: 'Getting Started', keywords: ['welcome', 'intro', 'introduction', 'overview'] },
  { title: 'Quick Start Guide', href: '/help/getting-started/quick-start', category: 'Getting Started', keywords: ['quick', 'start', 'begin', 'new', 'first'] },
  { title: 'Core Concepts', href: '/help/getting-started/core-concepts', category: 'Getting Started', keywords: ['concepts', 'basics', 'fundamentals', 'learn', 'understand'] },
  { title: 'Your First Budget', href: '/help/getting-started/first-budget', category: 'Getting Started', keywords: ['first', 'budget', 'setup', 'create', 'new'] },
  
  // Features
  { title: 'Dashboard Overview', href: '/help/features/dashboard', category: 'Features', keywords: ['dashboard', 'home', 'overview', 'summary'] },
  { title: 'Accounts & Credit Cards', href: '/help/features/accounts', category: 'Features', keywords: ['accounts', 'credit', 'cards', 'bank', 'balance'] },
  { title: 'Non-Cash Assets', href: '/help/features/non-cash-assets', category: 'Features', keywords: ['assets', 'investments', 'retirement', '401k', 'ira', 'real estate', 'vehicles', 'net worth'] },
  { title: 'Budget Categories (Envelopes)', href: '/help/features/categories', category: 'Features', keywords: ['categories', 'envelopes', 'budget', 'organize'] },
  { title: 'Transactions', href: '/help/features/transactions', category: 'Features', keywords: ['transactions', 'spending', 'expenses', 'record'] },
  { title: 'Money Movement', href: '/help/features/money-movement', category: 'Features', keywords: ['money', 'movement', 'allocate', 'assign', 'distribute'] },
  { title: 'CSV Import', href: '/help/features/csv-import', category: 'Features', keywords: ['csv', 'import', 'upload', 'bank', 'download'] },
  { title: 'Import Queue', href: '/help/features/import-queue', category: 'Features', keywords: ['import', 'queue', 'review', 'approve', 'batch', 'automatic', 'teller', 'plaid'] },
  { title: 'Financial Goals', href: '/help/features/goals', category: 'Features', keywords: ['goals', 'savings', 'targets', 'objectives'] },
  { title: 'Merchants & Auto-Categorization', href: '/help/features/merchants', category: 'Features', keywords: ['merchants', 'auto', 'categorization', 'automatic', 'groups'] },
  { title: 'Loans', href: '/help/features/loans', category: 'Features', keywords: ['loans', 'debt', 'payoff', 'mortgage', 'car'] },
  { title: 'Pending Checks', href: '/help/features/pending-checks', category: 'Features', keywords: ['checks', 'pending', 'outstanding', 'uncleared'] },
  { title: 'Income Buffer', href: '/help/features/income-buffer', category: 'Features', keywords: ['income', 'buffer', 'irregular', 'variable', 'freelance'] },
  { title: 'Retirement Planning', href: '/help/features/retirement-planning', category: 'Features', keywords: ['retirement', 'planning', 'forecast', 'net worth', 'rmd', 'social security', 'distribution'] },
  { title: 'Reports & Analytics', href: '/help/features/reports', category: 'Features', keywords: ['reports', 'analytics', 'charts', 'graphs', 'trends'] },
  
  // Tutorials
  { title: 'Setting Up Your First Budget', href: '/help/tutorials/first-budget', category: 'Tutorials', keywords: ['tutorial', 'first', 'budget', 'setup', 'walkthrough'] },
  { title: 'Importing Transactions', href: '/help/tutorials/importing', category: 'Tutorials', keywords: ['tutorial', 'import', 'csv', 'transactions', 'bank'] },
  { title: 'Managing Irregular Income', href: '/help/tutorials/irregular-income', category: 'Tutorials', keywords: ['tutorial', 'irregular', 'income', 'freelance', 'variable'] },
  
  // Wizards
  { title: 'Budget Setup Wizard', href: '/help/wizards/budget-setup', category: 'Wizards', keywords: ['wizard', 'setup', 'guided', 'interactive'] },
  { title: 'Income Buffer Wizard', href: '/help/wizards/income-buffer', category: 'Wizards', keywords: ['wizard', 'income', 'buffer', 'setup'] },
  
  // FAQ
  { title: 'General Questions', href: '/help/faq/general', category: 'FAQ', keywords: ['faq', 'general', 'questions', 'common'] },
  { title: 'Getting Started FAQ', href: '/help/faq/getting-started', category: 'FAQ', keywords: ['faq', 'getting', 'started', 'new', 'beginner'] },
  { title: 'Envelope Budgeting FAQ', href: '/help/faq/envelope-budgeting', category: 'FAQ', keywords: ['faq', 'envelope', 'budgeting', 'method'] },
  { title: 'Advanced Features FAQ', href: '/help/faq/advanced', category: 'FAQ', keywords: ['faq', 'advanced', 'features', 'complex'] },
  { title: 'Troubleshooting', href: '/help/faq/troubleshooting', category: 'FAQ', keywords: ['faq', 'troubleshooting', 'problems', 'issues', 'errors'] },
  
  // Support
  { title: 'Contact Support', href: '/help/support/contact', category: 'Support', keywords: ['contact', 'support', 'help', 'email'] },
  { title: 'Report a Bug', href: '/help/support/report-bug', category: 'Support', keywords: ['bug', 'report', 'issue', 'problem', 'error'] },
  { title: 'Request a Feature', href: '/help/support/feature-request', category: 'Support', keywords: ['feature', 'request', 'suggestion', 'idea'] },
];

const categoryIcons = {
  'Getting Started': BookOpen,
  'Features': FileText,
  'Tutorials': BookOpen,
  'Wizards': Sparkles,
  'FAQ': HelpCircle,
  'Support': HelpCircle,
};

export function HelpSearch() {
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }

    const query = searchQuery.toLowerCase();
    
    return allHelpPages
      .filter(page => {
        const titleMatch = page.title.toLowerCase().includes(query);
        const categoryMatch = page.category.toLowerCase().includes(query);
        const keywordMatch = page.keywords.some(keyword => keyword.includes(query));
        
        return titleMatch || categoryMatch || keywordMatch;
      })
      .slice(0, 8); // Limit to 8 results
  }, [searchQuery]);

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search help articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {searchResults.length > 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
          <CardContent className="p-2">
            <div className="space-y-1">
              {searchResults.map((result, index) => {
                const Icon = categoryIcons[result.category as keyof typeof categoryIcons] || FileText;
                return (
                  <Link
                    key={`${result.href}-${index}`}
                    href={result.href}
                    onClick={() => setSearchQuery('')}
                    className="block p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{result.title}</div>
                        <div className="text-xs text-muted-foreground">{result.category}</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {searchQuery.trim() && searchResults.length === 0 && (
        <Card className="absolute top-full mt-2 w-full z-50 shadow-lg">
          <CardContent className="p-4 text-center text-sm text-muted-foreground">
            No results found for "{searchQuery}"
          </CardContent>
        </Card>
      )}
    </div>
  );
}


