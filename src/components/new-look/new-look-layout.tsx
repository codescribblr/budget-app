"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Wallet,
  Landmark,
  ReceiptText,
  ChartNoAxesCombined,
  CalendarDays,
  Target,
  ArrowDownToLine,
  Menu,
  X,
  MessageSquare,
  CircleHelp,
  ArrowUpRight,
  Mail,
  Banknote,
} from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { useFeatures } from "@/contexts/FeatureContext";
import { SubscriptionBanner } from "@/components/subscription/SubscriptionBanner";
import { AccountSwitcher } from "@/components/layout/account-switcher";
import { UserMenu } from "@/components/layout/user-menu";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { InterfaceSwitch } from "./interface-switch";
import { BudgetProvider } from "./budget-context";
import { FeedbackDialog } from "./feedback-dialog";
import "./new-look.css";

const navigation = [
  { href: "/new", label: "Home", icon: Home },
  { href: "/new/budget", label: "Envelopes", icon: Mail },
  { href: "/new/accounts", label: "Accounts", icon: Landmark },
  { href: "/new/imports", label: "Import & review", icon: ArrowDownToLine },
  { href: "/new/transactions", label: "Transactions", icon: ReceiptText },
  { href: "/new/reports", label: "Reports", icon: ChartNoAxesCombined },
  { href: "/new/plan", label: "Monthly plan", icon: CalendarDays },
  { href: "/new/income", label: "Income", icon: Banknote },
  { href: "/new/payday", label: "Allocate paycheck", icon: Wallet },
];
export function NewLookLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const [mobile, setMobile] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => {
      setMobile(query.matches);
      if (!query.matches) setMenu(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (mobile && menu)
      sidebarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [mobile, menu]);
  function closeMenu() {
    setMenu(false);
    requestAnimationFrame(() => menuRef.current?.focus());
  }
  const { isFeatureEnabled, hasPremium } = useFeatures();
  const hasPlanning =
    hasPremium &&
    (isFeatureEnabled("goals") || isFeatureEnabled("income_buffer"));
  const links = hasPlanning
    ? [
        ...navigation,
        { href: "/new/goals", label: "Goals & buffer", icon: Target },
      ]
    : navigation;
  const activeLink = links.find(
    (link) =>
      pathname === link.href ||
      (link.href !== "/new" && pathname.startsWith(`${link.href}/`)),
  );
  return (
    <SubscriptionProvider>
      <SidebarProvider open={true}>
        <BudgetProvider>
          <div className="new-look nl-shell">
            <a className="nl-skip" href="#new-look-main">
              Skip to content
            </a>
            {menu && (
              <button
                className="nl-scrim"
                aria-label="Close navigation overlay"
                tabIndex={-1}
                onClick={closeMenu}
              />
            )}
            <aside
              id="new-look-navigation"
              ref={sidebarRef}
              inert={mobile && !menu}
              className={`nl-sidebar ${menu ? "is-open" : ""}`}
              aria-label="Main navigation"
              onKeyDown={(event) => {
                if (
                  !mobile ||
                  !menu ||
                  event.defaultPrevented ||
                  !event.currentTarget.contains(event.target as Node)
                )
                  return;
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeMenu();
                }
                if (event.key === "Tab") {
                  const elements = [
                    ...event.currentTarget.querySelectorAll<HTMLElement>(
                      "a[href],button:not([disabled])",
                    ),
                  ].filter((el) => el.offsetParent !== null);
                  const first = elements[0],
                    last = elements[elements.length - 1];
                  if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last?.focus();
                  } else if (
                    !event.shiftKey &&
                    document.activeElement === last
                  ) {
                    event.preventDefault();
                    first?.focus();
                  }
                }
              }}
            >
              <div className="nl-brand">
                <AccountSwitcher />
                <button
                  className="nl-mobile-close"
                  aria-label="Close navigation"
                  onClick={closeMenu}
                >
                  <X size={20} />
                </button>
              </div>
              <p className="nl-eyebrow nl-nav-label">Your budget</p>
              <nav>
                {links.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className={activeLink?.href === href ? "active" : ""}
                    aria-current={
                      activeLink?.href === href ? "page" : undefined
                    }
                    onClick={() => setMenu(false)}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                ))}
              </nav>
              <div className="nl-sidebar-bottom">
                <Link href="/dashboard">
                  <ArrowUpRight size={17} />
                  All classic tools
                </Link>
                <Link href="/help">
                  <CircleHelp size={17} />
                  Help & guides
                </Link>
                <button
                  onClick={() => {
                    setFeedback(true);
                    setMenu(false);
                  }}
                >
                  <MessageSquare size={17} />
                  Give feedback
                </button>
                <UserMenu />
              </div>
            </aside>
            <div className="nl-workspace" inert={mobile && menu}>
              <header className="nl-topbar">
                <button
                  ref={menuRef}
                  className="nl-menu-toggle"
                  aria-label="Open navigation"
                  aria-controls="new-look-navigation"
                  aria-expanded={menu}
                  onClick={() => setMenu(true)}
                >
                  <Menu size={21} />
                </button>
                <span className="nl-breadcrumb">
                  Your budget <span>/</span> {activeLink?.label || "New look"}
                  {pathname.endsWith("/manage") ? " / Setup" : ""}
                </span>
                <div className="nl-top-actions">
                  <span className="nl-beta">New look · Beta</span>
                  <InterfaceSwitch target="classic" />
                  <NotificationCenter />
                  <ThemeToggle />
                </div>
              </header>
              <main className="nl-main" id="new-look-main">
                <SubscriptionBanner />
                {children}
              </main>
            </div>
            <FeedbackDialog open={feedback} onOpenChange={setFeedback} />
          </div>
        </BudgetProvider>
      </SidebarProvider>
    </SubscriptionProvider>
  );
}
