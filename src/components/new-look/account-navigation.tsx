"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useFeatures } from "@/contexts/FeatureContext";
export function AccountNavigation() {
  const pathname = usePathname();
  const { isFeatureEnabled, hasPremium } = useFeatures();
  const links = [
    { href: "/new/accounts", label: "Cash & cards" },
    ...(hasPremium && isFeatureEnabled("loans")
      ? [{ href: "/new/loans", label: "Loans" }]
      : []),
    ...(isFeatureEnabled("non_cash_assets")
      ? [{ href: "/new/investments", label: "Investments & assets" }]
      : []),
  ];
  return (
    <nav className="nl-account-nav" aria-label="Account sections">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname.startsWith(link.href) ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
