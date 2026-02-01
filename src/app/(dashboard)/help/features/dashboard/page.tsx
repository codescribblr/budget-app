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
  Zap,
  Brain
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
          <h2 className="text-2xl font-bold mb-4">Understanding the Dashboard</h2>
          <p className="text-muted-foreground mb-6">
            The Dashboard displays summary cards at the top showing key financial metrics, followed by
            collapsible cards for managing different aspects of your finances:
          </p>
        </div>

        {/* Summary Cards */}
        <div>
          <h3 className="text-xl font-bold mb-4">Summary Cards</h3>
          <p className="text-muted-foreground mb-4">
            At the top of the Dashboard, you'll see five summary cards showing your key financial metrics:
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

          {/* Total Envelopes */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FolderOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Total Envelopes</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    The total amount of money currently allocated across all your budget categories (envelopes).
                    This includes your income buffer if you have one enabled.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This number shows in red if any of your envelopes have negative balances.
              </p>
            </CardContent>
          </Card>

          {/* Credit Card Balances */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Credit Card Balances</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    The sum of all credit card balances (money you owe) from cards included in totals.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Credit card balances are shown as negative numbers because they represent debt.
              </p>
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
                    The total value of pending checks (both income and expenses) that haven't cleared yet.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pending income checks increase your available funds, while pending expense checks reduce them.
              </p>
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
                <p className="text-sm font-mono">Total Monies - Total Envelopes - Credit Card Balances + Pending Checks</p>
              </div>
              <Callout type="tip" title="Goal: Zero Available to Save">
                Ideally, this number should be zero (or close to it). This means every dollar has been
                given a job. If it's positive, you have unallocated money. If it's negative, you've
                allocated more than you have.
              </Callout>
              <p className="text-sm text-muted-foreground">
                This number is displayed in green when positive and red when negative.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Feature Cards Section */}
        <div className="mt-8">
          <h3 className="text-xl font-bold mb-4">Feature Cards</h3>
          <p className="text-muted-foreground mb-4">
            Below the summary cards, you'll find collapsible cards for managing different aspects of your finances.
            Each card can be expanded or collapsed by clicking on its header. Your preferences are saved automatically.
          </p>
        </div>

        <div className="grid gap-6">
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
                    Displays all your budget categories (envelopes) with their current balances, spending,
                    and monthly budgets. This is the main card for managing your budget allocation.
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
                    <span>View all categories with balances and spending</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Add new categories</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Edit category balances inline</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>See year-to-date spending for each category</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Brain className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">AI Insights</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Get intelligent, personalized insights about your financial patterns and spending habits.
                    This is a premium feature that analyzes your transactions and provides actionable recommendations.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">Features:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Monthly financial insights and summaries</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Spending pattern analysis</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Actionable recommendations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Refresh insights on demand</span>
                  </li>
                </ul>
              </div>
              <Callout type="info" title="Premium Feature">
                AI Insights requires a premium subscription. If you don't have premium, you'll see an
                upgrade prompt instead of insights.
              </Callout>
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

          {/* Non-Cash Assets */}
          <Card>
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl mb-2">Non-Cash Assets</CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    Track investments, retirement accounts, real estate, vehicles, and other non-cash assets.
                    These assets are included in your net worth but don't affect your "Available to Save" calculation.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium mb-3">Available actions:</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>View all non-cash assets with current values</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Add new assets (investments, real estate, vehicles, etc.)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Update asset values inline</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>See total asset value</span>
                  </li>
                </ul>
              </div>
              <Callout type="info" title="Learn More">
                For detailed information about tracking non-cash assets, see{' '}
                <Link href="/help/features/non-cash-assets" className="text-primary hover:underline">Non-Cash Assets</Link>.
              </Callout>
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

      {/* Card Collapsibility Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Collapsible Cards</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-base leading-relaxed mb-4">
              All feature cards on the Dashboard are collapsible. Click on any card header to expand or collapse it.
              Your preferences are automatically saved, so cards will remember whether they were open or closed
              the next time you visit the Dashboard.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm font-medium mb-2">How it works:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Click the card header to toggle expand/collapse</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>When expanded, click the chevron icon in the bottom-right corner to collapse</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span>Your preferences are saved per card and persist across sessions</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
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
                  <div className="font-medium text-sm mb-1">Add Items</div>
                  <div className="text-sm text-muted-foreground">Create new accounts, categories, goals, assets, loans, etc.</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm mb-1">Update Values</div>
                  <div className="text-sm text-muted-foreground">Quickly update account balances, asset values, and category balances inline</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm mb-1">View All</div>
                  <div className="text-sm text-muted-foreground">Navigate to the full page for that feature</div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-medium text-sm mb-1">Edit & Delete</div>
                  <div className="text-sm text-muted-foreground">Access edit and delete options via the menu (three dots) on each item</div>
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



