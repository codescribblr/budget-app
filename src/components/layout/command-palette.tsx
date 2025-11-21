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
  Store,
  FolderTree,
  Settings,
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

const navigationItems = [
  { label: "Dashboard", path: "/", icon: LayoutDashboard },
  { label: "Transactions", path: "/transactions", icon: Receipt },
  { label: "Import", path: "/import", icon: Upload },
  { label: "Money Movement", path: "/money-movement", icon: ArrowLeftRight },
  { label: "Reports", path: "/reports", icon: FileText },
  { label: "Trends", path: "/reports/trends", icon: TrendingUp },
  { label: "Income", path: "/income", icon: DollarSign },
  { label: "Merchants", path: "/merchants", icon: Store },
  { label: "Category Rules", path: "/category-rules", icon: FolderTree },
  { label: "Settings", path: "/settings", icon: Settings },
]

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
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
                  onSelect={() => {
                    runCommand(() => router.push(item.path))
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                  <CommandShortcut>⌘K</CommandShortcut>
                </CommandItem>
              )
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}

