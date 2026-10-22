"use client";

import {
  Box,
  Heading,
  Text,
  Stack,
  Badge,
  Flex,
  Spinner,
  Alert,
} from "@chakra-ui/react";
import { Clock, CheckCircle, Circle, ArrowRight } from "lucide-react";
import type { ShiftEntry } from "@/lib/hooks/useAdminDashboard";

interface Props {
  shifts: ShiftEntry[];
  loading: boolean;
  error: string | null;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatScheduledTime(time: string): string {
  // time is "HH:MM:SS" from Postgres
  return time.slice(0, 5);
}

/**
 * Determina o "próximo" na escala: primeiro turno cujo início ainda não chegou
 * ou cujo funcionário ainda não entrou (sem clock_in real).
 */
function getNextUp(shifts: ShiftEntry[]): string | null {
  const now = new Date();

  const next = shifts.find((s) => {
    const startAt = new Date(s.start_at);
    return startAt > now || !s.actual_clock_in;
  });

  return next?.employee_name ?? null;
}

export function TodaySchedule({ shifts, loading, error }: Props) {
  const nextUp = getNextUp(shifts);

  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.subtle"
      rounded="xl"
      p={6}
      shadow="sm"
    >
      {/* Cabeçalho */}
      <Flex align="center" gap={3} mb={5}>
        <Box
          p={2}
          rounded="lg"
          bg="brand.security"
          color="brand.metal"
        >
          <Clock size={20} />
        </Box>
        <Box>
          <Heading size="md" color="fg">
            Escala de Hoje
          </Heading>
          <Text fontSize="sm" color="fg.muted">
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </Box>
        {nextUp && (
          <Badge colorPalette="orange" ml="auto" px={3} py={1} rounded="full">
            <Flex align="center" gap={1}>
              <ArrowRight size={12} />
              Próximo: {nextUp}
            </Flex>
          </Badge>
        )}
      </Flex>

      {/* Estados */}
      {loading && (
        <Flex justify="center" py={8}>
          <Spinner color="blue.500" />
        </Flex>
      )}

      {error && (
        <Alert.Root status="error" rounded="lg">
          <Alert.Indicator />
          <Alert.Description>{error}</Alert.Description>
        </Alert.Root>
      )}

      {!loading && !error && shifts.length === 0 && (
        <Flex
          direction="column"
          align="center"
          justify="center"
          py={10}
          color="fg.muted"
          gap={2}
        >
          <Circle size={20} />
          <Text fontSize="sm">Nenhum turno programado para hoje.</Text>
        </Flex>
      )}

      {/* Lista de turnos */}
      {!loading && !error && shifts.length > 0 && (
        <Stack gap={3}>
          {shifts.map((shift, idx) => {
            const entered = Boolean(shift.actual_clock_in);
            const exited = Boolean(shift.actual_clock_out);

            let statusColor: "green" | "blue" | "gray" = "gray";
            let statusLabel = "Aguardando";
            if (entered && exited) {
              statusColor = "gray";
              statusLabel = "Encerrado";
            } else if (entered) {
              statusColor = "green";
              statusLabel = "Em serviço";
            }

            const isNext =
              !entered &&
              shift.employee_name === nextUp &&
              idx > 0;

            return (
              <Flex
                key={shift.id}
                align="center"
                gap={4}
                p={4}
                rounded="lg"
                bg={entered && !exited ? "green.subtle" : isNext ? "orange.subtle" : "bg.muted"}
                borderWidth="1px"
                borderColor={
                  entered && !exited
                    ? "green.emphasized"
                    : isNext
                    ? "orange.emphasized"
                    : "border.subtle"
                }
                transition="all 0.2s"
              >
                {/* Ícone de status */}
                <Box color={entered ? "green.fg" : "fg.muted"} flexShrink={0}>
                  {entered ? <CheckCircle size={20} /> : <Circle size={20} />}
                </Box>

                {/* Nome */}
                <Box flex="1" minW={0}>
                  <Text fontWeight="semibold" color="fg" truncate>
                    {shift.employee_name}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    Previsto: {formatTime(shift.start_at)} →{" "}
                    {formatTime(shift.end_at)}
                  </Text>
                </Box>

                {/* Horário real */}
                <Box textAlign="right" flexShrink={0}>
                  {entered && (
                    <Text fontSize="sm" fontWeight="medium" color="green.fg">
                      Entrada: {formatTime(shift.actual_clock_in)}
                    </Text>
                  )}
                  {exited && (
                    <Text fontSize="xs" color="fg.muted">
                      Saída: {formatTime(shift.actual_clock_out)}
                    </Text>
                  )}
                </Box>

                {/* Badge de status */}
                <Badge
                  colorPalette={statusColor}
                  variant="subtle"
                  rounded="full"
                  px={3}
                  flexShrink={0}
                >
                  {statusLabel}
                </Badge>
              </Flex>
            );
          })}
        </Stack>
      )}
    </Box>
  );
}
