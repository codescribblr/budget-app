import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowRightLeft,
  Download,
  Upload as UploadIcon,
  Zap,
  DollarSign,
  TrendingUp,
  Calendar,
  Workflow,
  Lightbulb
} from 'lucide-react';

export default function MoneyMovementFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Money Movement', href: '/help/features/money-movement' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Money Movement</h1>
        <p className="text-lg text-muted-foreground">
          Allocate funds to categories and transfer money between envelopes
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            Money Movement is where you allocate your income to budget categories and move money
            between categories as needed. This is the core of envelope budgeting.
          </p>
        </CardContent>
      </Card>

      {/* Two Types */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Two Types of Money Movement</CardTitle>
          <CardDescription className="text-base">
            The Money Movement page has two tabs for different operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[180px]">Allocate to Envelopes</div>
              <div className="text-sm text-muted-foreground">
                Put new money into categories (when you get paid)
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[180px]">Transfer Between Envelopes</div>
              <div className="text-sm text-muted-foreground">
                Move money from one category to another
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocate to Envelopes Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Allocate to Envelopes</h2>
          <p className="text-muted-foreground">
            Use this when you receive income and need to allocate it to your budget categories.
          </p>
        </div>

        {/* Manual Allocation */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Download className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Manual Allocation</CardTitle>
                <CardDescription className="text-base">
                  Manually enter amounts for each category
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <StepList
              steps={[
                {
                  title: 'Go to Money Movement',
                  content: 'Navigate to the Money Movement page from the sidebar',
                },
                {
                  title: 'Enter amounts for each category',
                  content: 'Type the amount you want to allocate to each category',
                },
                {
                  title: 'Check Available to Save',
                  content: 'The "Available to Save" amount at the top shows how much unallocated money you have left',
                },
                {
                  title: 'Click "Allocate Funds"',
                  content: 'This will add the amounts to your category balances',
                },
              ]}
            />
            <Callout type="tip" title="Goal: Zero Available to Save">
              Keep allocating until "Available to Save" reaches zero. This means every dollar has a job!
            </Callout>
          </CardContent>
        </Card>

        {/* Use Monthly Amounts */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Use Monthly Amounts</CardTitle>
                <CardDescription className="text-base">
                  Quickly fill in all fields with your planned monthly amounts
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you've set monthly amounts for your categories, you can use the "Use Monthly Amounts"
              button to quickly fill in all the fields with your planned amounts.
            </p>
            <StepList
              steps={[
                { title: 'Click "Use Monthly Amounts"', content: 'Find and click the button' },
                { title: 'Review auto-filled amounts', content: 'All category fields will be filled with their monthly amounts' },
                { title: 'Adjust as needed', content: 'Make any necessary changes to the amounts' },
                { title: 'Click "Allocate Funds"', content: 'Save your allocations' },
              ]}
            />
            <p className="text-sm text-muted-foreground">
              This is a huge time-saver if you have a consistent budget each month!
            </p>
          </CardContent>
        </Card>

        {/* Smart Allocation */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Smart Allocation</CardTitle>
                <CardDescription className="text-base">
                  Advanced feature: Automatically allocate based on priorities
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              If you have the Smart Allocation feature enabled, the app can automatically allocate
              your money based on category priorities and types.
            </p>
            <StepList
              steps={[
                { title: 'Enter amount', content: 'Enter the amount you want to allocate (e.g., your paycheck amount)' },
                { title: 'Click "Smart Allocate"', content: 'Let the app distribute the money' },
                { title: 'Review suggestions', content: 'The app will distribute the money according to your priorities' },
                { title: 'Adjust if needed', content: 'Make any manual adjustments' },
                { title: 'Click "Allocate Funds"', content: 'Save your allocations' },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Transfer Between Envelopes */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ArrowRightLeft className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Transfer Between Envelopes</CardTitle>
              <CardDescription className="text-base">
                Move money from one category to another
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use this when you need to move money from one category to another. This is common when:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>You overspent in one category and need to cover it</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>You have extra money in one category and want to reallocate it</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Your priorities changed and you need to adjust your budget</span>
            </li>
          </ul>

          <div className="bg-muted/50 rounded-lg p-4 border mt-4">
            <p className="text-sm font-medium mb-3">How to Transfer</p>
            <StepList
              steps={[
                {
                  title: 'Go to Transfer Between Envelopes tab',
                  content: 'Click the "Transfer Between Envelopes" tab on the Money Movement page',
                },
                {
                  title: 'Select source category',
                  content: 'Choose the category you want to take money FROM',
                },
                {
                  title: 'Select destination category',
                  content: 'Choose the category you want to move money TO',
                },
                {
                  title: 'Enter amount',
                  content: 'Type how much you want to transfer',
                },
                {
                  title: 'Click "Transfer Funds"',
                  content: 'The money will be moved from one category to the other',
                },
              ]}
            />
          </div>

          <Callout type="info" title="Transfers don't affect total money">
            Transferring between categories doesn't change your total money or Available to Save.
            It just moves money from one envelope to another.
          </Callout>
        </CardContent>
      </Card>

      {/* Understanding the Numbers */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Understanding the Numbers</h2>

        {/* Available to Save */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Available to Save</CardTitle>
                <CardDescription className="text-base">
                  Money in your accounts that hasn't been allocated yet
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Shown at the top of the Allocate to Envelopes tab. This is money in your accounts that
              hasn't been allocated to any category yet.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm font-medium text-muted-foreground mb-1">Formula</p>
              <p className="text-sm font-mono">Total Money in Accounts - Total Allocated to Categories - Pending Checks</p>
            </div>
          </CardContent>
        </Card>

        {/* Category Current Balance */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Category Current Balance</CardTitle>
                <CardDescription className="text-base">
                  How much money is currently in each category
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Shown next to each category name. This is how much money is currently in that category.
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[140px]">Positive Balance</div>
                <div className="text-sm text-muted-foreground">
                  You have money allocated to this category
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[140px]">Negative Balance</div>
                <div className="text-sm text-muted-foreground">
                  You've spent more than you allocated (need to cover it)
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[140px]">Zero Balance</div>
                <div className="text-sm text-muted-foreground">
                  You've spent exactly what you allocated
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Funded This Month */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Funded This Month</CardTitle>
                <CardDescription className="text-base">
                  Available if Monthly Funding Tracking is enabled
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you have Monthly Funding Tracking enabled, you'll see how much you've allocated to
              each category in the current month. This prevents accidentally re-funding categories.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Common Workflows */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Workflow className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Common Workflows</CardTitle>
              <CardDescription className="text-base">
                Step-by-step guides for common money movement scenarios
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* When You Get Paid */}
          <div className="space-y-3">
            <h3 className="font-semibold">When You Get Paid</h3>
            <StepList
              steps={[
                { title: 'Update account balance', content: 'Update your account balance to reflect the new money' },
                { title: 'Go to Money Movement', content: 'Navigate to Money Movement → Allocate to Envelopes' },
                { title: 'Allocate the money', content: 'Allocate the money to your categories (use Monthly Amounts or Smart Allocation)' },
                { title: 'Verify zero balance', content: 'Make sure Available to Save is zero (or close to it)' },
              ]}
            />
          </div>

          {/* When You Overspend */}
          <div className="space-y-3">
            <h3 className="font-semibold">When You Overspend a Category</h3>
            <StepList
              steps={[
                { title: 'Go to Transfer tab', content: 'Navigate to Money Movement → Transfer Between Envelopes' },
                { title: 'Select source', content: 'Select a category with extra money as the source' },
                { title: 'Select destination', content: 'Select the overspent category as the destination' },
                { title: 'Transfer funds', content: 'Transfer enough to cover the negative balance' },
              ]}
            />
          </div>

          {/* When You Want to Reallocate */}
          <div className="space-y-3">
            <h3 className="font-semibold">When You Want to Reallocate</h3>
            <StepList
              steps={[
                { title: 'Go to Transfer tab', content: 'Navigate to Money Movement → Transfer Between Envelopes' },
                { title: 'Move money', content: 'Move money from categories with extra to categories that need more' },
                { title: 'Adjust as needed', content: 'Make as many transfers as needed to balance your budget' },
              ]}
            />
          </div>
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
              <CardTitle className="text-xl">Tips for Money Movement</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Allocate money as soon as you receive it - don't let it sit unallocated
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Set monthly amounts for your categories to make allocation faster
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Review your category balances before allocating to see what needs funding
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Don't be afraid to transfer between categories - flexibility is key!
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Keep Available to Save at or near zero
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">6</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                If you have irregular income, allocate conservatively and adjust as needed
              </p>
            </li>
          </ul>

          <Callout type="tip" title="The envelope budgeting mindset">
            Think of Money Movement as physically putting cash into envelopes. When you get paid,
            you divide the cash into envelopes. When you need more in one envelope, you take it
            from another. The total cash doesn't change - you're just organizing it.
          </Callout>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/money-movement" />
    </div>
  );
}


