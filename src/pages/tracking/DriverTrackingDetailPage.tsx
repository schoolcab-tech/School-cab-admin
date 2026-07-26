import { useParams, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DriverTrackingDetail } from "@/components/tracking/DriverTrackingDetail";
import { useAuth } from "@/contexts/auth-context";
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
  const { linkedSchoolId } = useAuth();
  const { data: profile } = useMySchoolAdmin();
  const { data: owner } = useMyFleetOwner();
  const { data: fleetDrivers = [] } = useSimpleQuery(
    () => getDriversByOwnerId(owner!.owner_id),
    [owner?.owner_id],
    { enabled: !!owner?.owner_id }
  );

  const isSchoolAdmin = location.pathname.startsWith("/school-admin");
  const isSubAdmin = location.pathname.startsWith("/sub-admin");
  const listPath = isSubAdmin
    ? "/sub-admin/live-tracking"
    : isSchoolAdmin
      ? "/school-admin/live-tracking"
      : "/master-admin/live-tracking";

  const { data: school } = useSchool(
    isSchoolAdmin && linkedSchoolId ? String(linkedSchoolId) : ""
  );

  if (!driverId || Number.isNaN(Number(driverId))) {
    return (
      <div className="text-center py-12 text-muted-foreground">Invalid driver ID in URL.</div>
    );
  }

  if (isSchoolAdmin && !linkedSchoolId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        School not linked to your account.
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Driver Tracking</h1>
        {isSchoolAdmin && profile?.school_name && (
          <p className="text-sm text-muted-foreground">{profile.school_name}</p>
        )}
      </div>

      <DriverTrackingDetail
        driverId={Number(driverId)}
        listPath={listPath}
        schoolId={isSchoolAdmin ? linkedSchoolId ?? undefined : undefined}
        driverIds={fleetDriverIds}
        schoolCenter={
          isSchoolAdmin &&
          schoolLat != null &&
          schoolLng != null &&
          profile?.school_name
            ? {
                latitude: Number(schoolLat),
                longitude: Number(schoolLng),
                name: profile.school_name,
              }
            : null
        }
        refetchInterval={15000}
      />
    </div>
  );
}
