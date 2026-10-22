"use client";

import {
  Box,
  Button,
  Flex,
  Text,
  Heading,
  Input,
  Stack,
  Badge,
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
import { upsertEmployee, type FuncionarioData } from "@/app/dashboard/admin/equipe/actions";
import { CheckSquare, Square, Building2 } from "lucide-react";

export type { FuncionarioData };

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
  organizations?: { id: string; name: string }[];
  existing?: FuncionarioData | null;
}

export function FuncionarioModal({
  open,
  onClose,
  onSuccess,
  organizationId,
  organizations = [],
  existing,
}: Props) {
  const isEditing = Boolean(existing);

  const [fullName, setFullName] = useState(existing?.full_name ?? "");

  // Inicializa com todas as organizações vinculadas do colaborador
  const initialOrgs =
    existing?.organizations_list && existing.organizations_list.length > 0
      ? existing.organizations_list.map((o) => o.id)
      : existing?.organization_id
      ? [existing.organization_id]
      : organizationId
      ? [organizationId]
      : organizations[0]
      ? [organizations[0].id]
      : [];

  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>(initialOrgs);
  const [primaryOrgId, setPrimaryOrgId] = useState<string>(
    existing?.organization_id || initialOrgs[0] || (organizations[0]?.id ?? "")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hireDate, setHireDate] = useState(existing?.hire_date ?? "");
  const [role, setRole] = useState<"admin" | "manager" | "member" | "owner">(
    existing?.role === "owner" ? "admin" : (existing?.role ?? "member")
  );
  const [status, setStatus] = useState<"active" | "inactive">(
    existing?.status ?? "active"
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    setErrorMsg(null);
    onClose();
  }

  function toggleOrg(orgId: string) {
    setErrorMsg(null);
    setSelectedOrgIds((prev) => {
      if (prev.includes(orgId)) {
        if (prev.length === 1) {
          setErrorMsg("O colaborador precisa pertencer a pelo menos uma empresa.");
          return prev;
        }
        const next = prev.filter((id) => id !== orgId);
        if (primaryOrgId === orgId && next.length > 0) {
          setPrimaryOrgId(next[0]);
        }
        return next;
      } else {
        const next = [...prev, orgId];
        if (!primaryOrgId) {
          setPrimaryOrgId(orgId);
        }
        return next;
      }
    });
  }

  function handleSave() {
    if (!fullName.trim()) {
      setErrorMsg("O nome é obrigatório.");
      return;
    }

    if (selectedOrgIds.length === 0) {
      setErrorMsg("Selecione ao menos uma empresa / organização para o colaborador.");
      return;
    }

    const orgToUse = primaryOrgId || selectedOrgIds[0];

    if (!isEditing) {
      if (!email.trim() || !password.trim()) {
        setErrorMsg("Email e Senha são obrigatórios para novos funcionários.");
        return;
      }
      if (password.length < 6) {
        setErrorMsg("A senha deve ter no mínimo 6 caracteres.");
        return;
      }
    }

    setErrorMsg(null);

    startTransition(async () => {
      const result = await upsertEmployee({
        id: existing?.id,
        organizationId: orgToUse,
        organizationIds: selectedOrgIds,
        fullName,
        email: email.trim(),
        password,
        employeeCode: existing?.employee_code || undefined,
        hireDate,
        role,
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
    <DialogRoot
      open={open}
      onOpenChange={(d) => !d.open && handleClose()}
      size="md"
      placement="center"
    >
      <DialogContent maxW="xl">
        <DialogHeader>
          <Heading size="md">
            {isEditing ? "Editar Funcionário & Empresas" : "Novo Funcionário"}
          </Heading>
          <DialogCloseTrigger />
        </DialogHeader>

        <DialogBody>
          <Stack gap={4}>
            {/* Nome */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                Nome Completo *
              </Text>
              <Input
                placeholder="Ex: João da Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                size="sm"
                rounded="lg"
                borderColor="border.subtle"
              />
            </Box>

            {/* Empresas / Organizações Vinculadas (Multi-seleção) */}
            {organizations && organizations.length > 0 && (
              <Box>
                <Flex justify="space-between" align="center" mb={1}>
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                    Empresas Vinculadas *
                  </Text>
                  <Badge colorPalette="blue" variant="subtle" size="xs">
                    {selectedOrgIds.length}{" "}
                    {selectedOrgIds.length === 1
                      ? "empresa selecionada"
                      : "empresas selecionadas"}
                  </Badge>
                </Flex>
                <Text fontSize="2xs" color="fg.subtle" mb={2}>
                  Marque as empresas em que o colaborador atua. Clique em &quot;Definir Principal&quot; para definir a empresa padrão.
                </Text>

                <Stack
                  gap={1.5}
                  maxH="160px"
                  overflowY="auto"
                  pr={1}
                  css={{ "&::-webkit-scrollbar": { width: "4px" } }}
                >
                  {organizations.map((org) => {
                    const isChecked = selectedOrgIds.includes(org.id);
                    const isPrimary = primaryOrgId === org.id;

                    return (
                      <Flex
                        key={org.id}
                        p={2.5}
                        rounded="lg"
                        borderWidth="1px"
                        borderColor={isChecked ? "primary.border" : "border.subtle"}
                        bg={isChecked ? "primary.subtle" : "bg.surface"}
                        align="center"
                        justify="space-between"
                        cursor="pointer"
                        onClick={() => toggleOrg(org.id)}
                        transition="all 0.15s"
                        _hover={{
                          borderColor: isChecked
                            ? "primary.border"
                            : "rgba(255, 255, 255, 0.22)",
                        }}
                      >
                        <Flex align="center" gap={2.5}>
                          <Box color={isChecked ? "brand.300" : "fg.muted"}>
                            {isChecked ? (
                              <CheckSquare size={17} />
                            ) : (
                              <Square size={17} />
                            )}
                          </Box>
                          <Flex align="center" gap={1.5}>
                            <Building2 size={14} style={{ opacity: 0.6 }} />
                            <Text
                              fontSize="sm"
                              fontWeight={isChecked ? "semibold" : "normal"}
                              color={isChecked ? "fg" : "fg.muted"}
                            >
                              {org.name}
                            </Text>
                          </Flex>
                        </Flex>

                        {isChecked && (
                          <Badge
                            size="xs"
                            variant={isPrimary ? "solid" : "outline"}
                            colorPalette={isPrimary ? "blue" : "gray"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrimaryOrgId(org.id);
                            }}
                            title="Definir como empresa principal de contratação"
                            cursor="pointer"
                            px={2}
                          >
                            {isPrimary ? "★ Principal" : "Definir Principal"}
                          </Badge>
                        )}
                      </Flex>
                    );
                  })}
                </Stack>
              </Box>
            )}

            {/* Credenciais (apenas criação) */}
            {!isEditing && (
              <Flex gap={3}>
                <Box flex="1">
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                    Email de Login *
                  </Text>
                  <Input
                    type="email"
                    placeholder="joao@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    size="sm"
                    rounded="lg"
                    borderColor="border.subtle"
                  />
                </Box>
                <Box flex="1">
                  <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                    Senha Inicial *
                  </Text>
                  <Input
                    type="text"
                    placeholder="Min 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    size="sm"
                    rounded="lg"
                    borderColor="border.subtle"
                  />
                </Box>
              </Flex>
            )}

            {/* Data de Contratação */}
            <Box>
              <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                Data de Contratação
              </Text>
              <Input
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                size="sm"
                rounded="lg"
                borderColor="border.subtle"
              />
            </Box>

            {/* Perfil e Status */}
            <Flex gap={3}>
              <Box flex="1">
                <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={1}>
                  Perfil de Acesso
                </Text>
                <NativeSelectRoot size="sm">
                  <NativeSelectField
                    value={role === "owner" ? "admin" : role}
                    onChange={(e) => setRole(e.target.value as typeof role)}
                    borderColor="border.subtle"
                    rounded="lg"
                    bg="bg.surface"
                  >
                    <option value="admin">Admin do Sistema</option>
                    <option value="manager">Gerente da Empresa</option>
                    <option value="member">Funcionário</option>
                  </NativeSelectField>
                </NativeSelectRoot>
              </Box>

              <Box flex="1">
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
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </NativeSelectField>
                </NativeSelectRoot>
              </Box>
            </Flex>

            {errorMsg && (
              <Box bg="red.subtle" p={3} rounded="md" mt={2}>
                <Text fontSize="sm" color="red.fg">
                  {errorMsg}
                </Text>
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
          >
            Cancelar
          </Button>
          <Button
            colorPalette="blue"
            size="sm"
            onClick={handleSave}
            loading={isPending}
          >
            {isEditing ? "Salvar Alterações" : "Criar Funcionário"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </DialogRoot>
  );
}
