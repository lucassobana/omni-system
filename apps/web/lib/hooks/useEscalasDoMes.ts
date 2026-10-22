"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ShiftDoMes {
  id: string;
  user_id: string;
  organization_id: string;
  schedule_id: string;
  shift_date: string;   // "YYYY-MM-DD"
  start_at: string;     // TIMESTAMPTZ
  end_at: string;       // TIMESTAMPTZ
  status: string;
}

export interface ProfileDaOrg {
  id: string;
  full_name: string;
  employee_code: string | null;
  role: string;
  status: string;
}

export interface ScheduleDaOrg {
  id: string;
  name: string;
  shift_hours: number;
  rest_hours: number;
  status: string;
}

// ─── Hook: shifts do mês filtrados por org ────────────────────────────────────

export function useShiftsDoMes(
  organizationIds: string[],
  year: number,
  month: number
) {
  const [shifts, setShifts] = useState<ShiftDoMes[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (organizationIds.length === 0) {
      setShifts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Primeiro e último dia do mês como "YYYY-MM-DD"
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(Date.UTC(year, month, 0))
      .toISOString()
      .slice(0, 10);

    const { data, error: err } = await supabase
      .from("shifts")
      .select("id, user_id, organization_id, schedule_id, shift_date, start_at, end_at, status")
      .in("organization_id", organizationIds)
      .gte("shift_date", firstDay)
      .lte("shift_date", lastDay)
      .order("shift_date")
      .order("start_at");

    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

    setShifts((data as ShiftDoMes[]) ?? []);
    setLoading(false);
  }, [organizationIds, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  return { shifts, loading, error, refresh: load };
}

// ─── Hook: profiles ativos da organização ─────────────────────────────────────

export function useProfilesDaOrg(organizationId: string | null) {
  const [profiles, setProfiles] = useState<ProfileDaOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setProfiles([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from("profiles")
      .select("id, full_name, employee_code, role, status")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("full_name")
      .then(({ data }) => {
        setProfiles((data as ProfileDaOrg[]) ?? []);
        setLoading(false);
      });
  }, [organizationId]);

  return { profiles, loading };
}

// ─── Hook: schedules ativos da organização ────────────────────────────────────

export function useSchedulesDaOrg(organizationId: string | null) {
  const [schedules, setSchedules] = useState<ScheduleDaOrg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from("schedules")
      .select("id, name, shift_hours, rest_hours, status")
      .eq("organization_id", organizationId)
      .in("status", ["active", "draft"])
      .order("name")
      .then(({ data }) => {
        setSchedules((data as ScheduleDaOrg[]) ?? []);
        setLoading(false);
      });
  }, [organizationId]);

  return { schedules, loading };
}
