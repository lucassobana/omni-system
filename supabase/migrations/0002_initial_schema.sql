-- ============================================================
-- OMNI SYSTEM — Migration 0002: Initial Schema
-- ============================================================
-- Execução: supabase/migrations/0002_initial_schema.sql
--
-- Ordem de criação:
--   1. Extensões
--   2. ENUMs
--   3. Funções auxiliares
--   4. Tabelas
--   5. Foreign Keys
--   6. Índices
--   7. Triggers de updated_at
--   8. RLS (Row Level Security)
--   9. Policies
--  10. Comentários de documentação
-- ============================================================


-- ============================================================
-- 1. EXTENSÕES
-- ============================================================

-- pgcrypto: provê gen_random_uuid() para geração de UUIDs v4.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- btree_gist: necessário para o EXCLUDE constraint de sobreposição de turnos.
CREATE EXTENSION IF NOT EXISTS "btree_gist";


-- ============================================================
-- 2. ENUMs
-- ============================================================

-- Role do usuário dentro de uma organização.
-- ENUM pois é um conjunto fechado e estável — não haverá
-- roles customizadas por usuário (decisão arquitetural).
CREATE TYPE public.user_role AS ENUM (
    'owner',
    'admin',
    'member'
);

-- Status de uma organização.
CREATE TYPE public.organization_status AS ENUM (
    'active',
    'inactive'
);

-- Status de um veículo.
CREATE TYPE public.vehicle_status AS ENUM (
    'active',
    'maintenance',
    'inactive'
);

-- Status de uma escala de trabalho.
CREATE TYPE public.schedule_status AS ENUM (
    'draft',
    'active',
    'closed'
);

-- Status de um plantão individual planejado.
CREATE TYPE public.shift_status AS ENUM (
    'scheduled',
    'confirmed',
    'completed',
    'cancelled',
    'missed'
);

-- Status de um registro de ponto/hora trabalhada.
--   open       : entrada batida, saída pendente (colaborador ainda trabalhando).
--   closed     : registro completo, revisado e aprovado.
--   adjusted   : registro alterado manualmente por admin/owner.
--   disputed   : colaborador contestou o registro; aguarda resolução.
CREATE TYPE public.work_record_status AS ENUM (
    'open',
    'closed',
    'adjusted',
    'disputed'
);

-- Tipo de movimentação no banco de horas.
CREATE TYPE public.hour_bank_type AS ENUM (
    'credit',
    'debit'
);

-- Status de uma ausência registrada.
CREATE TYPE public.absence_status AS ENUM (
    'pending',
    'approved',
    'rejected'
);


-- ============================================================
-- 3. FUNÇÕES AUXILIARES
-- ============================================================

-- ------------------------------------------------------------
-- Função: public.set_updated_at()
-- Propósito: trigger reutilizável para atualizar automaticamente
--            a coluna updated_at em qualquer tabela.
-- Uso: disparada BEFORE UPDATE em todas as tabelas com updated_at.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


-- ------------------------------------------------------------
-- Função: public.get_my_organization_id()
-- Propósito: retorna o organization_id do usuário autenticado
--            lendo diretamente a tabela profiles.
--
-- DESIGN DECISIONS:
--   • SECURITY DEFINER: executa com privilégios do dono da função,
--     permitindo bypassar o RLS de profiles sem recursão infinita.
--   • SET search_path = '': evita search_path injection — garante
--     que apenas schemas explicitamente qualificados são usados.
--   • SET LOCAL row_security = off: desabilita RLS somente dentro
--     desta transação/chamada para evitar recursão circular
--     (policy de profiles chamaria esta função que leria profiles
--     com RLS habilitado → loop infinito).
--   • Retorna NULL se auth.uid() for NULL ou se o profile
--     não existir, forçando as policies a negarem acesso.
--   • STABLE: permite caching pelo planner dentro da mesma query.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
DECLARE
    v_org_id UUID;
BEGIN
    -- Desabilita RLS localmente para evitar recursão circular
    -- ao ler a tabela profiles dentro das próprias policies de profiles.
    SET LOCAL row_security = off;

    SELECT organization_id
    INTO v_org_id
    FROM public.profiles
    WHERE id = auth.uid();

    RETURN v_org_id;
END;
$$;

-- Revoga acesso público; apenas usuários autenticados invocam a função.
REVOKE ALL ON FUNCTION public.get_my_organization_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_organization_id() TO authenticated;


-- ============================================================
-- 4. TABELAS
-- ============================================================

-- ------------------------------------------------------------
-- 4.1 organizations
-- Representa uma empresa/organização cadastrada no Omni System.
-- É o âncora de isolamento multi-tenant: todo dado operacional
-- referencia organization_id.
-- ------------------------------------------------------------
CREATE TABLE public.organizations (
    id           UUID                        NOT NULL DEFAULT gen_random_uuid(),
    name         TEXT                        NOT NULL,
    -- slug: identificador amigável para URL/subdomínio (ex: "minha-empresa")
    slug         TEXT                        NOT NULL,
    document     TEXT                        NULL,   -- CNPJ, CPF ou equivalente
    phone        TEXT                        NULL,
    email        TEXT                        NULL,
    -- address: JSONB para flexibilidade de campos de endereço
    -- Estrutura sugerida: {street, number, complement, city, state, zip, country}
    address      JSONB                       NULL,
    -- has_vehicle: indica se a org opera com veículos.
    -- Controla visibilidade da feature na UI — sem constraint de banco.
    has_vehicle  BOOLEAN                     NOT NULL DEFAULT FALSE,
    status       public.organization_status  NOT NULL DEFAULT 'active',
    created_at   TIMESTAMPTZ                 NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ                 NOT NULL DEFAULT now(),

    CONSTRAINT organizations_pkey
        PRIMARY KEY (id),

    CONSTRAINT organizations_slug_key
        UNIQUE (slug),

    -- Garante que slug seja URL-safe: letras minúsculas, números e hífens.
    CONSTRAINT organizations_slug_format
        CHECK (slug ~ '^[a-z0-9][a-z0-9\-]*[a-z0-9]$')
);


-- ------------------------------------------------------------
-- 4.2 profiles
-- Estende auth.users com dados de perfil da aplicação.
-- Relação 1:1 com auth.users — profiles.id = auth.users.id.
-- Concentra: organização do usuário e sua role.
-- ------------------------------------------------------------
CREATE TABLE public.profiles (
    -- id espelha auth.users.id, não é gerado aqui.
    id              UUID                        NOT NULL,
    organization_id UUID                        NOT NULL,
    full_name       TEXT                        NOT NULL,
    avatar_url      TEXT                        NULL,
    role            public.user_role            NOT NULL DEFAULT 'member',
    -- employee_code único por organização (não globalmente)
    employee_code   TEXT                        NULL,
    phone           TEXT                        NULL,
    hire_date       DATE                        NULL,
    status          public.organization_status  NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ                 NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ                 NOT NULL DEFAULT now(),

    CONSTRAINT profiles_pkey
        PRIMARY KEY (id),

    -- Código de funcionário único dentro da organização
    CONSTRAINT profiles_employee_code_org_unique
        UNIQUE (organization_id, employee_code)
);


-- ------------------------------------------------------------
-- 4.3 vehicles
-- Veículos pertencentes a uma organização.
-- ------------------------------------------------------------
CREATE TABLE public.vehicles (
    id              UUID                  NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID                  NOT NULL,
    name            TEXT                  NOT NULL,
    plate           TEXT                  NULL,
    model           TEXT                  NULL,
    brand           TEXT                  NULL,
    year            INTEGER               NULL,
    status          public.vehicle_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ           NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ           NOT NULL DEFAULT now(),

    CONSTRAINT vehicles_pkey
        PRIMARY KEY (id),

    -- Ano deve ser razoável
    CONSTRAINT vehicles_year_range
        CHECK (year IS NULL OR (year >= 1900 AND year <= EXTRACT(YEAR FROM now())::INTEGER + 1))
);


-- ------------------------------------------------------------
-- 4.4 schedules
-- Escala de trabalho planejada.
-- shift_hours + rest_hours descrevem o padrão da jornada.
-- Ex: 12x36 → shift_hours=12, rest_hours=36
-- ------------------------------------------------------------
CREATE TABLE public.schedules (
    id              UUID                   NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID                   NOT NULL,
    name            TEXT                   NOT NULL,
    description     TEXT                   NULL,
    start_date      DATE                   NOT NULL,
    end_date        DATE                   NULL,
    -- shift_hours: duração do turno em horas inteiras
    shift_hours     INTEGER                NOT NULL,
    -- rest_hours: descanso entre turnos em horas inteiras
    rest_hours      INTEGER                NOT NULL,
    status          public.schedule_status NOT NULL DEFAULT 'draft',
    created_at      TIMESTAMPTZ            NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ            NOT NULL DEFAULT now(),

    CONSTRAINT schedules_pkey
        PRIMARY KEY (id),

    -- end_date, quando informado, deve ser posterior a start_date
    CONSTRAINT schedules_date_range
        CHECK (end_date IS NULL OR end_date > start_date),

    CONSTRAINT schedules_shift_hours_positive
        CHECK (shift_hours > 0),

    CONSTRAINT schedules_rest_hours_positive
        CHECK (rest_hours > 0)
);


-- ------------------------------------------------------------
-- 4.5 shifts
-- Plantão individual planejado dentro de uma escala.
-- vehicle_id é opcional.
-- start_at / end_at como TIMESTAMPTZ para suportar plantões
-- que cruzam a meia-noite (ex: 19:00 → 07:00 do dia seguinte).
-- ------------------------------------------------------------
CREATE TABLE public.shifts (
    id              UUID               NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID               NOT NULL,
    schedule_id     UUID               NOT NULL,
    user_id         UUID               NOT NULL,
    vehicle_id      UUID               NULL,
    -- shift_date: data de referência do plantão (data de início).
    -- Facilita consultas por dia sem parsear timestamps.
    shift_date      DATE               NOT NULL,
    start_at        TIMESTAMPTZ        NOT NULL,
    end_at          TIMESTAMPTZ        NOT NULL,
    status          public.shift_status NOT NULL DEFAULT 'scheduled',
    notes           TEXT               NULL,
    created_at      TIMESTAMPTZ        NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ        NOT NULL DEFAULT now(),

    CONSTRAINT shifts_pkey
        PRIMARY KEY (id),

    -- end_at deve ser após start_at
    CONSTRAINT shifts_time_range
        CHECK (end_at > start_at),

    -- Previne que um usuário seja escalado em horários sobrepostos na mesma org.
    -- Usa btree_gist (extensão habilitada acima).
    CONSTRAINT shifts_no_user_overlap
        EXCLUDE USING GIST (
            user_id          WITH =,
            tstzrange(start_at, end_at, '[)') WITH &&
        )
);


-- ------------------------------------------------------------
-- 4.6 work_records
-- Registro real das horas trabalhadas (ponto eletrônico).
-- Durações sempre em minutos (INTEGER) — nunca como string "HH:MM".
-- ------------------------------------------------------------
CREATE TABLE public.work_records (
    id               UUID                      NOT NULL DEFAULT gen_random_uuid(),
    organization_id  UUID                      NOT NULL,
    user_id          UUID                      NOT NULL,
    -- shift_id é opcional: é possível registrar ponto sem plantão associado
    -- (ex: hora extra avulsa não planejada).
    shift_id         UUID                      NULL,
    clock_in         TIMESTAMPTZ               NOT NULL,
    clock_out        TIMESTAMPTZ               NULL,
    -- break_minutes: pausa em minutos (ex: 30 = meia hora de almoço)
    break_minutes    INTEGER                   NOT NULL DEFAULT 0,
    -- worked_minutes: (clock_out - clock_in) em minutos − break_minutes.
    -- NULL enquanto clock_out não foi registrado (status = 'open').
    worked_minutes   INTEGER                   NULL,
    -- overtime_minutes: minutos além do shift_hours planejado.
    overtime_minutes INTEGER                   NOT NULL DEFAULT 0,
    notes            TEXT                      NULL,
    status           public.work_record_status NOT NULL DEFAULT 'open',
    created_at       TIMESTAMPTZ               NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ               NOT NULL DEFAULT now(),

    CONSTRAINT work_records_pkey
        PRIMARY KEY (id),

    CONSTRAINT work_records_clock_range
        CHECK (clock_out IS NULL OR clock_out > clock_in),

    CONSTRAINT work_records_break_non_negative
        CHECK (break_minutes >= 0),

    CONSTRAINT work_records_worked_non_negative
        CHECK (worked_minutes IS NULL OR worked_minutes >= 0),

    CONSTRAINT work_records_overtime_non_negative
        CHECK (overtime_minutes >= 0),

    -- Consistência: clock_out preenchido ↔ worked_minutes preenchido
    CONSTRAINT work_records_worked_consistency
        CHECK (
            (clock_out IS NULL AND worked_minutes IS NULL) OR
            (clock_out IS NOT NULL AND worked_minutes IS NOT NULL)
        )
);


-- ------------------------------------------------------------
-- 4.7 hour_bank
-- Banco de horas: ledger de movimentações (crédito/débito).
-- Saldo = SUM(credit.minutes) - SUM(debit.minutes)
-- Append-only por design: sem updated_at, sem UPDATE/DELETE via RLS.
-- work_record_id é opcional (lançamentos manuais possíveis).
-- ------------------------------------------------------------
CREATE TABLE public.hour_bank (
    id              UUID                NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID                NOT NULL,
    user_id         UUID                NOT NULL,
    work_record_id  UUID                NULL,
    type            public.hour_bank_type NOT NULL,
    -- minutes: sempre positivo. O sinal é determinado por type.
    minutes         INTEGER             NOT NULL,
    -- reason: obrigatório para rastreabilidade de auditoria.
    reason          TEXT                NOT NULL,
    reference_date  DATE                NOT NULL,
    notes           TEXT                NULL,
    -- hour_bank é append-only: sem updated_at
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),

    CONSTRAINT hour_bank_pkey
        PRIMARY KEY (id),

    CONSTRAINT hour_bank_minutes_positive
        CHECK (minutes > 0)
);


-- ------------------------------------------------------------
-- 4.8 absences
-- Ausências de colaboradores.
-- type usa TEXT + CHECK (mais extensível que ENUM para domínio variável).
-- shift_id é opcional: ausência pode existir sem plantão associado.
-- ------------------------------------------------------------
CREATE TABLE public.absences (
    id              UUID                  NOT NULL DEFAULT gen_random_uuid(),
    organization_id UUID                  NOT NULL,
    user_id         UUID                  NOT NULL,
    shift_id        UUID                  NULL,
    -- type: TEXT com CHECK — expansível sem DDL de ENUM
    type            TEXT                  NOT NULL,
    start_date      DATE                  NOT NULL,
    end_date        DATE                  NULL,
    status          public.absence_status NOT NULL DEFAULT 'pending',
    reason          TEXT                  NULL,
    notes           TEXT                  NULL,
    created_at      TIMESTAMPTZ           NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ           NOT NULL DEFAULT now(),

    CONSTRAINT absences_pkey
        PRIMARY KEY (id),

    -- Tipos válidos de ausência (adicionar novos via ALTER TABLE)
    CONSTRAINT absences_type_valid
        CHECK (type IN (
            'falta',
            'ferias',
            'atestado',
            'afastamento',
            'licenca',
            'folga',
            'feriado',
            'outros'
        )),

    -- end_date, quando informado, deve ser >= start_date
    CONSTRAINT absences_date_range
        CHECK (end_date IS NULL OR end_date >= start_date)
);


-- ============================================================
-- 5. FOREIGN KEYS
-- ============================================================
-- Separadas das tabelas para clareza e para definição
-- na ordem correta sem dependências circulares.

-- profiles → auth.users (1:1)
-- CASCADE: profile deletado se o usuário for removido do Auth.
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE;

-- profiles → organizations (N:1)
-- RESTRICT: não permite deletar organização com membros.
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT;

-- vehicles → organizations (N:1)
-- RESTRICT: não permite deletar organização com veículos.
ALTER TABLE public.vehicles
    ADD CONSTRAINT vehicles_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT;

-- schedules → organizations (N:1)
-- RESTRICT: não permite deletar organização com escalas.
ALTER TABLE public.schedules
    ADD CONSTRAINT schedules_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT;

-- shifts → organizations (N:1)
ALTER TABLE public.shifts
    ADD CONSTRAINT shifts_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT;

-- shifts → schedules (N:1)
-- RESTRICT: não deletar escala com plantões vinculados.
ALTER TABLE public.shifts
    ADD CONSTRAINT shifts_schedule_id_fkey
    FOREIGN KEY (schedule_id)
    REFERENCES public.schedules (id)
    ON DELETE RESTRICT;

-- shifts → profiles (N:1)
-- RESTRICT: não deletar perfil com plantões associados.
ALTER TABLE public.shifts
    ADD CONSTRAINT shifts_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles (id)
    ON DELETE RESTRICT;

-- shifts → vehicles (N:1, opcional)
-- SET NULL: plantão permanece sem veículo se o veículo for removido.
ALTER TABLE public.shifts
    ADD CONSTRAINT shifts_vehicle_id_fkey
    FOREIGN KEY (vehicle_id)
    REFERENCES public.vehicles (id)
    ON DELETE SET NULL;

-- work_records → organizations (N:1)
ALTER TABLE public.work_records
    ADD CONSTRAINT work_records_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT;

-- work_records → profiles (N:1)
ALTER TABLE public.work_records
    ADD CONSTRAINT work_records_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles (id)
    ON DELETE RESTRICT;

-- work_records → shifts (N:1, opcional)
-- SET NULL: registro de ponto sobrevive se o plantão for removido.
ALTER TABLE public.work_records
    ADD CONSTRAINT work_records_shift_id_fkey
    FOREIGN KEY (shift_id)
    REFERENCES public.shifts (id)
    ON DELETE SET NULL;

-- hour_bank → organizations (N:1)
ALTER TABLE public.hour_bank
    ADD CONSTRAINT hour_bank_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT;

-- hour_bank → profiles (N:1)
-- RESTRICT: histórico de banco de horas não pode ser órfão.
ALTER TABLE public.hour_bank
    ADD CONSTRAINT hour_bank_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles (id)
    ON DELETE RESTRICT;

-- hour_bank → work_records (N:1, opcional)
-- SET NULL: lançamento de banco de horas sobrevive se o work_record for removido.
ALTER TABLE public.hour_bank
    ADD CONSTRAINT hour_bank_work_record_id_fkey
    FOREIGN KEY (work_record_id)
    REFERENCES public.work_records (id)
    ON DELETE SET NULL;

-- absences → organizations (N:1)
ALTER TABLE public.absences
    ADD CONSTRAINT absences_organization_id_fkey
    FOREIGN KEY (organization_id)
    REFERENCES public.organizations (id)
    ON DELETE RESTRICT;

-- absences → profiles (N:1)
ALTER TABLE public.absences
    ADD CONSTRAINT absences_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles (id)
    ON DELETE RESTRICT;

-- absences → shifts (N:1, opcional)
-- SET NULL: ausência persiste se o plantão for removido.
ALTER TABLE public.absences
    ADD CONSTRAINT absences_shift_id_fkey
    FOREIGN KEY (shift_id)
    REFERENCES public.shifts (id)
    ON DELETE SET NULL;


-- ============================================================
-- 6. ÍNDICES
-- ============================================================
-- Convenção de nome: idx_{tabela}_{coluna(s)}
-- PKs e UNIQUEs já geram índice automaticamente.
-- Índices parciais (WHERE) para colunas frequentemente filtradas
-- por valor específico (ex: shift_id IS NOT NULL).

-- profiles
CREATE INDEX idx_profiles_organization_id ON public.profiles (organization_id);
CREATE INDEX idx_profiles_status          ON public.profiles (status);
CREATE INDEX idx_profiles_role            ON public.profiles (role);

-- vehicles
CREATE INDEX idx_vehicles_organization_id ON public.vehicles (organization_id);
CREATE INDEX idx_vehicles_status          ON public.vehicles (status);

-- schedules
CREATE INDEX idx_schedules_organization_id ON public.schedules (organization_id);
CREATE INDEX idx_schedules_status          ON public.schedules (status);
CREATE INDEX idx_schedules_start_date      ON public.schedules (start_date);

-- shifts — consultas mais frequentes: por data, por usuário, por escala
CREATE INDEX idx_shifts_organization_id ON public.shifts (organization_id);
CREATE INDEX idx_shifts_schedule_id     ON public.shifts (schedule_id);
CREATE INDEX idx_shifts_user_id         ON public.shifts (user_id);
CREATE INDEX idx_shifts_shift_date      ON public.shifts (shift_date);
CREATE INDEX idx_shifts_status          ON public.shifts (status);
-- Índice parcial para vehicle_id (opcional — apenas quando preenchido)
CREATE INDEX idx_shifts_vehicle_id      ON public.shifts (vehicle_id)
    WHERE vehicle_id IS NOT NULL;
-- Índice composto para consultas de agenda: "plantões de X na org Y entre datas"
CREATE INDEX idx_shifts_org_user_date   ON public.shifts (organization_id, user_id, shift_date);

-- work_records
CREATE INDEX idx_work_records_organization_id ON public.work_records (organization_id);
CREATE INDEX idx_work_records_user_id         ON public.work_records (user_id);
CREATE INDEX idx_work_records_clock_in        ON public.work_records (clock_in);
CREATE INDEX idx_work_records_status          ON public.work_records (status);
-- Índice parcial para shift_id
CREATE INDEX idx_work_records_shift_id        ON public.work_records (shift_id)
    WHERE shift_id IS NOT NULL;
-- Índice composto para "registros abertos do usuário"
CREATE INDEX idx_work_records_org_user_status ON public.work_records (organization_id, user_id, status);

-- hour_bank — consultas de saldo e histórico por usuário e período
CREATE INDEX idx_hour_bank_organization_id ON public.hour_bank (organization_id);
CREATE INDEX idx_hour_bank_user_id         ON public.hour_bank (user_id);
CREATE INDEX idx_hour_bank_reference_date  ON public.hour_bank (reference_date);
CREATE INDEX idx_hour_bank_type            ON public.hour_bank (type);
-- Índice parcial para work_record_id
CREATE INDEX idx_hour_bank_work_record_id  ON public.hour_bank (work_record_id)
    WHERE work_record_id IS NOT NULL;
-- Índice composto para cálculo de saldo por usuário e período
CREATE INDEX idx_hour_bank_org_user_date   ON public.hour_bank (organization_id, user_id, reference_date);

-- absences
CREATE INDEX idx_absences_organization_id ON public.absences (organization_id);
CREATE INDEX idx_absences_user_id         ON public.absences (user_id);
CREATE INDEX idx_absences_start_date      ON public.absences (start_date);
CREATE INDEX idx_absences_status          ON public.absences (status);
CREATE INDEX idx_absences_type            ON public.absences (type);
-- Índice parcial para shift_id
CREATE INDEX idx_absences_shift_id        ON public.absences (shift_id)
    WHERE shift_id IS NOT NULL;


-- ============================================================
-- 7. TRIGGERS DE updated_at
-- ============================================================
-- Aplica set_updated_at() em todas as tabelas com updated_at.
-- hour_bank é append-only: sem trigger de updated_at.

CREATE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON public.vehicles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_schedules_updated_at
    BEFORE UPDATE ON public.schedules
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_shifts_updated_at
    BEFORE UPDATE ON public.shifts
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_work_records_updated_at
    BEFORE UPDATE ON public.work_records
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_absences_updated_at
    BEFORE UPDATE ON public.absences
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.organizations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_records   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hour_bank      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absences       ENABLE ROW LEVEL SECURITY;

-- FORCE RLS: garante isolamento mesmo para o role owner da tabela
ALTER TABLE public.organizations  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.schedules      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.shifts         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.work_records   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.hour_bank      FORCE ROW LEVEL SECURITY;
ALTER TABLE public.absences       FORCE ROW LEVEL SECURITY;


-- ============================================================
-- 9. POLICIES
-- ============================================================
--
-- PRINCÍPIO GERAL:
--   auth.uid() → profiles.organization_id → acesso ao dado.
--   Nunca confiar em organization_id enviado pelo frontend.
--   get_my_organization_id() é a fonte de verdade do org do usuário.
--
-- NOMENCLATURA: pol_{tabela}_{operação}[_{sufixo}]
-- ============================================================


-- ------------------------------------------------------------
-- 9.1 ORGANIZATIONS
-- Apenas membros da organização a enxergam e editam.
-- INSERT bloqueado via RLS: criação de org é server-side (signup).
-- DELETE bloqueado: desativação ocorre via status='inactive'.
-- ------------------------------------------------------------

CREATE POLICY pol_organizations_select
    ON public.organizations
    FOR SELECT
    TO authenticated
    USING (id = public.get_my_organization_id());

-- INSERT bloqueado intencionalmente: organização é criada por
-- função privilegiada server-side durante o fluxo de signup.
-- Desbloquear via service_role quando necessário.
CREATE POLICY pol_organizations_insert
    ON public.organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (FALSE);

CREATE POLICY pol_organizations_update
    ON public.organizations
    FOR UPDATE
    TO authenticated
    USING (
        id = public.get_my_organization_id()
        -- Apenas owner ou admin podem alterar dados da organização
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('owner', 'admin')
        )
    )
    WITH CHECK (id = public.get_my_organization_id());

-- Nenhuma policy de DELETE: nenhum usuário autenticado pode deletar uma organização.


-- ------------------------------------------------------------
-- 9.2 PROFILES
-- SELECT: todos da mesma org (ex: lista de funcionários).
-- INSERT: bloqueado — criado via server-side no signup.
-- UPDATE (próprio): pode editar dados pessoais, não role/org_id.
-- UPDATE (manager): admin/owner podem alterar role e status de outros.
-- DELETE: bloqueado — desativação via status='inactive'.
-- ------------------------------------------------------------

CREATE POLICY pol_profiles_select
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (organization_id = public.get_my_organization_id());

-- INSERT bloqueado: profiles são criados por trigger/função server-side.
CREATE POLICY pol_profiles_insert
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (FALSE);

-- Usuário edita o próprio profile (dados pessoais).
-- WITH CHECK garante que não pode mudar role ou organization_id.
CREATE POLICY pol_profiles_update_self
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        id = auth.uid()
        AND organization_id = public.get_my_organization_id()
    )
    WITH CHECK (
        -- Não pode mudar de organização
        organization_id = public.get_my_organization_id()
        -- Anti-escalada: role deve permanecer o mesmo
        -- Comparamos com o valor atual lido diretamente (SECURITY DEFINER via get_my_organization_id já bypassa RLS)
        AND role = (
            SELECT p.role FROM public.profiles p
            WHERE p.id = auth.uid()
            LIMIT 1
        )
    );

-- Admin ou owner atualizam outros membros da organização.
CREATE POLICY pol_profiles_update_by_manager
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        -- Alvo é da mesma organização
        organization_id = public.get_my_organization_id()
        -- Atuante é admin ou owner
        AND EXISTS (
            SELECT 1 FROM public.profiles mgr
            WHERE mgr.id = auth.uid()
              AND mgr.role IN ('admin', 'owner')
        )
        -- Não sobrepõe pol_profiles_update_self
        AND id != auth.uid()
    )
    WITH CHECK (
        -- Alvo permanece na mesma organização
        organization_id = public.get_my_organization_id()
        -- Anti-escalada de privilégio:
        -- Só owner pode promover alguém para owner.
        AND (
            role != 'owner'
            OR EXISTS (
                SELECT 1 FROM public.profiles mgr
                WHERE mgr.id = auth.uid()
                  AND mgr.role = 'owner'
            )
        )
    );


-- ------------------------------------------------------------
-- 9.3 VEHICLES
-- Members veem veículos da org; apenas admin/owner gerenciam.
-- ------------------------------------------------------------

CREATE POLICY pol_vehicles_select
    ON public.vehicles
    FOR SELECT
    TO authenticated
    USING (organization_id = public.get_my_organization_id());

CREATE POLICY pol_vehicles_insert
    ON public.vehicles
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'owner')
        )
    );

CREATE POLICY pol_vehicles_update
    ON public.vehicles
    FOR UPDATE
    TO authenticated
    USING (organization_id = public.get_my_organization_id())
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'owner')
        )
    );

CREATE POLICY pol_vehicles_delete
    ON public.vehicles
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'owner')
        )
    );


-- ------------------------------------------------------------
-- 9.4 SCHEDULES
-- Members veem escalas; admin/owner criam e gerenciam.
-- ------------------------------------------------------------

CREATE POLICY pol_schedules_select
    ON public.schedules
    FOR SELECT
    TO authenticated
    USING (organization_id = public.get_my_organization_id());

CREATE POLICY pol_schedules_insert
    ON public.schedules
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'owner')
        )
    );

CREATE POLICY pol_schedules_update
    ON public.schedules
    FOR UPDATE
    TO authenticated
    USING (organization_id = public.get_my_organization_id())
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'owner')
        )
    );

CREATE POLICY pol_schedules_delete
    ON public.schedules
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'owner')
        )
    );


-- ------------------------------------------------------------
-- 9.5 SHIFTS
-- Members veem todos os plantões da org (necessário para UI de escala).
-- Admin/owner criam, atualizam e deletam plantões.
-- ------------------------------------------------------------

CREATE POLICY pol_shifts_select
    ON public.shifts
    FOR SELECT
    TO authenticated
    USING (organization_id = public.get_my_organization_id());

CREATE POLICY pol_shifts_insert
    ON public.shifts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'owner')
        )
    );

CREATE POLICY pol_shifts_update
    ON public.shifts
    FOR UPDATE
    TO authenticated
    USING (organization_id = public.get_my_organization_id())
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'owner')
        )
    );

CREATE POLICY pol_shifts_delete
    ON public.shifts
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'owner')
        )
    );


-- ------------------------------------------------------------
-- 9.6 WORK_RECORDS
-- Members veem/criam apenas os próprios registros.
-- Admin/owner veem e gerenciam todos da org.
-- Member só pode atualizar registro próprio com status open/disputed.
-- Apenas owner pode deletar (excepcional).
-- ------------------------------------------------------------

CREATE POLICY pol_work_records_select
    ON public.work_records
    FOR SELECT
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.role IN ('admin', 'owner')
            )
        )
    );

CREATE POLICY pol_work_records_insert
    ON public.work_records
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND (
            -- Membro registra apenas o próprio ponto
            user_id = auth.uid()
            -- Admin/owner registram ponto de qualquer membro
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.role IN ('admin', 'owner')
            )
        )
    );

-- Member: atualiza apenas o próprio registro quando open ou disputed
CREATE POLICY pol_work_records_update_self
    ON public.work_records
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND user_id = auth.uid()
        AND status IN ('open', 'disputed')
    )
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND user_id = auth.uid()
    );

-- Admin/owner: atualizam qualquer registro da org (ajustes, aprovações)
CREATE POLICY pol_work_records_update_manager
    ON public.work_records
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'owner')
        )
    )
    WITH CHECK (
        organization_id = public.get_my_organization_id()
    );

-- Apenas owner pode deletar (caso excepcional e auditável)
CREATE POLICY pol_work_records_delete
    ON public.work_records
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'owner'
        )
    );


-- ------------------------------------------------------------
-- 9.7 HOUR_BANK
-- Ledger imutável: sem UPDATE e DELETE via RLS.
-- Members veem apenas o próprio histórico.
-- Admin/owner veem e inserem lançamentos para qualquer membro.
-- ------------------------------------------------------------

CREATE POLICY pol_hour_bank_select
    ON public.hour_bank
    FOR SELECT
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.role IN ('admin', 'owner')
            )
        )
    );

CREATE POLICY pol_hour_bank_insert
    ON public.hour_bank
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'owner')
        )
    );

-- Sem policies de UPDATE e DELETE: hour_bank é imutável.
-- Correções são feitas por lançamentos de estorno (novo registro inverso).


-- ------------------------------------------------------------
-- 9.8 ABSENCES
-- Members veem/solicitam as próprias ausências.
-- Admin/owner veem todas e aprovam/rejeitam.
-- Member pode cancelar apenas ausências próprias pendentes.
-- Owner pode deletar (caso excepcional).
-- ------------------------------------------------------------

CREATE POLICY pol_absences_select
    ON public.absences
    FOR SELECT
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.role IN ('admin', 'owner')
            )
        )
    );

-- Member solicita ausência própria; admin/owner para qualquer membro
CREATE POLICY pol_absences_insert
    ON public.absences
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.profiles p
                WHERE p.id = auth.uid()
                  AND p.role IN ('admin', 'owner')
            )
        )
    );

-- Admin/owner aprovam ou rejeitam ausências de qualquer membro
CREATE POLICY pol_absences_update_manager
    ON public.absences
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role IN ('admin', 'owner')
        )
    )
    WITH CHECK (
        organization_id = public.get_my_organization_id()
    );

-- Member: pode retirar solicitação própria ainda pendente
CREATE POLICY pol_absences_update_self_cancel
    ON public.absences
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND user_id = auth.uid()
        AND status = 'pending'
    )
    WITH CHECK (
        organization_id = public.get_my_organization_id()
        AND user_id = auth.uid()
        -- Membro só pode manter pending (não pode aprovar/rejeitar a si mesmo)
        AND status = 'pending'
    );

-- Apenas owner pode deletar ausências (excepcional e auditável)
CREATE POLICY pol_absences_delete
    ON public.absences
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.get_my_organization_id()
        AND EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND p.role = 'owner'
        )
    );


-- ============================================================
-- 10. COMENTÁRIOS DE DOCUMENTAÇÃO
-- ============================================================

COMMENT ON TABLE  public.organizations
    IS 'Empresas/organizações cadastradas no Omni System. Âncora de isolamento multi-tenant.';
COMMENT ON COLUMN public.organizations.slug
    IS 'Identificador URL-safe único. Formato: letras minúsculas, números e hífens (ex: minha-empresa).';
COMMENT ON COLUMN public.organizations.has_vehicle
    IS 'Flag que indica se a org opera com veículos. Controla visibilidade da feature na UI.';
COMMENT ON COLUMN public.organizations.address
    IS 'Endereço em JSONB. Estrutura sugerida: {street, number, complement, city, state, zip, country}.';

COMMENT ON TABLE  public.profiles
    IS 'Estende auth.users com perfil, organização e role. profiles.id = auth.users.id (1:1).';
COMMENT ON COLUMN public.profiles.id
    IS 'Espelha auth.users.id. Inserido por função server-side no signup — não gerado automaticamente.';
COMMENT ON COLUMN public.profiles.role
    IS 'Role do usuário: owner > admin > member. Proteção anti-escalada aplicada via RLS policies.';
COMMENT ON COLUMN public.profiles.organization_id
    IS 'Determina o escopo de acesso a todos os dados via RLS. Nunca alterar via frontend sem validação.';

COMMENT ON TABLE  public.vehicles
    IS 'Veículos pertencentes a uma organização. Relevante quando organizations.has_vehicle = TRUE.';

COMMENT ON TABLE  public.schedules
    IS 'Escalas de trabalho planejadas. shift_hours + rest_hours descrevem o padrão da jornada.';
COMMENT ON COLUMN public.schedules.shift_hours
    IS 'Duração do turno em horas inteiras. Ex: 12 para jornada 12x36.';
COMMENT ON COLUMN public.schedules.rest_hours
    IS 'Descanso entre turnos em horas inteiras. Ex: 36 para jornada 12x36.';

COMMENT ON TABLE  public.shifts
    IS 'Plantões individuais planejados dentro de uma escala. Difere de work_records (planejado vs. realizado).';
COMMENT ON COLUMN public.shifts.shift_date
    IS 'Data de referência do plantão (normalmente a data de início). Facilita filtros por dia.';
COMMENT ON COLUMN public.shifts.vehicle_id
    IS 'Opcional. Veículo designado para o plantão. NULL = plantão sem veículo.';

COMMENT ON TABLE  public.work_records
    IS 'Registros reais de horas trabalhadas (ponto eletrônico). Contraparte realizada dos shifts planejados.';
COMMENT ON COLUMN public.work_records.break_minutes
    IS 'Pausa em minutos. Ex: 30 = meia hora de almoço. Descontado do worked_minutes.';
COMMENT ON COLUMN public.work_records.worked_minutes
    IS 'Minutos trabalhados = (clock_out - clock_in) − break_minutes. NULL enquanto status = open.';
COMMENT ON COLUMN public.work_records.overtime_minutes
    IS 'Minutos além do planejado. Alimenta lançamentos no hour_bank.';

COMMENT ON TABLE  public.hour_bank
    IS 'Ledger de banco de horas. Append-only: saldo = SUM(credit) - SUM(debit). Correções via estorno.';
COMMENT ON COLUMN public.hour_bank.minutes
    IS 'Quantidade de minutos. Sempre positivo — o sinal é determinado por type (credit/debit).';
COMMENT ON COLUMN public.hour_bank.reason
    IS 'Motivo obrigatório do lançamento para auditoria e rastreabilidade.';

COMMENT ON TABLE  public.absences
    IS 'Ausências de colaboradores. type usa TEXT+CHECK para extensibilidade sem DDL de ENUM.';
COMMENT ON COLUMN public.absences.shift_id
    IS 'Plantão relacionado à ausência. Opcional — ausência pode existir sem plantão associado.';

COMMENT ON FUNCTION public.get_my_organization_id()
    IS 'Retorna o organization_id do usuário autenticado. SECURITY DEFINER + row_security=off para evitar recursão de RLS. Resultado: NULL se não autenticado ou sem profile.';
COMMENT ON FUNCTION public.set_updated_at()
    IS 'Trigger BEFORE UPDATE: atualiza updated_at = now(). Reutilizável em qualquer tabela.';
