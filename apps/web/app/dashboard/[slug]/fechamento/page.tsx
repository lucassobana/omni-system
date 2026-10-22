import type { Metadata } from "next";
import { verifyScopedAccess } from "@/lib/auth/scopedAccess";
import { FechamentoClient } from "@/app/dashboard/admin/fechamento/_components/FechamentoClient";

export const metadata: Metadata = {
  title: "Fechamento & Validação de Horas | Omni System",
  description: "Validação e ajustes de folha de ponto da empresa.",
  robots: { index: false, follow: false },
};

export default async function ScopedFechamentoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { org, role } = await verifyScopedAccess(slug);

  return (
    <FechamentoClient
      adminOrgId={org.id}
      isManagerView={role === "manager"}
    />
  );
}
