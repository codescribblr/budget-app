"use client";
import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function TransactionFilter({
  label,
  options,
  values,
  onChange,
  hint,
  disabled = false,
}: {
  label: string;
  options: { value: string; label: string }[];
  values: string[];
  onChange: (values: string[]) => void;
  hint?: string;
  disabled?: boolean;
}) {
  const [search, setSearch] = useState("");
  const visible = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Popover onOpenChange={() => setSearch("")}>
      <PopoverTrigger asChild>
        <button
          className={`nl-tx-filter ${values.length ? "active" : ""}`}
          disabled={disabled}
        >
          {label}
          {values.length > 0 && <span>{values.length}</span>}
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="nl-tx-filter-popover">
        <div className="nl-tx-filter-title">
          <strong>{label}</strong>
          <button onClick={() => onChange([])} disabled={!values.length}>
            Clear
          </button>
        </div>
        <label className="nl-tx-filter-search">
          <Search size={15} aria-hidden="true" />
          <input
            aria-label={`Find ${label.toLowerCase()}`}
            placeholder={`Find ${label.toLowerCase()}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {hint && <p>{hint}</p>}
        <div className="nl-tx-filter-options" role="group" aria-label={label}>
          {!visible.length && <p>No matches.</p>}
          {visible.map((option) => (
            <button
              key={option.value}
              aria-pressed={values.includes(option.value)}
              onClick={() =>
                onChange(
                  values.includes(option.value)
                    ? values.filter((v) => v !== option.value)
                    : [...values, option.value],
                )
              }
            >
              <span>{option.label}</span>
              {values.includes(option.value) && (
                <Check size={15} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
