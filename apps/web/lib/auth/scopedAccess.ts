import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export interface ScopedAccessResult {
  org: {
    id: string;
    name: string;
    slug: string;
  };
  profile: {
    id: string;
    full_name: string;
    role: "admin" | "manager" | "member" | "owner";
    organization_id: string | null;
  };
  role: "admin" | "manager" | "member" | "owner";
}

/**
 * Valida o acesso à rota com slug de organização.
 * Regras:
 * - Admin/Owner: acesso livre a qualquer empresa.
 * - Manager: acesso restrito às empresas às quais está vinculado.
 * - Member: redirecionado a /app (apenas bate ponto).
 */
export async function verifyScopedAccess(slug: string): Promise<ScopedAccessResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims?.sub) {
    redirect("/login");
  }

  const userId = claims.claims.sub as string;

  // 1. Busca a organização pelo slug
  const { data: org, error: orgErr } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("slug", slug)
    .single();

  if (orgErr || !org) {
    redirect("/dashboard");
  }

  // 2. Busca perfil do usuário
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, organization_id")
    .eq("id", userId)
    .single();

  const role = (profile?.role || "member") as "admin" | "manager" | "member" | "owner";

  if (role === "member") {
    redirect("/app");
  }

  // 3. Valida permissão do gerente
  if (role === "manager") {
    let hasAccess = profile?.organization_id === org.id;

    if (!hasAccess) {
      const { data: uo } = await supabase
        .from("user_organizations")
        .select("id")
        .eq("user_id", userId)
        .eq("organization_id", org.id)
        .limit(1);

      hasAccess = !!(uo && uo.length > 0);
    }

    if (!hasAccess) {
      redirect("/dashboard");
    }
  }

  return {
    org,
    profile: profile as ScopedAccessResult["profile"],
    role,
  };
}
