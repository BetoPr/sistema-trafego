/**
 * Audit log helper.
 * Server-only — use service_role (não bloqueia por RLS).
 */
import { createServiceClient } from "@/lib/supabase/service";

export type AuditAcao =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "connect"
  | "disconnect"
  | "send_message"
  | "open_ticket"
  | "close_ticket"
  | "view"
  | "export"
  | "config_change";

export interface AuditEntry {
  agenciaId?: string | null;
  usuarioId?: string | null;
  tenantLabel?: string;
  acao: AuditAcao | string;
  entidade?: string;
  entidadeId?: string;
  metodo?: string;
  caminho?: string;
  status?: number;
  ip?: string;
  userAgent?: string;
  payload?: Record<string, unknown>;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    const sb = createServiceClient();
    await sb.from("audit_logs").insert({
      agencia_id: entry.agenciaId ?? null,
      usuario_id: entry.usuarioId ?? null,
      tenant_label: entry.tenantLabel ?? null,
      acao: entry.acao,
      entidade: entry.entidade ?? null,
      entidade_id: entry.entidadeId ?? null,
      metodo: entry.metodo ?? null,
      caminho: entry.caminho ?? null,
      status: entry.status ?? null,
      ip: entry.ip ?? null,
      user_agent: entry.userAgent ?? null,
      payload: entry.payload ?? null,
    });
  } catch (e) {
    // Audit não deve quebrar fluxo principal.
    console.error("[audit] falhou:", e);
  }
}

/**
 * Extrai IP do header X-Forwarded-For (Vercel).
 */
export function getIp(headers: Headers): string | null {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip") || null;
}
