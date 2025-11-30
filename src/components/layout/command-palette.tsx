"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
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
  Folder,
  Wallet,
  CreditCard as CreditCardIcon,
  Building2,
  Mail,
  HelpCircle,
  Sparkles,
} from "lucide-react"
import { useFeature } from "@/contexts/FeatureContext"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import type { Category, Account, CreditCard, Loan, TransactionWithSplits, GoalWithDetails } from "@/lib/types"

// Settings items for search
const settingsItems = [
  { label: "Features", path: "/settings", section: "features", keywords: "features enable disable advanced power user" },
  { label: "Data Backup & Restore", path: "/settings", section: "backup", keywords: "backup restore export import data" },
  { label: "Merchant Groups", path: "/merchants", section: null, keywords: "merchant groups manage" },
  { label: "Category Rules", path: "/category-rules", section: null, keywords: "category rules auto categorize" },
  { label: "Duplicate Transactions", path: "/settings", section: "duplicates", keywords: "duplicate transactions find delete" },
  { label: "Clear All Data", path: "/settings", section: "clear-data", keywords: "clear delete all data reset" },
  { label: "Delete Account", path: "/settings", section: "delete-account", keywords: "delete account close" },
]

// Simple debounce hook
function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  return React.useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  )
}

const navigationItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: Receipt },
  { label: "Import", path: "/import", icon: Upload },
  { label: "Money Movement", path: "/money-movement", icon: ArrowLeftRight },
  { label: "Income Buffer", path: "/income-buffer", icon: Wallet, featureKey: "income_buffer" },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Trends", path: "/reports/trends", icon: TrendingUp, featureKey: "advanced_reporting" },
  { label: "Category Reports", path: "/reports/categories", icon: Mail, featureKey: "advanced_reporting" },
  { label: "Income", path: "/income", icon: DollarSign },
  { label: "Goals", path: "/goals", icon: Target, featureKey: "goals" },
  { label: "AI Assistant", path: "/dashboard/ai-assistant", icon: Sparkles, featureKey: "ai_chat" },
  { label: "Merchants", path: "/merchants", icon: Store },
  { label: "Category Rules", path: "/category-rules", icon: FolderTree },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Help Center", path: "/help", icon: HelpCircle },
  { label: "Budget Setup Wizard", path: "/help/wizards/budget-setup", icon: Sparkles },
  { label: "Income Buffer Wizard", path: "/help/wizards/income-buffer", icon: Sparkles },
]

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [categories, setCategories] = React.useState<Category[]>([])
  const [accounts, setAccounts] = React.useState<Account[]>([])
  const [creditCards, setCreditCards] = React.useState<CreditCard[]>([])
  const [loans, setLoans] = React.useState<Loan[]>([])
  const [goals, setGoals] = React.useState<GoalWithDetails[]>([])
  const [transactions, setTransactions] = React.useState<TransactionWithSplits[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [transactionsLoading, setTransactionsLoading] = React.useState(false)
  const router = useRouter()
  const incomeBufferEnabled = useFeature('income_buffer')
  const goalsEnabled = useFeature('goals')
  const aiChatEnabled = useFeature('ai_chat')
  const advancedReportingEnabled = useFeature('advanced_reporting')
  const scrollTimeoutsRef = React.useRef<NodeJS.Timeout[]>([])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Load static data when dialog opens
  React.useEffect(() => {
    if (open && categories.length === 0 && !isLoading) {
      setIsLoading(true)

      // Fetch all static data in parallel
      Promise.all([
        fetch('/api/categories').then(res => {
          if (!res.ok) throw new Error(`Failed to fetch categories: ${res.status}`)
          return res.json()
        }),
        fetch('/api/accounts').then(res => {
          if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.status}`)
          return res.json()
        }),
        fetch('/api/credit-cards').then(res => {
          if (!res.ok) throw new Error(`Failed to fetch credit cards: ${res.status}`)
          return res.json()
        }),
        fetch('/api/loans').then(res => {
          if (!res.ok) throw new Error(`Failed to fetch loans: ${res.status}`)
          return res.json()
        }),
        fetch('/api/goals').then(res => {
          if (!res.ok) throw new Error(`Failed to fetch goals: ${res.status}`)
          return res.json()
        }),
      ])
        .then(([categoriesData, accountsData, creditCardsData, loansData, goalsData]) => {
          // Filter out system categories
          const nonSystemCategories = categoriesData.filter((cat: Category) => !cat.is_system)
          setCategories(nonSystemCategories)
          setAccounts(accountsData)
          setCreditCards(creditCardsData)
          setLoans(loansData)
          setGoals(goalsData)
        })
        .catch(err => console.error('Error loading search data:', err))
        .finally(() => setIsLoading(false))
    }
  }, [open, categories.length, isLoading])

  // Search transactions function (stable reference with useCallback)
  const searchTransactions = React.useCallback(async (searchQuery: string) => {
    if (searchQuery.length >= 3) {
      setTransactionsLoading(true)
      try {
        const response = await fetch(
          `/api/search/transactions?q=${encodeURIComponent(searchQuery)}&limit=10`
        )
        if (!response.ok) {
          throw new Error(`Failed to search transactions: ${response.status}`)
        }
        const data = await response.json()
        setTransactions(data)
      } catch (err) {
        console.error('Error searching transactions:', err)
        setTransactions([])
      } finally {
        setTransactionsLoading(false)
      }
    } else {
      setTransactions([])
      setTransactionsLoading(false)
    }
  }, [])

  // Debounced version
  const searchTransactionsDebounced = useDebounce(searchTransactions, 300)

  // Search transactions when query changes
  React.useEffect(() => {
    if (open) {
      searchTransactionsDebounced(query)
    } else {
      // Clear transactions when dialog closes
      setTransactions([])
      setTransactionsLoading(false)
    }
  }, [query, open, searchTransactionsDebounced])

  // Cleanup scroll timeouts on unmount or dialog close
  React.useEffect(() => {
    return () => {
      scrollTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      scrollTimeoutsRef.current = []
    }
  }, [open])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Type a command or search..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {isLoading || transactionsLoading ? 'Loading...' : 'No results found.'}
          </CommandEmpty>
          <CommandGroup heading="Navigation">
            {navigationItems
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
                return (
                  <CommandItem
                    key={item.path}
                    value={item.label}
                    onSelect={() => {
                      runCommand(() => router.push(item.path))
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                  </CommandItem>
                )
              })}
          </CommandGroup>
          {categories.length > 0 && (
            <CommandGroup heading="Categories">
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.name}
                  onSelect={() => {
                    runCommand(() => router.push(`/reports?category=${category.id}`))
                  }}
                >
                  <Folder className="mr-2 h-4 w-4" />
                  <span>{category.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    ${category.monthly_amount.toFixed(0)}/mo
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {accounts.length > 0 && (
            <CommandGroup heading="Accounts">
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.name}
                  onSelect={() => {
                    runCommand(() => {
                      router.push('/dashboard')
                      // Scroll to accounts section after navigation
                      const timeout = setTimeout(() => {
                        const element = document.getElementById('accounts-section')
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 100)
                      scrollTimeoutsRef.current.push(timeout)
                    })
                  }}
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  <span>{account.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    ${account.balance.toFixed(2)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {creditCards.length > 0 && (
            <CommandGroup heading="Credit Cards">
              {creditCards.map((card) => (
                <CommandItem
                  key={card.id}
                  value={card.name}
                  onSelect={() => {
                    runCommand(() => {
                      router.push('/dashboard')
                      // Scroll to credit cards section after navigation
                      const timeout = setTimeout(() => {
                        const element = document.getElementById('credit-cards-section')
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 100)
                      scrollTimeoutsRef.current.push(timeout)
                    })
                  }}
                >
                  <CreditCardIcon className="mr-2 h-4 w-4" />
                  <span>{card.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    ${card.available_credit.toFixed(2)} available
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {loans.length > 0 && (
            <CommandGroup heading="Loans">
              {loans.map((loan) => (
                <CommandItem
                  key={loan.id}
                  value={loan.name}
                  onSelect={() => {
                    runCommand(() => {
                      router.push('/dashboard')
                      // Scroll to loans section after navigation
                      const timeout = setTimeout(() => {
                        const element = document.getElementById('loans-section')
                        element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }, 100)
                      scrollTimeoutsRef.current.push(timeout)
                    })
                  }}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  <span>{loan.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    ${loan.balance.toFixed(2)} remaining
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {query.length >= 3 && (
            <>
              {transactionsLoading ? (
                <CommandGroup heading="Recent Transactions">
                  <CommandItem disabled>
                    <span className="text-muted-foreground">Searching...</span>
                  </CommandItem>
                </CommandGroup>
              ) : transactions.length > 0 ? (
                <CommandGroup heading="Recent Transactions">
                  {transactions.map((transaction) => {
                    const displayName = transaction.merchant_name || transaction.description
                    const date = new Date(transaction.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                    const amountClass = transaction.transaction_type === 'income' ? 'text-green-500' : 'text-red-500'
                    const formattedAmount = `$${transaction.total_amount.toFixed(2)}`
                    return (
                      <CommandItem
                        key={transaction.id}
                        value={`${displayName} ${transaction.total_amount}`}
                        onSelect={() => {
                          runCommand(() => {
                            // Navigate to transactions page with search query and transaction to edit
                            const params = new URLSearchParams()
                            params.set('q', query)
                            params.set('editId', transaction.id.toString())
                            router.push(`/transactions?${params.toString()}`)
                          })
                        }}
                      >
                        <Receipt className="mr-2 h-4 w-4" />
                        <span className="truncate">{displayName}</span>
                        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{date}</span>
                          <span className={amountClass}>
                            {formattedAmount}
                          </span>
                        </span>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              ) : null}
            </>
          )}
          {goals.length > 0 && (
            <CommandGroup heading="Goals">
              {goals.map((goal) => {
                const progress = goal.progress_percentage || 0
                return (
                  <CommandItem
                    key={goal.id}
                    value={goal.name}
                    onSelect={() => {
                      runCommand(() => router.push('/goals'))
                    }}
                  >
                    <Target className="mr-2 h-4 w-4" />
                    <span>{goal.name}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {progress.toFixed(0)}% complete
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}
          {settingsItems.length > 0 && (
            <CommandGroup heading="Settings">
              {settingsItems.map((item) => (
                <CommandItem
                  key={item.path + item.section}
                  value={`${item.label} ${item.keywords}`}
                  onSelect={() => {
                    runCommand(() => {
                      router.push(item.path)
                      // Scroll to section if specified
                      if (item.section) {
                        const timeout = setTimeout(() => {
                          const element = document.getElementById(item.section)
                          element?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                        }, 100)
                        scrollTimeoutsRef.current.push(timeout)
                      }
                    })
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}

