import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';

export default function CSVImportFeaturePage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'CSV Import', href: '/help/features/csv-import' },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold mb-2">CSV Import</h1>
        <p className="text-lg text-muted-foreground">
          Import transactions from your bank in bulk
        </p>
      </div>

      <div className="prose dark:prose-invert max-w-none">
        <p>
          Instead of manually entering every transaction, you can import them from your bank's
          CSV export. This saves hours of data entry!
        </p>

        <h2>How to Import Transactions</h2>
        <StepList
          steps={[
            {
              title: 'Export from your bank',
              content: (
                <>
                  Log into your bank's website and export your transactions as a CSV file. Most
                  banks have this option under "Download" or "Export" in the transaction history.
                </>
              ),
            },
            {
              title: 'Go to the Import page',
              content: (
                <>
                  Navigate to the <Link href="/import" className="text-primary hover:underline">Import page</Link> in
                  the app
                </>
              ),
            },
            {
              title: 'Upload your CSV file',
              content: 'Click "Choose File" and select the CSV file you downloaded from your bank',
            },
            {
              title: 'Map the columns',
              content: (
                <>
                  Tell the app which columns in your CSV correspond to Date, Description, Amount,
                  etc. The app will try to auto-detect these, but you may need to adjust.
                </>
              ),
            },
            {
              title: 'Review and categorize',
              content: (
                <>
                  Review the transactions, categorize them, and exclude any you don't want to import
                  (like transfers or duplicates)
                </>
              ),
            },
            {
              title: 'Import',
              content: 'Click "Import Transactions" to add them to your budget',
            },
          ]}
        />

        <h2>CSV File Requirements</h2>
        <p>
          Your CSV file must have:
        </p>
        <ul>
          <li><strong>Headers in the first row:</strong> Column names like "Date", "Description", "Amount"</li>
          <li><strong>Date column:</strong> Transaction dates in MM/DD/YYYY or YYYY-MM-DD format</li>
          <li><strong>Description column:</strong> What the transaction was for</li>
          <li><strong>Amount column:</strong> Transaction amounts (positive or negative)</li>
        </ul>

        <Callout type="info" title="Optional columns">
          You can also include Category, Merchant, and other fields if your bank provides them.
          The app will use these to help with categorization.
        </Callout>

        <h2>Column Mapping</h2>
        <p>
          After uploading your CSV, you'll see a column mapping screen. This tells the app which
          column in your CSV corresponds to which field in the app.
        </p>

        <h3>Required Mappings</h3>
        <ul>
          <li><strong>Date:</strong> When the transaction occurred</li>
          <li><strong>Description:</strong> What the transaction was for</li>
          <li><strong>Amount:</strong> How much (positive for expenses, negative for income)</li>
        </ul>

        <h3>Optional Mappings</h3>
        <ul>
          <li><strong>Category:</strong> Budget category (if your bank provides this)</li>
          <li><strong>Merchant:</strong> Store or company name</li>
          <li><strong>Notes:</strong> Additional details</li>
        </ul>

        <Callout type="tip" title="Save as template">
          Once you've mapped the columns, you can save it as a template. Next time you import
          from the same bank, the app will automatically use the same mapping!
        </Callout>

        <h2>Auto-Categorization During Import</h2>
        <p>
          The app will automatically categorize transactions based on:
        </p>
        <ul>
          <li><strong>Merchant groups:</strong> If you've set up merchant groups, transactions from
            known merchants will be auto-categorized</li>
          <li><strong>Previous transactions:</strong> If you've categorized transactions from the
            same merchant before, the app will use that category</li>
          <li><strong>Category column:</strong> If your CSV has a category column and it matches
            one of your categories, it will be used</li>
        </ul>

        <h2>Handling Uncategorized Transactions</h2>
        <p>
          Transactions that can't be auto-categorized will be marked as "Uncategorized". You have
          two options:
        </p>
        <ol>
          <li><strong>Categorize during import:</strong> Manually select a category for each
            uncategorized transaction before importing</li>
          <li><strong>Auto-exclude uncategorized:</strong> Enable this option to automatically
            exclude uncategorized transactions. You can import them later after setting up
            merchant groups.</li>
        </ol>

        <Callout type="warning" title="Uncategorized transactions">
          Uncategorized transactions won't affect your budget. They're imported but don't reduce
          any category balances. Make sure to categorize them eventually!
        </Callout>

        <h2>Duplicate Detection</h2>
        <p>
          The app automatically detects potential duplicates by comparing:
        </p>
        <ul>
          <li>Date (within 2 days)</li>
          <li>Amount (exact match)</li>
          <li>Description (similar)</li>
        </ul>
        <p>
          Potential duplicates are highlighted in yellow. You can:
        </p>
        <ul>
          <li><strong>Exclude:</strong> Don't import this transaction</li>
          <li><strong>Import anyway:</strong> It's not actually a duplicate</li>
        </ul>

        <h2>Import Templates</h2>
        <p>
          Import templates save your column mappings for reuse. This is especially useful if you
          import from the same bank regularly.
        </p>

        <h3>Creating a Template</h3>
        <ol>
          <li>Upload a CSV file</li>
          <li>Map the columns</li>
          <li>Click "Save as Template"</li>
          <li>Give it a name (e.g., "Chase Checking")</li>
        </ol>

        <h3>Using a Template</h3>
        <ol>
          <li>Upload a CSV file</li>
          <li>Select a template from the dropdown</li>
          <li>The columns will be automatically mapped</li>
          <li>Proceed with the import</li>
        </ol>

        <h2>Tips for Successful Imports</h2>
        <ul>
          <li>Import regularly (weekly or monthly) to keep your budget up to date</li>
          <li>Set up merchant groups before importing to maximize auto-categorization</li>
          <li>Save templates for each bank account you import from</li>
          <li>Review the preview carefully before importing</li>
          <li>Start with a small date range (1 month) for your first import</li>
          <li>Use the "Auto-exclude uncategorized" option if you have many uncategorized transactions</li>
          <li>Check for duplicates if you've already manually entered some transactions</li>
        </ul>

        <h2>Common Issues and Solutions</h2>

        <h3>"Invalid CSV format" error</h3>
        <p>
          Make sure your file is a valid CSV with headers in the first row. Try opening it in
          Excel or Google Sheets to verify the format.
        </p>

        <h3>"Missing required columns" error</h3>
        <p>
          Your CSV must have Date, Description, and Amount columns. Check that these exist and
          are properly mapped.
        </p>

        <h3>Dates not parsing correctly</h3>
        <p>
          Dates should be in MM/DD/YYYY or YYYY-MM-DD format. If your bank uses a different
          format, you may need to reformat the dates in Excel before importing.
        </p>

        <h3>Too many uncategorized transactions</h3>
        <p>
          Set up merchant groups for your common merchants, then re-import. The app will
          auto-categorize based on the merchant groups.
        </p>
      </div>

      <WasThisHelpful articlePath="/help/features/csv-import" />
    </div>
  );
}

