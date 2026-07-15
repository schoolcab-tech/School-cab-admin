import { DashboardLayout } from "@/components/DashboardLayout"
import { DriversTable } from "@/components/tables/DriversTable"

export default function Drivers() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drivers Management</h1>
          <p className="text-muted-foreground">
            Manage driver verification, assignments, and performance.
          </p>
        </div>
        
        <DriversTable />
      </div>
    </DashboardLayout>
  )
}