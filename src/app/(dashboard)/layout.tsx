import { AppLayout } from "@/components/layout/app-layout"
import { FeatureProvider } from "@/contexts/FeatureContext"
import { AccountSelectionGuard } from "@/components/account-selection/AccountSelectionGuard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FeatureProvider>
      <AccountSelectionGuard>
        <AppLayout>{children}</AppLayout>
      </AccountSelectionGuard>
    </FeatureProvider>
  )
}

