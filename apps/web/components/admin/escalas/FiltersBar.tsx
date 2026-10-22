"use client";

import { Box, Flex, Text, IconButton } from "@chakra-ui/react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Props {
  year: number;
  month: number; // 1-12
  onMonthChange: (year: number, month: number) => void;
}

export function FiltersBar({ year, month, onMonthChange }: Props) {

  function prevMonth() {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  }

  function nextMonth() {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  }

  return (
    <Flex
      align="center"
      gap={4}
      wrap="wrap"
      p={4}
      bg="brand.trust"
      borderWidth="1px"
      borderColor="border"
      rounded="xl"
      shadow="sm"
    >
      {/* ── Navegação Mês/Ano ── */}
      <Flex align="center" gap={1}>
        <Box color="white" mr={1}>
          <Calendar size={16} />
        </Box>
        <IconButton
          aria-label="Mês anterior"
          variant="ghost"
          size="sm"
          onClick={prevMonth}
          color="white"
          _hover={{ bg: "whiteAlpha.200" }}
        >
          <ChevronLeft size={16} />
        </IconButton>
        <Text
          fontWeight="semibold"
          fontSize="sm"
          color="white"
          minW="140px"
          textAlign="center"
        >
          {MONTHS[month - 1]} {year}
        </Text>
        <IconButton
          aria-label="Próximo mês"
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          color="white"
          _hover={{ bg: "whiteAlpha.200" }}
        >
          <ChevronRight size={16} />
        </IconButton>
      </Flex>

    </Flex>
  );
}
