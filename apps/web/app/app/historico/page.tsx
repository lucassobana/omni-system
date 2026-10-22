import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Box, Container, Heading, Flex, Text } from "@chakra-ui/react";
import { MonthFilter } from "../_components/MonthFilter";
import { HistoryList, type HistoryRecordItem } from "./_components/HistoryList";
import { getFechamentoDateRange, type FechamentoPeriodType } from "@/app/dashboard/admin/fechamento/utils";

export const metadata = {
  title: "Histórico de Ponto | Omni System",
};

interface PageProps {
  searchParams: Promise<{ month?: string; year?: string; period?: string }>;
}

export default async function HistoricoPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims?.sub) {
    redirect("/login");
  }

  const userId = claims.claims.sub as string;
  const sp = await searchParams;

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // No corte 21 a 20, se hoje é dia 21 em diante, o ciclo ativo já é o do mês seguinte
  const defaultMonth = now.getDate() >= 21 ? (currentMonth === 12 ? 1 : currentMonth + 1) : currentMonth;
  const defaultYear = now.getDate() >= 21 && currentMonth === 12 ? currentYear + 1 : currentYear;

  const month = sp.month ? parseInt(sp.month) : defaultMonth;
  const year = sp.year ? parseInt(sp.year) : defaultYear;
  const periodType: FechamentoPeriodType = (sp.period as FechamentoPeriodType) || "cutoff_21_20";

  // Intervalo do período de fechamento
  const { startDate, endDate, startIsoTime, endIsoTime, periodoFormatado } =
    getFechamentoDateRange(year, month, periodType);

  const adminClient = createAdminClient();

  // 1. Perfil do funcionário e organização
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, full_name, employee_code, organization_id, organizations(id, name)")
    .eq("id", userId)
    .single();

  const orgRow = profile?.organizations as { id?: string; name?: string } | null;
  const organizationName = orgRow?.name || "Empresa";
  const organizationId = profile?.organization_id || "";
  const userName = profile?.full_name || "Colaborador";

  // 2. Registros de ponto no período do fechamento
  const { data: rawRecords } = await adminClient
    .from("work_records")
    .select("id, clock_in, clock_out, break_minutes, worked_minutes, overtime_minutes, status, notes, uses_vehicle, organization_id")
    .eq("user_id", userId)
    .or(`and(clock_in.gte.${startIsoTime},clock_in.lte.${endIsoTime}),and(clock_out.gte.${startIsoTime},clock_out.lte.${endIsoTime})`)
    .order("clock_in", { ascending: false });

  // 3. Plantões previstos (shifts) no período do fechamento
  const { data: shifts } = await adminClient
    .from("shifts")
    .select("id, start_at, end_at, shift_date")
    .eq("user_id", userId)
    .gte("start_at", startIsoTime)
    .lte("start_at", endIsoTime);

  // 4. Banco de horas no período
  const { data: hourBanks } = await adminClient
    .from("hour_bank")
    .select("type, minutes")
    .eq("user_id", userId)
    .gte("reference_date", startDate.toISOString().slice(0, 10))
    .lte("reference_date", endDate.toISOString().slice(0, 10));

  // 5. Cálculos idênticos aos do Fechamento
  let totalMinutosPrevistos = 0;
  let saldoBancoMinutos = 0;

  // Horas previstas de escala
  for (const s of shifts || []) {
    const start = new Date(s.start_at).getTime();
    const end = new Date(s.end_at).getTime();
    totalMinutosPrevistos += Math.max(0, Math.floor((end - start) / 60000));
  }

  // Movimentação do banco de horas no período
  for (const hb of hourBanks || []) {
    if (hb.type === "credit") {
      saldoBancoMinutos += hb.minutes;
    } else {
      saldoBancoMinutos -= hb.minutes;
    }
  }

  interface RawWorkRecord {
    id: string;
    clock_in: string;
    clock_out: string | null;
    break_minutes?: number | null;
    worked_minutes?: number | null;
    overtime_minutes?: number | null;
    status: string;
    notes?: string | null;
    uses_vehicle?: boolean | null;
    organization_id?: string | null;
  }

  const rawList = (rawRecords || []) as unknown as RawWorkRecord[];

  // Processamento dos registros diários
  const records: HistoryRecordItem[] = rawList.map((r) => {
    const dIn = new Date(r.clock_in);
    const dOut = r.clock_out ? new Date(r.clock_out) : null;

    let minRecord = r.worked_minutes;
    if (minRecord === null || minRecord === undefined) {
      if (dOut) {
        minRecord = Math.max(0, Math.floor((dOut.getTime() - dIn.getTime()) / 60000) - (r.break_minutes || 0));
      } else {
        minRecord = 0;
      }
    }

    // Leitura da utilização de veículo 4x4 e motivo se houver
    const isUsesVehicle = Boolean(r.uses_vehicle ?? r.notes?.includes("USES_VEHICLE:true"));
    let customMotivo: string | null = null;
    if (r.notes) {
      const motivoMatch = r.notes.match(/VEICULO_MOTIVO:([^;|\n]+)/);
      if (motivoMatch) customMotivo = motivoMatch[1].trim();
    }

    return {
      id: r.id,
      clock_in: r.clock_in,
      clock_out: r.clock_out,
      break_minutes: r.break_minutes ?? 0,
      worked_minutes: minRecord,
      overtime_minutes: r.overtime_minutes ?? 0,
      status: r.status,
      uses_vehicle: isUsesVehicle,
      vehicle_reason: customMotivo,
      notes: r.notes ?? null,
    };
  });

  const totalMinutosTrabalhados = records.reduce((acc, r) => acc + (r.worked_minutes || 0), 0);
  const temPendencia = records.some((r) => !r.clock_out || r.status === "open");

  const isMonthValidated =
    records.length > 0 &&
    records.every((r) => r.status === "closed" || r.status === "adjusted");

  return (
    <Box minH="100svh" bg="bg" position="relative" pb={12}>
      {/* ── HEADER ── */}
      <Flex 
        as="header" 
        align="center" 
        justify="center" 
        p={4} 
        bg="card" 
        borderBottomWidth="1px" 
        borderColor="border.subtle"
        position="sticky"
        top={0}
        zIndex={10}
      >
        <Box textAlign="center">
          <Heading size="md" fontWeight="bold" color="fg">Meu Histórico de Ponto</Heading>
          <Text fontSize="xs" color="fg.muted">
            {organizationName} · {periodoFormatado}
          </Text>
        </Box>
      </Flex>

      <Container maxW="2xl" px={{ base: 4, sm: 6 }} py={6}>
        <MonthFilter
          currentMonth={month}
          currentYear={year}
          periodoFormatado={periodoFormatado}
          periodType={periodType}
        />
        <HistoryList
          records={records || []}
          periodoFormatado={periodoFormatado}
          periodType={periodType}
          month={month}
          year={year}
          totalMinutosTrabalhados={totalMinutosTrabalhados}
          totalMinutosPrevistos={totalMinutosPrevistos}
          saldoBancoMinutos={saldoBancoMinutos}
          temPendencia={temPendencia}
          isMonthValidated={isMonthValidated}
          userId={userId}
          userName={userName}
          organizationId={organizationId}
        />
      </Container>
    </Box>
  );
}
