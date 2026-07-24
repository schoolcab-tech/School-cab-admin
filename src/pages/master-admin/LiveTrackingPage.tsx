import { DashboardLayout } from "@/components/DashboardLayout";
import { DriverOperationsView } from "@/components/tracking/DriverOperationsView";
import { Activity } from "lucide-react";

export default function LiveTrackingPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-7 w-7" />
            Live Vehicle Tracking
          </h1>
          <p className="text-muted-foreground">
            Driver operations table with pickup/drop progress, ETAs, and filters. Click any driver
            to open their full tracking page with map and activity timeline. Updates every 15 seconds.
          </p>
        </div>

        <DriverOperationsView
          detailPathPrefix="/master-admin/live-tracking"
          refetchInterval={15000}
        />
      </div>
    </DashboardLayout>
  );
}
