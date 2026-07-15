export type DriverStatus = "active" | "suspended";

export interface DriverAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface DriverContact {
  email: string;
  phone: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export interface VehicleInfo {
  cabNumber: string;
  cabCapacity: number;
  licenseNumber: string;
  vehicleType: string;
  registrationNumber?: string;
  insuranceDetails?: string;
}

export interface Driver {
  id: string;
  userId: string;
  name: string;
  status: DriverStatus;
  address: DriverAddress;
  contact: DriverContact;
  vehicle: VehicleInfo;
  avgRating: number;
  isVerified: boolean;
  verificationDate?: string;
  serviceAreas: string[]; // Array of pincodes
  assignedSchoolIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DriverEarnings {
  total_earnings: number;
  monthly_earnings: number;
  pending_payments: number;
  completed_payments: number;
}

export interface DriverStats {
  totalTrips: number;
  totalStudents: number;
  totalSchools: number;
  rating: number;
}

export interface DriverFilter {
  status?: DriverStatus;
  search?: string;
  pincode?: string;
  schoolId?: string;
  isVerified?: boolean;
  sortBy?: "name" | "createdAt" | "rating" | "totalTrips";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface CreateDriverInput
  extends Omit<
    Driver,
    | "id"
    | "userId"
    | "createdAt"
    | "updatedAt"
    | "avgRating"
    | "isVerified"
    | "verificationDate"
  > {}

export interface UpdateDriverInput extends Partial<CreateDriverInput> {
  id: string;
}
