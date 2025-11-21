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
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import type { Category } from "@/lib/types"

const navigationItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: Receipt },
  { label: "Import", path: "/import", icon: Upload },
  { label: "Money Movement", path: "/money-movement", icon: ArrowLeftRight },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Trends", path: "/reports/trends", icon: TrendingUp },
  { label: "Income", path: "/income", icon: DollarSign },
  { label: "Goals", path: "/goals", icon: Target },
  { label: "Merchants", path: "/merchants", icon: Store },
  { label: "Category Rules", path: "/category-rules", icon: FolderTree },
  { label: "Settings", path: "/settings", icon: Settings },
]

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [categories, setCategories] = React.useState<Category[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()

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

  // Load categories when dialog opens
  React.useEffect(() => {
    if (open && categories.length === 0 && !isLoading) {
      setIsLoading(true)
      fetch('/api/categories')
        .then(res => res.json())
        .then(data => {
          // Filter out system categories
          const nonSystemCategories = data.filter((cat: Category) => !cat.is_system)
          setCategories(nonSystemCategories)
        })
        .catch(err => console.error('Error loading categories:', err))
        .finally(() => setIsLoading(false))
    }
  }, [open, categories.length, isLoading])

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {navigationItems.map((item) => {
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
        </CommandList>
      </CommandDialog>
    </>
  )
}

