import { Box, Stack, Flex, Skeleton } from "@chakra-ui/react";

export default function Loading() {
  return (
    <Box maxW="md" mx="auto" p={6} pt={8} pb={24}>
      {/* Título */}
      <Box mb={8}>
        <Skeleton height="32px" width="200px" mb={2} rounded="md" />
        <Skeleton height="20px" width="250px" rounded="md" />
      </Box>

      {/* Formulário Novo Ajuste Placeholder */}
      <Box mb={8} p={5} bg="card" rounded="2xl" shadow="sm" borderWidth="1px" borderColor="border">
        <Skeleton height="24px" width="150px" mb={4} />
        <Stack gap={4}>
          <Skeleton height="40px" rounded="md" />
          <Skeleton height="40px" rounded="md" />
          <Skeleton height="40px" rounded="md" />
          <Skeleton height="100px" rounded="md" />
          <Skeleton height="48px" rounded="full" mt={2} />
        </Stack>
      </Box>

      <Stack gap={4}>
        <Skeleton height="24px" width="180px" mb={2} />
        {[1, 2].map((i) => (
          <Box key={i} bg="card" p={5} rounded="xl" shadow="sm" borderWidth="1px" borderColor="border">
            <Flex justify="space-between" align="flex-start" mb={3}>
              <Stack gap={2}>
                <Skeleton height="24px" width="100px" />
                <Skeleton height="20px" width="160px" />
              </Stack>
              <Skeleton height="24px" width="80px" rounded="full" />
            </Flex>
            <Box bg="muted" p={3} rounded="lg">
              <Skeleton height="16px" width="80px" mb={2} />
              <Skeleton height="20px" width="full" />
            </Box>
          </Box>
        ))}
      </Stack>
    </Box>
  );
}
