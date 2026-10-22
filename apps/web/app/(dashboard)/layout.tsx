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
    .select("role")
    .eq("id", userId)
    .single();

  const role = profile?.role || "member";

  return <AppLayout role={role}>{children}</AppLayout>;
}
