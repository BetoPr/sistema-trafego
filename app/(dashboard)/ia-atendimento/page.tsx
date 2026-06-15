import Link from "next/link";
import { requireAuth } from "@/lib/crm/permissions";
import { createServiceClient } from "@/lib/supabase/service";
import {
  criarPerfilIA,
  atualizarPerfilIA,
  deletarPerfilIA,
  alternarAtivoPerfilIA,
  criarFerramentaIA,
  deletarFerramentaIA,
} from "./_actions";

interface PageProps {
  searchParams: Promise<{ editar?: string; novo?: string; ok?: string; erro?: string; msg?: string }>;
}

const MODELOS: Record<string, Array<{ id: string; nome: string }>> = {
  anthropic: [
    { id: "claude-haiku-4-5-20251001", nome: "Claude Haiku 4.5 (rápido, barato)" },
    { id: "claude-sonnet-4-6", nome: "Claude Sonnet 4.6 (equilibrado)" },
    { id: "claude-opus-4-8", nome: "Claude Opus 4.8 (mais inteligente)" },
    { id: "claude-fable-5", nome: "Claude Fable 5 (criativo)" },
  ],
  openai: [
    { id: "gpt-4o-mini", nome: "GPT-4o mini (rápido, barato)" },
    { id: "gpt-4o", nome: "GPT-4o (padrão)" },
    { id: "gpt-4.1", nome: "GPT-4.1 (avançado)" },
    { id: "gpt-4.1-mini", nome: "GPT-4.1 mini" },
    { id: "gpt-4.1-nano", nome: "GPT-4.1 nano (ultra rápido)" },
    { id: "o1", nome: "o1 (raciocínio)" },
    { id: "o1-mini", nome: "o1 mini" },
    { id: "o3-mini", nome: "o3 mini (reasoning rápido)" },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", nome: "Llama 3.3 70B (gratuito*)" },
    { id: "llama-3.1-8b-instant", nome: "Llama 3.1 8B (mais rápido)" },
    { id: "qwen-2.5-32b", nome: "Qwen 2.5 32B" },
    { id: "deepseek-r1-distill-llama-70b", nome: "DeepSeek R1 Distill (raciocínio)" },
  ],
};

const ACOES: Record<string, { nome: string; descricao: string; paramsExemplo: string }> = {
  aplicar_etiqueta: { nome: "Aplicar etiqueta", descricao: "IA marca o contato com etiqueta específica", paramsExemplo: '{"etiqueta_nome": "Lead Quente"}' },
  transferir_para_fila: { nome: "Transferir pra fila", descricao: "Move ticket pra uma fila específica", paramsExemplo: '{"fila_nome": "Vendas"}' },
  transferir_para_humano: { nome: "Transferir pra humano", descricao: "Tira IA do ticket, atendente assume", paramsExemplo: '{"motivo": "Cliente pediu falar com humano"}' },
  agendar_followup: { nome: "Agendar follow-up", descricao: "Programa msg pra disparar depois", paramsExemplo: '{"minutos": 30, "texto": "Oi! Conseguiu pensar na proposta?"}' },
  enviar_template: { nome: "Enviar template", descricao: "Manda mensagem rápida cadastrada", paramsExemplo: '{"template_id": "uuid"}' },
  marcar_qualificado: { nome: "Marcar qualificado", descricao: "Sinaliza lead como quente com score", paramsExemplo: '{"score": 8, "observacao": "Interesse confirmado"}' },
  criar_nota: { nome: "Criar nota interna", descricao: "Anota algo no ticket pra equipe ver", paramsExemplo: '{"texto": "Cliente prefere ligação à tarde"}' },
};

export default async function IAAtendimentoPage({ searchParams }: PageProps) {
  const ctx = await requireAuth();
  const sp = await searchParams;
  const sb = createServiceClient();

  const [{ data: perfis }, { data: canais }, { data: filas }, { data: etiquetas }, { data: templates }] = await Promise.all([
    sb.from("ia_atendimento_perfis").select("id, nome, descricao, ativo, modelo, provider, created_at").eq("agencia_id", ctx.agenciaId).eq("eh_template", false).order("nome"),
    sb.from("canais").select("id, nome, status, numero_conectado").eq("agencia_id", ctx.agenciaId).order("nome"),
    sb.from("filas").select("id, nome, cor").eq("agencia_id", ctx.agenciaId).eq("ativa", true).order("nome"),
    sb.from("etiquetas").select("id, nome, cor").eq("agencia_id", ctx.agenciaId).eq("ativo", true).order("nome"),
    sb.from("ia_atendimento_perfis").select("id, nome, descricao, template_tipo, modelo, provider").is("agencia_id", null).eq("eh_template", true).order("nome"),
  ]);

  const editando = sp.editar ? perfis?.find((p) => p.id === sp.editar) : null;
  const mostrarForm = !!editando || sp.novo === "1";

  // Detalhes do perfil editando
  let perfilDetalhe: Record<string, unknown> | null = null;
  let ferramentas: Array<{ id: string; nome: string; descricao: string; acao: string; parametros: Record<string, unknown>; ativo: boolean }> = [];
  let logs: Array<{ id: string; evento: string; modelo: string | null; tokens_in: number | null; tokens_out: number | null; payload: Record<string, unknown> | null; erro: string | null; created_at: string }> = [];
  if (editando) {
    const [{ data: p }, { data: fs }, { data: lgs }] = await Promise.all([
      sb.from("ia_atendimento_perfis").select("*").eq("id", editando.id).single(),
      sb.from("ia_atendimento_ferramentas").select("id, nome, descricao, acao, parametros, ativo").eq("perfil_id", editando.id).order("nome"),
      sb.from("ia_atendimento_log").select("id, evento, modelo, tokens_in, tokens_out, payload, erro, created_at").eq("perfil_id", editando.id).order("created_at", { ascending: false }).limit(50),
    ]);
    perfilDetalhe = p as Record<string, unknown>;
    ferramentas = (fs || []) as typeof ferramentas;
    logs = (lgs || []) as typeof logs;
  }

  return (
    <section className="mk-page">
      <div className="mk-page-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="mk-eyebrow">Atendimento</div>
          <h1 className="mk-page-title">IA de Atendimento <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: "rgba(155,125,191,0.18)", color: "#9B7DBF", marginLeft: 8, verticalAlign: "middle", fontWeight: 600 }}>BÁSICA</span></h1>
          <p className="mk-page-sub">Atendente IA que qualifica leads, etiqueta e transfere pra humano. Você cadastra a chave (Claude/GPT/Groq) e o prompt — paga só pelo uso da sua API.</p>
        </div>
        {!mostrarForm && <Link href="/ia-atendimento?novo=1" className="cta-btn"><i className="ti ti-plus" /> Novo perfil</Link>}
      </div>

      {sp.ok && <Banner tipo="ok">{labelOk(sp.ok)}</Banner>}
      {sp.erro && <Banner tipo="erro">{labelErr(sp.erro)} {sp.msg && `— ${decodeURIComponent(sp.msg)}`}</Banner>}

      {!mostrarForm && (
        <div className="mk-card mk-card-lg" style={{ marginBottom: 14, background: "rgba(155,125,191,0.06)", border: "0.5px solid rgba(155,125,191,0.3)" }}>
          <h3 className="card-title" style={{ marginBottom: 6 }}>
            <i className="ti ti-info-circle" style={{ color: "#9B7DBF", marginRight: 6 }} /> Como funciona
          </h3>
          <ul style={{ fontSize: 12.5, color: "var(--mk-text-secondary)", lineHeight: 1.7, margin: 0, paddingLeft: 18 }}>
            <li><strong>BYOK</strong> — você cadastra sua chave da Anthropic/OpenAI/Groq. Custo direto na sua conta.</li>
            <li><strong>Debounce</strong> — quando o cliente manda várias mensagens seguidas, sistema espera N segundos sem msg nova antes de mandar tudo junto pra IA (parece humano).</li>
            <li><strong>Tools</strong> — IA decide aplicar etiqueta, transferir pra humano, agendar follow-up, etc. Você cadastra as ações disponíveis.</li>
            <li><strong>Formato</strong> — você define em quantas mensagens dividir a resposta baseado no tamanho do texto. Delay aleatório entre cada msg (anti-ban).</li>
            <li><strong>Pausa humano</strong> — assim que atendente humano envia uma msg no ticket, IA para automaticamente.</li>
          </ul>
        </div>
      )}

      {mostrarForm && (
        <PerfilForm
          editando={editando ? ((perfilDetalhe || editando) as unknown as PerfilDetalhe) : null}
          canais={(canais || []) as Array<{ id: string; nome: string; status: string; numero_conectado: string | null }>}
          filas={(filas || []) as Array<{ id: string; nome: string; cor: string }>}
          etiquetas={(etiquetas || []) as Array<{ id: string; nome: string; cor: string }>}
          ferramentas={ferramentas}
          templates={(templates || []) as Array<{ id: string; nome: string; descricao: string | null; template_tipo: string | null }>}
          logs={logs}
        />
      )}

      {!mostrarForm && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {(perfis || []).length === 0 ? (
            <div className="mk-card mk-card-lg" style={{ gridColumn: "1/-1", textAlign: "center", padding: "32px 14px", color: "var(--mk-text-muted)", fontSize: 13 }}>
              Nenhum perfil de IA. Crie o primeiro.
            </div>
          ) : perfis?.map((p) => (
            <div key={p.id} className="mk-card mk-card-lg">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 600, color: "var(--mk-text)" }}>{p.nome}</h4>
                  {p.descricao && <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 2 }}>{p.descricao}</div>}
                </div>
                <form action={alternarAtivoPerfilIA} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="ativo" value={String(p.ativo)} />
                  <button type="submit" className={`toggle-switch ${p.ativo ? "is-on" : ""}`} aria-pressed={p.ativo} title={p.ativo ? "Desativar" : "Ativar"}>
                    <span className="toggle-knob" />
                  </button>
                </form>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                <Chip>{p.provider}</Chip>
                <Chip>{(p.modelo as string).split("-").slice(0, 2).join(" ")}</Chip>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 12, borderTop: "0.5px solid var(--mk-border)", paddingTop: 10 }}>
                <Link href={`/ia-atendimento?editar=${p.id}`} className="ghost-btn" style={{ fontSize: 12, flex: 1, justifyContent: "center" }}>
                  <i className="ti ti-pencil" /> Editar
                </Link>
                <form action={deletarPerfilIA} style={{ display: "inline" }}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="ghost-btn" style={{ fontSize: 12, color: "#C97064" }} onClick={(e) => { if (!confirm(`Excluir "${p.nome}"?`)) e.preventDefault(); }}>
                    <i className="ti ti-trash" />
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

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
  formato_resposta: { bullets: boolean; separador_blocos: string; max_msgs: number };
}

function PerfilForm({
  editando, canais, filas, etiquetas, ferramentas, templates, logs,
}: {
  editando: PerfilDetalhe | null;
  canais: Array<{ id: string; nome: string; status: string; numero_conectado: string | null }>;
  filas: Array<{ id: string; nome: string; cor: string }>;
  etiquetas: Array<{ id: string; nome: string; cor: string }>;
  ferramentas: Array<{ id: string; nome: string; descricao: string; acao: string; parametros: Record<string, unknown>; ativo: boolean }>;
  templates: Array<{ id: string; nome: string; descricao: string | null; template_tipo: string | null }>;
  logs: Array<{ id: string; evento: string; modelo: string | null; tokens_in: number | null; tokens_out: number | null; payload: Record<string, unknown> | null; erro: string | null; created_at: string }>;
}) {
  const provider = (editando?.provider as string) || "anthropic";
  const canaisAtivos = new Set(editando?.canais_ativos || []);
  const filasAtivas = new Set(editando?.filas_ativas || []);
  const formato = editando?.formato_resposta || { bullets: false, separador_blocos: "\n\n", max_msgs: 3 };

  return (
    <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
      <h3 className="card-title" style={{ marginBottom: 14 }}>{editando ? `Editar — ${editando.nome}` : "Novo perfil de IA"}</h3>
      <form action={editando ? atualizarPerfilIA : criarPerfilIA} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {editando && <input type="hidden" name="id" value={editando.id} />}

        {!editando && templates.length > 0 && (
          <fieldset style={{ ...fs, background: "rgba(155,125,191,0.08)", border: "0.5px solid rgba(155,125,191,0.3)" }}>
            <legend style={{ ...legend, color: "#9B7DBF" }}>🎨 Aplicar template (opcional)</legend>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
              <label style={{ ...templateCard, borderColor: "var(--mk-border)" }}>
                <input type="radio" name="template_id" value="" defaultChecked style={{ display: "none" }} />
                <i className="ti ti-pencil" style={{ color: "var(--mk-text-muted)" }} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>Em branco</div>
                  <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>Configurar do zero</div>
                </div>
              </label>
              {templates.map((t) => (
                <label key={t.id} style={templateCard}>
                  <input type="radio" name="template_id" value={t.id} style={{ display: "none" }} />
                  <i className="ti ti-sparkles" style={{ color: "#9B7DBF" }} />
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{t.nome}</div>
                    <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>{t.descricao}</div>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>
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

        <Field label="Descrição (interno)" name="descricao" defaultValue={editando?.descricao ?? ""} placeholder="Pra que esse perfil serve" />

        <fieldset style={fs}>
          <legend style={legend}>Modelo IA</legend>
          <div style={grid2}>
            <div>
              <label style={lbl}>Provider</label>
              <select name="provider" defaultValue={provider} style={inp} id="provider-select">
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="groq">Groq (Llama)</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Modelo</label>
              <select name="modelo" defaultValue={editando?.modelo ?? "claude-haiku-4-5-20251001"} style={inp}>
                {Object.entries(MODELOS).flatMap(([prov, lista]) =>
                  lista.map((m) => (
                    <option key={m.id} value={m.id} data-provider={prov}>{m.nome}</option>
                  ))
                )}
              </select>
            </div>
          </div>
          <Field
            label={`Chave API (${provider === "anthropic" ? "console.anthropic.com" : provider === "openai" ? "platform.openai.com" : "console.groq.com"})`}
            name="api_key"
            type="password"
            placeholder={editando ? "Deixe em branco pra manter a atual" : "sk-..."}
          />
        </fieldset>

        <fieldset style={fs}>
          <legend style={legend}>Prompt do sistema</legend>
          <textarea
            name="prompt_sistema"
            rows={10}
            defaultValue={editando?.prompt_sistema ?? promptDefault()}
            style={{ ...inp, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
            placeholder="Você é um atendente da empresa X. Seja educado..."
          />
          <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4, lineHeight: 1.5 }}>
            Variáveis disponíveis: <code>{"{nome_cliente}"}</code> <code>{"{nome_agencia}"}</code> <code>{"{ultima_etiqueta}"}</code>
          </div>
        </fieldset>

        <fieldset style={fs}>
          <legend style={legend}>Tempo de resposta (anti-ban)</legend>
          <div style={grid3}>
            <Field label="Debounce (segundos)" name="delay_debounce_seg" type="number" defaultValue={String(editando?.delay_debounce_seg ?? 20)} hint="Espera N seg sem msg nova do cliente antes de processar" />
            <Field label="Delay min entre msgs (seg)" name="delay_min_resposta_seg" type="number" defaultValue={String(editando?.delay_min_resposta_seg ?? 3)} />
            <Field label="Delay max entre msgs (seg)" name="delay_max_resposta_seg" type="number" defaultValue={String(editando?.delay_max_resposta_seg ?? 8)} />
          </div>
        </fieldset>

        <fieldset style={fs}>
          <legend style={legend}>Formato de resposta</legend>
          <div style={grid3}>
            <Field label="Máx mensagens (1-5)" name="max_msgs" type="number" defaultValue={String(formato.max_msgs)} />
            <div>
              <label style={lbl}>Separador de blocos</label>
              <select name="separador_blocos" defaultValue={formato.separador_blocos} style={inp}>
                <option value="\n\n">Linha em branco (\n\n)</option>
                <option value="\n">Quebra simples (\n)</option>
                <option value="---">Traço (---)</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Bullets</label>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "8px 0", fontSize: 12 }}>
                <input type="checkbox" name="bullets" defaultChecked={formato.bullets} /> Usar bullets
              </label>
            </div>
          </div>
          <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>
            Regras de split automático: até 80 chars = 1 msg, 80-200 = 2, 200-500 = 3, mais que isso = max_msgs.
          </div>
        </fieldset>

        <fieldset style={{ ...fs, background: "rgba(245,158,11,0.06)", border: "0.5px solid rgba(245,158,11,0.3)" }}>
          <legend style={{ ...legend, color: "#f59e0b" }}>🧪 Modo teste — Whitelist de números</legend>
          <div>
            <label style={lbl}>WhatsApp autorizados (1 por linha)</label>
            <textarea
              name="whatsapp_teste_lista"
              rows={3}
              defaultValue={(((editando as unknown as { whatsapp_teste_lista?: string[] })?.whatsapp_teste_lista) || []).join("\n")}
              style={{ ...inp, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
              placeholder="5581991594716"
            />
            <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>
              <strong style={{ color: "#f59e0b" }}>Vazio = todos os contatos (modo produção).</strong> Coloque seu número aqui pra testar sem afetar clientes reais.
            </div>
          </div>
        </fieldset>

        <fieldset style={fs}>
          <legend style={legend}>Onde a IA atua</legend>
          <div>
            <label style={lbl}>Canais ativos (vazio = todos)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {canais.map((c) => (
                <label key={c.id} style={chip(canaisAtivos.has(c.id))}>
                  <input type="checkbox" name="canal_id" value={c.id} defaultChecked={canaisAtivos.has(c.id)} style={{ display: "none" }} />
                  <i className="ti ti-brand-whatsapp" style={{ color: "#25D366" }} /> {c.nome} {c.numero_conectado && <small style={{ opacity: 0.7 }}>({c.numero_conectado})</small>}
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <label style={lbl}>Filas ativas (vazio = todas)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {filas.map((f) => (
                <label key={f.id} style={chip(filasAtivas.has(f.id))}>
                  <input type="checkbox" name="fila_id" value={f.id} defaultChecked={filasAtivas.has(f.id)} style={{ display: "none" }} />
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: f.cor, marginRight: 4 }} /> {f.nome}
                </label>
              ))}
            </div>
          </div>
        </fieldset>

        <fieldset style={fs}>
          <legend style={legend}>Avançado</legend>
          <div style={grid3}>
            <Field label="Max tokens/resposta" name="max_tokens_por_resposta" type="number" defaultValue={String(editando?.max_tokens_por_resposta ?? 800)} />
            <Field label="Temperatura (0-2)" name="temperatura" type="number" step="0.1" defaultValue={String(editando?.temperatura ?? 0.7)} />
            <div>
              <label style={lbl}>Pausa se humano responde</label>
              <label style={{ display: "inline-flex", gap: 8, alignItems: "center", padding: "8px 0", fontSize: 12 }}>
                <input type="checkbox" name="pausa_se_humano_responder" defaultChecked={editando?.pausa_se_humano_responder ?? true} /> Sim
              </label>
            </div>
          </div>
        </fieldset>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button type="submit" className="cta-btn"><i className="ti ti-device-floppy" /> {editando ? "Salvar" : "Criar perfil"}</button>
          <Link href="/ia-atendimento" className="ghost-btn">Cancelar</Link>
        </div>
      </form>

      {editando && (
        <FerramentasBloco perfilId={editando.id} ferramentas={ferramentas} etiquetas={etiquetas} filas={filas} />
      )}

      {editando && (
        <LogsBloco logs={logs} />
      )}
    </div>
  );
}

function LogsBloco({ logs }: { logs: Array<{ id: string; evento: string; modelo: string | null; tokens_in: number | null; tokens_out: number | null; payload: Record<string, unknown> | null; erro: string | null; created_at: string }> }) {
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
        <i className="ti ti-history" style={{ color: "#9B7DBF", marginRight: 6 }} /> Histórico da IA (últimas 50 ações)
      </h3>
      {logs.length === 0 ? (
        <div style={{ padding: 14, color: "var(--mk-text-muted)", fontSize: 12, textAlign: "center", border: "0.5px dashed var(--mk-border)", borderRadius: 8 }}>
          IA ainda não foi acionada. Quando receber uma msg de um número da whitelist (ou qualquer um se whitelist vazia), o log aparece aqui.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 400, overflowY: "auto" }}>
          {logs.map((l) => {
            const cor = corPorEvento[l.evento] || "#94a3b8";
            const payload = (l.payload || {}) as Record<string, unknown>;
            return (
              <div key={l.id} style={{ padding: "8px 12px", borderLeft: `3px solid ${cor}`, background: "var(--mk-surface)", borderRadius: 6, fontSize: 11.5 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: `${cor}22`, color: cor, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.3 }}>{l.evento}</span>
                  <span style={{ color: "var(--mk-text-muted)" }}>{new Date(l.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                  {l.modelo && <span style={{ fontSize: 10, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>· {l.modelo}</span>}
                  {(l.tokens_in || l.tokens_out) ? <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>· {l.tokens_in}↓ / {l.tokens_out}↑ tokens</span> : null}
                </div>
                {l.evento === "resposta" && payload.texto ? (
                  <div style={{ marginTop: 4, padding: "6px 10px", background: "var(--mk-surface-2)", borderRadius: 4, color: "var(--mk-text)", fontSize: 11.5 }}>
                    {String(payload.texto).slice(0, 280)}{String(payload.texto).length > 280 ? "…" : ""}
                  </div>
                ) : null}
                {l.evento === "tool_call" ? (
                  <div style={{ marginTop: 4, fontSize: 11, color: "var(--mk-text-secondary)" }}>
                    <strong style={{ color: "#9B7DBF" }}>{String(payload.tool || "?")}</strong>
                    {payload.resultado ? <span> → {String(payload.resultado)}</span> : null}
                  </div>
                ) : null}
                {l.erro && <div style={{ marginTop: 4, color: "#C97064", fontSize: 11 }}>⚠ {l.erro}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FerramentasBloco({
  perfilId, ferramentas, etiquetas, filas,
}: {
  perfilId: string;
  ferramentas: Array<{ id: string; nome: string; descricao: string; acao: string; parametros: Record<string, unknown>; ativo: boolean }>;
  etiquetas: Array<{ id: string; nome: string; cor: string }>;
  filas: Array<{ id: string; nome: string; cor: string }>;
}) {
  void etiquetas; void filas; // pra futuro autocomplete
  return (
    <div style={{ marginTop: 24, borderTop: "0.5px solid var(--mk-border)", paddingTop: 16 }}>
      <h3 className="card-title" style={{ marginBottom: 14 }}>
        <i className="ti ti-tool" style={{ color: "#9B7DBF", marginRight: 6 }} /> Ferramentas da IA
      </h3>
      <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 12 }}>
        Cadastre ações que a IA pode chamar durante a conversa. Quanto mais clara a descrição, melhor ela decide quando usar.
      </p>

      {ferramentas.length === 0 ? (
        <div style={{ padding: 14, color: "var(--mk-text-muted)", fontSize: 12, textAlign: "center", border: "0.5px dashed var(--mk-border)", borderRadius: 8 }}>
          Nenhuma ferramenta cadastrada. Comece com uma de cada tipo.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {ferramentas.map((f) => (
            <div key={f.id} style={{ padding: "10px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{f.nome} <span style={{ fontSize: 10, color: "#9B7DBF", marginLeft: 6 }}>{ACOES[f.acao]?.nome || f.acao}</span></div>
                <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 2 }}>{f.descricao}</div>
                <div style={{ fontSize: 10, color: "var(--mk-text-muted)", fontFamily: "monospace", marginTop: 2 }}>{JSON.stringify(f.parametros)}</div>
              </div>
              <form action={deletarFerramentaIA} style={{ display: "inline" }}>
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="perfil_id" value={perfilId} />
                <button type="submit" className="ghost-btn" style={{ fontSize: 11, color: "#C97064" }}><i className="ti ti-trash" /></button>
              </form>
            </div>
          ))}
        </div>
      )}

      <div style={{ padding: 12, borderRadius: 8, background: "var(--mk-surface)", border: "0.5px dashed var(--mk-border)" }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 8 }}>Adicionar ferramenta</div>
        <form action={criarFerramentaIA} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input type="hidden" name="perfil_id" value={perfilId} />
          <div style={grid2}>
            <Field label="Nome técnico" name="nome" placeholder="aplicar_etiqueta_lead_quente" required />
            <div>
              <label style={lbl}>Ação</label>
              <select name="acao" style={inp} required>
                <option value="">— Escolha —</option>
                {Object.entries(ACOES).map(([k, v]) => <option key={k} value={k}>{v.nome}</option>)}
              </select>
            </div>
          </div>
          <Field label="Descrição pra IA decidir quando usar" name="descricao" placeholder="Use quando o cliente mostrar interesse forte ou pedir pra comprar" required />
          <div>
            <label style={lbl}>Parâmetros (JSON)</label>
            <textarea name="parametros" rows={3} placeholder='{"etiqueta_nome": "Lead Quente"}' style={{ ...inp, fontFamily: "monospace", fontSize: 11.5 }} />
            <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>
              Exemplos: <code>{'{"etiqueta_nome": "Lead Quente"}'}</code> · <code>{'{"fila_nome": "Vendas"}'}</code> · <code>{'{"minutos": 30, "texto": "Volto?"}'}</code>
            </div>
          </div>
          <button type="submit" className="ghost-btn" style={{ fontSize: 12, alignSelf: "flex-start" }}><i className="ti ti-plus" /> Adicionar</button>
        </form>
      </div>
    </div>
  );
}

function promptDefault() {
  return `Você é um atendente comercial da {nome_agencia} pelo WhatsApp.

Sua missão:
- Ser educado, direto e útil
- Qualificar o lead (entender o que ele quer)
- Aplicar etiqueta quando identificar interesse
- Transferir pra humano quando o cliente pedir, mostrar irritação ou for negociação final

Estilo:
- Português brasileiro informal mas profissional
- Mensagens curtas (até 3 frases por bloco)
- Sem emojis em excesso (máx 1 por mensagem)
- Nunca invente preço ou prazo se não souber — transfira pra humano

Quando NÃO souber a resposta, use a ferramenta transferir_para_humano.`;
}

function Banner({ tipo, children }: { tipo: "ok" | "erro"; children: React.ReactNode }) {
  const cor = tipo === "ok" ? "#10b981" : "#C97064";
  return <div style={{ background: tipo === "ok" ? "rgba(16,185,129,0.12)" : "rgba(201,112,100,0.12)", borderLeft: `3px solid ${cor}`, padding: "10px 14px", borderRadius: 8, fontSize: 12, color: "var(--mk-text-secondary)", marginBottom: 14 }}><i className={`ti ${tipo === "ok" ? "ti-circle-check" : "ti-alert-triangle"}`} style={{ marginRight: 8, color: cor }} />{children}</div>;
}
function labelOk(k: string) {
  return ({ criado: "Perfil criado.", atualizado: "Atualizado.", alterado: "Status alterado.", deletado: "Excluído.", ferramenta_criada: "Ferramenta criada.", ferramenta_deletada: "Removida.", followup_salvo: "Follow-up salvo." } as Record<string, string>)[k] || "OK.";
}
function labelErr(k: string) {
  return ({ nome: "Nome obrigatório.", id: "ID inválido.", db: "Erro no banco.", campos: "Campos obrigatórios." } as Record<string, string>)[k] || "Erro.";
}
function Field({ label, name, defaultValue, placeholder, required, type = "text", step, hint }: { label: string; name: string; defaultValue?: string; placeholder?: string; required?: boolean; type?: string; step?: string; hint?: string }) {
  return (
    <div>
      <label style={lbl}>{label}{required && <span style={{ color: "#C97064" }}> *</span>}</label>
      <input type={type} step={step} name={name} defaultValue={defaultValue} placeholder={placeholder} required={required} style={inp} />
      {hint && <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>{hint}</div>}
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
