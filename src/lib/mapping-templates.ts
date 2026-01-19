/**
 * CSV import template management
 * Handles saving and loading column mappings for reuse
 */

export interface ColumnMapping {
  dateColumn: number | null;
  amountColumn: number | null;
  descriptionColumn: number | null;
  debitColumn: number | null;
  creditColumn: number | null;
  transactionTypeColumn: number | null; // Column with "INCOME", "EXPENSE", "DEBIT", "CREDIT", etc.
  statusColumn: number | null; // Column with transaction status (e.g., "pending", "cleared", "posted")
  amountSignConvention: 'positive_is_expense' | 'positive_is_income' | 'separate_column' | 'separate_debit_credit';
  dateFormat: string | null;
  hasHeaders: boolean;
  skipRows?: number;
}

// Input format for saving templates
export interface SaveTemplateInput {
  userId: string;
  templateName?: string;
  fingerprint: string;
  columnCount: number;
  mapping: ColumnMapping;
}

export interface CSVImportTemplate {
  id?: number;
  userId: string;
  templateName?: string;
  fingerprint: string;
  columnCount: number;
  mapping: ColumnMapping;
  usageCount?: number;
  lastUsed?: string;
  createdAt?: string;
}

/**
 * Save a template to the database
 */
export async function saveTemplate(template: SaveTemplateInput): Promise<CSVImportTemplate> {
  const response = await fetch('/api/import/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: template.userId,
      templateName: template.templateName,
      fingerprint: template.fingerprint,
      columnCount: template.columnCount,
      mapping: template.mapping,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to save template');
  }

  return response.json();
}

/**
 * Load a template by fingerprint
 */
export async function loadTemplate(fingerprint: string): Promise<CSVImportTemplate | null> {
  const response = await fetch(`/api/import/templates?fingerprint=${encodeURIComponent(fingerprint)}`);

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json();
    throw new Error(error.message || 'Failed to load template');
  }

  const template = await response.json();
  if (!template) return null;

  // Convert database format to our format
  return {
    ...template,
    mapping: {
      dateColumn: template.date_column ?? null,
      amountColumn: template.amount_column ?? null,
      descriptionColumn: template.description_column ?? null,
      debitColumn: template.debit_column ?? null,
      creditColumn: template.credit_column ?? null,
      transactionTypeColumn: template.transaction_type_column ?? null,
      statusColumn: template.status_column ?? null,
      amountSignConvention: template.amount_sign_convention ?? 'positive_is_expense',
      dateFormat: template.date_format ?? null,
      hasHeaders: template.has_headers ?? true,
      skipRows: template.skip_rows ?? 0,
    },
  };
}

/**
 * Load a template by ID (server-side only)
 * This is used in server-side code where we have direct database access
 */
export async function loadTemplateById(
  templateId: number,
  supabase: any
): Promise<CSVImportTemplate | null> {
  const { data: template, error } = await supabase
    .from('csv_import_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error || !template) {
    return null;
  }

  // Convert database format to our format
  return {
    id: template.id,
    userId: template.user_id,
    templateName: template.template_name,
    fingerprint: template.fingerprint,
    columnCount: template.column_count,
    mapping: {
      dateColumn: template.date_column ?? null,
      amountColumn: template.amount_column ?? null,
      descriptionColumn: template.description_column ?? null,
      debitColumn: template.debit_column ?? null,
      creditColumn: template.credit_column ?? null,
      transactionTypeColumn: template.transaction_type_column ?? null,
      statusColumn: template.status_column ?? null,
      amountSignConvention: template.amount_sign_convention ?? 'positive_is_expense',
      dateFormat: template.date_format ?? null,
      hasHeaders: template.has_headers ?? true,
      skipRows: template.skip_rows ?? 0,
    },
    usageCount: template.usage_count,
    lastUsed: template.last_used,
    createdAt: template.created_at,
  };
}

/**
 * List all templates for the current user
 */
export async function listTemplates(): Promise<CSVImportTemplate[]> {
  const response = await fetch('/api/import/templates');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to list templates');
  }

  const templates = await response.json();
  
  // Transform database format to our format
  return templates.map((template: any) => ({
    id: template.id,
    userId: template.user_id,
    templateName: template.template_name,
    fingerprint: template.fingerprint,
    columnCount: template.column_count,
    mapping: {
      dateColumn: template.date_column ?? null,
      amountColumn: template.amount_column ?? null,
      descriptionColumn: template.description_column ?? null,
      debitColumn: template.debit_column ?? null,
      creditColumn: template.credit_column ?? null,
      transactionTypeColumn: template.transaction_type_column ?? null,
      statusColumn: template.status_column ?? null,
      amountSignConvention: template.amount_sign_convention ?? 'positive_is_expense',
      dateFormat: template.date_format ?? null,
      hasHeaders: template.has_headers ?? true,
      skipRows: template.skip_rows ?? 0,
    },
    usageCount: template.usage_count,
    lastUsed: template.last_used,
    createdAt: template.created_at,
  }));
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: number): Promise<void> {
  const response = await fetch(`/api/import/templates/${templateId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to delete template');
  }
}

/**
 * Update template usage (increment usage count and last used timestamp)
 */
export async function updateTemplateUsage(templateId: number): Promise<void> {
  const response = await fetch(`/api/import/templates/${templateId}/usage`, {
    method: 'POST',
  });

  if (!response.ok) {
    // Non-critical error, just log it
    console.warn('Failed to update template usage');
  }
}


