"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUserWithAgencia } from "@/lib/auth";

const ClienteSchema = z.object({
  nome: z.string().trim().min(2, "Nome deve ter no mínimo 2 caracteres.").max(120),
  segmento: z.string().trim().max(80).optional().or(z.literal("")),
  status: z.enum(["ativo", "pausado", "encerrado"]).default("ativo"),
  valor_mensal: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? Number(v.replace(",", ".")) : null))
    .refine((v) => v === null || (!isNaN(v) && v >= 0), "Valor mensal inválido."),
  data_inicio: z.string().optional().or(z.literal("")),
  contato_nome: z.string().trim().max(120).optional().or(z.literal("")),
  contato_email: z.string().trim().email("Email inválido.").optional().or(z.literal("")),
  contato_telefone: z.string().trim().max(40).optional().or(z.literal("")),
  observacoes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type ClienteFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | undefined;

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

function parseForm(formData: FormData) {
  const obj = Object.fromEntries(formData.entries());
  return ClienteSchema.safeParse(obj);
}

function buildPayload(parsed: z.infer<typeof ClienteSchema>) {
  return {
    nome: parsed.nome,
    segmento: parsed.segmento || null,
    status: parsed.status,
    valor_mensal: parsed.valor_mensal,
    data_inicio: parsed.data_inicio || null,
    contato_principal: {
      nome: parsed.contato_nome || null,
      email: parsed.contato_email || null,
      telefone: parsed.contato_telefone || null,
    },
    observacoes: parsed.observacoes || null,
  };
}

export async function criarClienteAction(
  _prev: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Verifique os campos.", fieldErrors };
  }

  const { supabase, usuario } = await requireUserWithAgencia();
  const payload = buildPayload(parsed.data);
  const slugBase = slugify(parsed.data.nome);

  let slug = slugBase;
  let suffix = 1;
  while (true) {
    const { data: existente } = await supabase
      .from("clientes")
      .select("id")
      .eq("agencia_id", usuario.agencia_id)
      .eq("slug", slug)
      .is("deleted_at", null)
      .maybeSingle();
    if (!existente) break;
    suffix += 1;
    slug = `${slugBase}-${suffix}`;
  }

  const { error } = await supabase.from("clientes").insert({
    ...payload,
    slug,
    agencia_id: usuario.agencia_id,
  });

  if (error) return { error: "Erro ao salvar cliente." };

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function atualizarClienteAction(
  id: string,
  _prev: ClienteFormState,
  formData: FormData
): Promise<ClienteFormState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join(".")] = issue.message;
    }
    return { error: "Verifique os campos.", fieldErrors };
  }

  const { supabase } = await requireUserWithAgencia();
  const payload = buildPayload(parsed.data);

  const { error } = await supabase.from("clientes").update(payload).eq("id", id);
  if (error) return { error: "Erro ao atualizar cliente." };

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}/editar`);
  redirect("/clientes");
}

export async function excluirClienteAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { supabase } = await requireUserWithAgencia();
  await supabase.from("clientes").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/clientes");
  redirect("/clientes");
}
