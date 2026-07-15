import { supabase } from "@/integrations/supabase/client";

export interface BookingListItem {
  booking_id: number;
  student_id: number;
  student_name: string;
  driver_id: number;
  driver_name: string;
  school_id: number;
  status: string;
  booking_type: string;
  created_at: string;
  updated_at: string;
}

export async function getBookingsBySchool(
  schoolId: number
): Promise<BookingListItem[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      booking_id,
      student_id,
      driver_id,
      school_id,
      status,
      booking_type,
      created_at,
      updated_at,
      students!inner(name),
      drivers!inner(name)
    `
    )
    .eq("school_id", schoolId)
    .order("updated_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((row: any) => ({
    booking_id: row.booking_id,
    student_id: row.student_id,
    student_name: row.students?.name || "Unknown",
    driver_id: row.driver_id,
    driver_name: row.drivers?.name || "Unknown",
    school_id: row.school_id,
    status: row.status,
    booking_type: row.booking_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));
}

export async function getBookingSchoolId(
  bookingId: number
): Promise<number | null> {
  const { data, error } = await supabase
    .from("bookings")
    .select("school_id")
    .eq("booking_id", bookingId)
    .single();

  if (error) return null;
  return data?.school_id ?? null;
}
