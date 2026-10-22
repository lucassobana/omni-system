import type { Metadata } from "next";
import { verifyScopedAccess } from "@/lib/auth/scopedAccess";
import { BancoHorasClient } from "@/app/dashboard/admin/banco-de-horas/_components/BancoHorasClient";

export const metadata: Metadata = {
  title: "Banco de Horas da Empresa | Omni System",
  description: "Acompanhe saldos e extratos de banco de horas da organização.",
  robots: { index: false, follow: false },
};

export default async function ScopedBancoHorasPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { org } = await verifyScopedAccess(slug);

  return <BancoHorasClient adminOrgId={org.id} />;
}
