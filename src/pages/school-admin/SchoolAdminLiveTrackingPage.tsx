import { DashboardLayout } from "@/components/DashboardLayout";
import { LiveTrackingTabs } from "@/components/tracking/LiveTrackingTabs";
import { useAuth } from "@/contexts/auth-context"
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { useMySchoolAdmin } from "@/hooks/useSchoolAdmins";
import { useSchool } from "@/hooks/useSchools";
import { Activity, MapPin } from "lucide-react";

export default function SchoolAdminLiveTrackingPage() {
  return (
    <DashboardLayout>
      <Content />
    </DashboardLayout>
  );
}

function Content() {
  const activeSchoolId = useActiveSchoolId();
  const { data: profile } = useMySchoolAdmin();
  const { data: school } = useSchool(activeSchoolId ? String(activeSchoolId) : "");

  if (!activeSchoolId) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
        School not linked to your account. Contact the master admin.
      </div>
    );
  }

  const schoolLat = school?.latitude ?? null;
  const schoolLng = school?.longitude ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-7 w-7" />
          Live Vehicle Tracking
        </h1>
        <p className="text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Vehicles serving <strong>{profile?.school_name ?? school?.name ?? "your school"}</strong> — table view or
          live map. Updates every 15 seconds.
        </p>
      </div>

      <LiveTrackingTabs
        schoolId={activeSchoolId}
        schoolCenter={
          schoolLat != null && schoolLng != null && (profile?.school_name || school?.name)
            ? {
                latitude: Number(schoolLat),
                longitude: Number(schoolLng),
                name: profile?.school_name ?? school?.name ?? "School",
              }
            : null
        }
        detailPathPrefix="/school-admin/live-tracking"
        refetchInterval={15000}
      />
    </div>
  );
}
