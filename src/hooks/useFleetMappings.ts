import { useAuth } from "@/contexts/auth-context";
import {
  getDriversByOwnerId,
  getAllDriverMappings,
  getUnassignedDrivers,
  assignDriverToOwner,
  unassignDriverFromOwner,
  getMappingHistory,
  reassignDriver,
  bulkAssignDrivers,
  type DriverWithMapping,
  type MappingHistory,
} from "@/services/fleetMappingService";
import { createAuditLog } from "@/services/auditLogService";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";

export const useOwnerDrivers = (ownerId?: number) => {
  return useSimpleQuery<DriverWithMapping[]>(
    () => getDriversByOwnerId(ownerId!),
    [ownerId],
    { enabled: !!ownerId }
  );
};

export const useAllDriverMappings = () => {
  const { isMasterAdmin } = useAuth();

  return useSimpleQuery<DriverWithMapping[]>(
    () => getAllDriverMappings(),
    [],
    { enabled: isMasterAdmin }
  );
};

export const useUnassignedDrivers = () => {
  const { isMasterAdmin } = useAuth();

  return useSimpleQuery<DriverWithMapping[]>(
    () => getUnassignedDrivers(),
    [],
    { enabled: isMasterAdmin }
  );
};

export const useMappingHistory = (driverId: number) => {
  return useSimpleQuery<MappingHistory[]>(
    () => getMappingHistory(driverId),
    [driverId],
    { enabled: !!driverId }
  );
};

export const useAssignDriver = () => {
  const { user, userRole } = useAuth();

  return useSimpleMutation({
    mutationFn: ({
      driverId,
      ownerId,
      notes,
    }: {
      driverId: number;
      ownerId: number;
      notes?: string;
    }) => assignDriverToOwner(driverId, ownerId, user!.id, notes),
    onSuccess: async (mapping, { driverId, ownerId }) => {
      if (user && userRole) {
        await createAuditLog(
          user.id,
          userRole,
          "map_cab",
          "fleet_mapping",
          mapping.mapping_id,
          null,
          {
            driver_id: driverId,
            owner_id: ownerId,
            assigned_at: mapping.assigned_at,
          },
          "Assigned driver to fleet owner"
        );
      }
    },
  });
};

export const useUnassignDriver = () => {
  const { user, userRole } = useAuth();

  return useSimpleMutation({
    mutationFn: ({
      mappingId,
      driverId,
      ownerId,
      notes,
    }: {
      mappingId: number;
      driverId: number;
      ownerId: number;
      notes?: string;
    }) => unassignDriverFromOwner(mappingId, user!.id, notes),
    onSuccess: async (mapping, { driverId, ownerId, mappingId }) => {
      if (user && userRole) {
        await createAuditLog(
          user.id,
          userRole,
          "unmap_cab",
          "fleet_mapping",
          mappingId,
          {
            driver_id: driverId,
            owner_id: ownerId,
            is_active: true,
          },
          {
            driver_id: driverId,
            owner_id: ownerId,
            is_active: false,
            unassigned_at: mapping.unassigned_at,
          },
          "Unassigned driver from fleet owner"
        );
      }
    },
  });
};

export const useReassignDriver = () => {
  const { user, userRole } = useAuth();

  return useSimpleMutation({
    mutationFn: ({
      driverId,
      newOwnerId,
      oldOwnerId,
      notes,
    }: {
      driverId: number;
      newOwnerId: number;
      oldOwnerId: number;
      notes?: string;
    }) => reassignDriver(driverId, newOwnerId, user!.id, notes),
    onSuccess: async (mapping, { driverId, newOwnerId, oldOwnerId }) => {
      if (user && userRole) {
        await createAuditLog(
          user.id,
          userRole,
          "reassign_cab",
          "fleet_mapping",
          mapping.mapping_id,
          { owner_id: oldOwnerId },
          { owner_id: newOwnerId },
          `Reassigned driver from owner ${oldOwnerId} to owner ${newOwnerId}`
        );
      }
    },
  });
};

export const useBulkAssignDrivers = () => {
  const { user, userRole } = useAuth();

  return useSimpleMutation({
    mutationFn: ({
      driverIds,
      ownerId,
      notes,
    }: {
      driverIds: number[];
      ownerId: number;
      notes?: string;
    }) => bulkAssignDrivers(driverIds, ownerId, user!.id, notes),
    onSuccess: async (mappings, { driverIds, ownerId }) => {
      if (user && userRole) {
        await createAuditLog(
          user.id,
          userRole,
          "bulk_action",
          "fleet_mapping",
          null,
          null,
          {
            driver_ids: driverIds,
            owner_id: ownerId,
            count: driverIds.length,
          },
          `Bulk assigned ${driverIds.length} drivers to fleet owner`
        );
      }
    },
  });
};
