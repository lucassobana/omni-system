"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type OccurrenceStatus = "PENDING" | "APPROVED" | "REJECTED" | "CORRECTED" | "CANCELLED";

export interface OccurrenceItem {
  id: string;
  work_record_id: string;
  type: string;
  description: string;
  status: OccurrenceStatus;
  created_at: string;
  work_record: {
    id: string;
    clock_in: string;
    clock_out: string | null;
    declared_shift_hours_current: number | null;
    declared_shift_hours_initial: number | null;
    actual_hours: number | null;
    status: string;
    employee_name: string;
  };
}

/** 
 * Traz as ocorrências pendentes (ou todas) da organização
 */
export async function getOccurrences(
  organizationId: string,
  statusFilter: "pending" | "all" = "pending"
): Promise<{ data?: OccurrenceItem[]; error?: string }> {
  try {
    const supabase = await createClient();

    let query = supabase
      .from("occurrences")
      .select(`
        id,
        work_record_id,
        type,
        description,
        status,
        created_at,
        work_record:work_records!inner (
          id,
          clock_in,
          clock_out,
          status,
          worked_minutes,
          profiles!inner (
            full_name
          )
        )
      `)
      .eq("work_records.organization_id", organizationId)
      .order("created_at", { ascending: false });

    if (statusFilter === "pending") {
      query = query.eq("status", "PENDING");
    }

    const { data, error } = await query;
    if (error) {
      console.warn("Occurrences not available:", error.message);
      return { data: [] };
    }

  interface RawOccurrence {
    id: string;
    work_record_id: string;
    type: string;
    description: string;
    status: OccurrenceStatus;
    created_at: string;
    work_record: {
      id: string;
      clock_in: string;
      clock_out: string | null;
      worked_minutes?: number | null;
      status: string;
      profiles: {
        full_name: string;
      } | null;
    };
  }

  const result: OccurrenceItem[] = ((data as unknown as RawOccurrence[]) || []).map((occ) => ({
    id: occ.id,
    work_record_id: occ.work_record_id,
    type: occ.type,
    description: occ.description,
    status: occ.status,
    created_at: occ.created_at,
    work_record: {
      id: occ.work_record.id,
      clock_in: occ.work_record.clock_in,
      clock_out: occ.work_record.clock_out,
      declared_shift_hours_current: null,
      declared_shift_hours_initial: null,
      actual_hours: occ.work_record.worked_minutes ? Number((occ.work_record.worked_minutes / 60).toFixed(2)) : null,
      status: occ.work_record.status,
      employee_name: occ.work_record.profiles?.full_name ?? "—",
    },
  }));

  return { data: result };
  } catch (err: unknown) {
    console.warn("Occurrences error:", err);
    return { data: [] };
  }
}

/** 
 * Resolve uma ocorrência (Aprova ou Rejeita)
 */
export async function resolveOccurrence(
  occurrenceId: string,
  resolution: "APPROVED" | "REJECTED",
  notes?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("occurrences")
    .update({
      status: resolution,
      resolved_at: new Date().toISOString(),
      resolved_by: user?.id ?? null,
      resolution: notes || null,
    })
    .eq("id", occurrenceId);

  if (error) return { error: error.message };

  // Busca work_record_id associado
  const { data: occ } = await supabase
    .from("occurrences")
    .select("work_record_id, organization_id")
    .eq("id", occurrenceId)
    .single();

  if (occ?.work_record_id) {
    // Verifica se ainda restam ocorrências PENDING para esta sessão
    const { data: pending } = await supabase
      .from("occurrences")
      .select("id")
      .eq("work_record_id", occ.work_record_id)
      .eq("status", "PENDING");

    if (!pending || pending.length === 0) {
      // Sem pendências restantes: fecha a sessão normalmente
      await supabase
        .from("work_records")
        .update({ status: "closed" })
        .eq("id", occ.work_record_id);
    }
  }

  revalidatePath("/dashboard/admin/ocorrencias");
  revalidatePath("/dashboard/admin");
  return {};
}
