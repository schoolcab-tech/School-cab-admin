export type SchoolStatus = "active" | "inactive";

export interface SchoolAddress {
  street: string;
  locality: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface OperatingHours {
  monday: { open: string; close: string };
  tuesday: { open: string; close: string };
  wednesday: { open: string; close: string };
  thursday: { open: string; close: string };
  friday: { open: string; close: string };
  saturday?: { open: string; close: string } | null;
  sunday?: { open: string; close: string } | null;
}

export type LivestreamQuality = "720p" | "480p" | "360p";

export interface School {
  id: string;
  name: string;
  code: string;
  address: SchoolAddress;
  contact: {
    email: string;
    phone: string;
    principalName: string;
    principalContact: string;
  };
  operatingHours: OperatingHours;
  status: SchoolStatus;
  studentCount: number;
  driverCount: number;
  routeCount: number;
  createdAt: string;
  updatedAt: string;
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
  livestreamEnabled: boolean;
  livestreamQuality: LivestreamQuality;
  moderatorId?: number | null;
  moderatorName?: string | null;
}

export interface CreateSchoolInput
  extends Omit<
    School,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "studentCount"
    | "driverCount"
    | "routeCount"
  > {
  latitude?: number | null;
  longitude?: number | null;
  googlePlaceId?: string | null;
}

export interface UpdateSchoolInput extends Partial<CreateSchoolInput> {}

export interface SchoolFilter {
  status?: SchoolStatus;
  city?: string;
  search?: string;
  sortBy?: "name" | "createdAt" | "studentCount" | "status";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  /** When set, only schools owned by this moderator */
  moderatorId?: number;
}
