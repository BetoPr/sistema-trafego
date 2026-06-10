/**
 * GET /api/grupos/export-xls?canal=<canalId>&jid=<groupJid>
 * Exporta participantes do grupo em XLSX (colunas: Grupo, Número, Admin).
 * Sem jid: exporta lista de grupos (ID + Nome + Membros).
 */
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceGetGroupInfo, instanceListGroups } from "@/lib/uazapi/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const canalId = url.searchParams.get("canal");
  const jid = url.searchParams.get("jid");
  if (!canalId) return NextResponse.json({ error: "canal_obrigatorio" }, { status: 400 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  const { data: canal } = await sb
    .from("canais")
    .select("id, nome, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("id", canalId)
    .eq("agencia_id", u.agencia_id)
    .single();
  if (!canal) return NextResponse.json({ error: "canal_nao_encontrado" }, { status: 404 });

  try {
    const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
    const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));

    const wb = new ExcelJS.Workbook();
    let filename: string;

    if (jid) {
      // Participantes de um grupo
      const info = await instanceGetGroupInfo({ baseUrl, token }, { groupjid: jid });
      const ws = wb.addWorksheet("Participantes");
      ws.columns = [
        { header: "Grupo", key: "grupo", width: 40 },
        { header: "Número", key: "numero", width: 20 },
        { header: "Admin", key: "admin", width: 10 },
      ];
      for (const p of info.Participants || []) {
        ws.addRow({
          grupo: info.Name,
          // Grupos "lid": telefone real em PhoneNumber; JID é ID anônimo
          numero: (p.PhoneNumber || p.JID).split("@")[0],
          admin: p.IsAdmin || p.IsSuperAdmin ? "Sim" : "Não",
        });
      }
      ws.getRow(1).font = { bold: true };
      filename = `participantes-${(info.Name || "grupo").replace(/[^\w\d-]+/g, "_").slice(0, 40)}.xlsx`;
    } else {
      // Lista de grupos
      const grupos = await instanceListGroups({ baseUrl, token });
      const ws = wb.addWorksheet("Grupos");
      ws.columns = [
        { header: "ID (JID)", key: "jid", width: 35 },
        { header: "Nome", key: "nome", width: 45 },
        { header: "Membros", key: "membros", width: 12 },
      ];
      for (const g of grupos) {
        ws.addRow({ jid: g.JID, nome: g.Name, membros: g.Participants?.length ?? "" });
      }
      ws.getRow(1).font = { bold: true };
      filename = `grupos-${canal.nome.replace(/[^\w\d-]+/g, "_").slice(0, 40)}.xlsx`;
    }

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buf), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: "uazapi", msg: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
