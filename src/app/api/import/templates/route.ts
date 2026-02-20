import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveAccountId } from '@/lib/account-context';
import type { CSVImportTemplate, ColumnMapping } from '@/lib/mapping-templates';

/**
 * GET /api/import/templates
 * List all CSV import templates for the authenticated user
 * Query params:
 *   - fingerprint=xxx: Get specific template (account-aware lookup)
 *   - targetAccountId=N: Target bank account for lookup (optional)
 *   - targetCreditCardId=M: Target credit card for lookup (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const fingerprint = request.nextUrl.searchParams.get('fingerprint');
    const targetAccountIdParam = request.nextUrl.searchParams.get('targetAccountId');
    const targetCreditCardIdParam = request.nextUrl.searchParams.get('targetCreditCardId');

    const targetAccountId = targetAccountIdParam ? parseInt(targetAccountIdParam, 10) : null;
    const targetCreditCardId = targetCreditCardIdParam ? parseInt(targetCreditCardIdParam, 10) : null;

    if (fingerprint) {
      // Account-aware lookup: try (fingerprint, target_account, target_credit_card) first, then (fingerprint, null, null)
      let template: any = null;
      let error: any = null;

      // First try account-specific template if target is specified
      if (targetAccountId !== null && !isNaN(targetAccountId)) {
        const result = await supabase
          .from('csv_import_templates')
          .select('*')
          .eq('account_id', accountId)
          .eq('fingerprint', fingerprint)
          .eq('target_account_id', targetAccountId)
          .is('target_credit_card_id', null)
          .single();
        template = result.data;
        error = result.error;
      } else if (targetCreditCardId !== null && !isNaN(targetCreditCardId)) {
        const result = await supabase
          .from('csv_import_templates')
          .select('*')
          .eq('account_id', accountId)
          .eq('fingerprint', fingerprint)
          .is('target_account_id', null)
          .eq('target_credit_card_id', targetCreditCardId)
          .single();
        template = result.data;
        error = result.error;
      }

      // Fallback to format-only template (both targets null) if account-specific not found
      if (!template && (error?.code === 'PGRST116' || !template)) {
        const result = await supabase
          .from('csv_import_templates')
          .select('*')
          .eq('account_id', accountId)
          .eq('fingerprint', fingerprint)
          .is('target_account_id', null)
          .is('target_credit_card_id', null)
          .single();
        template = result.data;
        error = result.error;
      }

      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      if (!template) {
        return NextResponse.json(null, { status: 404 });
      }

      return NextResponse.json(template);
    } else {
      // List all templates for this budget account
      const { data: templates, error } = await supabase
        .from('csv_import_templates')
        .select('*')
        .eq('account_id', accountId)
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

    const accountId = await getActiveAccountId();
    if (!accountId) {
      return NextResponse.json({ error: 'No active account' }, { status: 400 });
    }

    const body = await request.json() as Omit<CSVImportTemplate, 'id' | 'createdAt'> & { targetAccountId?: number | null; targetCreditCardId?: number | null };
    const { mapping, targetAccountId, targetCreditCardId, ...templateData } = body;

    // Validate: at most one of targetAccountId or targetCreditCardId
    if (targetAccountId != null && targetCreditCardId != null) {
      return NextResponse.json(
        { error: 'Cannot specify both targetAccountId and targetCreditCardId' },
        { status: 400 }
      );
    }

    const targetAccountIdVal = targetAccountId != null && !isNaN(Number(targetAccountId)) ? Number(targetAccountId) : null;
    const targetCreditCardIdVal = targetCreditCardId != null && !isNaN(Number(targetCreditCardId)) ? Number(targetCreditCardId) : null;

    // Insert template with mapping data flattened
    const { data: template, error } = await supabase
      .from('csv_import_templates')
      .insert({
        user_id: user.id,
        account_id: accountId,
        template_name: templateData.templateName,
        fingerprint: templateData.fingerprint,
        column_count: templateData.columnCount,
        target_account_id: targetAccountIdVal,
        target_credit_card_id: targetCreditCardIdVal,
        date_column: mapping.dateColumn,
        amount_column: mapping.amountColumn,
        description_column: mapping.descriptionColumn,
        debit_column: mapping.debitColumn,
        credit_column: mapping.creditColumn,
        transaction_type_column: mapping.transactionTypeColumn,
        status_column: mapping.statusColumn,
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
        // Update existing template instead (match by unique key)
        let query = supabase
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
          .eq('account_id', accountId)
          .eq('fingerprint', templateData.fingerprint);

        if (targetAccountIdVal !== null) {
          query = query.eq('target_account_id', targetAccountIdVal).is('target_credit_card_id', null);
        } else if (targetCreditCardIdVal !== null) {
          query = query.is('target_account_id', null).eq('target_credit_card_id', targetCreditCardIdVal);
        } else {
          query = query.is('target_account_id', null).is('target_credit_card_id', null);
        }

        const { data: updated, error: updateError } = await query.select().single();

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


