"use client";

import type { ComponentProps } from "react";
import { usePathname } from "next/navigation";
import { Checkbox } from "./checkbox";
import { Switch } from "./switch";
import { cn } from "@/lib/utils";

/** On/off options shared by both interfaces. Row selection still uses Checkbox. */
export function OptionToggle({
  className,
  onCheckedChange,
  ...props
}: ComponentProps<typeof Switch>) {
  const pathname = usePathname();
  if (pathname === "/new" || pathname.startsWith("/new/")) {
    return (
      <Switch
        {...props}
        className={cn("nl-switch", className)}
        onCheckedChange={onCheckedChange}
      />
    );
  }
  return (
    <Checkbox
      {...props}
      className={className}
      onCheckedChange={(checked) => onCheckedChange?.(checked === true)}
    />
  );
}
