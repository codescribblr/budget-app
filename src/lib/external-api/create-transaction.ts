import { ExternalApiValidationError } from './query-helpers';

export type ExternalCreateTransactionBody = {
  description?: string;
  amount?: unknown;
  date?: string;
  account_id?: number | null;
  credit_card_id?: number | null;
  category_id?: number | null;
  merchant?: string | null;
  transaction_type?: 'income' | 'expense';
  notes?: string | null;
  splits?: Array<{ category_id?: unknown; amount?: unknown }>;
};

export type ExternalTransactionInsert = {
  budget_account_id: number;
  user_id: string;
  description: string;
  total_amount: number;
  date: string;
  account_id: number | null;
  credit_card_id: number | null;
  transaction_type: 'income' | 'expense';
};

export type ExternalSplitInsert = {
  category_id: number;
  amount: number;
};

export type ExternalTransactionCreatePlan = {
  transaction: ExternalTransactionInsert;
  splits: ExternalSplitInsert[];
};

function parsePositiveAmount(value: unknown, label: string): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount === 0) {
    throw new ExternalApiValidationError(`${label} must be a non-zero number`);
  }
  return Math.abs(amount);
}

function parseCategoryId(value: unknown, label: string): number {
  const categoryId = Number(value);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    throw new ExternalApiValidationError(`${label} must be a positive integer`);
  }
  return categoryId;
}

export function buildExternalTransactionCreate(
  body: ExternalCreateTransactionBody,
  context: { budgetAccountId: number; createdBy: string }
): ExternalTransactionCreatePlan {
  if (!body.description?.trim() || !body.date) {
    throw new ExternalApiValidationError('description, amount, and date are required');
  }

  if (body.account_id != null && body.credit_card_id != null) {
    throw new ExternalApiValidationError(
      'Transaction cannot be linked to both an account and a credit card'
    );
  }

  const rawSplits = Array.isArray(body.splits) ? body.splits : [];
  let splits: ExternalSplitInsert[];

  if (rawSplits.length > 0) {
    splits = rawSplits.map((split, index) => ({
      category_id: parseCategoryId(split.category_id, `splits[${index}].category_id`),
      amount: parsePositiveAmount(split.amount, `splits[${index}].amount`),
    }));
  } else if (body.category_id != null && body.amount !== undefined) {
    splits = [
      {
        category_id: parseCategoryId(body.category_id, 'category_id'),
        amount: parsePositiveAmount(body.amount, 'amount'),
      },
    ];
  } else {
    throw new ExternalApiValidationError(
      'Provide splits, or category_id and amount, so the transaction can be categorized'
    );
  }

  const totalAmount = splits.reduce((sum, split) => sum + split.amount, 0);
  const transactionType = body.transaction_type === 'income' ? 'income' : 'expense';

  return {
    transaction: {
      budget_account_id: context.budgetAccountId,
      user_id: context.createdBy,
      description: body.description.trim(),
      total_amount: totalAmount,
      date: body.date,
      account_id: body.account_id ?? null,
      credit_card_id: body.credit_card_id ?? null,
      transaction_type: transactionType,
    },
    splits,
  };
}

export function categoryBalanceChange(
  transactionType: 'income' | 'expense',
  amount: number
): number {
  return transactionType === 'income' ? amount : -amount;
}
