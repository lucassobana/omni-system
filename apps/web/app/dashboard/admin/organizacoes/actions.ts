"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export interface OrganizationWithStats {
  id: string;
  name: string;
  slug: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  has_vehicle: boolean;
  status: "active" | "inactive";
  created_at: string;
  employee_count: number;
}

export interface OrganizationFormData {
  id?: string;
  name: string;
  slug?: string;
  document?: string;
  phone?: string;
  email?: string;
  has_vehicle: boolean;
  status: "active" | "inactive";
}

function generateSlug(text: string): string {
  const clean = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return clean || `org-${Date.now().toString(36)}`;
}

export interface ActiveOrganization {
  id: string;
  name: string;
  slug?: string;
  has_vehicle?: boolean;
  status?: string;
}

export async function getActiveOrganizations(): Promise<ActiveOrganization[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .select("id, name, slug, has_vehicle, status")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao buscar organizações ativas:", error);
      return [];
    }
    return (data as ActiveOrganization[]) ?? [];
  } catch (err) {
    console.error("Erro no getActiveOrganizations:", err);
    return [];
  }
}

export async function getOrganizationsWithStats(): Promise<{
  data?: OrganizationWithStats[];
  error?: string;
}> {
  try {
    const admin = createAdminClient();

    // 1. Busca todas as organizações
    const { data: orgs, error: orgsError } = await admin
      .from("organizations")
      .select("id, name, slug, document, phone, email, has_vehicle, status, created_at")
      .order("name", { ascending: true });

    if (orgsError) {
      return { error: orgsError.message };
    }

    // 2. Busca contagem de colaboradores (profiles + user_organizations)
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, organization_id");

    const { data: userOrgs } = await admin
      .from("user_organizations")
      .select("user_id, organization_id");

    // Agrupa IDs únicos de usuários por organização
    const orgUserMap = new Map<string, Set<string>>();

    for (const p of profiles || []) {
      if (p.organization_id) {
        if (!orgUserMap.has(p.organization_id)) {
          orgUserMap.set(p.organization_id, new Set());
        }
        orgUserMap.get(p.organization_id)!.add(p.id);
      }
    }

    for (const uo of userOrgs || []) {
      if (uo.organization_id && uo.user_id) {
        if (!orgUserMap.has(uo.organization_id)) {
          orgUserMap.set(uo.organization_id, new Set());
        }
        orgUserMap.get(uo.organization_id)!.add(uo.user_id);
      }
    }

    const mapped: OrganizationWithStats[] = (orgs || []).map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      document: o.document || null,
      phone: o.phone || null,
      email: o.email || null,
      has_vehicle: Boolean(o.has_vehicle),
      status: (o.status as "active" | "inactive") || "active",
      created_at: o.created_at,
      employee_count: orgUserMap.get(o.id)?.size || 0,
    }));

    return { data: mapped };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

export async function upsertOrganization(
  data: OrganizationFormData
): Promise<{ id?: string; error?: string }> {
  try {
    if (!data.name || data.name.trim().length === 0) {
      return { error: "O nome da organização é obrigatório." };
    }

    const admin = createAdminClient();
    let finalSlug = data.slug?.trim() ? generateSlug(data.slug) : generateSlug(data.name);

    if (data.id) {
      // Atualização
      const updatePayload: Record<string, unknown> = {
        name: data.name.trim(),
        slug: finalSlug,
        document: data.document?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        has_vehicle: data.has_vehicle,
        status: data.status,
      };

      const { error } = await admin
        .from("organizations")
        .update(updatePayload)
        .eq("id", data.id);

      if (error) {
        if (error.code === "23505") {
          return { error: "Já existe uma organização com este identificador (slug)." };
        }
        return { error: error.message };
      }

      revalidatePath("/dashboard/admin/organizacoes");
      revalidatePath("/dashboard/admin/equipe");
      revalidatePath("/dashboard/admin");
      return { id: data.id };
    } else {
      // Criação
      // Verifica unicidade do slug antes de inserir
      const { data: existingSlug } = await admin
        .from("organizations")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (existingSlug) {
        finalSlug = `${finalSlug}-${Math.random().toString(36).substring(2, 6)}`;
      }

      const insertPayload = {
        name: data.name.trim(),
        slug: finalSlug,
        document: data.document?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        has_vehicle: data.has_vehicle,
        status: data.status,
      };

      const { data: created, error } = await admin
        .from("organizations")
        .insert(insertPayload)
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          return { error: "Já existe uma organização com este identificador (slug) ou documento." };
        }
        return { error: error.message };
      }

      revalidatePath("/dashboard/admin/organizacoes");
      revalidatePath("/dashboard/admin/equipe");
      revalidatePath("/dashboard/admin");
      return { id: created?.id };
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

export async function toggleOrganizationVehicle(
  orgId: string,
  hasVehicle: boolean
): Promise<{ error?: string }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("organizations")
      .update({ has_vehicle: hasVehicle })
      .eq("id", orgId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/admin/organizacoes");
    revalidatePath("/dashboard/admin/equipe");
    revalidatePath("/dashboard/admin");
    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function toggleOrganizationStatus(
  orgId: string,
  status: "active" | "inactive"
): Promise<{ error?: string }> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("organizations")
      .update({ status })
      .eq("id", orgId);

    if (error) return { error: error.message };

    revalidatePath("/dashboard/admin/organizacoes");
    revalidatePath("/dashboard/admin/equipe");
    revalidatePath("/dashboard/admin");
    return {};
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
