"use client";

import { Box, Button, Container, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { useState, useMemo } from "react";
import { CalendarDays, Zap } from "lucide-react";
import { FiltersBar } from "@/components/admin/escalas/FiltersBar";
import { CalendarioEscala } from "@/components/admin/escalas/CalendarioEscala";
import { GeradorEscalaModal } from "@/components/admin/escalas/GeradorEscalaModal";
import { useOrganizations } from "@/lib/hooks/useAdminDashboard";
import { useShiftsDoMes } from "@/lib/hooks/useEscalasDoMes";


export function EscalasMensaisClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12

  const { organizations, loading: orgsLoading } = useOrganizations();
  const organizationIds = useMemo(() => organizations.map((o) => o.id), [organizations]);

  const { shifts, loading: shiftsLoading, error: shiftsError, refresh } =
    useShiftsDoMes(organizationIds, year, month);

  return (
    <Box minH="100svh" bg="bg" py={8}>
      <Container maxW="full" px={{ base: 4, md: 6, lg: 8 }}>
        <Stack gap={6}>
          {/* ── Cabeçalho ── */}
          <Flex
            align={{ base: "flex-start", md: "center" }}
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            gap={4}
            pb={4}
            borderBottomWidth="1px"
            borderColor="border"
          >
            <Flex align="center" gap={3}>
              <Box p={3} rounded="xl" bg="brand.security" color="brand.metal" shadow="sm">
                <CalendarDays size={24} />
              </Box>
              <Box>
                <Heading size="xl" color="fg">
                  Gestão de Escalas
                </Heading>
                <Text fontSize="sm" color="mutedForeground" mt={0.5}>
                  Visualize e monte a escala mensal das organizações
                </Text>
              </Box>
            </Flex>
          </Flex>

          {/* ── Filtros ── */}
          <FiltersBar
            year={year}
            month={month}
            onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
          />

          {/* ── Grade de Escala ── */}
          <CalendarioEscala
            year={year}
            month={month}
            organizations={organizations}
            shifts={shifts}
            loading={shiftsLoading || orgsLoading}
            error={shiftsError}
            onRefresh={refresh}
          />
        </Stack>
      </Container>
    </Box>
  );
}
