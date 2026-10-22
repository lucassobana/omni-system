"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  calcularDatas12x36,
  toTimestamptz,
  addDays,
} from "@/lib/utils/escalas";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface GenerateParams {
  scheduleId: string;
  userId: string;
  organizationId: string;
  /** "HH:MM" local — ex: "07:00" */
  startTime: string;
  /** "HH:MM" local — ex: "19:00" */
  endTime: string;
  /** "YYYY-MM-DD" — primeiro plantão do mês */
  firstShiftDate: string;
  year: number;
  month: number; // 1-12
  /** Offset em minutos (ex: -180 para BRT UTC-3) */
  tzOffsetMinutes: number;
}

export interface UpsertShiftParams {
  id?: string;
  scheduleId: string;
  userId: string;
  organizationId: string;
  shiftDate: string;  // "YYYY-MM-DD"
  startAt: string;    // ISO string
  endAt: string;      // ISO string
  status?: string;
}

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function generateShifts12x36(
  params: GenerateParams
): Promise<{ inserted: number; skipped: number; error?: string }> {
  const supabase = await createClient();

  const datas = calcularDatas12x36(params.firstShiftDate, params.year, params.month);

  const rows = datas.map((date) => {
    const startAt = toTimestamptz(date, params.startTime, params.tzOffsetMinutes);
    const endsNextDay =
      parseInt(params.endTime.replace(":", "")) <
      parseInt(params.startTime.replace(":", ""));
    const endDate = endsNextDay ? addDays(date, 1) : date;
    const endAt = toTimestamptz(endDate, params.endTime, params.tzOffsetMinutes);

    return {
      organization_id: params.organizationId,
      schedule_id: params.scheduleId,
      user_id: params.userId,
      shift_date: date,
      start_at: startAt,
      end_at: endAt,
      status: "scheduled" as const,
    };
  });

  const { data, error } = await supabase
    .from("shifts")
    .insert(rows)
    .select("id");

  if (error) {
    // Violação de exclusão (sobreposição de turnos) — insere um a um
    if (error.code === "23P01") {
      let inserted = 0;
      let skipped = 0;
      for (const row of rows) {
        const { error: rowErr } = await supabase.from("shifts").insert(row);
        if (rowErr) skipped++;
        else inserted++;
      }
      revalidatePath("/dashboard/admin/escalas");
      return { inserted, skipped };
    }
    return { inserted: 0, skipped: 0, error: error.message };
  }

  revalidatePath("/dashboard/admin/escalas");
  return { inserted: data?.length ?? 0, skipped: 0 };
}

export async function upsertShift(
  params: UpsertShiftParams
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();

  const payload = {
    organization_id: params.organizationId,
    schedule_id: params.scheduleId,
    user_id: params.userId,
    shift_date: params.shiftDate,
    start_at: params.startAt,
    end_at: params.endAt,
    status: params.status ?? "scheduled",
  };

  if (params.id) {
    const { error } = await supabase
      .from("shifts")
      .update(payload)
      .eq("id", params.id);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/admin/escalas");
    return { id: params.id };
  }

  const { data, error } = await supabase
    .from("shifts")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/escalas");
  return { id: data?.id };
}

export async function deleteShift(
  shiftId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("shifts").delete().eq("id", shiftId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/escalas");
  return {};
}
