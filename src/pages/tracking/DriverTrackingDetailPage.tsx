import { useParams, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DriverTrackingDetail } from "@/components/tracking/DriverTrackingDetail";
import { useAuth } from "@/contexts/auth-context";
import { useMySchoolAdmin } from "@/hooks/useSchoolAdmins";
import { useSchool } from "@/hooks/useSchools";

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
  const isSchoolAdmin = location.pathname.startsWith("/school-admin");
  const listPath = isSchoolAdmin ? "/school-admin/live-tracking" : "/master-admin/live-tracking";

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
