import type { SupabaseClient } from "@supabase/supabase-js";
import { dadosGeoCompletos, type PontoContato } from "@/lib/crm/contatos-geo";
import { ESTADOS, REGIAO_NOME, REGIAO_COR, type EstadoInfo, type Regiao } from "@/lib/geo/brasil";
import { MapaContatosClient } from "./_mapa-client";

export interface DadosMapa {
  estados: EstadoInfo[];
  regioes: { regiao: Regiao; nome: string; cor: string }[];
  pontos: PontoContato[];
  servicos: string[];
  totalBase: number;
  semGeo: number;
}

/**
 * Carrega contatos com geo + serviço + faixa etária e renderiza o client component.
 * O cliente recebe TODOS os pontos (1 por contato) — filtros Serviço × Idade
 * recalculam reativamente sem nova ida ao banco.
 */
export async function MapaContatosEstado({
  supabase, agenciaId,
}: { supabase: SupabaseClient; agenciaId: string }) {
  const dados = await dadosGeoCompletos(supabase, agenciaId);

  if (dados.porUf.length === 0) {
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
          {dados.total === 0
            ? "Nenhum contato na base ainda."
            : `Nenhum contato com estado/DDD identificável (${dados.total} contatos no total). Importe contatos com telefone BR pra ver o mapa.`}
        </div>
      </div>
    );
  }

  const ordemRegioes: Regiao[] = ["SE", "S", "NE", "CO", "N"];
  const regioes = ordemRegioes.map((r) => ({
    regiao: r,
    nome: REGIAO_NOME[r],
    cor: REGIAO_COR[r],
  }));

  const dadosClient: DadosMapa = {
    estados: ESTADOS,
    regioes,
    pontos: dados.pontos,
    servicos: dados.servicos,
    totalBase: dados.total,
    semGeo: dados.semGeo,
  };

  return <MapaContatosClient dados={dadosClient} />;
}
