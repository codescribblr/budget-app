import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Filter,
  Lightbulb,
  Settings,
  Zap,
  Copy
} from 'lucide-react';

export default function CSVImportFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'CSV Import', href: '/help/features/csv-import' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">CSV Import</h1>
        <p className="text-lg text-muted-foreground">
          Import transactions from your bank in bulk
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            Instead of manually entering every transaction, you can import them from your bank's
            CSV export. This saves hours of data entry!
          </p>
        </CardContent>
      </Card>

      {/* How to Import Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">How to Import Transactions</CardTitle>
              <CardDescription className="text-base">
                Follow these steps to import your bank transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* CSV File Requirements */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">CSV File Requirements</CardTitle>
              <CardDescription className="text-base">
                What your CSV file needs to include
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Your CSV file must have:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Headers in the first row:</strong> Column names like "Date", "Description", "Amount"</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Date column:</strong> Transaction dates in MM/DD/YYYY or YYYY-MM-DD format</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Description column:</strong> What the transaction was for</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Amount column:</strong> Transaction amounts (positive or negative)</span>
            </li>
          </ul>
          <Callout type="info" title="Optional columns">
            You can also include Category, Merchant, and other fields if your bank provides them.
            The app will use these to help with categorization.
          </Callout>
        </CardContent>
      </Card>

      {/* Column Mapping */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Column Mapping</h2>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Mapping Your Columns</CardTitle>
                <CardDescription className="text-base">
                  Tell the app which columns correspond to which fields
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              After uploading your CSV, you'll see a column mapping screen. This tells the app which
              column in your CSV corresponds to which field in the app.
            </p>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Required Mappings</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span><strong>Date:</strong> When the transaction occurred</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span><strong>Description:</strong> What the transaction was for</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span><strong>Amount:</strong> How much (positive for expenses, negative for income)</span>
                  </li>
                </ul>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Optional Mappings</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span><strong>Category:</strong> Budget category (if your bank provides this)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span><strong>Merchant:</strong> Store or company name</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <span><strong>Notes:</strong> Additional details</span>
                  </li>
                </ul>
              </div>
            </div>

            <Callout type="tip" title="Save as template">
              Once you've mapped the columns, you can save it as a template. Next time you import
              from the same bank, the app will automatically use the same mapping!
            </Callout>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Categorization */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Auto-Categorization During Import</CardTitle>
              <CardDescription className="text-base">
                The app automatically categorizes transactions when possible
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">The app will automatically categorize transactions based on:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Merchant groups:</strong> If you've set up merchant groups, transactions from known merchants will be auto-categorized</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Previous transactions:</strong> If you've categorized transactions from the same merchant before, the app will use that category</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Category column:</strong> If your CSV has a category column and it matches one of your categories, it will be used</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Handling Uncategorized Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Filter className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Handling Uncategorized Transactions</CardTitle>
              <CardDescription className="text-base">
                What to do with transactions that can't be auto-categorized
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Transactions that can't be auto-categorized will be marked as "Uncategorized". You have two options:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[180px]">Categorize during import</div>
              <div className="text-sm text-muted-foreground">
                Manually select a category for each uncategorized transaction before importing
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[180px]">Auto-exclude uncategorized</div>
              <div className="text-sm text-muted-foreground">
                Enable this option to automatically exclude uncategorized transactions. You can import them later after setting up merchant groups.
              </div>
            </div>
          </div>
          <Callout type="warning" title="Uncategorized transactions">
            Uncategorized transactions won't affect your budget. They're imported but don't reduce
            any category balances. Make sure to categorize them eventually!
          </Callout>
        </CardContent>
      </Card>

      {/* Duplicate Detection */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Copy className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Duplicate Detection</CardTitle>
              <CardDescription className="text-base">
                Avoid importing the same transaction twice
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">The app automatically detects potential duplicates by comparing:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Date (within 2 days)</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Amount (exact match)</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Description (similar)</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">Potential duplicates are highlighted in yellow. You can:</p>
          <div className="grid gap-2">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[120px]">Exclude</div>
              <div className="text-sm text-muted-foreground">Don't import this transaction</div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[120px]">Import anyway</div>
              <div className="text-sm text-muted-foreground">It's not actually a duplicate</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Import Templates */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Import Templates</h2>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Save Time with Templates</CardTitle>
                <CardDescription className="text-base">
                  Reuse column mappings for regular imports
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import templates save your column mappings for reuse. This is especially useful if you
              import from the same bank regularly.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-sm font-medium">Creating a Template</p>
                <StepList
                  steps={[
                    { title: 'Upload CSV', content: 'Upload a CSV file' },
                    { title: 'Map columns', content: 'Map the columns' },
                    { title: 'Save template', content: 'Click "Save as Template"' },
                    { title: 'Name it', content: 'Give it a name (e.g., "Chase Checking")' },
                  ]}
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Using a Template</p>
                <StepList
                  steps={[
                    { title: 'Upload CSV', content: 'Upload a CSV file' },
                    { title: 'Select template', content: 'Select a template from the dropdown' },
                    { title: 'Auto-mapped', content: 'The columns will be automatically mapped' },
                    { title: 'Import', content: 'Proceed with the import' },
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Tips for Successful Imports</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Import regularly (weekly or monthly) to keep your budget up to date
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Set up merchant groups before importing to maximize auto-categorization
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Save templates for each bank account you import from
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Review the preview carefully before importing
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Start with a small date range (1 month) for your first import
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">6</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use the "Auto-exclude uncategorized" option if you have many uncategorized transactions
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">7</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Check for duplicates if you've already manually entered some transactions
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Common Issues */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Common Issues and Solutions</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium mb-2">"Invalid CSV format" error</p>
              <p className="text-sm text-muted-foreground">
                Make sure your file is a valid CSV with headers in the first row. Try opening it in
                Excel or Google Sheets to verify the format.
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium mb-2">"Missing required columns" error</p>
              <p className="text-sm text-muted-foreground">
                Your CSV must have Date, Description, and Amount columns. Check that these exist and
                are properly mapped.
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium mb-2">Dates not parsing correctly</p>
              <p className="text-sm text-muted-foreground">
                Dates should be in MM/DD/YYYY or YYYY-MM-DD format. If your bank uses a different
                format, you may need to reformat the dates in Excel before importing.
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg border">
              <p className="text-sm font-medium mb-2">Too many uncategorized transactions</p>
              <p className="text-sm text-muted-foreground">
                Set up merchant groups for your common merchants, then re-import. The app will
                auto-categorize based on the merchant groups.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/csv-import" />
    </div>
  );
}


