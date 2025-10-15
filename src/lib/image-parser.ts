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
    const hash = generateTransactionHash(txn.date, txn.description, txn.amount);

    return {
      id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: txn.date,
      description: txn.description,
      merchant,
      amount: txn.amount,
      originalData: JSON.stringify(txn),
      hash,
      isDuplicate: false,
      status: 'pending',
      splits: [],
    };
  });
}

