/**
 * POST /api/contatos/importar-uazapi
 * Body: { canalId: string, pularLabelsNativas?: boolean }
 * Auth: admin/super_admin da agência.
 * Retorna ImportResumo síncrono (max ~45s — paginação rápida + bulk upserts).
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { importarContatosUazapi } from "@/lib/crm/import-contatos";
import { importarMensagensUazapi } from "@/lib/crm/import-mensagens";
import { resolverNumerosLid } from "@/lib/crm/resolver-lid";
import { audit } from "@/lib/crm/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id, role").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });
  if (!["super_admin", "admin"].includes(u.role)) {
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as { canalId?: string; pularLabelsNativas?: boolean; incluirMensagens?: boolean } | null;
  if (!body?.canalId) return NextResponse.json({ error: "canalId_obrigatorio" }, { status: 400 });

  const { data: canal } = await sb
    .from("canais")
    .select("id, agencia_id, fila_id, instance_token_encrypted, status, servidor:super_admin_servidores(base_url)")
    .eq("id", body.canalId)
    .maybeSingle();
  if (!canal || canal.agencia_id !== u.agencia_id) {
    return NextResponse.json({ error: "canal_nao_encontrado" }, { status: 404 });
  }
  if (canal.status !== "connected") {
    return NextResponse.json({ error: "canal_desconectado" }, { status: 400 });
  }

  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor?.base_url;
  if (!baseUrl) return NextResponse.json({ error: "servidor_sem_url" }, { status: 500 });

  let token: string;
  try {
    token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
  } catch {
    return NextResponse.json({ error: "token_corrompido" }, { status: 500 });
  }

  const resumo = await importarContatosUazapi({
    sb,
    agenciaId: u.agencia_id,
    baseUrl,
    token,
    pularLabelsNativas: body.pularLabelsNativas !== false,
  });

  // Histórico recente de conversas (default ligado). Bounded pra caber no tempo.
  let mensagens = null;
  if (body.incluirMensagens !== false) {
    try {
      mensagens = await importarMensagensUazapi({
        sb,
        agenciaId: u.agencia_id,
        canalId: canal.id,
        canalFilaPadrao: (canal as { fila_id?: string | null }).fila_id ?? null,
        baseUrl,
        token,
        maxChats: 60,
        porChat: 20,
      });
    } catch (e) {
      mensagens = { erro: e instanceof Error ? e.message : String(e) };
    }
  }

  // Resolve número real dos contatos @lid (1 chamada /chat/details cada).
  // Bounded pra caber no tempo — o resto pega numa próxima importação.
  let numerosLid = null;
  try {
    numerosLid = await resolverNumerosLid({ sb, agenciaId: u.agencia_id, baseUrl, token, limite: 120 });
  } catch (e) {
    numerosLid = { erro: e instanceof Error ? e.message : String(e) };
  }

  // Marca primeiro import no canal — onboarding banner some
  await sb.from("canais").update({ contatos_importados_em: new Date().toISOString() }).eq("id", canal.id);

  void audit({
    agenciaId: u.agencia_id,
    usuarioId: auth.user.id,
    acao: "import_contatos_uazapi",
    entidade: "contatos",
    entidadeId: canal.id,
    payload: resumo as unknown as Record<string, unknown>,
  });

  return NextResponse.json({ ...resumo, mensagens, numeros_lid: numerosLid });
}
