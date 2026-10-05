import { supabase } from "@/integrations/supabase/client";
import type { ShiftLeg } from "@/utils/bookingShiftUtils";
import {
  resolveEveningDriverId,
  resolveMorningDriverId,
  type BookingShiftFields,
} from "@/utils/bookingShiftUtils";

export type ServiceShift = "morning" | "evening" | null;

type TripRow = {
  driver_trip_id: number;
  driver_id: number;
  school_id: number;
  service_shift: ServiceShift;
  trip_name: string;
  is_active: boolean;
};

type TripAssignment = {
  student_id: number;
  driver_trip_id: number;
  driver_trips: TripRow;
};

function tripAppliesToLeg(trip: TripRow, leg: ShiftLeg): boolean {
  if (!trip.is_active) return false;
  if (trip.service_shift == null) return true;
  return trip.service_shift === leg;
}

function pickDriverForLeg(
  assignments: TripAssignment[],
  leg: ShiftLeg
): number | null {
  const applicable = assignments.filter((a) =>
    tripAppliesToLeg(a.driver_trips, leg)
  );
  if (applicable.length === 0) return null;

  const specific = applicable.find(
    (a) => a.driver_trips.service_shift === leg
  );
  if (specific) return specific.driver_trips.driver_id;

  const legacy = applicable.find((a) => a.driver_trips.service_shift == null);
  return legacy?.driver_trips.driver_id ?? applicable[0].driver_trips.driver_id;
}

/**
 * Resolve morning/evening driver from active trip assignments, then booking columns.
 */
export async function resolveShiftDriversForStudent(
  studentId: number,
  schoolId: number,
  booking?: BookingShiftFields | null
): Promise<{ morningDriverId: number; eveningDriverId: number }> {
  const db = supabase as any;
  const { data: rows } = await db
    .from("driver_trip_students")
    .select(
      `
      student_id,
      driver_trip_id,
      driver_trips!inner (
        driver_trip_id,
        driver_id,
        school_id,
        service_shift,
        trip_name,
        is_active
      )
    `
    )
    .eq("student_id", studentId)
    .eq("is_active", true);

  const assignments = (rows || []).filter(
    (r: TripAssignment) => r.driver_trips?.school_id === schoolId
  ) as TripAssignment[];

  const fromMorning = pickDriverForLeg(assignments, "morning");
  const fromEvening = pickDriverForLeg(assignments, "evening");

  const billed = booking?.driver_id;
  const fallbackMorning = booking ? resolveMorningDriverId(booking) : billed;
  const fallbackEvening = booking ? resolveEveningDriverId(booking) : billed;

  return {
    morningDriverId: fromMorning ?? fallbackMorning ?? 0,
    eveningDriverId: fromEvening ?? fallbackEvening ?? 0,
  };
}

/** Student IDs whose resolved morning driver is `driverId` at `schoolId`. */
export async function getStudentIdsForDriverShift(
  driverId: number,
  schoolId: number,
  leg: ShiftLeg
): Promise<number[]> {
  const db = supabase as any;
  const shiftFilter =
    leg === "morning"
      ? "service_shift.is.null,service_shift.eq.morning"
      : "service_shift.is.null,service_shift.eq.evening";

  const { data: tripRows, error } = await db
    .from("driver_trips")
    .select("driver_trip_id")
    .eq("driver_id", driverId)
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .or(shiftFilter);

  if (error) throw error;
  const tripIds = (tripRows || []).map((t: { driver_trip_id: number }) => t.driver_trip_id);
  if (tripIds.length === 0) return [];

  const { data: sts, error: stErr } = await db
    .from("driver_trip_students")
    .select("student_id")
    .in("driver_trip_id", tripIds)
    .eq("is_active", true);

  if (stErr) throw stErr;
  return [...new Set((sts || []).map((s: { student_id: number }) => s.student_id))];
}

/** Bookings on this driver's shift roster: trip assignments first, else booking columns. */
export async function bookingStudentIdsForDriverShift(
  driverId: number,
  schoolId: number,
  leg: ShiftLeg
): Promise<number[] | null> {
  const fromTrips = await getStudentIdsForDriverShift(driverId, schoolId, leg);
  if (fromTrips.length > 0) return fromTrips;
  return null;
}

/** Move a route/trip to another driver (students stay on the trip). */
export async function reassignTripDriver(
  driverTripId: number,
  newDriverId: number
): Promise<void> {
  const db = supabase as any;
  const { error } = await db
    .from("driver_trips")
    .update({
      driver_id: newDriverId,
      updated_at: new Date().toISOString(),
    })
    .eq("driver_trip_id", driverTripId);

  if (error) throw error;
}

/** Remove student from other trips of the same school + service_shift when assigning. */
export async function deactivateConflictingTripAssignments(
  studentId: number,
  schoolId: number,
  targetTripId: number,
  serviceShift: ServiceShift
): Promise<void> {
  const db = supabase as any;
  const { data: existing } = await db
    .from("driver_trip_students")
    .select(
      `driver_trip_student_id, driver_trip_id, driver_trips!inner (school_id, service_shift, is_active)`
    )
    .eq("student_id", studentId)
    .eq("is_active", true);

  const toDeactivate = (existing || []).filter(
    (r: {
      driver_trip_id: number;
      driver_trips: { school_id: number; service_shift: ServiceShift; is_active: boolean };
    }) => {
      if (r.driver_trip_id === targetTripId) return false;
      const t = r.driver_trips;
      if (!t?.is_active || t.school_id !== schoolId) return false;
      if (serviceShift == null && t.service_shift == null) return true;
      if (serviceShift != null && t.service_shift === serviceShift) return true;
      return false;
    }
  );

  if (toDeactivate.length === 0) return;

  await db
    .from("driver_trip_students")
    .update({ is_active: false })
    .in(
      "driver_trip_student_id",
      toDeactivate.map(
        (r: { driver_trip_student_id: number }) => r.driver_trip_student_id
      )
    );
}
