import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FechamentoClient } from "./_components/FechamentoClient";

export const metadata: Metadata = {
  title: "Fechamento Mensal | Omni System",
  description: "Consolidação e fechamento de folha de ponto mensal.",
  robots: { index: false, follow: false },
};

export default async function FechamentoPage() {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", claims.claims.sub)
    .single();

  if (profile?.role !== "owner" && profile?.role !== "admin") {
    if (profile?.role === "manager") redirect("/dashboard");
    redirect("/app");
  }

  return <FechamentoClient adminOrgId={profile?.organization_id ?? null} />;
}
