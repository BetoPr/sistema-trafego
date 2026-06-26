/**
 * POST /api/signup
 *
 * Cria conta nova vinda da LP (lp.sonarcrm.com.br) ou da pagina /cadastro do CRM.
 * Fluxo:
 *   1. Valida payload (nome, email, whatsapp, password, perfil)
 *   2. Cria agencia com tipo_cliente + trial_acaba_em + apagar_em
 *   3. Cria auth user no Supabase
 *   4. Cria registro usuarios.role = 'admin' linkado a agencia
 *   5. Retorna 200 com { agencia_id, trial_acaba_em, redirect_url }
 *
 * Cors aberto pra LP standalone bater nesse endpoint.
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  calcularTrialAcabaEm,
  calcularApagarEm,
  type TipoCliente,
} from "@/lib/auth/trial";

const PERFIS_VALIDOS: TipoCliente[] = ["empreendedor", "autonomo", "agencia"];

function corsHeaders(origin: string | null) {
  // Lista permissiva: LP standalone (sonarcrm.com.br, lp.sonarcrm.com.br) + dev local.
  const permitidos = [
    "https://sonarcrm.com.br",
    "https://www.sonarcrm.com.br",
    "https://lp.sonarcrm.com.br",
    "http://localhost:3000",
    "http://127.0.0.1:5500",
    "null", // file:// abre como Origin: null
  ];
  const allow = origin && permitidos.includes(origin) ? origin : permitidos[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
  };
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

type SignupPayload = {
  nome?: string;
  email?: string;
  whatsapp?: string;
  password?: string;
  perfil?: string;
};

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);

  let body: SignupPayload;
  try {
    body = (await req.json()) as SignupPayload;
  } catch {
    return NextResponse.json({ error: "Payload inválido." }, { status: 400, headers: cors });
  }

  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const whatsapp = String(body.whatsapp ?? "").trim();
  const password = String(body.password ?? "");
  const perfilRaw = String(body.perfil ?? "").trim().toLowerCase();

  if (!nome || nome.length < 2) {
    return NextResponse.json({ error: "Informe seu nome completo." }, { status: 400, headers: cors });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400, headers: cors });
  }
  if (!whatsapp || whatsapp.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "WhatsApp inválido." }, { status: 400, headers: cors });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Senha deve ter pelo menos 8 caracteres." }, { status: 400, headers: cors });
  }
  if (!PERFIS_VALIDOS.includes(perfilRaw as TipoCliente)) {
    return NextResponse.json({ error: "Perfil inválido." }, { status: 400, headers: cors });
  }

  const perfil = perfilRaw as TipoCliente;
  const svc = createServiceClient();

  // Verifica se email ja existe.
  const { data: jaExiste } = await svc
    .from("usuarios")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (jaExiste) {
    return NextResponse.json(
      { error: "Já existe uma conta com esse email. Faça login." },
      { status: 409, headers: cors },
    );
  }

  // 1. Cria agencia com trial.
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
    console.error("[signup] erro criar agencia:", errAgencia);
    return NextResponse.json(
      { error: "Erro ao criar agência. Tente novamente." },
      { status: 500, headers: cors },
    );
  }

  // 2. Cria auth user.
  const { data: authData, error: errAuth } = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nome, whatsapp, perfil },
  });

  if (errAuth || !authData?.user) {
    console.error("[signup] erro criar auth user:", errAuth);
    // Rollback agencia.
    await svc.from("agencias").delete().eq("id", agencia.id);
    return NextResponse.json(
      { error: "Erro ao criar usuário. Tente novamente." },
      { status: 500, headers: cors },
    );
  }

  // 3. Cria registro em usuarios linkado a agencia.
  const { error: errUsuario } = await svc.from("usuarios").insert({
    id: authData.user.id,
    nome,
    email,
    whatsapp,
    agencia_id: agencia.id,
    role: "admin",
    ativo: true,
  });

  if (errUsuario) {
    console.error("[signup] erro criar usuario:", errUsuario);
    await svc.auth.admin.deleteUser(authData.user.id);
    await svc.from("agencias").delete().eq("id", agencia.id);
    return NextResponse.json(
      { error: "Erro ao concluir cadastro." },
      { status: 500, headers: cors },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      agencia_id: agencia.id,
      tipo_cliente: perfil,
      trial_acaba_em: trialAcabaEm.toISOString(),
      redirect_url: "https://sonarcrm.com.br/login?signup=ok",
    },
    { status: 200, headers: cors },
  );
}
