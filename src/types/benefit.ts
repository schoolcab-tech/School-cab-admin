export type UserType = 'student' | 'driver' | 'both';

export interface Benefit {
  id: string;
  title: string;
  description: string;
  image_url?: string;
  icon_name?: string; // For predefined icons in React Native
  user_type: UserType; // Who can see this benefit
  is_active: boolean;
  created_at: string;
  updated_at: string;
  display_order: number;
}

export interface CreateBenefitData {
  title: string;
  description: string;
  image_url?: string;
  icon_name?: string;
  user_type: UserType;
  is_active?: boolean;
  display_order?: number;
}

export interface UpdateBenefitData extends Partial<CreateBenefitData> {
  id: string;
}

export const USER_TYPE_OPTIONS = [
  { value: 'student' as const, label: 'Students Only', description: 'Only visible to students' },
  { value: 'driver' as const, label: 'Drivers Only', description: 'Only visible to drivers' },
  { value: 'both' as const, label: 'Both Users', description: 'Visible to both students and drivers' },
] as const;