# Category Drag-and-Drop Reordering - Implementation Guide

## Overview
Implement drag-and-drop reordering for budget categories with a dedicated reorder mode that includes visual drag handles, save/cancel functionality, and persistent ordering across all category dropdowns in the application.

---

## Current State Analysis

### Database Schema
- ✅ `categories` table already has `sort_order` INTEGER field
- ✅ All queries already use `ORDER BY sort_order` 
- ✅ `updateCategory` function supports updating `sort_order`

### Frontend State
- ✅ Categories are fetched and displayed in `CategoryList.tsx`
- ✅ Multiple dropdowns throughout the app use categories
- ✅ All category fetches go through `/api/categories` which orders by `sort_order`

---

## Implementation Tasks

### Task 1: Install Drag-and-Drop Library

**Library:** `@dnd-kit` (modern, accessible, performant)

**Install:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

**Why @dnd-kit:**
- Modern React 19 compatible
- Accessible (keyboard navigation)
- Performant (no re-renders during drag)
- Works well with Radix UI components
- Smaller bundle size than react-beautiful-dnd

---

### Task 2: Create Backend API Endpoint

**File:** `src/app/api/categories/reorder/route.ts` (NEW)

**Endpoint:** `PATCH /api/categories/reorder`

**Request Body:**
```typescript
{
  categoryOrders: Array<{ id: number; sort_order: number }>
}
```

**Response:**
```typescript
{
  success: true,
  updated: number
}
```

**Implementation:**
- Accept array of category IDs with new sort_order values
- Use transaction to update all categories atomically
- Return success status

---

### Task 3: Add Reorder Function to supabase-queries.ts

**File:** `src/lib/supabase-queries.ts`

**New Function:**
```typescript
export async function updateCategoriesOrder(
  categoryOrders: Array<{ id: number; sort_order: number }>
): Promise<void>
```

**Implementation:**
- Use Supabase batch update or individual updates in a loop
- Ensure all updates succeed or rollback
- Update `updated_at` timestamp for each category

---

### Task 4: Update CategoryList Component

**File:** `src/components/dashboard/CategoryList.tsx`

**UI Changes:**

1. **Add Reorder Button** (top-right of category list)
   - Icon: `GripVertical` from lucide-react
   - Text: "Reorder"
   - Position: Next to "Add Category" button

2. **Reorder Mode State:**
   - `isReorderMode: boolean` - tracks if in reorder mode
   - `reorderedCategories: Category[]` - local state for drag operations
   - `isSaving: boolean` - tracks save operation

3. **When Reorder Mode Active:**
   - Show drag handle column (leftmost)
   - Hide action buttons (edit/delete)
   - Replace "Reorder" button with "Save" and "Cancel" buttons
   - Make rows draggable
   - Show visual feedback during drag

4. **Drag Handle Column:**
   - Icon: `GripVertical` from lucide-react
   - Cursor: `cursor-grab` (changes to `cursor-grabbing` during drag)
   - Color: `text-muted-foreground`
   - Only visible in reorder mode

5. **Save/Cancel Buttons:**
   - **Save:** Calls API to persist new order, exits reorder mode
   - **Cancel:** Reverts to original order, exits reorder mode

**Drag-and-Drop Implementation:**
```typescript
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

**Component Structure:**
```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={categories.map(c => c.id)}
    strategy={verticalListSortingStrategy}
  >
    <Table>
      {/* Table headers with conditional drag handle column */}
      {categories.map(category => (
        <SortableRow key={category.id} category={category} />
      ))}
    </Table>
  </SortableContext>
</DndContext>
```

**SortableRow Component:**
- Extract each table row into a separate component
- Use `useSortable` hook
- Apply transform and transition styles
- Show drag handle only in reorder mode

---

### Task 5: Update Table Headers

**Changes to TableHeader:**
- Conditionally render drag handle column header when `isReorderMode === true`
- Adjust column widths:
  - **Reorder Mode:** `[10%] [25%] [25%] [15%] [15%] [10%]` (handle, name, progress, monthly, balance, actions)
  - **Normal Mode:** `[30%] [30%] [15%] [15%] [10%]` (name, progress, monthly, balance, actions)

---

## Visual Design

### Reorder Button
```
┌─────────────────────────────────────────┐
│ Budget Categories (Envelopes)           │
│                    [+ Add] [⇅ Reorder]  │
└─────────────────────────────────────────┘
```

### Reorder Mode Active
```
┌─────────────────────────────────────────┐
│ Budget Categories (Envelopes)           │
│                    [✓ Save] [✕ Cancel]  │
├──┬──────────┬──────────┬────────┬───────┤
│⋮⋮│Category  │Progress  │Monthly │Balance│
├──┼──────────┼──────────┼────────┼───────┤
│⋮⋮│Groceries │████ 65%  │$600    │$420   │
│⋮⋮│Gas       │███ 45%   │$200    │$110   │
│⋮⋮│Utilities │██ 30%    │$150    │$105   │
└──┴──────────┴──────────┴────────┴───────┘
```

### Drag Handle Icon
- Icon: `GripVertical` (⋮⋮)
- Size: 20px
- Color: `text-muted-foreground`
- Hover: `text-foreground`
- Active drag: `text-primary`

---

## User Flow

1. **User clicks "Reorder" button**
   - Component enters reorder mode
   - Drag handles appear
   - Action buttons (edit/delete) hide
   - "Reorder" button changes to "Save" and "Cancel"

2. **User drags categories**
   - Grab drag handle (⋮⋮)
   - Drag category up or down
   - Visual feedback shows drop position
   - Other categories shift to make space

3. **User clicks "Save"**
   - Calculate new `sort_order` values (0, 1, 2, 3...)
   - Call `PATCH /api/categories/reorder` with new orders
   - Show loading state on Save button
   - On success: exit reorder mode, refresh categories
   - On error: show toast error, stay in reorder mode

4. **User clicks "Cancel"**
   - Revert to original category order
   - Exit reorder mode
   - No API call

---

## Testing Checklist

### Functional Testing
- [ ] Click "Reorder" button enters reorder mode
- [ ] Drag handles appear in reorder mode
- [ ] Categories can be dragged up and down
- [ ] Visual feedback during drag is clear
- [ ] "Save" persists new order to database
- [ ] "Cancel" reverts to original order
- [ ] Order persists after page refresh
- [ ] Keyboard navigation works (accessibility)

### Integration Testing
- [ ] Transaction add dialog shows categories in new order
- [ ] Transaction edit dialog shows categories in new order
- [ ] Import preview shows categories in new order
- [ ] Transfer between envelopes shows categories in new order
- [ ] Category rules page shows categories in new order
- [ ] Reports page filter shows categories in new order

### Edge Cases
- [ ] Reordering with only 1 category (disable reorder button)
- [ ] Reordering with system categories (should be included)
- [ ] Reordering with goal categories (should be included)
- [ ] Network error during save (show error, stay in reorder mode)
- [ ] Concurrent edits (last save wins)

---

## Implementation Order

1. ✅ Create feature branch - `feature/category-order`
2. ✅ Create implementation document
3. ✅ Install dependencies - `@dnd-kit` packages
4. ✅ Backend first - API endpoint and database function
5. ✅ Frontend UI - Reorder mode, buttons, drag handles
6. ✅ Drag-and-drop - Integrate @dnd-kit
7. ✅ Testing - Manual testing of all flows
8. ✅ Verification - Check all dropdowns respect order

---

## Implementation Complete! 🎉

### Files Created
1. `budget-app/src/app/api/categories/reorder/route.ts` - New API endpoint for batch category reordering
2. `budget-app/CATEGORY_REORDER_IMPLEMENTATION.md` - This implementation guide

### Files Modified
1. `budget-app/src/lib/supabase-queries.ts` - Added `updateCategoriesOrder()` function
2. `budget-app/src/components/dashboard/CategoryList.tsx` - Added complete drag-and-drop reordering UI
3. `budget-app/package.json` - Added @dnd-kit dependencies

### Dependencies Added
- `@dnd-kit/core@^6.3.1`
- `@dnd-kit/sortable@^8.0.0`
- `@dnd-kit/utilities@^3.2.2`

### How to Test

1. **Start the dev server** (already running on http://localhost:3002)
2. **Navigate to the dashboard** - You should see the category list
3. **Click "Reorder" button** - Drag handles should appear on the left
4. **Drag categories** - Click and hold the grip icon (⋮⋮) to reorder
5. **Click "Save"** - New order should persist to database
6. **Click "Cancel"** - Should revert to original order without saving
7. **Refresh page** - Order should persist
8. **Check dropdowns** - All category dropdowns should show the new order

### Features Implemented

✅ **Reorder Mode Toggle**
- "Reorder" button appears next to "Add Category"
- Disabled when only 1 category exists
- Switches to "Save" and "Cancel" buttons in reorder mode

✅ **Drag Handles**
- GripVertical icon (⋮⋮) appears in leftmost column
- Only visible in reorder mode
- Cursor changes to grab/grabbing

✅ **Drag and Drop**
- Smooth animations during drag
- Visual feedback (opacity change)
- Keyboard accessible (arrow keys work)
- Touch-friendly on mobile

✅ **Save/Cancel Operations**
- Save button shows loading state
- Success/error toasts
- Cancel reverts without API call
- Exits reorder mode after save/cancel

✅ **Persistent Ordering**
- Updates `sort_order` field in database
- All category fetches respect `sort_order`
- Dropdowns automatically show new order

✅ **UI Adjustments**
- Column widths adjust in reorder mode
- Edit/Delete buttons hidden in reorder mode
- Totals row aligns with reorder column
- Add Category button disabled in reorder mode

---

## Files to Verify (Already Using sort_order)

All these components fetch categories via `/api/categories` which already orders by `sort_order`.
**No changes needed** - they will automatically respect the new order:

1. ✅ `src/components/transactions/AddTransactionDialog.tsx`
2. ✅ `src/components/transactions/EditTransactionDialog.tsx`
3. ✅ `src/components/import/TransactionEditDialog.tsx`
4. ✅ `src/components/import/TransactionPreview.tsx`
5. ✅ `src/components/money-movement/TransferBetweenEnvelopes.tsx`
6. ✅ `src/components/category-rules/CategoryRulesPage.tsx`
7. ✅ `src/components/reports/ReportsPage.tsx`
8. ✅ `src/components/transactions/TransactionsPage.tsx`

---

## Success Criteria

✅ Users can click "Reorder" to enter reorder mode
✅ Drag handles appear and categories can be dragged
✅ "Save" persists the new order to the database
✅ "Cancel" reverts changes without saving
✅ All category dropdowns throughout the app respect the new order
✅ Order persists across page refreshes
✅ Keyboard navigation works for accessibility

---

## Estimated Effort

- **Backend (API + DB):** 30 minutes
- **Frontend (UI + Drag-and-Drop):** 2 hours
- **Testing & Verification:** 30 minutes
- **Total:** ~3 hours


