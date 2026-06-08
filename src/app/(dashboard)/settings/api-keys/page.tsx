import ApiKeysSettings from '@/components/settings/ApiKeysSettings';
import { PremiumFeatureGate } from '@/components/subscription/PremiumFeatureGate';

export default function ApiKeysPage() {
  return (
    <PremiumFeatureGate
      featureName="External API"
      featureDescription="Create scoped API keys so external apps and AI assistants can access your budget data."
    >
      <ApiKeysSettings />
    </PremiumFeatureGate>
  );
}
