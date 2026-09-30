import { useParams, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DriverTrackingDetail } from "@/components/tracking/DriverTrackingDetail";
import { useAuth } from "@/contexts/auth-context";
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { useMySchoolAdmin } from "@/hooks/useSchoolAdmins";
import { useMyFleetOwner } from "@/hooks/useFleetOwners";
import { useSchool } from "@/hooks/useSchools";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import { getDriversByOwnerId } from "@/services/fleetMappingService";
import { Loader2 } from "lucide-react";

export default function DriverTrackingDetailPage() {
  return (
    <DashboardLayout>
      <Content />
    </DashboardLayout>
  );
}

function Content() {
  const { driverId } = useParams<{ driverId: string }>();
  const location = useLocation();
  const activeSchoolId = useActiveSchoolId();
  const { data: profile } = useMySchoolAdmin();
  const { data: owner } = useMyFleetOwner();
  const { data: fleetDrivers = [] } = useSimpleQuery(
    () => getDriversByOwnerId(owner!.owner_id),
    [owner?.owner_id],
    { enabled: !!owner?.owner_id }
  );

  const isSubAdmin = location.pathname.startsWith("/sub-admin");
  const isModeratorRoute = location.pathname.startsWith("/moderator");
  const isSchoolAdminRoute = location.pathname.startsWith("/school-admin");
  const isSchoolScoped = isSchoolAdminRoute || isModeratorRoute;

  const listPath = isSubAdmin
    ? "/sub-admin/live-tracking"
    : isModeratorRoute
      ? "/moderator/live-tracking"
      : isSchoolAdminRoute
        ? "/school-admin/live-tracking"
        : "/master-admin/live-tracking";

  const { data: school } = useSchool(
    isSchoolScoped && activeSchoolId ? String(activeSchoolId) : ""
  );

  if (!driverId || Number.isNaN(Number(driverId))) {
    return (
      <div className="text-center py-12 text-muted-foreground">Invalid driver ID in URL.</div>
    );
  }

  if (isSchoolScoped && !activeSchoolId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Select a school using the switcher in the header, or contact support if none appear.
      </div>
    );
  }

  if (isSubAdmin && !owner) {
    return (
      <div className="text-center py-12 text-muted-foreground">Fleet owner profile not found.</div>
    );
  }

  const fleetDriverIds = isSubAdmin ? fleetDrivers.map((d) => d.driver_id) : undefined;

  if (isSubAdmin && fleetDriverIds && !fleetDriverIds.includes(Number(driverId))) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        This driver is not in your fleet.
      </div>
    );
  }

  const schoolLat = school?.latitude ?? null;
  const schoolLng = school?.longitude ?? null;
  const schoolLabel = profile?.school_name ?? school?.name;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Driver Tracking</h1>
        {isSchoolScoped && schoolLabel && (
          <p className="text-sm text-muted-foreground">{schoolLabel}</p>
        )}
      </div>

      <DriverTrackingDetail
        driverId={Number(driverId)}
        listPath={listPath}
        schoolId={isSchoolScoped ? activeSchoolId ?? undefined : undefined}
        driverIds={fleetDriverIds}
        schoolCenter={
          isSchoolScoped &&
          schoolLat != null &&
          schoolLng != null &&
          schoolLabel
            ? {
                latitude: Number(schoolLat),
                longitude: Number(schoolLng),
                name: schoolLabel,
              }
            : undefined
        }
      />
    </div>
  );
}
