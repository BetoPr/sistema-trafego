/**
 * Resolve o NÚMERO REAL de contatos @lid via UAZAPI /chat/details.
 *
 * /chat/find e a lista de contatos devolvem @lid (privacidade do WhatsApp, sem
 * telefone), mas /chat/details traz o campo `phone` com o número real. Aqui a
 * gente varre os contatos @lid sem número e preenche o whatsapp.
 *
 * 1 chamada por contato → bounded por `limite` pra não estourar tempo.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { instanceChatDetails } from "@/lib/uazapi/client";

export function normalizarTelefone(raw?: string | null): string {
  return (raw || "").replace(/\D/g, "");
}

export async function resolverNumerosLid(params: {
  sb: SupabaseClient;
  agenciaId: string;
  baseUrl: string;
  token: string;
  limite?: number;
}): Promise<{ tentados: number; resolvidos: number; falhas: number }> {
  const limite = params.limite ?? 300;

  const { data: rows } = await params.sb
    .from("contatos")
    .select("id, wa_id, whatsapp")
    .eq("agencia_id", params.agenciaId)
    .like("wa_id", "%@lid")
    .is("deleted_at", null)
    .limit(limite * 3);

  const alvo = ((rows || []) as Array<{ id: string; wa_id: string; whatsapp: string | null }>)
    .filter((c) => !c.whatsapp || c.whatsapp.trim() === "")
    .slice(0, limite);

  let resolvidos = 0;
  let falhas = 0;
  for (const c of alvo) {
    const det = await instanceChatDetails({ baseUrl: params.baseUrl, token: params.token }, c.wa_id);
    const num = normalizarTelefone(det?.phone);
    if (!num || num.length < 8 || num.length > 15) { falhas++; continue; }
    await params.sb.from("contatos").update({ whatsapp: num }).eq("id", c.id);
    resolvidos++;
  }
  return { tentados: alvo.length, resolvidos, falhas };
}
