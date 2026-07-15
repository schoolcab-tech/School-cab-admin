import {
  getSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
  updateSchoolStatus,
  getSchoolStats
} from '@/services/schoolService';
import { School, SchoolFilter, CreateSchoolInput, UpdateSchoolInput } from '@/types/school';
import { useSimpleQuery } from './useSimpleQuery';
import { useSimpleMutation } from './useSimpleMutation';

export const SCHOOLS_QUERY_KEY = 'schools';

export const useSchools = (filters?: SchoolFilter) => {
  return useSimpleQuery<School[]>(
    () => getSchools(filters) as Promise<School[]>,
    [JSON.stringify(filters)]
  );
};

export const useSchool = (id: string) => {
  return useSimpleQuery<School>(
    () => getSchoolById(id) as Promise<School>,
    [id],
    { enabled: !!id }
  );
};

export const useCreateSchool = () => {
  return useSimpleMutation<School, CreateSchoolInput>({
    mutationFn: (schoolData) => createSchool(schoolData) as Promise<School>,
  });
};

export const useUpdateSchool = () => {
  return useSimpleMutation<School, { id: string; data: UpdateSchoolInput }>({
    mutationFn: ({ id, data }) => updateSchool(id, data) as Promise<School>,
  });
};

export const useDeleteSchool = () => {
  return useSimpleMutation<void, string>({
    mutationFn: (id) => deleteSchool(id) as Promise<void>,
  });
};

export const useUpdateSchoolStatus = () => {
  return useSimpleMutation<School, { id: string; status: 'active' | 'inactive' }>({
    mutationFn: ({ id, status }) => updateSchoolStatus(id, status) as Promise<School>,
  });
};

export const useSchoolStats = () => {
  return useSimpleQuery(
    () => getSchoolStats(),
    []
  );
};
