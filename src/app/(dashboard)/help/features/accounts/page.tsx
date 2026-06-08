import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { InlineCode } from '@/components/help/CodeBlock';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, CreditCard, Check, X, RefreshCw, Lightbulb } from 'lucide-react';

export default function AccountsFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Accounts & Credit Cards', href: '/help/features/accounts' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Accounts & Credit Cards</h1>
        <p className="text-lg text-muted-foreground">
          Track your cash-based accounts (bank accounts) and credit cards in one place
        </p>
      </div>

      {/* Bank Accounts Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Bank Accounts (Cash-Based Accounts)</h2>
          <p className="text-muted-foreground">
            Accounts represent your cash-based accounts - checking accounts, savings accounts,
            cash on hand, etc. They track the actual cash balance in each location. These are
            accounts where you can easily access and spend money for your budget.
          </p>
          <Callout type="info" title="What about investments and retirement accounts?">
            Investment accounts, retirement accounts (401(k), IRA, etc.), and other non-cash assets
            should be tracked using our <Link href="/help/features/non-cash-assets" className="text-primary hover:underline font-medium">Non-Cash Assets</Link> feature,
            not as cash accounts. This keeps your budget focused on spendable cash while still tracking
            your complete net worth.
          </Callout>
        </div>

        {/* Adding an Account */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Adding an Account</CardTitle>
                <CardDescription className="text-base">
                  Follow these steps to add a new bank account to your budget
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'Go to the Dashboard', content: 'Navigate to your main dashboard page' },
                { title: 'Click "Add Account"', content: 'Find the Accounts card and click the "Add Account" button' },
                { title: 'Enter account details', content: 'Provide the account name (e.g., "Chase Checking", "Emergency Savings") and current balance' },
                { title: 'Set inclusion preference', content: 'Choose whether to include it in totals (see below for guidance)' },
                { title: 'Save', content: 'Click "Add Account" to save your new account' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Include in Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Include in Totals</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              Each account has an "Include in Totals" toggle that determines whether the account balance
              is included in your "Total Monies" and "Available to Save" calculations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {/* When to Include */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-green-500/10 rounded">
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold">When to Include</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400 mt-1.5 flex-shrink-0" />
                    <span>Checking accounts you use for daily spending</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400 mt-1.5 flex-shrink-0" />
                    <span>Savings accounts that are part of your budget</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-green-600 dark:bg-green-400 mt-1.5 flex-shrink-0" />
                    <span>Cash on hand</span>
                  </li>
                </ul>
              </div>

              {/* When to Exclude */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 bg-red-500/10 rounded">
                    <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="font-semibold">When to Exclude</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400 mt-1.5 flex-shrink-0" />
                    <span>
                      Investment accounts (stocks, bonds, mutual funds) - use{' '}
                      <Link href="/help/features/non-cash-assets" className="text-primary hover:underline">Non-Cash Assets</Link> instead
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400 mt-1.5 flex-shrink-0" />
                    <span>
                      Retirement accounts (401(k), IRA, 403(b), etc.) - use{' '}
                      <Link href="/help/features/non-cash-assets" className="text-primary hover:underline">Non-Cash Assets</Link> instead
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400 mt-1.5 flex-shrink-0" />
                    <span>Accounts you're tracking but not budgeting (e.g., a child's savings account)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-600 dark:bg-red-400 mt-1.5 flex-shrink-0" />
                    <span>Accounts with restrictions (e.g., escrow accounts)</span>
                  </li>
                </ul>
              </div>
            </div>

            <Callout type="tip" title="Why exclude accounts?">
              Excluding accounts lets you track them without affecting your budget. For example, you might
              want to see a child's savings account balance on the dashboard, but you don't want that money
              included in your "Available to Save" since it's not part of your budget.
            </Callout>
            <Callout type="info" title="Investment and retirement accounts">
              Investment and retirement accounts should not be added as cash accounts at all. Instead, use
              the <Link href="/help/features/non-cash-assets" className="text-primary hover:underline font-medium">Non-Cash Assets</Link> feature
              to track them. This keeps your budget focused on spendable cash while still including these
              assets in your net worth calculations.
            </Callout>
          </CardContent>
        </Card>

        {/* Updating Balances */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Updating Account Balances</CardTitle>
                <CardDescription className="text-base">
                  Keep your account balances up to date to ensure your budget is accurate
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <StepList
              steps={[
                { title: 'Open account menu', content: 'Click the "..." menu on an account' },
                { title: 'Select "Update Balance"', content: 'Choose the update option from the menu' },
                { title: 'Enter new balance', content: 'Type in the new balance from your bank' },
                { title: 'Save changes', content: 'Click "Update" to save the new balance' },
              ]}
            />
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm font-medium mb-1">Recommended Update Frequency</p>
              <p className="text-sm text-muted-foreground">
                Update balances whenever you check your bank account, or at least weekly. More frequent updates = more accurate budget.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Credit Cards Section */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Credit Cards</h2>
          <p className="text-muted-foreground">
            Credit cards work differently from bank accounts. Instead of tracking a balance, you track
            your credit limit and available credit. The app calculates how much you owe.
          </p>
        </div>

        {/* Adding a Credit Card */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Adding a Credit Card</CardTitle>
                <CardDescription className="text-base">
                  Follow these steps to add a credit card to your budget
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'Go to the Dashboard', content: 'Navigate to your main dashboard page' },
                { title: 'Click "Add Credit Card"', content: 'Find the Credit Cards card and click the "Add Credit Card" button' },
                { title: 'Enter card name', content: 'Provide the card name (e.g., "Chase Sapphire", "Discover")' },
                { title: 'Enter credit limit', content: 'Type in your credit limit (the maximum you can charge)' },
                { title: 'Enter available credit', content: 'Type in your available credit (how much you can still charge)' },
                { title: 'Save', content: 'Click "Add Credit Card" to save your new card' },
              ]}
            />
          </CardContent>
        </Card>

        {/* How Balances Are Calculated */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">How Credit Card Balances Are Calculated</CardTitle>
            <CardDescription className="text-base">
              The app automatically calculates your credit card balance based on your limit and available credit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm font-medium text-muted-foreground mb-1">Formula</p>
              <p className="text-sm font-mono">Balance = Credit Limit - Available Credit</p>
            </div>
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
              <p className="text-sm font-medium mb-2">Example</p>
              <p className="text-sm text-muted-foreground">
                If you have a <strong>$5,000</strong> credit limit and <strong>$3,200</strong> available credit,
                your balance (what you owe) is <strong>$1,800</strong>.
              </p>
            </div>
            <Callout type="info" title="Why track it this way?">
              Most credit card statements show your available credit, not your balance. This makes it
              easier to enter the information directly from your statement or online banking.
            </Callout>
          </CardContent>
        </Card>

        {/* Updating Credit Cards */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Updating Credit Card Balances</CardTitle>
                <CardDescription className="text-base">
                  Update your credit cards regularly to track your spending
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'Open card menu', content: 'Click the "..." menu on a credit card' },
                { title: 'Select "Update Balance"', content: 'Choose the update option from the menu' },
                { title: 'Enter new available credit', content: 'Type in the new available credit from your statement' },
                { title: 'Save changes', content: 'Click "Update" to save the new balance' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Credit Cards and Budget */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Credit Cards and Your Budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Credit card balances are shown as negative numbers on the dashboard because they represent
              money you owe. They don't affect your "Available to Save" calculation directly, but they
              do affect your net worth.
            </p>
            <Callout type="tip" title="Best Practice">
              Create a budget category for "Credit Card Payment" and allocate money to it each month.
              This ensures you have the funds set aside to pay your credit card bill.
            </Callout>
          </CardContent>
        </Card>
      </div>

      {/* Editing and Deleting Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Editing and Deleting</CardTitle>
          <CardDescription className="text-base">
            You can edit or delete accounts and credit cards at any time
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[80px]">Edit</div>
              <div className="text-sm text-muted-foreground">
                Click the "..." menu and select "Edit" to change the name or settings
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[80px]">Delete</div>
              <div className="text-sm text-muted-foreground">
                Click the "..." menu and select "Delete" to remove the account
              </div>
            </div>
          </div>
          <Callout type="warning" title="Deleting accounts">
            Deleting an account doesn't delete the transactions associated with it. However, it will
            affect your "Total Monies" and "Available to Save" calculations. Make sure you've accounted
            for the money before deleting an account.
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
              <CardTitle className="text-xl">Tips for Managing Accounts</CardTitle>
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
                Update balances regularly - weekly at minimum
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use descriptive names that match your bank statements
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Only include accounts you're actively budgeting in totals
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Keep credit card balances up to date to avoid overspending
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Review your accounts monthly to ensure everything is accurate
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/accounts" />
    </div>
  );
}


