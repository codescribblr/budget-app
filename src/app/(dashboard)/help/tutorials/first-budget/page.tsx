import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { StepList } from '@/components/help/StepList';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import Link from 'next/link';

export default function FirstBudgetTutorialPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Tutorials', href: '/help' },
          { label: 'First Budget', href: '/help/tutorials/first-budget' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Tutorial: Setting Up Your First Budget</h1>
        <p className="text-lg text-muted-foreground">
          A complete walkthrough for creating your first budget from scratch
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          This tutorial will walk you through every step of creating your first budget. By the
          end, you'll have a working budget and understand how to use it effectively.
        </p>

        <Callout type="info" title="Time required">
          This tutorial takes about 30-45 minutes to complete. You can pause and come back
          anytime!
        </Callout>

        <h2>Before You Begin</h2>
        <p>Gather the following information:</p>
        <ul>
          <li>Current balance of all your bank accounts</li>
          <li>Current balance of all your credit cards</li>
          <li>Your monthly take-home income</li>
          <li>A list of your regular monthly bills</li>
          <li>Recent bank statements (optional, but helpful)</li>
        </ul>

        <h2>Step-by-Step Tutorial</h2>

        <StepList
          steps={[
            {
              title: 'Add Your Accounts',
              content: (
                <>
                  <p>Start by adding all your bank accounts:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to the Dashboard</li>
                    <li>Click "Add Account" in the Accounts card</li>
                    <li>Enter your checking account name and current balance</li>
                    <li>Click "Add Account"</li>
                    <li>Repeat for any savings accounts</li>
                  </ol>
                  <Callout type="tip" title="Tip">
                    Only add accounts you actively use for budgeting. Don't include retirement
                    accounts or investment accounts.
                  </Callout>
                </>
              ),
            },
            {
              title: 'Add Your Credit Cards',
              content: (
                <>
                  <p>Next, add any credit cards you use:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Click "Add Credit Card" in the Credit Cards section</li>
                    <li>Enter the card name and current balance (as a positive number)</li>
                    <li>Enter the credit limit</li>
                    <li>Click "Add Credit Card"</li>
                  </ol>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Note: Enter credit card balances as positive numbers. The app will track
                    them as debt.
                  </p>
                </>
              ),
            },
            {
              title: 'Create Your Categories',
              content: (
                <>
                  <p>Now create categories for your spending:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>
                      Go to the{' '}
                      <Link href="/income" className="text-primary hover:underline">
                        Income page
                      </Link>
                    </li>
                    <li>Click "Add Category"</li>
                    <li>Enter a category name (e.g., "Groceries")</li>
                    <li>Set the monthly amount (how much you plan to spend)</li>
                    <li>Click "Add Category"</li>
                    <li>Repeat for all your categories</li>
                  </ol>
                  <Callout type="info" title="Suggested categories">
                    Start with these essential categories: Rent/Mortgage, Utilities, Groceries,
                    Transportation, Insurance, Dining Out, Entertainment, Clothing, Personal
                    Care, Emergency Fund, Savings, Miscellaneous.
                  </Callout>
                </>
              ),
            },
            {
              title: 'Allocate Your Current Money',
              content: (
                <>
                  <p>Assign your current money to categories:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>
                      Go to the{' '}
                      <Link href="/money-movement" className="text-primary hover:underline">
                        Money Movement page
                      </Link>
                    </li>
                    <li>Look at "Available to Save" - this is your current unallocated money</li>
                    <li>For each category, enter how much money to allocate</li>
                    <li>Click "Allocate" for each category</li>
                    <li>Continue until "Available to Save" is zero (or close to it)</li>
                  </ol>
                  <Callout type="tip" title="Allocation strategy">
                    Allocate money based on what you need before your next paycheck. Bills due
                    soon should get priority. Don't worry about being perfect - you can adjust
                    later!
                  </Callout>
                </>
              ),
            },
            {
              title: 'Record Your First Transaction',
              content: (
                <>
                  <p>Practice recording a transaction:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>
                      Go to the{' '}
                      <Link href="/transactions" className="text-primary hover:underline">
                        Transactions page
                      </Link>
                    </li>
                    <li>Click "Add Transaction"</li>
                    <li>Enter the date, description, and amount</li>
                    <li>Select the category</li>
                    <li>Select which account the money came from</li>
                    <li>Click "Add Transaction"</li>
                  </ol>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The category balance will decrease by the transaction amount. This is how
                    you track spending!
                  </p>
                </>
              ),
            },
            {
              title: 'Set Up CSV Import (Optional)',
              content: (
                <>
                  <p>Save time by importing transactions from your bank:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Download a CSV file from your bank</li>
                    <li>
                      Go to the{' '}
                      <Link href="/import" className="text-primary hover:underline">
                        Import page
                      </Link>
                    </li>
                    <li>Upload your CSV file</li>
                    <li>Map the columns to match the app's format</li>
                    <li>Review and import the transactions</li>
                  </ol>
                  <Callout type="info" title="Save your template">
                    After mapping columns once, save it as a template. Future imports from the
                    same bank will be much faster!
                  </Callout>
                </>
              ),
            },
            {
              title: 'Review Your Budget',
              content: (
                <>
                  <p>Check that everything looks correct:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to the Dashboard</li>
                    <li>Verify your account balances are correct</li>
                    <li>Check that category balances make sense</li>
                    <li>Look at "Available to Save" - it should be close to zero</li>
                    <li>Review your transactions</li>
                  </ol>
                  <p className="mt-2">
                    If something doesn't look right, you can edit or delete transactions,
                    adjust allocations, or modify categories.
                  </p>
                </>
              ),
            },
          ]}
        />

        <h2>What's Next?</h2>
        <p>Now that your budget is set up, here's what to do going forward:</p>

        <h3>Daily/Weekly Tasks</h3>
        <ul>
          <li>Record transactions as they happen (or import them weekly)</li>
          <li>Check category balances before making purchases</li>
          <li>Update account balances weekly</li>
        </ul>

        <h3>When You Get Paid</h3>
        <ol>
          <li>Update your account balance with the new deposit</li>
          <li>
            Go to Money Movement and allocate the new money to categories based on your monthly
            amounts
          </li>
          <li>Adjust allocations if needed based on what's coming up</li>
        </ol>

        <h3>Monthly Tasks</h3>
        <ul>
          <li>
            Review your{' '}
            <Link href="/reports" className="text-primary hover:underline">
              spending reports
            </Link>
          </li>
          <li>Adjust category monthly amounts based on actual spending</li>
          <li>Update loan balances if you have any</li>
          <li>Check progress on your goals</li>
        </ul>

        <h2>Tips for Success</h2>
        <ul>
          <li>
            <strong>Be consistent:</strong> Record transactions regularly, don't let them pile up
          </li>
          <li>
            <strong>Be flexible:</strong> Your budget will evolve. Adjust categories and amounts
            as you learn
          </li>
          <li>
            <strong>Be honest:</strong> Record all spending, even the embarrassing stuff. You
            can't fix what you don't track
          </li>
          <li>
            <strong>Be patient:</strong> It takes 2-3 months to get a realistic budget. Don't
            give up!
          </li>
          <li>
            <strong>Use reports:</strong> Review your spending monthly to find opportunities to
            save
          </li>
        </ul>

        <h2>Common Questions</h2>
        <p>
          Check the{' '}
          <Link href="/help/faq/getting-started" className="text-primary hover:underline">
            Getting Started FAQ
          </Link>{' '}
          for answers to common questions about budgeting.
        </p>

        <Callout type="tip" title="Congratulations!">
          You've created your first budget! The hardest part is done. Now it's just about
          building the habit of tracking your spending and adjusting as you go.
        </Callout>
      </div>

      <WasThisHelpful articlePath="/help/tutorials/first-budget" />
    </div>
  );
}

