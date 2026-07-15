import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleQuery } from "@/hooks/useSimpleQuery";
import { format } from "date-fns";
import { AlertCircle, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

interface School {
  name?: string;
}

interface Student {
  name?: string;
  class?: string;
  section?: string;
  phone_number?: string;
  schools?: School;
}

interface Booking {
  booking_id: number;
  students?: Student;
}

interface PaymentFromDB {
  payment_id: number;
  booking_id: number;
  amount: number;
  status: string;
  payment_date: string;
  payment_mode: string;
  driver_id: string;
}

interface BookingFromDB {
  booking_id: number;
  students?: Student;
}

interface Payment {
  payment_id: number;
  booking_id: number;
  amount: number;
  status: PaymentStatus;
  payment_date: string;
  payment_mode: string;
  student: {
    name: string;
    class: string;
    section: string;
  };
  school: {
    name: string;
  };
}

interface Student {
  name?: string;
  class?: string;
  section?: string;
  phone_number?: string;
  schools?: {
    name?: string;
  };
}

interface Booking {
  booking_id: number;
  students?: Student;
}

interface Payment {
  payment_id: number;
  booking_id: number;
  amount: number;
  status: PaymentStatus;
  payment_date: string;
  payment_mode: string;
  student: {
    name: string;
    class: string;
    section: string;
  };
  school: {
    name: string;
  };
}

type PaymentStatus = "completed" | "pending" | "failed";

interface Student {
  name?: string;
  class?: string;
  section?: string;
  schools?: {
    name?: string;
  };
}

interface Booking {
  booking_id: number;
  students?: Student;
}

interface Payment {
  payment_id: number;
  booking_id: number;
  amount: number;
  status: PaymentStatus;
  payment_date: string;
  payment_mode: string;
  student: {
    name: string;
    class: string;
    section: string;
  };
  school: {
    name: string;
  };
}

export function DriverPaymentHistory({ driverId }: { driverId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const {
    data: payments,
    isLoading,
    error,
  } = useSimpleQuery<Payment[]>(
    async () => {
      try {
        // First, get the payments
        const { data: paymentsData, error: paymentsError } = await supabase
          .from("payments")
          .select("*")
          .eq("driver_id", parseInt(driverId))
          .order("payment_date", { ascending: false });

        if (paymentsError) throw paymentsError;
        if (!paymentsData) return [];

        // Get all booking IDs
        const bookingIds = paymentsData
          .map((p) => p.booking_id)
          .filter((id): id is number => Boolean(id));

        // Get bookings with student and school info
        const { data: bookingsData, error: bookingsError } =
          bookingIds.length > 0
            ? await supabase
                .from("bookings")
                .select(
                  `
                booking_id,
                students (
                  name,
                  class,
                  section,
                  schools (name)
                )
              `
                )
                .in("booking_id", bookingIds)
            : { data: [], error: null };

        if (bookingsError) throw bookingsError;

        // Create a map of booking_id to booking data
        const bookingsMap = new Map<number, BookingFromDB>();
        (bookingsData || []).forEach((booking) => {
          if (booking?.booking_id) {
            bookingsMap.set(booking.booking_id, booking);
          }
        });

        // Combine the data
        return paymentsData.map((payment) => {
          const booking =
            bookingsMap.get(payment.booking_id) || ({} as BookingFromDB);
          const student = booking.students || ({} as Student);
          const school = student?.schools || {};

          return {
            payment_id: payment.payment_id,
            booking_id: payment.booking_id,
            amount: payment.amount || 0,
            status: (payment.status as PaymentStatus) || "pending",
            payment_date: payment.payment_date || new Date().toISOString(),
            payment_mode: payment.payment_mode || "N/A",
            student: {
              name: student?.name || "N/A",
              class: student?.class || "N/A",
              section: student?.section || "N/A",
            },
            school: {
              name: school?.name || "N/A",
            },
          };
        });
      } catch (err) {
        console.error("Error fetching payment history:", err);
        toast({
          title: "Error",
          description: "Failed to load payment history",
          variant: "destructive",
        });
        throw err;
      }
    },
    [driverId],
    { enabled: isOpen }
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="mt-2">
          <FileText className="h-4 w-4 mr-2" />
          View Payment History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Payment History</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="flex flex-col items-center gap-2 text-destructive">
              <AlertCircle className="h-8 w-8" />
              <p>Error loading payment history</p>
              <p className="text-sm text-muted-foreground">
                Please try again later
              </p>
              <Button
                variant="outline"
                className="mt-2"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          </div>
        ) : !payments || payments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No payment history found</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments?.length ? (
                    payments.map((payment) => (
                      <TableRow key={payment.payment_id}>
                        <TableCell>
                          {format(
                            new Date(payment.payment_date),
                            "dd MMM yyyy"
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {String(payment.payment_id).slice(0, 8)}...
                        </TableCell>
                        <TableCell>{payment.student?.name || "N/A"}</TableCell>
                        <TableCell>{payment.school?.name || "N/A"}</TableCell>
                        <TableCell>
                          {payment.student
                            ? `${payment.student.class} ${payment.student.section}`
                            : "N/A"}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="capitalize">
                          {payment.payment_mode || "N/A"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No payment history found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
