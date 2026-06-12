import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { uploadMedia } from "@/lib/crm/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/follow-up/upload
 * Body: { fileBase64, filename, mime }
 * Sobe a mídia pro bucket crm-media (pasta followup) e devolve o PATH
 * (o worker gera signed URL fresca na hora de enviar) + preview signed url.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { fileBase64?: string; filename?: string; mime?: string } | null;
  if (!body?.fileBase64) return NextResponse.json({ error: "sem_arquivo" }, { status: 400 });

  const raw = body.fileBase64.includes(",") ? body.fileBase64.split(",")[1] : body.fileBase64;
  const buffer = Buffer.from(raw, "base64");
  if (buffer.byteLength > 16 * 1024 * 1024) return NextResponse.json({ error: "Arquivo acima de 16MB" }, { status: 413 });

  try {
    const r = await uploadMedia({
      agenciaId: u.agencia_id,
      ticketId: "followup",
      data: buffer,
      filename: body.filename || "midia.bin",
      contentType: body.mime || "application/octet-stream",
    });
    return NextResponse.json({ ok: true, path: r.path, previewUrl: r.signedUrl, mime: body.mime || null, filename: body.filename || null });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
