import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-queries';
import { getActiveAccountId } from '@/lib/account-context';
import { checkWriteAccess } from '@/lib/api-helpers';

/**
 * GET /api/automatic-imports/setups/[id]
 * Get a specific import setup
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { id } = await params;
    const setupId = parseInt(id);

    if (isNaN(setupId)) {
      return NextResponse.json({ error: 'Invalid setup ID' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('automatic_import_setups')
      .select('*')
      .eq('id', setupId)
      .eq('account_id', accountId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Import setup not found' }, { status: 404 });
      }
      console.error('Error fetching import setup:', error);
      return NextResponse.json({ error: 'Failed to fetch import setup' }, { status: 500 });
    }

    return NextResponse.json({ setup: data });
  } catch (error: any) {
    console.error('Error in GET /api/automatic-imports/setups/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch import setup' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/automatic-imports/setups/[id]
 * Update an import setup
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { id } = await params;
    const setupId = parseInt(id);

    if (isNaN(setupId)) {
      return NextResponse.json({ error: 'Invalid setup ID' }, { status: 400 });
    }

    const body = await request.json();
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    // Allow updating these fields
    if (body.target_account_id !== undefined) updateData.target_account_id = body.target_account_id;
    if (body.target_credit_card_id !== undefined) updateData.target_credit_card_id = body.target_credit_card_id;
    if (body.is_historical !== undefined) updateData.is_historical = body.is_historical;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.source_config !== undefined) updateData.source_config = body.source_config;
    if (body.integration_name !== undefined) updateData.integration_name = body.integration_name;
    if (body.bank_name !== undefined) updateData.bank_name = body.bank_name;
    if (body.account_numbers !== undefined) updateData.account_numbers = body.account_numbers;

    const { data, error } = await supabase
      .from('automatic_import_setups')
      .update(updateData)
      .eq('id', setupId)
      .eq('account_id', accountId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Import setup not found' }, { status: 404 });
      }
      console.error('Error updating import setup:', error);
      return NextResponse.json({ error: 'Failed to update import setup' }, { status: 500 });
    }

    return NextResponse.json({ setup: data });
  } catch (error: any) {
    console.error('Error in PUT /api/automatic-imports/setups/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update import setup' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/automatic-imports/setups/[id]
 * Delete an import setup
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { supabase } = await getAuthenticatedUser();
    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const { id } = await params;
    const setupId = parseInt(id);

    if (isNaN(setupId)) {
      return NextResponse.json({ error: 'Invalid setup ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('automatic_import_setups')
      .delete()
      .eq('id', setupId)
      .eq('account_id', accountId);

    if (error) {
      console.error('Error deleting import setup:', error);
      return NextResponse.json({ error: 'Failed to delete import setup' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/automatic-imports/setups/[id]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete import setup' },
      { status: 500 }
    );
  }
}
