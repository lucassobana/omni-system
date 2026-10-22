import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Box, Container, Heading, Flex, Text } from "@chakra-ui/react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AjusteForm } from "./_components/AjusteForm";
import { AjustesList } from "./_components/AjustesList";

export const metadata = {
  title: "Ajuste de Ponto | Omni System",
};

export default async function AjustesPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  if (!claims?.claims?.sub) {
    redirect("/login");
  }

  const userId = claims.claims.sub as string;

  const { data: corrections } = await supabase
    .from("point_corrections")
    .select("id, occurrence_date, type, suggested_time, status, justification")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <Box minH="100svh" bg="bg" position="relative" pb={12}>
      {/* ── HEADER ── */}
      <Flex 
        as="header" 
        align="center" 
        justify="center" 
        p={4} 
        bg="card" 
        borderBottomWidth="1px" 
        borderColor="border"
        position="sticky"
        top={0}
        zIndex={10}
      >
        <Heading size="md" fontWeight="bold">Ajustes</Heading>
      </Flex>

      <Container maxW="md" px={4} py={6}>
        <Box mb={8}>
          <Heading size="lg" mb={2}>Solicitar Correção</Heading>
          <Text color="mutedForeground" fontSize="sm" mb={6}>
            Esqueceu de bater o ponto ou teve problemas de bateria? Preencha os dados abaixo para enviar uma justificativa ao seu gestor.
          </Text>
          <AjusteForm />
        </Box>

        <Box>
          <Heading size="md" mb={4}>Minhas Solicitações Recentes</Heading>
          <AjustesList corrections={corrections || []} />
        </Box>
      </Container>
    </Box>
  );
}
