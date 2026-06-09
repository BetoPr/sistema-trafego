import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: "auth" }, { status: 401 });

  const sb = createServiceClient();
  const { data: u } = await sb.from("usuarios").select("agencia_id").eq("id", auth.user.id).single();
  if (!u) return NextResponse.json({ error: "no_user" }, { status: 403 });

  // Anonimiza contato (LGPD). Mantém wa_id pra não duplicar tickets.
  const { error } = await sb
    .from("contatos")
    .update({
      nome: `Contato anonimizado #${id.slice(0, 8)}`,
      primeiro_nome: "Contato",
      sobrenome: "Anonimizado",
      email: null,
      telefone: null,
      whatsapp: null,
      empresa: null,
      cidade: null,
      estado: null,
      cep: null,
      cpf: null,
      nascimento: null,
      instagram_pk: null,
      telegram: null,
      foto_url: null,
      custom: { anonimizado: true, anonimizado_em: new Date().toISOString(), anonimizado_por: auth.user.id },
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("agencia_id", u.agencia_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  void audit({
    agenciaId: u.agencia_id,
    usuarioId: auth.user.id,
    acao: "config_change",
    entidade: "contato_sanitizar",
    entidadeId: id,
  });
  return NextResponse.json({ ok: true });
}
