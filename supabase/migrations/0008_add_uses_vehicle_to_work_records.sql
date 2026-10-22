-- ============================================================
-- OMNI SYSTEM — Migration 0008: Adiciona uses_vehicle em work_records
-- ============================================================
-- Registra se um ponto de jornada foi iniciado com uso de veículo ou não.
-- ============================================================

ALTER TABLE public.work_records
ADD COLUMN IF NOT EXISTS uses_vehicle BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.work_records.uses_vehicle
IS 'Indica se o colaborador utilizou veículo durante a jornada de trabalho.';
