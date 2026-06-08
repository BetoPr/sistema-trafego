/**
 * Helpers de permissão server-side.
 * Use em route handlers, server actions e server components antes
 * de qualquer mutação ou leitura sensível.
 */
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "super_admin" | "admin" | "atendente";

export interface AuthCtx {
  userId: string;
  email: string;
  agenciaId: string;
  role: UserRole;
  nome: string;
}

/**
 * Verifica usuário autenticado e retorna contexto.
 * Redireciona pra /login se não autenticado.
 */
export async function requireAuth(): Promise<AuthCtx> {
  const supabase = await createClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData?.user) {
    redirect("/login");
  }

  const { data: u } = await supabase
    .from("usuarios")
    .select("agencia_id, role, nome, email")
    .eq("id", userData.user.id)
    .single();

  if (!u) {
    redirect("/login?erro=usuario_nao_encontrado");
  }

  return {
    userId: userData.user.id,
    email: u.email,
    agenciaId: u.agencia_id,
    role: u.role as UserRole,
    nome: u.nome,
  };
}

export async function requireRole(...roles: UserRole[]): Promise<AuthCtx> {
  const ctx = await requireAuth();
  if (!roles.includes(ctx.role)) {
    redirect("/?erro=permissao_negada");
  }
  return ctx;
}

export async function requireSuperAdmin(): Promise<AuthCtx> {
  return requireRole("super_admin");
}

export async function requireAdmin(): Promise<AuthCtx> {
  // super_admin tem todos privilégios de admin.
  return requireRole("super_admin", "admin");
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === "super_admin";
}

export function isAdmin(role: UserRole): boolean {
  return role === "admin" || role === "super_admin";
}

export const PERMISSOES_MENU = [
  "envio_massa",
  "grupos",
  "chat_privado",
  "kanban",
  "tarefas",
  "sessoes",
  "relatorios",
  "filas",
  "equipes",
  "mensagens_rapidas",
  "chatbot",
  "agendamentos",
  "aniversarios",
  "fechamento",
  "etiquetas",
  "notas",
  "protocolos",
  "avaliacoes",
  "horario_atendimento",
  "campanhas",
  "contatos",
  "google_calendar",
] as const;

export type PermissaoMenu = (typeof PERMISSOES_MENU)[number];
