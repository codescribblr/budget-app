"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Keep native keyboard and mobile selection with a consistently inset arrow. */
export const NativeSelect = forwardRef<
  HTMLSelectElement,
  ComponentPropsWithoutRef<"select"> & { wrapperClassName?: string }
>(function NativeSelect(
  { wrapperClassName, children, multiple, size, ...props },
  ref,
) {
  const dropdown = !multiple && (!size || size <= 1);
  return (
    <span
      className={cn("nl-native-select", wrapperClassName)}
      data-dropdown={dropdown}
    >
      <select ref={ref} multiple={multiple} size={size} {...props}>
        {children}
      </select>
      {dropdown && <ChevronDown aria-hidden="true" />}
    </span>
  );
});
