-- ============================================================
-- OMNI SYSTEM — Migration 0005: Advanced Time Tracking
-- ============================================================
-- Este script evolui o sistema de ponto básico para um 
-- modelo auditável, adicionando time_punches, occurrences,
-- audit_logs e suporte a declarações de jornada em work_records.
-- ============================================================

-- 1. Novos status para work_records
ALTER TYPE public.work_record_status ADD VALUE IF NOT EXISTS 'awaiting_continuation';
ALTER TYPE public.work_record_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE public.work_record_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE public.work_record_status ADD VALUE IF NOT EXISTS 'correction_required';
ALTER TYPE public.work_record_status ADD VALUE IF NOT EXISTS 'cancelled';

-- 2. Expandindo work_records
ALTER TABLE public.work_records
ADD COLUMN IF NOT EXISTS declared_shift_hours_initial INTEGER,
ADD COLUMN IF NOT EXISTS declared_shift_hours_current INTEGER,
ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(5,2);

-- 3. Tipos para as novas tabelas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'punch_type') THEN
        CREATE TYPE public.punch_type AS ENUM ('ENTRY', 'EXIT');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'occurrence_type') THEN
        CREATE TYPE public.occurrence_type AS ENUM (
            'MISSING_ENTRY', 'MISSING_EXIT', 'EARLY_EXIT', 'LATE_ENTRY',
            'JORNADA_INFERIOR', 'JORNADA_SUPERIOR', 'POSSIBLE_FORGOTTEN_EXIT',
            'SHIFT_MISMATCH', 'DECLARED_SHIFT_MISMATCH', 'OVERTIME_PENDING',
            'MANUAL_CORRECTION'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'occurrence_status') THEN
        CREATE TYPE public.occurrence_status AS ENUM (
            'PENDING', 'APPROVED', 'REJECTED', 'CORRECTED', 'CANCELLED'
        );
    END IF;
END
$$;

-- 4. Tabela time_punches (Marcações Reais)
CREATE TABLE IF NOT EXISTS public.time_punches (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    work_record_id UUID REFERENCES public.work_records(id) ON DELETE CASCADE,
    punched_at TIMESTAMPTZ NOT NULL,
    type public.punch_type NOT NULL,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabela occurrences (Ocorrências e Divergências)
CREATE TABLE IF NOT EXISTS public.occurrences (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    work_record_id UUID REFERENCES public.work_records(id) ON DELETE CASCADE,
    type public.occurrence_type NOT NULL,
    status public.occurrence_status NOT NULL DEFAULT 'PENDING',
    description TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para updated_at de occurrences
CREATE TRIGGER trg_occurrences_updated_at BEFORE UPDATE ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Tabela audit_logs (Auditoria)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Segurança (RLS)
ALTER TABLE public.time_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- time_punches policies
CREATE POLICY "Users can view their own time_punches" ON public.time_punches FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view org time_punches" ON public.time_punches FOR SELECT TO authenticated USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner'));

-- occurrences policies
CREATE POLICY "Users can view their own occurrences" ON public.occurrences FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view org occurrences" ON public.occurrences FOR SELECT TO authenticated USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner'));

-- audit_logs policies
CREATE POLICY "Admins can view org audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid()) AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner'));
