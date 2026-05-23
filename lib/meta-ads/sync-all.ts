import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { syncMetaIntegracao, type SyncResult } from "./sync";

export interface SyncAllResult {
  total: number;
  sucesso: number;
  falhas: number;
  duracao_ms: number;
  resultados: SyncResult[];
}

export async function syncAllForAgencia(agenciaId: string): Promise<SyncAllResult> {
  const t0 = Date.now();
  const svc = createServiceClient();

  const { data: integs, error } = await svc
    .from("integracoes")
    .select("id")
    .eq("agencia_id", agenciaId)
    .eq("plataforma", "meta_ads")
    .in("status", ["ativa", "erro"]);

  if (error) throw new Error(`syncAllForAgencia: ${error.message}`);

  const resultados: SyncResult[] = [];
  for (const i of integs || []) {
    resultados.push(await syncMetaIntegracao(i.id));
  }

  const sucesso = resultados.filter((r) => r.ok).length;
  const falhas = resultados.length - sucesso;

  return {
    total: resultados.length,
    sucesso,
    falhas,
    duracao_ms: Date.now() - t0,
    resultados,
  };
}
