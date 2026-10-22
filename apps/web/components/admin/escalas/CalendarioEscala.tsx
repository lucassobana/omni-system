"use client";

import {
  Box, Flex, Text, Badge, Spinner,
} from "@chakra-ui/react";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { ShiftDoMes } from "@/lib/hooks/useEscalasDoMes";
import { TurnosDaOrgModal } from "./TurnosDaOrgModal";

interface Props {
  year: number;
  month: number; // 1-12
  organizations: { id: string; name: string }[];
  shifts: ShiftDoMes[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

const WEEKDAY_ABBR = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const getDayColor = (day: number, isAltRow: boolean = false, isToday: boolean = false) => {
  if (isToday) {
    return isAltRow ? "rgba(62, 143, 230, 0.45)" : "rgba(66, 142, 224, 0.57)";
  }
  const isEvenDay = day % 2 === 0;
  if (isAltRow) {
    return isEvenDay ? "rgba(37, 72, 123, 0.10)" : "rgba(37, 72, 123, 0.40)";
  }
  return isEvenDay ? "rgba(37, 72, 123, 0.15)" : "rgba(37, 71, 123, 0.5)";
};

function formatHour(iso: string): string {
  if (!iso) return "";
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

export function CalendarioEscala({
  year, month, organizations, shifts, loading, error, onRefresh,
}: Props) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  const isCurrentMonth = year === currentYear && month === currentMonth;

  // Gera array de dias do mês: [{day, weekday}]
  const days = useMemo(() => {
    const count = new Date(year, month, 0).getDate();
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(Date.UTC(year, month - 1, i + 1));
      return { day: i + 1, weekday: d.getUTCDay() };
    });
  }, [year, month]);

  // Índice: "userId_YYYY-MM-DD" → ShiftDoMes[]
  const shiftIndex = useMemo(() => {
    const map = new Map<string, ShiftDoMes[]>();
    for (const s of shifts) {
      const key = `${s.organization_id}_${s.shift_date}`;
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [shifts]);

  // Estado do modal de turnos da organização no dia
  const [modal, setModal] = useState<{
    open: boolean;
    date: string;
    organizationId: string | null;
  }>({ open: false, date: "", organizationId: null });

  function openOrgDay(date: string, orgId: string) {
    setModal({ open: true, date, organizationId: orgId });
  }

  function closeModal() {
    setModal((m) => ({ ...m, open: false }));
  }

  const CELL_W = "72px";
  const NAME_W = "160px";

  return (
    <Box
      bg="card"
      borderWidth="1px"
      borderColor="border"
      rounded="xl"
      shadow="sm"
      overflow="hidden"
    >
      {loading && (
        <Flex justify="center" align="center" py={12}>
          <Spinner color="blue.500" />
        </Flex>
      )}

      {error && (
        <Flex justify="center" py={8} color="red.fg">
          <Text fontSize="sm">{error}</Text>
        </Flex>
      )}

      {!loading && !error && (
        <Box overflowX="auto">
          <Box as="table" w="full" style={{ borderCollapse: "collapse" }}>
            {/* ── Cabeçalho: dias do mês ── */}
            <thead>
              <tr>
                {/* Coluna de nome */}
                <Box
                  as="th"
                  textAlign="left"
                  px={3}
                  py={2}
                  bg="muted"
                  borderBottomWidth="1px"
                  borderColor="border"
                  position="sticky"
                  left={0}
                  zIndex={2}
                  minW={NAME_W}
                  fontSize="xs"
                  fontWeight="semibold"
                  color="fg"
                  textTransform="uppercase"
                  letterSpacing="wider"
                >
                  Organização
                </Box>

                {days.map(({ day, weekday }) => {
                  const isToday = isCurrentMonth && day === currentDay;
                  return (
                    <Box
                      as="th"
                      key={day}
                      textAlign="center"
                      px={1}
                      py={2}
                      bg={getDayColor(day, false, isToday)}
                      borderBottomWidth="1px"
                      borderColor="border"
                      minW={CELL_W}
                      w={CELL_W}
                    >
                      <Text fontSize="xs" fontWeight="semibold" color="fg">
                        {WEEKDAY_ABBR[weekday]}
                      </Text>
                      <Text fontSize="sm" fontWeight="bold" color="fg">
                        {day}
                      </Text>
                    </Box>
                  );
                })}
              </tr>
            </thead>

            {/* ── Linhas: organizações ── */}
            <tbody>
              {organizations.length === 0 && (
                <tr>
                  <td
                    colSpan={days.length + 1}
                    style={{ textAlign: "center", padding: "40px 16px", color: "var(--chakra-colors-fg-muted)", fontSize: "var(--chakra-font-sizes-sm)" }}
                  >
                    Nenhuma organização encontrada.
                  </td>
                </tr>
              )}

              {organizations.map((org, rowIdx) => (
                <tr key={org.id}>
                  {/* Nome da organização (sticky) */}
                  <Box
                    as="td"
                    px={3}
                    py={2}
                    bg={rowIdx % 2 === 0 ? "card" : "muted"}
                    borderBottomWidth="1px"
                    borderColor="border"
                    position="sticky"
                    left={0}
                    zIndex={1}
                    minW={NAME_W}
                  >
                    <Text fontSize="sm" fontWeight="medium" color="fg" lineClamp={1}>
                      {org.name}
                    </Text>
                  </Box>

                  {/* Células por dia */}
                  {days.map(({ day }) => {
                    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const key = `${org.id}_${dateStr}`;
                    const dayShifts = shiftIndex.get(key) ?? [];
                    const isToday = isCurrentMonth && day === currentDay;

                    return (
                      <Box
                        as="td"
                        key={day}
                        textAlign="center"
                        px={0.5}
                        py={1}
                        bg={getDayColor(day, rowIdx % 2 !== 0, isToday)}
                        borderBottomWidth="1px"
                        borderColor="border"
                        verticalAlign="top"
                        minW={CELL_W}
                        w={CELL_W}
                      >
                        {dayShifts.length > 0 ? (
                          <Box
                            as="button"
                            w="full"
                            h="full"
                            minH="36px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            onClick={() => openOrgDay(dateStr, org.id)}
                            _hover={{ bg: "blue.subtle/40" }}
                            transition="all 0.15s"
                          >
                            <Badge
                              colorPalette="blue"
                              variant="subtle"
                              fontSize="10px"
                              px={1.5}
                              py={0.5}
                              rounded="md"
                            >
                              {dayShifts.length} turnos
                            </Badge>
                          </Box>
                        ) : (
                          <Box
                            as="button"
                            w="full"
                            h="full"
                            minH="36px"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            color="fg.subtle"
                            _hover={{ color: "blue.fg", bg: "blue.subtle/40" }}
                            rounded="sm"
                            transition="all 0.15s"
                            onClick={() => openOrgDay(dateStr, org.id)}
                          >
                            <Plus size={12} />
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}

      {modal.open && modal.organizationId && (
        <TurnosDaOrgModal
          open={modal.open}
          onClose={closeModal}
          onSuccess={() => { onRefresh(); }}
          date={modal.date}
          organizationId={modal.organizationId}
          existingShifts={shiftIndex.get(`${modal.organizationId}_${modal.date}`) ?? []}
        />
      )}
    </Box>
  );
}
