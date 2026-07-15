import { useAuth } from "@/contexts/auth-context";
import {
  getAllAssignmentRequests,
  getPendingAssignmentRequests,
  getOwnerAssignmentRequests,
  createAssignmentRequest,
  approveAssignmentRequest,
  rejectAssignmentRequest,
  cancelAssignmentRequest,
  getAvailableDrivers,
  type CreateAssignmentRequestInput,
} from "@/services/driverAssignmentRequestService";
import { createAuditLog } from "@/services/auditLogService";
import { toast } from "sonner";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";

export const useAllAssignmentRequests = () => {
  const { isMasterAdmin } = useAuth();

  return useSimpleQuery(
    () => getAllAssignmentRequests(),
    [],
    { enabled: isMasterAdmin }
  );
};

export const usePendingAssignmentRequests = () => {
  const { isMasterAdmin } = useAuth();

  return useSimpleQuery(
    () => getPendingAssignmentRequests(),
    [],
    { enabled: isMasterAdmin }
  );
};

export const useMyAssignmentRequests = (ownerId?: number) => {
  const { isSubAdmin } = useAuth();

  return useSimpleQuery(
    () => getOwnerAssignmentRequests(ownerId!),
    [ownerId],
    { enabled: isSubAdmin && !!ownerId }
  );
};

export const useAvailableDrivers = () => {
  return useSimpleQuery(
    () => getAvailableDrivers(),
    []
  );
};

export const useCreateAssignmentRequest = () => {
  return useSimpleMutation({
    mutationFn: ({ ownerId, input }: { ownerId: number; input: CreateAssignmentRequestInput }) =>
      createAssignmentRequest(ownerId, input),
    onSuccess: () => {
      toast.success("Assignment request submitted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to submit request");
    },
  });
};

export const useApproveAssignmentRequest = () => {
  const { user, userRole } = useAuth();

  return useSimpleMutation({
    mutationFn: ({
      requestId,
      adminNotes,
      selectedDriverId,
    }: {
      requestId: number;
      adminNotes?: string;
      selectedDriverId?: number | null;
    }) =>
      approveAssignmentRequest(requestId, user!.id, adminNotes, selectedDriverId),
    onSuccess: async (_, { requestId }) => {
      if (user && userRole) {
        await createAuditLog(
          user.id,
          userRole,
          "approve_assignment_request",
          "driver_assignment_request",
          requestId,
          { status: "pending" },
          { status: "approved" },
          "Approved driver assignment request"
        );
      }
      toast.success("Request approved successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to approve request");
    },
  });
};

export const useRejectAssignmentRequest = () => {
  const { user, userRole } = useAuth();

  return useSimpleMutation({
    mutationFn: ({ requestId, adminNotes }: { requestId: number; adminNotes: string }) =>
      rejectAssignmentRequest(requestId, user!.id, adminNotes),
    onSuccess: async (_, { requestId }) => {
      if (user && userRole) {
        await createAuditLog(
          user.id,
          userRole,
          "reject_assignment_request",
          "driver_assignment_request",
          requestId,
          { status: "pending" },
          { status: "rejected" },
          "Rejected driver assignment request"
        );
      }
      toast.success("Request rejected");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to reject request");
    },
  });
};

export const useCancelAssignmentRequest = () => {
  return useSimpleMutation({
    mutationFn: (requestId: number) => cancelAssignmentRequest(requestId),
    onSuccess: () => {
      toast.success("Request cancelled");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to cancel request");
    },
  });
};
