"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { encryptToken, bufferToBytea } from "@/lib/crypto/tokens";
import { audit } from "@/lib/crm/audit";

const MASK = "•••GUARDADO•••";

export async function salvarChavesIA(formData: FormData) {
  const ctx = await requireAdmin();
  const groq = String(formData.get("groq_key") || "").trim();
  const openai = String(formData.get("openai_key") || "").trim();
  const anthropic = String(formData.get("anthropic_key") || "").trim();

  const sb = createServiceClient();

  // Upsert configuracoes_agencia (UNIQUE em agencia_id)
  const { data: existente } = await sb
    .from("configuracoes_agencia")
    .select("id")
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();

  const patch: Record<string, unknown> = {
    agencia_id: ctx.agenciaId,
    updated_at: new Date().toISOString(),
  };
  if (groq && groq !== MASK) patch.groq_key_encrypted = bufferToBytea(encryptToken(groq));
  if (openai && openai !== MASK) patch.openai_key_encrypted = bufferToBytea(encryptToken(openai));
  if (anthropic && anthropic !== MASK) patch.anthropic_key_encrypted = bufferToBytea(encryptToken(anthropic));

  if (existente) {
    await sb.from("configuracoes_agencia").update(patch).eq("id", existente.id);
  } else {
    await sb.from("configuracoes_agencia").insert(patch);
  }

  await audit({
    agenciaId: ctx.agenciaId,
    usuarioId: ctx.userId,
    acao: "config_change",
    entidade: "chaves_ia",
    payload: {
      groq_alterada: !!(groq && groq !== MASK),
      openai_alterada: !!(openai && openai !== MASK),
      anthropic_alterada: !!(anthropic && anthropic !== MASK),
    },
  });

  revalidatePath("/configuracoes/ia");
  redirect("/configuracoes/ia?ok=salvo");
}

export async function testarGroq() {
  const ctx = await requireAdmin();
  const sb = createServiceClient();

  const { data } = await sb
    .from("configuracoes_agencia")
    .select("groq_key_encrypted")
    .eq("agencia_id", ctx.agenciaId)
    .maybeSingle();

  if (!data?.groq_key_encrypted) {
    redirect("/configuracoes/ia?erro=sem_chave");
  }

  try {
    const { decryptToken, byteaToBuffer } = await import("@/lib/crypto/tokens");
    const apiKey = decryptToken(byteaToBuffer(data.groq_key_encrypted));

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Diga apenas: OK" }],
        max_tokens: 10,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      redirect(`/configuracoes/ia?erro=teste_falhou&msg=${encodeURIComponent(j.error?.message || r.statusText)}`);
    }
    const reply = j.choices?.[0]?.message?.content || "(vazio)";
    redirect(`/configuracoes/ia?ok=teste&msg=${encodeURIComponent(`Groq respondeu: "${reply}"`)}`);
  } catch (e) {
    redirect(`/configuracoes/ia?erro=teste_falhou&msg=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`);
  }
}
