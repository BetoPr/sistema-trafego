import { requireSuperAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import ComunicacaoClient from "./_client";

export const dynamic = "force-dynamic";

export default async function ComunicacaoPage() {
  await requireSuperAdmin();
  const sb = createServiceClient();

  const [{ data: cfg }, { data: canais }, { data: broadcasts }] = await Promise.all([
    sb.from("super_admin_onda_zero_config").select("canal_sistema_id, whatsapp_grupo_link, mensagem_convite").eq("id", 1).maybeSingle(),
    sb.from("canais").select("id, nome, status, numero_conectado, agencia_id, agencias(nome)").order("created_at", { ascending: false }),
    sb.from("super_admin_broadcasts").select("id, titulo, audiencia, status, total_alvos, total_enviados, total_erros, criado_em, iniciado_em, concluido_em").order("criado_em", { ascending: false }).limit(30),
  ]);

  const canaisLista = (canais || []).map((c) => ({
    id: c.id as string,
    nome: c.nome as string,
    status: c.status as string,
    numero: (c.numero_conectado as string | null) || "—",
    agencia_nome: (c as { agencias?: { nome?: string } | null }).agencias?.nome || "—",
  }));

  const totalOndaZero = await sb.from("agencias").select("id", { count: "exact", head: true }).eq("onda_zero_membro", true).then((r) => r.count || 0);
  const filaPendente = await sb.from("onda_zero_envios").select("id", { count: "exact", head: true }).eq("status", "pendente").then((r) => r.count || 0);

  return (
    <ComunicacaoClient
      configInicial={{
        canalSistemaId: (cfg?.canal_sistema_id as string | null) ?? null,
        whatsappGrupoLink: (cfg?.whatsapp_grupo_link as string | null) ?? "",
        mensagemConvite: (cfg?.mensagem_convite as string | null) ?? "",
      }}
      canais={canaisLista}
      broadcasts={(broadcasts || []) as Array<{
        id: string; titulo: string; audiencia: string; status: string;
        total_alvos: number; total_enviados: number; total_erros: number;
        criado_em: string; iniciado_em: string | null; concluido_em: string | null;
      }>}
      stats={{ totalOndaZero, filaPendente }}
    />
  );
}
