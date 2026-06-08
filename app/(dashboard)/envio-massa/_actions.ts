"use server";

import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText } from "@/lib/uazapi/client";
import { audit } from "@/lib/crm/audit";

export async function enviarTextoEmMassa(formData: FormData) {
  const ctx = await requireAuth();
  const canalId = String(formData.get("canal_id") || "");
  const mensagem = String(formData.get("mensagem") || "").trim();
  const numerosRaw = String(formData.get("numeros") || "");
  const minDelay = Number(formData.get("min_delay") || 1);
  const maxDelay = Number(formData.get("max_delay") || 3);

  const numeros = numerosRaw.split(/[\n,]/).map((n) => n.replace(/\D/g, "")).filter((n) => n.length >= 10);
  if (!canalId || !mensagem || numeros.length === 0) {
    redirect("/envio-massa?erro=campos");
  }

  const sb = createServiceClient();
  const { data: canal } = await sb
    .from("canais")
    .select("id, agencia_id, instance_token_encrypted, status, servidor:super_admin_servidores(base_url)")
    .eq("id", canalId)
    .eq("agencia_id", ctx.agenciaId)
    .single();
  if (!canal || canal.status !== "connected") redirect("/envio-massa?erro=canal_invalido");

  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));

  // Dispara em background — não bloqueia a página.
  void (async () => {
    let ok = 0;
    let falhas = 0;
    for (const n of numeros) {
      try {
        const personalizada = mensagem.replace(/\[nome\]/gi, "");
        await instanceSendText({ baseUrl, token }, { number: n, text: personalizada, delay: 0 });
        ok++;
      } catch (e) {
        falhas++;
        console.error("[envio-massa]", n, e);
      }
      const wait = (minDelay + Math.random() * Math.max(0, maxDelay - minDelay)) * 1000;
      await new Promise((r) => setTimeout(r, wait));
    }
    await audit({
      agenciaId: ctx.agenciaId,
      usuarioId: ctx.userId,
      acao: "send_message",
      entidade: "envio_massa",
      payload: { total: numeros.length, ok, falhas },
    });
  })();

  redirect(`/envio-massa?ok=disparado`);
}
