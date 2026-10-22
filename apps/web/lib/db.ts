/**
 * lib/db.ts — Banco de dados local (IndexedDB via Dexie.js)
 *
 * Propósito: armazenar temporariamente registros de ponto quando o
 * funcionário estiver sem conexão à internet (Offline-First).
 *
 * REGRA DE NEGÓCIO:
 *   Não armazenamos fotos offline para preservar espaço do dispositivo.
 *   Apenas dados de geolocalização e metadados do ponto são persistidos.
 *
 * CICLO DE VIDA DE UM REGISTRO:
 *   1. status_sync = 'pendente'  → ponto registrado offline, aguardando sync.
 *   2. status_sync = 'erro'      → tentativa de sync falhou; será reprocessado.
 *   3. (removido da fila)        → sync bem-sucedido; registro enviado ao Supabase.
 *
 * VERSIONAMENTO:
 *   Ao alterar o schema, incremente a versão e use .upgrade() para migração.
 *   Nunca altere o stores() de uma versão já publicada.
 */

import Dexie, { type EntityTable } from "dexie";

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Status de sincronização de um registro na fila local. */
export type StatusSync = "pendente" | "erro";

/**
 * Representa um registro de ponto pendente de sincronização com o backend.
 * Criado localmente quando o dispositivo está offline.
 */
export interface FilaPonto {
  /** UUID v4 gerado localmente como chave primária. */
  id: string;

  /** ID do funcionário autenticado (mirrors profiles.id no Supabase). */
  funcionario_id: string;

  /**
   * Data e hora do registro em formato ISO 8601.
   * Ex: "2025-08-13T15:04:00.000-03:00"
   * Armazenado como string para portabilidade e serialização segura.
   */
  data_hora: string;

  /**
   * Coordenadas geográficas no momento do registro.
   * Obtidas via navigator.geolocation.getCurrentPosition().
   * Podem ser null se o usuário negou permissão de localização.
   */
  latitude: number | null;
  longitude: number | null;

  /**
   * ID da organização onde o ponto está sendo registrado.
   */
  organization_id?: string;

  /**
   * Tipo de batida (entrada ou saída).
   */
  action?: 'entry' | 'exit';

  /**
   * ID da sessão de trabalho em andamento (se saída).
   */
  work_record_id?: string | null;

  /**
   * Indica se a jornada utilizou veículo (relevante para organizações com has_vehicle).
   */
  uses_vehicle?: boolean;

  /**
   * Motivo caso não tenha utilizado veículo (ex: Manutenção, oficina, etc.)
   */
  vehicle_reason?: string;

  /**
   * Status de sincronização com o Supabase.
   *   'pendente' → aguardando conexão para envio.
   *   'erro'     → última tentativa de sync falhou (ex: token expirado, 5xx).
   */
  status_sync: StatusSync;

  /**
   * Mensagem de erro da última tentativa de sincronização.
   * Preenchida quando status_sync = 'erro'.
   */
  erro_mensagem?: string;

  /**
   * Número de tentativas de sincronização realizadas.
   * Útil para implementar backoff exponencial e evitar loops infinitos.
   */
  tentativas: number;

  /**
   * Timestamp da criação do registro no dispositivo (ms desde epoch).
   * Independente de data_hora — útil para ordenação e auditoria local.
   */
  criado_em: number;
}

// ─── Classe do banco ──────────────────────────────────────────────────────────

class OmniSystemDB extends Dexie {
  /**
   * Tabela local de pontos pendentes de sincronização.
   *
   * Schema do IndexedDB:
   *   `id`            → Chave primária (UUID v4 gerado localmente).
   *   `funcionario_id` → Índice para queries por funcionário.
   *   `status_sync`   → Índice para filtrar pendentes vs. erro.
   *   `criado_em`     → Índice para ordenação cronológica.
   *
   * Campos não indexados (armazenados mas sem índice):
   *   `data_hora`, `latitude`, `longitude`, `action`, `work_record_id`, `erro_mensagem`, `tentativas`
   */
  fila_pontos!: EntityTable<FilaPonto, "id">;

  constructor() {
    super("omni-system-db");

    // ── Versão 1: schema inicial ─────────────────────────────────────────
    this.version(1).stores({
      fila_pontos:
        "&id, funcionario_id, status_sync, criado_em",
    });

    this.version(3).stores({
      fila_pontos: "&id, funcionario_id, status_sync, criado_em",
    });

    // ── Versão 4: remoção de foto offline (somente horário e localização) ─
    this.version(4).stores({
      fila_pontos: "&id, funcionario_id, status_sync, criado_em",
    });
  }
}

// ─── Instância singleton (HMR Friendly) ─────────────────────────────────────────
// O Dexie gerencia internamente a abertura da conexão com IndexedDB.
// No modo de desenvolvimento (Next.js Fast Refresh), reavaliar este arquivo
// cria múltiplas instâncias que bloqueiam atualizações de versão ("versionchange").
// Portanto, guardamos a instância no objeto `window`.

declare global {
  interface Window {
    __omniDb?: OmniSystemDB;
  }
}

let dbInstance: OmniSystemDB;

if (typeof window !== "undefined") {
  if (!window.__omniDb) {
    window.__omniDb = new OmniSystemDB();
  }
  dbInstance = window.__omniDb;
} else {
  // Fallback seguro para Server-Side Rendering (nunca será usado ativamente no server)
  dbInstance = new OmniSystemDB();
}

export const db = dbInstance;
