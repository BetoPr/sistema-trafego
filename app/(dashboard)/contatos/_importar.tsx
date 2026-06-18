"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Balao } from "@/components/ui/Balao";

interface CanalOpcao {
  id: string;
  nome: string;
  numero_conectado: string | null;
}

interface ImportResumo {
  contatos_totais: number;
  contatos_novos: number;
  contatos_existentes: number;
  etiquetas_criadas: number;
  etiquetas_existentes: number;
  etiquetas_aplicadas: number;
  etiquetas_puladas: number;
  etiquetas_duplicadas_mescladas: number;
  pulados_grupos: number;
  duracao_ms: number;
  etiquetas_criadas_nomes: string[];
  erros: string[];
  mensagens?: { mensagens_novas?: number; chats_processados?: number; tickets_criados?: number; erro?: string } | null;
  numeros_lid?: { resolvidos?: number; restantes?: number; erro?: string } | null;
  dedup?: { mesclados?: number; erro?: string } | null;
}

interface Props {
  canais: CanalOpcao[];
}

/**
 * Botão "Importar do WhatsApp" + Balao com fluxo de importação.
 * Mostrado em /contatos ao lado do "Adicionar contato".
 */
export function ImportarWhatsAppBtn({ canais }: Props) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [canalId, setCanalId] = useState<string>(canais[0]?.id || "");
  const [pularNativas, setPularNativas] = useState(true);
  const [estado, setEstado] = useState<"idle" | "rodando" | "ok" | "erro">("idle");
  const [resumo, setResumo] = useState<ImportResumo | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function importar() {
    if (!canalId || estado === "rodando") return;
    setEstado("rodando");
    setResumo(null);
    setErro(null);
    try {
      const r = await fetch("/api/contatos/importar-uazapi", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ canalId, pularLabelsNativas: pularNativas }),
      });
      const j = await r.json();
      if (!r.ok) {
        setEstado("erro");
        setErro(j.error || r.statusText);
        return;
      }
      setResumo(j as ImportResumo);
      setEstado("ok");
    } catch (e) {
      setEstado("erro");
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  function fechar() {
    setAberto(false);
    if (estado === "ok") router.refresh();
    // reset visual após fechar
    setTimeout(() => { setEstado("idle"); setResumo(null); setErro(null); }, 300);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        disabled={canais.length === 0}
        className="ghost-btn"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, padding: "8px 14px" }}
        title={canais.length === 0 ? "Conecte um canal pra importar" : "Importa contatos + etiquetas do WhatsApp Business"}
      >
        <i className="ti ti-brand-whatsapp" style={{ color: "#25D366" }} />
        Importar do WhatsApp
      </button>

      <Balao open={aberto} onClose={fechar} titulo="Importar do WhatsApp" icone="ti-brand-whatsapp" largura={520}>
        {estado === "idle" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 12.5, color: "var(--mk-text-secondary)", lineHeight: 1.5, margin: 0 }}>
              Um clique traz tudo: <strong>contatos com nome e número real</strong>, as <strong>etiquetas</strong> do WhatsApp Business (se tiver) e o <strong>histórico de conversas</strong> recentes. Junta automaticamente quem está duplicado — sem bagunça.
            </p>

            <div>
              <label style={lbl}>Canal</label>
              {canais.length === 1 ? (
                <div style={{ fontSize: 12.5, padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface)" }}>
                  <i className="ti ti-brand-whatsapp" style={{ color: "#25D366", marginRight: 6 }} />
                  {canais[0].nome} {canais[0].numero_conectado && `· ${canais[0].numero_conectado}`}
                </div>
              ) : (
                <select value={canalId} onChange={(e) => setCanalId(e.target.value)} style={selectStyle}>
                  {canais.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome} {c.numero_conectado ? `· ${c.numero_conectado}` : ""}</option>
                  ))}
                </select>
              )}
            </div>

            <label style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--mk-text-secondary)", cursor: "pointer" }}>
              <input type="checkbox" checked={pularNativas} onChange={(e) => setPularNativas(e.target.checked)} style={{ accentColor: "var(--mk-accent)" }} />
              Pular etiquetas nativas do WhatsApp (<em>Não lidas</em>, <em>Grupos</em>, <em>Favoritos</em>)
            </label>

            <div style={{ background: "rgba(245,158,11,0.10)", border: "0.5px solid rgba(245,158,11,0.4)", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, color: "var(--mk-text-secondary)", display: "flex", gap: 6 }}>
              <i className="ti ti-info-circle" style={{ color: "#f59e0b" }} />
              <span>Só vem quem já <strong>conversou</strong> com seu número. Contato salvo no celular sem msg trocada → WhatsApp não expõe pela API.</span>
            </div>

            <div style={{ background: "rgba(91,139,166,0.10)", border: "0.5px solid rgba(91,139,166,0.4)", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, color: "var(--mk-text-secondary)", display: "flex", gap: 6 }}>
              <i className="ti ti-tag" style={{ color: "#5B8BA6", marginTop: 1 }} />
              <span><strong>Etiquetas:</strong> os <strong>contatos importam sempre</strong>. Já a marcação <em>etiqueta↔contato</em> depende do aparelho — alguns celulares não deixam o WhatsApp exportar isso (restrição do próprio WhatsApp), então as etiquetas podem vir <strong>parciais ou só os nomes</strong>. Não é erro do sistema.</span>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={fechar} className="ghost-btn" style={{ fontSize: 12 }}>Cancelar</button>
              <button type="button" onClick={importar} disabled={!canalId} className="cta-btn" style={{ fontSize: 12 }}>
                <i className="ti ti-download" /> Importar agora
              </button>
            </div>
          </div>
        )}

        {estado === "rodando" && (
          <div style={{ textAlign: "center", padding: "30px 12px" }}>
            <i className="ti ti-loader-2" style={{ fontSize: 36, color: "var(--mk-accent)", animation: "spin 1s linear infinite" }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600 }}>Importando…</div>
            <div style={{ fontSize: 11.5, color: "var(--mk-text-muted)", marginTop: 4 }}>
              Etiquetas → contatos (nome + número real) → conversas → juntando duplicados. Bases grandes podem levar 1-2 min.
            </div>
          </div>
        )}

        {estado === "ok" && resumo && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "rgba(16,185,129,0.12)", borderLeft: "3px solid #10b981", padding: "10px 14px", borderRadius: 8, fontSize: 12.5 }}>
              <strong>Pronto.</strong> Importação concluída em {(resumo.duracao_ms / 1000).toFixed(1)}s.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Stat label="Contatos totais" valor={resumo.contatos_totais} />
              <Stat label="Novos importados" valor={resumo.contatos_novos} cor="#10b981" />
              <Stat label="Já existiam" valor={resumo.contatos_existentes} cor="var(--mk-text-muted)" />
              <Stat label="Grupos pulados" valor={resumo.pulados_grupos} cor="var(--mk-text-muted)" />
              <Stat label="Etiquetas criadas" valor={resumo.etiquetas_criadas} cor="#9B7DBF" />
              <Stat label="Etiquetas reaproveitadas" valor={resumo.etiquetas_existentes} cor="var(--mk-text-muted)" />
              <Stat label="Aplicações de etiqueta" valor={resumo.etiquetas_aplicadas} cor="#10b981" />
              {resumo.mensagens?.mensagens_novas != null && (
                <Stat label="Mensagens do histórico" valor={resumo.mensagens.mensagens_novas} cor="#5B8BA6" />
              )}
              {resumo.numeros_lid?.resolvidos != null && resumo.numeros_lid.resolvidos > 0 && (
                <Stat label="Números resolvidos" valor={resumo.numeros_lid.resolvidos} cor="#10b981" />
              )}
              {resumo.dedup?.mesclados != null && resumo.dedup.mesclados > 0 && (
                <Stat label="Contatos duplicados juntados" valor={resumo.dedup.mesclados} cor="#9B7DBF" />
              )}
              {resumo.etiquetas_puladas > 0 && <Stat label="Etiquetas puladas" valor={resumo.etiquetas_puladas} cor="#f59e0b" />}
            </div>

            {resumo.numeros_lid?.restantes != null && resumo.numeros_lid.restantes > 0 && (
              <div style={{ background: "rgba(245,158,11,0.10)", border: "0.5px solid rgba(245,158,11,0.4)", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, color: "var(--mk-text-secondary)", display: "flex", gap: 6 }}>
                <i className="ti ti-info-circle" style={{ color: "#f59e0b" }} />
                <span>Faltam <strong>{resumo.numeros_lid.restantes}</strong> número(s) a resolver (base grande). É só clicar <strong>Importar</strong> de novo pra terminar — não duplica nada.</span>
              </div>
            )}

            {resumo.etiquetas_criadas_nomes.length > 0 && (
              <div>
                <div style={lbl}>Etiquetas criadas</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {resumo.etiquetas_criadas_nomes.map((n) => (
                    <span key={n} style={{ fontSize: 10.5, padding: "3px 8px", borderRadius: 999, background: "rgba(155,125,191,0.18)", color: "#9B7DBF", border: "0.5px solid #9B7DBF" }}>{n}</span>
                  ))}
                </div>
              </div>
            )}

            {resumo.erros.length > 0 && (
              <div style={{ background: "rgba(201,112,100,0.12)", borderLeft: "3px solid #C97064", padding: "8px 12px", borderRadius: 8, fontSize: 11.5 }}>
                <strong>{resumo.erros.length} erro(s):</strong>
                <ul style={{ margin: "4px 0 0 18px", padding: 0 }}>
                  {resumo.erros.slice(0, 5).map((e, i) => <li key={i} style={{ fontSize: 11 }}>{e}</li>)}
                </ul>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="button" onClick={fechar} className="cta-btn" style={{ fontSize: 12 }}>Fechar e ver contatos</button>
            </div>
          </div>
        )}

        {estado === "erro" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ background: "rgba(201,112,100,0.12)", borderLeft: "3px solid #C97064", padding: "10px 14px", borderRadius: 8, fontSize: 12.5 }}>
              <strong>Falhou:</strong> {erro}
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEstado("idle")} className="ghost-btn" style={{ fontSize: 12 }}>Tentar de novo</button>
              <button type="button" onClick={fechar} className="ghost-btn" style={{ fontSize: 12 }}>Fechar</button>
            </div>
          </div>
        )}
      </Balao>
    </>
  );
}

function Stat({ label, valor, cor }: { label: string; valor: number; cor?: string }) {
  return (
    <div style={{ padding: "8px 10px", background: "var(--mk-surface)", border: "0.5px solid var(--mk-border)", borderRadius: 8 }}>
      <div style={{ fontSize: 10, color: "var(--mk-text-muted)", letterSpacing: 0.3, fontFamily: "monospace" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: cor || "var(--mk-text)" }}>{valor}</div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: "block", fontSize: 11, color: "var(--mk-text-muted)", marginBottom: 4, fontFamily: "monospace" };
const selectStyle: React.CSSProperties = { width: "100%", padding: "8px 12px", borderRadius: 8, border: "0.5px solid var(--mk-border)", background: "var(--mk-surface-2)", color: "var(--mk-text)", fontSize: 12.5 };
