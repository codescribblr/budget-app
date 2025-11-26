import type { ParsedTransaction } from './import-types';
import { generateTransactionHash, extractMerchant } from './csv-parser';

interface VisionTransaction {
  date: string;
  description: string;
  amount: number;
}

export async function parseImageFile(file: File): Promise<ParsedTransaction[]> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/import/process-image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to process image');
  }

  const { transactions } = await response.json() as { transactions: VisionTransaction[] };

  return transactions.map((txn) => {
    const merchant = extractMerchant(txn.description);
    const originalData = JSON.stringify(txn);
    // Use absolute amount in hash for consistency
    const hash = generateTransactionHash(txn.date, txn.description, Math.abs(txn.amount), originalData);
    // Default to expense for image-parsed transactions, but check sign
    const transaction_type: 'income' | 'expense' = txn.amount < 0 ? 'income' : 'expense';

    return {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: txn.date,
      description: txn.description,
      merchant,
      amount: Math.abs(txn.amount),
      transaction_type,
      originalData,
      hash,
      isDuplicate: false,
      status: 'pending',
      splits: [],
    };
  });
}

