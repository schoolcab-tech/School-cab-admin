import { supabase } from '@/integrations/supabase/client';
import { Benefit, CreateBenefitData, UpdateBenefitData, UserType } from '@/types/benefit';

export const benefitService = {
  // Get all benefits with optional filtering
  async getBenefits(userType?: UserType): Promise<Benefit[]> {
    let query = supabase
      .from('benefits')
      .select('*');

    if (userType) {
      query = query.or(`user_type.eq.${userType},user_type.eq.both`);
    }

    const { data, error } = await query
      .order('user_type', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching benefits:', error);
      throw error;
    }

    return data || [];
  },

  // Get active benefits only with optional user type filtering
  async getActiveBenefits(userType?: UserType): Promise<Benefit[]> {
    let query = supabase
      .from('benefits')
      .select('*')
      .eq('is_active', true);

    if (userType) {
      query = query.or(`user_type.eq.${userType},user_type.eq.both`);
    }

    const { data, error } = await query
      .order('user_type', { ascending: true })
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching active benefits:', error);
      throw error;
    }

    return data || [];
  },

  // Get benefits by user type only
  async getBenefitsByUserType(userType: UserType): Promise<Benefit[]> {
    const { data, error } = await supabase
      .from('benefits')
      .select('*')
      .or(`user_type.eq.${userType},user_type.eq.both`)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching benefits by user type:', error);
      throw error;
    }

    return data || [];
  },

  // Get benefit by ID
  async getBenefitById(id: string): Promise<Benefit | null> {
    const { data, error } = await supabase
      .from('benefits')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching benefit:', error);
      throw error;
    }

    return data;
  },

  // Create new benefit
  async createBenefit(benefitData: CreateBenefitData): Promise<Benefit> {
    const { data, error } = await supabase
      .from('benefits')
      .insert([{
        ...benefitData,
        is_active: benefitData.is_active ?? true,
        display_order: benefitData.display_order ?? 0,
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating benefit:', error);
      throw error;
    }

    return data;
  },

  // Update benefit
  async updateBenefit(benefitData: UpdateBenefitData): Promise<Benefit> {
    const { id, ...updateData } = benefitData;
    
    const { data, error } = await supabase
      .from('benefits')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating benefit:', error);
      throw error;
    }

    return data;
  },

  // Soft-delete benefit by deactivating it (is_active = false).
  // The row is preserved for historical/audit purposes.
  async deleteBenefit(id: string): Promise<void> {
    const { error } = await supabase
      .from('benefits')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error soft-deleting benefit:', error);
      throw error;
    }
  },

  // Upload image to Supabase Storage
  async uploadImage(file: File, benefitId?: string): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = benefitId 
      ? `benefit-${benefitId}-${Date.now()}.${fileExt}`
      : `benefit-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('benefits-images')
      .upload(fileName, file);

    if (error) {
      console.error('Error uploading image:', error);
      throw error;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('benefits-images')
      .getPublicUrl(fileName);

    return publicUrl;
  },

  // Delete image from Supabase Storage
  async deleteImage(imageUrl: string): Promise<void> {
    // Extract file name from URL
    const fileName = imageUrl.split('/').pop();
    if (!fileName) return;

    const { error } = await supabase.storage
      .from('benefits-images')
      .remove([fileName]);

    if (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  },

  // Update display order
  async updateDisplayOrder(benefits: { id: string; display_order: number }[]): Promise<void> {
    const updates = benefits.map(benefit => 
      supabase
        .from('benefits')
        .update({ display_order: benefit.display_order })
        .eq('id', benefit.id)
    );

    const results = await Promise.all(updates);
    
    for (const result of results) {
      if (result.error) {
        console.error('Error updating display order:', result.error);
        throw result.error;
      }
    }
  }
};