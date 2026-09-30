import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useModeratorSchools } from "@/hooks/useModerators";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Loader2, Plus, School, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";

const db = supabase as any;

async function fetchModeratorStats(schoolIds: number[]) {
  if (schoolIds.length === 0) {
    return { schoolCount: 0, studentCount: 0, schoolAdminCount: 0 };
  }

  const { count: studentCount } = await db
    .from("students")
    .select("student_id", { count: "exact", head: true })
    .in("school_id", schoolIds);

  const { count: schoolAdminCount } = await db
    .from("school_admins")
    .select("school_admin_id", { count: "exact", head: true })
    .in("school_id", schoolIds);

  return {
    schoolCount: schoolIds.length,
    studentCount: studentCount || 0,
    schoolAdminCount: schoolAdminCount || 0,
  };
}

export default function ModeratorDashboard() {
  return (
    <DashboardLayout>
      <Content />
    </DashboardLayout>
  );
}

function Content() {
  const { moderatorId } = useAuth();
  const { data: schools = [], isLoading: schoolsLoading } = useModeratorSchools(moderatorId);
  const schoolIds = schools.map((s: { school_id: number }) => s.school_id);

  const { data: stats, isLoading: statsLoading } = useSimpleQuery(
    () => fetchModeratorStats(schoolIds),
    [schoolIds.join(",")],
    { enabled: !schoolsLoading }
  );

  const loading = schoolsLoading || statsLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (schoolIds.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Moderator Dashboard</h1>
          <p className="text-muted-foreground">Manage your schools and school-level operations.</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <School className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground max-w-md mx-auto">
              You don&apos;t have any schools yet. Add your first school to start managing students,
              drivers, and school admin accounts.
            </p>
            <Button asChild>
              <Link to="/moderator/schools/new">
                <Plus className="mr-2 h-4 w-4" />
                Add your first school
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Moderator Dashboard</h1>
        <p className="text-muted-foreground">
          Overview across {stats?.schoolCount ?? 0} school(s). Use the school switcher in the header
          for day-to-day operations.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Your schools</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.schoolCount ?? 0}</div>
            <Button variant="link" className="px-0 h-auto" asChild>
              <Link to="/moderator/schools">View schools</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.studentCount ?? 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">School admin logins</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.schoolAdminCount ?? 0}</div>
            <Button variant="link" className="px-0 h-auto" asChild>
              <Link to="/moderator/school-admins">Manage school admins</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
