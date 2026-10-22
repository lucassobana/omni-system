import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OcorrenciasClient } from "./_components/OcorrenciasClient";

export const metadata: Metadata = {
  title: "Espelho e Ocorrências | Omni System",
  description: "Tratamento de ocorrências diárias e espelho de ponto.",
  robots: { index: false, follow: false },
};

export default async function OcorrenciasPage() {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", claims.claims.sub)
    .single();

  if (profile?.role !== "owner" && profile?.role !== "admin") redirect("/app");

  return <OcorrenciasClient adminOrgId={profile?.organization_id ?? null} />;
}
