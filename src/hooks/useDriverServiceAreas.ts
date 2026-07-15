import { supabase } from "@/integrations/supabase/client";
import { useSimpleQuery } from "./useSimpleQuery";

type Driver = {
  name: string;
  cab_number: string;
  vehicle_type: string;
};

type DriverServiceArea = {
  pincode: string;
  drivers: Driver | null;
};

const fetchDriverServiceAreas = async () => {
  const { data, error } = await supabase
    .from("driver_service_areas")
    .select(
      `
      *,
      drivers(name, cab_number, vehicle_type)
    `
    )
    .order("pincode");

  if (error) {
    throw new Error(error.message);
  }

  return data as DriverServiceArea[] || [];
};

export function useDriverServiceAreas() {
  return useSimpleQuery(
    () => fetchDriverServiceAreas(),
    []
  );
}
