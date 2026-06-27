/**
 * POST /api/oauth-bootstrap
 *
 * Chamado pelo /auth/callback (client) APOS o exchange ter rolado no browser.
 * O cookie de sessao ja existe nesse ponto, entao getUser() retorna user logado.
 *
 * Se primeiro acesso:
 *   - cria agencia (tipo_cliente do perfil da query / body)
 *   - cria usuario admin linkado
 *
 * Se ja existe: confere se a agencia esta bloqueada.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  calcularTrialAcabaEm,
  calcularApagarEm,
  type TipoCliente,
} from "@/lib/auth/trial";

const PERFIS_VALIDOS: TipoCliente[] = ["autonomo", "agencia"];

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sem sessão." }, { status: 401 });
  }

  const svc = createServiceClient();

  // Ja existe?
  const { data: existente } = await svc
    .from("usuarios")
    .select("id, agencia_id, agencia:agencias(acesso_bloqueado)")
    .eq("id", user.id)
    .maybeSingle();

  if (existente) {
    const ag = Array.isArray(existente.agencia) ? existente.agencia[0] : existente.agencia;
    const bloqueado = !!(ag && (ag as { acesso_bloqueado?: boolean }).acesso_bloqueado);
    return NextResponse.json({ ok: true, ja_existia: true, acesso_bloqueado: bloqueado });
  }

  // Novo: cria agencia + usuario
  let body: { perfil?: string } = {};
  try { body = await req.json(); } catch { /* sem body */ }
  const perfilRaw = String(body.perfil ?? "").toLowerCase();
  const perfil = (PERFIS_VALIDOS.includes(perfilRaw as TipoCliente) ? perfilRaw : "autonomo") as TipoCliente;

  const nome =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email ||
    "Usuário";
  const email = user.email || "";

  const agora = new Date();
  const trialAcabaEm = calcularTrialAcabaEm(perfil, agora);
  const apagarEm = calcularApagarEm(trialAcabaEm);

  const { data: agencia, error: errAgencia } = await svc
    .from("agencias")
    .insert({
      nome: perfil === "agencia" ? `Agência de ${nome.split(" ")[0]}` : nome,
      tipo_cliente: perfil,
      trial_acaba_em: trialAcabaEm.toISOString(),
      apagar_em: apagarEm.toISOString(),
      acesso_bloqueado: false,
      criada_em: agora.toISOString(),
    })
    .select("id")
    .single();

  if (errAgencia || !agencia) {
    console.error("[oauth-bootstrap] agencia:", errAgencia);
    return NextResponse.json({
      error: "Falha ao criar agência.",
      details: errAgencia?.message ?? null,
      code: errAgencia?.code ?? null,
      hint: errAgencia?.hint ?? null,
      stage: "insert_agencia",
    }, { status: 500 });
  }

  const { error: errUsuario } = await svc.from("usuarios").insert({
    id: user.id,
    nome,
    email,
    agencia_id: agencia.id,
    role: "admin",
    ativo: true,
  });

  if (errUsuario) {
    console.error("[oauth-bootstrap] usuario:", errUsuario);
    await svc.from("agencias").delete().eq("id", agencia.id);
    return NextResponse.json({
      error: "Falha ao criar usuário.",
      details: errUsuario.message,
      code: errUsuario.code ?? null,
      hint: errUsuario.hint ?? null,
      stage: "insert_usuario",
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true, criado: true, perfil });
}
