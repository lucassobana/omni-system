"use client";

import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  Container,
  Flex,
} from "@chakra-ui/react";

import { processSteps } from "../../config/site";
import { SectionHeading } from "../layout/SectionHeading";
import { Reveal } from "../layout/Reveal";

export function Process() {
  return (
    <Box as="section" bg="bg" py={{ base: 20, sm: 28, lg: 32 }}>
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        <SectionHeading
          eyebrow="Processo de atendimento"
          title="Um método claro, do primeiro contato à operação."
        />

        <Grid
          as="ol"
          mt={14}
          gap="1px" // Cria a linha divisória do grid
          bg="border"
          borderWidth="1px"
          borderColor="border"
          borderRadius="lg"
          overflow="hidden"
          templateColumns={{
            base: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          }}
        >
          {processSteps.map((step, index) => (
            <GridItem
              as="li"
              key={step.number}
              bg="card"
              // Garante que a animação interna ocupe 100% da altura para manter o grid simétrico
              css={{ "& > div": { height: "100%" } }}
            >
              <Reveal delay={index * 80}>
                <Flex direction="column" h="full" p={{ base: 7, lg: 8 }}>
                  <Text
                    fontSize="4xl"
                    fontWeight="extrabold"
                    color="brand.metal"
                  >
                    {step.number}
                  </Text>

                  <Heading
                    as="h3"
                    mt={5}
                    fontSize="base"
                    fontWeight="bold"
                    letterSpacing="tight"
                    color="fg"
                  >
                    {step.title}
                  </Heading>

                  <Text
                    mt={2}
                    fontSize="sm"
                    lineHeight="relaxed"
                    color="mutedForeground"
                  >
                    {step.description}
                  </Text>
                </Flex>
              </Reveal>
            </GridItem>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}
