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
import { useState, useEffect, useCallback, useMemo } from "react";
import { Users, Plus, Pencil, Building2, Search, UserCheck, Briefcase, Car } from "lucide-react";
import { FuncionarioModal, type FuncionarioData } from "@/components/admin/equipe/FuncionarioModal";
import { OrganizacoesModal } from "@/components/admin/equipe/OrganizacoesModal";
import { getEmployeesWithOrgs } from "../actions";
import { useOrganizations } from "@/lib/hooks/useAdminDashboard";

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  manager: "Gerente",
  member: "Funcionário",
  owner: "Admin",
};

interface Props {
  adminOrgId: string | null;
  fixedOrgId?: string;
  isManagerView?: boolean;
}

export function EquipeClient({ adminOrgId, fixedOrgId, isManagerView }: Props) {
  const [selectedOrgFilter, setSelectedOrgFilter] = useState<string>(fixedOrgId || "__all__");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("__all__");
  const [statusFilter, setStatusFilter] = useState<string>("__all__");

  const [funcionarios, setFuncionarios] = useState<FuncionarioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [orgModalOpen, setOrgModalOpen] = useState(false);
  const [editing, setEditing] = useState<FuncionarioData | null>(null);
  const { organizations, refresh: refreshOrganizations } = useOrganizations();
  const [refreshCount, setRefreshCount] = useState(0);

  // Carrega os colaboradores cruzando com as organizações (suporta N:N)
  useEffect(() => {
    let isMounted = true;

    getEmployeesWithOrgs(selectedOrgFilter).then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setErrorMsg(error);
      } else {
        setFuncionarios(data || []);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedOrgFilter, refreshCount]);

  // Limpa feedback de sucesso após 4 segundos
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  const reload = useCallback(() => {
    setLoading(true);
    setRefreshCount((c) => c + 1);
    refreshOrganizations?.();
  }, [refreshOrganizations]);

  // Filtros em memória (busca por nome/matrícula/empresa, cargo, status)
  const filteredFuncionarios = useMemo(() => {
    return funcionarios.filter((f) => {
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = f.full_name?.toLowerCase().includes(term);
        const matchesCode = f.employee_code?.toLowerCase().includes(term);
        const matchesOrg = f.organizations_list?.some((o) => o.name.toLowerCase().includes(term));
        if (!matchesName && !matchesCode && !matchesOrg) return false;
      }

      if (selectedOrgFilter !== "__all__") {
        const matchesOrg =
          f.organization_id === selectedOrgFilter ||
          (f.organizations_list && f.organizations_list.some((o) => o.id === selectedOrgFilter));
        if (!matchesOrg) return false;
      }

      if (roleFilter !== "__all__" && f.role !== roleFilter) {
        return false;
      }

      if (statusFilter !== "__all__" && f.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [funcionarios, searchTerm, selectedOrgFilter, roleFilter, statusFilter]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const total = funcionarios.length;
    const ativos = funcionarios.filter((f) => f.status === "active").length;
    const allOrgIds = new Set<string>();
    for (const f of funcionarios) {
      if (f.organization_id) allOrgIds.add(f.organization_id);
      if (f.organizations_list) {
        for (const o of f.organizations_list) {
          allOrgIds.add(o.id);
        }
      }
    }
    const totalOrgs = allOrgIds.size;
    return { total, ativos, totalOrgs };
  }, [funcionarios]);

  function handleEdit(f: FuncionarioData) {
    refreshOrganizations?.();
    setEditing(f);
    setModalOpen(true);
  }

  function handleNew() {
    refreshOrganizations?.();
    setEditing(null);
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
                <Users size={26} />
              </Box>
              <Box>
                <Heading size="xl" color="fg">
                  Gestão de Funcionários & Empresas
                </Heading>
                <Text fontSize="sm" color="fg.muted" mt={0.5}>
                  Visualize colaboradores e gerencie o vínculo deles com cada organização
                </Text>
              </Box>
            </Flex>

            <Flex gap={2} align="center">
              <Button
                variant="outline"
                size="md"
                onClick={() => setOrgModalOpen(true)}
              >
                <Car size={16} />
                Organizações & Veículos
              </Button>

              <Button
                colorPalette="blue"
                size="md"
                onClick={handleNew}
                disabled={organizations.length === 0}
              >
                <Plus size={16} />
                Novo Funcionário
              </Button>
            </Flex>
          </Flex>

          {/* ── KPI Cards ── */}
          <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4}>
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
                  Total Colaboradores
                </Text>
                <Box p={1.5} rounded="md" bg="primary.subtle" color="brand.300" borderWidth="1px" borderColor="primary.border">
                  <Briefcase size={16} />
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
                <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
                  Empresas com Vínculo
                </Text>
                <Box p={1.5} rounded="md" bg="primary.subtle" color="brand.300" borderWidth="1px" borderColor="primary.border">
                  <Building2 size={16} />
                </Box>
              </Flex>
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {stats.totalOrgs}
                <Text as="span" fontSize="xs" color="fg.muted" fontWeight="normal" ml={1}>
                  / {organizations.length} ativas
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
                <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wider">
                  Colaboradores Ativos
                </Text>
                <Box p={1.5} rounded="md" bg="success.subtle" color="success.fg" borderWidth="1px" borderColor="success.border">
                  <UserCheck size={16} />
                </Box>
              </Flex>
              <Text fontSize="2xl" fontWeight="bold" color="fg">
                {stats.ativos}
                <Text as="span" fontSize="xs" color="success.fg" fontWeight="semibold" ml={2}>
                  ({stats.total > 0 ? Math.round((stats.ativos / stats.total) * 100) : 0}%)
                </Text>
              </Text>
            </Box>
          </SimpleGrid>

          {/* ── Barra de Filtros e Busca ── */}
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
              {/* Campo de Busca */}
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
                  placeholder="Buscar colaborador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="sm"
                  pl={9}
                  rounded="lg"
                  borderColor="border.subtle"
                />
              </Box>

              {/* Filtro Empresa */}
              {!isManagerView && (
                <Box minW={{ base: "full", md: "220px" }}>
                  <NativeSelectRoot size="sm">
                    <NativeSelectField
                      value={selectedOrgFilter}
                      onChange={(e) => {
                        setLoading(true);
                        setSelectedOrgFilter(e.target.value);
                      }}
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
              )}

              {/* Filtro Perfil */}
              <Box minW={{ base: "full", md: "150px" }}>
                <NativeSelectRoot size="sm">
                  <NativeSelectField
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    borderColor="border.subtle"
                    rounded="lg"
                    bg="bg.surface"
                  >
                    <option value="__all__">Todos os Cargos</option>
                    <option value="member">Funcionário</option>
                    <option value="manager">Gerente</option>
                    <option value="admin">Admin</option>
                  </NativeSelectField>
                </NativeSelectRoot>
              </Box>

              {/* Filtro Status */}
              <Box minW={{ base: "full", md: "140px" }}>
                <NativeSelectRoot size="sm">
                  <NativeSelectField
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    borderColor="border.subtle"
                    rounded="lg"
                    bg="bg.surface"
                  >
                    <option value="__all__">Todos os Status</option>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </NativeSelectField>
                </NativeSelectRoot>
              </Box>
            </Flex>
          </Box>

          {/* ── Feedback de Mensagens ── */}
          {successMsg && (
            <Box bg="green.subtle" borderWidth="1px" borderColor="green.emphasized" rounded="lg" p={3.5}>
              <Text fontSize="sm" color="green.fg" fontWeight="medium">
                {successMsg}
              </Text>
            </Box>
          )}

          {errorMsg && (
            <Box bg="red.subtle" borderWidth="1px" borderColor="red.emphasized" rounded="lg" p={3.5}>
              <Text fontSize="sm" color="red.fg">{errorMsg}</Text>
            </Box>
          )}

          {/* ── Loading Spinner ── */}
          {loading && (
            <Flex justify="center" py={12}>
              <Spinner color="blue.500" />
            </Flex>
          )}

          {/* ── Tabela Principal ── */}
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
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Colaborador
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Empresas Vinculadas
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Perfil
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Status
                    </Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Contratação
                    </Table.ColumnHeader>
                    <Table.ColumnHeader textAlign="right" fontWeight="semibold" color="fg.muted" fontSize="xs" textTransform="uppercase">
                      Ações
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filteredFuncionarios.length === 0 ? (
                    <Table.Row>
                      <Table.Cell colSpan={6} textAlign="center" py={10} color="fg.muted">
                        <Users size={36} style={{ margin: "0 auto", opacity: 0.25, marginBottom: 8 }} />
                        <Text fontWeight="medium">Nenhum funcionário encontrado com os filtros selecionados.</Text>
                      </Table.Cell>
                    </Table.Row>
                  ) : (
                    filteredFuncionarios.map((f) => {
                      const initial = f.full_name ? f.full_name.charAt(0).toUpperCase() : "?";
                      return (
                        <Table.Row key={f.id} _hover={{ bg: "whiteAlpha.50" }} transition="background 0.15s">
                          {/* Colaborador */}
                          <Table.Cell py={3}>
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
                                flexShrink={0}
                              >
                                {initial}
                              </Flex>
                              <Box>
                                <Text fontWeight="medium" color="fg">
                                  {f.full_name}
                                </Text>
                              </Box>
                            </Flex>
                          </Table.Cell>

                          {/* Empresas Vinculadas */}
                          <Table.Cell>
                            <Flex align="center" justify="space-between" gap={2} maxW="360px">
                              <Flex wrap="wrap" gap={1.5} align="center">
                                {f.organizations_list && f.organizations_list.length > 0 ? (
                                  f.organizations_list.map((org) => {
                                    const isPrimary = org.id === f.organization_id;
                                    return (
                                      <Badge
                                        key={org.id}
                                        colorPalette={isPrimary ? "blue" : "gray"}
                                        variant={isPrimary ? "solid" : "subtle"}
                                        size="sm"
                                        rounded="md"
                                        px={2}
                                        py={0.5}
                                        title={isPrimary ? "Empresa Principal" : "Empresa Vinculada"}
                                        cursor="pointer"
                                        onClick={() => handleEdit(f)}
                                        transition="opacity 0.15s"
                                        _hover={{ opacity: 0.8 }}
                                      >
                                        {isPrimary ? `★ ${org.name}` : org.name}
                                      </Badge>
                                    );
                                  })
                                ) : (
                                  <Badge colorPalette="gray" variant="subtle" size="sm" rounded="md">
                                    {f.organization_name || "Sem organização"}
                                  </Badge>
                                )}
                              </Flex>
                              <Button
                                variant="ghost"
                                size="xs"
                                colorPalette="blue"
                                onClick={() => handleEdit(f)}
                                title="Editar empresas vinculadas deste colaborador"
                                p={1}
                                minW="auto"
                                h="auto"
                              >
                                <Building2 size={14} />
                              </Button>
                            </Flex>
                          </Table.Cell>

                          {/* Perfil */}
                          <Table.Cell>
                            <Badge
                              colorPalette={
                                f.role === "admin" || f.role === "owner"
                                  ? "purple"
                                  : f.role === "manager"
                                  ? "blue"
                                  : "gray"
                              }
                              variant="subtle"
                              rounded="full"
                              px={2}
                            >
                              {ROLE_LABELS[f.role] || "Funcionário"}
                            </Badge>
                          </Table.Cell>

                          {/* Status */}
                          <Table.Cell>
                            <Badge
                              colorPalette={f.status === "active" ? "green" : "red"}
                              variant="subtle"
                              rounded="full"
                              px={2}
                            >
                              {f.status === "active" ? "Ativo" : "Inativo"}
                            </Badge>
                          </Table.Cell>

                          {/* Contratação */}
                          <Table.Cell color="fg.muted" fontSize="xs">
                            {f.hire_date
                              ? new Date(`${f.hire_date}T12:00:00Z`).toLocaleDateString("pt-BR")
                              : "—"}
                          </Table.Cell>

                          {/* Ações */}
                          <Table.Cell textAlign="right">
                            <Button
                              variant="ghost"
                              size="xs"
                              onClick={() => handleEdit(f)}
                              title="Editar Detalhes"
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
      <FuncionarioModal
        key={modalOpen ? (editing?.id || "novo") : "closed"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false);
          setSuccessMsg(
            editing
              ? "Colaborador atualizado com sucesso!"
              : "Colaborador cadastrado com sucesso!"
          );
          reload();
        }}
        organizationId={selectedOrgFilter !== "__all__" ? selectedOrgFilter : (adminOrgId || organizations[0]?.id || "")}
        organizations={organizations}
        existing={editing}
      />

      {/* ── Modal de Configuração de Organizações & Veículos ── */}
      <OrganizacoesModal
        key={orgModalOpen ? "org-open" : "org-closed"}
        open={orgModalOpen}
        onClose={() => setOrgModalOpen(false)}
        organizations={organizations}
        onUpdated={() => reload()}
      />
    </Box>
  );
}
