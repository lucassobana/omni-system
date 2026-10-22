import type { Metadata } from "next";
import { verifyScopedAccess } from "@/lib/auth/scopedAccess";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Painel da Empresa | Omni System",
  description: "Visão gerencial de escala e registros de ponto da empresa.",
  robots: { index: false, follow: false },
};

export default async function ScopedDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { org, profile, role } = await verifyScopedAccess(slug);

  return (
    <AdminDashboard
      adminName={profile?.full_name ?? "Gerente"}
      fixedOrgId={org.id}
      fixedOrgName={org.name}
      isManagerView={role === "manager"}
    />
  );
}
