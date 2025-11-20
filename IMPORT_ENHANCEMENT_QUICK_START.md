# Quick Start: Intelligent CSV Import Implementation

## 🚀 Getting Started

This is a condensed guide for implementing the intelligent CSV import feature. See `INTELLIGENT_CSV_IMPORT_PLAN.md` for full details.

---

## Step 1: Install Dependencies

```bash
npm install date-fns
# For fuzzy string matching
npm install fastest-levenshtein
```

---

## Step 2: Create Core Detection Module

**File:** `budget-app/src/lib/column-analyzer.ts`

```typescript
export interface ColumnAnalysis {
  columnIndex: number;
  headerName: string;
  fieldType: 'date' | 'amount' | 'description' | 'debit' | 'credit' | 'balance' | 'unknown';
  confidence: number;
  sampleValues: string[];
  detectionMethod: 'header' | 'content' | 'hybrid';
}

export interface CSVAnalysisResult {
  columns: ColumnAnalysis[];
  hasHeaders: boolean;
  dateColumn: number | null;
  amountColumn: number | null;
  descriptionColumn: number | null;
  debitColumn: number | null;
  creditColumn: number | null;
  dateFormat: string | null;
  fingerprint: string;
}

export function analyzeCSV(data: string[][]): CSVAnalysisResult {
  // Implementation here
}
```

---

## Step 3: Pattern Matchers

**File:** `budget-app/src/lib/pattern-matchers.ts`

```typescript
// Date patterns
export const DATE_PATTERNS = [
  { regex: /^\d{1,2}\/\d{1,2}\/\d{2,4}$/, format: 'MM/DD/YYYY' },
  { regex: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD' },
  { regex: /^\d{2}-\d{2}-\d{4}$/, format: 'DD-MM-YYYY' },
  { regex: /^\d{2}\.\d{2}\.\d{4}$/, format: 'DD.MM.YYYY' },
  { regex: /^[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}$/, format: 'MMM DD, YYYY' },
];

// Amount patterns
export const AMOUNT_PATTERNS = [
  /^-?\$?\d{1,3}(,\d{3})*(\.\d{2})?$/,  // $1,234.56
  /^-?\d{1,3}(\.\d{3})*(,\d{2})?$/,     // 1.234,56 (European)
  /^\(\d+\.\d{2}\)$/,                    // (123.45) negative
];

export function isDateColumn(values: string[]): { score: number; format: string | null } {
  // Test each value against date patterns
  // Return confidence score and detected format
}

export function isAmountColumn(values: string[]): number {
  // Test each value against amount patterns
  // Return confidence score
}

export function isDescriptionColumn(values: string[]): number {
  // Check for text content
  // Return confidence score
}
```

---

## Step 4: Fuzzy Header Matching

**File:** `budget-app/src/lib/fuzzy-matching.ts`

```typescript
import { distance } from 'fastest-levenshtein';

export const FIELD_SYNONYMS = {
  date: [
    'date', 'transaction date', 'trans date', 'post date', 'posting date',
    'value date', 'booking date', 'fecha', 'datum', 'data', 'tarih',
    'posted date', 'effective date', 'settlement date'
  ],
  amount: [
    'amount', 'total', 'sum', 'value', 'charge', 'payment',
    'monto', 'betrag', 'importo', 'montant', 'transaction amount'
  ],
  description: [
    'description', 'merchant', 'payee', 'memo', 'details', 'narrative',
    'reference', 'descripción', 'beschreibung', 'transaction details',
    'merchant name', 'vendor'
  ],
  debit: ['debit', 'withdrawal', 'expense', 'charge', 'débito'],
  credit: ['credit', 'deposit', 'income', 'payment', 'crédito'],
};

export function fuzzyMatchHeader(
  header: string,
  fieldType: keyof typeof FIELD_SYNONYMS
): number {
  const normalized = header.toLowerCase().trim();
  const synonyms = FIELD_SYNONYMS[fieldType];
  
  // Exact match
  if (synonyms.includes(normalized)) return 1.0;
  
  // Contains match
  if (synonyms.some(s => normalized.includes(s) || s.includes(normalized))) {
    return 0.85;
  }
  
  // Levenshtein distance
  const distances = synonyms.map(s => distance(normalized, s));
  const minDistance = Math.min(...distances);
  
  // Score based on distance (max distance of 5 for partial credit)
  return Math.max(0, 1 - (minDistance / 5));
}
```

---

## Step 5: Column Mapping Dialog

**File:** `budget-app/src/components/import/ColumnMappingDialog.tsx`

```typescript
interface ColumnMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  analysis: CSVAnalysisResult;
  sampleData: string[][];
  onConfirm: (mapping: ColumnMapping) => void;
}

export default function ColumnMappingDialog({
  open,
  onOpenChange,
  analysis,
  sampleData,
  onConfirm
}: ColumnMappingDialogProps) {
  // Show table with:
  // - Column headers
  // - Sample values (first 3 rows)
  // - Dropdown to select field type
  // - Confidence indicator
  // - Save template checkbox
}
```

---

## Step 6: Database Migration

**File:** `budget-app/supabase/migrations/011_csv_import_templates.sql`

```sql
CREATE TABLE csv_import_templates (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_name VARCHAR(255),
  fingerprint VARCHAR(255) NOT NULL,
  column_count INTEGER NOT NULL,
  date_column INTEGER,
  amount_column INTEGER,
  description_column INTEGER,
  debit_column INTEGER,
  credit_column INTEGER,
  date_format VARCHAR(50),
  has_headers BOOLEAN DEFAULT true,
  skip_rows INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  last_used TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, fingerprint)
);

-- RLS policies
ALTER TABLE csv_import_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON csv_import_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates"
  ON csv_import_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates"
  ON csv_import_templates FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Testing Checklist

- [ ] Test with 10+ different bank CSV formats
- [ ] Test with no headers
- [ ] Test with extra columns
- [ ] Test with international date formats
- [ ] Test with European number formats (comma decimal)
- [ ] Test with negative amounts (parentheses)
- [ ] Test template saving and reuse
- [ ] Test manual column mapping
- [ ] Test edge cases (empty columns, special characters)

---

## Priority Order

1. ✅ **Phase 1** - Column analyzer + pattern matchers (core logic)
2. ✅ **Phase 2** - Mapping dialog UI (fallback for low confidence)
3. ✅ **Phase 3** - Template storage (learning system)
4. ⚠️ **Phase 4** - Advanced features (international support, Excel)

Start with Phase 1 to get 80% of the value with 20% of the effort!

