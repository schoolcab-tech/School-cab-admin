import {
  getContactFormResponses,
  getLeadBookings,
  deleteContactFormResponse,
  deleteLeadBooking,
  type ContactFormResponse,
  type LeadBooking,
} from "@/services/websiteLeadsService";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";

export const useContactFormResponses = () => {
  return useSimpleQuery<ContactFormResponse[]>(
    () => getContactFormResponses(),
    []
  );
};

export const useLeadBookings = () => {
  return useSimpleQuery<LeadBooking[]>(
    () => getLeadBookings(),
    []
  );
};

export const useDeleteContactFormResponse = () => {
  return useSimpleMutation<void, string>({
    mutationFn: (id) => deleteContactFormResponse(id) as Promise<void>,
  });
};

export const useDeleteLeadBooking = () => {
  return useSimpleMutation<void, string>({
    mutationFn: (id) => deleteLeadBooking(id) as Promise<void>,
  });
};
