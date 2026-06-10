/**
 * GET /api/grupos/participantes?canal=<canalId>&jid=<groupJid>
 * Lista participantes (número + admin?) de um grupo via UAZAPI /group/info.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceGetGroupInfo } from "@/lib/uazapi/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const canalId = url.searchParams.get("canal");
  const jid = url.searchParams.get("jid");
  if (!canalId || !jid) return NextResponse.json({ error: "canal_e_jid_obrigatorios" }, { status: 400 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: canal } = await sb
    .from("canais")
    .select("id, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", canalId)
    .eq("agencia_id", u.agencia_id)
    .single();
  if (!canal) return NextResponse.json({ error: "canal_nao_encontrado" }, { status: 404 });

  try {
    const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
    const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
    const info = await instanceGetGroupInfo({ baseUrl, token }, { groupjid: jid });
    // Grupos "lid": JID é ID anônimo; telefone real vem em PhoneNumber.
    const participantes = (info.Participants || []).map((p) => ({
      numero: (p.PhoneNumber || p.JID).split("@")[0],
      admin: !!(p.IsAdmin || p.IsSuperAdmin),
    }));
    return NextResponse.json({ grupo: { jid: info.JID, nome: info.Name }, participantes });
  } catch (e) {
    return NextResponse.json({ error: "uazapi", msg: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
