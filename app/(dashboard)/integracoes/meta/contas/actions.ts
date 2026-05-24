"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { verifyPending } from "@/lib/oauth/pending";
import { syncMetaIntegracao } from "@/lib/meta-ads/sync";

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

  // Supabase-js serializa Buffer como JSON ({"type":"Buffer","data":[...]})
  // quando passado direto pra payload. Convertemos manualmente pra hex
  // com prefixo \x — formato literal bytea aceito pelo Postgres.
  const tokenBlob = Buffer.from(pending.access_token_b64, "base64");
  const tokenHex = `\\x${tokenBlob.toString("hex")}`;

  const { data: inserted, error } = await supabase
    .from("integracoes")
    .upsert(
      {
        cliente_id: pending.cliente_id,
        agencia_id: pending.agencia_id,
        plataforma: "meta_ads",
        account_id: account.account_id,
        account_name: account.name,
        access_token_encrypted: tokenHex,
        token_expires_at: new Date(pending.token_expires_at).toISOString(),
        status: "ativa",
        erro_ultima_sync: null,
      },
      { onConflict: "cliente_id,plataforma,account_id" },
    )
    .select("id")
    .single();

  if (error) throw new Error(`Falha ao salvar integração: ${error.message}`);

  cookieStore.delete("meta_pending");

  // Auto-sync ao primeiro link — puxa campanhas/adsets/ads/insights de uma vez
  // pra Mauricio cair no dashboard já com dado. Não bloqueia em caso de erro
  // (Meta API instável, conta sem dado, etc) — apenas loga e segue.
  let syncOk = false;
  if (inserted?.id) {
    try {
      const result = await syncMetaIntegracao(inserted.id);
      syncOk = result.ok;
    } catch (e) {
      console.warn(`auto-sync pos-OAuth falhou: ${(e as Error).message}`);
    }
  }

  revalidatePath("/integracoes");
  revalidatePath("/integracoes/meta");
  revalidatePath("/dashboard");
  revalidatePath("/campanhas");

  if (syncOk) {
    redirect("/dashboard");
  }
  redirect("/integracoes/meta?ok=1");
}

export async function cancelar() {
  const cookieStore = await cookies();
  cookieStore.delete("meta_pending");
  redirect("/integracoes/meta");
}
