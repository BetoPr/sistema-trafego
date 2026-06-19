"use client";

/**
 * Seletor de modelo de IA — amigável pro usuário final.
 * Mostra provider + modelo agrupado por categoria + um cartão explicando
 * pra que serve, custo, velocidade, contexto, se suporta ferramentas e o fallback.
 *
 * Submete via <select name="provider"> e <select name="modelo"> (a action lê esses campos).
 */
import { useMemo, useState } from "react";
import {
  CATALOGO_MODELOS,
  modelosDoProvider,
  getModelo,
  MODELO_PADRAO,
  ORDEM_CATEGORIAS,
  type Provider,
  type ModeloInfo,
} from "@/lib/ia-atendimento/modelos-catalogo";

const lbl: React.CSSProperties = { fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, display: "block", fontFamily: "monospace" };
const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", border: "0.5px solid var(--mk-border)", borderRadius: 8, background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };

function fmtContexto(n: number) {
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(n % 1_000_000 ? 1 : 0)} milhão de tokens`;
  return `${Math.round(n / 1000)} mil tokens`;
}

function Tier({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  return (
    <span style={{ letterSpacing: 1 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ color: i < valor ? cor : "var(--mk-border)" }}>●</span>
      ))}
    </span>
  );
}

export default function ModeloPicker({ defaultProvider, defaultModelo }: { defaultProvider?: string; defaultModelo?: string }) {
  const [provider, setProvider] = useState<Provider>((defaultProvider as Provider) || "openai");
  const provInicial = (defaultProvider as Provider) || "openai";
  const [modelo, setModelo] = useState<string>(
    defaultModelo && getModelo(defaultModelo)?.provider === provInicial ? defaultModelo : MODELO_PADRAO[provInicial],
  );
  const [mostrarAvancados, setMostrarAvancados] = useState(false);

  const lista = useMemo(() => modelosDoProvider(provider), [provider]);
  const sel = getModelo(modelo);

  function trocarProvider(p: Provider) {
    setProvider(p);
    setModelo(MODELO_PADRAO[p]);
  }

  // Lista achatada, ordenada por categoria (sem <optgroup> — o dropdown nativo no
  // tema escuro renderizava o label do grupo como barra branca/vazia). O selo
  // (badge) já diferencia recomendado/econômico/avançado por item.
  const itensOrdenados = ORDEM_CATEGORIAS.flatMap((cat) =>
    lista.filter((m) => m.categoria === cat && (mostrarAvancados || !m.avancadoEscondido)),
  );

  const caro = sel && (sel.custo >= 3 || sel.experimental);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={lbl}>Provedor</label>
          <select name="provider" value={provider} onChange={(e) => trocarProvider(e.target.value as Provider)} style={inp}>
            <option value="openai">OpenAI (ChatGPT)</option>
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="groq">Groq (Llama)</option>
          </select>
        </div>
        <div>
          <label style={lbl}>Modelo</label>
          <select name="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} style={inp}>
            {itensOrdenados.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}{m.badge ? ` — ${m.badge}` : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 11, color: "var(--mk-text-muted)" }}>
        <input type="checkbox" checked={mostrarAvancados} onChange={(e) => setMostrarAvancados(e.target.checked)} />
        Mostrar modelos avançados / especialistas
      </label>

      {sel && <CartaoModelo m={sel} />}

      {caro && (
        <div style={{ fontSize: 11, padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,0.10)", border: "0.5px solid rgba(245,158,11,0.4)", color: "#FBBF24", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <i className="ti ti-alert-triangle" style={{ marginTop: 1 }} />
          <span>
            {sel?.experimental
              ? "Modelo novo — pode ainda não estar liberado na sua conta OpenAI. Se a API recusar, a IA usa o fallback automaticamente. "
              : "Modelo de custo/latência mais altos. "}
            Use só quando a complexidade justificar.
          </span>
        </div>
      )}
    </div>
  );
}

function CartaoModelo({ m }: { m: ModeloInfo }) {
  const fb = m.fallback ? getModelo(m.fallback) : null;
  return (
    <div style={{ border: "0.5px solid var(--mk-border)", borderRadius: 10, padding: 12, background: "var(--mk-surface)", fontSize: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
        <strong style={{ fontSize: 13 }}>{m.displayName}</strong>
        {m.badge && <span style={{ fontSize: 9.5, padding: "1px 7px", borderRadius: 999, background: "rgba(16,185,129,0.16)", color: "#10b981", border: "0.5px solid #10b981" }}>{m.badge}</span>}
        <span style={{ fontSize: 9.5, color: "var(--mk-text-muted)", fontFamily: "monospace" }}>{m.id}</span>
      </div>
      <div style={{ color: "var(--mk-text-secondary)", marginBottom: 8 }}>{m.resumo}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 8 }}>
        <Mini titulo="Custo"><Tier valor={m.custo} max={4} cor="#C97064" /></Mini>
        <Mini titulo="Velocidade"><Tier valor={4 - m.velocidade} max={3} cor="#10b981" /></Mini>
        <Mini titulo="Contexto">{fmtContexto(m.contexto)}</Mini>
        <Mini titulo="Ferramentas">{m.suporta.ferramentas ? <span style={{ color: "#10b981" }}>✓ sim</span> : <span style={{ color: "#C97064" }}>✗ não</span>}</Mini>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#10b981", marginBottom: 3, textTransform: "uppercase" }}>Melhor para</div>
          <ul style={{ margin: 0, paddingLeft: 16, color: "var(--mk-text-secondary)", lineHeight: 1.5 }}>
            {m.melhorPara.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#C97064", marginBottom: 3, textTransform: "uppercase" }}>Evitar</div>
          <ul style={{ margin: 0, paddingLeft: 16, color: "var(--mk-text-secondary)", lineHeight: 1.5 }}>
            {m.evitar.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        </div>
      </div>

      {fb && (
        <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--mk-text-muted)" }}>
          <i className="ti ti-arrow-fork" /> Se falhar, usa automaticamente: <strong>{fb.displayName}</strong>
        </div>
      )}
    </div>
  );
}

function Mini({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9.5, color: "var(--mk-text-muted)", textTransform: "uppercase", letterSpacing: 0.3 }}>{titulo}</div>
      <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{children}</div>
    </div>
  );
}

// Evita unused import warning de CATALOGO_MODELOS quando tree-shaken
void CATALOGO_MODELOS;
