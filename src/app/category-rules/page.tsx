'use client';

import CategoryRulesPage from '@/components/category-rules/CategoryRulesPage';
import AppHeader from '@/components/layout/AppHeader';

export default function CategoryRules() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <AppHeader 
        title="Auto-Categorization Rules" 
        subtitle="View and manage which merchants are automatically categorized to each category"
      />
      <CategoryRulesPage />
    </div>
  );
}

