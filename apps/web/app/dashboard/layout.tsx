import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel | Omni System",
  description: "Painel gerencial do Omni System.",
  robots: { index: false, follow: false },
};

/**
 * Layout da área do sistema (/dashboard).
 * Layout limpo — sem Header da landing page, sem WhatsAppButton.
 * Sem paddingTop adicional; cada sub-rota controla seu próprio espaçamento.
 */
import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/AppLayout";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims?.sub) {
    redirect("/login");
  }

  const userId = claims.claims.sub as string;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id, organizations(slug)")
    .eq("id", userId)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const role = profile.role || "member";

  if (role === "member") {
    redirect("/app");
  }

  let userSlug: string | undefined = undefined;
  if (role === "manager") {
    const rawOrg = profile.organizations as unknown;
    const org = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as { slug: string } | null;
    userSlug = org?.slug;

    if (!userSlug && profile.organization_id) {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("slug")
        .eq("id", profile.organization_id)
        .single();
      userSlug = orgData?.slug;
    }

    if (!userSlug) {
      const { data: uo } = await supabase
        .from("user_organizations")
        .select("organizations(slug)")
        .eq("user_id", userId)
        .limit(1)
        .single();
      const rawUoOrg = uo?.organizations as unknown;
      const uoOrg = (Array.isArray(rawUoOrg) ? rawUoOrg[0] : rawUoOrg) as { slug: string } | null;
      userSlug = uoOrg?.slug;
    }
  }

  return <AppLayout role={role} userSlug={userSlug}>{children}</AppLayout>;
}
