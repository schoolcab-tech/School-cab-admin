import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { DollarSign, Loader2, CheckCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format, addMonths } from "date-fns";

type Student = {
  student_id: number;
  name: string;
  school_id: number;
  school_name: string;
  pickup_address: string;
  pickup_pincode: string;
  drop_address: string;
  drop_pincode: string;
  user_id: string;
};

type Driver = {
  driver_id: number;
  name: string;
  cab_number: string;
  phone: string;
};

export default function AddCashPaymentPage() {
  return (
    <DashboardLayout>
      <AddCashPaymentContent />
    </DashboardLayout>
  );
}

function AddCashPaymentContent() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  // Form state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [bookingType, setBookingType] = useState<string>("monthly");
  const [monthlyFare, setMonthlyFare] = useState<string>("");
  const [monthsCovered, setMonthsCovered] = useState<string>("1");
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [pickupTime, setPickupTime] = useState<string>("08:00");
  const [dropTime, setDropTime] = useState<string>("14:00");
  const [couponCode, setCouponCode] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("0");
  const [notes, setNotes] = useState<string>("");

  // Load students and drivers
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Fetch students with school info
        const { data: studentsData, error: studentsError } = await supabase
          .from("students")
          .select(
            `
            student_id,
            name,
            school_id,
            pickup_address,
            pickup_pincode,
            drop_address,
            drop_pincode,
            user_id,
            schools!inner(
              name
            )
          `
          )
          .order("name");

        if (studentsError) throw studentsError;

        const formattedStudents: Student[] = (studentsData || []).map(
          (s: any) => ({
            student_id: s.student_id,
            name: s.name,
            school_id: s.school_id,
            school_name: s.schools?.name || "Unknown",
            pickup_address: s.pickup_address,
            pickup_pincode: s.pickup_pincode,
            drop_address: s.drop_address,
            drop_pincode: s.drop_pincode,
            user_id: s.user_id,
          })
        );

        setStudents(formattedStudents);

        // Fetch drivers
        const { data: driversData, error: driversError } = await supabase
          .from("drivers")
          .select("driver_id, name, cab_number, phone")
          .order("name");

        if (driversError) throw driversError;
        setDrivers(driversData || []);
      } catch (error: any) {
        toast.error("Failed to load data: " + error.message);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const calculateTotalAmount = () => {
    const fare = parseFloat(monthlyFare || "0");
    const months = parseInt(monthsCovered);
    const discount = parseFloat(discountAmount || "0");
    const total = fare * months;
    return {
      totalAmount: total,
      finalAmount: total - discount,
      discountAmount: discount,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStudent) {
      toast.error("Please select a student");
      return;
    }

    if (!selectedDriverId) {
      toast.error("Please select a driver");
      return;
    }

    if (!monthlyFare || parseFloat(monthlyFare) <= 0) {
      toast.error("Please enter a valid monthly fare");
      return;
    }

    const { totalAmount, finalAmount, discountAmount: discount } =
      calculateTotalAmount();

    if (finalAmount <= 0) {
      toast.error("Final amount must be greater than zero");
      return;
    }

    setLoading(true);

    try {
      const driverId = parseInt(selectedDriverId);
      const months = parseInt(monthsCovered);
      const cycleStartDate = new Date(startDate);
      const cycleEndDate = addMonths(cycleStartDate, months);

      // Step 1: Create or get existing booking
      const { data: existingBooking } = await supabase
        .from("bookings")
        .select("booking_id")
        .eq("student_id", selectedStudent.student_id)
        .eq("driver_id", driverId)
        .eq("status", "confirmed")
        .maybeSingle();

      let bookingId: number;

      if (existingBooking) {
        bookingId = existingBooking.booking_id;
      } else {
        // Create new booking
        const { data: newBooking, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            user_id: selectedStudent.user_id,
            student_id: selectedStudent.student_id,
            driver_id: driverId,
            school_id: selectedStudent.school_id,
            booking_type: bookingType,
            fare: parseFloat(monthlyFare),
            status: "confirmed",
            booking_date: startDate,
            pickup_address: selectedStudent.pickup_address,
            drop_address: selectedStudent.drop_address,
            pickup_pincode: selectedStudent.pickup_pincode,
            drop_pincode: selectedStudent.drop_pincode,
            pickup_time: pickupTime,
            drop_time: dropTime,
            subscription_model: "cycle",
            duration_start_date: startDate,
            duration_end_date: format(cycleEndDate, "yyyy-MM-dd"),
          })
          .select("booking_id")
          .single();

        if (bookingError) throw bookingError;
        bookingId = newBooking.booking_id;
      }

      // Step 2: Wait for trigger to create cycle, then update it
      // The trigger auto_create_subscription_cycle() creates a pending cycle automatically
      // We just need to wait a moment and then update it to paid

      await new Promise((resolve) => setTimeout(resolve, 200)); // Wait 200ms for trigger

      const { data: triggerCreatedCycle, error: cycleError } = await supabase
        .from("subscription_cycles")
        .select("cycle_id")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (cycleError) throw cycleError;

      // Update the trigger-created cycle with our payment details
      const { data: updatedCycle, error: updateError } = await supabase
        .from("subscription_cycles")
        .update({
          cycle_start_date: format(cycleStartDate, "yyyy-MM-dd"),
          cycle_end_date: format(cycleEndDate, "yyyy-MM-dd"),
          monthly_fare: parseFloat(monthlyFare),
          months_paid: months,
          total_amount: totalAmount,
          discount_amount: discount,
          final_amount: finalAmount,
          payment_status: "paid",
        })
        .eq("cycle_id", triggerCreatedCycle.cycle_id)
        .select("cycle_id")
        .single();

      if (updateError) throw updateError;
      const cycleId = updatedCycle.cycle_id;

      // Step 3: Create subscription payment (only if doesn't exist)
      const { data: existingPayment } = await supabase
        .from("subscription_payments")
        .select("subscription_payment_id")
        .eq("cycle_id", cycleId)
        .eq("transaction_status", "completed")
        .maybeSingle();

      if (!existingPayment) {
        const { error: paymentError } = await supabase
          .from("subscription_payments")
          .insert({
            cycle_id: cycleId,
            booking_id: bookingId,
            user_id: selectedStudent.user_id,
            driver_id: driverId,
            amount: finalAmount,
            months_covered: months,
            discount_applied: discount,
            coupon_code: couponCode || null,
            payment_method: "cash",
            transaction_status: "completed",
            transaction_date: new Date().toISOString(),
          });

        if (paymentError) throw paymentError;
      }

      // Step 4: Update booking with last cycle end date
      await supabase
        .from("bookings")
        .update({
          last_cycle_end_date: format(cycleEndDate, "yyyy-MM-dd"),
        })
        .eq("booking_id", bookingId);

      toast.success("Cash payment recorded successfully!");

      // Reset form
      setSelectedStudent(null);
      setSelectedDriverId("");
      setMonthlyFare("");
      setMonthsCovered("1");
      setStartDate(new Date().toISOString().split("T")[0]);
      setPickupTime("08:00");
      setDropTime("14:00");
      setCouponCode("");
      setDiscountAmount("0");
      setNotes("");
      setStudentSearch("");

      // Navigate to earnings page after 2 seconds
      setTimeout(() => {
        navigate("/master-admin/earnings");
      }, 2000);
    } catch (error: any) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.school_name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { totalAmount, finalAmount } = calculateTotalAmount();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="h-8 w-8" />
          Add Cash Payment
        </h1>
        <p className="text-muted-foreground">
          Record offline cash payments from students
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Student Selection */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Select Student
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="studentSearch">Search Student</Label>
                <Input
                  id="studentSearch"
                  placeholder="Search by student name or school..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="mt-1"
                />
              </div>

              {studentSearch && filteredStudents.length > 0 && (
                <div className="border rounded-md max-h-60 overflow-y-auto">
                  {filteredStudents.slice(0, 10).map((student) => (
                    <div
                      key={student.student_id}
                      onClick={() => {
                        setSelectedStudent(student);
                        setStudentSearch(student.name);
                      }}
                      className={`p-3 cursor-pointer hover:bg-accent border-b last:border-b-0 ${
                        selectedStudent?.student_id === student.student_id
                          ? "bg-accent"
                          : ""
                      }`}
                    >
                      <div className="font-medium">{student.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {student.school_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {student.pickup_address}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedStudent && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                    <CheckCircle className="h-4 w-4" />
                    Selected Student
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedStudent.name}
                    </div>
                    <div>
                      <span className="font-medium">School:</span>{" "}
                      {selectedStudent.school_name}
                    </div>
                    <div>
                      <span className="font-medium">Pickup:</span>{" "}
                      {selectedStudent.pickup_address}
                    </div>
                    <div>
                      <span className="font-medium">Drop:</span>{" "}
                      {selectedStudent.drop_address}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Booking Details */}
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="driver">Driver *</Label>
                <Select
                  value={selectedDriverId}
                  onValueChange={setSelectedDriverId}
                  required
                >
                  <SelectTrigger id="driver" className="mt-1">
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((driver) => (
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
                <Label htmlFor="bookingType">Booking Type</Label>
                <Select value={bookingType} onValueChange={setBookingType}>
                  <SelectTrigger id="bookingType" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="one_way">One Way</SelectItem>
                    <SelectItem value="round_trip">Round Trip</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="pickupTime">Pickup Time *</Label>
                <Input
                  id="pickupTime"
                  type="time"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="dropTime">Drop Time *</Label>
                <Input
                  id="dropTime"
                  type="time"
                  value={dropTime}
                  onChange={(e) => setDropTime(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="monthlyFare">Monthly Fare (₹) *</Label>
                <Input
                  id="monthlyFare"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1200.00"
                  value={monthlyFare}
                  onChange={(e) => setMonthlyFare(e.target.value)}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="monthsCovered">Months Covered *</Label>
                <Select
                  value={monthsCovered}
                  onValueChange={setMonthsCovered}
                  required
                >
                  <SelectTrigger id="monthsCovered" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Month</SelectItem>
                    <SelectItem value="3">3 Months</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="12">12 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="couponCode">Coupon Code (Optional)</Label>
                <Input
                  id="couponCode"
                  placeholder="DISCOUNT10"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="discountAmount">Discount Amount (₹)</Label>
                <Input
                  id="discountAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Monthly Fare:</span>
                  <span>₹{parseFloat(monthlyFare || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Months:</span>
                  <span>{monthsCovered}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                {parseFloat(discountAmount || "0") > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount:</span>
                    <span>-₹{parseFloat(discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total Amount (Cash):</span>
                  <span>₹{finalAmount.toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Cycle Period: {format(new Date(startDate), "MMM dd, yyyy")} -{" "}
                  {format(
                    addMonths(new Date(startDate), parseInt(monthsCovered)),
                    "MMM dd, yyyy"
                  )}
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  placeholder="Additional payment notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/master-admin/earnings")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !selectedStudent}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording Payment...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Record Cash Payment
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
