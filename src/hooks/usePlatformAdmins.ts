import { useAuth } from "@/contexts/auth-context";
import {
  activatePlatformAdmin,
  backfillPlatformAdmins,
  createPlatformAdmin,
  deletePlatformAdmin,
  getAllPlatformAdmins,
  suspendPlatformAdmin,
  updatePlatformAdmin,
  type CreatePlatformAdminInput,
  type PlatformAdmin,
  type UpdatePlatformAdminInput,
} from "@/services/platformAdminService";
import { useSimpleMutation } from "./useSimpleMutation";
import { useSimpleQuery } from "./useSimpleQuery";

export const usePlatformAdmins = () => {
  return useSimpleQuery<PlatformAdmin[]>(() => getAllPlatformAdmins(), []);
};

export const useCreatePlatformAdmin = () => {
  const { user } = useAuth();
  return useSimpleMutation({
    mutationFn: (data: CreatePlatformAdminInput) =>
      createPlatformAdmin(data, user!.id),
  });
};

export const useUpdatePlatformAdmin = () => {
  return useSimpleMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: number;
      input: UpdatePlatformAdminInput;
    }) => updatePlatformAdmin(id, input),
  });
};

export const useSuspendPlatformAdmin = () => {
  return useSimpleMutation({
    mutationFn: (id: number) => suspendPlatformAdmin(id),
  });
};

export const useActivatePlatformAdmin = () => {
  return useSimpleMutation({
    mutationFn: (id: number) => activatePlatformAdmin(id),
  });
};

export const useDeletePlatformAdmin = () => {
  const { user } = useAuth();
  return useSimpleMutation({
    mutationFn: (id: number) => deletePlatformAdmin(id, user?.id),
  });
};

export const useBackfillPlatformAdmins = () => {
  return useSimpleMutation({
    mutationFn: () => backfillPlatformAdmins(),
  });
};
