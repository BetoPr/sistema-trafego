import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { PipelinesClient } from "./_client";

export default async function PipelinesPage() {
  const ctx = await requireAuth();
  const sb = createServiceClient();

  const [{ data: quadros }, { data: colunas }, { data: filas }, { data: usuarios }] = await Promise.all([
    sb.from("kanban_quadros").select("id, nome, cor").eq("agencia_id", ctx.agenciaId).is("deleted_at", null).order("criado_em", { ascending: true }),
    sb.from("kanban_colunas").select("id, quadro_id, nome, cor, ordem, notificar_fila_id, notificar_atendente_id").eq("agencia_id", ctx.agenciaId).order("ordem", { ascending: true }),
    sb.from("filas").select("id, nome").eq("agencia_id", ctx.agenciaId).order("nome"),
    sb.from("usuarios").select("id, nome").eq("agencia_id", ctx.agenciaId).is("deleted_at", null).order("nome"),
  ]);

  const pipelines = (quadros || []).map((q) => ({
    id: q.id as string,
    nome: q.nome as string,
    cor: q.cor as string,
    etapas: (colunas || [])
      .filter((c) => c.quadro_id === q.id)
      .map((c) => ({
        id: c.id as string,
        nome: c.nome as string,
        cor: c.cor as string,
        ordem: c.ordem as number,
        notificar_fila_id: (c.notificar_fila_id as string | null) ?? null,
        notificar_atendente_id: (c.notificar_atendente_id as string | null) ?? null,
      })),
  }));

  return (
    <PipelinesClient
      pipelines={pipelines}
      filas={(filas || []).map((f) => ({ id: f.id as string, nome: f.nome as string }))}
      usuarios={(usuarios || []).map((u) => ({ id: u.id as string, nome: u.nome as string }))}
    />
  );
}
