import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceGetNameAndImage } from "@/lib/uazapi/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Backfill de fotos de perfil pra contatos antigos sem foto_url.
 * pg_cron 1/h. Processa até 50 contatos por execução (rate limit UAZAPI).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 500 });
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = createServiceClient();
  const res = { processados: 0, atualizados: 0, falhas: 0 };

  // Busca canais conectados + um lote de contatos sem foto da agência do canal
  const { data: canais } = await sb
    .from("canais")
    .select("id, agencia_id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("status", "connected")
    .order("updated_at", { ascending: false });

  for (const c of canais || []) {
    try {
      const { data: contatos } = await sb
        .from("contatos")
        .select("id, wa_id, whatsapp")
        .eq("agencia_id", c.agencia_id)
        .is("foto_url", null)
        .is("deleted_at", null)
        .not("wa_id", "is", null)
        .limit(50);

      if (!contatos || !contatos.length) continue;

      const servidor = Array.isArray(c.servidor) ? c.servidor[0] : c.servidor;
      const baseUrl = (servidor as { base_url: string }).base_url;
      const token = decryptToken(byteaToBuffer(c.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));

      for (const co of contatos) {
        res.processados++;
        try {
          const numero = (co.wa_id || co.whatsapp || "").replace(/@.+$/, "").replace(/\D/g, "");
          if (!numero) continue;
          const ni = await instanceGetNameAndImage({ baseUrl, token }, numero);
          if (ni.image) {
            await sb.from("contatos").update({ foto_url: ni.image }).eq("id", co.id);
            res.atualizados++;
          }
        } catch {
          res.falhas++;
        }
      }
    } catch (e) {
      console.error("[cron fotos] canal falhou:", e);
    }
  }

  return NextResponse.json({ ok: true, ...res });
}
