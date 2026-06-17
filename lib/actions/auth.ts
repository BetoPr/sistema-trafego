"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function signOutAction() {
  const supabase = await createClient();
  // Carimba ultima saida no CRM antes de derrubar a sessao
  const { data: auth } = await supabase.auth.getUser();
  if (auth?.user) {
    try {
      await createServiceClient()
        .from("usuarios")
        .update({ online: false, ultimo_logout: new Date().toISOString() })
        .eq("id", auth.user.id);
    } catch { /* nao bloqueia logout se falhar */ }
  }
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
