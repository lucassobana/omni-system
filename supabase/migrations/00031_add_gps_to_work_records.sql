-- Migration 0003: Add GPS coordinates to work_records

ALTER TABLE public.work_records 
  ADD COLUMN IF NOT EXISTS clock_in_lat NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS clock_in_lng NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS clock_out_lat NUMERIC NULL,
  ADD COLUMN IF NOT EXISTS clock_out_lng NUMERIC NULL;
