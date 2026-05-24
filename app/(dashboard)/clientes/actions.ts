"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserWithAgencia } from "@/lib/auth";

const ClienteSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres.").max(120),
  segmento: z.string().trim().max(80).optional().or(z.literal("")),
  status: z.enum(["ativo", "pausado", "encerrado"]).optional(),
  valor_mensal: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((v) => {
      if (!v) return null;
      const n = Number(v.replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }),
  observacoes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type ClienteFormState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function slugify(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function criarClienteAction(
  _prev: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  const parsed = ClienteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[issue.path.join(".")] = issue.message;
    return { error: "Verifique os campos.", fieldErrors };
  }

  const { supabase, usuario } = await requireUserWithAgencia();
  const slugBase = slugify(parsed.data.nome);

  let slug = slugBase;
  let suffix = 1;
  while (true) {
    const { data } = await supabase
      .from("clientes")
      .select("id")
      .eq("agencia_id", usuario.agencia_id)
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();
    if (!data) break;
    suffix += 1;
    slug = `${slugBase}-${suffix}`;
  }

  const { error } = await supabase.from("clientes").insert({
    agencia_id: usuario.agencia_id,
    nome: parsed.data.nome,
    slug,
    segmento: parsed.data.segmento || null,
    status: parsed.data.status ?? "ativo",
    valor_mensal: parsed.data.valor_mensal,
    observacoes: parsed.data.observacoes || null,
  });

  if (error) return { error: `Erro ao salvar cliente: ${error.message}` };

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function editarClienteAction(
  clienteId: string,
  _prev: ClienteFormState,
  formData: FormData,
): Promise<ClienteFormState> {
  const parsed = ClienteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues)
      fieldErrors[issue.path.join(".")] = issue.message;
    return { error: "Verifique os campos.", fieldErrors };
  }

  const { supabase } = await requireUserWithAgencia();

  const { error } = await supabase
    .from("clientes")
    .update({
      nome: parsed.data.nome,
      segmento: parsed.data.segmento || null,
      status: parsed.data.status ?? "ativo",
      valor_mensal: parsed.data.valor_mensal,
      observacoes: parsed.data.observacoes || null,
    })
    .eq("id", clienteId)
    .is("deleted_at", null);

  if (error) return { error: `Erro ao atualizar cliente: ${error.message}` };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  redirect(`/clientes/${clienteId}`);
}

export async function excluirClienteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!id) return;
  // Confirmação defensiva: campo confirm deve trazer "delete-<id>" (preenchido
  // por handler client-side com window.confirm). Sem isso, ignora.
  if (confirm !== `delete-${id}`) return;

  const { supabase } = await requireUserWithAgencia();
  await supabase
    .from("clientes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);

  revalidatePath("/clientes");
  redirect("/clientes");
}
