export type CouponDiscountType = "percentage" | "fixed_amount";
export type CouponApplicableMonths = 1 | 3 | 6 | 12;
export type CouponStatus = "active" | "inactive" | "expired";

export interface Coupon {
  coupon_id: number;
  code: string;
  name: string;
  description?: string;
  applicable_months: CouponApplicableMonths;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_uses?: number;
  used_count: number;
  valid_from: string;
  valid_until?: string;
  is_active: boolean;
  created_by_admin?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCouponInput {
  code: string;
  name: string;
  description?: string;
  applicable_months: CouponApplicableMonths;
  discount_type: CouponDiscountType;
  discount_value: number;
  max_uses?: number;
  valid_from?: string;
  valid_until?: string;
  is_active?: boolean;
}

export interface UpdateCouponInput extends Partial<Omit<CreateCouponInput, "code">> {
  coupon_id: number;
}

export interface CouponFilter {
  search?: string;
  status?: CouponStatus;
  applicable_months?: CouponApplicableMonths;
  discount_type?: CouponDiscountType;
  sortBy?: "code" | "name" | "created_at" | "used_count" | "discount_value";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CouponStats {
  total_coupons: number;
  active_coupons: number;
  total_usage: number;
  total_discount_given: number;
}

export interface CouponUsage {
  coupon_code: string;
  usage_count: number;
  total_discount: number;
  last_used: string;
}

export interface CouponValidation {
  isValid: boolean;
  error?: string;
  discount_amount?: number;
  final_amount?: number;
}