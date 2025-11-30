'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Wizard } from '@/components/wizards/Wizard';
import { WizardStep } from '@/components/wizards/WizardStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Callout } from '@/components/help/Callout';
import { Rocket, Loader2, X } from 'lucide-react';
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

export function FirstLoginWizard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [wizardData, setWizardData] = useState({
    checkingBalance: '',
    savingsBalance: '',
    monthlyIncome: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  // Check if user has accounts or categories (first login)
  useEffect(() => {
    const checkFirstLogin = async () => {
      try {
        const [accountsRes, categoriesRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/categories'),
        ]);

        if (accountsRes.ok && categoriesRes.ok) {
          const [accounts, categories] = await Promise.all([
            accountsRes.json(),
            categoriesRes.json(),
          ]);

          // Filter out system categories
          const userCategories = categories.filter((cat: any) => !cat.is_system);

          // If no accounts AND no user categories, show wizard
          if (accounts.length === 0 && userCategories.length === 0) {
            setOpen(true);
          }
        }
      } catch (error) {
        console.error('Error checking first login:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkFirstLogin();
  }, []);

  const handleComplete = async () => {
    setIsCreating(true);
    try {
      // Prepare accounts to create
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

      // Prepare categories to create
      const categoriesToCreate = DEFAULT_CATEGORIES.map((category, index) => ({
        ...category,
        sort_order: index,
      }));

      // Create everything in a single batch request
      const response = await fetch('/api/wizard/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: accountsToCreate,
          categories: categoriesToCreate,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create budget' }));
        throw new Error(errorData.error || 'Failed to create budget');
      }

      const result = await response.json();

      toast.success(
        `Budget created! Added ${result.accountsCount || accountsToCreate.length} account(s) and ${result.categoriesCount || DEFAULT_CATEGORIES.length} categories.`
      );

      setOpen(false);
      // Force a full page reload to refresh all dashboard data
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('Error creating budget:', error);
      toast.error(error.message || 'Failed to create budget. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  if (isChecking) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-[95vw] md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Welcome to Budget App!
          </DialogTitle>
          <DialogDescription>
            Let's set up your first budget in just a few minutes
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          <Wizard
            steps={['Welcome', 'Accounts', 'Income Info', 'Categories', 'Review']}
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
                    <li>Set up your bank accounts with current balances</li>
                    <li>Create your first budget categories</li>
                  </ol>

                  <p className="text-sm text-muted-foreground mt-4">
                    After setup, you'll be able to allocate your money to categories and configure your income settings. Don't worry - you can change everything later! This is just to get you started.
                  </p>
                </div>
              </div>
            </WizardStep>

            {/* Step 2: Accounts */}
            <WizardStep
              title="Add Your Accounts"
              description="Let's start by adding your bank accounts."
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="checkingBalance">Checking Account Balance</Label>
                  <Input
                    id="checkingBalance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={wizardData.checkingBalance}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, checkingBalance: e.target.value })
                    }
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your current checking account balance
                  </p>
                </div>

                <div>
                  <Label htmlFor="savingsBalance">Savings Account Balance (Optional)</Label>
                  <Input
                    id="savingsBalance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={wizardData.savingsBalance}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, savingsBalance: e.target.value })
                    }
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your current savings account balance, if you have one
                  </p>
                </div>
              </div>
            </WizardStep>

            {/* Step 3: Income */}
            <WizardStep
              title="Set Your Monthly Income"
              description="Tell us about your monthly income. This helps us understand your budget, but you can configure detailed income settings later."
            >
              <div className="space-y-4">
                <div>
                  <Label htmlFor="monthlyIncome">Monthly Income</Label>
                  <Input
                    id="monthlyIncome"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={wizardData.monthlyIncome}
                    onChange={(e) =>
                      setWizardData({ ...wizardData, monthlyIncome: e.target.value })
                    }
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Enter your approximate monthly income. This is just for reference - you'll set up detailed income settings (pay frequency, tax rate, deductions) later on the Income page.
                  </p>
                </div>
                <Callout type="info" title="Note">
                  This wizard creates your accounts and categories. After completion, you can configure detailed income settings on the Income page.
                </Callout>
              </div>
            </WizardStep>

            {/* Step 4: Categories */}
            <WizardStep
              title="Create Budget Categories"
              description="We'll create some common categories to get you started."
            >
              <div className="space-y-4">
                <Callout type="info" title="Default Categories">
                  We'll create these categories for you:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {DEFAULT_CATEGORIES.map((cat) => (
                      <li key={cat.name}>{cat.name}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">
                    You can add, remove, or modify these categories later in Settings.
                  </p>
                </Callout>
              </div>
            </WizardStep>

            {/* Step 5: Review */}
            <WizardStep
              title="Review Your Setup"
              description="Let's review what we're about to create."
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Accounts:</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {wizardData.checkingBalance && parseFloat(wizardData.checkingBalance) > 0 && (
                      <li>
                        Checking Account: ${parseFloat(wizardData.checkingBalance).toFixed(2)}
                      </li>
                    )}
                    {wizardData.savingsBalance && parseFloat(wizardData.savingsBalance) > 0 && (
                      <li>
                        Savings Account: ${parseFloat(wizardData.savingsBalance).toFixed(2)}
                      </li>
                    )}
                    {(!wizardData.checkingBalance || parseFloat(wizardData.checkingBalance) <= 0) &&
                      (!wizardData.savingsBalance || parseFloat(wizardData.savingsBalance) <= 0) && (
                        <li className="text-muted-foreground">No accounts will be created</li>
                      )}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold">Categories:</h3>
                  <p className="text-sm">
                    {DEFAULT_CATEGORIES.length} default categories will be created
                  </p>
                </div>

                <Callout type="info" title="Next Steps">
                  After setup, you can:
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Allocate your money to categories on the Money Movement page</li>
                    <li>Configure detailed income settings on the Income page</li>
                    <li>Add transactions</li>
                    <li>Import transactions from your bank</li>
                    <li>Customize your categories</li>
                  </ul>
                </Callout>
              </div>
            </WizardStep>
          </Wizard>
        </div>
      </DialogContent>
    </Dialog>
  );
}

