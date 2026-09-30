import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { useBookingsBySchool } from "@/hooks/useBookings";
import { ExportButton } from "@/components/ExportButton";
import { format } from "date-fns";
import { Car, Eye, Loader2, Search, User } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export function SchoolAdminBookingsContent() {
  const { isModerator } = useAuth();
  const activeSchoolId = useActiveSchoolId();
  const bookingsBase = isModerator ? "/moderator/bookings" : "/school-admin/bookings";
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const { data: bookings = [], isLoading, error } = useBookingsBySchool(activeSchoolId ?? undefined);

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return bookings.filter(
      (b) =>
        b.student_name.toLowerCase().includes(term) ||
        b.driver_name.toLowerCase().includes(term) ||
        b.status.toLowerCase().includes(term)
    );
  }, [bookings, searchTerm]);

  const statusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "confirmed":
        return <Badge variant="default">Confirmed</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!activeSchoolId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No school linked to your account.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">
            View transport bookings for students at your school.
          </p>
        </div>
        <ExportButton
          headers={["Student", "Driver", "Status", "Booking Type", "Created"]}
          rows={filtered.map((b) => [
            b.student_name,
            b.driver_name,
            b.status,
            b.booking_type,
            b.created_at ? format(new Date(b.created_at), "MMM dd, yyyy") : "",
          ])}
          filename={`school-bookings-${new Date().toISOString().split("T")[0]}`}
          disabled={filtered.length === 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School Bookings</CardTitle>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student, driver, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load bookings: {(error as Error).message}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((booking) => (
                  <TableRow key={booking.booking_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{booking.student_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.driver_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{booking.booking_type}</Badge>
                    </TableCell>
                    <TableCell>{statusBadge(booking.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(booking.updated_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(`${bookingsBase}/${booking.booking_id}`)
                        }
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? "No bookings match your search." : "No bookings found for your school."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SchoolAdminBookingsPage() {
  return (
    <DashboardLayout>
      <SchoolAdminBookingsContent />
    </DashboardLayout>
  );
}
