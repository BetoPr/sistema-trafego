import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceGetNameAndImage } from "@/lib/uazapi/client";
import { uploadMedia } from "@/lib/crm/storage";

export const runtime = "nodejs";

/**
 * POST /api/contatos/[id]/foto-refresh
 *
 * Pega a foto do perfil via UAZAPI (URL temporária do `pps.whatsapp.net`),
 * baixa e sobe pro bucket `crm-media`, grava path em `contatos.foto_url`.
 * UI resolve via `/api/media` (signed URL 1h).
 *
 * Resolve o bug "foto some" — URL do WhatsApp expira em poucas horas.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: contato } = await sb
    .from("contatos")
    .select("id, agencia_id, wa_id, whatsapp")
    .eq("id", id)
    .eq("agencia_id", u.agencia_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!contato) return NextResponse.json({ error: "Contato não encontrado." }, { status: 404 });

  const numero = contato.wa_id || (contato.whatsapp ? `${contato.whatsapp}@s.whatsapp.net` : null);
  if (!numero) return NextResponse.json({ error: "Contato sem wa_id/whatsapp." }, { status: 400 });

  // canal padrão da agência
  const { data: canal } = await sb
    .from("canais")
    .select("id, status, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("agencia_id", u.agencia_id)
    .eq("padrao", true)
    .limit(1)
    .maybeSingle();
  if (!canal || canal.status !== "connected") {
    return NextResponse.json({ error: "Canal padrão desconectado." }, { status: 400 });
  }
  const baseUrl = (canal as unknown as { servidor?: { base_url?: string } }).servidor?.base_url;
  if (!baseUrl) return NextResponse.json({ error: "Servidor UAZAPI sem base_url." }, { status: 500 });
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
  if (!token) return NextResponse.json({ error: "Token UAZAPI inválido." }, { status: 500 });

  try {
    const info = await instanceGetNameAndImage({ baseUrl, token }, numero);
    const url = info.image || null;
    if (!url) {
      // contato sem foto visível
      await sb.from("contatos").update({ foto_url: null }).eq("id", id);
      return NextResponse.json({ ok: true, foto: null, motivo: "Contato sem foto pública." });
    }

    // baixa e sobe pro bucket
    const r = await fetch(url);
    if (!r.ok) return NextResponse.json({ error: `Download falhou: ${r.status}` }, { status: 502 });
    const blob = await r.blob();
    const up = await uploadMedia({
      agenciaId: u.agencia_id,
      ticketId: "foto-perfil",
      data: blob,
      filename: `${id}.jpg`,
      contentType: blob.type || "image/jpeg",
    });
    await sb.from("contatos").update({ foto_url: up.path }).eq("id", id);
    return NextResponse.json({ ok: true, foto: up.path });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
