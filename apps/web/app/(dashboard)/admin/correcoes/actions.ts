"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  calcularMinutosTrabalhados,
  calcularJornada,
} from "@/services/CalculoJornada";

export interface CorrectionItem {
  id: string;
  organization_id: string;
  user_id: string;
  work_record_id: string | null;
  occurrence_date: string;
  type: "clock_in" | "clock_out" | string;
  suggested_time: string;
  justification: string;
  status: "pending" | "approved" | "rejected" | string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  organizations?: {
    id: string;
    name: string;
  } | null;
  profile?: {
    id: string;
    full_name: string;
    employee_code: string | null;
    organization_id: string;
    organizations?: {
      id: string;
      name: string;
    } | null;
  } | null;
  reviewer?: {
    id: string;
    full_name: string;
  } | null;
  work_records?: {
    clock_in: string;
    clock_out: string | null;
  } | null;
}

/**
 * Busca todas as solicitações de correção de ponto, com suporte a filtro de organização
 */
export async function getCorrections(
  organizationFilter: string = "__all__"
): Promise<{ data?: CorrectionItem[]; error?: string }> {
  try {
    const userClient = await createClient();
    const { data: claims } = await userClient.auth.getClaims();
    if (!claims?.claims?.sub) {
      return { error: "Não autenticado" };
    }

    const adminId = claims.claims.sub as string;
    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, organization_id")
      .eq("id", adminId)
      .single();

    if (!profile || !["admin", "owner"].includes(profile.role)) {
      return { error: "Sem permissão de acesso" };
    }

    let query = adminClient
      .from("point_corrections")
      .select(`
        id,
        organization_id,
        user_id,
        work_record_id,
        occurrence_date,
        type,
        suggested_time,
        justification,
        status,
        reviewed_by,
        reviewed_at,
        created_at,
        organizations (
          id,
          name
        ),
        profile:profiles!point_corrections_user_id_fkey (
          id,
          full_name,
          employee_code,
          organization_id,
          organizations (
            id,
            name
          )
        ),
        reviewer:profiles!point_corrections_reviewed_by_fkey (
          id,
          full_name
        ),
        work_records (
          clock_in,
          clock_out
        )
      `)
      .order("created_at", { ascending: false });

    if (organizationFilter && organizationFilter !== "__all__") {
      query = query.eq("organization_id", organizationFilter);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Erro ao buscar correções:", error);
      return { error: error.message };
    }

    return { data: (data as unknown as CorrectionItem[]) || [] };
  } catch (err: any) {
    console.error("Exceção ao buscar correções:", err);
    return { error: err?.message || "Erro interno ao carregar correções" };
  }
}

/**
 * Aprova ou rejeita uma solicitação de correção de ponto
 */
export async function processarAjuste(
  correctionId: string,
  actionStatus: "approved" | "rejected",
  timeValue: string
) {
  const userClient = await createClient();

  const { data: claims } = await userClient.auth.getClaims();
  if (!claims?.claims?.sub) {
    throw new Error("Não autenticado");
  }

  const adminId = claims.claims.sub as string;
  const adminClient = createAdminClient();

  const { data: adminProfile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", adminId)
    .single();

  if (!adminProfile || !["admin", "owner"].includes(adminProfile.role)) {
    throw new Error("Sem permissão para gerenciar ajustes de ponto");
  }

  const nowIso = new Date().toISOString();
  const cleanTime = timeValue.length > 5 ? timeValue.slice(0, 5) : timeValue;
  const suggestedTimeWithSeconds = `${cleanTime}:00`;

  // 1. Buscar a correção
  const { data: correction, error: fetchErr } = await adminClient
    .from("point_corrections")
    .select("*")
    .eq("id", correctionId)
    .single();

  if (fetchErr || !correction) {
    throw new Error("Solicitação de correção não encontrada.");
  }

  // 2. Atualizar o status da solicitação
  const { error: updateError } = await adminClient
    .from("point_corrections")
    .update({
      status: actionStatus,
      reviewed_by: adminId,
      reviewed_at: nowIso,
      suggested_time: suggestedTimeWithSeconds,
    })
    .eq("id", correctionId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  // 3. Registrar auditoria
  await adminClient.from("audit_logs").insert({
    organization_id: correction.organization_id,
    user_id: adminId,
    entity_type: "point_correction",
    entity_id: correction.id,
    action: actionStatus === "approved" ? "approve_correction" : "reject_correction",
    old_value: { status: correction.status },
    new_value: { status: actionStatus, approved_time: cleanTime },
    reason: "Revisão manual de ajuste pelo gestor",
  });

  // 4. Se aprovado, aplicar a correção preservando as regras de integridade do work_records
  if (actionStatus === "approved") {
    // Horário de referência em Brasília (UTC-3)
    const targetIso = new Date(`${correction.occurrence_date}T${cleanTime}:00-03:00`).toISOString();

    if (correction.work_record_id) {
      const { data: wr } = await adminClient
        .from("work_records")
        .select("*")
        .eq("id", correction.work_record_id)
        .single();

      if (wr) {
        const isClockIn = correction.type === "clock_in";
        const newClockIn = isClockIn ? targetIso : wr.clock_in;
        let newClockOut = isClockIn ? wr.clock_out : targetIso;

        // Se ambos estão presentes, recalculamos a jornada e o banco de horas
        if (newClockIn && newClockOut) {
          const inDate = new Date(newClockIn);
          let outDate = new Date(newClockOut);

          // Tratamento para jornada noturna (cross-midnight)
          if (outDate.getTime() < inDate.getTime()) {
            outDate = new Date(outDate.getTime() + 24 * 60 * 60 * 1000);
            newClockOut = outDate.toISOString();
          }

          const workedMinutes = calcularMinutosTrabalhados(inDate, outDate, wr.break_minutes || 0);

          const plannedHours = 8;
          const calculo = calcularJornada(
            { clock_in: inDate, clock_out: outDate, break_minutes: wr.break_minutes || 0 },
            { shift_hours: plannedHours },
            10
          );

          await adminClient
            .from("work_records")
            .update({
              clock_in: newClockIn,
              clock_out: newClockOut,
              worked_minutes: workedMinutes,
              overtime_minutes: Math.max(0, calculo.saldo_minutos),
              status: "adjusted",
            })
            .eq("id", wr.id);

          // Atualiza ledger do banco de horas
          if (calculo.saldo_minutos !== 0) {
            await adminClient.from("hour_bank").delete().eq("work_record_id", wr.id);
            await adminClient.from("hour_bank").insert({
              organization_id: correction.organization_id,
              user_id: correction.user_id,
              work_record_id: wr.id,
              type: calculo.saldo_minutos > 0 ? "credit" : "debit",
              minutes: Math.abs(calculo.saldo_minutos),
              reason: `Ajuste aprovado: ${correction.justification || "Correção de ponto"}`,
              reference_date: correction.occurrence_date,
            });
          }
        } else {
          // Apenas entrada presente (sem saída ainda)
          await adminClient
            .from("work_records")
            .update({
              clock_in: newClockIn,
              status: "adjusted",
            })
            .eq("id", wr.id);
        }
      }
    } else {
      // Criação de novo work_record caso não existisse registro no dia
      if (correction.type === "clock_in") {
        const { data: createdWr } = await adminClient
          .from("work_records")
          .insert({
            organization_id: correction.organization_id,
            user_id: correction.user_id,
            clock_in: targetIso,
            status: "adjusted",
          })
          .select("id")
          .single();

        if (createdWr) {
          await adminClient
            .from("point_corrections")
            .update({ work_record_id: createdWr.id })
            .eq("id", correction.id);
        }
      } else {
        // Se a correção for de saída e não havia entrada, deduz a entrada pelo plantão do dia ou horário padrão
        const { data: shift } = await adminClient
          .from("shifts")
          .select("start_at")
          .eq("user_id", correction.user_id)
          .eq("shift_date", correction.occurrence_date)
          .maybeSingle();

        const inferredClockIn =
          shift?.start_at ||
          new Date(`${correction.occurrence_date}T08:00:00-03:00`).toISOString();
        const workedMinutes = calcularMinutosTrabalhados(inferredClockIn, targetIso, 0);

        const { data: createdWr } = await adminClient
          .from("work_records")
          .insert({
            organization_id: correction.organization_id,
            user_id: correction.user_id,
            clock_in: inferredClockIn,
            clock_out: targetIso,
            worked_minutes: workedMinutes,
            status: "adjusted",
          })
          .select("id")
          .single();

        if (createdWr) {
          await adminClient
            .from("point_corrections")
            .update({ work_record_id: createdWr.id })
            .eq("id", correction.id);
        }
      }
    }
  }

  revalidatePath("/admin/correcoes");
  revalidatePath("/app/ajustes");
  revalidatePath("/app/historico");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/banco-de-horas");
  revalidatePath("/dashboard/admin/fechamento");
  return { success: true };
}
