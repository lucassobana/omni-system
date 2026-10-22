"use client";

import {
  Box, Button, Container, Flex, Heading, Stack, Text,
  Badge, Spinner, Table, NativeSelectRoot, NativeSelectField,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback } from "react";
import { Clock, Plus, History } from "lucide-react";
import { getSaldosBancoDeHoras, type SaldoFuncionario } from "@/app/dashboard/admin/banco-de-horas/actions";
import { useOrganizations } from "@/lib/hooks/useAdminDashboard";
import { ExtratoModal } from "@/components/admin/banco-de-horas/ExtratoModal";
import { AjusteSaldoModal } from "@/components/admin/banco-de-horas/AjusteSaldoModal";

interface Props {
  adminOrgId: string | null;
  isManagerView?: boolean;
}

function formatSaldo(minutes: number): { text: string; color: string } {
  if (minutes === 0) return { text: "0h 0m", color: "gray" };
  
  const isPositive = minutes > 0;
  const absMinutes = Math.abs(minutes);
  const h = Math.floor(absMinutes / 60);
  const m = absMinutes % 60;
  
  const text = `${isPositive ? "+" : "-"} ${h > 0 ? `${h}h ` : ""}${m}m`;
  const color = isPositive ? "green" : "red";
  
  return { text, color };
}

export function BancoHorasClient({ adminOrgId, isManagerView }: Props) {
  const [organizationId, setOrganizationId] = useState<string>(
    isManagerView && adminOrgId ? adminOrgId : "__all__"
  );
  const [saldos, setSaldos] = useState<SaldoFuncionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  
  const { organizations } = useOrganizations();

  // Modal de Extrato
  const [extratoOpen, setExtratoOpen] = useState(false);
  const [selectedExtratoUser, setSelectedExtratoUser] = useState<{ id: string; name: string } | null>(null);

  // Modal de Ajuste
  const [ajusteOpen, setAjusteOpen] = useState(false);
  const [selectedAjusteUser, setSelectedAjusteUser] = useState<{ id: string; name: string } | null>(null);

  const reloadSaldos = useCallback(() => {
    setLoading(true);
    setRefreshCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    getSaldosBancoDeHoras(organizationId).then((res) => {
      if (!isMounted) return;
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSaldos(res.data ?? []);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [organizationId, refreshCount]);

  function handleVerExtrato(f: SaldoFuncionario) {
    setSelectedExtratoUser({ id: f.userId, name: f.fullName });
    setExtratoOpen(true);
  }

  function handleAjuste(f: SaldoFuncionario) {
    setSelectedAjusteUser({ id: f.userId, name: f.fullName });
    setAjusteOpen(true);
  }

  const orgName = organizations.find((o) => o.id === organizationId)?.name;

  return (
    <Box minH="100svh" bg="bg" py={8}>
      <Container maxW="5xl" px={{ base: 4, md: 6, lg: 8 }}>
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
                <Clock size={24} />
              </Box>
              <Box>
                <Heading size="xl" color="fg">
                  Banco de Horas
                </Heading>
                <Text fontSize="sm" color="fg.muted" mt={0.5}>
                  {orgName && organizationId !== "__all__" ? `${orgName} — ` : ""}Acompanhe saldos e visualize extratos.
                </Text>
              </Box>
            </Flex>

            {!isManagerView && (
              <Flex gap={3} align="center">
                <NativeSelectRoot size="sm" w="220px">
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
              </Flex>
            )}
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

          {/* ── Lista ── */}
          {!loading && (
            <Box bg="card" rounded="xl" borderWidth="1px" borderColor="border.subtle" overflowX="auto" shadow="sm">
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row bg="bg.subtle">
                    <Table.ColumnHeader>Nome</Table.ColumnHeader>
                    <Table.ColumnHeader>Matrícula</Table.ColumnHeader>
                    <Table.ColumnHeader>Saldo Atual</Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right">Ações</Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {saldos.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={4} textAlign="center" py={8} color="fg.muted">
                        Nenhum funcionário com banco de horas nesta organização.
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    saldos.map((f) => {
                      const saldoFormatado = formatSaldo(f.saldoMinutos);
                      return (
                        <Table.Row key={f.userId} _hover={{ bg: "whiteAlpha.50" }} transition="background 0.15s">
                          <Table.Cell fontWeight="medium">
                            {f.fullName}
                            {organizationId === "__all__" && f.organizationName && (
                              <Text as="div" color="brand.300" fontSize="xs">{f.organizationName}</Text>
                            )}
                          </Table.Cell>
                          <Table.Cell color="fg.muted">{f.employeeCode || "—"}</Table.Cell>
                          <Table.Cell>
                            <Badge colorPalette={saldoFormatado.color} variant="subtle" size="md">
                              {saldoFormatado.text}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell textAlign="right">
                            <Flex justify="flex-end" gap={2}>
                              <Button variant="ghost" size="xs" onClick={() => handleVerExtrato(f)} title="Ver Extrato">
                                <History size={14} /> Extrato
                              </Button>
                              <Button variant="surface" size="xs" onClick={() => handleAjuste(f)} title="Ajuste Manual">
                                <Plus size={14} /> Ajuste
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

      {/* ── Modais ── */}
      {organizationId && (
        <>
          <ExtratoModal
            open={extratoOpen}
            onClose={() => setExtratoOpen(false)}
            organizationId={organizationId}
            userId={selectedExtratoUser?.id ?? null}
            userName={selectedExtratoUser?.name ?? null}
          />
          
          <AjusteSaldoModal
            open={ajusteOpen}
            onClose={() => setAjusteOpen(false)}
            onSuccess={() => { setAjusteOpen(false); reloadSaldos(); }}
            organizationId={organizationId}
            userId={selectedAjusteUser?.id ?? null}
            userName={selectedAjusteUser?.name ?? null}
          />
        </>
      )}
    </Box>
  );
}
