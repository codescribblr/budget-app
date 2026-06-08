"use client"

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AdminSidebar } from "@/components/layout/admin-sidebar"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { SubscriptionProvider } from "@/contexts/SubscriptionContext"

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SubscriptionProvider>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-1 items-center gap-3 justify-end">
              <ThemeToggle />
            </div>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 md:p-6 min-h-0 overflow-hidden">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SubscriptionProvider>
  )
}
