import {
  getDriverHiringCalls,
  softDeleteDriverHiringCall,
  updateDriverHiringVisitStatus,
  type DriverHiringCall,
  type DriverHiringVisitStatus,
} from "@/services/driverHiringLeadsService";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";

export const useDriverHiringCalls = () => {
  return useSimpleQuery<DriverHiringCall[]>(
    () => getDriverHiringCalls(),
    []
  );
};

export const useUpdateDriverHiringVisitStatus = () => {
  return useSimpleMutation<
    void,
    { id: string; visitStatus: DriverHiringVisitStatus }
  >({
    mutationFn: ({ id, visitStatus }) =>
      updateDriverHiringVisitStatus(id, visitStatus) as Promise<void>,
  });
};

export const useDeleteDriverHiringCall = () => {
  return useSimpleMutation<void, string>({
    mutationFn: (id) => softDeleteDriverHiringCall(id) as Promise<void>,
  });
};
