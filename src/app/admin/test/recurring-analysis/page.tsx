'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AccountInfo {
  accountId: number;
  accountName: string;
  transactionCount: number;
  ownerId: string;
  allAccountCounts?: Array<{ accountId: number; count: number }>;
}

interface Transaction {
  id: number;
  date: string;
  total_amount: number;
  transaction_type: 'income' | 'expense';
  merchant_group_id: number | null;
  merchant_groups?: {
    display_name: string;
  };
}

interface MerchantSummary {
  merchantGroupId: number;
  merchantName: string;
  transactionCount: number;
  firstDate: string;
  lastDate: string;
  dateSpanDays: number;
  avgInterval: number;
  minInterval: number;
  maxInterval: number;
  minAmount: number;
  maxAmount: number;
  avgAmount: number;
  amountVariance: number;
  transactionType: 'income' | 'expense';
  sampleDates: string[];
  sampleAmounts: number[];
}

interface AnalysisResult {
  merchantGroupId: number;
  merchantName: string;
  isRecurring: boolean;
  frequency: string | null;
  confidence: string;
  reason: string;
  shouldDetect: boolean;
}

export default function RecurringAnalysisPage() {
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [merchantSummaries, setMerchantSummaries] = useState<MerchantSummary[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualMarkdown, setManualMarkdown] = useState('');

  const findAccount = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test/recurring-analysis/account');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to find account');
      }
      const data = await response.json();
      setAccountInfo(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    if (!accountInfo) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/test/recurring-analysis/transactions?accountId=${accountInfo.accountId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch transactions');
      }
      const data = await response.json();
      setTransactions(data.transactions);
      setMerchantSummaries(data.merchantSummaries || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeTransactions = async () => {
    if (transactions.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test/recurring-analysis/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze');
      }
      const data = await response.json();
      setMerchantSummaries(data.merchantSummaries || []);
      setAnalysis(data.analysis || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const shouldDetect = analysis.filter(a => a.shouldDetect);
  const shouldNotDetect = analysis.filter(a => !a.shouldDetect);

  const parseMarkdownTable = (text: string): AnalysisResult[] => {
    const lines = text.trim().split('\n');
    const results: AnalysisResult[] = [];
    
    // Find the table header
    let headerIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('|') && lines[i].toLowerCase().includes('merchant')) {
        headerIndex = i;
        break;
      }
    }
    
    if (headerIndex === -1) return results;
    
    // Parse header
    const headers = lines[headerIndex].split('|').map(h => h.trim()).filter(h => h);
    
    // Find merchantGroupId and shouldDetect column indices
    const merchantIdIdx = headers.findIndex(h => h.toLowerCase().includes('merchant') && h.toLowerCase().includes('id'));
    const shouldDetectIdx = headers.findIndex(h => h.toLowerCase().includes('should') || h.toLowerCase().includes('detect'));
    
    if (merchantIdIdx === -1 || shouldDetectIdx === -1) return results;
    
    // Parse data rows (skip header and separator)
    for (let i = headerIndex + 2; i < lines.length; i++) {
      const row = lines[i].split('|').map(c => c.trim()).filter(c => c);
      if (row.length <= Math.max(merchantIdIdx, shouldDetectIdx)) continue;
      
      const merchantGroupId = parseInt(row[merchantIdIdx]);
      const shouldDetect = row[shouldDetectIdx].toLowerCase().includes('true') || row[shouldDetectIdx].toLowerCase().includes('yes');
      
      if (!isNaN(merchantGroupId)) {
        results.push({
          merchantGroupId,
          merchantName: '',
          isRecurring: shouldDetect,
          frequency: null,
          confidence: 'high',
          reason: '',
          shouldDetect,
        });
      }
    }
    
    return results;
  };

  const handleManualInput = () => {
    const parsed = parseMarkdownTable(manualMarkdown);
    if (parsed.length > 0) {
      setAnalysis(parsed);
      setShowManualInput(false);
    } else {
      alert('Failed to parse markdown table. Please check the format.');
    }
  };

  const exportData = async () => {
    if (transactions.length === 0 || analysis.length === 0) {
      alert('Please fetch transactions and run analysis first');
      return;
    }
    
    setExporting(true);
    try {
      const response = await fetch('/api/test/recurring-analysis/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions, analysis, merchantSummaries }),
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recurring-analysis-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Recurring Transactions Analysis</h1>
        <p className="text-muted-foreground mt-2">
          Test and analyze the recurring transaction detection algorithm with real transaction data
        </p>
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Selection</CardTitle>
            <CardDescription>Find the account with the most transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {accountInfo ? (
              <div>
                <p><strong>Account:</strong> {accountInfo.accountName}</p>
                <p><strong>Transaction Count:</strong> {accountInfo.transactionCount}</p>
                {accountInfo.allAccountCounts && (
                  <div className="mt-2">
                    <p className="text-sm font-semibold">All Account Counts:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {accountInfo.allAccountCounts.map(ac => (
                        <li key={ac.accountId}>Account {ac.accountId}: {ac.count} transactions</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={findAccount} disabled={loading}>
                {loading ? 'Finding...' : 'Find Account'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Data</CardTitle>
            <CardDescription>Fetch transactions for analysis</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length > 0 ? (
              <div>
                <p><strong>Loaded:</strong> {transactions.length} transactions</p>
                <p><strong>Merchants:</strong> {merchantSummaries.length}</p>
              </div>
            ) : (
              <Button onClick={fetchTransactions} disabled={!accountInfo || loading}>
                {loading ? 'Fetching...' : 'Fetch Transactions'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>AI Analysis</CardTitle>
          <CardDescription>Analyze transactions to identify recurring patterns</CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.length > 0 ? (
            <div>
              <p><strong>Analyzed:</strong> {analysis.length} merchants</p>
              <p><strong>Should Detect:</strong> {shouldDetect.length}</p>
              <p><strong>Should Not Detect:</strong> {shouldNotDetect.length}</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Button onClick={analyzeTransactions} disabled={loading || transactions.length === 0}>
                {loading ? 'Analyzing...' : 'Analyze Transactions'}
              </Button>
              <div className="text-sm text-gray-600">OR</div>
              {!showManualInput ? (
                <Button 
                  variant="outline" 
                  onClick={() => setShowManualInput(true)}
                >
                  Paste Markdown Table Analysis
                </Button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    className="w-full h-64 p-2 border rounded font-mono text-sm"
                    placeholder="Paste the markdown table here..."
                    value={manualMarkdown}
                    onChange={(e) => setManualMarkdown(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleManualInput}>
                      Parse & Load
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowManualInput(false);
                        setManualMarkdown('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {analysis.length > 0 && transactions.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Export</CardTitle>
            <CardDescription>Export analysis results and transaction data</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportData} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export Analysis & Dataset'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
