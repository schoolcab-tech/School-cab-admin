import {
  getAllTripSchedules,
  getDriversForSchedule,
  getSchoolsByIds,
  upsertTripSchedule,
  deleteTripSchedule,
  activateTripSchedule,
  getTodayAlerts,
  getAlertsByDate,
  getDriverAlertHistory,
  updateAlertStatus,
  type TripSchedule,
  type TripStartAlert,
  type UpsertScheduleInput,
} from "@/services/tripScheduleService";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";

export const useTripSchedules = () => {
  return useSimpleQuery<TripSchedule[]>(
    () => getAllTripSchedules(),
    []
  );
};

export const useDriversForSchedule = () => {
  return useSimpleQuery(
    () => getDriversForSchedule(),
    []
  );
};

export const useSchoolsByIds = (schoolIds: number[]) => {
  return useSimpleQuery(
    () => getSchoolsByIds(schoolIds),
    [JSON.stringify(schoolIds)],
    { enabled: schoolIds.length > 0 }
  );
};

export const useUpsertTripSchedule = () => {
  return useSimpleMutation({
    mutationFn: ({
      input,
      adminUserId,
    }: {
      input: UpsertScheduleInput;
      adminUserId: string;
    }) => upsertTripSchedule(input, adminUserId),
  });
};

export const useDeleteTripSchedule = () => {
  return useSimpleMutation({
    mutationFn: ({
      driverId,
      schoolId,
    }: {
      driverId: number;
      schoolId: number;
    }) => deleteTripSchedule(driverId, schoolId),
  });
};

export const useActivateTripSchedule = () => {
  return useSimpleMutation({
    mutationFn: ({
      driverId,
      schoolId,
    }: {
      driverId: number;
      schoolId: number;
    }) => activateTripSchedule(driverId, schoolId),
  });
};

export const useTodayAlerts = () => {
  return useSimpleQuery<TripStartAlert[]>(
    () => getTodayAlerts(),
    [],
    { refetchInterval: 30000 }
  );
};

export const useAlertsByDate = (date: string) => {
  return useSimpleQuery<TripStartAlert[]>(
    () => getAlertsByDate(date),
    [date],
    { enabled: !!date }
  );
};

export const useDriverAlertHistory = (driverId: number) => {
  return useSimpleQuery<TripStartAlert[]>(
    () => getDriverAlertHistory(driverId),
    [driverId],
    { enabled: !!driverId }
  );
};

export const useUpdateAlertStatus = () => {
  return useSimpleMutation({
    mutationFn: ({
      alertId,
      status,
      userId,
      notes,
    }: {
      alertId: number;
      status: "acknowledged" | "resolved";
      userId: string;
      notes?: string;
    }) => updateAlertStatus(alertId, status, userId, notes),
  });
};
