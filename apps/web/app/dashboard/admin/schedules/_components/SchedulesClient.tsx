"use client";

import {
  Box, Button, Container, Flex, Heading, Stack, Text,
  Badge, Spinner,
} from "@chakra-ui/react";
import { useState, useEffect, useCallback, useTransition } from "react";
import {
  CalendarRange, Plus, Pencil, Trash2, CheckCircle2, Clock, Archive,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ScheduleModal, type ScheduleData } from "@/components/admin/schedules/ScheduleModal";
import { deleteSchedule, updateScheduleStatus } from "@/app/dashboard/admin/schedules/actions";
import { useOrganizations } from "@/lib/hooks/useAdminDashboard";

const STATUS_CONFIG = {
  draft: { label: "Rascunho", color: "orange", icon: Clock },
  active: { label: "Ativa", color: "green", icon: CheckCircle2 },
  closed: { label: "Encerrada", color: "gray", icon: Archive },
} as const;

interface Props {
  adminOrgId: string | null;
}

export function SchedulesClient({ adminOrgId }: Props) {
  const [organizationId, setOrganizationId] = useState<string | null>(adminOrgId);
  const [schedules, setSchedules] = useState<ScheduleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { organizations } = useOrganizations();

  const loadSchedules = useCallback(async () => {
    if (!organizationId) { setSchedules([]); return; }
    setLoading(true);
    setErrorMsg(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("schedules")
      .select("id, organization_id, name, description, start_date, end_date, shift_hours, rest_hours, status")
      .eq("organization_id", organizationId)
      .order("status")
      .order("name");
    if (error) setErrorMsg(error.message);
    else setSchedules((data as ScheduleData[]) ?? []);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  // Se admin tem uma org, usa ela; senão aguarda seleção
  useEffect(() => {
    if (!organizationId && organizations.length === 1) {
      setOrganizationId(organizations[0].id);
    }
  }, [organizations, organizationId]);

  function handleEdit(s: ScheduleData) {
    setEditing(s);
    setModalOpen(true);
  }

  function handleNew() {
    setEditing(null);
    setModalOpen(true);
  }

  function handleDelete(schedule: ScheduleData) {
    if (!confirm(`Excluir a escala "${schedule.name}"?`)) return;
    setDeletingId(schedule.id);
    startTransition(async () => {
      const result = await deleteSchedule(schedule.id);
      if (result.error) {
        setErrorMsg(result.error);
      } else {
        await loadSchedules();
      }
      setDeletingId(null);
    });
  }

  function handleToggleStatus(schedule: ScheduleData) {
    const next = schedule.status === "active" ? "draft" : "active";
    startTransition(async () => {
      await updateScheduleStatus(schedule.id, next);
      await loadSchedules();
    });
  }

  const orgName = organizations.find((o) => o.id === organizationId)?.name;

  return (
    <Box minH="100svh" bg="bg" py={8}>
      <Container maxW="4xl" px={{ base: 4, md: 6, lg: 8 }}>
        <Stack gap={6}>

          {/* ── Cabeçalho ── */}
          <Flex
            align={{ base: "flex-start", md: "center" }}
            direction={{ base: "column", md: "row" }}
            justify="space-between"
            gap={4}
            pb={4}
            borderBottomWidth="1px"
            borderColor="border.subtle"
          >
            <Flex align="center" gap={3}>
              <Box p={3} rounded="xl" bg="blue.subtle" color="blue.fg" shadow="sm">
                <CalendarRange size={24} />
              </Box>
              <Box>
                <Heading size="xl" color="fg">
                  Modelos de Escala
                </Heading>
                <Text fontSize="sm" color="fg.muted" mt={0.5}>
                  {orgName ? `${orgName} — ` : ""}Configure as regras de turno e descanso
                </Text>
              </Box>
            </Flex>

            <Button
              colorPalette="blue"
              size="md"
              onClick={handleNew}
              disabled={!organizationId}
            >
              <Plus size={16} />
              Nova Escala
            </Button>
          </Flex>

          {/* ── Sem org ── */}
          {!organizationId && (
            <Flex justify="center" align="center" py={16} direction="column" gap={2} color="fg.muted">
              <CalendarRange size={32} />
              <Text fontSize="sm">Nenhuma organização disponível.</Text>
            </Flex>
          )}

          {/* ── Loading ── */}
          {loading && (
            <Flex justify="center" py={12}>
              <Spinner color="blue.500" />
            </Flex>
          )}

          {/* ── Erro global ── */}
          {errorMsg && (
            <Box
              bg="red.subtle"
              borderWidth="1px"
              borderColor="red.emphasized"
              rounded="lg"
              p={4}
            >
              <Text fontSize="sm" color="red.fg">{errorMsg}</Text>
            </Box>
          )}

          {/* ── Lista vazia ── */}
          {!loading && organizationId && schedules.length === 0 && !errorMsg && (
            <Flex
              direction="column"
              align="center"
              justify="center"
              py={16}
              gap={3}
              color="fg.muted"
              bg="bg.surface"
              borderWidth="1px"
              borderColor="border.subtle"
              borderStyle="dashed"
              rounded="xl"
            >
              <CalendarRange size={36} />
              <Text fontWeight="medium">Nenhuma escala cadastrada</Text>
              <Text fontSize="sm">
                Clique em "Nova Escala" para criar o primeiro modelo.
              </Text>
              <Button colorPalette="blue" size="sm" onClick={handleNew}>
                <Plus size={14} />
                Criar primeira escala
              </Button>
            </Flex>
          )}

          {/* ── Cards de schedules ── */}
          {!loading && schedules.length > 0 && (
            <Stack gap={3}>
              {schedules.map((s) => {
                const cfg = STATUS_CONFIG[s.status];
                const StatusIcon = cfg.icon;
                return (
                  <Box
                    key={s.id}
                    bg="bg.surface"
                    borderWidth="1px"
                    borderColor="border.subtle"
                    rounded="xl"
                    p={5}
                    shadow="sm"
                    transition="box-shadow 0.15s"
                    _hover={{ shadow: "md" }}
                  >
                    <Flex align="flex-start" gap={4}>
                      {/* Ícone de status */}
                      <Box
                        p={2.5}
                        rounded="lg"
                        bg={`${cfg.color}.subtle`}
                        color={`${cfg.color}.fg`}
                        flexShrink={0}
                        mt={0.5}
                      >
                        <StatusIcon size={18} />
                      </Box>

                      {/* Conteúdo */}
                      <Box flex="1" minW={0}>
                        <Flex align="center" gap={2} wrap="wrap">
                          <Text fontWeight="semibold" fontSize="md" color="fg">
                            {s.name}
                          </Text>
                          <Badge colorPalette={cfg.color} variant="subtle" rounded="full" px={2}>
                            {cfg.label}
                          </Badge>
                        </Flex>

                        {s.description && (
                          <Text fontSize="sm" color="fg.muted" mt={0.5} lineClamp={2}>
                            {s.description}
                          </Text>
                        )}

                        <Flex gap={4} mt={2} wrap="wrap">
                          <Flex align="center" gap={1}>
                            <Text fontSize="xs" color="fg.muted">Turno:</Text>
                            <Text fontSize="xs" fontWeight="semibold" color="fg">
                              {s.shift_hours}h
                            </Text>
                          </Flex>
                          <Flex align="center" gap={1}>
                            <Text fontSize="xs" color="fg.muted">Descanso:</Text>
                            <Text fontSize="xs" fontWeight="semibold" color="fg">
                              {s.rest_hours}h
                            </Text>
                          </Flex>
                          <Flex align="center" gap={1}>
                            <Text fontSize="xs" color="fg.muted">Início:</Text>
                            <Text fontSize="xs" fontWeight="semibold" color="fg">
                              {new Date(`${s.start_date}T12:00:00Z`).toLocaleDateString("pt-BR")}
                            </Text>
                          </Flex>
                          {s.end_date && (
                            <Flex align="center" gap={1}>
                              <Text fontSize="xs" color="fg.muted">Fim:</Text>
                              <Text fontSize="xs" fontWeight="semibold" color="fg">
                                {new Date(`${s.end_date}T12:00:00Z`).toLocaleDateString("pt-BR")}
                              </Text>
                            </Flex>
                          )}
                        </Flex>
                      </Box>

                      {/* Ações */}
                      <Flex gap={1} flexShrink={0}>
                        <Button
                          variant="ghost"
                          size="sm"
                          colorPalette={s.status === "active" ? "orange" : "green"}
                          onClick={() => handleToggleStatus(s)}
                          title={s.status === "active" ? "Pausar" : "Ativar"}
                          loading={isPending}
                        >
                          {s.status === "active" ? (
                            <><Clock size={14} /> Pausar</>
                          ) : (
                            <><CheckCircle2 size={14} /> Ativar</>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(s)}
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          colorPalette="red"
                          onClick={() => handleDelete(s)}
                          loading={deletingId === s.id}
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </Flex>
                    </Flex>
                  </Box>
                );
              })}
            </Stack>
          )}

          {/* ── Dica ── */}
          {!loading && schedules.length > 0 && (
            <Box
              bg="blue.subtle"
              borderWidth="1px"
              borderColor="blue.emphasized"
              rounded="lg"
              p={3}
            >
              <Text fontSize="xs" color="blue.fg">
                💡 Apenas escalas com status <strong>Ativa</strong> aparecem no gerador de turnos.
                Escalas em <strong>Rascunho</strong> também são listadas para facilitar a configuração.
              </Text>
            </Box>
          )}

        </Stack>
      </Container>

      {/* ── Modal ── */}
      {organizationId && (
        <ScheduleModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); loadSchedules(); }}
          organizationId={organizationId}
          existing={editing}
        />
      )}
    </Box>
  );
}
