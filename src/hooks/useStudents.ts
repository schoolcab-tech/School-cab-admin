import {
  getStudents,
  updateStudentStatus,
  assignDriverToStudent,
} from "@/services/studentService";
import { useSimpleMutation } from "./useSimpleMutation";
import { useSimpleQuery } from "./useSimpleQuery";

export const useStudents = (schoolId?: number) => {
  return useSimpleQuery(
    () => getStudents(schoolId != null ? { schoolId } : undefined),
    [schoolId]
  );
};

export const useUpdateStudentStatus = () => {
  return useSimpleMutation({
    mutationFn: ({ id, status }: { id: number; status: "active" | "inactive" }) =>
      updateStudentStatus(id, status),
  });
};

export const useAssignDriver = () => {
  return useSimpleMutation({
    mutationFn: ({
      studentId,
      driverId,
      schoolId,
      adminUserId,
      adminRole,
    }: {
      studentId: number;
      driverId: number;
      schoolId: number;
      adminUserId?: string;
      adminRole?: string;
    }) => assignDriverToStudent(studentId, driverId, schoolId, adminUserId, adminRole),
  });
};
