import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/import/templates/[id]/usage
 * Update template usage count and last_used timestamp
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    // Increment usage count and update last_used
    const { error } = await supabase.rpc('increment_template_usage', {
      template_id: templateId,
      user_uuid: user.id,
    });

    // If RPC function doesn't exist, use a direct update
    if (error && error.message.includes('function') && error.message.includes('does not exist')) {
      const { data: template, error: fetchError } = await supabase
        .from('csv_import_templates')
        .select('usage_count')
        .eq('id', templateId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('csv_import_templates')
        .update({
          usage_count: (template?.usage_count || 0) + 1,
          last_used: new Date().toISOString(),
        })
        .eq('id', templateId)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
    } else if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating template usage:', error);
    return NextResponse.json(
      { error: 'Failed to update template usage', message: error.message },
      { status: 500 }
    );
  }
}


