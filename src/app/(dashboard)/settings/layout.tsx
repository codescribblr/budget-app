import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { SettingsMobileNav } from '@/components/settings/SettingsMobileNav';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Mobile Navigation - Dropdown */}
        <div className="lg:hidden">
          <SettingsMobileNav />
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <SettingsSidebar />
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  );
}


