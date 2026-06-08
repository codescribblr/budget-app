import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { StepList } from '@/components/help/StepList';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { VisualChecklist } from '@/components/help/VisualChecklist';
import Link from 'next/link';

export default function ImportingTutorialPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Tutorials', href: '/help' },
          { label: 'Importing Transactions', href: '/help/tutorials/importing' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">Tutorial: Importing Transactions from Your Bank</h1>
        <p className="text-lg text-muted-foreground">
          Learn how to import transactions via CSV to save time
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          Manually entering every transaction is tedious. Most banks let you download your
          transactions as a CSV file, which you can import into the app. This tutorial shows
          you how.
        </p>

        <Callout type="info" title="Time savings">
          After the initial setup, importing transactions takes less than 2 minutes per week!
        </Callout>

        <h2>What You'll Need</h2>
        <ul>
          <li>Access to your bank's website</li>
          <li>Ability to download transaction history as CSV</li>
          <li>A few minutes to set up the first time</li>
        </ul>

        <h2>Step-by-Step Tutorial</h2>

        <StepList
          steps={[
            {
              title: 'Download CSV from Your Bank',
              content: (
                <>
                  <p>Get your transaction data from your bank:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Log into your bank's website</li>
                    <li>Navigate to your checking account</li>
                    <li>Look for "Download" or "Export" options</li>
                    <li>Select "CSV" or "Excel" format</li>
                    <li>Choose a date range (start with the last 30 days)</li>
                    <li>Download the file to your computer</li>
                  </ol>
                  <Callout type="tip" title="Finding the download option">
                    The download option is usually in the transaction history section. Look for
                    buttons labeled "Export", "Download", or an icon that looks like a download
                    arrow.
                  </Callout>
                </>
              ),
            },
            {
              title: 'Upload the CSV File',
              content: (
                <>
                  <p>Import the file into the app:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>
                      Go to the{' '}
                      <Link href="/import" className="text-primary hover:underline">
                        Import page
                      </Link>
                    </li>
                    <li>Click "Choose File" or drag and drop your CSV file</li>
                    <li>The file will upload and you'll see a preview</li>
                  </ol>
                  <p className="mt-2 text-sm text-muted-foreground">
                    If you get an error, make sure the file is a CSV (not Excel) and that it
                    contains transaction data.
                  </p>
                </>
              ),
            },
            {
              title: 'Map the Columns',
              content: (
                <>
                  <p>Tell the app which columns contain which data:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>You'll see dropdowns for each required field</li>
                    <li>For "Date", select the column that contains the transaction date</li>
                    <li>For "Description", select the column with merchant names</li>
                    <li>For "Amount", select the column with transaction amounts</li>
                    <li>Optionally map Category, Account, and Notes columns</li>
                    <li>Click "Next" when done</li>
                  </ol>
                  <Callout type="info" title="Amount column">
                    Some banks use separate columns for debits and credits. If so, map both
                    columns and the app will combine them correctly.
                  </Callout>
                </>
              ),
            },
            {
              title: 'Save as Template',
              content: (
                <>
                  <p>Save your column mapping for future imports:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>After mapping columns, you'll see a "Save as Template" option</li>
                    <li>Enter a name like "Chase Checking" or "Bank of America"</li>
                    <li>Click "Save Template"</li>
                  </ol>
                  <p className="mt-2">
                    Next time you import from the same bank, you can select this template and
                    skip the column mapping step!
                  </p>
                </>
              ),
            },
            {
              title: 'Review Transactions',
              content: (
                <>
                  <p>Check the transactions before importing:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>You'll see a preview of all transactions</li>
                    <li>Check that dates, descriptions, and amounts look correct</li>
                    <li>The app will flag potential duplicates based on transaction hash (date, description, amount)</li>
                    <li>Uncheck any transactions you don't want to import</li>
                    <li>Review the auto-categorization (if enabled)</li>
                    <li>Click on any transaction row to see full details including original CSV row data</li>
                  </ol>
                  <Callout type="warning" title="Watch for duplicates">
                    If you've already manually entered some transactions or imported them before, the app will
                    detect duplicates by comparing transaction hashes. Review these carefully! You can merge
                    duplicates later using the "Find Duplicates" feature on the Transactions page.
                  </Callout>
                  <Callout type="info" title="Import Metadata">
                    All original CSV row data is stored with imported transactions. This includes all columns
                    from your bank export, not just the ones used for the transaction. You can view this data
                    by clicking on any imported transaction to see its full details.
                  </Callout>
                </>
              ),
            },
            {
              title: 'Categorize Transactions',
              content: (
                <>
                  <p>Assign categories to your transactions:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Transactions with auto-categorization will show a suggested category</li>
                    <li>For uncategorized transactions, select a category from the dropdown</li>
                    <li>You can categorize them now or skip and do it later</li>
                    <li>Click "Import" when ready</li>
                  </ol>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Tip: You can import uncategorized transactions and categorize them later
                    from the Transactions page.
                  </p>
                </>
              ),
            },
            {
              title: 'Verify the Import',
              content: (
                <>
                  <p>Make sure everything imported correctly:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>
                      Go to the{' '}
                      <Link href="/transactions" className="text-primary hover:underline">
                        Transactions page
                      </Link>
                    </li>
                    <li>Check that your imported transactions appear</li>
                    <li>Verify the amounts and categories are correct</li>
                    <li>Check your category balances on the Dashboard</li>
                    <li>Make any necessary corrections</li>
                  </ol>
                </>
              ),
            },
          ]}
        />

        <h2>Tips for Successful Importing</h2>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-2xl">📅</span>
              Import Regularly
            </h3>
            <p className="text-sm text-muted-foreground">
              Import transactions weekly or bi-weekly. This keeps your budget up-to-date and makes
              it easier to catch errors.
            </p>
          </div>

          <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-2xl">🤖</span>
              Use Auto-Categorization
            </h3>
            <p className="text-sm text-muted-foreground">
              After a few imports, the app will learn your spending patterns and automatically
              categorize most transactions. See the{' '}
              <Link href="/help/features/merchants" className="text-primary hover:underline">
                Merchants guide
              </Link>{' '}
              for more information.
            </p>
          </div>

          <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-2xl">🔄</span>
              Handle Transfers Carefully
            </h3>
            <p className="text-sm text-muted-foreground">
              Transfers between your own accounts (like checking to savings) should be categorized
              as "Transfer" to avoid double-counting. The app will try to detect these automatically.
            </p>
          </div>

          <div className="rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <span className="text-2xl">✅</span>
              Reconcile Your Accounts
            </h3>
            <p className="text-sm text-muted-foreground">
              After importing, check that your account balance in the app matches your bank's
              balance. If not, you may have missed some transactions or imported duplicates.
            </p>
          </div>
        </div>

        <h2>Troubleshooting</h2>

        <div className="grid md:grid-cols-2 gap-4 my-6">
          <div className="rounded-lg border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 p-4">
            <h3 className="font-semibold mb-2">🚫 CSV File Won't Upload</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Make sure the file is actually a CSV (not Excel .xlsx)</li>
              <li>Try opening the file in a text editor to verify it's formatted correctly</li>
              <li>Some banks export in non-standard formats - you may need to clean it up first</li>
            </ul>
          </div>

          <div className="rounded-lg border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 p-4">
            <h3 className="font-semibold mb-2">📅 Dates Are Wrong</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Check that you mapped the correct date column</li>
              <li>Some banks use MM/DD/YYYY, others use DD/MM/YYYY - the app tries to detect this</li>
              <li>If dates are consistently wrong, try a different date column</li>
            </ul>
          </div>

          <div className="rounded-lg border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 p-4">
            <h3 className="font-semibold mb-2">➖ Amounts Are Negative</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Some banks show expenses as negative numbers</li>
              <li>The app should handle this automatically, but check the preview</li>
              <li>If needed, you can manually flip the sign after importing</li>
            </ul>
          </div>

          <div className="rounded-lg border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 p-4">
            <h3 className="font-semibold mb-2">🔄 Too Many Duplicates</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>The app compares date, description, and amount to detect duplicates</li>
              <li>If you're getting false positives, you can mark groups as "Not Duplicates" to prevent them from reappearing</li>
              <li>Consider importing less frequently to reduce overlap</li>
              <li>Use the "Find Duplicates" feature on the Transactions page to review and merge duplicates after import</li>
              <li>You can merge duplicates instead of deleting them, choosing which data to keep from each transaction</li>
            </ul>
          </div>
        </div>

        <h2>Advanced: Importing from Multiple Banks</h2>
        <p>If you have accounts at multiple banks:</p>

        <VisualChecklist
          items={[
            { text: 'Create a separate template for each bank' },
            { text: 'Download CSV files from all banks' },
            { text: 'Import them one at a time, selecting the appropriate template' },
            { text: 'Make sure to select the correct account for each import' },
          ]}
        />

        <Callout type="tip" title="Batch processing">
          You can import multiple CSV files in one session. Just repeat the process for each
          file. The app will remember your templates!
        </Callout>

        <h2>Managing Duplicates After Import</h2>
        <p>
          After importing, you may find duplicate transactions (especially if you've imported overlapping
          date ranges or manually entered some transactions). Here's how to handle them:
        </p>
        <ol className="list-decimal list-inside mt-2 space-y-2">
          <li>
            Go to the{' '}
            <Link href="/transactions" className="text-primary hover:underline">
              Transactions page
            </Link>{' '}
            and click "Find Duplicates"
          </li>
          <li>Review the duplicate groups - click on any transaction to see full details including import metadata</li>
          <li>
            <strong>If they're duplicates:</strong> Select the transactions and click "Merge Selected" to combine them,
            choosing which data to keep from each transaction
          </li>
          <li>
            <strong>If they're not duplicates:</strong> Select the transactions and click "Mark as Not Duplicates" to
            prevent them from appearing again
          </li>
        </ol>
        <Callout type="tip" title="Merge vs Delete">
          Merging duplicates is better than deleting because you can combine the best information from each
          transaction. For example, one might have a better description while another has the correct merchant.
          The merge feature lets you choose which data to keep.
        </Callout>

        <h2>Next Steps</h2>
        <p>Now that you know how to import transactions:</p>
        <ul>
          <li>
            Set up{' '}
            <Link href="/help/features/merchants" className="text-primary hover:underline">
              merchant groups
            </Link>{' '}
            for better auto-categorization
          </li>
          <li>
            Create{' '}
            <Link href="/category-rules" className="text-primary hover:underline">
              category rules
            </Link>{' '}
            for complex categorization
          </li>
          <li>Import regularly to keep your budget current</li>
          <li>
            Use the{' '}
            <Link href="/help/features/transactions" className="text-primary hover:underline">
              Find Duplicates
            </Link>{' '}
            feature to clean up any duplicate transactions
          </li>
        </ul>
      </div>

      <WasThisHelpful articlePath="/help/tutorials/importing" />
    </div>
  );
}


