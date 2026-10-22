"use client";

import { BadgeCheck, Scale, ShieldCheck } from "lucide-react";
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  Center,
} from "@chakra-ui/react";

const pillars = [
  {
    icon: BadgeCheck,
    title: "Polícia Federal",
    description: "Empresa autorizada/aprovada pela Polícia Federal.",
  },
  {
    icon: Scale,
    title: "Lei nº 14.967/2024",
    description: "Atuação alinhada ao novo Estatuto da Segurança Privada.",
  },
  {
    icon: ShieldCheck,
    title: "Segurança profissional",
    description:
      "Estrutura e profissionais preparados para oferecer segurança com responsabilidade.",
  },
];

export function TrustBar() {
  return (
    <Box
      as="section"
      aria-label="Credenciais e conformidade"
      borderBottomWidth="1px"
      borderColor="border"
      bg="bg"
    >
      <Grid
        as="ul"
        maxW="7xl"
        mx="auto"
        templateColumns={{ base: "1fr", sm: "repeat(3, 1fr)" }}
        gap="1px"
        bg="border"
      >
        {pillars.map((pillar) => (
          <GridItem as="li" key={pillar.title} bg="card">
            <Flex
              align="flex-start"
              gap={4}
              px={{ base: 6, lg: 10 }}
              py={{ base: 8, lg: 12 }}
              h="full"
            >
              <Center
                w={11}
                h={11}
                flexShrink={0}
                borderRadius="md"
                bg="accent"
                color="brand.security"
              >
                <pillar.icon size={20} aria-hidden="true" />
              </Center>

              <Box minW={0}>
                <Heading
                  as="h3"
                  fontSize="md"
                  fontWeight="bold"
                  letterSpacing="tight"
                  color="cardForeground"
                >
                  {pillar.title}
                </Heading>
                <Text
                  mt={1.5}
                  fontSize="sm"
                  lineHeight="relaxed"
                  color="mutedForeground"
                >
                  {pillar.description}
                </Text>
              </Box>
            </Flex>
          </GridItem>
        ))}
      </Grid>
    </Box>
  );
}
