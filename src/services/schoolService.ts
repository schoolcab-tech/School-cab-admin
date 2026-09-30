import { supabase } from "@/integrations/supabase/client";
import {
  CreateSchoolInput,
  School,
  SchoolFilter,
  UpdateSchoolInput,
} from "@/types/school";

// Define the shape of the database row from Supabase
interface SchoolDbRow {
  school_id: string;
  name: string;
  code: string;
  address: string;
  locality: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  email: string;
  contact_number: string;
  principal_name: string;
  principal_contact: string;
  operating_hours: Record<string, any>; // JSONB field
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
  student_count: number;
  driver_count: number;
  route_count: number;
  latitude?: number | null;
  longitude?: number | null;
  google_place_id?: string | null;
  livestream_enabled?: boolean;
  livestream_quality?: string;
  eta_enabled?: boolean;
  notifications_enabled?: boolean;
}

// Type for the database row when creating/updating a school
type SchoolDbInput = Omit<
  SchoolDbRow,
  | "school_id"
  | "created_at"
  | "updated_at"
  | "student_count"
  | "driver_count"
  | "route_count"
>;

// Helper function to transform database row to School type
const mapDbToSchool = (row: SchoolDbRow): School => {
  // Ensure we have valid operating hours with default values
  const defaultOperatingHours = {
    monday: { open: "08:00", close: "15:00" },
    tuesday: { open: "08:00", close: "15:00" },
    wednesday: { open: "08:00", close: "15:00" },
    thursday: { open: "08:00", close: "15:00" },
    friday: { open: "08:00", close: "15:00" },
    saturday: null,
    sunday: null,
  };

  return {
    id: row.school_id,
    name: row.name || "Unnamed School",
    code: row.code || "",
    status: row.status || "inactive",
    address: {
      street: row.address || "",
      locality: row.locality || "",
      city: row.city || "",
      state: row.state || "",
      postalCode: row.pincode || "",
      country: row.country || "India",
    },
    contact: {
      email: row.email || "",
      phone: row.contact_number || "",
      principalName: row.principal_name || "",
      principalContact: row.principal_contact || "",
    },
    operatingHours: row.operating_hours
      ? { ...defaultOperatingHours, ...row.operating_hours }
      : defaultOperatingHours,
    studentCount: row.student_count || 0,
    driverCount: row.driver_count || 0,
    routeCount: row.route_count || 0,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    googlePlaceId: row.google_place_id ?? null,
    livestreamEnabled: row.livestream_enabled ?? false,
    livestreamQuality:
      row.livestream_quality === "480p" || row.livestream_quality === "360p"
        ? row.livestream_quality
        : "720p",
    etaEnabled: row.eta_enabled !== false,
    notificationsEnabled: row.notifications_enabled !== false,
    moderatorId: (row as any).moderator_id ?? null,
    moderatorName: (row as any).moderators?.contact_person ?? null,
  };
};

// Helper function to transform School input to database row
const mapSchoolToDb = (
  school: CreateSchoolInput | UpdateSchoolInput
): Partial<SchoolDbInput> => ({
  name: school.name,
  code: school.code,
  address: school.address.street,
  locality: school.address.locality || "",
  city: school.address.city,
  state: school.address.state,
  pincode: school.address.postalCode,
  country: school.address.country,
  email: school.contact.email,
  contact_number: school.contact.phone,
  principal_name: school.contact.principalName,
  principal_contact: school.contact.principalContact,
  operating_hours: school.operatingHours,
  status: "status" in school ? school.status : "active",
  latitude: school.latitude ?? null,
  longitude: school.longitude ?? null,
  google_place_id: school.googlePlaceId ?? null,
  ...(school.livestreamEnabled !== undefined
    ? { livestream_enabled: school.livestreamEnabled }
    : {}),
  ...(school.livestreamQuality !== undefined
    ? { livestream_quality: school.livestreamQuality }
    : {}),
  ...(school.etaEnabled !== undefined ? { eta_enabled: school.etaEnabled } : {}),
  ...(school.notificationsEnabled !== undefined
    ? { notifications_enabled: school.notificationsEnabled }
    : {}),
  ...("school_id" in school ? { school_id: school.school_id } : {}),
});

export const SCHOOLS_TABLE = "schools";

export const getSchools = async (filters?: SchoolFilter) => {
  try {
    // Select all columns including the school_id — exclude soft-deleted schools
    let query = (supabase as any)
      .from(SCHOOLS_TABLE)
      .select("*, moderators(contact_person)", { count: "exact", head: false })
      .is("deleted_at", null);

    // Apply filters
    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.city) {
      query = query.ilike("city", `%${filters.city}%`);
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,address.ilike.%${filters.search}%,city.ilike.%${filters.search}%,pincode.ilike.%${filters.search}%`);
    }

    if (filters?.moderatorId != null) {
      query = query.eq("moderator_id", filters.moderatorId);
    }

    // Apply sorting
    const sortBy =
      filters?.sortBy === "id" ? "school_id" : filters?.sortBy || "name";
    query = query.order(sortBy, {
      ascending: filters?.sortOrder === "asc",
    });

    // Apply pagination
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error("Supabase error:", error);
      throw error;
    }

    console.log("Raw data from Supabase:", data);

    const mappedData = Array.isArray(data)
      ? data.map((row) => {
          // Map school_id to id for the frontend
          const mappedRow = {
            ...row,
            id: row.school_id,
            // Add any other necessary mappings here
          };
          return mapDbToSchool(mappedRow as unknown as SchoolDbRow);
        })
      : [];

    return {
      data: mappedData,
      count: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  } catch (error) {
    console.error("Error fetching schools:", error);
    throw error;
  }
};

export const getSchoolById = async (id: string) => {
  try {
    const { data, error } = await (supabase as any)
      .from(SCHOOLS_TABLE)
      .select("*")
      .eq("school_id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      console.error("Supabase error details:", error);
      throw error;
    }

    if (!data) {
      throw new Error(`School with ID ${id} not found`);
    }

    return mapDbToSchool(data as unknown as SchoolDbRow);
  } catch (error) {
    console.error(`Error fetching school with id ${id}:`, error);
    throw error;
  }
};

export const createSchool = async (schoolData: CreateSchoolInput) => {
  try {
    const dbData = mapSchoolToDb(schoolData);
    const { data, error } = await supabase
      .from(SCHOOLS_TABLE)
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;
    return mapDbToSchool(data as unknown as SchoolDbRow);
  } catch (error) {
    console.error("Error creating school:", error);
    throw error;
  }
};

export const updateSchool = async (
  school_id: string,
  updates: UpdateSchoolInput
) => {
  try {
    const dbData = mapSchoolToDb(updates);
    const { data, error } = await supabase
      .from(SCHOOLS_TABLE)
      .update(dbData)
      .eq("school_id", school_id)
      .select()
      .single();

    if (error) throw error;
    return mapDbToSchool(data as unknown as SchoolDbRow);
  } catch (error) {
    console.error(`Error updating school with id ${school_id}:`, error);
    throw error;
  }
};

export const deleteSchool = async (school_id: string) => {
  try {
    // Soft delete: stamp deleted_at instead of issuing a hard DELETE.
    const { error } = await (supabase as any)
      .from(SCHOOLS_TABLE)
      .update({ deleted_at: new Date().toISOString() })
      .eq("school_id", school_id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error(`Error soft-deleting school with id ${school_id}:`, error);
    throw error;
  }
};

export const updateSchoolStatus = async (
  school_id: string,
  status: "active" | "inactive"
) => {
  try {
    const { data, error } = await supabase
      .from(SCHOOLS_TABLE)
      .update({ status })
      .eq("school_id", school_id)
      .select()
      .single();

    if (error) throw error;
    return mapDbToSchool(data as unknown as SchoolDbRow);
  } catch (error) {
    console.error(`Error updating status for school ${school_id}:`, error);
    throw error;
  }
};

export const getSchoolStats = async () => {
  try {
    // Get total schools count
    const { count: totalSchools } = await supabase
      .from(SCHOOLS_TABLE)
      .select("*", { count: "exact", head: true });

    // Get active schools count
    const { count: activeSchools } = await supabase
      .from(SCHOOLS_TABLE)
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    // Get schools by city
    const { data: schoolsByCity } = await supabase
      .from(SCHOOLS_TABLE)
      .select("address->>city as city, count(*)")
      .group("address->>city");

    return {
      totalSchools: totalSchools || 0,
      activeSchools: activeSchools || 0,
      inactiveSchools: (totalSchools || 0) - (activeSchools || 0),
      schoolsByCity: schoolsByCity || [],
    };
  } catch (error) {
    console.error("Error fetching school stats:", error);
    throw error;
  }
};

// ── Student locations for a school ───────────────────────────────────

export interface StudentLocation {
  student_id: number;
  name: string;
  class: string;
  section: string;
  pickup_address: string;
  pickup_latitude: number;
  pickup_longitude: number;
}

export async function getSchoolStudentLocations(schoolId: string): Promise<StudentLocation[]> {
  const { data, error } = await supabase
    .from("students")
    .select("student_id, name, class, section, pickup_address, pickup_latitude, pickup_longitude")
    .eq("school_id", schoolId)
    .not("pickup_latitude", "is", null)
    .not("pickup_longitude", "is", null)
    .order("name");

  if (error) throw new Error(`Error fetching student locations: ${error.message}`);

  return (data || []).map((s: any) => ({
    ...s,
    pickup_latitude: Number(s.pickup_latitude),
    pickup_longitude: Number(s.pickup_longitude),
  }));
}
