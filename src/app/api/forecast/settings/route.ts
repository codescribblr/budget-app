import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';

interface ForecastSettings {
  forecast_age?: number;
  income_growth_rate?: number;
  savings_rate?: number;
  retirement_savings_rate?: number;
  repeatable_events?: Array<{
    id: string;
    name: string;
    type: 'income' | 'expense' | 'asset_change' | 'debt_payoff';
    amount: number;
    start_year: number;
    end_year?: number;
    frequency: 'one_time' | 'annual' | 'monthly';
    description?: string;
  }>;
  timeline_events?: Array<{
    id: string;
    type: 'liquidation' | 'windfall' | 'expense_change' | 'one_time_expense';
    year: number;
    assetId?: number;
    amount?: number;
    description?: string;
  }>;
  retirement_age?: number;
  social_security_start_age?: number; // Age when Social Security benefits begin (default 67)
  social_security_benefit_level?: 'full' | 'half' | 'none';
  other_retirement_income?: number; // Annual amount
  distribution_amount?: number; // Annual distribution amount or percentage
  distribution_increase_rate?: number; // Annual increase percentage for distributions
  distribution_type?: 'amount' | 'percentage'; // Whether distribution is fixed amount or percentage of assets
  rmd_age?: number; // Required Minimum Distribution age (default 73)
  [key: string]: any; // Allow for future expansion
}

const DEFAULT_SETTINGS: ForecastSettings = {
  forecast_age: 90,
  income_growth_rate: 3,
  savings_rate: 20,
  retirement_savings_rate: 0, // Default 0% savings rate after retirement
  repeatable_events: [],
  timeline_events: [],
  retirement_age: 67, // Default retirement age
  social_security_start_age: 67, // Default Social Security start age (full retirement age)
  social_security_benefit_level: 'full',
  other_retirement_income: 0,
  inflation_rate: 4, // Default 4% annual inflation
  distribution_amount: 0, // Default no distributions
  distribution_increase_rate: 0, // Default no annual increase
  distribution_type: 'amount', // Default to fixed amount
  rmd_age: 73, // Default RMD age (73 as of 2023)
};

export async function GET() {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    
    const { data: settings, error } = await supabase
      .from('forecast_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching forecast settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch forecast settings' },
        { status: 500 }
      );
    }

    // Return settings or defaults if not found
    const userSettings = settings?.settings || DEFAULT_SETTINGS;
    
    // Merge with defaults to ensure all fields exist
    const mergedSettings: ForecastSettings = {
      ...DEFAULT_SETTINGS,
      ...userSettings,
    };

    return NextResponse.json(mergedSettings);
  } catch (error: any) {
    console.error('Error in GET /api/forecast/settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch forecast settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    const body = await request.json();
    const { settings: newSettings } = body;

    if (!newSettings || typeof newSettings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid settings format' },
        { status: 400 }
      );
    }

    // Validate key settings
    if (newSettings.forecast_age !== undefined) {
      if (typeof newSettings.forecast_age !== 'number' || newSettings.forecast_age < 1 || newSettings.forecast_age > 150) {
        return NextResponse.json(
          { error: 'Forecast age must be between 1 and 150' },
          { status: 400 }
        );
      }
    }

    if (newSettings.income_growth_rate !== undefined) {
      if (typeof newSettings.income_growth_rate !== 'number' || newSettings.income_growth_rate < 0 || newSettings.income_growth_rate > 100) {
        return NextResponse.json(
          { error: 'Income growth rate must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    if (newSettings.savings_rate !== undefined) {
      if (typeof newSettings.savings_rate !== 'number' || newSettings.savings_rate < 0 || newSettings.savings_rate > 100) {
        return NextResponse.json(
          { error: 'Savings rate must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    if (newSettings.retirement_savings_rate !== undefined) {
      if (typeof newSettings.retirement_savings_rate !== 'number' || newSettings.retirement_savings_rate < 0 || newSettings.retirement_savings_rate > 100) {
        return NextResponse.json(
          { error: 'Retirement savings rate must be between 0 and 100' },
          { status: 400 }
        );
      }
    }

    if (newSettings.retirement_age !== undefined) {
      if (typeof newSettings.retirement_age !== 'number' || newSettings.retirement_age < 1 || newSettings.retirement_age > 100) {
        return NextResponse.json(
          { error: 'Retirement age must be between 1 and 100' },
          { status: 400 }
        );
      }
    }

    if (newSettings.social_security_start_age !== undefined) {
      if (typeof newSettings.social_security_start_age !== 'number' || newSettings.social_security_start_age < 62 || newSettings.social_security_start_age > 70) {
        return NextResponse.json(
          { error: 'Social Security start age must be between 62 and 70' },
          { status: 400 }
        );
      }
    }

    if (newSettings.social_security_benefit_level !== undefined) {
      if (!['full', 'half', 'none'].includes(newSettings.social_security_benefit_level)) {
        return NextResponse.json(
          { error: 'Social security benefit level must be full, half, or none' },
          { status: 400 }
        );
      }
    }

    if (newSettings.other_retirement_income !== undefined) {
      if (typeof newSettings.other_retirement_income !== 'number' || newSettings.other_retirement_income < 0) {
        return NextResponse.json(
          { error: 'Other retirement income must be a positive number' },
          { status: 400 }
        );
      }
    }

    if (newSettings.inflation_rate !== undefined) {
      if (typeof newSettings.inflation_rate !== 'number' || newSettings.inflation_rate < 0 || newSettings.inflation_rate > 50) {
        return NextResponse.json(
          { error: 'Inflation rate must be between 0 and 50' },
          { status: 400 }
        );
      }
    }

    if (newSettings.distribution_amount !== undefined) {
      if (typeof newSettings.distribution_amount !== 'number' || newSettings.distribution_amount < 0) {
        return NextResponse.json(
          { error: 'Distribution amount must be a positive number' },
          { status: 400 }
        );
      }
    }

    if (newSettings.distribution_increase_rate !== undefined) {
      if (typeof newSettings.distribution_increase_rate !== 'number' || newSettings.distribution_increase_rate < 0 || newSettings.distribution_increase_rate > 50) {
        return NextResponse.json(
          { error: 'Distribution increase rate must be between 0 and 50' },
          { status: 400 }
        );
      }
    }

    if (newSettings.distribution_type !== undefined) {
      if (!['amount', 'percentage'].includes(newSettings.distribution_type)) {
        return NextResponse.json(
          { error: 'Distribution type must be "amount" or "percentage"' },
          { status: 400 }
        );
      }
    }

    if (newSettings.rmd_age !== undefined) {
      if (typeof newSettings.rmd_age !== 'number' || newSettings.rmd_age < 70 || newSettings.rmd_age > 75) {
        return NextResponse.json(
          { error: 'RMD age must be between 70 and 75' },
          { status: 400 }
        );
      }
    }

    // Get existing settings to merge
    const { data: existing } = await supabase
      .from('forecast_settings')
      .select('settings')
      .eq('user_id', user.id)
      .single();

    const currentSettings = existing?.settings || DEFAULT_SETTINGS;
    
    // Merge new settings with existing (new settings take precedence)
    const mergedSettings: ForecastSettings = {
      ...currentSettings,
      ...newSettings,
    };

    // Upsert forecast settings
    const { data: updatedSettings, error } = await supabase
      .from('forecast_settings')
      .upsert({
        user_id: user.id,
        settings: mergedSettings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      })
      .select('settings')
      .single();

    if (error) {
      console.error('Error updating forecast settings:', error);
      return NextResponse.json(
        { error: 'Failed to update forecast settings' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedSettings?.settings || mergedSettings);
  } catch (error: any) {
    console.error('Error in PATCH /api/forecast/settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update forecast settings' },
      { status: 500 }
    );
  }
}
