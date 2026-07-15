import {
  createDriver,
  deleteDriver,
  getDriverAssignedStudents,
  getDriverById,
  getDriverEarnings,
  getDrivers,
  getDriverStats,
  getSchoolsByIds,
  updateDriver,
  updateDriverStatus,
  type CreateDriverInput,
  type Driver,
  type DriverEarnings,
  type DriverFilter,
  type DriverStats,
  type School,
  type UpdateDriverInput,
} from "@/services/driverService";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";

export const useDrivers = (filters?: DriverFilter) => {
  return useSimpleQuery<Driver[]>(
    () => getDrivers(filters) as Promise<Driver[]>,
    [JSON.stringify(filters)]
  );
};

export const useDriver = (id: string) => {
  return useSimpleQuery<Driver>(
    () => getDriverById(id) as Promise<Driver>,
    [id],
    { enabled: !!id }
  );
};

export const useCreateDriver = () => {
  return useSimpleMutation<Driver, { data: CreateDriverInput; userId?: string }>({
    mutationFn: ({ data, userId }) => createDriver(data, userId) as Promise<Driver>,
  });
};

export const useUpdateDriver = () => {
  return useSimpleMutation<Driver, { id: string; data: UpdateDriverInput }>({
    mutationFn: ({ id, data }) => updateDriver(id, data) as Promise<Driver>,
  });
};

export const useDeleteDriver = () => {
  return useSimpleMutation<void, string>({
    mutationFn: (id) => deleteDriver(id) as Promise<void>,
  });
};

export const useUpdateDriverStatus = () => {
  return useSimpleMutation<Driver, { id: string; is_verified: boolean }>({
    mutationFn: ({ id, is_verified }) =>
      updateDriverStatus(id, is_verified) as Promise<Driver>,
  });
};

export const useDriverEarnings = (driverId: string) => {
  return useSimpleQuery<DriverEarnings>(
    () => getDriverEarnings(driverId),
    [driverId],
    { enabled: !!driverId }
  );
};

export const useDriverStats = (driverId: string) => {
  return useSimpleQuery<DriverStats>(
    () => getDriverStats(driverId),
    [driverId],
    { enabled: !!driverId }
  );
};

export const useDriverAssignedStudents = (driverId: string) => {
  return useSimpleQuery(
    () => getDriverAssignedStudents(driverId),
    [driverId],
    { enabled: !!driverId }
  );
};

export const useDriverSchools = (schoolIds: string[]) => {
  return useSimpleQuery<School[]>(
    () => getSchoolsByIds(schoolIds),
    [JSON.stringify(schoolIds)],
    { enabled: schoolIds.length > 0 }
  );
};
