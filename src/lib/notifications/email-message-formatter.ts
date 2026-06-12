function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function paragraph(html: string, marginBottom = '16px'): string {
  return `<p style="margin: 0 0 ${marginBottom}; font-size: 16px; line-height: 24px; color: #475569;">${html}</p>`;
}

function buildItemTable(headers: string[], rows: string[][]): string {
  const headerCells = headers
    .map(
      (header) =>
        `<th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: #64748b; border-bottom: 1px solid #e2e8f0;">${header}</th>`
    )
    .join('');

  const bodyRows = rows
    .map((cells, rowIndex) => {
      const isLast = rowIndex === rows.length - 1;
      const borderStyle = isLast ? '' : 'border-bottom: 1px solid #e2e8f0;';
      const rowCells = cells
        .map(
          (cell) =>
            `<td style="padding: 14px 16px; font-size: 15px; line-height: 22px; color: #334155; ${borderStyle}">${cell}</td>`
        )
        .join('');
      return `<tr>${rowCells}</tr>`;
    })
    .join('');

  return `
    <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 0 0 24px;">
      <thead>
        <tr style="background-color: #f1f5f9;">${headerCells}</tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
  `.trim();
}

function buildSimpleList(items: string[]): string {
  const listItems = items
    .map(
      (item) =>
        `<li style="margin: 0 0 10px; font-size: 15px; line-height: 22px; color: #334155;">${item}</li>`
    )
    .join('');

  return `
    <ul style="margin: 0 0 24px; padding: 16px 16px 6px 32px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; list-style-type: disc;">
      ${listItems}
    </ul>
  `.trim();
}

function formatLabelValueLine(line: string): string {
  const colonIndex = line.indexOf(':');
  if (colonIndex <= 0) {
    return escapeHtml(line);
  }

  const label = escapeHtml(line.slice(0, colonIndex));
  const value = escapeHtml(line.slice(colonIndex + 1).trim());
  return `<strong style="color: #0f172a;">${label}</strong><span style="color: #64748b;">:</span> ${value}`;
}

/** Convert plain-text notification messages with line breaks into email-safe HTML. */
export function formatPlainNotificationMessageHtml(message: string): string {
  const lines = message
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return paragraph(escapeHtml(lines[0] || ''), '32px');
  }

  const intro = escapeHtml(lines[0]);
  const items = lines.slice(1).map(formatLabelValueLine);
  return `${paragraph(intro)}${buildSimpleList(items)}`;
}

interface LowBalanceAccountMeta {
  account_name: string;
  balance: number;
  threshold: number;
}

interface CategoryOverBudgetMeta {
  category_name: string;
  spent: number;
  budget: number;
  over_by: number;
}

interface NewRecurringPatternMeta {
  merchant_name: string;
  expected_amount: number;
  frequency: string;
}

function formatLowBalanceHtml(message: string, metadata?: Record<string, unknown>): string {
  const accounts = (metadata?.accounts as LowBalanceAccountMeta[] | undefined) ?? [];
  if (accounts.length <= 1) {
    return formatPlainNotificationMessageHtml(message);
  }

  const intro = message.split('\n')[0]?.trim() || 'These accounts are below your alert threshold:';
  const rows = accounts.map((account) => [
    `<strong style="color: #0f172a;">${escapeHtml(account.account_name)}</strong>`,
    `<span style="color: #dc2626; font-weight: 600;">${formatMoney(account.balance)}</span>`,
    formatMoney(account.threshold),
  ]);

  return `${paragraph(escapeHtml(intro))}${buildItemTable(['Account', 'Balance', 'Threshold'], rows)}`;
}

function formatCategoryOverBudgetHtml(message: string, metadata?: Record<string, unknown>): string {
  const categories = (metadata?.categories as CategoryOverBudgetMeta[] | undefined) ?? [];
  if (categories.length <= 1) {
    return formatPlainNotificationMessageHtml(message);
  }

  const intro = message.split('\n')[0]?.trim() || 'These categories exceeded their budget this month:';
  const rows = categories.map((category) => [
    `<strong style="color: #0f172a;">${escapeHtml(category.category_name)}</strong>`,
    formatMoney(category.spent),
    formatMoney(category.budget),
    `<span style="color: #dc2626; font-weight: 600;">${formatMoney(category.over_by)}</span>`,
  ]);

  return `${paragraph(escapeHtml(intro))}${buildItemTable(['Category', 'Spent', 'Budget', 'Over By'], rows)}`;
}

function formatFrequency(frequency: string): string {
  return frequency.replace(/_/g, ' ');
}

function formatNewRecurringPatternsHtml(message: string, metadata?: Record<string, unknown>): string {
  const patterns = (metadata?.patterns as NewRecurringPatternMeta[] | undefined) ?? [];
  if (patterns.length <= 1) {
    return formatPlainNotificationMessageHtml(message);
  }

  const intro =
    message.split('\n')[0]?.trim() ||
    'We detected these recurring patterns. Review and confirm them on the recurring transactions page:';
  const rows = patterns.map((pattern) => [
    `<strong style="color: #0f172a;">${escapeHtml(pattern.merchant_name)}</strong>`,
    `~${formatMoney(pattern.expected_amount)}`,
    escapeHtml(formatFrequency(pattern.frequency)),
  ]);

  return `${paragraph(escapeHtml(intro))}${buildItemTable(['Merchant', 'Amount', 'Frequency'], rows)}`;
}

/** Build HTML body content for notification emails. */
export function buildNotificationMessageHtml(
  notificationTypeId: string,
  message: string,
  metadata?: Record<string, unknown>
): string {
  switch (notificationTypeId) {
    case 'budget_low_balance':
      return formatLowBalanceHtml(message, metadata);
    case 'budget_category_over_limit':
      return formatCategoryOverBudgetHtml(message, metadata);
    case 'recurring_transaction_new':
      return formatNewRecurringPatternsHtml(message, metadata);
    default:
      return formatPlainNotificationMessageHtml(message);
  }
}
