import { DashboardLayout } from "@/components/DashboardLayout";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { createSampleNotificationsForCurrentUser } from "@/services/sampleNotifications";
import {
  AlertCircle,
  Car,
  GraduationCap,
  IndianRupee,
  MapPin,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface DashboardStats {
  totalDrivers: number;
  totalStudents: number;
  totalSchools: number;
  activeRides: number;
  pendingApprovals: number;
  monthlyRevenue: number;
  driverGrowth: number;
  studentGrowth: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalDrivers: 0,
    totalStudents: 0,
    totalSchools: 0,
    activeRides: 0,
    pendingApprovals: 0,
    monthlyRevenue: 0,
    driverGrowth: 0,
    studentGrowth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [creatingNotifications, setCreatingNotifications] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const handleCreateSampleNotifications = async () => {
    setCreatingNotifications(true);
    try {
      const success = await createSampleNotificationsForCurrentUser();
      if (success) {
        alert("Sample notifications created successfully!");
      } else {
        alert(
          "Failed to create sample notifications. Check console for details."
        );
      }
    } catch (error) {
      console.error("Error creating sample notifications:", error);
      alert("Error creating sample notifications");
    } finally {
      setCreatingNotifications(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      // Fetch core statistics from existing tables
      const [driversRes, studentsRes, schoolsRes, bookingsRes, paymentsRes] =
        await Promise.all([
          supabase.from("drivers").select("driver_id", { count: "exact" }),
          supabase.from("students").select("student_id", { count: "exact" }),
          supabase.from("schools").select("school_id", { count: "exact" }),
          supabase
            .from("bookings")
            .select("booking_id", { count: "exact" })
            .eq("status", "confirmed"),
          supabase
            .from("payments")
            .select("amount")
            .gte(
              "payment_date",
              new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
              ).toISOString()
            ),
        ]);

      // Calculate pending approvals (drivers not verified)
      const pendingRes = await supabase
        .from("drivers")
        .select("driver_id", { count: "exact" })
        .eq("is_verified", false);

      // Calculate monthly revenue
      const monthlyRevenue =
        paymentsRes.data?.reduce(
          (sum, payment) => sum + Number(payment.amount),
          0
        ) || 0;

      setStats({
        totalDrivers: driversRes.count || 0,
        totalStudents: studentsRes.count || 0,
        totalSchools: schoolsRes.count || 0,
        activeRides: bookingsRes.count || 0,
        pendingApprovals: pendingRes.count || 0,
        monthlyRevenue,
        driverGrowth: 12.5, // Mock growth percentage
        studentGrowth: 8.3, // Mock growth percentage
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here's what's happening with your school cab service.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Drivers"
            value={loading ? "..." : stats.totalDrivers.toLocaleString()}
            change={{ value: stats.driverGrowth, period: "from last month" }}
            icon={Car}
            trend="up"
            variant="default"
          />

          <StatsCard
            title="Total Students"
            value={loading ? "..." : stats.totalStudents.toLocaleString()}
            change={{ value: stats.studentGrowth, period: "from last month" }}
            icon={Users}
            trend="up"
            variant="success"
          />

          <StatsCard
            title="Active Schools"
            value={loading ? "..." : stats.totalSchools.toLocaleString()}
            icon={GraduationCap}
            variant="warning"
          />

          <StatsCard
            title="Monthly Revenue"
            value={
              loading ? "..." : `₹${stats.monthlyRevenue.toLocaleString()}`
            }
            change={{ value: 15.2, period: "from last month" }}
            icon={IndianRupee}
            trend="up"
            variant="success"
          />
        </div>

        {/* Quick Actions & Pending Items */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Pending Approvals */}
          <Card className="border-warning/20 bg-warning/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  Pending Approvals
                </CardTitle>
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning mb-2">
                {loading ? "..." : stats.pendingApprovals}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Drivers waiting for verification
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/drivers")}
              >
                Review Drivers
              </Button>
            </CardContent>
          </Card>

          {/* Students */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold">
                  Students
                </CardTitle>
                <Users className="h-5 w-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary mb-2">
                {loading ? "..." : stats.totalStudents}
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Total registered students
              </p>
              <Button
                size="sm"
                className="w-full"
                onClick={() => navigate("/students")}
              >
                View All Students
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate("/students")}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Students
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate("/drivers")}
              >
                <Car className="h-4 w-4 mr-2" />
                Manage Drivers
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate("/schools")}
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Manage Schools
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate("/routes")}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Manage Routes
              </Button>
              {/* <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate("/payments")}
              >
                <IndianRupee className="h-4 w-4 mr-2" />
                Payment Reports
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => navigate("/notifications")}
              >
                <Bell className="h-4 w-4 mr-2" />
                View Notifications
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleCreateSampleNotifications}
                disabled={creatingNotifications}
              >
                <Bell className="h-4 w-4 mr-2" />
                {creatingNotifications
                  ? "Creating..."
                  : "Create Sample Notifications"}
              </Button> */}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentActivity />
          </div>

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">
                System Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database</span>
                <Badge
                  variant="default"
                  className="bg-success text-success-foreground"
                >
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Payment System</span>
                <Badge
                  variant="default"
                  className="bg-success text-success-foreground"
                >
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Notifications</span>
                <Badge
                  variant="default"
                  className="bg-success text-success-foreground"
                >
                  Active
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Backup</span>
                <Badge variant="secondary">Last: 2h ago</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
