/**
 * GET /auth/callback
 *
 * Recebe o code de OAuth Google (Supabase Auth) e troca por session.
 * Apos session criada:
 *   1. Verifica se ja existe registro em `usuarios` com user.id
 *   2. Se NAO existe: cria agencia (com tipo_cliente da query) + usuarios.admin
 *   3. Redireciona pra /dashboard
 *
 * Query params:
 *   - code: codigo OAuth (Supabase passa automatico)
 *   - perfil: empreendedor | autonomo | agencia (passado no signInWithOAuth)
 *   - next: rota destino apos login (default /dashboard)
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  calcularTrialAcabaEm,
  calcularApagarEm,
  type TipoCliente,
} from "@/lib/auth/trial";

const PERFIS_VALIDOS: TipoCliente[] = ["empreendedor", "autonomo", "agencia"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const perfilRaw = url.searchParams.get("perfil");
  const next = url.searchParams.get("next") || "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?erro=oauth_sem_code", req.url));
  }

  const supabase = await createClient();
  const { data: sessionData, error: errSession } = await supabase.auth.exchangeCodeForSession(code);

  if (errSession || !sessionData?.user) {
    console.error("[oauth/callback] exchange falhou:", errSession);
    return NextResponse.redirect(new URL("/login?erro=oauth_falhou", req.url));
  }

  const user = sessionData.user;
  const svc = createServiceClient();

  // Verifica se ja existe usuario no banco
  const { data: existente } = await svc
    .from("usuarios")
    .select("id, agencia_id, agencia:agencias(acesso_bloqueado)")
    .eq("id", user.id)
    .maybeSingle();

  // Ja existe: so confere bloqueio e redireciona
  if (existente) {
    const agencia = Array.isArray(existente.agencia) ? existente.agencia[0] : existente.agencia;
    if (agencia && (agencia as { acesso_bloqueado?: boolean }).acesso_bloqueado) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL("/login?erro=acesso_bloqueado", req.url));
    }
    return NextResponse.redirect(new URL(next, req.url));
  }

  // Novo usuario: precisa criar agencia + usuario
  const perfil = (PERFIS_VALIDOS.includes(perfilRaw as TipoCliente) ? perfilRaw : "empreendedor") as TipoCliente;
  const nome = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || user.email || "Usuário";
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
    console.error("[oauth/callback] erro criar agencia:", errAgencia);
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?erro=signup_falhou", req.url));
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
    console.error("[oauth/callback] erro criar usuario:", errUsuario);
    await svc.from("agencias").delete().eq("id", agencia.id);
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?erro=signup_falhou", req.url));
  }

  return NextResponse.redirect(new URL(`${next}?welcome=1`, req.url));
}
