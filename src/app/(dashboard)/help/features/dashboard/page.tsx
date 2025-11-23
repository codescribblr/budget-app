import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { InlineCode } from '@/components/help/CodeBlock';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Wallet,
  PiggyBank,
  FolderOpen,
  Building2,
  CreditCard,
  FileCheck,
  Landmark,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react';

export default function DashboardFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Dashboard', href: '/help/features/dashboard' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-lg text-muted-foreground">
          Your complete financial overview at a glance
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            The Dashboard is your financial command center. It shows you everything you need to know
            about your money in one place: how much you have, where it's allocated, and what you owe.
          </p>
        </CardContent>
      </Card>

      {/* Summary Cards Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Understanding the Summary Cards</h2>
          <p className="text-muted-foreground mb-6">
            The Dashboard displays several cards, each showing a different aspect of your finances:
          </p>
        </div>

        <div className="grid gap-6">
          {/* Total Monies */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Total Monies</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    The sum of all money in your accounts that are included in totals. This represents
                    the actual cash you have available across all your bank accounts and savings.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="text-sm font-medium text-muted-foreground mb-1">Formula</p>
                <p className="text-sm font-mono">Sum of all account balances (where include_in_totals = true)</p>
              </div>
            </CardContent>
          </Card>

          {/* Available to Save */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <PiggyBank className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Available to Save</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    One of the most important numbers in envelope budgeting. This shows how much money
                    you have that hasn't been allocated to any category yet.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 border">
                <p className="text-sm font-medium text-muted-foreground mb-1">Formula</p>
                <p className="text-sm font-mono">Total Monies - Total Allocated to Categories - Pending Checks</p>
              </div>
              <Callout type="tip" title="Goal: Zero Available to Save">
                Ideally, this number should be zero (or close to it). This means every dollar has been
                given a job. If it's positive, you have unallocated money. If it's negative, you've
                allocated more than you have.
              </Callout>
            </CardContent>
          </Card>

          {/* Budget Categories */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FolderOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Budget Categories (Envelopes)</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Shows the total amount of money currently allocated across all your budget categories.
                    This is money that has been assigned a specific purpose.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Click <strong>View All</strong> to see the full list of categories, or <strong>Add Category</strong> to create a new one.
              </p>
            </CardContent>
          </Card>

          {/* Accounts */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Accounts</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Lists all your bank accounts with their current balances.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">Available actions:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Add new accounts
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Update account balances
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Toggle whether an account is included in totals
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Delete accounts you no longer use
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Credit Cards */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Credit Cards</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Shows all your credit cards with detailed information about limits and balances.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium text-sm min-w-[140px]">Credit Limit</div>
                  <div className="text-sm text-muted-foreground">Your maximum credit line</div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium text-sm min-w-[140px]">Available Credit</div>
                  <div className="text-sm text-muted-foreground">How much credit you have left</div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <div className="font-medium text-sm min-w-[140px]">Balance</div>
                  <div className="text-sm text-muted-foreground">How much you owe (Limit - Available)</div>
                </div>
              </div>
              <Callout type="info">
                Credit card balances are shown as negative numbers because they represent money you owe.
              </Callout>
            </CardContent>
          </Card>

          {/* Pending Checks */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileCheck className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Pending Checks</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Tracks checks you've written but haven't cleared yet. This helps you avoid overdrafts by
                    accounting for money that's already committed but hasn't left your account yet.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pending checks reduce your <strong>Available to Save</strong> amount.
              </p>
            </CardContent>
          </Card>

          {/* Loans */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Landmark className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Loans</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Shows all your loans (mortgages, car loans, student loans, etc.) with detailed information.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">Tracked information:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Current balance
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Interest rate
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Minimum payment
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Payment due date
                  </li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                Loans can be included or excluded from net worth calculations.
              </p>
            </CardContent>
          </Card>

          {/* Goals */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Goals</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Displays your financial goals and progress toward them.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">Each goal shows:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Target amount
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Current amount saved
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Progress percentage
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Target date (if set)
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Income Buffer */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Income Buffer</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    If you have the Income Buffer feature enabled, you'll see a card showing your buffer status.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">Displays:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Current buffer balance
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Months of runway (how many months of expenses you have buffered)
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    Quick actions to add to or fund from the buffer
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Quick Actions</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-base leading-relaxed mb-4">
              Each card has quick action buttons to perform common tasks without leaving the Dashboard:
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm mb-1">Add Account/Category/Goal</div>
                  <div className="text-sm text-muted-foreground">Create new items</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm mb-1">Update Balance</div>
                  <div className="text-sm text-muted-foreground">Quickly update account balances</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm mb-1">View All</div>
                  <div className="text-sm text-muted-foreground">Navigate to the full page for that feature</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Tips for Using the Dashboard</h2>
        <Card>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <p className="text-sm text-muted-foreground pt-0.5">
                  Check your Dashboard daily to stay on top of your finances
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <p className="text-sm text-muted-foreground pt-0.5">
                  Keep "Available to Save" at or near zero by allocating all your money
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <p className="text-sm text-muted-foreground pt-0.5">
                  Update account balances regularly to keep your budget accurate
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">4</span>
                </div>
                <p className="text-sm text-muted-foreground pt-0.5">
                  Use the Dashboard as your starting point each time you open the app
                </p>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <WasThisHelpful articlePath="/help/features/dashboard" />
    </div>
  );
}


