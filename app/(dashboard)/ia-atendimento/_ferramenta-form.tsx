"use client";

import { useState } from "react";
import { criarFerramentaIA } from "./_actions";

interface FilaOpt { id: string; nome: string; cor: string }
interface EtiquetaOpt { id: string; nome: string; cor: string }

const ACOES: Record<string, string> = {
  aplicar_etiqueta: "Aplicar etiqueta",
  transferir_para_fila: "Transferir pra fila",
  transferir_para_humano: "Transferir pra humano",
  agendar_followup: "Agendar follow-up",
  enviar_template: "Enviar template",
  marcar_qualificado: "Marcar qualificado",
  criar_nota: "Criar nota interna",
  consultar_data: "Consultar data",
};

const lbl: React.CSSProperties = {
  fontSize: 11,
  color: "var(--mk-text-muted)",
  marginBottom: 4,
  display: "block",
  fontFamily: "monospace",
};
const inp: React.CSSProperties = {
  width: "100%",
  background: "var(--mk-surface-2)",
  border: "0.5px solid var(--mk-border)",
  borderRadius: 8,
  color: "var(--mk-text)",
  padding: "8px 10px",
  fontSize: 12.5,
};
export default function FerramentaForm({
  perfilId,
  filas,
  etiquetas,
}: {
  perfilId: string;
  filas: FilaOpt[];
  etiquetas: EtiquetaOpt[];
}) {
  const [acao, setAcao] = useState<string>("aplicar_etiqueta");

  const [filaDestinoId, setFilaDestinoId] = useState<string>("");
  const [statusDestino, setStatusDestino] = useState<string>("aberto");
  const [etiquetaId, setEtiquetaId] = useState<string>("");
  const [etiquetaNome, setEtiquetaNome] = useState<string>("");
  const [aposMinutos, setAposMinutos] = useState<number>(60);
  const [score, setScore] = useState<number>(7);
  const [observacao, setObservacao] = useState<string>("");
  const [parametrosLivres, setParametrosLivres] = useState<string>("");

  function buildParametros(): string {
    if (acao === "transferir_para_humano" || acao === "transferir_para_fila") {
      const obj: Record<string, unknown> = {};
      if (filaDestinoId) obj.fila_destino_id = filaDestinoId;
      if (statusDestino) obj.status_destino = statusDestino;
      if (etiquetaId) obj.etiqueta_id = etiquetaId;
      return JSON.stringify(obj);
    }
    if (acao === "aplicar_etiqueta") {
      if (etiquetaId) return JSON.stringify({ etiqueta_id: etiquetaId });
      if (etiquetaNome) return JSON.stringify({ etiqueta_nome: etiquetaNome });
      return "{}";
    }
    if (acao === "agendar_followup") return JSON.stringify({ apos_minutos: aposMinutos });
    if (acao === "marcar_qualificado") return JSON.stringify({ score, observacao });
    if (acao === "criar_nota") return JSON.stringify({ texto: observacao });
    if (acao === "consultar_data") return "{}";
    return parametrosLivres || "{}";
  }

  return (
    <form
      action={async (fd: FormData) => {
        fd.set("parametros", buildParametros());
        await criarFerramentaIA(fd);
      }}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 10,
        background: "var(--mk-surface)",
        padding: 12,
        borderRadius: 8,
        border: "0.5px dashed var(--mk-border)",
      }}
    >
      <input type="hidden" name="perfil_id" value={perfilId} />

      <div>
        <label style={lbl}>Nome técnico (id pra IA)</label>
        <input name="nome" required style={inp} placeholder="ex: marcar_lead_quente" />
      </div>

      <div>
        <label style={lbl}>Ação</label>
        <select name="acao" value={acao} onChange={(e) => setAcao(e.target.value)} style={inp}>
          {Object.entries(ACOES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={lbl}>Descrição (a IA lê pra decidir quando usar)</label>
        <input name="descricao" required style={inp} placeholder="Use quando cliente disser..." />
      </div>

      {(acao === "transferir_para_humano" || acao === "transferir_para_fila") && (
        <>
          <div>
            <label style={lbl}>Fila de destino</label>
            <select value={filaDestinoId} onChange={(e) => setFilaDestinoId(e.target.value)} style={inp}>
              <option value="">— Padrão (fila Humano da agência) —</option>
              {filas.map((f) => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>Status do ticket</label>
            <select value={statusDestino} onChange={(e) => setStatusDestino(e.target.value)} style={inp}>
              <option value="aberto">Aberto</option>
              <option value="pendente">Pendente</option>
              <option value="fechado">Fechado</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={lbl}>Aplicar etiqueta (opcional)</label>
            <select value={etiquetaId} onChange={(e) => setEtiquetaId(e.target.value)} style={inp}>
              <option value="">— Nenhuma —</option>
              {etiquetas.map((e) => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>
          </div>
        </>
      )}

      {acao === "aplicar_etiqueta" && (
        <>
          <div>
            <label style={lbl}>Etiqueta existente</label>
            <select
              value={etiquetaId}
              onChange={(e) => { setEtiquetaId(e.target.value); setEtiquetaNome(""); }}
              style={inp}
            >
              <option value="">— Escolha uma —</option>
              {etiquetas.map((et) => (
                <option key={et.id} value={et.id}>{et.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={lbl}>OU nome novo (cria se não existir)</label>
            <input
              value={etiquetaNome}
              onChange={(e) => { setEtiquetaNome(e.target.value); setEtiquetaId(""); }}
              style={inp}
              placeholder="Lead Quente"
            />
          </div>
        </>
      )}

      {acao === "agendar_followup" && (
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={lbl}>Disparar após (minutos)</label>
          <input
            type="number"
            min={1}
            max={10080}
            value={aposMinutos}
            onChange={(e) => setAposMinutos(parseInt(e.target.value, 10) || 60)}
            style={inp}
          />
        </div>
      )}

      {acao === "marcar_qualificado" && (
        <>
          <div>
            <label style={lbl}>Score padrão (1-10)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(parseInt(e.target.value, 10) || 5)}
              style={inp}
            />
          </div>
          <div>
            <label style={lbl}>Observação padrão</label>
            <input value={observacao} onChange={(e) => setObservacao(e.target.value)} style={inp} />
          </div>
        </>
      )}

      {acao === "criar_nota" && (
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={lbl}>Texto padrão da nota (IA pode sobrescrever)</label>
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} style={inp} />
        </div>
      )}

      {acao === "enviar_template" && (
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={lbl}>Parâmetros (JSON livre)</label>
          <textarea
            value={parametrosLivres}
            onChange={(e) => setParametrosLivres(e.target.value)}
            rows={3}
            style={{ ...inp, fontFamily: "monospace", fontSize: 11.5 }}
            placeholder='{"template_id": "..."}'
          />
        </div>
      )}

      {acao === "consultar_data" && (
        <div style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--mk-text-muted)", padding: 8, background: "var(--mk-surface-2)", borderRadius: 6 }}>
          Não precisa de configuração. A IA consulta datas como &quot;amanhã&quot;, &quot;próxima segunda&quot;, etc.
        </div>
      )}

      <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="ghost-btn" style={{ fontSize: 12, padding: "8px 14px" }}>
          <i className="ti ti-plus" /> Adicionar ferramenta
        </button>
      </div>
    </form>
  );
}
