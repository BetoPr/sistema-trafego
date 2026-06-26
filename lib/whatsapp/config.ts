/**
 * Config + helpers de provider — lê env vars + DB pra montar
 * ProviderRef/InstanceRef do canal certo.
 *
 * Env vars:
 *  - SONAR_WAHA_BASE_URL  (ex: https://waha.sonarcrm.com.br)
 *  - SONAR_WAHA_API_KEY   (X-Api-Key shared do servidor WAHA)
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import type { InstanceRef, ProviderRef, ProviderTipo } from "./provider";

/** Server WAHA default (lido do env). */
export function getWahaServer(overrideBaseUrl?: string): ProviderRef {
  const baseUrl = overrideBaseUrl || process.env.SONAR_WAHA_BASE_URL || "";
  const apiKey = process.env.SONAR_WAHA_API_KEY || "";
  if (!baseUrl) {
    throw new Error("SONAR_WAHA_BASE_URL não configurado. Setar nas env vars da VPS.");
  }
  if (!apiKey) {
    throw new Error("SONAR_WAHA_API_KEY não configurado. Setar nas env vars da VPS.");
  }
  return { tipo: "waha", baseUrl, adminToken: apiKey };
}

interface CanalRow {
  id: string;
  agencia_id: string;
  provider: ProviderTipo | null;
  instance_id: string | null;
  instance_token_encrypted: unknown;
  waha_session_name: string | null;
  waha_base_url: string | null;
  webhook_secret: string;
  servidor_id: string | null;
}

/**
 * Carrega canal + retorna InstanceRef apropriado conforme provider.
 *
 * UAZAPI: usa servidor da tabela `super_admin_servidores` + instance_token.
 * WAHA: usa env SONAR_WAHA_BASE_URL (ou waha_base_url do canal) + apiKey.
 */
export async function loadInstanceRef(
  canalId: string,
  agenciaId: string,
): Promise<{ canal: CanalRow; provider: ProviderTipo; inst: InstanceRef }> {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("canais")
    .select(`
      id, agencia_id, provider, instance_id, instance_token_encrypted,
      waha_session_name, waha_base_url, webhook_secret, servidor_id,
      servidor:super_admin_servidores(base_url, admin_token_encrypted)
    `)
    .eq("id", canalId)
    .eq("agencia_id", agenciaId)
    .single();
  if (error || !data) throw new Error("Canal não encontrado.");

  const canal = data as unknown as CanalRow & {
    servidor: { base_url: string; admin_token_encrypted: unknown } | null;
  };
  const provider = (canal.provider || "uazapi") as ProviderTipo;

  if (provider === "uazapi") {
    if (!canal.servidor) throw new Error("Servidor UAZAPI não encontrado pro canal.");
    const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
    return {
      canal,
      provider,
      inst: {
        tipo: "uazapi",
        baseUrl: canal.servidor.base_url,
        token,
      },
    };
  }

  // WAHA
  const wahaServer = getWahaServer(canal.waha_base_url || undefined);
  return {
    canal,
    provider,
    inst: {
      tipo: "waha",
      baseUrl: wahaServer.baseUrl,
      token: wahaServer.adminToken,
      sessionName: canal.waha_session_name || canal.instance_id || undefined,
    },
  };
}

/**
 * Gera o nome canônico de session WAHA pra um canal.
 * Formato: `ag_{agencia_id8}_ch_{ts}` (8 chars uuid agência + timestamp curto).
 */
export function gerarSessionNameWaha(agenciaId: string): string {
  const ag8 = agenciaId.replace(/-/g, "").slice(0, 8);
  const ts = Date.now().toString(36).slice(-6);
  return `ag_${ag8}_ch_${ts}`;
}

/** Constrói webhook URL pro provider correto. */
export function webhookUrlForProvider(provider: ProviderTipo, secret: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (provider === "waha") return `${base}/api/webhooks/waha/${secret}`;
  return `${base}/api/webhooks/uazapi/${secret}`;
}
