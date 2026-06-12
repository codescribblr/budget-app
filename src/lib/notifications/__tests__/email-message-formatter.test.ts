import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNotificationMessageHtml,
  formatPlainNotificationMessageHtml,
} from '../email-message-formatter';

describe('formatPlainNotificationMessageHtml', () => {
  it('wraps single-line messages in a paragraph', () => {
    const html = formatPlainNotificationMessageHtml('Checking balance is $50.00, below your $100.00 alert threshold.');
    assert.match(html, /<p style="[^"]*">Checking balance is \$50\.00, below your \$100\.00 alert threshold\.<\/p>/);
    assert.doesNotMatch(html, /<ul/);
  });

  it('formats multi-line messages as an intro paragraph and bullet list', () => {
    const html = formatPlainNotificationMessageHtml(
      'These accounts are below your alert threshold:\nChecking: $50.00 (threshold: $100.00)\nSavings: $25.00 (threshold: $100.00)'
    );
    assert.match(html, /These accounts are below your alert threshold:/);
    assert.match(html, /<ul/);
    assert.match(html, /<strong[^>]*>Checking<\/strong>/);
    assert.match(html, /<strong[^>]*>Savings<\/strong>/);
  });
});

describe('buildNotificationMessageHtml', () => {
  it('renders low balance accounts as a table when metadata is present', () => {
    const html = buildNotificationMessageHtml(
      'budget_low_balance',
      'These accounts are below your alert threshold:\nChecking: $50.00 (threshold: $100.00)\nSavings: $25.00 (threshold: $100.00)',
      {
        accounts: [
          { account_name: 'Checking', balance: 50, threshold: 100 },
          { account_name: 'Savings', balance: 25, threshold: 100 },
        ],
      }
    );

    assert.match(html, /<table/);
    assert.match(html, /Checking/);
    assert.match(html, /Savings/);
    assert.match(html, /\$50\.00/);
    assert.match(html, /\$25\.00/);
    assert.doesNotMatch(html, /<ul/);
  });

  it('renders a single category over budget as a paragraph', () => {
    const html = buildNotificationMessageHtml(
      'budget_category_over_limit',
      'Groceries: $450.00 spent of $400.00 budget ($50.00 over).',
      {
        categories: [
          {
            category_name: 'Groceries',
            spent: 450,
            budget: 400,
            over_by: 50,
          },
        ],
      }
    );

    assert.match(html, /Groceries/);
    assert.doesNotMatch(html, /<table/);
  });

  it('renders multiple categories over budget as a table', () => {
    const html = buildNotificationMessageHtml(
      'budget_category_over_limit',
      'These categories exceeded their budget this month:\nGroceries: $450.00 spent of $400.00 budget ($50.00 over)\nDining: $200.00 spent of $150.00 budget ($50.00 over)',
      {
        categories: [
          { category_name: 'Groceries', spent: 450, budget: 400, over_by: 50 },
          { category_name: 'Dining', spent: 200, budget: 150, over_by: 50 },
        ],
      }
    );

    assert.match(html, /<table/);
    assert.match(html, /Groceries/);
    assert.match(html, /Dining/);
    assert.match(html, /Over By/);
  });

  it('renders new recurring patterns as a table when metadata is present', () => {
    const html = buildNotificationMessageHtml(
      'recurring_transaction_new',
      'We detected these recurring patterns. Review and confirm them on the recurring transactions page:\nNetflix: ~$15.99 (monthly)\nSpotify: ~$9.99 (monthly)',
      {
        patterns: [
          { merchant_name: 'Netflix', expected_amount: 15.99, frequency: 'monthly' },
          { merchant_name: 'Spotify', expected_amount: 9.99, frequency: 'monthly' },
        ],
      }
    );

    assert.match(html, /<table/);
    assert.match(html, /Netflix/);
    assert.match(html, /Spotify/);
    assert.match(html, /monthly/);
  });
});
