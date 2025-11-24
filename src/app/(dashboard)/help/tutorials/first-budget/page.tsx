import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { StepList } from '@/components/help/StepList';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { RelatedArticles } from '@/components/help/RelatedArticles';
import { PrintButton } from '@/components/help/PrintButton';
import { VisualChecklist } from '@/components/help/VisualChecklist';
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

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Tutorial: Setting Up Your First Budget</h1>
          <p className="text-lg text-muted-foreground">
            A complete walkthrough for creating your first budget from scratch
          </p>
        </div>
        <PrintButton />
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

        <div className="grid md:grid-cols-3 gap-4 my-6">
          <VisualChecklist
            title="Daily/Weekly Tasks"
            items={[
              { text: 'Record transactions as they happen (or import them weekly)' },
              { text: 'Check category balances before making purchases' },
              { text: 'Update account balances weekly' },
            ]}
            variant="compact"
          />

          <div className="rounded-lg border bg-card p-6">
            <h3 className="font-semibold text-lg mb-4">When You Get Paid</h3>
            <ol className="space-y-2 list-decimal list-inside text-sm">
              <li>Update your account balance with the new deposit</li>
              <li>
                Go to Money Movement and allocate the new money to categories based on your monthly
                amounts
              </li>
              <li>Adjust allocations if needed based on what's coming up</li>
            </ol>
          </div>

          <VisualChecklist
            title="Monthly Tasks"
            items={[
              { text: 'Review your spending reports' },
              { text: 'Adjust category monthly amounts based on actual spending' },
              { text: 'Update loan balances if you have any' },
              { text: 'Check progress on your goals' },
            ]}
            variant="compact"
          />
        </div>

        <h2>Tips for Success</h2>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-2xl">📅</span>
              Be Consistent
            </h3>
            <p className="text-sm text-muted-foreground">
              Record transactions regularly, don't let them pile up
            </p>
          </div>

          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-2xl">🔄</span>
              Be Flexible
            </h3>
            <p className="text-sm text-muted-foreground">
              Your budget will evolve. Adjust categories and amounts as you learn
            </p>
          </div>

          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-2xl">✅</span>
              Be Honest
            </h3>
            <p className="text-sm text-muted-foreground">
              Record all spending, even the embarrassing stuff. You can't fix what you don't track
            </p>
          </div>

          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-2xl">⏳</span>
              Be Patient
            </h3>
            <p className="text-sm text-muted-foreground">
              It takes 2-3 months to get a realistic budget. Don't give up!
            </p>
          </div>

          <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 md:col-span-2">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Use Reports
            </h3>
            <p className="text-sm text-muted-foreground">
              Review your spending monthly to find opportunities to save
            </p>
          </div>
        </div>

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

      <RelatedArticles
        articles={[
          {
            title: 'Quick Start Guide',
            href: '/help/getting-started/quick-start',
            description: 'Get up and running quickly with the basics',
          },
          {
            title: 'Importing Transactions',
            href: '/help/tutorials/importing',
            description: 'Learn how to import transactions from your bank',
          },
          {
            title: 'Budget Setup Wizard',
            href: '/help/wizards/budget-setup',
            description: 'Interactive wizard to guide you through setup',
          },
          {
            title: 'Getting Started FAQ',
            href: '/help/faq/getting-started',
            description: 'Answers to common questions for new users',
          },
        ]}
      />

      <WasThisHelpful articlePath="/help/tutorials/first-budget" />
    </div>
  );
}

