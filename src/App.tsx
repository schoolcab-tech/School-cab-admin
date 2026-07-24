import { ProtectedRoute } from "@/components/auth/protected-route";
import { RoleBasedRedirect } from "@/components/auth/RoleBasedRedirect";
import { RoleBasedRoute } from "@/components/auth/RoleBasedRoute";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import Login from "@/pages/auth/Login";
import ResetPassword from "@/pages/auth/ResetPassword";
import PaymentDetail from "@/pages/payments/PaymentDetail";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import AccountDeletion from "./pages/AccountDeletion";
import AccountSuspended from "./pages/AccountSuspended";
import Analytics from "./pages/Analytics";
import Benefits from "./pages/Benefits";
import Coupons from "./pages/Coupons";
import Dashboard from "./pages/Dashboard";
import DriverDetail from "./pages/drivers/DriverDetailPage";
import Drivers from "./pages/drivers/DriversPage";
import EditDriver from "./pages/drivers/EditDriverPage";
import BulkUploadDrivers from "./pages/drivers/BulkUploadDrivers";
import NewDriver from "./pages/drivers/NewDriverPage";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RoutesPage from "./pages/RoutesPage";
import Schools from "./pages/Schools";
import AddSchool from "./pages/schools/AddSchool";
import BulkUploadSchools from "./pages/schools/BulkUploadSchools";
import EditSchool from "./pages/schools/EditSchool";
import SchoolDetail from "./pages/schools/SchoolDetail";
import Settings from "./pages/Settings";
import StudentDetailPage, {
  SchoolAdminStudentDetailPage,
} from "./pages/students/StudentDetailPage";
import Students, { SchoolAdminStudentsPage } from "./pages/Students";
import TermsAndConditions from "./pages/TermsAndConditions";
import Unauthorized from "./pages/Unauthorized";
import AddStudentPage from "./pages/students/AddStudentPage";
import BulkUploadStudents from "./pages/students/BulkUploadStudents";
import BulkOverrideStudents from "./pages/students/BulkOverrideStudents";
import EditStudentPage from "./pages/students/EditStudentPage";
import { Loader2 } from "lucide-react";
import BookingDetailPage, {
  SchoolAdminBookingDetailPage,
} from "./pages/bookings/BookingDetailPage";
import RouteOrderingPage, {
  SchoolAdminRouteOrderingPage,
} from "./pages/route-ordering/RouteOrderingPage";
import RouteOrderingDetailPage, {
  SchoolAdminRouteOrderingDetailPage,
} from "./pages/route-ordering/RouteOrderingDetailPage";
import DriverTripManagement from "./pages/route-ordering/DriverTripManagement";

// Trip Schedules Page
import TripSchedulesPage, {
  SchoolAdminTripSchedulesPage,
} from "./pages/trip-schedules/TripSchedulesPage";

// Website Leads Page
import WebsiteLeadsPage from "./pages/WebsiteLeadsPage";

// Master Admin Pages
import AddCashPaymentPage from "./pages/master-admin/AddCashPaymentPage";
import BulkCashPaymentPage from "./pages/master-admin/BulkCashPaymentPage";
import AuditTrailPage from "./pages/master-admin/AuditTrailPage";
import DriverRequestsPage from "./pages/master-admin/DriverRequestsPage";
import DriverDeleteRequestsPage from "./pages/master-admin/DriverDeleteRequestsPage";
import EarningsPage from "./pages/master-admin/EarningsPage";
import FleetMappingPage from "./pages/master-admin/FleetMappingPage";
import FleetOwnersPage from "./pages/master-admin/FleetOwnersPage";
import LiveTrackingPage from "./pages/master-admin/LiveTrackingPage";
import DriverTrackingDetailPage from "./pages/tracking/DriverTrackingDetailPage";
import SchoolAdminsPage from "./pages/master-admin/SchoolAdminsPage";
import PlatformAdminsPage from "./pages/master-admin/PlatformAdminsPage";

// Sub-Admin Pages
import MyEarningsPage from "./pages/sub-admin/MyEarningsPage";
import MyFleetPage from "./pages/sub-admin/MyFleetPage";
import RequestDriversPage from "./pages/sub-admin/RequestDriversPage";
import SubAdminDashboard from "./pages/sub-admin/SubAdminDashboard";

// School Admin Pages
import SchoolAdminDashboard from "./pages/school-admin/SchoolAdminDashboard";
import SchoolAdminDriversPage from "./pages/school-admin/SchoolAdminDriversPage";
import SchoolAdminLiveTrackingPage from "./pages/school-admin/SchoolAdminLiveTrackingPage";
import SchoolAdminBookingsPage from "./pages/school-admin/SchoolAdminBookingsPage";
import SchoolAdminPaymentsPage from "./pages/school-admin/SchoolAdminPaymentsPage";
import SchoolAdminProfilePage from "./pages/school-admin/SchoolAdminProfilePage";

// Vehicles / Reports / Performance
import VehiclesPage, { SchoolAdminVehiclesPage } from "./pages/vehicles/VehiclesPage";
import ReportsPage, { SchoolAdminReportsPage } from "./pages/reports/ReportsPage";
import PerformancePage, { SchoolAdminPerformancePage } from "./pages/performance/PerformancePage";

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <Login />}
      />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Legal pages - Public routes for web view */}
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/account-deletion" element={<AccountDeletion />} />
      <Route path="/terms-and-conditions" element={<TermsAndConditions />} />

      <Route
        path="/forgot-password"
        element={
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold">
                  Forgot Password
                </CardTitle>
                <CardDescription>
                  Enter your email to receive a password reset link
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  Password reset functionality is coming soon. Please contact
                  support for assistance.
                </p>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button asChild variant="link">
                  <Link to="/login">Back to Login</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        }
      />
      {/* Base route - redirects based on role */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <RoleBasedRedirect />
          </ProtectedRoute>
        }
      />

      {/* Master Admin Dashboard */}
      <Route
        path="/dashboard"
        element={
          <RoleBasedRoute allowedRoles={["master_admin", "admin"]}>
            <Dashboard />
          </RoleBasedRoute>
        }
      />

      {/* Admin only routes */}
      <Route
        path="/schools"
        element={
          <ProtectedRoute>
            <Schools />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schools/new"
        element={
          <ProtectedRoute>
            <AddSchool />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schools/bulk-upload"
        element={
          <ProtectedRoute>
            <BulkUploadSchools />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schools/:id"
        element={
          <ProtectedRoute>
            <SchoolDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/schools/:id/edit"
        element={
          <ProtectedRoute>
            <EditSchool />
          </ProtectedRoute>
        }
      />
      <Route
        path="/drivers"
        element={
          <ProtectedRoute>
            <Drivers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/drivers/new"
        element={
          <ProtectedRoute>
            <NewDriver />
          </ProtectedRoute>
        }
      />
      <Route
        path="/drivers/bulk-upload"
        element={
          <ProtectedRoute>
            <BulkUploadDrivers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/drivers/:id"
        element={
          <ProtectedRoute>
            <DriverDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/drivers/:id/edit"
        element={
          <ProtectedRoute>
            <EditDriver />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={
          <RoleBasedRoute allowedRoles={["master_admin", "admin"]}>
            <Students />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/students/new"
        element={
          <ProtectedRoute>
            <AddStudentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/bulk-upload"
        element={
          <ProtectedRoute>
            <BulkUploadStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/bulk-override"
        element={
          <ProtectedRoute>
            <BulkOverrideStudents />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/:id"
        element={
          <ProtectedRoute>
            <StudentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students/:id/edit"
        element={
          <ProtectedRoute>
            <EditStudentPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/routes"
        element={
          <ProtectedRoute>
            <RoutesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/route-ordering"
        element={
          <RoleBasedRoute allowedRoles={["master_admin", "admin"]}>
            <RouteOrderingPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/route-ordering/:driverId/:schoolId"
        element={
          <RoleBasedRoute allowedRoles={["master_admin", "admin"]}>
            <RouteOrderingDetailPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/route-ordering/:driverId/:schoolId/trips"
        element={
          <ProtectedRoute>
            <DriverTripManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trip-schedules"
        element={
          <RoleBasedRoute allowedRoles={["master_admin", "admin"]}>
            <TripSchedulesPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/benefits"
        element={
          <ProtectedRoute>
            <Benefits />
          </ProtectedRoute>
        }
      />
      <Route
        path="/coupons"
        element={
          <ProtectedRoute>
            <Coupons />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/website-leads"
        element={
          <ProtectedRoute>
            <WebsiteLeadsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings/:bookingId"
        element={
          <ProtectedRoute>
            <BookingDetailPage />
          </ProtectedRoute>
        }
      />

      <Route path="/payments/:paymentId" element={<PaymentDetail />} />

      {/* Master Admin Routes */}
      <Route
        path="/master-admin/fleet-owners"
        element={
          <RoleBasedRoute allowedRoles={["master_admin"]}>
            <FleetOwnersPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/fleet-mapping"
        element={
          <RoleBasedRoute allowedRoles={["master_admin"]}>
            <FleetMappingPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/driver-requests"
        element={
          <RoleBasedRoute allowedRoles={["master_admin"]}>
            <DriverRequestsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/driver-delete-requests"
        element={
          <RoleBasedRoute allowedRoles={["master_admin", "admin"]}>
            <DriverDeleteRequestsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/audit-trail"
        element={
          <RoleBasedRoute allowedRoles={["master_admin"]}>
            <AuditTrailPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/earnings"
        element={
          <RoleBasedRoute allowedRoles={["master_admin"]}>
            <EarningsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/add-cash-payment"
        element={
          <RoleBasedRoute allowedRoles={["master_admin"]}>
            <AddCashPaymentPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/bulk-cash-payment"
        element={
          <RoleBasedRoute allowedRoles={["master_admin"]}>
            <BulkCashPaymentPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/platform-admins"
        element={
          <RoleBasedRoute allowedRoles={["master_admin"]}>
            <PlatformAdminsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/school-admins"
        element={
          <RoleBasedRoute allowedRoles={["master_admin"]}>
            <SchoolAdminsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/live-tracking"
        element={
          <RoleBasedRoute allowedRoles={["master_admin", "admin"]}>
            <LiveTrackingPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/live-tracking/:driverId"
        element={
          <RoleBasedRoute allowedRoles={["master_admin", "admin"]}>
            <DriverTrackingDetailPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/vehicles"
        element={
          <RoleBasedRoute allowedRoles={["master_admin", "admin"]}>
            <VehiclesPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/reports"
        element={
          <RoleBasedRoute allowedRoles={["master_admin", "admin"]}>
            <ReportsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/master-admin/performance"
        element={
          <RoleBasedRoute allowedRoles={["master_admin", "admin"]}>
            <PerformancePage />
          </RoleBasedRoute>
        }
      />

      {/* School Admin Routes */}
      <Route
        path="/school-admin/dashboard"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminDashboard />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/drivers"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminDriversPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/live-tracking"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminLiveTrackingPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/live-tracking/:driverId"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <DriverTrackingDetailPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/vehicles"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminVehiclesPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/reports"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminReportsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/performance"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminPerformancePage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/students"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminStudentsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/students/:id"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminStudentDetailPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/route-ordering"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminRouteOrderingPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/route-ordering/:driverId/:schoolId"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminRouteOrderingDetailPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/trip-schedules"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminTripSchedulesPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/bookings"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminBookingsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/bookings/:bookingId"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminBookingDetailPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/payments"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminPaymentsPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/school-admin/school"
        element={
          <RoleBasedRoute allowedRoles={["school_admin"]}>
            <SchoolAdminProfilePage />
          </RoleBasedRoute>
        }
      />

      {/* Sub-Admin Routes */}
      <Route
        path="/sub-admin/dashboard"
        element={
          <RoleBasedRoute allowedRoles={["sub_admin"]}>
            <SubAdminDashboard />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/sub-admin/my-fleet"
        element={
          <RoleBasedRoute allowedRoles={["sub_admin"]}>
            <MyFleetPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/sub-admin/request-drivers"
        element={
          <RoleBasedRoute allowedRoles={["sub_admin"]}>
            <RequestDriversPage />
          </RoleBasedRoute>
        }
      />
      <Route
        path="/sub-admin/my-earnings"
        element={
          <RoleBasedRoute allowedRoles={["sub_admin"]}>
            <MyEarningsPage />
          </RoleBasedRoute>
        }
      />

      {/* Error routes */}
      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="/account-suspended" element={<AccountSuspended />} />

      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </AuthProvider>
);

export default App;
