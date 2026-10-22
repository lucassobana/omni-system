import type { Metadata } from "next";
import { verifyScopedAccess } from "@/lib/auth/scopedAccess";
import { EquipeClient } from "@/app/dashboard/admin/equipe/_components/EquipeClient";

export const metadata: Metadata = {
  title: "Funcionários da Empresa | Omni System",
  description: "Gerencie os colaboradores da organização.",
  robots: { index: false, follow: false },
};

export default async function ScopedEquipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { org, role } = await verifyScopedAccess(slug);

  return (
    <EquipeClient
      adminOrgId={org.id}
      fixedOrgId={org.id}
      isManagerView={role === "manager"}
    />
  );
}
