"use client";

import {
  Box, Button, Flex, Text, Heading, Input, Textarea, Stack,
  NativeSelectRoot, NativeSelectField,
} from "@chakra-ui/react";
import {
  DialogRoot, DialogContent, DialogHeader, DialogBody,
  DialogFooter, DialogCloseTrigger,
} from "@/components/ui/dialog";
import { useState, useTransition } from "react";
import { upsertSchedule } from "@/app/dashboard/admin/schedules/actions";

export interface ScheduleData {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  shift_hours: number;
  rest_hours: number;
  status: "draft" | "active" | "closed";
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
  existing?: ScheduleData | null;
}

export function ScheduleModal({ open, onClose, onSuccess, organizationId, existing }: Props) {
  const isEditing = Boolean(existing);

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [startDate, setStartDate] = useState(
    existing?.start_date ?? new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState(existing?.end_date ?? "");
  const [shiftHours, setShiftHours] = useState(existing?.shift_hours ?? 12);
  const [restHours, setRestHours] = useState(existing?.rest_hours ?? 36);
  const [status, setStatus] = useState<"draft" | "active" | "closed">(
    existing?.status ?? "draft"
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setErrorMsg(null);
    onClose();
  }

  function handleSave() {
    if (!name.trim()) {
      setErrorMsg("O nome da escala é obrigatório.");
      return;
    }
    if (shiftHours < 1 || restHours < 1) {
      setErrorMsg("Horas de turno e descanso devem ser maiores que zero.");
      return;
    }
    setErrorMsg(null);

    startTransition(async () => {
      const result = await upsertSchedule({
        id: existing?.id,
        organizationId,
        name,
        description,
        startDate,
        endDate: endDate || null,
        shiftHours,
        restHours,
        status,
      });

      if (result.error) {
        setErrorMsg(result.error);
      } else {
        onSuccess();
        handleClose();
      }
    });
  }

  return (
    <DialogRoot open={open} onOpenChange={(d) => !d.open && handleClose()} size="md" placement="center">
      <DialogContent>
        <DialogHeader>
          <Heading size="md">
            {isEditing ? "Editar Escala" : "Nova Escala"}
          </Heading>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <Stack gap={4}>
            {/* Nome */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                Nome *
              </Text>
              <Input
                placeholder="Ex: Escala Padrão 12×36"
                value={name}
                onChange={(e) => setName(e.target.value)}
                size="sm"
                rounded="lg"
                borderColor="border.subtle"
              />
            </Box>

            {/* Descrição */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                Descrição
              </Text>
              <Textarea
                placeholder="Descrição opcional da escala…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                size="sm"
                rounded="lg"
                borderColor="border.subtle"
                rows={2}
              />
            </Box>

            {/* Horas de turno e descanso */}
            <Flex gap={3}>
              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                  Horas de Turno *
                </Text>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={shiftHours}
                  onChange={(e) => setShiftHours(Number(e.target.value))}
                  size="sm"
                  rounded="lg"
                  borderColor="border.subtle"
                />
                <Text fontSize="xs" color="fg.muted" mt={0.5}>
                  Ex: 12 para escala 12×36
                </Text>
              </Box>
              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                  Horas de Descanso *
                </Text>
                <Input
                  type="number"
                  min={1}
                  value={restHours}
                  onChange={(e) => setRestHours(Number(e.target.value))}
                  size="sm"
                  rounded="lg"
                  borderColor="border.subtle"
                />
                <Text fontSize="xs" color="fg.muted" mt={0.5}>
                  Ex: 36 para escala 12×36
                </Text>
              </Box>
            </Flex>

            {/* Datas */}
            <Flex gap={3}>
              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                  Data de Início *
                </Text>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  size="sm"
                  rounded="lg"
                  borderColor="border.subtle"
                />
              </Box>
              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                  Data de Fim
                </Text>
                <Input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  size="sm"
                  rounded="lg"
                  borderColor="border.subtle"
                />
                <Text fontSize="xs" color="fg.muted" mt={0.5}>
                  Opcional — deixe em branco para contínua
                </Text>
              </Box>
            </Flex>

            {/* Status */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                Status
              </Text>
              <NativeSelectRoot size="sm">
                <NativeSelectField
                  value={status}
                  onChange={(e) => setStatus(e.target.value as typeof status)}
                  borderColor="border.subtle"
                  rounded="lg"
                  bg="bg.surface"
                >
                  <option value="draft">Rascunho</option>
                  <option value="active">Ativa</option>
                  <option value="closed">Encerrada</option>
                </NativeSelectField>
              </NativeSelectRoot>
            </Box>

            {errorMsg && (
              <Text fontSize="sm" color="red.fg">
                {errorMsg}
              </Text>
            )}
          </Stack>
        </DialogBody>

        <DialogFooter gap={2}>
          <Button
            variant="outline"
            colorPalette="red"
            size="sm"
            onClick={handleClose}
          >
            Cancelar
          </Button>
          <Button
            colorPalette="blue"
            size="sm"
            onClick={handleSave}
            loading={isPending}
          >
            {isEditing ? "Salvar" : "Criar Escala"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
