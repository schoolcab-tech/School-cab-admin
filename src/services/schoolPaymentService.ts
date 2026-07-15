import { supabase } from "@/integrations/supabase/client";

export type SchoolPaymentRecord = {
  subscription_payment_id: number;
  amount: number;
  months_covered: number;
  discount_applied: number;
  transaction_date: string;
  transaction_status: string;
  payment_method: string;
  coupon_code: string | null;
  student_name: string;
  driver_name: string;
  driver_cab_number: string;
  cycle_start_date: string;
  cycle_end_date: string;
};

export type SchoolPaymentFilters = {
  month?: string;
  status?: string;
};

export async function getSchoolSubscriptionPayments(
  schoolId: number,
  filters: SchoolPaymentFilters = {}
): Promise<SchoolPaymentRecord[]> {
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
            school_id
          )
        )
      )
    `
    )
    .eq("subscription_cycles.bookings.students.school_id", schoolId)
    .order("transaction_date", { ascending: false });

  if (filters.month && filters.month !== "all") {
    const monthDate = new Date(filters.month + "-01");
    const monthStart = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth(),
      1
    )
      .toISOString()
      .split("T")[0];
    const monthEnd = new Date(
      monthDate.getFullYear(),
      monthDate.getMonth() + 1,
      0
    )
      .toISOString()
      .split("T")[0];
    query = query
      .gte("transaction_date", monthStart)
      .lte("transaction_date", monthEnd + "T23:59:59");
  }

  if (filters.status && filters.status !== "all") {
    query = query.eq("transaction_status", filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    subscription_payment_id: row.subscription_payment_id,
    amount: row.amount,
    months_covered: row.months_covered,
    discount_applied: row.discount_applied,
    transaction_date: row.transaction_date,
    transaction_status: row.transaction_status,
    payment_method: row.payment_method,
    coupon_code: row.coupon_code,
    student_name:
      row.subscription_cycles?.bookings?.students?.name || "Unknown",
    driver_name: row.drivers?.name || "Unknown",
    driver_cab_number: row.drivers?.cab_number || "—",
    cycle_start_date: row.subscription_cycles?.cycle_start_date || "",
    cycle_end_date: row.subscription_cycles?.cycle_end_date || "",
  }));
}
