-- Per-school parent features: ETA display and trip notifications.
-- Also lets parents (and school admins / moderators) read driver documents
-- for drivers they are actually connected to.
-- Apply via Supabase SQL Editor, or `supabase db push`.

ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS eta_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.schools.eta_enabled IS
  'When false, parents and school live tracking hide arrival time for this school.';
COMMENT ON COLUMN public.schools.notifications_enabled IS
  'When false, cab approaching / pickup / drop alerts are not sent to parents of this school.';

-- ---------------------------------------------------------------------------
-- driver_documents (already used by the admin panel; create only if missing)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.driver_documents (
  document_id BIGSERIAL PRIMARY KEY,
  driver_id BIGINT NOT NULL REFERENCES public.drivers(driver_id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  expiry_date DATE,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_driver_documents_driver
  ON public.driver_documents(driver_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;

-- Parents: read documents for a driver on their confirmed booking
DROP POLICY IF EXISTS driver_documents_parent_select ON public.driver_documents;
CREATE POLICY driver_documents_parent_select ON public.driver_documents
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.students s ON s.student_id = b.student_id
      WHERE s.user_id = auth.uid()
        AND b.driver_id = driver_documents.driver_id
        AND b.status = 'confirmed'
    )
  );

-- School admins: read documents for drivers booked to their school
DROP POLICY IF EXISTS driver_documents_school_admin_select ON public.driver_documents;
CREATE POLICY driver_documents_school_admin_select ON public.driver_documents
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.school_admins sa
      JOIN public.students st ON st.school_id = sa.school_id
      JOIN public.bookings b ON b.student_id = st.student_id
      WHERE sa.user_id = auth.uid()
        AND COALESCE(sa.is_active, true) = true
        AND b.driver_id = driver_documents.driver_id
        AND b.status = 'confirmed'
    )
  );

-- Moderators: same, for schools they own
DROP POLICY IF EXISTS driver_documents_moderator_select ON public.driver_documents;
CREATE POLICY driver_documents_moderator_select ON public.driver_documents
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.moderators m
      JOIN public.schools sc ON sc.moderator_id = m.moderator_id
      JOIN public.students st ON st.school_id = sc.school_id
      JOIN public.bookings b ON b.student_id = st.student_id
      WHERE m.user_id = auth.uid()
        AND COALESCE(m.is_active, true) = true
        AND b.driver_id = driver_documents.driver_id
        AND b.status = 'confirmed'
    )
  );

-- Platform admins keep full access (in case RLS was just enabled on a new table)
DROP POLICY IF EXISTS driver_documents_platform_admin_all ON public.driver_documents;
CREATE POLICY driver_documents_platform_admin_all ON public.driver_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'master_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'master_admin')
    )
  );

DROP POLICY IF EXISTS driver_documents_sub_admin_select ON public.driver_documents;
CREATE POLICY driver_documents_sub_admin_select ON public.driver_documents
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'sub_admin'
    )
  );

GRANT SELECT ON public.driver_documents TO authenticated;

-- Storage: parents / school staff can open files under {driverId}/...
DROP POLICY IF EXISTS driver_documents_parent_storage_read ON storage.objects;
CREATE POLICY driver_documents_parent_storage_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND EXISTS (
      SELECT 1
      FROM public.bookings b
      JOIN public.students s ON s.student_id = b.student_id
      WHERE s.user_id = auth.uid()
        AND b.status = 'confirmed'
        AND split_part(storage.objects.name, '/', 1) = b.driver_id::text
    )
  );

DROP POLICY IF EXISTS driver_documents_school_admin_storage_read ON storage.objects;
CREATE POLICY driver_documents_school_admin_storage_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND EXISTS (
      SELECT 1
      FROM public.school_admins sa
      JOIN public.students st ON st.school_id = sa.school_id
      JOIN public.bookings b ON b.student_id = st.student_id
      WHERE sa.user_id = auth.uid()
        AND COALESCE(sa.is_active, true) = true
        AND b.status = 'confirmed'
        AND split_part(storage.objects.name, '/', 1) = b.driver_id::text
    )
  );

DROP POLICY IF EXISTS driver_documents_moderator_storage_read ON storage.objects;
CREATE POLICY driver_documents_moderator_storage_read ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'driver-documents'
    AND EXISTS (
      SELECT 1
      FROM public.moderators m
      JOIN public.schools sc ON sc.moderator_id = m.moderator_id
      JOIN public.students st ON st.school_id = sc.school_id
      JOIN public.bookings b ON b.student_id = st.student_id
      WHERE m.user_id = auth.uid()
        AND COALESCE(m.is_active, true) = true
        AND b.status = 'confirmed'
        AND split_part(storage.objects.name, '/', 1) = b.driver_id::text
    )
  );

-- ---------------------------------------------------------------------------
-- Stop parent trip alerts at the database when the school has them off.
-- Push sends that check the insert result will not fire. Client code also
-- checks the flag before sending Expo pushes that do not wait on this insert.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.skip_parent_trip_notification_when_disabled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  enabled boolean;
BEGIN
  IF NEW.type IS NULL OR NEW.type NOT IN (
    'driver_approaching',
    'driver_approaching_drop',
    'student_pickup',
    'student_picked_up',
    'student_dropoff',
    'student_dropped',
    'driver_arrived',
    'driver_wait_expired',
    'trip_start',
    'trip_started',
    'student_absent',
    'student_absent_correction'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT s.notifications_enabled INTO enabled
  FROM public.students st
  JOIN public.schools s ON s.school_id = st.school_id
  WHERE st.user_id = NEW.user_id
  LIMIT 1;

  IF enabled IS FALSE THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_skip_parent_trip_notification ON public.notifications;
CREATE TRIGGER trg_skip_parent_trip_notification
BEFORE INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.skip_parent_trip_notification_when_disabled();
