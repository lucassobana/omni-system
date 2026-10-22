"use client";

import { useState } from "react";
import { Box, Flex, Text, Stack, Badge, Button, SimpleGrid } from "@chakra-ui/react";
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
  Printer,
  Car,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { RelatorioFechamentoModal } from "@/app/dashboard/admin/fechamento/_components/RelatorioFechamentoModal";
import { DIAS_SEMANA_NOMES } from "@/app/dashboard/admin/fechamento/utils";

export interface HistoryRecordItem {
  id: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes?: number;
  worked_minutes: number | null;
  overtime_minutes: number | null;
  status: string;
  uses_vehicle?: boolean;
  vehicle_reason?: string | null;
  notes?: string | null;
}

interface Props {
  records: HistoryRecordItem[];
  periodoFormatado: string;
  periodType: "cutoff_21_20" | "calendar";
  month: number;
  year: number;
  totalMinutosTrabalhados: number;
  totalMinutosPrevistos: number;
  saldoBancoMinutos: number;
  temPendencia: boolean;
  isMonthValidated: boolean;
  userId: string;
  userName: string;
  organizationId: string;
}

function formatTime(iso: string | null) {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const weekday = DIAS_SEMANA_NOMES[d.getDay()] || "";
  return `${day}/${month}/${year} · ${weekday}`;
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "00h 00m";
  const isPositive = minutes >= 0;
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = isPositive ? "" : "-";
  return `${sign}${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
}

function formatClockTime(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return "--:--";
  const isPositive = minutes >= 0;
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = isPositive ? "" : "-";
  return `${sign}${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function HistoryList({
  records,
  periodoFormatado,
  periodType,
  month,
  year,
  totalMinutosTrabalhados,
  totalMinutosPrevistos,
  saldoBancoMinutos,
  temPendencia,
  isMonthValidated,
  userId,
  userName,
  organizationId,
}: Props) {
  const [relatorioOpen, setRelatorioOpen] = useState(false);

  return (
    <Stack gap={6}>
      {/* ── Resumo do Período (Padrão Fechamento) ── */}
      <Box
        bg="linear-gradient(135deg, #0F1E36 0%, #173054 100%)"
        color="fg"
        p={{ base: 5, sm: 6 }}
        rounded="2xl"
        shadow="lg"
        borderWidth="1px"
        borderColor="primary.border"
      >
        <Flex
          direction={{ base: "column", sm: "row" }}
          justify="space-between"
          align={{ base: "flex-start", sm: "center" }}
          gap={3}
          mb={4}
          pb={3}
          borderBottomWidth="1px"
          borderColor="whiteAlpha.100"
        >
          <Box>
            <Flex align="center" gap={2} color="brand.200" mb={1}>
              <CalendarDays size={18} />
              <Text fontWeight="bold" fontSize="sm" textTransform="uppercase" letterSpacing="wider">
                Fechamento de Plantões & Horas
              </Text>
            </Flex>
            <Text fontSize="xs" color="fg.muted">
              {periodoFormatado} · {periodType === "cutoff_21_20" ? "Corte 21 a 20" : "Mês Calendário"}
            </Text>
          </Box>

          <Flex align="center" gap={2} wrap="wrap">
            {isMonthValidated ? (
              <Badge colorPalette="green" variant="solid" size="sm" display="flex" alignItems="center" gap={1}>
                <CheckCircle2 size={13} /> Mês Validado pelo Gestor
              </Badge>
            ) : temPendencia ? (
              <Badge colorPalette="yellow" variant="solid" size="sm" display="flex" alignItems="center" gap={1}>
                <AlertTriangle size={13} /> Pendências de Ponto
              </Badge>
            ) : (
              <Badge colorPalette="blue" variant="subtle" size="sm">
                Em Apuração
              </Badge>
            )}

            <Button
              size="xs"
              variant="surface"
              colorPalette="teal"
              onClick={() => setRelatorioOpen(true)}
              title="Visualizar e Imprimir Relatório Oficial de Fechamento"
            >
              <Printer size={13} /> Relatório Oficial
            </Button>
          </Flex>
        </Flex>

        {/* Métricas Principais */}
        <SimpleGrid columns={{ base: 2, sm: totalMinutosPrevistos > 0 ? 3 : 2 }} gap={4} pt={1}>
          <Box>
            <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb={1}>
              Horas Trabalhadas
            </Text>
            <Text fontSize={{ base: "2xl", sm: "3xl" }} fontWeight="bold" lineHeight="1" color="fg">
              {formatDuration(totalMinutosTrabalhados)}
            </Text>
            <Text fontSize="xs" color="brand.300" mt={1}>
              Total no período ({formatClockTime(totalMinutosTrabalhados)})
            </Text>
          </Box>

          {totalMinutosPrevistos > 0 && (
            <Box>
              <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb={1}>
                Horas Previstas
              </Text>
              <Text fontSize={{ base: "2xl", sm: "3xl" }} fontWeight="bold" lineHeight="1" color="fg">
                {formatDuration(totalMinutosPrevistos)}
              </Text>
              <Text fontSize="xs" color="fg.muted" mt={1}>
                Escala do período
              </Text>
            </Box>
          )}

          <Box textAlign={{ base: "left", sm: "right" }}>
            <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb={1}>
              Banco de Horas
            </Text>
            <Text
              fontSize={{ base: "xl", sm: "2xl" }}
              fontWeight="bold"
              lineHeight="1"
              color={
                saldoBancoMinutos > 0
                  ? "green.400"
                  : saldoBancoMinutos < 0
                  ? "red.400"
                  : "fg"
              }
            >
              {saldoBancoMinutos > 0 ? `+${formatDuration(saldoBancoMinutos)}` : formatDuration(saldoBancoMinutos)}
            </Text>
            <Text fontSize="xs" color="fg.muted" mt={1}>
              {records.length} plantões registrados
            </Text>
          </Box>
        </SimpleGrid>
      </Box>

      {/* ── Lista de Registros Detalhados ── */}
      <Stack gap={4}>
        {records.length === 0 ? (
          <Box textAlign="center" py={12} color="fg.muted" bg="card" rounded="xl" borderWidth="1px" borderColor="border.subtle" p={8}>
            <Clock size={40} style={{ margin: "0 auto", opacity: 0.25, marginBottom: 10 }} />
            <Text fontWeight="semibold" fontSize="md" color="fg">Nenhum ponto registrado neste período.</Text>
            <Text fontSize="xs" color="fg.muted" mt={1}>
              Os registros de plantão de {periodoFormatado} aparecerão listados aqui.
            </Text>
          </Box>
        ) : (
          records.map((record) => {
            const isMissingOut = !record.clock_out;
            const hasOvertime = (record.overtime_minutes || 0) > 0;
            const isAdjusted = record.status === "adjusted";
            const isValidated = record.status === "closed";

            // Limpeza de notas
            let cleanNotes = record.notes || "";
            cleanNotes = cleanNotes
              .replace(/VEICULO_MOTIVO:[^;|\n]+(;|\n)?/g, "")
              .replace(/USES_VEHICLE:[^;|\n]+(;|\n)?/g, "")
              .replace(/GPS:[^\n]+(;|\n)?/g, "")
              .trim();

            return (
              <Box
                key={record.id}
                bg="card"
                p={5}
                rounded="xl"
                shadow="xs"
                borderWidth="1px"
                borderColor="border.subtle"
                transition="all 0.2s"
                _hover={{ shadow: "md", borderColor: "primary.border" }}
              >
                {/* Cabeçalho do Dia */}
                <Flex justify="space-between" align="flex-start" mb={3.5} wrap="wrap" gap={2}>
                  <Box>
                    <Flex align="center" gap={2}>
                      <Calendar size={15} color="#7DA9D8" />
                      <Text fontWeight="bold" color="fg" fontSize="sm">
                        {formatDate(record.clock_in)}
                      </Text>
                    </Flex>

                    {/* Badges de Status e Veículo */}
                    <Flex gap={2} mt={1.5} wrap="wrap">
                      {isMissingOut ? (
                        <Badge colorPalette="red" variant="subtle" size="xs" display="flex" alignItems="center" gap={1}>
                          <AlertCircle size={11} /> Saída não registrada
                        </Badge>
                      ) : isValidated ? (
                        <Badge colorPalette="green" variant="subtle" size="xs" display="flex" alignItems="center" gap={1}>
                          <CheckCircle2 size={11} /> Validado pelo Gestor
                        </Badge>
                      ) : isAdjusted ? (
                        <Badge colorPalette="orange" variant="subtle" size="xs">
                          Ajustado pelo Gestor
                        </Badge>
                      ) : (
                        <Badge colorPalette="blue" variant="subtle" size="xs">
                          Registrado
                        </Badge>
                      )}

                      {/* Veículo 4x4 (Comportamento do Fechamento) */}
                      {record.uses_vehicle ? (
                        <Badge colorPalette="blue" variant="subtle" size="xs" display="flex" alignItems="center" gap={1}>
                          <Car size={11} /> Veículo 4x4: OK
                        </Badge>
                      ) : record.vehicle_reason ? (
                        <Badge colorPalette="yellow" variant="subtle" size="xs">
                          Sem Veículo: {record.vehicle_reason}
                        </Badge>
                      ) : null}

                      {hasOvertime && !isMissingOut && (
                        <Badge colorPalette="purple" variant="subtle" size="xs">
                          Extra: {formatDuration(record.overtime_minutes)}
                        </Badge>
                      )}
                    </Flex>
                  </Box>

                  {/* Total de Horas do Dia em Destaque */}
                  {!isMissingOut && (
                    <Box textAlign="right">
                      <Text fontSize="xs" color="fg.muted" textTransform="uppercase" fontWeight="bold">
                        Duração do Plantão
                      </Text>
                      <Text fontSize="lg" fontWeight="bold" color="brand.300">
                        {formatDuration(record.worked_minutes)}
                      </Text>
                    </Box>
                  )}
                </Flex>

                {/* Box de Horários (Entrada, Intervalo, Saída) */}
                <Flex
                  justify="space-between"
                  align="center"
                  bg="bg.subtle"
                  p={3}
                  rounded="lg"
                  borderWidth="1px"
                  borderColor="border.subtle"
                >
                  <Box textAlign="center" flex="1">
                    <Text fontSize="xs" color="fg.muted" textTransform="uppercase" fontWeight="semibold">
                      Entrada
                    </Text>
                    <Text fontSize="base" fontWeight="bold" mt={0.5} color="fg">
                      {formatTime(record.clock_in)}
                    </Text>
                  </Box>

                  <Box h="32px" w="1px" bg="border.subtle" />

                  <Box textAlign="center" flex="1">
                    <Text fontSize="xs" color="fg.muted" textTransform="uppercase" fontWeight="semibold">
                      Intervalo
                    </Text>
                    <Text fontSize="sm" fontWeight="medium" mt={0.5} color="fg.muted">
                      {record.break_minutes ? `${record.break_minutes}m` : "0m"}
                    </Text>
                  </Box>

                  <Box h="32px" w="1px" bg="border.subtle" />

                  <Box textAlign="center" flex="1">
                    <Text fontSize="xs" color="fg.muted" textTransform="uppercase" fontWeight="semibold">
                      Saída
                    </Text>
                    <Text fontSize="base" fontWeight="bold" mt={0.5} color={isMissingOut ? "red.400" : "fg"}>
                      {formatTime(record.clock_out)}
                    </Text>
                  </Box>
                </Flex>

                {/* Observações do Ponto */}
                {cleanNotes && (
                  <Text fontSize="xs" color="fg.muted" fontStyle="italic" mt={2} px={1}>
                    Observação: {cleanNotes}
                  </Text>
                )}
              </Box>
            );
          })
        )}
      </Stack>

      {/* ── Modal Oficial de Relatório de Fechamento (Visualização / Impressão do Funcionário) ── */}
      {relatorioOpen && (
        <RelatorioFechamentoModal
          open={relatorioOpen}
          onClose={() => setRelatorioOpen(false)}
          userId={userId}
          userName={userName}
          organizationId={organizationId}
          year={year}
          month={month}
          isReadOnly={true}
        />
      )}
    </Stack>
  );
}
