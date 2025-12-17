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
  Mail,
  Sparkles,
  ChevronDown,
  Inbox,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { UserMenu } from "@/components/layout/user-menu"
import { AccountSwitcher } from "@/components/layout/account-switcher"
import { useFeature } from "@/contexts/FeatureContext"
import { useSubscription } from "@/contexts/SubscriptionContext"

const navigationSections = [
  {
    label: "General",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Budgets", path: "/categories", icon: Mail },
      { label: "Transactions", path: "/transactions", icon: Receipt },
      { label: "Import", path: "/import", icon: Upload },
      { label: "Import Queue", path: "/imports/queue", icon: Inbox },
      { label: "Money Movement", path: "/money-movement", icon: ArrowLeftRight },
      { label: "Goals", path: "/goals", icon: Target, featureKey: "goals" },
      { label: "AI Assistant", path: "/dashboard/ai-assistant", icon: Sparkles, featureKey: "ai_chat" },
    ],
  },
  {
    label: "Income",
    items: [
      { label: "Income", path: "/income", icon: DollarSign },
      { label: "Income Buffer", path: "/income-buffer", icon: Wallet, featureKey: "income_buffer" },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Overview", path: "/reports", icon: FileText },
      { label: "Trends", path: "/reports/trends", icon: TrendingUp, featureKey: "advanced_reporting" },
      { label: "Category Reports", path: "/reports/categories", icon: Mail, featureKey: "advanced_reporting" },
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
      {
        label: "Wizards",
        path: "/help/wizards",
        icon: Sparkles,
        subItems: [
          { label: "Budget Setup", path: "/help/wizards/budget-setup" },
          { label: "Income Buffer", path: "/help/wizards/income-buffer" },
        ],
      },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { state, isMobile, setOpenMobile } = useSidebar()
  const { isPremium } = useSubscription()
  const incomeBufferEnabled = useFeature('income_buffer')
  const goalsEnabled = useFeature('goals')
  const aiChatEnabled = useFeature('ai_chat')
  const advancedReportingEnabled = useFeature('advanced_reporting')
  const [openWizards, setOpenWizards] = React.useState(false)

  const isActive = (path: string) => {
    if (path === "/") {
      return pathname === "/"
    }
    // Exact match or starts with path followed by a slash
    return pathname === path || pathname.startsWith(path + "/")
  }

  const handleNavigation = (path: string) => {
    router.push(path)
    // Close mobile sidebar after navigation
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  // Check if any wizard sub-item is active
  React.useEffect(() => {
    const wizardsItem = navigationSections
      .find(s => s.label === "Help & Support")
      ?.items.find(item => item.path === "/help/wizards") as { subItems?: Array<{ path: string }> } | undefined
    
    if (wizardsItem?.subItems) {
      const hasActiveSubItem = wizardsItem.subItems.some(subItem => isActive(subItem.path))
      if (hasActiveSubItem) {
        setOpenWizards(true)
      }
    }
  }, [pathname])

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
                  .filter((item) => {
                    // If item has a featureKey, check if feature is enabled
                    if ('featureKey' in item && item.featureKey) {
                      const featureKey = item.featureKey as string
                      switch (featureKey) {
                        case 'income_buffer':
                          return incomeBufferEnabled
                        case 'goals':
                          return goalsEnabled
                        case 'ai_chat':
                          return aiChatEnabled
                        case 'advanced_reporting':
                          return advancedReportingEnabled
                        default:
                          return true
                      }
                    }
                    // Legacy support for featureFlag
                    if ('featureFlag' in item && item.featureFlag) {
                      return item.featureFlag === 'income_buffer' && incomeBufferEnabled
                    }
                    // No feature requirement, show item
                    return true
                  })
                  .map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.path)
                    const hasSubItems = 'subItems' in item && item.subItems && item.subItems.length > 0
                    const isWizards = item.path === "/help/wizards"
                    
                    if (hasSubItems) {
                      return (
                        <Collapsible
                          key={item.path}
                          open={isWizards ? openWizards : undefined}
                          onOpenChange={isWizards ? setOpenWizards : undefined}
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton
                                isActive={active || (isWizards && openWizards)}
                                tooltip={item.label}
                              >
                                <Icon />
                                <span>{item.label}</span>
                                <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {('subItems' in item && item.subItems ? item.subItems : []).map((subItem) => {
                                  const subActive = isActive(subItem.path)
                                  return (
                                    <SidebarMenuSubItem key={subItem.path}>
                                      <SidebarMenuSubButton
                                        isActive={subActive}
                                        onClick={() => handleNavigation(subItem.path)}
                                      >
                                        {subItem.label}
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  )
                                })}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      )
                    }
                    
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          onClick={() => handleNavigation(item.path)}
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

