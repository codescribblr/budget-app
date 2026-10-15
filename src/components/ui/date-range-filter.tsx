"use client";
import { useId, useRef, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { DatePicker } from "./date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import "./date-range-filter.css";

export const REPORT_DATE_PRESETS = [
  ["current-month", "Current Month"],
  ["last-month", "Last Month"],
  ["week", "Last 7 Days"],
  ["quarter", "Last Quarter"],
  ["current-year", "Current Year"],
  ["year", "Last Year"],
  ["all", "All Time"],
  ["custom", "Custom Range"],
] as const;

function rangeLabel(start?: Date, end?: Date) {
  if (!start && !end) return "All dates";
  if (!start) return `Through ${format(end!, "MMM d, yyyy")}`;
  if (!end) return `From ${format(start, "MMM d, yyyy")}`;
  if (start.getTime() === end.getTime()) return format(start, "MMM d, yyyy");
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  return `${format(start, sameYear ? "MMM d" : "MMM d, yyyy")} – ${format(end, sameMonth ? "d, yyyy" : "MMM d, yyyy")}`;
}

/** Compact summary on the page; the existing calendars remain available inside. */
export function DateRangeFilter({
  start,
  end,
  onChange,
  preset,
  className,
}: {
  start?: Date;
  end?: Date;
  onChange: (start: Date | undefined, end: Date | undefined) => void;
  preset?: { value: string; onChange: (value: string) => void };
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const openCustomRange = useRef(false);
  const id = useId();
  const summary = rangeLabel(start, end);
  const fullRange = `${start ? format(start, "MMMM d, yyyy") : "Any start date"} to ${end ? format(end, "MMMM d, yyyy") : "any end date"}`;
  return (
    <div
      className={cn("date-range-filter", className)}
      role="group"
      aria-label="Date filter"
    >
      {preset && (
        <Select
          value={preset.value}
          onValueChange={(value) => {
            preset.onChange(value);
            openCustomRange.current = value === "custom";
          }}
        >
          <SelectTrigger aria-label="Date preset" className="date-range-preset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            onCloseAutoFocus={(event) => {
              if (!openCustomRange.current) return;
              // Open after the select releases focus, so it cannot dismiss
              // the date editor while returning focus to its own trigger.
              event.preventDefault();
              openCustomRange.current = false;
              setOpen(true);
            }}
          >
            {REPORT_DATE_PRESETS.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="date-range-trigger"
            aria-label={`Date range: ${fullRange}`}
            title={fullRange}
          >
            <CalendarIcon aria-hidden="true" />
            <span>{summary}</span>
            <ChevronDown aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="date-range-editor"
          aria-label="Choose date range"
        >
          <div className="date-range-fields">
            <div>
              <label htmlFor={`${id}-start`}>Start date</label>
              <DatePicker
                id={`${id}-start`}
                ariaLabel="Start date"
                displayFormat="MMM d, yyyy"
                date={start}
                onDateChange={(date) => onChange(date, end)}
                placeholder="Any start date"
              />
            </div>
            <div>
              <label htmlFor={`${id}-end`}>End date</label>
              <DatePicker
                id={`${id}-end`}
                ariaLabel="End date"
                displayFormat="MMM d, yyyy"
                date={end}
                onDateChange={(date) => onChange(start, date)}
                placeholder="Any end date"
              />
            </div>
          </div>
          <div className="date-range-editor-actions">
            <Button
              variant="ghost"
              size="sm"
              disabled={!start && !end}
              onClick={() => onChange(undefined, undefined)}
            >
              Clear dates
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
