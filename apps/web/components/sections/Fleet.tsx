"use client";

import Image from "next/image";
import {
  Box,
  Grid,
  GridItem,
  Heading,
  Text,
  Container,
} from "@chakra-ui/react";

import { SectionHeading } from "../layout/SectionHeading";
import { Reveal } from "../layout/Reveal";

export function Fleet() {
  return (
    <Box as="section" id="estrutura" bg="bg" py={{ base: 20, sm: 28, lg: 32 }}>
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        <SectionHeading
          eyebrow="Estrutura e frota"
          title="Estrutura preparada para proteger."
          description="Veículos, equipamentos e recursos operacionais organizados para dar suporte às operações contratadas. [SUBSTITUIR PELAS FOTOS REAIS DA EMPRESA]"
        />

        <Grid
          mt={14}
          gap={5}
          templateColumns={{ base: "1fr", lg: "repeat(3, 1fr)" }}
        >
          {/* Coluna Principal: Imagem Grande */}
          <GridItem colSpan={{ base: 1, lg: 2 }}>
            {/* O truque do sx abaixo garante que a animação Reveal ocupe 100% da altura esticada */}
            <Box h="full" css={{ "& > div": { height: "100%" } }}>
              <Reveal>
                <Box
                  as="figure"
                  display="flex"
                  flexDir="column"
                  h="full"
                  overflow="hidden"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="border"
                  boxShadow="sm"
                  bg="card"
                  _hover={{ "& .zoom-image": { transform: "scale(1.03)" } }}
                >
                  <Box
                    position="relative"
                    // O SEGREDO AQUI: flex="1" estica a imagem, e aspectRatio="auto" no desktop remove a trava
                    flex="1"
                    w="full"
                    aspectRatio={{ base: 16 / 10, lg: "auto" }}
                    overflow="hidden"
                  >
                    <Image
                      src="/images/fleet-main.jpg"
                      alt="Frota de veículos operacionais da empresa de segurança privada"
                      fill
                      className="zoom-image"
                      style={{
                        objectFit: "cover",
                        transition: "transform 0.7s ease-out",
                      }}
                    />
                  </Box>
                  <Box
                    as="figcaption"
                    borderTopWidth="1px"
                    borderColor="border"
                    bg="card"
                    px={6}
                    py={5}
                  >
                    <Heading
                      as="h3"
                      fontSize="base"
                      fontWeight="bold"
                      color="fg"
                    >
                      Frota operacional
                    </Heading>
                    <Text mt={1} fontSize="sm" color="mutedForeground">
                      [DESCREVER A FROTA DA EMPRESA]
                    </Text>
                  </Box>
                </Box>
              </Reveal>
            </Box>
          </GridItem>

          {/* Coluna Direita: Duas imagens empilhadas ditando a altura */}
          <GridItem>
            {/* O SEGREDO AQUI: Usar Grid em vez de Flex garante o empilhamento natural sem distorção */}
            <Grid gap={5}>
              <Reveal delay={100}>
                <Box
                  as="figure"
                  overflow="hidden"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="border"
                  boxShadow="sm"
                  bg="card"
                  _hover={{ "& .zoom-image": { transform: "scale(1.03)" } }}
                >
                  <Box
                    position="relative"
                    aspectRatio={4 / 3}
                    overflow="hidden"
                  >
                    <Image
                      src="/images/company-ops.jpg"
                      alt="Central de monitoramento operacional"
                      fill
                      className="zoom-image"
                      style={{
                        objectFit: "cover",
                        transition: "transform 0.7s ease-out",
                      }}
                    />
                  </Box>
                  <Box
                    as="figcaption"
                    borderTopWidth="1px"
                    borderColor="border"
                    bg="card"
                    px={5}
                    py={4}
                  >
                    <Heading as="h3" fontSize="sm" fontWeight="bold" color="fg">
                      Estrutura operacional
                    </Heading>
                    <Text mt={1} fontSize="sm" color="mutedForeground">
                      [DESCREVER ESTRUTURA]
                    </Text>
                  </Box>
                </Box>
              </Reveal>

              <Reveal delay={180}>
                <Box
                  as="figure"
                  overflow="hidden"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="border"
                  boxShadow="sm"
                  bg="card"
                  _hover={{ "& .zoom-image": { transform: "scale(1.03)" } }}
                >
                  <Box
                    position="relative"
                    aspectRatio={4 / 3}
                    overflow="hidden"
                  >
                    <Image
                      src="/images/team-briefing.jpg"
                      alt="Equipamentos e comunicação utilizados pela equipe operacional"
                      fill
                      className="zoom-image"
                      style={{
                        objectFit: "cover",
                        transition: "transform 0.7s ease-out",
                      }}
                    />
                  </Box>
                  <Box
                    as="figcaption"
                    borderTopWidth="1px"
                    borderColor="border"
                    bg="card"
                    px={5}
                    py={4}
                  >
                    <Heading as="h3" fontSize="sm" fontWeight="bold" color="fg">
                      Equipamentos
                    </Heading>
                    <Text mt={1} fontSize="sm" color="mutedForeground">
                      [DESCREVER EQUIPAMENTOS]
                    </Text>
                  </Box>
                </Box>
              </Reveal>
            </Grid>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}
