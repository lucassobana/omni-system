import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BancoHorasClient } from "./_components/BancoHorasClient";

export const metadata: Metadata = {
  title: "Banco de Horas | Omni System",
  description: "Acompanhe saldos e visualize extratos de banco de horas.",
  robots: { index: false, follow: false },
};

export default async function BancoHorasPage() {
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

  return <BancoHorasClient adminOrgId={profile?.organization_id ?? null} />;
}
