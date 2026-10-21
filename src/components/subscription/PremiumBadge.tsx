import type { ComponentProps } from "react";
import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** One Premium identity everywhere; the active interface supplies its palette. */
export function PremiumBadge({ className, children, variant = "default", ...props }: ComponentProps<typeof Badge>) {
  return (
    <Badge
      {...props}
      variant={variant}
      className={cn(
        variant === "default" && "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0",
        "premium-badge",
        className,
      )}
    >
      <Crown aria-hidden="true" />
      Premium
      {children}
    </Badge>
  );
}
