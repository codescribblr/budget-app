import Link from 'next/link';
import {
  ArrowRight,
  DollarSign,
  TrendingUp,
  Target,
  Shield,
  Mail,
  LayoutDashboard,
  Wallet,
  Receipt,
  ArrowLeftRight,
  FileSpreadsheet,
  Sparkles,
  Flag,
  Landmark,
  BarChart3,
  Settings,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const FEATURES = [
  { icon: LayoutDashboard, label: 'Dashboard', desc: 'Complete financial picture at a glance' },
  { icon: Mail, label: 'Budget Categories', desc: 'Create and manage spending envelopes' },
  { icon: Wallet, label: 'Accounts & Credit Cards', desc: 'Track all accounts in one place' },
  { icon: Receipt, label: 'Transactions', desc: 'Record and categorize every transaction' },
  { icon: ArrowLeftRight, label: 'Money Movement', desc: 'Allocate income and transfer between envelopes' },
  { icon: FileSpreadsheet, label: 'CSV Import', desc: 'Import transactions from your bank' },
  { icon: Sparkles, label: 'Auto-Categorization', desc: 'Categorize recurring transactions automatically' },
  { icon: Flag, label: 'Goals', desc: 'Save for specific financial goals' },
  { icon: Landmark, label: 'Loans', desc: 'Track debt and plan payoff strategies' },
  { icon: BarChart3, label: 'Reports', desc: 'Analyze spending patterns and trends' },
] as const;

export default function WelcomePage() {
  return (
    <div className="space-y-10">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Getting Started', href: '/help/getting-started/welcome' },
          { label: 'Welcome & Overview', href: '/help/getting-started/welcome' },
        ]}
      />

      {/* Hero */}
      <div className="rounded-xl border bg-muted/30 px-6 py-8 md:px-8">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Welcome to Budget App</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Your complete guide to mastering envelope budgeting
        </p>
        <Callout type="tip" title="New to envelope budgeting?">
          Don't worry! This guide will walk you through everything you need to know.
          Start with our <Link href="/help/getting-started/quick-start" className="font-medium text-primary hover:underline">Quick Start Guide</Link> to get up and running in just 10 minutes.
        </Callout>
      </div>

      {/* What is Envelope Budgeting */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background">
            <Mail className="h-5 w-5 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">What is Envelope Budgeting?</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Envelope budgeting is a simple, powerful method for managing your money. The concept comes from
              a time when people would divide their cash into physical envelopes labeled with different spending
              categories like "Groceries," "Rent," or "Entertainment."
            </p>
            <div className="my-5 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-800 dark:bg-amber-950/20">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                When you got paid, you put money into each envelope. When you needed to buy groceries, you took from the Groceries envelope. Empty envelope = no more spending in that category until the next paycheck.
              </p>
            </div>
            <p className="text-muted-foreground">
              This app brings that same concept into the digital age, making it easier to track, allocate, and
              manage your money across all your spending categories.
            </p>
          </CardContent>
        </Card>
      </section>

      <Separator className="my-8" />

      {/* How This App Helps */}
      <section>
        <h2 className="mb-1 text-xl font-semibold">How This App Helps You Budget</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Budget App gives you complete control over your finances with these pillars:
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/30">
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50 dark:bg-green-950/30">
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/30">
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
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-50 dark:bg-orange-950/30">
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
      </section>

      <Separator className="my-8" />

      {/* Key Features Overview */}
      <section>
        <h2 className="mb-5 text-xl font-semibold">Key Features at a Glance</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Explore and enable optional features (including Premium) under{' '}
          <Link href="/settings" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
            <Settings className="h-3.5 w-3.5" /> Settings → Features
          </Link>.
        </p>
      </section>

      <Separator className="my-8" />

      {/* Next Steps */}
      <section>
        <h2 className="mb-1 text-xl font-semibold">Next Steps</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          Ready to get started? Pick a path below:
        </p>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:flex-wrap">
            <Button asChild size="lg">
              <Link href="/help/getting-started/quick-start">
                Quick Start Guide
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/help/getting-started/core-concepts">Learn Core Concepts</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/help/wizards/budget-setup">Run Setup Wizard</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <WasThisHelpful articlePath="/help/getting-started/welcome" />
    </div>
  );
}


