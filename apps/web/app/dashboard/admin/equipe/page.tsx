import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { EquipeClient } from "./_components/EquipeClient";

export const metadata: Metadata = {
  title: "Gestão de Equipe | Omni System",
  description: "Gerencie os funcionários da organização.",
  robots: { index: false, follow: false },
};

export default async function EquipePage() {
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

  return <EquipeClient adminOrgId={profile?.organization_id ?? null} />;
}
