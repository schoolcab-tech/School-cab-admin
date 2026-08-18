import { DashboardLayout } from "@/components/DashboardLayout";
import { LiveTrackingTabs } from "@/components/tracking/LiveTrackingTabs";
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
            Use the drivers table for filters, the live map for all vehicles, or Live monitor to
            pick a school and watch every live driver on one screen. Updates every 15 seconds.
          </p>
        </div>

        <LiveTrackingTabs
          detailPathPrefix="/master-admin/live-tracking"
          refetchInterval={15000}
        />
      </div>
    </DashboardLayout>
  );
}
