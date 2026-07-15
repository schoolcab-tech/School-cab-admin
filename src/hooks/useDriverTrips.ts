import {
  getDriverTrips,
  getDriverTripStudents,
  getUnassignedStudents,
  createDriverTrip,
  updateDriverTrip,
  deleteDriverTrip,
  assignStudentToTrip,
  removeStudentFromTrip,
  autoAssignStudentsToTrips,
  getDriverCabCapacity,
  optimizeTripRoute,
  reorderTripStudents,
  type DriverTrip,
  type TripStudent,
  type UnassignedStudent,
} from "@/services/driverTripService";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";

export const useDriverTrips = (driverId: number, schoolId: number) => {
  return useSimpleQuery<DriverTrip[]>(
    () => getDriverTrips(driverId, schoolId),
    [driverId, schoolId],
    { enabled: !!driverId && !!schoolId }
  );
};

export const useDriverTripStudents = (driverTripId: number) => {
  return useSimpleQuery<TripStudent[]>(
    () => getDriverTripStudents(driverTripId),
    [driverTripId],
    { enabled: !!driverTripId }
  );
};

export const useUnassignedStudents = (driverId: number, schoolId: number) => {
  return useSimpleQuery<UnassignedStudent[]>(
    () => getUnassignedStudents(driverId, schoolId),
    [driverId, schoolId],
    { enabled: !!driverId && !!schoolId }
  );
};

export const useDriverCabCapacity = (driverId: number) => {
  return useSimpleQuery<number>(
    () => getDriverCabCapacity(driverId),
    [driverId],
    { enabled: !!driverId }
  );
};

export const useCreateDriverTrip = () => {
  return useSimpleMutation({
    mutationFn: ({
      driverId,
      schoolId,
      tripName,
      tripOrder,
    }: {
      driverId: number;
      schoolId: number;
      tripName: string;
      tripOrder: number;
    }) => createDriverTrip(driverId, schoolId, tripName, tripOrder),
  });
};

export const useUpdateDriverTrip = () => {
  return useSimpleMutation({
    mutationFn: ({
      driverTripId,
      updates,
    }: {
      driverTripId: number;
      updates: { trip_name?: string; trip_order?: number };
    }) => updateDriverTrip(driverTripId, updates),
  });
};

export const useDeleteDriverTrip = () => {
  return useSimpleMutation({
    mutationFn: ({ driverTripId }: { driverTripId: number }) =>
      deleteDriverTrip(driverTripId),
  });
};

export const useAssignStudent = () => {
  return useSimpleMutation({
    mutationFn: ({
      driverTripId,
      studentId,
      assignedBy,
    }: {
      driverTripId: number;
      studentId: number;
      assignedBy: string;
    }) => assignStudentToTrip(driverTripId, studentId, assignedBy),
  });
};

export const useRemoveStudent = () => {
  return useSimpleMutation({
    mutationFn: ({
      driverTripId,
      studentId,
    }: {
      driverTripId: number;
      studentId: number;
    }) => removeStudentFromTrip(driverTripId, studentId),
  });
};

export const useReorderTripStudents = () => {
  return useSimpleMutation({
    mutationFn: ({
      driverTripId,
      orderedStudentIds,
      orderType,
    }: {
      driverTripId: number;
      orderedStudentIds: number[];
      orderType?: "pickup" | "drop";
    }) => reorderTripStudents(driverTripId, orderedStudentIds, orderType),
  });
};

export const useOptimizeTripRoute = () => {
  return useSimpleMutation({
    mutationFn: ({
      driverTripId,
      schoolId,
      orderType,
    }: {
      driverTripId: number;
      schoolId: number;
      orderType?: "pickup" | "drop";
    }) => optimizeTripRoute(driverTripId, schoolId, orderType),
  });
};

export const useAutoAssignStudents = () => {
  return useSimpleMutation({
    mutationFn: ({
      driverId,
      schoolId,
      cabCapacity,
      assignedBy,
    }: {
      driverId: number;
      schoolId: number;
      cabCapacity: number;
      assignedBy: string;
    }) => autoAssignStudentsToTrips(driverId, schoolId, cabCapacity, assignedBy),
  });
};
