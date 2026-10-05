-- Route/trip-centric shifts: students sit on driver_trips; driver is on the trip (changeable).
-- service_shift NULL = legacy bucket (same trip used for morning pickup and evening drop).

ALTER TABLE public.driver_trips
  ADD COLUMN IF NOT EXISTS service_shift TEXT
  CHECK (service_shift IS NULL OR service_shift IN ('morning', 'evening'));

COMMENT ON COLUMN public.driver_trips.service_shift IS
  'morning = pickup leg only; evening = drop leg only; NULL = both legs (legacy capacity split).';

CREATE INDEX IF NOT EXISTS idx_driver_trips_school_shift
  ON public.driver_trips(school_id, service_shift)
  WHERE is_active = true;
