import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SchedulesClient } from "./_components/SchedulesClient";

export const metadata: Metadata = {
  title: "Modelos de Escala | Omni System",
  description: "Gerencie os modelos de escala e turnos da organização.",
  robots: { index: false, follow: false },
};

export default async function SchedulesPage() {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", claims.claims.sub)
    .single();

  if (profile?.role !== "owner" && profile?.role !== "admin") redirect("/app");

  return <SchedulesClient adminOrgId={profile?.organization_id ?? null} />;
}
