import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GEMINI_MODELS } from '@/lib/ai/constants';

/**
 * Parse markdown table format into JSON array
 */
function parseMarkdownTable(text: string): any[] {
  const lines = text.split('\n');
  const results: any[] = [];
  
  // Find the table header
  let headerLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('MerchantGroupId') && lines[i].includes('MerchantName')) {
      headerLineIndex = i;
      break;
    }
  }
  
  if (headerLineIndex === -1) return [];
  
  // Parse header
  const headerLine = lines[headerLineIndex];
  const headers = headerLine.split('|').map(h => h.trim()).filter(h => h && !h.match(/^:[-:]+$/));
  
  // Find data rows (skip separator line)
  for (let i = headerLineIndex + 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !line.startsWith('|')) continue;
    
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length < headers.length) continue;
    
    // Parse row data
    const row: any = {};
    headers.forEach((header, index) => {
      const value = cells[index]?.trim() || '';
      const headerKey = header.toLowerCase().replace(/\s+/g, '');
      
      // Map header names to our expected format
      if (headerKey.includes('merchantgroupid')) {
        row.merchantGroupId = parseInt(value) || null;
      } else if (headerKey.includes('merchantname')) {
        row.merchantName = value;
      } else if (headerKey.includes('isrecurring')) {
        row.isRecurring = value.toLowerCase() === 'true';
      } else if (headerKey.includes('frequency')) {
        row.frequency = value === 'null' || value === '' ? null : value;
      } else if (headerKey.includes('confidence')) {
        row.confidence = value;
      } else if (headerKey.includes('reason')) {
        row.reason = value;
      } else if (headerKey.includes('shoulddetect')) {
        row.shouldDetect = value.toLowerCase() === 'true';
      }
    });
    
    if (row.merchantGroupId && row.merchantName) {
      results.push(row);
    }
  }
  
  return results;
}

/**
 * POST /api/test/recurring-analysis/analyze
 * Use AI to analyze transactions and identify recurring patterns
 */
export async function POST(request: NextRequest) {
  try {
    const { transactions } = await request.json();

    if (!transactions || !Array.isArray(transactions)) {
      return NextResponse.json({ error: 'transactions array required' }, { status: 400 });
    }

    // Group transactions by merchant
    const merchantGroups = new Map<number, any[]>();
    transactions.forEach((tx: any) => {
      if (tx.merchant_group_id) {
        const groupId = tx.merchant_group_id;
        if (!merchantGroups.has(groupId)) {
          merchantGroups.set(groupId, []);
        }
        merchantGroups.get(groupId)!.push(tx);
      }
    });

    // Prepare data for AI analysis - group by merchant and summarize
    const merchantSummaries: any[] = [];
    for (const [merchantGroupId, txs] of merchantGroups.entries()) {
      if (txs.length < 3) continue; // Skip merchants with < 3 transactions

      const sortedTxs = txs.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      // Calculate intervals
      const intervals: number[] = [];
      for (let i = 1; i < sortedTxs.length; i++) {
        const prevDate = new Date(sortedTxs[i - 1].date);
        const currDate = new Date(sortedTxs[i].date);
        const daysDiff = Math.round((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        intervals.push(daysDiff);
      }

      const amounts = sortedTxs.map(t => Math.abs(t.total_amount));
      const minAmount = Math.min(...amounts);
      const maxAmount = Math.max(...amounts);
      const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

      const lastDate = new Date(sortedTxs[sortedTxs.length - 1].date);
      const today = new Date();
      const daysSinceLastTransaction = Math.round(
        (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      merchantSummaries.push({
        merchantGroupId,
        merchantName: sortedTxs[0].merchant_groups?.display_name || 'Unknown',
        transactionCount: sortedTxs.length,
        firstDate: sortedTxs[0].date,
        lastDate: sortedTxs[sortedTxs.length - 1].date,
        daysSinceLastTransaction, // Add this for activity checking
        dateSpanDays: Math.round(
          (new Date(sortedTxs[sortedTxs.length - 1].date).getTime() - 
           new Date(sortedTxs[0].date).getTime()) / (1000 * 60 * 60 * 24)
        ),
        avgInterval: intervals.length > 0 
          ? intervals.reduce((a, b) => a + b, 0) / intervals.length 
          : 0,
        minInterval: intervals.length > 0 ? Math.min(...intervals) : 0,
        maxInterval: intervals.length > 0 ? Math.max(...intervals) : 0,
        minAmount,
        maxAmount,
        avgAmount,
        amountVariance: amounts.length > 1
          ? amounts.reduce((sum, amt) => sum + Math.pow(amt - avgAmount, 2), 0) / amounts.length
          : 0,
        transactionType: sortedTxs[0].transaction_type,
        sampleDates: sortedTxs.slice(0, 10).map((t: any) => t.date),
        sampleAmounts: sortedTxs.slice(0, 10).map((t: any) => Math.abs(t.total_amount)),
      });
    }

    // Sort by transaction count (descending)
    merchantSummaries.sort((a, b) => b.transactionCount - a.transactionCount);

    // Use AI to analyze patterns
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured. Please set GOOGLE_GEMINI_API_KEY in your environment variables.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use Gemini 2.5 Pro for more accurate analysis
    const modelName = GEMINI_MODELS.pro;
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are analyzing financial transactions to identify which merchants represent CURRENTLY ACTIVE recurring transactions that users care about tracking.

CRITICAL: Only mark transactions as shouldDetect=true if they are:
1. CURRENTLY ACTIVE - The pattern must be recent and ongoing. Check the last occurrence date relative to today.
   - If the last transaction was more than 1.5x the expected interval ago, it's likely INACTIVE
   - Example: Monthly subscription with last transaction 60+ days ago = INACTIVE
   - Example: Monthly subscription with last transaction 25 days ago = ACTIVE
2. MEANINGFUL recurring transactions:
   - Bills/subscriptions (utilities, rent, insurance, streaming services, etc.)
   - Regular income (salary, rental income, etc.)
   - Regular expenses users want reminders for (gym membership, subscriptions, etc.)

EXCLUDE (shouldDetect=false):
- Interest accruals (savings account interest, credit card interest)
- Internal transfers
- One-time purchases that happen to repeat
- Transactions that are too irregular or have stopped
- INACTIVE subscriptions (no recent transactions relative to expected frequency)
- Patterns that appear to have ended (long gap since last occurrence)

For each merchant group, analyze:
1. Is this a meaningful recurring transaction type? (yes/no)
2. What is the likely frequency? (weekly/biweekly/monthly/quarterly/yearly/irregular)
3. Is it CURRENTLY ACTIVE? Check:
   - lastDate vs today
   - Expected interval based on frequency
   - If lastDate is more than 1.5x the interval ago, mark as INACTIVE
4. Confidence level (high/medium/low)
5. Reason for decision

Here are the merchant summaries with dates. Each summary includes:
- firstDate: First transaction date
- lastDate: Most recent transaction date  
- daysSinceLastTransaction: Days since the last transaction (use this to check if active)
- avgInterval: Average days between transactions
- transactionCount: Number of transactions

${JSON.stringify(merchantSummaries.slice(0, 50), null, 2)}

IMPORTANT ACTIVITY CHECK (use daysSinceLastTransaction field):
- For monthly patterns (avgInterval ~30): daysSinceLastTransaction should be <= 45 days
- For biweekly patterns (avgInterval ~14): daysSinceLastTransaction should be <= 21 days  
- For weekly patterns (avgInterval ~7): daysSinceLastTransaction should be <= 10 days
- For quarterly patterns (avgInterval ~90): daysSinceLastTransaction should be <= 135 days

If daysSinceLastTransaction exceeds 1.5x the avgInterval, the pattern is likely INACTIVE and shouldDetect should be false.

Return ONLY a JSON array (no markdown, no explanations) with this structure for each merchant:
[
  {
    "merchantGroupId": number,
    "merchantName": string,
    "isRecurring": boolean,
    "frequency": "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly" | "irregular" | null,
    "confidence": "high" | "medium" | "low",
    "reason": "brief explanation including activity status",
    "shouldDetect": boolean
  }
]

CRITICAL: Set shouldDetect=false if the pattern is inactive (no recent transactions) even if it was recurring in the past.

Return ONLY valid JSON, no markdown tables, no explanations, just the JSON array.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Try to extract JSON from the response
    let analysis: any[] = [];
    try {
      // First, try to find JSON array in the response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing the whole response as JSON
        analysis = JSON.parse(text);
      }
    } catch (parseError) {
      // If JSON parsing fails, try parsing markdown table format
      console.log('JSON parse failed, trying markdown table format...');
      analysis = parseMarkdownTable(text);
      
      if (analysis.length === 0) {
        console.error('Failed to parse AI response:', text);
        // Fallback: return the raw text and merchant summaries
        return NextResponse.json({
          error: 'Failed to parse AI response',
          rawResponse: text,
          merchantSummaries,
        });
      }
    }

    return NextResponse.json({
      analysis,
      merchantSummaries,
      totalMerchants: merchantSummaries.length,
      analyzedMerchants: analysis.length,
    });
  } catch (error: any) {
    console.error('Error analyzing transactions:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to analyze transactions' },
      { status: 500 }
    );
  }
}
