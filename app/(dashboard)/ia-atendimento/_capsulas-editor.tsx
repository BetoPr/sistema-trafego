"use client";

import { useState } from "react";
import {
  adicionarCapsula,
  salvarCapsula,
  alternarAtivaCapsula,
  deletarCapsula,
} from "./_capsulas-actions";
import type { Capsula } from "@/lib/ia-atendimento/capsulas";
import { CAPSULA_TEMPLATES } from "@/lib/ia-atendimento/capsulas";
import PlaceholderPicker from "./_placeholder-picker";

interface Props {
  perfilId: string;
  capsulas: Capsula[];
  identidade: string;
  objetivo: string;
  regrasGlobais: string;
  modoModular: boolean;
  promptClassico: string;
}

export default function CapsulasEditor({
  perfilId,
  capsulas,
  identidade,
  objetivo,
  regrasGlobais,
  modoModular,
  promptClassico,
}: Props) {
  const [modular, setModular] = useState<boolean>(modoModular);
  const [aberta, setAberta] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const usadas = new Set(capsulas.map((c) => c.slug));
  const disponiveis = CAPSULA_TEMPLATES.filter((t) => !usadas.has(t.slug));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Toggle modo: Prompt clássico vs Modular */}
      <div
        style={{
          padding: 14,
          background: "linear-gradient(135deg, rgba(155,125,191,.08), rgba(0,225,154,.06))",
          border: ".5px solid rgba(155,125,191,.35)",
          borderRadius: 11,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <i className="ti ti-sparkles" style={{ color: "#9B7DBF", fontSize: 22 }} />
        <div style={{ flex: 1, fontSize: 12.5, lineHeight: 1.55 }}>
          <strong style={{ display: "block", marginBottom: 2, fontSize: 13 }}>
            Modo da IA: {modular ? <span style={{ color: "#00E19A" }}>OTIMIZADO (sub-agentes)</span> : <span style={{ color: "#9B7DBF" }}>PROMPT ÚNICO</span>}
          </strong>
          <span style={{ color: "var(--mk-text-secondary)" }}>
            {modular
              ? "Sub-agentes internos injetam só conhecimento relevante por pergunta. Economiza tokens. Ferramentas e regras seguem funcionando igual."
              : "Prompt do sistema clássico (1 textarea longa). Sem economia de tokens; tudo enviado a cada pergunta."}
          </span>
        </div>
        <SwitchToggle name="modo_modular" checked={modular} onChange={setModular} />
      </div>

      {/* Modo prompt único — sempre montado (submete) mas só visível quando OFF */}
      <div style={{ display: modular ? "none" : "block" }}>
        <fieldset style={fieldsetStyle}>
          <legend style={legendStyle}>Prompt do sistema</legend>
          <PlaceholderPicker />
          <textarea
            name="prompt_sistema"
            rows={12}
            defaultValue={promptClassico}
            style={{ ...inp, fontFamily: "monospace", fontSize: 12, resize: "vertical" }}
            placeholder="Você é um atendente da empresa X..."
          />
          <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 6 }}>
            Tudo num bloco só. Ferramentas (lista, etiquetas, contexto temporal) são injetadas automaticamente em cima.
          </div>
        </fieldset>
      </div>

      {/* Modo modular — sempre montado, só visível quando ON */}
      <div style={{ display: modular ? "flex" : "none", flexDirection: "column", gap: 14 }}>

      {/* Identidade / Objetivo / Regras */}
      <fieldset
        style={{
          padding: 14,
          border: ".5px solid var(--mk-border)",
          borderRadius: 9,
          background: "rgba(255,255,255,.015)",
        }}
      >
        <legend style={{ fontSize: 11, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: ".5px", padding: "0 6px" }}>
          BLOCOS FIXOS (sempre injetados)
        </legend>
        <div style={{ display: "grid", gap: 10 }}>
          <CampoBloco
            label="QUEM VOCÊ É"
            icone="ti-user-circle"
            cor="#6FA8DC"
            name="identidade"
            defaultValue={identidade}
            placeholder="Ex.: Você é o atendente virtual da Loja X, especialista em moda feminina. Sempre simpático, direto, usa emoji moderadamente."
          />
          <CampoBloco
            label="OBJETIVO PRIMORDIAL"
            icone="ti-target"
            cor="#7FB069"
            name="objetivo"
            defaultValue={objetivo}
            placeholder="Ex.: Qualificar lead → mostrar produto certo → fechar venda no WhatsApp. Se cliente já é comprador antigo, oferecer cross-sell."
          />
          <CampoBloco
            label="REGRAS GLOBAIS"
            icone="ti-shield"
            cor="#E07A5F"
            name="regras_globais"
            defaultValue={regrasGlobais}
            placeholder="Ex.: Nunca prometer prazo de entrega. Não inventar promoção. Se cliente pedir desconto > 10%, transferir pra humano."
          />
        </div>
      </fieldset>

      {/* Cápsulas */}
      <fieldset
        style={{
          padding: 14,
          border: ".5px solid var(--mk-border)",
          borderRadius: 9,
          background: "rgba(255,255,255,.015)",
        }}
      >
        <legend
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--mk-text-muted)",
            letterSpacing: ".5px",
            padding: "0 6px",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          CÁPSULAS DE CONHECIMENTO ({capsulas.length})
        </legend>

        {capsulas.length === 0 && (
          <div style={{ padding: 14, textAlign: "center", color: "var(--mk-text-muted)", fontSize: 12.5 }}>
            <i className="ti ti-capsule-horizontal" style={{ fontSize: 28, color: "#00E19A", display: "block", marginBottom: 6 }} />
            Nenhuma cápsula ainda. Adicione abaixo. Cápsulas economizam tokens: orquestrador injeta só a relevante por pergunta.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {capsulas.map((cap) => {
            const open = aberta === cap.id;
            return (
              <div
                key={cap.id}
                style={{
                  border: ".5px solid var(--mk-border)",
                  borderRadius: 9,
                  background: "var(--mk-surface-2)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    background: open ? "rgba(0,225,154,.06)" : "transparent",
                  }}
                  onClick={() => setAberta(open ? null : cap.id)}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 7,
                      background: `${cap.cor}22`,
                      color: cap.cor,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <i className={`ti ${cap.icone}`} style={{ fontSize: 16 }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--mk-text)" }}>{cap.nome}</div>
                    <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>
                      {cap.keywords.length > 0
                        ? `${cap.keywords.length} keywords · `
                        : "sem keywords · "}
                      {cap.conteudo.length} chars
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 10,
                      background: cap.ativa ? "rgba(0,225,154,.16)" : "rgba(201,112,100,.14)",
                      color: cap.ativa ? "#00E19A" : "#C97064",
                      fontWeight: 700,
                    }}
                  >
                    {cap.ativa ? "ATIVA" : "PAUSADA"}
                  </span>
                  <i className={`ti ti-chevron-${open ? "up" : "down"}`} style={{ fontSize: 14, color: "var(--mk-text-muted)" }} />
                </div>

                {open && (
                  <form
                    action={salvarCapsula}
                    style={{ padding: 12, borderTop: ".5px solid var(--mk-border)", display: "flex", flexDirection: "column", gap: 10 }}
                  >
                    <input type="hidden" name="id" value={cap.id} />
                    <input type="hidden" name="perfil_id" value={perfilId} />

                    <div>
                      <label style={lbl}>NOME</label>
                      <input name="nome" defaultValue={cap.nome} style={inp} />
                    </div>

                    <div>
                      <label style={lbl}>CONTEÚDO (será injetado quando cápsula for relevante)</label>
                      <textarea
                        name="conteudo"
                        rows={6}
                        defaultValue={cap.conteudo}
                        style={{ ...inp, fontFamily: "monospace", fontSize: 12 }}
                        placeholder={CAPSULA_TEMPLATES.find((t) => t.slug === cap.slug)?.placeholder || "Cole aqui o conhecimento desta cápsula"}
                      />
                    </div>

                    <div>
                      <label style={lbl}>
                        KEYWORDS (separadas por vírgula) — orquestrador usa pra detectar quando ativar
                      </label>
                      <input
                        name="keywords"
                        defaultValue={cap.keywords.join(", ")}
                        style={inp}
                        placeholder="preço, valor, quanto custa"
                      />
                    </div>

                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                      <input type="checkbox" name="ativa" defaultChecked={cap.ativa} />
                      Cápsula ativa
                    </label>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button type="submit" className="cta-btn" style={{ fontSize: 12, fontWeight: 700 }}>
                        <i className="ti ti-device-floppy" /> Salvar cápsula
                      </button>
                      <span style={{ flex: 1 }} />
                      <button
                        type="submit"
                        formAction={alternarAtivaCapsula}
                        className="ghost-btn"
                        style={{ fontSize: 11 }}
                        title="Liga/desliga"
                      >
                        <i className="ti ti-power" /> {cap.ativa ? "Pausar" : "Ativar"}
                      </button>
                      <button
                        type="submit"
                        formAction={deletarCapsula}
                        className="ghost-btn"
                        style={{ fontSize: 11, color: "#C97064" }}
                        onClick={(e) => {
                          if (!confirm(`Deletar cápsula "${cap.nome}"?`)) e.preventDefault();
                        }}
                      >
                        <i className="ti ti-trash" /> Deletar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>

        {/* Adicionar */}
        {!addOpen ? (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="ghost-btn"
            style={{ marginTop: 10, fontSize: 12.5, fontWeight: 600, color: "#00E19A" }}
          >
            <i className="ti ti-plus" /> Adicionar cápsula
          </button>
        ) : (
          <div
            style={{
              marginTop: 10,
              padding: 12,
              border: ".5px dashed rgba(0,225,154,.32)",
              borderRadius: 9,
              background: "rgba(0,225,154,.04)",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: ".5px", marginBottom: 8 }}>
              ESCOLHA TIPO
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: 6 }}>
              {disponiveis.map((t) => (
                <form key={t.slug} action={adicionarCapsula}>
                  <input type="hidden" name="perfil_id" value={perfilId} />
                  <input type="hidden" name="slug" value={t.slug} />
                  <button
                    type="submit"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 10px",
                      background: "var(--mk-surface-2)",
                      border: ".5px solid var(--mk-border)",
                      borderRadius: 7,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      color: "var(--mk-text)",
                    }}
                  >
                    <i className={`ti ${t.icone}`} style={{ color: t.cor, fontSize: 15 }} />
                    {t.nome}
                  </button>
                </form>
              ))}
              <form action={adicionarCapsula}>
                <input type="hidden" name="perfil_id" value={perfilId} />
                <input type="hidden" name="slug" value="custom" />
                <input type="hidden" name="nome" value="Cápsula custom" />
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    background: "rgba(0,225,154,.06)",
                    border: ".5px dashed #00E19A",
                    borderRadius: 7,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: "#00E19A",
                    fontWeight: 600,
                  }}
                >
                  <i className="ti ti-plus" />
                  Cápsula custom (você nomeia)
                </button>
              </form>
            </div>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              style={{
                marginTop: 8,
                background: "transparent",
                border: 0,
                color: "var(--mk-text-muted)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </fieldset>
      </div>
    </div>
  );
}

function SwitchToggle({ name, checked, onChange }: { name: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: checked ? "#00E19A" : "var(--mk-text-muted)", letterSpacing: ".5px" }}>
        {checked ? "ON" : "OFF"}
      </span>
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ display: "none" }} />
      <span style={{
        position: "relative",
        width: 42, height: 22,
        background: checked ? "#00E19A" : "rgba(120,120,120,.35)",
        borderRadius: 999,
        transition: "background .2s",
      }}>
        <span style={{
          position: "absolute",
          top: 2, left: checked ? 22 : 2,
          width: 18, height: 18,
          background: "#fff",
          borderRadius: "50%",
          transition: "left .2s",
          boxShadow: "0 1px 3px rgba(0,0,0,.3)",
        }} />
      </span>
    </label>
  );
}

const fieldsetStyle: React.CSSProperties = {
  padding: 14,
  border: ".5px solid var(--mk-border)",
  borderRadius: 9,
  background: "rgba(255,255,255,.015)",
};
const legendStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--mk-text-muted)",
  letterSpacing: ".5px",
  padding: "0 6px",
};

const lbl: React.CSSProperties = {
  display: "block",
  fontSize: 10.5,
  fontWeight: 700,
  color: "var(--mk-text-muted)",
  letterSpacing: ".5px",
  marginBottom: 4,
};
const inp: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 7,
  border: ".5px solid var(--mk-border)",
  background: "var(--mk-surface-2)",
  color: "var(--mk-text)",
  fontSize: 12.5,
  fontFamily: "inherit",
};

function CampoBloco({
  label,
  icone,
  cor,
  name,
  defaultValue,
  placeholder,
}: {
  label: string;
  icone: string;
  cor: string;
  name: string;
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <div>
      <label
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          fontWeight: 700,
          color: cor,
          letterSpacing: ".5px",
          marginBottom: 4,
        }}
      >
        <i className={`ti ${icone}`} />
        {label}
      </label>
      <textarea
        name={name}
        rows={3}
        defaultValue={defaultValue}
        placeholder={placeholder}
        style={{ ...inp, fontSize: 12, resize: "vertical", borderLeft: `2px solid ${cor}` }}
      />
    </div>
  );
}
