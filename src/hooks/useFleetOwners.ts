import { useAuth } from "@/contexts/auth-context";
import {
  getAllFleetOwners,
  getFleetOwnerById,
  getFleetOwnerByUserId,
  createFleetOwner,
  updateFleetOwner,
  suspendFleetOwner,
  activateFleetOwner,
  verifyFleetOwner,
  deleteFleetOwner,
  type FleetOwnerWithStats,
  type CreateFleetOwnerInput,
  type UpdateFleetOwnerInput,
} from "@/services/fleetOwnerService";
import { createAuditLog } from "@/services/auditLogService";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";

export const useFleetOwners = () => {
  const { isMasterAdmin } = useAuth();

  return useSimpleQuery<FleetOwnerWithStats[]>(
    () => getAllFleetOwners(),
    [],
    { enabled: isMasterAdmin }
  );
};

export const useFleetOwner = (ownerId: number) => {
  return useSimpleQuery(
    () => getFleetOwnerById(ownerId),
    [ownerId],
    { enabled: !!ownerId }
  );
};

export const useMyFleetOwner = () => {
  const { user, isSubAdmin } = useAuth();

  return useSimpleQuery(
    () => getFleetOwnerByUserId(user!.id),
    [user?.id],
    { enabled: isSubAdmin && !!user }
  );
};

export const useCreateFleetOwner = () => {
  const { user, userRole } = useAuth();

  return useSimpleMutation({
    mutationFn: (data: CreateFleetOwnerInput) =>
      createFleetOwner(data, user!.id),
    onSuccess: async (newOwner) => {
      if (user && userRole) {
        await createAuditLog(
          user.id,
          userRole,
          "create_sub_admin",
          "fleet_owner",
          newOwner.owner_id,
          null,
          {
            company_name: newOwner.company_name,
            contact_person: newOwner.contact_person,
            email: newOwner.email,
            phone: newOwner.phone,
          },
          "Created new fleet owner"
        );
      }
    },
  });
};

export const useUpdateFleetOwner = () => {
  const { user, userRole } = useAuth();

  return useSimpleMutation({
    mutationFn: ({
      ownerId,
      data,
    }: {
      ownerId: number;
      data: UpdateFleetOwnerInput;
      oldData?: any;
    }) => updateFleetOwner(ownerId, data),
    onSuccess: async (updatedOwner, { ownerId, oldData }) => {
      if (user && userRole) {
        await createAuditLog(
          user.id,
          userRole,
          "edit_sub_admin",
          "fleet_owner",
          ownerId,
          oldData,
          {
            company_name: updatedOwner.company_name,
            contact_person: updatedOwner.contact_person,
            phone: updatedOwner.phone,
          },
          "Updated fleet owner details"
        );
      }
    },
  });
};

export const useSuspendFleetOwner = () => {
  const { user, userRole } = useAuth();

  return useSimpleMutation({
    mutationFn: (ownerId: number) => suspendFleetOwner(ownerId),
    onSuccess: async (_, ownerId) => {
      if (user && userRole) {
        await createAuditLog(
          user.id,
          userRole,
          "suspend_sub_admin",
          "fleet_owner",
          ownerId,
          { is_active: true },
          { is_active: false },
          "Suspended fleet owner"
        );
      }
    },
  });
};

export const useActivateFleetOwner = () => {
  const { user, userRole } = useAuth();

  return useSimpleMutation({
    mutationFn: (ownerId: number) => activateFleetOwner(ownerId),
    onSuccess: async (_, ownerId) => {
      if (user && userRole) {
        await createAuditLog(
          user.id,
          userRole,
          "activate_sub_admin",
          "fleet_owner",
          ownerId,
          { is_active: false },
          { is_active: true },
          "Activated fleet owner"
        );
      }
    },
  });
};

export const useVerifyFleetOwner = () => {
  const { user, userRole } = useAuth();

  return useSimpleMutation({
    mutationFn: (ownerId: number) => verifyFleetOwner(ownerId, user!.id),
    onSuccess: async (_, ownerId) => {
      if (user && userRole) {
        await createAuditLog(
          user.id,
          userRole,
          "verify_sub_admin",
          "fleet_owner",
          ownerId,
          { verified_at: null },
          { verified_at: new Date().toISOString() },
          "Verified fleet owner"
        );
      }
    },
  });
};

export const useDeleteFleetOwner = () => {
  const { user } = useAuth();

  return useSimpleMutation({
    mutationFn: ({ ownerId }: { ownerId: number }) =>
      deleteFleetOwner(ownerId, user?.id),
  });
};
