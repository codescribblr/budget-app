import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';

export default function LoansFeaturePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Loans', href: '/help/features/loans' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Loans</h1>
        <p className="text-lg text-muted-foreground">
          Track mortgages, car loans, student loans, and other debt
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          The Loans feature helps you track all your debt in one place - mortgages, car loans,
          student loans, personal loans, and more. It shows you how much you owe and helps you
          plan your payments.
        </p>

        <h2>Adding a Loan</h2>
        <ol>
          <li>Go to the Dashboard</li>
          <li>In the Loans card, click "Add Loan"</li>
          <li>Enter the loan details:
            <ul>
              <li><strong>Loan name:</strong> Descriptive name (e.g., "Mortgage", "Car Loan", "Student Loan")</li>
              <li><strong>Current balance:</strong> How much you currently owe</li>
              <li><strong>Interest rate:</strong> Annual percentage rate (APR)</li>
              <li><strong>Minimum payment:</strong> Monthly minimum payment amount</li>
              <li><strong>Payment due date:</strong> Day of the month the payment is due</li>
              <li><strong>Include in net worth:</strong> Whether to include this loan in net worth calculations</li>
            </ul>
          </li>
          <li>Click "Add Loan"</li>
        </ol>

        <h2>Loan Fields Explained</h2>

        <h3>Loan Name</h3>
        <p>
          Use a descriptive name that helps you identify the loan. Include the type and purpose:
        </p>
        <ul>
          <li>"Mortgage - 123 Main St"</li>
          <li>"Car Loan - Honda Civic"</li>
          <li>"Student Loan - Federal"</li>
          <li>"Personal Loan - Home Renovation"</li>
        </ul>

        <h3>Current Balance</h3>
        <p>
          The amount you currently owe on the loan. Update this regularly (monthly) to track your
          progress paying it down.
        </p>

        <h3>Interest Rate</h3>
        <p>
          The annual percentage rate (APR) for the loan. This is used for informational purposes
          and to calculate interest if you want to track it.
        </p>

        <h3>Minimum Payment</h3>
        <p>
          The minimum amount you must pay each month. This helps you budget for the payment.
        </p>

        <Callout type="tip" title="Budget for loan payments">
          Create a budget category for each loan payment. Allocate the minimum payment amount
          (or more) to that category each month to ensure you have the funds available.
        </Callout>

        <h3>Payment Due Date</h3>
        <p>
          The day of the month your payment is due. This helps you remember when to make payments
          and avoid late fees.
        </p>

        <h3>Include in Net Worth</h3>
        <p>
          This toggle determines whether the loan is included in net worth calculations.
        </p>
        <p>
          <strong>Include (default):</strong> Most loans should be included. They're liabilities
          that reduce your net worth.
        </p>
        <p>
          <strong>Exclude:</strong> You might exclude loans that are offset by assets not tracked
          in the app (e.g., a mortgage on a rental property you don't track).
        </p>

        <h2>Updating Loan Balances</h2>
        <p>
          Update your loan balances monthly to track your progress:
        </p>
        <ol>
          <li>Click the "..." menu on a loan</li>
          <li>Select "Update Balance"</li>
          <li>Enter the new balance from your loan statement</li>
          <li>Click "Update"</li>
        </ol>
        <p>
          Watching the balance decrease over time is motivating!
        </p>

        <h2>Loans vs. Credit Cards</h2>
        <p>
          Loans and credit cards are both debt, but they're tracked differently:
        </p>
        <ul>
          <li><strong>Loans:</strong> Fixed balance that decreases over time with payments. You
            enter the current balance directly.</li>
          <li><strong>Credit Cards:</strong> Revolving credit with a limit. You enter the credit
            limit and available credit, and the app calculates the balance.</li>
        </ul>

        <h2>Loans and Your Budget</h2>
        <p>
          Loans don't directly affect your "Available to Save" or "Total Monies" calculations
          because they're not cash accounts. However, they do affect your net worth.
        </p>

        <h3>Budgeting for Loan Payments</h3>
        <p>
          Create budget categories for your loan payments:
        </p>
        <ol>
          <li>Create a category for each loan (e.g., "Mortgage Payment", "Car Payment")</li>
          <li>Set the monthly amount to the minimum payment (or more if you want to pay extra)</li>
          <li>Allocate money to these categories each month</li>
          <li>When you make the payment, record it as a transaction in that category</li>
        </ol>

        <h3>Paying Down Debt</h3>
        <p>
          If you want to pay extra toward a loan:
        </p>
        <ol>
          <li>Create a category called "Extra Debt Payment" or similar</li>
          <li>Allocate extra money to this category when you have it</li>
          <li>Use this money to make additional payments on your loans</li>
          <li>Update the loan balance after making the extra payment</li>
        </ol>

        <h2>Debt Payoff Strategies</h2>
        <p>
          The app doesn't enforce a specific debt payoff strategy, but you can implement common
          strategies yourself:
        </p>

        <h3>Debt Snowball</h3>
        <p>
          Pay off smallest balances first for psychological wins:
        </p>
        <ol>
          <li>List your loans from smallest to largest balance</li>
          <li>Pay minimums on all loans</li>
          <li>Put extra money toward the smallest loan</li>
          <li>When it's paid off, roll that payment into the next smallest</li>
        </ol>

        <h3>Debt Avalanche</h3>
        <p>
          Pay off highest interest rates first to save money:
        </p>
        <ol>
          <li>List your loans from highest to lowest interest rate</li>
          <li>Pay minimums on all loans</li>
          <li>Put extra money toward the highest interest loan</li>
          <li>When it's paid off, roll that payment into the next highest rate</li>
        </ol>

        <h2>Editing and Deleting Loans</h2>
        <p>
          You can edit or delete loans at any time:
        </p>
        <ul>
          <li><strong>Edit:</strong> Click the "..." menu and select "Edit" to change any loan details</li>
          <li><strong>Delete:</strong> Click the "..." menu and select "Delete" to remove the loan
            (use this when a loan is paid off!)</li>
        </ul>

        <Callout type="info" title="Celebrate payoffs!">
          When you pay off a loan, don't delete it right away! Leave it visible for a few days
          to celebrate your achievement. Then delete it and reallocate that payment money to
          other goals.
        </Callout>

        <h2>Tips for Managing Loans</h2>
        <ul>
          <li>Update balances monthly to track progress</li>
          <li>Create budget categories for each loan payment</li>
          <li>Set up automatic payments to avoid late fees</li>
          <li>Consider paying extra when possible to reduce interest</li>
          <li>Focus on high-interest debt first (unless using debt snowball)</li>
          <li>Track your total debt over time to see progress</li>
          <li>Celebrate milestones (25% paid off, 50% paid off, etc.)</li>
        </ul>
      </div>

      <WasThisHelpful articlePath="/help/features/loans" />
    </div>
  );
}

