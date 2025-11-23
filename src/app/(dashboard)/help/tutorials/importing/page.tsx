import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { StepList } from '@/components/help/StepList';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
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
                    <li>The app will flag potential duplicates</li>
                    <li>Uncheck any transactions you don't want to import</li>
                    <li>Review the auto-categorization (if enabled)</li>
                  </ol>
                  <Callout type="warning" title="Watch for duplicates">
                    If you've already manually entered some transactions, the app will try to
                    detect duplicates. Review these carefully!
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

        <h3>Import Regularly</h3>
        <p>
          Import transactions weekly or bi-weekly. This keeps your budget up-to-date and makes
          it easier to catch errors.
        </p>

        <h3>Use Auto-Categorization</h3>
        <p>
          After a few imports, the app will learn your spending patterns and automatically
          categorize most transactions. See the{' '}
          <Link href="/help/features/merchants" className="text-primary hover:underline">
            Merchants guide
          </Link>{' '}
          for more information.
        </p>

        <h3>Handle Transfers Carefully</h3>
        <p>
          Transfers between your own accounts (like checking to savings) should be categorized
          as "Transfer" to avoid double-counting. The app will try to detect these automatically.
        </p>

        <h3>Reconcile Your Accounts</h3>
        <p>
          After importing, check that your account balance in the app matches your bank's
          balance. If not, you may have missed some transactions or imported duplicates.
        </p>

        <h2>Troubleshooting</h2>

        <h3>CSV File Won't Upload</h3>
        <ul>
          <li>Make sure the file is actually a CSV (not Excel .xlsx)</li>
          <li>Try opening the file in a text editor to verify it's formatted correctly</li>
          <li>Some banks export in non-standard formats - you may need to clean it up first</li>
        </ul>

        <h3>Dates Are Wrong</h3>
        <ul>
          <li>Check that you mapped the correct date column</li>
          <li>Some banks use MM/DD/YYYY, others use DD/MM/YYYY - the app tries to detect this</li>
          <li>If dates are consistently wrong, try a different date column</li>
        </ul>

        <h3>Amounts Are Negative</h3>
        <ul>
          <li>Some banks show expenses as negative numbers</li>
          <li>The app should handle this automatically, but check the preview</li>
          <li>If needed, you can manually flip the sign after importing</li>
        </ul>

        <h3>Too Many Duplicates</h3>
        <ul>
          <li>The app compares date, description, and amount to detect duplicates</li>
          <li>If you're getting false positives, you may need to manually review</li>
          <li>Consider importing less frequently to reduce overlap</li>
        </ul>

        <h2>Advanced: Importing from Multiple Banks</h2>
        <p>If you have accounts at multiple banks:</p>
        <ol>
          <li>Create a separate template for each bank</li>
          <li>Download CSV files from all banks</li>
          <li>Import them one at a time, selecting the appropriate template</li>
          <li>Make sure to select the correct account for each import</li>
        </ol>

        <Callout type="tip" title="Batch processing">
          You can import multiple CSV files in one session. Just repeat the process for each
          file. The app will remember your templates!
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
        </ul>
      </div>

      <WasThisHelpful articlePath="/help/tutorials/importing" />
    </div>
  );
}

