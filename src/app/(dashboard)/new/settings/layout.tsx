import { SettingsShell } from "@/components/new-look/settings/shell";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}
