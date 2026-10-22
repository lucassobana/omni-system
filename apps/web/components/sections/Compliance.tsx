"use client";

import { ExternalLink, FileText, Scale, ShieldCheck } from "lucide-react";
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Text,
  Center,
  Container,
  Link,
  Stack,
} from "@chakra-ui/react";

import { LAW_URL } from "../../config/site";
import { SectionHeading } from "../layout/SectionHeading";
import { Reveal } from "../layout/Reveal";

const points = [
  {
    icon: Scale,
    title: "Novo marco legal",
    description:
      "A Lei nº 14.967/2024 institui o Estatuto da Segurança Privada e da Segurança das Instituições Financeiras, estabelecendo o marco legal do setor no Brasil.",
  },
  {
    icon: ShieldCheck,
    title: "Autorização da Polícia Federal",
    description:
      "A empresa possui autorização da Polícia Federal para atuar no segmento de segurança privada.",
  },
  {
    icon: FileText,
    title: "Operação regularizada",
    description:
      "Nossa atuação acompanha o cenário regulatório vigente. Informações específicas sobre a legislação podem ser consultadas diretamente no texto oficial.",
  },
];

export function Compliance() {
  return (
    <Box
      as="section"
      id="conformidade"
      position="relative"
      overflow="hidden"
      py={{ base: 20, sm: 28, lg: 32 }}
      // Substituindo o bgGradient pela instrução CSS exata da sua classe 'surface-deep' original
      bg="linear-gradient(140deg, #0c1928ff 0%, #12293eff 55%, #153046ff 100%)"
    >
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        <Grid
          gap={{ base: 14, lg: 20 }}
          templateColumns={{ base: "1fr", lg: "1.05fr 0.95fr" }}
          alignItems="center"
        >
          {/* Coluna da Esquerda: Textos e Lista */}
          <GridItem>
            <Reveal>
              <SectionHeading
                tone="dark"
                eyebrow="Conformidade"
                title="Conformidade que protege."
                description="Segurança privada é uma atividade regulada. Trabalhar dentro da lei é parte essencial da proteção que entregamos aos nossos clientes."
              />

              <Stack as="ul" gap={6} mt={10}>
                {points.map((point) => (
                  <Flex as="li" key={point.title} gap={4}>
                    <Center
                      w={11}
                      h={11}
                      flexShrink={0}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor="whiteAlpha.300"
                      bg="whiteAlpha.200"
                      color="brand.ice"
                    >
                      <point.icon size={20} aria-hidden="true" />
                    </Center>

                    <Box minW={0}>
                      <Heading
                        as="h3"
                        fontSize="base"
                        fontWeight="bold"
                        color="brand.iceForeground"
                      >
                        {point.title}
                      </Heading>
                      <Text
                        mt={1.5}
                        fontSize="sm"
                        lineHeight="relaxed"
                        color="whiteAlpha.800"
                      >
                        {point.description}
                      </Text>
                    </Box>
                  </Flex>
                ))}
              </Stack>
            </Reveal>
          </GridItem>

          {/* Coluna da Direita: Card Translúcido */}
          <GridItem>
            <Reveal delay={120}>
              <Box
                borderRadius="lg"
                borderWidth="1px"
                borderColor="whiteAlpha.300"
                bg="whiteAlpha.100"
                p={{ base: 8, sm: 10 }}
                backdropFilter="blur(8px)"
                boxShadow="xl"
              >
                <Text
                  fontSize="xs"
                  fontWeight="semibold"
                  textTransform="uppercase"
                  letterSpacing="0.2em"
                  color="whiteAlpha.700"
                >
                  Legislação
                </Text>

                <Text
                  mt={4}
                  fontSize={{ base: "3xl", sm: "4xl" }}
                  fontWeight="extrabold"
                  lineHeight="tight"
                  color="brand.iceForeground"
                >
                  Lei nº 14.967/2024
                </Text>

                <Text
                  mt={3}
                  fontSize="sm"
                  lineHeight="relaxed"
                  color="whiteAlpha.800"
                >
                  Estatuto da Segurança Privada e da Segurança das Instituições
                  Financeiras.
                </Text>

                {/* Botão corrigido usando Link estilizado */}
                <Link
                  href={LAW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  display="inline-flex"
                  alignItems="center"
                  justifyContent="center"
                  height="3rem" // Equivalente ao size="lg"
                  px={6}
                  mt={8}
                  w="full"
                  borderRadius="md"
                  fontWeight="semibold"
                  bg="brand.ice"
                  color="brand.deep"
                  transition="background-color 0.2s"
                  _hover={{ bg: "white", textDecoration: "none" }}
                >
                  Conheça a legislação
                  <ExternalLink
                    aria-hidden="true"
                    style={{ marginLeft: "8px", width: "18px", height: "18px" }}
                  />
                </Link>

                <Text
                  mt={4}
                  fontSize="xs"
                  lineHeight="relaxed"
                  color="whiteAlpha.600"
                >
                  Texto oficial publicado no portal do Planalto. Abre em uma
                  nova aba.
                </Text>
              </Box>
            </Reveal>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}
