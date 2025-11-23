import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Banknote,
  Plus,
  Percent,
  Calendar,
  DollarSign,
  TrendingDown,
  CreditCard,
  Target,
  Zap,
  Edit3,
  Lightbulb
} from 'lucide-react';

export default function LoansFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Loans', href: '/help/features/loans' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Loans</h1>
        <p className="text-lg text-muted-foreground">
          Track mortgages, car loans, student loans, and other debt
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            The Loans feature helps you track all your debt in one place - mortgages, car loans,
            student loans, personal loans, and more. It shows you how much you owe and helps you
            plan your payments.
          </p>
        </CardContent>
      </Card>

      {/* Adding a Loan */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Adding a Loan</CardTitle>
              <CardDescription className="text-base">
                Track a new loan in just a few steps
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepList
            steps={[
              { title: 'Go to Dashboard', content: 'Navigate to your Dashboard' },
              { title: 'Click "Add Loan"', content: 'In the Loans card, click "Add Loan"' },
              { title: 'Enter loan details', content: 'Fill in the loan information (see fields below)' },
              { title: 'Click "Add Loan"', content: 'Save your new loan' },
            ]}
          />
          <div className="bg-muted/50 rounded-lg p-4 border mt-4">
            <p className="text-sm font-medium mb-3">Loan Details to Enter:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Loan name:</strong> Descriptive name (e.g., "Mortgage", "Car Loan", "Student Loan")</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Current balance:</strong> How much you currently owe</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Interest rate:</strong> Annual percentage rate (APR)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Minimum payment:</strong> Monthly minimum payment amount</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Payment due date:</strong> Day of the month the payment is due</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Include in net worth:</strong> Whether to include this loan in net worth calculations</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Loan Fields */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Loan Fields Explained</h2>

        {/* Loan Name */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Banknote className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Loan Name</CardTitle>
                <CardDescription className="text-base">
                  Use a descriptive name that helps you identify the loan
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">Include the type and purpose:</p>
            <div className="grid gap-2">
              <div className="p-2 bg-muted/50 rounded text-sm">"Mortgage - 123 Main St"</div>
              <div className="p-2 bg-muted/50 rounded text-sm">"Car Loan - Honda Civic"</div>
              <div className="p-2 bg-muted/50 rounded text-sm">"Student Loan - Federal"</div>
              <div className="p-2 bg-muted/50 rounded text-sm">"Personal Loan - Home Renovation"</div>
            </div>
          </CardContent>
        </Card>

        {/* Current Balance */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Current Balance</CardTitle>
                <CardDescription className="text-base">
                  The amount you currently owe on the loan
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Update this regularly (monthly) to track your progress paying it down.
            </p>
          </CardContent>
        </Card>

        {/* Interest Rate */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Percent className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Interest Rate</CardTitle>
                <CardDescription className="text-base">
                  The annual percentage rate (APR) for the loan
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This is used for informational purposes and to calculate interest if you want to track it.
            </p>
          </CardContent>
        </Card>

        {/* Minimum Payment */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Minimum Payment</CardTitle>
                <CardDescription className="text-base">
                  The minimum amount you must pay each month
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This helps you budget for the payment.
            </p>
            <Callout type="tip" title="Budget for loan payments">
              Create a budget category for each loan payment. Allocate the minimum payment amount
              (or more) to that category each month to ensure you have the funds available.
            </Callout>
          </CardContent>
        </Card>

        {/* Payment Due Date */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Payment Due Date</CardTitle>
                <CardDescription className="text-base">
                  The day of the month your payment is due
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This helps you remember when to make payments and avoid late fees.
            </p>
          </CardContent>
        </Card>

        {/* Include in Net Worth */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <TrendingDown className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Include in Net Worth</CardTitle>
                <CardDescription className="text-base">
                  Whether the loan is included in net worth calculations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[140px]">Include (default)</div>
                <div className="text-sm text-muted-foreground">
                  Most loans should be included. They're liabilities that reduce your net worth.
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[140px]">Exclude</div>
                <div className="text-sm text-muted-foreground">
                  You might exclude loans that are offset by assets not tracked in the app (e.g., a mortgage on a rental property you don't track).
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Updating Loan Balances */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingDown className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Updating Loan Balances</CardTitle>
              <CardDescription className="text-base">
                Track your progress by updating balances monthly
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepList
            steps={[
              { title: 'Open loan menu', content: 'Click the "..." menu on a loan' },
              { title: 'Select "Update Balance"', content: 'Choose the update balance option' },
              { title: 'Enter new balance', content: 'Enter the new balance from your loan statement' },
              { title: 'Click "Update"', content: 'Save the updated balance' },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            Watching the balance decrease over time is motivating!
          </p>
        </CardContent>
      </Card>

      {/* Loans vs Credit Cards */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Loans vs. Credit Cards</CardTitle>
              <CardDescription className="text-base">
                Understanding the difference in how they're tracked
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[120px]">Loans</div>
              <div className="text-sm text-muted-foreground">
                Fixed balance that decreases over time with payments. You enter the current balance directly.
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[120px]">Credit Cards</div>
              <div className="text-sm text-muted-foreground">
                Revolving credit with a limit. You enter the credit limit and available credit, and the app calculates the balance.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loans and Your Budget */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Loans and Your Budget</h2>
          <p className="text-muted-foreground">
            Loans don't directly affect your "Available to Save" or "Total Monies" calculations
            because they're not cash accounts. However, they do affect your net worth.
          </p>
        </div>

        {/* Budgeting for Loan Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Budgeting for Loan Payments</CardTitle>
                <CardDescription className="text-base">
                  Create budget categories for your loan payments
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'Create categories', content: 'Create a category for each loan (e.g., "Mortgage Payment", "Car Payment")' },
                { title: 'Set monthly amounts', content: 'Set the monthly amount to the minimum payment (or more if you want to pay extra)' },
                { title: 'Allocate monthly', content: 'Allocate money to these categories each month' },
                { title: 'Record payments', content: 'When you make the payment, record it as a transaction in that category' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Paying Down Debt */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Paying Down Debt</CardTitle>
                <CardDescription className="text-base">
                  Make extra payments to reduce your debt faster
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'Create extra payment category', content: 'Create a category called "Extra Debt Payment" or similar' },
                { title: 'Allocate extra funds', content: 'Allocate extra money to this category when you have it' },
                { title: 'Make additional payments', content: 'Use this money to make additional payments on your loans' },
                { title: 'Update loan balance', content: 'Update the loan balance after making the extra payment' },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Debt Payoff Strategies */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Debt Payoff Strategies</h2>
          <p className="text-muted-foreground">
            The app doesn't enforce a specific debt payoff strategy, but you can implement common strategies yourself:
          </p>
        </div>

        {/* Debt Snowball */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Debt Snowball</CardTitle>
                <CardDescription className="text-base">
                  Pay off smallest balances first for psychological wins
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'List loans by balance', content: 'List your loans from smallest to largest balance' },
                { title: 'Pay minimums', content: 'Pay minimums on all loans' },
                { title: 'Attack smallest', content: 'Put extra money toward the smallest loan' },
                { title: 'Roll payments', content: 'When it\'s paid off, roll that payment into the next smallest' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Debt Avalanche */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Percent className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Debt Avalanche</CardTitle>
                <CardDescription className="text-base">
                  Pay off highest interest rates first to save money
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <StepList
              steps={[
                { title: 'List loans by rate', content: 'List your loans from highest to lowest interest rate' },
                { title: 'Pay minimums', content: 'Pay minimums on all loans' },
                { title: 'Attack highest rate', content: 'Put extra money toward the highest interest loan' },
                { title: 'Roll payments', content: 'When it\'s paid off, roll that payment into the next highest rate' },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Editing and Deleting */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Editing and Deleting Loans</CardTitle>
              <CardDescription className="text-base">
                Modify or remove loans at any time
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[60px]">Edit</div>
              <div className="text-sm text-muted-foreground">
                Click the "..." menu and select "Edit" to change any loan details
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[60px]">Delete</div>
              <div className="text-sm text-muted-foreground">
                Click the "..." menu and select "Delete" to remove the loan (use this when a loan is paid off!)
              </div>
            </div>
          </div>
          <Callout type="info" title="Celebrate payoffs!">
            When you pay off a loan, don't delete it right away! Leave it visible for a few days
            to celebrate your achievement. Then delete it and reallocate that payment money to
            other goals.
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
              <CardTitle className="text-xl">Tips for Managing Loans</CardTitle>
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
                Update balances monthly to track progress
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Create budget categories for each loan payment
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Set up automatic payments to avoid late fees
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Consider paying extra when possible to reduce interest
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Focus on high-interest debt first (unless using debt snowball)
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">6</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Track your total debt over time to see progress
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">7</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Celebrate milestones (25% paid off, 50% paid off, etc.)
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/loans" />
    </div>
  );
}

