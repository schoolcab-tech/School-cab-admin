import { DashboardLayout } from "@/components/DashboardLayout";
import { DriverOperationsView } from "@/components/tracking/DriverOperationsView";
import { useAuth } from "@/contexts/auth-context";
import { useMySchoolAdmin } from "@/hooks/useSchoolAdmins";
import { Activity, MapPin } from "lucide-react";

export default function SchoolAdminLiveTrackingPage() {
  return (
    <DashboardLayout>
      <Content />
    </DashboardLayout>
  );
}

function Content() {
  const { linkedSchoolId } = useAuth();
  const { data: profile } = useMySchoolAdmin();

  if (!linkedSchoolId) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-muted-foreground">
        School not linked to your account. Contact the master admin.
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
        <p className="text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Showing vehicles serving <strong>{profile?.school_name ?? "your school"}</strong> with live
          coordinates and pickup stops. Click a driver for full tracking. Updates every 15 seconds.
        </p>
      </div>

      <DriverOperationsView
        schoolId={linkedSchoolId}
        detailPathPrefix="/school-admin/live-tracking"
        refetchInterval={15000}
      />
    </div>
  );
}
