import { DashboardLayout } from "@/components/DashboardLayout"
import { CouponsTable } from "@/components/tables/CouponsTable"
import { ExportButton } from "@/components/ExportButton"
import { useCoupons } from "@/hooks/useCoupons"

export default function Coupons() {
  const { data: coupons = [] } = useCoupons()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Coupon Management</h1>
            <p className="text-muted-foreground">
              Manage discount coupons, view usage statistics, and create promotional codes.
            </p>
          </div>
          <ExportButton
            headers={[
              "Code",
              "Discount Type",
              "Discount Value",
              "Max Uses",
              "Used Count",
              "Status",
              "Valid From",
              "Valid Until",
            ]}
            rows={coupons.map((c) => [
              c.code,
              c.discount_type,
              c.discount_value,
              c.max_uses ?? "Unlimited",
              c.used_count,
              c.is_active ? "Active" : "Inactive",
              c.valid_from ? new Date(c.valid_from).toLocaleDateString() : "",
              c.valid_until ? new Date(c.valid_until).toLocaleDateString() : "",
            ])}
            filename={`coupons-${new Date().toISOString().split("T")[0]}`}
            disabled={coupons.length === 0}
          />
        </div>
        
        <CouponsTable />
      </div>
    </DashboardLayout>
  )
}