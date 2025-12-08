'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Wizard } from '@/components/wizards/Wizard';
import { WizardStep } from '@/components/wizards/WizardStep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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
  { name: 'Personal Care', monthly_amount: 0 },
  { name: 'Savings', monthly_amount: 0 },
  { name: 'Phone/Internet', monthly_amount: 0 },
  { name: 'Clothing', monthly_amount: 0 },
  { name: 'Emergency Fund', monthly_amount: 0 },
  { name: 'Subscriptions', monthly_amount: 0 },
  { name: 'Healthcare/Medical', monthly_amount: 0 },
  { name: 'Gas/Fuel', monthly_amount: 0 },
  { name: 'Home Maintenance', monthly_amount: 0 },
  { name: 'Pet Care', monthly_amount: 0 },
  { name: 'Education', monthly_amount: 0 },
  { name: 'Gifts/Donations', monthly_amount: 0 },
  { name: 'Travel', monthly_amount: 0 },
  { name: 'Debt Payment', monthly_amount: 0 },
  { name: 'Miscellaneous', monthly_amount: 0 },
];

// The 10 most common categories to enable by default
const DEFAULT_SELECTED_CATEGORIES = [
  'Rent/Mortgage',
  'Utilities',
  'Groceries',
  'Transportation',
  'Insurance',
  'Dining Out',
  'Entertainment',
  'Personal Care',
  'Savings',
  'Phone/Internet',
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
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(DEFAULT_SELECTED_CATEGORIES)
  );

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

      // Prepare categories to create (only selected ones)
      const categoriesToCreate = DEFAULT_CATEGORIES
        .filter((category) => selectedCategories.has(category.name))
        .map((category, index) => ({
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
        `Budget created! Added ${result.accountsCount || accountsToCreate.length} account(s) and ${result.categoriesCount || categoriesToCreate.length} categories.`
      );

      // Redirect to money movement page
      router.push('/money-movement');
    } catch (error: any) {
      console.error('Error creating budget:', error);
      toast.error(error.message || 'Failed to create budget. Please try again.');
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
                  <li>Your monthly income (approximate is fine, optional)</li>
                </ul>
                <p className="text-sm mt-2">
                  We'll create default budget categories for you, so you don't need to prepare a list of expenses.
                </p>
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
            description="Tell us about your monthly income. This helps us understand your budget, but you can configure detailed income settings later."
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
                  Enter your typical monthly take-home pay (after taxes and deductions). This is just for reference - you'll set up detailed income settings later.
                </p>
              </div>

              <Callout type="info" title="Note">
                This wizard creates your accounts and categories. After completion, you can configure detailed income settings (pay frequency, tax rate, deductions) on the Income page.
              </Callout>
            </div>
          </WizardStep>

          {/* Step 4: Categories */}
          <WizardStep
            title="Select Budget Categories"
            description="Choose which categories you'd like to start with. The most common ones are already selected."
          >
            <div className="space-y-4">
              <Callout type="info" title="Select categories">
                Choose from these common budget categories. Scroll to see all options. You can add more later!
              </Callout>

              <div className="relative">
                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2 border rounded-lg p-4 bg-muted/20">
                  {DEFAULT_CATEGORIES.map((category) => {
                    const isSelected = selectedCategories.has(category.name);
                    return (
                      <div
                        key={category.name}
                        className={`
                          flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors
                          ${isSelected ? 'bg-primary/10 border-primary' : 'bg-background hover:bg-muted'}
                        `}
                        onClick={() => {
                          const newSelected = new Set(selectedCategories);
                          if (isSelected) {
                            newSelected.delete(category.name);
                          } else {
                            newSelected.add(category.name);
                          }
                          setSelectedCategories(newSelected);
                        }}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedCategories);
                            if (checked) {
                              newSelected.add(category.name);
                            } else {
                              newSelected.delete(category.name);
                            }
                            setSelectedCategories(newSelected);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="text-sm font-medium flex-1">{category.name}</span>
                      </div>
                    );
                  })}
                </div>
                {/* Fade gradient at bottom to indicate scrollability */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none rounded-b-lg" />
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
                <span>
                  {selectedCategories.size} of {DEFAULT_CATEGORIES.length} categories selected
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCategories.size === DEFAULT_CATEGORIES.length) {
                      setSelectedCategories(new Set(DEFAULT_SELECTED_CATEGORIES));
                    } else {
                      setSelectedCategories(new Set(DEFAULT_CATEGORIES.map((c) => c.name)));
                    }
                  }}
                  className="text-primary hover:underline"
                >
                  {selectedCategories.size === DEFAULT_CATEGORIES.length
                    ? 'Reset to defaults'
                    : 'Select all'}
                </button>
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
                    {selectedCategories.size} category{selectedCategories.size !== 1 ? 'ies' : 'y'} will be created
                  </p>
                  {selectedCategories.size > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {Array.from(selectedCategories).map((cat) => (
                        <span
                          key={cat}
                          className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <Callout type="tip" title="What happens next?">
                After completing this wizard, you'll be taken to the Money Movement page where
                you can allocate your current money to categories. You can also configure detailed
                income settings on the Income page. Then you're ready to start budgeting!
              </Callout>
            </div>
          </WizardStep>
        </Wizard>
      </div>
    </div>
  );
}


