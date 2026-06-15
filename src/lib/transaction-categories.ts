import type { Category } from './types';

export const TRANSACTION_CATEGORIES_API =
  '/api/categories?excludeGoals=false&includeArchived=all';

interface FilterTransactionCategoriesOptions {
  showArchivedCategories?: boolean;
  includeCategoryId?: number;
}

/** Categories available in transaction split dropdowns (buffer excluded; goals included). */
export function filterCategoriesForTransactionSelect(
  categories: Category[],
  options: FilterTransactionCategoriesOptions = {}
): Category[] {
  const { showArchivedCategories = false, includeCategoryId } = options;

  return categories
    .filter((cat) => !cat.is_buffer)
    .filter((cat) => {
      if (showArchivedCategories) return true;
      if (includeCategoryId !== undefined && cat.id === includeCategoryId) return true;
      return !cat.is_archived;
    });
}

/** Categories in the user's saved order (sort_order). */
export function sortCategoriesForTransactionSelect(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}
