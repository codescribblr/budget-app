# Transaction Tags Feature - Implementation Plan

## Overview

This document outlines the comprehensive plan to add a tagging system to transactions. Tags provide a flexible, user-defined way to categorize and filter transactions beyond the existing category and merchant systems. This enables users to track specific attributes like rental properties, projects, tax categories, or any custom classification that doesn't fit into the rigid category/merchant structure.

## ⚠️ Critical: Budget Account Scoping

**IMPORTANT**: Tags are scoped to **budget accounts**, not users. This means:

- When a user switches accounts via the account switcher, they see different tags
- Tags are isolated per budget account (similar to transactions and merchant groups)
- All queries must use `getActiveAccountId()` and filter by `account_id`
- RLS policies must check account membership, not just `user_id`
- When assigning tags to transactions, both must belong to the same budget account

This ensures data isolation between different budget accounts, even when accessed by the same user.

## Goals

1. Allow users to assign multiple tags to transactions
2. Enable filtering and searching transactions by tags
3. Provide tag management (create, edit, delete, merge tags)
4. Support tag-based reporting and analytics
5. Integrate tags seamlessly into existing transaction workflows
6. Maintain performance with efficient database queries

## Use Cases

### Primary Use Cases
- **Rental Property Tracking**: Tag all expenses related to "124 Irene Circle" to track property-specific costs
- **Project Tracking**: Tag transactions related to specific projects or clients
- **Tax Preparation**: Tag transactions for tax categories (e.g., "Business Expense", "Medical", "Charitable")
- **Event Tracking**: Tag expenses related to specific events or trips
- **Custom Classifications**: Any user-defined grouping that doesn't fit categories or merchants

### Secondary Use Cases
- **Multi-dimensional Filtering**: Combine tags with categories/merchants for complex queries
- **Tag-based Budgeting**: Set spending limits or goals by tag
- **Reporting**: Generate reports filtered by tags (e.g., "Show all rental property expenses")
- **Bulk Operations**: Apply tags to multiple transactions at once

## Current State Analysis

### Database Schema
- `transactions` table: Core transaction data with `user_id`, `date`, `description`, `total_amount`, `transaction_type`
- `transaction_splits` table: Many-to-many relationship between transactions and categories
- `merchant_groups` table: Merchant grouping system
- `categories` table: Budget categories

### Current Filtering Capabilities
- Filter by merchant (single or multiple merchant groups)
- Filter by category (single or multiple categories)
- Filter by transaction type (income/expense)
- Filter by date range
- Search by description/merchant name

### Navigation Structure
- Main navigation includes: Dashboard, Budgets, Transactions, Import, Reports, Merchants, Settings
- Reports section includes: Overview, Trends, Category Reports
- Merchants have a dedicated management page

## Database Design

### Schema Design

#### Tags Table
```sql
CREATE TABLE tags (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT, -- Optional: hex color code for UI display (e.g., "#FF5733")
  description TEXT, -- Optional: user notes about the tag
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, LOWER(name)) -- Case-insensitive unique tag names per budget account
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_account_id ON tags(account_id);
CREATE INDEX idx_tags_name_lower ON tags(account_id, LOWER(name));
```

**Important**: Tags are scoped to `budget_accounts`, not users. When a user switches accounts via the account switcher, they will see different tags. This ensures tags are isolated per budget account, similar to how transactions and merchant groups work.

**Design Decisions**:
- Tags are scoped to `account_id` (references `budget_accounts`) to support multi-account setups
- **Critical**: Tags are isolated per budget account - switching accounts shows different tags
- Case-insensitive uniqueness per account: "Rental" and "rental" are the same tag within an account
- Optional color field for visual organization
- Optional description for user notes
- `user_id` is kept for audit trails and RLS policies, but access control is based on `account_id`

#### Transaction Tags Junction Table
```sql
CREATE TABLE transaction_tags (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  tag_id BIGINT REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(transaction_id, tag_id) -- Prevent duplicate tag assignments
);

CREATE INDEX idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
CREATE INDEX idx_transaction_tags_tag_id ON transaction_tags(tag_id);
CREATE INDEX idx_transaction_tags_composite ON transaction_tags(transaction_id, tag_id);
```

**Design Decisions**:
- Many-to-many relationship: transactions can have multiple tags, tags can be on multiple transactions
- Cascade delete: deleting a transaction removes its tag associations
- Cascade delete: deleting a tag removes all transaction associations (user must confirm)
- Composite index for efficient filtering queries

### Migration Strategy

**Migration File**: `migrations/XXX_add_tags_feature.sql`

```sql
-- Migration: XXX_add_tags_feature.sql
-- Description: Add tags system for transactions
-- Date: [CURRENT_DATE]

BEGIN;

-- Create tags table
CREATE TABLE IF NOT EXISTS tags (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, LOWER(name)) -- Case-insensitive unique per budget account
);

-- Create transaction_tags junction table
CREATE TABLE IF NOT EXISTS transaction_tags (
  id BIGSERIAL PRIMARY KEY,
  transaction_id BIGINT REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  tag_id BIGINT REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(transaction_id, tag_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_account_id ON tags(account_id);
CREATE INDEX IF NOT EXISTS idx_tags_name_lower ON tags(account_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_transaction_tags_transaction_id ON transaction_tags(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_tag_id ON transaction_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_transaction_tags_composite ON transaction_tags(transaction_id, tag_id);

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
-- Users can only access tags in accounts they belong to (owner or member)
CREATE POLICY "Users can view tags in their accounts" ON tags FOR SELECT 
  USING (
    account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can insert tags in their accounts" ON tags FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id
    AND account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can update tags in their accounts" ON tags FOR UPDATE 
  USING (
    account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Users can delete tags in their accounts" ON tags FOR DELETE 
  USING (
    account_id IN (
      SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
      UNION
      SELECT account_id FROM account_users 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- RLS Policies for transaction_tags
-- Users can only access transaction_tags for transactions in their accounts
CREATE POLICY "Users can view transaction tags in their accounts" ON transaction_tags FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.id = transaction_tags.transaction_id 
      AND t.budget_account_id IN (
        SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
        UNION
        SELECT account_id FROM account_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Users can insert transaction tags in their accounts" ON transaction_tags FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.id = transaction_tags.transaction_id 
      AND t.budget_account_id IN (
        SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
        UNION
        SELECT account_id FROM account_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
    AND EXISTS (
      SELECT 1 FROM tags tag 
      WHERE tag.id = transaction_tags.tag_id 
      AND tag.account_id IN (
        SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
        UNION
        SELECT account_id FROM account_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

CREATE POLICY "Users can delete transaction tags in their accounts" ON transaction_tags FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM transactions t 
      WHERE t.id = transaction_tags.transaction_id 
      AND t.budget_account_id IN (
        SELECT id FROM budget_accounts WHERE owner_id = auth.uid()
        UNION
        SELECT account_id FROM account_users 
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

COMMIT;
```

## TypeScript Type Definitions

### Core Types

**File**: `src/lib/types.ts`

```typescript
export interface Tag {
  id: number;
  user_id: string;
  account_id: number; // References budget_accounts.id
  name: string;
  color?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TagWithStats extends Tag {
  transaction_count: number;
  total_amount: number;
  last_used?: string | null;
}

export interface TransactionTag {
  id: number;
  transaction_id: number;
  tag_id: number;
  created_at: string;
}

// Extend existing TransactionWithSplits
export interface TransactionWithSplits extends Transaction {
  splits: TransactionSplit[];
  tags?: Tag[]; // Tags associated with this transaction
  merchant_name?: string | null;
  merchant_group_id?: number | null;
}
```

## UI/UX Design Decisions

### 1. Tag Management Location

**Decision**: Create a dedicated "Tags" page in the navigation, similar to "Merchants"

**Rationale**:
- Provides centralized tag management
- Allows users to see all tags, usage statistics, and manage them
- Consistent with existing "Merchants" page pattern
- Enables bulk operations and tag merging

**Navigation Placement**:
- Add to "Other" section in sidebar (alongside Merchants, Category Rules, Settings)
- Path: `/tags`
- Icon: `Tag` or `Tags` from lucide-react

### 2. Tag Creation and Assignment

**Decision**: Support both inline creation and dedicated management

**Approach A - Inline Creation (Primary)**:
- In transaction edit/create dialogs, show a tag selector with autocomplete
- Allow creating new tags inline (e.g., "Create tag '124 Irene Circle'")
- Show existing tags as chips/badges with colors
- Multi-select support (transactions can have multiple tags)

**Approach B - Dedicated Management Page**:
- Full CRUD operations on `/tags` page
- List view with statistics (transaction count, total amount, last used)
- Edit tag name, color, description
- Delete tags (with confirmation showing affected transactions)
- Merge tags functionality

**Decision**: Implement both approaches
- Inline creation for quick tag assignment during transaction entry
- Dedicated page for tag management, bulk operations, and organization

### 3. Tag Display in Transaction List

**Decision**: Show tags as colored chips/badges in transaction list

**Implementation**:
- Display tags below or next to transaction description
- Use tag colors if defined, otherwise use default color scheme
- Limit visible tags (e.g., show first 3, then "+2 more")
- Click tag to filter transactions by that tag
- Hover to see full tag name if truncated

**Example UI**:
```
Transaction Description
🏷️ 124 Irene Circle  🏷️ Business Expense  +2 more
```

### 4. Tag Filtering Integration

**Decision**: Add tag filter to existing transaction filters

**Implementation**:
- Add tag filter section to transaction page filters
- Multi-select dropdown/combobox with search
- Show selected tags as removable chips
- Support filtering by multiple tags (AND logic: transaction must have all selected tags)
- URL parameter: `?tags=1,2,3` (tag IDs)

**Filter UI Location**:
- Add to existing filter panel on transactions page
- Group with other filters (Category, Merchant, Date Range, Transaction Type)

### 5. Tag Input Component

**Decision**: Create reusable TagSelector component

**Features**:
- Autocomplete search for existing tags
- Create new tag inline
- Multi-select with chips
- Color-coded display
- Keyboard navigation support

**Component**: `src/components/tags/TagSelector.tsx`

## API Design

### Tag Management Endpoints

#### GET /api/tags
**Purpose**: List all tags for the current active budget account

**Query Parameters**:
- `includeStats` (boolean, default: false): Include transaction count and totals
- `search` (string): Search tags by name

**Response**:
```typescript
Tag[] | TagWithStats[]
```

**Implementation Notes**:
- Uses `getActiveAccountId()` to determine which account's tags to return
- Filters by `account_id`, not `user_id`
- Returns empty array if no active account

#### POST /api/tags
**Purpose**: Create a new tag in the active budget account

**Request Body**:
```typescript
{
  name: string;
  color?: string;
  description?: string;
}
```

**Response**:
```typescript
Tag
```

**Implementation Notes**:
- Uses `getActiveAccountId()` to determine which account to create the tag in
- Automatically sets `account_id` to the active account
- Validates tag name uniqueness within the account (case-insensitive)

#### GET /api/tags/[id]
**Purpose**: Get a specific tag with statistics

**Response**:
```typescript
TagWithStats
```

#### PATCH /api/tags/[id]
**Purpose**: Update a tag

**Request Body**:
```typescript
{
  name?: string;
  color?: string;
  description?: string;
}
```

**Response**:
```typescript
Tag
```

#### DELETE /api/tags/[id]
**Purpose**: Delete a tag

**Query Parameters**:
- `force` (boolean, default: false): Force delete even if tag has transactions

**Response**:
```typescript
{ success: boolean; deleted_transactions_count?: number }
```

#### POST /api/tags/merge
**Purpose**: Merge multiple tags into one

**Request Body**:
```typescript
{
  source_tag_ids: number[];
  target_tag_id: number;
}
```

**Response**:
```typescript
{ success: boolean; merged_count: number }
```

### Transaction Tag Endpoints

#### GET /api/transactions/[id]/tags
**Purpose**: Get tags for a specific transaction

**Response**:
```typescript
Tag[]
```

#### POST /api/transactions/[id]/tags
**Purpose**: Add tags to a transaction

**Request Body**:
```typescript
{
  tag_ids: number[];
}
```

**Response**:
```typescript
{ success: boolean; tags: Tag[] }
```

#### DELETE /api/transactions/[id]/tags/[tagId]
**Purpose**: Remove a tag from a transaction

**Response**:
```typescript
{ success: boolean }
```

#### PUT /api/transactions/[id]/tags
**Purpose**: Replace all tags on a transaction

**Request Body**:
```typescript
{
  tag_ids: number[];
}
```

**Response**:
```typescript
{ success: boolean; tags: Tag[] }
```

### Bulk Operations

#### POST /api/tags/bulk-assign
**Purpose**: Assign tags to multiple transactions

**Request Body**:
```typescript
{
  transaction_ids: number[];
  tag_ids: number[];
}
```

**Response**:
```typescript
{ success: boolean; updated_count: number }
```

#### POST /api/tags/bulk-remove
**Purpose**: Remove tags from multiple transactions

**Request Body**:
```typescript
{
  transaction_ids: number[];
  tag_ids: number[];
}
```

**Response**:
```typescript
{ success: boolean; updated_count: number }
```

## Backend Implementation

### Database Query Functions

**File**: `src/lib/supabase-queries.ts` (or new `src/lib/db/tags.ts`)

#### Core Functions

```typescript
// Get all tags for current account
export async function getTags(includeStats: boolean = false): Promise<Tag[] | TagWithStats[]>

// Get tag by ID
export async function getTagById(id: number): Promise<Tag | null>

// Create tag
export async function createTag(data: { name: string; color?: string; description?: string }): Promise<Tag>

// Update tag
export async function updateTag(id: number, data: Partial<Pick<Tag, 'name' | 'color' | 'description'>>): Promise<Tag>

// Delete tag
export async function deleteTag(id: number, force: boolean = false): Promise<{ success: boolean; deleted_transactions_count?: number }>

// Merge tags
export async function mergeTags(sourceTagIds: number[], targetTagId: number): Promise<{ success: boolean; merged_count: number }>

// Get tags for transaction
export async function getTransactionTags(transactionId: number): Promise<Tag[]>

// Add tags to transaction
export async function addTagsToTransaction(transactionId: number, tagIds: number[]): Promise<Tag[]>

// Remove tag from transaction
export async function removeTagFromTransaction(transactionId: number, tagId: number): Promise<boolean>

// Replace all tags on transaction
export async function setTransactionTags(transactionId: number, tagIds: number[]): Promise<Tag[]>

// Bulk assign tags
export async function bulkAssignTags(transactionIds: number[], tagIds: number[]): Promise<number>

// Bulk remove tags
export async function bulkRemoveTags(transactionIds: number[], tagIds: number[]): Promise<number>

// Search tags
export async function searchTags(query: string): Promise<Tag[]>
```

#### Transaction Query Updates

**Update existing functions**:
- `getTransactions()`: Include tags in SELECT query, filtered by active account
- `getTransactionById()`: Include tags, filtered by active account
- `createTransaction()`: Accept optional tag_ids parameter (verify tags belong to active account)
- `updateTransaction()`: Handle tag updates (verify tags belong to active account)

**Example Query Update**:
```typescript
// In getTransactions or similar
const accountId = await getActiveAccountId();
if (!accountId) throw new Error('No active account');

.select(`
  *,
  merchant_groups (display_name),
  transaction_tags (
    tags!inner (*)
  )
`)
.eq('budget_account_id', accountId) // Filter transactions by active account
// Tags are automatically filtered because they're scoped to account_id
```

**Critical**: All tag queries must:
1. Use `getActiveAccountId()` to get the current account
2. Filter tags by `account_id = accountId` (not `user_id`)
3. Verify tags belong to the active account before assigning to transactions
4. Ensure transaction_tags only link transactions and tags from the same account

## Frontend Implementation

### Components

#### 1. TagsPage Component
**File**: `src/components/tags/TagsPage.tsx`

**Features**:
- List all tags with statistics
- Search/filter tags
- Create new tag button
- Edit tag (name, color, description)
- Delete tag (with confirmation)
- Merge tags functionality
- Link to filtered transactions for each tag

**UI Layout**:
- Table view similar to MerchantsPage
- Columns: Name, Color, Description, Transaction Count, Total Amount, Last Used, Actions

#### 2. TagSelector Component
**File**: `src/components/tags/TagSelector.tsx`

**Features**:
- Multi-select combobox with autocomplete
- Create new tag inline
- Display selected tags as chips
- Color-coded chips
- Keyboard navigation

**Props**:
```typescript
interface TagSelectorProps {
  selectedTagIds: number[];
  onChange: (tagIds: number[]) => void;
  placeholder?: string;
  maxDisplay?: number; // Max tags to show before "+X more"
}
```

#### 3. TagChip Component
**File**: `src/components/tags/TagChip.tsx`

**Features**:
- Display tag with color
- Clickable to filter transactions
- Removable (if in edit mode)
- Tooltip with full name/description

#### 4. TagFilter Component
**File**: `src/components/tags/TagFilter.tsx`

**Features**:
- Multi-select dropdown for filtering
- Show selected tags as removable chips
- Integrate with existing filter panel

#### 5. Transaction Tags Display
**Update**: `src/components/transactions/TransactionList.tsx`

**Changes**:
- Display tags below transaction description
- Make tags clickable to filter
- Limit visible tags with "+X more" indicator

### Page Updates

#### Transactions Page
**File**: `src/components/transactions/TransactionsPage.tsx`

**Updates**:
- Add tag filter to filter panel
- Parse `tags` URL parameter
- Include tags in transaction queries
- Display tags in transaction list

#### Edit Transaction Dialog
**File**: `src/components/transactions/EditTransactionDialog.tsx`

**Updates**:
- Add TagSelector component
- Load existing tags for transaction
- Save tags when updating transaction

#### Create Transaction Dialog
**File**: `src/components/transactions/AddTransactionDialog.tsx` (or similar)

**Updates**:
- Add TagSelector component
- Include tags when creating transaction

## Reporting Features

### Tag-Based Reports

#### 1. Tag Spending Report
**Component**: `src/components/reports/tags/TagSpendingReport.tsx`

**Features**:
- Show spending by tag (similar to category spending)
- Bar chart or pie chart
- Date range filtering
- Compare multiple tags
- Show transaction count and average transaction amount

**Location**: Add to Reports section or create `/reports/tags` page

#### 2. Tag Trends
**Component**: `src/components/reports/tags/TagTrends.tsx`

**Features**:
- Monthly spending trends by tag
- Compare tag spending over time
- Show growth/decline percentages

#### 3. Tag Transaction List
**Component**: `src/components/reports/tags/TagTransactionList.tsx`

**Features**:
- List all transactions for selected tag(s)
- Filterable by date range
- Export to CSV
- Show category and merchant breakdown

#### 4. Multi-Tag Analysis
**Component**: `src/components/reports/tags/MultiTagAnalysis.tsx`

**Features**:
- Compare spending across multiple tags
- Show overlap (transactions with multiple tags)
- Venn diagram or similar visualization

### Integration with Existing Reports

#### Update ReportsPage
**File**: `src/components/reports/ReportsPage.tsx`

**Updates**:
- Add tag filter option
- Show tag breakdown in category reports
- Include tags in merchant reports

#### Update Category Reports
**File**: `src/components/reports/categories/CategoryReportsList.tsx`

**Updates**:
- Allow filtering by tag
- Show tag distribution within categories

## Advanced Features

### 1. Tag Suggestions
**Feature**: Suggest tags based on transaction description or category

**Implementation**:
- Analyze existing tag patterns
- Suggest tags when creating/editing transactions
- Use AI/ML for smart suggestions (future enhancement)

### 2. Tag Rules
**Feature**: Auto-assign tags based on rules (similar to category rules)

**Example Rules**:
- If category is "Rental" and merchant contains "Home Depot", tag as "124 Irene Circle"
- If description contains "Project X", tag as "Project X"

**Component**: `src/components/tags/TagRulesPage.tsx`

**Database**:
```sql
CREATE TABLE tag_rules (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  budget_account_id BIGINT REFERENCES budget_accounts(id) ON DELETE CASCADE NOT NULL,
  tag_id BIGINT REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('category', 'merchant', 'description', 'amount')),
  rule_value TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 3. Tag Templates
**Feature**: Pre-defined tag sets for common use cases

**Examples**:
- "Rental Property Management" template: Creates tags for common rental expenses
- "Tax Categories" template: Creates tags for tax-deductible categories
- "Project Tracking" template: Creates tags for project management

### 4. Tag Hierarchies
**Feature**: Support parent-child tag relationships

**Use Case**:
- Parent: "Rental Properties"
  - Child: "124 Irene Circle"
  - Child: "456 Main St"

**Database Addition**:
```sql
ALTER TABLE tags ADD COLUMN parent_tag_id BIGINT REFERENCES tags(id) ON DELETE SET NULL;
```

### 5. Tag Colors and Icons
**Feature**: Enhanced visual organization

**Implementation**:
- Color picker for tags
- Icon selection (optional)
- Color themes (e.g., all rental tags use blue shades)

### 6. Tag Export/Import
**Feature**: Export tags and tag assignments, import from CSV

**Use Cases**:
- Backup tag structure
- Migrate tags between accounts
- Bulk import tags from external system

### 7. Tag Analytics Dashboard
**Feature**: Comprehensive tag analytics page

**Metrics**:
- Most used tags
- Tags with highest spending
- Tag growth over time
- Tag distribution across categories
- Tag overlap analysis

## Search Integration

### Command Palette Integration
**File**: `src/components/layout/command-palette.tsx`

**Updates**:
- Add tag search to command palette
- Quick filter: "Filter by tag: [tag name]"
- Navigate to tag management

### Transaction Search Enhancement
**File**: `src/lib/supabase-queries.ts` (searchTransactions function)

**Updates**:
- Include tag names in search
- Search by tag name returns transactions with that tag

## Performance Considerations

### Database Optimization

1. **Indexes**: Already defined in migration
   - Composite index on `transaction_tags(transaction_id, tag_id)`
   - Index on `tags(user_id, budget_account_id, LOWER(name))`

2. **Query Optimization**:
   - Use JOINs efficiently
   - Limit tag loading (don't load all tags for all transactions)
   - Cache tag list in frontend

3. **Bulk Operations**:
   - Use batch inserts for bulk tag assignment
   - Consider background jobs for large operations

### Frontend Optimization

1. **Tag List Caching**:
   - Cache tag list in React context or state management
   - Refresh on tag create/update/delete

2. **Lazy Loading**:
   - Load tags for transactions on-demand (when expanding transaction details)
   - Or load tags in batches

3. **Virtual Scrolling**:
   - If tag list becomes very long, use virtual scrolling

## Testing Strategy

### Unit Tests

1. **Tag CRUD Operations**:
   - Create tag with valid/invalid data
   - Update tag
   - Delete tag (with and without transactions)
   - Merge tags

2. **Transaction Tag Operations**:
   - Add tags to transaction
   - Remove tags from transaction
   - Replace tags on transaction
   - Bulk operations

3. **Validation**:
   - Case-insensitive uniqueness
   - Tag name validation (length, special characters)
   - Color format validation

### Integration Tests

1. **Transaction Flow**:
   - Create transaction with tags
   - Update transaction tags
   - Delete transaction (verify tags cleaned up)
   - Filter transactions by tags

2. **Tag Management Flow**:
   - Create tag → assign to transaction → verify
   - Merge tags → verify transactions updated
   - Delete tag → verify transactions updated

### E2E Tests

1. **Tag Management**:
   - Navigate to tags page
   - Create new tag
   - Edit tag
   - Delete tag

2. **Transaction Tagging**:
   - Create transaction with tags
   - Edit transaction to add/remove tags
   - Filter transactions by tag

3. **Reporting**:
   - Generate tag spending report
   - Filter reports by tags

## Migration Steps

1. **Pre-Migration Backup**:
   - Use existing user backup system to create a backup before migration
   - System-level SQL backups are also available if needed

2. **Run Migration**:
   - Execute `XXX_add_tags_feature.sql`
   - Verify tables created
   - Verify RLS policies active
   - Verify indexes created

3. **Post-Migration Verification**:
   - Test tag creation
   - Test transaction tagging
   - Verify RLS policies work correctly
   - Test backup/restore includes tags

## Backup and Restore Integration

Tags and transaction_tags must be included in the user backup and restore system.

### Backup Integration

**File**: `src/lib/backup-utils.ts`

**Updates Required**:

1. **Add to AccountBackupData interface**:
```typescript
export interface AccountBackupData {
  // ... existing fields ...
  tags?: any[];
  transaction_tags?: any[];
}
```

2. **Add to UserBackupData interface** (for backward compatibility):
```typescript
export interface UserBackupData {
  // ... existing fields ...
  tags?: any[];
  transaction_tags?: any[];
}
```

3. **Update exportAccountData function**:
   - Add tags fetch: `supabase.from('tags').select('*').eq('account_id', accountId)`
   - Add transaction_tags fetch: Use join to get tags for transactions in the account
   - Include in returned backup data

**Implementation**:
```typescript
// In exportAccountData function, add to Promise.all:
const { data: tags } = await supabase.from('tags').select('*').eq('account_id', accountId);

// For transaction_tags, fetch via join:
const { data: transaction_tags } = await supabase
  .from('transaction_tags')
  .select('*, transactions!inner(budget_account_id)')
  .eq('transactions.budget_account_id', accountId);

// Add to return object:
tags: tags || [],
transaction_tags: transaction_tags || [],
```

### Restore Integration

**File**: `src/lib/backup-utils.ts`

**Updates Required**:

1. **Add to deletion step** (in `importUserDataFromFile`):
   - Delete transaction_tags before deleting transactions (or rely on cascade)
   - Delete tags after transaction_tags (or rely on cascade)

2. **Add ID mapping for tags**:
   - Create `tagIdMap` similar to `merchantGroupIdMap`
   - Map old tag IDs to new tag IDs

3. **Insert tags** (after merchant groups, before transactions):
   - Insert tags with remapped `account_id` and `user_id`
   - Build tag ID mapping

4. **Insert transaction_tags** (after transactions are inserted):
   - Remap `transaction_id` using `transactionIdMap`
   - Remap `tag_id` using `tagIdMap`
   - Filter out any that can't be mapped

**Implementation**:
```typescript
// Add tagIdMap
const tagIdMap = new Map<number, number>();

// Delete existing tags and transaction_tags (before transactions)
if (transactionIds.length > 0) {
  await supabase.from('transaction_tags').delete().in('transaction_id', transactionIds);
}
await supabase.from('tags').delete().eq('account_id', accountId);

// Insert tags (after merchant groups, before transactions)
if (backupData.tags && backupData.tags.length > 0) {
  const tagsToInsert = backupData.tags.map(({ id, account_id, user_id, ...tag }) => ({
    ...tag,
    user_id: user.id,
    account_id: accountId,
  }));

  const { data, error } = await supabase
    .from('tags')
    .insert(tagsToInsert)
    .select('id');

  if (error) throw error;

  backupData.tags.forEach((oldTag, index) => {
    tagIdMap.set(oldTag.id, data[index].id);
  });
  console.log('[Import] Inserted', data.length, 'tags');
}

// Insert transaction_tags (after transactions are inserted)
if (backupData.transaction_tags && backupData.transaction_tags.length > 0) {
  const transactionTagsToInsert = backupData.transaction_tags
    .map(({ id, transaction_id, tag_id, ...tt }) => ({
      ...tt,
      transaction_id: transaction_id ? (transactionIdMap.get(transaction_id) || null) : null,
      tag_id: tag_id ? (tagIdMap.get(tag_id) || null) : null,
    }))
    .filter(tt => tt.transaction_id && tt.tag_id); // Only include valid mappings

  if (transactionTagsToInsert.length > 0) {
    const { error } = await supabase
      .from('transaction_tags')
      .insert(transactionTagsToInsert);

    if (error) throw error;
    console.log('[Import] Inserted', transactionTagsToInsert.length, 'transaction tags');
  }
}
```

### Testing Backup/Restore

- [ ] Create backup with tags
- [ ] Verify tags are included in backup JSON
- [ ] Restore backup
- [ ] Verify tags are restored correctly
- [ ] Verify transaction_tags are restored correctly
- [ ] Verify tag-to-transaction relationships are preserved
- [ ] Test restoring older backups (without tags) - should handle gracefully

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)
- [ ] Database migration
- [ ] TypeScript types
- [ ] Basic API endpoints (CRUD for tags)
- [ ] Basic API endpoints (transaction tag assignment)
- [ ] RLS policies and security
- [ ] Backup/restore integration (tags and transaction_tags)

### Phase 2: Tag Management UI (Week 2)
- [ ] TagsPage component
- [ ] Tag creation/edit/delete dialogs
- [ ] Tag list with statistics
- [ ] Navigation integration

### Phase 3: Transaction Integration (Week 2-3)
- [ ] TagSelector component
- [ ] Update EditTransactionDialog
- [ ] Update AddTransactionDialog
- [ ] Display tags in TransactionList
- [ ] Tag filter in TransactionsPage

### Phase 4: Filtering and Search (Week 3)
- [ ] Tag filter component
- [ ] URL parameter handling
- [ ] Search integration
- [ ] Command palette integration

### Phase 5: Reporting (Week 4)
- [ ] Tag spending report
- [ ] Tag trends report
- [ ] Tag transaction list
- [ ] Integration with existing reports

### Phase 6: Advanced Features (Week 5+)
- [ ] Tag rules (auto-assignment)
- [ ] Tag merge functionality
- [ ] Bulk operations
- [ ] Tag suggestions
- [ ] Tag export/import

### Phase 7: Testing and Polish (Week 6)
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance optimization
- [ ] Documentation

## Success Criteria

1. ✅ Users can create, edit, and delete tags
2. ✅ Users can assign multiple tags to transactions
3. ✅ Tags display correctly in transaction list
4. ✅ Users can filter transactions by tags
5. ✅ Tag-based reports generate correctly
6. ✅ Performance remains acceptable with tags
7. ✅ All existing functionality continues to work
8. ✅ Tags are properly scoped to budget accounts (not users)
9. ✅ Switching accounts shows different tags
10. ✅ All queries filter by account_id using getActiveAccountId()
11. ✅ RLS policies prevent unauthorized access
12. ✅ Tag merge functionality works correctly
13. ✅ Tags are included in user backup/restore system
14. ✅ Restoring backups preserves tag-to-transaction relationships

## Critical Implementation Requirements

### Budget Account Scoping

**MUST FOLLOW**: All tag operations must be scoped to budget accounts, not users:

1. **Database**: Tags table uses `account_id` referencing `budget_accounts(id)`
2. **Queries**: All queries must use `getActiveAccountId()` and filter by `account_id`
3. **RLS Policies**: Must check account membership, not just user_id
4. **API Endpoints**: All endpoints must verify tags belong to active account
5. **Transaction Tagging**: When assigning tags to transactions, verify:
   - Transaction belongs to active account (`budget_account_id`)
   - Tags belong to active account (`account_id`)
   - Both must match the same account

**Example Pattern** (follow merchant_groups.ts):
```typescript
const accountId = await getActiveAccountId();
if (!accountId) return [];

const { data } = await supabase
  .from('tags')
  .select('*')
  .eq('account_id', accountId) // NOT user_id!
  .order('name');
```

## Open Questions / Decisions Needed

1. **Tag Limits**: Should there be a limit on tags per transaction? (Recommendation: No hard limit, but UI can limit display)

2. **Tag Deletion Behavior**: 
   - Option A: Cascade delete (remove from all transactions)
   - Option B: Prevent deletion if tag has transactions (require merge first)
   - **Decision**: Option A with confirmation dialog showing affected transaction count

3. **Tag Name Validation**:
   - Allow special characters? (Recommendation: Yes, but sanitize)
   - Maximum length? (Recommendation: 50 characters)
   - Minimum length? (Recommendation: 1 character)

4. **Default Tags**: Should we provide any default tags? (Recommendation: No, let users create their own)

5. **Tag Colors**: 
   - Predefined palette or free-form hex? (Recommendation: Predefined palette with custom option)
   - Auto-assign colors? (Recommendation: Yes, rotate through palette)

6. **Tag Statistics**: What statistics to show?
   - Transaction count ✅
   - Total amount ✅
   - Last used date ✅
   - Average transaction amount? (Nice to have)
   - Most common category? (Nice to have)

7. **Reporting Location**:
   - Separate `/reports/tags` page? (Recommendation: Yes)
   - Or integrate into existing reports? (Recommendation: Both - add tag filters to existing reports, create dedicated tag reports page)

8. **Bulk Tag Assignment**: 
   - From transaction list? (Recommendation: Yes, checkbox selection)
   - From import? (Recommendation: Future enhancement)

## Future Enhancements

1. **AI-Powered Tag Suggestions**: Use AI to suggest tags based on transaction patterns
2. **Tag Templates**: Pre-built tag sets for common use cases
3. **Tag Hierarchies**: Parent-child tag relationships
4. **Tag Sharing**: Share tag definitions between accounts (if multi-user feature exists)
5. **Tag Analytics**: Advanced analytics and insights
6. **Mobile App Integration**: Tag management in mobile app
7. **Tag-Based Budgeting**: Set spending limits by tag
8. **Tag-Based Goals**: Track goals by tag (e.g., "Spend less than $500 on 'Dining Out' tag this month")

## Documentation Requirements

1. **User Documentation**:
   - How to create and manage tags
   - How to tag transactions
   - How to filter by tags
   - How to use tag-based reports
   - Tag best practices

2. **Developer Documentation**:
   - API endpoint documentation
   - Database schema documentation
   - Component usage examples
   - Migration guide

3. **Help Center Articles**:
   - "Getting Started with Tags"
   - "Using Tags for Rental Property Tracking"
   - "Tag-Based Reporting Guide"
   - "Tag Rules and Auto-Assignment"

## Risk Assessment

### High Risk Areas

1. **Performance**: Tag queries could slow down transaction loading
   - **Mitigation**: Efficient indexes, lazy loading, caching

2. **Data Integrity**: Tag deletion could affect many transactions
   - **Mitigation**: Confirmation dialogs, cascade delete with clear messaging

3. **User Confusion**: Too many ways to categorize (categories, merchants, tags)
   - **Mitigation**: Clear documentation, UI guidance, help articles

### Medium Risk Areas

1. **Tag Name Conflicts**: Case-insensitive uniqueness might confuse users
   - **Mitigation**: Clear error messages, suggest existing tag if similar name exists

2. **Migration Issues**: Database migration could fail
   - **Mitigation**: Test on staging, use existing backup system before migration

## Timeline Estimate

- **Phase 1** (Core Infrastructure): 5-7 days
- **Phase 2** (Tag Management UI): 4-5 days
- **Phase 3** (Transaction Integration): 5-6 days
- **Phase 4** (Filtering and Search): 3-4 days
- **Phase 5** (Reporting): 5-6 days
- **Phase 6** (Advanced Features): 7-10 days (optional, can be phased)
- **Phase 7** (Testing and Polish): 4-5 days

**Total Estimate**: 33-43 days (6.5-8.5 weeks)

**MVP Estimate** (Phases 1-5): 22-28 days (4.5-5.5 weeks)

## Conclusion

The tags feature will provide users with flexible, multi-dimensional categorization capabilities that complement the existing category and merchant systems. By implementing tags as a many-to-many relationship with transactions, we enable powerful filtering, reporting, and analysis capabilities while maintaining performance and data integrity.

The phased implementation approach allows for incremental delivery, starting with core functionality and building up to advanced features. The design decisions prioritize user experience, performance, and maintainability.
