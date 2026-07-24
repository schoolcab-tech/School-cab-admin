import {
  getAllDriverDeleteRequests,
  getPendingDriverDeleteRequests,
  getSchoolAdminDriverDeleteRequests,
  createDriverDeleteRequest,
  cancelDriverDeleteRequest,
  rejectDriverDeleteRequest,
  approveAndDeleteDriver,
  type DriverDeleteRequestWithDetails,
} from "@/services/driverDeleteRequestService";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";
import { useAuth } from "@/contexts/auth-context";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

export const useAllDriverDeleteRequests = () => {
  return useSimpleQuery<DriverDeleteRequestWithDetails[]>(
    () => getAllDriverDeleteRequests(),
    []
  );
};

export const usePendingDriverDeleteRequests = () => {
  return useSimpleQuery<DriverDeleteRequestWithDetails[]>(
    () => getPendingDriverDeleteRequests(),
    []
  );
};

export const useMyDriverDeleteRequests = (schoolAdminId?: number | null) => {
  return useSimpleQuery<DriverDeleteRequestWithDetails[]>(
    () =>
      schoolAdminId
        ? getSchoolAdminDriverDeleteRequests(schoolAdminId)
        : Promise.resolve([]),
    [schoolAdminId],
    { enabled: !!schoolAdminId }
  );
};

export const useCreateDriverDeleteRequest = () => {
  const { user } = useAuth();
  return useSimpleMutation({
    mutationFn: (input: {
      schoolAdminId: number;
      schoolId: number;
      driverId: number;
      reason: string;
    }) =>
      createDriverDeleteRequest({
        ...input,
        requestedBy: user!.id,
      }),
  });
};

export const useCancelDriverDeleteRequest = () => {
  return useSimpleMutation({
    mutationFn: (requestId: number) => cancelDriverDeleteRequest(requestId),
  });
};

export const useRejectDriverDeleteRequest = () => {
  const { user } = useAuth();
  return useSimpleMutation({
    mutationFn: ({
      requestId,
      adminNotes,
    }: {
      requestId: number;
      adminNotes?: string;
    }) => rejectDriverDeleteRequest(requestId, user!.id, adminNotes),
  });
};

export const useApproveAndDeleteDriver = () => {
  const { user, userRole } = useAuth();
  return useSimpleMutation({
    mutationFn: ({
      requestId,
      adminNotes,
    }: {
      requestId: number;
      adminNotes?: string;
    }) =>
      approveAndDeleteDriver(
        requestId,
        user!.id,
        userRole as AppRole | undefined,
        adminNotes
      ),
  });
};
