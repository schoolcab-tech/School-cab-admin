// This type matches what's coming from the database
export interface StudentSchool {
  name?: string;
  address?: string;
  school_id: number;
}

export interface Student {
  student_id: number;
  user_id: string;
  name: string;
  school_id: number;
  pickup_address: string;
  drop_address: string;
  pickup_pincode: string;
  drop_pincode: string;
  pickup_time: string;
  drop_time: string;
  class: string;
  section: string;
  pickup_latitude?: number | null;
  pickup_longitude?: number | null;
  created_at: string;
  updated_at: string;
  notification_token?: string;
  status?: "active" | "inactive";
  phone?: string;
  schools?: StudentSchool;
  bookings?: {
    driver_id: number;
    drivers: {
      driver_id: number;
      name?: string;
      phone?: string;
      cab_number: string;
      vehicle_type: string;
    };
  }[];
  assigned_driver?: {
    driver_id: number;
    name?: string;
    phone?: string;
    cab_number: string;
    vehicle_type: string;
  };
}
