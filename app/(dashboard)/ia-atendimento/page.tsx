import Link from "next/link";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import {
  criarPerfilIA,
  atualizarPerfilIA,
  deletarPerfilIA,
  alternarAtivoPerfilIA,
  deletarFerramentaIA,
  alternarAtivoFerramentaIA,
} from "./_actions";
import EditarFerramentaBtn from "./_ferramenta-editar-btn";
import type { ImagemGaleria } from "./_galeria-uploader";
import FollowUpBloco, { type FollowupSeq, type FollowupEtapa } from "./_followup-bloco";
import ResumoConfigBalao, { type ResumoConfig } from "./_resumo-config-balao";
import { TemplatesPicker, type TemplatePicker } from "./_templates-picker";
import { ChipsPicker } from "./_chips-picker";
import { TestarApiBtn } from "./_testar-btn";
import PlaceholderPicker from "./_placeholder-picker";
import FerramentaForm from "./_ferramenta-form";
import UsoTokensCard from "./_uso-tokens-card";
import PerfilEtiquetasEditor from "./_perfil-etiquetas";
import { carregarUsoTokens, type IntervaloUso, type ResumoUso } from "@/lib/ia-atendimento/uso-tokens";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ editar?: string; novo?: string; ok?: string; erro?: string; msg?: string; uso?: string }>;
}

interface PerfilEtiquetaRow {
  etiqueta_id: string;
  descricao_uso: string;
  ordem: number;
  nome: string;
  cor: string;
}

const MODELOS: Record<string, Array<{ id: string; nome: string }>> = {
  anthropic: [
    { id: "claude-haiku-4-5-20251001", nome: "Claude Haiku 4.5 (rápido, barato)" },
    { id: "claude-sonnet-4-6", nome: "Claude Sonnet 4.6 (equilibrado)" },
    { id: "claude-opus-4-8", nome: "Claude Opus 4.8 (mais inteligente)" },
  ],
  openai: [
    { id: "gpt-4o-mini", nome: "GPT-4o mini (rápido, barato)" },
    { id: "gpt-4o", nome: "GPT-4o (padrão)" },
    { id: "gpt-4.1", nome: "GPT-4.1 (avançado)" },
    { id: "gpt-4.1-mini", nome: "GPT-4.1 mini" },
    { id: "gpt-4.1-nano", nome: "GPT-4.1 nano (ultra rápido)" },
    { id: "o1", nome: "o1 (raciocínio)" },
    { id: "o1-mini", nome: "o1 mini" },
    { id: "o3-mini", nome: "o3 mini" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", nome: "Llama 3.3 70B" },
    { id: "llama-3.1-8b-instant", nome: "Llama 3.1 8B" },
    { id: "deepseek-r1-distill-llama-70b", nome: "DeepSeek R1 Distill" },
  ],
};

const ACOES: Record<string, string> = {
  aplicar_etiqueta: "Aplicar etiqueta",
  transferir_para_fila: "Transferir pra fila",
  transferir_para_humano: "Transferir pra humano",
  agendar_followup: "Agendar follow-up",
  enviar_template: "Enviar template",
  marcar_qualificado: "Marcar qualificado",
  criar_nota: "Criar nota interna",
};

interface PerfilRow {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  modelo: string | null;
  provider: string | null;
}

interface CanalRow { id: string; nome: string; status: string; numero_conectado: string | null }
interface FilaRow { id: string; nome: string; cor: string }
interface EtiquetaRow { id: string; nome: string; cor: string }
type TemplateRow = TemplatePicker;

interface PerfilDetalhe {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  provider: string;
  modelo: string;
  prompt_sistema: string;
  delay_debounce_seg: number;
  delay_min_resposta_seg: number;
  delay_max_resposta_seg: number;
  max_tokens_por_resposta: number;
  temperatura: number;
  pausa_se_humano_responder: boolean;
  canais_ativos: string[];
  filas_ativas: string[];
  formato_resposta: { bullets?: boolean; separador_blocos?: string; max_msgs?: number };
  whatsapp_teste_lista: string[];
  timezone: string | null;
}

interface LogRow {
  id: string;
  evento: string;
  modelo: string | null;
  tokens_in: number | null;
  tokens_out: number | null;
  payload: Record<string, unknown> | null;
  erro: string | null;
  created_at: string;
}

interface FerramentaRow {
  id: string;
  nome: string;
  descricao: string;
  acao: string;
  parametros: Record<string, unknown>;
  ativo: boolean;
}

export default async function IAAtendimentoPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const sb = createServiceClient();

  // Carrega listas (sequencial pra debug mais fácil em caso de erro)
  let perfis: PerfilRow[] = [];
  let canais: CanalRow[] = [];
  let filas: FilaRow[] = [];
  let etiquetas: EtiquetaRow[] = [];
  let templates: TemplateRow[] = [];

  try {
    const { data } = await sb.from("ia_atendimento_perfis")
      .select("id, nome, descricao, ativo, modelo, provider")
      .eq("agencia_id", ctx.agenciaId)
      .eq("eh_template", false)
      .order("nome");
    perfis = (data || []) as PerfilRow[];
  } catch {}

  try {
    const { data } = await sb.from("canais").select("id, nome, status, numero_conectado").eq("agencia_id", ctx.agenciaId).order("nome");
    canais = (data || []) as CanalRow[];
  } catch {}

  try {
    const { data } = await sb.from("filas").select("id, nome, cor").eq("agencia_id", ctx.agenciaId).eq("ativa", true).order("nome");
    filas = (data || []) as FilaRow[];
  } catch {}

  try {
    const { data } = await sb.from("etiquetas").select("id, nome, cor").eq("agencia_id", ctx.agenciaId).eq("ativo", true).order("nome");
    etiquetas = (data || []) as EtiquetaRow[];
  } catch {}

  try {
    const { data } = await sb.from("ia_atendimento_perfis")
      .select("id, nome, descricao, template_tipo, modelo, provider, prompt_sistema, delay_debounce_seg, delay_min_resposta_seg, delay_max_resposta_seg")
      .is("agencia_id", null)
      .eq("eh_template", true)
      .order("nome");
    templates = (data || []) as TemplateRow[];
  } catch {}

  const editando = sp.editar ? perfis.find((p) => p.id === sp.editar) : null;
  const mostrarForm = !!editando || sp.novo === "1";

  let perfilDetalhe: PerfilDetalhe | null = null;
  let ferramentas: FerramentaRow[] = [];
  let logs: LogRow[] = [];
  let perfilEtiquetas: PerfilEtiquetaRow[] = [];
  let resumoUso: ResumoUso | null = null;
  let galeriaPorFerramenta: Record<string, ImagemGaleria[]> = {};
  let followupSeqs: FollowupSeq[] = [];
  let followupEtapas: FollowupEtapa[] = [];
  let resumoConfig: ResumoConfig | null = null;
  const intervaloUso: IntervaloUso =
    sp.uso === "24h" || sp.uso === "30d" || sp.uso === "total" ? sp.uso : "7d";
  if (editando) {
    try {
      const { data } = await sb.from("ia_atendimento_perfis")
        .select("id, nome, descricao, ativo, modelo, provider, prompt_sistema, delay_debounce_seg, delay_min_resposta_seg, delay_max_resposta_seg, max_tokens_por_resposta, temperatura, pausa_se_humano_responder, canais_ativos, filas_ativas, formato_resposta, whatsapp_teste_lista, timezone")
        .eq("id", editando.id)
        .single();
      if (data) perfilDetalhe = data as unknown as PerfilDetalhe;
    } catch {}

    try {
      const { data } = await sb.from("ia_atendimento_ferramentas")
        .select("id, nome, descricao, acao, parametros, ativo")
        .eq("perfil_id", editando.id)
        .order("nome");
      ferramentas = (data || []) as FerramentaRow[];
    } catch {}

    try {
      const { data } = await sb.from("ia_atendimento_log")
        .select("id, evento, modelo, tokens_in, tokens_out, payload, erro, created_at")
        .eq("perfil_id", editando.id)
        .order("created_at", { ascending: false })
        .limit(50);
      logs = (data || []) as LogRow[];
    } catch {}

    // L2: etiquetas configuradas do perfil
    try {
      const { data } = await sb.from("ia_atendimento_perfil_etiquetas")
        .select("etiqueta_id, descricao_uso, ordem, etiqueta:etiquetas!inner(id, nome, cor)")
        .eq("perfil_id", editando.id)
        .order("ordem");
      perfilEtiquetas = ((data || []) as Array<{
        etiqueta_id: string;
        descricao_uso: string;
        ordem: number;
        etiqueta: { id: string; nome: string; cor: string } | { id: string; nome: string; cor: string }[] | null;
      }>).map((r) => {
        const e = Array.isArray(r.etiqueta) ? r.etiqueta[0] : r.etiqueta;
        return {
          etiqueta_id: r.etiqueta_id,
          descricao_uso: r.descricao_uso,
          ordem: r.ordem,
          nome: e?.nome || "?",
          cor: e?.cor || "#999",
        };
      });
    } catch {}

    // L2: uso de tokens
    try {
      resumoUso = await carregarUsoTokens(editando.id, ctx.agenciaId, intervaloUso);
    } catch {}

    // L5: resumo config
    try {
      const { data } = await sb.from("ia_atendimento_resumo_config")
        .select("ativo, modelo_groq, destino_tipo, canal_id, grupo_jid, telefone, prompt_resumo, disparar_em, groq_api_key_encrypted")
        .eq("perfil_id", editando.id)
        .maybeSingle();
      if (data) {
        resumoConfig = {
          ativo: data.ativo as boolean,
          modelo_groq: data.modelo_groq as string,
          destino_tipo: data.destino_tipo as "grupo" | "privado",
          canal_id: (data.canal_id as string) || null,
          grupo_jid: (data.grupo_jid as string) || null,
          telefone: (data.telefone as string) || null,
          prompt_resumo: data.prompt_resumo as string,
          disparar_em: data.disparar_em as string,
          tem_chave: !!data.groq_api_key_encrypted,
        };
      }
    } catch {}

    // L4: follow-up sequencias + etapas
    try {
      const { data: seqs } = await sb.from("ia_atendimento_followup_sequencias")
        .select("id, nome, descricao, ordem_no_perfil, ativa, finalizar_ticket_ao_fim, etiqueta_em_progresso_id, etiqueta_encerrado_id, janela_inicio, janela_fim")
        .eq("perfil_id", editando.id)
        .order("ordem_no_perfil");
      followupSeqs = (seqs || []) as FollowupSeq[];
      if (followupSeqs.length > 0) {
        const seqIds = followupSeqs.map((s) => s.id);
        const { data: etps } = await sb.from("ia_atendimento_followup_etapas")
          .select("id, sequencia_id, ordem, delay_segundos_antes, midia_tipo, texto, midia_path, midia_url, midia_mime, midia_filename")
          .in("sequencia_id", seqIds)
          .order("ordem");
        followupEtapas = (etps || []) as FollowupEtapa[];
      }
    } catch {}

    // L3: galeria por ferramenta (so pra acao=enviar_imagem_galeria)
    try {
      const idsGaleria = ferramentas.filter((f) => f.acao === "enviar_imagem_galeria").map((f) => f.id);
      if (idsGaleria.length) {
        const { data: gals } = await sb
          .from("ia_atendimento_galeria")
          .select("id, ferramenta_id, nome, descricao, tags, url_storage, mime, ordem")
          .in("ferramenta_id", idsGaleria)
          .order("ordem", { ascending: true });
        if (gals?.length) {
          const comSigned = await Promise.all(
            gals.map(async (g) => {
              const { data: s } = await sb.storage.from("ia-galeria").createSignedUrl(g.url_storage, 3600);
              return { ...g, signed_url: s?.signedUrl || null };
            }),
          );
          galeriaPorFerramenta = comSigned.reduce((acc, g) => {
            (acc[g.ferramenta_id as string] ||= []).push({
              id: g.id as string,
              nome: g.nome as string,
              descricao: g.descricao as string,
              tags: (g.tags || []) as string[],
              url_storage: g.url_storage as string,
              mime: g.mime as string,
              ordem: g.ordem as number,
              signed_url: g.signed_url,
            });
            return acc;
          }, {} as Record<string, ImagemGaleria[]>);
        }
      }
    } catch {}
  }

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="mk-eyebrow">Atendimento</div>
          <h1 className="mk-page-title">
            IA de Atendimento{" "}
            <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "rgba(155,125,191,0.18)", color: "#9B7DBF", marginLeft: 8, verticalAlign: "middle", fontWeight: 600 }}>BÁSICA</span>
          </h1>
          <p className="mk-page-sub">Atendente IA que qualifica leads, etiqueta e transfere pra humano. BYOK (chave própria).</p>
        </div>
        {!mostrarForm && (
          <Link href="/ia-atendimento?novo=1" className="cta-btn">
            <i className="ti ti-plus" /> Novo perfil
          </Link>
        )}
      </div>

      {sp.ok && <Banner tipo="ok">{labelOk(sp.ok)}</Banner>}
      {sp.erro && <Banner tipo="erro">{labelErr(sp.erro)} {sp.msg && `— ${decodeURIComponent(sp.msg)}`}</Banner>}

      {mostrarForm ? (
        <PerfilForm
          editando={perfilDetalhe}
          editandoId={editando?.id || null}
          canais={canais}
          filas={filas}
          etiquetas={etiquetas}
          ferramentas={ferramentas}
          templates={templates}
          logs={logs}
          perfilEtiquetas={perfilEtiquetas}
          resumoUso={resumoUso}
          intervaloUso={intervaloUso}
          galeriaPorFerramenta={galeriaPorFerramenta}
          followupSeqs={followupSeqs}
          followupEtapas={followupEtapas}
          resumoConfig={resumoConfig}
        />
      ) : (
        <ListaPerfis perfis={perfis} />
      )}
    </section>
  );
}

function ListaPerfis({ perfis }: { perfis: PerfilRow[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
      {perfis.length === 0 ? (
        <div className="mk-card mk-card-lg" style={{ gridColumn: "1/-1", textAlign: "center", padding: "32px 14px", color: "var(--mk-text-muted)", fontSize: 13 }}>
          Nenhum perfil de IA. Crie o primeiro.
        </div>
      ) : (
        perfis.map((p) => (
          <div key={p.id} className="mk-card mk-card-lg">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600 }}>{p.nome}</h4>
                {p.descricao && <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 2 }}>{p.descricao}</div>}
              </div>
              <form action={alternarAtivoPerfilIA} style={{ display: "inline" }}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="ativo" value={String(p.ativo)} />
                <button type="submit" className={`toggle-switch ${p.ativo ? "is-on" : ""}`} aria-pressed={p.ativo}>
                  <span className="toggle-knob" />
                </button>
              </form>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {p.provider && <Chip>{p.provider}</Chip>}
              {p.modelo && <Chip>{String(p.modelo).split("-").slice(0, 2).join(" ")}</Chip>}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12, borderTop: "0.5px solid var(--mk-border)", paddingTop: 10 }}>
              <Link href={`/ia-atendimento?editar=${p.id}`} className="ghost-btn" style={{ fontSize: 12, flex: 1, justifyContent: "center" }}>
                <i className="ti ti-pencil" /> Editar
              </Link>
              <form action={deletarPerfilIA} style={{ display: "inline" }}>
                <input type="hidden" name="id" value={p.id} />
                <button type="submit" className="ghost-btn" style={{ fontSize: 12, color: "#C97064" }}>
                  <i className="ti ti-trash" />
                </button>
              </form>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function PerfilForm({
  editando, editandoId, canais, filas, etiquetas, ferramentas, templates, logs,
  perfilEtiquetas, resumoUso, intervaloUso, galeriaPorFerramenta,
  followupSeqs, followupEtapas, resumoConfig,
}: {
  editando: PerfilDetalhe | null;
  editandoId: string | null;
  canais: CanalRow[];
  filas: FilaRow[];
  etiquetas: EtiquetaRow[];
  ferramentas: FerramentaRow[];
  templates: TemplateRow[];
  logs: LogRow[];
  perfilEtiquetas: PerfilEtiquetaRow[];
  resumoUso: ResumoUso | null;
  intervaloUso: IntervaloUso;
  galeriaPorFerramenta: Record<string, ImagemGaleria[]>;
  followupSeqs: FollowupSeq[];
  followupEtapas: FollowupEtapa[];
  resumoConfig: ResumoConfig | null;
}) {
  const provider = editando?.provider || "anthropic";
  const canaisAtivos = new Set<string>(editando?.canais_ativos || []);
  const filasAtivas = new Set<string>(editando?.filas_ativas || []);
  const formato = editando?.formato_resposta || {};
  const whitelistTexto = (editando?.whatsapp_teste_lista || []).join("\n");

  return (
    <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
        <h3 className="card-title" style={{ margin: 0 }}>{editando ? `Editar — ${editando.nome}` : "Novo perfil de IA"}</h3>
        <Link
          href="/ia-atendimento"
          className="ghost-btn"
          style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <i className="ti ti-arrow-left" /> Voltar para IAs construídas
        </Link>
      </div>
      <form action={editando ? atualizarPerfilIA : criarPerfilIA} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {editandoId && <input type="hidden" name="id" value={editandoId} />}

        {!editando && templates.length > 0 && (
          <TemplatesPicker templates={templates} />
        )}

        <div style={grid2}>
          <Field label="Nome do perfil" name="nome" defaultValue={editando?.nome ?? ""} required placeholder="Ex: Atendente Vendas" />
          <div>
            <label style={lbl}>Status</label>
            <label style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "8px 12px", fontSize: 12.5 }}>
              <input type="checkbox" name="ativo" defaultChecked={editando?.ativo ?? false} /> Ativo
            </label>
          </div>
        </div>

        <Field label="Descrição (interno)" name="descricao" defaultValue={editando?.descricao ?? ""} />

        <fieldset style={fs}>
          <legend style={legend}>Modelo IA</legend>
          <div style={grid2}>
            <div>
              <label style={lbl}>Provider</label>
              <select name="provider" defaultValue={provider} style={inp}>
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="groq">Groq (Llama)</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Modelo</label>
              <select name="modelo" defaultValue={editando?.modelo ?? "gpt-4o-mini"} style={inp}>
                {Object.entries(MODELOS).flatMap(([, lista]) =>
                  lista.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)
                )}
              </select>
            </div>
          </div>
          <Field
            label="Chave API"
            name="api_key"
            type="password"
            placeholder={editando ? "Deixe em branco pra manter a atual" : "sk-..."}
          />
          {editandoId && <TestarApiBtn perfilId={editandoId} />}
        </fieldset>

        <fieldset style={fs}>
          <legend style={legend}>Prompt do sistema</legend>
          <PlaceholderPicker />
          <textarea
            name="prompt_sistema"
            rows={10}
            defaultValue={editando?.prompt_sistema ?? ""}
            style={{ ...inp, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
            placeholder="Você é um atendente da empresa X..."
          />
        </fieldset>

        <fieldset style={{ ...fs, background: "rgba(245,158,11,0.06)", border: "0.5px solid rgba(245,158,11,0.3)" }}>
          <legend style={{ ...legend, color: "#f59e0b" }}>🧪 Modo teste — Whitelist</legend>
          <div>
            <label style={lbl}>WhatsApp autorizados (1 por linha)</label>
            <textarea
              name="whatsapp_teste_lista"
              rows={3}
              defaultValue={whitelistTexto}
              style={{ ...inp, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              placeholder="5581991594716"
            />
            <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>
              Vazio = todos os contatos (produção). Cola seu número aqui pra testar sem afetar clientes.
            </div>
          </div>
        </fieldset>

        <fieldset style={fs}>
          <legend style={legend}>Tempo de resposta</legend>
          <div style={grid3}>
            <Field label="Debounce (s)" name="delay_debounce_seg" type="number" defaultValue={String(editando?.delay_debounce_seg ?? 20)} />
            <Field label="Delay min (s)" name="delay_min_resposta_seg" type="number" defaultValue={String(editando?.delay_min_resposta_seg ?? 3)} />
            <Field label="Delay max (s)" name="delay_max_resposta_seg" type="number" defaultValue={String(editando?.delay_max_resposta_seg ?? 8)} />
          </div>
        </fieldset>

        <fieldset style={fs}>
          <legend style={legend}>Formato</legend>
          <div style={grid3}>
            <Field label="Máx mensagens (1-5)" name="max_msgs" type="number" defaultValue={String(formato.max_msgs ?? 3)} />
            <div>
              <label style={lbl}>Separador</label>
              <select name="separador_blocos" defaultValue={formato.separador_blocos ?? "\n\n"} style={inp}>
                <option value={"\n\n"}>Linha em branco</option>
                <option value={"\n"}>Quebra simples</option>
                <option value="---">Traço</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Bullets</label>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "8px 0", fontSize: 12 }}>
                <input type="checkbox" name="bullets" defaultChecked={!!formato.bullets} /> Usar
              </label>
            </div>
          </div>
        </fieldset>

        <fieldset style={fs}>
          <legend style={legend}>Onde a IA atua</legend>
          <div>
            <label style={lbl}>Canais (vazio = todos)</label>
            <ChipsPicker
              name="canal_id"
              defaultSelected={Array.from(canaisAtivos)}
              items={canais.map((c) => ({ id: c.id, nome: c.nome, iconTabler: "ti-brand-whatsapp", iconColor: "#25D366" }))}
            />
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={lbl}>Filas (vazio = todas)</label>
            <ChipsPicker
              name="fila_id"
              defaultSelected={Array.from(filasAtivas)}
              items={filas.map((f) => ({ id: f.id, nome: f.nome, cor: f.cor }))}
            />
          </div>
        </fieldset>

        <fieldset style={fs}>
          <legend style={legend}>Avançado</legend>
          <div style={grid3}>
            <Field label="Max tokens" name="max_tokens_por_resposta" type="number" defaultValue={String(editando?.max_tokens_por_resposta ?? 800)} />
            <Field label="Temperatura" name="temperatura" type="number" step="0.1" defaultValue={String(editando?.temperatura ?? 0.7)} />
            <div>
              <label style={lbl}>Pausa humano</label>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "8px 0", fontSize: 12 }}>
                <input type="checkbox" name="pausa_se_humano_responder" defaultChecked={editando?.pausa_se_humano_responder ?? true} /> Sim
              </label>
            </div>
          </div>
          <div>
            <label style={lbl}>Timezone (placeholders {`{{data_hoje}}, {{hora_atual}}`}, etc)</label>
            <select name="timezone" defaultValue={editando?.timezone ?? "America/Sao_Paulo"} style={inp}>
              <option value="America/Sao_Paulo">São Paulo (BRT)</option>
              <option value="America/Manaus">Manaus (AMT)</option>
              <option value="America/Belem">Belém (BRT)</option>
              <option value="America/Cuiaba">Cuiabá (AMT)</option>
              <option value="America/Rio_Branco">Rio Branco (ACT)</option>
              <option value="America/Noronha">Fernando de Noronha (FNT)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </fieldset>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="submit" className="cta-btn"><i className="ti ti-device-floppy" /> {editando ? "Salvar" : "Criar perfil"}</button>
          <Link href="/ia-atendimento" className="ghost-btn">Cancelar</Link>
        </div>
      </form>

      {editandoId && (
        <FerramentasBloco
          perfilId={editandoId}
          ferramentas={ferramentas}
          filas={filas}
          etiquetas={etiquetas}
          galeriaPorFerramenta={galeriaPorFerramenta}
        />
      )}

      {editandoId && (
        <div style={{ marginTop: 18, borderTop: "0.5px solid var(--mk-border)", paddingTop: 16 }}>
          <h3 className="card-title" style={{ marginBottom: 12 }}>
            <i className="ti ti-tag" style={{ color: "#9B7DBF", marginRight: 6 }} /> Etiquetas configuradas
          </h3>
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 10 }}>
            Selecione quais etiquetas a IA pode aplicar. A descrição vira instrução no system prompt
            (ex: &quot;Lead Quente — cliente pediu orçamento&quot;).
          </div>
          <PerfilEtiquetasEditor
            perfilId={editandoId}
            todasEtiquetas={etiquetas}
            configuradas={perfilEtiquetas}
          />
        </div>
      )}

      {editandoId && (
        <FollowUpBloco
          perfilId={editandoId}
          sequencias={followupSeqs}
          etapas={followupEtapas}
          etiquetas={etiquetas}
        />
      )}

      {editandoId && (
        <div style={{ marginTop: 18, borderTop: "0.5px solid var(--mk-border)", paddingTop: 16 }}>
          <h3 className="card-title" style={{ marginBottom: 6 }}>
            <i className="ti ti-message-2-share" style={{ color: "#9B7DBF", marginRight: 6 }} /> Envio de resumo
          </h3>
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 8 }}>
            Quando IA transferir o ticket pra humano, gera resumo via Groq + envia em grupo/privado.
          </div>
          <ResumoConfigBalao
            perfilId={editandoId}
            canais={canais}
            config={resumoConfig}
          />
        </div>
      )}

      {editandoId && resumoUso && (
        <UsoTokensCard resumo={resumoUso} intervalo={intervaloUso} perfilId={editandoId} />
      )}
      {editandoId && logs.length > 0 && <LogsBloco logs={logs} />}
    </div>
  );
}

function FerramentasBloco({
  perfilId,
  ferramentas,
  filas,
  etiquetas,
  galeriaPorFerramenta,
}: {
  perfilId: string;
  ferramentas: FerramentaRow[];
  filas: FilaRow[];
  etiquetas: EtiquetaRow[];
  galeriaPorFerramenta: Record<string, ImagemGaleria[]>;
}) {
  return (
    <div style={{ marginTop: 24, borderTop: "0.5px solid var(--mk-border)", paddingTop: 16 }}>
      <h3 className="card-title" style={{ marginBottom: 14 }}>
        <i className="ti ti-tool" style={{ color: "#9B7DBF", marginRight: 6 }} /> Ferramentas
      </h3>
      {ferramentas.length === 0 ? (
        <div style={{ padding: 14, color: "var(--mk-text-muted)", fontSize: 12, textAlign: "center", border: "0.5px dashed var(--mk-border)", borderRadius: 8, marginBottom: 12 }}>
          Sem ferramentas custom. As fixas (manda_biscoito, transferir_para_humano, aplicar_etiqueta, criar_nota, consultar_data) já vem ativas.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {ferramentas.map((f) => (
            <div
              key={f.id}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "0.5px solid var(--mk-border)",
                background: "var(--mk-surface)",
                display: "flex",
                alignItems: "center",
                gap: 10,
                opacity: f.ativo ? 1 : 0.55,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                  {f.nome}{" "}
                  <span style={{ fontSize: 10, color: "#9B7DBF", marginLeft: 6 }}>{ACOES[f.acao] || f.acao}</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 2 }}>{f.descricao}</div>
              </div>

              <EditarFerramentaBtn
                ferramenta={f}
                perfilId={perfilId}
                filas={filas}
                etiquetas={etiquetas}
                imagensGaleria={galeriaPorFerramenta[f.id] || []}
              />

              <form action={alternarAtivoFerramentaIA} style={{ display: "inline" }}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="perfil_id" value={perfilId} />
                <input type="hidden" name="ativo" value={String(f.ativo)} />
                <button
                  type="submit"
                  className={`toggle-switch ${f.ativo ? "is-on" : ""}`}
                  aria-pressed={f.ativo}
                  title={f.ativo ? "Desativar" : "Ativar"}
                >
                  <span className="toggle-knob" />
                </button>
              </form>

              <form action={deletarFerramentaIA} style={{ display: "inline" }}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="perfil_id" value={perfilId} />
                <button type="submit" className="ghost-btn" style={{ fontSize: 11, color: "#C97064" }}>
                  <i className="ti ti-trash" />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 6 }}>Adicionar ferramenta</div>
      <FerramentaForm perfilId={perfilId} filas={filas} etiquetas={etiquetas} />
    </div>
  );
}

function LogsBloco({ logs }: { logs: LogRow[] }) {
  const corPorEvento: Record<string, string> = {
    resposta: "#10b981",
    tool_call: "#9B7DBF",
    erro: "#C97064",
    pausa_humano: "#f59e0b",
    encerrado: "#94a3b8",
  };
  return (
    <div style={{ marginTop: 24, borderTop: "0.5px solid var(--mk-border)", paddingTop: 16 }}>
      <h3 className="card-title" style={{ marginBottom: 14 }}>
        <i className="ti ti-history" style={{ color: "#9B7DBF", marginRight: 6 }} /> Histórico (últimas 50)
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 400, overflowY: "auto" }}>
        {logs.map((l) => {
          const cor = corPorEvento[l.evento] || "#94a3b8";
          const payload = (l.payload || {}) as Record<string, unknown>;
          return (
            <div key={l.id} style={{ padding: "8px 12px", borderLeft: `3px solid ${cor}`, background: "var(--mk-surface)", borderRadius: 6, fontSize: 11.5 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: `${cor}22`, color: cor, fontWeight: 600, textTransform: "uppercase" }}>{l.evento}</span>
                <span style={{ color: "var(--mk-text-muted)" }}>{new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                {l.modelo && <span style={{ fontSize: 10, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>· {l.modelo}</span>}
                {(l.tokens_in || l.tokens_out) ? <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>· {l.tokens_in}↓ / {l.tokens_out}↑</span> : null}
              </div>
              {l.evento === "resposta" && payload.texto ? (
                <div style={{ marginTop: 4, padding: "6px 10px", background: "var(--mk-surface-2)", borderRadius: 4, fontSize: 11.5 }}>
                  {String(payload.texto).slice(0, 280)}
                </div>
              ) : null}
              {l.evento === "tool_call" ? (
                <div style={{ marginTop: 4, fontSize: 11, color: "var(--mk-text-secondary)" }}>
                  <strong style={{ color: "#9B7DBF" }}>{String(payload.tool || "?")}</strong>
                  {payload.resultado ? <span> → {String(payload.resultado)}</span> : null}
                </div>
              ) : null}
              {l.evento === "pausa_humano" && payload.motivo ? (
                <div style={{ marginTop: 4, fontSize: 11, color: "var(--mk-text-secondary)" }}>
                  <strong style={{ color: "#f59e0b" }}>{String(payload.motivo)}</strong>
                  {payload.numero ? <span> · número: <code style={{ fontFamily: "monospace" }}>{String(payload.numero)}</code></span> : null}
                  {payload.whitelist ? (
                    <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 2, fontFamily: "monospace" }}>
                      whitelist: {JSON.stringify(payload.whitelist)}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {l.erro && <div style={{ marginTop: 4, color: "#C97064", fontSize: 11 }}>⚠ {l.erro}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Banner({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  const cor = tipo === "ok" ? "#10b981" : "#C97064";
  return <div style={{ background: tipo === "ok" ? "rgba(16,185,129,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, marginBottom: 14 }}><i className={`ti ${tipo === "ok" ? "ti-circle-check" : "ti-alert-triangle"}`} style={{ marginRight: 8, color: cor }} />{children}</div>;
}
function labelOk(k: string) {
  return ({ criado: "Perfil criado.", atualizado: "Atualizado.", alterado: "Status alterado.", deletado: "Excluído.", ferramenta_criada: "Ferramenta criada.", ferramenta_deletada: "Removida." } as Record<string, string>)[k] || "OK.";
}
function labelErr(k: string) {
  return ({ nome: "Nome obrigatório.", id: "ID inválido.", db: "Erro no banco.", campos: "Campos obrigatórios." } as Record<string, string>)[k] || "Erro.";
}
function Field({ label, name, defaultValue, placeholder, required, type = "text", step }: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean; type?: string; step?: string }) {
  return (
    <div>
      <label style={lbl}>{label}{required && <span style={{ color: "#C97064" }}> *</span>}</label>
      <input type={type} step={step} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} style={inp} />
    </div>
  );
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10.5, color: "var(--mk-text-muted)", background: "var(--mk-surface-2)", padding: "3px 8px", borderRadius: 6 }}>{children}</span>;
}
function chip(ativo: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11.5,
    padding: "5px 10px",
    borderRadius: 999,
    border: `0.5px solid ${ativo ? "#10b981" : "var(--mk-border)"}`,
    background: ativo ? "rgba(16,185,129,0.18)" : "var(--mk-surface)",
    color: ativo ? "#10b981" : "var(--mk-text-secondary)",
    cursor: "pointer",
  };
}
const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 };
const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 };
const fs: React.CSSProperties = { border: "0.5px solid var(--mk-border)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 10 };
const legend: React.CSSProperties = { fontSize: 11.5, fontWeight: 600, padding: "0 6px", color: "var(--mk-text-secondary)" };
const templateCard: React.CSSProperties = { display: "flex", gap: 8, padding: "10px 12px", borderRadius: 8, border: "0.5px solid rgba(155,125,191,0.4)", background: "var(--mk-surface)", cursor: "pointer", alignItems: "flex-start" };
