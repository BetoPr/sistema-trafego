"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type LoginState = { error?: string } | undefined;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email e senha são obrigatórios." };
  }

  const supabase = await createClient();
  const { data: signed, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !signed?.user) {
    return { error: "Credenciais inválidas." };
  }

  // Bloqueio de acesso por inadimplência (não bloqueia super_admin)
  const svc = createServiceClient();
  const { data: u } = await svc
    .from("usuarios")
    .select("role, agencia_id, ativo, deleted_at, agencia:agencias(acesso_bloqueado, nome)")
    .eq("id", signed.user.id)
    .maybeSingle();

  if (!u) {
    await supabase.auth.signOut();
    return { error: "Usuário não encontrado no sistema." };
  }
  if (u.deleted_at) {
    await supabase.auth.signOut();
    return { error: "Acesso excluído. Fale com o suporte." };
  }
  if (!u.ativo) {
    await supabase.auth.signOut();
    return { error: "Acesso desativado pelo administrador." };
  }

  const agencia = Array.isArray(u.agencia) ? u.agencia[0] : u.agencia;
  const bloqueada = agencia && (agencia as { acesso_bloqueado?: boolean }).acesso_bloqueado;

  if (bloqueada && u.role !== "super_admin") {
    await supabase.auth.signOut();
    return {
      error:
        "Acesso suspenso por mensalidade pendente. Regularize pelo WhatsApp (https://wa.me/5581991594716) e tente novamente.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
