import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS } from './constants';
import type { CategorySuggestion, MonthlyInsights, UserContext, ChatMessage } from './types';

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

if (!API_KEY) {
  console.warn('GOOGLE_GEMINI_API_KEY not found in environment variables');
}

class GeminiService {
  private proModel: any;
  private flashModel: any;

  constructor() {
    if (API_KEY) {
      const genAI = new GoogleGenerativeAI(API_KEY);
      this.proModel = genAI.getGenerativeModel({ model: GEMINI_MODELS.pro });
      this.flashModel = genAI.getGenerativeModel({ model: GEMINI_MODELS.flash });
    }
  }

  /**
   * Categorize a batch of transactions
   */
  async categorizeBatch(
    transactions: Array<{
      id: number;
      merchant: string;
      amount: number;
      date: string;
      currentCategory?: string;
    }>,
    availableCategories: Array<{ id: number; name: string }>
  ): Promise<{
    suggestions: CategorySuggestion[];
    tokensUsed: number;
    responseTimeMs: number;
  }> {
    if (!API_KEY) {
      throw new Error('Google Gemini API key not configured');
    }

    const startTime = Date.now();

    const categoryList = availableCategories.map(c => c.name).join(', ');
    const transactionList = transactions
      .map(
        (t, idx) =>
          `${idx + 1}. ${t.merchant || 'Unknown'} - $${t.amount.toFixed(2)} - ${t.date}${t.currentCategory ? ` (currently: ${t.currentCategory})` : ''}`
      )
      .join('\n');

    const prompt = `You are a financial transaction categorization expert. Analyze these transactions and assign appropriate categories.

Available categories: ${categoryList}

Transactions:
${transactionList}

Return a JSON array with format:
[{"transaction_id": number, "category": "category_name", "confidence": 0-1, "reason": "brief explanation"}]

Consider:
- Merchant patterns and names
- Transaction amounts
- Common spending patterns
- Context clues from merchant names

Only return the JSON array, no other text.`;

    try {
      const result = await this.flashModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON from response (handle markdown code blocks if present)
      let jsonText = text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const suggestions = JSON.parse(jsonText) as Array<{
        transaction_id: number;
        category: string;
        confidence: number;
        reason: string;
      }>;

      // Map to our format and find category IDs
      const mappedSuggestions: CategorySuggestion[] = suggestions.map((s) => {
        const category = availableCategories.find((c) => c.name === s.category);
        return {
          transactionId: s.transaction_id,
          categoryId: category?.id || null,
          categoryName: s.category,
          confidence: Math.max(0, Math.min(1, s.confidence)),
          reason: s.reason || '',
        };
      });

      const responseTimeMs = Date.now() - startTime;
      const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

      return {
        suggestions: mappedSuggestions,
        tokensUsed,
        responseTimeMs,
      };
    } catch (error: any) {
      console.error('Error categorizing transactions:', error);
      
      // Check for quota/rate limit errors
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Quota exceeded')) {
        const retryAfter = error.message?.match(/retry in ([\d.]+)s/i)?.[1];
        throw new Error(
          `AI service quota exceeded. ${retryAfter ? `Please retry in ${Math.ceil(parseFloat(retryAfter))} seconds.` : 'Please try again later.'} ` +
          `If this persists, check your Google Gemini API key configuration in Google AI Studio.`
        );
      }
      
      throw new Error(`Failed to categorize transactions: ${error.message}`);
    }
  }

  /**
   * Categorize import transactions (for transaction import flow)
   * Uses string transaction IDs and includes description field
   */
  async categorizeImportTransactions(
    transactions: Array<{
      id: string; // String ID for import transactions
      merchant: string;
      description: string;
      amount: number;
      date: string;
      transaction_type: 'income' | 'expense';
    }>,
    availableCategories: Array<{ id: number; name: string }>
  ): Promise<{
    suggestions: Array<{
      transactionId: string;
      categoryId: number | null;
      categoryName: string;
      confidence: number;
      reason: string;
    }>;
    tokensUsed: number;
    responseTimeMs: number;
  }> {
    if (!API_KEY) {
      throw new Error('Google Gemini API key not configured');
    }

    if (transactions.length === 0) {
      return {
        suggestions: [],
        tokensUsed: 0,
        responseTimeMs: 0,
      };
    }

    const startTime = Date.now();

    // Build category list - only include category names
    const categoryList = availableCategories.map(c => c.name).join(', ');
    
    // Build transaction list with index mapping
    const transactionList = transactions
      .map(
        (t, idx) =>
          `${idx + 1}. Merchant: ${t.merchant || 'Unknown'}, Description: ${t.description}, Amount: $${t.amount.toFixed(2)}, Date: ${t.date}, Type: ${t.transaction_type}`
      )
      .join('\n');

    const prompt = `You are a financial transaction categorization expert. Analyze these transactions and assign the most appropriate category from the available categories list.

CRITICAL RULES:
1. You MUST only use categories from this exact list: ${categoryList}
2. If no category fits well, you may return null for categoryId, but try your best to match to the closest category
3. Return a JSON array with the exact format specified below
4. Use the transaction index (1-based) as the transaction_id in your response

Available categories: ${categoryList}

Transactions to categorize:
${transactionList}

Return a JSON array with this EXACT format (use transaction index as transaction_id):
[{"transaction_id": 1, "category": "category_name_from_list", "confidence": 0.95, "reason": "brief explanation"}]

Consider:
- Merchant names and patterns
- Transaction descriptions
- Transaction amounts
- Transaction type (income vs expense)
- Common spending patterns
- Context clues from merchant names and descriptions

IMPORTANT: 
- transaction_id should be the index number (1, 2, 3, etc.) from the list above
- category MUST be an exact match from the available categories list
- confidence should be between 0 and 1
- Only return the JSON array, no other text or markdown formatting`;

    try {
      const result = await this.flashModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON from response (handle markdown code blocks if present)
      let jsonText = text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const aiSuggestions = JSON.parse(jsonText) as Array<{
        transaction_id: number; // This is the 1-based index
        category: string;
        confidence: number;
        reason: string;
      }>;

      // Map to our format using the transaction IDs
      const mappedSuggestions = aiSuggestions.map((s) => {
        // transaction_id is 1-based index, convert to 0-based to get the transaction
        const transactionIndex = s.transaction_id - 1;
        const transaction = transactions[transactionIndex];
        
        if (!transaction) {
          console.warn(`Transaction index ${transactionIndex} not found`);
          return null;
        }

        // Find category by name (case-insensitive, trimmed)
        const category = availableCategories.find(
          (c) => c.name.trim().toLowerCase() === s.category.trim().toLowerCase()
        );

        return {
          transactionId: transaction.id,
          categoryId: category?.id || null,
          categoryName: category?.name || s.category,
          confidence: Math.max(0, Math.min(1, s.confidence || 0.5)),
          reason: s.reason || '',
        };
      }).filter((s): s is NonNullable<typeof s> => s !== null);

      const responseTimeMs = Date.now() - startTime;
      const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

      return {
        suggestions: mappedSuggestions,
        tokensUsed,
        responseTimeMs,
      };
    } catch (error: any) {
      console.error('Error categorizing import transactions:', error);
      
      // Check for service unavailable/overloaded errors (503)
      if (
        error.message?.includes('503') ||
        error.message?.includes('Service Unavailable') ||
        error.message?.includes('overloaded') ||
        error.message?.includes('overload') ||
        error.status === 503
      ) {
        // Create a custom error that we can detect in the API route
        const serviceUnavailableError = new Error('AI service temporarily unavailable. Please try again later.');
        (serviceUnavailableError as any).isServiceUnavailable = true;
        throw serviceUnavailableError;
      }
      
      // Check for quota/rate limit errors (429)
      if (
        error.message?.includes('429') ||
        error.message?.includes('quota') ||
        error.message?.includes('Quota exceeded') ||
        error.status === 429
      ) {
        const retryAfter = error.message?.match(/retry in ([\d.]+)s/i)?.[1];
        throw new Error(
          `AI service quota exceeded. ${retryAfter ? `Please retry in ${Math.ceil(parseFloat(retryAfter))} seconds.` : 'Please try again later.'} ` +
          `If this persists, check your Google Gemini API key configuration in Google AI Studio.`
        );
      }
      
      throw new Error(`Failed to categorize transactions: ${error.message}`);
    }
  }

  /**
   * Generate monthly insights
   */
  async generateInsights(
    userData: {
      transactions: Array<{
        date: string;
        merchant: string;
        amount: number;
        type: 'income' | 'expense';
        category: string;
        account: string;
      }>;
      ytdTransactions: Array<{
        date: string;
        merchant: string;
        amount: number;
        type: 'income' | 'expense';
        category: string;
        account: string;
      }>;
      budget: {
        total: number;
        spent: number;
        remaining: number;
        ytdSpent: number;
        period: {
          monthStart: string;
          monthEnd: string;
          yearStart: string;
        };
      };
      goals: Array<{
        name: string;
        target_amount: number;
        current_amount: number;
        status: string;
      }>;
      previousMonth: {
        total: number;
        categoryBreakdown: Record<string, number>;
      };
      categoryBreakdown: Record<
        string,
        {
          monthly_budget: number;
          monthly_spent: number;
          ytd_spent: number;
          category_type: 'monthly_expense' | 'accumulation' | 'target_balance';
          annual_target?: number;
          current_balance: number;
        }
      >;
      accounts?: Array<{
        name: string;
        balance: number;
        account_type: string;
      }>;
      creditCards?: Array<{
        name: string;
        current_balance: number;
        credit_limit: number;
        available_credit: number;
      }>;
      loans?: Array<{
        name: string;
        balance: number;
        interest_rate: number | null;
        minimum_payment: number | null;
        payment_due_date: number | null;
      }>;
      incomeBuffer?: {
        name: string;
        current_balance: number;
        monthly_amount: number;
      } | null;
      incomeSettings?: {
        annual_income: number | null;
        tax_rate: number | null;
        pay_frequency: string | null;
        include_extra_paychecks: boolean | null;
      } | null;
    }
  ): Promise<{
    insights: MonthlyInsights;
    tokensUsed: number;
    responseTimeMs: number;
  }> {
    if (!API_KEY) {
      throw new Error('Google Gemini API key not configured');
    }

    const startTime = Date.now();

    const categoryBreakdownText = Object.entries(userData.categoryBreakdown)
      .map(([cat, data]) => {
        if (data.category_type === 'accumulation') {
          const target = data.annual_target ?? data.monthly_budget * 12;
          return `- ${cat} [ACCUMULATION]: YTD spent $${data.ytd_spent.toFixed(2)} / annual target $${target.toFixed(2)} | This month spent $${data.monthly_spent.toFixed(2)} | Monthly funding $${data.monthly_budget.toFixed(2)} | Current balance $${data.current_balance.toFixed(2)}`;
        }

        if (data.category_type === 'target_balance') {
          return `- ${cat} [TARGET BALANCE]: Current balance $${data.current_balance.toFixed(2)} | Monthly funding $${data.monthly_budget.toFixed(2)} | This month spent $${data.monthly_spent.toFixed(2)}`;
        }

        return `- ${cat} [MONTHLY EXPENSE]: This month spent $${data.monthly_spent.toFixed(2)} vs monthly budget $${data.monthly_budget.toFixed(2)} | YTD spent $${data.ytd_spent.toFixed(2)}`;
      })
      .join('\n');

    // Build help documentation about the budget system
    const helpDocumentation = `
BUDGET SYSTEM DOCUMENTATION:

This app uses an envelope budgeting system where money is allocated to categories (envelopes) for specific purposes.

CATEGORY TYPES - CRITICAL TO UNDERSTAND:

1. MONTHLY EXPENSE (category_type: "monthly_expense"):
   - For regular monthly spending (groceries, gas, utilities, rent)
   - Should be fully funded each month
   - Spending should roughly match monthly_amount each month
   - If spending exceeds monthly_amount, that's a concern

2. ACCUMULATION (category_type: "accumulation"):
   - For periodic/annual expenses you save for over time
   - Has an annual_target (total amount needed per year)
   - monthly_amount is the monthly contribution toward the annual goal
   - CRITICAL: Spending patterns are IRREGULAR - you may spend MORE than monthly_amount in some months
   - This is EXPECTED and NORMAL for accumulation categories
   - Example: Car Insurance with annual_target=$1,200 and monthly_amount=$100
     - You save $100/month for 12 months = $1,200 total
     - But you might pay $400 in June, $300 in October, $500 in December
     - Spending $400 in June is NOT "over budget" - it's using accumulated savings
   - Only warn if spending exceeds accumulated savings (current balance goes negative)
   - Progress is measured by total funded YTD vs annual_target, NOT monthly spending vs monthly_amount

3. TARGET BALANCE (category_type: "target_balance"):
   - For building/maintaining a specific balance (emergency fund, buffer)
   - Has a target_balance (desired balance to maintain)
   - Funding stops when target_balance is reached

UNDERSTANDING SPENDING VS BUDGET:
- MONTHLY EXPENSE: Evaluate this month's spending vs monthly_amount.
- ACCUMULATION: Spending can exceed monthly_amount; evaluate YTD vs annual_target and whether current_balance would go negative.
- Always check category_type before making budget warnings.
- Accumulation categories are designed for irregular spending patterns.
`;

    // Format transactions for prompt
    const formatTransactions = (txns: typeof userData.transactions, label: string) => {
      if (!txns || txns.length === 0) {
        return `${label}: No transactions found in this period. The system searched for transactions but found none matching the criteria (expense transactions for the specified date range).`;
      }
      
      // Group by category for better readability
      const byCategory: Record<string, Array<typeof txns[0]>> = {};
      txns.forEach(t => {
        if (!byCategory[t.category]) {
          byCategory[t.category] = [];
        }
        byCategory[t.category].push(t);
      });
      
      const categorySections = Object.entries(byCategory)
        .map(([category, categoryTxns]) => {
          const total = categoryTxns.reduce((sum, t) => sum + t.amount, 0);
          const transactionList = categoryTxns
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(t => `  - ${t.date}: ${t.merchant} - $${t.amount.toFixed(2)} (${t.account})`)
            .join('\n');
          return `  ${category} (Total: $${total.toFixed(2)}, ${categoryTxns.length} transaction${categoryTxns.length !== 1 ? 's' : ''}):\n${transactionList}`;
        })
        .join('\n\n');
      
      return `${label} (${txns.length} transaction${txns.length !== 1 ? 's' : ''}, Total: $${txns.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}):\n${categorySections}`;
    };

    const currentMonthTransactionsText = formatTransactions(userData.transactions, `Current Month Transactions (${userData.budget.period.monthStart} to ${userData.budget.period.monthEnd})`);
    const ytdTransactionsText = formatTransactions(userData.ytdTransactions, `Year-to-Date Transactions (${userData.budget.period.yearStart} to ${userData.budget.period.monthEnd})`);

    const prompt = `You are a personal financial advisor. Analyze this user's spending data and provide actionable insights.

${helpDocumentation}

TIMEFRAMES:
- Current month range: ${userData.budget.period.monthStart} to ${userData.budget.period.monthEnd}
- Year-to-date range: ${userData.budget.period.yearStart} to ${userData.budget.period.monthEnd}

Monthly Budget Summary (use ONLY this month's spending for monthly checks):
- Total spent this month: $${userData.budget.spent.toFixed(2)}
- Monthly budget: $${userData.budget.total.toFixed(2)}
- Over/Under this month: $${(userData.budget.spent - userData.budget.total).toFixed(2)}
- Year-to-date spending (for annual/accumulation context): $${userData.budget.ytdSpent.toFixed(2)}

Category Spending Detail:
${categoryBreakdownText}

${currentMonthTransactionsText}

${ytdTransactionsText}

Previous Month Comparison:
- Total: $${userData.previousMonth.total.toFixed(2)}
- Category breakdown: ${JSON.stringify(userData.previousMonth.categoryBreakdown)}

Financial Goals:
${userData.goals.length > 0 ? userData.goals.map((g) => `- ${g.name}: $${g.current_amount.toFixed(2)} / $${g.target_amount.toFixed(2)} (${g.status})`).join('\n') : 'No active goals'}

${userData.accounts && userData.accounts.length > 0 ? `Bank Accounts:
${userData.accounts.map((a) => `- ${a.name} (${a.account_type}): $${a.balance.toFixed(2)}`).join('\n')}` : ''}

${userData.creditCards && userData.creditCards.length > 0 ? `Credit Cards:
${userData.creditCards.map((cc) => `- ${cc.name}: Balance $${cc.current_balance.toFixed(2)} / Limit $${cc.credit_limit.toFixed(2)} (Available: $${cc.available_credit.toFixed(2)})`).join('\n')}` : ''}

${userData.loans && userData.loans.length > 0 ? `Loans:
${userData.loans.map((l) => `- ${l.name}: Balance $${l.balance.toFixed(2)}${l.interest_rate ? `, Interest Rate: ${l.interest_rate.toFixed(2)}%` : ''}${l.minimum_payment ? `, Minimum Payment: $${l.minimum_payment.toFixed(2)}` : ''}`).join('\n')}` : ''}

${userData.incomeBuffer ? `Income Buffer:
- ${userData.incomeBuffer.name}: Current balance $${userData.incomeBuffer.current_balance.toFixed(2)}, Monthly allocation $${userData.incomeBuffer.monthly_amount.toFixed(2)}` : ''}

${userData.incomeSettings && userData.incomeSettings.annual_income ? `Income Settings:
- Annual Income: $${userData.incomeSettings.annual_income.toFixed(2)}${userData.incomeSettings.tax_rate ? `, Tax Rate: ${(userData.incomeSettings.tax_rate * 100).toFixed(1)}%` : ''}${userData.incomeSettings.pay_frequency ? `, Pay Frequency: ${userData.incomeSettings.pay_frequency}` : ''}` : ''}

CRITICAL: When analyzing category spending:
- IMPORTANT: If the transaction data shows "No transactions found", this means the system searched for transactions but found none in the specified period. This could mean:
  - The period is in the future (e.g., requesting insights for a future month)
  - No expense transactions exist for this account in this period
  - Transactions may need to be imported or categorized
- Use the transaction data provided above to understand spending patterns, identify specific merchants, and analyze trends.
- Use the provided ranges:
  - MONTHLY EXPENSE categories -> compare THIS MONTH'S spending to monthly_budget (do NOT combine multiple months). Use current month transactions to identify specific spending patterns.
  - ACCUMULATION categories -> compare YTD spending to annual_target and check current_balance. Use year-to-date transactions to see spending patterns throughout the year. Monthly spikes are normal.
- For ACCUMULATION:
  - Spending over monthly_budget is expected; only warn if YTD spending risks exceeding annual_target OR current_balance would go negative.
  - Mention if monthly funding is off-track versus annual_target (monthly_budget * 12).
  - Use year-to-date transactions to identify when large expenses occurred and whether they align with expected patterns.
- For MONTHLY EXPENSE:
  - Spending this month above monthly_budget may indicate overspending.
  - Use current month transactions to identify which merchants or spending patterns contributed to overspending.
- Always reference the category_type before making any budget warning.
- Reference specific transactions, merchants, or spending patterns when providing insights to make them more actionable.

Provide 5-7 insights covering:
1. Overall spending health (vs budget) - considering category types
2. Category-specific observations - distinguishing accumulation vs monthly expense patterns
3. Notable spending changes
4. Goal progress assessment
5. Account and credit card balances (if provided) - liquidity and debt management
6. Loan status and payment considerations (if provided)
7. Income buffer and cash flow health (if provided)
8. Actionable recommendations
9. Potential savings opportunities
10. Upcoming budget considerations

Format as JSON:
{
  "summary": "overall summary paragraph",
  "insights": [
    {
      "type": "positive|neutral|warning",
      "title": "insight title",
      "description": "detailed description",
      "action": "actionable recommendation"
    }
  ],
  "projections": {
    "nextMonthEstimate": 0,
    "savingsOpportunities": 0
  }
}

Only return the JSON object, no other text.`;

    try {
      const result = await this.proModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse JSON from response
      let jsonText = text.trim();
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      }

      const insights = JSON.parse(jsonText) as MonthlyInsights;

      const responseTimeMs = Date.now() - startTime;
      const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

      return {
        insights,
        tokensUsed,
        responseTimeMs,
      };
    } catch (error: any) {
      console.error('Error generating insights:', error);
      
      // Check for quota/rate limit errors
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Quota exceeded')) {
        const retryAfter = error.message?.match(/retry in ([\d.]+)s/i)?.[1];
        throw new Error(
          `AI service quota exceeded. ${retryAfter ? `Please retry in ${Math.ceil(parseFloat(retryAfter))} seconds.` : 'Please try again later.'} ` +
          `If this persists, check your Google Gemini API key configuration in Google AI Studio.`
        );
      }
      
      throw new Error(`Failed to generate insights: ${error.message}`);
    }
  }

  /**
   * Handle chat query
   */
  async handleChat(
    query: string,
    context: UserContext,
    conversationHistory: ChatMessage[] = []
  ): Promise<{
    response: string;
    tokensUsed: number;
    responseTimeMs: number;
    metadata?: {
      transactionCount: number;
      dateRange: { start: string; end: string };
      categoriesSearched: number;
      merchantsSearched: number;
      goalsAccessed?: number;
      loansAccessed?: number;
      accountsAccessed?: number;
      incomeBufferAccessed?: boolean;
      incomeSettingsAccessed?: boolean;
    };
  }> {
    if (!API_KEY) {
      throw new Error('Google Gemini API key not configured');
    }

    const startTime = Date.now();

    const recentHistory = conversationHistory.slice(-5);
    const historyText = recentHistory
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    // Detect date range in query
    const queryLower = query.toLowerCase();
    let relevantTransactions = context.recentTransactions;
    let dateRangeNote = '';
    
    // Detect date range in query and filter transactions
    const now = new Date();
    let filteredDateRange = { start: context.dateRange?.start || '', end: context.dateRange?.end || '' };
    
    if (queryLower.includes('last month') || queryLower.includes('previous month')) {
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      const startStr = lastMonthStart.toISOString().split('T')[0];
      const endStr = lastMonthEnd.toISOString().split('T')[0];
      filteredDateRange = { start: startStr, end: endStr };
      // Filter transactions - dates are stored as YYYY-MM-DD strings
      relevantTransactions = context.recentTransactions.filter(
        (t) => {
          // Ensure date is in YYYY-MM-DD format for comparison
          const txDate = t.date.split('T')[0]; // Remove time if present
          return txDate >= startStr && txDate <= endStr;
        }
      );
      dateRangeNote = `\nNote: User is asking about LAST MONTH (${startStr} to ${endStr}). Focus your analysis on transactions from that period.`;
    } else if (queryLower.includes('this month') || queryLower.includes('current month')) {
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const startStr = thisMonthStart.toISOString().split('T')[0];
      filteredDateRange = { start: startStr, end: context.dateRange?.end || '' };
      relevantTransactions = context.recentTransactions.filter(
        (t) => {
          const txDate = t.date.split('T')[0];
          return txDate >= startStr;
        }
      );
      dateRangeNote = `\nNote: User is asking about THIS MONTH (from ${startStr}).`;
    } else if (queryLower.includes('november') || queryLower.includes('nov')) {
      // Handle November specifically
      const novStart = new Date(now.getFullYear(), 10, 1); // November is month 10 (0-indexed)
      const novEnd = new Date(now.getFullYear(), 10, 30);
      const startStr = novStart.toISOString().split('T')[0];
      const endStr = novEnd.toISOString().split('T')[0];
      filteredDateRange = { start: startStr, end: endStr };
      relevantTransactions = context.recentTransactions.filter(
        (t) => {
          const txDate = t.date.split('T')[0];
          return txDate >= startStr && txDate <= endStr;
        }
      );
      dateRangeNote = `\nNote: User is asking about NOVEMBER (${startStr} to ${endStr}). Focus your analysis on transactions from that period.`;
    } else if (queryLower.includes('october') || queryLower.includes('oct')) {
      // Handle October specifically
      const octStart = new Date(now.getFullYear(), 9, 1); // October is month 9 (0-indexed)
      const octEnd = new Date(now.getFullYear(), 9, 31);
      const startStr = octStart.toISOString().split('T')[0];
      const endStr = octEnd.toISOString().split('T')[0];
      filteredDateRange = { start: startStr, end: endStr };
      relevantTransactions = context.recentTransactions.filter(
        (t) => {
          const txDate = t.date.split('T')[0];
          return txDate >= startStr && txDate <= endStr;
        }
      );
      dateRangeNote = `\nNote: User is asking about OCTOBER (${startStr} to ${endStr}). Focus your analysis on transactions from that period.`;
    }

    // Group transactions by category for summary
    const transactionsByCategory: Record<string, Array<{ merchant: string; merchantGroup?: string | null; amount: number; date: string }>> = {};
    relevantTransactions.forEach((t) => {
      if (!transactionsByCategory[t.category]) {
        transactionsByCategory[t.category] = [];
      }
      transactionsByCategory[t.category].push({
        merchant: t.merchant,
        merchantGroup: t.merchantGroup,
        amount: t.amount,
        date: t.date,
      });
    });

    // Calculate totals by category
    const categoryTotalsDetailed: Record<string, { total: number; count: number; transactions: Array<{ merchant: string; merchantGroup?: string | null; amount: number }> }> = {};
    Object.entries(transactionsByCategory).forEach(([category, transactions]) => {
      const total = transactions.reduce((sum, t) => sum + t.amount, 0);
      categoryTotalsDetailed[category] = {
        total,
        count: transactions.length,
        transactions: transactions.slice(0, 20), // Limit to top 20 per category
      };
    });

    // Build transaction list text (limit to most relevant)
    const transactionListText = relevantTransactions
      .slice(0, 100) // Limit to 100 most recent for token efficiency
      .map((t, idx) => {
        const merchantInfo = t.merchantGroup ? `${t.merchant} (${t.merchantGroup})` : t.merchant;
        return `${idx + 1}. ${t.date} | ${merchantInfo} | $${t.amount.toFixed(2)} | ${t.category}${t.description ? ` | ${t.description}` : ''}`;
      })
      .join('\n');

    // Build help documentation about the budget system
    const helpDocumentation = `
BUDGET SYSTEM DOCUMENTATION:

This app uses an envelope budgeting system where money is allocated to categories (envelopes) for specific purposes.

CATEGORY TYPES - CRITICAL TO UNDERSTAND:

1. MONTHLY EXPENSE (category_type: "monthly_expense"):
   - For regular monthly spending (groceries, gas, utilities, rent)
   - Should be fully funded each month
   - Spending should roughly match monthly_amount each month
   - If spending exceeds monthly_amount, that's a concern
   - Example: Groceries with monthly_amount=$400 means you plan to spend ~$400/month

2. ACCUMULATION (category_type: "accumulation"):
   - For periodic/annual expenses you save for over time
   - Has an annual_target (total amount needed per year)
   - monthly_amount is the monthly contribution toward the annual goal
   - CRITICAL: Spending patterns are IRREGULAR - you may spend MORE than monthly_amount in some months
   - This is EXPECTED and NORMAL for accumulation categories
   - Example: Car Insurance with annual_target=$1,200 and monthly_amount=$100
     - You save $100/month for 12 months = $1,200 total
     - But you might pay $400 in June, $300 in October, $500 in December
     - Spending $400 in June is NOT "over budget" - it's using accumulated savings
   - Only warn if current_balance goes negative (spending exceeds accumulated savings)
   - Progress is measured by total funded YTD vs annual_target, NOT monthly spending vs monthly_amount

3. TARGET BALANCE (category_type: "target_balance"):
   - For building/maintaining a specific balance (emergency fund, buffer)
   - Has a target_balance (desired balance to maintain)
   - Funding stops when target_balance is reached
   - Spending reduces the balance below target, triggering more funding

UNDERSTANDING SPENDING VS BUDGET:
- For MONTHLY EXPENSE categories: Spending > monthly_amount = potential concern
- For ACCUMULATION categories: Spending > monthly_amount = EXPECTED and NORMAL
  - Only warn if spending > current_balance (running out of accumulated funds)
- Always check category_type before making budget warnings
- Accumulation categories are designed for irregular spending patterns

CURRENT BALANCE vs MONTHLY AMOUNT:
- current_balance = money currently available in the envelope
- monthly_amount = target to fund each month (for monthly_expense) OR monthly contribution (for accumulation)
- For accumulation categories, spending can exceed monthly_amount as long as current_balance remains positive
`;

    const prompt = `You are a helpful financial assistant for a budgeting app. You have access to the user's detailed financial data.

${helpDocumentation}

User's Financial Context:
- Current Budget: $${context.currentBudget.total.toFixed(2)} (Spent: $${context.currentBudget.spent.toFixed(2)}, Remaining: $${context.currentBudget.remaining.toFixed(2)})
- Date Range Available: ${context.dateRange?.start || 'N/A'} to ${context.dateRange?.end || 'N/A'}
${dateRangeNote}

Category Spending Summary (from transactions in date range):
${Object.entries(categoryTotalsDetailed)
  .map(([cat, data]) => `- ${cat}: $${data.total.toFixed(2)} (${data.count} transactions)`)
  .join('\n')}

Detailed Transactions (${relevantTransactions.length} transactions available):
${transactionListText || 'No transactions found in the specified date range.'}

Categories (with type information):
${context.categories.map((cat) => {
  const typeInfo = cat.category_type === 'accumulation' && cat.annual_target 
    ? ` | Type: Accumulation | Monthly Contribution: $${cat.monthly_amount.toFixed(2)} | Annual Target: $${cat.annual_target.toFixed(2)}`
    : cat.category_type === 'target_balance' && cat.target_balance
    ? ` | Type: Target Balance | Target: $${cat.target_balance.toFixed(2)}`
    : ` | Type: Monthly Expense`;
  return `- ${cat.name}: Current Balance $${cat.current_balance.toFixed(2)} | Monthly Amount $${cat.monthly_amount.toFixed(2)}${typeInfo}`;
}).join('\n')}

Category Totals (from budget):
${Object.entries(context.categoryTotals)
  .map(([cat, total]) => `- ${cat}: $${total.toFixed(2)}`)
  .join('\n')}

Monthly Spending Trend (last 6 months): ${context.monthlySpending.map((m, i) => {
  const monthNames = ['6 months ago', '5 months ago', '4 months ago', '3 months ago', '2 months ago', 'Last month'];
  return `${monthNames[i]}: $${m.toFixed(2)}`;
}).join(', ')}

Goals (${context.goals.length} total):
${context.goals.length > 0 ? context.goals.map((g) => {
  const targetDateStr = g.target_date ? ` (Target: ${g.target_date})` : '';
  const progress = g.target_amount > 0 ? ((g.current_amount / g.target_amount) * 100).toFixed(1) : '0';
  return `- ${g.name}: $${g.current_amount.toFixed(2)} / $${g.target_amount.toFixed(2)} (${progress}%)${targetDateStr} | Type: ${g.goal_type} | Status: ${g.status}${g.monthly_contribution > 0 ? ` | Monthly: $${g.monthly_contribution.toFixed(2)}` : ''}`;
}).join('\n') : 'No goals set'}

Loans (${context.loans.length} total):
${context.loans.length > 0 ? context.loans.map((l) => {
  const interestStr = l.interest_rate !== null ? `${l.interest_rate}%` : 'N/A';
  const paymentStr = l.minimum_payment !== null ? `$${l.minimum_payment.toFixed(2)}` : 'N/A';
  const dueDateStr = l.payment_due_date !== null ? `Due day: ${l.payment_due_date}` : '';
  return `- ${l.name}: Balance $${l.balance.toFixed(2)} | Interest: ${interestStr} | Min Payment: ${paymentStr}${dueDateStr ? ` | ${dueDateStr}` : ''}`;
}).join('\n') : 'No loans'}

Bank Accounts (${context.accounts.length} total):
${context.accounts.length > 0 ? context.accounts.map((a) => `- ${a.name}: $${a.balance.toFixed(2)}`).join('\n') : 'No accounts'}

${context.incomeBuffer ? `Income Buffer: $${context.incomeBuffer.current_balance.toFixed(2)} (Monthly allocation: $${context.incomeBuffer.monthly_amount.toFixed(2)})` : 'Income Buffer: Not configured'}

Income Settings:
${context.incomeSettings.annual_income !== null ? `- Annual Income: $${context.incomeSettings.annual_income.toFixed(2)}` : ''}
${context.incomeSettings.tax_rate !== null ? `- Tax Rate: ${(context.incomeSettings.tax_rate * 100).toFixed(2)}%` : ''}
${context.incomeSettings.pay_frequency ? `- Pay Frequency: ${context.incomeSettings.pay_frequency}` : ''}
${context.incomeSettings.include_extra_paychecks !== null ? `- Include Extra Paychecks: ${context.incomeSettings.include_extra_paychecks ? 'Yes' : 'No'}` : ''}
${context.incomeSettings.pre_tax_deduction_items && context.incomeSettings.pre_tax_deduction_items.length > 0 ? `- Pre-tax Deductions: ${context.incomeSettings.pre_tax_deduction_items.map((d: any) => `${d.name} (${d.type === 'percentage' ? `${d.value}%` : `$${d.value}`})`).join(', ')}` : ''}

${historyText ? `Recent Conversation:\n${historyText}\n` : ''}

User Query: "${query}"

IMPORTANT INSTRUCTIONS FOR ANALYSIS:
1. When analyzing transactions, ALWAYS use the actual transaction data provided above, not just category totals
2. For questions about specific merchants or merchant groups (like "fast food"), search through the transaction list for matching merchant names or merchant groups
3. Count transactions accurately by examining the transaction list
4. Calculate totals accurately by summing amounts from the relevant transactions
5. When asked about "last month" or date ranges, filter transactions by the date field
6. Merchant groups (shown in parentheses) help identify chains - use them to group similar merchants
7. Be precise with numbers - always reference the actual transaction data
8. If you find transactions matching the query, list specific examples with dates and amounts
9. If the query asks about a category total, verify it against both the category totals AND the sum of actual transactions in that category
10. CRITICAL: Before warning about "over budget" spending:
    - Check the category_type from the Categories list above
    - For ACCUMULATION categories: Spending more than monthly_amount is EXPECTED and NORMAL
    - Only warn if current_balance is negative (spending exceeds accumulated savings)
    - For MONTHLY EXPENSE categories: Spending more than monthly_amount may be a concern
11. When analyzing accumulation categories, remember they're designed for irregular spending - large expenses in some months are normal
12. Always consider category_type when providing budget advice or warnings

Guidelines:
- Be concise and actionable
- Reference specific data when relevant
- Provide exact numbers and counts from the transaction data
- Suggest concrete next steps
- Be encouraging and supportive
- Respect data privacy

Respond in a friendly, professional tone.`;

    try {
      const result = await this.proModel.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const responseTimeMs = Date.now() - startTime;
      const tokensUsed = response.usageMetadata?.totalTokenCount || 0;

      return {
        response: text.trim(),
        tokensUsed,
        responseTimeMs,
        metadata: {
          transactionCount: relevantTransactions.length,
          dateRange: filteredDateRange,
          categoriesSearched: Object.keys(categoryTotalsDetailed).length,
          merchantsSearched: new Set(relevantTransactions.map(t => t.merchantGroup || t.merchant)).size,
          goalsAccessed: context.goals.length,
          loansAccessed: context.loans.length,
          accountsAccessed: context.accounts.length,
          incomeBufferAccessed: context.incomeBuffer !== null,
          incomeSettingsAccessed: context.incomeSettings.annual_income !== null || context.incomeSettings.tax_rate !== null || context.incomeSettings.pay_frequency !== null,
        },
      };
    } catch (error: any) {
      console.error('Error handling chat:', error);
      
      // Check for quota/rate limit errors
      if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Quota exceeded')) {
        const retryAfter = error.message?.match(/retry in ([\d.]+)s/i)?.[1];
        throw new Error(
          `AI service quota exceeded. ${retryAfter ? `Please retry in ${Math.ceil(parseFloat(retryAfter))} seconds.` : 'Please try again later.'} ` +
          `If this persists, check your Google Gemini API key configuration in Google AI Studio.`
        );
      }
      
      throw new Error(`Failed to process chat query: ${error.message}`);
    }
  }
}

export const geminiService = new GeminiService();

