import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  getCouponById,
  getCouponByCode,
  getCouponStats,
  getCouponUsageStats,
  updateCoupon,
  toggleCouponStatus,
  validateCoupon,
  applyCoupon,
  type Coupon,
  type CreateCouponInput,
  type CouponFilter,
  type CouponStats,
  type CouponUsage,
  type CouponValidation,
  type CouponApplicableMonths,
} from "@/services/couponService";
import { useSimpleQuery } from "./useSimpleQuery";
import { useSimpleMutation } from "./useSimpleMutation";

export const useCoupons = (filters?: CouponFilter) => {
  return useSimpleQuery(
    () => getCoupons(filters),
    [JSON.stringify(filters)]
  );
};

export const useCoupon = (id: number) => {
  return useSimpleQuery<Coupon | null>(
    () => getCouponById(id),
    [id],
    { enabled: !!id }
  );
};

export const useCouponByCode = (code: string) => {
  return useSimpleQuery<Coupon | null>(
    () => getCouponByCode(code),
    [code],
    { enabled: !!code }
  );
};

export const useCouponStats = () => {
  return useSimpleQuery<CouponStats>(
    () => getCouponStats(),
    []
  );
};

export const useCouponUsageStats = () => {
  return useSimpleQuery<CouponUsage[]>(
    () => getCouponUsageStats(),
    []
  );
};

export const useCreateCoupon = () => {
  return useSimpleMutation<Coupon, CreateCouponInput>({
    mutationFn: (data) => createCoupon(data),
  });
};

export const useUpdateCoupon = () => {
  return useSimpleMutation<Coupon, { id: number; data: Partial<CreateCouponInput> }>({
    mutationFn: ({ id, data }) => updateCoupon(id, data),
  });
};

export const useDeleteCoupon = () => {
  return useSimpleMutation<void, number>({
    mutationFn: (id) => deleteCoupon(id) as Promise<void>,
  });
};

export const useToggleCouponStatus = () => {
  return useSimpleMutation<Coupon, number>({
    mutationFn: (id) => toggleCouponStatus(id),
  });
};

export const useValidateCoupon = () => {
  return useSimpleMutation<CouponValidation, {
    code: string;
    applicableMonths: CouponApplicableMonths;
    baseAmount: number;
  }>({
    mutationFn: ({ code, applicableMonths, baseAmount }) =>
      validateCoupon(code, applicableMonths, baseAmount),
  });
};

export const useApplyCoupon = () => {
  return useSimpleMutation<Coupon, string>({
    mutationFn: (code) => applyCoupon(code),
  });
};

export const useCouponValidation = (
  code: string,
  applicableMonths: CouponApplicableMonths,
  baseAmount: number,
  enabled: boolean = true
) => {
  return useSimpleQuery<CouponValidation>(
    () => validateCoupon(code, applicableMonths, baseAmount),
    [code, applicableMonths, baseAmount],
    { enabled: enabled && !!code && !!applicableMonths && baseAmount > 0 }
  );
};
