// AI Integration Types

export type AIFeatureType = 'chat' | 'categorization' | 'insights' | 'reports' | 'prediction';

export interface UsageStats {
  chat: { used: number; limit: number };
  categorization: { used: number; limit: number };
  insights: { used: number; limit: number };
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
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
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
    amount: number;
    date: string;
    category: string;
  }>;
  categoryTotals: Record<string, number>;
  monthlySpending: number[];
  goals: Array<{
    id: number;
    name: string;
    target_amount: number;
    current_amount: number;
    status: string;
  }>;
  accounts: Array<{
    id: number;
    name: string;
    balance: number;
  }>;
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

