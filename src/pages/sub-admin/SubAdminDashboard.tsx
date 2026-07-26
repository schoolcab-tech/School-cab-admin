import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteOrderingContent } from "@/pages/route-ordering/RouteOrderingPage";
import { useMyFleetOwner } from "@/hooks/useFleetOwners";
import { useOwnerDrivers } from "@/hooks/useFleetMappings";
import { Car, Users, TrendingUp, DollarSign, Loader2, Download, UserCog, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { downloadCSV } from "@/lib/csvExport";
import { useNavigate } from "react-router-dom";

export default function SubAdminDashboard() {
  return (
    <DashboardLayout>
      <SubAdminDashboardContent />
    </DashboardLayout>
  );
}

function SubAdminDashboardContent() {
  const navigate = useNavigate();
  const { data: fleetOwner, isLoading: loadingOwner } = useMyFleetOwner();
  const { data: drivers, isLoading: loadingDrivers } = useOwnerDrivers(
    fleetOwner?.owner_id
  );

  const [stats, setStats] = useState({
    totalStudents: 0,
    monthlyRevenue: 0,
    activeDrivers: 0,
    averageRating: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!drivers || drivers.length === 0) {
        setLoadingStats(false);
        return;
      }

      const driverIds = drivers.map((d) => d.driver_id);

      // Get total students assigned to these drivers
      const { data: bookingsData } = await supabase
        .from("bookings")
        .select("student_id")
        .in("driver_id", driverIds)
        .eq("status", "confirmed")
        .eq("booking_type", "monthly");

      const totalStudents = bookingsData?.length || 0;

      // Get monthly revenue from subscription_payments (completed only)
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthStart = `${currentMonth}-01`;
      const monthEnd = new Date(new Date(monthStart).getFullYear(), new Date(monthStart).getMonth() + 1, 0)
        .toISOString().split('T')[0];

      const { data: paymentsData } = await supabase
        .from("subscription_payments")
        .select("amount")
        .in("driver_id", driverIds)
        .eq("transaction_status", "completed")
        .gte("transaction_date", monthStart)
        .lte("transaction_date", `${monthEnd}T23:59:59`);

      const monthlyRevenue = paymentsData?.reduce(
        (sum, p) => sum + parseFloat(p.amount?.toString() || "0"),
        0
      ) || 0;

      // Calculate average rating
      const averageRating = drivers.reduce(
        (sum, d) => sum + (d.avg_rating || 0),
        0
      ) / drivers.length;

      setStats({
        totalStudents,
        monthlyRevenue,
        activeDrivers: drivers.filter((d) => d.is_verified).length,
        averageRating,
      });
      setLoadingStats(false);
    };

    fetchStats();
  }, [drivers]);

  useEffect(() => {
    if (window.location.hash === "#route-ordering-section") {
      requestAnimationFrame(() => {
        document.getElementById("route-ordering-section")?.scrollIntoView({
          behavior: "smooth",
        });
      });
    }
  }, [loadingStats, drivers]);

  if (loadingOwner || loadingDrivers || loadingStats) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!fleetOwner) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Fleet owner profile not found. Please contact the administrator.
        </p>
      </div>
    );
  }

  const handleExportDashboard = () => {
    if (!drivers || drivers.length === 0) return;
    downloadCSV(
      ["Driver Name", "Cab Number", "Vehicle Type", "Status", "Rating"],
      drivers.map((driver) => [
        driver.name,
        driver.cab_number,
        driver.vehicle_type,
        driver.is_verified ? "Active" : "Pending",
        driver.avg_rating?.toFixed(1) || "N/A",
      ]),
      `fleet-dashboard-${new Date().toISOString().split("T")[0]}`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, {fleetOwner.company_name}
          </h1>
          <p className="text-muted-foreground">
            Manage your fleet and track performance
          </p>
        </div>
        <Button variant="outline" onClick={handleExportDashboard} disabled={!drivers?.length}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => navigate("/sub-admin/students")}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Switch Drivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Reassign students between drivers in your fleet
            </p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => {
            document.getElementById("route-ordering-section")?.scrollIntoView({
              behavior: "smooth",
            });
          }}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Route className="h-5 w-5" />
              Route Ordering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Set pickup and drop-off order for students on each driver route
            </p>
          </CardContent>
        </Card>
        <Card
          className="cursor-pointer hover:border-primary transition-colors"
          onClick={() => navigate("/sub-admin/my-fleet")}
        >
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-5 w-5" />
              My Fleet
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Manage drivers, switch students, and edit routes per cab
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Route Ordering — embedded on dashboard (prominent placement) */}
      {drivers && drivers.length > 0 ? (
        <div id="route-ordering-section">
          <RouteOrderingContent
            driverIds={drivers.map((d) => d.driver_id)}
            fleetDrivers={drivers}
            basePath="/sub-admin/route-ordering"
            embedded
          />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              Route Ordering
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-center py-8">
            No drivers assigned to your fleet yet. Request drivers from the admin
            to configure route ordering.
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cabs</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{drivers?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeDrivers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">
              Across all your cabs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{stats.monthlyRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Current month earnings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageRating.toFixed(1)} / 5.0
            </div>
            <p className="text-xs text-muted-foreground">
              Across all drivers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Your Fleet Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Company</p>
                <p className="text-lg font-semibold">{fleetOwner.company_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Contact Person</p>
                <p className="text-lg font-semibold">{fleetOwner.contact_person}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge className={fleetOwner.is_active ? "bg-green-500" : "bg-red-500"}>
                  {fleetOwner.is_active ? "Active" : "Suspended"}
                </Badge>
              </div>
            </div>

            {fleetOwner.verified_at && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                Verified on {new Date(fleetOwner.verified_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Driver Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {drivers && drivers.length > 0 ? (
            <div className="space-y-3">
              {drivers.slice(0, 5).map((driver) => (
                <div
                  key={driver.driver_id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{driver.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {driver.cab_number} - {driver.vehicle_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={driver.is_verified ? "default" : "secondary"}>
                      {driver.is_verified ? "Active" : "Pending"}
                    </Badge>
                    {driver.avg_rating && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Rating: {driver.avg_rating.toFixed(1)} ⭐
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No drivers assigned to your fleet yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
