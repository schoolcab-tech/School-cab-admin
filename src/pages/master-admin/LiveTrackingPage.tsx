import { DashboardLayout } from "@/components/DashboardLayout";
import { LiveTrackingMap } from "@/components/tracking/LiveTrackingMap";
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
            Trace all drivers on one map with live coordinates, pickup/drop stops, and active trip
            progress. Updates every 15 seconds.
          </p>
        </div>

        <LiveTrackingMap refetchInterval={15000} />
      </div>
    </DashboardLayout>
  );
}
