"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { syncMetaIntegracao } from "@/lib/meta-ads/sync";
import { decryptToken, encryptToken, byteaToBuffer, bufferToBytea } from "@/lib/crypto/tokens";

export async function sincronizar(integracaoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Confirma que integração pertence à agência do usuário (RLS check)
  const { data: integ } = await supabase
    .from("integracoes")
    .select("id, agencia_id")
    .eq("id", integracaoId)
    .single();
  if (!integ) throw new Error("Integração não encontrada");

  const result = await syncMetaIntegracao(integracaoId);

  revalidatePath("/integracoes/meta");
  revalidatePath("/dashboard");
  revalidatePath("/campanhas");
  revalidatePath("/criativos");

  if (!result.ok) {
    redirect(`/integracoes/meta?erro=sync_failed&msg=${encodeURIComponent(result.erro || "—")}`);
  }
  redirect(
    `/integracoes/meta?ok=sync&campanhas=${result.campanhas}&anuncios=${result.anuncios}&metricas=${result.metricas}`,
  );
}

export async function desconectar(integracaoId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("integracoes")
    .delete()
    .eq("id", integracaoId)
    .eq("plataforma", "meta_ads");

  if (error) throw new Error(`Falha ao desconectar: ${error.message}`);

  revalidatePath("/integracoes");
  revalidatePath("/integracoes/meta");
}

/**
 * Busca Pages do usuario via Graph /me/accounts (precisa pages_show_list +
 * pages_read_engagement). Cada page tem access_token proprio.
 * Salva em integracoes.metadata.pages como [{id, name, access_token_encrypted}].
 * Necessario pra webhook leadgen — Page tokens consultam /{lead_id}.
 */
export async function sincronizarPagesMeta(integracaoId: string): Promise<{ ok: boolean; pages?: number; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "nao autenticado" };

  const sb = createServiceClient();
  const { data: integ } = await sb
    .from("integracoes")
    .select("id, agencia_id, access_token_encrypted, metadata")
    .eq("id", integracaoId)
    .eq("plataforma", "meta_ads")
    .maybeSingle<{ id: string; agencia_id: string; access_token_encrypted: unknown; metadata: Record<string, unknown> | null }>();
  if (!integ) return { ok: false, erro: "integracao nao encontrada" };

  let userToken: string;
  try {
    userToken = decryptToken(byteaToBuffer(integ.access_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
  } catch {
    return { ok: false, erro: "token corrompido" };
  }

  const url = new URL("https://graph.facebook.com/v21.0/me/accounts");
  url.searchParams.set("fields", "id,name,access_token");
  url.searchParams.set("access_token", userToken);
  const res = await fetch(url.toString(), { cache: "no-store" });
  const j = await res.json();
  if (!res.ok || j.error) return { ok: false, erro: j.error?.message || res.statusText };

  const pages = (j.data as Array<{ id: string; name: string; access_token: string }> | undefined) || [];
  const encriptadas = pages.map((p) => ({
    id: p.id,
    name: p.name,
    access_token_encrypted: bufferToBytea(encryptToken(p.access_token)),
  }));

  const newMeta = { ...(integ.metadata || {}), pages: encriptadas };
  await sb.from("integracoes").update({ metadata: newMeta }).eq("id", integ.id);

  revalidatePath("/integracoes/meta");
  return { ok: true, pages: pages.length };
}
