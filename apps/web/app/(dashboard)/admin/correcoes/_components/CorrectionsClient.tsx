"use client";

import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Stack,
  Text,
  Badge,
  Spinner,
  Table,
  Input,
  NativeSelectRoot,
  NativeSelectField,
  SimpleGrid,
  Tabs,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  CheckSquare,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  RotateCw,
  Building2,
  Calendar,
  Eye,
  Pencil,
} from "lucide-react";
import { getCorrections, type CorrectionItem } from "../actions";
import { useOrganizations } from "@/lib/hooks/useAdminDashboard";
import { ReviewModal } from "./ReviewModal";

interface Props {
  adminOrgId: string | null;
  initialCorrections?: CorrectionItem[];
}

function formatDate(iso: string) {
  if (!iso) return "--/--/----";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

function formatDateTime(iso: string) {
  if (!iso) return "--/--/---- --:--";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function extractTime(iso: string | null | undefined) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function CorrectionsClient({ adminOrgId, initialCorrections }: Props) {
  const [corrections, setCorrections] = useState<CorrectionItem[]>(initialCorrections || []);
  const [loading, setLoading] = useState(!initialCorrections);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>("__all__");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  const [selectedCorrection, setSelectedCorrection] = useState<CorrectionItem | null>(null);
  const { organizations } = useOrganizations();

  // Carrega as correções
  const loadData = useCallback(() => {
    setLoading(true);
    getCorrections(selectedOrgFilter).then(({ data, error }) => {
      if (error) {
        setErrorMsg(error);
      } else {
        setCorrections(data || []);
      }
      setLoading(false);
    });
  }, [selectedOrgFilter]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshCount]);

  // Limpa feedback de sucesso após 4s
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // Filtros em memória (busca por colaborador, empresa ou justificativa)
  const filteredCorrections = useMemo(() => {
    return corrections.filter((c) => {
      // Filtro de status
      if (statusFilter !== "all" && c.status !== statusFilter) {
        return false;
      }

      // Filtro de organização
      if (selectedOrgFilter !== "__all__") {
        const matchesOrg =
          c.organization_id === selectedOrgFilter ||
          c.profile?.organization_id === selectedOrgFilter;
        if (!matchesOrg) return false;
      }

      // Filtro de texto (nome, matrícula, justificativa, empresa)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = c.profile?.full_name?.toLowerCase().includes(term);
        const matchesCode = c.profile?.employee_code?.toLowerCase().includes(term);
        const matchesJustification = c.justification?.toLowerCase().includes(term);
        const matchesOrg =
          c.organizations?.name?.toLowerCase().includes(term) ||
          c.profile?.organizations?.name?.toLowerCase().includes(term);

        if (!matchesName && !matchesCode && !matchesJustification && !matchesOrg) {
          return false;
        }
      }

      return true;
    });
  }, [corrections, statusFilter, selectedOrgFilter, searchTerm]);

  // Contagens para os cards e tabs
  const stats = useMemo(() => {
    // Escopo respeitando apenas o filtro de organização para os KPIs
    const scoped = corrections.filter((c) => {
      if (selectedOrgFilter === "__all__") return true;
      return (
        c.organization_id === selectedOrgFilter ||
        c.profile?.organization_id === selectedOrgFilter
      );
    });

    const pending = scoped.filter((c) => c.status === "pending").length;
    const approved = scoped.filter((c) => c.status === "approved").length;
    const rejected = scoped.filter((c) => c.status === "rejected").length;
    const total = scoped.length;

    return { pending, approved, rejected, total };
  }, [corrections, selectedOrgFilter]);

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
              <Box
                p={3}
                rounded="xl"
                bg="primary.subtle"
                color="brand.300"
                borderWidth="1px"
                borderColor="primary.border"
                shadow="sm"
              >
                <CheckSquare size={26} />
              </Box>
              <Box>
                <Heading size="xl" color="fg">
                  Ajustes de Ponto
                </Heading>
                <Text fontSize="sm" color="fg.muted" mt={0.5}>
                  Analise e aprove as solicitações de correção de ponto enviadas pelos colaboradores
                </Text>
              </Box>
            </Flex>

            <Flex gap={2} align="center">
              <Button
                variant="outline"
                size="md"
                onClick={() => setRefreshCount((c) => c + 1)}
                loading={loading}
              >
                <RotateCw size={15} />
                Atualizar
              </Button>
            </Flex>
          </Flex>

          {/* ── KPI Cards ── */}
          <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} gap={4}>
            {/* Pendentes */}
            <Box
              p={4}
              bg="card"
              rounded="xl"
              borderWidth="1px"
              borderColor={stats.pending > 0 ? "yellow.muted" : "border.subtle"}
              shadow="xs"
              transition="all 0.2s"
              _hover={{ borderColor: "yellow.focusRing", shadow: "md" }}
            >
              <Flex align="center" justify="space-between" mb={2}>
                <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
                  Pendentes de Análise
                </Text>
                <Box p={1.5} rounded="md" bg="yellow.subtle" color="yellow.fg" borderWidth="1px" borderColor="yellow.muted">
                  <Clock size={16} />
                </Box>
              </Flex>
              <Flex align="baseline" gap={2}>
                <Text fontSize="2xl" fontWeight="bold" color={stats.pending > 0 ? "yellow.fg" : "fg"}>
                  {stats.pending}
                </Text>
                {stats.pending > 0 && (
                  <Badge size="xs" colorPalette="yellow" variant="subtle">
                    Ação necessária
                  </Badge>
                )}
              </Flex>
            </Box>

            {/* Aprovados */}
            <Box
              p={4}
              bg="card"
              rounded="xl"
              borderWidth="1px"
              borderColor="border.subtle"
              shadow="xs"
              transition="all 0.2s"
              _hover={{ borderColor: "green.focusRing", shadow: "md" }}
            >
              <Flex align="center" justify="space-between" mb={2}>
                <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
                  Aprovados
                </Text>
                <Box p={1.5} rounded="md" bg="green.subtle" color="green.fg" borderWidth="1px" borderColor="green.muted">
                  <CheckCircle2 size={16} />
                </Box>
              </Flex>
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {stats.approved}
              </Text>
            </Box>

            {/* Rejeitados */}
            <Box
              p={4}
              bg="card"
              rounded="xl"
              borderWidth="1px"
              borderColor="border.subtle"
              shadow="xs"
              transition="all 0.2s"
              _hover={{ borderColor: "red.focusRing", shadow: "md" }}
            >
              <Flex align="center" justify="space-between" mb={2}>
                <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
                  Rejeitados
                </Text>
                <Box p={1.5} rounded="md" bg="red.subtle" color="red.fg" borderWidth="1px" borderColor="red.muted">
                  <XCircle size={16} />
                </Box>
              </Flex>
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {stats.rejected}
              </Text>
            </Box>

            {/* Total */}
            <Box
              p={4}
              bg="card"
              rounded="xl"
              borderWidth="1px"
              borderColor="border.subtle"
              shadow="xs"
              transition="all 0.2s"
              _hover={{ borderColor: "primary.border", shadow: "md" }}
            >
              <Flex align="center" justify="space-between" mb={2}>
                <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
                  Total de Solicitações
                </Text>
                <Box p={1.5} rounded="md" bg="primary.subtle" color="brand.300" borderWidth="1px" borderColor="primary.border">
                  <FileText size={16} />
                </Box>
              </Flex>
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {stats.total}
              </Text>
            </Box>
          </SimpleGrid>

          {/* ── Barra de Filtros ── */}
          <Box
            bg="card"
            p={4}
            rounded="xl"
            borderWidth="1px"
            borderColor="border.subtle"
            shadow="xs"
          >
            <Flex
              direction={{ base: "column", md: "row" }}
              gap={3}
              align={{ base: "stretch", md: "center" }}
              justify="space-between"
            >
              {/* Campo de Busca */}
              <Box position="relative" flex="1">
                <Flex
                  position="absolute"
                  left={3}
                  top="50%"
                  transform="translateY(-50%)"
                  color="fg.muted"
                  pointerEvents="none"
                  zIndex={1}
                >
                  <Search size={16} />
                </Flex>
                <Input
                  placeholder="Buscar colaborador, justificativa, matrícula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="sm"
                  pl={9}
                  rounded="lg"
                  borderColor="border.subtle"
                  bg="bg.surface"
                />
              </Box>

              {/* Filtro por Empresa */}
              <Box minW={{ base: "full", md: "240px" }}>
                <NativeSelectRoot size="sm">
                  <NativeSelectField
                    value={selectedOrgFilter}
                    onChange={(e) => setSelectedOrgFilter(e.target.value)}
                    borderColor="border.subtle"
                    rounded="lg"
                    bg="bg.surface"
                  >
                    <option value="__all__">Todas as Empresas</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </NativeSelectField>
                </NativeSelectRoot>
              </Box>
            </Flex>
          </Box>

          {/* ── Feedback de Mensagens ── */}
          {successMsg && (
            <Box bg="green.subtle" borderWidth="1px" borderColor="green.muted" rounded="lg" p={3.5}>
              <Text fontSize="sm" color="green.fg" fontWeight="medium">
                {successMsg}
              </Text>
            </Box>
          )}

          {errorMsg && (
            <Box bg="red.subtle" borderWidth="1px" borderColor="red.muted" rounded="lg" p={3.5}>
              <Text fontSize="sm" color="red.fg">{errorMsg}</Text>
            </Box>
          )}

          {/* ── Tabs de Status ── */}
          <Tabs.Root
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v.value)}
            variant="line"
          >
            <Tabs.List borderColor="border.subtle">
              <Tabs.Trigger value="pending" gap={2}>
                Pendentes
                <Badge size="xs" colorPalette={stats.pending > 0 ? "yellow" : "gray"} variant="subtle">
                  {stats.pending}
                </Badge>
              </Tabs.Trigger>
              <Tabs.Trigger value="approved" gap={2}>
                Aprovados
                <Badge size="xs" colorPalette="green" variant="subtle">
                  {stats.approved}
                </Badge>
              </Tabs.Trigger>
              <Tabs.Trigger value="rejected" gap={2}>
                Rejeitados
                <Badge size="xs" colorPalette="red" variant="subtle">
                  {stats.rejected}
                </Badge>
              </Tabs.Trigger>
              <Tabs.Trigger value="all" gap={2}>
                Todos
                <Badge size="xs" colorPalette="gray" variant="subtle">
                  {stats.total}
                </Badge>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>

          {/* ── Loading Spinner ── */}
          {loading && (
            <Flex justify="center" py={12}>
              <Spinner color="blue.500" />
            </Flex>
          )}

          {/* ── Tabela Principal ── */}
          {!loading && (
            <Box
              bg="card"
              rounded="xl"
              borderWidth="1px"
              borderColor="border.subtle"
              overflowX="auto"
              shadow="sm"
            >
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row bg="bg.subtle">
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Colaborador
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Solicitação
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Ocorrência
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Tipo
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Horário Original
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Horário Sugerido
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Justificativa
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Status
                    </Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right" fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Ações
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredCorrections.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={9} textAlign="center" py={12} color="fg.muted">
                        <CheckSquare size={36} style={{ margin: "0 auto", opacity: 0.25, marginBottom: 8 }} />
                        <Text fontWeight="medium" fontSize="sm">
                          Nenhuma solicitação de ajuste encontrada com os filtros selecionados.
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    filteredCorrections.map((c) => {
                      const employeeName = c.profile?.full_name || "Colaborador";
                      const orgName = c.organizations?.name || c.profile?.organizations?.name || "Empresa";
                      const initial = employeeName.charAt(0).toUpperCase();
                      const isClockIn = c.type === "clock_in";
                      const originalTime = isClockIn
                        ? extractTime(c.work_records?.clock_in)
                        : extractTime(c.work_records?.clock_out);
                      const isPending = c.status === "pending";

                      return (
                        <Table.Row key={c.id} _hover={{ bg: "whiteAlpha.50" }} transition="background 0.15s">
                          {/* Colaborador */}
                          <Table.Cell py={3.5}>
                            <Flex align="center" gap={3}>
                              <Flex
                                w={8}
                                h={8}
                                rounded="full"
                                bg="primary.subtle"
                                color="brand.300"
                                borderWidth="1px"
                                borderColor="primary.border"
                                align="center"
                                justify="center"
                                fontWeight="bold"
                                fontSize="xs"
                                shrink={0}
                              >
                                {initial}
                              </Flex>
                              <Box>
                                <Text fontWeight="medium" color="fg" fontSize="sm">
                                  {employeeName}
                                </Text>
                                <Flex align="center" gap={1} color="fg.muted" fontSize="xs" mt={0.5}>
                                  <Building2 size={12} />
                                  <Text>{orgName}</Text>
                                </Flex>
                              </Box>
                            </Flex>
                          </Table.Cell>

                          {/* Data de Solicitação */}
                          <Table.Cell color="fg.muted" fontSize="xs" whiteSpace="nowrap">
                            {formatDateTime(c.created_at)}
                          </Table.Cell>

                          {/* Data da Ocorrência */}
                          <Table.Cell whiteSpace="nowrap">
                            <Flex align="center" gap={1.5} fontSize="xs" color="fg" fontWeight="medium">
                              <Calendar size={13} color="#7DA9D8" />
                              {formatDate(c.occurrence_date)}
                            </Flex>
                          </Table.Cell>

                          {/* Tipo */}
                          <Table.Cell>
                            <Badge colorPalette={isClockIn ? "blue" : "purple"} variant="subtle" size="sm">
                              {isClockIn ? "Entrada" : "Saída"}
                            </Badge>
                          </Table.Cell>

                          {/* Horário Original */}
                          <Table.Cell fontSize="sm" color="fg.muted" whiteSpace="nowrap">
                            <Text as={originalTime !== "--:--" ? "s" : "span"} opacity={originalTime !== "--:--" ? 0.6 : 1}>
                              {originalTime}
                            </Text>
                          </Table.Cell>

                          {/* Horário Sugerido */}
                          <Table.Cell whiteSpace="nowrap">
                            <Text fontWeight="bold" color="blue.400" fontSize="sm">
                              {c.suggested_time ? c.suggested_time.slice(0, 5) : "--:--"}
                            </Text>
                          </Table.Cell>

                          {/* Justificativa */}
                          <Table.Cell maxW="200px">
                            <Text
                              fontSize="xs"
                              color="fg.muted"
                              fontStyle="italic"
                              overflow="hidden"
                              textOverflow="ellipsis"
                              whiteSpace="nowrap"
                              title={c.justification}
                            >
                              &ldquo;{c.justification}&rdquo;
                            </Text>
                          </Table.Cell>

                          {/* Status */}
                          <Table.Cell whiteSpace="nowrap">
                            {c.status === "pending" && (
                              <Badge colorPalette="yellow" variant="subtle" size="sm">
                                Pendente
                              </Badge>
                            )}
                            {c.status === "approved" && (
                              <Badge colorPalette="green" variant="subtle" size="sm">
                                Aprovado
                              </Badge>
                            )}
                            {c.status === "rejected" && (
                              <Badge colorPalette="red" variant="subtle" size="sm">
                                Rejeitado
                              </Badge>
                            )}
                          </Table.Cell>

                          {/* Ações */}
                          <Table.Cell textAlign="right" whiteSpace="nowrap">
                            <Button
                              size="sm"
                              variant={isPending ? "outline" : "ghost"}
                              colorPalette={isPending ? "blue" : "gray"}
                              onClick={() => setSelectedCorrection(c)}
                            >
                              {isPending ? (
                                <>
                                  <Pencil size={14} />
                                  Analisar
                                </>
                              ) : (
                                <>
                                  <Eye size={14} />
                                  Detalhes
                                </>
                              )}
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })
                  )}
                </Table.Body>
              </Table.Root>
            </Box>
          )}

          {/* ── Modal de Revisão ── */}
          {selectedCorrection && (
            <ReviewModal
              isOpen={true}
              onClose={() => setSelectedCorrection(null)}
              correction={selectedCorrection}
              onSuccess={() => {
                setSuccessMsg("Ajuste de ponto processado com sucesso!");
                setRefreshCount((c) => c + 1);
              }}
            />
          )}
        </Stack>
      </Container>
    </Box>
  );
}
