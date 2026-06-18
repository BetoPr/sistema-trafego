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

/**
 * Menus REAIS do CRM (com rótulo). É a fonte única pro formulário de permissões.
 * `soSuper: true` = só aparece quando quem está criando é super_admin
 * (admin vê menos quadros). Mantido separado da PERMISSOES_MENU legada acima.
 */
export interface MenuPermissaoDef {
  key: string;
  label: string;
  soSuper?: boolean;
}
export const MENU_PERMISSOES: MenuPermissaoDef[] = [
  { key: "atendimentos", label: "Atendimentos" },
  { key: "follow_up", label: "Follow-up" },
  { key: "contatos", label: "Contatos" },
  { key: "ia", label: "IA de Atendimento" },
  { key: "envio_massa", label: "Envio em Massa" },
  { key: "mensagens_rapidas", label: "Mensagens Rápidas" },
  { key: "grupos", label: "Grupos" },
  { key: "canais", label: "Canais (WhatsApp)" },
  { key: "filas", label: "Filas" },
  { key: "equipes", label: "Equipes" },
  { key: "etiquetas", label: "Etiquetas" },
  { key: "configuracoes", label: "Configurações" },
  // Só super_admin pode conceder:
  { key: "relatorios", label: "Relatórios (Ads)", soSuper: true },
  { key: "cobrancas", label: "Cobranças", soSuper: true },
  { key: "webhooks", label: "Webhooks", soSuper: true },
];

/** Lista de menus que quem tem esse role pode conceder a outros usuários. */
export function menusVisiveis(role: UserRole): MenuPermissaoDef[] {
  return MENU_PERMISSOES.filter((m) => role === "super_admin" || !m.soSuper);
}
