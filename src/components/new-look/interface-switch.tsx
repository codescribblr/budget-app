"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { interfaceRoute, INTERFACE_COOKIE } from "@/lib/new-look";

export function InterfaceSwitch({ target }: { target: "new" | "classic" }) {
  const pathname = usePathname();
  const Icon = target === "new" ? Sparkles : ArrowLeftRight;
  return (
    <Button variant="outline" size="sm" asChild>
      <Link
        href={interfaceRoute(pathname, target)}
        onClick={(event) => {
          if (!event.defaultPrevented)
            document.cookie = `${INTERFACE_COOKIE}=${target}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
        }}
      >
        <Icon className="size-4" />
        <span className="hidden sm:inline">{target === "new" ? "Try the new look" : "Switch to classic"}</span>
        <span className="sm:hidden">{target === "new" ? "New look" : "Classic"}</span>
      </Link>
    </Button>
  );
}
