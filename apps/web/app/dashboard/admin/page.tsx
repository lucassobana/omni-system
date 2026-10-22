import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Painel Admin | Omni System",
  description: "Visão gerencial de escala e registros de ponto.",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const supabase = await createClient();

  // 1. Autenticação
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    redirect("/login");
  }

  // 2. Perfil e role
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", claims.claims.sub)
    .single();

  const role = profile?.role;

  if (role !== "owner" && role !== "admin") {
    if (role === "manager") redirect("/dashboard");
    redirect("/app");
  }

  return (
    <AdminDashboard
      adminName={profile?.full_name ?? "Administrador"}
    />
  );
}
