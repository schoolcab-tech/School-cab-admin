import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditLogs, downloadAuditLogsCSV } from "@/hooks/useAuditLogs";
import { useState } from "react";
import { Download, Filter, History, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { exportAuditLogsToCSV } from "@/services/auditLogService";

export default function AuditTrailPage() {
  return (
    <DashboardLayout>
      <AuditTrailContent />
    </DashboardLayout>
  );
}

function AuditTrailContent() {
  const [filters, setFilters] = useState<{
    actionType?: string;
    entityType?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const { data: auditLogs, isLoading } = useAuditLogs(filters);
  const [isExporting, setIsExporting] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const csv = await exportAuditLogsToCSV(filters);
      downloadAuditLogsCSV(csv);
      toast.success("Audit logs exported successfully");
    } catch (error: any) {
      toast.error("Failed to export audit logs: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const actionTypeColors: Record<string, string> = {
    create: "bg-green-500",
    update: "bg-blue-500",
    delete: "bg-red-500",
    assign: "bg-purple-500",
    unassign: "bg-orange-500",
    suspend: "bg-yellow-500",
    activate: "bg-teal-500",
    verify: "bg-indigo-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <History className="h-8 w-8" />
            Audit Trail
          </h1>
          <p className="text-muted-foreground">
            Track all administrative actions and changes in the system
          </p>
        </div>
        <Button onClick={handleExportCSV} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export to CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Action Type
              </label>
              <Select
                value={filters.actionType || "all"}
                onValueChange={(value) => handleFilterChange("actionType", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="assign">Assign</SelectItem>
                  <SelectItem value="unassign">Unassign</SelectItem>
                  <SelectItem value="suspend">Suspend</SelectItem>
                  <SelectItem value="activate">Activate</SelectItem>
                  <SelectItem value="verify">Verify</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Entity Type
              </label>
              <Select
                value={filters.entityType || "all"}
                onValueChange={(value) => handleFilterChange("entityType", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All entities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  <SelectItem value="fleet_owner">Fleet Owner</SelectItem>
                  <SelectItem value="fleet_mapping">Fleet Mapping</SelectItem>
                  <SelectItem value="driver">Driver</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Start Date
              </label>
              <Input
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                End Date
              </label>
              <Input
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
          </div>

          {(filters.actionType || filters.entityType || filters.startDate || filters.endDate) && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs ({auditLogs?.length || 0} records)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity Type</TableHead>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.log_id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(new Date(log.created_at!), "MMM dd, yyyy HH:mm:ss")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{log.admin_name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{log.admin_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.admin_role.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${
                            actionTypeColors[log.action_type] || "bg-gray-500"
                          } text-white capitalize`}
                        >
                          {log.action_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {log.entity_type.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.entity_id || "-"}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {log.notes ? (
                          <p className="text-sm truncate">{log.notes}</p>
                        ) : (
                          <div className="text-xs text-muted-foreground space-y-1">
                            {log.old_value && (
                              <div>
                                <span className="font-semibold">Old:</span>{" "}
                                {JSON.stringify(log.old_value).substring(0, 50)}...
                              </div>
                            )}
                            {log.new_value && (
                              <div>
                                <span className="font-semibold">New:</span>{" "}
                                {JSON.stringify(log.new_value).substring(0, 50)}...
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No audit logs found matching your filters
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
