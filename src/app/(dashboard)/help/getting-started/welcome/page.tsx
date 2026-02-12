import Link from 'next/link';
import { ArrowRight, DollarSign, TrendingUp, Target, Shield } from 'lucide-react';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function WelcomePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Getting Started', href: '/help/getting-started/welcome' },
          { label: 'Welcome & Overview', href: '/help/getting-started/welcome' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome to Budget App</h1>
        <p className="text-lg text-muted-foreground">
          Your complete guide to mastering envelope budgeting
        </p>
      </div>

      <Callout type="tip" title="New to envelope budgeting?">
        Don't worry! This guide will walk you through everything you need to know.
        Start with our <Link href="/help/getting-started/quick-start" className="text-primary hover:underline font-medium">Quick Start Guide</Link> to get up and running in just 10 minutes.
      </Callout>

      <div className="prose dark:prose-invert max-w-none">
        <h2>What is Envelope Budgeting?</h2>
        <p>
          Envelope budgeting is a simple, powerful method for managing your money. The concept comes from
          a time when people would divide their cash into physical envelopes labeled with different spending
          categories like "Groceries," "Rent," or "Entertainment."
        </p>
        <p>
          When you got paid, you'd put money into each envelope based on your budget. When you needed to buy
          groceries, you'd take money from the Groceries envelope. Once an envelope was empty, you couldn't
          spend any more in that category until the next paycheck.
        </p>
        <p>
          This app brings that same concept into the digital age, making it easier to track, allocate, and
          manage your money across all your spending categories.
        </p>

        <h2>How This App Helps You Budget</h2>
        <p>
          Budget App gives you complete control over your finances with these key features:
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-lg">Track Every Dollar</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Know exactly where your money is and where it's going. Every dollar has a job.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg">Plan Ahead</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set monthly amounts for each category and track your progress throughout the month.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
                <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-lg">Reach Your Goals</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Save for specific goals, track debt payoff, and build your emergency fund.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-lg">Stay in Control</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Never overspend again. See your available balance in each category before you spend.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <h2>Key Features Overview</h2>
        <ul>
          <li><strong>Dashboard:</strong> See your complete financial picture at a glance</li>
          <li><strong>Budget Categories (Envelopes):</strong> Create and manage your spending categories</li>
          <li><strong>Accounts & Credit Cards:</strong> Track all your accounts in one place</li>
          <li><strong>Transactions:</strong> Record and categorize every transaction</li>
          <li><strong>Money Movement:</strong> Allocate income to categories and transfer between envelopes</li>
          <li><strong>CSV Import:</strong> Import transactions from your bank</li>
          <li><strong>Auto-Categorization:</strong> Automatically categorize recurring transactions</li>
          <li><strong>Goals:</strong> Save for specific financial goals</li>
          <li><strong>Loans:</strong> Track debt and plan payoff strategies</li>
          <li><strong>Reports:</strong> Analyze your spending patterns and trends</li>
        </ul>

        <p className="text-muted-foreground">
          Curious what else the app can do? Explore and enable optional features (including Premium) under <Link href="/settings" className="text-primary hover:underline font-medium">Settings → Features</Link>.
        </p>

        <h2>Next Steps</h2>
        <p>
          Ready to get started? Here's what we recommend:
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button asChild size="lg">
          <Link href="/help/getting-started/quick-start">
            Quick Start Guide
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/help/getting-started/core-concepts">
            Learn Core Concepts
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/help/wizards/budget-setup">
            Run Setup Wizard
          </Link>
        </Button>
      </div>

      <WasThisHelpful articlePath="/help/getting-started/welcome" />
    </div>
  );
}


