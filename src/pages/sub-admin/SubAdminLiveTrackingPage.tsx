import { DashboardLayout } from "@/components/DashboardLayout";
import { LiveTrackingTabs } from "@/components/tracking/LiveTrackingTabs";
import { useMyFleetOwner } from "@/hooks/useFleetOwners";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import { getDriversByOwnerId } from "@/services/fleetMappingService";
import { Activity, Loader2 } from "lucide-react";

export default function SubAdminLiveTrackingPage() {
  return (
    <DashboardLayout>
      <Content />
    </DashboardLayout>
  );
}

function Content() {
  const { data: owner, isLoading: ownerLoading } = useMyFleetOwner();
  const { data: fleetDrivers = [], isLoading: driversLoading } = useSimpleQuery(
    () => getDriversByOwnerId(owner!.owner_id),
    [owner?.owner_id],
    { enabled: !!owner?.owner_id }
  );

  const driverIds = fleetDrivers.map((d) => d.driver_id);

  if (ownerLoading || driversLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading fleet…
      </div>
    );
  }

  if (!owner) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
        Fleet owner profile not found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-7 w-7" />
          Live Vehicle Tracking
        </h1>
        <p className="text-muted-foreground">
          Track your fleet drivers on the map or in the table. Watch live cab camera feeds during
          active trips. Updates every 15 seconds.
        </p>
      </div>

      {driverIds.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No drivers assigned to your fleet yet.
        </div>
      ) : (
        <LiveTrackingTabs
          driverIds={driverIds}
          detailPathPrefix="/sub-admin/live-tracking"
          refetchInterval={15000}
        />
      )}
    </div>
  );
}
