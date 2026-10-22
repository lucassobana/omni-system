import { Box, Stack, Flex, Skeleton } from "@chakra-ui/react";

export default function Loading() {
  return (
    <Box maxW="md" mx="auto" p={6} pt={8} pb={24}>
      {/* Título */}
      <Box mb={8}>
        <Skeleton height="32px" width="150px" mb={2} rounded="md" />
        <Skeleton height="20px" width="250px" rounded="md" />
      </Box>

      <Stack gap={6}>
        {/* Resumo do Mês */}
        <Box p={6} rounded="xl" shadow="md" bg="card" borderWidth="1px" borderColor="border">
          <Flex align="center" gap={3} mb={4}>
            <Skeleton height="20px" width="20px" rounded="full" />
            <Skeleton height="20px" width="120px" rounded="md" />
          </Flex>
          <Flex justify="space-between" align="end">
            <Stack gap={1}>
              <Skeleton height="16px" width="100px" />
              <Skeleton height="36px" width="80px" />
            </Stack>
          </Flex>
        </Box>

        {/* Lista de Registros */}
        <Stack gap={4}>
          {[1, 2, 3].map((i) => (
            <Box key={i} p={5} rounded="xl" shadow="sm" bg="card" borderWidth="1px" borderColor="border">
              <Flex justify="space-between" align="flex-start" mb={4}>
                <Stack gap={2}>
                  <Skeleton height="24px" width="140px" />
                  <Flex gap={2}>
                    <Skeleton height="24px" width="80px" rounded="full" />
                  </Flex>
                </Stack>
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
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
