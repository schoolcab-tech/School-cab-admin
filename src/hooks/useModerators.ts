import { useAuth } from "@/contexts/auth-context";
import {
  activateModerator,
  assignSchoolToModerator,
  createModerator,
  deleteModerator,
  getAllModerators,
  getModeratorSchools,
  getMyModerator,
  suspendModerator,
  updateModerator,
  type CreateModeratorInput,
  type Moderator,
  type ModeratorWithSchoolCount,
  type UpdateModeratorInput,
} from "@/services/moderatorService";
import { useSimpleMutation } from "./useSimpleMutation";
import { useSimpleQuery } from "./useSimpleQuery";

export const useModerators = () => {
  return useSimpleQuery<ModeratorWithSchoolCount[]>(() => getAllModerators(), []);
};

export const useMyModerator = () => {
  const { user } = useAuth();
  return useSimpleQuery<Moderator | null>(
    () => (user ? getMyModerator(user.id) : Promise.resolve(null)),
    [user?.id],
    { enabled: !!user }
  );
};

export const useModeratorSchools = (moderatorId: number | null | undefined) => {
  return useSimpleQuery(
    () => (moderatorId ? getModeratorSchools(moderatorId) : Promise.resolve([])),
    [moderatorId],
    { enabled: !!moderatorId }
  );
};

export const useCreateModerator = () => {
  const { user } = useAuth();
  return useSimpleMutation({
    mutationFn: (data: CreateModeratorInput) => createModerator(data, user!.id),
  });
};

export const useUpdateModerator = () => {
  return useSimpleMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateModeratorInput }) =>
      updateModerator(id, input),
  });
};

export const useSuspendModerator = () => {
  return useSimpleMutation({
    mutationFn: (id: number) => suspendModerator(id),
  });
};

export const useActivateModerator = () => {
  return useSimpleMutation({
    mutationFn: (id: number) => activateModerator(id),
  });
};

export const useDeleteModerator = () => {
  const { user } = useAuth();
  return useSimpleMutation({
    mutationFn: (id: number) => deleteModerator(id, user?.id),
  });
};

export const useAssignSchoolToModerator = () => {
  return useSimpleMutation({
    mutationFn: ({
      schoolId,
      moderatorId,
    }: {
      schoolId: number;
      moderatorId: number | null;
    }) => assignSchoolToModerator(schoolId, moderatorId),
  });
};
