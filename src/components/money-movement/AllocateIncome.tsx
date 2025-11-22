import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/utils';
import type { Category, GoalWithDetails } from '@/lib/types';
import { Target, Info, Sparkles } from 'lucide-react';
import { SmartAllocationDialog } from '@/components/allocations/SmartAllocationDialog';
import { useFeature } from '@/contexts/FeatureContext';

interface AllocateIncomeProps {
  categories: Category[];
  currentSavings: number;
  onSuccess: () => void;
}

export default function AllocateIncome({ categories, currentSavings, onSuccess }: AllocateIncomeProps) {
  const [allocations, setAllocations] = useState<{ [key: number]: number }>({});
  const [goalAllocations, setGoalAllocations] = useState<{ [key: number]: number }>({});
  const [allGoals, setAllGoals] = useState<GoalWithDetails[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monthlyFunding, setMonthlyFunding] = useState<{ [key: number]: number }>({});
  const [isSmartAllocationOpen, setIsSmartAllocationOpen] = useState(false);

  const smartAllocationEnabled = useFeature('smart_allocation');

  // Filter out system categories (like Transfer) from allocation
  const envelopeCategories = categories.filter(cat => !cat.is_system && !cat.is_goal);
  
  // Separate envelope goals, account-linked goals, and debt-paydown goals
  const envelopeGoals = allGoals.filter(g => g.goal_type === 'envelope' && g.status === 'active');
  const accountLinkedGoals = allGoals.filter(g => g.goal_type === 'account-linked' && g.status === 'active');
  const debtPaydownGoals = allGoals.filter(g => g.goal_type === 'debt-paydown' && g.status === 'active');
  
  // Fetch all goals and monthly funding data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const currentMonth = new Date().toISOString().slice(0, 7) + '-01';

        const [goalsResponse, fundingResponse] = await Promise.all([
          fetch('/api/goals?status=active'),
          fetch(`/api/monthly-funding/${currentMonth}`)
        ]);

        if (goalsResponse.ok) {
          const goalsData = await goalsResponse.json();
          setAllGoals(goalsData);
        }

        if (fundingResponse.ok) {
          const fundingData = await fundingResponse.json();
          const fundingMap: { [key: number]: number } = {};
          fundingData.categories?.forEach((cat: any) => {
            fundingMap[cat.categoryId] = cat.fundedAmount || 0;
          });
          setMonthlyFunding(fundingMap);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
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
      alert('No funds available to allocate. Please update your account balances.');
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
      alert('No funds available to allocate. Please update your account balances.');
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
      alert('Please allocate funds to at least one category');
      return;
    }

    try {
      setIsSubmitting(true);

      // Update all categories with allocations
      const categoryUpdates = categories
        .filter(cat => allocations[cat.id] > 0)
        .map(cat =>
          fetch(`/api/categories/${cat.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              current_balance: cat.current_balance + allocations[cat.id],
            }),
          })
        );
      
      // Update goal categories with allocations
      const goalUpdates = envelopeGoals
        .filter(goal => goal.linked_category_id !== null && goalAllocations[goal.linked_category_id] > 0)
        .map(goal => {
          if (!goal.linked_category_id) return null;
          const category = categories.find(c => c.id === goal.linked_category_id);
          if (!category) return null;
          const allocation = goalAllocations[goal.linked_category_id];
          return fetch(`/api/categories/${goal.linked_category_id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              current_balance: category.current_balance + allocation,
            }),
          });
        })
        .filter((update): update is Promise<Response> => update !== null);

      await Promise.all([...categoryUpdates, ...goalUpdates]);

      // Reset form
      setAllocations({});
      setGoalAllocations({});
      onSuccess();
      alert(`Successfully allocated ${formatCurrency(totalAllocated)} to envelopes!`);
    } catch (error) {
      console.error('Error allocating funds:', error);
      alert('Failed to allocate funds');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
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

      <div className="flex flex-wrap gap-2">
        {smartAllocationEnabled && (
          <Button
            variant="default"
            onClick={() => setIsSmartAllocationOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Smart Allocation
          </Button>
        )}
        <Button variant="outline" onClick={handleUseMonthlyAmounts}>
          Use Monthly Amounts
        </Button>
        <Button variant="outline" onClick={handleUseProportional}>
          Distribute Proportionally
        </Button>
        <Button variant="outline" onClick={handleAllocateAll}>
          Split Evenly
        </Button>
        <Button variant="outline" onClick={handleClearAllocations}>
          Clear All
        </Button>
      </div>

      {/* Regular Envelopes */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Monthly Amount</TableHead>
              <TableHead className="text-right">Funded This Month</TableHead>
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
                  <TableCell className="text-right text-blue-600 dark:text-blue-400">
                    {formatCurrency(fundedThisMonth)}
                  </TableCell>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        <Button onClick={handleAllocate} disabled={isSubmitting}>
          {isSubmitting ? 'Allocating...' : 'Allocate to Envelopes'}
        </Button>
      </div>

      {/* Smart Allocation Dialog */}
      <SmartAllocationDialog
        open={isSmartAllocationOpen}
        onOpenChange={setIsSmartAllocationOpen}
        categories={categories}
        availableToSave={currentSavings}
        onSuccess={onSuccess}
      />
    </div>
  );
}

