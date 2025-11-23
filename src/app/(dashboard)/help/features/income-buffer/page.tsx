import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PiggyBank,
  Shield,
  TrendingUp,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  HelpCircle,
  Zap
} from 'lucide-react';

export default function IncomeBufferFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Income Buffer', href: '/help/features/income-buffer' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Income Buffer</h1>
        <p className="text-lg text-muted-foreground">
          Break the paycheck-to-paycheck cycle by living on last month's income
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            The Income Buffer is an advanced feature that helps you "age your money" - living on
            last month's income instead of this month's. This provides financial stability and
            reduces stress.
          </p>
        </CardContent>
      </Card>

      {/* What is the Income Buffer */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <PiggyBank className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">What is the Income Buffer?</CardTitle>
              <CardDescription className="text-base">
                A special category that holds one month (or more) of income
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The Income Buffer is a special category that holds one month (or more) of income. Instead
            of budgeting with money you just received, you budget with money you received last month.
          </p>
        </CardContent>
      </Card>

      {/* Benefits */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Benefits</CardTitle>
              <CardDescription className="text-base">
                Why the Income Buffer is so powerful
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Break the paycheck-to-paycheck cycle:</strong> You're not waiting for the next paycheck to pay bills</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Reduce stress:</strong> You know you have a full month of expenses covered</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Better planning:</strong> You can budget for the entire month at once, not piece by piece</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Handle irregular income:</strong> Smooth out income fluctuations</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Enabling the Income Buffer */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Enabling the Income Buffer</CardTitle>
              <CardDescription className="text-base">
                Turn on this feature in Settings
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <StepList
            steps={[
              { title: 'Go to Settings', content: <><Link href="/settings" className="text-primary hover:underline">Navigate to Settings</Link></> },
              { title: 'Enable feature', content: 'Enable the "Income Buffer" feature' },
              { title: 'Category created', content: 'A special "Income Buffer" category will be created' },
              { title: 'Dashboard card', content: 'An Income Buffer card will appear on your Dashboard' },
            ]}
          />
        </CardContent>
      </Card>

      <Callout type="important" title="Advanced feature">
        The Income Buffer is an advanced feature. Make sure you understand basic envelope
        budgeting before enabling it. See the{' '}
        <Link href="/help/getting-started/core-concepts" className="text-primary hover:underline">
          Core Concepts guide
        </Link>{' '}
        first.
      </Callout>

      {/* Building Your Buffer */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Building Your Buffer</h2>

        {/* Step 1 */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Step 1: Calculate Your Target</CardTitle>
                <CardDescription className="text-base">
                  Determine how much you need to buffer
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your target buffer amount is one month of expenses. Add up all your monthly expenses:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Rent/mortgage</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Utilities</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Groceries</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Transportation</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Insurance</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Other regular expenses</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Step 2: Start Small</CardTitle>
                <CardDescription className="text-base">
                  Build the buffer gradually over time
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Don't try to build the full buffer at once. Start by allocating a small amount each paycheck:
            </p>
            <StepList
              steps={[
                { title: 'Allocate to regular categories', content: 'When you get paid, allocate money to your regular categories' },
                { title: 'Add leftover to buffer', content: 'If you have anything left over, allocate it to the Income Buffer' },
                { title: 'Repeat', content: 'Repeat with each paycheck' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Step 3: Gradually Increase</CardTitle>
                <CardDescription className="text-base">
                  Watch your buffer grow over time
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              As your buffer grows, you'll have more flexibility. Eventually, you'll have a full
              month's expenses in the buffer.
            </p>
            <Callout type="tip" title="Use windfalls">
              Tax refunds, bonuses, or other unexpected income are perfect for building your buffer
              quickly!
            </Callout>
          </CardContent>
        </Card>
      </div>

      {/* Using the Income Buffer */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Using the Income Buffer</h2>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">When You Get Paid</CardTitle>
                <CardDescription className="text-base">
                  Add your paycheck to the buffer
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'Update account balance', content: 'Update your account balance to reflect the new income' },
                { title: 'Allocate to buffer', content: 'Allocate the entire paycheck to the Income Buffer category' },
                { title: 'Check Available to Save', content: 'Your "Available to Save" should be zero (or close to it)' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">At the Start of Each Month</CardTitle>
                <CardDescription className="text-base">
                  Fund your budget from the buffer
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'Go to Income Buffer page', content: <><Link href="/income-buffer" className="text-primary hover:underline">Navigate to the Income Buffer page</Link></> },
                { title: 'Click "Fund This Month"', content: 'Click the "Fund This Month" button' },
                { title: 'Auto-transfer', content: 'The app will transfer money from the buffer to your regular categories based on their monthly amounts' },
                { title: 'Adjust as needed', content: 'Adjust allocations as needed' },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <HelpCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">The Workflow</CardTitle>
                <CardDescription className="text-base">
                  How your budgeting process changes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[140px]">Without buffer</div>
                <div className="text-sm text-muted-foreground">
                  Get paid → Allocate to categories → Spend
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <div className="font-medium text-sm min-w-[140px]">With buffer</div>
                <div className="text-sm text-muted-foreground">
                  Get paid → Add to buffer → Fund month from buffer → Spend
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income Buffer and Available to Save */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Income Buffer and Available to Save</CardTitle>
              <CardDescription className="text-base">
                How the buffer affects your calculations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">The Income Buffer category is special:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>It's excluded from category dropdowns (like system categories)</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>But it's included in "Total Envelopes" calculations</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Money allocated to the buffer reduces your "Available to Save"</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            This ensures that money in the buffer is accounted for but not available for regular spending.
          </p>
        </CardContent>
      </Card>

      {/* Months of Runway */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Months of Runway</CardTitle>
              <CardDescription className="text-base">
                Track your progress toward a full buffer
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Income Buffer card shows "Months of Runway" - how many months of expenses you have buffered. This is calculated by:
          </p>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm font-medium text-muted-foreground mb-1">Formula</p>
            <p className="text-sm font-mono">Months of Runway = Buffer Balance ÷ Total Monthly Expenses</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Your goal is to reach 1.0 months (or more for extra security).
          </p>
        </CardContent>
      </Card>

      {/* Handling Irregular Income */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Handling Irregular Income</CardTitle>
              <CardDescription className="text-base">
                Perfect for freelancers and commission-based workers
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Income Buffer is especially useful if you have irregular income (freelance, commission-based, seasonal work):
          </p>
          <StepList
            steps={[
              { title: 'High-income months', content: 'In high-income months, add extra to the buffer' },
              { title: 'Low-income months', content: 'In low-income months, fund your budget from the buffer' },
              { title: 'Smooth fluctuations', content: 'The buffer smooths out the fluctuations' },
            ]}
          />
        </CardContent>
      </Card>

      {/* Disabling the Income Buffer */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Disabling the Income Buffer</CardTitle>
              <CardDescription className="text-base">
                How to turn off this feature
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">If you decide the Income Buffer isn't for you:</p>
          <StepList
            steps={[
              { title: 'Transfer money out', content: 'Transfer all money out of the Income Buffer category to other categories' },
              { title: 'Go to Settings', content: 'Go to Settings and disable the Income Buffer feature' },
              { title: 'Category removed', content: 'The Income Buffer category will be removed' },
            ]}
          />
          <Callout type="warning" title="Don't disable with money in the buffer">
            Make sure to transfer all money out of the Income Buffer category before disabling
            the feature, or you'll lose track of that money!
          </Callout>
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Tips for Success</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Start small - even a few hundred dollars is progress
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use windfalls to build the buffer quickly
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Don't get discouraged - it takes time to build a full month's buffer
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Once you have the buffer, maintain it - don't let it drain
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Consider building more than one month for extra security
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">6</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use the "Fund This Month" feature to make budgeting easier
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/income-buffer" />
    </div>
  );
}

