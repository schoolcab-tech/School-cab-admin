export type ShiftLeg = "morning" | "evening";

export interface BookingShiftFields {
  driver_id: number;
  morning_driver_id?: number | null;
  evening_driver_id?: number | null;
}

export function resolveMorningDriverId(booking: BookingShiftFields): number {
  return booking.morning_driver_id ?? booking.driver_id;
}

export function resolveEveningDriverId(booking: BookingShiftFields): number {
  return booking.evening_driver_id ?? booking.driver_id;
}

export function resolveDriverIdForShift(
  booking: BookingShiftFields,
  shift: ShiftLeg
): number {
  return shift === "morning"
    ? resolveMorningDriverId(booking)
    : resolveEveningDriverId(booking);
}

/** PostgREST `.or()` filter: bookings whose morning driver is `driverId`. */
export function morningDriverBookingOrFilter(driverId: number): string {
  return `morning_driver_id.eq.${driverId},and(morning_driver_id.is.null,driver_id.eq.${driverId})`;
}

/** PostgREST `.or()` filter: bookings whose evening driver is `driverId`. */
export function eveningDriverBookingOrFilter(driverId: number): string {
  return `evening_driver_id.eq.${driverId},and(evening_driver_id.is.null,driver_id.eq.${driverId})`;
}

export function bookingMatchesShiftDriver(
  booking: BookingShiftFields,
  driverId: number,
  shift: ShiftLeg
): boolean {
  return resolveDriverIdForShift(booking, shift) === driverId;
}
