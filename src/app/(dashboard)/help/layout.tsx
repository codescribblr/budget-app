import { HelpSidebar } from '@/components/help/HelpSidebar';
import { HelpMobileNav } from '@/components/help/HelpMobileNav';
import { BackToTop } from '@/components/help/BackToTop';

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Help Center</h1>
        <p className="text-muted-foreground mt-1">
          Learn how to make the most of your budget
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Mobile Navigation - Dropdown */}
        <div className="lg:hidden">
          <HelpMobileNav />
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-6">
            <HelpSidebar />
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
}


