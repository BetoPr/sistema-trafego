"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { audit } from "@/lib/crm/audit";

function gerarToken(): { token: string; hash: string; prefix: string } {
  const buf = crypto.randomBytes(32);
  const raw = buf.toString("base64url");
  const token = `sn_mcp_${raw}`;
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const prefix = token.slice(0, 16);
  return { token, hash, prefix };
}

export async function criarTokenMCP(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const nome = String(formData.get("nome") || "").trim() || "MCP Token";
  const diasExpiraRaw = String(formData.get("expira_dias") || "0");
  const diasExpira = Math.max(0, Math.min(3650, Math.round(Number(diasExpiraRaw))));

  const { token, hash, prefix } = gerarToken();
  const sb = createServiceClient();

  await sb.from("mcp_tokens").insert({
    agencia_id: ctx.agenciaId,
    usuario_id: ctx.userId,
    nome,
    token_hash: hash,
    prefix,
    scopes: ["read"],
    expira_em: diasExpira > 0 ? new Date(Date.now() + diasExpira * 86400_000).toISOString() : null,
  });

  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "create", entidade: "mcp_token", payload: { nome, prefix } });
  revalidatePath("/configuracoes/mcp");
  // Mostra o token UMA vez via query string (encoded)
  redirect(`/configuracoes/mcp?token=${encodeURIComponent(token)}`);
}

export async function revogarTokenMCP(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) redirect("/configuracoes/mcp");
  const sb = createServiceClient();
  await sb
    .from("mcp_tokens")
    .update({ ativo: false, revogado_em: new Date().toISOString() })
    .eq("id", id)
    .eq("agencia_id", ctx.agenciaId);
  void audit({ agenciaId: ctx.agenciaId, usuarioId: ctx.userId, acao: "delete", entidade: "mcp_token", entidadeId: id });
  revalidatePath("/configuracoes/mcp");
  redirect("/configuracoes/mcp");
}
