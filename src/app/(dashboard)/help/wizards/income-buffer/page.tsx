'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Wizard } from '@/components/wizards/Wizard';
import { WizardStep } from '@/components/wizards/WizardStep';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Callout } from '@/components/help/Callout';
import { VisualChecklist } from '@/components/help/VisualChecklist';
import { Zap } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export default function IncomeBufferWizardPage() {
  const router = useRouter();
  const [wizardData, setWizardData] = useState({
    monthlyExpenses: '',
    currentBuffer: '',
    targetMonths: '1',
  });
  const [isCompleting, setIsCompleting] = useState(false);

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const monthlyExpenses = parseFloat(wizardData.monthlyExpenses || '0');
      const currentBuffer = parseFloat(wizardData.currentBuffer || '0');
      const targetMonths = parseFloat(wizardData.targetMonths || '1');
      const targetAmount = monthlyExpenses * targetMonths;

      // Validate inputs
      if (monthlyExpenses <= 0) {
        toast.error('Please enter your monthly expenses');
        setIsCompleting(false);
        return;
      }

      // Step 1: Enable the income buffer feature (this creates the category if needed)
      const featureResponse = await fetch('/api/features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          featureName: 'income_buffer',
          enabled: true,
        }),
      });

      if (!featureResponse.ok) {
        const errorData = await featureResponse.json();
        throw new Error(errorData.error || 'Failed to enable income buffer feature');
      }

      // Wait for the feature response to complete before proceeding
      await featureResponse.json();

      // Step 2: Save buffer goal settings
      const settingsResponse = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: [
            { key: 'income_buffer_target_amount', value: targetAmount.toString() },
            { key: 'income_buffer_monthly_expenses', value: monthlyExpenses.toString() },
            { key: 'income_buffer_target_months', value: targetMonths.toString() },
          ],
        }),
      });

      if (!settingsResponse.ok) {
        const errorData = await settingsResponse.json();
        throw new Error(errorData.error || 'Failed to save buffer settings');
      }

      // Step 3: If they have a current buffer amount, add it to the Income Buffer category
      // The feature enable request has completed, so the category should exist now
      if (currentBuffer > 0) {
        const addResponse = await fetch('/api/income-buffer/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: currentBuffer }),
        });

        if (!addResponse.ok) {
          const errorData = await addResponse.json();
          console.error('Failed to add initial buffer amount:', errorData);
          // Don't fail the whole wizard if this fails - they can add it manually
          toast.warning('Buffer enabled, but initial amount not added. You can add it manually from the Income Buffer page.');
        }
      }

      toast.success('Income buffer setup complete!');
      router.push('/income-buffer');
    } catch (error: any) {
      console.error('Error completing wizard:', error);
      toast.error(error.message || 'Failed to complete setup. Please try again.');
      setIsCompleting(false);
    }
  };

  const handleCancel = () => {
    router.push('/help');
  };

  const updateData = (field: string, value: string) => {
    setWizardData(prev => ({ ...prev, [field]: value }));
  };

  const monthlyExpenses = parseFloat(wizardData.monthlyExpenses || '0');
  const currentBuffer = parseFloat(wizardData.currentBuffer || '0');
  const targetMonths = parseFloat(wizardData.targetMonths || '1');
  const targetAmount = monthlyExpenses * targetMonths;
  const amountNeeded = Math.max(0, targetAmount - currentBuffer);

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Help Center', href: '/help' },
          { label: 'Wizards', href: '/help' },
          { label: 'Income Buffer', href: '/help/wizards/income-buffer' },
        ]}
      />

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Zap className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Income Buffer Wizard</h1>
          <p className="text-lg text-muted-foreground">
            Set up your income buffer to break the paycheck-to-paycheck cycle
          </p>
        </div>
      </div>

      <div className="bg-card border rounded-lg p-6">
        <Wizard
          steps={['Introduction', 'Calculate', 'Complete']}
          onComplete={handleComplete}
          onCancel={handleCancel}
          isProcessing={isCompleting}
        >
          {/* Step 1: Introduction */}
          <WizardStep
            title="What is an Income Buffer?"
            description="Learn how the income buffer helps you age your money and reduce financial stress."
          >
            <div className="space-y-6">
              <p className="text-muted-foreground">
                An income buffer is money you set aside to fund next month's expenses. Instead
                of living paycheck-to-paycheck, you'll be living on last month's income.
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold mb-3">✨ Benefits</h3>
                  <VisualChecklist
                    items={[
                      { text: 'Reduced stress', subtext: 'You know you have next month covered' },
                      { text: 'Better planning', subtext: 'Budget for the entire month at once' },
                      { text: 'Flexibility', subtext: 'Handle irregular income more easily' },
                      { text: 'Peace of mind', subtext: 'Break the paycheck-to-paycheck cycle' },
                    ]}
                    variant="compact"
                  />
                </div>

                <div>
                  <h3 className="font-semibold mb-3">🔄 How It Works</h3>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        1
                      </div>
                      <p className="text-sm">Build up a buffer equal to one month's expenses</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        2
                      </div>
                      <p className="text-sm">When you get paid, add money to the buffer</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <p className="text-sm">At the start of each month, fund your budget from the buffer</p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        4
                      </div>
                      <p className="text-sm">Your current month's income goes into the buffer for next month</p>
                    </div>
                  </div>
                </div>
              </div>

              <Callout type="info" title="Is this right for you?">
                The income buffer is an advanced feature. Make sure you're comfortable with basic
                budgeting before setting this up. See the{' '}
                <Link href="/help/features/income-buffer" className="text-primary hover:underline">
                  Income Buffer guide
                </Link>{' '}
                for more information.
              </Callout>
            </div>
          </WizardStep>

          {/* Step 2: Calculate */}
          <WizardStep
            title="Calculate Your Buffer Goal"
            description="Let's figure out how much you need in your income buffer."
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="expenses">Average Monthly Expenses</Label>
                <Input
                  id="expenses"
                  type="number"
                  placeholder="0.00"
                  value={wizardData.monthlyExpenses}
                  onChange={(e) => updateData('monthlyExpenses', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  How much do you typically spend each month? (Include all bills and expenses)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="current">Current Buffer Amount</Label>
                <Input
                  id="current"
                  type="number"
                  placeholder="0.00"
                  value={wizardData.currentBuffer}
                  onChange={(e) => updateData('currentBuffer', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  How much money do you currently have set aside? (Enter 0 if starting from scratch)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target">Target Buffer Size (Months)</Label>
                <Input
                  id="target"
                  type="number"
                  min="1"
                  max="3"
                  placeholder="1"
                  value={wizardData.targetMonths}
                  onChange={(e) => updateData('targetMonths', e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  Most people start with 1 month. You can increase this later.
                </p>
              </div>

              {monthlyExpenses > 0 && (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <h3 className="font-semibold mb-3">Your Buffer Goal</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Amount:</span>
                      <span className="font-medium">${targetAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Buffer:</span>
                      <span className="font-medium">${currentBuffer.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t font-semibold">
                      <span>Amount Needed:</span>
                      <span className={amountNeeded > 0 ? 'text-orange-600' : 'text-green-600'}>
                        ${amountNeeded.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </WizardStep>

          {/* Step 3: Complete */}
          <WizardStep
            title="You're All Set!"
            description="When you click Complete, we'll set everything up for you."
          >
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-4">✨ What happens when you click Complete:</h3>
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-semibold">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Enable Income Buffer feature</p>
                      <p className="text-sm text-muted-foreground">
                        We'll automatically enable the feature and create your Income Buffer category
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3 p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-semibold">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Save your buffer goal</p>
                      <p className="text-sm text-muted-foreground">
                        Your target of ${targetAmount.toFixed(2)} will be saved for tracking
                      </p>
                    </div>
                  </div>
                  {currentBuffer > 0 && (
                    <div className="flex gap-3 p-3 border rounded-lg bg-green-50 dark:bg-green-950/20">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-semibold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Add your current buffer</p>
                        <p className="text-sm text-muted-foreground">
                          We'll add your ${currentBuffer.toFixed(2)} to the Income Buffer category
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {amountNeeded > 0 && (
                <Callout type="info" title="Keep building your buffer">
                  You still need ${amountNeeded.toFixed(2)} to reach your goal. Continue adding money
                  to your Income Buffer category each month until you reach ${targetAmount.toFixed(2)}.
                </Callout>
              )}

              {amountNeeded <= 0 && (
                <Callout type="tip" title="You're ready to go!">
                  You already have enough saved to start using the Income Buffer feature immediately.
                  Start using it to fund next month's budget!
                </Callout>
              )}

              <div>
                <h3 className="font-semibold mb-3">📚 Helpful Resources</h3>
                <div className="grid gap-2">
                  <Link
                    href="/help/features/income-buffer"
                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-2xl">📖</span>
                    <span className="text-sm font-medium">Income Buffer Feature Guide</span>
                  </Link>
                  <Link
                    href="/help/faq/advanced"
                    className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-2xl">❓</span>
                    <span className="text-sm font-medium">Advanced Features FAQ</span>
                  </Link>
                </div>
              </div>
            </div>
          </WizardStep>
        </Wizard>
      </div>
    </div>
  );
}

