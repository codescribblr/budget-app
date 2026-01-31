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
            The merchant system automatically categorizes your transactions based on where you spent money.
            Merchant groupings are managed globally by administrators, ensuring consistent merchant names
            across all users and automatic assignment of your transactions to the correct merchants.
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
              <CardTitle className="text-xl mb-2">How Merchant Grouping Works</CardTitle>
              <CardDescription className="text-base">
                Automatic merchant assignment managed by administrators
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Merchant groups solve the problem of merchants appearing with different names in your bank statements.
            Administrators manage merchant groupings globally, ensuring that all variations of a merchant name
            are automatically grouped together. For example:
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
            All of these variations are automatically recognized as "Safeway" and your transactions
            are automatically assigned to the correct merchant group.
          </p>

          <Callout type="info" title="Automatic Assignment">
            Your transactions are automatically assigned to merchant groups when imported or created.
            You don't need to do anything - it happens automatically!
          </Callout>
        </CardContent>
      </Card>

      {/* Overriding Merchant Assignment */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Overriding Merchant Assignment</CardTitle>
              <CardDescription className="text-base">
                Change merchant assignment for individual transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            If a transaction is assigned to the wrong merchant, you can override it:
          </p>
          <StepList
            steps={[
              { title: 'Edit transaction', content: 'Click on a transaction to edit it' },
              { title: 'Select merchant', content: 'In the merchant dropdown, select a different merchant from the list' },
              { title: 'Or recommend new', content: 'If the merchant doesn\'t exist, click "Recommend New Merchant" to suggest it' },
              { title: 'Save', content: 'Save the transaction with your override' },
            ]}
          />
          <Callout type="tip" title="Merchant Recommendations">
            When you recommend a new merchant, administrators will review and approve it. Once approved,
            it will be available for all users and future transactions will be automatically assigned.
          </Callout>
        </CardContent>
      </Card>

      {/* Viewing Merchant Information */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Viewing Merchant Information</CardTitle>
              <CardDescription className="text-base">
                See merchant details in your transactions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Merchant information is displayed throughout the app:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Transaction list:</strong> Each transaction shows its assigned merchant name</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Reports:</strong> Spending reports can be filtered and grouped by merchant</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span><strong>Merchant logos:</strong> Many merchants display with their logo or icon for easy recognition</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            This helps you quickly identify and understand your spending patterns.
          </p>
        </CardContent>
      </Card>

      {/* Best Practices */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Tips for Success</h2>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Trust the Automatic Assignment</CardTitle>
                <CardDescription className="text-base">
                  Most transactions are automatically assigned correctly
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The merchant system automatically assigns your transactions to the correct merchants.
              You typically don't need to do anything - just import your transactions and they'll be
              automatically grouped and categorized.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Edit3 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Override When Needed</CardTitle>
                <CardDescription className="text-base">
                  Change merchant assignment for individual transactions
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If a transaction is assigned to the wrong merchant, simply edit the transaction and
              select the correct merchant from the dropdown. Your override will be saved for that
              specific transaction.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Store className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Recommend New Merchants</CardTitle>
                <CardDescription className="text-base">
                  Help improve the merchant database
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you encounter a merchant that doesn't exist in the system, use the "Recommend New Merchant"
              option when editing a transaction. Administrators will review your recommendation and add it
              to the global merchant list once approved, making it available for all users.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Reference */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Quick Reference</CardTitle>
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
                Transactions are automatically assigned to merchants when imported or created
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Edit individual transactions to override merchant assignment if needed
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Recommend new merchants when editing transactions if they don't exist yet
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Merchant logos and icons help you quickly identify merchants in your transaction list
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use merchant filters in reports to analyze spending by merchant
              </p>
            </li>
          </ul>

          <Callout type="tip" title="Automatic and Consistent">
            The merchant system is fully automatic and managed by administrators, ensuring consistent
            merchant names across all users. You can focus on budgeting while the system handles
            the merchant grouping automatically!
          </Callout>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/merchants" />
    </div>
  );
}


