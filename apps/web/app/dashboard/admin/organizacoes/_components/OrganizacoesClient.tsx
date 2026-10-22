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
} from "@chakra-ui/react";
import { useState, useEffect, useCallback, useMemo, useTransition } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Search,
  Car,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import {
  getOrganizationsWithStats,
  toggleOrganizationVehicle,
  toggleOrganizationStatus,
  type OrganizationWithStats,
} from "../actions";
import { OrganizationModal } from "./OrganizationModal";

export function OrganizacoesClient() {
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<string>("__all__");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationWithStats | null>(null);

  const [isPendingAction, startTransition] = useTransition();
  const [updatingVehicleId, setUpdatingVehicleId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await getOrganizationsWithStats();
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setOrganizations(res.data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Estatísticas agregadas
  const stats = useMemo(() => {
    const total = organizations.length;
    const active = organizations.filter((o) => o.status === "active").length;
    const withVehicle = organizations.filter((o) => o.has_vehicle).length;
    const totalEmployees = organizations.reduce((acc, o) => acc + o.employee_count, 0);

    return { total, active, withVehicle, totalEmployees };
  }, [organizations]);

  // Filtros em memória
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((o) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = o.name.toLowerCase().includes(term);
        const matchesSlug = o.slug.toLowerCase().includes(term);
        const matchesDoc = o.document?.toLowerCase().includes(term);
        if (!matchesName && !matchesSlug && !matchesDoc) return false;
      }

      if (vehicleFilter === "yes" && !o.has_vehicle) return false;
      if (vehicleFilter === "no" && o.has_vehicle) return false;

      if (statusFilter !== "__all__" && o.status !== statusFilter) return false;

      return true;
    });
  }, [organizations, searchTerm, vehicleFilter, statusFilter]);

  // Toggle rápido de veículo
  function handleQuickToggleVehicle(org: OrganizationWithStats) {
    const nextVal = !org.has_vehicle;
    setUpdatingVehicleId(org.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await toggleOrganizationVehicle(org.id, nextVal);
      setUpdatingVehicleId(null);
      if (res.error) {
        setErrorMsg(`Erro ao alterar veículo: ${res.error}`);
      } else {
        setSuccessMsg(
          `Uso de veículo para "${org.name}" ${nextVal ? "ativado" : "desativado"} com sucesso.`
        );
        setOrganizations((prev) =>
          prev.map((o) => (o.id === org.id ? { ...o, has_vehicle: nextVal } : o))
        );
      }
    });
  }

  // Toggle rápido de status
  function handleQuickToggleStatus(org: OrganizationWithStats) {
    const nextStatus = org.status === "active" ? "inactive" : "active";
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await toggleOrganizationStatus(org.id, nextStatus);
      if (res.error) {
        setErrorMsg(`Erro ao alterar status: ${res.error}`);
      } else {
        setSuccessMsg(
          `Organização "${org.name}" marcada como ${
            nextStatus === "active" ? "Ativa" : "Inativa"
          }.`
        );
        setOrganizations((prev) =>
          prev.map((o) => (o.id === org.id ? { ...o, status: nextStatus } : o))
        );
      }
    });
  }

  function handleCreate() {
    setEditingOrg(null);
    setModalOpen(true);
  }

  function handleEdit(org: OrganizationWithStats) {
    setEditingOrg(org);
    setModalOpen(true);
  }

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
                <Building2 size={26} />
              </Box>
              <Box>
                <Heading size="xl" color="fg">
                  Gestão de Organizações
                </Heading>
                <Text fontSize="sm" color="fg.muted" mt={0.5}>
                  Cadastre e gerencie empresas, filiais e regras de uso de veículos no ponto
                </Text>
              </Box>
            </Flex>

            <Button colorPalette="blue" size="md" onClick={handleCreate}>
              <Plus size={16} />
              Nova Organização
            </Button>
          </Flex>

          {/* ── KPI Cards ── */}
          <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} gap={4}>
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
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="fg.muted"
                  textTransform="uppercase"
                  letterSpacing="wider"
                >
                  Total Empresas
                </Text>
                <Box p={1.5} rounded="md" bg="primary.subtle" color="brand.300" borderWidth="1px" borderColor="primary.border">
                  <Building2 size={16} />
                </Box>
              </Flex>
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {stats.total}
              </Text>
            </Box>

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
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="fg.muted"
                  textTransform="uppercase"
                  letterSpacing="wider"
                >
                  Empresas Ativas
                </Text>
                <Box p={1.5} rounded="md" bg="success.subtle" color="success.fg" borderWidth="1px" borderColor="success.border">
                  <CheckCircle2 size={16} />
                </Box>
              </Flex>
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {stats.active}
                <Text as="span" fontSize="xs" color="fg.muted" fontWeight="normal" ml={1}>
                  / {stats.total}
                </Text>
              </Text>
            </Box>

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
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="fg.muted"
                  textTransform="uppercase"
                  letterSpacing="wider"
                >
                  Com Veículo
                </Text>
                <Box p={1.5} rounded="md" bg="primary.subtle" color="brand.300" borderWidth="1px" borderColor="primary.border">
                  <Car size={16} />
                </Box>
              </Flex>
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {stats.withVehicle}
              </Text>
            </Box>

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
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  color="fg.muted"
                  textTransform="uppercase"
                  letterSpacing="wider"
                >
                  Colaboradores Vinculados
                </Text>
                <Box p={1.5} rounded="md" bg="warning.subtle" color="warning.fg" borderWidth="1px" borderColor="warning.border">
                  <Users size={16} />
                </Box>
              </Flex>
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {stats.totalEmployees}
              </Text>
            </Box>
          </SimpleGrid>

          {/* ── Barra de Filtros ── */}
          <Box
            p={4}
            bg="bg.surface"
            rounded="xl"
            borderWidth="1px"
            borderColor="border.subtle"
            shadow="xs"
          >
            <Flex
              direction={{ base: "column", md: "row" }}
              gap={3}
              align={{ base: "stretch", md: "center" }}
            >
              <Box flex="1" position="relative">
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
                  placeholder="Buscar por nome, slug ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="sm"
                  pl={9}
                  rounded="lg"
                  borderColor="border.subtle"
                />
              </Box>

              {/* Filtro Veículo */}
              <Box minW={{ base: "full", md: "190px" }}>
                <NativeSelectRoot size="sm">
                  <NativeSelectField
                    value={vehicleFilter}
                    onChange={(e) => setVehicleFilter(e.target.value)}
                    borderColor="border.subtle"
                    rounded="lg"
                    bg="bg.surface"
                  >
                    <option value="__all__">Todos os Veículos</option>
                    <option value="yes">Possui Veículo</option>
                    <option value="no">Sem Veículo</option>
                  </NativeSelectField>
                </NativeSelectRoot>
              </Box>

              {/* Filtro Status */}
              <Box minW={{ base: "full", md: "150px" }}>
                <NativeSelectRoot size="sm">
                  <NativeSelectField
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    borderColor="border.subtle"
                    rounded="lg"
                    bg="bg.surface"
                  >
                    <option value="__all__">Todos os Status</option>
                    <option value="active">Ativas</option>
                    <option value="inactive">Inativas</option>
                  </NativeSelectField>
                </NativeSelectRoot>
              </Box>
            </Flex>
          </Box>

          {/* ── Feedback de Mensagens ── */}
          {successMsg && (
            <Box
              bg="green.subtle"
              borderWidth="1px"
              borderColor="green.emphasized"
              rounded="lg"
              p={3.5}
            >
              <Text fontSize="sm" color="green.fg" fontWeight="medium">
                {successMsg}
              </Text>
            </Box>
          )}

          {errorMsg && (
            <Box
              bg="red.subtle"
              borderWidth="1px"
              borderColor="red.emphasized"
              rounded="lg"
              p={3.5}
            >
              <Text fontSize="sm" color="red.fg">
                {errorMsg}
              </Text>
            </Box>
          )}

          {/* ── Loading Spinner ── */}
          {loading && (
            <Flex justify="center" py={12}>
              <Spinner color="purple.500" />
            </Flex>
          )}

          {/* ── Tabela de Organizações ── */}
          {!loading && (
            <Box
              bg="bg.surface"
              rounded="xl"
              borderWidth="1px"
              borderColor="border.subtle"
              overflowX="auto"
              shadow="sm"
            >
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row bg="bg.subtle">
                    <Table.ColumnHeader
                      fontWeight="semibold"
                      color="fg.muted"
                      fontSize="xs"
                      textTransform="uppercase"
                    >
                      Empresa / Identificador
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontWeight="semibold"
                      color="fg.muted"
                      fontSize="xs"
                      textTransform="uppercase"
                    >
                      Documento / Contato
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontWeight="semibold"
                      color="fg.muted"
                      fontSize="xs"
                      textTransform="uppercase"
                    >
                      Colaboradores
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontWeight="semibold"
                      color="fg.muted"
                      fontSize="xs"
                      textTransform="uppercase"
                    >
                      Veículo no Ponto
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      fontWeight="semibold"
                      color="fg.muted"
                      fontSize="xs"
                      textTransform="uppercase"
                    >
                      Status
                    </Table.ColumnHeader>
                    <Table.ColumnHeader
                      textAlign="right"
                      fontWeight="semibold"
                      color="fg.muted"
                      fontSize="xs"
                      textTransform="uppercase"
                    >
                      Ações
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredOrganizations.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={6} textAlign="center" py={10} color="fg.muted">
                        <Building2
                          size={36}
                          style={{ margin: "0 auto", opacity: 0.25, marginBottom: 8 }}
                        />
                        <Text fontWeight="medium">
                          Nenhuma organização encontrada com os filtros selecionados.
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    filteredOrganizations.map((org) => {
                      const isUpdatingVeh = updatingVehicleId === org.id;

                      return (
                        <Table.Row
                          key={org.id}
                          _hover={{ bg: "whiteAlpha.50" }}
                          transition="background 0.15s"
                        >
                          {/* Nome & Slug */}
                          <Table.Cell py={3}>
                            <Flex align="center" gap={3}>
                              <Flex
                                w={9}
                                h={9}
                                rounded="lg"
                                bg="primary.subtle"
                                color="brand.300"
                                borderWidth="1px"
                                borderColor="primary.border"
                                align="center"
                                justify="center"
                                fontWeight="bold"
                                fontSize="sm"
                                flexShrink={0}
                              >
                                <Building2 size={18} />
                              </Flex>
                              <Box>
                                <Text fontWeight="semibold" color="fg">
                                  {org.name}
                                </Text>
                                <Text
                                  fontSize="2xs"
                                  color="fg.muted"
                                  fontFamily="mono"
                                >
                                  {org.slug}
                                </Text>
                              </Box>
                            </Flex>
                          </Table.Cell>

                          {/* Documento / Contato */}
                          <Table.Cell>
                            <Box>
                              <Text fontSize="xs" color="fg" fontWeight="medium">
                                {org.document || "—"}
                              </Text>
                              {(org.email || org.phone) && (
                                <Text fontSize="2xs" color="fg.muted">
                                  {[org.email, org.phone].filter(Boolean).join(" • ")}
                                </Text>
                              )}
                            </Box>
                          </Table.Cell>

                          {/* Colaboradores */}
                          <Table.Cell>
                            <Badge
                              colorPalette="blue"
                              variant="subtle"
                              rounded="full"
                              px={2.5}
                              py={0.5}
                            >
                              <Users size={12} style={{ marginRight: 4 }} />
                              {org.employee_count}{" "}
                              {org.employee_count === 1 ? "vínculo" : "vínculos"}
                            </Badge>
                          </Table.Cell>

                          {/* Veículo no Ponto com Toggle Rápido */}
                          <Table.Cell>
                            <Button
                              size="xs"
                              variant={org.has_vehicle ? "surface" : "outline"}
                              colorPalette={org.has_vehicle ? "blue" : "gray"}
                              onClick={() => handleQuickToggleVehicle(org)}
                              disabled={isPendingAction}
                              rounded="full"
                              px={2.5}
                            >
                              {isUpdatingVeh ? (
                                <Spinner size="xs" />
                              ) : org.has_vehicle ? (
                                <>
                                  <Car size={13} style={{ marginRight: 4 }} />
                                  Exige Veículo
                                </>
                              ) : (
                                "Sem Veículo"
                              )}
                            </Button>
                          </Table.Cell>

                          {/* Status com Toggle Rápido */}
                          <Table.Cell>
                            <Button
                              size="xs"
                              variant="subtle"
                              colorPalette={org.status === "active" ? "green" : "red"}
                              onClick={() => handleQuickToggleStatus(org)}
                              disabled={isPendingAction}
                              rounded="full"
                              px={2.5}
                            >
                              {org.status === "active" ? (
                                <>
                                  <CheckCircle2 size={12} style={{ marginRight: 4 }} />
                                  Ativa
                                </>
                              ) : (
                                <>
                                  <XCircle size={12} style={{ marginRight: 4 }} />
                                  Inativa
                                </>
                              )}
                            </Button>
                          </Table.Cell>

                          {/* Ações */}
                          <Table.Cell textAlign="right">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleEdit(org)}
                              title="Editar Organização"
                            >
                              <Pencil size={14} />
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
        </Stack>
      </Container>

      {/* ── Modal de Criação / Edição ── */}
      <OrganizationModal
        key={modalOpen ? (editingOrg?.id || "nova-org") : "closed"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          loadData();
        }}
        existing={editingOrg}
      />
    </Box>
  );
}
