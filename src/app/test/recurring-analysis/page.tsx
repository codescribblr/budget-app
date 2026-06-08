'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [merchantSummaries, setMerchantSummaries] = useState<MerchantSummary[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualMarkdown, setManualMarkdown] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin status
  useEffect(() => {
    fetch('/api/admin/check')
      .then(res => res.json())
      .then(data => {
        if (!data.isAdmin) {
          router.push('/admin');
        } else {
          setIsAdmin(true);
        }
      })
      .catch(() => {
        router.push('/admin');
      });
  }, [router]);

  if (isAdmin === null) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  const findAccount = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/test/recurring-analysis/account');
      if (!response.ok) throw new Error('Failed to find account');
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
      const response = await fetch(
        `/api/test/recurring-analysis/transactions?accountId=${accountInfo.accountId}`
      );
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      setTransactions(data.transactions);
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
    const lines = text.split('\n');
    const results: AnalysisResult[] = [];
    
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
          row.frequency = value === 'null' || value === '' || value === 'irregular' ? null : value;
        } else if (headerKey.includes('confidence')) {
          row.confidence = value;
        } else if (headerKey.includes('reason')) {
          row.reason = value;
        } else if (headerKey.includes('shoulddetect')) {
          row.shouldDetect = value.toLowerCase() === 'true';
        }
      });
      
      if (row.merchantGroupId && row.merchantName) {
        results.push(row as AnalysisResult);
      }
    }
    
    return results;
  };

  const handleManualInput = () => {
    if (!manualMarkdown.trim()) {
      alert('Please paste the markdown table');
      return;
    }
    
    const parsed = parseMarkdownTable(manualMarkdown);
    if (parsed.length === 0) {
      alert('Failed to parse markdown table. Please check the format.');
      return;
    }
    
    setAnalysis(parsed);
    setShowManualInput(false);
    setManualMarkdown('');
  };

  const exportAnalysis = async () => {
    if (transactions.length === 0 || analysis.length === 0) {
      alert('Please fetch transactions and run analysis first');
      return;
    }

    setExporting(true);
    try {
      const response = await fetch('/api/test/recurring-analysis/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions,
          analysis,
          merchantSummaries,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to export');
      }

      const data = await response.json();
      
      // Download as JSON file
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
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">Recurring Transaction Analysis</h1>

      <div className="space-y-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Find Account</CardTitle>
            <CardDescription>Find the account with the most transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {accountInfo ? (
              <div>
                <p><strong>Account:</strong> {accountInfo.accountName}</p>
                <p><strong>Transaction Count:</strong> {accountInfo.transactionCount}</p>
                <p><strong>Account ID:</strong> {accountInfo.accountId}</p>
                {accountInfo.allAccountCounts && accountInfo.allAccountCounts.length > 1 && (
                  <div className="mt-4">
                    <p className="font-semibold">All Account Counts:</p>
                    <ul className="list-disc list-inside text-sm">
                      {accountInfo.allAccountCounts.map(ac => (
                        <li key={ac.accountId}>
                          Account {ac.accountId}: {ac.count} transactions
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <Button onClick={findAccount} disabled={loading}>
                {loading ? 'Finding...' : 'Find Account with Most Transactions'}
              </Button>
            )}
          </CardContent>
        </Card>

        {accountInfo && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Fetch Transactions</CardTitle>
              <CardDescription>Load all transactions for analysis</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div>
                  <p><strong>Loaded:</strong> {transactions.length} transactions</p>
                </div>
              ) : (
                <Button onClick={fetchTransactions} disabled={loading}>
                  {loading ? 'Loading...' : 'Fetch Transactions'}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {transactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Analyze with AI</CardTitle>
              <CardDescription>Use AI to identify recurring patterns</CardDescription>
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
                  <Button onClick={analyzeTransactions} disabled={loading}>
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
        )}
      </div>

      {error && (
        <Card className="border-red-500">
          <CardContent className="pt-6">
            <p className="text-red-500">Error: {error}</p>
          </CardContent>
        </Card>
      )}

      {analysis.length > 0 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Analysis</CardTitle>
              <CardDescription>Export analysis results and transaction dataset for test fixtures</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={exportAnalysis} disabled={exporting || transactions.length === 0 || analysis.length === 0}>
                {exporting ? 'Exporting...' : 'Export Analysis & Dataset'}
              </Button>
              <p className="text-sm text-gray-600 mt-2">
                This will download a JSON file containing the analysis results and all transactions used for testing.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Should Detect ({shouldDetect.length})</CardTitle>
              <CardDescription>Merchants that should be detected as recurring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shouldDetect.map((item) => {
                  const summary = merchantSummaries.find(
                    m => m.merchantGroupId === item.merchantGroupId
                  );
                  return (
                    <div key={item.merchantGroupId} className="border p-4 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{item.merchantName}</h3>
                          <p className="text-sm text-gray-600">
                            Frequency: {item.frequency || 'unknown'} | 
                            Confidence: {item.confidence} | 
                            Count: {summary?.transactionCount || 0}
                          </p>
                          <p className="text-sm mt-1">{item.reason}</p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          SHOULD DETECT
                        </span>
                      </div>
                      {summary && (
                        <div className="mt-2 text-xs text-gray-500">
                          <p>Avg Interval: {summary.avgInterval.toFixed(1)} days | 
                             Amount Range: ${summary.minAmount.toFixed(2)} - ${summary.maxAmount.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Should NOT Detect ({shouldNotDetect.length})</CardTitle>
              <CardDescription>Merchants that should NOT be detected as recurring</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {shouldNotDetect.map((item) => {
                  const summary = merchantSummaries.find(
                    m => m.merchantGroupId === item.merchantGroupId
                  );
                  return (
                    <div key={item.merchantGroupId} className="border p-4 rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{item.merchantName}</h3>
                          <p className="text-sm text-gray-600">
                            Frequency: {item.frequency || 'unknown'} | 
                            Confidence: {item.confidence} | 
                            Count: {summary?.transactionCount || 0}
                          </p>
                          <p className="text-sm mt-1">{item.reason}</p>
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                          SHOULD NOT DETECT
                        </span>
                      </div>
                      {summary && (
                        <div className="mt-2 text-xs text-gray-500">
                          <p>Avg Interval: {summary.avgInterval.toFixed(1)} days | 
                             Amount Range: ${summary.minAmount.toFixed(2)} - ${summary.maxAmount.toFixed(2)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
