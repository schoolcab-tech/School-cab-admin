-- Add per-school livestream feature flag and quality setting.
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS livestream_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS livestream_quality  TEXT    NOT NULL DEFAULT '720p'
    CONSTRAINT schools_livestream_quality_check
      CHECK (livestream_quality IN ('720p', '480p', '360p'));
