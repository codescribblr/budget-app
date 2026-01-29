'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatCurrencyAbbreviated } from '@/lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart, ReferenceLine, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Calendar, Info, Sun } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { Account, NonCashAsset, Loan, CreditCard, Category } from '@/lib/types';
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
}

export default function ForecastPage() {
  const [snapshots, setSnapshots] = useState<NetWorthSnapshot[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assets, setAssets] = useState<NonCashAsset[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
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
  const [distributionAmount, setDistributionAmount] = useState(0); // Initial annual distribution amount
  const [distributionIncreaseRate, setDistributionIncreaseRate] = useState(0); // Annual increase percentage
  const [distributionType, setDistributionType] = useState<'amount' | 'percentage'>('amount'); // Distribution type
  const [rmdAge, setRmdAge] = useState(73); // Required Minimum Distribution age (default 73 as of 2023)
  const [forecastSettingsLoaded, setForecastSettingsLoaded] = useState(false);
  
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
    distribution_amount: number;
    distribution_increase_rate: number;
    distribution_type: 'amount' | 'percentage';
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
        distribution_amount: distributionAmount,
        distribution_increase_rate: distributionIncreaseRate,
        distribution_type: distributionType,
        rmd_age: rmdAge,
      });
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [forecastAge, incomeGrowthRate, savingsRate, retirementSavingsRate, retirementAge, socialSecurityStartAge, socialSecurityBenefitLevel, otherRetirementIncome, inflationRate, distributionAmount, distributionIncreaseRate, distributionType, rmdAge, forecastSettingsLoaded, saveForecastSettings]);

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
      const [snapshotsRes, accountsRes, assetsRes, loansRes, creditCardsRes, categoriesRes, settingsRes] = await Promise.all([
        fetch('/api/net-worth-snapshots'),
        fetch('/api/accounts'),
        fetch('/api/non-cash-assets'),
        fetch('/api/loans'),
        fetch('/api/credit-cards'),
        fetch('/api/categories'),
        fetch('/api/settings'),
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
        if (forecastSettingsData.distribution_amount !== undefined) {
          setDistributionAmount(forecastSettingsData.distribution_amount);
        }
        if (forecastSettingsData.distribution_increase_rate !== undefined) {
          setDistributionIncreaseRate(forecastSettingsData.distribution_increase_rate);
        }
        if (forecastSettingsData.distribution_type) {
          setDistributionType(forecastSettingsData.distribution_type);
        }
        if (forecastSettingsData.rmd_age !== undefined) {
          setRmdAge(forecastSettingsData.rmd_age);
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

  // Calculate social security benefit amount
  // Calculate base Social Security benefit (at full retirement age of 67)
  const calculateBaseSocialSecurityBenefit = useMemo(() => {
    if (!settings.annual_income) return 0;
    
    const annualIncome = parseFloat(settings.annual_income || '0');
    if (!annualIncome) return 0;
    
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
  }, [settings.annual_income, socialSecurityBenefitLevel]);

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

  // Calculate monthly net income from settings
  const monthlyNetIncome = useMemo(() => {
    const annualIncome = parseFloat(settings.annual_income || '0');
    const taxRate = parseFloat(settings.tax_rate || '0');
    
    if (!annualIncome) return 0;
    
    // Calculate monthly net income
    const monthlyGross = annualIncome / 12;
    const monthlyTaxes = (annualIncome * taxRate) / 12;
    
    // Handle pre-tax deductions if available
    let preTaxDeductions = 0;
    if (settings.pre_tax_deduction_items) {
      try {
        const items = JSON.parse(settings.pre_tax_deduction_items);
        const payFrequency = settings.pay_frequency || 'monthly';
        const includeExtra = settings.include_extra_paychecks === 'true';
        
        // Calculate paychecks per month
        let paychecksPerMonth = 1;
        switch (payFrequency) {
          case 'weekly':
            paychecksPerMonth = 52 / 12;
            break;
          case 'bi-weekly':
            paychecksPerMonth = includeExtra ? 26 / 12 : 24 / 12;
            break;
          case 'semi-monthly':
            paychecksPerMonth = 2;
            break;
          case 'monthly':
            paychecksPerMonth = 1;
            break;
        }
        
        items.forEach((item: any) => {
          if (item.type === 'percentage') {
            preTaxDeductions += (annualIncome * item.value / 100) / 12;
          } else {
            preTaxDeductions += item.value * paychecksPerMonth;
          }
        });
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    return monthlyGross - preTaxDeductions - monthlyTaxes;
  }, [settings]);

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
    const startYear = today.getFullYear();
    
    // Get historical data (last 2 years or all available)
    const historicalSnapshots = snapshots
      .filter(s => {
        const snapshotDate = new Date(s.snapshot_date);
        const twoYearsAgo = new Date(today);
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        return snapshotDate >= twoYearsAgo;
      })
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date));

    // Calculate current liquid assets for historical approximation
    const currentLiquidAssetsForHistorical = assets
      .filter(asset => asset.is_liquid !== false)
      .reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);
    const currentTotalAssetsForHistorical = assets.reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);
    const liquidAssetRatio = currentTotalAssetsForHistorical > 0 ? currentLiquidAssetsForHistorical / currentTotalAssetsForHistorical : 1;

    // Add historical data points
    historicalSnapshots.forEach(snapshot => {
      const date = new Date(snapshot.snapshot_date);
      // Estimate liquid assets from historical snapshot using current asset ratio
      const estimatedLiquidAssets = snapshot.total_assets * liquidAssetRatio;
      data.push({
        date: snapshot.snapshot_date,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        historical: snapshot.net_worth,
        forecast: null,
        accounts: snapshot.total_accounts,
        assets: snapshot.total_assets,
        liquidAssets: estimatedLiquidAssets,
        creditCards: snapshot.total_credit_cards,
        loans: snapshot.total_loans,
        netWorth: snapshot.net_worth,
        availableCash: snapshot.total_accounts, // Available cash is accounts balance
        distributionAmount: 0,
        rmdAmount: 0,
        distributionStartYear: null,
        cashRunsOutYear: null,
        rmdStartYear: null,
        estimatedIncome: 0, // Historical data doesn't have income/expense breakdown
        estimatedExpenses: 0,
      });
    });

    // Calculate current values
    const currentAccounts = accounts
      .filter(acc => acc.include_in_totals === true)
      .reduce((sum, acc) => sum + Number(acc.balance || 0), 0);
    
    const currentAssets = assets.reduce((sum, asset) => sum + Number(asset.current_value || 0), 0);
    const currentCreditCards = creditCards.reduce((sum, cc) => sum + Number(cc.current_balance || 0), 0);
    const currentLoans = loans
      .filter(loan => loan.include_in_net_worth === true)
      .reduce((sum, loan) => sum + Number(loan.balance || 0), 0);

    // Calculate loan paydown schedules
    const loanSchedules = loans
      .filter(loan => loan.include_in_net_worth === true)
      .map(loan => ({
        loan,
        schedule: calculateLoanPaydown(loan, forecastYears),
      }));


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
    let currentDistributionAmount = distributionAmount;
    let yearsSinceDistributionStart = 0;
    const distributionIncreaseDecimal = distributionIncreaseRate / 100;
    const rmdYear = birthYear ? birthYear + rmdAge : null;
    // Minimum age to take distributions from RMD accounts without penalty (59.5)
    const minDistributionAge = 59.5;
    const minDistributionYear = birthYear ? birthYear + minDistributionAge : null;

    for (let yearOffset = 1; yearOffset <= forecastYears; yearOffset++) {
      const forecastYear = startYear + yearOffset;
      const forecastDate = new Date(forecastYear, 0, 1);
      const yearAge = birthYear ? forecastYear - birthYear : null;
      const isYearRetired = retirementYear ? forecastYear >= retirementYear : false;
      
      // Apply inflation to annual expenses
      annualExpenses = currentAnnualExpenses * Math.pow(1 + inflationDecimal, yearOffset);
      
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
        if (yearOffset > 1 || (retirementYear && forecastYear > retirementYear)) {
          // Apply growth only to other retirement income
          otherRetirementIncomeValue *= (1 + incomeGrowthDecimal);
        }
        annualRetirementIncome += otherRetirementIncomeValue;
        
        forecastIncome = annualRetirementIncome;
        // Calculate net cash flow after expenses
        const netCashFlow = forecastIncome - annualExpenses;
        // Handle cash flow: if positive, apply savings rate; if negative, subtract full shortfall
        if (netCashFlow >= 0) {
          // Positive cash flow: apply retirement savings rate
          const annualSavings = netCashFlow * retirementSavingsRateDecimal;
          forecastAccounts += annualSavings;
        } else {
          // Negative cash flow: subtract full shortfall from accounts (spending down savings)
          forecastAccounts += netCashFlow; // netCashFlow is negative, so this subtracts
        }
      } else {
        // Before retirement: grow work income (no retirement income yet)
        forecastIncome *= (1 + incomeGrowthDecimal);
        // Calculate net cash flow after expenses
        const netCashFlow = forecastIncome - annualExpenses;
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
      
      // Grow assets based on their return percentages (before distributions)
      assetValues = assetValues.map(asset => ({
        ...asset,
        value: asset.value * (1 + asset.returnRate),
      }));
      
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
      
      // Calculate user-selected distribution amount (from liquid assets only for cash flow)
      let userDistributionAmount = 0;
      if (distributionAmount > 0) {
        if (distributionType === 'percentage') {
          // Percentage of current liquid asset value (for cash flow distributions)
          userDistributionAmount = forecastLiquidAssets * (distributionAmount / 100);
        } else {
          // Fixed amount, increased by annual rate if distributions have started
          if (yearsSinceDistributionStart > 0) {
            userDistributionAmount = distributionAmount * Math.pow(1 + distributionIncreaseDecimal, yearsSinceDistributionStart);
          } else {
            userDistributionAmount = distributionAmount;
          }
        }
      }
      
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
      // Distributions only start when cash would hit 0 or go negative (cashFlowNeeded)
      // OR when RMD is legally required
      let totalDistributionNeeded = 0;
      if (cashFlowNeeded) {
        // Need to cover shortfall - this is critical for solvency
        // Use the higher of: shortfall needed OR user-selected distribution amount
        totalDistributionNeeded = Math.max(shortfall, userDistributionAmount);
        // Ensure RMD is met if required (and RMD age reached)
        if (isRmdRequired) {
          totalDistributionNeeded = Math.max(totalDistributionNeeded, rmdDistributionThisYear);
        }
      } else if (isRmdRequired) {
        // RMD required (age reached), use higher of user distribution or RMD
        totalDistributionNeeded = Math.max(userDistributionAmount, rmdDistributionThisYear);
      }
      // Note: We don't apply user-set distributions proactively when cash flow is positive
      // They will be applied automatically when cash hits 0
      
      // Calculate how much to take from each asset category
      let fromLiquidNonRmd = 0;
      let fromLiquidRmd = 0;
      let fromIlliquidRmd = 0;
      
      if (totalDistributionNeeded > 0) {
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
      forecastLoans = loanSchedules.reduce((sum, { schedule }) => {
        const yearBalance = schedule[yearOffset - 1];
        return sum + (yearBalance !== undefined ? yearBalance : 0);
      }, 0);
      
      // Assume credit cards stay constant (or user pays them off)
      // For simplicity, we'll assume they're paid off over time
      forecastCreditCards = Math.max(0, currentCreditCards * (1 - yearOffset / forecastYears));
      
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
      });
    }

    return data;
  }, [snapshots, accounts, assets, loans, creditCards, forecastYears, incomeGrowthRate, savingsRate, retirementSavingsRate, monthlyNetIncome, monthlyBudget, inflationRate, birthYear, retirementAge, socialSecurityStartAge, calculateSocialSecurityBenefit, otherRetirementIncome, distributionAmount, distributionIncreaseRate, distributionType, rmdAge, calculateRMD]);

  // Calculate minimum distribution needed to keep cash above 0
  const minimumDistributionNeeded = useMemo(() => {
    if (forecastData.length === 0 || assets.length === 0 || !monthlyBudget || monthlyBudget === 0) return null;
    
    // Find the first year where cash would go negative without distributions
    // We'll simulate a quick forecast to find when cash runs out
    const today = new Date();
    const startYear = today.getFullYear();
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
    
    for (let yearOffset = 1; yearOffset <= forecastYears; yearOffset++) {
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
    return forecastData.map(point => ({
      date: point.year.toString(),
      label: point.year.toString(),
      'Historical Net Worth': point.historical,
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
      isRetirementYear: retirementYearForChart ? point.year === retirementYearForChart : false,
    }));
  }, [forecastData, retirementYearForChart]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const lastHistorical = forecastData.findLast(p => p.historical !== null);
    const lastForecast = forecastData[forecastData.length - 1];
    
    if (!lastForecast) return null;
    
    const netWorthChange = lastForecast.netWorth - (lastHistorical?.netWorth || currentNetWorth);
    const netWorthChangePercent = lastHistorical?.netWorth 
      ? ((netWorthChange / lastHistorical.netWorth) * 100)
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
          <Sun className="h-8 w-8 text-primary" />
          Net Worth Forecast
        </h1>
        <p className="text-muted-foreground mt-1">
          Project your financial future based on your assets, loans, and income growth
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

      {/* Forecast Parameters */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast Parameters</CardTitle>
          <CardDescription>Adjust these settings to see how different scenarios affect your net worth</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <strong>Recommended Distribution:</strong>
                </p>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <p>
                    To keep cash above $0, you'll need at least{' '}
                    <strong>{formatCurrency(minimumDistributionNeeded.minimumAmount)}</strong> per year starting in {minimumDistributionNeeded.year}
                    {birthYear && (
                      <span> (Age {minimumDistributionNeeded.year - birthYear})</span>
                    )}
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
            <div className={`grid gap-4 ${distributionType === 'amount' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
              <div className="space-y-2">
                <Label htmlFor="distribution-type">Distribution Type</Label>
                <Select 
                  value={distributionType} 
                  onValueChange={(value: 'amount' | 'percentage') => setDistributionType(value)}
                >
                  <SelectTrigger id="distribution-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">Fixed Amount</SelectItem>
                    <SelectItem value="percentage">Percentage of Assets</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="distribution-amount">
                  {distributionType === 'amount' ? 'Annual Distribution ($)' : 'Distribution Rate (%)'}
                </Label>
                <Input
                  id="distribution-amount"
                  type="number"
                  step={distributionType === 'amount' ? '1000' : '0.1'}
                  min="0"
                  value={distributionAmount}
                  onChange={(e) => {
                    const amount = Math.max(0, parseFloat(e.target.value) || 0);
                    setDistributionAmount(amount);
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {distributionType === 'amount' 
                    ? minimumDistributionNeeded 
                      ? `Minimum recommended: ${formatCurrency(minimumDistributionNeeded.minimumAmount)}`
                      : 'Fixed annual amount to distribute'
                    : minimumDistributionNeeded
                      ? `Minimum recommended: ${minimumDistributionNeeded.minimumPercentage.toFixed(2)}%`
                      : 'Percentage of total assets to distribute annually'}
                </p>
              </div>
              {distributionType === 'amount' && (
                <div className="space-y-2">
                  <Label htmlFor="distribution-increase">Annual Increase Rate (%)</Label>
                  <Input
                    id="distribution-increase"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={distributionIncreaseRate}
                    onChange={(e) => {
                      const rate = Math.max(0, Math.min(50, parseFloat(e.target.value) || 0));
                      setDistributionIncreaseRate(rate);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Annual increase in distribution amount
                  </p>
                </div>
              )}
            </div>
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
        </CardContent>
      </Card>

      {/* Main Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Forecast</CardTitle>
          <CardDescription>
            Historical data and projected future net worth based on your current financial situation
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
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                  labelFormatter={(label) => {
                    const year = parseInt(label);
                    if (birthYear && !isNaN(year)) {
                      const age = year - birthYear;
                      return `${year} (Age ${age})`;
                    }
                    return label;
                  }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    
                    const year = parseInt(label);
                    const dataPoint = chartData.find(p => p.label === label);
                    const income = dataPoint?.['Estimated Income'] ?? 0;
                    const expenses = dataPoint?.['Estimated Expenses'] ?? 0;
                    const distributions = dataPoint?.['Distributions'] ?? 0;
                    
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                        <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                          {birthYear && !isNaN(year) ? `${year} (Age ${year - birthYear})` : label}
                        </p>
                        <div className="space-y-1 mb-2">
                          {payload.map((entry, index) => {
                            // Skip income/expenses/distributions from main list
                            if (entry.dataKey === 'Estimated Income' || entry.dataKey === 'Estimated Expenses' || entry.dataKey === 'Distributions') {
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
                      </div>
                    );
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Historical Net Worth"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Forecasted Net Worth"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.4}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="Available Cash"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="Liquid Assets"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                  strokeDasharray="5 5"
                />
                {retirementYearForChart && (
                  <ReferenceLine 
                    x={retirementYearForChart.toString()} 
                    stroke="#f59e0b" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{ value: "Retirement", position: "top", fill: "#f59e0b", fontSize: 12 }}
                  />
                )}
                {cashRunsOutYear && (
                  <ReferenceLine 
                    x={cashRunsOutYear.toString()} 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ value: "Cash Runs Out", position: "top", fill: "#ef4444", fontSize: 12 }}
                  />
                )}
                {liquidAssetsRunOutYear && liquidAssetsRunOutYear !== cashRunsOutYear && (
                  <ReferenceLine 
                    x={liquidAssetsRunOutYear.toString()} 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ value: "Liquid Assets Run Out", position: "top", fill: "#8b5cf6", fontSize: 12 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
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
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                  labelFormatter={(label) => {
                    const year = parseInt(label);
                    if (birthYear && !isNaN(year)) {
                      const age = year - birthYear;
                      return `${year} (Age ${age})`;
                    }
                    return label;
                  }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    
                    const year = parseInt(label);
                    const dataPoint = chartData.find(p => p.label === label);
                    const income = dataPoint?.['Estimated Income'] ?? 0;
                    const expenses = dataPoint?.['Estimated Expenses'] ?? 0;
                    const distributions = dataPoint?.['Distributions'] ?? 0;
                    
                    return (
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
                        <p className="font-semibold mb-2 text-gray-900 dark:text-gray-100">
                          {birthYear && !isNaN(year) ? `${year} (Age ${year - birthYear})` : label}
                        </p>
                        <div className="space-y-1 mb-2">
                          {payload.map((entry, index) => {
                            // Skip income/expenses/distributions from main list
                            if (entry.dataKey === 'Estimated Income' || entry.dataKey === 'Estimated Expenses' || entry.dataKey === 'Distributions') {
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

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> This forecast is based on assumptions and historical trends. 
          Actual results may vary based on market conditions, unexpected expenses, and changes 
          in your financial situation. Asset growth assumes consistent returns, loans are paid 
          according to minimum payments, and income grows at the specified rate.
        </AlertDescription>
      </Alert>
    </div>
  );
}
