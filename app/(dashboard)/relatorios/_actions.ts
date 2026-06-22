"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUserWithAgencia } from "@/lib/auth";

type Frequencia = "diario" | "semanal" | "mensal";
type Plataforma = "meta_ads" | "google_ads";
type Formato = "pdf" | "imagem" | "texto";

interface PayloadRelatorio {
  nome: string;
  cliente_id: string | null;
  telefone_destino: string | null;
  canal_id: string | null;
  plataforma: Plataforma;
  frequencia: Frequencia;
  dia_semana: number | null;
  dia_mes: number | null;
  hora_envio: string; // "HH:MM"
  formato: Formato;
  periodo_dias: number;
}

function parsePayload(formData: FormData): PayloadRelatorio | { erro: string } {
  const nome = String(formData.get("nome") || "").trim();
  if (!nome) return { erro: "Nome obrigatório" };

  const cliente_id = String(formData.get("cliente_id") || "").trim() || null;
  const telefone_destino = String(formData.get("telefone_destino") || "").trim() || null;
  if (!cliente_id && !telefone_destino) return { erro: "Informe um cliente ou telefone" };

  const canal_id = String(formData.get("canal_id") || "").trim() || null;
  const plataforma = (String(formData.get("plataforma") || "meta_ads") as Plataforma);
  const frequencia = String(formData.get("frequencia") || "semanal") as Frequencia;
  if (!["diario", "semanal", "mensal"].includes(frequencia)) return { erro: "Frequência inválida" };

  const diaSemanaRaw = formData.get("dia_semana");
  const dia_semana = diaSemanaRaw !== null && diaSemanaRaw !== "" ? Number(diaSemanaRaw) : null;
  const diaMesRaw = formData.get("dia_mes");
  const dia_mes = diaMesRaw !== null && diaMesRaw !== "" ? Number(diaMesRaw) : null;

  // Aceita HH:MM ou H:MM (input type=time as vezes manda sem zero-padding).
  let hora_envio = String(formData.get("hora_envio") || "09:00").trim();
  const m = hora_envio.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return { erro: "Hora de envio inválida (use HH:MM)" };
  const hh = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  hora_envio = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;

  const formato = (String(formData.get("formato") || "pdf") as Formato);
  if (!["pdf", "imagem", "texto"].includes(formato)) return { erro: "Formato inválido" };

  const periodo_dias = Number(formData.get("periodo_dias") || 7);
  if (!Number.isFinite(periodo_dias) || periodo_dias < 1 || periodo_dias > 90) {
    return { erro: "Período de dados inválido (1–90)" };
  }

  return {
    nome,
    cliente_id,
    telefone_destino,
    canal_id,
    plataforma,
    frequencia,
    dia_semana: frequencia === "semanal" ? dia_semana : null,
    dia_mes: frequencia === "mensal" ? dia_mes : null,
    hora_envio,
    formato,
    periodo_dias,
  };
}

/** Calcula o próximo envio baseado em frequência + hora + dia. Retorna ISO. */
function calcularProximoEnvio(p: PayloadRelatorio): string {
  const agora = new Date();
  const [h, m] = p.hora_envio.split(":").map(Number);
  const proximo = new Date(agora);
  proximo.setHours(h, m, 0, 0);

  if (p.frequencia === "diario") {
    if (proximo <= agora) proximo.setDate(proximo.getDate() + 1);
  } else if (p.frequencia === "semanal") {
    const alvo = p.dia_semana ?? 1;
    let diff = (alvo - proximo.getDay() + 7) % 7;
    if (diff === 0 && proximo <= agora) diff = 7;
    proximo.setDate(proximo.getDate() + diff);
  } else {
    const alvo = p.dia_mes ?? 1;
    proximo.setDate(alvo);
    if (proximo <= agora) proximo.setMonth(proximo.getMonth() + 1);
  }
  return proximo.toISOString();
}

export async function criarRelatorio(formData: FormData) {
  const { supabase, usuario } = await requireUserWithAgencia();
  const p = parsePayload(formData);
  if ("erro" in p) {
    redirect(`/relatorios?erro=${encodeURIComponent(p.erro)}`);
  }
  const proximo = calcularProximoEnvio(p);
  const { error } = await supabase.from("relatorios_agendados").insert({
    agencia_id: usuario.agencia_id,
    ...p,
    proximo_envio: proximo,
  });
  if (error) {
    redirect(`/relatorios?erro=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/relatorios");
  redirect("/relatorios?ok=criado");
}

export async function atualizarRelatorio(id: string, formData: FormData) {
  const { supabase, usuario } = await requireUserWithAgencia();
  const p = parsePayload(formData);
  if ("erro" in p) {
    redirect(`/relatorios?editar=${id}&erro=${encodeURIComponent(p.erro)}`);
  }
  const proximo = calcularProximoEnvio(p);
  const { error } = await supabase
    .from("relatorios_agendados")
    .update({ ...p, proximo_envio: proximo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agencia_id", usuario.agencia_id);
  if (error) {
    redirect(`/relatorios?editar=${id}&erro=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/relatorios");
  redirect("/relatorios?ok=atualizado");
}

export async function alternarAtivoRelatorio(id: string, ativo: boolean) {
  const { supabase, usuario } = await requireUserWithAgencia();
  await supabase
    .from("relatorios_agendados")
    .update({ ativo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agencia_id", usuario.agencia_id);
  revalidatePath("/relatorios");
}

export async function deletarRelatorio(id: string) {
  const { supabase, usuario } = await requireUserWithAgencia();
  await supabase
    .from("relatorios_agendados")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("agencia_id", usuario.agencia_id);
  revalidatePath("/relatorios");
  redirect("/relatorios?ok=deletado");
}
