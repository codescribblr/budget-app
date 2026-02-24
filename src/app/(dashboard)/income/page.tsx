'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { DollarSign, Plus, Calculator, Save } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import IncomeStreamCard from '@/components/income/IncomeStreamCard';
import type { IncomeStream, PayFrequency, CreateIncomeStreamRequest } from '@/lib/types';
import {
  calculateAggregateMonthlyNetIncome,
  calculateAggregateMonthlyGrossIncome,
  calculateStreamPreTaxDeductions,
} from '@/lib/income-calculations';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { handleApiError } from '@/lib/api-error-handler';

interface BudgetSummary {
  monthly_gross_income: number;
  pre_tax_deductions_monthly: number;
  taxes_per_month: number;
  monthly_net_income: number;
  monthly_budget: number;
  excess_deficit: number;
}

const VALID_TABS = ['current', 'scenario'] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function IncomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();

  const tabParam = searchParams.get('tab');
  const activeTab: TabValue = tabParam === 'scenario' ? 'scenario' : 'current';

  const setActiveTab = useCallback(
    (tab: TabValue) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === 'current') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
      const qs = params.toString();
      router.replace(qs ? `/income?${qs}` : '/income', { scroll: false });
    },
    [router, searchParams]
  );
  const [streams, setStreams] = useState<IncomeStream[]>([]);
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newStreamData, setNewStreamData] = useState<CreateIncomeStreamRequest>({
    name: '',
    annual_income: 0,
    tax_rate: 0,
    pay_frequency: 'monthly',
    include_extra_paychecks: true,
    pre_tax_deduction_items: [],
    include_in_budget: true,
  });

  // Scenario planning state - copies of streams for "what if" editing (never persisted)
  const [scenarioStreams, setScenarioStreams] = useState<IncomeStream[]>([]);
  const nextTempIdRef = useRef(-1);

  const hasMountedRef = useRef(false);
  const fetchingRef = useRef(false);

  /** Merge saved scenario with current streams: use saved values for matching ids, include hypotheticals, drop orphaned */
  const mergeScenarioWithCurrent = useCallback(
    (currentStreams: IncomeStream[], savedScenario: IncomeStream[] | null): IncomeStream[] => {
      if (!savedScenario?.length) return currentStreams.map((s) => ({ ...s }));

      const currentIds = new Set(currentStreams.map((s) => s.id));
      const savedById = new Map(savedScenario.map((s) => [s.id, s]));

      const merged = currentStreams.map((s) => {
        const saved = savedById.get(s.id);
        return saved ? { ...s, ...saved } : { ...s };
      });

      const hypotheticals = savedScenario.filter((s) => s.id < 0);
      return [...merged, ...hypotheticals].sort((a, b) => a.sort_order - b.sort_order);
    },
    []
  );

  const loadData = async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      setIsLoading(true);
      const [streamsRes, categoriesRes, scenarioRes] = await Promise.all([
        fetch('/api/income-streams'),
        fetch('/api/categories'),
        fetch('/api/income-streams/scenario'),
      ]);

      if (streamsRes.ok) {
        const streamsData = await streamsRes.json();
        setStreams(streamsData);

        let initialScenario = streamsData;
        if (scenarioRes.ok) {
          const { scenario } = await scenarioRes.json();
          if (scenario?.length) {
            initialScenario = mergeScenarioWithCurrent(streamsData, scenario);
            const hypotheticalIds = initialScenario.filter((s: IncomeStream) => s.id < 0).map((s: IncomeStream) => s.id);
            nextTempIdRef.current = hypotheticalIds.length ? Math.min(...hypotheticalIds) - 1 : -1;
          }
        }
        setScenarioStreams(initialScenario);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        const categories = Array.isArray(categoriesData) ? categoriesData : [];
        const total = categories
          .filter((c: any) => !c.is_system)
          .reduce((sum: number, c: any) => sum + parseFloat(c.monthly_amount || '0'), 0);
        setMonthlyBudget(total);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load income data');
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      loadData();
    }
  }, []);

  const scenarioStreamsRef = useRef(scenarioStreams);
  scenarioStreamsRef.current = scenarioStreams;

  const calculateBudget = (streamList: IncomeStream[]): BudgetSummary => {
    const monthlyNet = calculateAggregateMonthlyNetIncome(streamList);
    const monthlyGross = calculateAggregateMonthlyGrossIncome(streamList);

    // Approximate taxes from net vs gross (simplified)
    let totalTaxes = 0;
    let totalPreTax = 0;
    streamList
      .filter((s) => s.include_in_budget)
      .forEach((s) => {
        const preTax = calculateStreamPreTaxDeductions(
          s.pre_tax_deduction_items || [],
          s.annual_income,
          s.pay_frequency,
          s.include_extra_paychecks
        );
        totalPreTax += preTax;
        const annualTaxable = s.annual_income - preTax * 12;
        totalTaxes += (annualTaxable * s.tax_rate) / 12;
      });

    return {
      monthly_gross_income: monthlyGross,
      pre_tax_deductions_monthly: totalPreTax,
      taxes_per_month: totalTaxes,
      monthly_net_income: monthlyNet,
      monthly_budget: monthlyBudget,
      excess_deficit: monthlyNet - monthlyBudget,
    };
  };

  const currentBudget = calculateBudget(streams);
  const scenarioBudget = calculateBudget(scenarioStreams);

  const handleAddStream = async () => {
    if (!newStreamData.name.trim()) {
      toast.error('Please enter a name for the income stream');
      return;
    }
    try {
      const res = await fetch('/api/income-streams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStreamData),
      });
      if (!res.ok) {
        const msg = await handleApiError(res, 'Failed to add income stream');
        throw new Error(msg || 'Failed to add income stream');
      }
      const created = await res.json();
      setStreams((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      setScenarioStreams((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      toast.success('Income stream added');
      setIsAddDialogOpen(false);
      setNewStreamData({
        name: '',
        annual_income: 0,
        tax_rate: 0,
        pay_frequency: 'monthly',
        include_extra_paychecks: true,
        pre_tax_deduction_items: [],
        include_in_budget: true,
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to add income stream');
    }
  };

  const handleUpdateStream = async (id: number, data: Partial<IncomeStream>) => {
    try {
      const res = await fetch(`/api/income-streams/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const msg = await handleApiError(res, 'Failed to update income stream');
        throw new Error(msg || 'Failed to update income stream');
      }
      const updated = await res.json();
      setStreams((prev) =>
        prev.map((s) => (s.id === id ? updated : s)).sort((a, b) => a.sort_order - b.sort_order)
      );
      setScenarioStreams((prev) =>
        prev.map((s) => (s.id === id ? updated : s)).sort((a, b) => a.sort_order - b.sort_order)
      );
      toast.success('Income stream updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update income stream');
      throw error;
    }
  };

  const handleDeleteStream = async (id: number) => {
    try {
      const res = await fetch(`/api/income-streams/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const msg = await handleApiError(res, 'Failed to delete income stream');
        throw new Error(msg || 'Failed to delete income stream');
      }
      setStreams((prev) => prev.filter((s) => s.id !== id));
      setScenarioStreams((prev) => prev.filter((s) => s.id !== id));
      toast.success('Income stream deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete income stream');
    }
  };

  const saveScenarioRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveScenario = useCallback(async (data: IncomeStream[]) => {
    try {
      await fetch('/api/income-streams/scenario', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: data }),
      });
    } catch (e) {
      console.error('Failed to save scenario:', e);
    }
  }, []);

  const handleResetScenario = async () => {
    setScenarioStreams(streams.map((s) => ({ ...s })));
    try {
      await fetch('/api/income-streams/scenario', { method: 'DELETE' });
    } catch (e) {
      console.error('Failed to clear scenario:', e);
    }
  };

  const scheduleScenarioSave = useCallback(
    (data: IncomeStream[]) => {
      if (saveScenarioRef.current) clearTimeout(saveScenarioRef.current);
      saveScenarioRef.current = setTimeout(() => saveScenario(data), 500);
    },
    [saveScenario]
  );

  const handleScenarioUpdate = async (id: number, data: Partial<IncomeStream>) => {
    setScenarioStreams((prev) => {
      const next = prev
        .map((s) => (s.id === id ? { ...s, ...data } : s))
        .sort((a, b) => a.sort_order - b.sort_order);
      scheduleScenarioSave(next);
      return next;
    });
  };

  const handleScenarioDelete = async (id: number) => {
    setScenarioStreams((prev) => {
      const next = prev.filter((s) => s.id !== id);
      scheduleScenarioSave(next);
      return next;
    });
  };

  const handleAddHypotheticalStream = () => {
    const tempId = nextTempIdRef.current;
    nextTempIdRef.current -= 1;
    const newStream: IncomeStream = {
      id: tempId,
      account_id: 0,
      name: 'Hypothetical income',
      annual_income: 0,
      tax_rate: 0,
      pay_frequency: 'monthly',
      include_extra_paychecks: true,
      pre_tax_deduction_items: [],
      include_in_budget: true,
      sort_order: 0,
      created_at: '',
      updated_at: '',
    };
    setScenarioStreams((prev) => {
      const stream = { ...newStream, sort_order: prev.length };
      const next = [...prev, stream].sort((a, b) => a.sort_order - b.sort_order);
      scheduleScenarioSave(next);
      return next;
    });
  };

  // Flush pending scenario save on unmount (e.g. user navigates away)
  useEffect(() => {
    return () => {
      if (saveScenarioRef.current) {
        clearTimeout(saveScenarioRef.current);
        saveScenarioRef.current = null;
        saveScenario(scenarioStreamsRef.current);
      }
    };
  }, [saveScenario]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Income Planning</h1>
        <p className="text-muted-foreground mt-1">
          Manage multiple income streams with different pay schedules and tax rates
        </p>
      </div>

      {!isEditor && !permissionsLoading && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            You only have read access. Only account owners and editors can modify income streams.
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="current">Current Settings</TabsTrigger>
          <TabsTrigger value="scenario">Scenario Planning</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Income Streams
                  </CardTitle>
                  <CardDescription>
                    Add each source of income (job, side hustle, rental, etc.) with its own pay schedule
                  </CardDescription>
                </div>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  disabled={!isEditor || permissionsLoading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Stream
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {streams.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                  <p className="mb-4">No income streams configured yet.</p>
                  <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    disabled={!isEditor || permissionsLoading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first income stream
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {streams.map((stream) => (
                    <IncomeStreamCard
                      key={stream.id}
                      stream={stream}
                      onUpdate={handleUpdateStream}
                      onDelete={handleDeleteStream}
                      disabled={!isEditor || permissionsLoading}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Budget Summary */}
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
                <p className="text-xs text-muted-foreground mt-1">
                  From {streams.filter((s) => s.include_in_budget).length} stream(s)
                </p>
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
                  -{formatCurrency(currentBudget.pre_tax_deductions_monthly)}
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
                <div className="text-2xl font-bold">{formatCurrency(currentBudget.monthly_budget)}</div>
              </CardContent>
            </Card>
            <Card
              className={
                currentBudget.excess_deficit >= 0 ? 'border-green-200' : 'border-red-200'
              }
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {currentBudget.excess_deficit >= 0 ? 'Monthly Excess' : 'Monthly Deficit'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    currentBudget.excess_deficit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {currentBudget.excess_deficit >= 0 ? '+' : ''}
                  {formatCurrency(currentBudget.excess_deficit)}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="scenario" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Scenario Planning
                  </CardTitle>
                  <CardDescription>
                    Edit income streams below to see how changes would affect your budget. Nothing is saved—your actual
                    income data stays unchanged. Use Reset to discard scenario changes.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleResetScenario}>
                    Reset to Current
                  </Button>
                  <Button variant="outline" onClick={handleAddHypotheticalStream}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add hypothetical stream
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {scenarioStreams.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                  <p className="mb-4">No income streams to plan with.</p>
                  <p className="text-sm mb-4">
                    Add income streams in Current Settings first, or add a hypothetical stream above.
                  </p>
                  <Button variant="outline" onClick={handleAddHypotheticalStream}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add hypothetical stream
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {scenarioStreams.map((stream) => (
                    <IncomeStreamCard
                      key={stream.id}
                      stream={stream}
                      onUpdate={handleScenarioUpdate}
                      onDelete={handleScenarioDelete}
                      scenarioMode
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current vs Scenario comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Current</h3>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Gross Income</span>
                    <span className="font-medium">{formatCurrency(currentBudget.monthly_gross_income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pre-Tax Deductions</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(currentBudget.pre_tax_deductions_monthly)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Taxes</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(currentBudget.taxes_per_month)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Net Income</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(currentBudget.monthly_net_income)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Budget</span>
                    <span className="font-bold">{formatCurrency(currentBudget.monthly_budget)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-bold">
                      {currentBudget.excess_deficit >= 0 ? 'Excess' : 'Deficit'}
                    </span>
                    <span
                      className={`font-bold text-lg ${
                        currentBudget.excess_deficit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {currentBudget.excess_deficit >= 0 ? '+' : ''}
                      {formatCurrency(currentBudget.excess_deficit)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Scenario</h3>
              <Card className="border-blue-200">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Gross Income</span>
                    <span className="font-medium">{formatCurrency(scenarioBudget.monthly_gross_income)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Pre-Tax Deductions</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(scenarioBudget.pre_tax_deductions_monthly)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Taxes</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrency(scenarioBudget.taxes_per_month)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-medium">Net Income</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(scenarioBudget.monthly_net_income)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Budget</span>
                    <span className="font-bold">{formatCurrency(scenarioBudget.monthly_budget)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="font-bold">
                      {scenarioBudget.excess_deficit >= 0 ? 'Excess' : 'Deficit'}
                    </span>
                    <span
                      className={`font-bold text-lg ${
                        scenarioBudget.excess_deficit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {scenarioBudget.excess_deficit >= 0 ? '+' : ''}
                      {formatCurrency(scenarioBudget.excess_deficit)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Stream Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Income Stream</DialogTitle>
            <DialogDescription>
              Add a new source of income (e.g., primary job, side hustle, rental income)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={newStreamData.name}
                onChange={(e) => setNewStreamData({ ...newStreamData, name: e.target.value })}
                placeholder="e.g., Primary Job"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Annual Income</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newStreamData.annual_income || ''}
                  onChange={(e) =>
                    setNewStreamData({
                      ...newStreamData,
                      annual_income: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Tax Rate (decimal)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={newStreamData.tax_rate ?? ''}
                  onChange={(e) =>
                    setNewStreamData({
                      ...newStreamData,
                      tax_rate: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Pay Frequency</Label>
              <Select
                value={newStreamData.pay_frequency}
                onValueChange={(v: PayFrequency) =>
                  setNewStreamData({ ...newStreamData, pay_frequency: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="semi-monthly">Semi-Monthly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newStreamData.pay_frequency === 'bi-weekly' && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="new-include-extra"
                  checked={newStreamData.include_extra_paychecks ?? true}
                  onCheckedChange={(c) =>
                    setNewStreamData({ ...newStreamData, include_extra_paychecks: c === true })
                  }
                />
                <Label htmlFor="new-include-extra" className="cursor-pointer">
                  Include extra paychecks in budget
                </Label>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-include-budget"
                checked={newStreamData.include_in_budget ?? true}
                onCheckedChange={(c) =>
                  setNewStreamData({ ...newStreamData, include_in_budget: c === true })
                }
              />
              <Label htmlFor="new-include-budget" className="cursor-pointer">
                Include in budget calculations
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStream}>
              <Save className="h-4 w-4 mr-2" />
              Add Stream
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

