"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Balao } from "@/components/ui/Balao";
import { criarRelatorio, atualizarRelatorio } from "./_actions";

export interface RelatorioForm {
  id?: string;
  nome: string;
  cliente_id: string | null;
  telefone_destino: string | null;
  canal_id: string | null;
  plataforma: "meta_ads" | "google_ads";
  frequencia: "diario" | "semanal" | "mensal";
  dia_semana: number | null;
  dia_mes: number | null;
  hora_envio: string;
  formato: "pdf" | "imagem" | "texto";
  periodo_dias: number;
}

interface Opcao {
  id: string;
  nome: string;
}

const DIAS_SEMANA = [
  { v: 0, l: "Domingo" }, { v: 1, l: "Segunda" }, { v: 2, l: "Terça" },
  { v: 3, l: "Quarta" }, { v: 4, l: "Quinta" }, { v: 5, l: "Sexta" }, { v: 6, l: "Sábado" },
];

export function RelatorioFormBalao({
  open,
  onClose,
  inicial,
  clientes,
  canais,
}: {
  open: boolean;
  onClose: () => void;
  inicial?: RelatorioForm;
  clientes: Opcao[];
  canais: Opcao[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const editando = !!inicial?.id;

  const [f, setF] = useState<RelatorioForm>(
    inicial || {
      nome: "",
      cliente_id: null,
      telefone_destino: null,
      canal_id: null,
      plataforma: "meta_ads",
      frequencia: "semanal",
      dia_semana: 1,
      dia_mes: 1,
      hora_envio: "09:00",
      formato: "texto",
      periodo_dias: 7,
    },
  );

  function patch<K extends keyof RelatorioForm>(k: K, v: RelatorioForm[K]) {
    setF((s) => ({ ...s, [k]: v }));
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      if (editando && f.id) {
        await atualizarRelatorio(f.id, fd);
      } else {
        await criarRelatorio(fd);
      }
      onClose();
      router.refresh();
    });
  }

  const inp: React.CSSProperties = {
    width: "100%", background: "var(--mk-surface-2)", border: "0.5px solid var(--mk-border)",
    borderRadius: 9, padding: "9px 11px", fontSize: 13, color: "var(--mk-text)",
    fontFamily: "inherit",
  };
  const lbl: React.CSSProperties = {
    fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, color: "var(--mk-text-muted)",
    marginBottom: 4, display: "block",
  };

  return (
    <Balao open={open} onClose={onClose} titulo={editando ? "Editar relatório" : "Novo relatório agendado"} icone="ti-clipboard-list" largura={540}>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label style={lbl}>NOME</label>
          <input name="nome" required value={f.nome} onChange={(e) => patch("nome", e.target.value)}
            placeholder="Ex.: Relatório Felipe Boulanger" style={inp} />
        </div>

        <div>
          <label style={lbl}>DESTINATÁRIO</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <select name="cliente_id" value={f.cliente_id || ""} onChange={(e) => patch("cliente_id", e.target.value || null)} style={inp}>
              <option value="">— Cliente cadastrado —</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <input name="telefone_destino" value={f.telefone_destino || ""} onChange={(e) => patch("telefone_destino", e.target.value || null)}
              placeholder="+55 11 99999-9999" style={inp} />
          </div>
          <div style={{ fontSize: 10.5, color: "var(--mk-text-muted)", marginTop: 4 }}>Use cliente OU telefone livre. Pelo menos um obrigatório.</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={lbl}>PLATAFORMA</label>
            <select name="plataforma" value={f.plataforma} onChange={(e) => patch("plataforma", e.target.value as RelatorioForm["plataforma"])} style={inp}>
              <option value="meta_ads">Meta Ads</option>
              <option value="google_ads">Google Ads</option>
            </select>
          </div>
          <div>
            <label style={lbl}>CANAL WHATSAPP</label>
            <select name="canal_id" value={f.canal_id || ""} onChange={(e) => patch("canal_id", e.target.value || null)} style={inp}>
              <option value="">— Qualquer ativo —</option>
              {canais.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label style={lbl}>FREQUÊNCIA</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
            {(["diario", "semanal", "mensal"] as const).map((opt) => {
              const ativo = f.frequencia === opt;
              return (
                <button type="button" key={opt}
                  onClick={() => patch("frequencia", opt)}
                  style={{
                    padding: "9px 10px", borderRadius: 9, fontSize: 12, fontWeight: 600,
                    background: ativo ? "rgba(16,185,129,0.16)" : "var(--mk-surface-2)",
                    color: ativo ? "#fff" : "var(--mk-text-secondary)",
                    border: ativo ? "0.5px solid rgba(52,211,153,0.4)" : "0.5px solid var(--mk-border)",
                    cursor: "pointer",
                  }}>
                  {opt === "diario" ? "Diário" : opt === "semanal" ? "Semanal" : "Mensal"}
                </button>
              );
            })}
          </div>
          <input type="hidden" name="frequencia" value={f.frequencia} />
        </div>

        {f.frequencia === "semanal" && (
          <div>
            <label style={lbl}>DIA DA SEMANA</label>
            <select name="dia_semana" value={f.dia_semana ?? 1} onChange={(e) => patch("dia_semana", Number(e.target.value))} style={inp}>
              {DIAS_SEMANA.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
            </select>
          </div>
        )}

        {f.frequencia === "mensal" && (
          <div>
            <label style={lbl}>DIA DO MÊS</label>
            <input type="number" min={1} max={31} name="dia_mes" value={f.dia_mes ?? 1} onChange={(e) => patch("dia_mes", Number(e.target.value))} style={inp} />
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <label style={lbl}>HORA</label>
            <input type="time" name="hora_envio" value={f.hora_envio} onChange={(e) => patch("hora_envio", e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>FORMATO</label>
            <input type="hidden" name="formato" value="texto" />
            <div style={{ padding: "8px 10px", background: "var(--mk-surface)", border: ".5px solid var(--mk-border)", borderRadius: 8, fontSize: 12, color: "var(--mk-text-muted)" }}>
              <i className="ti ti-message" style={{ marginRight: 5, color: "#00E19A" }} />
              Mensagem de texto no WhatsApp
            </div>
          </div>
          <div>
            <label style={lbl}>PERÍODO (DIAS)</label>
            <input type="number" min={1} max={90} name="periodo_dias" value={f.periodo_dias} onChange={(e) => patch("periodo_dias", Number(e.target.value))} style={inp} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
          <button type="button" onClick={onClose} className="ghost-btn">Cancelar</button>
          <button type="submit" disabled={pending} className="cta-btn">
            <i className="ti ti-device-floppy" style={{ fontSize: 14, marginRight: 5 }} />
            {pending ? "Salvando…" : editando ? "Salvar" : "Criar"}
          </button>
        </div>
      </form>
    </Balao>
  );
}
