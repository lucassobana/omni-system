import { calcularJornada, isCrossMidnight, calcularMinutosTrabalhados, minutosParaHorasDecimais } from './CalculoJornada';
import { TimeCalculationService } from './TimeCalculationService';

describe('CalculoJornada Engine', () => {
  const shiftInfo = {
    shift_hours: 12,
    rest_hours: 36,
  };

  it('deve retornar 0 minutos de saldo para batida exata', () => {
    const result = calcularJornada(
      {
        clock_in: new Date('2024-10-01T07:00:00Z'), // 07:00 UTC
        clock_out: new Date('2024-10-01T20:00:00Z'), // 20:00 UTC (13h total)
        break_minutes: 60, // 1 hora de almoço = 12h líquidas
      },
      shiftInfo
    );

    expect(result.worked_minutes).toBe(720); // 12 horas
    expect(result.expected_minutes).toBe(720);
    expect(result.saldo_minutos).toBe(0);
    expect(result.actual_hours).toBe(12.0);
  });

  it('deve descontar APENAS o excedente da tolerância em atrasos', () => {
    // Tolerância padrão de 10 min
    const result = calcularJornada(
      {
        clock_in: new Date('2024-10-01T07:12:00Z'), // Atraso de 12 minutos
        clock_out: new Date('2024-10-01T20:00:00Z'),
        break_minutes: 60,
      },
      shiftInfo,
      10
    );

    expect(result.worked_minutes).toBe(708);
    expect(result.saldo_minutos).toBe(-2);
    expect(result.actual_hours).toBe(11.8);
  });

  it('não deve gerar débito se o atraso for menor ou igual à tolerância', () => {
    const result = calcularJornada(
      {
        clock_in: new Date('2024-10-01T07:09:00Z'), // Atraso de 9 minutos
        clock_out: new Date('2024-10-01T20:00:00Z'),
        break_minutes: 60,
      },
      shiftInfo,
      10
    );

    expect(result.saldo_minutos).toBe(0);
  });

  it('deve gerar crédito APENAS do excedente da tolerância em hora extra', () => {
    const result = calcularJornada(
      {
        clock_in: new Date('2024-10-01T06:45:00Z'), // Chegou 15 minutos mais cedo
        clock_out: new Date('2024-10-01T20:00:00Z'),
        break_minutes: 60,
      },
      shiftInfo,
      10
    );

    expect(result.saldo_minutos).toBe(5);
  });

  describe('Funções utilitárias puras', () => {
    it('calcularMinutosTrabalhados deve subtrair break_minutes corretamente', () => {
      const min = calcularMinutosTrabalhados('2024-10-01T08:00:00Z', '2024-10-01T17:00:00Z', 60);
      expect(min).toBe(480); // 9h - 1h = 8h = 480 min
    });

    it('minutosParaHorasDecimais deve formatar com 2 casas', () => {
      expect(minutosParaHorasDecimais(510)).toBe(8.5);
      expect(minutosParaHorasDecimais(480)).toBe(8.0);
    });

    it('isCrossMidnight deve retornar false se não cruzar a meia-noite', () => {
      const start = new Date('2024-10-01T07:00:00Z');
      const end = new Date('2024-10-01T19:00:00Z');
      expect(isCrossMidnight(start, end)).toBe(false);
    });

    it('isCrossMidnight deve retornar true se cruzar a meia-noite', () => {
      const start = new Date('2024-10-01T19:00:00Z');
      const end = new Date('2024-10-02T07:00:00Z');
      expect(isCrossMidnight(start, end)).toBe(true);
    });
  });
});

describe('TimeCalculationService Engine', () => {
  it('deve apurar jornada regular sem ocorrências com status closed', () => {
    const apuracao = TimeCalculationService.processSession(
      {
        clock_in: '2024-10-01T08:00:00Z',
        clock_out: '2024-10-01T17:00:00Z',
        break_minutes: 60,
        declared_shift_hours_current: 8,
      },
      [
        { type: 'ENTRY', punched_at: '2024-10-01T08:00:00Z' },
        { type: 'EXIT', punched_at: '2024-10-01T17:00:00Z' },
      ],
      [{ schedules: { shift_hours: 8 } }]
    );

    expect(apuracao.workedMinutes).toBe(480);
    expect(apuracao.actualHours).toBe(8.0);
    expect(apuracao.status).toBe('closed'); // NUNCA 'completed'!
    expect(apuracao.occurrences).toHaveLength(0);
    expect(apuracao.saldoMinutos).toBe(0);
  });

  it('deve gerar ocorrência EARLY_EXIT quando sair mais de 1h antes do previsto', () => {
    const apuracao = TimeCalculationService.processSession(
      {
        clock_in: '2024-10-01T08:00:00Z',
        clock_out: '2024-10-01T14:30:00Z', // Realizou 6.5h em plantão de 8h (diferença -1.5h)
        break_minutes: 0,
        declared_shift_hours_current: 8,
      },
      [
        { type: 'ENTRY', punched_at: '2024-10-01T08:00:00Z' },
        { type: 'EXIT', punched_at: '2024-10-01T14:30:00Z' },
      ]
    );

    expect(apuracao.status).toBe('pending_review');
    expect(apuracao.occurrences.some((o) => o.type === 'EARLY_EXIT')).toBe(true);
  });

  it('deve gerar ocorrência JORNADA_SUPERIOR quando fizer mais de 1h extra', () => {
    const apuracao = TimeCalculationService.processSession(
      {
        clock_in: '2024-10-01T08:00:00Z',
        clock_out: '2024-10-01T18:30:00Z', // Realizou 9.5h líquidos em plantão de 8h (diferença +1.5h)
        break_minutes: 60,
        declared_shift_hours_current: 8,
      },
      [
        { type: 'ENTRY', punched_at: '2024-10-01T07:00:00Z' },
        { type: 'EXIT', punched_at: '2024-10-01T17:30:00Z' },
      ]
    );

    expect(apuracao.status).toBe('pending_review');
    expect(apuracao.occurrences.some((o) => o.type === 'JORNADA_SUPERIOR')).toBe(true);
    expect(apuracao.overtimeMinutes).toBeGreaterThan(0);
  });

  it('deve gerar SHIFT_MISMATCH quando declaração diferir da escala planejada', () => {
    const apuracao = TimeCalculationService.processSession(
      {
        clock_in: '2024-10-01T07:00:00Z',
        clock_out: '2024-10-01T21:00:00Z',
        declared_shift_hours_current: 14,
      },
      [
        { type: 'ENTRY', punched_at: '2024-10-01T07:00:00Z' },
        { type: 'EXIT', punched_at: '2024-10-01T21:00:00Z' },
      ],
      [{ schedules: { shift_hours: 12 } }] // Escala era 12h, declarou 14h
    );

    expect(apuracao.status).toBe('pending_review');
    expect(apuracao.occurrences.some((o) => o.type === 'SHIFT_MISMATCH')).toBe(true);
  });

  it('deve gerar DECLARED_SHIFT_MISMATCH quando declarar 24h mas trabalhar ~14h', () => {
    const apuracao = TimeCalculationService.processSession(
      {
        clock_in: '2024-10-01T07:00:00Z',
        clock_out: '2024-10-01T21:00:00Z', // 14h
        declared_shift_hours_current: 24,
      },
      [
        { type: 'ENTRY', punched_at: '2024-10-01T07:00:00Z' },
        { type: 'EXIT', punched_at: '2024-10-01T21:00:00Z' },
      ]
    );

    expect(apuracao.status).toBe('pending_review');
    expect(apuracao.occurrences.some((o) => o.type === 'DECLARED_SHIFT_MISMATCH')).toBe(true);
  });

  it('deve sinalizar POSSIBLE_FORGOTTEN_EXIT se sessão tiver mais de 24h aberta sem saída', () => {
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();

    const apuracao = TimeCalculationService.processSession(
      {
        clock_in: twentyFiveHoursAgo,
        clock_out: null,
      },
      [{ type: 'ENTRY', punched_at: twentyFiveHoursAgo }]
    );

    expect(apuracao.status).toBe('pending_review');
    expect(apuracao.occurrences.some((o) => o.type === 'POSSIBLE_FORGOTTEN_EXIT')).toBe(true);
  });

  it('deve manter status awaiting_continuation se sessão for recente e sem saída', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const apuracao = TimeCalculationService.processSession(
      {
        clock_in: twoHoursAgo,
        clock_out: null,
      },
      [{ type: 'ENTRY', punched_at: twoHoursAgo }]
    );

    expect(apuracao.status).toBe('awaiting_continuation');
    expect(apuracao.occurrences).toHaveLength(0);
  });
});
