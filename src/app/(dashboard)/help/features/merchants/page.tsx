import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Store,
  Tag,
  TrendingUp,
  Edit3,
  Lightbulb,
  Zap,
  BarChart3,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function MerchantsFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Merchants & Auto-Categorization', href: '/help/features/merchants' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Merchants & Auto-Categorization</h1>
        <p className="text-lg text-muted-foreground">
          Automatically categorize transactions based on merchant
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            The merchant system helps you automatically categorize transactions based on where you
            spent money. Once set up, it can save you hours of manual categorization!
          </p>
        </CardContent>
      </Card>

      {/* How Auto-Categorization Works */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">How Auto-Categorization Works</CardTitle>
              <CardDescription className="text-base">
                The app learns from your categorization choices
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            When you categorize a transaction, the app remembers the merchant and category. Future
            transactions from that merchant are automatically categorized the same way.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 border">
            <p className="text-sm font-medium mb-3">Example</p>
            <StepList
              steps={[
                { title: 'First transaction', content: 'You import a transaction from "Safeway #1234" and categorize it as "Groceries"' },
                { title: 'Next month', content: 'You import another transaction from "Safeway #5678"' },
                { title: 'Auto-categorized', content: 'The app recognizes "Safeway" and automatically categorizes it as "Groceries"' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Merchant Groups */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Tag className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Merchant Groups</CardTitle>
              <CardDescription className="text-base">
                Group merchant name variations together
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Merchant groups solve the problem of merchants appearing with different names. For example:
          </p>

          <div className="bg-muted/50 rounded-lg p-4 border">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>"Safeway #1234"</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>"Safeway #5678"</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>"SAFEWAY STORE 1234"</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>"Safeway Online"</span>
              </li>
            </ul>
          </div>

          <p className="text-sm text-muted-foreground">
            These are all the same merchant (Safeway), but they appear differently in your bank
            statement. Merchant groups let you group them together.
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm font-medium mb-3">Creating a Merchant Group</p>
              <StepList
                steps={[
                  { title: 'Go to Merchants page', content: <><Link href="/merchants" className="text-primary hover:underline">Navigate to the Merchants page</Link></> },
                  { title: 'Create group', content: 'Click "Create Merchant Group"' },
                  { title: 'Enter name', content: 'Enter a group name (e.g., "Safeway")' },
                  { title: 'Select category', content: 'Select a default category (e.g., "Groceries")' },
                  { title: 'Save', content: 'Click "Create"' },
                ]}
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-3">Adding Merchants to a Group</p>
              <p className="text-sm text-muted-foreground mb-3">Once you've created a group, you need to add merchant names to it:</p>
              <StepList
                steps={[
                  { title: 'View group', content: 'Click on a merchant group to view details' },
                  { title: 'Add mapping', content: 'Click "Add Merchant Mapping"' },
                  { title: 'Enter name', content: 'Enter the merchant name as it appears in your transactions (e.g., "Safeway #1234")' },
                  { title: 'Save', content: 'Click "Add"' },
                  { title: 'Repeat', content: 'Repeat for all variations of this merchant' },
                ]}
              />
            </div>
          </div>

          <Callout type="tip" title="Use wildcards">
            You can use wildcards in merchant mappings. For example, "Safeway*" will match any
            merchant name starting with "Safeway". This saves you from adding every store number!
          </Callout>
        </CardContent>
      </Card>

      {/* Auto-Grouping */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Auto-Grouping</CardTitle>
              <CardDescription className="text-base">
                Let the app suggest merchant groups automatically
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The app can automatically create merchant groups based on your transaction history:
          </p>
          <StepList
            steps={[
              { title: 'Go to Merchants page', content: <><Link href="/merchants" className="text-primary hover:underline">Navigate to the Merchants page</Link></> },
              { title: 'Auto-group', content: 'Click "Auto-Group Merchants"' },
              { title: 'Review suggestions', content: 'The app will analyze your transactions and suggest merchant groups' },
              { title: 'Approve', content: 'Review the suggestions and approve the ones you want' },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            This is a huge time-saver when you're first setting up the merchant system!
          </p>
        </CardContent>
      </Card>

      {/* Backfilling Categories */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Backfilling Categories</CardTitle>
              <CardDescription className="text-base">
                Apply merchant groups to existing transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            After setting up merchant groups, you can backfill categories for existing transactions:
          </p>
          <StepList
            steps={[
              { title: 'Go to Merchants page', content: <><Link href="/merchants" className="text-primary hover:underline">Navigate to the Merchants page</Link></> },
              { title: 'Backfill', content: 'Click "Backfill Categories"' },
              { title: 'Re-categorize', content: 'The app will re-categorize all uncategorized transactions based on merchant groups' },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            This is useful if you imported transactions before setting up merchant groups.
          </p>
        </CardContent>
      </Card>

      {/* Merchant Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Merchant Statistics</CardTitle>
              <CardDescription className="text-base">
                Track spending patterns by merchant
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">The Merchants page shows statistics for each merchant group:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Transaction count:</strong> How many transactions from this merchant</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Total spent:</strong> How much you've spent at this merchant</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Average transaction:</strong> Typical transaction amount</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Most common category:</strong> Which category you use most for this merchant</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            This helps you understand your spending patterns and verify that merchant groups are
            set up correctly.
          </p>
        </CardContent>
      </Card>

      {/* Editing and Deleting */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Editing and Deleting Merchant Groups</CardTitle>
              <CardDescription className="text-base">
                Manage your merchant groups
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">You can edit or delete merchant groups at any time:</p>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[80px]">Edit</div>
              <div className="text-sm text-muted-foreground">
                Click on a merchant group to view details, then click "Edit" to change the name or default category
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[80px]">Delete</div>
              <div className="text-sm text-muted-foreground">
                Click the "..." menu and select "Delete" to remove the group
              </div>
            </div>
          </div>
          <Callout type="warning" title="Deleting merchant groups">
            Deleting a merchant group doesn't delete transactions or change their categories. It
            just removes the auto-categorization rule for future transactions.
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
                <Store className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Start with Common Merchants</CardTitle>
                <CardDescription className="text-base">
                  Focus on merchants you visit frequently
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Grocery stores</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Gas stations</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Restaurants you visit regularly</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Utility companies</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Subscription services</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Use Descriptive Group Names</CardTitle>
                <CardDescription className="text-base">
                  Use the merchant's common name
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="font-medium text-sm min-w-[100px] text-green-700 dark:text-green-400">Good</div>
                <div className="text-sm text-muted-foreground">"Safeway"</div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <div className="font-medium text-sm min-w-[100px] text-yellow-700 dark:text-yellow-400">Less good</div>
                <div className="text-sm text-muted-foreground">"SAFEWAY STORE 1234"</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <AlertCircle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Handle Split Merchants</CardTitle>
                <CardDescription className="text-base">
                  Merchants that sell items in multiple categories
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Some merchants sell items in multiple categories (e.g., Target sells groceries, clothing,
              and household items). You have two options:
            </p>
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[180px]">Choose most common</div>
                <div className="text-sm text-muted-foreground">
                  Set the default to the category you use most often, then manually adjust exceptions
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium text-sm min-w-[180px]">Don't auto-categorize</div>
                <div className="text-sm text-muted-foreground">
                  Leave these merchants without a group and categorize each transaction manually
                </div>
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
              <CardTitle className="text-xl">Tips for Success</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Set up merchant groups before importing large batches of transactions
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use the auto-grouping feature to get started quickly
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Add new merchants as you encounter them
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use wildcards to match multiple store locations
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Review merchant statistics to find patterns in your spending
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">6</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Update default categories if your spending habits change
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">7</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Don't try to create groups for every merchant - focus on frequent ones
              </p>
            </li>
          </ul>

          <Callout type="tip" title="The 80/20 rule">
            You probably spend 80% of your money at 20% of merchants. Focus on setting up groups
            for those frequent merchants, and you'll auto-categorize most of your transactions!
          </Callout>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/merchants" />
    </div>
  );
}

