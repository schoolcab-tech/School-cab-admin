import {
  getSchoolSubscriptionPayments,
  type SchoolPaymentFilters,
} from "@/services/schoolPaymentService";
import { useSimpleQuery } from "./useSimpleQuery";

export const useSchoolPayments = (
  schoolId?: number,
  filters: SchoolPaymentFilters = {}
) => {
  return useSimpleQuery(
    () => getSchoolSubscriptionPayments(schoolId!, filters),
    [schoolId, filters.month, filters.status],
    { enabled: schoolId != null }
  );
};
