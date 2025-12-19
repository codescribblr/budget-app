import TagsPage from '@/components/tags/TagsPage';
import { TagsFeatureGate } from '@/components/tags/TagsFeatureGate';

export default function Tags() {
  return (
    <TagsFeatureGate>
      <TagsPage />
    </TagsFeatureGate>
  );
}
