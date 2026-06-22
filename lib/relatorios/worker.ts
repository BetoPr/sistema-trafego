import { createServiceClient } from "@/lib/supabase/service";
import { instanceSendText } from "@/lib/uazapi/client";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";

interface RelatorioRow {
  id: string;
  agencia_id: string;
  nome: string;
  cliente_id: string | null;
  telefone_destino: string | null;
  canal_id: string | null;
  plataforma: "meta_ads" | "google_ads";
  frequencia: "diario" | "semanal" | "mensal";
  dia_semana: number | null;
  dia_mes: number | null;
  hora_envio: string;
  formato: "pdf" | "imagem" | "texto";
  periodo_dias: number;
  ativo: boolean;
}

interface CanalRow {
  id: string;
  status: string;
  instance_token_encrypted: unknown;
  servidor: { base_url: string } | { base_url: string }[];
}

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const nfInt = new Intl.NumberFormat("pt-BR");

function calcularProximoEnvio(r: RelatorioRow, base = new Date()): Date {
  const [h, m] = r.hora_envio.split(":").map(Number);
  const proximo = new Date(base);
  proximo.setHours(h, m, 0, 0);

  if (r.frequencia === "diario") {
    proximo.setDate(proximo.getDate() + 1);
  } else if (r.frequencia === "semanal") {
    const alvo = r.dia_semana ?? 1;
    let diff = (alvo - proximo.getDay() + 7) % 7;
    if (diff === 0) diff = 7;
    proximo.setDate(proximo.getDate() + diff);
  } else {
    const alvo = r.dia_mes ?? 1;
    proximo.setDate(alvo);
    proximo.setMonth(proximo.getMonth() + 1);
  }
  return proximo;
}

/**
 * Monta o texto do relatório com KPIs principais do período pedido.
 * Faturamento vem de tickets.valor_fechado (CRM), igual ao Dashboard.
 * Gasto/impressoes/cliques vêm de metricas_diarias.
 */
async function montarTextoRelatorio(
  sb: ReturnType<typeof createServiceClient>,
  r: RelatorioRow,
  cliente: { id: string; nome: string } | null,
): Promise<string> {
  const fim = new Date();
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - r.periodo_dias);

  const fmtData = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

  // Faturamento + tickets fechados no período
  const { data: tickets } = await sb
    .from("tickets")
    .select("valor_fechado")
    .eq("agencia_id", r.agencia_id)
    .gte("fechado_em", inicio.toISOString())
    .lte("fechado_em", fim.toISOString())
    .not("valor_fechado", "is", null);
  const faturamento = (tickets || []).reduce((s, t) => s + Number(t.valor_fechado || 0), 0);
  const vendas = (tickets || []).length;

  // Métricas diárias (Meta Ads) — opcional: cliente_id filtra
  let q = sb
    .from("metricas_diarias")
    .select("gasto, impressoes, cliques, leads, conversoes")
    .eq("agencia_id", r.agencia_id)
    .gte("data", inicio.toISOString().slice(0, 10))
    .lte("data", fim.toISOString().slice(0, 10));
  if (cliente) q = q.eq("cliente_id", cliente.id);
  const { data: met } = await q;

  let gasto = 0, impressoes = 0, cliques = 0, leads = 0, conversoes = 0;
  for (const x of (met || [])) {
    gasto += Number(x.gasto || 0);
    impressoes += Number(x.impressoes || 0);
    cliques += Number(x.cliques || 0);
    leads += Number(x.leads || 0);
    conversoes += Number(x.conversoes || 0);
  }
  const lucro = faturamento - gasto;
  const roas = gasto > 0 ? faturamento / gasto : 0;
  const ctr = impressoes > 0 ? (cliques / impressoes) * 100 : 0;
  const cpl = leads > 0 ? gasto / leads : 0;

  const linhas: string[] = [];
  linhas.push(`📊 *${r.nome}*`);
  linhas.push(`Período: ${fmtData(inicio)} a ${fmtData(fim)}`);
  if (cliente) linhas.push(`Cliente: ${cliente.nome}`);
  linhas.push("");
  linhas.push("*💰 Financeiro*");
  linhas.push(`• Investido: ${BRL.format(gasto)}`);
  linhas.push(`• Faturamento: ${BRL.format(faturamento)} (${vendas} venda${vendas === 1 ? "" : "s"})`);
  linhas.push(`• Lucro bruto: ${BRL.format(lucro)}`);
  linhas.push(`• ROAS: ${roas > 0 ? roas.toFixed(2).replace(".", ",") + "x" : "—"}`);

  if (impressoes > 0 || cliques > 0) {
    linhas.push("");
    linhas.push("*📈 Tráfego*");
    if (impressoes > 0) linhas.push(`• Impressões: ${nfInt.format(impressoes)}`);
    if (cliques > 0) linhas.push(`• Cliques: ${nfInt.format(cliques)} (CTR ${ctr.toFixed(2).replace(".", ",")}%)`);
    if (leads > 0) linhas.push(`• Leads: ${nfInt.format(leads)} · CPL ${BRL.format(cpl)}`);
    if (conversoes > 0) linhas.push(`• Conversões: ${nfInt.format(conversoes)}`);
  }

  linhas.push("");
  linhas.push("_Enviado automaticamente pelo Sonar CRM._");
  return linhas.join("\n");
}

async function pegarCanal(
  sb: ReturnType<typeof createServiceClient>,
  agenciaId: string,
  canalId: string | null,
): Promise<{ baseUrl: string; token: string } | null> {
  let q = sb
    .from("canais")
    .select("id, status, instance_token_encrypted, servidor:super_admin_servidores(base_url)")
    .eq("agencia_id", agenciaId)
    .eq("status", "connected");
  if (canalId) q = q.eq("id", canalId);
  const { data } = await q.limit(1).maybeSingle();
  if (!data) return null;
  const canal = data as unknown as CanalRow;
  const servidor = Array.isArray(canal.servidor) ? canal.servidor[0] : canal.servidor;
  if (!servidor?.base_url || !canal.instance_token_encrypted) return null;
  try {
    const token = decryptToken(byteaToBuffer(canal.instance_token_encrypted as Parameters<typeof byteaToBuffer>[0]));
    return { baseUrl: servidor.base_url, token };
  } catch {
    return null;
  }
}

function normalizarTelefone(t: string): string {
  return t.replace(/\D+/g, "");
}

export interface ResultadoWorker {
  total: number;
  enviados: number;
  falhas: number;
  pulados: number;
}

/** Processa relatórios com proximo_envio <= now(). Claim atômico via update condicional. */
export async function processarRelatoriosPendentes(): Promise<ResultadoWorker> {
  const sb = createServiceClient();
  const res: ResultadoWorker = { total: 0, enviados: 0, falhas: 0, pulados: 0 };
  const agora = new Date();

  const { data: candidatos, error } = await sb
    .from("relatorios_agendados")
    .select("*")
    .eq("ativo", true)
    .is("deleted_at", null)
    .lte("proximo_envio", agora.toISOString())
    .limit(30);
  if (error) {
    console.error("[relatorios] busca falhou:", error.message);
    return res;
  }

  for (const r of (candidatos || []) as RelatorioRow[]) {
    res.total++;

    // Claim: marca ultimo_status='enviando' e zera proximo_envio só pra evitar dupla pega.
    const { data: claim } = await sb
      .from("relatorios_agendados")
      .update({ ultimo_status: "enviando", updated_at: new Date().toISOString() })
      .eq("id", r.id)
      .eq("ativo", true)
      .neq("ultimo_status", "enviando")
      .select("id");
    if (!claim || claim.length === 0) {
      res.pulados++;
      continue;
    }

    try {
      let cliente: { id: string; nome: string } | null = null;
      if (r.cliente_id) {
        const { data: cli } = await sb
          .from("clientes")
          .select("id, nome")
          .eq("id", r.cliente_id)
          .maybeSingle();
        if (cli) cliente = cli as { id: string; nome: string };
      }

      const texto = await montarTextoRelatorio(sb, r, cliente);

      const canal = await pegarCanal(sb, r.agencia_id, r.canal_id);
      if (!canal) {
        await sb
          .from("relatorios_agendados")
          .update({
            ultimo_status: "falhou",
            ultimo_erro: "Nenhum canal WhatsApp conectado",
            ultimo_envio: new Date().toISOString(),
            proximo_envio: calcularProximoEnvio(r, agora).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", r.id);
        res.falhas++;
        continue;
      }

      let numero: string;
      if (cliente) {
        const { data: contato } = await sb
          .from("contatos")
          .select("wa_id, whatsapp, telefone")
          .eq("agencia_id", r.agencia_id)
          .eq("cliente_id", cliente.id)
          .is("deleted_at", null)
          .limit(1)
          .maybeSingle();
        numero = normalizarTelefone(
          (contato?.wa_id || contato?.whatsapp || contato?.telefone || r.telefone_destino || "") as string,
        );
      } else {
        numero = normalizarTelefone(r.telefone_destino || "");
      }

      if (!numero) {
        await sb
          .from("relatorios_agendados")
          .update({
            ultimo_status: "falhou",
            ultimo_erro: "Destinatário sem telefone válido",
            ultimo_envio: new Date().toISOString(),
            proximo_envio: calcularProximoEnvio(r, agora).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", r.id);
        res.falhas++;
        continue;
      }

      await instanceSendText(
        { baseUrl: canal.baseUrl, token: canal.token },
        { number: numero, text: texto },
      );

      await sb
        .from("relatorios_agendados")
        .update({
          ultimo_status: "enviado",
          ultimo_erro: null,
          ultimo_envio: new Date().toISOString(),
          proximo_envio: calcularProximoEnvio(r, agora).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", r.id);
      res.enviados++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[relatorios] envio falhou (${r.id}):`, msg);
      await sb
        .from("relatorios_agendados")
        .update({
          ultimo_status: "falhou",
          ultimo_erro: msg.slice(0, 500),
          ultimo_envio: new Date().toISOString(),
          proximo_envio: calcularProximoEnvio(r, agora).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", r.id);
      res.falhas++;
    }
  }

  return res;
}
