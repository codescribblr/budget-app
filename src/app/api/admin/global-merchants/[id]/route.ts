import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/global-merchants/[id]
 * Get a single global merchant with its patterns (admin only)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { id } = await params;
    const merchantId = parseInt(id);
    
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { error: 'Invalid merchant ID' },
        { status: 400 }
      );
    }
    
    // Get merchant
    const { data: merchant, error: merchantError } = await supabase
      .from('global_merchants')
      .select('*')
      .eq('id', merchantId)
      .single();
    
    if (merchantError) throw merchantError;
    if (!merchant) {
      return NextResponse.json(
        { error: 'Merchant not found' },
        { status: 404 }
      );
    }
    
    // Get patterns for this merchant
    const { data: patterns, error: patternsError } = await supabase
      .from('global_merchant_patterns')
      .select('*')
      .eq('global_merchant_id', merchantId)
      .order('usage_count', { ascending: false });
    
    if (patternsError) throw patternsError;
    
    return NextResponse.json({
      merchant,
      patterns: patterns || [],
    });
  } catch (error: any) {
    console.error('Error fetching global merchant:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to fetch global merchant' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/global-merchants/[id]
 * Update a global merchant (admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { id } = await params;
    const merchantId = parseInt(id);
    const body = await request.json();
    
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { error: 'Invalid merchant ID' },
        { status: 400 }
      );
    }
    
    const updateData: any = {};
    if (body.display_name !== undefined) {
      updateData.display_name = body.display_name.trim();
    }
    if (body.status !== undefined) {
      updateData.status = body.status === 'active' ? 'active' : 'draft';
    }
    if (body.logo_url !== undefined) {
      updateData.logo_url = body.logo_url || null;
      // If setting logo_url, clear icon_name (they're mutually exclusive)
      if (body.logo_url) {
        updateData.icon_name = null;
      }
    }
    if (body.icon_name !== undefined) {
      updateData.icon_name = body.icon_name || null;
      // If setting icon_name, clear logo_url (they're mutually exclusive)
      if (body.icon_name) {
        updateData.logo_url = null;
      }
    }
    
    const { data, error } = await supabase
      .from('global_merchants')
      .update(updateData)
      .eq('id', merchantId)
      .select()
      .single();
    
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A merchant with this name already exists' },
          { status: 400 }
        );
      }
      throw error;
    }
    
    return NextResponse.json({ merchant: data });
  } catch (error: any) {
    console.error('Error updating global merchant:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to update global merchant' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/global-merchants/[id]
 * Delete a global merchant (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const supabase = await createClient();
    const { id } = await params;
    const merchantId = parseInt(id);
    
    if (isNaN(merchantId)) {
      return NextResponse.json(
        { error: 'Invalid merchant ID' },
        { status: 400 }
      );
    }
    
    // Delete merchant (patterns will be unlinked due to ON DELETE SET NULL)
    const { error } = await supabase
      .from('global_merchants')
      .delete()
      .eq('id', merchantId);
    
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting global merchant:', error);
    if (error.message === 'Unauthorized: Admin access required') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to delete global merchant' },
      { status: 500 }
    );
  }
}
