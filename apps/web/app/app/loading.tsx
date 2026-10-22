import { Box, Container, Stack, Flex, Skeleton } from "@chakra-ui/react";

export default function Loading() {
  return (
    <Box minH="100svh" bg="bg" position="relative" overflow="hidden">
      <Container maxW="md" h="100svh" px={6} py={12}>
        <Stack gap={8} h="full" align="center" justify="center">
          
          {/* Saudação e Relógio */}
          <Stack align="center" gap={2} w="full">
            <Skeleton height="24px" width="120px" rounded="md" />
            <Skeleton height="60px" width="220px" rounded="md" />
            <Skeleton height="20px" width="180px" rounded="md" />
          </Stack>

          {/* Meu Plantão Hoje Card */}
          <Box w="full" bg="card" p={6} rounded="xl" borderWidth="1px" borderColor="border" shadow="sm">
            <Flex align="center" gap={3} mb={5}>
              <Skeleton height="20px" width="20px" rounded="full" />
              <Skeleton height="24px" width="150px" rounded="md" />
            </Flex>
            <Flex justify="space-between" align="center" bg="muted" p={3} rounded="lg">
              <Stack flex="1" align="center">
                <Skeleton height="16px" width="60px" />
                <Skeleton height="28px" width="80px" />
              </Stack>
              <Box h="40px" w="1px" bg="border" />
              <Stack flex="1" align="center">
                <Skeleton height="16px" width="60px" />
                <Skeleton height="28px" width="80px" />
              </Stack>
            </Flex>
          </Box>

          {/* Botão de Ponto */}
          <Flex flex="1" align="center" justify="center" w="full">
            <Skeleton height="200px" width="200px" rounded="full" />
          </Flex>

        </Stack>
      </Container>
    </Box>
  );
}
