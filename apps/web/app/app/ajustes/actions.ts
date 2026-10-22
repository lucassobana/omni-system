"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function solicitarAjustePonto(formData: FormData) {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    throw new Error("Não autenticado");
  }

  const userId = claims.claims.sub as string;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();

  if (!profile) throw new Error("Perfil não encontrado");

  const date = formData.get("date") as string;
  const type = formData.get("type") as string;
  const time = formData.get("time") as string;
  const justification = formData.get("justification") as string;

  // Tenta encontrar um work_record aberto ou existente neste dia
  const { data: records } = await supabase
    .from("work_records")
    .select("id")
    .eq("user_id", userId)
    .gte("clock_in", `${date}T00:00:00Z`)
    .lte("clock_in", `${date}T23:59:59Z`)
    .order("clock_in", { ascending: false })
    .limit(1);

  const workRecordId = records && records.length > 0 ? records[0].id : null;

  const { error } = await supabase.from("point_corrections").insert({
    organization_id: profile.organization_id,
    user_id: userId,
    work_record_id: workRecordId,
    occurrence_date: date,
    type: type,
    suggested_time: `${time}:00`,
    justification: justification,
    status: "pending"
  });

  if (error) {
    console.error("Erro ao solicitar ajuste:", error);
    throw new Error(error.message);
  }

  revalidatePath("/app/ajustes");
  return { success: true };
}
