-- Convert all entity-level deletes to soft deletes.
-- Adds a deleted_at column to every table where the admin panel
-- previously issued hard DELETE statements for entity records.

-- ── drivers ────────────────────────────────────────────────────────────────
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ── students ───────────────────────────────────────────────────────────────
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ── schools ────────────────────────────────────────────────────────────────
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ── driver_documents ───────────────────────────────────────────────────────
ALTER TABLE public.driver_documents
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ── website leads ──────────────────────────────────────────────────────────
ALTER TABLE public.website_contact_form_response
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE public.website_lead_booking
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- ── Helpful indexes for the IS NULL filter used on every list query ────────
CREATE INDEX IF NOT EXISTS idx_drivers_deleted_at
  ON public.drivers (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_students_deleted_at
  ON public.students (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_schools_deleted_at
  ON public.schools (deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_driver_documents_deleted_at
  ON public.driver_documents (deleted_at) WHERE deleted_at IS NULL;
