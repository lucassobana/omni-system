-- ============================================================
-- OMNI SYSTEM — Migration 0004: Point Corrections
-- ============================================================
-- Cria a tabela para gerenciar solicitações de ajustes de ponto
-- e define as devidas regras de segurança (RLS).
-- ============================================================

-- 1. Cria o tipo ENUM para status se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'correction_status') THEN
        CREATE TYPE correction_status AS ENUM ('pending', 'approved', 'rejected');
    END IF;
END
$$;

-- 2. Cria a tabela point_corrections
CREATE TABLE IF NOT EXISTS public.point_corrections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    work_record_id uuid REFERENCES public.work_records(id) ON DELETE SET NULL, -- Opcional, pode não haver registro no dia
    occurrence_date date NOT NULL,
    type text NOT NULL CHECK (type IN ('clock_in', 'clock_out')),
    suggested_time time NOT NULL,
    justification text NOT NULL,
    status correction_status DEFAULT 'pending' NOT NULL,
    reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL
);

-- 3. Triggers para updated_at

-- Função caso não exista
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_point_corrections_updated_at BEFORE UPDATE ON public.point_corrections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Habilitar RLS
ALTER TABLE public.point_corrections ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Acesso

-- Colaboradores podem ler suas próprias solicitações
CREATE POLICY "Users can view their own corrections"
ON public.point_corrections
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Colaboradores podem criar solicitações na sua org
CREATE POLICY "Users can create corrections"
ON public.point_corrections
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() = user_id 
    AND organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Admin/Owner pode ler todas as solicitações da organização
CREATE POLICY "Admins can view org corrections"
ON public.point_corrections
FOR SELECT
TO authenticated
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
);

-- Admin/Owner pode atualizar solicitações (aprovar/rejeitar)
CREATE POLICY "Admins can update org corrections"
ON public.point_corrections
FOR UPDATE
TO authenticated
USING (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
)
WITH CHECK (
    organization_id = (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
);
