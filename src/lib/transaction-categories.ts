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

/** Non-goal envelopes first, then envelope goals, each group sorted by name. */
export function sortCategoriesForTransactionSelect(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => {
    const aGoal = a.is_goal ? 1 : 0;
    const bGoal = b.is_goal ? 1 : 0;
    if (aGoal !== bGoal) return aGoal - bGoal;
    return a.name.localeCompare(b.name);
  });
}
