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
  Tag,
  Repeat,
  CreditCard,
  Landmark,
  Banknote,
  Palmtree,
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
import { useFeatures } from "@/contexts/FeatureContext"
import { useSubscription } from "@/contexts/SubscriptionContext"
import { shouldShowNavItem } from "@/lib/feature-flags"
import { FEATURE_KEYS, type FeatureName } from "@/lib/feature-flags"
import { cn } from "@/lib/utils"

const navigationSections = [
  {
    label: "General",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Budgets", path: "/categories", icon: Mail },
      { label: "Transactions", path: "/transactions", icon: Receipt },
      { label: "Recurring Transactions", path: "/recurring-transactions", icon: Repeat, featureKey: "recurring_transactions" },
      { label: "Import", path: "/import", icon: Upload },
      { label: "Import Queue", path: "/imports/queue", icon: Inbox },
      { label: "Money Movement", path: "/money-movement", icon: ArrowLeftRight },
      { label: "Goals", path: "/goals", icon: Target, featureKey: "goals" },
      { label: "AI Assistant", path: "/dashboard/ai-assistant", icon: Sparkles, featureKey: "ai_chat" },
    ],
  },
  {
    label: "Assets & Liabilities",
    collapsible: true,
    items: [
      { label: "Cash Accounts", path: "/accounts", icon: Banknote },
      { label: "Credit Cards", path: "/credit-cards", icon: CreditCard },
      { label: "Loans", path: "/loans", icon: Landmark, featureKey: "loans" },
      { label: "Non-cash Assets", path: "/non-cash-assets", icon: TrendingUp, featureKey: "non_cash_assets" },
      { label: "Pending Checks", path: "/pending-checks", icon: FileText },
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
      { label: "Overview", path: "/reports", icon: FileText, exact: true },
      { label: "Trends", path: "/reports/trends", icon: TrendingUp, featureKey: "advanced_reporting" },
      { label: "Category Reports", path: "/reports/categories", icon: Mail, featureKey: "advanced_reporting" },
      { label: "Tag Reports", path: "/reports/tags", icon: Tag, featureKey: "tags" },
      { label: "Retirement Planning", path: "/reports/retirement-planning", icon: Palmtree, featureKey: "retirement_planning" },
    ],
  },
  {
    label: "Other",
    items: [
      { label: "Tags", path: "/tags", icon: Tag, featureKey: "tags" },
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
          { label: "Income Buffer", path: "/help/wizards/income-buffer", featureKey: "income_buffer" },
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
  const { isFeatureEnabled } = useFeatures()
  const featureFlags = React.useMemo(
    () =>
      Object.fromEntries(
        FEATURE_KEYS.map((k) => [k, isFeatureEnabled(k as FeatureName)])
      ) as Partial<Record<FeatureName, boolean>>,
    [isFeatureEnabled]
  )
  const [openWizards, setOpenWizards] = React.useState(false)
  const [openAssetsLiabilities, setOpenAssetsLiabilities] = React.useState(false)

  const isActive = (path: string, exact?: boolean) => {
    if (path === "/") {
      return pathname === "/"
    }
    if (exact) {
      return pathname === path
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

  // Check if any assets & liabilities item is active
  React.useEffect(() => {
    const assetsLiabilitiesSection = navigationSections.find(s => s.label === "Assets & Liabilities")
    if (assetsLiabilitiesSection?.items) {
      const hasActiveItem = assetsLiabilitiesSection.items.some(item => isActive(item.path))
      if (hasActiveItem) {
        setOpenAssetsLiabilities(true)
      }
    }
  }, [pathname])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-16 border-b border-sidebar-border p-0">
        <div className={cn(
          "flex h-full items-center",
          state === "expanded" ? "px-2" : "px-1"
        )}>
          <AccountSwitcher />
        </div>
      </SidebarHeader>
      <SidebarContent>
        {navigationSections.map((section) => {
          const isAssetsLiabilities = section.label === "Assets & Liabilities"
          const isCollapsible = 'collapsible' in section && section.collapsible
          
          return (
            <SidebarGroup key={section.label}>
              {isCollapsible ? (
                <>
                  {/* Show icon button in icon-only mode when section is collapsed */}
                  {state === "collapsed" && !openAssetsLiabilities && (
                    <SidebarMenu>
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          onClick={() => setOpenAssetsLiabilities(true)}
                          tooltip="Assets & Liabilities"
                        >
                          <Banknote />
                          <span>Assets & Liabilities</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </SidebarMenu>
                  )}
                  {/* Show collapsible label when sidebar is expanded OR when section is open in icon mode */}
                  {(state === "expanded" || (state === "collapsed" && openAssetsLiabilities)) && (
                    <Collapsible
                      open={isAssetsLiabilities ? openAssetsLiabilities : undefined}
                      onOpenChange={isAssetsLiabilities ? setOpenAssetsLiabilities : undefined}
                    >
                      <CollapsibleTrigger asChild>
                        <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent">
                          {section.label}
                          <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                        </SidebarGroupLabel>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarGroupContent>
                          <SidebarMenu>
                        {section.items
                          .filter((item) =>
                            shouldShowNavItem(
                              'featureKey' in item || 'featureFlag' in item
                                ? {
                                    featureKey: 'featureKey' in item ? (item.featureKey as string | undefined) : undefined,
                                    featureFlag: 'featureFlag' in item ? (item.featureFlag as string | undefined) : undefined,
                                  }
                                : {},
                              featureFlags
                            )
                          )
                  .map((item) => {
                    const Icon = item.icon
                    const active = isActive(item.path, !!('exact' in item && item.exact))
                    const hasSubItems = 'subItems' in item && Array.isArray(item.subItems) && item.subItems.length > 0
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
                                {(('subItems' in item && Array.isArray(item.subItems) && item.subItems) ? item.subItems : [])
                                  .filter((subItem) =>
                                    shouldShowNavItem(
                                      'featureKey' in subItem
                                        ? { featureKey: subItem.featureKey }
                                        : {},
                                      featureFlags
                                    )
                                  )
                                  .map((subItem) => {
                                    const subActive = isActive(subItem.path);
                                    return (
                                      <SidebarMenuSubItem key={subItem.path}>
                                        <SidebarMenuSubButton
                                          isActive={subActive}
                                          onClick={() => handleNavigation(subItem.path)}
                                        >
                                          {subItem.label}
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    );
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
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </>
              ) : (
                <>
                  <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {section.items
                        .filter((item) =>
                          shouldShowNavItem(
                            'featureKey' in item || 'featureFlag' in item
                              ? {
                                  featureKey: 'featureKey' in item ? (item.featureKey as string | undefined) : undefined,
                                  featureFlag: 'featureFlag' in item ? (item.featureFlag as string | undefined) : undefined,
                                }
                              : {},
                            featureFlags
                          )
                        )
                        .map((item) => {
                          const Icon = item.icon
                          const active = isActive(item.path, !!('exact' in item && item.exact))
                          const hasSubItems = 'subItems' in item && Array.isArray(item.subItems) && item.subItems.length > 0
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
                                      {(('subItems' in item && Array.isArray(item.subItems) && item.subItems) ? item.subItems : [])
                                        .filter((subItem) =>
                                          shouldShowNavItem(
                                            'featureKey' in subItem
                                              ? { featureKey: subItem.featureKey }
                                              : {},
                                            featureFlags
                                          )
                                        )
                                        .map((subItem) => {
                                          const subActive = isActive(subItem.path);
                                          return (
                                            <SidebarMenuSubItem key={subItem.path}>
                                              <SidebarMenuSubButton
                                                isActive={subActive}
                                                onClick={() => handleNavigation(subItem.path)}
                                              >
                                                {subItem.label}
                                              </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                          );
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
                </>
              )}
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => handleNavigation("/settings")}
              tooltip="Explore and enable optional features"
            >
              <Sparkles className="h-4 w-4" />
              <span>Explore features</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <UserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}


