import {
  Bell,
  UserRound,
  KeyRound,
  Sparkles,
  Palette,
  UsersRound,
  House,
  Crown,
  RefreshCw,
  FileSpreadsheet,
  Copy,
  Store,
  Archive,
  Plug,
  Code2,
} from "lucide-react";
export const settingsGroups = [
  {
    id: "budget",
    title: "Make it yours",
    description:
      "Choose your tools, appearance, and the people you budget with.",
  },
  {
    id: "data",
    title: "Keep your data in order",
    description:
      "Connect imports, tidy transactions, and keep a copy of your budget.",
  },
  {
    id: "personal",
    title: "Your account & preferences",
    description:
      "Manage your personal details, notifications, and subscription.",
  },
  {
    id: "connections",
    title: "Connected services",
    description:
      "Connect property valuations or give your own tools access to your budget.",
  },
] as const;
export const settingsSections = [
  {
    id: "features",
    group: "budget",
    title: "Budget tools",
    description: "Turn optional features on when you need them.",
    detail:
      "Start with the tools that fit your routine. You can add more as your needs change.",
    icon: Sparkles,
    keywords:
      "features premium goals loans assets investments buffer recurring",
    scope: "Current budget",
  },
  {
    id: "dashboard",
    group: "budget",
    title: "Appearance",
    description: "Choose a theme and manage classic dashboard cards.",
    detail: "Make your workspace comfortable in light, dark, or system mode.",
    icon: Palette,
    keywords: "light dark theme layout dashboard",
    scope: "This device · classic cards shared with your budget",
  },
  {
    id: "collaborators",
    group: "budget",
    title: "People & access",
    description: "Invite someone and decide what they can change.",
    detail:
      "Budget together. Owners manage invitations and access; editors can make changes and viewers can follow along.",
    icon: UsersRound,
    keywords: "collaborators invite members sharing permissions roles",
    scope: "Current budget",
  },
  {
    id: "account",
    group: "budget",
    title: "Budget account",
    description: "Rename your budget, find its reference, or close it.",
    detail:
      "Manage the budget selected in the sidebar. This is your budgeting workspace, not a bank account.",
    icon: House,
    keywords: "household rename delete account reference id",
    scope: "Current budget",
  },
  {
    id: "automatic-imports",
    group: "data",
    title: "Automatic imports",
    description: "Manage bank connections and email import setups.",
    detail:
      "Bring transactions into your review queue automatically. You still decide what gets imported.",
    icon: RefreshCw,
    keywords: "bank teller email sync connections",
    scope: "Current budget",
  },
  {
    id: "import-templates",
    group: "data",
    title: "CSV templates",
    description: "Review saved column mappings for faster uploads.",
    detail:
      "Templates remember how your bank’s CSV columns map to transactions. Save a mapping during import to use it again.",
    icon: FileSpreadsheet,
    keywords: "import templates mapping columns uploads",
    scope: "Current budget",
  },
  {
    id: "duplicates",
    group: "data",
    title: "Duplicate transactions",
    description: "Find possible duplicates and review them before removal.",
    detail:
      "Check potential matches before deleting anything. Similar transactions can be legitimate separate purchases.",
    icon: Copy,
    keywords: "cleanup repeated imports duplicates",
    scope: "Current budget",
  },
  {
    id: "merchants",
    group: "data",
    title: "Merchant names",
    description: "Understand how imported descriptions get grouped.",
    detail:
      "Consistent merchant names make your transactions and reports easier to read.",
    icon: Store,
    keywords: "merchants grouping rename descriptions",
    scope: "Shared merchant directory",
  },
  {
    id: "backup",
    group: "data",
    title: "Backups & exports",
    description: "Save a snapshot, export a file, or restore your data.",
    detail:
      "Keep a copy before making big changes. Choose the data you want to export or restore.",
    icon: Archive,
    keywords: "download import restore backup file data",
    scope: "Current budget",
  },
  {
    id: "profile",
    group: "personal",
    title: "Personal profile",
    description: "Set your birth year for age-based forecasts.",
    detail:
      "Your birth year helps with financial forecasts and retirement planning.",
    icon: UserRound,
    keywords: "age retirement birth year profile",
    scope: "Your profile",
  },
  {
    id: "password",
    group: "personal",
    title: "Password",
    description: "Change the password you use to sign in.",
    detail: "Use a unique password for your budgeting account.",
    icon: KeyRound,
    keywords: "security login password",
    scope: "Your sign-in",
  },
  {
    id: "notifications",
    group: "personal",
    title: "Notifications",
    description: "Choose which emails and device alerts you receive.",
    detail:
      "Keep useful reminders and turn down the noise. Notifications still appear in your in-app inbox.",
    icon: Bell,
    keywords: "push email alerts reminders device",
    scope: "Your preferences",
  },
  {
    id: "subscription",
    group: "personal",
    title: "Subscription",
    description: "Review your plan, billing, and Premium access.",
    detail: "See your current plan and manage billing securely.",
    icon: Crown,
    keywords: "billing premium upgrade payment trial cancel",
    scope: "Your subscription",
  },
  {
    id: "integrations",
    group: "connections",
    title: "Property valuations",
    description: "Connect RentCast and set valuation preferences.",
    detail:
      "Use your own RentCast API key to update property valuations. You control when updates run.",
    icon: Plug,
    keywords: "integrations rentcast property assets api",
    scope: "Current budget",
  },
  {
    id: "api-keys",
    group: "connections",
    title: "API access",
    description: "Create scoped keys, review usage, and revoke access.",
    detail:
      "Connect your own apps and assistants. Give each key only the permissions it needs.",
    icon: Code2,
    keywords: "api keys external developer logs scopes credentials",
    scope: "Current budget",
  },
] as const;
export type SettingsSection = (typeof settingsSections)[number];
export const settingsHref = (id: string) => `/new/settings/${id}`;
