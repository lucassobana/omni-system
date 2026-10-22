"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Text,
  Center,
  Container,
  Stack,
} from "@chakra-ui/react";

import { institutional } from "../../config/site";
import { SectionHeading } from "../layout/SectionHeading";
import { Reveal } from "../layout/Reveal";

export function About() {
  return (
    <Box as="section" id="empresa" bg="bg" py={{ base: 20, sm: 28, lg: 32 }}>
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        <Grid
          alignItems="center"
          gap={{ base: 12, lg: 20 }}
          templateColumns={{ base: "1fr", lg: "repeat(2, 1fr)" }}
        >
          <GridItem order={{ base: 2, lg: 1 }}>
            <Reveal>
              <SectionHeading
                eyebrow="A empresa"
                title={institutional.aboutTitle}
              />

              <Stack gap={4} mt={6}>
                {institutional.aboutText.map((paragraph, index) => (
                  <Text
                    key={index}
                    fontSize="md"
                    lineHeight="relaxed"
                    color="mutedForeground"
                  >
                    {paragraph}
                  </Text>
                ))}
              </Stack>

              <Grid
                as="ul"
                gap={3}
                templateColumns={{ base: "1fr", sm: "repeat(2, 1fr)" }}
                mt={8}
              >
                {institutional.aboutHighlights.map((item) => (
                  <Flex as="li" key={item} align="start" gap={3}>
                    <Center
                      w={5}
                      h={5}
                      mt={0.5}
                      flexShrink={0}
                      borderRadius="full"
                      color="brand.security"
                    >
                      <ShieldCheck size={20} aria-hidden="true" />
                    </Center>
                    <Text fontSize="sm" fontWeight="medium" color="fg">
                      {item}
                    </Text>
                  </Flex>
                ))}
              </Grid>
            </Reveal>
          </GridItem>

          <GridItem order={{ base: 1, lg: 2 }}>
            <Reveal delay={120}>
              <Box
                overflow="hidden"
                borderRadius="lg"
                borderWidth="1px"
                borderColor="border"
                boxShadow="lg"
                position="relative"
                aspectRatio={5 / 4}
                w="full"
              >
                <Image
                  src="/images/team-briefing.jpg"
                  alt="Equipe de segurança privada em reunião operacional"
                  fill
                  style={{ objectFit: "cover" }}
                />
              </Box>
            </Reveal>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}
