"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ScheduleFormData {
  id?: string;
  organizationId: string;
  name: string;
  description?: string;
  startDate: string;      // "YYYY-MM-DD"
  endDate?: string | null;
  shiftHours: number;
  restHours: number;
  status: "draft" | "active" | "closed";
}

export async function upsertSchedule(
  data: ScheduleFormData
): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient();

  const payload = {
    organization_id: data.organizationId,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    start_date: data.startDate,
    end_date: data.endDate || null,
    shift_hours: data.shiftHours,
    rest_hours: data.restHours,
    status: data.status,
  };

  if (data.id) {
    const { error } = await supabase
      .from("schedules")
      .update(payload)
      .eq("id", data.id);

    if (error) return { error: error.message };
    revalidatePath("/dashboard/admin/schedules");
    revalidatePath("/dashboard/admin/escalas");
    return { id: data.id };
  }

  const { data: row, error } = await supabase
    .from("schedules")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/schedules");
  revalidatePath("/dashboard/admin/escalas");
  return { id: row?.id };
}

export async function deleteSchedule(
  scheduleId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Verifica se há shifts vinculados antes de deletar
  const { count } = await supabase
    .from("shifts")
    .select("id", { count: "exact", head: true })
    .eq("schedule_id", scheduleId);

  if ((count ?? 0) > 0) {
    return {
      error: `Esta escala possui ${count} plantão(ões) vinculado(s) e não pode ser excluída. Altere o status para "Encerrada" em vez disso.`,
    };
  }

  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", scheduleId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/schedules");
  revalidatePath("/dashboard/admin/escalas");
  return {};
}

export async function updateScheduleStatus(
  scheduleId: string,
  status: "draft" | "active" | "closed"
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("schedules")
    .update({ status })
    .eq("id", scheduleId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/schedules");
  revalidatePath("/dashboard/admin/escalas");
  return {};
}
