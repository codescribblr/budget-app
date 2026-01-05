"use client"

import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react"
import { DayButton, DayPicker, getDefaultClassNames, useDayPicker } from "react-day-picker"
import { setMonth, setYear, format } from "date-fns"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"

type ViewMode = "date" | "month" | "year"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost",
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()
  const [viewMode, setViewMode] = React.useState<ViewMode>("date")
  const [selectedYear, setSelectedYear] = React.useState<number | null>(null)
  
  // Internal month state for uncontrolled mode
  const [internalMonth, setInternalMonth] = React.useState<Date>(() => {
    return props.month || props.defaultMonth || new Date()
  })
  
  // Use controlled month if provided, otherwise use internal state
  const currentMonth = props.month || internalMonth
  const handleMonthChange = props.onMonthChange || setInternalMonth
  
  const prevMonthRef = React.useRef<Date | undefined>(currentMonth)

  // Reset viewMode to date when month changes externally (e.g., from navigation buttons)
  React.useEffect(() => {
    const prevMonth = prevMonthRef.current
    
    // If month changed externally and we're not in date view, reset to date view
    if (prevMonth && currentMonth && 
        prevMonth.getTime() !== currentMonth.getTime() &&
        viewMode !== "date") {
      setViewMode("date")
      setSelectedYear(null)
    }
    
    prevMonthRef.current = currentMonth
  }, [currentMonth, viewMode])
  
  // Update internal month when controlled month changes
  React.useEffect(() => {
    if (props.month) {
      setInternalMonth(props.month)
    }
  }, [props.month])

  const handleYearSelect = (year: number) => {
    setSelectedYear(year)
    setViewMode("month")
  }

  const handleMonthSelect = React.useCallback((monthIndex: number) => {
    const yearToUse = selectedYear !== null ? selectedYear : currentMonth.getFullYear()
    // Create a new date with the selected month/year, using the 1st day of the month
    const newDate = new Date(yearToUse, monthIndex, 1)
    // Reset view mode and selected year first
    setViewMode("date")
    setSelectedYear(null)
    // Then update the month - this will trigger a re-render with the new month
    handleMonthChange(newDate)
  }, [currentMonth, handleMonthChange, selectedYear])
  
  // Wrap navigation handlers to ensure they call onMonthChange
  const handlePreviousClick = React.useCallback((previousMonth?: Date) => {
    if (previousMonth) {
      handleMonthChange(previousMonth)
    }
  }, [handleMonthChange])
  
  const handleNextClick = React.useCallback((nextMonth?: Date) => {
    if (nextMonth) {
      handleMonthChange(nextMonth)
    }
  }, [handleMonthChange])

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString("default", { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn(
          "flex gap-4 flex-col md:flex-row relative",
          defaultClassNames.months
        ),
        month: cn(
          "flex flex-col w-full gap-4 relative",
          viewMode === "date" && "pt-10",
          defaultClassNames.month
        ),
        nav: cn(
          "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between z-50",
          (viewMode === "year" || viewMode === "month") && "hidden",
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant }),
          "size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex items-center justify-center h-(--cell-size) w-full px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          "w-full flex items-center text-sm font-medium justify-center h-(--cell-size) gap-1.5",
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          "relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring/50 has-focus:ring-[3px] rounded-md",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          "absolute bg-popover inset-0 opacity-0",
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          "select-none font-medium",
          captionLayout === "label"
            ? "text-sm"
            : "rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-8 [&>svg]:text-muted-foreground [&>svg]:size-3.5",
          defaultClassNames.caption_label
        ),
        table: cn(
          "w-full border-collapse",
          (viewMode === "year" || viewMode === "month") && "hidden"
        ),
        weekdays: cn(
          "flex",
          viewMode === "date" && "mt-[calc(var(--spacing-8)+var(--spacing-1))]",
          (viewMode === "year" || viewMode === "month") && "hidden",
          defaultClassNames.weekdays
        ),
        weekday: cn(
          "text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none",
          defaultClassNames.weekday
        ),
        week: cn(
          "flex w-full mt-2",
          (viewMode === "year" || viewMode === "month") && "hidden",
          defaultClassNames.week
        ),
        week_number_header: cn(
          "select-none w-(--cell-size)",
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          "text-[0.8rem] select-none text-muted-foreground",
          defaultClassNames.week_number
        ),
        day: cn(
          "relative w-full h-full p-0 text-center [&:last-child[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
          props.showWeekNumber
            ? "[&:nth-child(2)[data-selected=true]_button]:rounded-l-md"
            : "[&:first-child[data-selected=true]_button]:rounded-l-md",
          defaultClassNames.day
        ),
        range_start: cn(
          "rounded-l-md bg-accent",
          defaultClassNames.range_start
        ),
        range_middle: cn("rounded-none", defaultClassNames.range_middle),
        range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
        today: cn(
          "bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none",
          defaultClassNames.today
        ),
        outside: cn(
          "text-muted-foreground aria-selected:text-muted-foreground",
          defaultClassNames.outside
        ),
        disabled: cn(
          "text-muted-foreground opacity-50",
          defaultClassNames.disabled
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          )
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <ChevronLeftIcon className={cn("size-4", className)} {...props} />
            )
          }

          if (orientation === "right") {
            return (
              <ChevronRightIcon
                className={cn("size-4", className)}
                {...props}
              />
            )
          }

          return (
            <ChevronDownIcon className={cn("size-4", className)} {...props} />
          )
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          )
        },
        Nav: ({ className, previousMonth, nextMonth, onPreviousClick, onNextClick, ...navProps }) => {
          // Only show custom nav in date view
          if (viewMode !== "date") {
            return <nav className={cn("hidden", className)} {...navProps} />
          }
          
          const displayMonth = currentMonth
          if (!displayMonth || !(displayMonth instanceof Date) || isNaN(displayMonth.getTime())) {
            return <nav className={cn("hidden", className)} {...navProps} />
          }
          
          const monthName = format(displayMonth, "MMMM")
          const year = displayMonth.getFullYear()
          
          const handleMonthClick = () => {
            setSelectedYear(displayMonth.getFullYear())
            setViewMode("month")
          }
          
          const handleYearClick = () => {
            setViewMode("year")
          }
          
          return (
            <nav className={cn("flex items-center gap-1 w-full justify-between absolute top-0 inset-x-0 z-50 h-(--cell-size)", className)} {...navProps}>
              <Button
                variant={buttonVariant}
                size="icon"
                className={cn("size-(--cell-size) aria-disabled:opacity-50 p-0 select-none", buttonVariants({ variant: buttonVariant }))}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (previousMonth) {
                    handlePreviousClick(previousMonth)
                  }
                }}
                disabled={!previousMonth}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              
              <div className="flex items-center gap-1 text-sm font-medium flex-1 justify-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleMonthClick()
                  }}
                  className="hover:text-primary transition-colors cursor-pointer px-2 py-1 rounded hover:bg-accent"
                >
                  {monthName}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleYearClick()
                  }}
                  className="hover:text-primary transition-colors cursor-pointer px-2 py-1 rounded hover:bg-accent"
                >
                  {year}
                </button>
              </div>
              
              <Button
                variant={buttonVariant}
                size="icon"
                className={cn("size-(--cell-size) aria-disabled:opacity-50 p-0 select-none", buttonVariants({ variant: buttonVariant }))}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  if (nextMonth) {
                    handleNextClick(nextMonth)
                  }
                }}
                disabled={!nextMonth}
              >
                <ChevronRightIcon className="size-4" />
              </Button>
            </nav>
          )
        },
        MonthCaption: ({ calendarMonth, ...captionProps }) => {
          const displayMonth = calendarMonth?.date || currentMonth
          // Validate displayMonth is a valid Date
          if (!displayMonth || !(displayMonth instanceof Date) || isNaN(displayMonth.getTime())) {
            // Fallback to current date if invalid
            const fallbackDate = new Date()
            if (viewMode === "year") {
              return (
                <YearPicker
                  currentYear={fallbackDate.getFullYear()}
                  onYearSelect={handleYearSelect}
                  onBack={() => setViewMode("date")}
                />
              )
            }
            if (viewMode === "month") {
              return (
                <MonthPicker
                  currentYear={selectedYear || fallbackDate.getFullYear()}
                  currentMonth={fallbackDate.getMonth()}
                  onMonthSelect={handleMonthSelect}
                  onBack={() => {
                    setViewMode("year")
                    setSelectedYear(null)
                  }}
                />
              )
            }
            return <div className="hidden" />
          }
          
          if (viewMode === "year") {
            return (
              <YearPicker
                currentYear={displayMonth.getFullYear()}
                onYearSelect={handleYearSelect}
                onBack={() => setViewMode("date")}
              />
            )
          }
          if (viewMode === "month") {
            const yearForMonthPicker = selectedYear !== null ? selectedYear : displayMonth.getFullYear()
            return (
              <MonthPicker
                currentYear={yearForMonthPicker}
                currentMonth={displayMonth.getMonth()}
                onMonthSelect={handleMonthSelect}
                onBack={() => {
                  setViewMode("year")
                  setSelectedYear(null)
                }}
              />
            )
          }
          // Hide caption in date view since we're using custom Nav
          return <div className="hidden" />
        },
        ...components,
      }}
      month={currentMonth}
      onMonthChange={handleMonthChange}
      {...props}
    />
  )
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring/50 dark:hover:text-accent-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}

function DateCaption({
  displayMonth,
  onMonthClick,
  onYearClick,
  onPreviousClick,
  onNextClick,
  previousMonth,
  nextMonth,
  ...props
}: {
  displayMonth: Date
  onMonthClick: () => void
  onYearClick: () => void
  onPreviousClick?: () => void
  onNextClick?: () => void
  previousMonth?: Date
  nextMonth?: Date
} & React.ComponentProps<"div">) {
  const { classNames } = useDayPicker()
  
  // Validate displayMonth is a valid Date, use current date as fallback
  const validDate = (!displayMonth || !(displayMonth instanceof Date) || isNaN(displayMonth.getTime()))
    ? new Date()
    : displayMonth
  
  const monthName = format(validDate, "MMMM")
  const year = validDate.getFullYear()

  return (
    <div
      className={cn("flex items-center justify-between h-(--cell-size) w-full px-(--cell-size) relative", classNames.month_caption)}
      {...props}
      style={{ pointerEvents: 'auto' }}
    >
      {onPreviousClick && (
        <Button
          variant="ghost"
          size="icon"
          className="size-(--cell-size) z-40 relative"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onPreviousClick()
          }}
          disabled={!previousMonth}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
      )}
      <div className="flex items-center gap-1 text-sm font-medium flex-1 justify-center">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onMonthClick()
          }}
          className="hover:text-primary transition-colors cursor-pointer px-2 py-1 rounded hover:bg-accent"
        >
          {monthName}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onYearClick()
          }}
          className="hover:text-primary transition-colors cursor-pointer px-2 py-1 rounded hover:bg-accent"
        >
          {year}
        </button>
      </div>
      {onNextClick && (
        <Button
          variant="ghost"
          size="icon"
          className="size-(--cell-size) z-40 relative"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onNextClick()
          }}
          disabled={!nextMonth}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      )}
    </div>
  )
}

function YearPicker({
  currentYear,
  onYearSelect,
  onBack,
}: {
  currentYear: number
  onYearSelect: (year: number) => void
  onBack: () => void
}) {
  const [displayStartYear, setDisplayStartYear] = React.useState(() => {
    return Math.floor(currentYear / 10) * 10
  })
  const years = Array.from({ length: 12 }, (_, i) => displayStartYear - 1 + i)
  const currentDate = new Date()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between h-(--cell-size) px-(--cell-size)">
        <Button
          variant="ghost"
          size="icon"
          className="size-(--cell-size)"
          onClick={onBack}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDisplayStartYear(displayStartYear - 10)}
            className="text-sm font-medium hover:text-primary transition-colors px-2 py-1 rounded"
          >
            &lt;&lt;
          </button>
          <span className="text-sm font-medium">
            {years[0]} - {years[years.length - 1]}
          </span>
          <button
            type="button"
            onClick={() => setDisplayStartYear(displayStartYear + 10)}
            className="text-sm font-medium hover:text-primary transition-colors px-2 py-1 rounded"
          >
            &gt;&gt;
          </button>
        </div>
        <div className="size-(--cell-size)" />
      </div>
      <div className="grid grid-cols-3 gap-2 p-2">
        {years.map((year) => {
          const isCurrentYear = year === currentDate.getFullYear()
          const isSelected = year === currentYear
          return (
            <Button
              key={year}
              variant={isSelected ? "default" : "ghost"}
              className={cn(
                "h-10 text-sm",
                isCurrentYear && !isSelected && "font-semibold"
              )}
              onClick={() => onYearSelect(year)}
            >
              {year}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

function MonthPicker({
  currentYear,
  currentMonth,
  onMonthSelect,
  onBack,
}: {
  currentYear: number
  currentMonth: number
  onMonthSelect: (month: number) => void
  onBack: () => void
}) {
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ]
  const currentDate = new Date()

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between h-(--cell-size) px-(--cell-size)">
        <Button
          variant="ghost"
          size="icon"
          className="size-(--cell-size)"
          onClick={onBack}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <button
          type="button"
          className="text-sm font-medium hover:text-primary transition-colors px-2 py-1 rounded"
          onClick={() => {
            // This would trigger year picker, but we'll handle it via onBack
            onBack()
          }}
        >
          {currentYear}
        </button>
        <div className="size-(--cell-size)" />
      </div>
      <div className="grid grid-cols-3 gap-2 p-2">
        {months.map((month, index) => {
          const isCurrentMonth = 
            index === currentDate.getMonth() && currentYear === currentDate.getFullYear()
          const isSelected = index === currentMonth
          return (
            <Button
              key={month}
              variant={isSelected ? "default" : "ghost"}
              className={cn(
                "h-10 text-sm",
                isCurrentMonth && !isSelected && "font-semibold"
              )}
              onClick={() => onMonthSelect(index)}
            >
              {month}
            </Button>
          )
        })}
      </div>
    </div>
  )
}

export { Calendar, CalendarDayButton }

