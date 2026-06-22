export type FaixaEtaria = "18-24" | "25-34" | "35-44" | "45-54" | "55+";
export const FAIXAS_ETARIAS: FaixaEtaria[] = ["18-24", "25-34", "35-44", "45-54", "55+"];

export interface PontoContato {
  uf: string;
  servico: string | null;
  faixa: FaixaEtaria | null;
}
