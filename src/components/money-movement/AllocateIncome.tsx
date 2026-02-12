import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import type { Category, GoalWithDetails } from '@/lib/types';
import { Target, Info, Sparkles, Wallet } from 'lucide-react';
import { SmartAllocationDialog } from '@/components/allocations/SmartAllocationDialog';
import { AddToBufferDialog } from './AddToBufferDialog';
import { useFeature } from '@/contexts/FeatureContext';
import { handleApiError } from '@/lib/api-error-handler';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { toast } from 'sonner';

interface AllocateIncomeProps {
  categories: Category[];
  currentSavings: number;
  onSuccess: () => void;
}

export default function AllocateIncome({ categories, currentSavings, onSuccess }: AllocateIncomeProps) {
  const router = useRouter();
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const [allocations, setAllocations] = useState<{ [key: number]: number }>({});
  const [goalAllocations, setGoalAllocations] = useState<{ [key: number]: number }>({});
  const [allGoals, setAllGoals] = useState<GoalWithDetails[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monthlyFunding, setMonthlyFunding] = useState<{ [key: number]: number }>({});
  const [isSmartAllocationOpen, setIsSmartAllocationOpen] = useState(false);
  const [isAddToBufferOpen, setIsAddToBufferOpen] = useState(false);

  const smartAllocationEnabled = useFeature('smart_allocation');
  const incomeBufferEnabled = useFeature('income_buffer');
  const monthlyFundingEnabled = useFeature('monthly_funding_tracking');
  const [isAvailableBalanceVisible, setIsAvailableBalanceVisible] = useState(true);
  const [isBottomSummaryVisible, setIsBottomSummaryVisible] = useState(true);
  const availableBalanceRef = useRef<HTMLDivElement>(null);
  const bottomSummaryRef = useRef<HTMLDivElement>(null);

  // Filter out system categories (like Transfer) from allocation
  const envelopeCategories = categories.filter(cat => !cat.is_system && !cat.is_goal);
  
  // Separate envelope goals, account-linked goals, and debt-paydown goals
  const envelopeGoals = allGoals.filter(g => g.goal_type === 'envelope' && g.status === 'active');
  const accountLinkedGoals = allGoals.filter(g => g.goal_type === 'account-linked' && g.status === 'active');
  const debtPaydownGoals = allGoals.filter(g => g.goal_type === 'debt-paydown' && g.status === 'active');
  
  // Function to fetch monthly funding data
  const fetchMonthlyFunding = async () => {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const fundingResponse = await fetch(`/api/monthly-funding/${currentMonth}`);

      if (fundingResponse.ok) {
        const fundingData = await fundingResponse.json();
        const fundingMap: { [key: number]: number } = {};
        fundingData.categories?.forEach((cat: any) => {
          fundingMap[cat.categoryId] = cat.fundedAmount || 0;
        });
        setMonthlyFunding(fundingMap);
      }
    } catch (error) {
      console.error('Error fetching monthly funding:', error);
    }
  };

  // Fetch all goals and monthly funding data (only if feature enabled)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const goalsResponse = await fetch('/api/goals?status=active');
        
        if (goalsResponse.ok) {
          const goalsData = await goalsResponse.json();
          setAllGoals(goalsData);
        }

        // Fetch monthly funding separately if feature is enabled
        if (monthlyFundingEnabled) {
          await fetchMonthlyFunding();
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthlyFundingEnabled]);

  // Track visibility of available balance section (top) and summary section (bottom)
  useEffect(() => {
    const topElement = availableBalanceRef.current;
    const bottomElement = bottomSummaryRef.current;
    
    if (!topElement || !bottomElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === topElement) {
            setIsAvailableBalanceVisible(entry.isIntersecting);
          } else if (entry.target === bottomElement) {
            setIsBottomSummaryVisible(entry.isIntersecting);
          }
        });
      },
      {
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: '-20px', // Add some margin to trigger slightly before it's fully visible
      }
    );

    observer.observe(topElement);
    observer.observe(bottomElement);

    return () => {
      observer.unobserve(topElement);
      observer.unobserve(bottomElement);
    };
  }, []);

  const totalMonthlyBudget = envelopeCategories.reduce((sum, cat) => sum + cat.monthly_amount, 0);
  const availableToAllocate = currentSavings;

  const handleUseMonthlyAmounts = () => {
    const newAllocations: { [key: number]: number } = {};
    const newGoalAllocations: { [key: number]: number } = {};
    
    envelopeCategories.forEach(cat => {
      newAllocations[cat.id] = cat.monthly_amount;
    });
    
    envelopeGoals.forEach(goal => {
      if (goal.linked_category_id) {
        newGoalAllocations[goal.linked_category_id] = goal.monthly_contribution;
      }
    });
    
    setAllocations(newAllocations);
    setGoalAllocations(newGoalAllocations);
  };

  const handleUseProportional = () => {
    if (availableToAllocate <= 0) {
      toast.error('No funds available', {
        description: 'Please update your account balances to allocate funds.',
      });
      return;
    }

    const newAllocations: { [key: number]: number } = {};
    const newGoalAllocations: { [key: number]: number } = {};
    
    // Include goal monthly contributions in total budget
    const goalMonthlyTotal = envelopeGoals.reduce((sum, g) => sum + g.monthly_contribution, 0);
    const totalBudget = totalMonthlyBudget + goalMonthlyTotal;

    envelopeCategories.forEach(cat => {
      const proportion = cat.monthly_amount / totalBudget;
      newAllocations[cat.id] = parseFloat((availableToAllocate * proportion).toFixed(2));
    });
    
    envelopeGoals.forEach(goal => {
      if (goal.linked_category_id) {
        const proportion = goal.monthly_contribution / totalBudget;
        newGoalAllocations[goal.linked_category_id] = parseFloat((availableToAllocate * proportion).toFixed(2));
      }
    });

    setAllocations(newAllocations);
    setGoalAllocations(newGoalAllocations);
  };

  const handleAllocateAll = () => {
    if (availableToAllocate <= 0) {
      toast.error('No funds available', {
        description: 'Please update your account balances to allocate funds.',
      });
      return;
    }

    const newAllocations: { [key: number]: number } = {};
    const newGoalAllocations: { [key: number]: number } = {};
    const totalItems = envelopeCategories.length + envelopeGoals.length;
    const perItem = parseFloat((availableToAllocate / totalItems).toFixed(2));

    envelopeCategories.forEach(cat => {
      newAllocations[cat.id] = perItem;
    });
    
    envelopeGoals.forEach(goal => {
      if (goal.linked_category_id) {
        newGoalAllocations[goal.linked_category_id] = perItem;
      }
    });

    setAllocations(newAllocations);
    setGoalAllocations(newGoalAllocations);
  };

  const handleClearAllocations = () => {
    setAllocations({});
    setGoalAllocations({});
  };

  const handleAllocationChange = (categoryId: number, value: string) => {
    const newAllocations = { ...allocations };
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      newAllocations[categoryId] = numValue;
    } else if (value === '') {
      newAllocations[categoryId] = 0;
    }
    setAllocations(newAllocations);
  };

  const getTotalAllocated = () => {
    const categoryTotal = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
    const goalTotal = Object.values(goalAllocations).reduce((sum, val) => sum + (val || 0), 0);
    return categoryTotal + goalTotal;
  };
  
  const handleGoalAllocationChange = (categoryId: number, value: string) => {
    const newGoalAllocations = { ...goalAllocations };
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      newGoalAllocations[categoryId] = numValue;
    } else if (value === '') {
      newGoalAllocations[categoryId] = 0;
    }
    setGoalAllocations(newGoalAllocations);
  };

  const getRemaining = () => {
    return availableToAllocate - getTotalAllocated();
  };

  const handleAllocate = async () => {
    const totalAllocated = getTotalAllocated();

    if (totalAllocated === 0) {
      toast.error('No allocations', {
        description: 'Please allocate funds to at least one category.',
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // Build allocations array for batch API
      const batchAllocations: Array<{ categoryId: number; amount: number }> = [];

      // Add regular category allocations
      categories
        .filter(cat => allocations[cat.id] > 0)
        .forEach(cat => {
          batchAllocations.push({
            categoryId: cat.id,
            amount: allocations[cat.id],
          });
        });

      // Add goal category allocations
      envelopeGoals
        .filter(goal => goal.linked_category_id !== null && goalAllocations[goal.linked_category_id] > 0)
        .forEach(goal => {
          if (goal.linked_category_id) {
            batchAllocations.push({
              categoryId: goal.linked_category_id,
              amount: goalAllocations[goal.linked_category_id],
            });
          }
        });

      if (batchAllocations.length === 0) {
        toast.error('No allocations', {
          description: 'Please allocate funds to at least one category.',
        });
        return;
      }

      // Use batch allocation API which includes audit logging
      const response = await fetch('/api/allocations/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          allocations: batchAllocations,
        }),
      });

      if (!response.ok) {
        await handleApiError(response, 'Failed to allocate funds');
        throw new Error('Failed to allocate funds');
      }

      // Reset form
      setAllocations({});
      setGoalAllocations({});
      
      // Refetch monthly funding data to show updated "funded this month" amounts (only if feature enabled)
      if (monthlyFundingEnabled) {
        await fetchMonthlyFunding();
      }
      
      onSuccess();
      toast.success('Funds allocated successfully', {
        description: `Successfully allocated ${formatCurrency(totalAllocated)} to envelopes.`,
      });
      
      // Redirect to dashboard after successful allocation
      router.push('/dashboard');
    } catch (error) {
      console.error('Error allocating funds:', error);
      // Error toast already shown by handleApiError
    } finally {
      setIsSubmitting(false);
    }
  };

  const showStickyFooter = !isAvailableBalanceVisible && !isBottomSummaryVisible;
  
  return (
    <div className={`space-y-6 ${showStickyFooter ? 'pb-24 md:pb-20' : ''}`}>
      {!isEditor && !permissionsLoading && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            You only have read access to this account. Only account owners and editors can allocate funds to envelopes.
          </p>
        </div>
      )}

      <div ref={availableBalanceRef} className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-muted-foreground">Available to Allocate (Current Savings)</div>
            <div className="text-2xl font-bold mt-1">{formatCurrency(availableToAllocate)}</div>
          </div>
          <div className="text-sm text-muted-foreground">
            This is your current savings balance from the dashboard.<br />
            Update your account balances to change this amount.
          </div>
        </div>
      </div>

      {availableToAllocate <= 0 && envelopeCategories.length > 0 && (
        <Alert>
          <AlertDescription>
            Add income or update account balances on the dashboard, then come back to allocate to your categories.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-2">
        {smartAllocationEnabled && (
          <Button
            variant="default"
            onClick={() => setIsSmartAllocationOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
            disabled={!isEditor || permissionsLoading}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Smart Allocation
          </Button>
        )}
        {incomeBufferEnabled && (
          <Button
            variant="default"
            onClick={() => setIsAddToBufferOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
            disabled={!isEditor || permissionsLoading}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Add to Income Buffer
          </Button>
        )}
        <Button 
          variant="outline" 
          onClick={handleUseMonthlyAmounts}
          disabled={!isEditor || permissionsLoading}
        >
          Use Monthly Amounts
        </Button>
        <Button 
          variant="outline" 
          onClick={handleUseProportional}
          disabled={!isEditor || permissionsLoading}
        >
          Distribute Proportionally
        </Button>
        <Button 
          variant="outline" 
          onClick={handleAllocateAll}
          disabled={!isEditor || permissionsLoading}
        >
          Split Evenly
        </Button>
        <Button 
          variant="outline" 
          onClick={handleClearAllocations}
          disabled={!isEditor || permissionsLoading}
        >
          Clear All
        </Button>
      </div>

      {/* Regular Envelopes */}
      <div className="border rounded-md">
        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-3">
          {envelopeCategories.map((category) => {
            const allocation = allocations[category.id] || 0;
            const fundedThisMonth = monthlyFunding[category.id] || 0;
            const newBalance = category.current_balance + allocation;

            return (
              <Card key={category.id} className="p-4">
                <div className="space-y-3">
                  {/* Category Name */}
                  <div className="flex items-center gap-2">
                    <div className="font-medium flex-1">
                      {category.name}
                      {category.is_system && (
                        <span className="text-muted-foreground ml-2" title="System category">⚙️</span>
                      )}
                    </div>
                  </div>

                  {/* Monthly Amount */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Monthly Amount</span>
                    <span className="text-sm font-medium">{formatCurrency(category.monthly_amount)}</span>
                  </div>

                  {/* Funded This Month (if enabled) */}
                  {monthlyFundingEnabled && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Funded This Month</span>
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {formatCurrency(fundedThisMonth)}
                      </span>
                    </div>
                  )}

                  {/* Current Balance */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Current Balance</span>
                    <span className="text-sm font-medium">{formatCurrency(category.current_balance)}</span>
                  </div>

                  {/* Allocate Input */}
                  <div className="space-y-1">
                    <Label htmlFor={`allocate-${category.id}`} className="text-sm">Allocate</Label>
                    <Input
                      id={`allocate-${category.id}`}
                      type="number"
                      step="0.01"
                      value={allocation || ''}
                      onChange={(e) => handleAllocationChange(category.id, e.target.value)}
                      placeholder="0.00"
                      className="w-full text-right"
                      disabled={!isEditor || permissionsLoading}
                    />
                  </div>

                  {/* New Balance */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">New Balance</span>
                    <span className="text-sm font-semibold">{formatCurrency(newBalance)}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Monthly Amount</TableHead>
                {monthlyFundingEnabled && (
                  <TableHead className="text-right">Funded This Month</TableHead>
                )}
                <TableHead className="text-right">Current Balance</TableHead>
                <TableHead className="text-right">Allocate</TableHead>
                <TableHead className="text-right">New Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envelopeCategories.map((category) => {
                const allocation = allocations[category.id] || 0;
                const fundedThisMonth = monthlyFunding[category.id] || 0;
                const newBalance = category.current_balance + allocation;

                return (
                  <TableRow key={category.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {category.name}
                        {category.is_system && (
                          <span className="text-muted-foreground" title="System category">⚙️</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatCurrency(category.monthly_amount)}
                    </TableCell>
                    {monthlyFundingEnabled && (
                      <TableCell className="text-right text-blue-600 dark:text-blue-400">
                        {formatCurrency(fundedThisMonth)}
                      </TableCell>
                    )}
                    <TableCell className="text-right">
                      {formatCurrency(category.current_balance)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        step="0.01"
                        value={allocation || ''}
                        onChange={(e) => handleAllocationChange(category.id, e.target.value)}
                        placeholder="0.00"
                        className="w-28 text-right"
                        disabled={!isEditor || permissionsLoading}
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(newBalance)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Goals Section */}
      {envelopeGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Goals
            </CardTitle>
            <CardDescription>
              Allocate funds to your savings goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-md">
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3 p-3">
                {envelopeGoals.map((goal) => {
                  if (!goal.linked_category_id) return null;
                  const category = categories.find(c => c.id === goal.linked_category_id);
                  if (!category) return null;
                  
                  const allocation = goalAllocations[goal.linked_category_id] || 0;
                  const newBalance = category.current_balance + allocation;

                  return (
                    <Card key={goal.id} className="p-4">
                      <div className="space-y-3">
                        {/* Goal Name */}
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-blue-500" />
                          <div className="font-medium flex-1">{goal.name}</div>
                        </div>

                        {/* Monthly Target */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Monthly Target</span>
                          <span className="text-sm font-medium">{formatCurrency(goal.monthly_contribution)}</span>
                        </div>

                        {/* Current Balance */}
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Current Balance</span>
                          <span className="text-sm font-medium">{formatCurrency(category.current_balance)}</span>
                        </div>

                        {/* Allocate Input */}
                        <div className="space-y-1">
                          <Label htmlFor={`goal-allocate-${goal.id}`} className="text-sm">Allocate</Label>
                          <Input
                            id={`goal-allocate-${goal.id}`}
                            type="number"
                            step="0.01"
                            value={allocation || ''}
                            onChange={(e) => handleGoalAllocationChange(goal.linked_category_id!, e.target.value)}
                            placeholder="0.00"
                            className="w-full text-right"
                            disabled={!isEditor || permissionsLoading}
                          />
                        </div>

                        {/* New Balance */}
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="text-sm font-medium">New Balance</span>
                          <span className="text-sm font-semibold">{formatCurrency(newBalance)}</span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Goal</TableHead>
                      <TableHead className="text-right">Monthly Target</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                      <TableHead className="text-right">Allocate</TableHead>
                      <TableHead className="text-right">New Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {envelopeGoals.map((goal) => {
                      if (!goal.linked_category_id) return null;
                      const category = categories.find(c => c.id === goal.linked_category_id);
                      if (!category) return null;
                      
                      const allocation = goalAllocations[goal.linked_category_id] || 0;
                      const newBalance = category.current_balance + allocation;

                      return (
                        <TableRow key={goal.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-blue-500" />
                              {goal.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(goal.monthly_contribution)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(category.current_balance)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.01"
                              value={allocation || ''}
                              onChange={(e) => handleGoalAllocationChange(goal.linked_category_id!, e.target.value)}
                              placeholder="0.00"
                              className="w-28 text-right"
                              disabled={!isEditor || permissionsLoading}
                            />
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(newBalance)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account-Linked Goals Reminder */}
      {accountLinkedGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Account-Linked Goals
            </CardTitle>
            <CardDescription>
              Transfer funds to these dedicated accounts to stay on track with your goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  {accountLinkedGoals.map(goal => (
                    <div key={goal.id}>
                      <strong>{goal.name}:</strong> Transfer {formatCurrency(goal.monthly_contribution)} to{' '}
                      <strong>{goal.linked_account?.name || 'your linked account'}</strong> to stay on track.
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Debt Paydown Goals Reminder */}
      {debtPaydownGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              Debt Paydown Goals
            </CardTitle>
            <CardDescription>
              Make payments to these credit cards to stay on track with paying off your debt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  {debtPaydownGoals.map(goal => (
                    <div key={goal.id}>
                      <strong>{goal.name}:</strong> Make payment of {formatCurrency(goal.monthly_contribution)} to{' '}
                      <strong>{goal.linked_credit_card?.name || 'your credit card'}</strong> to stay on track.
                      {goal.current_balance !== undefined && (
                        <span className="text-muted-foreground ml-2">
                          (Remaining: {formatCurrency(goal.current_balance)})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      <div ref={bottomSummaryRef} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-muted rounded-md">
          <div className="text-sm text-muted-foreground">Available Funds</div>
          <div className="text-xl font-semibold">
            {formatCurrency(availableToAllocate)}
          </div>
        </div>
        <div className="p-4 bg-muted rounded-md">
          <div className="text-sm text-muted-foreground">Total Allocated</div>
          <div className="text-xl font-semibold">
            {formatCurrency(getTotalAllocated())}
          </div>
        </div>
        <div className={`p-4 rounded-md ${getRemaining() < 0 ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950'}`}>
          <div className="text-sm text-muted-foreground">Remaining</div>
          <div className={`text-xl font-semibold ${getRemaining() < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
            {formatCurrency(getRemaining())}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button 
          onClick={handleAllocate} 
          disabled={isSubmitting || !isEditor || permissionsLoading}
        >
          {isSubmitting ? 'Allocating...' : 'Allocate to Envelopes'}
        </Button>
      </div>

      {/* Sticky Footer - Shows when both top and bottom sections are not visible */}
      {!isAvailableBalanceVisible && !isBottomSummaryVisible && (
        <>
          {/* Mobile sticky footer */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg p-4 md:hidden" style={{ marginBottom: 0, paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Remaining</div>
                <div className={`text-lg font-semibold ${getRemaining() < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {formatCurrency(getRemaining())}
                </div>
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="text-xs text-muted-foreground">Total Allocated</div>
                <div className="text-lg font-semibold">{formatCurrency(getTotalAllocated())}</div>
              </div>
              <Button 
                onClick={handleAllocate} 
                disabled={isSubmitting || !isEditor || permissionsLoading}
                size="sm"
                className="shrink-0"
              >
                {isSubmitting ? 'Allocating...' : 'Allocate'}
              </Button>
            </div>
          </div>

          {/* Desktop sticky footer */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg p-4 hidden md:block" style={{ marginBottom: 0 }}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-4 md:px-6">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs text-muted-foreground">Available Funds</div>
                  <div className="text-lg font-semibold">{formatCurrency(availableToAllocate)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Total Allocated</div>
                  <div className="text-lg font-semibold">{formatCurrency(getTotalAllocated())}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Remaining</div>
                  <div className={`text-lg font-semibold ${getRemaining() < 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                    {formatCurrency(getRemaining())}
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleAllocate} 
                disabled={isSubmitting || !isEditor || permissionsLoading}
              >
                {isSubmitting ? 'Allocating...' : 'Allocate to Envelopes'}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Smart Allocation Dialog */}
      <SmartAllocationDialog
        open={isSmartAllocationOpen}
        onOpenChange={setIsSmartAllocationOpen}
        categories={categories}
        availableToSave={currentSavings}
        onSuccess={onSuccess}
      />

      {/* Add to Income Buffer Dialog */}
      <AddToBufferDialog
        open={isAddToBufferOpen}
        onOpenChange={setIsAddToBufferOpen}
        availableToSave={currentSavings}
        onSuccess={onSuccess}
      />
    </div>
  );
}


