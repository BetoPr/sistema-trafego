"use client";

import { abrirBalaoCobrancas } from "./_cobrancas";

/**
 * Botão pill no header — abre balão de cobranças com lista completa.
 * Tem variantes pra ícone só (botão pequeno) e versão completa (pill grande).
 */
export function AbrirCobrancasBtn({ pendentes }: { pendentes: number }) {
  return (
    <button
      type="button"
      onClick={() => abrirBalaoCobrancas("all")}
      className="ghost-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12.5,
        padding: "8px 14px",
        border: "0.5px solid rgba(16,185,129,0.4)",
        color: "#00E19A",
        position: "relative",
      }}
      title="Abrir controle de cobranças das agências"
    >
      <i className="ti ti-coin" /> Cobranças
      {pendentes > 0 && (
        <span
          style={{
            background: "#C97064",
            color: "#FFFDF8",
            fontSize: 10,
            fontWeight: 700,
            padding: "1px 7px",
            borderRadius: 999,
            marginLeft: 2,
          }}
          title={`${pendentes} agência(s) com pendência (atraso ou vencimento próximo)`}
        >
          {pendentes}
        </span>
      )}
    </button>
  );
}

/** Ícone moeda compacto — para usar em cada linha de usuário (abre balão filtrado). */
export function CobrancaIconBtn({ agenciaId }: { agenciaId: string }) {
  return (
    <button
      type="button"
      onClick={() => abrirBalaoCobrancas({ agenciaId })}
      className="ghost-btn acesso-icon-btn"
      style={{
        width: 30,
        height: 30,
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        color: "#00E19A",
      }}
      title="Ver cobrança da agência deste usuário"
    >
      <i className="ti ti-coin" />
    </button>
  );
}
