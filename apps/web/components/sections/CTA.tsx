"use client";

import { ArrowRight, MessageCircle } from "lucide-react";
import { Box, Heading, Text, Container, Link, Stack } from "@chakra-ui/react";

import { whatsappUrl } from "../../config/site";
import { Reveal } from "../layout/Reveal";

export function CTA() {
  return (
    <Box
      as="section"
      py={{ base: 20, sm: 24 }}
      // Gradiente da classe original "surface-deep"
      bg="linear-gradient(140deg, #111b27ff 0%, #142a40ff 55%, #133651ff 100%)"
    >
      <Container maxW="4xl" px={{ base: 4, sm: 6, lg: 8 }} textAlign="center">
        <Reveal>
          <Heading
            as="h2"
            fontSize={{ base: "3xl", sm: "4xl", lg: "5xl" }}
            fontWeight="extrabold"
            lineHeight="1.2"
            color="brand.iceForeground"
          >
            Sua segurança merece planejamento profissional.
          </Heading>
          
          <Text
            mx="auto"
            mt={5}
            maxW="2xl"
            fontSize={{ base: "base", sm: "lg" }}
            lineHeight="relaxed"
            color="whiteAlpha.800"
          >
            Fale com a nossa equipe e receba uma proposta adequada à realidade do
            seu patrimônio, da sua operação ou do seu evento.
          </Text>

          <Stack
            direction={{ base: "column", sm: "row" }}
            justify="center"
            gap={3}
            mt={10}
          >
            {/* Botão Claro (Solid Light) */}
            <Link
              href="#contato"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              height="3.5rem" // Equivalente ao size="xl"
              px={8}
              w={{ base: "full", sm: "auto" }}
              borderRadius="md"
              fontWeight="semibold"
              bg="white"
              color="brand.deep"
              transition="background-color 0.2s"
              _hover={{ bg: "brand.ice", textDecoration: "none" }}
            >
              Solicite um orçamento
              <ArrowRight aria-hidden="true" style={{ marginLeft: "8px", width: "20px", height: "20px" }} />
            </Link>

            {/* Botão Escuro (On Dark) */}
            <Link
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              height="3.5rem"
              px={8}
              w={{ base: "full", sm: "auto" }}
              borderRadius="md"
              fontWeight="semibold"
              borderWidth="1px"
              borderColor="whiteAlpha.400"
              color="white"
              transition="background-color 0.2s"
              _hover={{ bg: "whiteAlpha.200", textDecoration: "none" }}
            >
              <MessageCircle aria-hidden="true" style={{ marginRight: "8px", width: "20px", height: "20px" }} />
              Fale pelo WhatsApp
            </Link>
          </Stack>
        </Reveal>
      </Container>
    </Box>
  );
}