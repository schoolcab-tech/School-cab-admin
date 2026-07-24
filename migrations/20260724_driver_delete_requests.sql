-- ============================================================================
-- Driver delete requests — school admins request deletion; admins review/act
-- Apply via: Supabase dashboard SQL Editor, or `supabase db push`.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.driver_delete_requests (
  request_id BIGSERIAL PRIMARY KEY,
  school_admin_id BIGINT NOT NULL REFERENCES public.school_admins(school_admin_id) ON DELETE CASCADE,
  school_id BIGINT NOT NULL REFERENCES public.schools(school_id) ON DELETE RESTRICT,
  -- SET NULL so approving (deleting the driver) keeps the request for audit history
  driver_id BIGINT REFERENCES public.drivers(driver_id) ON DELETE SET NULL,
  driver_name_snapshot TEXT,
  cab_number_snapshot TEXT,
  reason TEXT NOT NULL CHECK (char_length(trim(reason)) >= 5),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safe if an earlier run created the table before snapshot columns existed
ALTER TABLE public.driver_delete_requests
  ADD COLUMN IF NOT EXISTS driver_name_snapshot TEXT;
ALTER TABLE public.driver_delete_requests
  ADD COLUMN IF NOT EXISTS cab_number_snapshot TEXT;

CREATE INDEX IF NOT EXISTS idx_driver_delete_requests_status
  ON public.driver_delete_requests(status);
CREATE INDEX IF NOT EXISTS idx_driver_delete_requests_school_admin
  ON public.driver_delete_requests(school_admin_id);
CREATE INDEX IF NOT EXISTS idx_driver_delete_requests_driver
  ON public.driver_delete_requests(driver_id);

-- Only one pending request per school-admin + driver
CREATE UNIQUE INDEX IF NOT EXISTS uq_driver_delete_requests_pending
  ON public.driver_delete_requests(school_admin_id, driver_id)
  WHERE status = 'pending' AND driver_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.update_driver_delete_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_driver_delete_requests_updated_at ON public.driver_delete_requests;
CREATE TRIGGER trg_driver_delete_requests_updated_at
BEFORE UPDATE ON public.driver_delete_requests
FOR EACH ROW EXECUTE FUNCTION public.update_driver_delete_requests_updated_at();

ALTER TABLE public.driver_delete_requests ENABLE ROW LEVEL SECURITY;

-- School admins: see / create / cancel their own requests
DROP POLICY IF EXISTS driver_delete_requests_school_admin_select ON public.driver_delete_requests;
CREATE POLICY driver_delete_requests_school_admin_select ON public.driver_delete_requests
  FOR SELECT USING (
    requested_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.school_admins sa
      WHERE sa.school_admin_id = driver_delete_requests.school_admin_id
        AND sa.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS driver_delete_requests_school_admin_insert ON public.driver_delete_requests;
CREATE POLICY driver_delete_requests_school_admin_insert ON public.driver_delete_requests
  FOR INSERT WITH CHECK (
    requested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.school_admins sa
      WHERE sa.school_admin_id = driver_delete_requests.school_admin_id
        AND sa.user_id = auth.uid()
        AND sa.is_active = true
        AND sa.school_id = driver_delete_requests.school_id
    )
  );

DROP POLICY IF EXISTS driver_delete_requests_school_admin_update ON public.driver_delete_requests;
CREATE POLICY driver_delete_requests_school_admin_update ON public.driver_delete_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.school_admins sa
      WHERE sa.school_admin_id = driver_delete_requests.school_admin_id
        AND sa.user_id = auth.uid()
    )
  );

-- Platform admins: full access
DROP POLICY IF EXISTS driver_delete_requests_admin_all ON public.driver_delete_requests;
CREATE POLICY driver_delete_requests_admin_all ON public.driver_delete_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'master_admin')
    )
  );
