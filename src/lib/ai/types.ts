// AI Integration Types

export type AIFeatureType = 'chat' | 'categorization' | 'insights' | 'dashboard_insights' | 'reports' | 'prediction';

export interface UsageStats {
  chat: { used: number; limit: number };
  categorization: { used: number; limit: number };
  insights: { used: number; limit: number };
  dashboard_insights: { used: number; limit: number };
  reports: { used: number; limit: number };
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export interface CategorySuggestion {
  transactionId: number;
  categoryId: number | null;
  categoryName: string;
  confidence: number;
  reason: string;
}

export interface Insight {
  type: 'positive' | 'neutral' | 'warning';
  title: string;
  description: string;
  action: string;
}

export interface MonthlyInsights {
  summary: string;
  insights: Insight[];
  projections: {
    nextMonthEstimate: number;
    savingsOpportunities: number;
  };
  metadata?: {
    transactionCount?: number;
    dateRange?: { start: string; end: string };
    categoriesSearched?: number;
    goalsAccessed?: number;
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  metadata?: {
    transactionCount?: number;
    dateRange?: { start: string; end: string };
    categoriesSearched?: number;
    merchantsSearched?: number;
    goalsAccessed?: number;
    loansAccessed?: number;
    accountsAccessed?: number;
    incomeBufferAccessed?: boolean;
    incomeSettingsAccessed?: boolean;
  };
}

export interface UserContext {
  currentBudget: {
    total: number;
    spent: number;
    remaining: number;
  };
  recentTransactions: Array<{
    id: number;
    merchant: string;
    merchantGroup?: string | null;
    amount: number;
    date: string;
    category: string;
    description?: string;
    transactionType?: 'income' | 'expense';
  }>;
  categoryTotals: Record<string, number>;
  categories: Array<{
    id: number;
    name: string;
    monthly_amount: number;
    current_balance: number;
    category_type?: 'monthly_expense' | 'accumulation' | 'target_balance';
    annual_target?: number;
    target_balance?: number;
  }>;
  monthlySpending: number[];
  goals: Array<{
    id: number;
    name: string;
    target_amount: number;
    target_date: string | null;
    current_amount: number;
    status: string;
    goal_type: string;
    monthly_contribution: number;
    notes: string | null;
  }>;
  accounts: Array<{
    id: number;
    name: string;
    balance: number;
  }>;
  loans: Array<{
    id: number;
    name: string;
    balance: number;
    interest_rate: number | null;
    minimum_payment: number | null;
    payment_due_date: number | null;
  }>;
  incomeBuffer: {
    id: number;
    name: string;
    current_balance: number;
    monthly_amount: number;
  } | null;
  incomeSettings: {
    annual_income: number | null;
    tax_rate: number | null;
    pay_frequency: string | null;
    include_extra_paychecks: boolean | null;
    pre_tax_deduction_items: Array<{
      id: string;
      name: string;
      type: 'percentage' | 'fixed';
      value: number;
    }> | null;
  };
  // Additional context for better analysis
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface AIUsageRecord {
  id: string;
  userId: string;
  accountId: number;
  featureType: AIFeatureType;
  tokensUsed: number;
  tokensInput: number;
  tokensOutput: number;
  responseTimeMs: number | null;
  timestamp: Date;
  requestMetadata: Record<string, any>;
}

