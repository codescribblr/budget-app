import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/test/recurring-analysis/export
 * Export analysis results and transaction dataset for test fixtures
 */
export async function POST(request: NextRequest) {
  try {
    const { transactions, analysis, merchantSummaries } = await request.json();

    if (!transactions || !analysis) {
      return NextResponse.json(
        { error: 'transactions and analysis are required' },
        { status: 400 }
      );
    }

    // Create export data structure
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        transactionCount: transactions.length,
        merchantCount: merchantSummaries?.length || 0,
        analysisCount: analysis.length,
      },
      transactions,
      analysis,
      merchantSummaries: merchantSummaries || [],
    };

    // Return as JSON download
    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="recurring-analysis-${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting analysis:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export analysis' },
      { status: 500 }
    );
  }
}
