import { useRef, useEffect } from 'react';

/**
 * Custom hook for handling shift-click selection in lists
 * 
 * Enables shift-click behavior: hold Shift and click a checkbox to select/deselect
 * all items between the last clicked checkbox and the current one.
 * 
 * @param items - Array of items in the list (used to determine order)
 * @param getItemId - Function to extract the ID from an item
 * @param selectedIds - Set of currently selected IDs
 * @param onSelectionChange - Callback when selection changes
 * @returns Handler function for checkbox clicks
 * 
 * @example
 * ```tsx
 * const handleCheckboxClick = useShiftClickSelection(
 *   filteredItems,
 *   (item) => item.id,
 *   selectedIds,
 *   setSelectedIds
 * );
 * 
 * <input
 *   type="checkbox"
 *   checked={selectedIds.has(item.id)}
 *   onChange={(e) => handleCheckboxClick(item.id, e, e.target.checked)}
 * />
 * ```
 */
export function useShiftClickSelection<T, TId extends number | string>(
  items: T[],
  getItemId: (item: T) => TId,
  selectedIds: Set<TId>,
  onSelectionChange: (newSelectedIds: Set<TId>) => void
) {
  const lastClickedIndexRef = useRef<number | null>(null);

  // Reset last clicked index when selection is cleared
  useEffect(() => {
    if (selectedIds.size === 0) {
      lastClickedIndexRef.current = null;
    }
  }, [selectedIds.size]);

  const handleCheckboxClick = (
    itemId: TId,
    event: React.MouseEvent | React.ChangeEvent,
    checked: boolean
  ) => {
    // Find the current item's index
    const currentIndex = items.findIndex(item => getItemId(item) === itemId);
    
    // Check if shift key is held and we have a previous click
    // ChangeEvent doesn't have shiftKey, so we check if it's a MouseEvent
    const isShiftClick = 'shiftKey' in event && event.shiftKey && lastClickedIndexRef.current !== null && currentIndex !== -1;

    if (isShiftClick) {
      const startIndex = Math.min(lastClickedIndexRef.current!, currentIndex);
      const endIndex = Math.max(lastClickedIndexRef.current!, currentIndex);

      // Get all IDs in the range
      const rangeIds = items
        .slice(startIndex, endIndex + 1)
        .map(item => getItemId(item));

      // Determine the target state based on the clicked checkbox
      // If clicking a checked box, deselect the range; if clicking unchecked, select the range
      const newSelected = new Set(selectedIds);

      if (checked) {
        // Select all in range
        rangeIds.forEach(id => newSelected.add(id));
      } else {
        // Deselect all in range
        rangeIds.forEach(id => newSelected.delete(id));
      }

      onSelectionChange(newSelected);
    } else {
      // Normal click - just toggle this item
      const newSelected = new Set(selectedIds);
      if (checked) {
        newSelected.add(itemId);
      } else {
        newSelected.delete(itemId);
      }
      onSelectionChange(newSelected);
    }

    // Update the last clicked index
    if (currentIndex !== -1) {
      lastClickedIndexRef.current = currentIndex;
    }
  };

  return handleCheckboxClick;
}

