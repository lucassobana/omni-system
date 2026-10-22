"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";
import {
  Box,
  Button,
  Field,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

// ─── Formulário interno (precisa de useSearchParams → Suspense boundary) ──
function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/app";

  const [state, formAction, isPending] = useActionState(loginAction, {
    error: null,
  });

  return (
    <form action={formAction} style={{ width: "100%" }}>
      <Stack gap={6}>
        {/* Cabeçalho */}
        <Stack gap={1} textAlign="center">
          <Heading size="xl" color="fg">
            Omni System
          </Heading>
          <Text color="mutedForeground" fontSize="sm">
            Entre com suas credenciais para acessar o sistema.
          </Text>
        </Stack>

        {/* Mensagem de erro global */}
        {state.error && (
          <Box
            px={4}
            py={3}
            rounded="lg"
            bg="destructive"
            color="destructiveForeground"
            fontSize="sm"
            role="alert"
            aria-live="polite"
          >
            {state.error}
          </Box>
        )}

        {/* Campo redirectTo oculto */}
        <input type="hidden" name="redirectTo" value={redirectTo} />

        {/* E-mail */}
        <Field.Root id="email" required>
          <Field.Label color="fg" fontWeight="medium" fontSize="sm">
            E-mail
          </Field.Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="seu@email.com"
            autoComplete="email"
            disabled={isPending}
            bg="input"
            borderColor="border"
            color="fg"
            _placeholder={{ color: "mutedForeground" }}
            _focus={{ borderColor: "ring", boxShadow: "0 0 0 2px var(--chakra-colors-ring)" }}
          />
        </Field.Root>

        {/* Senha */}
        <Field.Root id="password" required>
          <Field.Label color="fg" fontWeight="medium" fontSize="sm">
            Senha
          </Field.Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            disabled={isPending}
            bg="input"
            borderColor="border"
            color="fg"
            _placeholder={{ color: "mutedForeground" }}
            _focus={{ borderColor: "ring", boxShadow: "0 0 0 2px var(--chakra-colors-ring)" }}
          />
        </Field.Root>

        {/* Botão de submit */}
        <Button
          type="submit"
          w="full"
          loading={isPending}
          loadingText="Entrando..."
          bg="primary"
          color="primaryForeground"
          _hover={{ opacity: 0.9 }}
          _active={{ opacity: 0.8 }}
          size="lg"
          fontWeight="semibold"
          transition="opacity 0.15s"
        >
          Entrar
        </Button>
      </Stack>
    </form>
  );
}

// ─── Página de Login ───────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <Flex
      minH="100svh"
      align="center"
      justify="center"
      bg="bg"
      px={4}
    >
      {/* Card central */}
      <Box
        w="full"
        maxW="sm"
        bg="card"
        borderColor="border"
        borderWidth={1}
        rounded="2xl"
        shadow="lg"
        px={{ base: 6, md: 8 }}
        py={10}
      >
        {/* Logo mark */}
        <Flex justify="center" mb={8}>
          <Box
            w={12}
            h={12}
            rounded="xl"
            bg="primary"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text
              color="primaryForeground"
              fontWeight="black"
              fontSize="xl"
              lineHeight={1}
              userSelect="none"
            >
              O
            </Text>
          </Box>
        </Flex>

        {/* Formulário dentro de Suspense (exigido por useSearchParams) */}
        <Suspense
          fallback={
            <Box h="280px" display="flex" alignItems="center" justifyContent="center">
              <Text color="mutedForeground" fontSize="sm">
                Carregando...
              </Text>
            </Box>
          }
        >
          <LoginForm />
        </Suspense>
      </Box>
    </Flex>
  );
}
