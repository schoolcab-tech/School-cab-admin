import { supabase } from '@/integrations/supabase/client';
import { useSimpleQuery } from './useSimpleQuery';

type ServiceArea = {
  id: string;
  pincode: string;
  city: string;
  state: string;
  is_active: boolean;
};

export function useServiceAreas() {
  return useSimpleQuery<ServiceArea[]>(
    async () => {
      const { data, error } = await supabase
        .from('service_areas')
        .select('*')
        .order('pincode', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return data || [];
    },
    []
  );
}

export function useDriverServiceAreas(driverId?: string) {
  return useSimpleQuery<ServiceArea[]>(
    async () => {
      if (!driverId) return [];

      const { data: driverAreas, error: driverError } = await supabase
        .from('driver_service_areas')
        .select('service_area_id')
        .eq('driver_id', driverId);

      if (driverError) {
        throw new Error(driverError.message);
      }

      if (!driverAreas || driverAreas.length === 0) return [];

      const serviceAreaIds = driverAreas.map(da => da.service_area_id);

      const { data: serviceAreas, error: areasError } = await supabase
        .from('service_areas')
        .select('*')
        .in('id', serviceAreaIds);

      if (areasError) {
        throw new Error(areasError.message);
      }

      return serviceAreas as ServiceArea[];
    },
    [driverId],
    { enabled: !!driverId }
  );
}

export function useServiceAreasOptions() {
  const { data: serviceAreas = [], ...query } = useServiceAreas();

  const options = serviceAreas.map(area => ({
    label: `${area.pincode} - ${area.city}, ${area.state}`,
    value: area.id,
    pincode: area.pincode,
  }));

  return {
    ...query,
    data: options,
  };
}

export function useDriverServiceAreasOptions(driverId?: string) {
  const { data: serviceAreas = [], ...query } = useDriverServiceAreas(driverId);

  const options = serviceAreas.map(area => ({
    label: `${area.pincode} - ${area.city}, ${area.state}`,
    value: area.id,
    pincode: area.pincode,
  }));

  return {
    ...query,
    data: options,
  };
}
