import { isAdmin } from "@/lib/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Store, Settings, Shield } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function AdminDashboard() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  const adminSections = [
    {
      title: "Global Merchants",
      description: "Manage global merchant mappings and logos that apply to all users",
      icon: Store,
      href: "/admin/merchants",
      color: "text-blue-600",
    },
    {
      title: "Admin Settings",
      description: "Configure global application settings and defaults",
      icon: Settings,
      href: "/admin/settings",
      color: "text-green-600",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage global settings and configurations for the application
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => (
          <Card key={section.href} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3">
                <section.icon className={`h-6 w-6 ${section.color}`} />
                <CardTitle>{section.title}</CardTitle>
              </div>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href={section.href}>
                <Button variant="outline" className="w-full">
                  Manage
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Admin Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            As an administrator, you have access to global configuration options that affect all users.
          </p>
          <p>
            <strong>Important:</strong> Changes made in the admin interface are global and will affect
            all users. User-specific settings will always take precedence over global defaults.
          </p>
          <p>
            Global data (such as merchant mappings) will not be included in user backups/restores.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
