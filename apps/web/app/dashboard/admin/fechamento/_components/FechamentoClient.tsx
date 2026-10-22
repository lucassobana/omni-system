"use client";

import {
  Box, Button, Container, Flex, Heading, Stack, Text,
  Badge, Spinner, Table, NativeSelectRoot, NativeSelectField,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import { Download, AlertCircle, CheckCircle, FileText, Pencil, Printer } from "lucide-react";
import {
  getConsolidadoMensal,
  type FechamentoItem,
} from "@/app/dashboard/admin/fechamento/actions";
import { getFechamentoDateRange } from "@/app/dashboard/admin/fechamento/utils";
import { useOrganizations } from "@/lib/hooks/useAdminDashboard";
import { downloadCsv } from "@/lib/utils/exportCsv";
import { EspelhoPontoModal } from "./EspelhoPontoModal";
import { RelatorioFechamentoModal } from "./RelatorioFechamentoModal";

interface Props {
  adminOrgId: string | null;
  isManagerView?: boolean;
}

function formatMinutes(minutes: number): string {
  const isPositive = minutes >= 0;
  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  const sign = isPositive ? "" : "-";
  return `${sign}${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function FechamentoClient({ adminOrgId, isManagerView }: Props) {
  const [organizationId, setOrganizationId] = useState<string>(
    isManagerView && adminOrgId ? adminOrgId : "__all__"
  );
  const dateNow = new Date();
  const [year, setYear] = useState<number>(dateNow.getFullYear());
  const [month, setMonth] = useState<number>(dateNow.getMonth() + 1); // 1 a 12
  
  const [items, setItems] = useState<FechamentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const [selectedEmployee, setSelectedEmployee] = useState<FechamentoItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [selectedRelatorioEmployee, setSelectedRelatorioEmployee] = useState<FechamentoItem | null>(null);
  const [relatorioModalOpen, setRelatorioModalOpen] = useState(false);
  
  const { organizations } = useOrganizations();

  const reloadConsolidado = useCallback(() => {
    setLoading(true);
    setRefreshCount((c) => c + 1);
  }, []);

  const currentPeriod = getFechamentoDateRange(year, month, "cutoff_21_20");

  useEffect(() => {
    let isMounted = true;
    getConsolidadoMensal(organizationId, year, month, "cutoff_21_20").then((res) => {
      if (!isMounted) return;
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setItems(res.data ?? []);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [organizationId, year, month, refreshCount]);

  function handleExportCsv() {
    if (items.length === 0) return;

    const dataForCsv = items.map(i => ({
      Matricula: i.employeeCode || "",
      Funcionario: i.userName,
      Faltas: i.qtdFaltas,
      HorasPrevistas: formatMinutes(i.horasPrevistasMin),
      HorasTrabalhadas: formatMinutes(i.horasRealizadasMin),
      MovimentacaoBancoHoras: formatMinutes(i.saldoMesMin),
      Pendencia: i.temPendencia ? "Sim" : "Não"
    }));

    const filename = `Fechamento_21a20_${year}_${month.toString().padStart(2, "0")}.csv`;
    downloadCsv(dataForCsv, filename);
  }

  const orgName = organizations.find((o) => o.id === organizationId)?.name;
  const temPendenciaGeral = items.some(i => i.temPendencia);

  return (
    <Box minH="100svh" bg="bg" py={8}>
      <Container maxW="6xl" px={{ base: 4, md: 6, lg: 8 }}>
        <Stack gap={6}>

          {/* ── Cabeçalho ── */}
          <Flex
            align={{ base: "flex-start", md: "center" }}
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            gap={4}
            pb={4}
            borderBottomWidth="1px"
            borderColor="border.subtle"
          >
            <Flex align="center" gap={3}>
              <Box p={3} rounded="xl" bg="primary.subtle" color="brand.300" borderWidth="1px" borderColor="primary.border" shadow="sm">
                <FileText size={24} />
              </Box>
              <Box>
                <Heading size="xl" color="fg">
                  Fechamento de Plantões
                </Heading>
                <Text fontSize="sm" color="fg.muted" mt={0.5}>
                  {orgName && organizationId !== "__all__" ? `${orgName} — ` : ""}
                  Período: <strong style={{ color: "#7DA9D8" }}>{currentPeriod.periodoFormatado}</strong> (Corte 21 a 20)
                </Text>
              </Box>
            </Flex>

            <Flex gap={3} align="center" wrap="wrap">
              {!isManagerView && (
                <NativeSelectRoot size="sm" w="200px">
                  <NativeSelectField
                    value={organizationId}
                    onChange={(e) => {
                      setLoading(true);
                      setOrganizationId(e.target.value);
                    }}
                    bg="bg.surface"
                    rounded="lg"
                  >
                    <option value="__all__">Todas as Empresas</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </NativeSelectField>
                </NativeSelectRoot>
              )}

              <NativeSelectRoot size="sm" w="240px">
                <NativeSelectField
                  value={month.toString()}
                  onChange={(e) => {
                    setLoading(true);
                    setMonth(parseInt(e.target.value));
                  }}
                  bg="bg.surface"
                  rounded="lg"
                >
                  <option value="1">21/Dez a 20/Jan (Ref. Janeiro)</option>
                  <option value="2">21/Jan a 20/Fev (Ref. Fevereiro)</option>
                  <option value="3">21/Fev a 20/Mar (Ref. Março)</option>
                  <option value="4">21/Mar a 20/Abr (Ref. Abril)</option>
                  <option value="5">21/Abr a 20/Mai (Ref. Maio)</option>
                  <option value="6">21/Mai a 20/Jun (Ref. Junho)</option>
                  <option value="7">21/Jun a 20/Jul (Ref. Julho)</option>
                  <option value="8">21/Jul a 20/Ago (Ref. Agosto)</option>
                  <option value="9">21/Ago a 20/Set (Ref. Setembro)</option>
                  <option value="10">21/Set a 20/Out (Ref. Outubro)</option>
                  <option value="11">21/Out a 20/Nov (Ref. Novembro)</option>
                  <option value="12">21/Nov a 20/Dez (Ref. Dezembro)</option>
                </NativeSelectField>
              </NativeSelectRoot>

              <NativeSelectRoot size="sm" w="100px">
                <NativeSelectField
                  value={year.toString()}
                  onChange={(e) => {
                    setLoading(true);
                    setYear(parseInt(e.target.value));
                  }}
                  bg="bg.surface"
                  rounded="lg"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </NativeSelectField>
              </NativeSelectRoot>
            </Flex>
          </Flex>

          {/* ── Status do Mês ── */}
          {!loading && items.length > 0 && (
            <Flex bg="card" p={4} rounded="xl" borderWidth="1px" borderColor="border.subtle" justify="space-between" align="center">
              <Box>
                <Text fontSize="sm" color="fg.muted">Total de Funcionários</Text>
                <Heading size="md">{items.length}</Heading>
              </Box>

              <Flex gap={4} align="center">
                {temPendenciaGeral ? (
                  <Badge colorPalette="orange" size="lg" px={3} py={1} rounded="full">
                    <AlertCircle size={14} style={{ marginRight: 6 }} /> 
                    Há pontos abertos neste mês
                  </Badge>
                ) : (
                  <Badge colorPalette="green" size="lg" px={3} py={1} rounded="full">
                    <CheckCircle size={14} style={{ marginRight: 6 }} />
                    Mês Apto para Fechamento
                  </Badge>
                )}
                
                <Button colorPalette="blue" size="sm" onClick={handleExportCsv} disabled={items.length === 0}>
                  <Download size={16} /> Exportar CSV
                </Button>
              </Flex>
            </Flex>
          )}

          {/* ── Loading & Erros ── */}
          {loading && (
            <Flex justify="center" py={12}>
              <Spinner color="brand.400" />
            </Flex>
          )}

          {errorMsg && (
            <Box bg="red.subtle" borderWidth="1px" borderColor="red.emphasized" rounded="lg" p={4}>
              <Text fontSize="sm" color="red.fg">{errorMsg}</Text>
            </Box>
          )}

          {/* ── Tabela ── */}
          {!loading && organizationId && (
            <Box bg="card" rounded="xl" borderWidth="1px" borderColor="border.subtle" overflowX="auto" shadow="sm">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row bg="bg.subtle">
                    <Table.ColumnHeader>Nome / Matrícula</Table.ColumnHeader>
                    <Table.ColumnHeader>Faltas</Table.ColumnHeader>
                    <Table.ColumnHeader>Horas Previstas</Table.ColumnHeader>
                    <Table.ColumnHeader>Horas Trabalhadas</Table.ColumnHeader>
                    <Table.ColumnHeader>Movim. Banco</Table.ColumnHeader>
                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Ações</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {items.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={7} textAlign="center" py={8} color="fg.muted">
                        Nenhum dado encontrado para o período.
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    items.map((i) => {
                      return (
                        <Table.Row key={i.userId} _hover={{ bg: "whiteAlpha.50" }} transition="background 0.15s">
                          <Table.Cell fontWeight="medium">
                            {i.userName}
                            <Text as="div" color="fg.muted" fontSize="xs">
                              {i.employeeCode || "Sem matrícula"}
                              {organizationId === "__all__" && i.organizationName && (
                                <Text as="span" color="brand.300" ml={1}>
                                  · {i.organizationName}
                                </Text>
                              )}
                            </Text>
                          </Table.Cell>

                          <Table.Cell>
                            {i.qtdFaltas > 0 ? (
                              <Badge colorPalette="red" variant="subtle">{i.qtdFaltas}</Badge>
                            ) : (
                              <Text color="fg.muted">0</Text>
                            )}
                          </Table.Cell>

                          <Table.Cell>{formatMinutes(i.horasPrevistasMin)}</Table.Cell>
                          <Table.Cell>{formatMinutes(i.horasRealizadasMin)}</Table.Cell>
                          
                          <Table.Cell>
                            {i.saldoMesMin !== 0 ? (
                              <Badge colorPalette={i.saldoMesMin > 0 ? "green" : "red"} variant="subtle">
                                {i.saldoMesMin > 0 ? "+" : ""}{formatMinutes(i.saldoMesMin)}
                              </Badge>
                            ) : (
                              <Text color="fg.muted">00:00</Text>
                            )}
                          </Table.Cell>

                          <Table.Cell>
                            {i.temPendencia ? (
                              <Badge colorPalette="orange" variant="solid">Pendente</Badge>
                            ) : i.isValidated ? (
                              <Badge colorPalette="green" variant="subtle">Validado</Badge>
                            ) : (
                              <Badge colorPalette="gray" variant="subtle">Fechado</Badge>
                            )}
                          </Table.Cell>

                          <Table.Cell textAlign="right">
                            <Flex justify="flex-end" gap={2}>
                              <Button
                                size="xs"
                                variant="outline"
                                colorPalette="blue"
                                onClick={() => {
                                  setSelectedEmployee(i);
                                  setModalOpen(true);
                                }}
                                title="Ver espelho e ajustar pontos"
                              >
                                <Pencil size={12} style={{ marginRight: 4 }} />
                                Espelho
                              </Button>

                              <Button
                                size="xs"
                                variant="surface"
                                colorPalette="teal"
                                onClick={() => {
                                  setSelectedRelatorioEmployee(i);
                                  setRelatorioModalOpen(true);
                                }}
                                title="Gerar Relatório Oficial em PDF com estilo de serviços prestados"
                              >
                                <Printer size={12} style={{ marginRight: 4 }} />
                                Relatório PDF
                              </Button>
                            </Flex>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })
                  )}
                </Table.Body>
              </Table.Root>
            </Box>
          )}

        </Stack>
      </Container>

      {selectedEmployee && (
        <EspelhoPontoModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setSelectedEmployee(null);
          }}
          userId={selectedEmployee.userId}
          userName={selectedEmployee.userName}
          organizationId={organizationId === "__all__" ? "__all__" : (organizationId || selectedEmployee.organizationId || "__all__")}
          year={year}
          month={month}
          onSuccess={reloadConsolidado}
        />
      )}

      {selectedRelatorioEmployee && (
        <RelatorioFechamentoModal
          open={relatorioModalOpen}
          onClose={() => {
            setRelatorioModalOpen(false);
            setSelectedRelatorioEmployee(null);
          }}
          userId={selectedRelatorioEmployee.userId}
          userName={selectedRelatorioEmployee.userName}
          organizationId={organizationId === "__all__" ? "__all__" : (organizationId || selectedRelatorioEmployee.organizationId || "__all__")}
          year={year}
          month={month}
        />
      )}
    </Box>
  );
}
