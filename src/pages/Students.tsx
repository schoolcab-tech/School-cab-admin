import { DashboardLayout } from "@/components/DashboardLayout";
import { StudentsTable } from "@/components/tables/StudentsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { useMyFleetOwner } from "@/hooks/useFleetOwners";
import { useOwnerDrivers } from "@/hooks/useFleetMappings";
import { useStudents } from "@/hooks/useStudents";
import { downloadCSV } from "@/lib/csvExport";
import { Student } from "@/types/student";
import { Download, Loader2, Plus, RefreshCw, Upload } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

function exportStudentsToCSV(students: Student[]) {
  downloadCSV(
    [
      "Student ID",
      "Name",
      "Class",
      "Section",
      "School Name",
      "Phone Number",
      "Pickup Address",
      "Pickup Pincode",
      "Pickup Time",
      "Drop Address",
      "Drop Pincode",
      "Drop Time",
      "Assigned Driver",
      "Driver Phone",
      "Driver Cab Number",
      "Driver Vehicle Type",
      "Status",
      "Created At",
    ],
    students.map((s) => [
      s.student_id,
      s.name,
      s.class,
      s.section,
      s.schools?.name,
      // @ts-expect-error - phone_number exists in DB but not in type
      s.phone_number || s.phone,
      s.pickup_address,
      s.pickup_pincode,
      s.pickup_time,
      s.drop_address,
      s.drop_pincode,
      s.drop_time,
      s.assigned_driver?.name,
      s.assigned_driver?.phone,
      s.assigned_driver?.cab_number,
      s.assigned_driver?.vehicle_type,
      s.status || "unknown",
      s.created_at ? new Date(s.created_at).toLocaleDateString() : "",
    ]),
    `students_export_${new Date().toISOString().split("T")[0]}`
  );
}

export interface StudentsContentProps {
  schoolId?: number;
  driverIds?: number[];
  fleetDrivers?: Array<{
    driver_id: number;
    name?: string | null;
    cab_number: string;
    vehicle_type?: string;
  }>;
  /** Pre-select driver filter (e.g. from My Fleet link) */
  initialDriverFilter?: string;
  driverSwitchOnly?: boolean;
  readOnly?: boolean;
  detailBasePath?: string;
  title?: string;
  description?: string;
}

export function StudentsContent({
  schoolId,
  driverIds,
  fleetDrivers,
  initialDriverFilter,
  driverSwitchOnly = false,
  readOnly = false,
  detailBasePath = "/students",
  title,
  description,
}: StudentsContentProps) {
  const navigate = useNavigate();
  const { data: students = [] } = useStudents(schoolId, driverIds);
  const [activeTab, setActiveTab] = useState("all");

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "active").length;
  const withoutDrivers = students.filter((s) => !s.assigned_driver).length;
  const canFullEdit = !readOnly && !driverSwitchOnly;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {title ??
              (schoolId
                ? "Students"
                : driverSwitchOnly
                  ? "Switch Drivers"
                  : "Students Management")}
          </h1>
          <p className="text-muted-foreground">
            {description ??
              (driverSwitchOnly
                ? "Reassign students between drivers in your fleet."
                : schoolId
                  ? "View enrolled students and their transport assignments."
                  : "Manage student profiles, school assignments, and driver allocations.")}
          </p>
        </div>
        {canFullEdit && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exportStudentsToCSV(students)}
              disabled={students.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
            <Button variant="outline" onClick={() => navigate("/students/bulk-upload")}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
            <Button variant="outline" onClick={() => navigate("/students/bulk-override")}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Bulk Override
            </Button>
            <Button onClick={() => navigate("/students/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </div>
        )}
        {(readOnly || driverSwitchOnly) && (
          <Button
            variant="outline"
            onClick={() => exportStudentsToCSV(students)}
            disabled={students.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex justify-between">
          <TabsList>
            <TabsTrigger value="all">All Students</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="inactive">Inactive</TabsTrigger>
          </TabsList>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
              <p className="text-xs text-muted-foreground">
                {schoolId ? "Enrolled at your school" : "From all schools and grades"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeStudents}</div>
              <p className="text-xs text-muted-foreground">Currently in active status</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Without Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{withoutDrivers}</div>
              <p className="text-xs text-muted-foreground">
                Students awaiting driver assignment
              </p>
            </CardContent>
          </Card>
        </div>

        <TabsContent value="all" className="mt-0">
          <StudentsTable
            statusTab="all"
            schoolId={schoolId}
            driverIds={driverIds}
            fleetDrivers={fleetDrivers}
            initialDriverFilter={initialDriverFilter}
            driverSwitchOnly={driverSwitchOnly}
            readOnly={readOnly}
            detailBasePath={detailBasePath}
          />
        </TabsContent>
        <TabsContent value="active" className="mt-0">
          <StudentsTable
            statusTab="active"
            schoolId={schoolId}
            driverIds={driverIds}
            fleetDrivers={fleetDrivers}
            initialDriverFilter={initialDriverFilter}
            driverSwitchOnly={driverSwitchOnly}
            readOnly={readOnly}
            detailBasePath={detailBasePath}
          />
        </TabsContent>
        <TabsContent value="inactive" className="mt-0">
          <StudentsTable
            statusTab="inactive"
            schoolId={schoolId}
            driverIds={driverIds}
            fleetDrivers={fleetDrivers}
            initialDriverFilter={initialDriverFilter}
            driverSwitchOnly={driverSwitchOnly}
            readOnly={readOnly}
            detailBasePath={detailBasePath}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Students() {
  return (
    <DashboardLayout>
      <StudentsContent />
    </DashboardLayout>
  );
}

export function SchoolAdminStudentsPage() {
  const { linkedSchoolId } = useAuth();
  return (
    <DashboardLayout>
      {linkedSchoolId ? (
        <StudentsContent
          schoolId={linkedSchoolId}
          readOnly
          detailBasePath="/school-admin/students"
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No school linked to your account.
        </div>
      )}
    </DashboardLayout>
  );
}

export function SubAdminStudentsPage() {
  const [searchParams] = useSearchParams();
  const initialDriverFilter = searchParams.get("driverId") || undefined;
  const { data: fleetOwner, isLoading: loadingOwner } = useMyFleetOwner();
  const { data: drivers, isLoading: loadingDrivers } = useOwnerDrivers(
    fleetOwner?.owner_id
  );

  if (loadingOwner || loadingDrivers) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const driverIds = drivers?.map((d) => d.driver_id) ?? [];

  return (
    <DashboardLayout>
      {driverIds.length > 0 ? (
        <StudentsContent
          driverIds={driverIds}
          fleetDrivers={drivers}
          initialDriverFilter={initialDriverFilter}
          driverSwitchOnly
        />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No drivers assigned to your fleet yet. Request drivers to manage student assignments.
        </div>
      )}
    </DashboardLayout>
  );
}
