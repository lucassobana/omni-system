"use client";

import Image from "next/image";
import { ShieldCheck } from "lucide-react"; // Removemos Instagram e Linkedin daqui
import {
  Box,
  Container,
  Grid,
  GridItem,
  Flex,
  Text,
  Link,
  Stack,
} from "@chakra-ui/react";

import { LAW_URL, company, nav, services } from "../../config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <Box as="footer" bg="secondary" py={16}>
      <Container maxW="7xl" px={{ base: 4, sm: 6, lg: 8 }}>
        <Grid
          gap={12}
          templateColumns={{ base: "1fr", lg: "1.4fr 1fr 1fr 1.2fr" }}
        >
          {/* Coluna 1: Marca e Redes Sociais */}
          <GridItem>
            <Flex align="center" gap={3}>
              <Box position="relative" w="44px" h="44px">
                <Image
                  src="/images/omni-logo.png"
                  alt={`Logotipo ${company.name}`}
                  fill
                  style={{ objectFit: "contain" }}
                />
              </Box>
              <Text
                fontFamily="heading"
                fontSize="lg"
                fontWeight="extrabold"
                color="brand.iceForeground"
              >
                OMNI
              </Text>
            </Flex>
            <Text
              mt={5}
              maxW="sm"
              fontSize="sm"
              lineHeight="relaxed"
              color="whiteAlpha.700"
            >
              Empresa de segurança privada autorizada pela Polícia Federal, com
              atuação alinhada à Lei nº 14.967/2024.
            </Text>
            <Flex gap={3} mt={6}>
              <Link
                href={`https://instagram.com/${company.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram da empresa"
                display="flex"
                alignItems="center"
                justifyContent="center"
                w={11}
                h={11}
                borderRadius="md"
                borderWidth="1px"
                borderColor="whiteAlpha.300"
                color="brand.ice"
                transition="background-color 0.2s"
                _hover={{ bg: "whiteAlpha.200" }}
              >
                {/* SVG Nativo do Instagram */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </Link>

              <Link
                href={`https://linkedin.com/company/${company.linkedin}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn da empresa"
                display="flex"
                alignItems="center"
                justifyContent="center"
                w={11}
                h={11}
                borderRadius="md"
                borderWidth="1px"
                borderColor="whiteAlpha.300"
                color="brand.ice"
                transition="background-color 0.2s"
                _hover={{ bg: "whiteAlpha.200" }}
              >
                {/* SVG Nativo do LinkedIn */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </Link>
            </Flex>
          </GridItem>

          {/* Coluna 2: Links Rápidos */}
          <GridItem as="nav" aria-label="Links rápidos">
            <Text
              as="h2"
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
              letterSpacing="0.18em"
              color="whiteAlpha.600"
            >
              Links rápidos
            </Text>
            <Stack as="ul" gap={3} mt={5} listStyleType="none" m={0} p={0}>
              {nav.map((item) => (
                <Box as="li" key={item.href}>
                  <Link
                    href={item.href}
                    fontSize="sm"
                    color="whiteAlpha.800"
                    transition="color 0.2s"
                    _hover={{
                      color: "brand.iceForeground",
                      textDecoration: "none",
                    }}
                  >
                    {item.label}
                  </Link>
                </Box>
              ))}
            </Stack>
          </GridItem>

          {/* Coluna 3: Serviços */}
          <GridItem>
            <Text
              as="h2"
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
              letterSpacing="0.18em"
              color="whiteAlpha.600"
            >
              Serviços
            </Text>
            <Stack as="ul" gap={3} mt={5} listStyleType="none" m={0} p={0}>
              {services.map((service) => (
                <Box as="li" key={service.title}>
                  <Link
                    href="#servicos"
                    fontSize="sm"
                    color="whiteAlpha.800"
                    transition="color 0.2s"
                    _hover={{
                      color: "brand.iceForeground",
                      textDecoration: "none",
                    }}
                  >
                    {service.title}
                  </Link>
                </Box>
              ))}
            </Stack>
          </GridItem>

          {/* Coluna 4: Contato */}
          <GridItem>
            <Text
              as="h2"
              fontSize="xs"
              fontWeight="semibold"
              textTransform="uppercase"
              letterSpacing="0.18em"
              color="whiteAlpha.600"
            >
              Contato
            </Text>
            <Stack
              as="ul"
              gap={3}
              mt={5}
              listStyleType="none"
              m={0}
              p={0}
              fontSize="sm"
              color="whiteAlpha.800"
            >
              <Box as="li">{company.phone}</Box>
              <Box as="li">{company.email}</Box>
              <Box as="li">{company.address}</Box>
              <Box as="li">{company.city}</Box>
            </Stack>
          </GridItem>
        </Grid>

        {/* Banner de Autorização PF */}
        <Flex
          mt={14}
          alignItems="flex-start"
          gap={4}
          borderRadius="lg"
          borderWidth="1px"
          borderColor="whiteAlpha.300"
          bg="whiteAlpha.100"
          p={6}
        >
          <Box mt={0.5} flexShrink={0} color="brand.ice">
            <ShieldCheck size={20} aria-hidden="true" />
          </Box>
          <Box minW={0} fontSize="sm" color="whiteAlpha.800">
            <Text fontWeight="semibold" color="brand.iceForeground">
              Empresa autorizada pela Polícia Federal
            </Text>
            <Text mt={1} lineHeight="relaxed">
              Autorização: {company.federalPoliceAuthorization} · Atuação
              conforme a{" "}
              <Link
                href={LAW_URL}
                target="_blank"
                rel="noopener noreferrer"
                textDecoration="underline"
                textUnderlineOffset="4px"
                _hover={{ color: "brand.iceForeground" }}
              >
                Lei nº 14.967/2024
              </Link>
              .
            </Text>
          </Box>
        </Flex>

        {/* Direitos Autorais e Legal */}
        <Flex
          mt={10}
          flexDir={{ base: "column", sm: "row" }}
          gap={2}
          borderTopWidth="1px"
          borderColor="whiteAlpha.200"
          pt={8}
          fontSize="xs"
          color="whiteAlpha.600"
          alignItems={{ sm: "center" }}
          justifyContent={{ sm: "space-between" }}
        >
          <Text>
            © {year} {company.name}. Todos os direitos reservados.
          </Text>
          <Text>
            {company.legalName} · CNPJ {company.cnpj}
          </Text>
        </Flex>
      </Container>
    </Box>
  );
}
