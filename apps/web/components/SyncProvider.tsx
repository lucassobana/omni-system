"use client";

import { useEffect } from "react";
import { useFilaPontos } from "@/hooks/useFilaPontos";

export function SyncProvider() {
  const { pontosPendentes, removerPontoFila, marcarComoErro } = useFilaPontos();

  useEffect(() => {
    // Função que tenta sincronizar todos os pontos pendentes
    const syncPendente = async () => {
      if (!navigator.onLine || !pontosPendentes || pontosPendentes.length === 0) return;

      for (const ponto of pontosPendentes) {
        try {
          // Prepara FormData
          const formData = new FormData();
          formData.append('id', ponto.id);
          formData.append('data_hora', ponto.data_hora);
          if (ponto.latitude !== null) formData.append('latitude', ponto.latitude.toString());
          if (ponto.longitude !== null) formData.append('longitude', ponto.longitude.toString());
          if (ponto.action) formData.append('action', ponto.action);
          if (ponto.work_record_id) formData.append('work_record_id', ponto.work_record_id);
          if (ponto.organization_id) formData.append('organization_id', ponto.organization_id);
          if (ponto.uses_vehicle !== undefined) formData.append('uses_vehicle', ponto.uses_vehicle.toString());
          if (ponto.vehicle_reason) formData.append('vehicle_reason', ponto.vehicle_reason);

          const response = await fetch('/api/pontos/sync', {
            method: 'POST',
            body: formData,
          });

          if (response.ok) {
            await removerPontoFila(ponto.id);
          } else {
            const data = await response.json();
            await marcarComoErro(ponto.id, data.error || "Erro na API de sync");
          }
        } catch (error: unknown) {
          const errMsg = error instanceof Error ? error.message : "Erro desconhecido";
          console.error("Erro ao sincronizar ponto offline:", error);
          await marcarComoErro(ponto.id, errMsg);
        }
      }
    };

    // Sincroniza sempre que a rede voltar
    window.addEventListener('online', syncPendente);

    // Tenta sincronizar a cada 1 minuto
    const interval = setInterval(syncPendente, 60000);

    // Tenta uma vez no mount inicial
    syncPendente();

    return () => {
      window.removeEventListener('online', syncPendente);
      clearInterval(interval);
    };
  }, [pontosPendentes, removerPontoFila, marcarComoErro]);

  return null; // É um componente puramente lógico (headless)
}
