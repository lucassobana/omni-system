import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Ponto de entrada da área gerencial.
 * Verifica autenticação e redireciona por role:
 *   owner | admin → /dashboard/admin
 * Roles não autorizados são redirecionados ao login.
 */
export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id, organizations(slug)")
    .eq("id", claims.claims.sub)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const role = profile.role;

  if (role === "owner" || role === "admin") {
    redirect("/dashboard/admin");
  }

  if (role === "manager") {
    // Busca o slug da organização do gerente
    const rawOrg = profile.organizations as unknown;
    const org = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as { slug: string } | null;
    let targetSlug = org?.slug;

    if (!targetSlug && profile.organization_id) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("slug")
        .eq("id", profile.organization_id)
        .single();
      targetSlug = orgData?.slug;
    }

    // Se ainda não achou, tenta em user_organizations
    if (!targetSlug) {
      const { data: uo } = await supabase
        .from("user_organizations")
        .select("organizations(slug)")
        .eq("user_id", claims.claims.sub)
        .limit(1)
        .single();
      const rawUoOrg = uo?.organizations as unknown;
      const uoOrg = (Array.isArray(rawUoOrg) ? rawUoOrg[0] : rawUoOrg) as { slug: string } | null;
      targetSlug = uoOrg?.slug;
    }

    if (targetSlug) {
      redirect(`/dashboard/${targetSlug}`);
    }
  }

  if (role === "member") {
    redirect("/app");
  }

  // Role desconhecida
  redirect("/login");
}
