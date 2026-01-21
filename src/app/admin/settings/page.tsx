import { isAdmin } from "@/lib/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  const adminStatus = await isAdmin();
  if (!adminStatus) {
    throw new Error('Unauthorized: Admin access required');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure global application settings and defaults
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Global settings management interface will be available here
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This section will allow you to manage:
          </p>
          <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
            <li>Default application options and configurations</li>
            <li>Standard category templates</li>
            <li>Global feature flags and defaults</li>
            <li>System-wide settings that don&apos;t require code changes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
