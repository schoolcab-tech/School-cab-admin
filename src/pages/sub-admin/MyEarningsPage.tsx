import { DashboardLayout } from "@/components/DashboardLayout";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMyFleetOwner } from "@/hooks/useFleetOwners";
import { useOwnerDrivers } from "@/hooks/useFleetMappings";
import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Calendar, Download, Loader2, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { downloadCSV } from "@/lib/csvExport";
import {
  updateSubscriptionPaymentStatus,
  type PaymentMarkStatus,
} from "@/services/subAdminPaymentService";

type EarningRecord = {
  subscription_payment_id: number;
  amount: number;
  months_covered: number;
  discount_applied: number;
  transaction_date: string;
  transaction_status: string;
  payment_method: string;
  coupon_code: string | null;
  driver_name: string;
  driver_phone: string;
  cab_number: string;
  student_name: string;
  school_name: string;
  cycle_start_date: string;
  cycle_end_date: string;
};

export default function MyEarningsPage() {
  return (
    <DashboardLayout>
      <MyEarningsContent />
    </DashboardLayout>
  );
}

function MyEarningsContent() {
  const { data: fleetOwner, isLoading: loadingOwner } = useMyFleetOwner();
  const { data: drivers, isLoading: loadingDrivers } = useOwnerDrivers(
    fleetOwner?.owner_id
  );

  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    transactionCount: 0,
  });
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [updatingPaymentId, setUpdatingPaymentId] = useState<number | null>(null);

  const fetchEarnings = async () => {
      if (!drivers || drivers.length === 0) {
        setEarnings([]);
        setSummary({ total: 0, completed: 0, pending: 0, failed: 0, transactionCount: 0 });
        return;
      }

      setLoadingEarnings(true);
      const driverIds = drivers.map((d) => d.driver_id);

      // Calculate month range
      const monthDate = new Date(selectedMonth + "-01");
      const monthStart = startOfMonth(monthDate).toISOString().split('T')[0];
      const monthEnd = endOfMonth(monthDate).toISOString().split('T')[0];

      try {
        let query = supabase
          .from("subscription_payments")
          .select(
            `
            subscription_payment_id,
            amount,
            months_covered,
            discount_applied,
            transaction_date,
            transaction_status,
            payment_method,
            coupon_code,
            driver_id,
            drivers!inner(
              name,
              phone,
              cab_number
            ),
            subscription_cycles!inner(
              cycle_start_date,
              cycle_end_date,
              booking_id,
              bookings!inner(
                student_id,
                students!inner(
                  name,
                  school_id,
                  schools!inner(
                    name
                  )
                )
              )
            )
          `
          )
          .in("driver_id", driverIds)
          .gte("transaction_date", monthStart)
          .lte("transaction_date", monthEnd + "T23:59:59")
          .order("transaction_date", { ascending: false });

        if (selectedDriver !== "all") {
          query = query.eq("driver_id", parseInt(selectedDriver));
        }

        if (selectedStatus !== "all") {
          query = query.eq("transaction_status", selectedStatus);
        }

        const { data, error } = await query;

        if (error) {
          toast.error("Failed to fetch earnings: " + error.message);
          setLoadingEarnings(false);
          return;
        }

        // Transform the data to flat structure
        const transformedData: EarningRecord[] = (data || []).map((payment: any) => ({
          subscription_payment_id: payment.subscription_payment_id,
          amount: parseFloat(payment.amount || "0"),
          months_covered: payment.months_covered,
          discount_applied: parseFloat(payment.discount_applied || "0"),
          transaction_date: payment.transaction_date,
          transaction_status: payment.transaction_status,
          payment_method: payment.payment_method,
          coupon_code: payment.coupon_code,
          driver_name: payment.drivers?.name || "Unknown",
          driver_phone: payment.drivers?.phone || "",
          cab_number: payment.drivers?.cab_number || "",
          student_name: payment.subscription_cycles?.bookings?.students?.name || "Unknown",
          school_name: payment.subscription_cycles?.bookings?.students?.schools?.name || "Unknown",
          cycle_start_date: payment.subscription_cycles?.cycle_start_date || "",
          cycle_end_date: payment.subscription_cycles?.cycle_end_date || "",
        }));

        setEarnings(transformedData);

        // Calculate summary
        const total = transformedData.reduce((sum, p) => sum + p.amount, 0);
        const completed = transformedData
          .filter((p) => p.transaction_status === "completed")
          .reduce((sum, p) => sum + p.amount, 0);
        const pending = transformedData
          .filter((p) => p.transaction_status === "pending")
          .reduce((sum, p) => sum + p.amount, 0);
        const failed = transformedData
          .filter((p) => p.transaction_status === "failed")
          .reduce((sum, p) => sum + p.amount, 0);

        setSummary({
          total,
          completed,
          pending,
          failed,
          transactionCount: transformedData.length
        });
      } catch (error: any) {
        toast.error("Error loading earnings: " + error.message);
      } finally {
        setLoadingEarnings(false);
      }
    };

  useEffect(() => {
    fetchEarnings();
  }, [drivers, selectedDriver, selectedMonth, selectedStatus]);

  const handleMarkPayment = async (
    subscriptionPaymentId: number,
    status: PaymentMarkStatus
  ) => {
    setUpdatingPaymentId(subscriptionPaymentId);
    try {
      await updateSubscriptionPaymentStatus(subscriptionPaymentId, status);
      toast.success(
        status === "paid" ? "Payment marked as paid" : "Payment marked as unpaid"
      );
      await fetchEarnings();
    } catch (error: any) {
      toast.error(error.message || "Failed to update payment status");
    } finally {
      setUpdatingPaymentId(null);
    }
  };

  const handleDownloadReport = () => {
    if (earnings.length === 0) {
      toast.error("No earnings data to export");
      return;
    }

    const headers = [
      "Transaction Date",
      "Driver",
      "Cab Number",
      "Student",
      "School",
      "Amount",
      "Months Covered",
      "Discount Applied",
      "Net Amount",
      "Coupon Code",
      "Payment Method",
      "Status",
      "Cycle Period",
    ];

    const rows = earnings.map((payment) => [
      payment.transaction_date
        ? format(new Date(payment.transaction_date), "MMM dd, yyyy HH:mm")
        : "",
      payment.driver_name,
      payment.cab_number,
      payment.student_name,
      payment.school_name,
      payment.amount.toFixed(2),
      payment.months_covered,
      payment.discount_applied.toFixed(2),
      (payment.amount - payment.discount_applied).toFixed(2),
      payment.coupon_code || "N/A",
      payment.payment_method,
      payment.transaction_status,
      `${format(new Date(payment.cycle_start_date), "MMM dd, yyyy")} - ${format(new Date(payment.cycle_end_date), "MMM dd, yyyy")}`,
    ]);

    downloadCSV(headers, rows, `fleet-earnings-${selectedMonth}`);
    toast.success("Earnings report downloaded successfully");
  };

  if (loadingOwner || loadingDrivers) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!drivers || drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-lg text-muted-foreground">
          No drivers assigned to your fleet yet
        </p>
        <p className="text-sm text-muted-foreground">
          Contact the master admin to get drivers assigned
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            My Earnings
          </h1>
          <p className="text-muted-foreground">
            Track your fleet's earnings and subscription payments
          </p>
        </div>
        <Button onClick={handleDownloadReport} disabled={earnings.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{summary.total.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.transactionCount} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{summary.completed.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Received payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              ₹{summary.pending.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{summary.failed.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Failed transactions</p>
          </CardContent>
        </Card>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Driver</label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Drivers ({drivers.length})</SelectItem>
                  {drivers?.map((driver) => (
                    <SelectItem
                      key={driver.driver_id}
                      value={driver.driver_id.toString()}
                    >
                      {driver.name} - {driver.cab_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const value = date.toISOString().slice(0, 7);
                    const label = format(date, "MMMM yyyy");
                    return (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History ({earnings.length} records)</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingEarnings ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : earnings.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Months</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((payment) => (
                    <TableRow key={payment.subscription_payment_id}>
                      <TableCell className="whitespace-nowrap">
                        {payment.transaction_date &&
                          format(new Date(payment.transaction_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{payment.driver_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {payment.cab_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{payment.student_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {payment.school_name}
                      </TableCell>
                      <TableCell className="font-semibold text-right">
                        ₹{payment.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{payment.months_covered}M</Badge>
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {payment.discount_applied > 0 && (
                          <>-₹{payment.discount_applied.toFixed(2)}</>
                        )}
                        {payment.discount_applied === 0 && <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payment.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            payment.transaction_status === "completed"
                              ? "bg-green-500"
                              : payment.transaction_status === "pending"
                              ? "bg-yellow-500"
                              : payment.transaction_status === "refunded"
                              ? "bg-blue-500"
                              : "bg-red-500"
                          }
                        >
                          {payment.transaction_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {payment.transaction_status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingPaymentId === payment.subscription_payment_id}
                            onClick={() =>
                              handleMarkPayment(payment.subscription_payment_id, "paid")
                            }
                          >
                            {updatingPaymentId === payment.subscription_payment_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Mark Paid"
                            )}
                          </Button>
                        )}
                        {payment.transaction_status === "completed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={updatingPaymentId === payment.subscription_payment_id}
                            onClick={() =>
                              handleMarkPayment(payment.subscription_payment_id, "unpaid")
                            }
                          >
                            {updatingPaymentId === payment.subscription_payment_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Mark Unpaid"
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No earnings data for the selected period</p>
              <p className="text-sm mt-2">
                Try selecting a different month or driver filter
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
