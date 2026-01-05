import type { Category } from './types';

export interface AllocationPlan {
  categoryId: number;
  categoryName: string;
  currentBalance: number;
  targetAmount: number;
  fundedThisMonth: number;
  remainingToFund: number;
  allocatedAmount: number;
  priority: number;
  categoryType: string;
}

export interface SmartAllocationResult {
  allocations: AllocationPlan[];
  totalAllocated: number;
  remainingFunds: number;
}

/**
 * Smart Allocation Algorithm
 * 
 * Distributes funds across categories based on:
 * 1. Priority (1 = highest, 10 = lowest)
 * 2. Category type (Monthly Expense, Accumulation, Target Balance)
 * 3. What's already been funded this month
 * 4. Catch-up needs for underfunded categories
 */
export function calculateSmartAllocation(
  categories: Category[],
  monthlyFundingData: Map<number, { funded: number; target: number }>,
  availableFunds: number,
  currentMonth: string
): SmartAllocationResult {
  // Filter out system categories, buffer category, and goals - sort by priority
  const eligibleCategories = categories
    .filter(cat => !cat.is_system && !cat.is_goal && !cat.is_buffer)
    .sort((a, b) => {
      const priorityA = a.priority || 5;
      const priorityB = b.priority || 5;
      return priorityA - priorityB; // Lower number = higher priority
    });

  const allocations: AllocationPlan[] = [];
  let remainingFunds = availableFunds;

  for (const category of eligibleCategories) {
    const categoryType = category.category_type || 'monthly_expense';
    const priority = category.priority || 5;
    const fundingData = monthlyFundingData.get(category.id) || { funded: 0, target: 0 };
    
    let targetAmount = 0;
    let shouldAllocate = true;

    // Determine target amount based on category type
    switch (categoryType) {
      case 'monthly_expense':
        targetAmount = category.monthly_target || category.monthly_amount;
        break;
      
      case 'accumulation':
        // For accumulation, calculate monthly portion of annual target
        const annualTarget = category.annual_target || (category.monthly_amount * 12);
        targetAmount = annualTarget / 12;
        
        // TODO: Add catch-up logic for underfunded accumulation categories
        // This would check YTD funded vs YTD target and add extra if behind
        break;
      
      case 'target_balance':
        // For target balance, only allocate if below target
        const targetBalance = category.target_balance || 0;
        const currentBalance = category.current_balance || 0;
        
        if (currentBalance >= targetBalance) {
          shouldAllocate = false; // Already at target
        } else {
          // Allocate up to the remaining needed to reach target
          targetAmount = targetBalance - currentBalance;
        }
        break;
    }

    if (!shouldAllocate || remainingFunds <= 0) {
      allocations.push({
        categoryId: category.id,
        categoryName: category.name,
        currentBalance: category.current_balance,
        targetAmount,
        fundedThisMonth: fundingData.funded,
        remainingToFund: Math.max(0, targetAmount - fundingData.funded),
        allocatedAmount: 0,
        priority,
        categoryType,
      });
      continue;
    }

    // Calculate how much to allocate
    const alreadyFunded = fundingData.funded;
    const remainingToFund = Math.max(0, targetAmount - alreadyFunded);
    const allocatedAmount = Math.min(remainingToFund, remainingFunds);

    allocations.push({
      categoryId: category.id,
      categoryName: category.name,
      currentBalance: category.current_balance,
      targetAmount,
      fundedThisMonth: alreadyFunded,
      remainingToFund,
      allocatedAmount,
      priority,
      categoryType,
    });

    remainingFunds -= allocatedAmount;
  }

  return {
    allocations,
    totalAllocated: availableFunds - remainingFunds,
    remainingFunds,
  };
}

/**
 * Calculate catch-up amount for accumulation categories
 * 
 * If a category is behind on its year-to-date target, this calculates
 * how much extra should be allocated to catch up.
 */
export function calculateCatchUpAmount(
  category: Category,
  ytdFunded: number,
  currentMonth: string
): number {
  if (category.category_type !== 'accumulation') {
    return 0;
  }

  const annualTarget = category.annual_target || (category.monthly_amount * 12);
  const monthlyTarget = annualTarget / 12;
  
  // Calculate which month we're in (1-12)
  const month = new Date(currentMonth).getMonth() + 1;
  
  // Calculate YTD target (what should have been funded by now)
  const ytdTarget = monthlyTarget * month;
  
  // If behind, calculate catch-up amount
  const shortfall = Math.max(0, ytdTarget - ytdFunded);
  
  return shortfall;
}


