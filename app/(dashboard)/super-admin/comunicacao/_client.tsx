"use client";

import { useState, useTransition } from "react";
import { Balao } from "@/components/ui/Balao";
import { salvarOndaZeroConfig, criarBroadcastRascunho, agendarBroadcast, cancelarBroadcast } from "./_actions";

interface CanalRow { id: string; nome: string; status: string; numero: string; agencia_nome: string; }
interface Broadcast {
  id: string; titulo: string; audiencia: string; status: string;
  total_alvos: number; total_enviados: number; total_erros: number;
  criado_em: string; iniciado_em: string | null; concluido_em: string | null;
}

const AUDIENCIAS: Array<{ id: string; label: string; desc: string }> = [
  { id: "todos_usuarios", label: "Todos os usuários do CRM", desc: "Toda pessoa cadastrada (admin + atendentes)" },
  { id: "todos_agencias_donos", label: "Donos de agência", desc: "Apenas role=admin de cada agência" },
  { id: "onda_zero", label: "Onda Zero", desc: "10 primeiros membros" },
  { id: "em_trial", label: "Em trial ativo", desc: "Agências com trial não expirado" },
  { id: "plano_solo", label: "Plano Solo", desc: "Autônomos/MEI" },
  { id: "plano_time", label: "Plano Time", desc: "Pequenos negócios" },
  { id: "plano_agencia", label: "Plano Agência", desc: "Gestores de tráfego" },
  { id: "plano_studio", label: "Plano Studio", desc: "Empresas em crescimento" },
  { id: "todos_contatos", label: "Todos os contatos", desc: "Base de contatos das agências (cuidado: muito grande)" },
];

const STATUS_COR: Record<string, string> = {
  rascunho: "#9B7DBF",
  agendado: "#5cd0ff",
  processando: "#FFB547",
  concluido: "#00E19A",
  cancelado: "#7a7a7a",
  erro: "#FF5C72",
};

interface Props {
  configInicial: { canalSistemaId: string | null; whatsappGrupoLink: string; mensagemConvite: string };
  canais: CanalRow[];
  broadcasts: Broadcast[];
  stats: { totalOndaZero: number; filaPendente: number };
}

export default function ComunicacaoClient({ configInicial, canais, broadcasts: bcInit, stats }: Props) {
  const [canalSistemaId, setCanalSistemaId] = useState<string | null>(configInicial.canalSistemaId);
  const [grupoLink, setGrupoLink] = useState(configInicial.whatsappGrupoLink);
  const [mensagemConvite, setMensagemConvite] = useState(configInicial.mensagemConvite);
  const [savingCfg, setSavingCfg] = useState(false);
  const [okCfg, setOkCfg] = useState(false);
  const [, startTransition] = useTransition();

  const [novoAberto, setNovoAberto] = useState(false);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>(bcInit);

  async function salvarCfg() {
    setSavingCfg(true);
    setOkCfg(false);
    const r = await salvarOndaZeroConfig(canalSistemaId, grupoLink, mensagemConvite);
    setSavingCfg(false);
    if (r.ok) {
      setOkCfg(true);
      setTimeout(() => setOkCfg(false), 2500);
    } else alert(r.msg);
  }

  return (
    <section className="mk-page">
      <div className="mk-page-head">
        <div className="mk-eyebrow">Super Admin · Comunicação</div>
        <h1 className="mk-page-title">Comunicação · Onda Zero & Broadcasts</h1>
        <p className="mk-page-sub">Canal sistema, boas-vindas automáticas e envios em massa.</p>
      </div>

      <div className="grid-3" style={{ marginBottom: 14 }}>
        <Kpi label="Membros Onda Zero" valor={`${stats.totalOndaZero}/10`} icone="ti-wave-square" cor="#00E19A" />
        <Kpi label="Boas-vindas na fila" valor={`${stats.filaPendente}`} icone="ti-mail-fast" cor="#5cd0ff" />
        <Kpi label="Broadcasts" valor={`${broadcasts.length}`} icone="ti-broadcast" cor="#9B7DBF" />
      </div>

      <div className="mk-card mk-card-lg" style={{ marginBottom: 14 }}>
        <h3 className="card-title">
          <i className="ti ti-settings" style={{ marginRight: 6, color: "#00E19A" }} />
          Canal sistema + Onda Zero
        </h3>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 14 }}>
          Canal usado pra enviar boas-vindas Onda Zero e broadcasts. Tipicamente o número oficial do Sonar.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>
              CANAL REMETENTE
            </label>
            <select
              value={canalSistemaId ?? ""}
              onChange={(e) => setCanalSistemaId(e.target.value || null)}
              style={{ width: "100%", padding: "10px 12px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", fontSize: 13 }}
            >
              <option value="">— escolha um canal —</option>
              {canais.map((c) => (
                <option key={c.id} value={c.id} disabled={c.status !== "connected"}>
                  {c.nome} · {c.numero} · {c.agencia_nome} {c.status !== "connected" ? "(desconectado)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>
              LINK DO GRUPO ONDA ZERO (WHATSAPP)
            </label>
            <input
              type="text"
              value={grupoLink}
              onChange={(e) => setGrupoLink(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              style={{ width: "100%", padding: "10px 12px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", fontSize: 13 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: 0.3, display: "block", marginBottom: 6 }}>
              MENSAGEM DE BOAS-VINDAS (placeholders: {"{nome}, {membro_n}, {limite}, {link_grupo}"})
            </label>
            <textarea
              value={mensagemConvite}
              onChange={(e) => setMensagemConvite(e.target.value)}
              rows={8}
              placeholder="Olá, {nome}! Você é o membro {membro_n}/{limite}..."
              style={{ width: "100%", padding: "10px 12px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", fontSize: 13, fontFamily: "inherit", resize: "vertical" }}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, alignItems: "center" }}>
            {okCfg && <span style={{ fontSize: 12, color: "#00E19A" }}>✓ Salvo</span>}
            <button
              type="button"
              onClick={() => startTransition(salvarCfg)}
              disabled={savingCfg}
              className="cta-btn"
              style={{ fontSize: 13, padding: "10px 18px" }}
            >
              {savingCfg ? "Salvando..." : "Salvar configuração"}
            </button>
          </div>
        </div>
      </div>

      <div className="mk-card mk-card-lg">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 className="card-title" style={{ margin: 0 }}>
            <i className="ti ti-broadcast" style={{ marginRight: 6, color: "#9B7DBF" }} />
            Broadcasts
          </h3>
          <button type="button" onClick={() => setNovoAberto(true)} className="cta-btn" style={{ fontSize: 12, padding: "8px 14px" }}>
            <i className="ti ti-plus" style={{ marginRight: 4 }} />
            Novo broadcast
          </button>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 14 }}>
          Dispara mensagem em massa pelo canal sistema. Anti-ban: delay entre envios + janela horária.
        </p>

        {broadcasts.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontSize: 12.5, color: "var(--mk-text-muted)" }}>
            Nenhum broadcast criado ainda.
          </div>
        ) : (
          <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--mk-border)", color: "var(--mk-text-muted)", textAlign: "left" }}>
                <th style={{ padding: "8px 0" }}>Título</th>
                <th style={{ padding: "8px 0" }}>Audiência</th>
                <th style={{ padding: "8px 0" }}>Status</th>
                <th style={{ padding: "8px 0", textAlign: "right" }}>Progresso</th>
                <th style={{ padding: "8px 0" }}>Criado</th>
                <th style={{ padding: "8px 0" }} />
              </tr>
            </thead>
            <tbody>
              {broadcasts.map((b) => (
                <tr key={b.id} style={{ borderBottom: "1px solid var(--mk-border)" }}>
                  <td style={{ padding: "10px 0", fontWeight: 600, color: "var(--mk-text)" }}>{b.titulo}</td>
                  <td style={{ padding: "10px 0", color: "var(--mk-text-muted)" }}>
                    {AUDIENCIAS.find((a) => a.id === b.audiencia)?.label || b.audiencia}
                  </td>
                  <td style={{ padding: "10px 0" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: `${STATUS_COR[b.status]}22`, color: STATUS_COR[b.status] }}>
                      {b.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right", color: "var(--mk-text-muted)" }}>
                    {b.total_enviados}/{b.total_alvos}
                    {b.total_erros > 0 && <span style={{ color: "#FF5C72", marginLeft: 4 }}>· {b.total_erros}❌</span>}
                  </td>
                  <td style={{ padding: "10px 0", color: "var(--mk-text-muted)" }}>
                    {new Date(b.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "right" }}>
                    {b.status === "rascunho" && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = confirm("Agendar disparo agora?");
                          if (!ok) return;
                          const r = await agendarBroadcast(b.id);
                          if (r.ok) setBroadcasts((arr) => arr.map((x) => x.id === b.id ? { ...x, status: "agendado", total_alvos: r.total || x.total_alvos } : x));
                          else alert(r.msg);
                        }}
                        style={{ fontSize: 11, padding: "4px 10px", background: "#00E19A", color: "#0c0c0c", border: 0, borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
                      >
                        Agendar
                      </button>
                    )}
                    {(b.status === "agendado" || b.status === "processando") && (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = confirm("Cancelar broadcast? Itens pendentes serão descartados.");
                          if (!ok) return;
                          const r = await cancelarBroadcast(b.id);
                          if (r.ok) setBroadcasts((arr) => arr.map((x) => x.id === b.id ? { ...x, status: "cancelado" } : x));
                        }}
                        style={{ fontSize: 11, padding: "4px 10px", background: "transparent", color: "#FF5C72", border: ".5px solid rgba(255,92,114,0.4)", borderRadius: 6, cursor: "pointer" }}
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <NovoBroadcastBalao
        aberto={novoAberto}
        onFechar={() => setNovoAberto(false)}
        onCriado={(b) => setBroadcasts((arr) => [b, ...arr])}
      />
    </section>
  );
}

function Kpi({ label, valor, icone, cor }: { label: string; valor: string; icone: string; cor: string }) {
  return (
    <div className="mk-card">
      <span className="label-tiny">{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
        <i className={`ti ${icone}`} style={{ fontSize: 24, color: cor }} />
        <span className="big-num" style={{ fontSize: 26 }}>{valor}</span>
      </div>
    </div>
  );
}

function NovoBroadcastBalao({ aberto, onFechar, onCriado }: { aberto: boolean; onFechar: () => void; onCriado: (b: Broadcast) => void }) {
  const [titulo, setTitulo] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [audiencia, setAudiencia] = useState("onda_zero");
  const [delaySegs, setDelaySegs] = useState(1.5);
  const [janelaInicio, setJanelaInicio] = useState("09:00");
  const [janelaFim, setJanelaFim] = useState("20:00");
  const [criando, setCriando] = useState(false);

  async function criar() {
    setCriando(true);
    const r = await criarBroadcastRascunho({
      titulo,
      mensagem,
      audiencia,
      delayMs: Math.round(delaySegs * 1000),
      janelaInicio,
      janelaFim,
    });
    setCriando(false);
    if (!r.ok) {
      alert(r.msg);
      return;
    }
    onCriado({
      id: r.id!,
      titulo,
      audiencia,
      status: "rascunho",
      total_alvos: r.total || 0,
      total_enviados: 0,
      total_erros: 0,
      criado_em: new Date().toISOString(),
      iniciado_em: null,
      concluido_em: null,
    });
    setTitulo("");
    setMensagem("");
    onFechar();
  }

  return (
    <Balao open={aberto} onClose={onFechar} titulo="Novo broadcast" icone="ti-broadcast" largura={580}>
      <div style={{ padding: "8px 4px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mk-text-muted)" }}>TÍTULO INTERNO</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex: Atualização Out/26"
            style={{ width: "100%", marginTop: 4, padding: "8px 10px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", fontSize: 12.5 }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mk-text-muted)" }}>AUDIÊNCIA</label>
          <select
            value={audiencia}
            onChange={(e) => setAudiencia(e.target.value)}
            style={{ width: "100%", marginTop: 4, padding: "8px 10px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", fontSize: 12.5 }}
          >
            {AUDIENCIAS.map((a) => (
              <option key={a.id} value={a.id}>{a.label} — {a.desc}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mk-text-muted)" }}>
            MENSAGEM (placeholders: {"{nome}, {plano}"})
          </label>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={7}
            placeholder="Olá, {nome}! Temos uma novidade pra você..."
            style={{ width: "100%", marginTop: 4, padding: "8px 10px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", fontSize: 12.5, fontFamily: "inherit", resize: "vertical" }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mk-text-muted)" }}>DELAY (s)</label>
            <input
              type="number"
              min={0.5}
              max={10}
              step={0.5}
              value={delaySegs}
              onChange={(e) => setDelaySegs(Number(e.target.value))}
              style={{ width: "100%", marginTop: 4, padding: "8px 10px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", fontSize: 12.5 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mk-text-muted)" }}>JANELA INÍCIO</label>
            <input
              type="time"
              value={janelaInicio}
              onChange={(e) => setJanelaInicio(e.target.value)}
              style={{ width: "100%", marginTop: 4, padding: "8px 10px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", fontSize: 12.5 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mk-text-muted)" }}>JANELA FIM</label>
            <input
              type="time"
              value={janelaFim}
              onChange={(e) => setJanelaFim(e.target.value)}
              style={{ width: "100%", marginTop: 4, padding: "8px 10px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text)", fontSize: 12.5 }}
            />
          </div>
        </div>
        <div style={{ padding: 10, background: "var(--mk-surface)", border: ".5px dashed var(--mk-border)", borderRadius: 8, fontSize: 11, color: "var(--mk-text-muted)" }}>
          Vai criar em <strong>rascunho</strong>. Você revisa o total de destinatários antes de agendar disparo.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onFechar} style={{ padding: "8px 14px", background: "transparent", border: ".5px solid var(--mk-border)", borderRadius: 8, color: "var(--mk-text-muted)", fontSize: 12.5, cursor: "pointer" }}>
            Cancelar
          </button>
          <button type="button" onClick={criar} disabled={criando || !titulo.trim() || !mensagem.trim()} className="cta-btn" style={{ fontSize: 12.5, padding: "8px 16px" }}>
            {criando ? "Criando..." : "Criar rascunho"}
          </button>
        </div>
      </div>
    </Balao>
  );
}
