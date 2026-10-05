import {
  deleteChargingPoint,
  listChargingPoints,
  saveChargingPoint,
  syncLocationCoverage,
  updateChargingPoint,
  type ChargingPoint,
  type ChargingPointForm,
} from "@/services/chargingPointService";
import { useSimpleMutation } from "./useSimpleMutation";
import { useSimpleQuery } from "./useSimpleQuery";

export function useChargingPoints() {
  return useSimpleQuery(() => listChargingPoints(), []);
}

export function useSaveChargingPoint() {
  return useSimpleMutation<ChargingPoint, { input: ChargingPointForm; existing?: ChargingPoint | null }>({
    mutationFn: ({ input, existing }) => saveChargingPoint(input, existing),
  });
}

export function useDeleteChargingPoint() {
  return useSimpleMutation<void, string>({
    mutationFn: (id) => deleteChargingPoint(id),
  });
}

export function useToggleChargingPoint() {
  return useSimpleMutation<ChargingPoint, { id: string; active: boolean }>({
    mutationFn: ({ id, active }) => updateChargingPoint(id, { active }),
  });
}

export function useSyncLocationCoverage() {
  return useSimpleMutation<void, Parameters<typeof syncLocationCoverage>[0]>({
    mutationFn: (args) => syncLocationCoverage(args),
  });
}
