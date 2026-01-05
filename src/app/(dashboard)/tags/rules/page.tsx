import TagRulesPage from '@/components/tags/TagRulesPage';
import { TagsFeatureGate } from '@/components/tags/TagsFeatureGate';

export default function TagRules() {
  return (
    <TagsFeatureGate>
      <TagRulesPage />
    </TagsFeatureGate>
  );
}

