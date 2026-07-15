import { DashboardLayout } from "@/components/DashboardLayout";
import { StudentsTable } from "@/components/tables/StudentsTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStudents } from "@/hooks/useStudents";
import { Student } from "@/types/student";
import { Download, Plus, RefreshCw, Upload } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function exportStudentsToCSV(students: Student[]) {
  const headers = [
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
  ];

  const escapeCSV = (value: string | undefined | null) => {
    if (value == null) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = students.map((s) => [
    s.student_id,
    escapeCSV(s.name),
    escapeCSV(s.class),
    escapeCSV(s.section),
    escapeCSV(s.schools?.name),
    // @ts-expect-error - phone_number exists in DB but not in type
    escapeCSV(s.phone_number || s.phone),
    escapeCSV(s.pickup_address),
    escapeCSV(s.pickup_pincode),
    escapeCSV(s.pickup_time),
    escapeCSV(s.drop_address),
    escapeCSV(s.drop_pincode),
    escapeCSV(s.drop_time),
    escapeCSV(s.assigned_driver?.name),
    escapeCSV(s.assigned_driver?.phone),
    escapeCSV(s.assigned_driver?.cab_number),
    escapeCSV(s.assigned_driver?.vehicle_type),
    escapeCSV(s.status || "unknown"),
    escapeCSV(s.created_at ? new Date(s.created_at).toLocaleDateString() : ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `students_export_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function Students() {
  const navigate = useNavigate();
  const { data: students = [] } = useStudents();
  const [activeTab, setActiveTab] = useState("all");

  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.status === "active").length;
  const withoutDrivers = students.filter((s) => !s.assigned_driver).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Students Management
            </h1>
            <p className="text-muted-foreground">
              Manage student profiles, school assignments, and driver allocations.
            </p>
          </div>
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
                <CardTitle className="text-sm font-medium">
                  Total Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStudents}</div>
                <p className="text-xs text-muted-foreground">
                  From all schools and grades
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Students
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeStudents}</div>
                <p className="text-xs text-muted-foreground">
                  Currently in active status
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Without Drivers
                </CardTitle>
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
            <StudentsTable statusTab="all" />
          </TabsContent>
          <TabsContent value="active" className="mt-0">
            <StudentsTable statusTab="active" />
          </TabsContent>
          <TabsContent value="inactive" className="mt-0">
            <StudentsTable statusTab="inactive" />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
