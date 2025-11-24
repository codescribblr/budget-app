import { AppLayout } from "@/components/layout/app-layout"
import { FeatureProvider } from "@/contexts/FeatureContext"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FeatureProvider>
      <AppLayout>{children}</AppLayout>
    </FeatureProvider>
  )
}

