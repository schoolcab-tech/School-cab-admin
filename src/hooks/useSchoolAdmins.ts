import {
  getAllSchoolAdmins,
  getSchoolAdminById,
  getMySchoolAdmin,
  createSchoolAdmin,
  updateSchoolAdmin,
  suspendSchoolAdmin,
  activateSchoolAdmin,
  deleteSchoolAdmin,
  type SchoolAdminWithSchool,
  type CreateSchoolAdminInput,
  type UpdateSchoolAdminInput,
} from "@/services/schoolAdminService";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";
import { useAuth } from "@/contexts/auth-context";

export const useSchoolAdmins = (options?: { schoolIds?: number[] }) => {
  const key = options?.schoolIds?.join(",") ?? "all";
  return useSimpleQuery<SchoolAdminWithSchool[]>(
    () => getAllSchoolAdmins(options),
    [key]
  );
};

export const useSchoolAdmin = (id: number | null) => {
  return useSimpleQuery<SchoolAdminWithSchool | null>(
    () => (id ? getSchoolAdminById(id) : Promise.resolve(null)),
    [id],
    { enabled: !!id }
  );
};

/** Get the school_admins row for the currently-logged-in user. */
export const useMySchoolAdmin = () => {
  const { user, isSchoolAdmin } = useAuth();
  return useSimpleQuery<SchoolAdminWithSchool | null>(
    () => (user?.id ? getMySchoolAdmin(user.id) : Promise.resolve(null)),
    [user?.id],
    { enabled: !!user?.id && isSchoolAdmin }
  );
};

export const useCreateSchoolAdmin = () => {
  const { user } = useAuth();
  return useSimpleMutation({
    mutationFn: (data: CreateSchoolAdminInput) => createSchoolAdmin(data, user!.id),
  });
};

export const useUpdateSchoolAdmin = () => {
  return useSimpleMutation({
    mutationFn: ({ id, input }: { id: number; input: UpdateSchoolAdminInput }) =>
      updateSchoolAdmin(id, input),
  });
};

export const useSuspendSchoolAdmin = () => {
  return useSimpleMutation({
    mutationFn: (id: number) => suspendSchoolAdmin(id),
  });
};

export const useActivateSchoolAdmin = () => {
  return useSimpleMutation({
    mutationFn: (id: number) => activateSchoolAdmin(id),
  });
};

export const useDeleteSchoolAdmin = () => {
  const { user } = useAuth();
  return useSimpleMutation({
    mutationFn: (id: number) => deleteSchoolAdmin(id, user?.id),
  });
};
