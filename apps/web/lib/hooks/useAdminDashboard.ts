"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getActiveOrganizations } from "@/app/dashboard/admin/organizacoes/actions";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  has_vehicle?: boolean;
  status?: string;
}

export interface ShiftEntry {
  id: string;
  user_id: string;
  organization_id: string;
  shift_date: string;
  /** TIMESTAMPTZ — ex: "2026-08-15T06:00:00+00:00" */
  start_at: string;
  end_at: string;
  employee_name: string;
  /** Preenchido ao cruzar com work_records */
  actual_clock_in?: string | null;
  actual_clock_out?: string | null;
}

export interface WorkRecord {
  id: string;
  user_id: string;
  employee_name: string;
  clock_in: string;
  clock_out: string | null;
  organization_id: string;
  status: string;
  declared_shift_hours_initial: number | null;
  declared_shift_hours_current: number | null;
  actual_hours: number | null;
  uses_vehicle?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayIso() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

// ─── Hook: organizações disponíveis (para filtro e cadastros) ─────────────────

export function useOrganizations() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrgs = useCallback(() => {
    let isMounted = true;
    setLoading(true);
    getActiveOrganizations().then((data) => {
      if (!isMounted) return;
      setOrganizations((data ?? []) as Organization[]);
      setLoading(false);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const cleanup = fetchOrgs();
    return cleanup;
  }, [fetchOrgs]);

  return { organizations, loading, refresh: fetchOrgs };
}

// ─── Hook: escala do dia + realidade (clock_in) ───────────────────────────────

export function useTodaySchedule(organizationId: string | null) {
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const today = todayIso();

    async function load() {
      setLoading(true);
      setError(null);

      // 1. Busca a escala do dia (shift_date = hoje)
      let query = supabase
        .from("shifts")
        .select("id, user_id, organization_id, shift_date, start_at, end_at, profiles(full_name)")
        .eq("shift_date", today)
        .order("start_at");

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data: shiftsData, error: shiftsErr } = await query;

      if (shiftsErr) {
        setError(shiftsErr.message);
        setLoading(false);
        return;
      }

      // 2. Busca os registros de ponto do dia para cruzar com a escala
      let wrQuery = supabase
        .from("work_records")
        .select("id, user_id, clock_in, clock_out")
        .gte("clock_in", `${today}T00:00:00+00:00`)
        .lte("clock_in", `${today}T23:59:59+00:00`);

      if (organizationId) {
        wrQuery = wrQuery.eq("organization_id", organizationId);
      }

      const { data: records } = await wrQuery;

      // 3. Mapa user_id → record para lookup O(1)
      // Mantém somente o primeiro clock_in do dia por usuário
      const recordMap = new Map<string, { clock_in: string; clock_out: string | null }>();
      for (const r of records ?? []) {
        if (!recordMap.has(r.user_id)) {
          recordMap.set(r.user_id, { clock_in: r.clock_in, clock_out: r.clock_out });
        }
      }

interface RawShift {
  id: string;
  user_id: string;
  organization_id: string;
  shift_date: string;
  start_at: string;
  end_at: string;
  profiles: { full_name: string | null } | null;
}

      // 4. Enriquece cada turno com os dados reais de entrada/saída
      const enriched: ShiftEntry[] = ((shiftsData as unknown as RawShift[]) ?? []).map((s) => ({
        id: s.id,
        user_id: s.user_id,
        organization_id: s.organization_id,
        shift_date: s.shift_date,
        start_at: s.start_at,
        end_at: s.end_at,
        employee_name: s.profiles?.full_name ?? "—",
        actual_clock_in: recordMap.get(s.user_id)?.clock_in ?? null,
        actual_clock_out: recordMap.get(s.user_id)?.clock_out ?? null,
      }));

      setShifts(enriched);
      setLoading(false);
    }

    load();
  }, [organizationId]);

  return { shifts, loading, error };
}

// ─── Hook: registros de ponto do dia ─────────────────────────────────────────

export function useTodayWorkRecords(organizationId: string | null) {
  const [records, setRecords] = useState<WorkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const today = todayIso();

    async function load() {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("work_records")
        .select("id, user_id, organization_id, clock_in, clock_out, status, worked_minutes, notes, profiles(full_name)")
        .gte("clock_in", `${today}T00:00:00+00:00`)
        .lte("clock_in", `${today}T23:59:59+00:00`)
        .order("clock_in", { ascending: false });

      if (organizationId) {
        query = query.eq("organization_id", organizationId);
      }

      const { data, error: err } = await query;

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

      interface RawWorkRecord {
        id: string;
        user_id: string;
        organization_id: string;
        clock_in: string;
        clock_out: string | null;
        status: string;
        worked_minutes?: number | null;
        notes?: string | null;
        uses_vehicle?: boolean | null;
        profiles: { full_name: string | null } | null;
      }

      const mapped: WorkRecord[] = ((data as unknown as RawWorkRecord[]) ?? []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        employee_name: r.profiles?.full_name ?? "—",
        clock_in: r.clock_in,
        clock_out: r.clock_out,
        organization_id: r.organization_id,
        status: r.status,
        declared_shift_hours_initial: null,
        declared_shift_hours_current: null,
        actual_hours: r.worked_minutes ? Number((r.worked_minutes / 60).toFixed(2)) : null,
        uses_vehicle: Boolean(r.uses_vehicle ?? r.notes?.includes("USES_VEHICLE:true")),
      }));

      setRecords(mapped);
      setLoading(false);
    }

    load();
  }, [organizationId]);

  return { records, loading, error };
}
