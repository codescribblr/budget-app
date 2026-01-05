import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { FAQItem } from '@/components/help/FAQItem';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import Link from 'next/link';

export default function TroubleshootingFAQPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'FAQ', href: '/help/faq/general' },
          { label: 'Troubleshooting', href: '/help/faq/troubleshooting' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Troubleshooting</h1>
        <p className="text-lg text-muted-foreground">
          Solutions to common problems and issues
        </p>
      </div>

      <div className="space-y-3">
        <FAQItem
          question="My balances don't match my bank. What do I do?"
          answer={
            <>
              <p>
                If your budget balances don't match your bank, here's how to reconcile:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>
                  <strong>Update account balances:</strong> Make sure all your account balances in
                  the app match your bank statements
                </li>
                <li>
                  <strong>Check for missing transactions:</strong> Look for transactions in your bank
                  statement that aren't in the app
                </li>
                <li>
                  <strong>Check for duplicate transactions:</strong> Make sure you didn't enter the
                  same transaction twice
                </li>
                <li>
                  <strong>Verify pending checks:</strong> Make sure pending checks are accounted for
                </li>
                <li>
                  <strong>Check credit card balances:</strong> Verify your available credit matches
                  your statement
                </li>
              </ol>
              <p className="mt-2">
                <strong>Tip:</strong> Reconcile your accounts weekly to catch discrepancies early.
              </p>
            </>
          }
        />

        <FAQItem
          question="I accidentally deleted a category. Can I get it back?"
          answer={
            <>
              <p>
                Unfortunately, deleted categories cannot be recovered. When you delete a category,
                all transactions in that category are also deleted.
              </p>
              <p className="mt-2">
                <strong>Prevention tips:</strong>
              </p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>
                  Create regular backups using the{' '}
                  <Link href="/settings/backup" className="text-primary hover:underline">
                    Backup feature
                  </Link>
                </li>
                <li>Double-check before deleting categories</li>
                <li>Consider renaming or hiding categories instead of deleting them</li>
              </ul>
              <p className="mt-2">
                <strong>If you have a backup:</strong> You can restore from a backup to recover the
                deleted category and its transactions.
              </p>
            </>
          }
        />

        <FAQItem
          question="The app is slow. How can I speed it up?"
          answer={
            <>
              <p>
                If the app feels slow, try these solutions:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong>Clear browser cache:</strong> Old cached data can slow things down
                </li>
                <li>
                  <strong>Update your browser:</strong> Make sure you're using the latest version
                </li>
                <li>
                  <strong>Close other tabs:</strong> Too many open tabs can slow down your browser
                </li>
                <li>
                  <strong>Check your internet connection:</strong> Slow internet = slow app
                </li>
                <li>
                  <strong>Try a different browser:</strong> Chrome and Edge typically perform best
                </li>
              </ul>
              <p className="mt-2">
                <strong>Still slow?</strong> Contact support with details about your browser, operating
                system, and what actions are slow.
              </p>
            </>
          }
        />

        <FAQItem
          question="I'm getting an error when I try to import transactions. Help!"
          answer={
            <>
              <p>
                Common import errors and solutions:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong>"Invalid CSV format":</strong> Make sure your file is a valid CSV with
                  headers in the first row
                </li>
                <li>
                  <strong>"Missing required columns":</strong> Your CSV must have Date, Amount, and
                  Description columns
                </li>
                <li>
                  <strong>"Invalid date format":</strong> Dates should be in MM/DD/YYYY or YYYY-MM-DD
                  format
                </li>
                <li>
                  <strong>"File too large":</strong> Try importing in smaller batches (500-1000
                  transactions at a time)
                </li>
              </ul>
              <p className="mt-2">
                See the{' '}
                <Link href="/help/features/csv-import" className="text-primary hover:underline">
                  CSV Import guide
                </Link>{' '}
                for detailed instructions.
              </p>
            </>
          }
        />

        <FAQItem
          question="How do I reset my budget and start over?"
          answer={
            <>
              <p>
                If you want to start fresh, you can clear all your data:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>
                  <strong>Create a backup first!</strong> Go to{' '}
                  <Link href="/settings/backup" className="text-primary hover:underline">
                    Settings → Backup & Restore
                  </Link>{' '}
                  and create a backup
                </li>
                <li>
                  Go to{' '}
                  <Link href="/settings/data" className="text-primary hover:underline">
                    Settings → Data Management
                  </Link>
                </li>
                <li>Click "Clear All Data"</li>
                <li>Confirm that you want to delete everything</li>
              </ol>
              <p className="mt-2">
                <strong>Warning:</strong> This will delete all your accounts, categories, transactions,
                goals, and settings. This action cannot be undone (unless you have a backup).
              </p>
            </>
          }
        />

        <FAQItem
          question="My Available to Save doesn't make sense. What's wrong?"
          answer={
            <>
              <p>
                If your "Available to Save" seems incorrect, check these common issues:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>
                  <strong>Account balances:</strong> Make sure all account balances are up to date
                  and match your bank
                </li>
                <li>
                  <strong>Include in totals:</strong> Check which accounts are included in totals -
                  excluded accounts don't affect Available to Save
                </li>
                <li>
                  <strong>Pending checks:</strong> Pending checks reduce Available to Save
                </li>
                <li>
                  <strong>Category allocations:</strong> Review your category balances to make sure
                  they're correct
                </li>
                <li>
                  <strong>Credit cards:</strong> Credit card balances don't directly affect Available
                  to Save (they're debt, not cash)
                </li>
              </ol>
              <p className="mt-2">
                <strong>Formula:</strong> Available to Save = Total Money in Accounts (included in
                totals) - Total Allocated to Categories - Pending Checks
              </p>
            </>
          }
        />

        <FAQItem
          question="I can't find a transaction I know I entered. Where did it go?"
          answer={
            <>
              <p>
                If a transaction seems to be missing:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>
                  <strong>Check your filters:</strong> Make sure you're not filtering by category or
                  date range
                </li>
                <li>
                  <strong>Search for it:</strong> Use the search box to find it by description or
                  merchant
                </li>
                <li>
                  <strong>Check the date:</strong> It might be in a different month than you expected
                </li>
                <li>
                  <strong>Check all categories:</strong> It might be in a different category than you
                  remember
                </li>
                <li>
                  <strong>Check if it was deleted:</strong> Look for it in your backup if you have one
                </li>
              </ol>
            </>
          }
        />

        <FAQItem
          question="Auto-categorization isn't working. Why not?"
          answer={
            <>
              <p>
                Auto-categorization requires some setup:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>
                  <strong>Categorize manually first:</strong> The app learns from your manual
                  categorizations
                </li>
                <li>
                  <strong>Use merchant groups:</strong> Set up merchant groups for better control
                </li>
                <li>
                  <strong>Be consistent:</strong> Always categorize the same merchant the same way
                </li>
                <li>
                  <strong>Give it time:</strong> It takes a few transactions from each merchant before
                  auto-categorization kicks in
                </li>
              </ul>
              <p className="mt-2">
                See the{' '}
                <Link href="/help/features/merchants" className="text-primary hover:underline">
                  Merchants guide
                </Link>{' '}
                for more information.
              </p>
            </>
          }
        />
      </div>

      <WasThisHelpful articlePath="/help/faq/troubleshooting" />
    </div>
  );
}


