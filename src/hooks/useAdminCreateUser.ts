import {
  createUserAccount,
  markProfileCompleted,
  type CreateUserAccountResponse,
} from "@/services/adminAuthService";
import { useSimpleMutation } from "./useSimpleMutation";

export const useCreateUserAccount = () => {
  return useSimpleMutation<CreateUserAccountResponse, {
    phoneNumber: string;
    userType: "user" | "driver";
  }>({
    mutationFn: ({ phoneNumber, userType }) =>
      createUserAccount(phoneNumber, userType),
  });
};

export const useMarkProfileCompleted = () => {
  return useSimpleMutation<void, string>({
    mutationFn: (phoneNumber) => markProfileCompleted(phoneNumber) as Promise<void>,
  });
};

export type { CreateUserAccountResponse };
