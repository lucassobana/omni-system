"use client";

import {
  Box,
  Heading,
  Text,
  Badge,
  Flex,
  Spinner,
  Alert,
  Table,
} from "@chakra-ui/react";
import { ClipboardList } from "lucide-react";
import type { WorkRecord } from "@/lib/hooks/useAdminDashboard";

interface Props {
  records: WorkRecord[];
  loading: boolean;
  error: string | null;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function duration(clockIn: string, clockOut: string | null, actualHours: number | null): string {
  if (actualHours) {
    return `${actualHours}h`;
  }
  if (!clockOut) return "Em andamento";
  const diffMs = new Date(clockOut).getTime() - new Date(clockIn).getTime();
  const totalMin = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'open':
      return <Badge colorPalette="green" variant="subtle" rounded="full" px={2}>Aberto</Badge>;
    case 'awaiting_continuation':
      return <Badge colorPalette="yellow" variant="subtle" rounded="full" px={2}>Aguard. Conf.</Badge>;
    case 'closed':
      return <Badge colorPalette="gray" variant="subtle" rounded="full" px={2}>Encerrado</Badge>;
    case 'closed_with_occurrence':
      return <Badge colorPalette="red" variant="subtle" rounded="full" px={2}>Ocorrência</Badge>;
    case 'auto_closed':
      return <Badge colorPalette="purple" variant="subtle" rounded="full" px={2}>Auto-encerrado</Badge>;
    default:
      return <Badge colorPalette="gray" variant="subtle" rounded="full" px={2}>{status}</Badge>;
  }
}

export function TodayWorkRecords({ records, loading, error }: Props) {
  return (
    <Box
      bg="card"
      borderWidth="1px"
      borderColor="border.subtle"
      rounded="xl"
      p={6}
      shadow="sm"
    >
      {/* Cabeçalho */}
      <Flex align="center" gap={3} mb={5}>
        <Box p={2.5} rounded="lg" bg="primary.subtle" color="brand.300" borderWidth="1px" borderColor="primary.border">
          <ClipboardList size={20} />
        </Box>
        <Box>
          <Heading size="md" color="fg">
            Registros de Ponto de Hoje
          </Heading>
          <Text fontSize="sm" color="fg.muted">
            Eventos clock_in / clock_out do dia atual
          </Text>
        </Box>
        <Badge colorPalette="blue" ml="auto" px={3} py={1} rounded="full">
          {records.length} {records.length === 1 ? "registro" : "registros"}
        </Badge>
      </Flex>

      {/* Estados */}
      {loading && (
        <Flex justify="center" py={8}>
          <Spinner color="brand.400" />
        </Flex>
      )}

      {error && (
        <Alert.Root status="error" rounded="lg">
          <Alert.Indicator />
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
      )}

      {!loading && !error && records.length === 0 && (
        <Flex
          direction="column"
          align="center"
          justify="center"
          py={10}
          color="fg.muted"
          gap={2}
        >
          <ClipboardList size={24} />
          <Text fontSize="sm">Nenhum registro de ponto encontrado hoje.</Text>
        </Flex>
      )}

      {/* Tabela */}
      {!loading && !error && records.length > 0 && (
        <Box overflowX="auto">
          <Table.Root size="sm" variant="outline">
            <Table.Header>
              <Table.Row bg="bg.subtle" borderColor="border.subtle">
                <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase" letterSpacing="wider">
                  Funcionário
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase" letterSpacing="wider">
                  Jornada Decl.
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase" letterSpacing="wider">
                  Entrada
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase" letterSpacing="wider">
                  Saída
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase" letterSpacing="wider">
                  Duração
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase" letterSpacing="wider">
                  Veículo
                </Table.ColumnHeader>
                <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase" letterSpacing="wider">
                  Status
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {records.map((r) => {
                const isOpen = r.status === 'open' || r.status === 'awaiting_continuation';
                return (
                  <Table.Row key={r.id} _hover={{ bg: "whiteAlpha.50" }} transition="background 0.15s" borderColor="border.subtle">
                    <Table.Cell fontWeight="medium" color="fg">
                      {r.employee_name}
                    </Table.Cell>
                    <Table.Cell fontWeight="medium" color="fg">
                      {r.declared_shift_hours_current || r.declared_shift_hours_initial ? `${r.declared_shift_hours_current || r.declared_shift_hours_initial}h` : '—'}
                    </Table.Cell>
                    <Table.Cell color="success.fg" fontWeight="semibold">
                      {formatDateTime(r.clock_in)}
                    </Table.Cell>
                    <Table.Cell color={isOpen ? "fg.muted" : "destructive.fg"}>
                      {formatDateTime(r.clock_out)}
                    </Table.Cell>
                    <Table.Cell color="fg.muted" fontSize="xs">
                      {duration(r.clock_in, r.clock_out, r.actual_hours)}
                    </Table.Cell>
                    <Table.Cell>
                      {r.uses_vehicle ? (
                        <Badge colorPalette="blue" variant="subtle" rounded="full" px={2.5} fontSize="xs">
                          🚗 Sim
                        </Badge>
                      ) : (
                        <Text color="fg.subtle" fontSize="xs">—</Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {getStatusBadge(r.status)}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Root>
        </Box>
      )}
    </Box>
  );
}
