import {
  getParentCallingCalls,
  softDeleteParentCallingCall,
  updateParentCallingFollowUp,
  updateParentCallingLeadStatus,
  type ParentCallingCall,
  type ParentCallingFollowUp,
  type ParentCallingLeadStatus,
} from "@/services/parentCallingLeadsService";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";

export const useParentCallingCalls = () => {
  return useSimpleQuery<ParentCallingCall[]>(
    () => getParentCallingCalls(),
    [],
    { requestTimeout: 60000 },
  );
};

export const useUpdateParentCallingFollowUp = () => {
  return useSimpleMutation<
    void,
    { id: string; followUpStatus: ParentCallingFollowUp }
  >({
    mutationFn: ({ id, followUpStatus }) =>
      updateParentCallingFollowUp(id, followUpStatus) as Promise<void>,
  });
};

export const useUpdateParentCallingLeadStatus = () => {
  return useSimpleMutation<
    void,
    { id: string; leadStatus: ParentCallingLeadStatus }
  >({
    mutationFn: ({ id, leadStatus }) =>
      updateParentCallingLeadStatus(id, leadStatus) as Promise<void>,
  });
};

export const useDeleteParentCallingCall = () => {
  return useSimpleMutation<void, string>({
    mutationFn: (id) => softDeleteParentCallingCall(id) as Promise<void>,
  });
};
