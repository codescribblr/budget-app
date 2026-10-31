import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';

export async function GET(request: Request) {
  try {
    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account. Please select an account first.' }, { status: 400 });
    }

    const versioned = new URL(request.url).searchParams.get("versioned") === "true";
    const token = versioned ? await supabase.from("budget_resource_versions").select("revision").eq("account_id",accountId).eq("resource","settings").maybeSingle() : null;
    if (token?.error) throw token.error;
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('account_id', accountId);

    if (error) {
      console.error('Error fetching settings:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    // Convert array of settings to object
    const settingsObj: Record<string, string> = {};
    settings?.forEach((setting: any) => {
      settingsObj[setting.key] = setting.value;
    });

    return NextResponse.json(versioned ? { values: settingsObj, revision: token?.data?.revision ?? null, budgetId: accountId } : settingsObj);
  } catch (error) {
    console.error('Error in GET /api/settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();
    
    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account. Please select an account first.' }, { status: 400 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if ("expectedRevision" in body || "expectedBudgetId" in body) {
      if (body.expectedBudgetId !== accountId) return NextResponse.json({error:"The active budget changed. Reload before saving."},{status:409});
      if (body.expectedRevision !== null && (typeof body.expectedRevision !== "string" || !/^[0-9a-f-]{36}$/i.test(body.expectedRevision))) return NextResponse.json({error:"Reload before saving safely."},{status:400});
      const {data, error} = await supabase.rpc("save_guarded_budget_settings", {p_budget_id:accountId,p_revision:body.expectedRevision,p_values:settings});
      if(error) throw error;
      if(data.status !== "saved") return NextResponse.json({error:"These settings changed elsewhere. Reload and review them before saving."},{status:409});
      return NextResponse.json(data);
    }
    // Upsert each setting
    for (const setting of settings) {
      const { error } = await supabase
        .from('settings')
        .upsert({
          account_id: accountId,
          user_id: user.id,
          key: setting.key,
          value: setting.value,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'account_id,user_id,key',
        });

      if (error) {
        console.error('Error upserting setting:', error);
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}


