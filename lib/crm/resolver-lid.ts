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
  maxMs?: number; // teto de tempo (o resto fica pra próxima importação)
}): Promise<{ tentados: number; resolvidos: number; falhas: number; restantes: number }> {
  const limite = params.limite ?? 600;
  const maxMs = params.maxMs ?? 180_000;
  const inicio = Date.now();

  const { data: rows } = await params.sb
    .from("contatos")
    .select("id, wa_id, whatsapp")
    .eq("agencia_id", params.agenciaId)
    .like("wa_id", "%@lid")
    .is("deleted_at", null)
    .limit(5000);

  const pendentes = ((rows || []) as Array<{ id: string; wa_id: string; whatsapp: string | null }>)
    .filter((c) => !c.whatsapp || c.whatsapp.trim() === "");
  const alvo = pendentes.slice(0, limite);

  let resolvidos = 0;
  let falhas = 0;
  let tentados = 0;
  for (const c of alvo) {
    if (Date.now() - inicio > maxMs) break; // estoura tempo → para, resto na próxima
    tentados++;
    const det = await instanceChatDetails({ baseUrl: params.baseUrl, token: params.token }, c.wa_id);
    const num = normalizarTelefone(det?.phone);
    if (!num || num.length < 8 || num.length > 15) { falhas++; continue; }
    await params.sb.from("contatos").update({ whatsapp: num }).eq("id", c.id);
    resolvidos++;
  }
  return { tentados, resolvidos, falhas, restantes: Math.max(0, pendentes.length - resolvidos) };
}
