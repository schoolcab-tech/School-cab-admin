import { supabase } from "@/integrations/supabase/client";
import { 
  Coupon, 
  CreateCouponInput, 
  UpdateCouponInput, 
  CouponFilter, 
  CouponStats, 
  CouponUsage, 
  CouponValidation,
  CouponApplicableMonths,
  CouponDiscountType 
} from "@/types/coupon";

export const getCoupons = async (filters?: CouponFilter): Promise<Coupon[]> => {
  let query = supabase.from("coupon_codes").select("*");

  // Search filter
  if (filters?.search) {
    query = query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  // Status filter
  if (filters?.status) {
    const currentDate = new Date().toISOString().split('T')[0];
    
    switch (filters.status) {
      case 'active':
        query = query.eq('is_active', true).or(`valid_until.is.null,valid_until.gte.${currentDate}`);
        break;
      case 'inactive':
        query = query.eq('is_active', false);
        break;
      case 'expired':
        query = query.eq('is_active', true).lt('valid_until', currentDate);
        break;
    }
  }

  // Applicable months filter
  if (filters?.applicable_months) {
    query = query.eq('applicable_months', filters.applicable_months);
  }

  // Discount type filter
  if (filters?.discount_type) {
    query = query.eq('discount_type', filters.discount_type);
  }

  // Sorting
  const sortBy = filters?.sortBy || 'created_at';
  const sortOrder = filters?.sortOrder || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Pagination
  if (filters?.page && filters?.limit) {
    const from = (filters.page - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const getCouponById = async (id: number): Promise<Coupon | null> => {
  const { data, error } = await supabase
    .from("coupon_codes")
    .select("*")
    .eq("coupon_id", id)
    .single();

  if (error) throw error;
  return data;
};

export const getCouponByCode = async (code: string): Promise<Coupon | null> => {
  const { data, error } = await supabase
    .from("coupon_codes")
    .select("*")
    .eq("code", code)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
  return data;
};

export const createCoupon = async (couponData: CreateCouponInput): Promise<Coupon> => {
  const { data: user } = await supabase.auth.getUser();
  
  const insertData = {
    ...couponData,
    valid_from: couponData.valid_from || new Date().toISOString().split('T')[0],
    is_active: couponData.is_active ?? true,
    used_count: 0,
    created_by_admin: user.user?.id,
    discount_type: couponData.discount_type || 'percentage'
  };

  const { data, error } = await supabase
    .from("coupon_codes")
    .insert(insertData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateCoupon = async (id: number, updateData: Partial<UpdateCouponInput>): Promise<Coupon> => {
  const { data, error } = await supabase
    .from("coupon_codes")
    .update({
      ...updateData,
      updated_at: new Date().toISOString()
    })
    .eq("coupon_id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteCoupon = async (id: number): Promise<void> => {
  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from("coupon_codes")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("coupon_id", id);

  if (error) throw error;
};

export const toggleCouponStatus = async (id: number): Promise<Coupon> => {
  // Get current status first
  const coupon = await getCouponById(id);
  if (!coupon) throw new Error('Coupon not found');

  return updateCoupon(id, { is_active: !coupon.is_active });
};

export const validateCoupon = async (
  code: string, 
  applicableMonths: CouponApplicableMonths, 
  baseAmount: number
): Promise<CouponValidation> => {
  try {
    const coupon = await getCouponByCode(code);
    
    if (!coupon) {
      return { isValid: false, error: "Coupon code not found" };
    }

    // Check if coupon is active
    if (!coupon.is_active) {
      return { isValid: false, error: "This coupon is no longer active" };
    }

    // Check applicable months
    if (coupon.applicable_months !== applicableMonths) {
      return { 
        isValid: false, 
        error: `This coupon is only valid for ${coupon.applicable_months}-month subscriptions` 
      };
    }

    // Check date validity
    const currentDate = new Date().toISOString().split('T')[0];
    if (coupon.valid_from && coupon.valid_from > currentDate) {
      return { isValid: false, error: "This coupon is not yet valid" };
    }
    
    if (coupon.valid_until && coupon.valid_until < currentDate) {
      return { isValid: false, error: "This coupon has expired" };
    }

    // Check usage limit
    if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
      return { isValid: false, error: "This coupon has reached its usage limit" };
    }

    // Calculate discount
    const discount_amount = calculateDiscount(baseAmount, coupon.discount_type as CouponDiscountType, coupon.discount_value);
    const final_amount = Math.max(0, baseAmount - discount_amount);

    return {
      isValid: true,
      discount_amount,
      final_amount
    };

  } catch (error) {
    console.error('Error validating coupon:', error);
    return { isValid: false, error: "Error validating coupon code" };
  }
};

export const applyCoupon = async (code: string): Promise<void> => {
  // Increment used_count when coupon is successfully applied
  const { error } = await supabase.rpc('increment_coupon_usage', { coupon_code: code });
  
  if (error) {
    // If RPC doesn't exist, use direct update
    const coupon = await getCouponByCode(code);
    if (coupon) {
      await updateCoupon(coupon.coupon_id, { used_count: coupon.used_count + 1 });
    }
  }
};

export const getCouponStats = async (): Promise<CouponStats> => {
  const { data: allCoupons, error: allError } = await supabase
    .from("coupon_codes")
    .select("is_active, used_count");

  if (allError) throw allError;

  const currentDate = new Date().toISOString().split('T')[0];
  const { data: activeCoupons, error: activeError } = await supabase
    .from("coupon_codes")
    .select("used_count")
    .eq("is_active", true)
    .or(`valid_until.is.null,valid_until.gte.${currentDate}`);

  if (activeError) throw activeError;

  const total_coupons = allCoupons?.length || 0;
  const active_coupons = activeCoupons?.length || 0;
  const total_usage = allCoupons?.reduce((sum, coupon) => sum + coupon.used_count, 0) || 0;

  // TODO: Calculate total_discount_given from actual payment records if available
  const total_discount_given = 0;

  return {
    total_coupons,
    active_coupons,
    total_usage,
    total_discount_given
  };
};

export const getCouponUsageStats = async (): Promise<CouponUsage[]> => {
  const { data, error } = await supabase
    .from("coupon_codes")
    .select("code, used_count, updated_at")
    .gt("used_count", 0)
    .order("used_count", { ascending: false });

  if (error) throw error;

  return data?.map(coupon => ({
    coupon_code: coupon.code,
    usage_count: coupon.used_count,
    total_discount: 0, // TODO: Calculate from payment records
    last_used: coupon.updated_at
  })) || [];
};

// Helper function to calculate discount amount
function calculateDiscount(
  baseAmount: number, 
  discountType: CouponDiscountType,
  discountValue: number
): number {
  if (discountType === 'percentage') {
    return (baseAmount * discountValue) / 100;
  } else {
    return Math.min(discountValue, baseAmount); // Don't exceed base amount
  }
}