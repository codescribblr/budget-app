'use client';

import CategoryRulesPage from '@/components/category-rules/CategoryRulesPage';

export default function CategoryRules() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Auto-Categorization Rules</h1>
        <p className="text-muted-foreground mt-1">
          View and manage which merchants are automatically categorized to each category
        </p>
      </div>
      <CategoryRulesPage />
    </div>
  );
}

