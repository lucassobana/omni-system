"use client";

import {
  Box, Button, Flex, Text, Heading, Input, Stack,
  NativeSelectRoot, NativeSelectField, Textarea,
} from "@chakra-ui/react";
import {
  DialogRoot, DialogContent, DialogHeader, DialogBody,
  DialogFooter, DialogCloseTrigger,
} from "@/components/ui/dialog";
import { useState, useTransition } from "react";
import { Calculator, AlertCircle, CheckCircle2 } from "lucide-react";
import { inserirLancamentoManual } from "@/app/dashboard/admin/banco-de-horas/actions";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
  userId: string | null;
  userName: string | null;
}

export function AjusteSaldoModal({ open, onClose, onSuccess, organizationId, userId, userName }: Props) {
  const [type, setType] = useState<"credit" | "debit">("credit");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [referenceDate, setReferenceDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setHours("");
    setMinutes("");
    setReason("");
    setNotes("");
    onClose();
  }

  function handleSave() {
    if (!userId) return;
    
    const totalMinutes = (parseInt(hours || "0") * 60) + parseInt(minutes || "0");
    if (totalMinutes <= 0) {
      setErrorMsg("Informe a quantidade de horas/minutos.");
      return;
    }
    if (!reason.trim()) {
      setErrorMsg("Informe o motivo do ajuste.");
      return;
    }
    if (!referenceDate) {
      setErrorMsg("Informe a data de referência.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await inserirLancamentoManual({
        organizationId,
        userId,
        type,
        minutes: totalMinutes,
        reason: reason.trim(),
        referenceDate,
        notes: notes.trim() || undefined,
      });

      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg("Lançamento adicionado com sucesso.");
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 800);
      }
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={(d) => !d.open && handleClose()} size="md" placement="center">
      <DialogContent>
        <DialogHeader>
          <Flex align="center" gap={2}>
            <Box color="purple.fg">
              <Calculator size={18} />
            </Box>
            <Heading size="md">Ajuste Manual — {userName}</Heading>
          </Flex>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <Stack gap={4}>
            <Flex gap={3}>
              {/* Tipo */}
              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                  Tipo Operação *
                </Text>
                <NativeSelectRoot size="sm">
                  <NativeSelectField
                    value={type}
                    onChange={(e) => setType(e.target.value as "credit" | "debit")}
                    borderColor="border.subtle"
                    rounded="lg"
                    bg="bg.surface"
                  >
                    <option value="credit">Crédito (+) Adicionar Horas</option>
                    <option value="debit">Débito (-) Descontar Horas</option>
                  </NativeSelectField>
                </NativeSelectRoot>
              </Box>
              
              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                  Data *
                </Text>
                <Input
                  type="date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                  size="sm"
                  rounded="lg"
                  borderColor="border.subtle"
                />
              </Box>
            </Flex>

            {/* Quantidade */}
            <Flex gap={3}>
              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                  Horas *
                </Text>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ex: 5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  size="sm"
                  rounded="lg"
                  borderColor="border.subtle"
                />
              </Box>
              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                  Minutos *
                </Text>
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="Ex: 30"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  size="sm"
                  rounded="lg"
                  borderColor="border.subtle"
                />
              </Box>
            </Flex>

            {/* Motivo */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                Motivo *
              </Text>
              <Input
                placeholder="Ex: Quitação de banco, Esqueceu de bater o ponto..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                size="sm"
                rounded="lg"
                borderColor="border.subtle"
              />
            </Box>

            {/* Obs */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                Observações (Opcional)
              </Text>
              <Textarea
                placeholder="Detalhes adicionais"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                size="sm"
                rounded="lg"
                borderColor="border.subtle"
              />
            </Box>

            {/* ── Feedback ── */}
            {errorMsg && (
              <Box bg="red.subtle" borderWidth="1px" borderColor="red.emphasized" rounded="lg" p={3}>
                <Flex align="center" gap={2} color="red.fg">
                  <AlertCircle size={16} />
                  <Text fontSize="sm" fontWeight="medium">Falha</Text>
                </Flex>
                <Text fontSize="sm" color="red.fg" mt={1} ml={6}>{errorMsg}</Text>
              </Box>
            )}
            {successMsg && (
              <Box bg="green.subtle" borderWidth="1px" borderColor="green.emphasized" rounded="lg" p={3}>
                <Flex align="center" gap={2} color="green.fg">
                  <CheckCircle2 size={16} />
                  <Text fontSize="sm" fontWeight="medium">Sucesso</Text>
                </Flex>
                <Text fontSize="sm" color="green.fg" mt={1} ml={6}>{successMsg}</Text>
              </Box>
            )}
          </Stack>
        </DialogBody>

        <DialogFooter gap={2}>
          <Button
            variant="outline"
            colorPalette="red"
            size="sm"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            colorPalette={type === "credit" ? "green" : "red"}
            size="sm"
            onClick={handleSave}
            loading={isPending}
            disabled={(!hours && !minutes) || !reason}
          >
            Lançar {type === "credit" ? "Crédito" : "Débito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
