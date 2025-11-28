import { AppLayout } from "@/components/layout/app-layout"
import { FeatureProvider } from "@/contexts/FeatureContext"
import { AccountSelectionGuard } from "@/components/account-selection/AccountSelectionGuard"
import { FirstLoginWizard } from "@/components/wizards/FirstLoginWizard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FeatureProvider>
      <AccountSelectionGuard>
        <AppLayout>
          <FirstLoginWizard />
          {children}
        </AppLayout>
      </AccountSelectionGuard>
    </FeatureProvider>
  )
}

