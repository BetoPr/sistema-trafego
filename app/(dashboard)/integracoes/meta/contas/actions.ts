"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { verifyPending } from "@/lib/oauth/pending";

export async function salvarContaSelecionada(formData: FormData) {
  const accountId = String(formData.get("account_id") || "");
  if (!accountId) throw new Error("account_id obrigatório");

  const cookieStore = await cookies();
  const pendingRaw = cookieStore.get("meta_pending")?.value;
  if (!pendingRaw) throw new Error("Conexão expirada — refaça o OAuth");

  const pending = verifyPending(pendingRaw);
  const account = pending.ad_accounts.find((a) => a.account_id === accountId);
  if (!account) throw new Error("Ad account inválida");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.id !== pending.user_id) throw new Error("Usuário mudou — refaça o OAuth");

  // Insere/upsert na tabela integracoes (token já vem criptografado em base64)
  const tokenBlob = Buffer.from(pending.access_token_b64, "base64");

  const { error } = await supabase.from("integracoes").upsert(
    {
      cliente_id: pending.cliente_id,
      agencia_id: pending.agencia_id,
      plataforma: "meta_ads",
      account_id: account.account_id,
      account_name: account.name,
      access_token_encrypted: tokenBlob,
      token_expires_at: new Date(pending.token_expires_at).toISOString(),
      status: "ativa",
      erro_ultima_sync: null,
    },
    { onConflict: "cliente_id,plataforma,account_id" },
  );

  if (error) throw new Error(`Falha ao salvar integração: ${error.message}`);

  // Limpa cookie pending
  cookieStore.delete("meta_pending");

  revalidatePath("/integracoes");
  revalidatePath("/integracoes/meta");
  redirect("/integracoes/meta?ok=1");
}

export async function cancelar() {
  const cookieStore = await cookies();
  cookieStore.delete("meta_pending");
  redirect("/integracoes/meta");
}
