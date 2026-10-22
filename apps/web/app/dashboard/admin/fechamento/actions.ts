"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export type {
  FechamentoItem,
  WorkRecordDetail,
  FechamentoDiaItem,
  FechamentoRelatorioFuncionario,
  FechamentoPeriodType,
} from "./utils";

import {
  type FechamentoItem,
  type WorkRecordDetail,
  type FechamentoDiaItem,
  type FechamentoRelatorioFuncionario,
  type FechamentoPeriodType,
  DIAS_SEMANA_NOMES,
  getFechamentoDateRange,
} from "./utils";

interface ProfileRowWithOrg {
  id: string;
  full_name: string;
  employee_code: string | null;
  organization_id: string;
  organizations: unknown;
}

interface WorkRecordRow {
  id: string;
  user_id: string;
  shift_id: string | null;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  worked_minutes: number | null;
  status: "open" | "closed" | "adjusted" | "disputed";
  notes?: string | null;
}

export async function getConsolidadoMensal(
  organizationId: string,
  year: number,
  month: number,
  periodType: FechamentoPeriodType = "cutoff_21_20"
): Promise<{ data?: FechamentoItem[]; periodoFormatado?: string; error?: string }> {
  try {
    const adminClient = createAdminClient();
    const isAll = !organizationId || organizationId === "__all__";

    const { startIsoDate, endIsoDate, startIsoTime, endIsoTime, periodoFormatado } =
      getFechamentoDateRange(year, month, periodType);

    // 1. Perfis
    let profilesQuery = adminClient
      .from("profiles")
      .select("id, full_name, employee_code, organization_id, organizations(name)")
      .eq("status", "active")
      .order("full_name");

    if (!isAll) {
      profilesQuery = profilesQuery.eq("organization_id", organizationId);
    }

    const { data: rawProfiles, error: pErr } = await profilesQuery;
    if (pErr) return { error: pErr.message };

    // 2. Shifts do mês
    let shiftsQuery = adminClient
      .from("shifts")
      .select("id, user_id, start_at, end_at, status, organization_id")
      .gte("shift_date", startIsoDate)
      .lte("shift_date", endIsoDate);

    if (!isAll) {
      shiftsQuery = shiftsQuery.eq("organization_id", organizationId);
    }

    const { data: rawShifts, error: sErr } = await shiftsQuery;
    if (sErr) return { error: sErr.message };
    const shifts = rawShifts || [];

    // 3. Work Records do mês
    let wrsQuery = adminClient
      .from("work_records")
      .select("id, user_id, shift_id, clock_in, clock_out, break_minutes, worked_minutes, status, organization_id")
      .gte("clock_in", startIsoTime)
      .lte("clock_in", endIsoTime);

    if (!isAll) {
      wrsQuery = wrsQuery.eq("organization_id", organizationId);
    }

    const { data: rawWrs, error: wErr } = await wrsQuery;
    if (wErr) return { error: wErr.message };
    const wrs = (rawWrs || []) as unknown as WorkRecordRow[];

    // 4. Hour Bank do mês
    let hbQuery = adminClient
      .from("hour_bank")
      .select("user_id, type, minutes, organization_id")
      .gte("reference_date", startIsoDate)
      .lte("reference_date", endIsoDate);

    if (!isAll) {
      hbQuery = hbQuery.eq("organization_id", organizationId);
    }

    const { data: hourBanks, error: hErr } = await hbQuery;
    if (hErr) return { error: hErr.message };

    const profiles = (rawProfiles || []) as unknown as ProfileRowWithOrg[];

    // Agrupar
    const result: FechamentoItem[] = profiles.map((p) => {
      const rawOrg = p.organizations;
      const org = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as { name: string } | null;
      return {
        userId: p.id,
        userName: p.full_name,
        employeeCode: p.employee_code,
        horasPrevistasMin: 0,
        horasRealizadasMin: 0,
        qtdFaltas: 0,
        saldoMesMin: 0,
        temPendencia: false,
        isValidated: false,
        totalRecords: 0,
        organizationName: org?.name || "Empresa",
        organizationId: p.organization_id,
      };
    });

    const itemMap = new Map(result.map(r => [r.userId, r]));

    // Previsto e Faltas
    const now = new Date().getTime();
    
    for (const s of shifts) {
      const item = itemMap.get(s.user_id);
      if (!item) continue;

      const start = new Date(s.start_at).getTime();
      const end = new Date(s.end_at).getTime();
      const durationMin = Math.floor((end - start) / 60000);
      
      item.horasPrevistasMin += durationMin;

      // Checar falta
      const wr = wrs.find(w => w.shift_id === s.id || (w.user_id === s.user_id && w.clock_in.startsWith(s.start_at.slice(0,10))));
      if (!wr && end < now) {
        item.qtdFaltas += 1;
      }
    }

    // Realizado e Pendências
    for (const w of wrs) {
      const item = itemMap.get(w.user_id);
      if (!item) continue;

      item.totalRecords += 1;

      if (w.status === "open") {
        item.temPendencia = true;
      }

      if (w.worked_minutes) {
        item.horasRealizadasMin += w.worked_minutes;
      } else if (w.clock_out) {
        const cIn = new Date(w.clock_in).getTime();
        const cOut = new Date(w.clock_out).getTime();
        item.horasRealizadasMin += Math.max(0, Math.floor((cOut - cIn) / 60000) - (w.break_minutes || 0));
      }
    }

    // Define se o mês do funcionário está validado
    for (const item of result) {
      const userWrs = wrs.filter(w => w.user_id === item.userId);
      if (userWrs.length > 0 && userWrs.every(w => w.status === "closed" || w.status === "adjusted")) {
        item.isValidated = true;
      }
    }

    // Banco de Horas
    for (const hb of hourBanks || []) {
      const item = itemMap.get(hb.user_id);
      if (!item) continue;

      if (hb.type === "credit") {
        item.saldoMesMin += hb.minutes;
      } else {
        item.saldoMesMin -= hb.minutes;
      }
    }

    return { data: result, periodoFormatado };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao carregar consolidado de fechamento";
    return { error: msg };
  }
}

export async function getEmployeeWorkRecords(
  userId: string,
  organizationId: string,
  year: number,
  month: number,
  periodType: FechamentoPeriodType = "cutoff_21_20"
): Promise<{ data?: WorkRecordDetail[]; employeeName?: string; periodoFormatado?: string; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // 1. Perfil do funcionário
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();

    const { startIsoTime, endIsoTime, periodoFormatado } =
      getFechamentoDateRange(year, month, periodType);

    let records: WorkRecordRow[] = [];

    if (organizationId && organizationId !== "__all__") {
      const { data: orgRecords, error: orgErr } = await adminClient
        .from("work_records")
        .select("id, clock_in, clock_out, break_minutes, worked_minutes, status, notes")
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
        .gte("clock_in", startIsoTime)
        .lte("clock_in", endIsoTime)
        .order("clock_in", { ascending: true });

      if (orgErr) return { error: orgErr.message };

      if (orgRecords && orgRecords.length > 0) {
        records = orgRecords as unknown as WorkRecordRow[];
      } else {
        // Fallback: se não encontrar com essa org específica, busca todos os registros do colaborador no período
        const { data: allRecords, error: allErr } = await adminClient
          .from("work_records")
          .select("id, clock_in, clock_out, break_minutes, worked_minutes, status, notes")
          .eq("user_id", userId)
          .gte("clock_in", startIsoTime)
          .lte("clock_in", endIsoTime)
          .order("clock_in", { ascending: true });

        if (allErr) return { error: allErr.message };
        records = (allRecords || []) as unknown as WorkRecordRow[];
      }
    } else {
      const { data: allRecords, error: allErr } = await adminClient
        .from("work_records")
        .select("id, clock_in, clock_out, break_minutes, worked_minutes, status, notes")
        .eq("user_id", userId)
        .gte("clock_in", startIsoTime)
        .lte("clock_in", endIsoTime)
        .order("clock_in", { ascending: true });

      if (allErr) return { error: allErr.message };
      records = (allRecords || []) as unknown as WorkRecordRow[];
    }

    const formatted: WorkRecordDetail[] = ((records as unknown as WorkRecordRow[]) || []).map((r) => ({
      id: r.id,
      clockIn: r.clock_in,
      clockOut: r.clock_out,
      breakMinutes: r.break_minutes ?? 0,
      workedMinutes: r.worked_minutes,
      status: r.status,
      notes: r.notes ?? null,
      validatedAt: null,
      validatedBy: null,
    }));

    return {
      data: formatted,
      employeeName: profile?.full_name ?? "Funcionário",
      periodoFormatado,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao buscar registros de ponto";
    return { error: msg };
  }
}

export async function updateWorkRecordHours(
  recordId: string,
  clockInIso: string,
  clockOutIso: string | null,
  breakMinutes: number,
  notes?: string
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims) return { error: "Não autorizado" };

    const cIn = new Date(clockInIso).getTime();
    let workedMinutes: number | null = null;

    if (clockOutIso) {
      const cOut = new Date(clockOutIso).getTime();
      if (cOut <= cIn) {
        return { error: "A saída deve ser após a entrada." };
      }
      workedMinutes = Math.max(0, Math.floor((cOut - cIn) / 60000) - breakMinutes);
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("work_records")
      .update({
        clock_in: clockInIso,
        clock_out: clockOutIso,
        break_minutes: breakMinutes,
        worked_minutes: workedMinutes,
        status: "adjusted",
        notes: notes || "Ajustado pela gerência/administração.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", recordId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return {};
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar registro";
    return { error: msg };
  }
}

export async function validateEmployeeMonth(
  userId: string,
  organizationId: string,
  year: number,
  month: number,
  periodType: FechamentoPeriodType = "cutoff_21_20"
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();
    const { data: claims } = await supabase.auth.getClaims();
    if (!claims?.claims) return { error: "Não autorizado" };

    const { startIsoTime, endIsoTime } = getFechamentoDateRange(year, month, periodType);

    const adminClient = createAdminClient();

    // Marca todos os registros desse colaborador como fechados/validados no período
    let updateQuery = adminClient
      .from("work_records")
      .update({
        status: "closed",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .gte("clock_in", startIsoTime)
      .lte("clock_in", endIsoTime);

    if (organizationId && organizationId !== "__all__") {
      updateQuery = updateQuery.eq("organization_id", organizationId);
    }

    const { error } = await updateQuery;

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return {};
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao validar horas do funcionário";
    return { error: msg };
  }
}

export async function getFechamentoRelatorioFuncionario(
  userId: string,
  organizationId: string,
  year: number,
  month: number,
  periodType: FechamentoPeriodType = "cutoff_21_20"
): Promise<{ data?: FechamentoRelatorioFuncionario; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // 1. Dados do funcionário e da organização
    const { data: profile, error: profErr } = await adminClient
      .from("profiles")
      .select("id, full_name, employee_code, organization_id, organizations(id, name)")
      .eq("id", userId)
      .single();

    if (profErr || !profile) {
      return { error: profErr?.message || "Colaborador não encontrado." };
    }

    const orgRow = profile.organizations as { id?: string; name?: string } | null;
    const organizationName = orgRow?.name || "METEORIC";
    const unitName = orgRow?.name || "SONDAS";

    // 2. Intervalo de datas
    const { startDate, endDate, periodoFormatado } = getFechamentoDateRange(year, month, periodType);

    // 3. Buscar work_records do período
    let wrs: WrRowWithVehicle[] = [];

    if (organizationId && organizationId !== "__all__") {
      const { data: orgWrs, error: orgErr } = await adminClient
        .from("work_records")
        .select("id, clock_in, clock_out, break_minutes, worked_minutes, status, notes")
        .eq("user_id", userId)
        .eq("organization_id", organizationId)
        .gte("clock_in", startDate.toISOString())
        .lte("clock_in", endDate.toISOString())
        .order("clock_in", { ascending: true });

      if (orgErr) return { error: orgErr.message };

      if (orgWrs && orgWrs.length > 0) {
        wrs = orgWrs as WrRowWithVehicle[];
      } else {
        // Fallback: se não encontrar com essa org específica, busca todos os registros do colaborador no período
        const { data: allWrs, error: allErr } = await adminClient
          .from("work_records")
          .select("id, clock_in, clock_out, break_minutes, worked_minutes, status, notes")
          .eq("user_id", userId)
          .gte("clock_in", startDate.toISOString())
          .lte("clock_in", endDate.toISOString())
          .order("clock_in", { ascending: true });

        if (allErr) return { error: allErr.message };
        wrs = (allWrs || []) as WrRowWithVehicle[];
      }
    } else {
      const { data: allWrs, error: allErr } = await adminClient
        .from("work_records")
        .select("id, clock_in, clock_out, break_minutes, worked_minutes, status, notes")
        .eq("user_id", userId)
        .gte("clock_in", startDate.toISOString())
        .lte("clock_in", endDate.toISOString())
        .order("clock_in", { ascending: true });

      if (allErr) return { error: allErr.message };
      wrs = (allWrs || []) as WrRowWithVehicle[];
    }

    interface WrRowWithVehicle {
      id: string;
      clock_in: string;
      clock_out: string | null;
      break_minutes: number;
      worked_minutes: number | null;
      status: string;
      notes: string | null;
    }

    // 4. Mapear os dias do fechamento
    const dias: FechamentoDiaItem[] = [];
    let totalMinutos = 0;
    let veiculoOkDias = 0;
    let veiculoNaoOkDias = 0;

    for (const w of wrs) {
      const dIn = new Date(w.clock_in);
      const dOut = w.clock_out ? new Date(w.clock_out) : null;

      // Data formatada (ex: 21/05/2026)
      const diaNum = dIn.getDate().toString().padStart(2, "0");
      const mesNum = (dIn.getMonth() + 1).toString().padStart(2, "0");
      const anoNum = dIn.getFullYear();
      const dataStr = `${diaNum}/${mesNum}/${anoNum}`;
      const rawDate = `${anoNum}-${mesNum}-${diaNum}`;

      // Dia da semana
      const diaSemana = DIAS_SEMANA_NOMES[dIn.getDay()] || "";

      // Horário do plantão (ex: "17:00 às 07:00")
      const hIn = `${dIn.getHours().toString().padStart(2, "0")}:${dIn.getMinutes().toString().padStart(2, "0")}`;
      const hOut = dOut
        ? `${dOut.getHours().toString().padStart(2, "0")}:${dOut.getMinutes().toString().padStart(2, "0")}`
        : "--:--";
      const horarioPlantao = `${hIn} às ${hOut}`;

      // Total de horas calculadas
      let minRecord = w.worked_minutes;
      if (minRecord === null || minRecord === undefined) {
        if (dOut) {
          minRecord = Math.max(0, Math.floor((dOut.getTime() - dIn.getTime()) / 60000) - (w.break_minutes || 0));
        } else {
          minRecord = 0;
        }
      }
      totalMinutos += minRecord;

      const horasH = Math.floor(minRecord / 60);
      const horasM = minRecord % 60;
      const totalHoras = `${horasH.toString().padStart(2, "0")}:${horasM.toString().padStart(2, "0")}:00`;

      // Veículo 4x4 (lê do notes)
      const isUsesVehicle = Boolean(w.notes?.includes("USES_VEHICLE:true"));
      let utilizacaoVeiculo = "OK";
      let isVeiculoOk = true;

      // Extrai motivo do notes se houver "VEICULO_MOTIVO:XYZ"
      let observacaoLimpa = w.notes || "";
      const motivoMatch = observacaoLimpa.match(/VEICULO_MOTIVO:([^;|\n]+)/);
      const customMotivo = motivoMatch ? motivoMatch[1].trim() : null;

      // Limpa tags internas da observação para exibição limpa
      observacaoLimpa = observacaoLimpa
        .replace(/VEICULO_MOTIVO:[^;|\n]+(;|\n)?/g, "")
        .replace(/USES_VEHICLE:[^;|\n]+(;|\n)?/g, "")
        .replace(/GPS:[^\n]+(;|\n)?/g, "")
        .trim();

      if (isUsesVehicle) {
        utilizacaoVeiculo = "OK";
        isVeiculoOk = true;
        veiculoOkDias += 1;
      } else {
        utilizacaoVeiculo = customMotivo || "Manutenção";
        isVeiculoOk = false;
        veiculoNaoOkDias += 1;
      }

      dias.push({
        recordId: w.id,
        data: dataStr,
        rawDate,
        diaSemana,
        horarioPlantao,
        totalHoras,
        totalMinutos: minRecord,
        utilizacaoVeiculo,
        isVeiculoOk,
        observacoes: observacaoLimpa,
      });
    }

    // Total de horas do período
    const totalGeralH = Math.floor(totalMinutos / 60);
    const totalGeralM = totalMinutos % 60;
    const totalHorasPeriodo = `${totalGeralH.toString().padStart(2, "0")}:${totalGeralM.toString().padStart(2, "0")}:00`;

    const resumoVeiculo = `OK: ${veiculoOkDias} Dias | Manut.: ${veiculoNaoOkDias} Dias`;

    const validatorName: string | null = null;
    const validatedAtFormatted: string | null = null;

    return {
      data: {
        organizationName,
        unitName,
        employeeName: profile.full_name,
        employeeCode: profile.employee_code,
        periodoFormatado,
        periodType,
        dias,
        totalHorasPeriodo,
        totalHorasMinutos: totalMinutos,
        veiculoOkDias,
        veiculoNaoOkDias,
        resumoVeiculo,
        validatorName,
        validatedAtFormatted,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao gerar relatório de fechamento";
    return { error: msg };
  }
}

export async function updateRecordVehicleAndNotes(
  recordId: string,
  usesVehicle: boolean,
  vehicleReason?: string,
  observations?: string
): Promise<{ error?: string }> {
  try {
    const adminClient = createAdminClient();

    // Monta o novo notes preservando ou ajustando o motivo do veículo
    let updatedNotes = observations || "";
    if (!usesVehicle) {
      updatedNotes = `${updatedNotes} USES_VEHICLE:false VEICULO_MOTIVO:${vehicleReason || 'Manutenção'}`.trim();
    } else {
      updatedNotes = `${updatedNotes} USES_VEHICLE:true`.trim();
    }

    const { error } = await adminClient
      .from("work_records")
      .update({
        notes: updatedNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recordId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard");
    return {};
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao atualizar veículo/observações";
    return { error: msg };
  }
}

