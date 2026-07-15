import { DashboardLayout } from "@/components/DashboardLayout"
import { CouponsTable } from "@/components/tables/CouponsTable"

export default function Coupons() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Coupon Management</h1>
          <p className="text-muted-foreground">
            Manage discount coupons, view usage statistics, and create promotional codes.
          </p>
        </div>
        
        <CouponsTable />
      </div>
    </DashboardLayout>
  )
}