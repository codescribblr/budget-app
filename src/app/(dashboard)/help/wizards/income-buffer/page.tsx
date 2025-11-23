'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/help/Breadcrumbs';
import { Wizard } from '@/components/wizards/Wizard';
import { WizardStep } from '@/components/wizards/WizardStep';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Callout } from '@/components/help/Callout';
import { Zap } from 'lucide-react';
import Link from 'next/link';

export default function IncomeBufferWizardPage() {
  const router = useRouter();
  const [wizardData, setWizardData] = useState({
    monthlyExpenses: '',
    currentBuffer: '',
    targetMonths: '1',
  });

  const handleComplete = () => {
    router.push('/income-buffer');
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
          steps={['Introduction', 'Calculate', 'Setup', 'Complete']}
          onComplete={handleComplete}
          onCancel={handleCancel}
        >
          {/* Step 1: Introduction */}
          <WizardStep
            title="What is an Income Buffer?"
            description="Learn how the income buffer helps you age your money and reduce financial stress."
          >
            <div className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                <p>
                  An income buffer is money you set aside to fund next month's expenses. Instead
                  of living paycheck-to-paycheck, you'll be living on last month's income.
                </p>

                <h3>Benefits:</h3>
                <ul>
                  <li><strong>Reduced stress:</strong> You know you have next month covered</li>
                  <li><strong>Better planning:</strong> Budget for the entire month at once</li>
                  <li><strong>Flexibility:</strong> Handle irregular income more easily</li>
                  <li><strong>Peace of mind:</strong> Break the paycheck-to-paycheck cycle</li>
                </ul>

                <h3>How it works:</h3>
                <ol>
                  <li>Build up a buffer equal to one month's expenses</li>
                  <li>When you get paid, add money to the buffer</li>
                  <li>At the start of each month, fund your budget from the buffer</li>
                  <li>Your current month's income goes into the buffer for next month</li>
                </ol>
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

          {/* Step 3: Setup */}
          <WizardStep
            title="Setup Your Buffer"
            description="Here's how to get started with your income buffer."
          >
            <div className="space-y-4">
              <Callout type="info" title="Two approaches">
                Choose the approach that works best for your situation:
              </Callout>

              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Option 1: Build Gradually</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Best if you don't have the full buffer amount saved yet
                  </p>
                  <ol className="list-decimal list-inside text-sm space-y-1">
                    <li>Create an "Income Buffer" category</li>
                    <li>Each month, allocate extra money to this category</li>
                    <li>Once you reach your target (${targetAmount.toFixed(2)}), you're ready!</li>
                    <li>Enable the Income Buffer feature in Settings</li>
                  </ol>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Option 2: Start Immediately</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Best if you already have the buffer amount saved
                  </p>
                  <ol className="list-decimal list-inside text-sm space-y-1">
                    <li>Enable the Income Buffer feature in Settings</li>
                    <li>Add ${targetAmount.toFixed(2)} to your buffer</li>
                    <li>Start using it to fund next month's budget</li>
                  </ol>
                </div>
              </div>

              <Callout type="tip" title="Take your time">
                Building a buffer takes time! Don't stress if it takes several months. Every
                dollar you add gets you closer to financial peace of mind.
              </Callout>
            </div>
          </WizardStep>

          {/* Step 4: Complete */}
          <WizardStep
            title="You're Ready!"
            description="Here's what to do next to start using your income buffer."
          >
            <div className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                <h3>Next Steps:</h3>
                <ol>
                  <li>
                    <strong>Go to Settings:</strong> Enable the Income Buffer feature
                  </li>
                  <li>
                    <strong>Add money to buffer:</strong> Transfer your current buffer amount
                    (${currentBuffer.toFixed(2)})
                  </li>
                  <li>
                    <strong>Build your buffer:</strong> Continue adding money until you reach
                    ${targetAmount.toFixed(2)}
                  </li>
                  <li>
                    <strong>Start using it:</strong> Once full, use it to fund next month's budget
                  </li>
                </ol>

                <h3>Resources:</h3>
                <ul>
                  <li>
                    <Link href="/help/features/income-buffer" className="text-primary hover:underline">
                      Income Buffer Feature Guide
                    </Link>
                  </li>
                  <li>
                    <Link href="/help/faq/advanced" className="text-primary hover:underline">
                      Advanced Features FAQ
                    </Link>
                  </li>
                  <li>
                    <Link href="/income-buffer" className="text-primary hover:underline">
                      Income Buffer Page
                    </Link>
                  </li>
                </ul>
              </div>

              <Callout type="tip" title="Congratulations!">
                You're on your way to breaking the paycheck-to-paycheck cycle. This is a big
                step toward financial freedom!
              </Callout>
            </div>
          </WizardStep>
        </Wizard>
      </div>
    </div>
  );
}

