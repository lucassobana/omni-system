/**
 * Utilitários de cálculo de escala — sem side effects, sem server/client.
 * Pode ser importado tanto por Server Actions quanto por Client Components.
 */

/**
 * Adiciona `days` dias a uma data "YYYY-MM-DD".
 */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Retorna o último dia do mês como "YYYY-MM-DD".
 * month é 1-12.
 */
export function lastDayOfMonth(year: number, month: number): string {
  return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
}

/**
 * Calcula as datas de plantão 12x36 a partir de firstShiftDate
 * até o último dia do mês (year, month), inclusive.
 */
export function calcularDatas12x36(
  firstShiftDate: string,
  year: number,
  month: number
): string[] {
  const lastDay = lastDayOfMonth(year, month);
  const datas: string[] = [];
  let cursor = firstShiftDate;

  while (cursor <= lastDay) {
    datas.push(cursor);
    cursor = addDays(cursor, 2); // trabalho + folga = 2 dias
  }

  return datas;
}

/**
 * Converte "YYYY-MM-DD" + "HH:MM" + offset em TIMESTAMPTZ ISO string.
 * Ex: "2026-08-01", "07:00", -180 → "2026-08-01T07:00:00-03:00"
 */
export function toTimestamptz(
  date: string,
  time: string,
  tzOffsetMinutes: number
): string {
  const sign = tzOffsetMinutes <= 0 ? "-" : "+";
  const absOffset = Math.abs(tzOffsetMinutes);
  const hh = String(Math.floor(absOffset / 60)).padStart(2, "0");
  const mm = String(absOffset % 60).padStart(2, "0");
  return `${date}T${time}:00${sign}${hh}:${mm}`;
}
