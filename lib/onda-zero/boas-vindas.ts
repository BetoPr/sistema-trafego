/**
 * Enfileiramento + envio de boas-vindas Onda Zero via canal sistema.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { getProvider } from "@/lib/whatsapp";
import type { ProviderTipo } from "@/lib/whatsapp/provider";

/**
 * Adiciona destinatario na fila de boas-vindas Onda Zero.
 * Idempotente: tabela tem UNIQUE(agencia_id), entao tentativas duplicadas ignoram.
 */
export async function enfileirarBoasVindasOndaZero(
  agenciaId: string,
  nome: string,
  whatsapp: string,
): Promise<void> {
  if (!whatsapp || !whatsapp.replace(/\D/g, "")) return;
  const sb = createServiceClient();
  await sb
    .from("onda_zero_envios")
    .insert({
      agencia_id: agenciaId,
      destinatario_whatsapp: whatsapp.replace(/\D/g, ""),
      destinatario_nome: nome,
      status: "pendente",
    });
  // Se ja existe, insert falha em UNIQUE — ignorado de proposito.
}

/**
 * Constroi a mensagem de boas-vindas.
 * Placeholders {nome}, {membro_n}, {limite}, {link_grupo}.
 */
function renderMensagem(template: string, dados: { nome: string; membroN: number; limite: number; linkGrupo: string | null }): string {
  return template
    .replace(/\{nome\}/gi, dados.nome.split(" ")[0] || "amigo(a)")
    .replace(/\{membro_n\}/gi, String(dados.membroN))
    .replace(/\{limite\}/gi, String(dados.limite))
    .replace(/\{link_grupo\}/gi, dados.linkGrupo || "(em breve)");
}

const TEMPLATE_PADRAO = `Olá, {nome}! 🌊

Você é o membro {membro_n}/{limite} da *Onda Zero* — comunidade exclusiva dos primeiros do Sonar CRM.

O que vem com isso:
✅ 30% OFF vitalício no plano
✅ Trial dobrado
✅ Acesso antecipado a features novas
✅ Voz direta no roadmap

🎁 Link do grupo Onda Zero:
{link_grupo}

Bem-vindo a bordo!`;

interface ProcessarResult {
  total: number;
  enviados: number;
  erros: number;
}

/**
 * Worker que processa fila de boas-vindas pendentes.
 * Le canal_sistema_id da super_admin_onda_zero_config + envia via provider abstrato.
 * Retorna estatistica.
 */
export async function processarFilaBoasVindas(): Promise<ProcessarResult> {
  const sb = createServiceClient();

  const { data: cfg } = await sb
    .from("super_admin_onda_zero_config")
    .select("canal_sistema_id, whatsapp_grupo_link, mensagem_convite")
    .eq("id", 1)
    .maybeSingle();

  if (!cfg?.canal_sistema_id) {
    return { total: 0, enviados: 0, erros: 0 };
  }

  const { data: canal } = await sb
    .from("canais")
    .select("id, agencia_id, provider, instance_token_encrypted, status, servidor:super_admin_servidores(base_url)")
    .eq("id", cfg.canal_sistema_id as string)
    .maybeSingle();

  if (!canal || canal.status !== "connected") {
    return { total: 0, enviados: 0, erros: 0 };
  }

  const baseUrl = (canal as unknown as { servidor: { base_url: string } }).servidor.base_url;
  const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
  const providerTipo = ((canal as { provider?: string }).provider || "uazapi") as ProviderTipo;
  const provider = getProvider(providerTipo);

  const { data: pendentes } = await sb
    .from("onda_zero_envios")
    .select("id, agencia_id, destinatario_whatsapp, destinatario_nome, tentativas")
    .eq("status", "pendente")
    .lt("tentativas", 3)
    .order("criado_em", { ascending: true })
    .limit(50);

  const lista = pendentes || [];
  if (lista.length === 0) return { total: 0, enviados: 0, erros: 0 };

  // Linka template editavel
  const templateCustom = (cfg.mensagem_convite as string | null) || "";
  const usarCustom = templateCustom.includes("{nome}") || templateCustom.includes("{link_grupo}");
  const template = usarCustom ? templateCustom : TEMPLATE_PADRAO;

  let enviados = 0, erros = 0;
  for (const envio of lista) {
    const e = envio as { id: string; agencia_id: string; destinatario_whatsapp: string; destinatario_nome: string | null; tentativas: number };
    try {
      // Conta posicao na Onda Zero (membro N/10)
      const { count: posicao } = await sb
        .from("agencias")
        .select("id", { count: "exact", head: true })
        .eq("onda_zero_membro", true)
        .lte("criada_em", new Date().toISOString());

      const mensagem = renderMensagem(template, {
        nome: e.destinatario_nome || "",
        membroN: posicao || 1,
        limite: 10,
        linkGrupo: (cfg.whatsapp_grupo_link as string | null),
      });

      const r = await provider.sendText(
        { tipo: providerTipo, baseUrl, token },
        { number: e.destinatario_whatsapp, text: mensagem },
      );

      await sb
        .from("onda_zero_envios")
        .update({
          status: "enviado",
          mensagem_enviada: mensagem,
          processado_em: new Date().toISOString(),
          tentativas: e.tentativas + 1,
        })
        .eq("id", e.id);
      enviados++;
      void r;

      // Anti-ban: 1.5s entre envios
      await new Promise((res) => setTimeout(res, 1500));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const novaTentativa = e.tentativas + 1;
      await sb
        .from("onda_zero_envios")
        .update({
          status: novaTentativa >= 3 ? "erro" : "pendente",
          erro: msg.slice(0, 500),
          tentativas: novaTentativa,
          processado_em: new Date().toISOString(),
        })
        .eq("id", e.id);
      erros++;
    }
  }

  return { total: lista.length, enviados, erros };
}
