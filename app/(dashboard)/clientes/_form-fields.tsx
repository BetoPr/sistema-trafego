"use client";

import { useFormStatus } from "react-dom";
import Link from "next/link";

const inputBase: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  borderRadius: 8,
  border: "0.5px solid var(--mk-border)",
  background: "var(--mk-surface-2)",
  color: "var(--mk-text)",
  fontSize: 13,
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--mk-text-secondary)",
  marginBottom: 6,
};

const errStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#C97064",
  marginTop: 4,
};

export interface ClienteFormDefaults {
  nome?: string;
  segmento?: string | null;
  status?: string;
  valor_mensal?: number | null;
  observacoes?: string | null;
}

interface ClienteFieldsProps {
  defaults?: ClienteFormDefaults;
  fieldErrors?: Record<string, string>;
  globalError?: string;
  submitLabel: string;
  submitLabelPending: string;
  cancelHref: string;
}

export function ClienteFields({
  defaults = {},
  fieldErrors = {},
  globalError,
  submitLabel,
  submitLabelPending,
  cancelHref,
}: ClienteFieldsProps) {
  return (
    <div className="mk-card mk-card-lg" style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label htmlFor="nome" style={labelStyle}>
            Nome do cliente *
          </label>
          <input
            id="nome"
            name="nome"
            required
            defaultValue={defaults.nome ?? ""}
            placeholder="Ex: Bruno Odonto"
            style={inputBase}
          />
          {fieldErrors.nome && <p style={errStyle}>{fieldErrors.nome}</p>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label htmlFor="segmento" style={labelStyle}>
              Segmento
            </label>
            <input
              id="segmento"
              name="segmento"
              defaultValue={defaults.segmento ?? ""}
              placeholder="Ex: e-commerce, infoproduto, saúde"
              style={inputBase}
            />
            {fieldErrors.segmento && <p style={errStyle}>{fieldErrors.segmento}</p>}
          </div>

          <div>
            <label htmlFor="status" style={labelStyle}>
              Status
            </label>
            <select
              id="status"
              name="status"
              defaultValue={defaults.status ?? "ativo"}
              style={inputBase}
            >
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="encerrado">Encerrado</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="valor_mensal" style={labelStyle}>
            Valor mensal (R$)
          </label>
          <input
            id="valor_mensal"
            name="valor_mensal"
            type="text"
            inputMode="decimal"
            defaultValue={
              defaults.valor_mensal != null ? String(defaults.valor_mensal) : ""
            }
            placeholder="Ex: 1500.00"
            style={inputBase}
          />
          {fieldErrors.valor_mensal && (
            <p style={errStyle}>{fieldErrors.valor_mensal}</p>
          )}
        </div>

        <div>
          <label htmlFor="observacoes" style={labelStyle}>
            Observações
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={4}
            defaultValue={defaults.observacoes ?? ""}
            placeholder="Anotações internas sobre o cliente"
            style={{ ...inputBase, resize: "vertical", minHeight: 80 }}
          />
        </div>

        {globalError && <p style={{ fontSize: 12, color: "#C97064" }}>{globalError}</p>}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <SubmitButton label={submitLabel} pendingLabel={submitLabelPending} />
          <Link href={cancelHref} className="ghost-btn">
            Cancelar
          </Link>
        </div>
      </div>
    </div>
  );
}

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="cta-btn">
      {pending ? pendingLabel : label}
    </button>
  );
}
