"use client";

import { Box, Grid, Heading, Text, Container } from "@chakra-ui/react";

import { differentials } from "../../config/site";
import { getIcon } from "../../lib/icons";
import { SectionHeading } from "../layout/SectionHeading";
import { Reveal } from "../layout/Reveal";

export function Differentials() {
  return (
    <Box
      as="section"
      borderYWidth="1px"
      borderColor="border"
      bg="secondary"
      py={{ base: 20, sm: 28, lg: 32 }}
    >
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        <SectionHeading
          eyebrow="Diferenciais"
          title="Por que contratar uma empresa regularizada."
          description="Credibilidade em segurança privada começa pela conformidade e pela estrutura."
        />

        <Grid
          as="ul"
          mt={14}
          gap={5}
          templateColumns={{
            base: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          }}
        >
          {differentials.map((item, index) => {
            const Icon = getIcon(item.icon);

            return (
              <Reveal as="li" key={item.title} delay={index * 70}>
                <Box
                  display="flex"
                  flexDir="column"
                  h="full"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="border"
                  bg="card"
                  p={7}
                  boxShadow="sm"
                  transition="border-color 0.3s ease, box-shadow 0.3s ease"
                  _hover={{
                    borderColor: "brand.security",
                    boxShadow: "lg",
                  }}
                >
                  <Box color="brand.security">
                    {/* O tamanho original size-6 no Tailwind equivale a 24px */}
                    <Icon size={24} aria-hidden="true" />
                  </Box>

                  <Heading
                    as="h3"
                    mt={5}
                    fontSize="md"
                    fontWeight="bold"
                    letterSpacing="tight"
                    color="fg"
                  >
                    {item.title}
                  </Heading>

                  <Text
                    mt={2}
                    fontSize="sm"
                    lineHeight="relaxed"
                    color="mutedForeground"
                  >
                    {item.description}
                  </Text>
                </Box>
              </Reveal>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
