import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/** Palavras-chave default que disparam AddToCart (Pix, valor, etc.). */
export const PALAVRAS_ADDTOCART_DEFAULT: string[] = [
  "preço", "preco", "quanto", "valor", "pix", "pacote", "cobrança", "cobranca", "orçamento", "orcamento",
];

interface CapiConfig {
  addtocart_ativo: boolean;
  addtocart_palavras: string[];
  lead_ativo: boolean;
}

export const CAPI_CONFIG_DEFAULT: CapiConfig = {
  addtocart_ativo: true,
  addtocart_palavras: PALAVRAS_ADDTOCART_DEFAULT,
  lead_ativo: true,
};

/** Le a config de eventos automaticos da agencia. */
export async function getCapiConfig(agenciaId: string): Promise<CapiConfig> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("configuracoes_agencia")
    .select("ia")
    .eq("agencia_id", agenciaId)
    .maybeSingle<{ ia: { capi?: Partial<CapiConfig> } | null }>();
  const capi = data?.ia?.capi || {};
  return {
    addtocart_ativo: capi.addtocart_ativo ?? CAPI_CONFIG_DEFAULT.addtocart_ativo,
    addtocart_palavras:
      Array.isArray(capi.addtocart_palavras) && capi.addtocart_palavras.length > 0
        ? capi.addtocart_palavras
        : CAPI_CONFIG_DEFAULT.addtocart_palavras,
    lead_ativo: capi.lead_ativo ?? CAPI_CONFIG_DEFAULT.lead_ativo,
  };
}

/** Salva (parcial merge) a config de eventos automaticos. */
export async function setCapiConfig(agenciaId: string, patch: Partial<CapiConfig>): Promise<void> {
  const sb = createServiceClient();
  const { data: cur } = await sb
    .from("configuracoes_agencia")
    .select("ia")
    .eq("agencia_id", agenciaId)
    .maybeSingle<{ ia: Record<string, unknown> | null }>();
  const ia: Record<string, unknown> = cur?.ia && typeof cur.ia === "object" ? { ...cur.ia } : {};
  const capi: Record<string, unknown> = (ia.capi && typeof ia.capi === "object" ? { ...(ia.capi as object) } : {}) as Record<string, unknown>;
  Object.assign(capi, patch);
  ia.capi = capi;
  await sb.from("configuracoes_agencia").upsert({ agencia_id: agenciaId, ia }, { onConflict: "agencia_id" });
}

/** Normaliza texto pra match: lowercase + remove acentos. */
function normalizar(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Retorna true se alguma palavra-chave aparece na mensagem do cliente. */
export function matchPalavraChave(texto: string, palavras: string[]): boolean {
  const t = normalizar(texto);
  for (const p of palavras) {
    const pn = normalizar(p);
    if (pn && t.includes(pn)) return true;
  }
  return false;
}
