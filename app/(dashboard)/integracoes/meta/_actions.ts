"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syncMetaIntegracao } from "@/lib/meta-ads/sync";

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
