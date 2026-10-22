"use client";

import { Flex, IconButton, Text, Box, Badge } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  currentMonth: number;
  currentYear: number;
  periodoFormatado?: string;
  periodType?: "cutoff_21_20" | "calendar";
}

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function MonthFilter({
  currentMonth,
  currentYear,
  periodoFormatado,
  periodType = "cutoff_21_20"
}: Props) {
  const router = useRouter();

  function navigate(m: number, y: number, p: "cutoff_21_20" | "calendar") {
    router.push(`?month=${m}&year=${y}&period=${p}`);
  }

  function handlePrev() {
    let m = currentMonth - 1;
    let y = currentYear;
    if (m < 1) {
      m = 12;
      y -= 1;
    }
    navigate(m, y, periodType);
  }

  function handleNext() {
    let m = currentMonth + 1;
    let y = currentYear;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    navigate(m, y, periodType);
  }

  function togglePeriod(newPeriod: "cutoff_21_20" | "calendar") {
    navigate(currentMonth, currentYear, newPeriod);
  }

  // Define se o próximo período já começou ou é futuro
  const now = new Date();
  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  let nextStart: Date;
  if (periodType === "cutoff_21_20") {
    nextStart = new Date(Date.UTC(nextYear, nextMonth - 2, 21, 0, 0, 0));
  } else {
    nextStart = new Date(Date.UTC(nextYear, nextMonth - 1, 1, 0, 0, 0));
  }
  const isFuture = nextStart.getTime() > now.getTime();

  return (
    <Box bg="card" p={4} rounded="xl" shadow="sm" borderWidth="1px" borderColor="border.subtle" mb={6}>
      <Flex align="center" justify="space-between">
        <IconButton
          variant="ghost"
          aria-label="Mês anterior"
          onClick={handlePrev}
          colorPalette="gray"
          rounded="full"
          size="sm"
        >
          <ChevronLeft size={18} />
        </IconButton>

        <Box textAlign="center">
          <Text fontWeight="bold" fontSize="md" textTransform="uppercase" letterSpacing="wider" color="fg">
            {MONTH_NAMES[currentMonth - 1]} {currentYear}
          </Text>
          {periodoFormatado && (
            <Flex align="center" justify="center" gap={1.5} mt={0.5}>
              <Calendar size={13} color="#7DA9D8" />
              <Text fontSize="xs" color="fg.muted">
                {periodoFormatado}
              </Text>
            </Flex>
          )}
        </Box>

        <IconButton
          variant="ghost"
          aria-label="Próximo mês"
          onClick={handleNext}
          colorPalette="gray"
          rounded="full"
          size="sm"
          disabled={isFuture}
        >
          <ChevronRight size={18} />
        </IconButton>
      </Flex>

      {/* Alternância de Tipo de Período (Corte 21 a 20 vs Calendário) */}
      <Flex justify="center" gap={2} mt={3} pt={2} borderTopWidth="1px" borderColor="border.subtle">
        <Badge
          as="button"
          cursor="pointer"
          size="xs"
          px={2.5}
          py={1}
          rounded="full"
          variant={periodType === "cutoff_21_20" ? "solid" : "subtle"}
          colorPalette={periodType === "cutoff_21_20" ? "blue" : "gray"}
          onClick={() => togglePeriod("cutoff_21_20")}
          transition="all 0.15s"
        >
          Corte 21 a 20 (Fechamento)
        </Badge>
        <Badge
          as="button"
          cursor="pointer"
          size="xs"
          px={2.5}
          py={1}
          rounded="full"
          variant={periodType === "calendar" ? "solid" : "subtle"}
          colorPalette={periodType === "calendar" ? "blue" : "gray"}
          onClick={() => togglePeriod("calendar")}
          transition="all 0.15s"
        >
          Mês Calendário
        </Badge>
      </Flex>
    </Box>
  );
}
