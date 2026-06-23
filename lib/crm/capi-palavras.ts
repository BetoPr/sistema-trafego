import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Palavras-chave que disparam o evento ICP (Meta AddToCart).
 * Default vazio — usuário define o que faz sentido pro nicho dele.
 * O conjunto antigo (preço/preco/pix/orçamento…) virava muito nichado em fotografia;
 * agora começamos limpo e cada um adiciona o que combina (palavra-chave OU detecção via etiqueta).
 */
export const PALAVRAS_ICP_DEFAULT: string[] = [];
// alias retrocompat — algumas libs antigas ainda importam pelo nome antigo
export const PALAVRAS_ADDTOCART_DEFAULT = PALAVRAS_ICP_DEFAULT;

interface CapiConfig {
  /** Master switch: quando false, NADA é enviado pro Meta (nem Lead/ICP/Venda). */
  pixel_ativo: boolean;
  /** Lead: 1ª mensagem com click-id de anúncio (CTWA). */
  lead_ativo: boolean;
  /** ICP (Meta AddToCart): cliente sinalizou intenção. */
  icp_ativo: boolean;
  /** Palavras-chave que disparam o evento ICP. */
  icp_palavras: string[];
}

export const CAPI_CONFIG_DEFAULT: CapiConfig = {
  pixel_ativo: true,
  lead_ativo: true,
  icp_ativo: false,
  icp_palavras: PALAVRAS_ICP_DEFAULT,
};

/** Le a config de eventos automaticos da agencia. */
export async function getCapiConfig(agenciaId: string): Promise<CapiConfig> {
  const sb = createServiceClient();
  const { data } = await sb
    .from("configuracoes_agencia")
    .select("ia")
    .eq("agencia_id", agenciaId)
    .maybeSingle<{ ia: { capi?: Record<string, unknown> } | null }>();
  const capi = (data?.ia?.capi || {}) as Record<string, unknown>;

  // compat com chaves antigas (addtocart_*)
  const icpAtivo =
    typeof capi.icp_ativo === "boolean"
      ? (capi.icp_ativo as boolean)
      : typeof capi.addtocart_ativo === "boolean"
        ? (capi.addtocart_ativo as boolean)
        : CAPI_CONFIG_DEFAULT.icp_ativo;
  const icpPalavras = Array.isArray(capi.icp_palavras)
    ? (capi.icp_palavras as string[])
    : Array.isArray(capi.addtocart_palavras)
      ? (capi.addtocart_palavras as string[])
      : CAPI_CONFIG_DEFAULT.icp_palavras;

  return {
    pixel_ativo: typeof capi.pixel_ativo === "boolean" ? (capi.pixel_ativo as boolean) : CAPI_CONFIG_DEFAULT.pixel_ativo,
    lead_ativo: typeof capi.lead_ativo === "boolean" ? (capi.lead_ativo as boolean) : CAPI_CONFIG_DEFAULT.lead_ativo,
    icp_ativo: icpAtivo,
    icp_palavras: icpPalavras,
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
  // espelha em chave antiga pra libs ainda nao migradas
  if ("icp_ativo" in patch) capi.addtocart_ativo = patch.icp_ativo;
  if ("icp_palavras" in patch) capi.addtocart_palavras = patch.icp_palavras;
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
