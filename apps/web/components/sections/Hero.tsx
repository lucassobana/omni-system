"use client";

import Image from "next/image";
import { ArrowRight, ShieldCheck } from "lucide-react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Container,
  Stack,
} from "@chakra-ui/react";

export function Hero() {
  return (
    <Box
      id="inicio"
      position="relative"
      overflow="hidden"
      py={{ base: 20, sm: 28, lg: 36 }}
      bg="bg"
    >
      <Image
        src="/images/hero-security.jpg"
        alt="Profissional de segurança privada em serviço na entrada de um edifício corporativo"
        fill
        priority
        sizes="100vw"
        style={{
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 0,
        }}
      />

      <Box
        aria-hidden="true"
        position="absolute"
        inset="0"
        zIndex={1}
        style={{
          background: `
            linear-gradient(
                100deg,
                color-mix(in oklab, #050A14 100%, transparent) 0%,
                color-mix(in oklab, #050A14 60%, transparent) 42%,
                color-mix(in oklab, #050A14 40%, transparent) 100%
            )`,
        }}
      />

      <Container
        maxW="7xl"
        px={{ base: 4, sm: 6, lg: 8 }}
        position="relative"
        zIndex={2}
      >
        <Box maxW="2xl" mt={{ base: 12, sm: 12, lg: 12 }}>
          <Flex
            display="inline-flex"
            align="center"
            gap={2}
            rounded="full"
            border="1px solid"
            borderColor="whiteAlpha.300"
            bg="whiteAlpha.200"
            px={4}
            py={2}
            backdropFilter="blur(4px)"
          >
            <ShieldCheck size={16} color="brand.ice" aria-hidden="true" />

            <Text
              fontSize={{ base: "0.68rem", sm: "xs" }}
              fontWeight="bold"
              textTransform="uppercase"
              letterSpacing="widest"
              color="brand.ice"
            >
              Segurança privada | Autorizada pela Polícia Federal
            </Text>
          </Flex>

          <Heading
            as="h1"
            mt={7}
            fontSize={{ base: "4xl", sm: "5xl", lg: "6xl" }}
            fontWeight="extrabold"
            lineHeight="1.05"
            letterSpacing="tight"
            color="brand.iceForeground"
          >
            Segurança profissional para proteger o que realmente importa.
          </Heading>

          <Text
            mt={6}
            maxW="xl"
            fontSize={{ base: "base", sm: "lg" }}
            lineHeight="tall"
            color="brand.metal"
          >
            Atuamos no segmento de segurança privada com autorização da Polícia
            Federal e em conformidade com a Lei nº 14.967/2024 — o Estatuto da
            Segurança Privada e da Segurança das Instituições Financeiras.
          </Text>

          <Stack direction={{ base: "column", sm: "row" }} gap={3} mt={10}>
            <Button
              size="lg"
              bg="primary"
              color="primaryForeground"
              _hover={{ bg: "brand.trust" }}
              width={{ base: "full", sm: "auto" }}
            >
              Solicitar orçamento
              <ArrowRight aria-hidden="true" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              borderColor="whiteAlpha.400"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
              width={{ base: "full", sm: "auto" }}
            >
              Conhecer nossos serviços
            </Button>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
