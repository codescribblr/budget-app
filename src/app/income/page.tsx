'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowLeft, DollarSign, TrendingUp, Calculator, Save } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

type PayFrequency = 'weekly' | 'bi-weekly' | 'semi-monthly' | 'monthly' | 'quarterly' | 'annually';

interface IncomeSettings {
  annual_income: number;
  tax_rate: number;
  pre_tax_deductions_monthly: number;
  pay_frequency: PayFrequency;
  include_extra_paychecks: boolean;
}

interface BudgetSummary {
  monthly_gross_income: number;
  taxes_per_month: number;
  monthly_net_income: number;
  monthly_budget: number;
  excess_deficit: number;
}

export default function IncomePage() {
  const router = useRouter();
  
  // Current settings
  const [currentSettings, setCurrentSettings] = useState<IncomeSettings>({
    annual_income: 0,
    tax_rate: 0,
    pre_tax_deductions_monthly: 0,
    pay_frequency: 'monthly',
    include_extra_paychecks: true,
  });

  // Scenario settings (for playing with numbers)
  const [scenarioSettings, setScenarioSettings] = useState<IncomeSettings>({
    annual_income: 0,
    tax_rate: 0,
    pre_tax_deductions_monthly: 0,
    pay_frequency: 'monthly',
    include_extra_paychecks: true,
  });
  
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch settings
      const settingsRes = await fetch('/api/settings');
      const settingsData = await settingsRes.json();
      
      const settings: IncomeSettings = {
        annual_income: parseFloat(settingsData.annual_salary || settingsData.annual_income || '0'),
        tax_rate: parseFloat(settingsData.tax_rate || '0'),
        pre_tax_deductions_monthly: parseFloat(settingsData.pre_tax_deductions_monthly || '0'),
        pay_frequency: (settingsData.pay_frequency || 'monthly') as PayFrequency,
        include_extra_paychecks: settingsData.include_extra_paychecks === 'true' || settingsData.include_extra_paychecks === true,
      };
      
      setCurrentSettings(settings);
      setScenarioSettings(settings);
      
      // Fetch categories to calculate monthly budget
      const categoriesRes = await fetch('/api/categories');
      const categories = await categoriesRes.json();
      
      const totalBudget = categories
        .filter((cat: any) => !cat.is_system)
        .reduce((sum: number, cat: any) => sum + parseFloat(cat.monthly_amount || '0'), 0);
      
      setMonthlyBudget(totalBudget);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load income settings');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBudget = (settings: IncomeSettings): BudgetSummary => {
    // Calculate monthly gross income based on pay frequency
    let monthly_gross_income: number;

    switch (settings.pay_frequency) {
      case 'weekly':
        // 52 weeks per year
        monthly_gross_income = (settings.annual_income / 52) * (52 / 12);
        break;
      case 'bi-weekly':
        // 26 pay periods per year
        if (settings.include_extra_paychecks) {
          // Include all 26 paychecks in budget (average over 12 months)
          monthly_gross_income = settings.annual_income / 12;
        } else {
          // Only budget for 24 paychecks (2 per month)
          // The 2 extra paychecks per year are "bonus" money
          monthly_gross_income = (settings.annual_income / 26) * 2;
        }
        break;
      case 'semi-monthly':
        // 24 pay periods per year (2 per month)
        monthly_gross_income = (settings.annual_income / 24) * 2;
        break;
      case 'monthly':
        // 12 pay periods per year
        monthly_gross_income = settings.annual_income / 12;
        break;
      case 'quarterly':
        // 4 pay periods per year
        monthly_gross_income = (settings.annual_income / 4) / 3;
        break;
      case 'annually':
        // 1 pay period per year
        monthly_gross_income = settings.annual_income / 12;
        break;
      default:
        monthly_gross_income = settings.annual_income / 12;
    }

    const annual_taxable_income = settings.annual_income - (settings.pre_tax_deductions_monthly * 12);
    const taxes_per_month = (annual_taxable_income * settings.tax_rate) / 12;
    const monthly_net_income = monthly_gross_income - taxes_per_month - settings.pre_tax_deductions_monthly;
    const excess_deficit = monthly_net_income - monthlyBudget;

    return {
      monthly_gross_income,
      taxes_per_month,
      monthly_net_income,
      monthly_budget: monthlyBudget,
      excess_deficit,
    };
  };

  const currentBudget = calculateBudget(currentSettings);
  const scenarioBudget = calculateBudget(scenarioSettings);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      const updates = [
        { key: 'annual_income', value: currentSettings.annual_income.toString() },
        { key: 'annual_salary', value: currentSettings.annual_income.toString() }, // Keep for backwards compatibility
        { key: 'tax_rate', value: currentSettings.tax_rate.toString() },
        { key: 'pre_tax_deductions_monthly', value: currentSettings.pre_tax_deductions_monthly.toString() },
        { key: 'pay_frequency', value: currentSettings.pay_frequency },
        { key: 'include_extra_paychecks', value: currentSettings.include_extra_paychecks.toString() },
      ];
      
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updates }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      toast.success('Income settings saved successfully');
      setScenarioSettings(currentSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save income settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetScenario = () => {
    setScenarioSettings(currentSettings);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Income Planning</h1>
          <p className="text-muted-foreground mt-1">
            Manage your income settings and explore budget scenarios
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>

      <Separator className="mb-8" />

      <Tabs defaultValue="current" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="current">Current Settings</TabsTrigger>
          <TabsTrigger value="scenario">Scenario Planning</TabsTrigger>
        </TabsList>

        {/* Current Settings Tab */}
        <TabsContent value="current" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Income Settings
              </CardTitle>
              <CardDescription>
                Configure your annual income, tax rate, and pre-tax deductions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annual_income">Annual Income</Label>
                  <Input
                    id="annual_income"
                    type="number"
                    step="0.01"
                    value={currentSettings.annual_income}
                    onChange={(e) =>
                      setCurrentSettings({
                        ...currentSettings,
                        annual_income: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">Tax Rate (decimal)</Label>
                  <Input
                    id="tax_rate"
                    type="number"
                    step="0.0001"
                    value={currentSettings.tax_rate}
                    onChange={(e) =>
                      setCurrentSettings({
                        ...currentSettings,
                        tax_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g., 0.2122 for 21.22%
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pre_tax_deductions">Pre-Tax Deductions (Monthly)</Label>
                  <Input
                    id="pre_tax_deductions"
                    type="number"
                    step="0.01"
                    value={currentSettings.pre_tax_deductions_monthly}
                    onChange={(e) =>
                      setCurrentSettings({
                        ...currentSettings,
                        pre_tax_deductions_monthly: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Pay Frequency Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Pay Frequency</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pay_frequency">How often are you paid?</Label>
                    <Select
                      value={currentSettings.pay_frequency}
                      onValueChange={(value: PayFrequency) =>
                        setCurrentSettings({
                          ...currentSettings,
                          pay_frequency: value,
                        })
                      }
                    >
                      <SelectTrigger id="pay_frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly (52 paychecks/year)</SelectItem>
                        <SelectItem value="bi-weekly">Bi-Weekly (26 paychecks/year)</SelectItem>
                        <SelectItem value="semi-monthly">Semi-Monthly (24 paychecks/year)</SelectItem>
                        <SelectItem value="monthly">Monthly (12 paychecks/year)</SelectItem>
                        <SelectItem value="quarterly">Quarterly (4 paychecks/year)</SelectItem>
                        <SelectItem value="annually">Annually (1 paycheck/year)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {currentSettings.pay_frequency === 'bi-weekly' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Bi-Weekly Budget Options</Label>
                      <div className="flex items-start space-x-2 pt-2">
                        <Checkbox
                          id="include_extra_paychecks"
                          checked={currentSettings.include_extra_paychecks}
                          onCheckedChange={(checked) =>
                            setCurrentSettings({
                              ...currentSettings,
                              include_extra_paychecks: checked === true,
                            })
                          }
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="include_extra_paychecks"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Include extra paychecks in budget
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {currentSettings.include_extra_paychecks
                              ? 'Budget includes all 26 paychecks averaged over 12 months'
                              : 'Budget only includes 24 paychecks (2/month). The 2 extra paychecks per year are bonus money.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveSettings} disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Current Budget Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Gross Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(currentBudget.monthly_gross_income)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Taxes Per Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  -{formatCurrency(currentBudget.taxes_per_month)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pre-Tax Deductions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  -{formatCurrency(currentSettings.pre_tax_deductions_monthly)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Net Income
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(currentBudget.monthly_net_income)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Budget
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(currentBudget.monthly_budget)}
                </div>
              </CardContent>
            </Card>

            <Card className={currentBudget.excess_deficit >= 0 ? 'border-green-200' : 'border-red-200'}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {currentBudget.excess_deficit >= 0 ? 'Monthly Excess' : 'Monthly Deficit'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${currentBudget.excess_deficit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentBudget.excess_deficit >= 0 ? '+' : ''}{formatCurrency(currentBudget.excess_deficit)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scenario Planning Tab */}
        <TabsContent value="scenario" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Scenario Planning
              </CardTitle>
              <CardDescription>
                Adjust the numbers below to see how changes would affect your budget
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scenario_annual_income">Annual Income</Label>
                  <Input
                    id="scenario_annual_income"
                    type="number"
                    step="0.01"
                    value={scenarioSettings.annual_income}
                    onChange={(e) =>
                      setScenarioSettings({
                        ...scenarioSettings,
                        annual_income: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scenario_tax_rate">Tax Rate (decimal)</Label>
                  <Input
                    id="scenario_tax_rate"
                    type="number"
                    step="0.0001"
                    value={scenarioSettings.tax_rate}
                    onChange={(e) =>
                      setScenarioSettings({
                        ...scenarioSettings,
                        tax_rate: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scenario_pre_tax_deductions">Pre-Tax Deductions (Monthly)</Label>
                  <Input
                    id="scenario_pre_tax_deductions"
                    type="number"
                    step="0.01"
                    value={scenarioSettings.pre_tax_deductions_monthly}
                    onChange={(e) =>
                      setScenarioSettings({
                        ...scenarioSettings,
                        pre_tax_deductions_monthly: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <Separator />

              {/* Pay Frequency Settings */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Pay Frequency</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scenario_pay_frequency">How often are you paid?</Label>
                    <Select
                      value={scenarioSettings.pay_frequency}
                      onValueChange={(value: PayFrequency) =>
                        setScenarioSettings({
                          ...scenarioSettings,
                          pay_frequency: value,
                        })
                      }
                    >
                      <SelectTrigger id="scenario_pay_frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly (52 paychecks/year)</SelectItem>
                        <SelectItem value="bi-weekly">Bi-Weekly (26 paychecks/year)</SelectItem>
                        <SelectItem value="semi-monthly">Semi-Monthly (24 paychecks/year)</SelectItem>
                        <SelectItem value="monthly">Monthly (12 paychecks/year)</SelectItem>
                        <SelectItem value="quarterly">Quarterly (4 paychecks/year)</SelectItem>
                        <SelectItem value="annually">Annually (1 paycheck/year)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {scenarioSettings.pay_frequency === 'bi-weekly' && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Bi-Weekly Budget Options</Label>
                      <div className="flex items-start space-x-2 pt-2">
                        <Checkbox
                          id="scenario_include_extra_paychecks"
                          checked={scenarioSettings.include_extra_paychecks}
                          onCheckedChange={(checked) =>
                            setScenarioSettings({
                              ...scenarioSettings,
                              include_extra_paychecks: checked === true,
                            })
                          }
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="scenario_include_extra_paychecks"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Include extra paychecks in budget
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {scenarioSettings.include_extra_paychecks
                              ? 'Budget includes all 26 paychecks averaged over 12 months'
                              : 'Budget only includes 24 paychecks (2/month). The 2 extra paychecks per year are bonus money.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={handleResetScenario}>
                  Reset to Current
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Scenario Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Column */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Current</h3>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Gross Income</span>
                    <span className="font-medium">{formatCurrency(currentBudget.monthly_gross_income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Taxes</span>
                    <span className="font-medium text-red-600">-{formatCurrency(currentBudget.taxes_per_month)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pre-Tax Deductions</span>
                    <span className="font-medium text-red-600">-{formatCurrency(currentSettings.pre_tax_deductions_monthly)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Net Income</span>
                    <span className="font-bold text-green-600">{formatCurrency(currentBudget.monthly_net_income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Budget</span>
                    <span className="font-bold">{formatCurrency(currentBudget.monthly_budget)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-bold">{currentBudget.excess_deficit >= 0 ? 'Excess' : 'Deficit'}</span>
                    <span className={`font-bold text-lg ${currentBudget.excess_deficit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {currentBudget.excess_deficit >= 0 ? '+' : ''}{formatCurrency(currentBudget.excess_deficit)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scenario Column */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Scenario
                <TrendingUp className="h-4 w-4" />
              </h3>
              <Card className="border-blue-200">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Gross Income</span>
                    <span className="font-medium">{formatCurrency(scenarioBudget.monthly_gross_income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Taxes</span>
                    <span className="font-medium text-red-600">-{formatCurrency(scenarioBudget.taxes_per_month)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pre-Tax Deductions</span>
                    <span className="font-medium text-red-600">-{formatCurrency(scenarioSettings.pre_tax_deductions_monthly)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Net Income</span>
                    <span className="font-bold text-green-600">{formatCurrency(scenarioBudget.monthly_net_income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Budget</span>
                    <span className="font-bold">{formatCurrency(scenarioBudget.monthly_budget)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-bold">{scenarioBudget.excess_deficit >= 0 ? 'Excess' : 'Deficit'}</span>
                    <span className={`font-bold text-lg ${scenarioBudget.excess_deficit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {scenarioBudget.excess_deficit >= 0 ? '+' : ''}{formatCurrency(scenarioBudget.excess_deficit)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Comparison */}
              {scenarioBudget.excess_deficit !== currentBudget.excess_deficit && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Change in Excess/Deficit:</span>
                      <span className={`font-bold text-lg ${(scenarioBudget.excess_deficit - currentBudget.excess_deficit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {(scenarioBudget.excess_deficit - currentBudget.excess_deficit) >= 0 ? '+' : ''}
                        {formatCurrency(scenarioBudget.excess_deficit - currentBudget.excess_deficit)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

