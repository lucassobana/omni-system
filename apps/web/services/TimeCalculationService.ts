/**
 * Omni System — Serviço de Apuração de Sessão de Ponto e Detecção de Ocorrências
 * Regras auditáveis e alinhadas ao schema PostgreSQL da Migration 0005.
 */

import {
  calcularMinutosTrabalhados,
  minutosParaHorasDecimais,
  calcularJornada,
} from './CalculoJornada';

export type WorkRecordStatus =
  | 'open'
  | 'closed'
  | 'adjusted'
  | 'disputed'
  | 'awaiting_continuation'
  | 'pending_review'
  | 'approved'
  | 'correction_required'
  | 'cancelled';

export type OccurrenceType =
  | 'MISSING_ENTRY'
  | 'MISSING_EXIT'
  | 'EARLY_EXIT'
  | 'LATE_ENTRY'
  | 'JORNADA_INFERIOR'
  | 'JORNADA_SUPERIOR'
  | 'POSSIBLE_FORGOTTEN_EXIT'
  | 'SHIFT_MISMATCH'
  | 'DECLARED_SHIFT_MISMATCH'
  | 'OVERTIME_PENDING'
  | 'MANUAL_CORRECTION';

export interface OccurrenceItem {
  type: OccurrenceType;
  description: string;
}

export interface TimePunch {
  id?: string;
  type: 'ENTRY' | 'EXIT';
  punched_at: string | Date;
  source?: string | null;
}

export interface WorkRecordInput {
  id?: string;
  clock_in?: string | Date | null;
  clock_out?: string | Date | null;
  break_minutes?: number | null;
  declared_shift_hours_initial?: number | null;
  declared_shift_hours_current?: number | null;
  actual_hours?: number | null;
  worked_minutes?: number | null;
  status?: string | null;
}

export interface ShiftInput {
  id?: string;
  shift_date?: string;
  start_at?: string;
  end_at?: string;
  schedules?: { shift_hours: number } | { shift_hours: number }[] | null;
}

export interface ApuracaoResult {
  workedMinutes: number;
  actualHours: number;
  differenceHours: number;
  saldoMinutos: number; // Positivo = crédito, Negativo = débito
  overtimeMinutes: number;
  status: WorkRecordStatus;
  occurrences: OccurrenceItem[];
}

export class TimeCalculationService {
  /**
   * Apura uma sessão de trabalho (work_record) após uma marcação de SAÍDA ou verificação periódica.
   * Não altera o banco diretamente: retorna os cálculos e ocorrências para o chamador persistir.
   */
  static processSession(
    workRecord: WorkRecordInput,
    punches: TimePunch[] = [],
    shifts: ShiftInput[] = []
  ): ApuracaoResult {
    // 1. Extrair Entrada e Saída (tanto de punches quanto diretamente do workRecord)
    const entryPunch = punches.find((p) => p.type === 'ENTRY');
    const exitPunch = punches.find((p) => p.type === 'EXIT');

    const clockInValue = entryPunch?.punched_at || workRecord.clock_in;
    const clockOutValue = exitPunch?.punched_at || workRecord.clock_out;

    const occurrences: OccurrenceItem[] = [];

    // 2. Se não tiver saída, a sessão está em andamento ou é esquecimento
    if (!clockOutValue) {
      if (clockInValue) {
        const entryTime = new Date(clockInValue).getTime();
        const msSinceEntry = Date.now() - entryTime;
        // Mais de 24h sem bater saída -> Possível esquecimento
        if (msSinceEntry > 24 * 60 * 60 * 1000) {
          occurrences.push({
            type: 'POSSIBLE_FORGOTTEN_EXIT',
            description: 'Mais de 24h desde a entrada sem registro de saída.',
          });
          return {
            workedMinutes: 0,
            actualHours: 0,
            differenceHours: 0,
            saldoMinutos: 0,
            overtimeMinutes: 0,
            status: 'pending_review',
            occurrences,
          };
        }
        return {
          workedMinutes: 0,
          actualHours: 0,
          differenceHours: 0,
          saldoMinutos: 0,
          overtimeMinutes: 0,
          status: 'awaiting_continuation',
          occurrences,
        };
      }
      return {
        workedMinutes: 0,
        actualHours: 0,
        differenceHours: 0,
        saldoMinutos: 0,
        overtimeMinutes: 0,
        status: 'open',
        occurrences,
      };
    }

    // 3. Temos Entrada e Saída
    const entryDate = new Date(clockInValue!);
    const exitDate = new Date(clockOutValue);
    const breakMinutes = workRecord.break_minutes || 0;

    const workedMinutes = calcularMinutosTrabalhados(entryDate, exitDate, breakMinutes);
    const actualHours = minutosParaHorasDecimais(workedMinutes);

    // 4. Determina a jornada planejada/declarada
    let plannedHours =
      workRecord.declared_shift_hours_current || workRecord.declared_shift_hours_initial;

    let scheduledHours: number | null = null;
    if (shifts && shifts.length > 0 && shifts[0]?.schedules) {
      const rawSched = shifts[0].schedules as unknown;
      if (Array.isArray(rawSched)) {
        scheduledHours = (rawSched[0] as { shift_hours?: number } | undefined)?.shift_hours ?? null;
      } else if (rawSched && typeof rawSched === "object" && "shift_hours" in rawSched) {
        scheduledHours = (rawSched as { shift_hours: number }).shift_hours;
      }
    }

    if (!plannedHours) {
      plannedHours = scheduledHours || 8;
    }

    // 5. Aplica regra de tolerância e banco de horas
    const calculo = calcularJornada(
      { clock_in: entryDate, clock_out: exitDate, break_minutes: breakMinutes },
      { shift_hours: plannedHours },
      10 // 10 minutos de tolerância
    );

    const differenceHours = parseFloat((actualHours - plannedHours).toFixed(2));
    const saldoMinutos = calculo.saldo_minutos;
    const overtimeMinutes = Math.max(0, saldoMinutos);

    // 6. Detecção de Ocorrências

    // 6.1 Saída antecipada mais de 1h ou atraso superior
    if (differenceHours < -1) {
      occurrences.push({
        type: 'EARLY_EXIT',
        description: `Jornada inferior: realizou ${actualHours}h, declarou/previu ${plannedHours}h.`,
      });
    } else if (differenceHours > 1) {
      occurrences.push({
        type: 'JORNADA_SUPERIOR',
        description: `Jornada superior: realizou ${actualHours}h, declarou/previu ${plannedHours}h.`,
      });
    }

    // 6.2 Divergência de Escala vs. Declaração
    if (scheduledHours !== null && plannedHours !== scheduledHours) {
      occurrences.push({
        type: 'SHIFT_MISMATCH',
        description: `Divergência de escala: Escala diz ${scheduledHours}h, declaração foi ${plannedHours}h.`,
      });
    }

    // 6.3 Quebra de expectativa 24h vs. 14h
    if (plannedHours === 24 && Math.abs(actualHours - 14) <= 2) {
      occurrences.push({
        type: 'DECLARED_SHIFT_MISMATCH',
        description: `Declarou 24h, mas realizou jornada similar a 14h (${actualHours}h).`,
      });
    }

    // 7. Status final do registro:
    // NUNCA 'completed'! Se houver ocorrências -> 'pending_review'; senão -> 'closed'.
    const status: WorkRecordStatus = occurrences.length > 0 ? 'pending_review' : 'closed';

    return {
      workedMinutes,
      actualHours,
      differenceHours,
      saldoMinutos,
      overtimeMinutes,
      status,
      occurrences,
    };
  }
}
