import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { AtendimentosShell } from "./_shell";
import type { TicketLista } from "./_lista";

interface PageProps {
  searchParams: Promise<{ tab?: string; t?: string }>;
}

export const dynamic = "force-dynamic";

export default async function AtendimentosPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const sb = createServiceClient();

  // Carga única: tudo que o shell SPA precisa. Interações seguintes não voltam aqui.
  const [
    { data: tickets },
    { data: canaisAtivos },
    { data: filasAll },
    { data: usuariosAll },
    { data: rapidas },
    { data: todasTags },
    { data: servicosRows },
    { data: agRow },
  ] = await Promise.all([
    sb
      .from("tickets")
      .select("id, numero, status, ultima_mensagem_em, ultima_mensagem_preview, sentimento, contato:contatos(id, nome, whatsapp, foto_url), canal:canais(id, nome, status, instance_id), fila:filas(id, nome, cor)")
      .eq("agencia_id", ctx.agenciaId)
      .order("ultima_mensagem_em", { ascending: false, nullsFirst: false })
      .limit(300),
    sb.from("canais").select("id, nome, status, numero_conectado").eq("agencia_id", ctx.agenciaId).order("nome"),
    sb.from("filas").select("id, nome, cor").eq("agencia_id", ctx.agenciaId).eq("ativa", true).order("nome"),
    sb.from("usuarios").select("id, nome").eq("agencia_id", ctx.agenciaId).eq("ativo", true).is("deleted_at", null).order("nome"),
    sb.from("mensagens_rapidas").select("id, comando, conteudo").eq("agencia_id", ctx.agenciaId).or(`usuario_id.eq.${ctx.userId},global.eq.true`),
    sb.from("etiquetas").select("id, nome, cor, categoria").eq("agencia_id", ctx.agenciaId).eq("ativo", true).order("nome"),
    sb.from("servicos").select("id, nome").eq("agencia_id", ctx.agenciaId).eq("ativo", true).order("nome"),
    sb.from("agencias").select("servicos_habilitados").eq("id", ctx.agenciaId).single(),
  ]);

  const ticketsFlat: TicketLista[] = (tickets || []).map((t) => ({
    id: t.id,
    numero: t.numero,
    status: t.status,
    ultima_mensagem_em: t.ultima_mensagem_em,
    ultima_mensagem_preview: t.ultima_mensagem_preview,
    sentimento: t.sentimento,
    contato: (Array.isArray(t.contato) ? t.contato[0] : t.contato) as TicketLista["contato"],
    canal: (Array.isArray(t.canal) ? t.canal[0] : t.canal) as TicketLista["canal"],
    fila: (Array.isArray(t.fila) ? t.fila[0] : t.fila) as TicketLista["fila"],
  }));

  const initialTab = sp.tab === "pendente" || sp.tab === "fechado" ? sp.tab : "aberto";

  return (
    <AtendimentosShell
      ticketsIniciais={ticketsFlat}
      canais={(canaisAtivos || []).map((c) => ({ id: c.id, nome: c.nome, status: c.status, numero_conectado: c.numero_conectado }))}
      filas={(filasAll || []) as Array<{ id: string; nome: string; cor?: string | null }>}
      usuarios={(usuariosAll || []) as Array<{ id: string; nome: string }>}
      mensagensRapidas={(rapidas || []) as Array<{ id: string; comando: string; conteudo: string }>}
      todasEtiquetas={(todasTags || []) as Array<{ id: string; nome: string; cor: string; categoria: "etiqueta" | "flag" }>}
      servicos={(servicosRows || []) as Array<{ id: string; nome: string }>}
      servicosHabilitados={!!(agRow as { servicos_habilitados?: boolean } | null)?.servicos_habilitados}
      userNomeMap={Object.fromEntries((usuariosAll || []).map((u) => [u.id, u.nome]))}
      initialTicketId={sp.t}
      initialTab={initialTab}
    />
  );
}
