import { Target } from 'lucide-react';
import type { Category } from '@/lib/types';

export function TransactionCategorySelectLabel({ category }: { category: Category }) {
  return (
    <div className="flex items-center gap-2">
      <span>{category.name}</span>
      {category.is_goal && (
        <span
          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
          title="Envelope goal"
        >
          <Target className="h-3 w-3" />
          Goal
        </span>
      )}
      {category.is_archived && (
        <span className="text-muted-foreground" title="Archived category">Archived</span>
      )}
      {category.is_system && (
        <span className="text-muted-foreground" title="System category">⚙️</span>
      )}
    </div>
  );
}
