-- ============================================================
-- OMNI SYSTEM — Migration 0007: Múltiplas Organizações por Usuário
-- ============================================================
-- Permite que um mesmo usuário pertença a múltiplas organizações
-- e selecione em qual organização está ao registrar o ponto.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT user_organizations_user_org_unique UNIQUE (user_id, organization_id)
);

-- Habilita RLS
ALTER TABLE public.user_organizations ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias associações
CREATE POLICY "Users can view own user_organizations"
ON public.user_organizations FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Administradores e owners podem ver associações de sua organização
CREATE POLICY "Admins can view org user_organizations"
ON public.user_organizations FOR SELECT
TO authenticated
USING (
    organization_id IN (
        SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'owner')
);

-- Popula com as organizações primárias existentes de profiles
INSERT INTO public.user_organizations (user_id, organization_id, role)
SELECT id, organization_id, role FROM public.profiles
WHERE organization_id IS NOT NULL
ON CONFLICT (user_id, organization_id) DO NOTHING;
