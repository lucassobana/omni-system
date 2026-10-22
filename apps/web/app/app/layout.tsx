import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Registrar Ponto | Omni System",
  description: "Registre seu ponto de trabalho.",
  robots: { index: false, follow: false },
};

import { createClient } from "@/lib/supabase/server";
import { AppLayout } from "@/components/layout/AppLayout";
import { redirect } from "next/navigation";

export default async function AppAreaLayout({
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
    .select("role")
    .eq("id", userId)
    .single();

  const role = profile?.role || "member";

  if (role === "admin" || role === "owner") {
    redirect("/dashboard/admin");
  }

  if (role === "manager") {
    redirect("/dashboard");
  }

  return <AppLayout role={role}>{children}</AppLayout>;
}
