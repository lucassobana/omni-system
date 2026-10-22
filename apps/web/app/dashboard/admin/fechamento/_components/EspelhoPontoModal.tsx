"use client";

import {
  Box,
  Button,
  Flex,
  Input,
  Stack,
  Table,
  Text,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect, useTransition } from "react";
import {
  CheckCircle,
  Pencil,
  Save,
  X,
  Calendar,
  Printer,
} from "lucide-react";
import {
  getEmployeeWorkRecords,
  updateWorkRecordHours,
  validateEmployeeMonth,
  type WorkRecordDetail,
} from "../actions";
import { RelatorioFechamentoModal } from "./RelatorioFechamentoModal";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  organizationId: string;
  year: number;
  month: number;
  onSuccess: () => void;
}

function formatMinutes(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return "--:--";
  const isPositive = minutes >= 0;
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  const sign = isPositive ? "" : "-";
  return `${sign}${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
  });
}

function toLocalTimeInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function mergeDateWithTimeString(baseIso: string, timeStr: string): string {
  const d = new Date(baseIso);
  const [hours, minutes] = timeStr.split(":").map(Number);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export function EspelhoPontoModal({
  open,
  onClose,
  userId,
  userName,
  organizationId,
  year,
  month,
  onSuccess,
}: Props) {
  const [records, setRecords] = useState<WorkRecordDetail[]>([]);
  const [periodoFormatado, setPeriodoFormatado] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edição inline de registro
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [editBreak, setEditBreak] = useState("0");
  const [editNotes, setEditNotes] = useState("");

  const [relatorioOpen, setRelatorioOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !userId) return;
    let isMounted = true;

    getEmployeeWorkRecords(userId, organizationId, year, month, "cutoff_21_20").then((res) => {
      if (!isMounted) return;
      setEditingId(null);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setErrorMsg(null);
        setRecords(res.data || []);
        if (res.periodoFormatado) setPeriodoFormatado(res.periodoFormatado);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [open, userId, organizationId, year, month]);

  function startEdit(r: WorkRecordDetail) {
    setEditingId(r.id);
    setEditIn(toLocalTimeInput(r.clockIn));
    setEditOut(toLocalTimeInput(r.clockOut));
    setEditBreak(r.breakMinutes.toString());
    setEditNotes(r.notes || "");
  }

  function cancelEdit() {
    setEditingId(null);
  }

  function handleSaveEdit(r: WorkRecordDetail) {
    if (!editIn) {
      setErrorMsg("Horário de entrada é obrigatório.");
      return;
    }

    const clockInIso = mergeDateWithTimeString(r.clockIn, editIn);
    const clockOutIso = editOut
      ? mergeDateWithTimeString(r.clockOut || r.clockIn, editOut)
      : null;
    const breakMin = parseInt(editBreak) || 0;

    startTransition(async () => {
      const res = await updateWorkRecordHours(
        r.id,
        clockInIso,
        clockOutIso,
        breakMin,
        editNotes
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("Ponto atualizado com sucesso.");
        setEditingId(null);
        // Atualiza lista local
        const refreshed = await getEmployeeWorkRecords(
          userId,
          organizationId,
          year,
          month,
          "cutoff_21_20"
        );
        if (refreshed.data) setRecords(refreshed.data);
        if (refreshed.periodoFormatado) setPeriodoFormatado(refreshed.periodoFormatado);
        onSuccess();
      }
    });
  }

  function handleValidateMonth() {
    startTransition(async () => {
      const res = await validateEmployeeMonth(
        userId,
        organizationId,
        year,
        month,
        "cutoff_21_20"
      );
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg("Relatório de horas do colaborador validado com sucesso!");
        const refreshed = await getEmployeeWorkRecords(
          userId,
          organizationId,
          year,
          month,
          "cutoff_21_20"
        );
        if (refreshed.data) setRecords(refreshed.data);
        if (refreshed.periodoFormatado) setPeriodoFormatado(refreshed.periodoFormatado);
        onSuccess();
      }
    });
  }

  const allValidated =
    records.length > 0 &&
    records.every((r) => r.status === "closed" || r.status === "adjusted");

  return (
    <DialogRoot
      open={open}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
      size="xl"
    >
      <DialogContent bg="card" borderColor="border.subtle" borderWidth="1px" maxW="4xl">
        <DialogHeader pb={2}>
          <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
            <Flex align="center" gap={3}>
              <Box
                p={2.5}
                rounded="lg"
                bg="primary.subtle"
                color="brand.300"
                borderWidth="1px"
                borderColor="primary.border"
              >
                <Calendar size={20} />
              </Box>
              <Box>
                <DialogTitle fontSize="lg" color="fg">
                  Espelho de Ponto — {userName}
                </DialogTitle>
                <Text fontSize="xs" color="fg.muted">
                  Período: {periodoFormatado || `${month.toString().padStart(2, "0")}/${year}`} · Corte 21 a 20 · Validação e Ajustes de Jornada
                </Text>
              </Box>
            </Flex>

            {allValidated && (
              <Badge colorPalette="green" size="md" variant="subtle" px={2.5} py={1} rounded="full">
                <CheckCircle size={14} style={{ marginRight: 6 }} />
                Período Validado
              </Badge>
            )}
          </Flex>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody py={4}>
          <Stack gap={4}>
            {errorMsg && (
              <Box bg="red.subtle" borderWidth="1px" borderColor="red.emphasized" rounded="lg" p={3}>
                <Text fontSize="sm" color="red.fg">{errorMsg}</Text>
              </Box>
            )}

            {successMsg && (
              <Box bg="green.subtle" borderWidth="1px" borderColor="green.emphasized" rounded="lg" p={3}>
                <Text fontSize="sm" color="green.fg">{successMsg}</Text>
              </Box>
            )}

            {loading ? (
              <Flex justify="center" py={12}>
                <Spinner color="brand.400" />
              </Flex>
            ) : records.length === 0 ? (
              <Box py={8} textAlign="center" color="fg.muted">
                Nenhum registro de ponto encontrado para este mês.
              </Box>
            ) : (
              <Box
                borderWidth="1px"
                borderColor="border.subtle"
                rounded="lg"
                overflowX="auto"
                bg="bg.surface"
              >
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row bg="bg.subtle">
                      <Table.ColumnHeader>Data</Table.ColumnHeader>
                      <Table.ColumnHeader>Entrada</Table.ColumnHeader>
                      <Table.ColumnHeader>Intervalo</Table.ColumnHeader>
                      <Table.ColumnHeader>Saída</Table.ColumnHeader>
                      <Table.ColumnHeader>Total Horas</Table.ColumnHeader>
                      <Table.ColumnHeader>Status</Table.ColumnHeader>
                      <Table.ColumnHeader textAlign="right">Ação</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {records.map((r) => {
                      const isEditing = editingId === r.id;

                      if (isEditing) {
                        return (
                          <Table.Row key={r.id} bg="primary.subtle">
                            <Table.Cell fontWeight="semibold">
                              {formatDate(r.clockIn)}
                            </Table.Cell>
                            <Table.Cell>
                              <Input
                                size="xs"
                                type="time"
                                value={editIn}
                                onChange={(e) => setEditIn(e.target.value)}
                                bg="bg.surface"
                                rounded="md"
                                w="80px"
                              />
                            </Table.Cell>
                            <Table.Cell>
                              <Input
                                size="xs"
                                type="number"
                                min={0}
                                value={editBreak}
                                onChange={(e) => setEditBreak(e.target.value)}
                                bg="bg.surface"
                                rounded="md"
                                w="60px"
                              />
                            </Table.Cell>
                            <Table.Cell>
                              <Input
                                size="xs"
                                type="time"
                                value={editOut}
                                onChange={(e) => setEditOut(e.target.value)}
                                bg="bg.surface"
                                rounded="md"
                                w="80px"
                              />
                            </Table.Cell>
                            <Table.Cell colSpan={2}>
                              <Input
                                size="xs"
                                placeholder="Motivo do ajuste..."
                                value={editNotes}
                                onChange={(e) => setEditNotes(e.target.value)}
                                bg="bg.surface"
                                rounded="md"
                              />
                            </Table.Cell>
                            <Table.Cell textAlign="right">
                              <Flex justify="flex-end" gap={1}>
                                <Button
                                  size="xs"
                                  colorPalette="green"
                                  onClick={() => handleSaveEdit(r)}
                                  loading={isPending}
                                >
                                  <Save size={14} />
                                </Button>
                                <Button
                                  size="xs"
                                  variant="subtle"
                                  onClick={cancelEdit}
                                >
                                  <X size={14} />
                                </Button>
                              </Flex>
                            </Table.Cell>
                          </Table.Row>
                        );
                      }

                      return (
                        <Table.Row key={r.id} _hover={{ bg: "whiteAlpha.50" }}>
                          <Table.Cell fontWeight="medium">
                            {formatDate(r.clockIn)}
                          </Table.Cell>
                          <Table.Cell>{toLocalTimeInput(r.clockIn)}</Table.Cell>
                          <Table.Cell>{r.breakMinutes}m</Table.Cell>
                          <Table.Cell>
                            {r.clockOut ? toLocalTimeInput(r.clockOut) : (
                              <Text color="orange.fg" fontSize="xs">Em aberto</Text>
                            )}
                          </Table.Cell>
                          <Table.Cell fontWeight="semibold">
                            {formatMinutes(r.workedMinutes)}
                          </Table.Cell>
                          <Table.Cell>
                            <Badge
                              size="xs"
                              colorPalette={
                                r.status === "adjusted"
                                  ? "blue"
                                  : r.status === "closed"
                                  ? "green"
                                  : "orange"
                              }
                              variant="subtle"
                            >
                              {r.status === "adjusted"
                                ? "Ajustado"
                                : r.status === "closed"
                                ? "Validado"
                                : "Aberto"}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell textAlign="right">
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => startEdit(r)}
                              title="Editar Horário"
                            >
                              <Pencil size={14} />
                            </Button>
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              </Box>
            )}
          </Stack>
        </DialogBody>

        <DialogFooter gap={3}>
          <Button variant="subtle" onClick={onClose} size="sm">
            Fechar
          </Button>

          <Button
            colorPalette="teal"
            variant="surface"
            size="sm"
            onClick={() => setRelatorioOpen(true)}
            title="Gerar Relatório Oficial de Fechamento de Serviços Prestados"
          >
            <Printer size={16} /> Relatório Fechamento PDF
          </Button>

          <Button
            colorPalette="green"
            size="sm"
            onClick={handleValidateMonth}
            loading={isPending}
            disabled={records.length === 0}
          >
            <CheckCircle size={16} /> Validar Relatório do Mês
          </Button>
        </DialogFooter>
      </DialogContent>

      {relatorioOpen && (
        <RelatorioFechamentoModal
          open={relatorioOpen}
          onClose={() => setRelatorioOpen(false)}
          userId={userId}
          userName={userName}
          organizationId={organizationId}
          year={year}
          month={month}
        />
      )}
    </DialogRoot>
  );
}
