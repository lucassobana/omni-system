import { Box, Stack, Flex, Skeleton } from "@chakra-ui/react";

export default function Loading() {
  return (
    <Box maxW="md" mx="auto" p={6} pt={8} pb={24}>
      {/* Título */}
      <Box mb={8}>
        <Skeleton height="32px" width="180px" mb={2} rounded="md" />
        <Skeleton height="20px" width="280px" rounded="md" />
      </Box>

      {/* Seletor de Mês Placeholder */}
      <Box mb={8}>
        <Skeleton height="48px" width="100%" rounded="lg" />
      </Box>

      <Stack gap={3}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Flex 
            key={i}
            bg="card"
            p={5}
            rounded="xl"
            borderWidth="1px"
            borderColor="border"
            align="center"
            justify="space-between"
          >
            <Flex align="center" gap={4}>
              <Box textAlign="center" w="40px">
                <Skeleton height="16px" width="30px" mb={1} mx="auto" />
                <Skeleton height="28px" width="28px" mx="auto" />
              </Box>
              <Box h="30px" w="1px" bg="border" />
              <Skeleton height="20px" width="100px" />
            </Flex>
            <Skeleton height="24px" width="60px" rounded="full" />
          </Flex>
        ))}
      </Stack>
    </Box>
  );
}
