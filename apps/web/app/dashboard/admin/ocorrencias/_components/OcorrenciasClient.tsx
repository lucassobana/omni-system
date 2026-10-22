"use client";

import {
  Box, Button, Container, Flex, Heading, Stack, Text,
  Badge, Spinner, Table,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { getOccurrences, resolveOccurrence, type OccurrenceItem } from "@/app/dashboard/admin/ocorrencias/actions";
import { useOrganizations } from "@/lib/hooks/useAdminDashboard";

interface Props {
  adminOrgId: string | null;
}

function timeFromIso(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}

export function OcorrenciasClient({ adminOrgId }: Props) {
  const { organizations } = useOrganizations();
  const organizationId = adminOrgId || (organizations.length === 1 ? organizations[0].id : null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  
  const [items, setItems] = useState<OccurrenceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    let ignore = false;
    getOccurrences(organizationId, filter)
      .then((res) => {
        if (ignore) return;
        if (res.error) setErrorMsg(res.error);
        else setItems(res.data ?? []);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [organizationId, filter]);

  async function handleAction(occurrenceId: string, action: "APPROVED" | "REJECTED") {
    if (!confirm(`Confirmar ${action === 'APPROVED' ? 'Aprovação' : 'Rejeição'} desta ocorrência?`)) return;
    const res = await resolveOccurrence(occurrenceId, action);
    if (res.error) {
      alert("Erro: " + res.error);
    } else if (organizationId) {
      setLoading(true);
      const next = await getOccurrences(organizationId, filter);
      if (next.error) setErrorMsg(next.error);
      else setItems(next.data ?? []);
      setLoading(false);
    }
  }

  const orgName = organizations.find((o) => o.id === organizationId)?.name;

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
                <AlertTriangle size={24} />
              </Box>
              <Box>
                <Heading size="xl" color="fg">
                  Central de Ocorrências
                </Heading>
                <Text fontSize="sm" color="fg.muted" mt={0.5}>
                  {orgName ? `${orgName} — ` : ""}Analise e valide divergências de jornada da equipe.
                </Text>
              </Box>
            </Flex>

            <Flex gap={2} align="center">
              <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                Status:
              </Text>
              <select
                value={filter}
                onChange={(e) => {
                  setFilter(e.target.value as "pending" | "all");
                  setLoading(true);
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "#0E1B30",
                  color: "#F8FAFC",
                  fontSize: "13px",
                  outline: "none",
                }}
              >
                <option value="pending">Pendentes</option>
                <option value="all">Todas</option>
              </select>
            </Flex>
          </Flex>

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
                    <Table.ColumnHeader>Data</Table.ColumnHeader>
                    <Table.ColumnHeader>Funcionário</Table.ColumnHeader>
                    <Table.ColumnHeader>Ocorrência</Table.ColumnHeader>
                    <Table.ColumnHeader>Detalhes do Ponto</Table.ColumnHeader>
                    <Table.ColumnHeader>Status</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Ações</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {items.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={6} textAlign="center" py={8} color="fg.muted">
                        Nenhuma ocorrência encontrada.
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    items.map((i) => {
                      const wr = i.work_record;
                      return (
                        <Table.Row key={i.id} _hover={{ bg: "whiteAlpha.50" }} transition="background 0.15s">
                          <Table.Cell color="fg.muted">
                            {formatDate(i.created_at)}
                          </Table.Cell>
                          
                          <Table.Cell fontWeight="medium">
                            {wr.employee_name}
                          </Table.Cell>

                          <Table.Cell>
                            <Badge colorPalette="orange" variant="subtle">{i.type}</Badge>
                            <Text fontSize="xs" color="fg.muted" mt={1}>{i.description}</Text>
                          </Table.Cell>

                          <Table.Cell>
                            <Text fontSize="xs" color="fg.muted">
                              {wr.declared_shift_hours_current || wr.declared_shift_hours_initial ? `Declarado: ${wr.declared_shift_hours_current || wr.declared_shift_hours_initial}h` : '—'}
                            </Text>
                            <Text fontSize="xs" color="fg.muted">
                              Real: {wr.actual_hours ?? '—'}h
                            </Text>
                            <Text fontSize="xs" color="fg.muted">
                              ({timeFromIso(wr.clock_in)} - {timeFromIso(wr.clock_out)})
                            </Text>
                          </Table.Cell>

                          <Table.Cell>
                            {i.status === 'PENDING' ? (
                              <Badge colorPalette="yellow" variant="subtle">Pendente</Badge>
                            ) : i.status === 'APPROVED' ? (
                              <Badge colorPalette="green" variant="subtle">Aprovada</Badge>
                            ) : (
                              <Badge colorPalette="red" variant="subtle">Rejeitada</Badge>
                            )}
                          </Table.Cell>

                          <Table.Cell textAlign="right">
                            {i.status === 'PENDING' && (
                              <Flex justify="flex-end" gap={2}>
                                <Button variant="ghost" size="xs" colorPalette="green" onClick={() => handleAction(i.id, 'APPROVED')}>
                                  <CheckCircle size={14} style={{ marginRight: 4 }} /> Aprovar
                                </Button>
                                <Button variant="ghost" size="xs" colorPalette="red" onClick={() => handleAction(i.id, 'REJECTED')}>
                                  <XCircle size={14} style={{ marginRight: 4 }} /> Rejeitar
                                </Button>
                              </Flex>
                            )}
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
    </Box>
  );
}
