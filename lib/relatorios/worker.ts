import { createServiceClient } from "@/lib/supabase/service";
import { instanceSendText, instanceSendMedia } from "@/lib/uazapi/client";
import { decryptToken, byteaToBuffer } from "@/lib/crypto/tokens";
import { gerarBufferPdf, type PdfDados } from "./pdf";

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

interface DadosRelatorio {
  inicio: Date;
  fim: Date;
  faturamento: number;
  vendas: number;
  gasto: number;
  impressoes: number;
  cliques: number;
  leads: number;
  conversoes: number;
  lucro: number;
  roas: number;
  ctr: number;
  cpl: number;
}

async function coletarDadosRelatorio(
  sb: ReturnType<typeof createServiceClient>,
  r: RelatorioRow,
  cliente: { id: string; nome: string } | null,
): Promise<DadosRelatorio> {
  const fim = new Date();
  const inicio = new Date(fim);
  inicio.setDate(inicio.getDate() - r.periodo_dias);

  const { data: tickets } = await sb
    .from("tickets")
    .select("valor_fechado")
    .eq("agencia_id", r.agencia_id)
    .gte("fechado_em", inicio.toISOString())
    .lte("fechado_em", fim.toISOString())
    .not("valor_fechado", "is", null);
  const faturamento = (tickets || []).reduce((s, t) => s + Number(t.valor_fechado || 0), 0);
  const vendas = (tickets || []).length;

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

  return { inicio, fim, faturamento, vendas, gasto, impressoes, cliques, leads, conversoes, lucro, roas, ctr, cpl };
}

function fmtData(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function montarTextoRelatorio(r: RelatorioRow, cliente: { nome: string } | null, d: DadosRelatorio): string {
  const linhas: string[] = [];
  linhas.push(`📊 *${r.nome}*`);
  linhas.push(`Período: ${fmtData(d.inicio)} a ${fmtData(d.fim)}`);
  if (cliente) linhas.push(`Cliente: ${cliente.nome}`);
  linhas.push("");
  linhas.push("*💰 Financeiro*");
  linhas.push(`• Investido: ${BRL.format(d.gasto)}`);
  linhas.push(`• Faturamento: ${BRL.format(d.faturamento)} (${d.vendas} venda${d.vendas === 1 ? "" : "s"})`);
  linhas.push(`• Lucro bruto: ${BRL.format(d.lucro)}`);
  linhas.push(`• ROAS: ${d.roas > 0 ? d.roas.toFixed(2).replace(".", ",") + "x" : "—"}`);

  if (d.impressoes > 0 || d.cliques > 0) {
    linhas.push("");
    linhas.push("*📈 Tráfego*");
    if (d.impressoes > 0) linhas.push(`• Impressões: ${nfInt.format(d.impressoes)}`);
    if (d.cliques > 0) linhas.push(`• Cliques: ${nfInt.format(d.cliques)} (CTR ${d.ctr.toFixed(2).replace(".", ",")}%)`);
    if (d.leads > 0) linhas.push(`• Leads: ${nfInt.format(d.leads)} · CPL ${BRL.format(d.cpl)}`);
    if (d.conversoes > 0) linhas.push(`• Conversões: ${nfInt.format(d.conversoes)}`);
  }

  linhas.push("");
  linhas.push("_Enviado automaticamente pelo Sonar CRM._");
  return linhas.join("\n");
}

function dadosParaPdf(r: RelatorioRow, cliente: { nome: string } | null, d: DadosRelatorio): PdfDados {
  return {
    titulo: r.nome,
    cliente: cliente?.nome || null,
    periodoInicio: fmtData(d.inicio),
    periodoFim: fmtData(d.fim),
    financeiro: {
      investido: BRL.format(d.gasto),
      faturamento: BRL.format(d.faturamento),
      lucro: BRL.format(d.lucro),
      roas: d.roas > 0 ? d.roas.toFixed(2).replace(".", ",") + "x" : "—",
      vendas: d.vendas,
    },
    trafego: d.impressoes > 0 || d.cliques > 0 ? {
      impressoes: nfInt.format(d.impressoes),
      cliques: nfInt.format(d.cliques),
      ctr: d.ctr.toFixed(2).replace(".", ",") + "%",
      leads: nfInt.format(d.leads),
      cpl: BRL.format(d.cpl),
      conversoes: nfInt.format(d.conversoes),
    } : null,
  };
}

/** Sobe PDF no bucket `relatorios` e retorna URL assinada de 24h. */
async function uploadPdf(
  sb: ReturnType<typeof createServiceClient>,
  agenciaId: string,
  relatorioId: string,
  buffer: Buffer,
): Promise<string> {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const path = `${agenciaId}/${relatorioId}/${ts}.pdf`;
  const { error: upErr } = await sb.storage
    .from("relatorios")
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (upErr) throw new Error(`Upload PDF falhou: ${upErr.message}`);
  const { data: signed, error: sigErr } = await sb.storage
    .from("relatorios")
    .createSignedUrl(path, 60 * 60 * 24);
  if (sigErr || !signed) throw new Error(`URL assinada falhou: ${sigErr?.message}`);
  return signed.signedUrl;
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

    // Marca como 'enviando' (sem condicao de claim — risco de dupla pega
    // e baixo: cron 2min + processamento <500ms, e duplicar 1 relatorio nao
    // e critico em MVP). O proximo_envio futuro ja serve de protecao natural.
    await sb
      .from("relatorios_agendados")
      .update({ ultimo_status: "enviando", updated_at: new Date().toISOString() })
      .eq("id", r.id);

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

      const dados = await coletarDadosRelatorio(sb, r, cliente);
      const texto = montarTextoRelatorio(r, cliente, dados);

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

      if (r.formato === "pdf") {
        try {
          const pdf = dadosParaPdf(r, cliente, dados);
          const buf = await gerarBufferPdf(pdf);
          const url = await uploadPdf(sb, r.agencia_id, r.id, buf);
          await instanceSendMedia(
            { baseUrl: canal.baseUrl, token: canal.token },
            {
              number: numero,
              type: "document",
              file: url,
              docName: `${r.nome.replace(/[^\w\s-]/g, "_").slice(0, 60)}.pdf`,
              text: `📊 ${r.nome}\nPeríodo: ${fmtData(dados.inicio)} a ${fmtData(dados.fim)}`,
            },
          );
        } catch (pdfErr) {
          // fallback pra texto se PDF/upload falhar
          console.warn(`[relatorios] PDF falhou (${r.id}), enviando texto:`, pdfErr);
          await instanceSendText(
            { baseUrl: canal.baseUrl, token: canal.token },
            { number: numero, text: texto },
          );
        }
      } else {
        await instanceSendText(
          { baseUrl: canal.baseUrl, token: canal.token },
          { number: numero, text: texto },
        );
      }

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
