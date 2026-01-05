import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { StepList } from '@/components/help/StepList';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';

export default function FirstBudgetPage() {
  const steps = [
    {
      title: 'Identify Your Income',
      content: (
        <>
          <p>Start by figuring out how much money you have coming in each month.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>List all income sources (salary, freelance work, side hustles, etc.)</li>
            <li>Calculate your monthly take-home pay (after taxes)</li>
            <li>If income varies, use an average or conservative estimate</li>
          </ul>
          <p className="mt-2 text-xs">
            <strong>Tip:</strong> Use the <Link href="/income" className="text-primary hover:underline">Income page</Link> to track your income sources.
          </p>
        </>
      ),
    },
    {
      title: 'List Your Expenses',
      content: (
        <>
          <p>Write down everything you spend money on in a typical month.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Fixed expenses:</strong> Rent/mortgage, insurance, loan payments, subscriptions</li>
            <li><strong>Variable expenses:</strong> Groceries, gas, utilities, entertainment</li>
            <li><strong>Periodic expenses:</strong> Annual fees, quarterly bills, car maintenance</li>
            <li><strong>Savings goals:</strong> Emergency fund, vacation, down payment</li>
          </ul>
        </>
      ),
    },
    {
      title: 'Create Categories for Each Expense Type',
      content: (
        <>
          <p>Turn your expense list into budget categories.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Go to the Dashboard and click "Add Category"</li>
            <li>Create a category for each major expense type</li>
            <li>Group similar expenses together (e.g., "Utilities" instead of separate categories for electric, water, gas)</li>
            <li>Start with 10-15 categories - you can always add more later</li>
          </ul>
          <p className="mt-2 text-xs">
            <strong>Example categories:</strong> Rent, Groceries, Transportation, Utilities, Insurance, Entertainment, Dining Out, Clothing, Emergency Fund, Vacation Fund
          </p>
        </>
      ),
    },
    {
      title: 'Set Monthly Amounts',
      content: (
        <>
          <p>Decide how much to budget for each category per month.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>For fixed expenses, use the actual amount</li>
            <li>For variable expenses, estimate based on past spending</li>
            <li>For periodic expenses, divide the annual cost by 12</li>
            <li>Make sure your total doesn't exceed your monthly income</li>
          </ul>
          <p className="mt-2 text-xs">
            <strong>Tip:</strong> It's okay to guess at first. You'll refine these amounts as you track your actual spending.
          </p>
        </>
      ),
    },
    {
      title: 'Allocate Your Current Balance',
      content: (
        <>
          <p>Distribute the money you have right now into your categories.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Go to <Link href="/money-movement" className="text-primary hover:underline">Money Movement</Link></li>
            <li>Look at your "Available to Save" amount</li>
            <li>Allocate money to categories based on what you need to pay soon</li>
            <li>Prioritize upcoming bills and essential expenses first</li>
          </ul>
        </>
      ),
    },
    {
      title: 'Set Up Recurring Transactions (Optional)',
      content: (
        <>
          <p>If you have regular, predictable expenses, you can set up recurring transactions.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Go to <Link href="/transactions" className="text-primary hover:underline">Transactions</Link></li>
            <li>Add transactions for bills that are the same every month</li>
            <li>This helps you see upcoming expenses in your budget</li>
          </ul>
        </>
      ),
    },
    {
      title: 'Plan for the Month Ahead',
      content: (
        <>
          <p>Look at your calendar and think about what's coming up.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Are there any special events or expenses this month?</li>
            <li>Do you need to adjust any category amounts?</li>
            <li>Make sure you have enough allocated for everything you need</li>
          </ul>
        </>
      ),
    },
    {
      title: 'Adjust as You Go',
      content: (
        <>
          <p>Your first budget won't be perfect - and that's okay!</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Track your spending throughout the month</li>
            <li>If you overspend in one category, transfer money from another</li>
            <li>Take notes on what worked and what didn't</li>
            <li>Adjust your monthly amounts for next month based on what you learned</li>
          </ul>
        </>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Getting Started', href: '/help/getting-started/welcome' },
          { label: 'Your First Budget', href: '/help/getting-started/first-budget' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Your First Budget</h1>
        <p className="text-lg text-muted-foreground">
          A detailed walkthrough of creating a complete budget from scratch
        </p>
      </div>

      <Callout type="info" title="Estimated Time: 30-45 minutes">
        Take your time with this process. A well-planned budget is the foundation of financial success.
      </Callout>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          Creating your first budget can feel overwhelming, but this guide will walk you through it
          step by step. By the end, you'll have a complete budget that reflects your income, expenses,
          and financial goals.
        </p>
      </div>

      <StepList steps={steps} />

      <Callout type="tip" title="Tips for Success">
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Be realistic:</strong> Don't create a budget you can't stick to</li>
          <li><strong>Start simple:</strong> You can always add complexity later</li>
          <li><strong>Review regularly:</strong> Check your budget weekly at first, then monthly</li>
          <li><strong>Be flexible:</strong> Life happens - adjust your budget as needed</li>
          <li><strong>Give it time:</strong> It takes 3-4 months to really dial in your budget</li>
        </ul>
      </Callout>

      <WasThisHelpful articlePath="/help/getting-started/first-budget" />
    </div>
  );
}


