-- ============================================================
-- OMNI SYSTEM — Migration 0009: Atualização de Papéis e Permissões
-- ============================================================
-- 1. Adiciona papel 'manager' (Gerente da Empresa)
-- 2. Migra 'owner' para 'admin' (Admin do Sistema)
-- 3. Adiciona campos de validação de folha em work_records
-- 4. Atualiza políticas RLS para suportar gerentes por organização
-- ============================================================

-- 1. Adiciona 'manager' ao enum public.user_role
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'manager';

-- 2. Migra usuários de 'owner' para 'admin'
UPDATE public.profiles SET role = 'admin' WHERE role = 'owner';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_organizations') THEN
    UPDATE public.user_organizations SET role = 'admin' WHERE role = 'owner';
  END IF;
END $$;

-- 3. Adiciona campos de validação e auditoria em work_records
ALTER TABLE public.work_records
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ NULL;

ALTER TABLE public.work_records
ADD COLUMN IF NOT EXISTS validated_by UUID NULL REFERENCES public.profiles(id);

COMMENT ON COLUMN public.work_records.validated_at IS 'Data/hora em que o ponto foi validado pelo gerente ou admin.';
COMMENT ON COLUMN public.work_records.validated_by IS 'ID do gerente ou admin que realizou a validação.';

-- 4. Atualiza políticas RLS para permitir que gerentes acessem dados de sua organização
DROP POLICY IF EXISTS pol_work_records_select ON public.work_records;
CREATE POLICY pol_work_records_select ON public.work_records FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR
  (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    UNION
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ) AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner'))
);

DROP POLICY IF EXISTS pol_work_records_update_manager ON public.work_records;
CREATE POLICY pol_work_records_update_manager ON public.work_records FOR UPDATE TO authenticated
USING (
  (organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    UNION
    SELECT organization_id FROM public.user_organizations WHERE user_id = auth.uid()
  ) AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager', 'owner'))
);
