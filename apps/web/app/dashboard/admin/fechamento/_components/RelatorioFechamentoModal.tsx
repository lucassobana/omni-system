"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Input,
  Stack,
  Text,
  Spinner,
  Badge,
  NativeSelectRoot,
  NativeSelectField,
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
import { Printer, Edit3, Check, X, FileText } from "lucide-react";
import {
  getFechamentoRelatorioFuncionario,
  updateRecordVehicleAndNotes,
  type FechamentoRelatorioFuncionario,
  type FechamentoDiaItem,
} from "../actions";

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  organizationId: string;
  year: number;
  month: number;
  isReadOnly?: boolean;
}

export function RelatorioFechamentoModal({
  open,
  onClose,
  userId,
  userName,
  organizationId,
  year,
  month,
  isReadOnly = false,
}: Props) {
  const [periodType, setPeriodType] = useState<"cutoff_21_20" | "calendar">("cutoff_21_20");
  const [relatorio, setRelatorio] = useState<FechamentoRelatorioFuncionario | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edição rápida de item (veículo / observações)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editUsesVehicle, setEditUsesVehicle] = useState(true);
  const [editVehicleReason, setEditVehicleReason] = useState("Manutenção");
  const [editObservations, setEditObservations] = useState("");
  const [isPending, startTransition] = useTransition();

  function loadReport() {
    if (!open || !userId) return;
    setLoading(true);
    setErrorMsg(null);
    setEditingIndex(null);

    getFechamentoRelatorioFuncionario(userId, organizationId, year, month, periodType).then((res) => {
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setRelatorio(res.data || null);
      }
      setLoading(false);
    });
  }

  useEffect(() => {
    if (!open || !userId) return;
    let isMounted = true;

    getFechamentoRelatorioFuncionario(userId, organizationId, year, month, periodType).then((res) => {
      if (!isMounted) return;
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setRelatorio(res.data || null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [open, userId, organizationId, year, month, periodType]);

  function handleStartEdit(item: FechamentoDiaItem, idx: number) {
    setEditingIndex(idx);
    setEditUsesVehicle(item.isVeiculoOk);
    setEditVehicleReason(item.isVeiculoOk ? "Manutenção" : item.utilizacaoVeiculo);
    setEditObservations(item.observacoes || "");
  }

  function handleCancelEdit() {
    setEditingIndex(null);
  }

  function handleSaveEdit(item: FechamentoDiaItem) {
    if (!item.recordId) return;

    startTransition(async () => {
      const res = await updateRecordVehicleAndNotes(
        item.recordId!,
        editUsesVehicle,
        editUsesVehicle ? undefined : editVehicleReason,
        editObservations
      );

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setEditingIndex(null);
        loadReport();
      }
    });
  }

  function handlePrint() {
    if (typeof document !== "undefined") {
      document.body.classList.add("printing-relatorio");
    }
    window.print();
    if (typeof window !== "undefined") {
      window.addEventListener(
        "afterprint",
        () => {
          document.body.classList.remove("printing-relatorio");
        },
        { once: true }
      );
    }
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(details) => {
        if (!details.open) onClose();
      }}
      size="full"
    >
      <DialogContent bg="bg" borderColor="border.subtle" borderWidth="1px" maxW="1100px" mx="auto" my="4">
        {/* Header de controles (não impresso) */}
        <DialogHeader pb={3} className="no-print">
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
                <FileText size={20} />
              </Box>
              <Box>
                <DialogTitle fontSize="lg" color="fg">
                  Relatório de Fechamento de Serviços Prestados
                </DialogTitle>
                <Text fontSize="xs" color="fg.muted">
                  {userName} · Formato Oficial de Apresentação e Impressão
                </Text>
              </Box>
            </Flex>

            {/* Controles de Período e Impressão */}
            <Flex align="center" gap={3} wrap="wrap">
              <NativeSelectRoot size="sm" w="210px">
                <NativeSelectField
                  value={periodType}
                  onChange={(e) => {
                    setLoading(true);
                    setPeriodType(e.target.value as "cutoff_21_20" | "calendar");
                  }}
                  bg="bg.surface"
                  rounded="lg"
                >
                  <option value="cutoff_21_20">Corte 21 a 20 (Plantões)</option>
                  <option value="calendar">Mês Civil (01 a 31)</option>
                </NativeSelectField>
              </NativeSelectRoot>

              <Button
                colorPalette="blue"
                size="sm"
                onClick={handlePrint}
                disabled={loading || !relatorio || relatorio.dias.length === 0}
              >
                <Printer size={16} /> Imprimir / Salvar PDF
              </Button>

              <DialogCloseTrigger />
            </Flex>
          </Flex>
        </DialogHeader>

        <DialogBody py={4} px={{ base: 2, md: 6 }}>
          {loading && (
            <Flex justify="center" py={16} align="center" direction="column" gap={3}>
              <Spinner color="brand.400" size="lg" />
              <Text fontSize="sm" color="fg.muted">Gerando espelho de fechamento...</Text>
            </Flex>
          )}

          {errorMsg && (
            <Box bg="red.subtle" borderWidth="1px" borderColor="red.emphasized" rounded="lg" p={4} mb={4} className="no-print">
              <Text fontSize="sm" color="red.fg">{errorMsg}</Text>
            </Box>
          )}

          {/* ════════════════════════════════════════════════════════════════
              ÁREA DO DOCUMENTO OFICIAL A4 (ESTILO IDÊNTICO À IMAGEM)
              ════════════════════════════════════════════════════════════════ */}
          {!loading && relatorio && (
            <Box
              id="relatorio-fechamento-print"
              bg="#ffffff"
              color="#0f172a"
              p={{ base: 4, md: 8 }}
              rounded="xl"
              borderWidth="1px"
              borderColor="#e2e8f0"
              shadow="md"
              maxW="950px"
              mx="auto"
              fontFamily="system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            >
              {/* Cabeçalho do Relatório */}
              <Box textAlign="center" mb={6}>
                <Heading
                  as="h1"
                  fontSize={{ base: "15px", md: "17px" }}
                  fontWeight="bold"
                  color="#0f172a"
                  letterSpacing="0.02em"
                  mb={1}
                  textTransform="uppercase"
                >
                  RELATÓRIO DE FECHAMENTO DE SERVIÇOS PRESTADOS – {relatorio.organizationName}
                </Heading>
                <Text
                  fontSize={{ base: "13px", md: "14px" }}
                  fontWeight="bold"
                  color="#1e293b"
                  textTransform="uppercase"
                  mb={1}
                >
                  UNIDADE: {relatorio.unitName}
                </Text>
                <Text fontSize={{ base: "12px", md: "13px" }} color="#475569">
                  Período: {relatorio.periodoFormatado}
                </Text>
                <Text fontSize="12px" color="#64748b" mt={0.5}>
                  Colaborador: <strong>{relatorio.employeeName}</strong>
                  {relatorio.employeeCode ? ` (Matrícula: ${relatorio.employeeCode})` : ""}
                </Text>
              </Box>

              {/* Tabela Oficial de Serviços Prestados */}
              <Box overflowX="auto">
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "12px",
                    lineHeight: "1.3",
                    textAlign: "center",
                    border: "1px solid #0f233a",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: "#102a45",
                        color: "#ffffff",
                        fontWeight: "bold",
                        fontSize: "11px",
                        letterSpacing: "0.03em",
                      }}
                    >
                      <th style={{ padding: "8px 6px", border: "1px solid #24446b", width: "90px" }}>DATA</th>
                      <th style={{ padding: "8px 6px", border: "1px solid #24446b", width: "110px" }}>DIA DA SEMANA</th>
                      <th style={{ padding: "8px 6px", border: "1px solid #24446b", width: "130px" }}>HORÁRIO DO PLANTÃO</th>
                      <th style={{ padding: "8px 6px", border: "1px solid #24446b", width: "95px" }}>TOTAL HORAS</th>
                      <th style={{ padding: "8px 6px", border: "1px solid #24446b", width: "135px" }}>
                        UTILIZAÇÃO VEÍCULO 4x4
                      </th>
                      <th style={{ padding: "8px 8px", border: "1px solid #24446b", textAlign: "left" }}>
                        OBSERVAÇÕES
                      </th>
                      {!isReadOnly && (
                        <th style={{ padding: "8px 4px", border: "1px solid #24446b", width: "60px" }} className="no-print">
                          AÇÃO
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {relatorio.dias.length === 0 ? (
                      <tr>
                        <td colSpan={isReadOnly ? 6 : 7} style={{ padding: "24px", color: "#64748b", textAlign: "center" }}>
                          Nenhum registro ou plantão encontrado para este período.
                        </td>
                      </tr>
                    ) : (
                      relatorio.dias.map((d, index) => {
                        const isEditing = editingIndex === index;

                        return (
                          <tr
                            key={d.recordId || index}
                            style={{
                              backgroundColor: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                              borderBottom: "1px solid #cbd5e1",
                            }}
                          >
                            {/* DATA */}
                            <td style={{ padding: "6px", border: "1px solid #cbd5e1", whiteSpace: "nowrap" }}>
                              {d.data}
                            </td>

                            {/* DIA DA SEMANA */}
                            <td style={{ padding: "6px", border: "1px solid #cbd5e1" }}>
                              {d.diaSemana}
                            </td>

                            {/* HORÁRIO DO PLANTÃO */}
                            <td style={{ padding: "6px", border: "1px solid #cbd5e1", whiteSpace: "nowrap" }}>
                              {d.horarioPlantao}
                            </td>

                            {/* TOTAL HORAS */}
                            <td style={{ padding: "6px", border: "1px solid #cbd5e1", fontWeight: "500", whiteSpace: "nowrap" }}>
                              {d.totalHoras}
                            </td>

                            {/* UTILIZAÇÃO VEÍCULO 4x4 */}
                            <td style={{ padding: "6px", border: "1px solid #cbd5e1" }}>
                              {isEditing ? (
                                <Stack gap={1} align="center">
                                  <NativeSelectRoot size="xs" w="100%">
                                    <NativeSelectField
                                      value={editUsesVehicle ? "OK" : editVehicleReason}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "OK") {
                                          setEditUsesVehicle(true);
                                        } else {
                                          setEditUsesVehicle(false);
                                          setEditVehicleReason(val);
                                        }
                                      }}
                                      bg="#ffffff"
                                      color="#0f172a"
                                      fontSize="11px"
                                      p={1}
                                    >
                                      <option value="OK">OK</option>
                                      <option value="Manutenção">Manutenção</option>
                                      <option value="Não Utilizado">Não Utilizado</option>
                                      <option value="Emprestado">Emprestado</option>
                                    </NativeSelectField>
                                  </NativeSelectRoot>
                                </Stack>
                              ) : (
                                <span
                                  style={{
                                    fontWeight: "bold",
                                    color: d.isVeiculoOk ? "#15803d" : "#b91c1c",
                                  }}
                                >
                                  {d.utilizacaoVeiculo}
                                </span>
                              )}
                            </td>

                            {/* OBSERVAÇÕES */}
                            <td style={{ padding: "6px 8px", border: "1px solid #cbd5e1", textAlign: "left" }}>
                              {isEditing ? (
                                <Input
                                  size="xs"
                                  value={editObservations}
                                  onChange={(e) => setEditObservations(e.target.value)}
                                  placeholder="Ex: Plantão 24h; trocaram feriado"
                                  bg="#ffffff"
                                  color="#0f172a"
                                  fontSize="11px"
                                />
                              ) : (
                                <span style={{ color: "#334155" }}>
                                  {d.observacoes || "—"}
                                </span>
                              )}
                            </td>

                            {/* AÇÕES DE EDIÇÃO (não impressas) */}
                            {!isReadOnly && (
                              <td style={{ padding: "4px", border: "1px solid #cbd5e1" }} className="no-print">
                                {isEditing ? (
                                  <Flex justify="center" gap={1}>
                                    <Button
                                      size="2xs"
                                      colorPalette="green"
                                      onClick={() => handleSaveEdit(d)}
                                      loading={isPending}
                                      title="Salvar"
                                    >
                                      <Check size={12} />
                                    </Button>
                                    <Button
                                      size="2xs"
                                      variant="subtle"
                                      onClick={handleCancelEdit}
                                      title="Cancelar"
                                    >
                                      <X size={12} />
                                    </Button>
                                  </Flex>
                                ) : (
                                  <Button
                                    size="2xs"
                                    variant="ghost"
                                    onClick={() => handleStartEdit(d, index)}
                                    title="Editar veículo ou observação"
                                  >
                                    <Edit3 size={12} />
                                  </Button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  {/* Rodapé da Tabela: TOTAIS DO PERÍODO */}
                  <tfoot>
                    <tr
                      style={{
                        backgroundColor: "#e2e8f0",
                        fontWeight: "bold",
                        borderTop: "2px solid #0f233a",
                        color: "#0f172a",
                      }}
                    >
                      <td
                        colSpan={3}
                        style={{
                          padding: "8px 10px",
                          textAlign: "right",
                          border: "1px solid #cbd5e1",
                          fontSize: "12px",
                        }}
                      >
                        Totais do Período:
                      </td>
                      <td
                        style={{
                          padding: "8px 6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "12px",
                        }}
                      >
                        {relatorio.totalHorasPeriodo}
                      </td>
                      <td
                        style={{
                          padding: "8px 6px",
                          border: "1px solid #cbd5e1",
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {relatorio.resumoVeiculo}
                      </td>
                      <td
                        style={{
                          padding: "8px 6px",
                          border: "1px solid #cbd5e1",
                        }}
                      />
                      {!isReadOnly && <td className="no-print" style={{ border: "1px solid #cbd5e1" }} />}
                    </tr>
                  </tfoot>
                </table>
              </Box>

              {/* Bloco de Assinaturas e Validação */}
              <Flex
                className="relatorio-assinaturas"
                justify="space-between"
                align="flex-end"
                mt={{ base: 6, md: 8 }}
                pt={4}
                borderTop="1px dashed #cbd5e1"
                wrap="wrap"
                gap={6}
              >
                {/* Colaborador */}
                <Box textAlign="center" minW="240px">
                  <Box borderBottom="1px solid #334155" mb={1.5} w="220px" mx="auto" />
                  <Text fontSize="12px" fontWeight="bold" color="#1e293b">
                    {relatorio.employeeName}
                  </Text>
                  <Text fontSize="11px" color="#64748b">
                    Colaborador / Prestador
                  </Text>
                </Box>

                {/* Responsável Técnico / Validador */}
                <Box textAlign="center" minW="260px">
                  {relatorio.validatedAtFormatted ? (
                    <Box mb={2}>
                      <Badge colorPalette="green" variant="subtle" size="sm" px={2} py={0.5}>
                        Validação Digital: {relatorio.validatorName} ({relatorio.validatedAtFormatted})
                      </Badge>
                    </Box>
                  ) : (
                    <Box borderBottom="1px solid #334155" mb={1.5} w="220px" mx="auto" />
                  )}
                  <Text fontSize="12px" fontWeight="bold" color="#1e293b">
                    {relatorio.validatorName || "Responsável Técnico"}
                  </Text>
                  <Text fontSize="11px" color="#64748b">
                    {relatorio.organizationName} — Gestão de Operações
                  </Text>
                </Box>
              </Flex>
            </Box>
          )}
        </DialogBody>

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          <Button
            colorPalette="blue"
            onClick={handlePrint}
            disabled={loading || !relatorio || relatorio.dias.length === 0}
          >
            <Printer size={16} /> Imprimir / Salvar PDF
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Estilos específicos para impressão em formato A4 idêntico à imagem */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 8mm 6mm;
              }

              html, body {
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
              }

              /* Oculta tudo que tem classe .no-print ou elementos da interface */
              .no-print,
              header,
              nav,
              footer,
              button,
              [data-part="backdrop"],
              [data-part="header"],
              [data-part="footer"],
              [data-part="close-trigger"] {
                display: none !important;
              }

              /* Oculta todos os irmãos do modal no body para que não ocupem altura fantasma */
              body > *:not(:has(#relatorio-fechamento-print)) {
                display: none !important;
              }

              /* Reseta os wrappers de diálogo do Chakra para fluxo estático contínuo */
              [data-scope="dialog"],
              [data-part="positioner"],
              [data-part="content"],
              div[role="dialog"] {
                position: static !important;
                inset: auto !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: transparent !important;
              }

              /* Documento principal A4 */
              #relatorio-fechamento-print {
                position: static !important;
                display: block !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: visible !important;
                break-after: auto !important;
                page-break-after: auto !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              /* Controle estrito de quebras de página */
              #relatorio-fechamento-print table {
                width: 100% !important;
                border-collapse: collapse !important;
                break-inside: auto !important;
                page-break-inside: auto !important;
              }

              #relatorio-fechamento-print thead {
                display: table-header-group !important;
                break-after: avoid !important;
                page-break-after: avoid !important;
              }

              #relatorio-fechamento-print tr {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              #relatorio-fechamento-print tfoot {
                display: table-footer-group !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }

              .relatorio-assinaturas {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                margin-top: 16px !important;
                padding-top: 10px !important;
              }
            }
          `,
        }}
      />
    </DialogRoot>
  );
}
