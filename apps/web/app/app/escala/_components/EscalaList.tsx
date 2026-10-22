"use client";

import { Box, Flex, Text, Stack, Badge } from "@chakra-ui/react";
import { CalendarX2, Clock, CalendarDays } from "lucide-react";
import { useMemo } from "react";

interface Shift {
  id: string;
  shift_date: string;
  start_at: string;
  end_at: string;
  status: string;
}

interface Props {
  shifts: Shift[];
  month: number;
  year: number;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function EscalaList({ shifts, month, year }: Props) {
  // Se não houver nenhum plantão gerado no banco para o mês inteiro, exibe Empty State
  if (shifts.length === 0) {
    return (
      <Box textAlign="center" py={12} color="mutedForeground" bg="card" rounded="2xl" borderWidth="1px" borderColor="border" p={6}>
        <CalendarX2 size={48} style={{ margin: "0 auto", opacity: 0.3, marginBottom: 16 }} />
        <Text fontWeight="semibold" fontSize="lg" color="fg" mb={2}>Escala Indisponível</Text>
        <Text fontSize="sm">Nenhuma escala de trabalho foi definida para este mês.</Text>
      </Box>
    );
  }

  // Se houver plantões, mesclar com todos os dias do mês
  const daysInMonth = new Date(year, month, 0).getDate();
  const shiftMap = new Map<string, Shift>();
  
  shifts.forEach(shift => {
    shiftMap.set(shift.shift_date, shift);
  });

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month - 1, i);
      const dateStr = date.toISOString().slice(0, 10);
      const weekday = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][date.getDay()];
      
      days.push({
        dayNumber: i,
        weekday,
        dateStr,
        shift: shiftMap.get(dateStr) || null
      });
    }
    return days;
  }, [year, month, daysInMonth, shiftMap]);

  return (
    <Stack gap={3}>
      {calendarDays.map((day) => {
        const hasShift = !!day.shift;
        
        return (
          <Flex 
            key={day.dateStr} 
            bg={hasShift ? "card" : "muted"} 
            p={5} 
            rounded="xl" 
            borderWidth="1px" 
            borderColor={hasShift ? "accent" : "transparent"}
            align="center"
            justify="space-between"
            opacity={hasShift ? 1 : 0.7}
            shadow={hasShift ? "sm" : "none"}
            transition="all 0.2s"
            _hover={{ shadow: hasShift ? "md" : "none" }}
          >
            {/* Esquerda: Data */}
            <Flex align="center" gap={4}>
              <Box textAlign="center" w="40px">
                <Text fontSize="xs" color="mutedForeground" textTransform="uppercase" fontWeight="bold">{day.weekday}</Text>
                <Text fontSize="2xl" fontWeight="black" color={hasShift ? "primary" : "mutedForeground"} lineHeight="1">{day.dayNumber}</Text>
              </Box>
              
              <Box h="30px" w="1px" bg="border" />

              <Box>
                {hasShift ? (
                  <Flex align="center" gap={2} color="fg">
                    <Clock size={16} />
                    <Text fontWeight="bold" fontSize="md">
                      {formatTime(day.shift!.start_at)} - {formatTime(day.shift!.end_at)}
                    </Text>
                  </Flex>
                ) : (
                  <Flex align="center" gap={2} color="mutedForeground">
                    <CalendarDays size={16} />
                    <Text fontWeight="medium" fontSize="md">Dia Livre</Text>
                  </Flex>
                )}
              </Box>
            </Flex>

            {/* Direita: Badges */}
            <Box>
              {hasShift ? (
                <Badge colorPalette="blue" variant="subtle" size="md">Plantão</Badge>
              ) : (
                <Badge colorPalette="gray" variant="surface" size="sm">Folga</Badge>
              )}
            </Box>
          </Flex>
        );
      })}
    </Stack>
  );
}
