"use client";

import { Box, Flex, Text } from "@chakra-ui/react";
import { usePathname, useParams } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  CheckSquare,
  Clock,
  Lock,
  Fingerprint,
  History,
  MessageSquareWarning,
  Users,
  Building2,
} from "lucide-react";
import React, { ReactNode } from "react";

// Definição das Rotas por Perfil
interface RouteConfig {
  name: string;
  href: string;
  icon: React.ElementType;
  allowedRoles: string[];
}

export function AppLayout({
  children,
  role,
  userSlug,
}: {
  children: ReactNode;
  role: string;
  userSlug?: string;
}) {
  const pathname = usePathname();
  const params = useParams();
  const currentSlug = (params?.slug as string) || userSlug || "";

  // Rotas específicas por perfil
  const authorizedRoutes: RouteConfig[] = React.useMemo(() => {
    if (role === "manager") {
      const base = currentSlug ? `/dashboard/${currentSlug}` : "/dashboard";
      return [
        { name: "Dashboard", href: base, icon: LayoutDashboard, allowedRoles: ["manager"] },
        { name: "Funcionários", href: `${base}/equipe`, icon: Users, allowedRoles: ["manager"] },
        { name: "Fechamento", href: `${base}/fechamento`, icon: Lock, allowedRoles: ["manager"] },
        { name: "Banco Horas", href: `${base}/banco-de-horas`, icon: Clock, allowedRoles: ["manager"] },
      ];
    }

    if (role === "admin" || role === "owner") {
      return [
        { name: "Dashboard", href: "/dashboard/admin", icon: LayoutDashboard, allowedRoles: ["admin", "owner"] },
        { name: "Organizações", href: "/dashboard/admin/organizacoes", icon: Building2, allowedRoles: ["admin", "owner"] },
        { name: "Funcionários", href: "/dashboard/admin/equipe", icon: Users, allowedRoles: ["admin", "owner"] },
        { name: "Aprovar Correções", href: "/admin/correcoes", icon: CheckSquare, allowedRoles: ["admin", "owner"] },
        { name: "Banco Horas", href: "/dashboard/admin/banco-de-horas", icon: Clock, allowedRoles: ["admin", "owner"] },
        { name: "Fechamento", href: "/dashboard/admin/fechamento", icon: Lock, allowedRoles: ["admin", "owner"] },
      ];
    }

    // member
    return [
      { name: "Ponto", href: "/app", icon: Fingerprint, allowedRoles: ["member"] },
      { name: "Histórico", href: "/app/historico", icon: History, allowedRoles: ["member"] },
      { name: "Ajustes", href: "/app/ajustes", icon: MessageSquareWarning, allowedRoles: ["member"] },
    ];
  }, [role, currentSlug]);

  return (
    <Flex h="100svh" overflow="hidden" bg="bg">
      {/* SIDEBAR DESKTOP */}
      <Box
        display={{ base: "none", md: "flex" }}
        flexDirection="column"
        w="70px"
        bg="bg.subtle"
        borderRightWidth="1px"
        borderColor="border.subtle"
        transition="width 0.3s ease"
        _hover={{ w: "240px" }}
        overflow="hidden"
        position="relative"
        zIndex={50}
        css={{
          "&:hover .menu-label": { opacity: 1, display: "block" },
          "&:not(:hover) .menu-label": { opacity: 0, display: "none" }
        }}
      >
        <Flex direction="column" gap={2} p={3} mt={8} flex="1">
          {authorizedRoutes.map((route) => {
            const isRoot = route.href === "/app" || route.href === "/dashboard/admin";
            const isActive = isRoot ? pathname === route.href : (pathname === route.href || pathname.startsWith(`${route.href}/`));
            return (
              <Link key={route.href} href={route.href} passHref style={{ textDecoration: 'none', display: 'block' }}>
                <Flex
                  align="center"
                  p={3}
                  rounded="xl"
                  cursor="pointer"
                  color={isActive ? "brand.300" : "fg.muted"}
                  bg={isActive ? "primary.subtle" : "transparent"}
                  borderWidth="1px"
                  borderColor={isActive ? "primary.border" : "transparent"}
                  _hover={{ bg: isActive ? "primary.subtle" : "whiteAlpha.50", color: isActive ? "brand.200" : "fg" }}
                  transition="all 0.2s ease"
                  whiteSpace="nowrap"
                  gap={4}
                >
                  <Box minW="24px">
                    <route.icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  </Box>
                  <Text
                    className="menu-label"
                    fontWeight={isActive ? "bold" : "medium"}
                    fontSize="sm"
                    transition="opacity 0.2s"
                  >
                    {route.name}
                  </Text>
                </Flex>
              </Link>
            );
          })}
        </Flex>
      </Box>

      {/* ÁREA PRINCIPAL (CHILDREN) */}
      <Box flex="1" overflowY="auto" pb={{ base: "80px", md: 0 }} bg="bg">
        {children}
      </Box>

      {/* BOTTOM NAVIGATION MOBILE */}
      <Flex
        as="nav"
        display={{ base: "flex", md: "none" }}
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        bg="bg.subtle"
        borderTopWidth="1px"
        borderColor="border.subtle"
        justify="space-around"
        align="center"
        pb="env(safe-area-inset-bottom)"
        pt={2}
        px={2}
        zIndex={50}
        boxShadow="0 -4px 12px rgba(0, 0, 0, 0.4)"
        backdropFilter="blur(16px)"
      >
        {authorizedRoutes.map((route) => {
          const isRoot = route.href === "/app" || route.href === "/dashboard/admin";
          const isActive = isRoot ? pathname === route.href : (pathname === route.href || pathname.startsWith(`${route.href}/`));
            return (
              <Link key={route.href} href={route.href} passHref style={{ textDecoration: 'none', display: 'flex', flex: 1 }}>
                <Flex
                  direction="column"
                  align="center"
                  justify="center"
                  flex="1"
                  p={2}
                  color={isActive ? "brand.300" : "fg.muted"}
                  transition="all 0.2s ease"
                  _hover={{ color: "fg" }}
                >
                  <Box
                    mb={1}
                    bg={isActive ? "primary.subtle" : "transparent"}
                    borderWidth="1px"
                    borderColor={isActive ? "primary.border" : "transparent"}
                    p={1.5}
                    rounded="xl"
                    transition="all 0.2s ease"
                  >
                    <route.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  </Box>
                  <Text fontSize="10px" fontWeight={isActive ? "bold" : "medium"}>
                    {route.name}
                  </Text>
                </Flex>
              </Link>
            );
        })}
      </Flex>
    </Flex>
  );
}
