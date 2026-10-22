"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  Flex,
  createListCollection,
} from "@chakra-ui/react";
import {
  SelectRoot,
  SelectTrigger,
  SelectValueText,
  SelectContent,
  SelectItem,
  Portal,
  SelectPositioner
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import { LayoutDashboard, Building2 } from "lucide-react";
import {
  useOrganizations,
  useTodayWorkRecords,
} from "@/lib/hooks/useAdminDashboard";
import { TodayWorkRecords } from "./TodayWorkRecords";

interface Props {
  adminName: string;
  fixedOrgId?: string;
  fixedOrgName?: string;
  isManagerView?: boolean;
}

export function AdminDashboard({
  adminName,
  fixedOrgId,
  fixedOrgName,
  isManagerView,
}: Props) {
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(fixedOrgId || null);

  const { organizations, loading: orgsLoading } = useOrganizations();

  const { records, loading: recordsLoading, error: recordsError } =
    useTodayWorkRecords(selectedOrgId);

  // Estatísticas de registros de ponto em tempo real
  const stats = useMemo(() => {
    const ativos = records.filter((r) => !r.clock_out).length;
    const encerrados = records.filter((r) => r.clock_out).length;
    const totalHoje = records.length;
    const totalHoras = parseFloat((records.reduce((acc, r) => acc + (r.actual_hours || 0), 0)).toFixed(1));
    return { ativos, encerrados, totalHoje, totalHoras };
  }, [records]);

  // Lista de opções para o Select
  const orgCollection = useMemo(() => {
    return createListCollection({
      items: [
        { label: "Todas as Organizações", value: "__all__" },
        ...organizations.map((o) => ({ label: o.name, value: o.id })),
      ],
    });
  }, [organizations]);

  function handleOrgChange(details: { value: string[] }) {
    const val = details.value[0];
    setSelectedOrgId(val === "__all__" ? null : val ?? null);
  }

  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Box minH="100svh" bg="bg" py={8}>
      <Container maxW="full" px={{ base: 4, md: 6, lg: 8 }}>
        <Stack gap={8}>
          <Flex
            direction={{ base: "column", md: "row" }}
            align={{ base: "flex-start", md: "center" }}
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
                <LayoutDashboard size={24} />
              </Box>
              <Box>
                <Heading size="xl" color="fg">
                  {fixedOrgName ? fixedOrgName : "Painel Gerencial"}
                </Heading>
                <Text fontSize="sm" color="fg.muted" mt={0.5}>
                  {fixedOrgName ? "Dashboard da Empresa · " : ""}
                  Bem-vindo,{" "}
                  <Text as="span" fontWeight="semibold" color="fg">
                    {adminName}
                  </Text>{" "}
                  · {today}
                </Text>
              </Box>
            </Flex>
          </Flex>

          {/* ── KPI Cards ──────────────────────────────────────────────── */}
          <Flex gap={4} wrap="wrap">
            {[
              {
                label: "Em Serviço Agora",
                value: stats.ativos,
                textColor: "success.fg",
                sub: "colaboradores ativos",
              },
              {
                label: "Encerraram Hoje",
                value: stats.encerrados,
                textColor: "brand.300",
                sub: "turnos finalizados",
              },
              {
                label: "Total Registros",
                value: stats.totalHoje,
                textColor: "fg",
                sub: "sessões hoje",
              },
              {
                label: "Horas Apuradas",
                value: `${stats.totalHoras}h`,
                textColor: "info.fg",
                sub: "tempo total trabalhado",
              },
            ].map((kpi) => (
              <Box
                key={kpi.label}
                flex={{ base: "1 1 45%", md: "1" }}
                minW="140px"
                bg="card"
                borderWidth="1px"
                borderColor="border.subtle"
                rounded="xl"
                p={5}
                shadow="sm"
                transition="all 0.2s"
                _hover={{ borderColor: "border.emphasized", bg: "card.hover" }}
              >
                <Text fontSize="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wider" fontWeight="semibold">
                  {kpi.label}
                </Text>
                <Text
                  fontSize="3xl"
                  fontWeight="bold"
                  color={kpi.textColor}
                  lineHeight="1.2"
                  mt={1}
                >
                  {kpi.value}
                </Text>
                <Text fontSize="xs" color="fg.muted" mt={0.5}>
                  {kpi.sub}
                </Text>
              </Box>
            ))}
          </Flex>

          {/* ── Filtro de Organização ────────────────────────────────────── */}
          {!isManagerView && (
            <Flex align="center" gap={3} wrap="wrap">
              <Flex align="center" gap={2} color="fg.muted">
                <Building2 size={16} />
                <Text fontSize="sm" fontWeight="medium">
                  Filtrar por organização:
                </Text>
              </Flex>
              <Box minW="260px">
                <SelectRoot
                  collection={orgCollection}
                  defaultValue={["__all__"]}
                  onValueChange={handleOrgChange}
                  disabled={orgsLoading}
                  size="sm"
                  positioning={{ sameWidth: true, placement: "bottom-start" }}
                >
                  <SelectTrigger
                    bg="card"
                    borderColor="border.subtle"
                    rounded="lg"
                    _hover={{ borderColor: "primary.border" }}
                    transition="all 0.2s"
                  >
                    <SelectValueText placeholder="Selecionar organização…" />
                  </SelectTrigger>
                  <Portal>
                    <SelectPositioner>
                      <SelectContent
                        bg="popover"
                        borderColor="border.emphasized"
                        rounded="xl"
                        shadow="2xl"
                        animation="fadeIn 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                        pl={1}
                      >
                        {orgCollection.items.map((item) => (
                          <SelectItem
                            key={item.value}
                            item={item}
                            _hover={{ bg: "bg.muted" }}
                            cursor="pointer"
                            transition="all 0.1s"
                          >
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectPositioner>
                  </Portal>
                </SelectRoot>
              </Box>
            </Flex>
          )}

          {/* ── Registros de Ponto ──────────────────────────────────────── */}
          <TodayWorkRecords
            records={records}
            loading={recordsLoading}
            error={recordsError}
          />
        </Stack>
      </Container>
    </Box>
  );
}
