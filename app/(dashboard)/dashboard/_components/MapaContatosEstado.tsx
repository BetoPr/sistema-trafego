import type { SupabaseClient } from "@supabase/supabase-js";
import { contatosPorEstado, type ContatoEstado } from "@/lib/crm/contatos-geo";
import { ESTADOS, REGIAO_NOME, REGIAO_COR, type EstadoInfo, type Regiao } from "@/lib/geo/brasil";
import { MapaContatosClient } from "./_mapa-client";

export interface DadosMapa {
  porUf: ContatoEstado[];
  total: number;
  semGeo: number;
  estados: EstadoInfo[];
  regioes: { regiao: Regiao; nome: string; cor: string; total: number; estados: ContatoEstado[] }[];
  maiorUf: { uf: string; nome: string; pct: number } | null;
}

/**
 * Carrega contatos agrupados por UF (e por região) e renderiza o client component
 * com o mapa interativo. Snapshot atual da base (sem filtro de período).
 */
export async function MapaContatosEstado({
  supabase, agenciaId,
}: { supabase: SupabaseClient; agenciaId: string }) {
  const { porUf, total, semGeo } = await contatosPorEstado(supabase, agenciaId);

  // Empty state: sem nenhum contato com geo
  if (porUf.length === 0) {
    return (
      <div className="mk-card" style={{ padding: 20, borderRadius: 16, marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <i className="ti ti-map-pin" style={{ fontSize: 16, color: "var(--mk-accent)" }} />
          <span className="label-tiny">Contatos por estado</span>
        </div>
        <div
          style={{
            marginTop: 20,
            padding: "32px 18px",
            background: "var(--mk-surface-2)",
            borderRadius: 12,
            textAlign: "center",
            color: "var(--mk-text-muted)",
            fontSize: 13,
          }}
        >
          <i className="ti ti-map-off" style={{ fontSize: 28, opacity: 0.4, display: "block", marginBottom: 8 }} />
          {total === 0
            ? "Nenhum contato na base ainda."
            : `Nenhum contato com estado/DDD identificável (${total} contatos no total). Importe contatos com telefone BR pra ver o mapa.`}
        </div>
      </div>
    );
  }

  const countPorUf = new Map(porUf.map((p) => [p.uf, p.count]));
  const maior = porUf[0];
  const maiorInfo = ESTADOS.find((e) => e.uf === maior.uf);
  const maiorUf = maiorInfo
    ? { uf: maior.uf, nome: maiorInfo.nome, pct: total > 0 ? (maior.count / total) * 100 : 0 }
    : null;

  // Agrega por região (Sudeste, Sul, Nordeste, Centro-Oeste, Norte)
  const ordemRegioes: Regiao[] = ["SE", "S", "NE", "CO", "N"];
  const regioes = ordemRegioes.map((r) => {
    const estadosRegiao = ESTADOS.filter((e) => e.regiao === r);
    const estadosCount = estadosRegiao
      .map((e) => ({ uf: e.uf, count: countPorUf.get(e.uf) || 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
    const totalReg = estadosCount.reduce((s, x) => s + x.count, 0);
    return {
      regiao: r,
      nome: REGIAO_NOME[r],
      cor: REGIAO_COR[r],
      total: totalReg,
      estados: estadosCount,
    };
  }).filter((r) => r.total > 0);

  const dados: DadosMapa = {
    porUf,
    total,
    semGeo,
    estados: ESTADOS,
    regioes,
    maiorUf,
  };

  return <MapaContatosClient dados={dados} />;
}
