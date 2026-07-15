import {
  getAllDriverSchoolRoutes,
  getDriverSchoolStudents,
  reorderStudents,
  saveStudentOrdering,
  generateOptimizedPickupOrder,
  generateOptimizedDropOrder,
  type DriverSchoolRoute,
  type DriverSchoolRouteSummary,
} from "@/services/routeOrderingService";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";

export const useDriverSchoolRoutes = () => {
  return useSimpleQuery<DriverSchoolRouteSummary[]>(
    () => getAllDriverSchoolRoutes(),
    []
  );
};

export const useDriverSchoolStudents = (driverId: number, schoolId: number) => {
  return useSimpleQuery<DriverSchoolRoute | null>(
    () => getDriverSchoolStudents(driverId, schoolId),
    [driverId, schoolId],
    { enabled: !!driverId && !!schoolId }
  );
};

export const useSaveStudentOrdering = () => {
  return useSimpleMutation({
    mutationFn: ({
      driverId,
      schoolId,
      students,
      adminUserId,
    }: {
      driverId: number;
      schoolId: number;
      students: Array<{
        student_id: number;
        pickup_order: number;
        drop_order: number;
        is_active?: boolean;
      }>;
      adminUserId: string;
    }) => saveStudentOrdering(driverId, schoolId, students, adminUserId),
  });
};

export const useReorderStudents = () => {
  return useSimpleMutation({
    mutationFn: ({
      driverId,
      schoolId,
      studentIds,
      type,
      adminUserId,
    }: {
      driverId: number;
      schoolId: number;
      studentIds: number[];
      type: "pickup" | "drop";
      adminUserId: string;
    }) => reorderStudents(driverId, schoolId, studentIds, type, adminUserId),
  });
};

export const useOptimizePickupOrder = () => {
  return useSimpleMutation({
    mutationFn: ({
      driverId,
      schoolId,
      startLatitude,
      startLongitude,
    }: {
      driverId: number;
      schoolId: number;
      startLatitude?: number;
      startLongitude?: number;
    }) =>
      generateOptimizedPickupOrder(driverId, schoolId, startLatitude, startLongitude),
  });
};

export const useOptimizeDropOrder = () => {
  return useSimpleMutation({
    mutationFn: ({ driverId, schoolId }: { driverId: number; schoolId: number }) =>
      generateOptimizedDropOrder(driverId, schoolId),
  });
};
