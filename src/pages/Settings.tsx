import { DashboardLayout } from "@/components/DashboardLayout"

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage system settings, configurations, and preferences.
          </p>
        </div>
        
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold mb-2">System Settings</h3>
          <p className="text-muted-foreground">Settings interface coming soon...</p>
        </div>
      </div>
    </DashboardLayout>
  )
}