-- Fix: student_attendance driver_id FK was blocking driver deletion
-- Change FK to ON DELETE SET NULL so deleting a driver
-- preserves historical attendance records but clears the driver reference.

ALTER TABLE public.student_attendance
  DROP CONSTRAINT IF EXISTS student_attendance_driver_id_fkey;

ALTER TABLE public.student_attendance
  ADD CONSTRAINT student_attendance_driver_id_fkey
  FOREIGN KEY (driver_id)
  REFERENCES public.drivers(driver_id)
  ON DELETE SET NULL;
