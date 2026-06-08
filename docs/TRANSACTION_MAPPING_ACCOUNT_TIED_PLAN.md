# Transaction Import Mapping: Account-Tied Template Plan

## Executive Summary

The current transaction mapping system looks up templates by **fingerprint only** (CSV column structure). This fails when the same file format is used for different account types that need different amount sign conventions—e.g., a Wells Fargo CSV for checking (positive = income) vs. credit card (positive = expense). The columns look identical, but the semantic mapping differs by account.

**Proposed solution**: Tie template lookup to **(fingerprint + destination account)**. When a user selects which account/credit card they're importing for *before* processing, we use that to find or save the correct template. After one manual mapping per format+account, the user never has to re-map that combination again.

---

## Current State Analysis

### 1. Template Storage (`csv_import_templates`)

| Column | Purpose |
|--------|---------|
| `user_id` | Owner |
| `account_id` | Budget account (from migration 022) |
| `fingerprint` | Hash of CSV column headers (format identifier) |
| `template_name` | Optional user-defined name |
| `amount_sign_convention` | `positive_is_expense` \| `positive_is_income` \| etc. |
| Other mapping fields | date_column, amount_column, etc. |

**Current unique constraint**: `UNIQUE(user_id, fingerprint)` (may have been altered by migration 022—need to verify current schema)

**Problem**: One template per fingerprint per user. Same format for checking vs. credit card → same template → wrong convention.

### 2. Manual CSV Import Flow (`FileUpload.tsx`)

1. User uploads file
2. System analyzes CSV → gets `fingerprint`
3. **Template lookup**: `loadTemplate(fingerprint)` — **no account**
4. If template found → use it, skip mapping
5. If not found + high confidence → auto-detect, queue
6. If not found + low confidence → redirect to `/import/map-columns`
7. Account selection (`defaultAccountId`, `defaultCreditCardId`) exists but is **optional** and used only for `target_account_id` / `target_credit_card_id` on transactions—**not for template lookup**

### 3. Template API (`/api/import/templates`)

- **GET** `?fingerprint=xxx`: Returns template by `user_id` + `fingerprint` — no account
- **POST**: Saves with `user_id`, `fingerprint`, mapping — no `target_account_id` / `target_credit_card_id`

### 4. Automatic Imports (Teller)

- **Works correctly**: Templates are stored per (import setup + Teller account)
- `automatic_import_setups.csv_mapping_template_id` — global fallback
- `source_config.account_mappings[].csv_mapping_template_id` — per Teller account
- Lookup: `accountMapping?.csv_mapping_template_id || setup.csv_mapping_template_id`
- Each Teller account can have its own mapping; credit card vs checking is handled correctly

### 5. Manual Import Setup (`getOrCreateManualImportSetup`)

- Single shared manual setup per budget account
- Ignores `targetAccountId` / `targetCreditCardId` (one setup for all manual uploads)
- `target_account_id` / `target_credit_card_id` are stored on **queued_imports**, not on the setup

### 6. Apply-Remap Flow

- Creates/updates templates with `account_id` (budget account)
- Does **not** pass `target_account_id` or `target_credit_card_id` to template
- For automatic imports: updates `automatic_import_setups` or `account_mappings[].csv_mapping_template_id` correctly
- For manual imports: template has no account binding beyond budget account

---

## Root Cause

The fingerprint identifies **format** (column names, structure). It does **not** identify **semantics** (how amounts map to income/expense), which depends on the **destination account type** (checking vs. credit card). Two identical CSVs need different templates if they go to different account types.

---

## Proposed Solution

### Core Principle

**Template lookup key** = `(budget_account_id, fingerprint, target_account_id?, target_credit_card_id?)`

- `target_account_id` = bank account (checking/savings) — from `accounts` table
- `target_credit_card_id` = credit card — from `credit_cards` table
- Exactly one of these is set when the user selects a destination
- Both null = “format only” template (used when user selects “No account” / “Don’t assign to account”)

### User Flow

#### Manual CSV Import

1. **Account selection first** (before or at the same time as file selection):
   - “Import transactions for: [Dropdown: No account | Chase Checking | Amex Credit Card | …]”
   - Default can remain “No account” for backwards compatibility; we can encourage selecting an account

2. **File upload**:
   - Analyze CSV → `fingerprint`
   - Look up template by `(fingerprint, target_account_id, target_credit_card_id)`
   - If found → use template, skip mapping, queue
   - If not found:
     - High confidence → auto-detect, save template with account binding, queue
     - Low confidence → mapping page; after mapping, save template with account binding

3. **Template save (mapping page / apply-remap)**:
   - When saving: include `target_account_id` and `target_credit_card_id` from the current import
   - Template is stored with this binding so future imports for the same format+account reuse it

#### Automatic Imports (Teller, etc.)

- Already correct: templates are per import setup and per Teller account via `account_mappings`
- No changes required for the automatic import path

#### No Account Selected

- If user selects “No account”:
  - Lookup: `(fingerprint, null, null)` — format-only template
  - Useful if the user hasn’t created accounts yet or doesn’t want to assign
  - Fallback: if no format-only template exists, use auto-detect or mapping page, then save as format-only

---

## Database Changes

### Migration: Extend `csv_import_templates`

```sql
-- Add target account binding to templates
ALTER TABLE csv_import_templates
  ADD COLUMN IF NOT EXISTS target_account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_credit_card_id BIGINT REFERENCES credit_cards(id) ON DELETE CASCADE;

-- Ensure at most one of target_account_id or target_credit_card_id is set
ALTER TABLE csv_import_templates
  ADD CONSTRAINT chk_template_target_exclusive 
  CHECK (target_account_id IS NULL OR target_credit_card_id IS NULL);

-- New lookup: (account_id, fingerprint, target_account_id, target_credit_card_id)
-- Drop old unique if it exists, add new composite unique
ALTER TABLE csv_import_templates
  DROP CONSTRAINT IF EXISTS csv_import_templates_user_id_fingerprint_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_csv_import_templates_lookup 
  ON csv_import_templates(account_id, fingerprint, COALESCE(target_account_id, 0), COALESCE(target_credit_card_id, 0));

-- For format-only (no account): target_account_id = NULL, target_credit_card_id = NULL
-- Use separate unique for that case since COALESCE would collide
-- Simpler: use composite of (account_id, fingerprint, target_account_id, target_credit_card_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_csv_import_templates_lookup 
  ON csv_import_templates(account_id, fingerprint, target_account_id, target_credit_card_id);
-- Note: NULL = NULL in unique index is treated as distinct in PostgreSQL, so we get one row per (account_id, fingerprint, null, null)
```

**Backward compatibility**:
- Existing templates have `target_account_id = NULL`, `target_credit_card_id = NULL` (format-only)
- They keep working for the “no account” path
- Migrations should set these columns to NULL for existing rows

---

## API Changes

### 1. `/api/import/templates` (GET)

**Current**: `?fingerprint=xxx` → one template per user+fingerprint

**New**: `?fingerprint=xxx&targetAccountId=N&targetCreditCardId=M` (one of these optional)

**Lookup priority**:
1. `(fingerprint, target_account_id, target_credit_card_id)` — account-specific
2. `(fingerprint, null, null)` — format-only fallback

**Response**: Single best-matching template (account-specific first, then format-only).

### 2. `/api/import/templates` (POST)

**New body fields**:
- `targetAccountId?: number`
- `targetCreditCardId?: number`

**Validation**: At most one of `targetAccountId`, `targetCreditCardId` may be set.

**Upsert**: Use `(account_id, fingerprint, target_account_id, target_credit_card_id)` for conflict resolution.

### 3. `loadTemplate` in `mapping-templates.ts`

```typescript
export async function loadTemplate(
  fingerprint: string,
  targetAccountId?: number | null,
  targetCreditCardId?: number | null
): Promise<CSVImportTemplate | null>
```

- Build query params: `fingerprint`, optionally `targetAccountId` / `targetCreditCardId`
- API performs the two-step lookup (account-specific → format-only)

### 4. `saveTemplate` in `mapping-templates.ts`

```typescript
export interface SaveTemplateInput {
  // ...existing
  targetAccountId?: number | null;
  targetCreditCardId?: number | null;
}
```

---

## Frontend Changes

### 1. `FileUpload.tsx` — Require Account for Template Lookup

**Today**: `loadTemplate(analysis.fingerprint)`

**New**:
- Use `defaultAccountId` / `defaultCreditCardId` (already in UI)
- `loadTemplate(analysis.fingerprint, defaultAccountId, defaultCreditCardId)`
- Pass `targetAccountId` / `targetCreditCardId` to `queue-manual` and mapping page

**UX**:
- Add short copy: “Select the account or credit card these transactions belong to for best mapping results.”
- Consider moving account selector above the drop zone so it’s clear it affects template selection

### 2. `/import/map-columns` Page

- Accept `targetAccountId` and `targetCreditCardId` (e.g. from sessionStorage or URL)
- When calling `saveTemplate` and `queue-manual`, pass these through
- If coming from remap: use `target_account_id` / `target_credit_card_id` from the queued import batch

### 3. `queue-manual` Route

- Accept `targetAccountId`, `targetCreditCardId`
- Pass them to template save logic when creating/updating templates
- Use them when creating templates from auto-detected mappings

### 4. `apply-remap` Route

- When creating/updating templates, set `target_account_id` and `target_credit_card_id` from `firstQueuedImport.target_account_id` and `firstQueuedImport.target_credit_card_id`
- Ensures remapped imports get account-bound templates

---

## Automatic Imports (Teller) — No Schema Changes

- Templates live in `automatic_import_setups.csv_mapping_template_id` and `source_config.account_mappings[].csv_mapping_template_id`
- These point to `csv_import_templates.id`
- When a user remaps, we create/update a template and store its ID in the setup or account mapping
- The new `target_account_id` / `target_credit_card_id` on the template are for manual-import lookups; Teller continues to resolve templates via setup/account mapping IDs

---

## Edge Cases

### 1. User has no accounts yet

- Account dropdown: “No account” only
- Lookup and save as format-only template
- Works as today, minus account binding

### 2. Same format, different banks

- Bank A checking and Bank B checking may share fingerprint
- Different `target_account_id` → different templates
- Each checking account gets its own template

### 3. Migrating existing templates

- Old templates: `target_account_id = NULL`, `target_credit_card_id = NULL`
- Remain as format-only fallback
- New imports with account selected will create account-specific templates

### 4. User changes account after upload

- If they pick account A then switch to B before confirm:
  - Re-run template lookup for B
  - If different template exists for B, use it
  - If not, keep current mapping but associate the saved template with B when saving

---

## Implementation Order

1. **Migration**: Add `target_account_id`, `target_credit_card_id` to `csv_import_templates` and adjust unique constraint.
2. **API**: Update GET/POST `/api/import/templates` for account-aware lookup and save.
3. **`mapping-templates.ts`**: Update `loadTemplate` and `saveTemplate` signatures and calls.
4. **`FileUpload.tsx`**: Use account in template lookup; pass account to queue and mapping page.
5. **Map-columns page**: Pass and use `targetAccountId` / `targetCreditCardId` when saving.
6. **`queue-manual`**: Accept and pass target account/credit card; use when creating templates from auto-detect.
7. **`apply-remap`**: Set `target_account_id` / `target_credit_card_id` when creating/updating templates.
8. **Manual setup consideration**: Optionally use `target_account_id` / `target_credit_card_id` in manual setup or batch ID for more precise batching (lower priority).
9. **Testing**:
   - Same CSV format for checking vs credit card
   - No-account flow
   - Remap and automatic imports

---

## Success Criteria

- [ ] Same CSV format used for checking and credit card gets different templates when accounts differ.
- [ ] User maps once per (format + account); future imports reuse the template.
- [ ] “No account” still works with format-only templates.
- [ ] Teller and other automatic imports behave unchanged.
- [ ] Backward compatible with existing templates (treated as format-only).

---

## Open Questions

1. **Account selector placement**: Prefer before the drop zone to encourage selection, or keep as-is?
2. **Default for account selector**: Default to “No account” vs. last-used account?
3. **Batch ID for manual imports**: Should manual batches include `target_account_id` in the batch key for clearer grouping?
