"use client"

import { usePathname } from "next/navigation"
import { AppLayout } from "@/components/layout/app-layout"
import { FeatureProvider } from "@/contexts/FeatureContext"
import { AccountSelectionGuard } from "@/components/account-selection/AccountSelectionGuard"
import { FirstLoginWizard } from "@/components/wizards/FirstLoginWizard"
import { NewLookLayout } from "@/components/new-look/new-look-layout"
import { HomeLoadingShell } from "@/components/new-look/home-skeleton"

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

  const Layout = pathname === '/new' || pathname.startsWith('/new/') ? NewLookLayout : AppLayout

  return (
    <FeatureProvider>
      <AccountSelectionGuard checkingFallback={pathname === "/new" ? <HomeLoadingShell /> : undefined}>
        <Layout>
          <FirstLoginWizard />
          {children}
        </Layout>
      </AccountSelectionGuard>
    </FeatureProvider>
  )
}


