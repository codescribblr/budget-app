'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import type {
  Category,
  Account,
  CreditCard,
  Loan,
  NonCashAsset,
  PendingCheck,
  DashboardSummary,
} from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Info, Wallet, CreditCard as CreditCardIcon, FileText, Landmark, Target, Mail, ChevronUp, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import CategoryList from './CategoryList';
import AccountList from './AccountList';
import CreditCardList from './CreditCardList';
import LoanList from './LoanList';
import PendingCheckList from './PendingCheckList';
import AssetList from './AssetList';
import SummaryCards from './SummaryCards';
import GoalsWidget from './GoalsWidget';
import IncomeBufferCard from './IncomeBufferCard';
import { AIInsightsWidget } from '@/components/ai/AIInsightsWidget';
import { useAccountPermissions } from '@/hooks/use-account-permissions';
import { useFeature } from '@/contexts/FeatureContext';
import { useLocalStorage } from '@/hooks/use-local-storage';

// Helper function to calculate summary from local state
function calculateSummary(
  categories: Category[],
  accounts: Account[],
  creditCards: CreditCard[],
  pendingChecks: PendingCheck[],
  monthlyNetIncome: number
): DashboardSummary {
  // Calculate totals (only include accounts/credit cards with include_in_totals = true)
  const totalMonies = accounts
    .filter(acc => acc.include_in_totals === true)
    .reduce((sum, acc) => sum + Number(acc.balance), 0);

  // Filter categories for envelope display (exclude system categories and buffer)
  const envelopeCategories = categories.filter(cat => !cat.is_system && !cat.is_buffer);

  // For totals calculation, include buffer category but exclude other system categories
  // Buffer category is special: doesn't show in lists but DOES count in totals
  const categoriesTotalBalance = categories
    .filter(cat => !cat.is_system || cat.is_buffer)
    .reduce((sum, cat) => sum + Number(cat.current_balance), 0);

  const hasNegativeEnvelopes = categories
    .filter(cat => !cat.is_system || cat.is_buffer)
    .some(cat => Number(cat.current_balance) < 0);

  const totalCreditCardBalances = creditCards
    .filter(cc => cc.include_in_totals === true)
    .reduce((sum, cc) => sum + Number(cc.current_balance), 0);

  // Calculate pending checks total: expenses subtract, income adds
  // Income is positive (adds to available funds), expense is negative (subtracts from available funds)
  const totalPendingChecks = pendingChecks
    .reduce((sum, pc) => {
      const amount = Number(pc.amount);
      // Income adds to available funds (positive), expenses subtract (negative)
      return sum + (pc.type === 'income' ? amount : -amount);
    }, 0);

  // Add totalPendingChecks (income increases savings, expenses decrease savings)
  const currentSavings = totalMonies - categoriesTotalBalance - totalCreditCardBalances + totalPendingChecks;

  // Calculate total monthly budget (exclude buffer from budget totals)
  const totalMonthlyBudget = envelopeCategories
    .reduce((sum, cat) => sum + Number(cat.monthly_amount), 0);

  return {
    total_monies: totalMonies,
    total_envelopes: categoriesTotalBalance, // Includes buffer category balance
    total_credit_card_balances: totalCreditCardBalances,
    total_pending_checks: totalPendingChecks,
    current_savings: currentSavings,
    has_negative_envelopes: hasNegativeEnvelopes,
    monthly_net_income: monthlyNetIncome,
    total_monthly_budget: totalMonthlyBudget,
  };
}

export default function Dashboard() {
  const { isEditor, isLoading: permissionsLoading } = useAccountPermissions();
  const loansEnabled = useFeature('loans');
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [assets, setAssets] = useState<NonCashAsset[]>([]);
  const [pendingChecks, setPendingChecks] = useState<PendingCheck[]>([]);
  const [monthlyNetIncome, setMonthlyNetIncome] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [isPendingChecksOpen, setIsPendingChecksOpen] = useLocalStorage('dashboard-card-pending-checks', true);
  const [isAccountsOpen, setIsAccountsOpen] = useLocalStorage('dashboard-card-accounts', true);
  const [isCreditCardsOpen, setIsCreditCardsOpen] = useLocalStorage('dashboard-card-credit-cards', true);
  const [isLoansOpen, setIsLoansOpen] = useLocalStorage('dashboard-card-loans', true);
  const [isAssetsOpen, setIsAssetsOpen] = useLocalStorage('dashboard-card-assets', true);
  const [isCategoriesOpen, setIsCategoriesOpen] = useLocalStorage('dashboard-card-categories', true);
  const [bufferStatus, setBufferStatus] = useState<any>(null);
  const [showBufferNotice, setShowBufferNotice] = useState(false);

  // Calculate summary from local state
  const summary = useMemo(() => {
    return calculateSummary(categories, accounts, creditCards, pendingChecks, monthlyNetIncome);
  }, [categories, accounts, creditCards, pendingChecks, monthlyNetIncome]);

  // Track if fetch is in progress to prevent duplicate calls
  const fetchingRef = useRef(false);
  const hasMountedRef = useRef(false);

  // Initial data fetch
  const fetchData = async () => {
    // Prevent duplicate calls
    if (fetchingRef.current) {
      return;
    }
    fetchingRef.current = true;

    try {
      setLoading(true);
      const [categoriesRes, accountsRes, creditCardsRes, loansRes, assetsRes, pendingChecksRes, summaryRes, bufferRes] =
        await Promise.all([
          fetch('/api/categories'),
          fetch('/api/accounts'),
          fetch('/api/credit-cards'),
          fetch('/api/loans'),
          fetch('/api/non-cash-assets'),
          fetch('/api/pending-checks'),
          fetch('/api/dashboard'),
          fetch('/api/income-buffer/status'),
        ]);

      const [categoriesData, accountsData, creditCardsData, loansData, assetsData, pendingChecksData, summaryData, bufferData] =
        await Promise.all([
          categoriesRes.ok ? categoriesRes.json() : [],
          accountsRes.ok ? accountsRes.json() : [],
          creditCardsRes.ok ? creditCardsRes.json() : [],
          loansRes.ok ? loansRes.json() : [],
          assetsRes.ok ? assetsRes.json() : [],
          pendingChecksRes.ok ? pendingChecksRes.json() : [],
          summaryRes.ok ? summaryRes.json() : null,
          bufferRes.ok ? bufferRes.json() : null,
        ]);

      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      // Bank accounts API returns an array directly
      setAccounts(Array.isArray(accountsData) ? accountsData : []);
      setCreditCards(Array.isArray(creditCardsData) ? creditCardsData : []);
      // Handle 403 (premium required) by setting empty array
      setLoans(loansRes.status === 403 ? [] : (Array.isArray(loansData) ? loansData : []));
      setAssets(Array.isArray(assetsData) ? assetsData : []);
      setPendingChecks(Array.isArray(pendingChecksData) ? pendingChecksData : []);
      setMonthlyNetIncome(summaryData?.monthly_net_income || 0);
      setBufferStatus(bufferData);

      // Check if we should show buffer notice
      // Show on 1st of month if buffer has funds and categories haven't been funded yet
      const today = new Date().getDate();
      if (bufferData?.enabled && today === 1 && bufferData.balance > 0 && !bufferData.hasBeenFundedThisMonth) {
        setShowBufferNotice(true);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  // Granular update functions
  const updateCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const updateAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (response.ok) {
        const data = await response.json();
        setAccounts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const updateCreditCards = async () => {
    try {
      const response = await fetch('/api/credit-cards');
      if (response.ok) {
        const data = await response.json();
        setCreditCards(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching credit cards:', error);
    }
  };

  const updateLoans = async () => {
    try {
      const response = await fetch('/api/loans');
      if (response.ok) {
        const data = await response.json();
        setLoans(Array.isArray(data) ? data : []);
      } else if (response.status === 403) {
        setLoans([]);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  };

  const updatePendingChecks = async () => {
    try {
      const response = await fetch('/api/pending-checks');
      if (response.ok) {
        const data = await response.json();
        setPendingChecks(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching pending checks:', error);
    }
  };

  const updateAssets = async () => {
    try {
      const response = await fetch('/api/non-cash-assets');
      if (response.ok) {
        const data = await response.json();
        setAssets(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const updateSummary = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setMonthlyNetIncome(data?.monthly_net_income || 0);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  useEffect(() => {
    // Only fetch once on mount
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      fetchData();
    }
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Income Buffer Notice - Show on 1st of month if funds available */}
      {showBufferNotice && (
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-blue-900 dark:text-blue-100">
              You have {formatCurrency(bufferStatus?.balance || 0)} available in your Income Buffer.
              Ready to fund this month's categories?
            </span>
            <div className="flex gap-2">
              <Link href="/income-buffer">
                <Button size="sm" variant="default">
                  Fund from Buffer
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => setShowBufferNotice(false)}>
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {summary && <SummaryCards summary={summary} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[calc(100vh-400px)]">
        <Collapsible open={isCategoriesOpen} onOpenChange={setIsCategoriesOpen} className="lg:col-span-2">
          <Card className="flex flex-col relative">
            <CardHeader>
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Budget Categories (Envelopes)
                  </CardTitle>
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent className="flex-1 flex flex-col min-h-0">
              <CardContent className="flex-1 overflow-hidden pb-8">
                <CategoryList 
                  categories={categories} 
                  summary={summary} 
                  onUpdate={(updatedCategories) => setCategories(updatedCategories)}
                  onUpdateSummary={updateSummary}
                  disabled={!isEditor || permissionsLoading}
                />
              </CardContent>
              {isCategoriesOpen && (
                <button
                  onClick={() => setIsCategoriesOpen(false)}
                  className="absolute bottom-4 right-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
                  aria-label="Collapse card"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
              )}
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <div className="space-y-6">
          <AIInsightsWidget />

          <Collapsible open={isAccountsOpen} onOpenChange={setIsAccountsOpen}>
            <Card id="accounts-section" className="relative">
              <CardHeader>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Accounts
                    </CardTitle>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pb-8">
                  <AccountList 
                    accounts={accounts} 
                    onUpdate={(updatedAccounts) => setAccounts(updatedAccounts)}
                    onUpdateSummary={updateSummary}
                    disabled={!isEditor || permissionsLoading}
                  />
                </CardContent>
                {isAccountsOpen && (
                  <button
                    onClick={() => setIsAccountsOpen(false)}
                    className="absolute bottom-4 right-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
                    aria-label="Collapse card"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                )}
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={isCreditCardsOpen} onOpenChange={setIsCreditCardsOpen}>
            <Card id="credit-cards-section" className="relative">
              <CardHeader>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <CardTitle className="flex items-center gap-2">
                      <CreditCardIcon className="h-5 w-5" />
                      Credit Cards
                    </CardTitle>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pb-8">
                  <CreditCardList 
                    creditCards={creditCards} 
                    onUpdate={(updatedCreditCards) => setCreditCards(updatedCreditCards)}
                    onUpdateSummary={updateSummary}
                    disabled={!isEditor || permissionsLoading}
                  />
                </CardContent>
                {isCreditCardsOpen && (
                  <button
                    onClick={() => setIsCreditCardsOpen(false)}
                    className="absolute bottom-4 right-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
                    aria-label="Collapse card"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                )}
              </CollapsibleContent>
            </Card>
          </Collapsible>

          <Collapsible open={isPendingChecksOpen} onOpenChange={setIsPendingChecksOpen}>
            <Card className="relative">
              <CardHeader>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Pending Checks
                      <span className="text-sm font-normal text-muted-foreground">
                        ({pendingChecks.length})
                      </span>
                    </CardTitle>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pb-8">
                  <PendingCheckList 
                    pendingChecks={pendingChecks} 
                    onUpdate={(updatedPendingChecks) => setPendingChecks(updatedPendingChecks)}
                    onUpdateSummary={updateSummary}
                    disabled={!isEditor || permissionsLoading}
                  />
                </CardContent>
                {isPendingChecksOpen && (
                  <button
                    onClick={() => setIsPendingChecksOpen(false)}
                    className="absolute bottom-4 right-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
                    aria-label="Collapse card"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                )}
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {loansEnabled && (
            <Collapsible open={isLoansOpen} onOpenChange={setIsLoansOpen}>
              <Card id="loans-section" className="relative">
                <CardHeader>
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center gap-2 cursor-pointer">
                      <CardTitle className="flex items-center gap-2">
                        <Landmark className="h-5 w-5" />
                        Loans
                      </CardTitle>
                    </div>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="pb-8">
                    <LoanList 
                      loans={loans} 
                      onUpdate={(updatedLoans) => setLoans(updatedLoans)} 
                      disabled={!isEditor || permissionsLoading}
                    />
                  </CardContent>
                  {isLoansOpen && (
                    <button
                      onClick={() => setIsLoansOpen(false)}
                      className="absolute bottom-4 right-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
                      aria-label="Collapse card"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  )}
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          <Collapsible open={isAssetsOpen} onOpenChange={setIsAssetsOpen}>
            <Card id="assets-section" className="relative">
              <CardHeader>
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Non-Cash Assets
                    </CardTitle>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pb-8">
                  <AssetList 
                    assets={assets} 
                    onUpdate={(updatedAssets) => setAssets(updatedAssets)}
                    disabled={!isEditor || permissionsLoading}
                  />
                </CardContent>
                {isAssetsOpen && (
                  <button
                    onClick={() => setIsAssetsOpen(false)}
                    className="absolute bottom-4 right-4 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer"
                    aria-label="Collapse card"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                )}
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {bufferStatus?.enabled && <IncomeBufferCard />}

          <GoalsWidget disabled={!isEditor || permissionsLoading} />
        </div>
      </div>
    </div>
  );
}


