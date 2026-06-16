/**
 * GET /api/ia-atendimento/listar-grupos?canal_id=...
 * Retorna grupos da conexão UAZAPI do canal.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceListGroups } from "@/lib/uazapi/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const canalId = searchParams.get("canal_id");
  if (!canalId) return NextResponse.json({ error: "canal_id_obrigatorio" }, { status: 400 });

  const { data: canal } = await sb
    .from("canais")
    .select("id, agencia_id, status, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", canalId)
    .maybeSingle();
  if (!canal || canal.agencia_id !== u.agencia_id) {
    return NextResponse.json({ error: "canal_invalido" }, { status: 404 });
  }
  if (canal.status !== "connected") return NextResponse.json({ error: "canal_desconectado" }, { status: 400 });

  const servidorRaw = (canal as unknown as { servidor: unknown }).servidor;
  const servidor = Array.isArray(servidorRaw)
    ? (servidorRaw[0] as { base_url: string } | undefined)
    : (servidorRaw as { base_url: string } | undefined);
  if (!servidor?.base_url) return NextResponse.json({ error: "sem_base_url" }, { status: 500 });

  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

  try {
    const grupos = await instanceListGroups({ baseUrl: servidor.base_url, token });
    const out = grupos.map((g) => ({ jid: g.JID, nome: g.Name }));
    return NextResponse.json({ ok: true, grupos: out });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
