/**
 * hooks/useFilaPontos.ts — Hook para gerenciamento da fila offline de pontos.
 *
 * Fornece:
 *   • `pontosPendentes`    → Lista reativa dos pontos ainda não sincronizados.
 *   • `pontosComErro`      → Lista reativa dos pontos com falha na última sync.
 *   • `totalPendente`      → Contagem total (pendente + erro) para badges de UI.
 *   • `adicionarPontoFila` → Registra um ponto novo na fila local.
 *   • `marcarComoErro`     → Atualiza status após falha de sincronização.
 *   • `removerPontoFila`   → Remove após sync bem-sucedida com o Supabase.
 *   • `limparFila`         → Remove todos os registros (útil em logout).
 *
 * IMPORTANTE: Este hook usa `useLiveQuery` do dexie-react-hooks, que cria
 * uma subscription reativa ao IndexedDB. O componente re-renderiza
 * automaticamente ao detectar qualquer mudança na tabela `fila_pontos`.
 *
 * RESTRIÇÃO: Só pode ser usado em Client Components ("use client").
 */

"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db, type FilaPonto } from "@/lib/db";

// ─── Tipos de entrada ─────────────────────────────────────────────────────────

/**
 * Dados necessários para registrar um novo ponto na fila offline.
 * `id`, `status_sync`, `tentativas` e `criado_em` são gerados automaticamente.
 */
export interface AdicionarPontoInput {
  /** ID do funcionário autenticado. */
  funcionario_id: string;

  /**
   * Data e hora do registro em ISO 8601.
   * Se não informado, usa o momento atual (new Date().toISOString()).
   */
  data_hora?: string;

  /**
   * Coordenadas geográficas. Podem ser null se o usuário negou localização.
   */
  latitude?: number | null;
  longitude?: number | null;
}

// ─── Utilitário: geração de UUID v4 ──────────────────────────────────────────

/**
 * Gera um UUID v4 de forma segura.
 * Usa `crypto.randomUUID()` quando disponível (browsers modernos e Node 19+),
 * com fallback manual para ambientes sem suporte (ex: alguns PWA contexts).
 */
function gerarUUID(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  // Fallback RFC 4122 v4 compliant
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useFilaPontos() {
  // ── Queries reativas ────────────────────────────────────────────────────

  /**
   * Lista todos os pontos com status 'pendente', ordenados por data de criação.
   * Retorna `undefined` enquanto o IndexedDB não terminou de carregar (loading state).
   */
  const pontosPendentes = useLiveQuery(
    () =>
      db.fila_pontos
        .where("status_sync")
        .equals("pendente")
        .sortBy("criado_em"),
    [],
    [] as FilaPonto[]
  );

  /**
   * Lista todos os pontos com status 'erro', ordenados por data de criação.
   * Exibir esses pontos na UI permite que o usuário saiba sobre falhas.
   */
  const pontosComErro = useLiveQuery(
    () =>
      db.fila_pontos
        .where("status_sync")
        .equals("erro")
        .sortBy("criado_em"),
    [],
    [] as FilaPonto[]
  );

  /**
   * Total de registros na fila (pendente + erro).
   * Útil para badges e indicadores visuais de sincronização pendente.
   */
  const totalPendente = useLiveQuery(
    () => db.fila_pontos.count(),
    [],
    0
  );

  // ── Ações ───────────────────────────────────────────────────────────────

  /**
   * Registra um novo ponto na fila local do IndexedDB.
   *
   * Chamada quando:
   *   • O dispositivo está offline ao bater o ponto.
   *   • O Supabase retornou erro temporário (5xx, timeout).
   *
   * @returns O ID do registro criado.
   *
   * @example
   * const id = await adicionarPontoFila({
   *   funcionario_id: user.id,
   *   latitude: coords.latitude,
   *   longitude: coords.longitude,
   * });
   */
  async function adicionarPontoFila(
    input: AdicionarPontoInput
  ): Promise<string> {
    const id = gerarUUID();
    const agora = Date.now();

    const novoPonto: FilaPonto = {
      id,
      funcionario_id: input.funcionario_id,
      data_hora: input.data_hora ?? new Date(agora).toISOString(),
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      status_sync: "pendente",
      tentativas: 0,
      criado_em: agora,
    };

    await db.fila_pontos.add(novoPonto);

    return id;
  }

  /**
   * Remove um ponto da fila após sincronização bem-sucedida com o Supabase.
   *
   * IMPORTANTE: chame esta função SOMENTE após confirmar que o ponto foi
   * persistido com sucesso no backend. Removê-lo antes disso causará perda
   * de dados em caso de falha da rede.
   *
   * @param id - UUID do registro a ser removido.
   */
  async function removerPontoFila(id: string): Promise<void> {
    await db.fila_pontos.delete(id);
  }

  /**
   * Marca um ponto como 'erro' após uma tentativa de sync fracassada.
   * Incrementa o contador de tentativas e opcionalmente registra a mensagem.
   *
   * Permite reprocessamento posterior (ex: ao reconectar, ao abrir o app novamente).
   *
   * @param id          - UUID do registro que falhou.
   * @param mensagem    - Descrição do erro para depuração/exibição ao usuário.
   */
  async function marcarComoErro(
    id: string,
    mensagem?: string
  ): Promise<void> {
    await db.fila_pontos
      .where("id")
      .equals(id)
      .modify((ponto) => {
        ponto.status_sync = "erro";
        ponto.tentativas = (ponto.tentativas ?? 0) + 1;
        if (mensagem) {
          ponto.erro_mensagem = mensagem;
        }
      });
  }

  /**
   * Recoloca um ponto com status 'erro' de volta para 'pendente'.
   * Útil para retentativas manuais acionadas pelo usuário.
   *
   * @param id - UUID do registro a ser reprocessado.
   */
  async function reprocessarPonto(id: string): Promise<void> {
    await db.fila_pontos
      .where("id")
      .equals(id)
      .modify((ponto) => {
        ponto.status_sync = "pendente";
        ponto.erro_mensagem = undefined;
      });
  }

  /**
   * Remove TODOS os registros da fila local.
   *
   * ⚠️ USE COM CUIDADO: dados não sincronizados serão perdidos permanentemente.
   * Indicado para uso no fluxo de logout, onde é esperado que o funcionário
   * tenha conectividade ao sair.
   */
  async function limparFila(): Promise<void> {
    await db.fila_pontos.clear();
  }

  // ── Retorno do hook ─────────────────────────────────────────────────────

  return {
    // Estado reativo (leitura)
    pontosPendentes,
    pontosComErro,
    totalPendente,

    // Ações (escrita)
    adicionarPontoFila,
    removerPontoFila,
    marcarComoErro,
    reprocessarPonto,
    limparFila,
  } as const;
}
