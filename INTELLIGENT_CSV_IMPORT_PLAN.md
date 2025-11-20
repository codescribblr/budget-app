# Intelligent CSV Import Enhancement Plan

## Executive Summary

Transform the transaction import feature from supporting 4 hardcoded bank formats to an **intelligent, universal CSV parser** that can automatically detect and map fields from any bank statement or spreadsheet.

---

## Current State Analysis

### ✅ What Works Well

1. **Solid Foundation**
   - Papa Parse library for CSV parsing
   - Duplicate detection (database + within-file)
   - Transaction preview with inline editing
   - Auto-categorization learning
   - Image/PDF import via OpenAI Vision

2. **Supported Formats** (Hardcoded)
   - Citi Rewards (10 columns with headers)
   - Chase (7 columns with headers)
   - Wells Fargo (5 columns, no headers)
   - Citi Statement (5 columns with debit/credit)

### ❌ Current Limitations

1. **Brittle Format Detection**
   - Hardcoded string matching: `if (headerStr.includes('cardholder') && headerStr.includes('points'))`
   - Only works with exact header names
   - Fails on variations: "Trans Date" vs "Transaction Date" vs "Date"
   - No fuzzy matching or synonyms

2. **Fixed Column Positions**
   - Assumes specific column order
   - Can't handle extra columns
   - Can't handle missing columns
   - No user override

3. **Limited Date Parsing**
   - Relies on JavaScript `new Date()` which is unreliable
   - Doesn't handle all international formats
   - No timezone handling

4. **No User Feedback Loop**
   - If detection fails, user gets "unknown" format
   - No way to manually map columns
   - No learning from user corrections

---

## Research: Industry Best Practices

### Approach 1: **Heuristic-Based Column Detection**

**How it works:**
- Analyze column content, not just headers
- Use pattern matching and statistical analysis
- Score each column for likelihood of being date/amount/description

**Example Detection Logic:**

```typescript
// DATE COLUMN: Check if 80%+ of values match date patterns
function isDateColumn(values: string[]): number {
  const datePatterns = [
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,        // MM/DD/YYYY
    /^\d{4}-\d{2}-\d{2}$/,                 // YYYY-MM-DD
    /^\d{2}-\d{2}-\d{4}$/,                 // DD-MM-YYYY
    /^[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}$/,  // Jan 15, 2025
  ];

  const matches = values.filter(v =>
    datePatterns.some(p => p.test(v))
  ).length;

  return matches / values.length; // Returns confidence score 0-1
}

// AMOUNT COLUMN: Check for currency patterns
function isAmountColumn(values: string[]): number {
  const amountPattern = /^-?\$?\d{1,3}(,?\d{3})*(\.\d{2})?$/;
  const matches = values.filter(v => amountPattern.test(v)).length;
  return matches / values.length;
}

// DESCRIPTION COLUMN: Text with reasonable length
function isDescriptionColumn(values: string[]): number {
  const textValues = values.filter(v =>
    v.length > 3 && v.length < 200 && /[a-zA-Z]/.test(v)
  ).length;
  return textValues / values.length;
}
```

**Pros:**
- Works without headers
- Handles column reordering
- Language/format agnostic
- Fast and deterministic

**Cons:**
- Requires sample data analysis
- May fail on edge cases
- Needs extensive testing

### Approach 2: **Header Name Matching with Fuzzy Logic**

**How it works:**
- Build comprehensive synonym dictionary
- Use string similarity algorithms (Levenshtein distance)
- Score header names against known patterns

**Example:**
```typescript
const DATE_SYNONYMS = [
  'date', 'transaction date', 'trans date', 'post date',
  'posting date', 'value date', 'booking date', 'fecha',
  'datum', 'data', 'tarih'
];

const AMOUNT_SYNONYMS = [
  'amount', 'total', 'sum', 'value', 'debit', 'credit',
  'charge', 'payment', 'monto', 'betrag', 'importo'
];

const DESCRIPTION_SYNONYMS = [
  'description', 'merchant', 'payee', 'memo', 'details',
  'narrative', 'reference', 'descripción', 'beschreibung'
];

function fuzzyMatch(header: string, synonyms: string[]): number {
  const normalized = header.toLowerCase().trim();

  // Exact match
  if (synonyms.includes(normalized)) return 1.0;

  // Partial match
  if (synonyms.some(s => normalized.includes(s))) return 0.8;

  // Levenshtein distance
  const distances = synonyms.map(s => levenshteinDistance(normalized, s));
  const minDistance = Math.min(...distances);
  return Math.max(0, 1 - (minDistance / 10));
}
```

**Pros:**
- Works well with headers
- Supports internationalization
- Easy to extend with new synonyms

**Cons:**
- Doesn't work without headers
- Requires maintenance of synonym lists
- May have false positives

### Approach 3: **Interactive Column Mapping UI**

**How it works:**
- Auto-detect with confidence scores
- Show user a mapping interface if confidence < 90%
- Let user manually map columns
- Save mappings for future imports

**Example UI Flow:**
```
┌─────────────────────────────────────────────────┐
│ Column Mapping (Auto-detected)                  │
├─────────────────────────────────────────────────┤
│ CSV Column          →  Field        Confidence  │
│ "Trans Date"        →  Date         ✓ 95%      │
│ "Description"       →  Description  ✓ 100%     │
│ "Amount"            →  Amount       ✓ 100%     │
│ "Category"          →  [Ignore]     ⚠ 60%      │
│ "Balance"           →  [Ignore]     ⚠ 40%      │
└─────────────────────────────────────────────────┘
[Save Mapping for Future] [Import]
```

**Pros:**
- 100% accuracy when user confirms
- Handles any format
- Builds knowledge base over time
- Great UX for edge cases

**Cons:**
- Requires user interaction
- More complex UI
- Slower for first-time imports

---

## Recommended Solution: **Hybrid Approach**

Combine all three approaches for maximum flexibility:

### Phase 1: **Smart Auto-Detection** (No User Input)
1. Analyze headers with fuzzy matching (Approach 2)
2. Analyze column content with heuristics (Approach 1)
3. Combine scores: `finalScore = (headerScore * 0.6) + (contentScore * 0.4)`
4. If all required fields have confidence > 85%, proceed automatically

### Phase 2: **Interactive Mapping** (Low Confidence)
1. If any field has confidence < 85%, show mapping UI (Approach 3)
2. Pre-select best guesses
3. Let user confirm or adjust
4. Save mapping template for this bank/format

### Phase 3: **Learning System**
1. Store successful mappings in database
2. Match future CSVs against saved templates
3. Build user-specific format library
4. Share common templates across users (optional)

---

## Implementation Plan

### 🎯 **Milestone 1: Enhanced Column Detection Engine**

**Goal:** Replace hardcoded format detection with intelligent heuristics

**Tasks:**

1. **Create Column Analyzer Module** (`lib/column-analyzer.ts`)
   ```typescript
   interface ColumnAnalysis {
     columnIndex: number;
     headerName: string;
     fieldType: 'date' | 'amount' | 'description' | 'unknown';
     confidence: number;
     sampleValues: string[];
     detectionMethod: 'header' | 'content' | 'hybrid';
   }

   function analyzeColumns(data: string[][]): ColumnAnalysis[]
   ```

2. **Build Pattern Matchers**
   - Date pattern detector (15+ formats)
   - Amount pattern detector (currency symbols, decimals, negatives)
   - Description pattern detector (text heuristics)
   - Balance/ignore detector (running totals, account numbers)

3. **Implement Fuzzy Header Matching**
   - Levenshtein distance algorithm
   - Synonym dictionaries (English + common international terms)
   - Partial matching with scoring

4. **Create Scoring System**
   - Weight header match: 60%
   - Weight content match: 40%
   - Require minimum 85% confidence for auto-detection

**Deliverables:**
- `lib/column-analyzer.ts` - Core detection engine
- `lib/pattern-matchers.ts` - Pattern detection utilities
- `lib/fuzzy-matching.ts` - String similarity algorithms
- Unit tests with 20+ real-world CSV samples

**Estimated Time:** 2-3 days

---

### 🎯 **Milestone 2: Interactive Column Mapping UI**

**Goal:** Let users manually map columns when auto-detection fails

**Tasks:**

1. **Create Mapping Dialog Component** (`components/import/ColumnMappingDialog.tsx`)
   - Show CSV preview (first 5 rows)
   - Dropdown for each column: Date / Amount / Description / Ignore
   - Confidence indicators (green/yellow/red)
   - "Save as template" checkbox

2. **Update Import Flow**
   ```typescript
   // In FileUpload.tsx
   const analysis = analyzeColumns(csvData);
   const lowConfidence = analysis.some(col => col.confidence < 0.85);

   if (lowConfidence) {
     setShowMappingDialog(true);
     setColumnAnalysis(analysis);
   } else {
     // Proceed with auto-detected mapping
     parseWithMapping(analysis);
   }
   ```

3. **Add Template System**
   - Detect CSV "fingerprint" (column count, header hash)
   - Store mapping in localStorage or database
   - Auto-apply saved mappings on future imports

**Deliverables:**
- `components/import/ColumnMappingDialog.tsx` - Mapping UI
- `lib/mapping-templates.ts` - Template storage/retrieval
- Updated `FileUpload.tsx` - Integration

**Estimated Time:** 2-3 days

---

### 🎯 **Milestone 3: Advanced Date Parsing**

**Goal:** Handle all date formats reliably

**Tasks:**

1. **Integrate Date Parsing Library**
   - Use `date-fns` or `dayjs` for robust parsing
   - Support 20+ date formats
   - Handle ambiguous dates (MM/DD vs DD/MM)

2. **Add Date Format Detection**
   ```typescript
   function detectDateFormat(samples: string[]): string {
     // Analyze samples to determine format
     // Return format string: 'MM/DD/YYYY', 'DD-MM-YYYY', etc.
   }
   ```

3. **Add User Override**
   - If dates are ambiguous, ask user: "Is 01/02/2025 Jan 2 or Feb 1?"
   - Remember preference for future imports

**Deliverables:**
- `lib/date-parser.ts` - Enhanced date parsing
- Date format selector in mapping dialog

**Estimated Time:** 1 day

---

### 🎯 **Milestone 4: Database Schema for Templates**

**Goal:** Persist mapping templates for reuse

**Tasks:**

1. **Create Migration** (`supabase/migrations/011_csv_import_templates.sql`)
   ```sql
   CREATE TABLE csv_import_templates (
     id SERIAL PRIMARY KEY,
     user_id UUID NOT NULL REFERENCES auth.users(id),
     template_name VARCHAR(255),
     fingerprint VARCHAR(255) NOT NULL, -- Hash of headers
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
   ```

2. **Create API Endpoints**
   - `GET /api/import/templates` - List saved templates
   - `POST /api/import/templates` - Save new template
   - `DELETE /api/import/templates/:id` - Delete template

3. **Update Import Logic**
   - Check for matching template before analysis
   - If found, use saved mapping
   - Increment usage_count

**Deliverables:**
- Migration file
- API routes
- Template matching logic

**Estimated Time:** 1-2 days

---

### 🎯 **Milestone 5: Enhanced Error Handling**

**Goal:** Gracefully handle edge cases

**Tasks:**

1. **Add Validation**
   - Warn if date column has invalid dates
   - Warn if amount column has non-numeric values
   - Show row-by-row errors in preview

2. **Add Data Cleaning**
   - Strip currency symbols from amounts
   - Handle negative amounts (parentheses, minus signs)
   - Trim whitespace from descriptions

3. **Add Skip Rows Feature**
   - Let user skip header rows
   - Let user skip footer rows (totals, disclaimers)

**Deliverables:**
- Validation utilities
- Data cleaning functions
- Skip rows UI

**Estimated Time:** 1 day

---

## Technical Architecture

### New File Structure
```
budget-app/src/lib/
├── csv-parser.ts (existing - refactor)
├── column-analyzer.ts (new)
├── pattern-matchers.ts (new)
├── fuzzy-matching.ts (new)
├── date-parser.ts (new)
├── mapping-templates.ts (new)
└── import-types.ts (existing - extend)

budget-app/src/components/import/
├── FileUpload.tsx (existing - update)
├── ColumnMappingDialog.tsx (new)
├── DateFormatSelector.tsx (new)
└── TransactionPreview.tsx (existing - enhance)

budget-app/src/app/api/import/
├── templates/route.ts (new)
└── analyze/route.ts (new)
```

### Data Flow

```
┌─────────────────┐
│ User uploads CSV│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ 1. Parse CSV with Papa      │
│    Get raw data array       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 2. Generate fingerprint     │
│    Hash headers + col count │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│ 3. Check for saved template │
│    Match by fingerprint     │
└────────┬────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
  Found    Not Found
    │         │
    │         ▼
    │    ┌─────────────────────────┐
    │    │ 4. Analyze columns      │
    │    │    - Header matching    │
    │    │    - Content analysis   │
    │    │    - Calculate scores   │
    │    └────────┬────────────────┘
    │             │
    │        ┌────┴────┐
    │        │         │
    │        ▼         ▼
    │   High Conf  Low Conf
    │        │         │
    │        │         ▼
    │        │    ┌──────────────────┐
    │        │    │ 5. Show mapping  │
    │        │    │    dialog to user│
    │        │    └────────┬─────────┘
    │        │             │
    │        │             ▼
    │        │    ┌──────────────────┐
    │        │    │ 6. User confirms │
    │        │    │    or adjusts    │
    │        │    └────────┬─────────┘
    │        │             │
    │        │             ▼
    │        │    ┌──────────────────┐
    │        │    │ 7. Save template?│
    │        │    └────────┬─────────┘
    │        │             │
    └────────┴─────────────┘
             │
             ▼
    ┌─────────────────────────┐
    │ 8. Parse transactions   │
    │    using mapping        │
    └────────┬────────────────┘
             │
             ▼
    ┌─────────────────────────┐
    │ 9. Show preview table   │
    │    (existing flow)      │
    └─────────────────────────┘
```

---

## Example: Real-World CSV Formats

### Format 1: Bank of America
```csv
Posted Date,Reference Number,Payee,Address,Amount
01/15/2025,00001234567890,STARBUCKS,SEATTLE WA,-4.75
01/16/2025,00001234567891,AMAZON.COM,AMZN.COM/BILL WA,-29.99
```

**Detection:**
- Header "Posted Date" → fuzzy match "date" (95%)
- Header "Amount" → exact match (100%)
- Header "Payee" → fuzzy match "description" (90%)
- Content: Column 0 has dates (100%), Column 4 has amounts (100%)

### Format 2: Capital One (No Headers)
```csv
2025-01-15,Purchase,WALMART #1234,-45.67,1234.56
2025-01-16,Purchase,TARGET T-0987,-23.45,1211.11
```

**Detection:**
- No headers detected
- Column 0: Date pattern (100%)
- Column 3: Amount pattern with negatives (100%)
- Column 2: Text descriptions (95%)
- Column 4: Running balance (ignore)

### Format 3: International (European)
```csv
Datum;Beschreibung;Betrag;Saldo
15.01.2025;REWE Markt;-12,50;450,30
16.01.2025;Shell Tankstelle;-45,00;405,30
```

**Detection:**
- Delimiter: semicolon (auto-detected by Papa Parse)
- Header "Datum" → synonym match "date" (100%)
- Header "Beschreibung" → synonym match "description" (100%)
- Header "Betrag" → synonym match "amount" (100%)
- Date format: DD.MM.YYYY (detected from content)
- Decimal separator: comma (detected from content)

---

## Benefits of This Approach

### For Users
✅ **Works with ANY bank** - No more "unsupported format" errors
✅ **Zero configuration** - Auto-detects 90% of formats
✅ **Easy override** - Manual mapping for edge cases
✅ **Learns over time** - Saves templates for faster future imports
✅ **International support** - Handles different date/number formats
✅ **Better error messages** - Shows exactly what went wrong

### For Development
✅ **Maintainable** - No more hardcoded formats to update
✅ **Testable** - Clear separation of concerns
✅ **Extensible** - Easy to add new pattern matchers
✅ **Debuggable** - Confidence scores show why detection succeeded/failed

---

## Testing Strategy

### Unit Tests
- Pattern matchers with 100+ test cases
- Fuzzy matching with edge cases
- Date parsing with 20+ formats
- Amount parsing with various currencies

### Integration Tests
- 50+ real bank CSV files
- Edge cases: no headers, extra columns, missing data
- International formats

### User Testing
- Import CSVs from 10+ different banks
- Measure auto-detection success rate (target: 90%+)
- Measure time to import (target: < 30 seconds)

---

## Success Metrics

**Phase 1 (Auto-Detection):**
- ✅ 90%+ of CSVs auto-detected correctly
- ✅ < 5 seconds to analyze and parse
- ✅ Support 20+ date formats

**Phase 2 (Manual Mapping):**
- ✅ 100% of CSVs can be imported (with user help)
- ✅ Mapping UI takes < 30 seconds to use
- ✅ Templates saved and reused successfully

**Phase 3 (Learning):**
- ✅ 95%+ of repeat imports use saved templates
- ✅ Zero user interaction for known formats

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Auto-detection fails | High | Show mapping UI as fallback |
| Date format ambiguity | Medium | Ask user to clarify (one-time) |
| Performance with large CSVs | Low | Analyze only first 100 rows |
| Template conflicts | Low | Use fingerprint + user confirmation |
| International formats | Medium | Build comprehensive synonym lists |

---

## Future Enhancements (Post-MVP)

1. **AI-Powered Detection**
   - Use LLM to analyze CSV structure
   - Natural language column mapping
   - Example: "The third column looks like merchant names"

2. **Community Template Library**
   - Share templates across users
   - Crowdsource bank format definitions
   - Auto-update when banks change formats

3. **Excel/XLSX Support**
   - Parse Excel files directly
   - Handle multiple sheets
   - Preserve formatting

4. **QFX/OFX Support**
   - Import Quicken/QuickBooks files
   - Standard financial data format

5. **API Integrations**
   - Plaid for direct bank connections
   - Automatic transaction sync
   - No manual CSV downloads

---

## Conclusion

This plan transforms the import feature from supporting 4 hardcoded formats to a **universal, intelligent CSV parser** that can handle any bank statement or spreadsheet.

**Key Innovation:** Hybrid approach combining heuristics, fuzzy matching, and user interaction ensures 100% success rate while maintaining excellent UX.

**Timeline:** 7-10 days for full implementation
**Complexity:** Medium (mostly logic, minimal UI changes)
**Impact:** High (unlocks app for all users, regardless of bank)

