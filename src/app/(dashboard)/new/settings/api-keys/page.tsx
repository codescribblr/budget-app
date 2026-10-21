import View from "@/components/settings/ApiKeysSettings";
import { PremiumFeatureGate } from "@/components/subscription/PremiumFeatureGate";
export default function Page() {
  return (
    <PremiumFeatureGate
      featureName="External API"
      featureDescription="Create scoped keys for your own apps and assistants."
    >
      <View />
    </PremiumFeatureGate>
  );
}
