"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface EmployeeData {
  id?: string;
  organizationId?: string;
  organizationIds?: string[];
  email?: string;
  password?: string;
  fullName: string;
  employeeCode?: string;
  role: "admin" | "manager" | "member" | "owner";
  hireDate?: string;
  status: "active" | "inactive";
}

export interface EmployeeOrg {
  id: string;
  name: string;
}

export interface FuncionarioData {
  id: string;
  organization_id: string;
  full_name: string;
  role: "admin" | "manager" | "member" | "owner";
  employee_code: string | null;
  hire_date: string | null;
  status: "active" | "inactive";
  organization_name?: string;
  organizations_list: EmployeeOrg[];
}

export async function getEmployeesWithOrgs(
  selectedOrgFilter: string = "__all__"
): Promise<{ data?: FuncionarioData[]; error?: string }> {
  try {
    const adminClient = createAdminClient();

    // 1. Busca todos os perfis com a organização primária
    const { data: profiles, error: pError } = await adminClient
      .from("profiles")
      .select("id, organization_id, full_name, role, employee_code, hire_date, status, organizations(id, name)")
      .order("full_name");

    if (pError) return { error: pError.message };

    // 2. Busca todas as organizações ativas para mapeamento de nomes
    const { data: allOrgs } = await adminClient
      .from("organizations")
      .select("id, name");
    const orgNameMap = new Map<string, string>();
    for (const o of allOrgs || []) {
      orgNameMap.set(o.id, o.name);
    }

    // 3. Busca vínculos adicionais na tabela user_organizations
    const userOrgsMap = new Map<string, EmployeeOrg[]>();
    try {
      const { data: uoData, error: uoErr } = await adminClient
        .from("user_organizations")
        .select("user_id, organization_id, organizations(id, name)");

      if (!uoErr && uoData) {
        for (const row of uoData) {
          if (!row.user_id) continue;
          const rawOrg = row.organizations as unknown;
          const org = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as { id: string; name: string } | null;
          if (org && org.id) {
            const list = userOrgsMap.get(row.user_id) || [];
            if (!list.some((o) => o.id === org.id)) {
              list.push({ id: org.id, name: org.name });
            }
            userOrgsMap.set(row.user_id, list);
          }
        }
      }
    } catch {
      // Tabela user_organizations opcional se ainda não foi executada no banco
    }

    // 4. Busca vínculos adicionais via auth.admin user_metadata (garante persistência 100% imediata)
    try {
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      if (usersData?.users) {
        for (const u of usersData.users) {
          const rawOrgIds = u.user_metadata?.organization_ids;
          if (Array.isArray(rawOrgIds)) {
            const list = userOrgsMap.get(u.id) || [];
            for (const orgId of rawOrgIds) {
              if (typeof orgId === "string" && !list.some((o) => o.id === orgId)) {
                list.push({
                  id: orgId,
                  name: orgNameMap.get(orgId) || "Organização",
                });
              }
            }
            userOrgsMap.set(u.id, list);
          }
        }
      }
    } catch {
      // Ignora erro caso listUsers não tenha permissão
    }

    // 5. Monta os dados unificados
    const mapped: FuncionarioData[] = (profiles || []).map((p) => {
      const orgsList: EmployeeOrg[] = [];
      const seen = new Set<string>();

      // Adiciona vínculos cruzados (user_organizations e user_metadata)
      const extraOrgs = userOrgsMap.get(p.id) || [];
      for (const eo of extraOrgs) {
        if (!seen.has(eo.id)) {
          seen.add(eo.id);
          orgsList.push(eo);
        }
      }

      // Garante a presença da organização primária
      const rawMainOrg = p.organizations as unknown;
      const mainOrg = (Array.isArray(rawMainOrg) ? rawMainOrg[0] : rawMainOrg) as { id: string; name: string } | null;
      if (p.organization_id && !seen.has(p.organization_id)) {
        seen.add(p.organization_id);
        orgsList.unshift({
          id: p.organization_id,
          name: mainOrg?.name || orgNameMap.get(p.organization_id) || "Organização",
        });
      }

      return {
        id: p.id,
        organization_id: p.organization_id,
        full_name: p.full_name,
        role: p.role,
        employee_code: p.employee_code,
        hire_date: p.hire_date,
        status: p.status,
        organization_name: mainOrg?.name || orgsList[0]?.name || "Sem organização",
        organizations_list: orgsList,
      };
    });

    // 4. Aplica filtro de organização se especificado
    if (selectedOrgFilter !== "__all__") {
      const filtered = mapped.filter((f) =>
        f.organizations_list.some((o) => o.id === selectedOrgFilter) || f.organization_id === selectedOrgFilter
      );
      return { data: filtered };
    }

    return { data: mapped };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao carregar colaboradores";
    return { error: message };
  }
}

export async function upsertEmployee(
  data: EmployeeData
): Promise<{ id?: string; error?: string }> {
  // Lista unificada de organizações selecionadas
  const targetOrgs: string[] =
    data.organizationIds && data.organizationIds.length > 0
      ? data.organizationIds
      : data.organizationId
      ? [data.organizationId]
      : [];

  const primaryOrgId = data.organizationId || targetOrgs[0] || null;

  if (data.id) {
    const adminAuthClient = createAdminClient();

    const payload = {
      full_name: data.fullName,
      employee_code: data.employeeCode || null,
      role: data.role,
      hire_date: data.hireDate || null,
      status: data.status,
      organization_id: primaryOrgId,
    };

    const { error } = await adminAuthClient
      .from("profiles")
      .update(payload)
      .eq("id", data.id);

    if (error) {
      if (error.code === "23505") {
        return { error: "Já existe um funcionário com esta matrícula na organização." };
      }
      return { error: error.message };
    }

    // Sincroniza vínculos na tabela user_organizations
    try {
      await adminAuthClient.from("user_organizations").delete().eq("user_id", data.id);

      if (targetOrgs.length > 0) {
        const rows = targetOrgs.map((orgId) => ({
          user_id: data.id,
          organization_id: orgId,
          role: data.role,
        }));
        await adminAuthClient.from("user_organizations").insert(rows);
      }
    } catch {
      // Fallback gracioso caso user_organizations não esteja migrada
    }

    // Sincroniza vínculos no user_metadata do auth.admin
    try {
      await adminAuthClient.auth.admin.updateUserById(data.id, {
        user_metadata: {
          organization_ids: targetOrgs,
          full_name: data.fullName,
        },
      });
    } catch {
      // Fallback
    }

    revalidatePath("/dashboard/admin/equipe");
    revalidatePath("/app");
    return { id: data.id };
  } else {
    // Criação de novo colaborador
    if (!data.email || !data.password) {
      return { error: "Email e Senha são obrigatórios para novos funcionários." };
    }

    if (!primaryOrgId) {
      return { error: "Selecione ao menos uma empresa para o colaborador." };
    }

    const adminAuthClient = createAdminClient();

    // 1. Cria usuário no Supabase Auth com organization_ids no user_metadata
    const { data: authData, error: authError } = await adminAuthClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        organization_ids: targetOrgs,
      },
    });

    if (authError) {
      return { error: `Erro ao criar conta: ${authError.message}` };
    }

    const userId = authData.user.id;

    // 2. Insere no public.profiles
    const { error: profileError } = await adminAuthClient.from("profiles").insert({
      id: userId,
      organization_id: primaryOrgId,
      full_name: data.fullName,
      employee_code: data.employeeCode || null,
      role: data.role,
      hire_date: data.hireDate || null,
      status: data.status,
    });

    if (profileError) {
      if (profileError.code === "23505") {
        await adminAuthClient.auth.admin.deleteUser(userId);
        return { error: "Já existe um funcionário com esta matrícula na organização." };
      }
      return { error: `Erro ao criar perfil: ${profileError.message}` };
    }

    // 3. Insere todos os vínculos na tabela user_organizations
    try {
      if (targetOrgs.length > 0) {
        const rows = targetOrgs.map((orgId) => ({
          user_id: userId,
          organization_id: orgId,
          role: data.role,
        }));
        await adminAuthClient.from("user_organizations").insert(rows);
      }
    } catch {
      // Fallback
    }

    revalidatePath("/dashboard/admin/equipe");
    revalidatePath("/app");
    return { id: userId };
  }
}

export async function updateEmployeeOrganization(
  userId: string,
  organizationId: string
): Promise<{ error?: string }> {
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from("profiles")
    .update({ organization_id: organizationId })
    .eq("id", userId);

  if (error) return { error: error.message };

  // Garante que a organização esteja em user_organizations
  try {
    await adminClient.from("user_organizations").upsert(
      {
        user_id: userId,
        organization_id: organizationId,
        role: "member",
      },
      { onConflict: "user_id,organization_id" }
    );
  } catch {
    // Fallback
  }

  revalidatePath("/dashboard/admin/equipe");
  revalidatePath("/app");
  return {};
}

export async function updateEmployeeOrganizations(
  userId: string,
  organizationIds: string[]
): Promise<{ error?: string }> {
  if (!organizationIds || organizationIds.length === 0) {
    return { error: "O colaborador precisa estar vinculado a pelo menos uma organização." };
  }

  const adminClient = createAdminClient();
  const primaryOrgId = organizationIds[0];

  // Atualiza profiles
  const { error: pError } = await adminClient
    .from("profiles")
    .update({ organization_id: primaryOrgId })
    .eq("id", userId);

  if (pError) return { error: pError.message };

  // Atualiza user_organizations
  try {
    await adminClient.from("user_organizations").delete().eq("user_id", userId);

    const rows = organizationIds.map((orgId) => ({
      user_id: userId,
      organization_id: orgId,
      role: "member" as const,
    }));
    await adminClient.from("user_organizations").insert(rows);
  } catch {
    // Fallback
  }

  // Atualiza user_metadata no auth.admin
  try {
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        organization_ids: organizationIds,
      },
    });
  } catch {
    // Fallback
  }

  revalidatePath("/dashboard/admin/equipe");
  revalidatePath("/app");
  return {};
}

export async function toggleOrganizationVehicle(
  orgId: string,
  hasVehicle: boolean
): Promise<{ error?: string }> {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("organizations")
    .update({ has_vehicle: hasVehicle })
    .eq("id", orgId);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/equipe");
  revalidatePath("/dashboard/admin");
  return {};
}
