"use client";

import { useState } from "react";

export interface TemplatePicker {
  id: string;
  nome: string;
  descricao: string | null;
  template_tipo: string | null;
  modelo: string | null;
  provider: string | null;
  prompt_sistema: string | null;
  delay_debounce_seg: number | null;
  delay_min_resposta_seg: number | null;
  delay_max_resposta_seg: number | null;
}

interface Props {
  templates: TemplatePicker[];
}

/**
 * Client component que mostra os cards de template como botões selecionáveis.
 * Ao clicar: muda visual (borda verde) + autopreenche o textarea do prompt + dropdowns.
 * Salva escolha em hidden input name="template_id" pra _actions usar.
 */
export function TemplatesPicker({ templates }: Props) {
  const [selecionado, setSelecionado] = useState<string>("");

  function aplicar(t: TemplatePicker) {
    setSelecionado(t.id);

    // Preenche prompt textarea
    const prompt = document.querySelector<HTMLTextAreaElement>('textarea[name="prompt_sistema"]');
    if (prompt && t.prompt_sistema) {
      prompt.value = t.prompt_sistema;
      prompt.dispatchEvent(new Event("input", { bubbles: true }));
    }

    // Preenche provider
    const prov = document.querySelector<HTMLSelectElement>('select[name="provider"]');
    if (prov && t.provider) {
      prov.value = t.provider;
      prov.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Preenche modelo
    const mod = document.querySelector<HTMLSelectElement>('select[name="modelo"]');
    if (mod && t.modelo) {
      mod.value = t.modelo;
      mod.dispatchEvent(new Event("change", { bubbles: true }));
    }

    // Preenche delays
    const dDeb = document.querySelector<HTMLInputElement>('input[name="delay_debounce_seg"]');
    if (dDeb && t.delay_debounce_seg != null) dDeb.value = String(t.delay_debounce_seg);
    const dMin = document.querySelector<HTMLInputElement>('input[name="delay_min_resposta_seg"]');
    if (dMin && t.delay_min_resposta_seg != null) dMin.value = String(t.delay_min_resposta_seg);
    const dMax = document.querySelector<HTMLInputElement>('input[name="delay_max_resposta_seg"]');
    if (dMax && t.delay_max_resposta_seg != null) dMax.value = String(t.delay_max_resposta_seg);
  }

  function limpar() {
    setSelecionado("");
  }

  return (
    <fieldset style={{ border: "0.5px solid rgba(155,125,191,0.3)", borderRadius: 8, padding: 12, display: "flex", flexDirection: "column", gap: 10, background: "rgba(155,125,191,0.06)" }}>
      <legend style={{ fontSize: 11.5, fontWeight: 600, padding: "0 6px", color: "#9B7DBF" }}>🎨 Aplicar template (clique pra preencher campos)</legend>

      <input type="hidden" name="template_id" value={selecionado} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
        <button
          type="button"
          onClick={limpar}
          style={card(selecionado === "")}
        >
          <i className="ti ti-pencil" style={{ color: "var(--mk-text-muted)", fontSize: 18 }} />
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>Em branco</div>
            <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)" }}>Configurar do zero</div>
          </div>
        </button>
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => aplicar(t)}
            style={card(selecionado === t.id)}
            title={t.prompt_sistema ? `Prompt: ${t.prompt_sistema.slice(0, 120)}…` : ""}
          >
            <i className="ti ti-sparkles" style={{ color: "#9B7DBF", fontSize: 18 }} />
            <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.nome}</div>
              {t.descricao && <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", lineHeight: 1.4, marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.descricao}</div>}
            </div>
          </button>
        ))}
      </div>

      {selecionado && (
        <div style={{ fontSize: 11, color: "#00E19A", display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", background: "rgba(16,185,129,0.10)", border: "0.5px solid rgba(16,185,129,0.3)", borderRadius: 6 }}>
          <i className="ti ti-circle-check-filled" />
          Template aplicado. Prompt, modelo e delays foram preenchidos. Você ainda pode editar antes de salvar.
        </div>
      )}
    </fieldset>
  );
}

function card(ativo: boolean): React.CSSProperties {
  return {
    display: "flex",
    gap: 8,
    padding: "12px 14px",
    borderRadius: 8,
    border: `1px solid ${ativo ? "#00E19A" : "rgba(155,125,191,0.4)"}`,
    background: ativo ? "rgba(16,185,129,0.12)" : "var(--mk-surface)",
    cursor: "pointer",
    alignItems: "flex-start",
    textAlign: "left",
    color: "var(--mk-text)",
    transition: "all 0.15s",
    minHeight: 60,
  };
}
