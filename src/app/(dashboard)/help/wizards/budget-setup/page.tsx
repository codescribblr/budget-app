'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Wizard } from '@/components/wizards/Wizard';
import { WizardStep } from '@/components/wizards/WizardStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Callout } from '@/components/help/Callout';
import { Rocket, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_CATEGORIES = [
  { name: 'Rent/Mortgage', monthly_amount: 0 },
  { name: 'Utilities', monthly_amount: 0 },
  { name: 'Groceries', monthly_amount: 0 },
  { name: 'Transportation', monthly_amount: 0 },
  { name: 'Insurance', monthly_amount: 0 },
  { name: 'Dining Out', monthly_amount: 0 },
  { name: 'Entertainment', monthly_amount: 0 },
  { name: 'Clothing', monthly_amount: 0 },
  { name: 'Personal Care', monthly_amount: 0 },
  { name: 'Emergency Fund', monthly_amount: 0 },
  { name: 'Savings', monthly_amount: 0 },
  { name: 'Miscellaneous', monthly_amount: 0 },
];

export default function BudgetSetupWizardPage() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [wizardData, setWizardData] = useState({
    checkingBalance: '',
    savingsBalance: '',
    monthlyIncome: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  const handleComplete = async () => {
    setIsCreating(true);
    try {
      // Create accounts
      const accountsToCreate = [];

      if (wizardData.checkingBalance && parseFloat(wizardData.checkingBalance) > 0) {
        accountsToCreate.push({
          name: 'Checking Account',
          balance: parseFloat(wizardData.checkingBalance),
          account_type: 'checking' as const,
          include_in_totals: true,
        });
      }

      if (wizardData.savingsBalance && parseFloat(wizardData.savingsBalance) > 0) {
        accountsToCreate.push({
          name: 'Savings Account',
          balance: parseFloat(wizardData.savingsBalance),
          account_type: 'savings' as const,
          include_in_totals: true,
        });
      }

      // Create accounts
      for (const account of accountsToCreate) {
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(account),
        });

        if (!response.ok) {
          throw new Error('Failed to create account');
        }
      }

      // Create categories
      for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
        const category = DEFAULT_CATEGORIES[i];
        const response = await fetch('/api/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...category,
            sort_order: i,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create category');
        }
      }

      toast.success(
        `Budget created! Added ${accountsToCreate.length} account(s) and ${DEFAULT_CATEGORIES.length} categories.`
      );

      // Redirect to money movement page
      router.push('/money-movement');
    } catch (error) {
      console.error('Error creating budget:', error);
      toast.error('Failed to create budget. Please try again.');
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    router.push('/help');
  };

  const updateData = (field: string, value: string) => {
    setWizardData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Wizards', href: '/help' },
          { label: 'Budget Setup', href: '/help/wizards/budget-setup' },
        ]}
      />

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Rocket className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Budget Setup Wizard</h1>
          <p className="text-lg text-muted-foreground">
            Let's get your budget started in just a few steps
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <Wizard
          steps={['Welcome', 'Accounts', 'Income', 'Categories', 'Review']}
          onComplete={handleComplete}
          onCancel={handleCancel}
          isProcessing={isCreating}
        >
          {/* Step 1: Welcome */}
          <WizardStep
            title="Welcome to Budget Setup!"
            description="This wizard will help you set up your first budget in just a few minutes."
          >
            <div className="space-y-4">
              <Callout type="info" title="What you'll need">
                Before we begin, gather the following information:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Current balance of your checking account</li>
                  <li>Current balance of your savings account (if you have one)</li>
                  <li>Your monthly income (approximate is fine)</li>
                  <li>A list of your regular monthly expenses</li>
                </ul>
              </Callout>

              <div className="prose dark:prose-invert max-w-none">
                <h3>What this wizard will do:</h3>
                <ol>
                  <li>Set up your bank accounts</li>
                  <li>Configure your income</li>
                  <li>Create your first budget categories</li>
                  <li>Allocate your current money to categories</li>
                </ol>

                <p className="text-sm text-muted-foreground mt-4">
                  Don't worry - you can change everything later! This is just to get you started.
                </p>
              </div>
            </div>
          </WizardStep>

          {/* Step 2: Accounts */}
          <WizardStep
            title="Add Your Accounts"
            description="Enter your current account balances. You can add more accounts later."
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="checking">Checking Account Balance</Label>
                <Input
                  id="checking"
                  type="number"
                  placeholder="0.00"
                  value={wizardData.checkingBalance}
                  onChange={(e) => updateData('checkingBalance', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the current balance in your main checking account
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="savings">Savings Account Balance (Optional)</Label>
                <Input
                  id="savings"
                  type="number"
                  placeholder="0.00"
                  value={wizardData.savingsBalance}
                  onChange={(e) => updateData('savingsBalance', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  If you have a savings account, enter its current balance
                </p>
              </div>

              <Callout type="tip" title="Don't include retirement accounts">
                Only include accounts you actively use for budgeting. Don't include 401(k),
                IRA, or other retirement accounts.
              </Callout>
            </div>
          </WizardStep>

          {/* Step 3: Income */}
          <WizardStep
            title="Set Up Your Income"
            description="Tell us about your monthly income so we can help you budget effectively."
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="income">Monthly Income (After Taxes)</Label>
                <Input
                  id="income"
                  type="number"
                  placeholder="0.00"
                  value={wizardData.monthlyIncome}
                  onChange={(e) => updateData('monthlyIncome', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your typical monthly take-home pay (after taxes and deductions)
                </p>
              </div>

              <Callout type="info" title="Irregular income?">
                If your income varies month to month, enter a conservative estimate (lower than
                average). You can always adjust later!
              </Callout>
            </div>
          </WizardStep>

          {/* Step 4: Categories */}
          <WizardStep
            title="Create Budget Categories"
            description="We'll create some essential categories to get you started."
          >
            <div className="space-y-4">
              <Callout type="info" title="Default categories">
                We'll create these essential categories for you:
              </Callout>

              <div className="grid grid-cols-2 gap-3">
                {[
                  'Rent/Mortgage',
                  'Utilities',
                  'Groceries',
                  'Transportation',
                  'Insurance',
                  'Dining Out',
                  'Entertainment',
                  'Clothing',
                  'Personal Care',
                  'Emergency Fund',
                  'Savings',
                  'Miscellaneous',
                ].map((category) => (
                  <div
                    key={category}
                    className="p-3 border rounded-lg bg-muted/50 text-sm font-medium"
                  >
                    {category}
                  </div>
                ))}
              </div>

              <Callout type="tip" title="Customize later">
                You can add, remove, or rename categories anytime after setup. These are just
                to get you started!
              </Callout>
            </div>
          </WizardStep>

          {/* Step 5: Review */}
          <WizardStep
            title="Review & Complete"
            description="Let's review your setup before we create your budget."
          >
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">Accounts</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Checking Account:</span>
                      <span className="font-medium">
                        ${wizardData.checkingBalance || '0.00'}
                      </span>
                    </div>
                    {wizardData.savingsBalance && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Savings Account:</span>
                        <span className="font-medium">
                          ${wizardData.savingsBalance}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t font-semibold">
                      <span>Total:</span>
                      <span>
                        $
                        {(
                          parseFloat(wizardData.checkingBalance || '0') +
                          parseFloat(wizardData.savingsBalance || '0')
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">Income</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monthly Income:</span>
                      <span className="font-medium">
                        ${wizardData.monthlyIncome || '0.00'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">Categories</h3>
                  <p className="text-sm text-muted-foreground">
                    12 default categories will be created
                  </p>
                </div>
              </div>

              <Callout type="tip" title="What happens next?">
                After completing this wizard, you'll be taken to the Money Movement page where
                you can allocate your current money to categories. Then you're ready to start
                budgeting!
              </Callout>
            </div>
          </WizardStep>
        </Wizard>
      </div>
    </div>
  );
}


