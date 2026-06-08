"use client"

import { usePathname } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { FeatureProvider } from "@/contexts/FeatureContext"
import { AccountSelectionGuard } from "@/components/account-selection/AccountSelectionGuard"
import { FirstLoginWizard } from "@/components/wizards/FirstLoginWizard"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Account selection page has its own layout, skip AppLayout and AccountSelectionGuard
  if (pathname === '/account-selection') {
    return (
      <FeatureProvider>
        {children}
      </FeatureProvider>
    )
  }

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


