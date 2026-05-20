"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
