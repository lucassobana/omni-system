"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { Box, Container, Flex, Text, Link, Stack } from "@chakra-ui/react";

import { company, nav } from "../../config/site";

export function Header() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setScrolled(window.scrollY > 24);

    onScroll();

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isSolid = mounted && (scrolled || open);

  return (
    <Box
      as="header"
      position="fixed"
      top={0}
      left={0}
      right={0}
      zIndex={1000}
      bg={isSolid ? "transparent" : "#0F1D33E6"}
      borderBottomWidth="1px"
      borderColor={isSolid ? "whiteAlpha.200" : "transparent"}
      boxShadow={isSolid ? "md" : "none"}
      backdropFilter={isSolid ? "blur(12px)" : "none"}
      transition="all 0.25s ease"
    >
      <Container maxW="7xl" px={{ base: 5, sm: 6, lg: 8 }}>
        <Flex
          minH={{ base: "76px", md: "84px" }}
          align="center"
          justify="space-between"
          gap={8}
        >
          {/* LOGO */}
          <Link
            href="#inicio"
            display="flex"
            alignItems="center"
            gap={3}
            flexShrink={0}
            _hover={{ textDecoration: "none" }}
          >
            <Box
              position="relative"
              w={{ base: "48px", md: "58px" }}
              h={{ base: "48px", md: "58px" }}
              flexShrink={0}
            >
              <Image
                src="/images/omni-logo.png"
                alt={`Logotipo ${company.name}`}
                fill
                priority
                style={{
                  objectFit: "contain",
                }}
              />
            </Box>

            <Box display={{ base: "none", sm: "block" }} lineHeight="1">
              <Text
                fontFamily="heading"
                fontSize={{ base: "xl", md: "2xl" }}
                fontWeight="extrabold"
                letterSpacing="tight"
                color="brand.iceForeground"
                lineHeight="1"
              >
                OMNI
              </Text>

              <Text
                mt={1}
                fontSize={{ base: "0.6rem", md: "0.68rem" }}
                fontWeight="medium"
                textTransform="uppercase"
                letterSpacing="0.2em"
                color="whiteAlpha.700"
                lineHeight="1"
              >
                Segurança Privada
              </Text>
            </Box>
          </Link>

          {/* NAVEGAÇÃO DESKTOP */}
          <Flex
            as="nav"
            aria-label="Navegação principal"
            display={{ base: "none", lg: "flex" }}
            flex="1"
            justify="center"
          >
            <Flex
              as="ul"
              alignItems="center"
              gap={2}
              listStyleType="none"
              m={0}
              p={0}
            >
              {nav.map((item) => (
                <Box as="li" key={item.href}>
                  <Link
                    href={item.href}
                    px={4}
                    py={3}
                    borderRadius="md"
                    fontSize="sm"
                    fontWeight="medium"
                    color="whiteAlpha.800"
                    transition="all 0.2s ease"
                    _hover={{
                      color: "brand.iceForeground",
                      bg: "whiteAlpha.100",
                      textDecoration: "none",
                    }}
                  >
                    {item.label}
                  </Link>
                </Box>
              ))}
            </Flex>
          </Flex>

          {/* BOTÃO DESKTOP */}
          <Box display={{ base: "none", lg: "block" }} flexShrink={0}>
            <Link
              href="#contato"
              display="inline-flex"
              alignItems="center"
              justifyContent="center"
              minH="48px"
              px={7}
              borderRadius="md"
              fontSize="sm"
              fontWeight="semibold"
              bg="brand.ice"
              color="brand.deep"
              transition="all 0.2s ease"
              _hover={{
                bg: "white",
                transform: "translateY(-1px)",
                textDecoration: "none",
              }}
            >
              Solicite um orçamento
            </Link>
          </Box>

          {/* MENU MOBILE */}
          <Box display={{ base: "block", lg: "none" }}>
            <Box
              as="button"
              display="flex"
              alignItems="center"
              justifyContent="center"
              w="44px"
              h="44px"
              borderRadius="md"
              borderWidth="1px"
              borderColor="whiteAlpha.300"
              color="white"
              bg="whiteAlpha.100"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              _hover={{
                bg: "whiteAlpha.200",
              }}
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </Box>
          </Box>
        </Flex>
      </Container>

      {/* MENU MOBILE EXPANDIDO */}
      {open && (
        <Box
          as="nav"
          aria-label="Navegação mobile"
          display={{ base: "block", lg: "none" }}
          borderTopWidth="1px"
          borderColor="whiteAlpha.200"
          bg="#0F1D33FA"
          px={5}
          pt={2}
          pb={6}
        >
          <Stack as="ul" listStyleType="none" m={0} p={0} gap={0}>
            {nav.map((item) => (
              <Box as="li" key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  display="block"
                  py={4}
                  borderBottomWidth="1px"
                  borderColor="whiteAlpha.200"
                  fontSize="base"
                  fontWeight="medium"
                  color="whiteAlpha.800"
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

          <Link
            href="#contato"
            onClick={() => setOpen(false)}
            display="flex"
            alignItems="center"
            justifyContent="center"
            w="full"
            minH="52px"
            mt={6}
            borderRadius="md"
            fontWeight="semibold"
            bg="brand.ice"
            color="brand.deep"
            _hover={{
              bg: "white",
              textDecoration: "none",
            }}
          >
            Solicite um orçamento
          </Link>
        </Box>
      )}
    </Box>
  );
}
