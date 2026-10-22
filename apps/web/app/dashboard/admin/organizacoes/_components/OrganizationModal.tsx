"use client";

import {
  Box,
  Button,
  Flex,
  Text,
  Heading,
  Input,
  Stack,
  NativeSelectRoot,
  NativeSelectField,
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
import { Building2, Car, Check, AlertCircle } from "lucide-react";
import { upsertOrganization, type OrganizationWithStats } from "../actions";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existing?: OrganizationWithStats | null;
}

export function OrganizationModal({
  open,
  onClose,
  onSuccess,
  existing,
}: Props) {
  const isEditing = Boolean(existing);

  const [name, setName] = useState(existing?.name ?? "");
  const [slug, setSlug] = useState(existing?.slug ?? "");
  const [hasVehicle, setHasVehicle] = useState(existing?.has_vehicle ?? false);
  const [status, setStatus] = useState<"active" | "inactive">(
    existing?.status ?? "active"
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("O nome da organização é obrigatório.");
      return;
    }

    setErrorMsg(null);
    startTransition(async () => {
      const res = await upsertOrganization({
        id: existing?.id,
        name: name.trim(),
        slug: slug.trim() || undefined,
        has_vehicle: hasVehicle,
        status,
      });

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        onSuccess();
      }
    });
  }

  return (
    <DialogRoot
      open={open}
      onOpenChange={(e) => !e.open && onClose()}
      size="md"
      placement="center"
    >
      <DialogContent
        bg="bg.surface"
        rounded="2xl"
        shadow="2xl"
        borderWidth="1px"
        borderColor="border.subtle"
        maxW="xl"
      >
        <DialogCloseTrigger />

        <form onSubmit={handleSubmit}>
          <DialogHeader pb={3} borderBottomWidth="1px" borderColor="border.subtle">
            <Flex align="center" gap={3}>
              <Box p={2.5} rounded="xl" bg="primary.subtle" color="brand.300" borderWidth="1px" borderColor="primary.border">
                <Building2 size={22} />
              </Box>
              <Box>
                <Heading size="md" color="fg">
                  {isEditing ? "Editar Organização" : "Nova Organização"}
                </Heading>
                <Text fontSize="xs" color="fg.muted" mt={0.5}>
                  {isEditing
                    ? "Atualize as informações e configurações desta empresa"
                    : "Cadastre uma nova empresa e defina suas regras operacionais"}
                </Text>
              </Box>
            </Flex>
          </DialogHeader>

          <DialogBody py={5}>
            <Stack gap={4}>
              {errorMsg && (
                <Box
                  bg="red.subtle"
                  borderWidth="1px"
                  borderColor="red.emphasized"
                  rounded="lg"
                  p={3}
                >
                  <Flex gap={2} align="center">
                    <AlertCircle size={16} color="red" />
                    <Text fontSize="xs" color="red.fg">
                      {errorMsg}
                    </Text>
                  </Flex>
                </Box>
              )}

              {/* Nome da Organização */}
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color="fg" mb={1}>
                  Nome da Empresa / Organização *
                </Text>
                <Input
                  placeholder="Ex: Empresa Teste, Filial Norte, Matriz..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  size="sm"
                  rounded="lg"
                  borderColor="border.subtle"
                  required
                />
              </Box>

              {/* Slug / Identificador */}
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color="fg" mb={1}>
                  Identificador (Slug)
                </Text>
                <Input
                  placeholder="Ex: empresa-teste (automático se vazio)"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  size="sm"
                  rounded="lg"
                  borderColor="border.subtle"
                />
                <Text fontSize="2xs" color="fg.muted" mt={0.5}>
                  Usado em URLs e identificação interna. Se deixado vazio, será gerado automaticamente.
                </Text>
              </Box>

              {/* Configuração de Veículos */}
              <Box
                p={4}
                rounded="xl"
                borderWidth="1px"
                borderColor={hasVehicle ? "primary.border" : "border.subtle"}
                bg={hasVehicle ? "primary.subtle" : "bg.subtle"}
                transition="all 0.2s"
              >
                <Flex justify="space-between" align="center" gap={3}>
                  <Flex align="center" gap={3}>
                    <Box
                      p={2}
                      rounded="lg"
                      bg={hasVehicle ? "brand.500" : "bg.panel"}
                      color={hasVehicle ? "white" : "fg.muted"}
                    >
                      <Car size={20} />
                    </Box>
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm" color="fg">
                        Controle e Uso de Veículos
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        Quando ativo, os colaboradores dessa empresa devem escolher se usarão veículo ao bater o ponto.
                      </Text>
                    </Box>
                  </Flex>

                  <Button
                    type="button"
                    size="xs"
                    colorPalette={hasVehicle ? "blue" : "gray"}
                    variant={hasVehicle ? "solid" : "outline"}
                    onClick={() => setHasVehicle(!hasVehicle)}
                  >
                    {hasVehicle ? (
                      <>
                        <Check size={14} /> Ativado
                      </>
                    ) : (
                      "Desativado"
                    )}
                  </Button>
                </Flex>
              </Box>

              {/* Status */}
              <Box>
                <Text fontSize="xs" fontWeight="semibold" color="fg" mb={1}>
                  Status da Organização
                </Text>
                <NativeSelectRoot size="sm">
                  <NativeSelectField
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as "active" | "inactive")
                    }
                    borderColor="border.subtle"
                    rounded="lg"
                  >
                    <option value="active">Ativa (Disponível no sistema e para registros)</option>
                    <option value="inactive">Inativa (Oculta para novos registros)</option>
                  </NativeSelectField>
                </NativeSelectRoot>
              </Box>
            </Stack>
          </DialogBody>

          <DialogFooter borderTopWidth="1px" borderColor="border.subtle" pt={3}>
            <Button
              variant="outline"
              colorPalette="red"
              size="sm"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              colorPalette="blue"
              size="sm"
              loading={isPending}
            >
              {isEditing ? "Salvar Alterações" : "Criar Organização"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </DialogRoot>
  );
}
