"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Balao } from "@/components/ui/Balao";
import { BolhaEspiada, type MsgEspiada } from "@/app/(dashboard)/atendimentos/_espiar-msg";
import { useFollowUpRun, type Cand, CADENCIA_PADRAO } from "@/app/(dashboard)/_crm-overlays";

interface Etiqueta { id: string; nome: string; cor: string }
interface Canal { id: string; nome: string; status: string }

type Janela = "hoje" | "7d" | "15d" | "periodo";
type StatusFiltro = "ambos" | "aberto" | "pendente";

const TONS: { v: string; label: string }[] = [
  { v: "", label: "Padrão (IA decide)" },
  { v: "direto", label: "Direto" },
  { v: "emocional", label: "Emocional" },
  { v: "na_dor", label: "Na dor" },
  { v: "contextualizado", label: "Contextualizado c/ histórico" },
  { v: "simpatico", label: "Simpático" },
];

const ETIQUETAS_FOLLOWUP = ["Em follow-up", "Follow-up feito"];

export function FollowUpClient({ etiquetas, canais }: { etiquetas: Etiqueta[]; canais: Canal[] }) {
  return <FollowUpIA etiquetas={etiquetas} canais={canais} />;
}

function FollowUpIA({ etiquetas, canais }: { etiquetas: Etiqueta[]; canais: Canal[] }) {
  // filtros
  const [janela, setJanela] = useState<Janela>("7d");
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const [limite, setLimite] = useState(60);
  const [status, setStatus] = useState<StatusFiltro>("ambos");
  const [etiquetaSel, setEtiquetaSel] = useState<string[]>([]);
  const [canalSel, setCanalSel] = useState<string[]>([]);
  // Limite interno de análises/min — protege contra o teto TPM do GroqCloud.
  // Não exposto na UI (config interna). Ajuste aqui se trocar de plano/modelo.
  const porMinuto = 12;
  const [delayMin, setDelayMin] = useState(30);
  const [delayMax, setDelayMax] = useState(60);

  // dados — vivem no provider GLOBAL (sobrevivem à navegação + alimentam o widget flutuante)
  const run = useFollowUpRun();
  const { cands, analisando, enviandoTodos, patch } = run;
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // balões
  const [espiar, setEspiar] = useState<Cand | null>(null);
  const [etiquetar, setEtiquetar] = useState<Cand | null>(null);
  const [now, setNow] = useState(0);
  useEffect(() => { setNow(Date.now()); }, []);
  // Cadência "padrão" — aplica a config em todos os cards de uma vez.
  const [masterCad, setMasterCad] = useState<CadCfg>(CADENCIA_PADRAO);
  function aplicarCadenciaTodos() { (cands || []).forEach((c) => patch(c.ticketId, { ...masterCad })); }

  async function buscar() {
    setLoading(true); setErro(""); run.pararAnalise(); run.setCands(null);
    try {
      const r = await fetch("/api/follow-up/ia/verificar", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ janela, de: de || undefined, ate: ate || undefined, limite, status, etiquetaIds: etiquetaSel, canalIds: canalSel }),
      });
      const j = await r.json();
      if (!j.ok) { setErro(j.error || "Falha"); return; }
      const lista: Cand[] = (j.candidatos || []).map((c: Pick<Cand, "ticketId" | "contatoId" | "numero" | "nome" | "whatsapp" | "ultima_mensagem_em" | "followups_enviados">) => ({
        ...c, enviar: false, motivo: "", resumo: "", mensagem: "", tom: "", fecharAoDescartar: false, ...CADENCIA_PADRAO, _analisado: false,
      }));
      run.setCands(lista);
    } catch { setErro("Falha na busca"); } finally { setLoading(false); }
  }

  const naoAnalisados = (cands || []).filter((c) => !c._analisado).length;
  const aprovados = (cands || []).filter((c) => c.enviar && !c._sent && c.mensagem.trim());

  return (
    <>
      <style>{`
        @keyframes fu-pop { from { transform: scale(0.6); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes fu-spin { to { transform: rotate(360deg) } }
        .fu-chip { transition: background .15s ease, border-color .15s ease, transform .12s ease, color .15s ease; }
        .fu-chip:active { transform: scale(0.96); }
        .fu-card { transition: opacity .2s ease, box-shadow .2s ease; }
      `}</style>

      {/* ===== Barra de filtros ===== */}
      <div className="mk-card" style={{ padding: 16, marginBottom: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Período */}
        <div>
          <Label>Período (conversas paradas)</Label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {([["hoje", "Hoje"], ["7d", "7 dias"], ["15d", "15 dias"], ["periodo", "Período"]] as [Janela, string][]).map(([v, l]) => (
              <Pill key={v} on={janela === v} onClick={() => setJanela(v)} icon={v === "periodo" ? "ti-calendar" : "ti-clock"}>{l}</Pill>
            ))}
            {janela === "periodo" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
                <input type="date" value={de} onChange={(e) => setDe(e.target.value)} style={{ ...inp, width: 150 }} />
                <span style={{ color: "var(--mk-text-muted)", fontSize: 12 }}>até</span>
                <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={{ ...inp, width: 150 }} />
              </div>
            )}
          </div>
        </div>

        {/* Status + quantidade + ritmo */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-end" }}>
          <div>
            <Label>Status</Label>
            <div style={{ display: "flex", gap: 6 }}>
              {([["ambos", "Ambos"], ["aberto", "Abertos"], ["pendente", "Pendentes"]] as [StatusFiltro, string][]).map(([v, l]) => (
                <Pill key={v} on={status === v} onClick={() => setStatus(v)}>{l}</Pill>
              ))}
            </div>
          </div>
          <Campo label="Quantidade (até 500)"><input type="number" min={1} max={500} value={limite} onChange={(e) => setLimite(Math.max(1, Math.min(500, +e.target.value)))} style={{ ...inp, width: 130 }} /></Campo>
        </div>

        {/* Filtros etiqueta + conexão + delays */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-end" }}>
          <div>
            <Label>Etiqueta</Label>
            <MultiDropdown
              icon="ti-tag" placeholder="Todas"
              options={etiquetas.map((e) => ({ id: e.id, label: e.nome, cor: e.cor }))}
              sel={etiquetaSel} onChange={setEtiquetaSel}
            />
          </div>
          <div>
            <Label>Conexão</Label>
            <MultiDropdown
              icon="ti-plug" placeholder="Todas"
              options={canais.map((c) => ({ id: c.id, label: c.nome, dot: c.status === "connected" ? "#10b981" : "#C97064" }))}
              sel={canalSel} onChange={setCanalSel}
            />
          </div>
          <Campo label="Delay envio min (s)"><input type="number" min={0} value={delayMin} onChange={(e) => setDelayMin(+e.target.value)} style={{ ...inp, width: 110 }} /></Campo>
          <Campo label="Delay envio máx (s)"><input type="number" min={0} value={delayMax} onChange={(e) => setDelayMax(+e.target.value)} style={{ ...inp, width: 110 }} /></Campo>
        </div>

        {/* Ações */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", borderTop: "0.5px solid var(--mk-border)", paddingTop: 12 }}>
          <button className="cta-btn" onClick={buscar} disabled={loading || !!analisando}>
            <i className={`ti ${loading ? "ti-loader-2" : "ti-search"}`} style={loading ? { animation: "fu-spin 1s linear infinite" } : undefined} /> {loading ? "Buscando…" : "Buscar conversas"}
          </button>
          {cands && cands.length > 0 && naoAnalisados > 0 && (
            <button className="cta-btn" onClick={() => run.analisarTodas(porMinuto)} disabled={!!analisando} style={{ background: "#9B7DBF" }}>
              <i className={`ti ${analisando ? "ti-loader-2" : "ti-sparkles"}`} style={analisando ? { animation: "fu-spin 1s linear infinite" } : undefined} /> {analisando ? `Analisando ${analisando.feitos}/${analisando.total}…` : `Analisar ${naoAnalisados} com IA`}
            </button>
          )}
          {aprovados.length > 0 && (
            <button className="ghost-btn" onClick={() => run.enviarTodos(delayMin, delayMax)} disabled={enviandoTodos}>
              <i className="ti ti-send" /> {enviandoTodos ? "Enviando…" : `Enviar ${aprovados.length} aprovado(s)`}
            </button>
          )}
          {cands && (
            <span style={{ fontSize: 12, color: "var(--mk-text)", fontWeight: 600, marginLeft: "auto" }}>
              <i className="ti ti-message-2" style={{ color: "#9B7DBF" }} /> {cands.length} parada(s){naoAnalisados > 0 ? ` · ${naoAnalisados} sem análise` : " · todas analisadas"}
            </span>
          )}
        </div>
        {cands && cands.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, borderTop: "0.5px solid var(--mk-border)", paddingTop: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-muted)" }}>Cadência padrão:</span>
            <CadenciaControls cad={masterCad} onChange={(p) => setMasterCad((m) => ({ ...m, ...p }))} />
            <button className="ghost-btn" style={{ fontSize: 11 }} onClick={aplicarCadenciaTodos}><i className="ti ti-checks" /> Aplicar a todos</button>
          </div>
        )}
        <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", display: "flex", gap: 6, alignItems: "flex-start" }}>
          <i className="ti ti-info-circle" style={{ marginTop: 1 }} /> 1º <strong>Buscar</strong> lista as conversas paradas. 2º <strong>Analisar</strong> (IA resume e sugere). 3º revise, escolha a <strong>cadência</strong> e <strong>Envie</strong> — o 2º/3º são agendados e cancelam sozinhos se o cliente responder.
        </div>
        {erro && <div style={{ fontSize: 11.5, color: "#C97064" }}>{erro}</div>}
      </div>

      {/* ===== Lista ===== */}
      {cands === null ? null : cands.length === 0 ? (
        <Empty icon="ti-mood-smile" label="Nenhuma conversa parada nesse período/filtro. Tudo em dia!" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {cands.map((c) => (
            <CardCand
              key={c.ticketId}
              c={c} now={now}
              onPatch={(p) => patch(c.ticketId, p)}
              onAnalisar={() => run.analisarUm(c.ticketId)}
              onRegenerar={(tom) => run.analisarUm(c.ticketId, tom)}
              onEnviar={() => run.enviar(c)}
              onDescartar={() => run.descartar(c)}
              onEspiar={() => setEspiar(c)}
              onEtiquetar={() => setEtiquetar(c)}
            />
          ))}
        </div>
      )}

      {/* ===== Balão espiar conversa ===== */}
      {espiar && <EspiarBalao cand={espiar} onClose={() => setEspiar(null)} />}

      {/* ===== Balão etiquetar ===== */}
      {etiquetar && (
        <EtiquetarBalao
          cand={etiquetar}
          etiquetas={etiquetas}
          onClose={() => setEtiquetar(null)}
        />
      )}
    </>
  );
}

// ===== Card de candidato =====
function CardCand({ c, now, onPatch, onAnalisar, onRegenerar, onEnviar, onDescartar, onEspiar, onEtiquetar }: {
  c: Cand; now: number;
  onPatch: (p: Partial<Cand>) => void;
  onAnalisar: () => void;
  onRegenerar: (tom: string) => void;
  onEnviar: () => void;
  onDescartar: () => void;
  onEspiar: () => void;
  onEtiquetar: () => void;
}) {
  return (
    <div className="mk-card fu-card" style={{ padding: 14, opacity: c._sent ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13, color: "var(--mk-text)" }}>{c.nome}</strong>
        <span style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>#{c.numero} · {c.whatsapp || "—"}</span>
        {now > 0 && c.ultima_mensagem_em && (
          <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}><i className="ti ti-clock" /> parado há {tempoParado(c.ultima_mensagem_em, now)}</span>
        )}
        {c.followups_enviados > 0 && (
          <span title="Follow-ups já enviados nesta conversa" style={{ fontSize: 9.5, color: "#9B7DBF", border: "0.5px solid #9B7DBF66", borderRadius: 6, padding: "1px 7px" }}>
            <i className="ti ti-repeat" /> {c.followups_enviados} follow-up{c.followups_enviados > 1 ? "s" : ""}
          </span>
        )}
        <span style={{ flex: 1 }} />
        {/* Ações sempre disponíveis */}
        <button className="ghost-btn" style={miniBtn} title="Espiar histórico da conversa" onClick={onEspiar}><i className="ti ti-eye" /></button>
        <a className="ghost-btn" style={{ ...miniBtn, textDecoration: "none" }} title="Abrir no atendimento" href={`/atendimentos?t=${c.ticketId}`}><i className="ti ti-external-link" /></a>
        {/* Status análise */}
        {c._pendente ? <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}><i className="ti ti-loader-2" style={{ animation: "fu-spin 1s linear infinite" }} /> analisando</span>
          : !c._analisado ? <span style={{ fontSize: 10, color: "var(--mk-text-muted)" }}>não analisado</span>
          : c.enviar ? <span style={{ fontSize: 10, color: "#10b981", border: "0.5px solid #10b98155", borderRadius: 6, padding: "2px 8px" }}><i className="ti ti-circle-check" /> vale follow-up</span>
          : <span style={{ fontSize: 10, color: "#94a3b8", border: "0.5px solid var(--mk-border)", borderRadius: 6, padding: "2px 8px" }}>não recomendado</span>}
      </div>

      {c.resumo && <div style={{ fontSize: 11.5, color: "var(--mk-text-secondary)", marginBottom: 4 }}><i className="ti ti-file-text" style={{ color: "var(--mk-text-muted)" }} /> {c.resumo}</div>}
      {c.motivo && <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 8, fontStyle: "italic" }}>{c.motivo}</div>}

      {c._sent ? (
        <div style={{ fontSize: 12, color: "#10b981" }}><i className="ti ti-check" /> Follow-up enviado{c._agendados ? ` · +${c._agendados} agendado(s)` : ""}.</div>
      ) : !c._analisado ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11.5, color: "var(--mk-text-muted)", flex: 1 }}>Conversa parada — ainda não analisada pela IA.</span>
          <button className="ghost-btn" style={{ fontSize: 11.5 }} disabled={c._pendente} onClick={onAnalisar}><i className="ti ti-sparkles" /> Analisar</button>
          <DescartarBtn c={c} onPatch={onPatch} onDescartar={onDescartar} />
        </div>
      ) : (
        <>
          {c.enviar && (
            <>
              <textarea value={c.mensagem} onChange={(e) => onPatch({ mensagem: e.target.value })} rows={3} style={{ ...inp, resize: "vertical" }} placeholder="Mensagem de follow-up…" />
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button className="cta-btn" style={{ fontSize: 12 }} disabled={c._busy || !c.mensagem.trim()} onClick={onEnviar}><i className="ti ti-send" /> Enviar</button>
                {/* Regenerar com tom */}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <select value={c.tom} onChange={(e) => onPatch({ tom: e.target.value })} style={{ ...inp, width: 180, padding: "6px 8px", fontSize: 11.5 }} title="Tom da mensagem">
                    {TONS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                  <button className="ghost-btn" style={{ fontSize: 12 }} disabled={c._pendente} onClick={() => onRegenerar(c.tom)}><i className={`ti ${c._pendente ? "ti-loader-2" : "ti-refresh"}`} style={c._pendente ? { animation: "fu-spin 1s linear infinite" } : undefined} /> Regenerar</button>
                </div>
                <button className="ghost-btn" style={{ fontSize: 12 }} onClick={onEtiquetar}><i className="ti ti-tag" /> Etiquetar</button>
                <span style={{ flex: 1 }} />
                <DescartarBtn c={c} onPatch={onPatch} onDescartar={onDescartar} />
              </div>
              <CadenciaControls cad={c} onChange={onPatch} />
            </>
          )}
          {!c.enviar && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <button className="ghost-btn" style={{ fontSize: 11.5 }} onClick={onEtiquetar}><i className="ti ti-tag" /> Etiquetar</button>
              <button className="ghost-btn" style={{ fontSize: 11.5 }} disabled={c._pendente} onClick={() => onRegenerar(c.tom)}><i className="ti ti-refresh" /> Reanalisar</button>
              <span style={{ flex: 1 }} />
              <DescartarBtn c={c} onPatch={onPatch} onDescartar={onDescartar} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function DescartarBtn({ c, onPatch, onDescartar }: { c: Cand; onPatch: (p: Partial<Cand>) => void; onDescartar: () => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, color: "var(--mk-text-muted)", cursor: "pointer" }} title="Ao descartar, encerra o ticket. Sem marcar: volta pra busca só após 12h.">
        <input type="checkbox" checked={c.fecharAoDescartar} onChange={(e) => onPatch({ fecharAoDescartar: e.target.checked })} /> fechar ticket
      </label>
      <button className="ghost-btn" style={{ fontSize: 11.5, color: "#C97064" }} disabled={c._busy} onClick={onDescartar} title={c.fecharAoDescartar ? "Descartar e fechar o ticket" : "Descartar (some por 12h)"}>
        <i className={`ti ${c._busy ? "ti-loader-2" : c.fecharAoDescartar ? "ti-circle-x" : "ti-x"}`} style={c._busy ? { animation: "fu-spin 1s linear infinite" } : undefined} /> Descartar
      </button>
    </div>
  );
}

// ===== Balão: espiar histórico =====
function EspiarBalao({ cand, onClose }: { cand: Cand; onClose: () => void }) {
  const [msgs, setMsgs] = useState<MsgEspiada[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch(`/api/atendimentos/${cand.ticketId}/full`);
        const j = await r.json();
        if (vivo) setMsgs(j.mensagens || []);
      } catch {} finally { if (vivo) setLoading(false); }
    })();
    return () => { vivo = false; };
  }, [cand.ticketId]);

  return (
    <Balao open onClose={onClose} largura={560} icone="ti-eye"
      titulo={<>Espiando — {cand.nome} <span style={{ color: "var(--mk-text-muted)", fontWeight: 400, fontFamily: "monospace", fontSize: 11 }}>#{cand.numero}</span></>}>
      {loading ? (
        <div style={{ textAlign: "center", padding: 30, fontSize: 12, color: "var(--mk-text-muted)" }}><i className="ti ti-loader-2" style={{ animation: "fu-spin 1s linear infinite" }} /> Carregando conversa…</div>
      ) : msgs.length === 0 ? (
        <div style={{ textAlign: "center", padding: 30, fontSize: 12, color: "var(--mk-text-muted)" }}>Sem mensagens neste ticket.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {msgs.map((m) => <BolhaEspiada key={m.id} m={m} contatoNome={cand.nome} />)}
        </div>
      )}
    </Balao>
  );
}

// ===== Balão: etiquetar (busca + multi-seleção animada + Marcar) =====
interface OpcEtq { id: string | null; nome: string; cor: string; criar?: boolean }
function EtiquetarBalao({ cand, etiquetas, onClose }: { cand: Cand; etiquetas: Etiqueta[]; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set()); // chave = id ou "novo:"+nome
  const [salvando, setSalvando] = useState(false);
  const [feito, setFeito] = useState(0);

  // Catálogo: etiquetas da agência + as 2 padrão de follow-up (criadas se não existirem).
  const opcoes = useMemo<OpcEtq[]>(() => {
    const base: OpcEtq[] = etiquetas.map((e) => ({ id: e.id, nome: e.nome, cor: e.cor }));
    for (const nome of ETIQUETAS_FOLLOWUP) {
      if (!base.some((o) => o.nome.toLowerCase() === nome.toLowerCase())) {
        base.push({ id: null, nome, cor: nome === "Em follow-up" ? "#f59e0b" : "#10b981", criar: true });
      }
    }
    return base.sort((a, b) => a.nome.localeCompare(b.nome));
  }, [etiquetas]);

  const filtradas = opcoes.filter((o) => o.nome.toLowerCase().includes(q.trim().toLowerCase()));
  const chave = (o: OpcEtq) => (o.id ? o.id : `novo:${o.nome}`);
  const toggle = (o: OpcEtq) => setSel((s) => { const n = new Set(s); const k = chave(o); n.has(k) ? n.delete(k) : n.add(k); return n; });

  async function marcar() {
    const escolhidas = opcoes.filter((o) => sel.has(chave(o)));
    if (!escolhidas.length) return;
    setSalvando(true);
    for (const o of escolhidas) {
      try {
        await fetch(`/api/contatos/${cand.contatoId}/etiquetas`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify(o.id ? { etiquetaId: o.id } : { nome: o.nome, cor: o.cor }),
        });
        setFeito((n) => n + 1);
      } catch {}
    }
    setSalvando(false);
    onClose();
  }

  return (
    <Balao open onClose={onClose} largura={460} icone="ti-tag"
      titulo={<>Etiquetar — {cand.nome}</>}
      footer={
        <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
          <span style={{ fontSize: 11, color: "var(--mk-text-muted)", marginRight: "auto" }}>{sel.size} selecionada(s)</span>
          <button className="ghost-btn" onClick={onClose}>Cancelar</button>
          <button className="cta-btn" onClick={marcar} disabled={salvando || sel.size === 0}>
            <i className={`ti ${salvando ? "ti-loader-2" : "ti-circle-check"}`} style={salvando ? { animation: "fu-spin 1s linear infinite" } : undefined} /> {salvando ? `Marcando ${feito}/${sel.size}…` : "Marcar"}
          </button>
        </div>
      }>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <i className="ti ti-search" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--mk-text-muted)", fontSize: 13 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar etiqueta…" autoFocus style={{ ...inp, paddingLeft: 30 }} />
      </div>
      <div className="chat-scroll" style={{ display: "flex", flexWrap: "wrap", gap: 7, maxHeight: 320, overflowY: "auto", padding: 2 }}>
        {filtradas.length === 0 ? (
          <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", padding: 12 }}>Nenhuma etiqueta. Digite e crie pelas opções padrão.</div>
        ) : filtradas.map((o) => {
          const on = sel.has(chave(o));
          return (
            <button key={chave(o)} className="fu-chip" onClick={() => toggle(o)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "inherit", cursor: "pointer",
                padding: "6px 11px", borderRadius: 999,
                border: `1px solid ${on ? o.cor : "var(--mk-border)"}`,
                background: on ? `${o.cor}26` : "var(--mk-surface-2)",
                color: on ? "var(--mk-text)" : "var(--mk-text-secondary)",
                transform: on ? "scale(1.03)" : "scale(1)",
              }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: o.cor, flexShrink: 0 }} />
              {o.nome}
              {o.criar && !on && <span style={{ fontSize: 9, color: "var(--mk-text-muted)" }}>(criar)</span>}
              {on && <i className="ti ti-check" style={{ fontSize: 14, color: o.cor, animation: "fu-pop .18s ease" }} />}
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 10, display: "flex", gap: 6 }}>
        <i className="ti ti-info-circle" style={{ marginTop: 1 }} /> "Em follow-up" e "Follow-up feito" são criadas automaticamente se você marcar e ainda não existirem.
      </div>
    </Balao>
  );
}

// ===== Dropdown multi-seleção (filtros etiqueta/conexão) =====
function MultiDropdown({ options, sel, onChange, placeholder, icon }: {
  options: { id: string; label: string; cor?: string; dot?: string }[];
  sel: string[]; onChange: (v: string[]) => void; placeholder: string; icon: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const toggle = (id: string) => onChange(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
  const label = sel.length === 0 ? placeholder : `${sel.length} selecionada(s)`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ ...inp, width: 200, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", textAlign: "left" }}>
        <i className={`ti ${icon}`} style={{ color: "var(--mk-text-muted)" }} />
        <span style={{ flex: 1, color: sel.length ? "var(--mk-text)" : "var(--mk-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        {sel.length > 0 && <i className="ti ti-x" onClick={(e) => { e.stopPropagation(); onChange([]); }} style={{ color: "var(--mk-text-muted)" }} />}
        <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ color: "var(--mk-text-muted)" }} />
      </button>
      {open && (
        <div className="chat-scroll" style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, zIndex: 50, minWidth: 220, maxHeight: 280, overflowY: "auto", background: "var(--mk-bg)", border: "0.5px solid var(--mk-border)", borderRadius: 8, padding: 6, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
          {options.length === 0 ? (
            <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", padding: 8 }}>Nada disponível.</div>
          ) : options.map((o) => {
            const on = sel.includes(o.id);
            return (
              <button key={o.id} onClick={() => toggle(o.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left", padding: "7px 8px", borderRadius: 6, border: 0, background: on ? "var(--mk-surface-2)" : "transparent", color: "var(--mk-text)", cursor: "pointer", fontFamily: "inherit", fontSize: 12 }}>
                <i className={`ti ${on ? "ti-square-check-filled" : "ti-square"}`} style={{ fontSize: 16, color: on ? "var(--mk-accent)" : "var(--mk-text-muted)" }} />
                {o.cor && <span style={{ width: 9, height: 9, borderRadius: "50%", background: o.cor }} />}
                {o.dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: o.dot }} />}
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ===== helpers / UI bits =====
function tempoParado(iso: string, now: number): string {
  const min = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)}sem`;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mk-text-muted)", marginBottom: 6, letterSpacing: 0.3 }}>{children}</div>;
}
function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={{ display: "block", fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 4 }}>{label}</label>{children}</div>;
}
function Pill({ on, onClick, icon, children }: { on: boolean; onClick: () => void; icon?: string; children: React.ReactNode }) {
  return (
    <button className="fu-chip" onClick={onClick} style={{
      padding: "7px 13px", borderRadius: 8, fontSize: 12, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
      display: "inline-flex", alignItems: "center", gap: 5,
      border: `1px solid ${on ? "var(--mk-accent)" : "var(--mk-border)"}`,
      background: on ? "rgba(16,185,129,0.16)" : "var(--mk-surface-2)",
      color: on ? "var(--mk-accent)" : "var(--mk-text-muted)",
    }}>
      {icon && <i className={`ti ${icon}`} />} {children}
    </button>
  );
}
function Empty({ icon, label }: { icon: string; label: string }) {
  return <div className="mk-card" style={{ textAlign: "center", padding: 50, color: "var(--mk-text-muted)" }}><i className={`ti ${icon}`} style={{ display: "block", fontSize: 32, marginBottom: 8, opacity: 0.6 }} />{label}</div>;
}

type CadCfg = Pick<Cand, "dividir" | "nFollowups" | "d2v" | "d2u" | "d3v" | "d3u">;

/** Controles da cadência (dividir em 2 + 1/2/3 follow-ups + tempos). Usado por card e no "padrão". */
function CadenciaControls({ cad, onChange }: { cad: CadCfg; onChange: (p: Partial<CadCfg>) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, padding: "7px 10px", borderRadius: 8, background: "var(--mk-surface-2)", border: "0.5px solid var(--mk-border)", marginTop: 8 }}>
      <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, cursor: "pointer", color: "var(--mk-text-secondary)" }} title="Quebra a mensagem em 2 (mais humano)">
        <input type="checkbox" checked={cad.dividir} onChange={(e) => onChange({ dividir: e.target.checked })} /> Dividir em 2 msgs
      </label>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 11, color: "var(--mk-text-muted)" }}>Follow-ups:</span>
        {[1, 2, 3].map((n) => (
          <button key={n} type="button" onClick={() => onChange({ nFollowups: n })} title={n === 1 ? "Só o imediato" : `${n} no total (agenda os próximos)`}
            style={{ width: 26, height: 24, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${cad.nFollowups === n ? "var(--mk-accent)" : "var(--mk-border)"}`, background: cad.nFollowups === n ? "rgba(16,185,129,0.16)" : "transparent", color: cad.nFollowups === n ? "var(--mk-accent)" : "var(--mk-text-muted)" }}>{n}</button>
        ))}
      </div>
      {cad.nFollowups >= 2 && <DelayInput label="2º após" v={cad.d2v} u={cad.d2u} onV={(d2v) => onChange({ d2v })} onU={(d2u) => onChange({ d2u })} />}
      {cad.nFollowups >= 3 && <DelayInput label="3º após" v={cad.d3v} u={cad.d3u} onV={(d3v) => onChange({ d3v })} onU={(d3u) => onChange({ d3u })} />}
    </div>
  );
}
function DelayInput({ label, v, u, onV, onU }: { label: string; v: number; u: "h" | "d"; onV: (n: number) => void; onU: (u: "h" | "d") => void }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--mk-text-muted)" }}>
      {label}
      <input type="number" min={1} value={v} onChange={(e) => onV(Math.max(1, +e.target.value))} style={{ ...inp, width: 46, padding: "4px 6px" }} />
      <select value={u} onChange={(e) => onU(e.target.value as "h" | "d")} style={{ ...inp, width: 62, padding: "4px 6px" }}>
        <option value="h">horas</option>
        <option value="d">dias</option>
      </select>
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box", colorScheme: "dark" };
const miniBtn: React.CSSProperties = { fontSize: 13, padding: "4px 8px", display: "inline-flex", alignItems: "center", justifyContent: "center" };
