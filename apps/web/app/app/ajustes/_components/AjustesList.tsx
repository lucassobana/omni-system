"use client";

import { Badge, Box, Flex, Stack, Text } from "@chakra-ui/react";
import { MessageSquare, CalendarClock } from "lucide-react";

interface Correction {
  id: string;
  occurrence_date: string;
  type: string;
  suggested_time: string;
  status: string;
  justification: string;
}

function formatDate(isoDate: string) {
  const d = new Date(isoDate + "T12:00:00");
  const day = d.getDate().toString().padStart(2, "0");
  const month = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][d.getMonth()];
  return `${day} de ${month}`;
}

export function AjustesList({ corrections }: { corrections: Correction[] }) {
  if (corrections.length === 0) {
    return (
      <Box textAlign="center" py={10} color="mutedForeground">
        <MessageSquare size={40} style={{ margin: "0 auto", opacity: 0.2, marginBottom: 8 }} />
        <Text>Nenhuma solicitação recente.</Text>
      </Box>
    );
  }

  return (
    <Stack gap={4}>
      {corrections.map((item) => (
        <Box key={item.id} bg="card" p={5} rounded="xl" shadow="sm" borderWidth="1px" borderColor="border" transition="all 0.2s" _hover={{ shadow: "md" }}>
          <Flex justify="space-between" align="flex-start" mb={3}>
            <Box>
              <Text fontWeight="bold" color="fg">{formatDate(item.occurrence_date)}</Text>
              <Flex align="center" gap={1} color="mutedForeground" mt={0.5}>
                <CalendarClock size={14} />
                <Text fontSize="sm">
                  {item.type === "clock_in" ? "Entrada" : "Saída"} sugerida: <Text as="span" fontWeight="bold" color="fg">{item.suggested_time.slice(0, 5)}</Text>
                </Text>
              </Flex>
            </Box>

            {item.status === "pending" && (
              <Badge colorPalette="yellow" variant="subtle" size="sm">Em Análise</Badge>
            )}
            {item.status === "approved" && (
              <Badge colorPalette="green" variant="subtle" size="sm">Aprovado</Badge>
            )}
            {item.status === "rejected" && (
              <Badge colorPalette="red" variant="subtle" size="sm">Rejeitado</Badge>
            )}
          </Flex>

          <Box bg="muted" p={3} rounded="lg">
            <Text fontSize="xs" color="mutedForeground" textTransform="uppercase" fontWeight="bold" mb={1}>Justificativa:</Text>
            <Text fontSize="sm" color="fg" fontStyle="italic">"{item.justification}"</Text>
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
