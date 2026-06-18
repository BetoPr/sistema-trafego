import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  return { supabase, user };
}

export async function requireUserWithAgencia() {
  const { supabase, user } = await requireUser();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, nome, email, role, agencia_id, avatar_url, agencias(id, nome, slug, branding)")
    .eq("id", user.id)
    .single();

  if (!usuario) redirect("/login");
  return { supabase, user, usuario };
}
