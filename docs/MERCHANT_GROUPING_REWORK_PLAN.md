# Merchant Grouping Rework Plan

## Overview
This plan outlines a comprehensive rework of the merchant grouping system to shift all merchant grouping work from users to admins, while allowing users flexibility to override individual transactions when needed.

## Current State Analysis

### Current Architecture
1. **Global Merchant Patterns**: All transaction descriptions are automatically added to `global_merchant_patterns` via database trigger
2. **Admin Tool**: Admins can group patterns under global merchants, but currently only see ungrouped patterns (`?ungrouped=true`)
3. **User Merchant Groups**: Users can create their own merchant groups and mappings in `merchant_groups` and `merchant_mappings` tables
4. **Transaction Assignment**: When transactions are imported:
   - First checks user's existing mappings (user overrides)
   - Then checks global merchants
   - Finally creates a new user group if `autoCreate` is true
5. **Auto-Connection**: Migration 072 attempts to link user groups to global merchants by matching display names (case-insensitive), but this fails when:
   - Users use different names (e.g., "QT" vs "QuikTrip")
   - Exact name matching doesn't account for variations

### Problems Identified
1. **Admin Visibility**: Admins can't see patterns that users have already grouped, preventing them from managing all patterns
2. **Fragmented Grouping**: User-created groups exist alongside global groups, causing confusion
3. **Incomplete Auto-Connection**: Name-based matching doesn't handle variations well
4. **User Burden**: Users still need to manually group merchants, defeating the purpose of admin-managed groups
5. **Recurring Transactions**: The recurring transactions feature depends on proper merchant grouping, which breaks when grouping is inconsistent

## Goals

### Primary Goals
1. **Admin-Centric Grouping**: Admins should manage ALL merchant grouping
2. **User Simplicity**: Users should not need to manually group merchants
3. **User Flexibility**: Users should be able to override merchant assignments on individual transactions
4. **Pattern Visibility**: Admins should see ALL patterns, regardless of current grouping status
5. **Seamless Integration**: Global merchant assignments should automatically apply to all users

### Secondary Goals
1. **Recommendation System**: Users can recommend merchant names for ungrouped patterns
2. **Admin Review Queue**: Admins can review and approve/deny/rename user recommendations
3. **Automatic Updates**: When admins group patterns, affected transactions should automatically update

## Proposed Solution

### Phase 1: Admin Pattern Visibility & Management

#### 1.1 Update Admin API to Show All Patterns
- **File**: `src/app/api/admin/global-merchants/patterns/route.ts`
- **Change**: Remove the `ungrouped=true` filter by default, allow filtering by status
- **New Query Parameters**:
  - `ungrouped`: Show only ungrouped patterns (patterns where `global_merchant_id IS NULL`)
  - `grouped`: Show only grouped patterns (patterns where `global_merchant_id IS NOT NULL`)
  - `merchant_id`: Filter by specific merchant (existing)
  - `all`: Show all patterns (default, no filter)
- **Important**: When a pattern is grouped (assigned a `global_merchant_id`), it automatically disappears from the ungrouped list since the filter checks `global_merchant_id IS NULL`

#### 1.2 Update Admin UI to Show All Patterns
- **File**: `src/components/admin/AdminGlobalMerchantsPage.tsx`
- **Changes**:
  - Add filter tabs: "All Patterns", "Ungrouped", "Grouped"
  - Show which patterns are already grouped and by which merchant
  - Allow admins to regroup patterns (move from one merchant to another)
  - Show usage statistics for each pattern (how many users/transactions)
  - **Critical**: After grouping patterns, refresh the pattern list so grouped patterns disappear from the "Ungrouped" tab
  - When ungrouping patterns (removing `global_merchant_id`), they should reappear in the ungrouped list

#### 1.3 Pattern Grouping Status Indicators
- Add visual indicators showing:
  - Patterns grouped to global merchants (with merchant name)
  - Patterns that exist in user groups (show count of user groups using similar names)
  - Completely ungrouped patterns

### Phase 2: Remove User Merchant Grouping UI

#### 2.1 Remove User Merchant Management Pages
- **Files to Modify**:
  - `src/components/merchants/MerchantsPage.tsx` - Hide or remove merchant grouping UI
  - `src/app/(dashboard)/settings/merchants/page.tsx` - Remove or redirect
  - `src/components/merchants/EditMerchantGroupDialog.tsx` - Remove or disable
  - `src/components/merchants/MergeMerchantGroupsDialog.tsx` - Remove or disable
  - `src/components/merchants/DeleteMerchantGroupDialog.tsx` - Remove or disable

#### 2.2 Disable User Merchant Group Creation APIs
- **Files to Modify**:
  - `src/app/api/merchant-groups/route.ts` - Add check to prevent user creation
  - `src/app/api/merchant-groups/auto-group/route.ts` - Disable or remove
  - `src/app/api/merchant-group-mappings/route.ts` - Restrict to read-only for users

#### 2.3 Keep User Merchant Group Reading
- Users can still view their merchant groups (read-only)
- These will be auto-created from global merchants when transactions are imported
- Display should show which groups are linked to global merchants

### Phase 3: Transaction-Level Merchant Override

#### 3.1 Add Transaction Merchant Override Field
- **Migration**: Add `merchant_override_id` to `transactions` table
- **Purpose**: Allow users to override the global merchant assignment for individual transactions
- **Type**: `BIGINT REFERENCES global_merchants(id) ON DELETE SET NULL`
- **Index**: Create index for performance

#### 3.2 Update Transaction Assignment Logic
- **File**: `src/lib/db/merchant-groups.ts`
- **Function**: `getOrCreateMerchantGroup`
- **New Logic**:
  1. Check if transaction has `merchant_override_id` → use that merchant
  2. Check global merchants for pattern match → use global merchant
  3. If no global merchant found:
     - Create a temporary user group (for display purposes only)
     - Add pattern to "recommendations" queue for admin review
  4. Never auto-create user merchant groups unless it's a temporary placeholder

#### 3.3 Transaction Edit UI
- **File**: `src/components/transactions/EditTransactionDialog.tsx`
- **Add**: Merchant selector dropdown
  - Shows all active global merchants
  - Option to "Clear Override" to use global assignment
  - Option to "Recommend New Merchant" if merchant not in list
  - Shows current assignment (global vs override)

### Phase 4: Merchant Recommendation System

#### 4.1 Create Merchant Recommendations Table
- **Migration**: Create `merchant_recommendations` table
- **Schema**:
  ```sql
  CREATE TABLE merchant_recommendations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id INTEGER NOT NULL REFERENCES budget_accounts(id) ON DELETE CASCADE,
    pattern VARCHAR(500) NOT NULL,
    suggested_merchant_name VARCHAR(255) NOT NULL,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'merged')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Additional fields for migration support
    original_merchant_group_id INTEGER, -- Reference to original user group (for migration tracking)
    pattern_count INTEGER DEFAULT 1 -- Number of patterns in original group (for admin context)
  );
  ```
- **Note**: The `original_merchant_group_id` and `pattern_count` fields help track recommendations created from existing user groups during migration

#### 4.2 User Recommendation Flow
- **UI**: When user edits transaction and merchant isn't in global list:
  - Show "Recommend Merchant" button
  - User enters suggested merchant name
  - Creates recommendation record
  - Transaction gets temporary merchant assignment (or stays ungrouped)

#### 4.3 Admin Review Queue
- **New Admin Page**: `/admin/merchant-recommendations`
- **Features**:
  - List all pending recommendations
  - Show pattern, suggested name, user info, transaction count, pattern count (for migrated recommendations)
  - **Special handling for migrated recommendations**:
    - Show indicator that recommendation came from existing user group
    - Show all patterns that were in the original group (not just the representative pattern)
    - Allow admin to see which patterns will be grouped when merchant is approved
  - **Duplicate Prevention**: 
    - Before allowing "Approve", check if merchant name already exists
    - If duplicate name exists, show warning and suggest "Merge" action instead
    - Admins should NOT be able to create duplicate merchant names
  - Actions:
    - **Approve**: 
      - Check if merchant name already exists (prevent duplicates)
      - If name is unique: Create new global merchant with suggested name, then automatically group all patterns from the original user group
      - If name exists: Show error and suggest "Merge" action instead
    - **Approve & Rename**: 
      - Check if admin-chosen name already exists (prevent duplicates)
      - If name is unique: Create global merchant with admin-chosen name, then automatically group all patterns
      - If name exists: Show error and suggest "Merge" action instead
    - **Deny**: Mark as denied with optional admin notes
    - **Merge**: 
      - Admin selects existing global merchant from dropdown
      - **Critical**: All patterns from the recommendation are merged into the selected merchant:
        1. Retrieve all patterns from `merchant_recommendation_patterns` (if migrated) or use the recommendation pattern
        2. For each pattern, update `global_merchant_id` in `global_merchant_patterns` to the selected merchant
        3. If pattern doesn't exist in `global_merchant_patterns`, create it and link to selected merchant
        4. Mark recommendation status as `'merged'` and link to the selected merchant
        5. Transactions automatically update via sync process
      - **Result**: All patterns from recommendation are now grouped under the existing merchant
  - Bulk actions for similar recommendations
  - **Auto-grouping on approval**: When admin approves a recommendation:
    1. Create global merchant (if name is unique)
    2. Find all patterns that were in the original user merchant group (if migrated) or match the recommendation pattern
    3. Group those patterns under the new global merchant
    4. Transactions automatically update via sync process

### Phase 5: Automatic Transaction Updates

#### 5.1 Update Transactions When Patterns Are Grouped
- **Trigger**: When admin groups patterns under a global merchant:
  - Update `global_merchant_patterns` table: Set `global_merchant_id` for the grouped patterns
  - **Important**: Once `global_merchant_id` is set, the pattern automatically disappears from ungrouped patterns list (since ungrouped filter checks `global_merchant_id IS NULL`)
  - Find all transactions matching those patterns
  - Update `merchant_group_id` to point to user's merchant group (linked to global merchant)
  - Only update if transaction doesn't have `merchant_override_id`
  - Create user merchant group if it doesn't exist (linked to global merchant)
  - Refresh admin UI pattern list to reflect the change (grouped patterns no longer show in "Ungrouped" tab)

#### 5.2 Background Job for Pattern Updates
- **New Job**: `sync_merchant_groups_from_global`
- **Purpose**: Periodically sync user merchant groups with global merchants
- **Logic**:
  1. Find all global merchants with active status
  2. For each user:
     - Find transactions matching global merchant patterns
     - Create/update user merchant groups linked to global merchants
     - Update transaction `merchant_group_id` (unless overridden)

#### 5.3 Handle Pattern Regrouping
- When admin moves patterns from one merchant to another:
  - Update `global_merchant_id` in `global_merchant_patterns` table
  - **Important**: Pattern remains grouped (doesn't appear in ungrouped list) since `global_merchant_id` is still set (just changed to different merchant)
  - Update all affected transactions (unless overridden)
  - Update user merchant groups
  - Log changes for audit trail
- When admin ungroups patterns (removes `global_merchant_id`):
  - Set `global_merchant_id` to NULL in `global_merchant_patterns` table
  - **Important**: Pattern now appears in ungrouped list again (since `global_merchant_id IS NULL`)
  - Refresh admin UI to show pattern in "Ungrouped" tab

### Phase 6: Migration & Data Cleanup

#### 6.1 Convert Existing User Groups to Recommendations (Initial Migration)
- **Context**: With only 2 users currently, we can take a clean-slate approach
- **Script**: Create migration script to:
  1. **Find all user merchant groups** from existing users
  2. **For each user merchant group**:
     - Collect all patterns mapped to that group (from `merchant_mappings` table)
     - Store the list of patterns (we'll need these when admin approves)
     - Create a pending recommendation in `merchant_recommendations` table:
       - `pattern`: Use the most common pattern or first pattern as representative (for display/search)
       - `suggested_merchant_name`: Use the user's `display_name` from `merchant_groups`
       - `user_id`: The user who created the group
       - `account_id`: The account the group belongs to
       - `status`: Set to `'pending'`
       - `transaction_id`: NULL (or link to first transaction if available)
       - `original_merchant_group_id`: Store the original `merchant_groups.id` for reference
       - `pattern_count`: Store the number of patterns in this group
  3. **Store original patterns**: 
     - Create a helper table `merchant_recommendation_patterns` to store all patterns from each original group:
       ```sql
       CREATE TABLE merchant_recommendation_patterns (
         recommendation_id BIGINT REFERENCES merchant_recommendations(id) ON DELETE CASCADE,
         pattern VARCHAR(500) NOT NULL,
         PRIMARY KEY (recommendation_id, pattern)
       );
       ```
     - This allows admin to see all patterns that will be grouped when recommendation is approved
  4. **Handle duplicate recommendations**: If both users have groups with similar names:
     - Create separate recommendations for each user (admin can merge them)
     - Or use fuzzy matching to combine similar names into one recommendation
  5. **Remove user merchant groups and mappings**:
     - Delete all entries from `merchant_mappings` table
     - Delete all entries from `merchant_groups` table
     - Set `merchant_group_id` to NULL in `transactions` table (transactions will be reassigned when admin approves recommendations)
  6. **Result**: 
     - All existing user groupings become pending recommendations
     - Admin can review and approve them to create global merchants
     - Once approved, all original patterns will automatically group and transactions will update

#### 6.2 Admin Approval Workflow for Migrated Recommendations
- **When admin approves a recommendation**:
  1. **Check for duplicate merchant name**: Before creating, verify the merchant name doesn't already exist
  2. **If name is unique**: Create new global merchant with the suggested name (or admin-chosen name)
  3. **If name exists**: Admin must use "Merge" action instead (prevents duplicate merchants)
  4. **Retrieve all original patterns** from `merchant_recommendation_patterns` table for this recommendation
  5. **Group all patterns** under the new global merchant:
     - For each pattern in `merchant_recommendation_patterns`:
       - Find matching pattern in `global_merchant_patterns` table
       - Update `global_merchant_id` to the new global merchant
     - If pattern doesn't exist in `global_merchant_patterns`, create it (shouldn't happen, but handle gracefully)
  6. **Update transactions**: Transactions will automatically update via the sync process (Phase 5)
  7. **Mark recommendation as approved**: Update recommendation status to `'approved'`

- **When admin merges a recommendation with existing merchant**:
  1. Admin selects existing global merchant from dropdown
  2. **Retrieve all original patterns** from `merchant_recommendation_patterns` table for this recommendation
  3. **Merge all patterns** into the existing merchant:
     - For each pattern in `merchant_recommendation_patterns`:
       - Find matching pattern in `global_merchant_patterns` table
       - If pattern is already grouped to a different merchant: Admin can choose to move it or keep it separate
       - If pattern is ungrouped or grouped to the same merchant: Update `global_merchant_id` to the selected merchant
       - If pattern doesn't exist in `global_merchant_patterns`, create it and link to selected merchant
  4. **Update transactions**: Transactions will automatically update via the sync process (Phase 5)
  5. **Mark recommendation as merged**: Update recommendation status to `'merged'` and optionally store the merged merchant ID

- **Benefits**:
  - Clean slate: No legacy user groups to maintain
  - Admin control: Admin reviews and approves all merchant names
  - No duplicates: Prevents creating duplicate merchant names
  - Automatic grouping: All original patterns get grouped when merchant is created or merged
  - Fresh start: Users start using the new system immediately
  - Complete migration: All patterns from original groups are preserved and grouped
  - Pattern consolidation: Merging allows consolidating patterns from multiple users into one merchant

#### 6.3 Handle Existing User Mappings (Alternative Approach - Not Used)
- **Note**: This approach is NOT used since we're converting to recommendations instead
- **Original Strategy** (kept for reference):
  - Keep existing user merchant groups (read-only)
  - Link them to global merchants where possible (fuzzy name matching)
  - For unmatched groups, create global merchants with user's display name
  - Migrate patterns to global merchant patterns

#### 6.4 Cleanup Orphaned Data
- After recommendations are approved and patterns are grouped:
  - Verify all user merchant groups are deleted (should be empty after migration)
  - Verify all user merchant mappings are deleted (should be empty after migration)
  - Consolidate duplicate patterns in `global_merchant_patterns`
  - Update transaction references via sync job
  - Archive or delete old recommendation records that have been processed

## Implementation Steps

### Step 1: Admin Pattern Visibility (Week 1)
1. Update API to return all patterns
2. Update admin UI with filters
3. Add pattern status indicators
4. Test with existing data

### Step 2: Remove User Grouping UI (Week 1-2)
1. Hide/remove merchant management pages
2. Disable merchant group creation APIs
3. Keep read-only views for existing groups
4. Update navigation/settings

### Step 3: Transaction Override (Week 2)
1. Add `merchant_override_id` field
2. Update transaction assignment logic
3. Add merchant selector to transaction edit UI
4. Test override functionality

### Step 4: Recommendation System (Week 2-3)
1. Create recommendations table
2. Build user recommendation flow
3. Build admin review queue
4. Test recommendation workflow

### Step 5: Automatic Updates (Week 3)
1. Create sync job
2. Add triggers for pattern grouping
3. Test transaction updates
4. Monitor performance

### Step 6: Migration & Cleanup (Week 3-4)
1. Create migration script to convert user groups to recommendations
2. Test migration script on staging/test data
3. **Run migration on production**:
   - Convert all user merchant groups to pending recommendations
   - Delete all user merchant groups and mappings
   - Reset transaction merchant_group_id references
4. **Admin reviews and approves recommendations**:
   - Admin goes through recommendation queue
   - Approves/renames/merges recommendations
   - Patterns automatically group when merchants are created
5. Verify all data is clean and transactions are properly assigned
6. Cleanup orphaned records and archive processed recommendations

## Database Schema Changes

### New Tables
1. `merchant_recommendations` - User recommendations for new merchants
2. `merchant_recommendation_patterns` - Stores all patterns from original user groups (for migration support)

### Modified Tables
1. `transactions` - Add `merchant_override_id` field
2. `merchant_groups` - Keep `global_merchant_id` link (already exists)
3. `global_merchant_patterns` - No changes needed

### New Indexes
1. `idx_transactions_merchant_override_id` - For transaction override lookups
2. `idx_merchant_recommendations_status` - For admin review queue
3. `idx_merchant_recommendations_user_id` - For user's recommendations
4. `idx_merchant_recommendation_patterns_recommendation_id` - For retrieving patterns when approving recommendations

## API Changes

### New Endpoints
1. `POST /api/merchant-recommendations` - Create recommendation
2. `GET /api/admin/merchant-recommendations` - List recommendations (admin)
3. `PATCH /api/admin/merchant-recommendations/[id]` - Review recommendation (admin)
   - Actions: `approve`, `approve_rename`, `deny`, `merge`
   - For `approve`/`approve_rename`: Check for duplicate merchant name, create merchant, group patterns
   - For `merge`: Require `merchant_id` parameter, merge all patterns into existing merchant
4. `GET /api/admin/global-merchants/patterns` - Updated to show all patterns
5. `GET /api/admin/global-merchants/search` - Search existing merchants (for merge dropdown)

### Modified Endpoints
1. `GET /api/admin/global-merchants/patterns` - Add filters for grouped/ungrouped
2. `POST /api/admin/global-merchants/patterns/group` - Trigger transaction updates
3. `PATCH /api/transactions/[id]` - Support `merchant_override_id`

### Deprecated Endpoints
1. `POST /api/merchant-groups` - Disable user creation
2. `POST /api/merchant-groups/auto-group` - Remove or disable
3. `POST /api/merchant-group-mappings` - Disable user creation

## UI/UX Changes

### Admin UI
- Pattern list shows all patterns (not just ungrouped)
- Filter tabs: All / Ungrouped / Grouped
- Pattern status indicators
- Regroup patterns functionality
- Merchant recommendations review queue

### User UI
- Remove merchant grouping pages
- Transaction edit: Add merchant selector
- Show merchant assignment source (global vs override)
- "Recommend Merchant" flow for unknown merchants

### Settings
- Remove merchant groups settings page
- Keep merchant groups as read-only view (if needed)

## Testing Strategy

### Unit Tests
- Transaction assignment logic
- Pattern matching
- Override handling
- Recommendation creation

### Integration Tests
- Admin pattern grouping → transaction updates
- **Pattern grouping → disappears from ungrouped list**: Verify that when admin groups a pattern, it no longer appears in the "Ungrouped" tab
- **Pattern ungrouping → appears in ungrouped list**: Verify that when admin ungroups a pattern, it reappears in the "Ungrouped" tab
- User override → transaction display
- **Recommendation → admin approval → merchant creation**: 
  - Verify duplicate name check prevents creating duplicate merchants
  - Verify all patterns from recommendation are grouped under new merchant
- **Recommendation → admin merge → pattern consolidation**:
  - Verify admin can select existing merchant for merge
  - Verify all patterns from recommendation are merged into selected merchant
  - Verify patterns already grouped to selected merchant remain unchanged
  - Verify transactions update correctly after merge
- Pattern regrouping → transaction updates (pattern stays grouped, just moves to different merchant)

### E2E Tests
- Admin groups patterns → user sees updated merchants
- User overrides merchant → transaction shows override
- User recommends merchant → admin approves → merchant created

## Rollout Plan

### Phase 1: Staging
1. Deploy all changes to staging
2. Test with sample data
3. Verify admin can see all patterns
4. Verify user override works
5. Verify recommendations flow

### Phase 2: Beta
1. Enable for beta users
2. Monitor for issues
3. Collect feedback
4. Adjust as needed

### Phase 3: Production
1. Deploy to production
2. Run migration scripts
3. Monitor transaction processing
4. Monitor admin workload
5. Support users during transition

## Risk Mitigation

### Risks
1. **Data Loss**: Existing user groups might be lost
   - **Mitigation**: Keep user groups read-only, link to global merchants
   
2. **Performance**: Pattern matching on every transaction import
   - **Mitigation**: Use indexes, cache global merchant lookups
   
3. **Admin Overload**: Too many patterns to group
   - **Mitigation**: Prioritize by usage count, batch operations
   
4. **User Confusion**: Removing merchant grouping UI
   - **Mitigation**: Clear messaging, transaction-level override option
   
5. **Migration Issues**: Existing data might not migrate cleanly
   - **Mitigation**: Test migration on staging, keep rollback plan

## Success Metrics

### Admin Metrics
- Number of patterns grouped per day
- Time to group new patterns
- Number of recommendations reviewed
- Pattern grouping accuracy

### User Metrics
- Number of merchant overrides created
- Number of recommendations submitted
- User satisfaction with automatic grouping
- Support tickets related to merchant grouping

### System Metrics
- Transaction import performance
- Pattern matching accuracy
- Global merchant coverage (% of transactions with global merchants)

## Future Enhancements

1. **AI-Assisted Grouping**: Use ML to suggest pattern groupings
2. **Bulk Pattern Operations**: Admin can group multiple patterns at once
3. **Pattern Similarity Detection**: Show similar patterns when grouping
4. **Merchant Aliases**: Support multiple display names for same merchant
5. **Pattern Templates**: Pre-defined patterns for common merchants
6. **User Feedback Loop**: Users can report incorrect groupings

## Open Questions

1. **Temporary Groups**: How to handle patterns without global merchants?
   - Option A: Create temporary user groups (current approach)
   - Option B: Leave ungrouped until admin groups
   - **Recommendation**: Option A with clear "temporary" indicator

2. **Pattern Regrouping**: What happens to user overrides when admin regroups?
   - **Recommendation**: Keep overrides, but notify user of change

3. **Historical Data**: Should we update historical transactions?
   - **Recommendation**: Yes, but allow users to see original assignment

4. **Recommendation Approval**: Auto-approve low-risk recommendations?
   - **Recommendation**: Manual review for now, consider auto-approval later

5. **User Group Cleanup**: When to remove old user groups?
   - **Recommendation**: Keep for 90 days, then archive

## Conclusion

This rework will shift merchant grouping from a user task to an admin task, improving consistency and reducing user burden. The transaction-level override and recommendation system provide flexibility while maintaining admin control. The phased approach allows for incremental rollout and testing.
