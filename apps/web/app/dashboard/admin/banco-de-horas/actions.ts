"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface SaldoFuncionario {
  userId: string;
  fullName: string;
  employeeCode: string | null;
  saldoMinutos: number; // Positivo = Crédito, Negativo = Débito
  organizationName?: string;
  organizationId?: string;
}

export interface LancamentoHourBank {
  id: string;
  userId: string;
  type: "credit" | "debit";
  minutes: number;
  reason: string;
  referenceDate: string;
  notes: string | null;
  createdAt: string;
}

/** Busca os saldos agrupados de todos os funcionários da org ou de todas as empresas */
export async function getSaldosBancoDeHoras(
  organizationId: string
): Promise<{ data?: SaldoFuncionario[]; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const isAll = !organizationId || organizationId === "__all__";

    // 1. Busca perfis
    let query = adminClient
      .from("profiles")
      .select("id, full_name, employee_code, organization_id, organizations(name)")
      .eq("status", "active")
      .order("full_name");

    if (!isAll) {
      query = query.eq("organization_id", organizationId);
    }

    const { data: rawProfiles, error: pErr } = await query;
    if (pErr) return { error: pErr.message };

    // 2. Busca todos os lançamentos
    let hbQuery = adminClient
      .from("hour_bank")
      .select("user_id, type, minutes, organization_id");

    if (!isAll) {
      hbQuery = hbQuery.eq("organization_id", organizationId);
    }

    const { data: lancamentos, error: lErr } = await hbQuery;
    if (lErr) return { error: lErr.message };

    // Agrupa saldos
    const saldosMap: Record<string, number> = {};
    for (const l of lancamentos || []) {
      const min = l.minutes;
      saldosMap[l.user_id] = (saldosMap[l.user_id] || 0) + (l.type === "credit" ? min : -min);
    }

    interface ProfileRowWithOrg {
      id: string;
      full_name: string;
      employee_code: string | null;
      organization_id: string;
      organizations: unknown;
    }

    const profiles = (rawProfiles || []) as unknown as ProfileRowWithOrg[];

    const data: SaldoFuncionario[] = profiles.map((p) => {
      const rawOrg = p.organizations;
      const org = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as { name: string } | null;
      return {
        userId: p.id,
        fullName: p.full_name,
        employeeCode: p.employee_code,
        saldoMinutos: saldosMap[p.id] || 0,
        organizationName: org?.name || "Empresa",
        organizationId: p.organization_id,
      };
    });

    return { data };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao buscar saldos do banco de horas";
    return { error: msg };
  }
}

/** Busca o extrato de um funcionário específico */
export async function getExtratoFuncionario(
  userId: string,
  organizationId: string
): Promise<{ data?: LancamentoHourBank[]; error?: string }> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from("hour_bank")
    .select("id, user_id, type, minutes, reason, reference_date, notes, created_at")
    .eq("user_id", userId)
    .order("reference_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (organizationId && organizationId !== "__all__") {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

  if (error) return { error: error.message };

  const formatted: LancamentoHourBank[] = (data || []).map((d) => ({
    id: d.id,
    userId: d.user_id,
    type: d.type,
    minutes: d.minutes,
    reason: d.reason,
    referenceDate: d.reference_date,
    notes: d.notes,
    createdAt: d.created_at,
  }));

  return { data: formatted };
}

/** Insere um ajuste manual no banco de horas */
export async function inserirLancamentoManual({
  organizationId,
  userId,
  type,
  minutes,
  reason,
  referenceDate,
  notes,
}: {
  organizationId: string;
  userId: string;
  type: "credit" | "debit";
  minutes: number;
  reason: string;
  referenceDate: string;
  notes?: string;
}): Promise<{ error?: string }> {
  const adminClient = createAdminClient();

  if (minutes <= 0) {
    return { error: "A quantidade de minutos deve ser maior que zero." };
  }

  // Se organizationId for __all__, busca a organization_id do usuário em profiles
  let targetOrgId = organizationId;
  if (!targetOrgId || targetOrgId === "__all__") {
    const { data: p } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("id", userId)
      .single();
    targetOrgId = p?.organization_id || "";
  }

  const { error } = await adminClient.from("hour_bank").insert({
    organization_id: targetOrgId,
    user_id: userId,
    type,
    minutes,
    reason,
    reference_date: referenceDate,
    notes: notes || null,
  });

  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin/banco-de-horas");
  revalidatePath("/dashboard");
  return {};
}
