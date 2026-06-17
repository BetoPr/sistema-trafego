"use client";

/**
 * Input dedicado pra chave API do perfil IA.
 *
 * Modos:
 * - Modo "view" (perfil ja tem chave salva): mostra placeholder cinza
 *   "•••• Chave salva". Botao olho carrega chave real via API e mostra.
 *   Botao "Trocar" entra em modo edit.
 *   Hidden input name="api_key" submete "" → backend mantem chave atual.
 *
 * - Modo "edit" (perfil sem chave OU usuario clicou Trocar): input
 *   editavel. Usuario cola nova chave. Submete value real ao salvar.
 *
 * Por que: o input password antigo confundia — usuario via bullets,
 * pensava que ainda tinha valor antigo, e ao salvar com input vazio
 * o backend mantinha chave anterior. Agora "view" tem placeholder
 * claro e botao explicito pra trocar.
 */
import { useEffect, useState } from "react";

interface Props {
  perfilId?: string;
  temChave: boolean;
  placeholder?: string;
}

function mascarar(chave: string): string {
  if (chave.length < 12) return "•".repeat(chave.length);
  return chave.slice(0, 7) + "•".repeat(Math.min(40, chave.length - 11)) + chave.slice(-4);
}

const inpStyle: React.CSSProperties = {
  flex: 1,
  width: "100%",
  padding: "8px 10px",
  border: "0.5px solid var(--mk-border)",
  borderRadius: 8,
  background: "var(--mk-surface)",
  color: "var(--mk-text)",
  fontSize: 12.5,
  fontFamily: "monospace",
};

const btnIco: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 12px",
  border: "0.5px solid var(--mk-border)",
  borderRadius: 8,
  background: "var(--mk-surface)",
  color: "var(--mk-text-secondary)",
  cursor: "pointer",
  fontSize: 13,
  fontFamily: "inherit",
};

export default function ApiKeyInput({ perfilId, temChave, placeholder }: Props) {
  const inicioEditando = !temChave; // sem chave salva: ja entra editavel
  const [editando, setEditando] = useState(inicioEditando);
  const [valor, setValor] = useState("");
  const [chaveReal, setChaveReal] = useState<string | null>(null);
  const [mostrar, setMostrar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setEditando(!temChave);
  }, [temChave]);

  async function carregarChave() {
    if (!perfilId) return;
    setCarregando(true);
    setErro(null);
    try {
      const r = await fetch(`/api/ia-atendimento/get-api-key?perfilId=${perfilId}`);
      const j = await r.json();
      if (j.apiKey) {
        setChaveReal(j.apiKey);
        setMostrar(true);
      } else {
        setErro(j.error || "sem_chave");
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
    setCarregando(false);
  }

  function toggleOlho() {
    if (mostrar) {
      setMostrar(false);
      return;
    }
    if (chaveReal) {
      setMostrar(true);
    } else {
      carregarChave();
    }
  }

  // VIEW MODE: chave salva, nao editando
  if (!editando && temChave) {
    const display = mostrar && chaveReal ? chaveReal : chaveReal ? mascarar(chaveReal) : "•••• •••• •••• Chave API salva no banco";
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <div style={{ ...inpStyle, color: chaveReal ? "var(--mk-text)" : "var(--mk-text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {display}
        </div>
        {/* envia vazio: backend mantem chave atual */}
        <input type="hidden" name="api_key" value="" />
        <button
          type="button"
          onClick={toggleOlho}
          disabled={carregando}
          title={mostrar ? "Ocultar chave" : "Mostrar chave"}
          style={btnIco}
        >
          <i className={`ti ${carregando ? "ti-loader-2" : mostrar ? "ti-eye-off" : "ti-eye"}`} />
        </button>
        <button
          type="button"
          onClick={() => { setEditando(true); setValor(""); setMostrar(false); }}
          title="Trocar chave"
          style={{ ...btnIco, color: "#9B7DBF", borderColor: "rgba(155,125,191,0.4)" }}
        >
          <i className="ti ti-edit" /> Trocar
        </button>
        {erro && (
          <div style={{ width: "100%", fontSize: 11, color: "#C97064", marginTop: 4 }}>
            Nao foi possivel ler chave: {erro}
          </div>
        )}
      </div>
    );
  }

  // EDIT MODE: digitar nova chave
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <input
        name="api_key"
        type={mostrar ? "text" : "password"}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder={placeholder || "sk-proj-..."}
        autoComplete="off"
        spellCheck={false}
        style={inpStyle}
      />
      <button
        type="button"
        onClick={() => setMostrar(!mostrar)}
        title={mostrar ? "Ocultar" : "Mostrar"}
        style={btnIco}
      >
        <i className={`ti ${mostrar ? "ti-eye-off" : "ti-eye"}`} />
      </button>
      {temChave && (
        <button
          type="button"
          onClick={() => { setEditando(false); setValor(""); setMostrar(false); }}
          title="Cancelar troca, manter chave atual"
          style={btnIco}
        >
          <i className="ti ti-arrow-back-up" /> Cancelar
        </button>
      )}
    </div>
  );
}
