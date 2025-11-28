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
   * Generate monthly insights
   */
  async generateInsights(
    userData: {
      transactions: Array<{
        merchant: string;
        amount: number;
        date: string;
        category: string;
      }>;
      budget: {
        total: number;
        spent: number;
        remaining: number;
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
      categoryBreakdown: Record<string, { budget: number; spent: number }>;
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

    const categoryBreakdown = Object.entries(userData.categoryBreakdown)
      .map(([cat, data]) => `- ${cat}: $${data.spent.toFixed(2)} (budget: $${data.budget.toFixed(2)})`)
      .join('\n');

    const prompt = `You are a personal financial advisor. Analyze this user's spending data and provide actionable insights.

Current Month Summary:
- Total spent: $${userData.budget.spent.toFixed(2)}
- Budget: $${userData.budget.total.toFixed(2)}
- Over/Under: $${(userData.budget.spent - userData.budget.total).toFixed(2)}

Top Categories:
${categoryBreakdown}

Previous Month Comparison:
- Total: $${userData.previousMonth.total.toFixed(2)}
- Category breakdown: ${JSON.stringify(userData.previousMonth.categoryBreakdown)}

Financial Goals:
${userData.goals.map((g) => `- ${g.name}: $${g.current_amount.toFixed(2)} / $${g.target_amount.toFixed(2)} (${g.status})`).join('\n')}

Provide 5-7 insights covering:
1. Overall spending health (vs budget)
2. Category-specific observations
3. Notable spending changes
4. Goal progress assessment
5. Actionable recommendations
6. Potential savings opportunities
7. Upcoming budget considerations

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
  }> {
    if (!API_KEY) {
      throw new Error('Google Gemini API key not configured');
    }

    const startTime = Date.now();

    const recentHistory = conversationHistory.slice(-5);
    const historyText = recentHistory
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    const prompt = `You are a helpful financial assistant for a budgeting app. You have access to the user's financial data.

User's Financial Context:
- Current Budget: $${context.currentBudget.total.toFixed(2)} (Spent: $${context.currentBudget.spent.toFixed(2)}, Remaining: $${context.currentBudget.remaining.toFixed(2)})
- Recent Transactions: ${context.recentTransactions.length} transactions
- Category Totals: ${JSON.stringify(context.categoryTotals)}
- Monthly Spending Trend: ${context.monthlySpending.join(', ')}
- Goals: ${context.goals.map((g) => `${g.name}: $${g.current_amount.toFixed(2)} / $${g.target_amount.toFixed(2)}`).join(', ')}
- Accounts: ${context.accounts.map((a) => `${a.name}: $${a.balance.toFixed(2)}`).join(', ')}

${historyText ? `Recent Conversation:\n${historyText}\n` : ''}

User Query: "${query}"

Guidelines:
- Be concise and actionable
- Reference specific data when relevant
- Provide numbers and percentages
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

