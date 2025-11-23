import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';

export default function PendingChecksFeaturePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Pending Checks', href: '/help/features/pending-checks' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Pending Checks</h1>
        <p className="text-lg text-muted-foreground">
          Track checks you've written that haven't cleared yet
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          Pending Checks helps you avoid overdrafts by tracking checks you've written that haven't
          cleared your bank account yet. This money is committed but still shows in your account
          balance.
        </p>

        <h2>Why Track Pending Checks?</h2>
        <p>
          When you write a check, the money doesn't leave your account immediately. It might take
          days or weeks for the recipient to deposit it. During this time:
        </p>
        <ul>
          <li>Your bank account balance still includes this money</li>
          <li>But you've already committed it to someone else</li>
          <li>You shouldn't spend it or you might overdraft</li>
        </ul>
        <p>
          Pending Checks solves this problem by reducing your "Available to Save" by the amount
          of pending checks, ensuring you don't accidentally allocate money you've already committed.
        </p>

        <h2>Adding a Pending Check</h2>
        <ol>
          <li>Go to the Dashboard</li>
          <li>In the Pending Checks card, click "Add Check"</li>
          <li>Enter the check details:
            <ul>
              <li><strong>Check number:</strong> The check number (optional but recommended)</li>
              <li><strong>Payee:</strong> Who you wrote the check to</li>
              <li><strong>Amount:</strong> The check amount</li>
              <li><strong>Date written:</strong> When you wrote the check</li>
              <li><strong>Category:</strong> Which budget category this expense belongs to</li>
            </ul>
          </li>
          <li>Click "Add Check"</li>
        </ol>

        <Callout type="info" title="How it affects your budget">
          When you add a pending check:
          <ul>
            <li>The amount is subtracted from your "Available to Save"</li>
            <li>The category balance is reduced (just like a regular transaction)</li>
            <li>Your account balance stays the same (the money is still there)</li>
          </ul>
        </Callout>

        <h2>When the Check Clears</h2>
        <p>
          When the check clears your bank account:
        </p>
        <ol>
          <li>Update your account balance to reflect the cleared check</li>
          <li>Go to the Pending Checks card</li>
          <li>Click the "..." menu on the check</li>
          <li>Select "Mark as Cleared" or "Delete"</li>
        </ol>
        <p>
          This removes the check from the pending list and restores your "Available to Save"
          (since the money has now actually left your account).
        </p>

        <Callout type="tip" title="Check your bank regularly">
          Review your bank account weekly to see which checks have cleared. This keeps your
          pending checks list accurate.
        </Callout>

        <h2>How Pending Checks Affect Your Budget</h2>

        <h3>Available to Save</h3>
        <p>
          Pending checks reduce your "Available to Save":
        </p>
        <p>
          <strong>Formula:</strong> Available to Save = Total Money in Accounts - Total Allocated
          to Categories - <strong>Pending Checks</strong>
        </p>
        <p>
          This prevents you from allocating money that's already committed.
        </p>

        <h3>Category Balances</h3>
        <p>
          When you add a pending check, the category balance is reduced immediately (just like
          recording a transaction). This shows that you've spent that money, even though it hasn't
          left your account yet.
        </p>

        <h3>Account Balances</h3>
        <p>
          Pending checks don't affect your account balances. Your account balance should always
          match your bank, and the money is still in your account until the check clears.
        </p>

        <h2>Editing and Deleting Pending Checks</h2>
        <p>
          You can edit or delete pending checks at any time:
        </p>
        <ul>
          <li><strong>Edit:</strong> Click the "..." menu and select "Edit" to change the amount,
            payee, or category</li>
          <li><strong>Delete:</strong> Click the "..." menu and select "Delete" to remove the check
            (use this when the check clears or if you void it)</li>
        </ul>

        <h2>Alternative: Don't Use Pending Checks</h2>
        <p>
          Pending Checks is an optional feature. If you don't write many checks, you might prefer
          to handle them differently:
        </p>

        <h3>Option 1: Record as Transaction Immediately</h3>
        <p>
          Record the check as a regular transaction when you write it, and update your account
          balance to reflect the reduced amount. This is simpler but requires manually tracking
          which checks haven't cleared.
        </p>

        <h3>Option 2: Wait Until It Clears</h3>
        <p>
          Don't record anything until the check clears your bank. Then record it as a transaction
          and update your account balance. This is simplest but requires careful tracking to avoid
          overdrafts.
        </p>

        <h2>When to Use Pending Checks</h2>
        <p>
          Use the Pending Checks feature if:
        </p>
        <ul>
          <li>You write checks regularly (rent, bills, etc.)</li>
          <li>Checks take a long time to clear (weeks or months)</li>
          <li>You want to avoid overdrafts</li>
          <li>You want your account balance to always match your bank</li>
        </ul>
        <p>
          Skip it if:
        </p>
        <ul>
          <li>You rarely write checks</li>
          <li>Checks clear quickly (within a few days)</li>
          <li>You prefer simpler tracking</li>
        </ul>

        <h2>Tips for Managing Pending Checks</h2>
        <ul>
          <li>Add checks to the pending list as soon as you write them</li>
          <li>Include the check number to make tracking easier</li>
          <li>Review your bank account weekly to see which checks have cleared</li>
          <li>Delete or mark as cleared promptly when checks clear</li>
          <li>Use descriptive payee names so you can identify checks easily</li>
          <li>If a check hasn't cleared after 6 months, contact the payee (it might be lost)</li>
        </ul>

        <Callout type="warning" title="Stale checks">
          If a check hasn't cleared after several months, it might be lost or the payee might
          have forgotten about it. Contact them to verify. Some banks won't honor checks older
          than 6 months.
        </Callout>
      </div>

      <WasThisHelpful articlePath="/help/features/pending-checks" />
    </div>
  );
}

