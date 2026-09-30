import { DashboardLayout } from "@/components/DashboardLayout";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
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
import { useAuth } from "@/contexts/auth-context"
import { useActiveSchoolId } from "@/hooks/useActiveSchoolId";
import { getBookingSchoolId } from "@/services/bookingService";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type Payment = {
  payment_id: number;
  amount: number;
  status: string;
  payment_date: string;
  payment_mode: string;
  booking_id: number;
};

export interface BookingDetailContentProps {
  listPath?: string;
  linkedSchoolId?: number;
}

export function BookingDetailContent({
  listPath = "/bookings",
  linkedSchoolId,
}: BookingDetailContentProps) {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  useEffect(() => {
    const fetchBookingPayments = async () => {
      if (!bookingId) return;

      try {
        setLoading(true);

        if (linkedSchoolId != null) {
          const bookingSchoolId = await getBookingSchoolId(Number(bookingId));
          if (bookingSchoolId !== linkedSchoolId) {
            setUnauthorized(true);
            return;
          }
        }

        const { data, error } = await supabase
          .from("payments")
          .select("*")
          .eq("booking_id", Number(bookingId))
          .order("payment_date", { ascending: false });

        if (error) throw error;
        setPayments(data || []);
      } catch (err) {
        console.error("Error fetching booking payments:", err);
        setError("Failed to load payment history");
      } finally {
        setLoading(false);
      }
    };

    fetchBookingPayments();
  }, [bookingId, linkedSchoolId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return <Badge variant="default">Completed</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (unauthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => navigate(listPath)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="text-center py-8 text-destructive">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="outline" onClick={() => navigate(listPath)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Bookings
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Booking #{bookingId} - Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.payment_id}>
                    <TableCell>
                      {format(new Date(payment.payment_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{payment.payment_id}</TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(payment.status)}</TableCell>
                    <TableCell className="capitalize">
                      {payment.payment_mode || "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No payment history found for this booking
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <DashboardLayout>
      <BookingDetailContent />
    </DashboardLayout>
  );
}

export function SchoolAdminBookingDetailPage() {
  const { isModerator } = useAuth();
  const activeSchoolId = useActiveSchoolId();
  const listPath = isModerator ? "/moderator/bookings" : "/school-admin/bookings";
  return (
    <DashboardLayout>
      <BookingDetailContent
        listPath={listPath}
        linkedSchoolId={activeSchoolId ?? undefined}
      />
    </DashboardLayout>
  );
}
