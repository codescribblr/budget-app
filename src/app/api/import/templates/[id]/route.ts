import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CSVImportTemplate, ColumnMapping } from '@/lib/mapping-templates';

/**
 * PUT /api/import/templates/[id]
 * Update a CSV import template
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { id } = await params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const body = await request.json() as { templateName?: string; mapping?: ColumnMapping };
    const { templateName, mapping } = body;

    // Verify template belongs to user
    const { data: existingTemplate, error: fetchError } = await supabase
      .from('csv_import_templates')
      .select('id')
      .eq('id', templateId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Build update object
    const updateData: any = {};
    if (templateName !== undefined) {
      updateData.template_name = templateName;
    }
    if (mapping) {
      updateData.date_column = mapping.dateColumn;
      updateData.amount_column = mapping.amountColumn;
      updateData.description_column = mapping.descriptionColumn;
      updateData.debit_column = mapping.debitColumn;
      updateData.credit_column = mapping.creditColumn;
      updateData.transaction_type_column = mapping.transactionTypeColumn;
      updateData.status_column = mapping.statusColumn;
      updateData.amount_sign_convention = mapping.amountSignConvention || 'positive_is_expense';
      updateData.date_format = mapping.dateFormat;
      updateData.has_headers = mapping.hasHeaders;
      updateData.skip_rows = mapping.skipRows || 0;
    }
    updateData.last_used = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from('csv_import_templates')
      .update(updateData)
      .eq('id', templateId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'Failed to update template', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/import/templates/[id]
 * Delete a CSV import template
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const { id } = await params;
    const templateId = parseInt(id);

    if (isNaN(templateId)) {
      return NextResponse.json({ error: 'Invalid template ID' }, { status: 400 });
    }

    const { error } = await supabase
      .from('csv_import_templates')
      .delete()
      .eq('id', templateId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template', message: error.message },
      { status: 500 }
    );
  }
}


