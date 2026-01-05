import Link from 'next/link';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Callout } from '@/components/help/Callout';
import { WasThisHelpful } from '@/components/help/WasThisHelpful';
import { StepList } from '@/components/help/StepList';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileCheck,
  Plus,
  AlertTriangle,
  DollarSign,
  Building2,
  Edit3,
  CheckCircle2,
  Lightbulb,
  HelpCircle
} from 'lucide-react';

export default function PendingChecksFeaturePage() {
  return (
    <div className="space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Features', href: '/help/features/dashboard' },
          { label: 'Pending Checks', href: '/help/features/pending-checks' },
        ]}
      />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Pending Checks</h1>
        <p className="text-lg text-muted-foreground">
          Track checks you've written that haven't cleared yet
        </p>
      </div>

      {/* Introduction */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-base leading-relaxed">
            Pending Checks helps you avoid overdrafts by tracking checks you've written that haven't
            cleared your bank account yet. This money is committed but still shows in your account
            balance.
          </p>
        </CardContent>
      </Card>

      {/* Why Track Pending Checks */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Why Track Pending Checks?</CardTitle>
              <CardDescription className="text-base">
                Understanding the problem pending checks solve
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            When you write a check, the money doesn't leave your account immediately. It might take
            days or weeks for the recipient to deposit it. During this time:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>Your bank account balance still includes this money</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>But you've already committed it to someone else</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <span>You shouldn't spend it or you might overdraft</span>
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Pending Checks solves this problem by reducing your "Available to Save" by the amount
            of pending checks, ensuring you don't accidentally allocate money you've already committed.
          </p>
        </CardContent>
      </Card>

      {/* Adding a Pending Check */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Adding a Pending Check</CardTitle>
              <CardDescription className="text-base">
                Record a check you've written
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepList
            steps={[
              { title: 'Go to Dashboard', content: 'Navigate to your Dashboard' },
              { title: 'Click "Add Check"', content: 'In the Pending Checks card, click "Add Check"' },
              { title: 'Enter check details', content: 'Fill in the check information (see fields below)' },
              { title: 'Click "Add Check"', content: 'Save the pending check' },
            ]}
          />
          <div className="bg-muted/50 rounded-lg p-4 border mt-4">
            <p className="text-sm font-medium mb-3">Check Details to Enter:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Check number:</strong> The check number (optional but recommended)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Payee:</strong> Who you wrote the check to</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Amount:</strong> The check amount</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Date written:</strong> When you wrote the check</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span><strong>Category:</strong> Which budget category this expense belongs to</span>
              </li>
            </ul>
          </div>
          <Callout type="info" title="How it affects your budget">
            When you add a pending check:
            <ul>
              <li>The amount is subtracted from your "Available to Save"</li>
              <li>The category balance is reduced (just like a regular transaction)</li>
              <li>Your account balance stays the same (the money is still there)</li>
            </ul>
          </Callout>
        </CardContent>
      </Card>

      {/* When the Check Clears */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">When the Check Clears</CardTitle>
              <CardDescription className="text-base">
                Remove the check from pending once it clears your bank
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <StepList
            steps={[
              { title: 'Update account balance', content: 'Update your account balance to reflect the cleared check' },
              { title: 'Go to Pending Checks', content: 'Navigate to the Pending Checks card' },
              { title: 'Open check menu', content: 'Click the "..." menu on the check' },
              { title: 'Mark as cleared', content: 'Select "Mark as Cleared" or "Delete"' },
            ]}
          />
          <p className="text-sm text-muted-foreground">
            This removes the check from the pending list and restores your "Available to Save"
            (since the money has now actually left your account).
          </p>
          <Callout type="tip" title="Check your bank regularly">
            Review your bank account weekly to see which checks have cleared. This keeps your
            pending checks list accurate.
          </Callout>
        </CardContent>
      </Card>

      {/* How Pending Checks Affect Your Budget */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">How Pending Checks Affect Your Budget</h2>

        {/* Available to Save */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Available to Save</CardTitle>
                <CardDescription className="text-base">
                  Pending checks reduce your available funds
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Pending checks reduce your "Available to Save":
            </p>
            <div className="bg-muted/50 rounded-lg p-4 border">
              <p className="text-sm font-medium text-muted-foreground mb-1">Formula</p>
              <p className="text-sm font-mono">Available to Save = Total Money in Accounts - Total Allocated to Categories - Pending Checks</p>
            </div>
            <p className="text-sm text-muted-foreground">
              This prevents you from allocating money that's already committed.
            </p>
          </CardContent>
        </Card>

        {/* Category Balances */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Category Balances</CardTitle>
                <CardDescription className="text-base">
                  Category balances are reduced immediately
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              When you add a pending check, the category balance is reduced immediately (just like
              recording a transaction). This shows that you've spent that money, even though it hasn't
              left your account yet.
            </p>
          </CardContent>
        </Card>

        {/* Account Balances */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Account Balances</CardTitle>
                <CardDescription className="text-base">
                  Account balances remain unchanged
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Pending checks don't affect your account balances. Your account balance should always
              match your bank, and the money is still in your account until the check clears.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Editing and Deleting */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Edit3 className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">Editing and Deleting</CardTitle>
              <CardDescription className="text-base">
                Modify or remove pending checks at any time
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[60px]">Edit</div>
              <div className="text-sm text-muted-foreground">
                Click the "..." menu and select "Edit" to change the amount, payee, or category
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm min-w-[60px]">Delete</div>
              <div className="text-sm text-muted-foreground">
                Click the "..." menu and select "Delete" to remove the check (use this when the check clears or if you void it)
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alternative Approaches */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Alternative Approaches</h2>
          <p className="text-muted-foreground">
            Pending Checks is optional. If you don't write many checks, you might prefer to handle them differently:
          </p>
        </div>

        {/* Record as Transaction Immediately */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Option 1: Record as Transaction Immediately</CardTitle>
                <CardDescription className="text-base">
                  Record the check as a regular transaction when you write it
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Record the check as a regular transaction when you write it, and update your account
              balance to reflect the reduced amount. This is simpler but requires manually tracking
              which checks haven't cleared.
            </p>
          </CardContent>
        </Card>

        {/* Wait Until It Clears */}
        <Card>
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">Option 2: Wait Until It Clears</CardTitle>
                <CardDescription className="text-base">
                  Don't record anything until the check clears your bank
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Don't record anything until the check clears your bank. Then record it as a transaction
              and update your account balance. This is simplest but requires careful tracking to avoid
              overdrafts.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* When to Use Pending Checks */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">When to Use Pending Checks</CardTitle>
              <CardDescription className="text-base">
                This feature is most useful in certain situations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Use the Pending Checks feature if:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>You write checks regularly (rent, bills, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Checks take a long time to clear (weeks or months)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>You want to avoid overdrafts</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>You want your account balance to always match your bank</span>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Skip it if:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>You rarely write checks</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>Checks clear quickly (within a few days)</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                <span>You prefer simpler tracking</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Tips Section */}
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Tips for Managing Pending Checks</CardTitle>
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
                Add checks to the pending list as soon as you write them
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Include the check number to make tracking easier
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Review your bank account weekly to see which checks have cleared
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">4</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Delete or mark as cleared promptly when checks clear
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">5</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                Use descriptive payee names so you can identify checks easily
              </p>
            </li>
            <li className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">6</span>
              </div>
              <p className="text-sm text-muted-foreground pt-0.5">
                If a check hasn't cleared after 6 months, contact the payee (it might be lost)
              </p>
            </li>
          </ul>
          <Callout type="warning" title="Stale checks">
            If a check hasn't cleared after several months, it might be lost or the payee might
            have forgotten about it. Contact them to verify. Some banks won't honor checks older
            than 6 months.
          </Callout>
        </CardContent>
      </Card>

      <WasThisHelpful articlePath="/help/features/pending-checks" />
    </div>
  );
}


