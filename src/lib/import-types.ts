export interface ParsedTransaction {
  id: string; // Temporary ID for UI
  date: string;
  description: string;
  merchant: string;
  amount: number; // Always positive
  transaction_type: 'income' | 'expense'; // NEW FIELD
  originalData: string; // JSON string of original CSV row
  hash: string; // Unique hash for deduplication
  suggestedCategory?: number; // Category ID
  account_id?: number | null;
  credit_card_id?: number | null;
  isDuplicate: boolean;
  duplicateType?: 'database' | 'within-file' | null; // Type of duplicate
  duplicateOf?: number; // Transaction ID if duplicate
  status: 'pending' | 'confirmed' | 'excluded';
  splits: TransactionSplit[];
  forceImport?: boolean; // User explicitly clicked "Include" on a duplicate
  is_historical?: boolean; // Per-transaction historical flag
  tag_ids?: number[]; // Tag IDs to assign to transaction
}

export interface TransactionSplit {
  categoryId: number;
  categoryName: string;
  amount: number;
  isAICategorized?: boolean; // Flag to track if this categorization was done by AI
}

export interface CSVFormat {
  name: string;
  dateColumn: string;
  descriptionColumn: string;
  amountColumn: string;
  debitColumn?: string;
  creditColumn?: string;
  hasHeader: boolean;
}

