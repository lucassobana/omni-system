"use client";

import {
  Box, Button, Flex, Text, Heading, Stack, Badge, Spinner,
} from "@chakra-ui/react";
import {
  DialogRoot, DialogContent, DialogHeader, DialogBody,
  DialogFooter, DialogCloseTrigger,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { Clock, PlusCircle, MinusCircle } from "lucide-react";
import { getExtratoFuncionario, type LancamentoHourBank } from "@/app/dashboard/admin/banco-de-horas/actions";

interface Props {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  userId: string | null;
  userName: string | null;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function ExtratoModal({ open, onClose, organizationId, userId, userName }: Props) {
  const [lancamentos, setLancamentos] = useState<LancamentoHourBank[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    setErrorMsg(null);
    getExtratoFuncionario(userId, organizationId).then((res) => {
      if (res.error) setErrorMsg(res.error);
      else setLancamentos(res.data ?? []);
      setLoading(false);
    });
  }, [open, userId, organizationId]);

  return (
    <DialogRoot open={open} onOpenChange={(d) => !d.open && onClose()} size="lg" placement="center">
      <DialogContent>
        <DialogHeader>
          <Flex align="center" gap={2}>
            <Box color="purple.fg">
              <Clock size={18} />
            </Box>
            <Heading size="md">
              Extrato do Banco de Horas — {userName}
            </Heading>
          </Flex>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <Stack gap={4}>
            {loading ? (
              <Flex justify="center" py={8}>
                <Spinner color="purple.500" />
              </Flex>
            ) : errorMsg ? (
              <Box bg="red.subtle" p={4} rounded="lg">
                <Text color="red.fg" fontSize="sm">{errorMsg}</Text>
              </Box>
            ) : lancamentos.length === 0 ? (
              <Box textAlign="center" py={8} color="fg.muted">
                Nenhuma movimentação registrada no banco de horas.
              </Box>
            ) : (
              <Stack gap={3}>
                {lancamentos.map((l) => {
                  const isCredit = l.type === "credit";
                  return (
                    <Flex
                      key={l.id}
                      p={3}
                      bg="bg.surface"
                      borderWidth="1px"
                      borderColor="border.subtle"
                      rounded="lg"
                      align="center"
                      justify="space-between"
                    >
                      <Flex align="flex-start" gap={3}>
                        <Box color={isCredit ? "green.fg" : "red.fg"} mt={0.5}>
                          {isCredit ? <PlusCircle size={18} /> : <MinusCircle size={18} />}
                        </Box>
                        <Box>
                          <Flex align="center" gap={2}>
                            <Text fontSize="sm" fontWeight="medium">
                              {l.reason}
                            </Text>
                            <Badge variant="subtle" size="sm" colorPalette={isCredit ? "green" : "red"}>
                              {isCredit ? "+" : "-"} {formatMinutes(l.minutes)}
                            </Badge>
                          </Flex>
                          <Text fontSize="xs" color="fg.muted" mt={0.5}>
                            Data de referência: {new Date(`${l.referenceDate}T12:00:00Z`).toLocaleDateString("pt-BR")}
                          </Text>
                          {l.notes && (
                            <Text fontSize="xs" color="fg.muted" mt={1}>
                              Obs: {l.notes}
                            </Text>
                          )}
                        </Box>
                      </Flex>
                    </Flex>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
