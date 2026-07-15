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
import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  Loader2,
  Filter,
  Building2,
  Car,
  Plus,
  Upload,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

type MasterEarningRecord = {
  subscription_payment_id: number;
  amount: number;
  months_covered: number;
  discount_applied: number;
  transaction_date: string;
  transaction_status: string;
  payment_method: string;
  coupon_code: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  driver_id: number;
  driver_name: string;
  driver_phone: string;
  cab_number: string;
  fleet_owner_id: number | null;
  fleet_owner_name: string | null;
  fleet_owner_email: string | null;
  student_name: string;
  school_name: string;
  cycle_start_date: string;
  cycle_end_date: string;
};

type FleetOwner = {
  owner_id: number;
  company_name: string;
  email: string;
};

type Driver = {
  driver_id: number;
  name: string;
  cab_number: string;
};

export default function EarningsPage() {
  return (
    <DashboardLayout>
      <EarningsContent />
    </DashboardLayout>
  );
}

function EarningsContent() {
  const navigate = useNavigate();
  const [selectedFleetOwner, setSelectedFleetOwner] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [earnings, setEarnings] = useState<MasterEarningRecord[]>([]);
  const [fleetOwners, setFleetOwners] = useState<FleetOwner[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([]);
  const [summary, setSummary] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    transactionCount: 0,
  });
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);

  // Fetch fleet owners and drivers on mount
  useEffect(() => {
    const fetchMetaData = async () => {
      setLoadingMeta(true);
      try {
        // Fetch fleet owners
        const { data: ownersData, error: ownersError } = await supabase
          .from("fleet_owners")
          .select("owner_id, company_name, email")
          .eq("is_active", true)
          .order("company_name");

        if (ownersError) throw ownersError;
        setFleetOwners(ownersData || []);

        // Fetch all drivers
        const { data: driversData, error: driversError } = await supabase
          .from("drivers")
          .select("driver_id, name, cab_number")
          .order("name");

        if (driversError) throw driversError;
        setDrivers(driversData || []);
        setFilteredDrivers(driversData || []);
      } catch (error: any) {
        toast.error("Failed to load filters: " + error.message);
      } finally {
        setLoadingMeta(false);
      }
    };

    fetchMetaData();
  }, []);

  // Filter drivers when fleet owner changes
  useEffect(() => {
    const filterDriversByFleetOwner = async () => {
      if (selectedFleetOwner === "all") {
        setFilteredDrivers(drivers);
        return;
      }

      try {
        // Get drivers for selected fleet owner
        const { data: mappingsData, error: mappingsError } = await supabase
          .from("fleet_cab_mappings")
          .select("driver_id")
          .eq("owner_id", parseInt(selectedFleetOwner))
          .eq("is_active", true);

        if (mappingsError) throw mappingsError;

        const ownerDriverIds = mappingsData?.map((m) => m.driver_id) || [];
        const filtered = drivers.filter((d) =>
          ownerDriverIds.includes(d.driver_id)
        );
        setFilteredDrivers(filtered);

        // Reset driver selection if current driver is not in filtered list
        if (
          selectedDriver !== "all" &&
          !filtered.some((d) => d.driver_id === parseInt(selectedDriver))
        ) {
          setSelectedDriver("all");
        }
      } catch (error: any) {
        toast.error("Failed to filter drivers: " + error.message);
      }
    };

    filterDriversByFleetOwner();
  }, [selectedFleetOwner, drivers, selectedDriver]);

  // Fetch earnings data
  useEffect(() => {
    const fetchEarnings = async () => {
      setLoadingEarnings(true);

      // Calculate month range (only if not "all")
      let monthStart = null;
      let monthEnd = null;

      if (selectedMonth !== "all") {
        const monthDate = new Date(selectedMonth + "-01");
        monthStart = startOfMonth(monthDate).toISOString().split("T")[0];
        monthEnd = endOfMonth(monthDate).toISOString().split("T")[0];
      }

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
            razorpay_order_id,
            razorpay_payment_id,
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
          );

        // Apply month filter only if not "all"
        if (monthStart && monthEnd) {
          query = query
            .gte("transaction_date", monthStart)
            .lte("transaction_date", monthEnd + "T23:59:59");
        }

        query = query.order("transaction_date", { ascending: false });

        if (selectedDriver !== "all") {
          query = query.eq("driver_id", parseInt(selectedDriver));
        } else if (selectedFleetOwner !== "all") {
          // Filter by fleet owner's drivers
          const { data: mappingsData } = await supabase
            .from("fleet_cab_mappings")
            .select("driver_id")
            .eq("owner_id", parseInt(selectedFleetOwner))
            .eq("is_active", true);

          const driverIds = mappingsData?.map((m) => m.driver_id) || [];
          if (driverIds.length > 0) {
            query = query.in("driver_id", driverIds);
          } else {
            // No drivers for this fleet owner
            setEarnings([]);
            setSummary({
              total: 0,
              completed: 0,
              pending: 0,
              failed: 0,
              transactionCount: 0,
            });
            setLoadingEarnings(false);
            return;
          }
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

        // Get fleet owner info for each driver
        const driverIds = [...new Set(data?.map((p: any) => p.driver_id) || [])];
        const fleetOwnerMap = new Map<number, { owner_id: number; owner_name: string; owner_email: string }>();

        if (driverIds.length > 0) {
          const { data: mappingsData } = await supabase
            .from("fleet_cab_mappings")
            .select(
              `
              driver_id,
              owner_id,
              fleet_owners!inner(
                company_name,
                email
              )
            `
            )
            .in("driver_id", driverIds)
            .eq("is_active", true);

          mappingsData?.forEach((mapping: any) => {
            fleetOwnerMap.set(mapping.driver_id, {
              owner_id: mapping.owner_id,
              owner_name: mapping.fleet_owners?.company_name || "Unknown",
              owner_email: mapping.fleet_owners?.email || "",
            });
          });
        }

        // Transform the data to flat structure
        const transformedData: MasterEarningRecord[] = (data || []).map(
          (payment: any) => {
            const fleetOwnerInfo = fleetOwnerMap.get(payment.driver_id);
            return {
              subscription_payment_id: payment.subscription_payment_id,
              amount: parseFloat(payment.amount || "0"),
              months_covered: payment.months_covered,
              discount_applied: parseFloat(payment.discount_applied || "0"),
              transaction_date: payment.transaction_date,
              transaction_status: payment.transaction_status,
              payment_method: payment.payment_method,
              coupon_code: payment.coupon_code,
              razorpay_order_id: payment.razorpay_order_id,
              razorpay_payment_id: payment.razorpay_payment_id,
              driver_id: payment.driver_id,
              driver_name: payment.drivers?.name || "Unknown",
              driver_phone: payment.drivers?.phone || "",
              cab_number: payment.drivers?.cab_number || "",
              fleet_owner_id: fleetOwnerInfo?.owner_id || null,
              fleet_owner_name: fleetOwnerInfo?.owner_name || "Unassigned",
              fleet_owner_email: fleetOwnerInfo?.owner_email || "",
              student_name:
                payment.subscription_cycles?.bookings?.students?.name ||
                "Unknown",
              school_name:
                payment.subscription_cycles?.bookings?.students?.schools?.name ||
                "Unknown",
              cycle_start_date:
                payment.subscription_cycles?.cycle_start_date || "",
              cycle_end_date: payment.subscription_cycles?.cycle_end_date || "",
            };
          }
        );

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
          transactionCount: transformedData.length,
        });
      } catch (error: any) {
        toast.error("Error loading earnings: " + error.message);
      } finally {
        setLoadingEarnings(false);
      }
    };

    fetchEarnings();
  }, [selectedFleetOwner, selectedDriver, selectedMonth, selectedStatus]);

  const handleDownloadReport = () => {
    if (earnings.length === 0) {
      toast.error("No earnings data to export");
      return;
    }

    const headers = [
      "Transaction Date",
      "Fleet Owner",
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
      "Razorpay Order ID",
      "Razorpay Payment ID",
      "Cycle Period",
    ];

    const rows = earnings.map((payment) => [
      payment.transaction_date
        ? format(new Date(payment.transaction_date), "MMM dd, yyyy HH:mm")
        : "",
      payment.fleet_owner_name || "Unassigned",
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
      payment.razorpay_order_id || "N/A",
      payment.razorpay_payment_id || "N/A",
      `${format(new Date(payment.cycle_start_date), "MMM dd, yyyy")} - ${format(new Date(payment.cycle_end_date), "MMM dd, yyyy")}`,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    const fileName = selectedMonth === "all"
      ? "master-earnings-all-time.csv"
      : `master-earnings-${selectedMonth}.csv`;
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Earnings report downloaded successfully");
  };

  if (loadingMeta) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Master Admin Earnings
          </h1>
          <p className="text-muted-foreground">
            Comprehensive earnings overview across all fleet owners and drivers
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/master-admin/add-cash-payment")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Cash Payment
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/master-admin/bulk-cash-payment")}
          >
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={handleDownloadReport} disabled={earnings.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{summary.total.toFixed(2)}</div>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Fleet Owner
              </label>
              <Select
                value={selectedFleetOwner}
                onValueChange={setSelectedFleetOwner}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Fleet Owners ({fleetOwners.length})
                  </SelectItem>
                  {fleetOwners.map((owner) => (
                    <SelectItem
                      key={owner.owner_id}
                      value={owner.owner_id.toString()}
                    >
                      {owner.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <Car className="h-4 w-4" />
                Driver
              </label>
              <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All Drivers ({filteredDrivers.length})
                  </SelectItem>
                  {filteredDrivers.map((driver) => (
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
              <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Month
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
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
                    <TableHead>Fleet Owner</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Months</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Razorpay Order</TableHead>
                    <TableHead>Razorpay Payment</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((payment) => (
                    <TableRow key={payment.subscription_payment_id}>
                      <TableCell className="whitespace-nowrap">
                        {payment.transaction_date &&
                          format(
                            new Date(payment.transaction_date),
                            "MMM dd, yyyy"
                          )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {payment.fleet_owner_name}
                          </p>
                          {payment.fleet_owner_email && (
                            <p className="text-xs text-muted-foreground">
                              {payment.fleet_owner_email}
                            </p>
                          )}
                        </div>
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
                        <Badge variant="outline">
                          {payment.months_covered}M
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {payment.discount_applied > 0 && (
                          <>-₹{payment.discount_applied.toFixed(2)}</>
                        )}
                        {payment.discount_applied === 0 && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payment.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">
                        {payment.razorpay_order_id || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[120px] truncate">
                        {payment.razorpay_payment_id || (
                          <span className="text-muted-foreground">-</span>
                        )}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                No earnings data for the selected period
              </p>
              <p className="text-sm mt-2">
                Try selecting a different month or filter combination
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
