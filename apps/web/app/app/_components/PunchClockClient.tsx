"use client";

import { Box, Button, Container, Flex, Heading, Text, Stack, Spinner, Input, Badge } from "@chakra-ui/react";
import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle, Fingerprint, Building2, Car } from "lucide-react";
import { registrarPontoOnline, type AppDashboardData } from "@/app/app/actions";
import { db } from "@/lib/db";

interface Props {
  initialData: AppDashboardData | null;
  error?: string;
}

function timeFromIso(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Helper para UUID compatível com HTTP/IP local
function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Captura segura de geolocalização com timeout
async function getCoordinates(): Promise<{ lat: number | null; lng: number | null }> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { lat: null, lng: null };
  }
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 7000,
        enableHighAccuracy: true,
        maximumAge: 10000,
      });
    });
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };
  } catch (err) {
    console.warn("Geolocalização não obtida ou negada:", err);
    return { lat: null, lng: null };
  }
}

export function PunchClockClient({ initialData, error }: Props) {
  const [time, setTime] = useState<Date>(() => new Date());
  const [loadingLoc, setLoadingLoc] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(error || null);
  const [isPending, startTransition] = useTransition();

  const [data, setData] = useState<AppDashboardData | null>(initialData);

  // Organização selecionada (quando houver mais de uma)
  const [selectedOrgId, setSelectedOrgId] = useState<string>(() => {
    return (
      initialData?.openWorkRecord?.organizationId ||
      initialData?.organizationId ||
      (initialData?.userOrganizations?.[0]?.id ?? "")
    );
  });

  // Seleção de uso de veículo para organizações que possuem veículos
  const [usesVehicle, setUsesVehicle] = useState<boolean>(false);
  const [vehicleReason, setVehicleReason] = useState<string>("Manutenção");

  // Relógio digital em tempo real
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (error || !data) {
    return (
      <Box minH="100svh" bg="bg" p={6} pt={20}>
        <Text color="red.500" textAlign="center">{errorMsg || "Erro ao carregar dados."}</Text>
      </Box>
    );
  }

  const isClockOut = !!data.openWorkRecord;
  const activeOrgId = isClockOut
    ? data.openWorkRecord!.organizationId
    : selectedOrgId || (data.userOrganizations[0]?.id ?? "");

  const activeOrg = data.userOrganizations.find(o => o.id === activeOrgId);
  const orgHasVehicle = Boolean(activeOrg?.hasVehicle);

  const activeOrgName = isClockOut
    ? data.openWorkRecord!.organizationName
    : activeOrg?.name || "Organização";

  const hasOrganizations = data.userOrganizations.length > 0 || isClockOut;

  // Registro de ponto direto sem escala (com seleção de veículo quando aplicável)
  async function handlePunch() {
    if (!data || isPending || loadingLoc || !hasOrganizations) return;
    setSuccessMsg(null);
    setErrorMsg(null);
    setLoadingLoc(true);

    // 1. Obter localização GPS
    const { lat, lng } = await getCoordinates();

    const effectiveUsesVehicle = (!isClockOut && orgHasVehicle)
      ? usesVehicle
      : (data.openWorkRecord?.usesVehicle ?? false);

    const effectiveVehicleReason = (!isClockOut && orgHasVehicle && !effectiveUsesVehicle)
      ? (vehicleReason.trim() || "Manutenção")
      : undefined;

    // 2. Fluxo Offline Fallback
    if (!navigator.onLine) {
      await salvarOffline(lat, lng, activeOrgId, effectiveUsesVehicle, effectiveVehicleReason);
      setLoadingLoc(false);
      return;
    }

    // 3. Fluxo Online
    startTransition(async () => {
      try {
        const res = await registrarPontoOnline({
          organizationId: activeOrgId,
          userId: data.userId,
          workRecordId: data.openWorkRecord?.id ?? null,
          lat,
          lng,
          isClockOut,
          usesVehicle: effectiveUsesVehicle,
          vehicleReason: effectiveVehicleReason,
        });

        if (res.error) {
          setErrorMsg(res.error);
        } else {
          const tipo = isClockOut ? "Saída" : "Entrada";
          const locMsg = lat !== null && lng !== null ? " com localização registrada" : "";
          const vehicleMsg = !isClockOut && orgHasVehicle
            ? effectiveUsesVehicle
              ? " (Com uso de veículo)"
              : ` (Sem veículo: ${effectiveVehicleReason})`
            : "";
          setSuccessMsg(`Ponto de ${tipo} registrado na empresa "${activeOrgName}"${vehicleMsg}${locMsg}!`);

          if (!isClockOut) {
            setData(prev =>
              prev
                ? {
                    ...prev,
                    openWorkRecord: {
                      id: res.workRecordId || "temp",
                      clockIn: new Date().toISOString(),
                      organizationId: activeOrgId,
                      organizationName: activeOrgName,
                      usesVehicle: effectiveUsesVehicle,
                    },
                  }
                : null
            );
          } else {
            setData(prev => (prev ? { ...prev, openWorkRecord: null } : null));
            setUsesVehicle(false);
          }
        }
      } catch (err: unknown) {
        console.warn("Erro no fluxo online, caindo pro offline:", err);
        await salvarOffline(lat, lng, activeOrgId, effectiveUsesVehicle, effectiveVehicleReason);
      } finally {
        setLoadingLoc(false);
      }
    });
  }

  async function salvarOffline(
    lat: number | null,
    lng: number | null,
    orgId: string,
    vehicleUsed: boolean,
    reason?: string
  ) {
    if (!data) return;
    try {
      await db.fila_pontos.add({
        id: generateId(),
        funcionario_id: data.userId,
        organization_id: orgId,
        data_hora: new Date().toISOString(),
        latitude: lat,
        longitude: lng,
        action: isClockOut ? "exit" : "entry",
        work_record_id: data.openWorkRecord?.id ?? null,
        uses_vehicle: vehicleUsed,
        vehicle_reason: reason,
        status_sync: "pendente",
        tentativas: 0,
        criado_em: Date.now(),
      });

      const tipo = isClockOut ? "Saída" : "Entrada";
      setSuccessMsg(`Ponto de ${tipo} salvo OFFLINE. Será sincronizado assim que houver conexão.`);

      if (!isClockOut) {
        setData(prev =>
          prev
            ? {
                ...prev,
                openWorkRecord: {
                  id: "offline_temp",
                  clockIn: new Date().toISOString(),
                  organizationId: orgId,
                  organizationName: activeOrgName,
                  usesVehicle: vehicleUsed,
                },
              }
            : null
        );
      } else {
        setData(prev => (prev ? { ...prev, openWorkRecord: null } : null));
        setUsesVehicle(false);
      }
    } catch (e: unknown) {
      console.error("Erro no Dexie offline:", e);
      const msg = e instanceof Error ? e.message : "falha ao salvar localmente.";
      setErrorMsg(`Erro grave offline: ${msg}`);
    }
  }

  return (
    <Box minH="100svh" bg="bg" position="relative" overflow="hidden">
      <Container maxW="md" h="100svh" px={6} py={10}>
        <Stack gap={5} h="full" align="center" justify="center">

          {/* ── Saudação e Relógio ── */}
          <Stack align="center" gap={1.5}>
            <Text fontSize="lg" color="fg.muted" fontWeight="medium">
              Olá, {data.userName.split(" ")[0]}!
            </Text>
            <Heading size="4xl" color="fg" letterSpacing="tight" fontVariantNumeric="tabular-nums" suppressHydrationWarning>
              {time ? time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "--:--:--"}
            </Heading>
            <Text fontSize="xs" color="fg.muted" suppressHydrationWarning>
              {time ? time.toLocaleDateString("pt-BR", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : "..."}
            </Text>
          </Stack>

          {/* ── Cartão de Organização / Ponto Ativo ── */}
          {isClockOut ? (
            /* Caso haja um ponto em andamento: exibe a empresa em aberto e badge de veículo */
            <Box w="full" bg="warning.subtle" p={4} rounded="xl" borderWidth="1px" borderColor="warning.border" shadow="sm">
              <Flex align="center" gap={3}>
                <Box p={2.5} bg="warning.subtle" color="warning.fg" rounded="lg">
                  <Building2 size={22} />
                </Box>
                <Box flex="1">
                  <Flex align="center" justify="space-between">
                    <Text fontSize="xs" color="warning.fg" textTransform="uppercase" fontWeight="bold">
                      Ponto em Andamento
                    </Text>
                    {data.openWorkRecord?.usesVehicle ? (
                      <Flex align="center" gap={1} bg="primary.subtle" color="brand.300" px={2} py={0.5} rounded="md" fontSize="2xs" fontWeight="bold" borderWidth="1px" borderColor="primary.border">
                        <Car size={12} />
                        <Text>Com Veículo</Text>
                      </Flex>
                    ) : (
                      <Text fontSize="2xs" color="fg.muted" bg="whiteAlpha.100" px={2} py={0.5} rounded="md">
                        Sem Veículo
                      </Text>
                    )}
                  </Flex>
                  <Text fontSize="md" fontWeight="bold" color="fg" mt={0.5}>
                    {data.openWorkRecord?.organizationName}
                  </Text>
                  <Text fontSize="xs" color="fg.muted" mt={0.5}>
                    Entrada registrada às {timeFromIso(data.openWorkRecord?.clockIn ?? null)}
                  </Text>
                </Box>
              </Flex>
            </Box>
          ) : data.userOrganizations.length > 1 ? (
            /* Mais de 1 organização: o usuário seleciona em qual está entrando */
            <Box w="full" bg="card" p={4} rounded="xl" borderWidth="1px" borderColor="border" shadow="sm">
              <Flex align="center" gap={3} mb={3}>
                <Box p={2} bg="primary.subtle" color="brand.300" rounded="lg">
                  <Building2 size={20} />
                </Box>
                <Box>
                  <Text fontSize="xs" color="fg.muted" textTransform="uppercase" fontWeight="bold">
                    Selecione a Organização
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    Em qual empresa você está registrando a entrada?
                  </Text>
                </Box>
              </Flex>
              <select
                value={selectedOrgId}
                onChange={(e) => {
                  setSelectedOrgId(e.target.value);
                  setUsesVehicle(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--chakra-colors-border)",
                  background: "var(--chakra-colors-bg-surface)",
                  color: "var(--chakra-colors-fg)",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {data.userOrganizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} {org.hasVehicle ? "(com veículo)" : ""}
                  </option>
                ))}
              </select>
            </Box>
          ) : data.userOrganizations.length === 1 ? (
            /* Apenas 1 organização: identificação direta sem seleção necessária */
            <Box w="full" bg="card" p={4} rounded="xl" borderWidth="1px" borderColor="border" shadow="sm">
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={3}>
                  <Box p={2} bg="primary.subtle" color="brand.300" rounded="lg">
                    <Building2 size={20} />
                  </Box>
                  <Box>
                    <Text fontSize="xs" color="fg.muted" textTransform="uppercase" fontWeight="bold">
                      Organização
                    </Text>
                    <Text fontSize="md" fontWeight="bold" color="fg">
                      {data.userOrganizations[0].name}
                    </Text>
                  </Box>
                </Flex>
                {data.userOrganizations[0].hasVehicle && (
                  <Flex align="center" gap={1} bg="primary.subtle" color="brand.300" px={2.5} py={1} rounded="lg" fontSize="xs" fontWeight="semibold" borderWidth="1px" borderColor="primary.border">
                    <Car size={14} />
                    <Text>Possui Veículo</Text>
                  </Flex>
                )}
              </Flex>
            </Box>
          ) : (
            <Box w="full" bg="destructive.subtle" p={4} rounded="xl" borderWidth="1px" borderColor="destructive.border" textAlign="center">
              <Text fontSize="sm" color="destructive.fg" fontWeight="medium">
                Nenhuma organização ativa vinculada ao seu usuário.
              </Text>
            </Box>
          )}

          {/* ── Seleção de Veículo (somente se a organização possui veículo e na entrada) ── */}
          {!isClockOut && orgHasVehicle && (
            <Box w="full" bg="card" p={3.5} rounded="xl" borderWidth="1px" borderColor={usesVehicle ? "primary.border" : "border"} shadow="sm" transition="all 0.2s">
              <Flex align="center" justify="space-between" mb={2.5}>
                <Flex align="center" gap={2}>
                  <Box p={1.5} bg={usesVehicle ? "primary.subtle" : "whiteAlpha.100"} color={usesVehicle ? "brand.300" : "fg.muted"} rounded="md">
                    <Car size={16} />
                  </Box>
                  <Box>
                    <Text fontSize="xs" fontWeight="bold" color="fg">
                      Uso de Veículo nesta jornada
                    </Text>
                    <Text fontSize="2xs" color="fg.muted">
                      Esta organização opera com veículos.
                    </Text>
                  </Box>
                </Flex>
                <Text fontSize="2xs" fontWeight="bold" color={usesVehicle ? "brand.300" : "fg.muted"} bg={usesVehicle ? "primary.subtle" : "whiteAlpha.100"} px={2} py={0.5} rounded="full">
                  {usesVehicle ? "Com Veículo" : "Sem Veículo"}
                </Text>
              </Flex>

              <Flex gap={2}>
                <Button
                  flex="1"
                  size="sm"
                  h="38px"
                  variant={usesVehicle ? "solid" : "outline"}
                  bg={usesVehicle ? "brand.500" : "transparent"}
                  color={usesVehicle ? "white" : "fg.muted"}
                  borderColor={usesVehicle ? "brand.400" : "border"}
                  _hover={{ bg: usesVehicle ? "brand.400" : "whiteAlpha.50" }}
                  onClick={() => setUsesVehicle(true)}
                  gap={1.5}
                >
                  <Car size={15} />
                  <Text fontSize="xs" fontWeight="semibold">Sim, usar veículo</Text>
                </Button>
                <Button
                  flex="1"
                  size="sm"
                  h="38px"
                  variant={!usesVehicle ? "solid" : "outline"}
                  bg={!usesVehicle ? "bg.muted" : "transparent"}
                  color={!usesVehicle ? "white" : "fg.muted"}
                  borderColor={!usesVehicle ? "border.emphasized" : "border"}
                  _hover={{ bg: !usesVehicle ? "bg.hover" : "whiteAlpha.50" }}
                  onClick={() => setUsesVehicle(false)}
                >
                  <Text fontSize="xs" fontWeight="semibold">Não utilizar</Text>
                </Button>
              </Flex>

              {/* ── Campo de motivo caso NÃO utilize veículo ── */}
              {!usesVehicle && (
                <Box mt={3} pt={2.5} borderTopWidth="1px" borderColor="border.subtle">
                  <Flex align="center" justify="space-between" mb={1.5}>
                    <Text fontSize="2xs" fontWeight="bold" color="fg.muted" textTransform="uppercase">
                      Motivo de não utilizar veículo:
                    </Text>
                    {vehicleReason && (
                      <Badge size="xs" colorPalette="red" variant="subtle">
                        {vehicleReason}
                      </Badge>
                    )}
                  </Flex>

                  <Input
                    size="sm"
                    value={vehicleReason}
                    onChange={(e) => setVehicleReason(e.target.value)}
                    placeholder="Informe o motivo (ex: Manutenção, oficina...)"
                    bg="bg.surface"
                    rounded="lg"
                    fontSize="xs"
                    borderColor="border.subtle"
                  />

                  {/* Atalhos rápidos para seleção imediata */}
                  <Flex gap={1.5} mt={2} wrap="wrap">
                    {["Manutenção", "Veículo em oficina", "Não necessário", "Emprestado"].map((preset) => (
                      <Badge
                        key={preset}
                        size="xs"
                        variant={vehicleReason === preset ? "solid" : "subtle"}
                        colorPalette={vehicleReason === preset ? "blue" : "gray"}
                        cursor="pointer"
                        onClick={() => setVehicleReason(preset)}
                        px={2}
                        py={0.5}
                        rounded="md"
                        transition="all 0.15s"
                        _hover={{ transform: "scale(1.03)" }}
                      >
                        {preset}
                      </Badge>
                    ))}
                  </Flex>
                </Box>
              )}
            </Box>
          )}

          {/* ── Botão Central de Ponto (Fingerprint) ── */}
          <Flex flex="1" align="center" justify="center" w="full">
            <Button
              w="210px"
              h="210px"
              rounded="full"
              bg={isClockOut ? "#D97706" : "brand.500"}
              color="white"
              disabled={isPending || loadingLoc || !hasOrganizations}
              onClick={handlePunch}
              shadow="0 10px 30px rgba(0, 0, 0, 0.5)"
              position="relative"
              _hover={{ transform: "scale(1.03)", bg: isClockOut ? "#F59E0B" : "brand.400" }}
              _active={{ transform: "scale(0.96)" }}
              transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
              animation={!isPending && !loadingLoc && hasOrganizations ? "pulseRing 2s infinite cubic-bezier(0.2, 0.8, 0.2, 1)" : "none"}
              display="flex"
              flexDirection="column"
              gap={3}
            >
              {isPending || loadingLoc ? (
                <Spinner size="lg" color="white" />
              ) : (
                <>
                  <Fingerprint size={56} />
                  <Text fontSize="lg" fontWeight="bold" letterSpacing="wide">
                    {isClockOut ? "REGISTRAR SAÍDA" : "REGISTRAR ENTRADA"}
                  </Text>
                </>
              )}
            </Button>
          </Flex>

          {/* ── Feedback de Status e Alertas ── */}
          <Box w="full" minH="70px">
            {errorMsg && (
              <Flex bg="destructive.subtle" p={4} rounded="xl" align="center" gap={3} color="destructive.fg" borderWidth="1px" borderColor="destructive.border">
                <AlertTriangle size={20} />
                <Text fontSize="sm" fontWeight="medium">{errorMsg}</Text>
              </Flex>
            )}
            {successMsg && (
              <Flex
                bg={successMsg.includes("OFFLINE") ? "info.subtle" : "success.subtle"}
                p={4}
                rounded="xl"
                align="center"
                gap={3}
                color={successMsg.includes("OFFLINE") ? "info.fg" : "success.fg"}
                borderWidth="1px"
                borderColor={successMsg.includes("OFFLINE") ? "info.border" : "success.border"}
              >
                <CheckCircle2 size={20} />
                <Text fontSize="sm" fontWeight="medium">{successMsg}</Text>
              </Flex>
            )}
          </Box>

        </Stack>
      </Container>
    </Box>
  );
}
