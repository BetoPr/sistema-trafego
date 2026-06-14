/**
 * POST /api/admin/backfill-midia
 * Re-baixa mídia de mensagens com midia_url=null via /message/download da UAZAPI.
 *
 * Causas comuns do "fica em branco":
 *  - UAZAPI demorou e o webhook background falhou silencioso
 *  - ImgBB caiu / atingiu rate limit
 *  - /message/download retornou base64 vazio no momento (mídia ainda subindo)
 *
 * Esta rota faz a 2ª tentativa sob demanda.
 *
 * Query: ?limit=30  (default 30, max 100)
 * Body opcional: { ticketId } pra rodar só num ticket específico
 * Auth: super_admin OU admin da agência
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceDownloadMessage } from "@/lib/uazapi/client";
import { uploadMedia } from "@/lib/crm/storage";
import { uploadImageToImgbb, uploadImageFromUrlToImgbb } from "@/lib/imgbb/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface CanalInfo {
  id: string;
  baseUrl: string;
  token: string;
}

const TYPE_MAP: Record<string, "image" | "audio" | "video" | "document" | "sticker"> = {
  audio: "audio",
  imagem: "image",
  video: "video",
  documento: "document",
  sticker: "sticker",
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb
    .from("usuarios")
    .select("agencia_id, role")
    .eq("id", auth.user.id)
    .single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });
  if (!["super_admin", "admin"].includes(u.role)) {
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit")) || 30));
  const body = (await req.json().catch(() => null)) as { ticketId?: string } | null;

  // Busca mensagens pendentes
  let q = sb
    .from("mensagens")
    .select("id, ticket_id, agencia_id, tipo, wa_message_id, ticket:tickets(canal_id)")
    .eq("agencia_id", u.agencia_id)
    .is("midia_url", null)
    .in("tipo", ["audio", "imagem", "video", "documento", "sticker"])
    .order("created_at", { ascending: false })
    .limit(limit);
  if (body?.ticketId) q = q.eq("ticket_id", body.ticketId);
  const { data: msgs } = await q;

  if (!msgs || msgs.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, sucesso: 0, falha: 0, restantes: 0 });
  }

  // Conta total pendente (pra UI mostrar progresso)
  const { count: restantes } = await sb
    .from("mensagens")
    .select("id", { count: "exact", head: true })
    .eq("agencia_id", u.agencia_id)
    .is("midia_url", null)
    .in("tipo", ["audio", "imagem", "video", "documento", "sticker"]);

  // Cache de canal (descriptografa token 1x)
  const canalCache = new Map<string, CanalInfo | null>();
  async function getCanal(canalId: string): Promise<CanalInfo | null> {
    if (canalCache.has(canalId)) return canalCache.get(canalId)!;
    const { data: c } = await sb
      .from("canais")
      .select("id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
      .eq("id", canalId)
      .maybeSingle();
    if (!c?.instance_token_encrypted) {
      canalCache.set(canalId, null);
      return null;
    }
    const baseUrl = (c as unknown as { servidor: { base_url: string } }).servidor?.base_url;
    if (!baseUrl) {
      canalCache.set(canalId, null);
      return null;
    }
    try {
      const token = decryptToken(byteaToBuffer(c.instance_token_encrypted));
      const info: CanalInfo = { id: c.id, baseUrl, token };
      canalCache.set(canalId, info);
      return info;
    } catch {
      canalCache.set(canalId, null);
      return null;
    }
  }

  let sucesso = 0;
  let falha = 0;
  const erros: Array<{ id: string; motivo: string }> = [];

  for (const m of msgs) {
    const ticket = Array.isArray(m.ticket) ? m.ticket[0] : m.ticket;
    const canalId = (ticket as { canal_id?: string })?.canal_id;
    if (!canalId) {
      falha++;
      erros.push({ id: m.id, motivo: "sem_canal" });
      continue;
    }
    const canal = await getCanal(canalId);
    if (!canal) {
      falha++;
      erros.push({ id: m.id, motivo: "canal_sem_token" });
      continue;
    }

    try {
      const dl = await instanceDownloadMessage(
        { baseUrl: canal.baseUrl, token: canal.token },
        { id: m.wa_message_id, type: TYPE_MAP[m.tipo] },
      );

      const mimeType = dl.mimetype || undefined;
      const filename = dl.filename || undefined;

      // imagem → ImgBB
      if (m.tipo === "imagem") {
        let imgUrl: string | null = null;
        if (dl.fileURL) {
          const ib = await uploadImageFromUrlToImgbb({ sourceUrl: dl.fileURL, filename });
          imgUrl = ib.url;
        } else if (dl.base64) {
          const ib = await uploadImageToImgbb({ base64: dl.base64, filename });
          imgUrl = ib.url;
        }
        if (!imgUrl) {
          falha++;
          erros.push({ id: m.id, motivo: "imgbb_sem_dados" });
          continue;
        }
        await sb.from("mensagens").update({
          midia_url: imgUrl,
          midia_mime: mimeType || "image/jpeg",
          midia_filename: filename || null,
        }).eq("id", m.id);
        sucesso++;
        continue;
      }

      // audio/video/documento/sticker → bucket
      let buf: Buffer | null = null;
      if (dl.fileURL) {
        const r = await fetch(dl.fileURL);
        if (r.ok) buf = Buffer.from(await r.arrayBuffer());
      } else if (dl.base64) {
        const raw = dl.base64.includes(",") ? dl.base64.split(",")[1] : dl.base64;
        buf = Buffer.from(raw, "base64");
      }
      if (!buf) {
        falha++;
        erros.push({ id: m.id, motivo: "uazapi_sem_dados" });
        continue;
      }
      const up = await uploadMedia({
        agenciaId: m.agencia_id,
        ticketId: m.ticket_id,
        data: buf,
        filename: filename || `${m.tipo}.bin`,
        contentType: mimeType || "application/octet-stream",
      });
      await sb.from("mensagens").update({
        midia_url: up.path,
        midia_mime: mimeType || null,
        midia_filename: filename || null,
      }).eq("id", m.id);
      sucesso++;
    } catch (e) {
      falha++;
      erros.push({ id: m.id, motivo: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: msgs.length,
    sucesso,
    falha,
    restantes: Math.max(0, (restantes || 0) - sucesso),
    erros: erros.slice(0, 5),
  });
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id, role").eq("id", auth.user.id).single();
  if (!u || !["super_admin", "admin"].includes(u.role)) {
    return NextResponse.json({ error: "sem_permissao" }, { status: 403 });
  }
  const { count } = await sb
    .from("mensagens")
    .select("id", { count: "exact", head: true })
    .eq("agencia_id", u.agencia_id)
    .is("midia_url", null)
    .in("tipo", ["audio", "imagem", "video", "documento", "sticker"]);
  return NextResponse.json({ pendentes: count || 0 });
}
