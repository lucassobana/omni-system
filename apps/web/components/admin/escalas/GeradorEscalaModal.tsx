"use client";

import {
  Box, Button, Flex, Text, Heading, Input, Stack, Badge, Spinner,
  NativeSelectRoot, NativeSelectField,
} from "@chakra-ui/react";
import {
  DialogRoot, DialogContent, DialogHeader, DialogBody,
  DialogFooter, DialogCloseTrigger, DialogBackdrop,
} from "@/components/ui/dialog";
import { useState, useTransition, useMemo, useEffect } from "react";
import { Zap, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { generateShifts12x36 } from "@/app/dashboard/admin/escalas/actions";
import { calcularDatas12x36 } from "@/lib/utils/escalas";
import type { ScheduleDaOrg } from "@/lib/hooks/useEscalasDoMes";
import { DatePickerPopover } from "./DatePickerPopover";

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Profile {
  id: string;
  full_name: string;
  employee_code: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
  year: number;
  month: number; // 1-12
  schedules: ScheduleDaOrg[];
}

export function GeradorEscalaModal({
  open, onClose, onSuccess,
  organizationId, year, month, schedules,
}: Props) {
  // ── Busca própria de funcionários ─────────────────────────────────────────
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);

  useEffect(() => {
    if (!open || !organizationId) return;

    let ignore = false;
    async function fetchProfiles() {
      await Promise.resolve(); // evita synchronous setState warning
      if (ignore) return;
      setProfilesLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, employee_code")
        .eq("organization_id", organizationId)
        .eq("status", "active")
        .order("full_name");
        
      if (!ignore) {
        setProfiles((data as Profile[]) ?? []);
        setProfilesLoading(false);
      }
    }
    fetchProfiles();
    return () => { ignore = true; };
  }, [open, organizationId]);

  // ── Estado do formulário ──────────────────────────────────────────────────
  const [selUserId, setSelUserId] = useState("");
  const [selScheduleId, setSelScheduleId] = useState(schedules[0]?.id ?? "");
  const [startTime, setStartTime] = useState("07:00");
  const [endTime, setEndTime] = useState("19:00");
  const [firstShiftDate, setFirstShiftDate] = useState(
    `${year}-${String(month).padStart(2, "0")}-01`
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sincroniza selScheduleId quando schedules carrega
  useEffect(() => {
    if (schedules.length > 0 && !selScheduleId) {
      Promise.resolve().then(() => {
        setSelScheduleId(schedules[0].id);
      });
    }
  }, [schedules, selScheduleId]);

  // ── Preview das datas ─────────────────────────────────────────────────────
  const previewDates = useMemo(() => {
    if (!firstShiftDate) return [];
    try {
      return calcularDatas12x36(firstShiftDate, year, month);
    } catch {
      return [];
    }
  }, [firstShiftDate, year, month]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleClose() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setSelUserId("");
    onClose();
  }

  function handleGenerate() {
    if (!selUserId) {
      setErrorMsg("Selecione um funcionário.");
      return;
    }
    if (!selScheduleId) {
      setErrorMsg("Selecione uma escala de referência.");
      return;
    }
    if (!firstShiftDate) {
      setErrorMsg("Informe a data do primeiro plantão.");
      return;
    }
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      // getTimezoneOffset() retorna positivo para UTC- (ex: BRT = +180)
      // Nossa função espera o offset real (ex: -180 para BRT UTC-3)
      const tzOffsetMinutes = -new Date().getTimezoneOffset();

      const result = await generateShifts12x36({
        scheduleId: selScheduleId,
        userId: selUserId,
        organizationId,
        startTime,
        endTime,
        firstShiftDate,
        year,
        month,
        tzOffsetMinutes,
      });

      if (result.error) {
        setErrorMsg(result.error);
      } else {
        const msg =
          `${result.inserted} plantão(ões) gerado(s)` +
          (result.skipped > 0 ? `, ${result.skipped} ignorado(s) por conflito.` : ".");
        setSuccessMsg(msg);
        onSuccess();
      }
    });
  }

  const selectedProfile = profiles.find((p) => p.id === selUserId);

  return (
    <DialogRoot 
      open={open} 
      onOpenChange={(d) => !d.open && handleClose()} 
      size="md"
      placement="center"
      motionPreset="scale"
    >
      <DialogContent 
        bg="bg.panel" 
        color="fg" 
        borderColor="border.subtle"
        shadow="2xl"
      >
        <DialogHeader>
          <Heading size="md" color="fg">Gerador de Escala 12×36</Heading>
          <Text fontSize="sm" color="fg.muted" mt={1}>
            {MONTHS_PT[month - 1]} de {year}
          </Text>
          <DialogCloseTrigger color="fg.muted" _hover={{ bg: "whiteAlpha.100" }} />
        </DialogHeader>

        <DialogBody pb={4}>
          <Stack gap={3}>

            {/* ── Funcionário ── */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="fg" mb={1}>
                Funcionário *
              </Text>
              {profilesLoading ? (
                <Flex align="center" gap={2} py={2}>
                  <Spinner size="sm" color="brand.400" />
                  <Text fontSize="sm" color="fg.muted">Carregando funcionários…</Text>
                </Flex>
              ) : profiles.length === 0 ? (
                <Text fontSize="sm" color="warning.fg">
                  Nenhum funcionário ativo encontrado nesta organização.
                </Text>
              ) : (
                <NativeSelectRoot size="sm">
                  <NativeSelectField
                    value={selUserId}
                    onChange={(e) => setSelUserId(e.target.value)}
                    borderColor="border.subtle"
                    rounded="lg"
                    bg="bg.surface"
                    color="fg"
                    _hover={{ borderColor: "primary.border" }}
                  >
                    <option value="" disabled>
                      Selecionar funcionário…
                    </option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.full_name}
                        {p.employee_code ? ` (${p.employee_code})` : ""}
                      </option>
                    ))}
                  </NativeSelectField>
                </NativeSelectRoot>
              )}
              {selectedProfile && (
                <Text fontSize="xs" color="blue.200" mt={1}>
                  ✓ {selectedProfile.full_name}
                </Text>
              )}
            </Box>

            {/* ── Configurações de Escala e Data ── */}
            <Flex gap={3}>
              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="whiteAlpha.800" mb={1}>
                  Escala de referência *
                </Text>
                {schedules.length === 0 ? (
                  <Text fontSize="sm" color="red.300">
                    Nenhuma escala cadastrada.
                  </Text>
                ) : (
                  <NativeSelectRoot size="sm">
                    <NativeSelectField
                      value={selScheduleId}
                      onChange={(e) => setSelScheduleId(e.target.value)}
                      borderColor="border.subtle"
                      rounded="lg"
                      bg="bg.surface"
                      color="fg"
                      _hover={{ borderColor: "primary.border" }}
                    >
                      <option value="" disabled>Selecionar escala…</option>
                      {schedules.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.shift_hours}h × {s.rest_hours}h
                        </option>
                      ))}
                    </NativeSelectField>
                  </NativeSelectRoot>
                )}
              </Box>

              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="fg" mb={1}>
                  Primeiro Plantão *
                </Text>
                <DatePickerPopover
                  value={firstShiftDate}
                  onChange={setFirstShiftDate}
                />
              </Box>
            </Flex>

            {/* ── Horários ── */}
            <Flex gap={3}>
              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="fg" mb={1}>
                  Hora Início
                </Text>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  size="sm"
                  rounded="lg"
                  borderColor="border.subtle"
                  bg="bg.surface"
                  color="fg"
                  _hover={{ borderColor: "primary.border" }}
                />
              </Box>
              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="fg" mb={1}>
                  Hora Fim
                </Text>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  size="sm"
                  rounded="lg"
                  borderColor="border.subtle"
                  bg="bg.surface"
                  color="fg"
                  _hover={{ borderColor: "primary.border" }}
                />
              </Box>
            </Flex>

            {/* ── Preview das datas ── */}
            {previewDates.length > 0 && (
              <Box
                bg="bg.subtle"
                borderWidth="1px"
                borderColor="border.subtle"
                rounded="lg"
                p={3}
              >
                <Flex align="center" gap={2} mb={2}>
                  <Calendar size={14} color="var(--chakra-colors-brand-300)" />
                  <Text fontSize="xs" fontWeight="semibold" color="brand.300">
                    {previewDates.length} plantão(ões) serão gerados
                  </Text>
                </Flex>
                <Flex wrap="wrap" gap={2}>
                  {previewDates.map((pd) => (
                    <Badge key={pd} size="sm" variant="subtle" colorPalette="blue" bg="primary.subtle" color="brand.200" borderWidth="1px" borderColor="primary.border">
                      {pd.split("-").reverse().join("/")}
                    </Badge>
                  ))}
                </Flex>
              </Box>
            )}

            {/* ── Feedback ── */}
            {errorMsg && (
              <Box bg="red.subtle" borderWidth="1px" borderColor="red.emphasized" rounded="lg" p={3}>
                <Flex align="center" gap={2} color="red.fg">
                  <AlertCircle size={16} />
                  <Text fontSize="sm" fontWeight="medium">Falha na geração</Text>
                </Flex>
                <Text fontSize="sm" color="red.fg" mt={1} ml={6}>{errorMsg}</Text>
              </Box>
            )}
            {successMsg && (
              <Box bg="green.subtle" borderWidth="1px" borderColor="green.emphasized" rounded="lg" p={3}>
                <Flex align="center" gap={2} color="green.fg">
                  <CheckCircle2 size={16} />
                  <Text fontSize="sm" fontWeight="medium">Escala gerada com sucesso</Text>
                </Flex>
                <Text fontSize="sm" color="green.fg" mt={1} ml={6}>{successMsg}</Text>
              </Box>
            )}
          </Stack>
        </DialogBody>

        <DialogFooter gap={2} borderTopWidth="1px" borderColor="border.subtle" pt={4}>
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
            colorPalette="blue"
            size="sm"
            onClick={handleGenerate}
            loading={isPending}
            disabled={schedules.length === 0 || profilesLoading || !selUserId || !selScheduleId || !firstShiftDate || !startTime || !endTime}
          >
            <Zap size={14} />
            Gerar Plantões
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
