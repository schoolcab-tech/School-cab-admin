import { supabase } from "@/integrations/supabase/client";
import { PostgrestError } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

// Generic hook for fetching data with loading and error states
export function useSupabaseQuery<T>(
  query: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  dependencies: unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await query();
      if (result.error) {
        setError(result.error.message);
      } else {
        setData(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
}

// Dashboard statistics
export function useDashboardStats() {
  return useSupabaseQuery(async () => {
    const [
      { data: drivers, error: driversError },
      { data: students, error: studentsError },
      { data: schools, error: schoolsError },
      { data: todayBookings, error: bookingsError },
      { data: pendingRequests, error: requestsError },
      { data: monthlyRevenue, error: revenueError },
    ] = await Promise.all([
      supabase.from("drivers").select("driver_id").eq("is_verified", true),
      supabase.from("students").select("student_id"),
      supabase.from("schools").select("school_id"),
      supabase
        .from("bookings")
        .select("booking_id")
        .eq("booking_date", new Date().toISOString().split("T")[0]),
      supabase
        .from("booking_requests")
        .select("request_id")
        .eq("status", "pending"),
      supabase
        .from("payments")
        .select("amount")
        .gte(
          "payment_date",
          new Date(
            new Date().getFullYear(),
            new Date().getMonth(),
            1
          ).toISOString()
        ),
    ]);

    if (
      driversError ||
      studentsError ||
      schoolsError ||
      bookingsError ||
      requestsError ||
      revenueError
    ) {
      throw new Error("Failed to fetch dashboard statistics");
    }

    return {
      data: {
        totalDrivers: drivers?.length || 0,
        totalStudents: students?.length || 0,
        totalSchools: schools?.length || 0,
        todayRides: todayBookings?.length || 0,
        pendingApprovals: pendingRequests?.length || 0,
        monthlyRevenue:
          monthlyRevenue?.reduce(
            (sum, payment) => sum + Number(payment.amount),
            0
          ) || 0,
      },
      error: null,
    };
  });
}

// Schools
export function useSchools() {
  return useSupabaseQuery(async () => {
    return await supabase
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false });
  });
}

// Drivers
export function useDrivers() {
  return useSupabaseQuery(async () => {
    return await supabase
      .from("drivers")
      .select("*")
      .order("created_at", { ascending: false });
  });
}

// Students
export function useStudents() {
  return useSupabaseQuery(async () => {
    return await supabase
      .from("students")
      .select(
        `
        *,
        schools(name, address, school_id),
        bookings(
          driver_id,
          drivers(
            driver_id, 
            name, 
            phone, 
            cab_number, 
            vehicle_type
          )
        )
      `
      )
      .order("created_at", { ascending: false });
  });
}

// Booking requests
export function useBookingRequests() {
  return useSupabaseQuery(async () => {
    return await supabase
      .from("booking_requests")
      .select(
        `
        *,
        students(name, pickup_address, drop_address, schools(name))
      `
      )
      .order("created_at", { ascending: false });
  });
}

// Recent activity for dashboard
export function useRecentActivity() {
  return useSupabaseQuery(async () => {
    const [
      { data: recentBookings, error: bookingsError },
      { data: recentRequests, error: requestsError },
    ] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, students(name), drivers(name)")
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("booking_requests")
        .select("*, students(name)")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    if (bookingsError || requestsError) {
      throw new Error("Failed to fetch recent activity");
    }

    const activities = [
      ...(recentBookings || []).map((booking) => ({
        id: `booking-${booking.booking_id}`,
        type: "booking",
        title: `New booking confirmed`,
        description: `${booking.students?.name} booked ride`,
        time: booking.created_at,
        status: booking.status,
      })),
      ...(recentRequests || []).map((request) => ({
        id: `request-${request.request_id}`,
        type: "request",
        title: `New booking request`,
        description: `${request.students?.name} requested ride`,
        time: request.created_at,
        status: request.status,
      })),
    ]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 10);

    return { data: activities, error: null };
  });
}

// Service areas/routes data
export function useServiceAreas() {
  return useSupabaseQuery(async () => {
    return await supabase
      .from("driver_service_areas")
      .select(
        `
        *,
        drivers(name, cab_number, vehicle_type)
      `
      )
      .order("pincode");
  });
}

// Analytics data
export function useAnalytics(dateRange?: { start: string; end: string }) {
  return useSupabaseQuery(
    async () => {
      let query = supabase.from("payments").select("*");

      if (dateRange) {
        query = query
          .gte("payment_date", dateRange.start)
          .lte("payment_date", dateRange.end);
      }

      return await query.order("payment_date", { ascending: false });
    },
    dateRange ? [dateRange.start, dateRange.end] : []
  );
}
