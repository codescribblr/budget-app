"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export function CommandPaletteTrigger() {
  const handleClick = () => {
    // Dispatch the keyboard event to trigger the command palette
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      ctrlKey: true,
      bubbles: true,
    })
    document.dispatchEvent(event)
  }

  return (
    <Button
      variant="outline"
      className="relative h-9 w-9 shrink-0 justify-center px-0 text-sm text-muted-foreground sm:w-auto sm:flex-1 sm:justify-start sm:px-3 sm:pr-12 md:w-48 lg:w-64"
      aria-label="Search"
      onClick={handleClick}
    >
      <Search className="h-4 w-4 shrink-0 sm:mr-2" />
      <span className="hidden lg:inline-flex">Search...</span>
      <span className="hidden sm:inline-flex lg:hidden truncate">Search</span>
      <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  )
}


