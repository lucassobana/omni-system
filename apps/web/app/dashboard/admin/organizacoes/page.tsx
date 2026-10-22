import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OrganizacoesClient } from "./_components/OrganizacoesClient";

export const metadata: Metadata = {
  title: "Gestão de Organizações | Omni System",
  description: "Gerenciamento e configuração de empresas, filiais e veículos.",
  robots: { index: false, follow: false },
};

export default async function OrganizacoesPage() {
  const supabase = await createClient();

  // 1. Autenticação
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    redirect("/login");
  }

  // 2. Perfil e role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.claims.sub)
    .single();

  const role = profile?.role;

  if (role !== "owner" && role !== "admin") {
    if (role === "manager") redirect("/dashboard");
    redirect("/app");
  }

  return <OrganizacoesClient />;
}
