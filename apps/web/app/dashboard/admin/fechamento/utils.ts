export type FechamentoPeriodType = "cutoff_21_20" | "calendar";

export interface FechamentoItem {
  userId: string;
  userName: string;
  employeeCode: string | null;
  horasPrevistasMin: number;
  horasRealizadasMin: number;
  qtdFaltas: number;
  saldoMesMin: number;
  temPendencia: boolean;
  isValidated: boolean;
  totalRecords: number;
  organizationName?: string;
  organizationId?: string;
}

export interface WorkRecordDetail {
  id: string;
  clockIn: string;
  clockOut: string | null;
  breakMinutes: number;
  workedMinutes: number | null;
  status: "open" | "closed" | "adjusted" | "disputed";
  notes: string | null;
  validatedAt: string | null;
  validatedBy: string | null;
}

export interface FechamentoDiaItem {
  recordId?: string;
  data: string; // "21/05/2026"
  rawDate: string; // "2026-05-21"
  diaSemana: string; // "Quinta-feira"
  horarioPlantao: string; // "17:00 às 07:00"
  totalHoras: string; // "14:00:00"
  totalMinutos: number;
  utilizacaoVeiculo: string; // "OK" ou motivo (ex: "Manutenção")
  isVeiculoOk: boolean;
  observacoes: string;
}

export interface FechamentoRelatorioFuncionario {
  organizationName: string;
  unitName: string;
  employeeName: string;
  employeeCode: string | null;
  periodoFormatado: string;
  periodType: FechamentoPeriodType;
  dias: FechamentoDiaItem[];
  totalHorasPeriodo: string; // "541:00:00"
  totalHorasMinutos: number;
  veiculoOkDias: number;
  veiculoNaoOkDias: number;
  resumoVeiculo: string; // "OK: 23 Dias | Manut.: 8 Dias"
  validatorName?: string | null;
  validatedAtFormatted?: string | null;
}

export const MESES_NOMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const DIAS_SEMANA_NOMES = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado"
];

/**
 * Calcula o intervalo de datas do fechamento.
 * Por padrão utiliza "cutoff_21_20": 21 do mês anterior até 20 do mês de referência.
 */
export function getFechamentoDateRange(
  year: number,
  month: number,
  periodType: FechamentoPeriodType = "cutoff_21_20"
) {
  let startDate: Date;
  let endDate: Date;
  let periodoFormatado = "";

  if (periodType === "cutoff_21_20") {
    // 21 do mês anterior (month - 2 em UTC 0-index) a 20 do mês vigente (month - 1)
    startDate = new Date(Date.UTC(year, month - 2, 21, 0, 0, 0));
    endDate = new Date(Date.UTC(year, month - 1, 20, 23, 59, 59, 999));

    const mesAntNome = MESES_NOMES[startDate.getUTCMonth()];
    const mesVigNome = MESES_NOMES[endDate.getUTCMonth()];
    const anoFim = endDate.getUTCFullYear();
    periodoFormatado = `21 de ${mesAntNome} a 20 de ${mesVigNome} de ${anoFim}`;
  } else {
    // Mês calendário (01 a último dia do mês)
    startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const mesNome = MESES_NOMES[month - 1];
    const ultimoDia = endDate.getUTCDate();
    periodoFormatado = `01 a ${ultimoDia} de ${mesNome} de ${year}`;
  }

  return {
    startDate,
    endDate,
    startIsoDate: startDate.toISOString().slice(0, 10),
    endIsoDate: endDate.toISOString().slice(0, 10),
    startIsoTime: startDate.toISOString(),
    endIsoTime: endDate.toISOString(),
    periodoFormatado,
  };
}
