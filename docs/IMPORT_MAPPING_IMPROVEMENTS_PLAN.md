# Import Mapping Improvements Plan

## Overview

This plan outlines improvements to the CSV import mapping system to align with the queue-based import flow. The main goals are:

1. **Queue-based mapping flow**: After mapping CSV columns, transactions should be queued instead of immediately processed
2. **Template management**: Users should be able to view, edit, and delete mapping templates
3. **Re-mapping capability**: Users should be able to re-map imports after they've been queued
4. **Template association**: Proper handling of template association/disassociation during re-mapping

## Current State Analysis

### Current Flow
1. User uploads CSV file
2. If format is unrecognized, user is redirected to `/import/map-columns`
3. User maps columns and optionally saves template
4. After confirmation, transactions are:
   - Parsed with mapping
   - Processed through `processTransactions()` (de-duplication, categorization)
   - Stored in sessionStorage
   - Previewed on `/import` page
5. User reviews and imports transactions

### Issues
- Mapping flow processes transactions immediately instead of queuing
- No way to manage templates (view/edit/delete)
- No way to re-map imports after they're queued
- Template association is not tracked with queued imports

## Database Changes

### Migration: Add mapping fields to `queued_imports` table

**File**: `migrations/050_add_import_mapping_fields.sql`

```sql
-- Add fields to store CSV mapping information with queued imports
ALTER TABLE queued_imports
  ADD COLUMN IF NOT EXISTS csv_data JSONB, -- Store raw CSV data for re-mapping
  ADD COLUMN IF NOT EXISTS csv_analysis JSONB, -- Store CSV analysis result
  ADD COLUMN IF NOT EXISTS csv_mapping_template_id BIGINT REFERENCES csv_import_templates(id) ON DELETE SET NULL, -- Associated template
  ADD COLUMN IF NOT EXISTS csv_fingerprint TEXT, -- CSV fingerprint for template matching
  ADD COLUMN IF NOT EXISTS csv_file_name TEXT; -- Original filename

-- Index for template lookups
CREATE INDEX IF NOT EXISTS idx_queued_imports_template_id ON queued_imports(csv_mapping_template_id);

-- Index for fingerprint lookups
CREATE INDEX IF NOT EXISTS idx_queued_imports_fingerprint ON queued_imports(csv_fingerprint);
```

**Rationale**:
- `csv_data`: Stores raw CSV data so we can re-map without re-uploading
- `csv_analysis`: Stores the analysis result (column detection, date format, etc.)
- `csv_mapping_template_id`: Links to the template used for this import
- `csv_fingerprint`: Used for template matching and re-mapping
- `csv_file_name`: Original filename for display

**Backup Compatibility**: These fields are JSONB and references, which are already handled by the backup system. The backup system will preserve these fields automatically.

## API Changes

### 1. Update `/api/import/queue-manual` route

**File**: `src/app/api/import/queue-manual/route.ts`

**Changes**:
- Accept optional `csvData`, `csvAnalysis`, `csvFingerprint`, `csvMappingTemplateId` parameters
- Store these fields in `queued_imports` table when provided

**New Request Body**:
```typescript
{
  transactions: ParsedTransaction[],
  fileName: string,
  targetAccountId?: number,
  targetCreditCardId?: number,
  isHistorical?: boolean,
  csvData?: string[][], // NEW
  csvAnalysis?: CSVAnalysisResult, // NEW
  csvFingerprint?: string, // NEW
  csvMappingTemplateId?: number, // NEW
}
```

### 2. New API: `/api/import/templates/[id]` - Update template

**File**: `src/app/api/import/templates/[id]/route.ts`

**Methods**:
- `PUT`: Update template (name, mapping)
- `DELETE`: Delete template (already exists, verify it works)

### 3. New API: `/api/import/queue/[batchId]/remap` - Re-map queued import

**File**: `src/app/api/import/queue/[batchId]/remap/route.ts`

**Purpose**: 
- Fetch CSV data and analysis from queued imports
- Return data for re-mapping interface

**Response**:
```typescript
{
  csvData: string[][],
  csvAnalysis: CSVAnalysisResult,
  csvFileName: string,
  currentMapping?: ColumnMapping,
  currentTemplateId?: number,
  currentTemplateName?: string,
}
```

### 4. New API: `/api/import/queue/[batchId]/apply-remap` - Apply re-mapping

**File**: `src/app/api/import/queue/[batchId]/apply-remap/route.ts`

**Purpose**:
- Delete existing queued imports for the batch
- Re-parse CSV with new mapping
- Queue new transactions
- Handle template association/disassociation

**Request Body**:
```typescript
{
  mapping: ColumnMapping,
  saveAsTemplate?: boolean,
  templateName?: string,
  overwriteTemplateId?: number, // If updating existing template
  deleteOldTemplate?: boolean, // If creating new template and want to delete old one
}
```

## Frontend Changes

### 1. Update Mapping Page (`/import/map-columns`)

**File**: `src/app/(dashboard)/import/map-columns/page.tsx`

**Changes**:
- After mapping confirmation, instead of calling `processTransactions()`:
  1. Parse CSV with mapping to get transactions
  2. Call `/api/import/queue-manual` with:
     - Transactions (NOT processed)
     - CSV data, analysis, fingerprint, template ID
  3. Navigate to `/imports/queue` instead of `/import`
  4. Show success message

**Key Changes**:
```typescript
// OLD:
const processedTransactions = await processTransactions(transactions);
sessionStorage.setItem('parsedTransactions', JSON.stringify(processedTransactions));
router.push('/import');

// NEW:
const response = await fetch('/api/import/queue-manual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    transactions, // Raw parsed transactions, NOT processed
    fileName,
    csvData,
    csvAnalysis: analysis,
    csvFingerprint: analysis.fingerprint,
    csvMappingTemplateId: savedTemplateId || undefined,
  }),
});
router.push('/imports/queue');
```

### 2. Template Management Page

**File**: `src/app/(dashboard)/settings/import-templates/page.tsx`

**Features**:
- List all templates with:
  - Template name
  - Fingerprint
  - Column count
  - Usage count
  - Last used date
  - Created date
- Actions:
  - Edit template (opens mapping dialog)
  - Delete template (with confirmation)
  - View template details

**Components**:
- `TemplateList.tsx`: List view with actions
- `EditTemplateDialog.tsx`: Reusable mapping dialog for editing templates

### 3. Re-map Button in Queue Review

**File**: `src/app/(dashboard)/imports/queue/[batchId]/page.tsx`

**Changes**:
- Add "Re-map Fields" button in batch header
- Button should:
  1. Fetch CSV data from queued imports
  2. Navigate to mapping page with data pre-loaded
  3. Show current mapping if template exists
  4. Allow saving as new template or overwriting existing

**Implementation**:
```typescript
const handleRemap = async () => {
  // Fetch CSV data from queued imports
  const response = await fetch(`/api/import/queue/${batchId}/remap`);
  const data = await response.json();
  
  // Store in sessionStorage for mapping page
  sessionStorage.setItem('csvData', JSON.stringify(data.csvData));
  sessionStorage.setItem('csvAnalysis', JSON.stringify(data.csvAnalysis));
  sessionStorage.setItem('csvFileName', data.csvFileName);
  sessionStorage.setItem('remapBatchId', batchId);
  sessionStorage.setItem('currentTemplateId', data.currentTemplateId?.toString() || '');
  
  router.push('/import/map-columns?remap=true');
};
```

### 4. Update Mapping Page for Re-map Flow

**File**: `src/app/(dashboard)/import/map-columns/page.tsx`

**Changes**:
- Detect re-map mode (query param `remap=true`)
- Load current mapping from template if exists
- After confirmation:
  - If re-map mode:
    1. Call `/api/import/queue/[batchId]/apply-remap`
    2. Handle template save options:
       - Overwrite existing template
       - Create new template (with option to delete old)
       - Don't save template
  - If normal mode:
    1. Queue as before

**Template Save Options UI**:
```typescript
// When saving template during re-map:
- [ ] Save as template
  - [ ] Overwrite existing template: [Select template]
  - [ ] Create new template: [Name input]
    - [ ] Delete old template
```

### 5. Template Management Components

**File**: `src/components/import/TemplateList.tsx`

**Features**:
- Display templates in table/card format
- Edit button opens mapping dialog
- Delete button with confirmation
- Usage statistics

**File**: `src/components/import/EditTemplateDialog.tsx`

**Features**:
- Reusable mapping interface
- Pre-loads template mapping
- Allows editing all mapping fields
- Save button updates template

## User Flow Scenarios

### Scenario 1: New Import with Mapping
1. User uploads CSV
2. System doesn't recognize format → redirects to mapping page
3. User maps columns
4. User optionally saves template
5. User clicks "Continue Import"
6. **NEW**: Transactions are queued (NOT processed)
7. User navigates to queue review page
8. User reviews and approves transactions
9. Transactions are imported

### Scenario 2: Import with Existing Template
1. User uploads CSV
2. System recognizes format → uses template automatically
3. Transactions are queued
4. User reviews and approves

### Scenario 3: Re-map Queued Import
1. User views queued import batch
2. User notices mapping is incorrect
3. User clicks "Re-map Fields"
4. Mapping page opens with current mapping loaded
5. User adjusts mapping
6. User chooses to:
   - Overwrite existing template, OR
   - Create new template (optionally delete old)
7. User clicks "Apply Re-mapping"
8. Old queued imports are deleted
9. New transactions are queued with new mapping
10. User reviews new transactions

### Scenario 4: Template Management
1. User navigates to Settings → Import Templates
2. User sees list of templates
3. User can:
   - Edit template (opens mapping dialog)
   - Delete template (with confirmation)
   - View template details

### Scenario 5: Re-map Import Without Template
1. User has queued import without template
2. User clicks "Re-map Fields"
3. Mapping page opens with detected mapping
4. User adjusts mapping
5. User can optionally save as template
6. User applies re-mapping
7. New transactions are queued

## Security Considerations

1. **RLS Policies**: 
   - Ensure `csv_import_templates` RLS policies are correct (already in place)
   - Verify queued imports RLS policies allow users to access their own imports

2. **Template Access**:
   - Users can only view/edit/delete their own templates
   - Template IDs must be validated against user ownership

3. **Re-map Access**:
   - Users can only re-map their own queued imports
   - Batch ID must be validated against user's account

4. **CSV Data Storage**:
   - CSV data stored in JSONB is automatically protected by RLS
   - No additional security needed

## Backup System Compatibility

### Fields Added
- `csv_data JSONB`: Automatically handled by backup system
- `csv_analysis JSONB`: Automatically handled by backup system
- `csv_mapping_template_id BIGINT`: Foreign key, handled by backup system's ID remapping
- `csv_fingerprint TEXT`: Simple text field, automatically handled
- `csv_file_name TEXT`: Simple text field, automatically handled

### Template References
- When restoring backups, template IDs will be remapped if templates exist
- If template doesn't exist, `csv_mapping_template_id` will be NULL (acceptable)

### No Changes Needed
- Backup system already handles JSONB fields
- Backup system already handles foreign keys with NULL handling
- No changes to backup/restore code required

## Testing Checklist

### Unit Tests
- [ ] Template CRUD operations
- [ ] Queue manual import with CSV data
- [ ] Re-map API endpoints
- [ ] Template association/disassociation

### Integration Tests
- [ ] Full import flow with mapping → queue
- [ ] Re-map flow
- [ ] Template management flow
- [ ] Template save during re-map

### Edge Cases
- [ ] Re-map with no existing template
- [ ] Re-map with template that was deleted
- [ ] Delete template that's associated with queued imports
- [ ] Re-map batch with mixed template associations
- [ ] Large CSV files (performance)

### UI Tests
- [ ] Mapping page loads correctly
- [ ] Template management page displays correctly
- [ ] Re-map button appears in queue review
- [ ] Template save options work correctly

## Implementation Order

1. **Database Migration** (050_add_import_mapping_fields.sql)
2. **API Updates**:
   - Update `/api/import/queue-manual` to accept CSV data
   - Create `/api/import/templates/[id]` PUT endpoint
   - Create `/api/import/queue/[batchId]/remap` endpoints
3. **Frontend Updates**:
   - Update mapping page to queue instead of process
   - Create template management page
   - Add re-map button to queue review
   - Update mapping page for re-map flow
4. **Testing**
5. **Documentation**

## Rollback Plan

If issues arise:
1. Revert frontend changes (mapping page, template management)
2. Revert API changes
3. Migration can be left in place (new columns are nullable)
4. Or run rollback migration:
   ```sql
   ALTER TABLE queued_imports
     DROP COLUMN IF EXISTS csv_data,
     DROP COLUMN IF EXISTS csv_analysis,
     DROP COLUMN IF EXISTS csv_mapping_template_id,
     DROP COLUMN IF EXISTS csv_fingerprint,
     DROP COLUMN IF EXISTS csv_file_name;
   ```

## Future Enhancements

1. **Template Sharing**: Allow users to share templates
2. **Template Import/Export**: Export templates as JSON
3. **Bulk Template Operations**: Delete multiple templates at once
4. **Template Versioning**: Track template changes over time
5. **Auto-detect Template Updates**: Suggest template updates when CSV format changes
