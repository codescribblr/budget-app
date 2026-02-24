'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatCurrencyAbbreviated } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, ReferenceLine, ComposedChart, Scatter } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Info, Palmtree } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { HelpPanel, HelpSection } from '@/components/ui/help-panel';
import { toast } from 'sonner';
import type { Account, NonCashAsset, Loan, CreditCard, Category, IncomeStream } from '@/lib/types';
import { calculateAggregateMonthlyNetIncome } from '@/lib/income-calculations';
import RetirementMarker from './RetirementMarker';

interface NetWorthSnapshot {
  id: number;
  budget_account_id: number;
  snapshot_date: string;
  total_accounts: number;
  total_credit_cards: number;
  total_loans: number;
  total_assets: number;
  net_worth: number;
  metadata?: any;
  created_at: string;
}

interface ForecastDataPoint {
  date: string;
  year: number;
  month?: number;
  historical: number | null;
  forecast: number | null;
  accounts: number;
  assets: number;
  liquidAssets: number; // Total value of liquid assets
  creditCards: number;
  loans: number;
  netWorth: number;
  availableCash: number;
  distributionAmount: number; // Annual distribution taken this year
  rmdAmount: number; // Required Minimum Distribution amount this year
  distributionStartYear: number | null; // Year when distributions started
  cashRunsOutYear: number | null; // Year when cash first goes to zero or negative
  rmdStartYear: number | null; // Year when RMDs become required
  estimatedIncome: number; // Estimated annual income for this year
  estimatedExpenses: number; // Estimated annual expenses for this year
  loanPayoffs: Array<{ loanId: number; loanName: string; paymentAmount: number }>; // Loans paid off this year
}

interface TimelineEvent {
  id: string;
  type: 'liquidation' | 'windfall' | 'expense_change';
  year: number;
  assetId?: number; // For liquidation events
  amount?: number; // For windfall and expense_change events
  description?: string;
}

export default function ForecastPage() {
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<NonCashAsset[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [incomeStreams, setIncomeStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [showBirthYearDialog, setShowBirthYearDialog] = useState(false);
  const [tempBirthYear, setTempBirthYear] = useState('');
  const [savingBirthYear, setSavingBirthYear] = useState(false);
  
  // Forecast parameters (loaded from saved settings)
  const [forecastAge, setForecastAge] = useState(90); // Default to age 90
  const [incomeGrowthRate, setIncomeGrowthRate] = useState(3); // Default 3% annual
  const [savingsRate, setSavingsRate] = useState(20); // Default 20% of net income
  const [retirementSavingsRate, setRetirementSavingsRate] = useState(0); // Default 0% savings rate after retirement
  const [retirementAge, setRetirementAge] = useState(67); // Default retirement age
  const [socialSecurityStartAge, setSocialSecurityStartAge] = useState(67); // Default Social Security start age
  const [socialSecurityBenefitLevel, setSocialSecurityBenefitLevel] = useState<'full' | 'half' | 'none'>('full');
  const [otherRetirementIncome, setOtherRetirementIncome] = useState(0); // Annual amount
  const [inflationRate, setInflationRate] = useState(4); // Default 4% annual inflation
  const [rmdAge, setRmdAge] = useState(73); // Required Minimum Distribution age (default 73 as of 2023)
  const [forecastSettingsLoaded, setForecastSettingsLoaded] = useState(false);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedYearForEvent, setSelectedYearForEvent] = useState<number | null>(null);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  
  // Calculate forecast years based on current age and desired forecast age
  const forecastYears = useMemo(() => {
    if (!birthYear) return 10; // Fallback if no birth year
    const currentYear = new Date().getFullYear();
    const currentAge = currentYear - birthYear;
    const yearsUntilForecastAge = forecastAge - currentAge;
    return Math.max(1, Math.min(yearsUntilForecastAge, 50)); // Clamp between 1 and 50 years
  }, [birthYear, forecastAge]);

  useEffect(() => {
    fetchProfileAndData();
  }, []);

  // Save forecast settings when parameters change
  const saveForecastSettings = useCallback(async (updates: Partial<{
    forecast_age: number;
    income_growth_rate: number;
    savings_rate: number;
    retirement_savings_rate: number;
    retirement_age: number;
    social_security_start_age?: number;
    social_security_benefit_level: 'full' | 'half' | 'none';
    other_retirement_income: number;
    inflation_rate: number;
    timeline_events?: TimelineEvent[];
  }>) => {
    try {
      const response = await fetch('/api/forecast/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updates }),
      });

      if (!response.ok) {
        console.error('Failed to save forecast settings');
        const errorData = await response.json().catch(() => ({}));
        console.error('Error details:', errorData);
      }
    } catch (error) {
      console.error('Error saving forecast settings:', error);
    }
  }, []);

  // Save forecast settings when they change (debounced)
  useEffect(() => {
    if (!forecastSettingsLoaded) return; // Don't save until initial load is complete
    
    const timeoutId = setTimeout(() => {
      saveForecastSettings({
        forecast_age: forecastAge,
        income_growth_rate: incomeGrowthRate,
        savings_rate: savingsRate,
        retirement_savings_rate: retirementSavingsRate,
        retirement_age: retirementAge,
        social_security_start_age: socialSecurityStartAge,
        social_security_benefit_level: socialSecurityBenefitLevel,
        other_retirement_income: otherRetirementIncome,
        inflation_rate: inflationRate,
        timeline_events: timelineEvents,
      });
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [forecastAge, incomeGrowthRate, savingsRate, retirementSavingsRate, retirementAge, socialSecurityStartAge, socialSecurityBenefitLevel, otherRetirementIncome, inflationRate, timelineEvents, forecastSettingsLoaded, saveForecastSettings]);

  const fetchProfileAndData = async () => {
    try {
      setLoading(true);
      
      // First, fetch user profile to check for birth year
      const profileRes = await fetch('/api/user/profile');
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setBirthYear(profileData.birth_year);
        
        // If no birth year, show dialog
        if (!profileData.birth_year) {
          setShowBirthYearDialog(true);
          setLoading(false);
          return; // Don't load forecast data until birth year is set
        }
      }
      
      // Fetch all data in parallel
      const [snapshotsRes, accountsRes, assetsRes, loansRes, creditCardsRes, categoriesRes, settingsRes, incomeStreamsRes] = await Promise.all([
        fetch('/api/net-worth-snapshots'),
        fetch('/api/accounts'),
        fetch('/api/non-cash-assets'),
        fetch('/api/loans'),
        fetch('/api/credit-cards'),
        fetch('/api/categories'),
        fetch('/api/settings'),
        fetch('/api/income-streams'),
      ]);

      if (snapshotsRes.ok) {
        const snapshotsData = await snapshotsRes.json();
        setSnapshots(snapshotsData);
      }

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json();
        setAccounts(accountsData);
      }

      if (assetsRes.ok) {
        const assetsData = await assetsRes.json();
        setAssets(assetsData);
      }

      if (loansRes.ok) {
        const loansData = await loansRes.ok ? await loansRes.json() : [];
        setLoans(loansData);
      }

      if (creditCardsRes.ok) {
        const creditCardsData = await creditCardsRes.json();
        setCreditCards(creditCardsData);
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      if (incomeStreamsRes.ok) {
        const streamsData = await incomeStreamsRes.json();
        setIncomeStreams(Array.isArray(streamsData) ? streamsData : []);
      }

      // Fetch forecast settings
      const forecastSettingsRes = await fetch('/api/forecast/settings');
      if (forecastSettingsRes.ok) {
        const forecastSettingsData = await forecastSettingsRes.json();
        if (forecastSettingsData.forecast_age) {
          setForecastAge(forecastSettingsData.forecast_age);
        }
        if (forecastSettingsData.income_growth_rate !== undefined) {
          setIncomeGrowthRate(forecastSettingsData.income_growth_rate);
        }
        if (forecastSettingsData.savings_rate !== undefined) {
          setSavingsRate(forecastSettingsData.savings_rate);
        }
        if (forecastSettingsData.retirement_savings_rate !== undefined) {
          setRetirementSavingsRate(forecastSettingsData.retirement_savings_rate);
        }
        if (forecastSettingsData.retirement_age !== undefined) {
          setRetirementAge(forecastSettingsData.retirement_age);
        }
        if (forecastSettingsData.social_security_start_age !== undefined) {
          setSocialSecurityStartAge(forecastSettingsData.social_security_start_age);
        }
        if (forecastSettingsData.social_security_benefit_level) {
          setSocialSecurityBenefitLevel(forecastSettingsData.social_security_benefit_level);
        }
        if (forecastSettingsData.other_retirement_income !== undefined) {
          setOtherRetirementIncome(forecastSettingsData.other_retirement_income);
        }
        if (forecastSettingsData.inflation_rate !== undefined) {
          setInflationRate(forecastSettingsData.inflation_rate);
        }
        if (forecastSettingsData.rmd_age !== undefined) {
          setRmdAge(forecastSettingsData.rmd_age);
        }
        if (forecastSettingsData.timeline_events) {
          setTimelineEvents(forecastSettingsData.timeline_events);
        }
        setForecastSettingsLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching forecast data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBirthYear = async () => {
    const year = parseInt(tempBirthYear);
    const currentYear = new Date().getFullYear();
    
    if (!year || year < 1900 || year > currentYear) {
      toast.error(`Please enter a valid birth year between 1900 and ${currentYear}`);
      return;
    }

    try {
      setSavingBirthYear(true);
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birth_year: year }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save birth year');
      }

      setBirthYear(year);
      setShowBirthYearDialog(false);
      setTempBirthYear('');
      
      // Now fetch the forecast data
      await fetchProfileAndData();
      
      toast.success('Birth year saved successfully');
    } catch (error: any) {
      console.error('Error saving birth year:', error);
      toast.error(error.message || 'Failed to save birth year');
    } finally {
      setSavingBirthYear(false);
    }
  };

  // Calculate Required Minimum Distribution (RMD) based on IRS Uniform Lifetime Table
  // Simplified calculation: RMD = Account balance / Life expectancy factor
  const calculateRMD = useCallback((assetValue: number, age: number): number => {
    if (age < rmdAge) return 0; // RMDs don't start until RMD age
    
    // IRS Uniform Lifetime Table factors (simplified approximation)
    // More accurate would use full table, but this is close enough for forecasting
    // Factor decreases as age increases
    let factor: number;
    if (age < 75) {
      factor = 115 - age; // Rough approximation
    } else if (age < 80) {
      factor = 110 - age;
    } else if (age < 85) {
      factor = 105 - age;
    } else if (age < 90) {
      factor = 100 - age;
    } else {
      factor = 95 - age; // For ages 90+
    }
    
    // Ensure factor is at least 1
    factor = Math.max(1, factor);
    
    return assetValue / factor;
  }, [rmdAge]);

  // Calculate current net worth
  const currentNetWorth = useMemo(() => {
    const totalAccounts = accounts
      .filter(acc => acc.include_in_totals === true)
      .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);

    const totalCreditCards = creditCards
      .reduce((sum, cc) => sum + Number(cc.current_balance || 0), 0);

    const totalLoans = loans
      .filter(loan => loan.include_in_net_worth === true)
      .reduce((sum, loan) => sum + Number(loan.balance || 0), 0);

    const totalAssets = assets
      .reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);

    return totalAccounts + totalAssets - totalCreditCards - totalLoans;
  }, [accounts, assets, creditCards, loans]);

  // Aggregate annual income from income streams (for Social Security calc)
  const aggregateAnnualIncome = useMemo(() => {
    if (incomeStreams?.length > 0) {
      return incomeStreams
        .filter((s: IncomeStream) => s.include_in_budget)
        .reduce((sum: number, s: IncomeStream) => sum + (s.annual_income || 0), 0);
    }
    return parseFloat(settings.annual_income || settings.annual_salary || '0') || 0;
  }, [incomeStreams, settings.annual_income, settings.annual_salary]);

  // Calculate social security benefit amount
  // Calculate base Social Security benefit (at full retirement age of 67)
  const calculateBaseSocialSecurityBenefit = useMemo(() => {
    if (!aggregateAnnualIncome) return 0;
    
    const annualIncome = aggregateAnnualIncome;
    
    // Simplified Social Security calculation:
    // Social Security typically replaces about 40% of pre-retirement income for average earners
    // For 2024, maximum benefit is around $4,873/month ($58,476/year)
    // We'll use a progressive calculation: lower income = higher replacement rate
    
    let annualBenefit = 0;
    const maxAnnualBenefit = 58476; // 2024 maximum
    
    if (annualIncome <= 50000) {
      // Lower income: ~50% replacement
      annualBenefit = annualIncome * 0.5;
    } else if (annualIncome <= 100000) {
      // Middle income: ~40% replacement
      annualBenefit = annualIncome * 0.4;
    } else if (annualIncome <= 160000) {
      // Higher income: ~30% replacement
      annualBenefit = annualIncome * 0.3;
    } else {
      // Very high income: capped at maximum benefit
      annualBenefit = maxAnnualBenefit;
    }
    
    // Apply benefit level multiplier (full/half/none)
    const multiplier = socialSecurityBenefitLevel === 'full' ? 1 : 
                      socialSecurityBenefitLevel === 'half' ? 0.5 : 0;
    
    return annualBenefit * multiplier;
  }, [aggregateAnnualIncome, socialSecurityBenefitLevel]);

  // Calculate actual Social Security benefit based on start age
  // Early retirement (before 67): reduce by ~6.67% per year early (max 30% reduction at 62)
  // Full retirement (67): 100% benefit
  // Delayed retirement (after 67): increase by ~8% per year delayed (max ~24% increase at 70)
  const calculateSocialSecurityBenefit = useMemo(() => {
    const baseBenefit = calculateBaseSocialSecurityBenefit;
    if (baseBenefit === 0) return 0;
    
    const fullRetirementAge = 67;
    const earlyRetirementAge = 62;
    const maxDelayedAge = 70;
    
    if (socialSecurityStartAge < fullRetirementAge) {
      // Early retirement: reduce by 6.67% per year early
      const yearsEarly = fullRetirementAge - socialSecurityStartAge;
      const maxReduction = 0.30; // 30% max reduction
      const reductionPerYear = 0.0667; // ~6.67% per year
      const reduction = Math.min(yearsEarly * reductionPerYear, maxReduction);
      return baseBenefit * (1 - reduction);
    } else if (socialSecurityStartAge > fullRetirementAge) {
      // Delayed retirement: increase by 8% per year delayed
      const yearsDelayed = socialSecurityStartAge - fullRetirementAge;
      const maxIncrease = 0.24; // 24% max increase
      const increasePerYear = 0.08; // 8% per year
      const increase = Math.min(yearsDelayed * increasePerYear, maxIncrease);
      return baseBenefit * (1 + increase);
    } else {
      // Full retirement age: 100% benefit
      return baseBenefit;
    }
  }, [calculateBaseSocialSecurityBenefit, socialSecurityStartAge]);

  // Calculate current monthly budget total from categories
  const monthlyBudget = useMemo(() => {
    // Sum monthly_amount from all non-system, non-buffer categories
    return categories
      .filter(cat => !cat.is_system && !cat.is_buffer)
      .reduce((sum, cat) => sum + Number(cat.monthly_amount || 0), 0);
  }, [categories]);

  // Calculate monthly net income from income streams or legacy settings
  const monthlyNetIncome = useMemo(() => {
    if (incomeStreams?.length > 0) {
      return calculateAggregateMonthlyNetIncome(incomeStreams);
    }
    // Legacy: from settings
    const annualIncome = parseFloat(settings.annual_income || settings.annual_salary || '0');
    const taxRate = parseFloat(settings.tax_rate || '0');
    if (!annualIncome) return 0;
    const monthlyGross = annualIncome / 12;
    const monthlyTaxes = (annualIncome * taxRate) / 12;
    let preTaxDeductions = 0;
    if (settings.pre_tax_deduction_items) {
      try {
        const items = JSON.parse(settings.pre_tax_deduction_items);
        const payFrequency = settings.pay_frequency || 'monthly';
        const includeExtra = settings.include_extra_paychecks === 'true';
        let paychecksPerMonth = 1;
        switch (payFrequency) {
          case 'weekly': paychecksPerMonth = 52 / 12; break;
          case 'bi-weekly': paychecksPerMonth = includeExtra ? 26 / 12 : 24 / 12; break;
          case 'semi-monthly': paychecksPerMonth = 2; break;
          case 'monthly': paychecksPerMonth = 1; break;
        }
        items.forEach((item: any) => {
          if (item.type === 'percentage') {
            preTaxDeductions += (annualIncome * item.value / 100) / 12;
          } else {
            preTaxDeductions += item.value * paychecksPerMonth;
          }
        });
      } catch (e) { /* ignore */ }
    }
    return monthlyGross - preTaxDeductions - monthlyTaxes;
  }, [incomeStreams, settings]);

  // Calculate loan payment schedule
  const calculateLoanPaydown = (loan: Loan, years: number): number[] => {
    const schedule: number[] = [];
    let balance = loan.balance;
    const monthlyPayment = loan.minimum_payment || 0;
    const annualRate = (loan.interest_rate || 0) / 100;
    const monthlyRate = annualRate / 12;

    for (let year = 0; year < years; year++) {
      let yearEndBalance = balance;
      
      // Calculate monthly payments for the year
      for (let month = 0; month < 12; month++) {
        if (yearEndBalance <= 0) break;
        
        // Interest for the month
        const interest = yearEndBalance * monthlyRate;
        // Principal payment
        const principal = Math.min(monthlyPayment - interest, yearEndBalance);
        yearEndBalance -= principal;
      }
      
      schedule.push(Math.max(0, yearEndBalance));
      balance = yearEndBalance;
    }
    
    return schedule;
  };

  // Generate forecast data
  const forecastData = useMemo(() => {
    const data: ForecastDataPoint[] = [];
    const today = new Date();
    const startYear = today.getFullYear(); // Start with current year
    
    // Historical data removed - chart only shows forecast data

    // Calculate current values
    const currentAccounts = accounts
      .filter(acc => acc.include_in_totals === true)
      .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    
    const currentAssets = assets.reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);
    const currentCreditCards = creditCards.reduce((sum, cc) => sum + Number(cc.current_balance || 0), 0);
    const currentLoans = loans
      .filter(loan => loan.include_in_net_worth === true)
      .reduce((sum, loan) => sum + Number(loan.balance || 0), 0);

    // Calculate loan paydown schedules and track maturity dates
    const loanSchedules = loans
      .filter(loan => loan.include_in_net_worth === true)
      .map(loan => ({
        loan,
        schedule: calculateLoanPaydown(loan, forecastYears),
        maturityYear: loan.maturity_date ? new Date(loan.maturity_date).getFullYear() : null,
      }));
    
    // Track which loans are paid off each year (for expense reduction)
    const loansPaidOffByYear = new Map<number, Array<{ loanId: number; loanName: string; paymentAmount: number }>>();
    loanSchedules.forEach(({ loan, maturityYear }) => {
      if (maturityYear && maturityYear >= startYear && maturityYear <= startYear + forecastYears) {
        const annualPayment = (loan.minimum_payment || 0) * 12;
        if (!loansPaidOffByYear.has(maturityYear)) {
          loansPaidOffByYear.set(maturityYear, []);
        }
        loansPaidOffByYear.get(maturityYear)!.push({
          loanId: loan.id,
          loanName: loan.name,
          paymentAmount: annualPayment,
        });
      }
    });


    // Calculate retirement year
    const retirementYear = birthYear ? birthYear + retirementAge : null;
    const currentAge = birthYear ? startYear - birthYear : null;
    const isRetired = retirementYear ? startYear >= retirementYear : false;

    // Forecast future years
    let forecastAccounts = currentAccounts;
    // Track asset values per asset (for proper growth accounting)
    // Track all assets with their properties
    let assetValues = assets.map(asset => ({
      id: asset.id,
      value: asset.current_value || 0,
      returnRate: (asset.estimated_return_percentage || 0) / 100,
      isLiquid: asset.is_liquid !== false, // Default to true if not set
      isRmdQualified: asset.is_rmd_qualified || false,
    }));
    
    let forecastAssets = currentAssets;
    let forecastCreditCards = currentCreditCards;
    let forecastLoans = currentLoans;
    let forecastIncome = monthlyNetIncome * 12;
    const savingsRateDecimal = savingsRate / 100;
    const retirementSavingsRateDecimal = retirementSavingsRate / 100;
    const incomeGrowthDecimal = incomeGrowthRate / 100;
    const inflationDecimal = inflationRate / 100;
    
    // Calculate retirement income (SS + other)
    // Social Security starts at socialSecurityStartAge, not retirement age
    // Social Security doesn't grow after starting, but other retirement income can grow
    const annualSocialSecurity = calculateSocialSecurityBenefit;
    let otherRetirementIncomeValue = otherRetirementIncome;
    
    // Calculate Social Security start year
    const socialSecurityStartYear = birthYear ? birthYear + socialSecurityStartAge : null;
    
    // Calculate current annual living expenses (monthly budget * 12)
    const currentAnnualExpenses = monthlyBudget * 12;
    let annualExpenses = currentAnnualExpenses; // Will be adjusted for inflation each year
    
    // Distribution tracking
    let distributionStartYear: number | null = null;
    let cashRunsOutYear: number | null = null; // Track when cash first goes to zero or negative
    let rmdStartYear: number | null = null; // Track when RMDs become required
    let yearsSinceDistributionStart = 0;
    const rmdYear = birthYear ? birthYear + rmdAge : null;
    // Minimum age to take distributions from RMD accounts without penalty (59.5)
    const minDistributionAge = 59.5;
    const minDistributionYear = birthYear ? birthYear + minDistributionAge : null;

    // Track base expenses for expense_change events
    let baseAnnualExpenses = currentAnnualExpenses;
    let expenseChangeYear = 0; // Track when expenses last changed
    
    for (let yearOffset = 0; yearOffset < forecastYears; yearOffset++) {
      const forecastYear = startYear + yearOffset;
      const forecastDate = new Date(forecastYear, 0, 1);
      const yearAge = birthYear ? forecastYear - birthYear : null;
      const isYearRetired = retirementYear ? forecastYear >= retirementYear : false;
      
      // For yearOffset = 0 (current year), show current values without applying changes
      const isCurrentYear = yearOffset === 0;
      
      // Process timeline events for this year
      const eventsThisYear = timelineEvents.filter(e => e.year === forecastYear);
      for (const event of eventsThisYear) {
        if (event.type === 'liquidation' && event.assetId) {
          // Convert illiquid asset to liquid
          const assetIndex = assetValues.findIndex(a => a.id === event.assetId);
          if (assetIndex !== -1 && !assetValues[assetIndex].isLiquid) {
            assetValues[assetIndex] = {
              ...assetValues[assetIndex],
              isLiquid: true,
            };
          }
        } else if (event.type === 'windfall' && event.amount) {
          // Add windfall to available cash (liquid assets)
          forecastAccounts += event.amount;
        } else if (event.type === 'expense_change' && event.amount !== undefined) {
          // Update base expenses from this year forward
          baseAnnualExpenses = event.amount;
          expenseChangeYear = yearOffset;
        }
      }
      
      // Apply inflation to annual expenses
      // If expenses changed this year, calculate from the new base (yearOffset - expenseChangeYear)
      // If no change yet, expenseChangeYear is 0, so yearsSinceExpenseChange = yearOffset
      // For current year (yearOffset = 0), use base expenses without inflation
      const yearsSinceExpenseChange = expenseChangeYear > 0 ? yearOffset - expenseChangeYear : yearOffset;
      annualExpenses = isCurrentYear 
        ? baseAnnualExpenses 
        : baseAnnualExpenses * Math.pow(1 + inflationDecimal, yearsSinceExpenseChange);
      
      // Track loans paid off this year and remove their payments from expenses
      const loansPaidOffThisYear = loansPaidOffByYear.get(forecastYear) || [];
      let totalLoanPaymentsRemoved = 0;
      loansPaidOffThisYear.forEach(({ paymentAmount }) => {
        totalLoanPaymentsRemoved += paymentAmount;
      });
      // Remove loan payments from expenses after payoff (payments stop after maturity)
      annualExpenses -= totalLoanPaymentsRemoved;
      
      // Determine income for this year
      const isSocialSecurityStarted = socialSecurityStartYear ? forecastYear >= socialSecurityStartYear : false;
      
      if (isYearRetired) {
        // After retirement: work income stops, retirement income begins
        // Social Security only starts at socialSecurityStartAge (not retirement age)
        let annualRetirementIncome = 0;
        
        if (isSocialSecurityStarted) {
          // Social Security has started - include it (doesn't grow)
          annualRetirementIncome += annualSocialSecurity;
        }
        
        // Other retirement income can grow after retirement starts
        // For current year, don't apply growth
        if (!isCurrentYear && (yearOffset > 1 || (retirementYear && forecastYear > retirementYear))) {
          // Apply growth only to other retirement income
          otherRetirementIncomeValue *= (1 + incomeGrowthDecimal);
        }
        annualRetirementIncome += otherRetirementIncomeValue;
        
        forecastIncome = annualRetirementIncome;
        // Calculate net cash flow after expenses
        const netCashFlow = forecastIncome - annualExpenses;
        // For current year, don't apply cash flow changes (show current values)
        if (!isCurrentYear) {
          // Handle cash flow: if positive, apply savings rate; if negative, subtract full shortfall
          if (netCashFlow >= 0) {
            // Positive cash flow: apply retirement savings rate
            const annualSavings = netCashFlow * retirementSavingsRateDecimal;
            forecastAccounts += annualSavings;
          } else {
            // Negative cash flow: subtract full shortfall from accounts (spending down savings)
            forecastAccounts += netCashFlow; // netCashFlow is negative, so this subtracts
          }
        }
      } else {
        // Before retirement: grow work income (no retirement income yet)
        // For current year, don't apply income growth
        if (!isCurrentYear) {
          forecastIncome *= (1 + incomeGrowthDecimal);
        }
        // Calculate net cash flow after expenses
        const netCashFlow = forecastIncome - annualExpenses;
        // For current year, don't apply cash flow changes (show current values)
        if (!isCurrentYear) {
          // Handle cash flow: if positive, apply savings rate; if negative, subtract full shortfall
          if (netCashFlow >= 0) {
            // Positive cash flow: apply savings rate
            const annualSavings = netCashFlow * savingsRateDecimal;
            forecastAccounts += annualSavings;
          } else {
            // Negative cash flow: subtract full shortfall from accounts (spending down savings)
            forecastAccounts += netCashFlow; // netCashFlow is negative, so this subtracts
          }
        }
      }
      
      // Grow assets based on their return percentages (before distributions)
      // For current year, don't apply asset growth
      if (!isCurrentYear) {
        assetValues = assetValues.map(asset => ({
          ...asset,
          value: asset.value * (1 + asset.returnRate),
        }));
      }
      
      // Calculate totals by category
      const forecastLiquidAssets = assetValues
        .filter(asset => asset.isLiquid)
        .reduce((sum, asset) => sum + asset.value, 0);
      const forecastIlliquidAssets = assetValues
        .filter(asset => !asset.isLiquid)
        .reduce((sum, asset) => sum + asset.value, 0);
      const forecastRmdQualifiedAssets = assetValues
        .filter(asset => asset.isRmdQualified)
        .reduce((sum, asset) => sum + asset.value, 0);
      const forecastLiquidNonRmdAssets = assetValues
        .filter(asset => asset.isLiquid && !asset.isRmdQualified)
        .reduce((sum, asset) => sum + asset.value, 0);
      const forecastLiquidRmdAssets = assetValues
        .filter(asset => asset.isLiquid && asset.isRmdQualified)
        .reduce((sum, asset) => sum + asset.value, 0);
      
      forecastAssets = forecastLiquidAssets + forecastIlliquidAssets;
      
      // Don't track cashRunsOutYear here - we'll track it after distributions are applied
      
      // Calculate Required Minimum Distribution (RMD) if age has been reached
      // RMDs only come from RMD-qualified assets (can be liquid or illiquid)
      const rmdThisYear = yearAge && yearAge >= rmdAge && forecastRmdQualifiedAssets > 0 
        ? calculateRMD(forecastRmdQualifiedAssets, yearAge) 
        : 0;
      const isRmdRequired = rmdYear ? forecastYear >= rmdYear : false;
      
      // Track when RMDs become required
      if (rmdStartYear === null && isRmdRequired) {
        rmdStartYear = forecastYear;
      }
      
      // Determine if distributions are needed for cash flow
      const cashFlowNeeded = forecastAccounts < 0;
      const shortfall = cashFlowNeeded ? Math.abs(forecastAccounts) : 0;
      
      // Determine final distribution amount based on RMD and cash flow needs
      // Distributions from RMD accounts allowed starting at age 59.5 (no penalty)
      // RMDs are required starting at age 73
      // Priority: 1) Liquid non-RMD assets, 2) Liquid RMD assets (if age >= 59.5), 3) Illiquid RMD assets (only if RMD required)
      let distributionThisYear = 0;
      let rmdDistributionThisYear = 0;
      
      // Check if old enough to take distributions from RMD accounts (59.5+)
      const canDistributeFromRmdAccounts = minDistributionYear ? forecastYear >= minDistributionYear : false;
      
      // Calculate required RMD amount (only if RMD age has been reached)
      if (isRmdRequired && forecastRmdQualifiedAssets > 0) {
        rmdDistributionThisYear = Math.min(rmdThisYear, forecastRmdQualifiedAssets);
      }
      
      // Determine total distribution needed
      // Distributions automatically start when cash would hit 0 or go negative (cashFlowNeeded)
      // OR when RMD is legally required
      // The system automatically calculates the minimum distribution needed to keep cash at or above 0
      // For current year, don't apply distributions (show current values)
      let totalDistributionNeeded = 0;
      if (!isCurrentYear) {
        if (cashFlowNeeded) {
          // Need to cover shortfall - this is critical for solvency
          // Automatically use the shortfall amount (minimum needed to keep cash at 0)
          totalDistributionNeeded = shortfall;
          // Ensure RMD is met if required (and RMD age reached)
          if (isRmdRequired) {
            totalDistributionNeeded = Math.max(totalDistributionNeeded, rmdDistributionThisYear);
          }
        } else if (isRmdRequired) {
          // RMD required (age reached), use RMD amount
          totalDistributionNeeded = rmdDistributionThisYear;
        }
      }
      
      // Calculate how much to take from each asset category
      // For current year, skip distributions
      let fromLiquidNonRmd = 0;
      let fromLiquidRmd = 0;
      let fromIlliquidRmd = 0;
      
      if (totalDistributionNeeded > 0 && !isCurrentYear) {
        // Step 1: Always take from liquid non-RMD assets first (preferred for cash flow)
        fromLiquidNonRmd = Math.min(totalDistributionNeeded, forecastLiquidNonRmdAssets);
        let remaining = totalDistributionNeeded - fromLiquidNonRmd;
        
        // Step 2: Take from liquid RMD assets if needed
        // If cash flow is needed (critical), allow distributions even before age 59.5 (with penalty)
        // Otherwise, only allow after age 59.5 (no penalty)
        if (remaining > 0 && forecastLiquidRmdAssets > 0) {
          if (cashFlowNeeded || canDistributeFromRmdAccounts) {
            // Critical cash flow need OR age >= 59.5: allow distribution
            fromLiquidRmd = Math.min(remaining, forecastLiquidRmdAssets);
            remaining -= fromLiquidRmd;
          }
        }
        
        // Step 3: Take from illiquid RMD assets only if RMD is required and still need more
        // Illiquid assets are harder to distribute, so only use when legally required
        if (remaining > 0 && isRmdRequired && forecastRmdQualifiedAssets - forecastLiquidRmdAssets > 0) {
          fromIlliquidRmd = Math.min(remaining, forecastRmdQualifiedAssets - forecastLiquidRmdAssets);
          remaining -= fromIlliquidRmd;
        }
        
        // If we can't get enough and it's not RMD required, stop distributions
        // This handles the case where retiring early (before 59.5) and liquid assets are exhausted
        if (remaining > 0 && !cashFlowNeeded && !isRmdRequired) {
          // Can't meet distribution need - stop here (only if not critical cash flow and not RMD required)
          totalDistributionNeeded = fromLiquidNonRmd + fromLiquidRmd;
        }
        
        distributionThisYear = fromLiquidNonRmd + fromLiquidRmd + fromIlliquidRmd;
        rmdDistributionThisYear = fromLiquidRmd + fromIlliquidRmd; // Total from RMD accounts
      }
      
      // Apply distributions to assets
      if (distributionThisYear > 0) {
        // Mark when distributions start
        if (distributionStartYear === null) {
          distributionStartYear = forecastYear;
          yearsSinceDistributionStart = 0;
        }
        
        // Reduce asset values proportionally
        if (fromLiquidNonRmd > 0 && forecastLiquidNonRmdAssets > 0) {
          const ratio = fromLiquidNonRmd / forecastLiquidNonRmdAssets;
          assetValues = assetValues.map(asset => {
            if (asset.isLiquid && !asset.isRmdQualified) {
              return { ...asset, value: asset.value * (1 - ratio) };
            }
            return asset;
          });
        }
        
        if (fromLiquidRmd > 0 && forecastLiquidRmdAssets > 0) {
          const ratio = fromLiquidRmd / forecastLiquidRmdAssets;
          assetValues = assetValues.map(asset => {
            if (asset.isLiquid && asset.isRmdQualified) {
              return { ...asset, value: asset.value * (1 - ratio) };
            }
            return asset;
          });
        }
        
        if (fromIlliquidRmd > 0) {
          const illiquidRmdTotal = assetValues
            .filter(asset => !asset.isLiquid && asset.isRmdQualified)
            .reduce((sum, asset) => sum + asset.value, 0);
          if (illiquidRmdTotal > 0) {
            const ratio = fromIlliquidRmd / illiquidRmdTotal;
            assetValues = assetValues.map(asset => {
              if (!asset.isLiquid && asset.isRmdQualified) {
                return { ...asset, value: asset.value * (1 - ratio) };
              }
              return asset;
            });
          }
        }
        
        // Recalculate totals after distributions
        forecastAssets = assetValues.reduce((sum, asset) => sum + asset.value, 0);
        
        // Add distribution to available cash
        forecastAccounts += distributionThisYear;
        
        yearsSinceDistributionStart++;
      }
      
      // Track when cash first runs out (goes to zero or negative) AFTER distributions are applied
      // This ensures we're tracking the actual cash position after all adjustments
      // Only set this if cash is actually at or below 0 after distributions
      if (cashRunsOutYear === null && forecastAccounts <= 0) {
        cashRunsOutYear = forecastYear;
      }
      
      // Note: We allow available cash to go negative to trigger distribution logic
      // The Math.max(0) is applied only when displaying, but internally we track negative values
      // to properly calculate when distributions are needed
      
      // Pay down loans (sum all loan balances for this year)
      // For current year, use current loan balances
      if (isCurrentYear) {
        forecastLoans = currentLoans;
        forecastCreditCards = currentCreditCards;
      } else {
        forecastLoans = loanSchedules.reduce((sum, { schedule }) => {
          const yearBalance = schedule[yearOffset - 1];
          return sum + (yearBalance !== undefined ? yearBalance : 0);
        }, 0);
        
        // Assume credit cards stay constant (or user pays them off)
        // For simplicity, we'll assume they're paid off over time
        forecastCreditCards = Math.max(0, currentCreditCards * (1 - yearOffset / forecastYears));
      }
      
      const forecastNetWorth = forecastAccounts + forecastAssets - forecastCreditCards - forecastLoans;
      
      // Recalculate liquid assets after distributions have been applied
      const finalLiquidAssets = assetValues
        .filter(asset => asset.isLiquid)
        .reduce((sum, asset) => sum + asset.value, 0);
      
      data.push({
        date: forecastDate.toISOString().split('T')[0],
        year: forecastYear,
        historical: null,
        forecast: forecastNetWorth,
        accounts: forecastAccounts,
        assets: forecastAssets,
        liquidAssets: finalLiquidAssets,
        creditCards: forecastCreditCards,
        loans: forecastLoans,
        netWorth: forecastNetWorth,
        availableCash: Math.max(0, forecastAccounts), // Display available cash (cannot go below 0 in display)
        distributionAmount: distributionThisYear,
        rmdAmount: rmdThisYear,
        distributionStartYear: distributionStartYear,
        cashRunsOutYear: cashRunsOutYear,
        rmdStartYear: rmdStartYear,
        estimatedIncome: forecastIncome,
        estimatedExpenses: annualExpenses,
        loanPayoffs: loansPaidOffThisYear,
      });
    }

    return data;
  }, [snapshots, accounts, assets, loans, creditCards, forecastYears, incomeGrowthRate, savingsRate, retirementSavingsRate, monthlyNetIncome, monthlyBudget, inflationRate, birthYear, retirementAge, socialSecurityStartAge, calculateSocialSecurityBenefit, otherRetirementIncome, rmdAge, calculateRMD, timelineEvents]);

  // Calculate minimum distribution needed to keep cash above 0
  const minimumDistributionNeeded = useMemo(() => {
    if (forecastData.length === 0 || assets.length === 0 || !monthlyBudget || monthlyBudget === 0) return null;
    
    // Find the first year where cash would go negative without distributions
    // We'll simulate a quick forecast to find when cash runs out
    const today = new Date();
    const startYear = today.getFullYear(); // Start with current year
    const retirementYear = birthYear ? birthYear + retirementAge : null;
    // Calculate Social Security benefit (doesn't grow)
    const annualSocialSecurity = calculateSocialSecurityBenefit || 0;
    const currentAnnualExpenses = monthlyBudget * 12;
    const inflationDecimal = inflationRate / 100;
    
    let testAccounts = accounts
      .filter(acc => acc.include_in_totals === true)
      .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    
    let testAssets = assets.reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);
    let assetValues = assets.map(asset => ({
      id: asset.id,
      value: asset.current_value || 0,
      returnRate: (asset.estimated_return_percentage || 0) / 100,
      isLiquid: asset.is_liquid !== false, // Default to true if not set
      isRmdQualified: asset.is_rmd_qualified || false,
    }));
    
    let testIncome = monthlyNetIncome * 12;
    const savingsRateDecimal = savingsRate / 100;
    const retirementSavingsRateDecimal = retirementSavingsRate / 100;
    const incomeGrowthDecimal = incomeGrowthRate / 100;
    let testOtherRetirementIncome = otherRetirementIncome;
    const testRmdYear = birthYear ? birthYear + rmdAge : null;
    
    // Find when cash first goes negative
    let firstNegativeYear: number | null = null;
    let annualShortfall = 0;
    let assetsAtShortfall = 0;
    let incomeAtShortfall = 0;
    let expensesAtShortfall = 0;
    
    for (let yearOffset = 0; yearOffset < forecastYears; yearOffset++) {
      const forecastYear = startYear + yearOffset;
      const yearAge = birthYear ? forecastYear - birthYear : null;
      const isYearRetired = retirementYear ? forecastYear >= retirementYear : false;
      const annualExpenses = currentAnnualExpenses * Math.pow(1 + inflationDecimal, yearOffset);
      const isRmdRequired = testRmdYear ? forecastYear >= testRmdYear : false;
      
      // Calculate income
      const testSocialSecurityStartYear = birthYear ? birthYear + socialSecurityStartAge : null;
      const isTestSocialSecurityStarted = testSocialSecurityStartYear ? forecastYear >= testSocialSecurityStartYear : false;
      
      if (isYearRetired) {
        // After retirement: work income stops, retirement income begins
        let annualRetirementIncome = 0;
        
        if (isTestSocialSecurityStarted) {
          // Social Security has started - include it (doesn't grow)
          annualRetirementIncome += annualSocialSecurity;
        }
        
        // Other retirement income can grow after retirement starts
        if (yearOffset > 1 || (retirementYear && forecastYear > retirementYear)) {
          testOtherRetirementIncome *= (1 + incomeGrowthDecimal);
        }
        annualRetirementIncome += testOtherRetirementIncome;
        testIncome = annualRetirementIncome;
        // Calculate net cash flow after expenses
        const netCashFlow = testIncome - annualExpenses;
        // Handle cash flow: if positive, apply savings rate; if negative, subtract full shortfall
        if (netCashFlow >= 0) {
          // Positive cash flow: apply retirement savings rate
          const annualSavings = netCashFlow * retirementSavingsRateDecimal;
          testAccounts += annualSavings;
        } else {
          // Negative cash flow: subtract full shortfall from accounts (spending down savings)
          testAccounts += netCashFlow; // netCashFlow is negative, so this subtracts
        }
      } else {
        testIncome *= (1 + incomeGrowthDecimal);
        // Calculate net cash flow after expenses
        const netCashFlow = testIncome - annualExpenses;
        // Handle cash flow: if positive, apply savings rate; if negative, subtract full shortfall
        if (netCashFlow >= 0) {
          // Positive cash flow: apply savings rate
          const annualSavings = netCashFlow * savingsRateDecimal;
          testAccounts += annualSavings;
        } else {
          // Negative cash flow: subtract full shortfall from accounts (spending down savings)
          testAccounts += netCashFlow; // netCashFlow is negative, so this subtracts
        }
      }
      
      // Grow assets
      assetValues = assetValues.map(asset => ({
        ...asset,
        value: asset.value * (1 + asset.returnRate),
      }));
      testAssets = assetValues.reduce((sum, asset) => sum + asset.value, 0);
      
      // Calculate liquid and RMD-qualified asset totals
      const testLiquidAssets = assetValues
        .filter(asset => asset.isLiquid)
        .reduce((sum, asset) => sum + asset.value, 0);
      const testRmdQualifiedAssets = assetValues
        .filter(asset => asset.isRmdQualified)
        .reduce((sum, asset) => sum + asset.value, 0);
      
      // Calculate RMD if age has been reached (after assets have grown)
      // RMDs only come from RMD-qualified assets
      const testRmdThisYear = yearAge && yearAge >= rmdAge && testRmdQualifiedAssets > 0 
        ? calculateRMD(testRmdQualifiedAssets, yearAge) 
        : 0;
      
      // Calculate liquid and RMD-qualified asset totals BEFORE RMD is applied
      const currentLiquidAssets = assetValues
        .filter(asset => asset.isLiquid)
        .reduce((sum, asset) => sum + asset.value, 0);
      const currentLiquidNonRmdAssets = assetValues
        .filter(asset => asset.isLiquid && !asset.isRmdQualified)
        .reduce((sum, asset) => sum + asset.value, 0);
      const currentLiquidRmdAssets = assetValues
        .filter(asset => asset.isLiquid && asset.isRmdQualified)
        .reduce((sum, asset) => sum + asset.value, 0);
      
      // Check if old enough to take distributions from RMD accounts without penalty (59.5+)
      const testMinDistributionYear = birthYear ? birthYear + 59.5 : null;
      const canDistributeFromRmdAccounts = testMinDistributionYear ? forecastYear >= testMinDistributionYear : false;
      
      // Calculate the income/expense gap BEFORE distributions
      // This is what we need to distribute to cover expenses
      const incomeExpenseGap = annualExpenses - testIncome;
      
      // Apply RMD if required (before checking for shortfall)
      // RMD can come from liquid or illiquid RMD-qualified assets
      let rmdAppliedThisYear = 0;
      if (isRmdRequired && testRmdThisYear > 0 && testRmdQualifiedAssets > 0) {
        rmdAppliedThisYear = Math.min(testRmdThisYear, testRmdQualifiedAssets);
        // Reduce RMD-qualified assets by RMD
        const rmdRatio = rmdAppliedThisYear / testRmdQualifiedAssets;
        assetValues = assetValues.map(asset => {
          if (asset.isRmdQualified) {
            return { ...asset, value: asset.value * (1 - rmdRatio) };
          }
          return asset;
        });
        testAssets -= rmdAppliedThisYear;
        // Add RMD to cash
        testAccounts += rmdAppliedThisYear;
      }
      
      // Check if cash goes negative AFTER income, expenses, savings, and RMDs
      if (testAccounts < 0 && firstNegativeYear === null) {
        // Consider it a shortfall if we have liquid assets available to distribute from
        // This includes:
        // 1. Liquid non-RMD assets (always available)
        // 2. Liquid RMD assets if age >= 59.5 OR if cash flow is critical (before 59.5, with penalty)
        // 3. RMD required (can use illiquid RMD assets)
        const cashFlowCritical = testAccounts < 0; // Cash is negative, so cash flow is critical
        const hasDistributableAssets = 
          currentLiquidNonRmdAssets > 0 || // Always can use non-RMD liquid assets
          (currentLiquidRmdAssets > 0 && (canDistributeFromRmdAccounts || cashFlowCritical)) || // Can use RMD liquid assets if age >= 59.5 OR if critical cash flow
          (isRmdRequired && testRmdQualifiedAssets > 0); // RMD required
        
        if (hasDistributableAssets) {
          firstNegativeYear = forecastYear;
          // The shortfall is the full gap between expenses and income
          // This is what needs to be covered by distributions
          // The recommended distribution should be this full amount
          // RMD (if applicable) will automatically cover part of it, but the user needs to set
          // the distribution amount to cover the full gap
          // Use the full gap (expenses - income) as the recommended distribution
          annualShortfall = incomeExpenseGap;
          // Available assets for distribution: liquid non-RMD + liquid RMD (if age >= 59.5 or critical cash flow)
          assetsAtShortfall = currentLiquidNonRmdAssets + (canDistributeFromRmdAccounts || cashFlowCritical ? currentLiquidRmdAssets : 0);
          incomeAtShortfall = testIncome;
          expensesAtShortfall = annualExpenses;
        }
      }
    }
    
    if (firstNegativeYear === null) {
      return null; // Cash never goes negative
    }
    
    return {
      year: firstNegativeYear,
      shortfall: annualShortfall,
      assetsAtShortfall,
      minimumAmount: annualShortfall,
      minimumPercentage: assetsAtShortfall > 0 ? (annualShortfall / assetsAtShortfall) * 100 : 0,
      incomeAtShortfall,
      expensesAtShortfall,
    };
  }, [forecastData, accounts, assets, monthlyBudget, inflationRate, birthYear, retirementAge, socialSecurityStartAge, calculateSocialSecurityBenefit, otherRetirementIncome, monthlyNetIncome, savingsRate, retirementSavingsRate, incomeGrowthRate, forecastYears, rmdAge, calculateRMD]);

  // Calculate retirement year for chart marker
  const retirementYearForChart = useMemo(() => {
    if (!birthYear) return null;
    return birthYear + retirementAge;
  }, [birthYear, retirementAge]);

  // Calculate year when cash runs out
  // Find the first year where availableCash hits 0 (after all adjustments including distributions)
  const cashRunsOutYear = useMemo(() => {
    // Find the first forecast data point where availableCash transitions from positive to 0
    // This represents when cash actually runs out after all income, expenses, and distributions
    for (let i = 0; i < forecastData.length; i++) {
      const point = forecastData[i];
      // Only check forecast data points (not historical)
      if (point.forecast === null) continue;
      
      // Check if this is the first point where availableCash is 0
      // and the previous point (if exists) had positive cash
      const prevPoint = i > 0 ? forecastData[i - 1] : null;
      if (point.availableCash <= 0 && (!prevPoint || prevPoint.availableCash > 0)) {
        return point.year;
      }
    }
    return null;
  }, [forecastData]);

  // Calculate year when liquid assets run out (reach zero or very low)
  const liquidAssetsRunOutYear = useMemo(() => {
    const firstLiquidOutPoint = forecastData.find(p => p.liquidAssets <= 0);
    return firstLiquidOutPoint?.year || null;
  }, [forecastData]);

  // Format chart data
  const chartData = useMemo(() => {
    return forecastData.map(point => {
      // Determine if this year has any events (loan payoffs, timeline events, cash runs out, liquid assets run out)
      const hasLoanPayoffs = point.loanPayoffs && point.loanPayoffs.length > 0;
      const hasTimelineEvents = timelineEvents.some(e => e.year === point.year);
      const isCashRunsOut = cashRunsOutYear === point.year;
      const isLiquidAssetsRunOut = liquidAssetsRunOutYear === point.year && liquidAssetsRunOutYear !== cashRunsOutYear;
      const hasAnyEvent = hasLoanPayoffs || hasTimelineEvents || isCashRunsOut || isLiquidAssetsRunOut;
      
      return {
        date: point.year.toString(),
        label: point.year.toString(),
        'Forecasted Net Worth': point.forecast,
        'Available Cash': point.availableCash,
        'Liquid Assets': point.liquidAssets,
        'Cash Accounts': point.accounts,
        'Non-cash Assets': point.assets,
        'Credit Cards': -point.creditCards,
        'Loans': -point.loans,
        'Estimated Income': point.estimatedIncome, // For tooltip only
        'Estimated Expenses': point.estimatedExpenses, // For tooltip only
        'Distributions': point.distributionAmount, // For tooltip only
        loanPayoffs: point.loanPayoffs, // For tooltip and visual indicators
        hasAnyEvent, // For showing dots
        isRetirementYear: retirementYearForChart ? point.year === retirementYearForChart : false,
      };
    });
  }, [forecastData, retirementYearForChart, timelineEvents, cashRunsOutYear, liquidAssetsRunOutYear]);

  // Debug logging for ReferenceLine
  useEffect(() => {
    console.log('=== ReferenceLine Debug Info ===');
    console.log('birthYear:', birthYear);
    console.log('retirementAge:', retirementAge);
    console.log('retirementYearForChart:', retirementYearForChart);
    console.log('retirementYearForChart type:', typeof retirementYearForChart);
    console.log('retirementYearForChart.toString():', retirementYearForChart?.toString());
    
    if (chartData && chartData.length > 0) {
      console.log('chartData length:', chartData.length);
      console.log('First 3 chartData labels:', chartData.slice(0, 3).map(d => d.label));
      console.log('Last 3 chartData labels:', chartData.slice(-3).map(d => d.label));
      console.log('All chartData labels:', chartData.map(d => d.label));
      
      if (retirementYearForChart) {
        const retirementLabel = retirementYearForChart.toString();
        const foundInChartData = chartData.find(d => d.label === retirementLabel);
        console.log('Looking for retirement year in chartData:', retirementLabel);
        console.log('Found in chartData:', foundInChartData ? 'YES' : 'NO');
        if (foundInChartData) {
          console.log('Found data point:', foundInChartData);
        } else {
          console.log('Retirement year NOT found in chartData labels!');
          console.log('Closest labels:', chartData
            .map(d => ({ label: d.label, diff: Math.abs(parseInt(d.label) - retirementYearForChart) }))
            .sort((a, b) => a.diff - b.diff)
            .slice(0, 5));
        }
      }
    } else {
      console.log('chartData is empty or undefined');
    }
    console.log('Will render ReferenceLine?', !!retirementYearForChart);
    console.log('================================');
  }, [birthYear, retirementAge, retirementYearForChart, chartData]);

  // Retirement line position state (manual overlay due to ReferenceLine issues with ComposedChart)
  const [linePosition, setLinePosition] = useState({ x: 0, height: 0, topOffset: 20 });
  const lineContainerRef = useRef<HTMLDivElement>(null);
  
  const updateLinePosition = useCallback(() => {
    if (!lineContainerRef.current || chartData.length === 0 || !retirementYearForChart) {
      return;
    }
    
    const container = lineContainerRef.current.parentElement;
    if (!container) return;
    
    // Try to find the actual SVG chart area by looking for the clipPath
    const svg = container.querySelector('svg.recharts-surface');
    let chartHeight = 0;
    let topMargin = 20;
    
    if (svg) {
      const clipPath = svg.querySelector('clipPath rect');
      if (clipPath) {
        const clipHeight = parseFloat(clipPath.getAttribute('height') || '0');
        const clipY = parseFloat(clipPath.getAttribute('y') || '0');
        // Add back some pixels that might be clipped - the clipPath might be slightly smaller than the actual chart area
        chartHeight = clipHeight + 11; // Add 11px to account for the cutoff (reduced from 14px)
        topMargin = clipY;
      }
    }
    
    // Fallback to calculated height if SVG not found
    if (chartHeight === 0) {
      const containerRect = container.getBoundingClientRect();
      topMargin = 20;
      // Bottom margin accounts for X-axis labels (80px) + legend (~30-40px)
      const bottomMargin = 109; // Adjusted to match the 11px addition above
      chartHeight = containerRect.height - topMargin - bottomMargin;
    }
    
    const containerRect = container.getBoundingClientRect();
    const leftMargin = 73; // Reduced from 75px to align line and marker properly
    const rightMargin = 20;
    const chartWidth = containerRect.width - leftMargin - rightMargin;
    
    const retirementIndex = chartData.findIndex(
      (point) => point.label === retirementYearForChart.toString()
    );
    
    if (retirementIndex === -1) {
      setLinePosition({ x: 0, height: 0, topOffset: 20 });
      return;
    }
    
    const xPercent = chartData.length > 1 ? retirementIndex / (chartData.length - 1) : 0;
    const x = leftMargin + xPercent * chartWidth;
    
    setLinePosition({ x, height: chartHeight, topOffset: topMargin });
  }, [chartData, retirementYearForChart]);
  
  // Calculate position based on retirement year
  useEffect(() => {
    if (!retirementYearForChart) {
      setLinePosition({ x: 0, height: 0, topOffset: 20 });
      return;
    }
    updateLinePosition();
  }, [updateLinePosition, retirementYearForChart]);

  // Recalculate position on window resize and container size changes
  useEffect(() => {
    if (!lineContainerRef.current || !retirementYearForChart) return;

    const handleResize = () => {
      // Small delay to ensure chart has finished resizing
      setTimeout(updateLinePosition, 50);
    };

    // Watch for window resize
    window.addEventListener('resize', handleResize);
    
    // Watch for container size changes (more accurate than window resize)
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updateLinePosition, 50);
    });
    
    resizeObserver.observe(lineContainerRef.current.parentElement || lineContainerRef.current);
    
    // Initial position update after mount
    const timeoutId = setTimeout(updateLinePosition, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      clearTimeout(timeoutId);
    };
  }, [updateLinePosition, retirementYearForChart]);

  // Calculate current assets and liabilities for breakdown
  const currentAssetsAndLiabilities = useMemo(() => {
    const totalAccounts = accounts
      .filter(acc => acc.include_in_totals === true)
      .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    
    const totalAssets = assets
      .reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);
    
    const totalCreditCards = creditCards
      .reduce((sum, cc) => sum + Number(cc.current_balance || 0), 0);
    
    const totalLoans = loans
      .filter(loan => loan.include_in_net_worth === true)
      .reduce((sum, loan) => sum + Number(loan.balance || 0), 0);
    
    return {
      totalAssets: totalAccounts + totalAssets,
      totalLiabilities: totalCreditCards + totalLoans,
    };
  }, [accounts, assets, creditCards, loans]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const firstForecast = forecastData.find(p => p.forecast !== null);
    const lastForecast = forecastData[forecastData.length - 1];
    
    if (!lastForecast || !firstForecast) return null;
    
    const netWorthChange = lastForecast.netWorth - firstForecast.netWorth;
    const netWorthChangePercent = firstForecast.netWorth 
      ? ((netWorthChange / firstForecast.netWorth) * 100)
      : 0;
    
    return {
      currentNetWorth,
      projectedNetWorth: lastForecast.netWorth,
      netWorthChange,
      netWorthChangePercent,
      yearsToProject: forecastYears,
      forecastAge,
      currentAge: birthYear ? new Date().getFullYear() - birthYear : null,
    };
  }, [forecastData, currentNetWorth, forecastYears, forecastAge, birthYear]);

  // Show birth year dialog if needed
  if (showBirthYearDialog) {
    const currentYear = new Date().getFullYear();
    return (
      <Dialog open={showBirthYearDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Enter Your Birth Year</DialogTitle>
            <DialogDescription>
              To provide accurate forecasts, we need to know your birth year. 
              This will be used to calculate forecasts up to age 90.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="birth-year-input">Birth Year</Label>
              <Input
                id="birth-year-input"
                type="number"
                min="1900"
                max={currentYear}
                value={tempBirthYear}
                onChange={(e) => setTempBirthYear(e.target.value)}
                placeholder="e.g., 1990"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveBirthYear();
                  }
                }}
                autoFocus
              />
              <p className="text-sm text-muted-foreground">
                This information is stored securely and only used for financial forecasting.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveBirthYear} disabled={savingBirthYear}>
              {savingBirthYear ? 'Saving...' : 'Save & Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Event dialog handlers
  const handleEventFormSubmit = (eventData: Partial<TimelineEvent>) => {
    // The year is already calculated and validated in the dialog's handleSubmit
    // eventData should contain the year
    const year = eventData.year;
    if (!year) {
      toast.error('Year is required');
      return;
    }

    if (editingEvent) {
      // Update existing event
      setTimelineEvents(timelineEvents.map(e => 
        e.id === editingEvent.id ? { ...e, ...eventData, year } : e
      ));
    } else {
      // Create new event
      const newEvent: TimelineEvent = {
        id: `event-${Date.now()}`,
        type: eventData.type || 'windfall',
        year,
        assetId: eventData.assetId,
        amount: eventData.amount,
        description: eventData.description,
      };
      setTimelineEvents([...timelineEvents, newEvent]);
    }
    
    setShowEventDialog(false);
    setEditingEvent(null);
    setSelectedYearForEvent(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading forecast data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Palmtree className="h-8 w-8 text-primary" />
          Retirement Planning
        </h1>
        <p className="text-muted-foreground mt-1">
          Project your financial future and plan for retirement based on your assets, loans, and income growth
        </p>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current Net Worth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.currentNetWorth)}</div>
              <div className="text-xs text-muted-foreground mt-2">
                Assets {formatCurrency(currentAssetsAndLiabilities.totalAssets)} - Liabilities {formatCurrency(currentAssetsAndLiabilities.totalLiabilities)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Projected Net Worth (Age {forecastAge})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(metrics.projectedNetWorth)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Projected Change</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-2 ${
                metrics.netWorthChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {metrics.netWorthChange >= 0 ? (
                  <TrendingUp className="h-6 w-6" />
                ) : (
                  <TrendingDown className="h-6 w-6" />
                )}
                {formatCurrency(Math.abs(metrics.netWorthChange))}
                <span className="text-lg text-muted-foreground">
                  ({metrics.netWorthChangePercent.toFixed(1)}%)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assumptions Callout */}
      <Alert className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20">
        <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
        <AlertDescription className="text-purple-900 dark:text-purple-100">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex-1">
              <strong>Forecast Assumptions:</strong> This forecast is based on assumptions and calculations. 
              View detailed explanations of how we calculate your forecast.
            </span>
            <HelpPanel
              title="Forecast Assumptions & Calculations"
              description="Detailed explanations of how we calculate your net worth forecast"
              trigger={
                <Button variant="outline" size="sm" className="shrink-0">
                  View Assumptions →
                </Button>
              }
            >
              {(() => {
                // Calculate values for assumptions explanations
                const currentAccounts = accounts
                  .filter(acc => acc.include_in_totals === true)
                  .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
                const currentAssets = assets.reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);
                const currentCreditCards = creditCards.reduce((sum, cc) => sum + Number(cc.current_balance || 0), 0);
                const currentLoans = loans
                  .filter(loan => loan.include_in_net_worth === true)
                  .reduce((sum, loan) => sum + Number(loan.balance || 0), 0);
                const liquidAssets = assets
                  .filter(asset => asset.is_liquid !== false)
                  .reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);
                const rmdQualifiedAssets = assets
                  .filter(asset => asset.is_rmd_qualified === true)
                  .reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);
                const annualIncome = monthlyNetIncome * 12;
                const annualExpenses = monthlyBudget * 12;
                const currentAge = birthYear ? new Date().getFullYear() - birthYear : null;
                
                return (
                  <div className="space-y-6">
                    <HelpSection title="Current Financial Position">
                      <p>
                        Your current net worth is calculated as:
                      </p>
                      <div className="bg-muted/50 p-3 rounded-lg mt-2 space-y-1">
                        <p className="font-mono text-sm">
                          Net Worth = Assets - Liabilities
                        </p>
                        <p className="font-mono text-sm">
                          = ({formatCurrency(currentAccounts)} cash accounts + {formatCurrency(currentAssets)} assets) - ({formatCurrency(currentCreditCards)} credit cards + {formatCurrency(currentLoans)} loans)
                        </p>
                        <p className="font-mono text-sm font-semibold">
                          = {formatCurrency(currentNetWorth)}
                        </p>
                      </div>
                    </HelpSection>

                    <HelpSection title="Asset Growth">
                      <p>
                        Each year, your assets grow based on their estimated return percentages:
                      </p>
                      <ul className="list-disc pl-4 mt-2 space-y-1">
                        {assets.length > 0 ? (
                          assets.map(asset => (
                            <li key={asset.id}>
                              <strong>{asset.name}:</strong> {formatCurrency(asset.current_value || 0)} 
                              {asset.estimated_return_percentage ? (
                                <> grows at {asset.estimated_return_percentage}% per year</>
                              ) : (
                                <> (no growth rate set)</>
                              )}
                              {asset.is_liquid === false && <> (illiquid)</>}
                              {asset.is_rmd_qualified && <> (RMD-qualified)</>}
                            </li>
                          ))
                        ) : (
                          <li>No assets configured</li>
                        )}
                      </ul>
                      <p className="mt-2 text-xs text-muted-foreground">
                        <strong>Note:</strong> Asset growth is applied annually using compound interest. 
                        Liquid assets ({formatCurrency(liquidAssets)}) can be accessed immediately, 
                        while illiquid assets require liquidation events to convert to cash.
                      </p>
                    </HelpSection>

                    <HelpSection title="Income & Expenses">
                      <p>
                        Your current annual income and expenses:
                      </p>
                      <div className="bg-muted/50 p-3 rounded-lg mt-2 space-y-2">
                        <p>
                          <strong>Annual Income:</strong> {formatCurrency(annualIncome)}
                          {incomeGrowthRate > 0 && (
                            <> (growing at {incomeGrowthRate}% per year)</>
                          )}
                        </p>
                        <p>
                          <strong>Annual Expenses:</strong> {formatCurrency(annualExpenses)}
                          {inflationRate > 0 && (
                            <> (increasing at {inflationRate}% per year due to inflation)</>
                          )}
                        </p>
                        <p>
                          <strong>Net Cash Flow:</strong> {formatCurrency(annualIncome - annualExpenses)}
                          {annualIncome - annualExpenses >= 0 ? (
                            <span className="text-green-600 dark:text-green-400"> (positive)</span>
                          ) : (
                            <span className="text-red-600 dark:text-red-400"> (negative - spending exceeds income)</span>
                          )}
                        </p>
                      </div>
                      {savingsRate > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Before retirement, {savingsRate}% of positive net cash flow is saved and added to your cash accounts.
                        </p>
                      )}
                    </HelpSection>

                    {birthYear && (
                      <HelpSection title="Retirement Planning">
                        <div className="space-y-2">
                          <p>
                            <strong>Current Age:</strong> {currentAge}
                          </p>
                          <p>
                            <strong>Retirement Age:</strong> {retirementAge} (Year {birthYear + retirementAge})
                          </p>
                          <p>
                            <strong>Forecast Age:</strong> {forecastAge} (Year {birthYear + forecastAge})
                          </p>
                          <p className="mt-2">
                            At retirement (age {retirementAge}), your work income stops and retirement income begins:
                          </p>
                          <div className="bg-muted/50 p-3 rounded-lg mt-2">
                            {calculateSocialSecurityBenefit > 0 ? (
                              <p>
                                <strong>Social Security:</strong> {formatCurrency(calculateSocialSecurityBenefit)}/year 
                                (starting at age {socialSecurityStartAge})
                              </p>
                            ) : (
                              <p>
                                <strong>Social Security:</strong> Not included
                                {socialSecurityStartAge > retirementAge && (
                                  <> (starts at age {socialSecurityStartAge}, after retirement)</>
                                )}
                              </p>
                            )}
                            {otherRetirementIncome > 0 && (
                              <p className="mt-1">
                                <strong>Other Retirement Income:</strong> {formatCurrency(otherRetirementIncome)}/year
                                {incomeGrowthRate > 0 && (
                                  <> (grows at {incomeGrowthRate}% per year)</>
                                )}
                              </p>
                            )}
                            <p className="mt-2 font-semibold">
                              Total Retirement Income: {formatCurrency(calculateSocialSecurityBenefit + otherRetirementIncome)}/year
                            </p>
                          </div>
                          {retirementSavingsRate > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              After retirement, {retirementSavingsRate}% of positive net cash flow is saved.
                            </p>
                          )}
                        </div>
                      </HelpSection>
                    )}

                    <HelpSection title="Required Minimum Distributions (RMDs)">
                      {birthYear && rmdQualifiedAssets > 0 ? (
                        <div className="space-y-2">
                          <p>
                            You have {formatCurrency(rmdQualifiedAssets)} in RMD-qualified accounts (IRAs, 401(k)s, etc.).
                          </p>
                          <p>
                            <strong>RMD Age:</strong> {rmdAge} (Year {birthYear + rmdAge})
                          </p>
                          <p>
                            <strong>Distributions Allowed:</strong> Age 59.5 (Year {birthYear + 59.5}) - You can take distributions without penalty starting at this age.
                          </p>
                          <p className="mt-2">
                            RMDs are calculated using IRS life expectancy tables. The formula is:
                          </p>
                          <div className="bg-muted/50 p-3 rounded-lg mt-2">
                            <p className="font-mono text-sm">
                              RMD = Account Balance / Life Expectancy Factor
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              The factor decreases as you age (e.g., age 73 ≈ factor of 26.5, age 80 ≈ factor of 20.2)
                            </p>
                          </div>
                          {currentAge && currentAge >= 59.5 && currentAge < rmdAge && (
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                              You can currently take distributions from RMD accounts without penalty.
                            </p>
                          )}
                          {currentAge && currentAge >= rmdAge && (
                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                              RMDs are currently required. Your RMD this year would be approximately {formatCurrency(calculateRMD(rmdQualifiedAssets, currentAge))}.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          {rmdQualifiedAssets === 0 ? 'No RMD-qualified accounts configured.' : 'Birth year required to calculate RMD details.'}
                        </p>
                      )}
                    </HelpSection>

                    <HelpSection title="Distributions & Cash Flow">
                      <p>
                        When your available cash runs out (goes to $0 or negative), distributions are automatically taken from investment accounts to maintain solvency.
                      </p>
                      <p className="mt-2">
                        Distribution priority:
                      </p>
                      <ol className="list-decimal pl-4 mt-2 space-y-1">
                        <li><strong>Liquid non-RMD assets</strong> - Taken first for cash flow needs</li>
                        <li><strong>Liquid RMD assets</strong> - Used if age ≥ 59.5 or cash flow is critical</li>
                        <li><strong>Illiquid RMD assets</strong> - Only used when RMD is legally required</li>
                      </ol>
                      {minimumDistributionNeeded && (
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800 mt-3">
                          <p className="text-sm font-semibold mb-2">Your Distribution Projection:</p>
                          <p className="text-sm">
                            Starting in year {minimumDistributionNeeded.year} (age {birthYear ? minimumDistributionNeeded.year - birthYear : 'N/A'}), 
                            distributions of approximately {formatCurrency(minimumDistributionNeeded.minimumAmount)}/year 
                            will be needed to maintain positive cash flow.
                          </p>
                        </div>
                      )}
                    </HelpSection>

                    <HelpSection title="Loan Payments">
                      {loans.filter(loan => loan.include_in_net_worth === true).length > 0 ? (
                        <div className="space-y-2">
                          <p>
                            Loans are paid down according to their minimum payment schedules:
                          </p>
                          <ul className="list-disc pl-4 mt-2 space-y-1">
                            {loans
                              .filter(loan => loan.include_in_net_worth === true)
                              .map(loan => (
                                <li key={loan.id}>
                                  <strong>{loan.name}:</strong> {formatCurrency(loan.balance || 0)} balance, 
                                  {loan.minimum_payment ? (
                                    <> {formatCurrency(loan.minimum_payment)}/month minimum payment</>
                                  ) : (
                                    <> no minimum payment set</>
                                  )}
                                  {loan.maturity_date && (
                                    <> (matures {new Date(loan.maturity_date).getFullYear()})</>
                                  )}
                                </li>
                              ))}
                          </ul>
                          <p className="text-xs text-muted-foreground mt-2">
                            When a loan matures, its payments stop and are removed from your annual expenses, 
                            effectively increasing your available cash flow.
                          </p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No loans included in net worth calculation.</p>
                      )}
                    </HelpSection>

                    <HelpSection title="Timeline Events">
                      {timelineEvents.length > 0 ? (
                        <div className="space-y-2">
                          <p>Your forecast includes the following timeline events:</p>
                          <ul className="list-disc pl-4 mt-2 space-y-2">
                            {timelineEvents.map(event => {
                              const eventAsset = event.assetId ? assets.find(a => a.id === event.assetId) : null;
                              return (
                                <li key={event.id}>
                                  <strong>Year {event.year}</strong> (Age {birthYear ? event.year - birthYear : 'N/A'}):{' '}
                                  {event.type === 'liquidation' && eventAsset && (
                                    <>Liquidation of {eventAsset.name} ({formatCurrency(eventAsset.current_value || 0)})</>
                                  )}
                                  {event.type === 'windfall' && (
                                    <>Windfall of {formatCurrency(event.amount || 0)}</>
                                  )}
                                  {event.type === 'expense_change' && (
                                    <>Expense change to {formatCurrency(event.amount || 0)}/year</>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">
                          No timeline events configured. You can add events like asset liquidations, windfalls, or expense changes 
                          by clicking on any year in the forecast chart.
                        </p>
                      )}
                    </HelpSection>

                    <HelpSection title="Important Notes">
                      <ul className="list-disc pl-4 space-y-2">
                        <li>
                          <strong>Market Volatility:</strong> Asset growth assumes consistent returns. 
                          Actual market performance will vary and may be higher or lower than projected.
                        </li>
                        <li>
                          <strong>Expense Changes:</strong> The forecast assumes expenses grow with inflation. 
                          Unexpected expenses or lifestyle changes are not accounted for unless added as timeline events.
                        </li>
                        <li>
                          <strong>Tax Implications:</strong> Distributions from RMD-qualified accounts may be subject to income tax. 
                          This forecast does not account for taxes on distributions.
                        </li>
                        <li>
                          <strong>Loan Assumptions:</strong> Loans are paid according to minimum payments. 
                          Extra payments or refinancing are not included unless reflected in loan data.
                        </li>
                        <li>
                          <strong>Social Security:</strong> Benefits are estimated based on your annual income setting. 
                          Actual benefits may vary based on your complete earnings history.
                        </li>
                      </ul>
                    </HelpSection>
                  </div>
                );
              })()}
            </HelpPanel>
          </div>
        </AlertDescription>
      </Alert>

      {/* Forecast Parameters Callout */}
      <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription className="text-blue-900 dark:text-blue-100">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="flex-1">
              <strong>Forecast Parameters:</strong> Adjust settings to see how different scenarios affect your net worth
            </span>
            <HelpPanel
              title="Forecast Parameters"
              description="Adjust these settings to see how different scenarios affect your net worth"
              trigger={
                <Button variant="outline" size="sm" className="shrink-0">
                  Modify Parameters →
                </Button>
              }
            >
              <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="forecast-age">Forecast Age</Label>
              <Input
                id="forecast-age"
                type="number"
                min={birthYear ? new Date().getFullYear() - birthYear + 1 : 1}
                max={birthYear ? new Date().getFullYear() - birthYear + 50 : 150}
                value={forecastAge}
                onChange={(e) => {
                  const age = parseInt(e.target.value) || 90;
                  const currentYear = new Date().getFullYear();
                  const currentAge = birthYear ? currentYear - birthYear : 0;
                  const maxAge = currentAge + 50;
                  const newAge = Math.max(currentAge + 1, Math.min(maxAge, age));
                  setForecastAge(newAge);
                }}
              />
              {birthYear && (
                <p className="text-xs text-muted-foreground">
                  Forecasts {forecastYears} years ahead (until age {forecastAge})
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="income-growth">Income Growth Rate (%/year)</Label>
              <Input
                id="income-growth"
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={incomeGrowthRate}
                onChange={(e) => {
                  const rate = Math.max(0, Math.min(50, parseFloat(e.target.value) || 0));
                  setIncomeGrowthRate(rate);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="savings-rate">Savings Rate (% of net income)</Label>
              <Input
                id="savings-rate"
                type="number"
                step="1"
                min="0"
                max="100"
                value={savingsRate}
                onChange={(e) => {
                  const rate = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                  setSavingsRate(rate);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Applies before retirement
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inflation-rate">Inflation Rate (%/year)</Label>
              <Input
                id="inflation-rate"
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={inflationRate}
                onChange={(e) => {
                  const rate = Math.max(0, Math.min(50, parseFloat(e.target.value) || 0));
                  setInflationRate(rate);
                }}
              />
              <p className="text-xs text-muted-foreground">
                Applied to living expenses each year
              </p>
            </div>
          </div>

          {/* Retirement Settings */}
          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-4">Retirement Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="retirement-savings-rate">Retirement Savings Rate (% of net income)</Label>
                <Input
                  id="retirement-savings-rate"
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={retirementSavingsRate}
                  onChange={(e) => {
                    const rate = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                    setRetirementSavingsRate(rate);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Default: 0% (no savings after retirement)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retirement-age">Retirement Age</Label>
                <Input
                  id="retirement-age"
                  type="number"
                  min={birthYear ? new Date().getFullYear() - birthYear + 1 : 1}
                  max={birthYear ? Math.min(forecastAge, new Date().getFullYear() - birthYear + 50) : 100}
                  value={retirementAge}
                  onChange={(e) => {
                    const age = parseInt(e.target.value) || 67;
                    const currentYear = new Date().getFullYear();
                    const currentAge = birthYear ? currentYear - birthYear : 0;
                    const maxAge = birthYear ? Math.min(forecastAge, currentAge + 50) : 100;
                    const newAge = Math.max(currentAge + 1, Math.min(maxAge, age));
                    setRetirementAge(newAge);
                  }}
                />
                {birthYear && retirementYearForChart && (
                  <p className="text-xs text-muted-foreground">
                    Retire in {retirementYearForChart} (age {retirementAge})
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="social-security-start-age">Social Security Start Age</Label>
                <Input
                  id="social-security-start-age"
                  type="number"
                  min={62}
                  max={70}
                  value={socialSecurityStartAge}
                  onChange={(e) => {
                    const age = Math.max(62, Math.min(70, parseInt(e.target.value) || 67));
                    setSocialSecurityStartAge(age);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Age when Social Security benefits begin (62-70). Early start reduces benefits, delayed start increases them.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="social-security">Social Security Benefits</Label>
                <Select 
                  value={socialSecurityBenefitLevel} 
                  onValueChange={(value: 'full' | 'half' | 'none') => setSocialSecurityBenefitLevel(value)}
                >
                  <SelectTrigger id="social-security">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Benefits</SelectItem>
                    <SelectItem value="half">Half Benefits</SelectItem>
                    <SelectItem value="none">No Benefits</SelectItem>
                  </SelectContent>
                </Select>
                {calculateSocialSecurityBenefit > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Estimated: {formatCurrency(calculateSocialSecurityBenefit)}/year
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="other-retirement-income">Other Retirement Income ($/year)</Label>
                <Input
                  id="other-retirement-income"
                  type="number"
                  step="1000"
                  min="0"
                  value={otherRetirementIncome}
                  onChange={(e) => {
                    const amount = Math.max(0, parseFloat(e.target.value) || 0);
                    setOtherRetirementIncome(amount);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Pensions, rental income, etc.
                </p>
              </div>
            </div>
            {birthYear && retirementYearForChart && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm">
                  <strong>Retirement Income:</strong> {formatCurrency(calculateSocialSecurityBenefit + otherRetirementIncome)}/year
                  {calculateSocialSecurityBenefit > 0 && (
                    <span className="text-muted-foreground">
                      {' '}({formatCurrency(calculateSocialSecurityBenefit)} Social Security starting at age {socialSecurityStartAge} + {formatCurrency(otherRetirementIncome)} other)
                    </span>
                  )}
                  {calculateSocialSecurityBenefit === 0 && socialSecurityStartAge > retirementAge && (
                    <span className="text-muted-foreground">
                      {' '}(Social Security starts at age {socialSecurityStartAge}, after retirement at age {retirementAge})
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Liquid Assets Alert */}
          {liquidAssetsRunOutYear && forecastData.length > 0 && (
            <div className="pt-4 border-t">
              <Alert className="mb-4 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
                <AlertDescription className="text-orange-900 dark:text-orange-100">
                  <strong className="font-semibold">Liquid Assets Depletion Warning:</strong> Based on current projections, your liquid assets will run out in {liquidAssetsRunOutYear}
                  {birthYear && (
                    <span> (Age {liquidAssetsRunOutYear - birthYear})</span>
                  )}
                  . After this point, you will need to liquidate illiquid assets to remain solvent. Consider adding liquidation events to your timeline to plan for this transition.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Timeline Events */}
          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-4">Timeline Events</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add events to your forecast timeline to account for major financial changes. Click on any year in the chart to add an event for that year.
            </p>
            {timelineEvents.length > 0 && (
              <div className="mb-4 space-y-2">
                {timelineEvents.map((event) => {
                  const eventAsset = event.assetId ? assets.find(a => a.id === event.assetId) : null;
                  return (
                    <div key={event.id} className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {event.type === 'liquidation' ? 'Liquidation' : event.type === 'windfall' ? 'Windfall' : 'Expense Change'}
                          </span>
                          <span className="text-sm font-medium">Year {event.year}</span>
                          {birthYear && (
                            <span className="text-xs text-muted-foreground">(Age {event.year - birthYear})</span>
                          )}
                        </div>
                        {event.type === 'liquidation' && eventAsset && (
                          <p className="text-sm text-muted-foreground">
                            Liquidate: {eventAsset.name} ({formatCurrency(eventAsset.current_value || 0)})
                          </p>
                        )}
                        {event.type === 'windfall' && (
                          <p className="text-sm text-muted-foreground">
                            Windfall: {formatCurrency(event.amount || 0)}
                          </p>
                        )}
                        {event.type === 'expense_change' && (
                          <p className="text-sm text-muted-foreground">
                            New base expenses: {formatCurrency(event.amount || 0)}/year
                          </p>
                        )}
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingEvent(event);
                            setSelectedYearForEvent(event.year);
                            setShowEventDialog(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTimelineEvents(timelineEvents.filter(e => e.id !== event.id));
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setEditingEvent(null);
                setSelectedYearForEvent(null);
                setShowEventDialog(true);
              }}
            >
              Add Event
            </Button>
          </div>

          {/* Distribution Settings */}
          <div className="pt-4 border-t">
            <h3 className="text-lg font-semibold mb-4">Investment Distributions</h3>
            <p className="text-sm text-muted-foreground mb-4">
              When available cash runs out, distributions will automatically be taken from investment accounts to maintain solvency. Distributions from RMD-qualified accounts (IRAs, 401(k)s) are allowed starting at age 59.5 without penalty. Required Minimum Distributions (RMDs) are legally required starting at age {rmdAge} and will be automatically incorporated into the forecast.
            </p>
            {birthYear && (
              <>
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    <strong>RMD Account Distributions Allowed:</strong> Starting in {birthYear + 59.5} (Age 59.5)
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    You can take distributions from RMD-qualified accounts (IRAs, 401(k)s) starting at age 59.5 without penalty. This allows you to reduce RMD burden later by distributing earlier.
                  </p>
                </div>
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    <strong>RMDs Required:</strong> Starting in {birthYear + rmdAge} (Age {rmdAge})
                  </p>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                    RMDs are calculated based on your investment account balance and IRS life expectancy tables. If your selected distribution is lower than the RMD, it will automatically increase to meet the RMD requirement.
                  </p>
                </div>
              </>
            )}
            {minimumDistributionNeeded ? (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  <strong>Required Distributions:</strong>
                </p>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <p>
                    To keep cash above $0, distributions of{' '}
                    <strong>{formatCurrency(minimumDistributionNeeded.minimumAmount)}</strong> per year will automatically be applied starting in {minimumDistributionNeeded.year}
                    {birthYear && (
                      <span> (Age {minimumDistributionNeeded.year - birthYear})</span>
                    )}
                    . The system will automatically calculate and apply the minimum distribution needed each year to maintain a positive cash balance.
                  </p>
                  <div className="pt-2 border-t border-blue-200 dark:border-blue-800">
                    <p className="font-semibold mb-1">At Year {minimumDistributionNeeded.year}:</p>
                    <div className="space-y-1 pl-2">
                      <p>
                        <span className="text-green-700 dark:text-green-300">Income:</span>{' '}
                        <strong>{formatCurrency(minimumDistributionNeeded.incomeAtShortfall)}</strong>
                      </p>
                      <p>
                        <span className="text-red-700 dark:text-red-300">Living Expenses:</span>{' '}
                        <strong>{formatCurrency(minimumDistributionNeeded.expensesAtShortfall)}</strong>
                      </p>
                      <p>
                        <span className="font-semibold">Shortfall:</span>{' '}
                        <strong className="text-red-600 dark:text-red-400">
                          {formatCurrency(minimumDistributionNeeded.expensesAtShortfall - minimumDistributionNeeded.incomeAtShortfall)}
                        </strong>
                      </p>
                    </div>
                  </div>
                  <p className="pt-2 border-t border-blue-200 dark:border-blue-800">
                    This represents approximately{' '}
                    <strong>{minimumDistributionNeeded.minimumPercentage.toFixed(2)}%</strong> of your investment assets at that time.
                  </p>
                </div>
              </div>
            ) : forecastData.length > 0 && assets.length > 0 && monthlyBudget > 0 ? (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  <strong>Good News!</strong> Based on your current settings, your available cash is projected to stay above $0 throughout the forecast period. No distributions are needed.
                </p>
              </div>
            ) : null}
            <div className="mt-4 space-y-2">
              <div className="space-y-2">
                <Label htmlFor="rmd-age">Required Minimum Distribution (RMD) Age</Label>
                <Input
                  id="rmd-age"
                  type="number"
                  min="70"
                  max="75"
                  value={rmdAge}
                  onChange={(e) => {
                    const age = Math.max(70, Math.min(75, parseInt(e.target.value) || 73));
                    setRmdAge(age);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Age when RMDs become legally required (typically 73 as of 2023)
                </p>
              </div>
            </div>
            {forecastData.length > 0 && (() => {
              const firstDistributionYear = forecastData.find(p => p.distributionStartYear !== null);
              const firstRmdYear = forecastData.find(p => p.rmdStartYear !== null);
              
              if (firstDistributionYear || firstRmdYear) {
                return (
                  <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800 space-y-2">
                    {firstDistributionYear && (
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                        <strong>Distributions Start:</strong> Year {firstDistributionYear.distributionStartYear} 
                        {firstDistributionYear.distributionStartYear && birthYear && (
                          <span className="text-muted-foreground">
                            {' '}(Age {firstDistributionYear.distributionStartYear - birthYear})
                          </span>
                        )}
                        {firstRmdYear && firstDistributionYear.distributionStartYear === firstRmdYear.rmdStartYear && (
                          <span className="text-muted-foreground"> (RMD Required)</span>
                        )}
                      </p>
                    )}
                    {firstRmdYear && (!firstDistributionYear || firstRmdYear.rmdStartYear !== firstDistributionYear.distributionStartYear) && (
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                        <strong>RMD Required:</strong> Year {firstRmdYear.rmdStartYear} 
                        {firstRmdYear.rmdStartYear && birthYear && (
                          <span className="text-muted-foreground">
                            {' '}(Age {firstRmdYear.rmdStartYear - birthYear})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>
            </div>
          </HelpPanel>
          </div>
        </AlertDescription>
      </Alert>

      {/* Main Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Retirement Planning Forecast</CardTitle>
          <CardDescription>
            Projected future net worth based on your current financial situation, starting from this year. Timeline events are shown as white vertical lines on the chart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  className="text-xs"
                  tickFormatter={(value) => formatCurrencyAbbreviated(value)}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    // Don't show income/expenses in the main tooltip list
                    if (name === 'Estimated Income' || name === 'Estimated Expenses') {
                      return null;
                    }
                    return formatCurrency(value);
                  }}
                  labelStyle={{ color: '#000' }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', zIndex: 50 }}
                  wrapperStyle={{ zIndex: 50 }}
                  labelFormatter={(label) => {
                    const year = parseInt(String(label || ''));
                    if (birthYear && !isNaN(year)) {
                      const age = year - birthYear;
                      return `${year} (Age ${age})`;
                    }
                    return String(label || '');
                  }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    
                    const labelStr = String(label || '');
                    const year = parseInt(labelStr);
                    const dataPoint = chartData.find(p => p.label === labelStr);
                    const income = dataPoint?.['Estimated Income'] ?? 0;
                    const expenses = dataPoint?.['Estimated Expenses'] ?? 0;
                    const distributions = dataPoint?.['Distributions'] ?? 0;
                    const loanPayoffs = dataPoint?.loanPayoffs || [];
                    
                    // Find events for this year
                    const eventsThisYear = timelineEvents.filter(e => e.year === year);
                    const isCashRunsOut = cashRunsOutYear === year;
                    const isLiquidAssetsRunOut = liquidAssetsRunOutYear === year && liquidAssetsRunOutYear !== cashRunsOutYear;
                    
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                        <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                          {birthYear && !isNaN(year) ? `${year} (Age ${year - birthYear})` : labelStr}
                        </p>
                        <div className="space-y-1 mb-2">
                          {payload.map((entry, index) => {
                            // Skip income/expenses/distributions and the event dots line from main list
                            // The event dots line uses a function dataKey, so filter those out
                            const isEventDotLine = typeof entry.dataKey === 'function' || 
                                                   entry.dataKey === undefined ||
                                                   entry.value === null;
                            
                            if (entry.dataKey === 'Estimated Income' || 
                                entry.dataKey === 'Estimated Expenses' || 
                                entry.dataKey === 'Distributions' ||
                                isEventDotLine) {
                              return null;
                            }
                            return (
                              <p key={index} className="text-sm" style={{ color: entry.color }}>
                                <span className="font-medium">{entry.name}:</span>{' '}
                                {formatCurrency(entry.value as number)}
                              </p>
                            );
                          })}
                        </div>
                        {(income > 0 || expenses > 0 || distributions > 0) && (
                          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                            <p className="text-sm text-green-700 dark:text-green-300">
                              <span className="font-medium">Estimated Income:</span>{' '}
                              {formatCurrency(income)}
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300">
                              <span className="font-medium">Estimated Expenses:</span>{' '}
                              {formatCurrency(expenses)}
                            </p>
                            {distributions > 0 && (
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                <span className="font-medium">Distributions:</span>{' '}
                                {formatCurrency(distributions)}
                              </p>
                            )}
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Net Cash Flow:</span>{' '}
                              <span className={income - expenses + distributions >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                {formatCurrency(income - expenses + distributions)}
                              </span>
                            </p>
                          </div>
                        )}
                        {(loanPayoffs.length > 0 || eventsThisYear.length > 0 || isCashRunsOut || isLiquidAssetsRunOut) && (
                          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Events:</p>
                            <div className="space-y-1">
                              {loanPayoffs.map((payoff) => (
                                <p key={payoff.loanId} className="text-sm text-gray-700 dark:text-gray-300">
                                  <span className="font-medium text-white bg-green-600 dark:bg-green-500 px-1 rounded">Loan Paid Off:</span>{' '}
                                  {payoff.loanName} (Saved {formatCurrency(payoff.paymentAmount)}/year)
                                </p>
                              ))}
                              {eventsThisYear.map((event) => {
                                const eventAsset = event.assetId ? assets.find(a => a.id === event.assetId) : null;
                                return (
                                  <div key={event.id} className="text-sm text-gray-700 dark:text-gray-300">
                                    {event.type === 'liquidation' && eventAsset && (
                                      <p>
                                        <span className="font-medium text-white bg-gray-600 dark:bg-gray-500 px-1 rounded">Liquidation:</span>{' '}
                                        {eventAsset.name} ({formatCurrency(eventAsset.current_value || 0)})
                                      </p>
                                    )}
                                    {event.type === 'windfall' && (
                                      <p>
                                        <span className="font-medium text-white bg-green-600 dark:bg-green-500 px-1 rounded">Windfall:</span>{' '}
                                        {formatCurrency(event.amount || 0)}
                                      </p>
                                    )}
                                    {event.type === 'expense_change' && (
                                      <p>
                                        <span className="font-medium text-white bg-orange-600 dark:bg-orange-500 px-1 rounded">Expense Change:</span>{' '}
                                        New base: {formatCurrency(event.amount || 0)}/year
                                      </p>
                                    )}
                                    {event.description && (
                                      <p className="text-xs text-muted-foreground ml-2">{event.description}</p>
                                    )}
                                  </div>
                                );
                              })}
                              {isCashRunsOut && (
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  <span className="font-medium text-white bg-red-600 dark:bg-red-500 px-1 rounded">Cash Runs Out</span>
                                </p>
                              )}
                              {isLiquidAssetsRunOut && (
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  <span className="font-medium text-white bg-purple-600 dark:bg-purple-500 px-1 rounded">Liquid Assets Run Out</span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Forecasted Net Worth"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.4}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Available Cash"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Liquid Assets"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
                {/* Event Dots - Green dots for all events (loan payoffs, timeline events, cash runs out, liquid assets run out) */}
                <Line
                  type="monotone"
                  dataKey={(entry: any) => {
                    // Only show value if this point has any event
                    return entry.hasAnyEvent ? entry['Forecasted Net Worth'] : null;
                  }}
                  stroke="none"
                  strokeWidth={0}
                  dot={(props: any) => {
                    const { cx, cy, payload, index } = props;
                    // Only render dot if this point has any event and coordinates are valid numbers
                    if (payload && payload.hasAnyEvent && cx != null && cy != null && !isNaN(cx) && !isNaN(cy)) {
                      return <circle key={`event-dot-${index}`} cx={cx} cy={cy} r={8} fill="#10b981" stroke="#ffffff" strokeWidth={2} />;
                    }
                    // Return an empty group instead of null
                    return <g key={`empty-dot-${index}`} />;
                  }}
                  activeDot={false}
                  legendType="none"
                />
              </ComposedChart>
            </ResponsiveContainer>
            {/* Retirement vertical line overlay - manually drawn due to ReferenceLine issues with ComposedChart */}
            {retirementYearForChart && (
              <div
                ref={lineContainerRef}
                className="absolute inset-0 pointer-events-none"
                style={{ zIndex: 5 }}
              >
                {linePosition.height > 0 && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      left: `${linePosition.x}px`,
                      top: `${linePosition.topOffset}px`,
                      width: '3px',
                      height: `${linePosition.height}px`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <svg
                      width="3"
                      height={linePosition.height}
                      style={{ display: 'block' }}
                    >
                      <line
                        x1="1.5"
                        y1="0"
                        x2="1.5"
                        y2={linePosition.height}
                        stroke="#f59e0b"
                        strokeWidth="3"
                      />
                    </svg>
                    <div
                      className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded shadow-lg whitespace-nowrap"
                      style={{ marginTop: '-4px' }}
                    >
                      Retirement
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Draggable retirement marker overlay */}
            {retirementYearForChart && birthYear && (
              <RetirementMarker
                chartData={chartData}
                retirementYear={retirementYearForChart}
                retirementAge={retirementAge}
                currentAge={new Date().getFullYear() - birthYear}
                forecastAge={forecastAge}
                onRetirementAgeChange={(newAge) => {
                  const clampedAge = Math.max(
                    new Date().getFullYear() - birthYear + 1,
                    Math.min(forecastAge, newAge)
                  );
                  setRetirementAge(clampedAge);
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Breakdown</CardTitle>
          <CardDescription>
            How your net worth components change over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="label" 
                  className="text-xs"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  className="text-xs"
                  tickFormatter={(value) => formatCurrencyAbbreviated(value)}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    // Don't show income/expenses/distributions in the main tooltip list
                    if (name === 'Estimated Income' || name === 'Estimated Expenses' || name === 'Distributions') {
                      return null;
                    }
                    return formatCurrency(value);
                  }}
                  labelStyle={{ color: '#000' }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', zIndex: 50 }}
                  wrapperStyle={{ zIndex: 50 }}
                  labelFormatter={(label) => {
                    const year = parseInt(String(label || ''));
                    if (birthYear && !isNaN(year)) {
                      const age = year - birthYear;
                      return `${year} (Age ${age})`;
                    }
                    return String(label || '');
                  }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    
                    const labelStr = String(label || '');
                    const year = parseInt(labelStr);
                    const dataPoint = chartData.find(p => p.label === labelStr);
                    const income = dataPoint?.['Estimated Income'] ?? 0;
                    const expenses = dataPoint?.['Estimated Expenses'] ?? 0;
                    const distributions = dataPoint?.['Distributions'] ?? 0;
                    const loanPayoffs = dataPoint?.loanPayoffs || [];
                    
                    // Find events for this year
                    const eventsThisYear = timelineEvents.filter(e => e.year === year);
                    const isCashRunsOut = cashRunsOutYear === year;
                    const isLiquidAssetsRunOut = liquidAssetsRunOutYear === year && liquidAssetsRunOutYear !== cashRunsOutYear;
                    
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                        <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                          {birthYear && !isNaN(year) ? `${year} (Age ${year - birthYear})` : labelStr}
                        </p>
                        <div className="space-y-1 mb-2">
                          {payload.map((entry, index) => {
                            // Skip income/expenses/distributions and the event dots line from main list
                            // The event dots line uses a function dataKey, so filter those out
                            const isEventDotLine = typeof entry.dataKey === 'function' || 
                                                   entry.dataKey === undefined ||
                                                   entry.value === null;
                            
                            if (entry.dataKey === 'Estimated Income' || 
                                entry.dataKey === 'Estimated Expenses' || 
                                entry.dataKey === 'Distributions' ||
                                isEventDotLine) {
                              return null;
                            }
                            return (
                              <p key={index} className="text-sm" style={{ color: entry.color }}>
                                <span className="font-medium">{entry.name}:</span>{' '}
                                {formatCurrency(entry.value as number)}
                              </p>
                            );
                          })}
                        </div>
                        {(income > 0 || expenses > 0 || distributions > 0) && (
                          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                            <p className="text-sm text-green-700 dark:text-green-300">
                              <span className="font-medium">Estimated Income:</span>{' '}
                              {formatCurrency(income)}
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300">
                              <span className="font-medium">Estimated Expenses:</span>{' '}
                              {formatCurrency(expenses)}
                            </p>
                            {distributions > 0 && (
                              <p className="text-sm text-blue-700 dark:text-blue-300">
                                <span className="font-medium">Distributions:</span>{' '}
                                {formatCurrency(distributions)}
                              </p>
                            )}
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium">Net Cash Flow:</span>{' '}
                              <span className={income - expenses + distributions >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                                {formatCurrency(income - expenses + distributions)}
                              </span>
                            </p>
                          </div>
                        )}
                        {(loanPayoffs.length > 0 || eventsThisYear.length > 0 || isCashRunsOut || isLiquidAssetsRunOut) && (
                          <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-semibold mb-1 text-gray-900 dark:text-gray-100">Events:</p>
                            <div className="space-y-1">
                              {loanPayoffs.map((payoff) => (
                                <p key={payoff.loanId} className="text-sm text-gray-700 dark:text-gray-300">
                                  <span className="font-medium text-white bg-green-600 dark:bg-green-500 px-1 rounded">Loan Paid Off:</span>{' '}
                                  {payoff.loanName} (Saved {formatCurrency(payoff.paymentAmount)}/year)
                                </p>
                              ))}
                              {eventsThisYear.map((event) => {
                                const eventAsset = event.assetId ? assets.find(a => a.id === event.assetId) : null;
                                return (
                                  <div key={event.id} className="text-sm text-gray-700 dark:text-gray-300">
                                    {event.type === 'liquidation' && eventAsset && (
                                      <p>
                                        <span className="font-medium text-white bg-gray-600 dark:bg-gray-500 px-1 rounded">Liquidation:</span>{' '}
                                        {eventAsset.name} ({formatCurrency(eventAsset.current_value || 0)})
                                      </p>
                                    )}
                                    {event.type === 'windfall' && (
                                      <p>
                                        <span className="font-medium text-white bg-green-600 dark:bg-green-500 px-1 rounded">Windfall:</span>{' '}
                                        {formatCurrency(event.amount || 0)}
                                      </p>
                                    )}
                                    {event.type === 'expense_change' && (
                                      <p>
                                        <span className="font-medium text-white bg-orange-600 dark:bg-orange-500 px-1 rounded">Expense Change:</span>{' '}
                                        New base: {formatCurrency(event.amount || 0)}/year
                                      </p>
                                    )}
                                    {event.description && (
                                      <p className="text-xs text-muted-foreground ml-2">{event.description}</p>
                                    )}
                                  </div>
                                );
                              })}
                              {isCashRunsOut && (
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  <span className="font-medium text-white bg-red-600 dark:bg-red-500 px-1 rounded">Cash Runs Out</span>
                                </p>
                              )}
                              {isLiquidAssetsRunOut && (
                                <p className="text-sm text-gray-700 dark:text-gray-300">
                                  <span className="font-medium text-white bg-purple-600 dark:bg-purple-500 px-1 rounded">Liquid Assets Run Out</span>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="Cash Accounts" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Non-cash Assets" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="Credit Cards" stroke="#ef4444" strokeWidth={2} />
                <Line type="monotone" dataKey="Loans" stroke="#f59e0b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Event Dialog */}
      <EventDialog
        open={showEventDialog}
        onOpenChange={(open) => {
          setShowEventDialog(open);
          if (!open) {
            setEditingEvent(null);
            setSelectedYearForEvent(null);
          }
        }}
        year={selectedYearForEvent || editingEvent?.year || null}
        event={editingEvent}
        assets={assets}
        birthYear={birthYear}
        onSubmit={handleEventFormSubmit}
        onCancel={() => {
          setShowEventDialog(false);
          setEditingEvent(null);
          setSelectedYearForEvent(null);
        }}
      />
    </div>
  );
}

// Event Dialog Component
interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number | null;
  event: TimelineEvent | null;
  assets: NonCashAsset[];
  birthYear: number | null;
  onSubmit: (eventData: Partial<TimelineEvent>) => void;
  onCancel: () => void;
}

function EventDialog({ open, onOpenChange, year, event, assets, birthYear, onSubmit, onCancel }: EventDialogProps) {
  // Calculate age from year if provided, otherwise use current age or event's age
  const getInitialAge = () => {
    if (event && birthYear) {
      return event.year - birthYear;
    }
    if (year && birthYear) {
      return year - birthYear;
    }
    const currentYear = new Date().getFullYear();
    return birthYear ? currentYear - birthYear + 1 : 30; // Default to current age + 1 or 30
  };
  
  const [eventType, setEventType] = useState<'liquidation' | 'windfall' | 'expense_change'>(
    event?.type || 'windfall'
  );
  const [selectedAssetId, setSelectedAssetId] = useState<number | undefined>(event?.assetId);
  const [amount, setAmount] = useState<string>(event?.amount?.toString() || '');
  const [description, setDescription] = useState<string>(event?.description || '');
  const [eventAge, setEventAge] = useState<string>(getInitialAge().toString());

  // Reset form when dialog opens/closes or event changes
  useEffect(() => {
    if (open) {
      setEventType(event?.type || 'windfall');
      setSelectedAssetId(event?.assetId);
      setAmount(event?.amount?.toString() || '');
      setDescription(event?.description || '');
      // Calculate age from year if provided, otherwise use current age or event's age
      let initialAge: number;
      if (event && birthYear) {
        initialAge = event.year - birthYear;
      } else if (year && birthYear) {
        initialAge = year - birthYear;
      } else {
        const currentYear = new Date().getFullYear();
        initialAge = birthYear ? currentYear - birthYear + 1 : 30;
      }
      setEventAge(initialAge.toString());
    }
  }, [open, event, year, birthYear]);

  const illiquidAssets = assets.filter(a => !a.is_liquid);

  const handleSubmit = () => {
    if (!birthYear) {
      toast.error('Birth year is required to calculate event year');
      return;
    }
    
    const ageNum = parseInt(eventAge);
    if (!ageNum || ageNum < 1 || ageNum > 150) {
      toast.error('Please enter a valid age');
      return;
    }
    
    const yearNum = birthYear + ageNum;
    const currentYear = new Date().getFullYear();
    const currentAge = currentYear - birthYear;
    
    if (yearNum < currentYear) {
      toast.error(`Age ${ageNum} corresponds to year ${yearNum}, which is in the past. Please select age ${currentAge + 1} or higher.`);
      return;
    }

    if (eventType === 'liquidation') {
      if (!selectedAssetId) {
        toast.error('Please select an asset to liquidate');
        return;
      }
      onSubmit({
        type: 'liquidation',
        year: yearNum,
        assetId: selectedAssetId,
        description: description || undefined,
      });
    } else if (eventType === 'windfall') {
      const amountNum = parseFloat(amount);
      if (!amountNum || amountNum <= 0) {
        toast.error('Please enter a valid windfall amount');
        return;
      }
      onSubmit({
        type: 'windfall',
        year: yearNum,
        amount: amountNum,
        description: description || undefined,
      });
    } else if (eventType === 'expense_change') {
      const amountNum = parseFloat(amount);
      if (!amountNum || amountNum < 0) {
        toast.error('Please enter a valid expense amount');
        return;
      }
      onSubmit({
        type: 'expense_change',
        year: yearNum,
        amount: amountNum,
        description: description || undefined,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{event ? 'Edit Event' : 'Add Timeline Event'}</DialogTitle>
          <DialogDescription>
            {event 
              ? 'Update the details of this timeline event.'
              : 'Add an event to your forecast timeline. Click on a year in the chart to add an event for that specific year.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!birthYear ? (
            <Alert>
              <AlertDescription>
                Please set your birth year in profile settings before adding events.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="event-age">Age</Label>
              <Input
                id="event-age"
                type="number"
                min={birthYear ? new Date().getFullYear() - birthYear + 1 : 1}
                max={birthYear ? birthYear + 100 - birthYear : 150}
                value={eventAge}
                onChange={(e) => setEventAge(e.target.value)}
              />
              {birthYear && eventAge && (
                <p className="text-xs text-muted-foreground">
                  Year {birthYear + parseInt(eventAge) || 0}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="event-type">Event Type</Label>
            <Select value={eventType} onValueChange={(value: 'liquidation' | 'windfall' | 'expense_change') => setEventType(value)}>
              <SelectTrigger id="event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="liquidation">Liquidation (Convert Illiquid Asset to Liquid)</SelectItem>
                <SelectItem value="windfall">Windfall (Inheritance, Gift, etc.)</SelectItem>
                <SelectItem value="expense_change">Expense Change (New Base Expense Amount)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {eventType === 'liquidation' && (
            <div className="space-y-2">
              <Label htmlFor="asset-select">Asset to Liquidate</Label>
              {illiquidAssets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No illiquid assets available. All your assets are already liquid.
                </p>
              ) : (
                <Select value={selectedAssetId?.toString()} onValueChange={(value) => setSelectedAssetId(parseInt(value))}>
                  <SelectTrigger id="asset-select">
                    <SelectValue placeholder="Select an asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {illiquidAssets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id.toString()}>
                        {asset.name} ({formatCurrency(asset.current_value || 0)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {(eventType === 'windfall' || eventType === 'expense_change') && (
            <div className="space-y-2">
              <Label htmlFor="event-amount">
                {eventType === 'windfall' ? 'Windfall Amount' : 'New Annual Expense Amount'}
              </Label>
              <Input
                id="event-amount"
                type="number"
                min="0"
                step="1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={eventType === 'windfall' ? '0.00' : '0.00'}
              />
              <p className="text-xs text-muted-foreground">
                {eventType === 'windfall' 
                  ? 'The amount of liquid assets added to your accounts.'
                  : 'The new base annual expense amount. This will grow with inflation from this year forward.'}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="event-description">Description (Optional)</Label>
            <Input
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Inheritance from parent, Sale of rental property"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!birthYear}>
            {event ? 'Update Event' : 'Add Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
