"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Receipt,
  Upload,
  ArrowLeftRight,
  FileText,
  TrendingUp,
  DollarSign,
  Target,
  Store,
  FolderTree,
  Settings,
  Wallet,
  HelpCircle,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import { UserMenu } from "@/components/layout/user-menu"
import { AccountSwitcher } from "@/components/layout/account-switcher"
import { useFeature } from "@/contexts/FeatureContext"

const navigationSections = [
  {
    label: "General",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Transactions", path: "/transactions", icon: Receipt },
      { label: "Import", path: "/import", icon: Upload },
      { label: "Money Movement", path: "/money-movement", icon: ArrowLeftRight },
      { label: "Income Buffer", path: "/income-buffer", icon: Wallet, featureFlag: "income_buffer" },
      { label: "Income", path: "/income", icon: DollarSign },
      { label: "Goals", path: "/goals", icon: Target },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Overview", path: "/reports", icon: FileText },
      { label: "Trends", path: "/reports/trends", icon: TrendingUp },
    ],
  },
  {
    label: "Other",
    items: [
      { label: "Merchants", path: "/merchants", icon: Store },
      { label: "Category Rules", path: "/category-rules", icon: FolderTree },
      { label: "Settings", path: "/settings", icon: Settings },
    ],
  },
  {
    label: "Help & Support",
    items: [
      { label: "Help Center", path: "/help", icon: HelpCircle },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { state } = useSidebar()
  const incomeBufferEnabled = useFeature('income_buffer')

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/"
    }
    // Exact match or starts with path followed by a slash
    return pathname === path || pathname.startsWith(path + "/")
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 border-b border-sidebar-border p-0">
        <div className="flex h-full items-center px-2">
          <AccountSwitcher />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigationSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items
                  .filter((item) => !item.featureFlag || (item.featureFlag === 'income_buffer' && incomeBufferEnabled))
                  .map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.path)
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          onClick={() => router.push(item.path)}
                          isActive={active}
                          tooltip={item.label}
                        >
                          <Icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    )
                  })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

