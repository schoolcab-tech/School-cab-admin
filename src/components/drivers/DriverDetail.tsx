import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  useDeleteDriver,
  useDriver,
  useDriverAssignedStudents,
  useDriverEarnings,
  useDriverSchools,
  useDriverStats,
} from "@/hooks/useDrivers";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Calendar,
  Car,
  Clock,
  CreditCard,
  DollarSign,
  Edit,
  Loader2,
  MapPin,
  Phone,
  Star,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { DriverPaymentHistory } from "./DriverPaymentHistory";
import { DriverWithdrawalHistory } from "./DriverWithdrawalHistory";
import { DriverDocumentsSection } from "./DriverDocumentsSection";

export function DriverDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userRole, isMasterAdmin, isSchoolAdmin, isModerator } = useAuth();
  const canDeleteDriver =
    isMasterAdmin || (userRole as string | null) === "admin";
  const canEditDriver = canDeleteDriver;
  const backHref = isSchoolAdmin
    ? "/school-admin/drivers"
    : isModerator
      ? "/moderator/drivers"
      : "/drivers";

  const { data: driver, isLoading: loadingDriver } = useDriver(id!);
  const { data: stats, isLoading: loadingStats } = useDriverStats(id!);
  const {
    data: earnings,
    isLoading: loadingEarnings,
    error: earningsError,
  } = useDriverEarnings(id!);
  const { data: assignedStudents, isLoading: loadingStudents } =
    useDriverAssignedStudents(id!);
  const deleteDriver = useDeleteDriver();

  console.log("Driver ID:", id);
  console.log("Loading earnings:", loadingEarnings);
  console.log("Earnings error:", earningsError);

  const schoolIds =
    (driver as any)?.schools_serving?.map((id: any) => String(id)) || [];
  const { data: driverSchools, isLoading: loadingSchools } =
    useDriverSchools(schoolIds);

  if (loadingDriver) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold">Driver not found</h2>
        <Button onClick={() => navigate(backHref)} className="mt-4">
          Back to Drivers
        </Button>
      </div>
    );
  }

  console.log("earnings data from driver detail", earnings);
  console.log("earnings type:", typeof earnings);
  console.log(
    "earnings properties:",
    earnings ? Object.keys(earnings) : "no earnings"
  );

  const handleDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${driver.name || "this driver"}? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteDriver.mutateAsync(id!);
      toast({
        title: "Success",
        description: "Driver deleted successfully",
      });
      navigate("/drivers");
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to delete driver",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate(backHref)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Drivers
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {driver.name || "Driver Details"}
            </h1>
            <p className="text-muted-foreground">
              Driver ID: {driver.driver_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canDeleteDriver && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDriver.isPending}
            >
              {deleteDriver.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete Driver
            </Button>
          )}
          {canEditDriver && (
            <Button onClick={() => navigate(`/drivers/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Driver
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Driver Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Driver Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Name
                  </label>
                  <p className="text-sm">{driver.name || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Phone
                  </label>
                  <p className="text-sm flex items-center">
                    <Phone className="h-4 w-4 mr-2" />
                    {driver.phone || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Verification Status
                  </label>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={driver.is_verified ? "default" : "secondary"}
                    >
                      {driver.is_verified ? "Verified" : "Unverified"}
                    </Badge>
                    {driver.verification_date && (
                      <span className="text-xs text-muted-foreground">
                        Since {formatDate(driver.verification_date)}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Member Since
                  </label>
                  <p className="text-sm flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    {formatDate(driver.created_at)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Information */}
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Cab Number
                  </label>
                  <p className="text-sm flex items-center">
                    <Car className="h-4 w-4 mr-2" />
                    {driver.cab_number}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Vehicle Type
                  </label>
                  <p className="text-sm">{driver.vehicle_type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Capacity
                  </label>
                  <p className="text-sm flex items-center">
                    <Users className="h-4 w-4 mr-2" />
                    {driver.cab_capacity} passengers
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    License Number
                  </label>
                  <p className="text-sm">{driver.license_number}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Areas */}
          <Card>
            <CardHeader>
              <CardTitle>Service Areas</CardTitle>
            </CardHeader>
            <CardContent>
              {driver.service_areas && driver.service_areas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {driver.service_areas.map((area) => (
                    <Badge
                      key={area.pincode}
                      variant="outline"
                      className="flex items-center"
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      {area.pincode}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No service areas defined
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats and Earnings */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingStats ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Rating</span>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                      <span>{driver.avg_rating?.toFixed(1) || "N/A"}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Bookings</span>
                    <span className="font-semibold">
                      {stats?.total_bookings || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Assigned Students
                    </span>
                    <span className="font-semibold">
                      {stats?.assigned_students || 0}
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Earnings Summary</CardTitle>
                <div className="flex items-center gap-2">
                  <DriverPaymentHistory driverId={id!} />
                  <DriverWithdrawalHistory driverId={id!} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!loadingEarnings ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Earnings
                      </CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(earnings?.total_earnings || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        <TrendingUp className="inline h-3 w-3 mr-1 text-green-500" />
                        {formatCurrency(earnings?.monthly_earnings || 0)} this
                        month
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Pending Payments
                      </CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatCurrency(earnings?.pending_payments || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Awaiting clearance
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Completed Payments
                      </CardTitle>
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {earnings?.completed_payments || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Total transactions
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Schools Serving
                      </CardTitle>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        className="h-4 w-4 text-muted-foreground"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {driverSchools?.length || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {driverSchools?.length === 1 ? "School" : "Schools"}{" "}
                        assigned
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assigned Students */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Assigned Students</CardTitle>
            <Badge variant="outline" className="ml-2">
              {assignedStudents?.length || 0} students
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingStudents ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : assignedStudents && assignedStudents.length > 0 ? (
            <div className="space-y-4">
              {assignedStudents.map((booking) => (
                <div
                  key={booking.booking_id}
                  className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/bookings/${booking.booking_id}`)}
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <h4 className="font-medium">{booking.students?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Class: {booking.students?.class} -{" "}
                        {booking.students?.section}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        School: {booking.students?.schools?.name}
                      </p>
                      <div className="text-sm">
                        <p>
                          <strong>Pickup:</strong>{" "}
                          {booking.students?.pickup_address}
                        </p>
                        <p>
                          <strong>Drop:</strong>{" "}
                          {booking.students?.drop_address}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(booking.fare)}
                      </p>
                      <p className="text-xs text-muted-foreground">Monthly</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No students assigned to this driver
            </p>
          )}
        </CardContent>
      </Card>

      {/* Schools Serving Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Schools Serving</CardTitle>
            <Badge variant="outline" className="ml-2">
              {driverSchools?.length || 0}{" "}
              {driverSchools?.length === 1 ? "school" : "schools"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSchools ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : driverSchools && driverSchools.length > 0 ? (
            <div className="space-y-4">
              {driverSchools.map((school) => (
                <div
                  key={school.school_id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{school.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {school.locality}, {school.pincode}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {school.contact_number}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {school.email}
                    </p>
                  </div>
                  <Badge
                    variant={
                      school.status === "active" ? "default" : "secondary"
                    }
                    className="ml-2"
                  >
                    {school.status || "N/A"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No schools assigned to this driver yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Driver Documents (Driving License, RC, Insurance, etc.) */}
      {id && <DriverDocumentsSection driverId={Number(id)} />}
    </div>
  );
}
