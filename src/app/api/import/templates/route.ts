import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CSVImportTemplate, ColumnMapping } from '@/lib/mapping-templates';

/**
 * GET /api/import/templates
 * List all CSV import templates for the authenticated user
 * Query params: ?fingerprint=xxx to get a specific template
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fingerprint = request.nextUrl.searchParams.get('fingerprint');

    if (fingerprint) {
      // Get specific template by fingerprint
      const { data: template, error } = await supabase
        .from('csv_import_templates')
        .select('*')
        .eq('user_id', user.id)
        .eq('fingerprint', fingerprint)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Not found
          return NextResponse.json(null, { status: 404 });
        }
        throw error;
      }

      return NextResponse.json(template);
    } else {
      // List all templates
      const { data: templates, error } = await supabase
        .from('csv_import_templates')
        .select('*')
        .eq('user_id', user.id)
        .order('last_used', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      return NextResponse.json(templates || []);
    }
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates', message: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/import/templates
 * Create a new CSV import template
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { checkWriteAccess } = await import('@/lib/api-helpers');
    const accessCheck = await checkWriteAccess();
    if (accessCheck) return accessCheck;

    const body = await request.json() as Omit<CSVImportTemplate, 'id' | 'createdAt'>;
    const { mapping, ...templateData } = body;

    // Insert template with mapping data flattened
    const { data: template, error } = await supabase
      .from('csv_import_templates')
      .insert({
        user_id: user.id,
        template_name: templateData.templateName,
        fingerprint: templateData.fingerprint,
        column_count: templateData.columnCount,
        date_column: mapping.dateColumn,
        amount_column: mapping.amountColumn,
        description_column: mapping.descriptionColumn,
        debit_column: mapping.debitColumn,
        credit_column: mapping.creditColumn,
        transaction_type_column: mapping.transactionTypeColumn,
        amount_sign_convention: mapping.amountSignConvention || 'positive_is_expense',
        date_format: mapping.dateFormat,
        has_headers: mapping.hasHeaders,
        skip_rows: mapping.skipRows || 0,
        usage_count: 0,
        last_used: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation (template already exists)
      if (error.code === '23505') {
        // Update existing template instead
        const { data: updated, error: updateError } = await supabase
          .from('csv_import_templates')
          .update({
            template_name: templateData.templateName,
            date_column: mapping.dateColumn,
            amount_column: mapping.amountColumn,
            description_column: mapping.descriptionColumn,
            debit_column: mapping.debitColumn,
            credit_column: mapping.creditColumn,
            transaction_type_column: mapping.transactionTypeColumn,
            amount_sign_convention: mapping.amountSignConvention || 'positive_is_expense',
            date_format: mapping.dateFormat,
            has_headers: mapping.hasHeaders,
            skip_rows: mapping.skipRows || 0,
            last_used: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('fingerprint', templateData.fingerprint)
          .select()
          .single();

        if (updateError) throw updateError;
        return NextResponse.json(updated, { status: 200 });
      }
      throw error;
    }

    return NextResponse.json(template, { status: 201 });
  } catch (error: any) {
    console.error('Error saving template:', error);
    return NextResponse.json(
      { error: 'Failed to save template', message: error.message },
      { status: 500 }
    );
  }
}

