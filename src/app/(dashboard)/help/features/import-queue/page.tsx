import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Lightbulb,
  AlertCircle,
  Zap,
  RefreshCw,
  Trash2,
  Tag
} from 'lucide-react';

export default function ImportQueueFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Import Queue', href: '/help/features/import-queue' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Import Queue</h1>
        <p className="text-lg text-muted-foreground">
          Review and approve transactions before they're added to your budget
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            The Import Queue is where transactions from automatic imports and manual CSV uploads wait for your review
            before being added to your budget. This gives you control over which transactions are imported and ensures
            they're properly categorized before affecting your budget balances.
          </p>
        </CardContent>
      </Card>

      {/* What is the Import Queue */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Inbox className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">What is the Import Queue?</CardTitle>
              <CardDescription className="text-base">
                A review system for imported transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            When transactions are imported (either automatically from bank integrations or manually via CSV upload),
            they don't immediately appear in your budget. Instead, they're added to the Import Queue where you can:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Review each transaction before it's imported</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Categorize transactions or verify auto-categorization</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Identify and exclude duplicates</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Approve or reject transactions in batches</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Add tags and notes to transactions</span>
            </li>
          </ul>
          <Callout type="info" title="Why use the queue?">
            The Import Queue ensures you maintain control over your budget. Instead of transactions automatically
            appearing and potentially miscategorizing expenses, you review and approve them first. This prevents
            errors and keeps your budget accurate.
          </Callout>
        </CardContent>
      </Card>

      {/* How Transactions Get Queued */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">How Transactions Get Queued</CardTitle>
              <CardDescription className="text-base">
                Different sources add transactions to the queue
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-2">Automatic Imports</h4>
              <p className="text-sm text-muted-foreground mb-2">
                When you have automatic import setups configured (like Teller, Plaid, or email imports),
                new transactions are automatically fetched and added to the queue for review.
              </p>
              <p className="text-xs text-muted-foreground">
                Transactions are grouped into batches by import setup and account, making it easy to review
                all transactions from a specific source together.
              </p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h4 className="font-semibold mb-2">Manual CSV Uploads</h4>
              <p className="text-sm text-muted-foreground mb-2">
                When you upload a CSV file through the import page, transactions are parsed and added to
                the queue instead of being immediately imported.
              </p>
              <p className="text-xs text-muted-foreground">
                This allows you to review and categorize transactions from CSV files just like automatic imports.
                See <Link href="/help/features/csv-import" className="text-primary hover:underline">CSV Import</Link> for
                more information about manual imports.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviewing Batches */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Reviewing Import Batches</h2>
          <p className="text-muted-foreground mb-6">
            Transactions in the queue are organized into batches. Each batch represents a group of transactions
            from the same import source and account.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Inbox className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Viewing the Queue</CardTitle>
                <CardDescription className="text-base">
                  See all pending import batches
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <StepList
              steps={[
                { title: 'Go to Import Queue', content: <><Link href="/imports/queue" className="text-primary hover:underline">Navigate to the Import Queue page</Link></> },
                { title: 'View batches', content: 'See all pending batches grouped by import setup and account' },
                { title: 'Review batch details', content: 'Each batch shows the number of transactions, date range, source type, and target account' },
                { title: 'Click Review', content: 'Click the "Review" button on a batch to start reviewing its transactions' },
              ]}
            />
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm font-medium mb-2">Batch Information:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span><strong>Import Setup Name:</strong> The name of the automatic import setup or "Manual Upload"</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span><strong>Source Type:</strong> Teller, Plaid, Email Import, Manual Upload, etc.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span><strong>Transaction Count:</strong> Number of transactions in the batch</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span><strong>Date Range:</strong> Earliest and latest transaction dates</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span><strong>Target Account:</strong> Which account or credit card the transactions will be assigned to</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <span><strong>Historical Badge:</strong> Indicates if the batch contains historical transactions (older than recent activity)</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Reviewing Transactions</CardTitle>
                <CardDescription className="text-base">
                  Categorize and approve transactions in a batch
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              When you click "Review" on a batch, you'll see all transactions in that batch. For each transaction, you can:
            </p>
            <div className="grid gap-3">
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold mb-2">Categorize Transactions</h4>
                <p className="text-sm text-muted-foreground">
                  Select a category for each transaction. The app may suggest categories based on merchant groups
                  or previous transactions, but you can change them. Transactions without categories are excluded
                  from import by default.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold mb-2">Handle Duplicates</h4>
                <p className="text-sm text-muted-foreground">
                  The app automatically detects potential duplicates (matching date, amount, and description).
                  Duplicates are highlighted and excluded by default, but you can include them if they're not
                  actually duplicates.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold mb-2">Add Tags and Notes</h4>
                <p className="text-sm text-muted-foreground">
                  Add tags to transactions for additional organization, or add notes for your own reference.
                  Tags can be used for filtering and reporting later.
                </p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg border">
                <h4 className="font-semibold mb-2">Exclude Transactions</h4>
                <p className="text-sm text-muted-foreground">
                  Exclude transactions you don't want to import (like transfers, duplicates, or errors).
                  Excluded transactions won't be imported and won't affect your budget.
                </p>
              </div>
            </div>
            <Callout type="tip" title="Bulk actions">
              You can select multiple transactions and apply actions to all of them at once, such as assigning
              the same category or excluding them all.
            </Callout>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Approving and Importing</CardTitle>
                <CardDescription className="text-base">
                  Finalize your review and add transactions to your budget
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Once you've reviewed and categorized all transactions in a batch:
            </p>
            <StepList
              steps={[
                { title: 'Review all transactions', content: 'Make sure each transaction you want to import has a category assigned' },
                { title: 'Check excluded transactions', content: 'Verify that duplicates and unwanted transactions are excluded' },
                { title: 'Click "Import Transactions"', content: 'This will import all non-excluded, categorized transactions into your budget' },
                { title: 'Transactions appear', content: 'Imported transactions will appear in your Transactions list and affect your category balances' },
              ]}
            />
            <Callout type="warning" title="Transactions must be categorized">
              Only transactions with assigned categories will be imported. Uncategorized transactions are
              automatically excluded unless you assign them a category before importing.
            </Callout>
          </CardContent>
        </Card>
      </div>

      {/* Duplicate Detection */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Duplicate Detection</CardTitle>
              <CardDescription className="text-base">
                How the app identifies duplicate transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Import Queue automatically detects potential duplicates by comparing:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Date:</strong> Within 2 days of an existing transaction</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Amount:</strong> Exact match</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Description:</strong> Similar merchant/description text</span>
            </li>
          </ul>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm font-medium mb-2">Duplicate Types:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Database duplicates:</strong> Transactions that already exist in your budget</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Within-file duplicates:</strong> Multiple instances of the same transaction in the import file</span>
              </li>
            </ul>
          </div>
          <Callout type="tip" title="Rerun duplicate check">
            If you've recently imported transactions or made changes, you can click "Rerun Duplicate Check" to
            refresh the duplicate detection based on the latest data.
          </Callout>
        </CardContent>
      </Card>

      {/* Auto-Categorization */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Auto-Categorization</CardTitle>
              <CardDescription className="text-base">
                How transactions are automatically categorized
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Import Queue attempts to automatically categorize transactions based on:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Merchant groups:</strong> If a transaction matches a merchant group, it uses that group's category</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Previous transactions:</strong> If you've categorized transactions from the same merchant before, it uses that category</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>CSV category column:</strong> If your CSV file includes category information, it's used if it matches your categories</span>
            </li>
          </ul>
          <Callout type="tip" title="Rerun categorization">
            If you've set up new merchant groups or want to refresh category suggestions, you can click
            "Rerun Categorization" to update all suggested categories in the batch.
          </Callout>
        </CardContent>
      </Card>

      {/* Managing Batches */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Filter className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Managing Import Batches</CardTitle>
              <CardDescription className="text-base">
                Actions you can take on batches
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[140px]">Review</div>
              <div className="text-sm text-muted-foreground">
                Open a batch to review and categorize its transactions. This is the main action for processing imports.
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[140px]">Delete</div>
              <div className="text-sm text-muted-foreground">
                Remove a batch from the queue without importing. For automatic imports, deleted transactions won't
                be automatically re-imported on future syncs. You can always manually upload them later if needed.
              </div>
            </div>
          </div>
          <Callout type="warning" title="Deleting automatic import batches">
            If you delete a batch from an automatic import setup (like Teller or Plaid), those transactions won't
            be automatically re-fetched. The system remembers which transactions have been processed to avoid
            re-importing them. If you want to import them later, you'll need to manually upload a CSV or create
            the transactions manually.
          </Callout>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Best Practices</h2>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Review Regularly</CardTitle>
                <CardDescription className="text-base">
                  Don't let the queue build up
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Check your Import Queue regularly (daily or weekly) to keep your budget up to date:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Review batches as they arrive to maintain accurate budget balances</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Smaller batches are easier to review than large ones</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Set up merchant groups before reviewing to maximize auto-categorization</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Tag className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Set Up Merchant Groups First</CardTitle>
                <CardDescription className="text-base">
                  Improve auto-categorization accuracy
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Before reviewing import batches, set up merchant groups for your common merchants. This helps the
              Import Queue automatically categorize transactions, reducing the amount of manual work you need to do.
              See <Link href="/help/features/merchants" className="text-primary hover:underline">Merchants</Link> for
              information about merchant groups.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Verify Duplicates Carefully</CardTitle>
                <CardDescription className="text-base">
                  Make sure duplicates are actually duplicates
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The duplicate detection is helpful but not perfect. Sometimes legitimate transactions (like two
              purchases at the same store on the same day) can be flagged as duplicates. Always review flagged
              duplicates to ensure you're not excluding legitimate transactions.
            </p>
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
              <CardTitle className="text-xl">Tips for Using the Import Queue</CardTitle>
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
                Review batches soon after they arrive to keep your budget current
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use bulk actions to categorize multiple similar transactions at once
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Set up merchant groups before importing to reduce manual categorization work
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Don't import uncategorized transactions - they won't affect your budget anyway
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use tags to add additional organization to transactions during review
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">6</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Check the date range to understand what period the batch covers
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">7</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Historical batches (marked with a badge) contain older transactions that may need extra attention
              </p>
            </li>
          </ul>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/import-queue" />
    </div>
  );
}
