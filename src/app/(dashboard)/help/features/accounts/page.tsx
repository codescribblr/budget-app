import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { InlineCode } from '@/components/help/CodeBlock';

export default function AccountsFeaturePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Accounts & Credit Cards', href: '/help/features/accounts' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Accounts & Credit Cards</h1>
        <p className="text-lg text-muted-foreground">
          Track all your bank accounts and credit cards in one place
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <h2>Bank Accounts</h2>
        <p>
          Accounts represent where your money physically lives - checking accounts, savings accounts,
          cash on hand, etc. They track the actual balance in each location.
        </p>

        <h3>Adding an Account</h3>
        <ol>
          <li>Go to the Dashboard</li>
          <li>In the Accounts card, click "Add Account"</li>
          <li>Enter the account name (e.g., "Chase Checking", "Emergency Savings")</li>
          <li>Enter the current balance</li>
          <li>Choose whether to include it in totals (see below)</li>
          <li>Click "Add Account"</li>
        </ol>

        <h3>Include in Totals</h3>
        <p>
          Each account has an "Include in Totals" toggle. This determines whether the account balance
          is included in your "Total Monies" and "Available to Save" calculations.
        </p>
        <p>
          <strong>When to include:</strong>
        </p>
        <ul>
          <li>Checking accounts you use for daily spending</li>
          <li>Savings accounts that are part of your budget</li>
          <li>Cash on hand</li>
        </ul>
        <p>
          <strong>When to exclude:</strong>
        </p>
        <ul>
          <li>Investment accounts (stocks, retirement accounts)</li>
          <li>Accounts you're tracking but not budgeting (e.g., a child's savings account)</li>
          <li>Accounts with restrictions (e.g., escrow accounts)</li>
        </ul>

        <Callout type="tip" title="Why exclude accounts?">
          Excluding accounts lets you track them without affecting your budget. For example, you might
          want to see your retirement account balance on the dashboard, but you don't want that money
          included in your "Available to Save" since you can't spend it.
        </Callout>

        <h3>Updating Account Balances</h3>
        <p>
          Keep your account balances up to date to ensure your budget is accurate:
        </p>
        <ol>
          <li>Click the "..." menu on an account</li>
          <li>Select "Update Balance"</li>
          <li>Enter the new balance from your bank</li>
          <li>Click "Update"</li>
        </ol>
        <p>
          <strong>How often to update:</strong> Update balances whenever you check your bank account,
          or at least weekly. More frequent updates = more accurate budget.
        </p>

        <h2>Credit Cards</h2>
        <p>
          Credit cards work differently from bank accounts. Instead of tracking a balance, you track
          your credit limit and available credit. The app calculates how much you owe.
        </p>

        <h3>Adding a Credit Card</h3>
        <ol>
          <li>Go to the Dashboard</li>
          <li>In the Credit Cards card, click "Add Credit Card"</li>
          <li>Enter the card name (e.g., "Chase Sapphire", "Discover")</li>
          <li>Enter your credit limit (the maximum you can charge)</li>
          <li>Enter your available credit (how much you can still charge)</li>
          <li>Click "Add Credit Card"</li>
        </ol>

        <h3>How Credit Card Balances Are Calculated</h3>
        <p>
          The app calculates your credit card balance using this formula:
        </p>
        <p>
          <InlineCode>Balance = Credit Limit - Available Credit</InlineCode>
        </p>
        <p>
          For example, if you have a $5,000 credit limit and $3,200 available credit, your balance
          (what you owe) is $1,800.
        </p>

        <Callout type="info" title="Why track it this way?">
          Most credit card statements show your available credit, not your balance. This makes it
          easier to enter the information directly from your statement or online banking.
        </Callout>

        <h3>Updating Credit Card Balances</h3>
        <p>
          Update your credit cards regularly to track your spending:
        </p>
        <ol>
          <li>Click the "..." menu on a credit card</li>
          <li>Select "Update Balance"</li>
          <li>Enter the new available credit from your statement</li>
          <li>Click "Update"</li>
        </ol>

        <h3>Credit Cards and Your Budget</h3>
        <p>
          Credit card balances are shown as negative numbers on the dashboard because they represent
          money you owe. They don't affect your "Available to Save" calculation directly, but they
          do affect your net worth.
        </p>
        <p>
          <strong>Best practice:</strong> Create a budget category for "Credit Card Payment" and
          allocate money to it each month. This ensures you have the funds set aside to pay your
          credit card bill.
        </p>

        <h2>Editing and Deleting</h2>
        <p>
          You can edit or delete accounts and credit cards at any time:
        </p>
        <ul>
          <li><strong>Edit:</strong> Click the "..." menu and select "Edit" to change the name or settings</li>
          <li><strong>Delete:</strong> Click the "..." menu and select "Delete" to remove the account</li>
        </ul>

        <Callout type="warning" title="Deleting accounts">
          Deleting an account doesn't delete the transactions associated with it. However, it will
          affect your "Total Monies" and "Available to Save" calculations. Make sure you've accounted
          for the money before deleting an account.
        </Callout>

        <h2>Tips for Managing Accounts</h2>
        <ul>
          <li>Update balances regularly - weekly at minimum</li>
          <li>Use descriptive names that match your bank statements</li>
          <li>Only include accounts you're actively budgeting in totals</li>
          <li>Keep credit card balances up to date to avoid overspending</li>
          <li>Review your accounts monthly to ensure everything is accurate</li>
        </ul>
      </div>

      <WasThisHelpful articlePath="/help/features/accounts" />
    </div>
  );
}

