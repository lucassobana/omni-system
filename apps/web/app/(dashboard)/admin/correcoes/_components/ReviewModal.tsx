"use client";

import { useState, useTransition } from "react";
import { Box, Button, Flex, Text, Badge, Input, Stack } from "@chakra-ui/react";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from "@/components/ui/dialog";
import { processarAjuste, type CorrectionItem } from "../actions";
import { Building2, Calendar, Clock, MessageSquare, User, CheckCircle2, XCircle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  correction: CorrectionItem;
  onSuccess?: () => void;
}

function formatDate(iso: string) {
  if (!iso) return "--/--/----";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
}

function formatDateTime(iso: string | null) {
  if (!iso) return "--/--/---- --:--";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " às " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function extractTime(iso: string | null | undefined) {
  if (!iso) return "--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function ReviewModal({ isOpen, onClose, correction, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [timeValue, setTimeValue] = useState(correction.suggested_time ? correction.suggested_time.slice(0, 5) : "08:00");

  const isClockIn = correction.type === "clock_in";
  const originalTime = isClockIn 
    ? extractTime(correction.work_records?.clock_in)
    : extractTime(correction.work_records?.clock_out);

  const employeeName = correction.profile?.full_name || "Colaborador";
  const orgName = correction.organizations?.name || correction.profile?.organizations?.name || "Empresa";
  const employeeCode = correction.profile?.employee_code;
  const initial = employeeName.charAt(0).toUpperCase();

  async function handleAction(actionStatus: "approved" | "rejected") {
    startTransition(async () => {
      try {
        await processarAjuste(correction.id, actionStatus, timeValue);
        onSuccess?.();
        onClose();
      } catch (err: any) {
        console.error("Erro ao processar ajuste:", err);
        alert(err?.message || "Ocorreu um erro ao processar o ajuste.");
      }
    });
  }

  return (
    <DialogRoot open={isOpen} onOpenChange={(e: { open: boolean }) => !e.open && onClose()} placement="center">
      <DialogContent maxW="lg" bg="card" borderColor="border.subtle" rounded="xl" shadow="2xl">
        <DialogHeader pb={3} borderBottomWidth="1px" borderColor="border.subtle">
          <Flex align="center" gap={3}>
            <Box p={2} rounded="lg" bg="primary.subtle" color="brand.300" borderWidth="1px" borderColor="primary.border">
              <Clock size={20} />
            </Box>
            <Box>
              <DialogTitle fontSize="lg" fontWeight="bold">Revisar Ajuste de Ponto</DialogTitle>
              <Text fontSize="xs" color="fg.muted">
                Solicitado em {formatDateTime(correction.created_at)}
              </Text>
            </Box>
          </Flex>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody py={5}>
          <Stack gap={4}>
            {/* ── Card do Colaborador ── */}
            <Flex
              p={3.5}
              rounded="xl"
              bg="bg.subtle"
              borderWidth="1px"
              borderColor="border.subtle"
              align="center"
              justify="space-between"
              gap={3}
            >
              <Flex align="center" gap={3}>
                <Flex
                  w={10}
                  h={10}
                  rounded="full"
                  bg="primary.subtle"
                  color="brand.300"
                  borderWidth="1px"
                  borderColor="primary.border"
                  align="center"
                  justify="center"
                  fontWeight="bold"
                  fontSize="sm"
                  shrink={0}
                >
                  {initial}
                </Flex>
                <Box>
                  <Text fontWeight="semibold" color="fg" fontSize="sm">
                    {employeeName}
                  </Text>
                  <Flex align="center" gap={2} mt={0.5} wrap="wrap">
                    <Flex align="center" gap={1} color="fg.muted" fontSize="xs">
                      <Building2 size={13} />
                      <Text>{orgName}</Text>
                    </Flex>
                    {employeeCode && (
                      <Badge size="xs" variant="outline" colorPalette="gray">
                        Matrícula: {employeeCode}
                      </Badge>
                    )}
                  </Flex>
                </Box>
              </Flex>

              <Badge
                colorPalette={
                  correction.status === "pending"
                    ? "yellow"
                    : correction.status === "approved"
                    ? "green"
                    : "red"
                }
                variant="subtle"
                size="md"
              >
                {correction.status === "pending" && "Pendente"}
                {correction.status === "approved" && "Aprovado"}
                {correction.status === "rejected" && "Rejeitado"}
              </Badge>
            </Flex>

            {/* ── Dados da Ocorrência ── */}
            <Flex gap={3}>
              <Box flex="1" bg="bg.surface" p={3} rounded="lg" borderWidth="1px" borderColor="border.subtle">
                <Text fontSize="xs" color="fg.muted" textTransform="uppercase" fontWeight="semibold" letterSpacing="wider">
                  Data da Ocorrência
                </Text>
                <Flex align="center" gap={1.5} mt={1}>
                  <Calendar size={15} color="#7DA9D8" />
                  <Text fontWeight="bold" fontSize="sm" color="fg">
                    {formatDate(correction.occurrence_date)}
                  </Text>
                </Flex>
              </Box>

              <Box flex="1" bg="bg.surface" p={3} rounded="lg" borderWidth="1px" borderColor="border.subtle">
                <Text fontSize="xs" color="fg.muted" textTransform="uppercase" fontWeight="semibold" letterSpacing="wider">
                  Tipo de Registro
                </Text>
                <Badge colorPalette={isClockIn ? "blue" : "purple"} variant="subtle" size="md" mt={1}>
                  {isClockIn ? "Entrada" : "Saída"}
                </Badge>
              </Box>
            </Flex>

            {/* ── Justificativa ── */}
            <Box
              bg="orange.subtle"
              color="orange.fg"
              p={3.5}
              rounded="xl"
              borderWidth="1px"
              borderColor="orange.muted"
            >
              <Flex align="center" gap={1.5} mb={1}>
                <MessageSquare size={14} />
                <Text fontSize="xs" textTransform="uppercase" fontWeight="bold" letterSpacing="wider">
                  Justificativa do Colaborador
                </Text>
              </Flex>
              <Text fontSize="sm" fontStyle="italic" pl={1}>
                &ldquo;{correction.justification || "Sem justificativa informada"}&rdquo;
              </Text>
            </Box>

            {/* ── Comparativo de Horários ── */}
            <Box
              bg="bg.surface"
              p={4}
              rounded="xl"
              borderWidth="1px"
              borderColor="border.subtle"
            >
              <Text fontSize="xs" color="fg.muted" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider" mb={3}>
                Comparativo de Horários
              </Text>

              <Flex justify="space-between" align="center" p={3} rounded="lg" bg="bg.subtle" mb={4}>
                <Box>
                  <Text fontSize="xs" color="fg.muted">Horário Registrado no Ponto</Text>
                  <Text
                    fontSize="base"
                    fontWeight="semibold"
                    color={originalTime !== "--:--" ? "fg.muted" : "fg.subtle"}
                    textDecoration={originalTime !== "--:--" ? "line-through" : "none"}
                  >
                    {originalTime}
                  </Text>
                </Box>

                <Box textAlign="right">
                  <Text fontSize="xs" color="fg.muted">Horário Solicitado</Text>
                  <Text fontSize="lg" fontWeight="bold" color="blue.400">
                    {correction.suggested_time ? correction.suggested_time.slice(0, 5) : "--:--"}
                  </Text>
                </Box>
              </Flex>

              {/* Se pendente, permite editar o horário antes de aprovar */}
              {correction.status === "pending" ? (
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="fg" mb={1}>
                    Horário a ser Homologado
                  </Text>
                  <Text fontSize="xs" color="fg.muted" mb={2}>
                    Confirme o horário abaixo para registrar no espelho de ponto:
                  </Text>
                  <Input
                    type="time"
                    value={timeValue}
                    onChange={(e) => setTimeValue(e.target.value)}
                    size="lg"
                    rounded="lg"
                    borderColor="border.subtle"
                    bg="bg.surface"
                    fontWeight="bold"
                    textAlign="center"
                  />
                </Box>
              ) : (
                <Box p={3} rounded="lg" bg="bg.subtle" borderLeftWidth="3px" borderColor={correction.status === "approved" ? "green.solid" : "red.solid"}>
                  <Flex align="center" gap={2} mb={1}>
                    {correction.status === "approved" ? (
                      <CheckCircle2 size={16} color="#22c55e" />
                    ) : (
                      <XCircle size={16} color="#ef4444" />
                    )}
                    <Text fontSize="xs" fontWeight="bold" textTransform="uppercase">
                      Solicitação {correction.status === "approved" ? "Aprovada" : "Rejeitada"}
                    </Text>
                  </Flex>
                  <Text fontSize="xs" color="fg.muted">
                    {correction.reviewer?.full_name ? `Analisado por: ${correction.reviewer.full_name}` : "Analisado pelo gestor"}
                    {correction.reviewed_at && ` em ${formatDateTime(correction.reviewed_at)}`}
                  </Text>
                </Box>
              )}
            </Box>
          </Stack>
        </DialogBody>

        <DialogFooter pt={3} borderTopWidth="1px" borderColor="border.subtle" gap={2}>
          <Button variant="ghost" size="md" onClick={onClose} disabled={isPending}>
            Fechar
          </Button>

          {correction.status === "pending" && (
            <>
              <Button
                colorPalette="red"
                variant="outline"
                size="md"
                onClick={() => handleAction("rejected")}
                loading={isPending}
              >
                Rejeitar Solicitação
              </Button>
              <Button
                colorPalette="green"
                size="md"
                onClick={() => handleAction("approved")}
                loading={isPending}
              >
                Aprovar Ajuste
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
