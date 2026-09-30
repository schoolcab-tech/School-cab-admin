import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context"
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { useMySchoolAdmin } from "@/hooks/useSchoolAdmins";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity,
  Car,
  GraduationCap,
  Loader2,
  MapPin,
  School,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const db = supabase as any;

type DashboardStats = {
  totalDrivers: number;
  activeNow: number;
  totalStudents: number;
  tripsToday: number;
};

const fetchSchoolDashboardStats = async (schoolId: number): Promise<DashboardStats> => {
  // Drivers serving this school (via drivers.schools_serving array)
  const { data: drivers, error: driversError } = await db
    .from("drivers")
    .select("driver_id, schools_serving");
  if (driversError) throw driversError;

  const driverIds: number[] = (drivers || [])
    .filter((d: any) => Array.isArray(d.schools_serving) && d.schools_serving.includes(schoolId))
    .map((d: any) => d.driver_id);

  // Active now: drivers with recent location (last 5 min)
  let activeNow = 0;
  if (driverIds.length > 0) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: locs } = await db
      .from("driver_locations")
      .select("driver_id, last_seen_at, status, is_tracking_enabled")
      .in("driver_id", driverIds)
      .gte("last_seen_at", fiveMinAgo);
    activeNow = (locs || []).filter(
      (l: any) =>
        l.is_tracking_enabled !== false && (l.status === "online" || l.status === "on_trip")
    ).length;
  }

  // Total students at this school
  const { count: studentsCount } = await db
    .from("students")
    .select("student_id", { count: "exact", head: true })
    .eq("school_id", schoolId);

  // Trips today (trip_sessions for any driver serving this school, started today)
  let tripsToday = 0;
  if (driverIds.length > 0) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count } = await db
      .from("trip_sessions")
      .select("trip_session_id", { count: "exact", head: true })
      .in("driver_id", driverIds)
      .gte("actual_start_time", todayStart.toISOString());
    tripsToday = count || 0;
  }

  return {
    totalDrivers: driverIds.length,
    activeNow,
    totalStudents: studentsCount || 0,
    tripsToday,
  };
};

export default function SchoolAdminDashboard() {
  return (
    <DashboardLayout>
      <SchoolAdminDashboardContent />
    </DashboardLayout>
  );
}

function SchoolAdminDashboardContent() {
  const activeSchoolId = useActiveSchoolId();
  const { data: profile, isLoading: profileLoading } = useMySchoolAdmin();

  const { data: stats, isLoading: statsLoading } = useSimpleQuery<DashboardStats>(
    () =>
      activeSchoolId
        ? fetchSchoolDashboardStats(activeSchoolId)
        : Promise.resolve({ totalDrivers: 0, activeNow: 0, totalStudents: 0, tripsToday: 0 }),
    [activeSchoolId],
    { enabled: !!activeSchoolId, refetchInterval: 60000 }
  );

  if (profileLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <School className="h-7 w-7" />
          {profile?.school_name || "School Dashboard"}
        </h1>
        <p className="text-muted-foreground">
          Welcome, {profile?.contact_person ?? "admin"}. Overview of students, transport, and operations for your school.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Drivers Serving School</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalDrivers ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Now</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeNow ?? 0}</div>
            <p className="text-xs text-muted-foreground">Live in the last 5 minutes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students Enrolled</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStudents ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trips Today</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.tripsToday ?? 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/school-admin/students">
                <GraduationCap className="mr-2 h-4 w-4" />
                View Students
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/school-admin/bookings">
                <MapPin className="mr-2 h-4 w-4" />
                View Bookings
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/school-admin/trip-schedules">
                <Activity className="mr-2 h-4 w-4" />
                Trip Schedules
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/school-admin/payments">
                <GraduationCap className="mr-2 h-4 w-4" />
                Payments & Fees
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/school-admin/school">
                <School className="mr-2 h-4 w-4" />
                School Profile
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/school-admin/drivers">
                <Car className="mr-2 h-4 w-4" />
                View Drivers
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/school-admin/live-tracking">
                <MapPin className="mr-2 h-4 w-4" />
                Live Vehicle Tracking
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>School Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Name:</span>{" "}
              <span className="font-medium">{profile?.school_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Contact Person:</span>{" "}
              <span className="font-medium">{profile?.contact_person}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email:</span>{" "}
              <span className="font-medium">{profile?.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Phone:</span>{" "}
              <span className="font-medium">{profile?.phone}</span>
            </div>
            <Button variant="link" className="px-0 h-auto" asChild>
              <Link to="/school-admin/school">Edit school profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
