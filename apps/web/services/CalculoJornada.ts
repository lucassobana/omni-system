/**
 * Omni System — Motor de Cálculo de Jornada e Banco de Horas
 * Contém regras puras (sem dependência de banco de dados ou framework).
 */

export interface PontoRecord {
  clock_in: Date | string;
  clock_out: Date | string;
  break_minutes?: number;
}

export interface ShiftInfo {
  shift_hours: number; // ex: 12, 14, 24, 8
  rest_hours?: number; // ex: 36
  start_at?: string;   // ISO string do início previsto
  end_at?: string;     // ISO string do fim previsto
}

export interface CalculoResultado {
  worked_minutes: number;
  expected_minutes: number;
  saldo_minutos: number; // positivo = crédito (hora extra), negativo = débito (atraso/falta)
  actual_hours: number;  // horas decimais com 2 casas
}

/**
 * Calcula os minutos trabalhados líquidos descontando pausas/intervalos.
 */
export function calcularMinutosTrabalhados(
  clockIn: Date | string,
  clockOut: Date | string,
  breakMinutes: number = 0
): number {
  const inMs = new Date(clockIn).getTime();
  const outMs = new Date(clockOut).getTime();
  const diffMinutos = Math.floor((outMs - inMs) / 60000);
  return Math.max(0, diffMinutos - (breakMinutes || 0));
}

/**
 * Converte minutos para horas decimais com 2 casas de precisão (ex: 720m -> 12.00, 750m -> 12.50).
 */
export function minutosParaHorasDecimais(minutos: number): number {
  return parseFloat((minutos / 60).toFixed(2));
}

/**
 * Calcula os minutos trabalhados e o saldo (crédito/débito) em relação à jornada esperada,
 * aplicando a regra de tolerância apenas no excedente.
 * 
 * Regra: Descontar apenas o tempo excedente à tolerância (ex: tolerância 10m, atraso 12m = 2m descontados).
 * O mesmo vale para horas extras (excedente positivo: tolerância 10m, hora extra 12m = 2m creditados).
 */
export function calcularJornada(
  ponto: PontoRecord,
  shift: ShiftInfo,
  toleranciaMinutos: number = 10
): CalculoResultado {
  const expected_minutes = shift.shift_hours * 60;
  const clockInDate = typeof ponto.clock_in === 'string' ? new Date(ponto.clock_in) : ponto.clock_in;
  const clockOutDate = typeof ponto.clock_out === 'string' ? new Date(ponto.clock_out) : ponto.clock_out;

  const worked_minutes = calcularMinutosTrabalhados(clockInDate, clockOutDate, ponto.break_minutes || 0);
  const actual_hours = minutosParaHorasDecimais(worked_minutes);

  const saldoBruto = worked_minutes - expected_minutes;
  let saldo_minutos = 0;

  if (saldoBruto > 0) {
    if (saldoBruto > toleranciaMinutos) {
      saldo_minutos = saldoBruto - toleranciaMinutos;
    } else {
      saldo_minutos = 0;
    }
  } else if (saldoBruto < 0) {
    const debitoAbsoluto = Math.abs(saldoBruto);
    if (debitoAbsoluto > toleranciaMinutos) {
      saldo_minutos = -(debitoAbsoluto - toleranciaMinutos);
    } else {
      saldo_minutos = 0;
    }
  }

  return {
    worked_minutes,
    expected_minutes,
    saldo_minutos,
    actual_hours,
  };
}

/**
 * Identifica se a jornada cruza a meia-noite (cross-midnight).
 */
export function isCrossMidnight(clock_in: Date, clock_out: Date): boolean {
  const inStr = clock_in.toISOString().split('T')[0];
  const outStr = clock_out.toISOString().split('T')[0];
  return inStr !== outStr;
}
