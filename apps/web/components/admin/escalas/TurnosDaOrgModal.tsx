"use client";

import {
  Box, Button, Flex, Text, Heading, Input, Stack, Badge, Separator
} from "@chakra-ui/react";
import {
  DialogRoot, DialogContent, DialogHeader, DialogBody,
  DialogFooter, DialogCloseTrigger,
} from "@/components/ui/dialog";
import { NativeSelectRoot, NativeSelectField } from "@chakra-ui/react";
import { useState, useTransition, useEffect } from "react";
import { Trash2, AlertCircle, CheckCircle2, Plus } from "lucide-react";
import type { ShiftDoMes } from "@/lib/hooks/useEscalasDoMes";
import { useProfilesDaOrg, useSchedulesDaOrg } from "@/lib/hooks/useEscalasDoMes";
import { upsertShift, deleteShift } from "@/app/dashboard/admin/escalas/actions";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  date: string;
  organizationId: string;
  existingShifts: ShiftDoMes[];
}

function isoToTime(iso: string): string {
  if (!iso) return "";
  const match = iso.match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function buildIso(date: string, time: string): string {
  return `${date}T${time}:00`;
}

export function TurnosDaOrgModal({
  open, onClose, onSuccess, date, organizationId, existingShifts
}: Props) {
  const { profiles, loading: profilesLoading } = useProfilesDaOrg(organizationId);
  const { schedules, loading: schedulesLoading } = useSchedulesDaOrg(organizationId);

  const [addingNew, setAddingNew] = useState(false);
  const [selUserId, setSelUserId] = useState<string>("");
  const [selScheduleId, setSelScheduleId] = useState<string>("");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("19:00");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Atualizar seletores padrão quando os schedules carregarem
  useEffect(() => {
    if (schedules.length > 0 && !selScheduleId) {
      setSelScheduleId(schedules[0].id);
    }
  }, [schedules, selScheduleId]);

  function handleSaveNew() {
    if (!selUserId || !selScheduleId || !startTime || !endTime) {
      setErrorMsg("Preencha todos os campos para adicionar o plantão.");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const endsNextDay = parseInt(endTime.replace(":", "")) < parseInt(startTime.replace(":", ""));
      const endDate = endsNextDay
        ? new Date(new Date(`${date}T12:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10)
        : date;

      const result = await upsertShift({
        id: undefined,
        scheduleId: selScheduleId,
        userId: selUserId,
        organizationId,
        shiftDate: date,
        startAt: buildIso(date, startTime),
        endAt: buildIso(endDate, endTime),
      });

      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg("Plantão adicionado com sucesso.");
        setAddingNew(false);
        setSelUserId("");
        onSuccess();
      }
    });
  }

  function handleDelete(shiftId: string) {
    if (!confirm("Tem certeza que deseja remover este plantão?")) return;
    setErrorMsg(null);
    startTransition(async () => {
      const result = await deleteShift(shiftId);
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        setSuccessMsg("Plantão excluído.");
        onSuccess();
      }
    });
  }

  function customClose() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setAddingNew(false);
    onClose();
  }

  // Filtrar perfis que já têm turno neste dia
  const usedUserIds = new Set(existingShifts.map(s => s.user_id));
  const availableProfiles = profiles.filter(p => !usedUserIds.has(p.id));

  return (
    <DialogRoot open={open} onOpenChange={(d) => !d.open && customClose()} size="md" placement="center">
      <DialogContent>
        <DialogHeader>
          <Heading size="md">
            Plantões da Organização — {date}
          </Heading>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <Stack gap={5}>
            {/* Lista de plantões existentes */}
            <Box>
              <Text fontSize="sm" fontWeight="bold" mb={3}>
                Plantões Agendados ({existingShifts.length})
              </Text>
              
              {existingShifts.length === 0 ? (
                <Text fontSize="sm" color="fg.muted">Nenhum plantão neste dia.</Text>
              ) : (
                <Stack gap={2}>
                  {existingShifts.map((shift) => {
                    const profile = profiles.find(p => p.id === shift.user_id);
                    return (
                      <Flex key={shift.id} align="center" justify="space-between" bg="bg.muted" p={2} rounded="md" borderWidth="1px" borderColor="border.subtle">
                        <Box>
                          <Text fontSize="sm" fontWeight="medium">
                            {profile ? profile.full_name : "Carregando..."}
                          </Text>
                          <Text fontSize="xs" color="fg.muted">
                            {isoToTime(shift.start_at)} às {isoToTime(shift.end_at)}
                          </Text>
                        </Box>
                        <Button size="xs" variant="ghost" colorPalette="red" onClick={() => handleDelete(shift.id)} disabled={isPending}>
                          <Trash2 size={14} />
                        </Button>
                      </Flex>
                    );
                  })}
                </Stack>
              )}
            </Box>

            <Separator />

            {/* Adicionar novo */}
            {!addingNew ? (
              <Button size="sm" variant="outline" onClick={() => setAddingNew(true)} w="full">
                <Plus size={16} /> Adicionar Funcionário
              </Button>
            ) : (
              <Box bg="bg.surface" p={3} rounded="md" borderWidth="1px" borderColor="border.subtle">
                <Text fontSize="sm" fontWeight="bold" mb={3}>Novo Plantão</Text>
                
                <Stack gap={3}>
                  <Box>
                    <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={1}>Funcionário *</Text>
                    <NativeSelectRoot size="sm">
                      <NativeSelectField
                        value={selUserId}
                        onChange={(e) => setSelUserId(e.target.value)}
                        borderColor="border.subtle"
                        rounded="md"
                      >
                        <option value="" disabled>Selecionar funcionário…</option>
                        {availableProfiles.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.full_name}{p.employee_code ? ` (${p.employee_code})` : ""}
                          </option>
                        ))}
                      </NativeSelectField>
                    </NativeSelectRoot>
                  </Box>

                  <Box>
                    <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={1}>Escala de referência *</Text>
                    <NativeSelectRoot size="sm">
                      <NativeSelectField
                        value={selScheduleId}
                        onChange={(e) => setSelScheduleId(e.target.value)}
                        borderColor="border.subtle"
                        rounded="md"
                      >
                        <option value="" disabled>Selecionar escala…</option>
                        {schedules.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.shift_hours}h×{s.rest_hours}h)
                          </option>
                        ))}
                      </NativeSelectField>
                    </NativeSelectRoot>
                  </Box>

                  <Flex gap={3}>
                    <Box flex="1">
                      <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={1}>Entrada</Text>
                      <Input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        size="sm"
                        rounded="md"
                        borderColor="border.subtle"
                      />
                    </Box>
                    <Box flex="1">
                      <Text fontSize="xs" fontWeight="medium" color="fg.muted" mb={1}>Saída</Text>
                      <Input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        size="sm"
                        rounded="md"
                        borderColor="border.subtle"
                      />
                    </Box>
                  </Flex>

                  <Flex gap={2} mt={2}>
                    <Button size="xs" variant="outline" colorPalette="red" flex="1" onClick={() => setAddingNew(false)}>Cancelar</Button>
                    <Button size="xs" colorPalette="blue" flex="1" onClick={handleSaveNew} loading={isPending} disabled={!selUserId || !selScheduleId || !startTime || !endTime}>Salvar</Button>
                  </Flex>
                </Stack>
              </Box>
            )}

            {/* Feedback */}
            {errorMsg && (
              <Box bg="red.subtle" borderWidth="1px" borderColor="red.emphasized" rounded="lg" p={3}>
                <Flex align="center" gap={2} color="red.fg">
                  <AlertCircle size={14} />
                  <Text fontSize="xs" fontWeight="medium">{errorMsg}</Text>
                </Flex>
              </Box>
            )}
            {successMsg && (
              <Box bg="green.subtle" borderWidth="1px" borderColor="green.emphasized" rounded="lg" p={3}>
                <Flex align="center" gap={2} color="green.fg">
                  <CheckCircle2 size={14} />
                  <Text fontSize="xs" fontWeight="medium">{successMsg}</Text>
                </Flex>
              </Box>
            )}
          </Stack>
        </DialogBody>
      </DialogContent>
    </DialogRoot>
  );
}
