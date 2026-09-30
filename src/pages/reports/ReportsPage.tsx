import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/contexts/auth-context"
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { useDrivers } from "@/hooks/useDrivers";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import {
  getTripReports,
  type ReportsFilter,
  type TripReportRow,
} from "@/services/reportsService";
import { format } from "date-fns";
import { Calendar, Download, FileText, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

interface ReportsPageProps {
  /** If set, filter to a specific school. */
  schoolId?: number;
}

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <ReportsContent />
    </DashboardLayout>
  );
}

export function SchoolAdminReportsPage() {
  return (
    <DashboardLayout>
      <SchoolAdminReportsContent />
    </DashboardLayout>
  );
}

function SchoolAdminReportsContent() {
  const activeSchoolId = useActiveSchoolId();
  return <ReportsContent schoolId={activeSchoolId ?? undefined} />;
}

function ReportsContent({ schoolId }: ReportsPageProps = {}) {
  const today = format(new Date(), "yyyy-MM-dd");
  const sevenDaysAgo = format(
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    "yyyy-MM-dd"
  );

  const [startDate, setStartDate] = useState(sevenDaysAgo);
  const [endDate, setEndDate] = useState(today);
  const [driverId, setDriverId] = useState<string>("all");
  const [tripType, setTripType] = useState<ReportsFilter["tripType"]>("all");
  const [status, setStatus] = useState<ReportsFilter["status"]>("all");

  // Scope the driver dropdown to the school admin's school (matches the
  // filtering used everywhere else: drivers.schools_serving).
  const { data: allDrivers = [] } = useDrivers();
  const drivers = useMemo(() => {
    if (schoolId == null) return allDrivers;
    return (allDrivers as any[]).filter(
      (d) => Array.isArray(d.schools_serving) && d.schools_serving.includes(schoolId)
    );
  }, [allDrivers, schoolId]);

  const filter: ReportsFilter = {
    startDate,
    endDate,
    driverId: driverId === "all" ? undefined : parseInt(driverId),
    tripType,
    status,
    schoolId,
  };

  const {
    data: rows = [],
    isLoading,
    error,
  } = useSimpleQuery<TripReportRow[]>(
    () => getTripReports(filter),
    [startDate, endDate, driverId, tripType, status, schoolId]
  );

  const summary = useMemo(() => {
    const completed = rows.filter((r) => r.status === "completed").length;
    const inProgress = rows.filter((r) => r.status === "in_progress" || r.status === "started").length;
    const morning = rows.filter((r) => r.trip_type === "pickup").length;
    const drop = rows.filter((r) => r.trip_type === "drop").length;
    return { total: rows.length, completed, inProgress, morning, drop };
  }, [rows]);

  const handleExportCSV = () => {
    const headers = [
      "Date",
      "Driver",
      "Cab",
      "School",
      "Trip Type",
      "Status",
      "Start Time",
      "End Time",
      "Duration (min)",
      "Total Students",
      "Students Dropped",
      "Distance (km)",
    ];
    const rowsCsv = rows.map((r) => [
      r.actual_start_time ? format(new Date(r.actual_start_time), "yyyy-MM-dd") : "",
      escapeCsv(r.driver_name),
      escapeCsv(r.cab_number),
      escapeCsv(r.school_name || ""),
      r.trip_type,
      r.status,
      r.actual_start_time ? format(new Date(r.actual_start_time), "HH:mm") : "",
      r.actual_end_time ? format(new Date(r.actual_end_time), "HH:mm") : "",
      r.actual_duration_minutes ?? "",
      r.total_students ?? "",
      r.students_dropped ?? "",
      r.total_distance_km != null ? r.total_distance_km.toFixed(1) : "",
    ]);
    const csv = [headers.join(","), ...rowsCsv.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `trip_report_${startDate}_to_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-7 w-7" />
            Trip Reports
          </h1>
          <p className="text-muted-foreground">
            {schoolId != null
              ? "Operational trip reports for vehicles serving your school."
              : "Operational trip reports across the entire fleet."}
          </p>
        </div>
        <Button onClick={handleExportCSV} disabled={rows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <SummaryCard label="Total Trips" value={summary.total} />
        <SummaryCard label="Completed" value={summary.completed} accent="text-green-600" />
        <SummaryCard label="In Progress" value={summary.inProgress} accent="text-blue-600" />
        <SummaryCard label="Morning Pickup" value={summary.morning} />
        <SummaryCard label="Drop" value={summary.drop} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Driver</Label>
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Drivers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers</SelectItem>
                  {drivers.map((d: any) => (
                    <SelectItem key={d.driver_id} value={String(d.driver_id)}>
                      {d.name} - {d.cab_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Trip Type</Label>
              <Select
                value={tripType ?? "all"}
                onValueChange={(v) => setTripType(v as ReportsFilter["tripType"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pickup">Morning Pickup</SelectItem>
                  <SelectItem value="drop">Drop</SelectItem>
                  <SelectItem value="round_trip">Round Trip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select
                value={status ?? "all"}
                onValueChange={(v) => setStatus(v as ReportsFilter["status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="started">Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Trip Sessions ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">Error: {error.message}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Cab</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Trip Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.trip_session_id}>
                    <TableCell className="text-sm">
                      {r.actual_start_time
                        ? format(new Date(r.actual_start_time), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="font-medium">{r.driver_name}</TableCell>
                    <TableCell>{r.cab_number}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.school_name || "—"}
                    </TableCell>
                    <TableCell>
                      <TripTypeBadge type={r.trip_type} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.actual_start_time
                        ? format(new Date(r.actual_start_time), "HH:mm")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.actual_end_time ? format(new Date(r.actual_end_time), "HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.actual_duration_minutes != null
                        ? `${r.actual_duration_minutes}m`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.students_dropped ?? 0} / {r.total_students ?? 0}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.total_distance_km != null ? `${r.total_distance_km.toFixed(1)} km` : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      No trips found for the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <Card>
      <CardContent className="py-4 text-center">
        <div className={`text-2xl font-bold ${accent ?? ""}`}>{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function TripTypeBadge({ type }: { type: string }) {
  if (type === "pickup")
    return <Badge style={{ backgroundColor: "#f59e0b", color: "white" }}>Pickup</Badge>;
  if (type === "drop")
    return <Badge style={{ backgroundColor: "#8b5cf6", color: "white" }}>Drop</Badge>;
  if (type === "round_trip")
    return <Badge style={{ backgroundColor: "#06b6d4", color: "white" }}>Round Trip</Badge>;
  return <Badge variant="outline">{type}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "completed")
    return <Badge style={{ backgroundColor: "#16a34a", color: "white" }}>Completed</Badge>;
  if (status === "in_progress")
    return <Badge style={{ backgroundColor: "#2563eb", color: "white" }}>In Progress</Badge>;
  if (status === "started")
    return <Badge variant="outline">Started</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return "";
  const s = String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
