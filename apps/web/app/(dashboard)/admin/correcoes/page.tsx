import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CorrectionsClient } from "./_components/CorrectionsClient";

export const metadata: Metadata = {
  title: "Ajustes de Ponto | Omni System",
  description: "Analise e aprove as solicitações de correção de ponto enviadas pelos colaboradores.",
  robots: { index: false, follow: false },
};

export default async function AdminCorrecoesPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims?.sub) {
    redirect("/login");
  }

  const userId = claims.claims.sub as string;

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", userId)
    .single();

  if (!profile || !["admin", "owner"].includes(profile.role)) {
    redirect("/app");
  }

  return <CorrectionsClient adminOrgId={profile.organization_id ?? null} />;
}
