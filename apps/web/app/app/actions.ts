"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface UserOrgItem {
  id: string;
  name: string;
  hasVehicle: boolean;
}

export interface AppDashboardData {
  userId: string;
  userName: string;
  organizationId: string;
  userOrganizations: UserOrgItem[];
  openWorkRecord: {
    id: string;
    clockIn: string;
    organizationId: string;
    organizationName: string;
    usesVehicle: boolean;
  } | null;
}

export async function getAppDashboardData(): Promise<{ data?: AppDashboardData; error?: string }> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) return { error: "Não autenticado." };

  const userId = claims.claims.sub as string;

  const { data: profile, error: pErr } = await supabase
    .from("profiles")
    .select("full_name, organization_id")
    .eq("id", userId)
    .single();

  if (pErr || !profile) return { error: "Perfil não encontrado." };

  // 1. Busca todas as organizações vinculadas ao usuário
  const orgList: UserOrgItem[] = [];
  const seenOrgIds = new Set<string>();

  // A. IDs das organizações no user_metadata
  const userMetaOrgs: string[] = [];
  const claimsMeta = (claims.claims.user_metadata as Record<string, unknown> | undefined)?.organization_ids;
  if (Array.isArray(claimsMeta)) {
    for (const item of claimsMeta) {
      if (typeof item === "string") userMetaOrgs.push(item);
    }
  }

  // Se não veio nas claims, consulta via auth.admin
  if (userMetaOrgs.length === 0) {
    try {
      const { data: authUser } = await adminClient.auth.admin.getUserById(userId);
      const meta = authUser?.user?.user_metadata?.organization_ids;
      if (Array.isArray(meta)) {
        for (const item of meta) {
          if (typeof item === "string") userMetaOrgs.push(item);
        }
      }
    } catch {
      // Ignora erro
    }
  }

  // B. Também busca na tabela user_organizations (se disponível no banco)
  try {
    const { data: userOrgs, error: uoErr } = await adminClient
      .from("user_organizations")
      .select("organization_id, organizations(id, name, status, has_vehicle)")
      .eq("user_id", userId);

    if (!uoErr && userOrgs && userOrgs.length > 0) {
      for (const uo of userOrgs) {
        const rawOrg = uo.organizations as unknown;
        const org = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as { id: string; name: string; status: string; has_vehicle?: boolean } | null;
        if (org && org.status === "active" && !seenOrgIds.has(org.id)) {
          seenOrgIds.add(org.id);
          orgList.push({ id: org.id, name: org.name, hasVehicle: Boolean(org.has_vehicle) });
        }
      }
    }
  } catch {
    // Tabela user_organizations opcional
  }

  // C. Garante a resolução de todas as organizações adicionais (user_metadata e perfil primário)
  const allTargetOrgIds = Array.from(new Set([
    ...userMetaOrgs,
    ...(profile.organization_id ? [profile.organization_id] : [])
  ]));

  for (const orgId of allTargetOrgIds) {
    if (!seenOrgIds.has(orgId)) {
      const { data: orgData } = await adminClient
        .from("organizations")
        .select("id, name, status, has_vehicle")
        .eq("id", orgId)
        .maybeSingle();

      if (orgData && orgData.status === "active") {
        seenOrgIds.add(orgData.id);
        orgList.push({
          id: orgData.id,
          name: orgData.name,
          hasVehicle: Boolean(orgData.has_vehicle),
        });
      }
    }
  }

  // 2. Busca se há um ponto em andamento (status = 'open') em QUALQUER organização
  const { data: workRecord } = await adminClient
    .from("work_records")
    .select("id, clock_in, organization_id, notes, organizations(id, name, has_vehicle)")
    .eq("user_id", userId)
    .eq("status", "open")
    .order("clock_in", { ascending: false })
    .limit(1)
    .maybeSingle();

  interface RawWorkRecordWithVehicle {
    id: string;
    clock_in: string;
    organization_id: string;
    notes?: string | null;
    uses_vehicle?: boolean | null;
    organizations?: { id: string; name: string; has_vehicle?: boolean } | null;
  }

  const rawWr = workRecord as unknown as RawWorkRecordWithVehicle | null;

  const openWorkRecord = rawWr
    ? {
        id: rawWr.id,
        clockIn: rawWr.clock_in,
        organizationId: rawWr.organization_id,
        organizationName: rawWr.organizations?.name || "Organização",
        usesVehicle: Boolean(rawWr.uses_vehicle ?? rawWr.notes?.includes("USES_VEHICLE:true")),
      }
    : null;

  const defaultOrgId = openWorkRecord
    ? openWorkRecord.organizationId
    : orgList.length > 0
    ? orgList[0].id
    : profile.organization_id || "";

  return {
    data: {
      userId,
      userName: profile.full_name,
      organizationId: defaultOrgId,
      userOrganizations: orgList,
      openWorkRecord,
    },
  };
}

export async function registrarPontoOnline({
  organizationId,
  userId,
  workRecordId,
  lat,
  lng,
  isClockOut,
  usesVehicle,
  vehicleReason,
}: {
  organizationId: string;
  userId: string;
  workRecordId: string | null;
  lat: number | null;
  lng: number | null;
  isClockOut: boolean;
  declaredHours?: number | null;
  usesVehicle?: boolean;
  vehicleReason?: string;
}): Promise<{ success?: boolean; error?: string; workRecordId?: string }> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims || claims.claims.sub !== userId) {
    return { error: "Não autorizado." };
  }

  const nowIso = new Date().toISOString();

  if (isClockOut) {
    // ── 1. REGISTRAR SAÍDA ─────────────────────────────────────────────
    let targetRecordId = workRecordId && workRecordId !== "temp" ? workRecordId : null;

    // Se o workRecordId não foi informado ou é temporário, busca o registro aberto do usuário
    if (!targetRecordId) {
      const { data: openWr } = await adminClient
        .from("work_records")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "open")
        .order("clock_in", { ascending: false })
        .limit(1)
        .maybeSingle();

      targetRecordId = openWr?.id ?? null;
    }

    if (!targetRecordId) {
      return { error: "Nenhum registro de ponto em andamento encontrado para registrar saída." };
    }

    const { data: wr, error: wrError } = await adminClient
      .from("work_records")
      .select("*")
      .eq("id", targetRecordId)
      .single();

    if (wrError || !wr) return { error: "Registro de entrada não encontrado." };

    const targetOrgId = wr.organization_id || organizationId;

    // Calcula duração trabalhada em minutos
    const clockInTime = new Date(wr.clock_in).getTime();
    const clockOutTime = new Date(nowIso).getTime();
    const breakMinutes = wr.break_minutes || 0;
    const workedMinutes = Math.max(0, Math.floor((clockOutTime - clockInTime) / 60000) - breakMinutes);

    // Atualiza o work_record estritamente com as colunas existentes no banco
    const { error: updateError } = await adminClient
      .from("work_records")
      .update({
        clock_out: nowIso,
        clock_out_lat: lat,
        clock_out_lng: lng,
        worked_minutes: workedMinutes,
        status: "closed",
      })
      .eq("id", targetRecordId);

    if (updateError) {
      console.error("Erro ao registrar saída em work_records:", updateError);
      return { error: updateError.message };
    }

    // Registra punch na tabela time_punches se existir (não bloqueante)
    try {
      await adminClient.from("time_punches").insert({
        organization_id: targetOrgId,
        user_id: userId,
        work_record_id: targetRecordId,
        punched_at: nowIso,
        type: "EXIT",
        source: "web",
      });
    } catch {
      // Ignora se tabela não existir
    }

    revalidatePath("/app");
    revalidatePath("/app/historico");
    revalidatePath("/dashboard/admin");
    return { success: true, workRecordId: targetRecordId };

  } else {
    // ── 2. REGISTRAR ENTRADA ───────────────────────────────────────────
    // Bloqueio rigoroso cross-organization:
    // O usuário não pode bater entrada se já tiver um ponto aberto em QUALQUER organização.
    const { data: openExisting } = await adminClient
      .from("work_records")
      .select("id, organization_id, organizations(name)")
      .eq("user_id", userId)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();

    if (openExisting) {
      const orgName = (openExisting.organizations as { name?: string } | null)?.name || "outra organização";
      return {
        error: `Você já possui um ponto em andamento na organização "${orgName}". Registre a saída antes de iniciar um novo ponto.`,
      };
    }

    if (!organizationId) {
      return { error: "Selecione uma organização para registrar a entrada." };
    }

    const recordPayload: Record<string, unknown> = {
      organization_id: organizationId,
      user_id: userId,
      shift_id: null, // Sem escala vinculada
      clock_in: nowIso,
      clock_in_lat: lat,
      clock_in_lng: lng,
      status: "open",
      notes: usesVehicle
        ? "USES_VEHICLE:true"
        : `USES_VEHICLE:false VEICULO_MOTIVO:${vehicleReason ? vehicleReason.trim() : "Manutenção"}`,
    };

    let newWr = null;
    const { data: wrWithCol, error: insertError1 } = await adminClient
      .from("work_records")
      .insert({
        ...recordPayload,
        uses_vehicle: Boolean(usesVehicle),
      })
      .select("id")
      .single();

    if (!insertError1) {
      newWr = wrWithCol;
    } else if (insertError1.message.includes("uses_vehicle")) {
      const { data: wrFallback, error: insertError2 } = await adminClient
        .from("work_records")
        .insert(recordPayload)
        .select("id")
        .single();

      if (insertError2) {
        console.error("Erro ao inserir work_record:", insertError2);
        return { error: insertError2.message };
      }
      newWr = wrFallback;
    } else {
      console.error("Erro ao inserir work_record:", insertError1);
      return { error: insertError1.message };
    }

    // Registra na tabela time_punches se existir (não bloqueante)
    try {
      await adminClient.from("time_punches").insert({
        organization_id: organizationId,
        user_id: userId,
        work_record_id: newWr.id,
        punched_at: nowIso,
        type: "ENTRY",
        source: "web",
      });
    } catch {
      // Ignora se tabela não existir
    }

    revalidatePath("/app");
    revalidatePath("/app/historico");
    revalidatePath("/dashboard/admin");
    return { success: true, workRecordId: newWr.id };
  }
}
