"use client";

import { ArrowUpRight } from "lucide-react";
import {
  Box,
  Grid,
  Heading,
  Text,
  Center,
  Container,
  Link,
} from "@chakra-ui/react";

import { services } from "../../config/site";
import { getIcon } from "../../lib/icons";
import { SectionHeading } from "../layout/SectionHeading";
import { Reveal } from "../layout/Reveal";

export function Services() {
  return (
    <Box
      as="section"
      id="servicos"
      borderYWidth="1px"
      borderColor="border"
      bg="secondary"
      py={{ base: 20, sm: 28, lg: 32 }}
    >
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        <SectionHeading
          eyebrow="Serviços"
          title="Soluções de segurança privada sob medida."
          description="Serviços executados dentro das exigências legais aplicáveis à atividade de segurança privada no Brasil."
        />

        <Grid
          as="ul"
          mt={14}
          gap={5}
          templateColumns={{
            base: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          }}
        >
          {services.map((service, index) => {
            const Icon = getIcon(service.icon);

            return (
              <Reveal as="li" key={service.title} delay={index * 80}>
                <Box
                  as="article"
                  display="flex"
                  flexDir="column"
                  h="full"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="border"
                  bg="card"
                  p={7}
                  boxShadow="sm"
                  transition="transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease"
                  // Aqui recriamos o efeito de hover do cartão e do ícone simultaneamente
                  _hover={{
                    transform: "translateY(-4px)",
                    borderColor: "brand.security",
                    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.3)",
                    "& .icon-container": {
                      bg: "brand.security",
                      color: "brand.iceForeground",
                    },
                  }}
                >
                  <Center
                    className="icon-container" // Identificador para o hover do pai
                    w={12}
                    h={12}
                    borderRadius="md"
                    bg="accent"
                    color="brand.security"
                    transition="background-color 0.3s ease, color 0.3s ease"
                  >
                    <Icon size={20} aria-hidden="true" />
                  </Center>

                  <Heading
                    as="h3"
                    mt={6}
                    fontSize="lg"
                    fontWeight="bold"
                    letterSpacing="tight"
                    color="fg"
                  >
                    {service.title}
                  </Heading>

                  <Text
                    mt={2}
                    flex={1}
                    fontSize="sm"
                    lineHeight="relaxed"
                    color="mutedForeground"
                  >
                    {service.description}
                  </Text>

                  <Link
                    href="#contato"
                    mt={6}
                    display="inline-flex"
                    alignItems="center"
                    gap={1.5}
                    fontSize="sm"
                    fontWeight="semibold"
                    color="brand.security"
                    transition="color 0.2s"
                    _hover={{
                      color: "brand.trust",
                      textDecoration: "none", // Evita o sublinhado padrão de links no hover
                    }}
                  >
                    Solicitar informações
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                </Box>
              </Reveal>
            );
          })}
        </Grid>
      </Container>
    </Box>
  );
}
