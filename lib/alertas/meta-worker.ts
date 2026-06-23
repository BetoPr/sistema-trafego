/**
 * Worker dos alertas de gasto Meta Ads.
 *
 * Pra cada alerta ativo:
 *   1. busca gasto Meta (today/this_month) via Graph API
 *   2. compara contra limite
 *   3. se >= limite e último disparo foi há > 24h, envia WhatsApp via UAZAPI
 *   4. registra disparo em alertas_meta_disparos
 *
 * Use service-role client (cron, bypassa RLS).
 */
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { instanceSendText, type UazapiInstance } from "@/lib/uazapi/client";
import { getSpend } from "./meta-spend";

const ANTI_SPAM_HORAS = 24;

interface AlertaRow {
  id: string;
  agencia_id: string;
  integracao_id: string;
  nome: string;
  tipo: "gasto_dia" | "gasto_mes";
  limite_valor: number;
  destino_numero: string;
  canal_id: string | null;
  mensagem_template: string;
  ultimo_disparo_em: string | null;
}

interface IntegracaoRow {
  id: string;
  account_id: string;
  account_name: string | null;
  access_token_encrypted: unknown;
  status: string;
}

interface CanalRow {
  id: string;
  status: string;
  instance_token_encrypted: unknown;
  servidor: { base_url: string } | null;
}

function fmtBRL(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
}

function dentroDoAntiSpam(ultimo: string | null): boolean {
  if (!ultimo) return false;
  const diff = Date.now() - new Date(ultimo).getTime();
  return diff < ANTI_SPAM_HORAS * 3600_000;
}

export interface WorkerResult {
  checados: number;
  disparados: number;
  pulados: number;
  erros: { alerta_id: string; erro: string }[];
}

export async function rodarAlertasMeta(): Promise<WorkerResult> {
  const sb = createServiceClient();
  const out: WorkerResult = { checados: 0, disparados: 0, pulados: 0, erros: [] };

  const { data: alertas, error: errA } = await sb
    .from("alertas_meta")
    .select(
      "id, agencia_id, integracao_id, nome, tipo, limite_valor, destino_numero, canal_id, mensagem_template, ultimo_disparo_em",
    )
    .eq("ativo", true);

  if (errA) throw new Error(`select alertas_meta: ${errA.message}`);
  if (!alertas || alertas.length === 0) return out;

  for (const a of alertas as AlertaRow[]) {
    out.checados++;

    if (dentroDoAntiSpam(a.ultimo_disparo_em)) {
      out.pulados++;
      continue;
    }

    try {
      const { data: integ, error: errI } = await sb
        .from("integracoes")
        .select("id, account_id, account_name, access_token_encrypted, status")
        .eq("id", a.integracao_id)
        .single();
      if (errI || !integ) throw new Error(`integracao não encontrada: ${errI?.message || "null"}`);

      const integRow = integ as IntegracaoRow;
      if (integRow.status !== "ativa") {
        out.pulados++;
        continue;
      }

      const accessToken = decryptToken(byteaToBuffer(integRow.access_token_encrypted));
      if (!accessToken) throw new Error("access_token vazio");

      const preset = a.tipo === "gasto_dia" ? "today" : "this_month";
      const spend = await getSpend(accessToken, integRow.account_id, preset);

      await sb.from("alertas_meta").update({ ultimo_valor_observado: spend }).eq("id", a.id);

      if (spend < Number(a.limite_valor)) {
        out.pulados++;
        continue;
      }

      const canalQ = a.canal_id
        ? sb
            .from("canais")
            .select("id, status, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
            .eq("id", a.canal_id)
            .single()
        : sb
            .from("canais")
            .select("id, status, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
            .eq("agencia_id", a.agencia_id)
            .eq("padrao", true)
            .limit(1)
            .maybeSingle();
      const { data: canalData, error: errC } = await canalQ;
      if (errC || !canalData) throw new Error(`canal indisponível: ${errC?.message || "sem canal padrão"}`);
      const canal = canalData as unknown as CanalRow;
      if (canal.status !== "connected") throw new Error("canal desconectado");

      const baseUrl = canal.servidor?.base_url;
      if (!baseUrl) throw new Error("servidor sem base_url");
      const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted));
      if (!token) throw new Error("instance_token vazio");

      const inst: UazapiInstance = { baseUrl, token };
      const text = renderTemplate(a.mensagem_template, {
        conta: integRow.account_name || integRow.account_id,
        gasto: fmtBRL(spend),
        limite: fmtBRL(Number(a.limite_valor)),
        tipo: a.tipo === "gasto_dia" ? "diário" : "mensal",
        nome: a.nome,
      });

      let sucesso = true;
      let erroMsg: string | null = null;
      try {
        await instanceSendText(inst, { number: a.destino_numero, text });
      } catch (e) {
        sucesso = false;
        erroMsg = e instanceof Error ? e.message : String(e);
      }

      await sb.from("alertas_meta_disparos").insert({
        alerta_id: a.id,
        agencia_id: a.agencia_id,
        valor_observado: spend,
        limite_valor: a.limite_valor,
        destino_numero: a.destino_numero,
        mensagem_enviada: text,
        sucesso,
        erro: erroMsg,
      });

      if (sucesso) {
        await sb.from("alertas_meta").update({ ultimo_disparo_em: new Date().toISOString() }).eq("id", a.id);
        out.disparados++;
      } else {
        out.erros.push({ alerta_id: a.id, erro: erroMsg || "erro desconhecido" });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      out.erros.push({ alerta_id: a.id, erro: msg });
    }
  }

  return out;
}
