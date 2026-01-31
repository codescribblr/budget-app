# Merchant Grouping Rework - Implementation Checklist

## Quick Wins (Can Start Immediately)

### ✅ Phase 1: Admin Pattern Visibility
- [x] Update `/api/admin/global-merchants/patterns` to show all patterns by default
- [x] Add filter parameters: `ungrouped` (filters `global_merchant_id IS NULL`), `grouped` (filters `global_merchant_id IS NOT NULL`), `all`
- [x] Update `AdminGlobalMerchantsPage.tsx` to show all patterns
- [x] Add filter tabs: "All Patterns", "Ungrouped", "Grouped"
- [x] Show pattern grouping status (which merchant it's grouped to)
- [x] Show usage statistics per pattern
- [x] **Critical**: After grouping patterns, refresh pattern list so grouped patterns disappear from "Ungrouped" tab
- [x] **Critical**: When ungrouping patterns, refresh pattern list so they reappear in "Ungrouped" tab

### ✅ Phase 2: Remove User Merchant Grouping UI
- [x] Hide merchant grouping UI from `MerchantsPage.tsx`
- [x] Disable merchant group creation APIs for users
- [x] Keep merchant groups as read-only for users
- [x] Update navigation to remove merchant management links

### ✅ Phase 3: Transaction Override
- [x] Create migration: Add `merchant_override_id` to `transactions` table
- [x] Update transaction queries to include merchant_override
- [x] Update logic to prefer override merchant over merchant_group
- [x] Add merchant selector to `EditTransactionDialog.tsx`
- [x] Create API endpoint for active global merchants
- [x] Show override status in transaction list (merchant name shows override when set)

### ✅ Phase 4: Recommendation System
- [x] Create migration: `merchant_recommendations` table
- [x] Create migration: `merchant_recommendation_patterns` table (for storing original patterns)
- [x] Add "Recommend Merchant" button in transaction edit
- [x] Create admin review page for recommendations
- [x] Build recommendation approval workflow:
  - [x] Check for duplicate merchant names before approval
  - [x] Prevent creating duplicate merchants (show error if name exists)
  - [x] **Approve**: Create new merchant and group all patterns
  - [x] **Approve & Rename**: Create merchant with admin-chosen name and group all patterns
  - [x] **Merge**: Allow admin to select existing merchant and merge all patterns into it
  - [x] **Deny**: Mark as denied with admin notes
- [x] Add merchant search endpoint for merge dropdown
- [x] Handle pattern conflicts when merging (patterns already grouped to different merchant)

### ✅ Phase 5: Automatic Updates
- [x] Add sync function to update transactions when patterns are grouped
- [x] Call sync function when patterns are grouped via API
- [x] Call sync function when recommendations are approved/merged
- [ ] Create background job for periodic sync (optional - can be done manually for now)
- [ ] Test pattern regrouping updates transactions

### ✅ Phase 6: Migration
- [x] Create migration: `merchant_recommendation_patterns` table to store original patterns
- [x] Create migration script (SQL) to convert user groups to recommendations:
  - [x] Query all user merchant groups from existing users
  - [x] For each group:
    - [x] Collect all patterns from `merchant_mappings` table
    - [x] Create pending recommendation with:
      - [x] Pattern (representative or first for display)
      - [x] Suggested merchant name (from user's display_name)
      - [x] User and account info
      - [x] Pattern count (number of patterns in original group)
      - [x] Original merchant_group_id (for tracking)
    - [x] Store all patterns in `merchant_recommendation_patterns` table
- [x] Create TypeScript migration script for manual execution
- [x] Update admin review queue to show migrated recommendations:
  - [x] Show all patterns from original group (from `merchant_recommendation_patterns`)
  - [x] Show pattern count
  - [x] When approving: Auto-group ALL patterns from `merchant_recommendation_patterns` table
- [x] Update recommendation approval API to:
  - [x] Retrieve all patterns from `merchant_recommendation_patterns`
  - [x] Group all patterns under the new global merchant
  - [x] Update transactions via sync process
- [ ] Test migration script on staging
- [ ] Run migration on production
- [ ] Admin reviews and approves recommendations
- [ ] Verify all patterns auto-group when merchants are created
- [ ] Cleanup orphaned data and processed recommendations (run cleanup script)

## Implementation Order

1. **Week 1**: Admin pattern visibility + Remove user UI
2. **Week 2**: Transaction override + Recommendation system
3. **Week 3**: Automatic updates + Migration scripts
4. **Week 4**: Testing + Rollout

## Key Files to Modify

### API Routes
- `src/app/api/admin/global-merchants/patterns/route.ts`
- `src/app/api/admin/global-merchants/patterns/group/route.ts`
- `src/app/api/merchant-groups/route.ts` (disable user creation)
- `src/app/api/transactions/[id]/route.ts` (add override support)

### Components
- `src/components/admin/AdminGlobalMerchantsPage.tsx`
- `src/components/merchants/MerchantsPage.tsx`
- `src/components/transactions/EditTransactionDialog.tsx`

### Database
- `src/lib/db/merchant-groups.ts`
- New migration files

## Testing Checklist

- [ ] Admin can see all patterns (grouped and ungrouped)
- [ ] Admin can regroup patterns
- [ ] **Pattern grouping removes from ungrouped**: When admin groups a pattern, it disappears from "Ungrouped" tab
- [ ] **Pattern ungrouping adds to ungrouped**: When admin ungroups a pattern, it reappears in "Ungrouped" tab
- [ ] User cannot create merchant groups
- [ ] User can override merchant on transaction
- [ ] User can recommend new merchant
- [ ] Admin can review recommendations
- [ ] **Duplicate prevention**: Admin cannot create duplicate merchant names
- [ ] **Recommendation approval**: All patterns from recommendation are grouped under new merchant
- [ ] **Recommendation merge**: Admin can merge recommendation with existing merchant
- [ ] **Pattern merge**: All patterns from recommendation are merged into selected merchant
- [ ] Pattern grouping updates transactions automatically
- [ ] Overrides persist after pattern regrouping
- [ ] Transaction sync works when patterns are grouped
- [ ] User merchant groups are created/updated when global merchants are assigned
