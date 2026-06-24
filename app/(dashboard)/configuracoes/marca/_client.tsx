"use client";

import { useState } from "react";
import { MarcaCustom, type LogoModo, type LogoLayout } from "@/components/layout/MarcaCustom";

interface Props {
  nome: string;
  logoUrl: string | null;
  modo: LogoModo;
  layout: LogoLayout;
  altura: number;
  action: (formData: FormData) => void | Promise<void>;
}

export function MarcaCliente({ nome, logoUrl, modo, layout, altura, action }: Props) {
  const [modoSel, setModoSel] = useState<LogoModo>(modo);
  const [layoutSel, setLayoutSel] = useState<LogoLayout>(layout);
  const [alturaSel, setAlturaSel] = useState<number>(altura);
  const [preview, setPreview] = useState<string | null>(logoUrl);
  const [arquivoNome, setArquivoNome] = useState<string | null>(null);

  function onArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setArquivoNome(f.name);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }

  return (
    <form action={action} encType="multipart/form-data" style={{ display: "grid", gap: 14, gridTemplateColumns: "1.2fr 1fr" }}>
      {/* Coluna upload + config */}
      <div className="mk-card mk-card-lg" style={{ padding: 16 }}>
        <h3 className="card-title" style={{ marginBottom: 10 }}>Logo</h3>

        <div style={{ background: "rgba(0,225,154,.06)", border: ".5px solid rgba(0,225,154,.32)", borderRadius: 9, padding: 12, fontSize: 11.5, color: "var(--mk-text-secondary)", marginBottom: 12, lineHeight: 1.6 }}>
          <i className="ti ti-info-circle" style={{ color: "#00E19A", marginRight: 6 }} />
          <strong style={{ color: "#00E19A" }}>Recomendação:</strong> PNG transparente, <strong>2 MB máx</strong>.
          <br /><strong>Horizontal:</strong> 512×128px (ex.: logo + nome lado a lado).
          <br /><strong>Vertical/Quadrado:</strong> 256×256px (ex.: só ícone ou logo + texto embaixo).
          <br /><strong>Fundo escuro:</strong> use cores claras ou contornadas.
        </div>

        {/* Upload */}
        <label htmlFor="logo-up" style={{
          display: "block", border: "2px dashed var(--mk-border)", borderRadius: 10,
          padding: 20, textAlign: "center", cursor: "pointer", background: "var(--mk-surface-2)",
          transition: "border-color .2s, background .2s"
        }}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#00E19A"; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = "var(--mk-border)"; }}
        >
          <i className="ti ti-cloud-upload" style={{ fontSize: 28, color: "#00E19A" }} />
          <div style={{ fontSize: 12.5, marginTop: 6, color: "var(--mk-text)" }}>Clique ou arraste o logo aqui</div>
          <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 4 }}>{arquivoNome || (logoUrl ? "Logo atual configurado" : "Nenhum logo")}</div>
          <input id="logo-up" name="logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={onArquivo} style={{ display: "none" }} />
        </label>

        {logoUrl && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 12, color: "var(--mk-text-secondary)", cursor: "pointer" }}>
            <input type="checkbox" name="remover_logo" value="1" />
            Remover logo atual (volta pro padrão)
          </label>
        )}

        {/* Modo */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: ".5px", marginBottom: 6 }}>EXIBIÇÃO</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {([["texto", "ti-typography", "Só texto"], ["logo", "ti-photo", "Só logo"], ["logo_texto", "ti-layout-grid", "Logo + texto"]] as Array<[LogoModo, string, string]>).map(([v, ic, lbl]) => (
              <label key={v} style={{
                flex: 1, minWidth: 110, padding: "9px 10px",
                background: modoSel === v ? "rgba(0,225,154,.14)" : "var(--mk-surface-2)",
                border: `.5px solid ${modoSel === v ? "#00E19A" : "var(--mk-border)"}`,
                borderRadius: 8, fontSize: 12, color: modoSel === v ? "#00E19A" : "var(--mk-text-secondary)",
                cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600,
                transition: "background .2s, color .2s, border-color .2s",
              }}>
                <input type="radio" name="modo" value={v} checked={modoSel === v} onChange={() => setModoSel(v)} data-sn-skip style={{ display: "none" }} />
                <i className={`ti ${ic}`} /> {lbl}
              </label>
            ))}
          </div>
        </div>

        {/* Tamanho (so faz sentido com logo) */}
        {modoSel !== "texto" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: ".5px", marginBottom: 6, display: "flex", justifyContent: "space-between" }}>
              <span>TAMANHO DA LOGO</span>
              <span style={{ color: "#00E19A" }}>{alturaSel}px</span>
            </div>
            <input type="range" name="altura" min={24} max={200} step={1} value={alturaSel} onChange={(e) => setAlturaSel(Number(e.target.value))} style={{ width: "100%", accentColor: "#00E19A" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--mk-text-muted)", marginTop: 2 }}>
              <span>24px</span><span>112px</span><span>200px</span>
            </div>
          </div>
        )}

        {/* Layout */}
        {modoSel === "logo_texto" && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--mk-text-muted)", letterSpacing: ".5px", marginBottom: 6 }}>ORIENTAÇÃO</div>
            <div style={{ display: "flex", gap: 6 }}>
              {([["horizontal", "ti-arrows-horizontal", "Horizontal"], ["vertical", "ti-arrows-vertical", "Vertical"]] as Array<[LogoLayout, string, string]>).map(([v, ic, lbl]) => (
                <label key={v} style={{
                  flex: 1, padding: "9px 10px",
                  background: layoutSel === v ? "rgba(0,225,154,.14)" : "var(--mk-surface-2)",
                  border: `.5px solid ${layoutSel === v ? "#00E19A" : "var(--mk-border)"}`,
                  borderRadius: 8, fontSize: 12, color: layoutSel === v ? "#00E19A" : "var(--mk-text-secondary)",
                  cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600,
                  transition: "background .2s, color .2s, border-color .2s",
                }}>
                  <input type="radio" name="layout" value={v} checked={layoutSel === v} onChange={() => setLayoutSel(v)} data-sn-skip style={{ display: "none" }} />
                  <i className={`ti ${ic}`} /> {lbl}
                </label>
              ))}
            </div>
          </div>
        )}

        <button type="submit" className="cta-btn" style={{ marginTop: 18, width: "100%", padding: "11px 14px", fontSize: 13, fontWeight: 700 }}>
          <i className="ti ti-device-floppy" /> Salvar marca
        </button>
      </div>

      {/* Coluna preview */}
      <div className="mk-card mk-card-lg" style={{ padding: 16 }}>
        <h3 className="card-title" style={{ marginBottom: 10 }}>Preview</h3>
        <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginBottom: 12 }}>Como vai aparecer na sidebar:</div>

        <div style={{ background: "var(--mk-bg-deep)", border: ".5px solid var(--mk-border)", borderRadius: 10, padding: 18, minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MarcaCustom nome={nome} logoUrl={preview} modo={modoSel} layout={layoutSel} altura={alturaSel} />
        </div>

        <div style={{ fontSize: 11, color: "var(--mk-text-muted)", marginTop: 12, lineHeight: 1.6 }}>
          <strong style={{ color: "var(--mk-text)" }}>Dicas:</strong>
          <ul style={{ paddingLeft: 18, marginTop: 4 }}>
            <li>Use PNG transparente pra ficar bem em qualquer tema.</li>
            <li>Logo + texto vertical fica melhor com logo quadrado.</li>
            <li>Sidebar colapsada mostra só o logo (ou inicial do nome se não tiver).</li>
          </ul>
        </div>
      </div>
    </form>
  );
}
