"use client";

import {
  Box,
  Button,
  Flex,
  Text,
  Heading,
  Stack,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogCloseTrigger,
} from "@/components/ui/dialog";
import { useState, useTransition } from "react";
import { Building2, Car, Check, X, ShieldAlert } from "lucide-react";
import { toggleOrganizationVehicle } from "@/app/dashboard/admin/equipe/actions";
import type { Organization } from "@/lib/hooks/useAdminDashboard";

interface Props {
  open: boolean;
  onClose: () => void;
  organizations: Organization[];
  onUpdated?: () => void;
}

export function OrganizacoesModal({
  open,
  onClose,
  organizations,
  onUpdated,
}: Props) {
  const [localOrgs, setLocalOrgs] = useState<Organization[]>(organizations);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Sync when prop updates
  if (organizations !== localOrgs && !updatingId && localOrgs.length === 0) {
    setLocalOrgs(organizations);
  }

  function handleToggleVehicle(org: Organization) {
    const nextVal = !org.has_vehicle;
    setUpdatingId(org.id);
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await toggleOrganizationVehicle(org.id, nextVal);
      setUpdatingId(null);

      if (res.error) {
        setErrorMsg(`Erro ao atualizar organização: ${res.error}`);
      } else {
        setSuccessMsg(
          `Uso de veículo para "${org.name}" atualizado para: ${
            nextVal ? "Ativado" : "Desativado"
          }`
        );
        setLocalOrgs((prev) =>
          prev.map((o) => (o.id === org.id ? { ...o, has_vehicle: nextVal } : o))
        );
        onUpdated?.();
      }
    });
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => !e.open && onClose()}
      size="lg"
      placement="center"
    >
      <DialogContent bg="bg.surface" rounded="2xl" shadow="2xl" borderWidth="1px" borderColor="border.subtle" maxW="2xl">
        <DialogCloseTrigger />

        <DialogHeader pb={3} borderBottomWidth="1px" borderColor="border.subtle">
          <Flex align="center" gap={3}>
            <Box p={2.5} rounded="xl" bg="primary.subtle" color="brand.300" borderWidth="1px" borderColor="primary.border">
              <Building2 size={22} />
            </Box>
            <Box>
              <Heading size="md" color="fg">
                Configuração de Organizações & Veículos
              </Heading>
              <Text fontSize="xs" color="fg.muted" mt={0.5}>
                Defina quais organizações exigem seleção de veículo pelo funcionário ao registrar ponto
              </Text>
            </Box>
          </Flex>
        </DialogHeader>

        <DialogBody py={5}>
          <Stack gap={4}>
            {/* Aviso informativo */}
            <Box p={3.5} bg="primary.subtle" rounded="xl" borderWidth="1px" borderColor="primary.border">
              <Flex gap={2.5} align="flex-start">
                <Box color="brand.300" mt={0.5}>
                  <Car size={18} />
                </Box>
                <Text fontSize="xs" color="brand.200" lineHeight="1.5">
                  Organizações com <strong>veículo ativado</strong> exigirão que o funcionário escolha{" "}
                  <strong>&quot;Sim, usar veículo&quot;</strong> ou <strong>&quot;Não utilizar&quot;</strong>{" "}
                  antes de iniciar a jornada de trabalho.
                </Text>
              </Flex>
            </Box>

            {errorMsg && (
              <Box bg="red.subtle" borderWidth="1px" borderColor="red.emphasized" rounded="lg" p={3}>
                <Text fontSize="xs" color="red.fg">{errorMsg}</Text>
              </Box>
            )}

            {successMsg && (
              <Box bg="green.subtle" borderWidth="1px" borderColor="green.emphasized" rounded="lg" p={3}>
                <Text fontSize="xs" color="green.fg">{successMsg}</Text>
              </Box>
            )}

            {/* Lista de Organizações */}
            <Stack gap={3} mt={1}>
              {localOrgs.map((org) => {
                const isCurrentlyUpdating = updatingId === org.id;
                const hasVeh = Boolean(org.has_vehicle);

                return (
                  <Box
                    key={org.id}
                    p={4}
                    rounded="xl"
                    borderWidth="1px"
                    borderColor={hasVeh ? "primary.border" : "border.subtle"}
                    bg={hasVeh ? "primary.subtle" : "bg.subtle"}
                    transition="all 0.2s"
                  >
                    <Flex justify="space-between" align="center" gap={4}>
                      <Box flex="1">
                        <Flex align="center" gap={2} mb={1}>
                          <Text fontWeight="semibold" fontSize="sm" color="fg">
                            {org.name}
                          </Text>
                          {hasVeh ? (
                            <Badge colorPalette="blue" variant="solid" size="xs" rounded="full">
                              🚗 Possui Veículos
                            </Badge>
                          ) : (
                            <Badge colorPalette="gray" variant="subtle" size="xs" rounded="full">
                              Sem Veículo
                            </Badge>
                          )}
                        </Flex>
                        <Text fontSize="xs" color="fg.muted">
                          {hasVeh
                            ? "Funcionários selecionarão se usarão veículo ao bater ponto nesta organização."
                            : "Funcionários batem ponto direto sem opção de veículo."}
                        </Text>
                      </Box>

                      <Button
                        size="sm"
                        variant={hasVeh ? "solid" : "outline"}
                        colorPalette={hasVeh ? "blue" : "gray"}
                        onClick={() => handleToggleVehicle(org)}
                        disabled={isPending}
                        rounded="lg"
                      >
                        {isCurrentlyUpdating ? (
                          <Spinner size="xs" />
                        ) : hasVeh ? (
                          <>
                            <Check size={14} />
                            Veículo Ativo
                          </>
                        ) : (
                          <>
                            <Car size={14} />
                            Ativar Veículo
                          </>
                        )}
                      </Button>
                    </Flex>
                  </Box>
                );
              })}

              {localOrgs.length === 0 && (
                <Flex justify="center" py={8} color="fg.muted">
                  <Text fontSize="sm">Nenhuma organização encontrada.</Text>
                </Flex>
              )}
            </Stack>
          </Stack>
        </DialogBody>

        <DialogFooter borderTopWidth="1px" borderColor="border.subtle" pt={3}>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
