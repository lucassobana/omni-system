import type { Metadata, Viewport } from "next";
import { getAppDashboardData } from "./actions";
import { PunchClockClient } from "./_components/PunchClockClient";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Bater Ponto | Omni System",
  description: "Aplicativo do funcionário para registro de ponto.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function AppDashboardPage() {
  const { data, error } = await getAppDashboardData();

  if (error === "Não autenticado.") {
    redirect("/login");
  }

  return <PunchClockClient initialData={data ?? null} error={error} />;
}
