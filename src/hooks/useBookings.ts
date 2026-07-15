import {
  getBookingsBySchool,
  getBookingSchoolId,
} from "@/services/bookingService";
import { useSimpleQuery } from "./useSimpleQuery";

export const useBookingsBySchool = (schoolId?: number) => {
  return useSimpleQuery(
    () => getBookingsBySchool(schoolId!),
    [schoolId],
    { enabled: schoolId != null }
  );
};

export const useBookingSchoolId = (bookingId?: number) => {
  return useSimpleQuery(
    () => getBookingSchoolId(bookingId!),
    [bookingId],
    { enabled: bookingId != null }
  );
};
