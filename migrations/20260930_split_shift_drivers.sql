-- Morning / evening drivers on a single monthly booking (one payment, split legs).
-- Apply via Supabase SQL Editor, or `supabase db push`.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS morning_driver_id BIGINT REFERENCES public.drivers(driver_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evening_driver_id BIGINT REFERENCES public.drivers(driver_id) ON DELETE SET NULL;

COMMENT ON COLUMN public.bookings.morning_driver_id IS
  'Driver for morning pickup; NULL means use driver_id (billed driver).';
COMMENT ON COLUMN public.bookings.evening_driver_id IS
  'Driver for evening drop; NULL means use driver_id (billed driver).';

CREATE INDEX IF NOT EXISTS idx_bookings_morning_driver
  ON public.bookings(morning_driver_id)
  WHERE morning_driver_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_evening_driver
  ON public.bookings(evening_driver_id)
  WHERE evening_driver_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- driver_documents: allow access for billed + shift drivers on confirmed bookings
-- ---------------------------------------------------------------------------
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
        AND b.status = 'confirmed'
        AND (
          b.driver_id = driver_documents.driver_id
          OR b.morning_driver_id = driver_documents.driver_id
          OR b.evening_driver_id = driver_documents.driver_id
        )
    )
  );

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
        AND b.status = 'confirmed'
        AND (
          b.driver_id = driver_documents.driver_id
          OR b.morning_driver_id = driver_documents.driver_id
          OR b.evening_driver_id = driver_documents.driver_id
        )
    )
  );

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
        AND b.status = 'confirmed'
        AND (
          b.driver_id = driver_documents.driver_id
          OR b.morning_driver_id = driver_documents.driver_id
          OR b.evening_driver_id = driver_documents.driver_id
        )
    )
  );

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
        AND split_part(storage.objects.name, '/', 1) IN (
          b.driver_id::text,
          b.morning_driver_id::text,
          b.evening_driver_id::text
        )
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
        AND split_part(storage.objects.name, '/', 1) IN (
          b.driver_id::text,
          b.morning_driver_id::text,
          b.evening_driver_id::text
        )
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
        AND split_part(storage.objects.name, '/', 1) IN (
          b.driver_id::text,
          b.morning_driver_id::text,
          b.evening_driver_id::text
        )
    )
  );
