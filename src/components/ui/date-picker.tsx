"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
  maxDate?: Date
  className?: string
  id?: string
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
  minDate,
  maxDate,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [month, setMonth] = React.useState<Date>(() => {
    // Initialize with the selected date, or current date
    return date ? new Date(date.getFullYear(), date.getMonth(), 1) : new Date()
  })

  // Update month when date changes externally, but only if popover is closed
  React.useEffect(() => {
    if (!open && date) {
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
  }, [date, open])

  // Reset calendar when popover opens to ensure clean state
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (newOpen) {
      // Reset month to selected date or current date when opening
      if (date) {
        setMonth(new Date(date.getFullYear(), date.getMonth(), 1))
      } else {
        const now = new Date()
        setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
      }
    }
  }

  const handleMonthChange = React.useCallback((newMonth: Date) => {
    // Normalize to the 1st of the month to avoid day-of-month issues
    const normalizedMonth = new Date(newMonth.getFullYear(), newMonth.getMonth(), 1)
    // Only update if the month/year actually changed
    setMonth(prevMonth => {
      if (prevMonth.getFullYear() === normalizedMonth.getFullYear() && 
          prevMonth.getMonth() === normalizedMonth.getMonth()) {
        return prevMonth // No change needed
      }
      return normalizedMonth
    })
  }, [])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          month={month}
          onMonthChange={handleMonthChange}
          selected={date}
          onSelect={(selectedDate) => {
            onDateChange?.(selectedDate)
            // Close popover when date is selected
            setOpen(false)
          }}
          disabled={(date) => {
            if (minDate && date < minDate) return true
            if (maxDate && date > maxDate) return true
            return false
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}


