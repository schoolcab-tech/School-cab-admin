import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function PaymentDetail() {
  const { paymentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payment, setPayment] = useState<any>(null);
  const [schoolName, setSchoolName] = useState<string>("");
  useEffect(() => {
    if (!paymentId) return;
    const fetchPayment = async () => {
      try {
        setLoading(true);
        setError(null);
        // 1. Fetch payment with available joins
        const { data: payment, error } = await supabase
          .from("payments")
          .select(
            `
            *,
            drivers(name, phone),
            bookings(
              booking_id,
              student_id,
              students(name, user_id, school_id),
              driver_id,
              school_id
            )
          `
          )
          .eq("payment_id", Number(paymentId))
          .single();

        console.log(payment);

        if (error || !payment) {
          setError(error?.message || "Payment not found");
          setLoading(false);
          return;
        }

        // 2. Determine school_id (from payment or booking/student)
        const schoolId = payment.school_id;

        // 3. Fetch school separately
        const { data: schoolData, error: schoolError } = await supabase
          .from("schools")
          .select("name")
          .eq("school_id", schoolId)
          .single();
        console.log(schoolData);
        setSchoolName(schoolData?.name || "Unknown");

        setPayment({ ...payment, school: schoolData });
        setLoading(false);
      } catch (error) {
        setError("Failed to load payment details");
        setLoading(false);
      }
    };
    fetchPayment();
  }, [paymentId]);
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !payment) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-destructive mb-4">
            {error || "Payment not found"}
          </div>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Extract details
  const payer =
    payment.bookings?.students?.name || payment.user?.email || "Unknown";
  const razorpay_id = payment.transaction_id || "Unknown";
  const driver =
    payment.drivers?.name ||
    payment.bookings?.students?.drivers?.name ||
    "Unknown";
  const school = payment.schools?.name || "Unknown";
  const amount = payment.amount;
  const status = payment.status;
  const paymentType = payment.payment_type;
  const paymentDate = payment.payment_date;
  const paymentMode = payment.payment_mode;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Analytics
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-2">
              <div>
                <span className="font-semibold">Payment ID:</span> #
                {payment.payment_id}
              </div>
              <div>
                <span className="font-semibold">Razorpay ID:</span>{" "}
                {razorpay_id}
              </div>
              <div>
                <span className="font-semibold">Amount:</span> ₹
                {Number(amount).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold">Status:</span>{" "}
                <Badge
                  variant={
                    status === "completed"
                      ? "default"
                      : status === "pending"
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {status}
                </Badge>
              </div>
              <div>
                <span className="font-semibold">Type:</span>{" "}
                <Badge variant="outline">{paymentType}</Badge>
              </div>
              <div>
                <span className="font-semibold">Date:</span>{" "}
                {new Date(paymentDate).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold">Payment Mode:</span>{" "}
                {paymentMode}
              </div>
              <div>
                <span className="font-semibold">Who Paid:</span> {payer}
              </div>
              <div>
                <span className="font-semibold">To Whom (Driver):</span>{" "}
                {driver}
              </div>
              <div>
                <span className="font-semibold">School:</span> {schoolName}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
