/**
 * Dados geográficos do Brasil para o mapa de "Contatos por Estado".
 *
 * Os dados deste arquivo foram portados do mockup-alvo
 * (`.design-refs/entrega-sonar/Sonar Dashboard.dc.html`) — coordenadas
 * lon/lat dos centroides dos 27 UFs e do contorno (47 pontos) do mapa.
 *
 * A projeção é a do mockup: simples (lon,lat) → (x,y) em viewBox 1000×1000,
 * suficiente para um "mapa-card" estilizado. NÃO é projeção cartográfica
 * precisa — a IA de design escolheu propositadamente um contorno orgânico.
 */

export type Regiao = "N" | "NE" | "CO" | "SE" | "S";

export const REGIAO_NOME: Record<Regiao, string> = {
  N: "Norte",
  NE: "Nordeste",
  CO: "Centro-Oeste",
  SE: "Sudeste",
  S: "Sul",
};

export const REGIAO_COR: Record<Regiao, string> = {
  N: "#0D9488",
  NE: "#10B981",
  CO: "#34D399",
  SE: "#5EEAD4",
  S: "#99F6E4",
};

export interface EstadoInfo {
  uf: string;
  nome: string;
  regiao: Regiao;
  lon: number;
  lat: number;
}

/** 27 unidades federativas com nome, região e centroide aproximado (do mockup). */
export const ESTADOS: EstadoInfo[] = [
  { uf: "SP", nome: "São Paulo", regiao: "SE", lon: -46.63, lat: -23.55 },
  { uf: "RJ", nome: "Rio de Janeiro", regiao: "SE", lon: -43.2, lat: -22.9 },
  { uf: "MG", nome: "Minas Gerais", regiao: "SE", lon: -43.94, lat: -19.92 },
  { uf: "PR", nome: "Paraná", regiao: "S", lon: -49.27, lat: -25.43 },
  { uf: "RS", nome: "Rio Grande do Sul", regiao: "S", lon: -51.23, lat: -30.03 },
  { uf: "BA", nome: "Bahia", regiao: "NE", lon: -38.5, lat: -12.97 },
  { uf: "SC", nome: "Santa Catarina", regiao: "S", lon: -48.55, lat: -27.6 },
  { uf: "GO", nome: "Goiás", regiao: "CO", lon: -49.25, lat: -16.68 },
  { uf: "PE", nome: "Pernambuco", regiao: "NE", lon: -34.88, lat: -8.05 },
  { uf: "CE", nome: "Ceará", regiao: "NE", lon: -38.54, lat: -3.72 },
  { uf: "DF", nome: "Distrito Federal", regiao: "CO", lon: -47.93, lat: -15.78 },
  { uf: "ES", nome: "Espírito Santo", regiao: "SE", lon: -40.3, lat: -20.32 },
  { uf: "PA", nome: "Pará", regiao: "N", lon: -48.5, lat: -1.46 },
  { uf: "MT", nome: "Mato Grosso", regiao: "CO", lon: -56.1, lat: -15.6 },
  { uf: "MS", nome: "Mato Grosso do Sul", regiao: "CO", lon: -54.62, lat: -20.44 },
  { uf: "MA", nome: "Maranhão", regiao: "NE", lon: -44.3, lat: -2.53 },
  { uf: "PB", nome: "Paraíba", regiao: "NE", lon: -34.86, lat: -7.12 },
  { uf: "RN", nome: "Rio G. do Norte", regiao: "NE", lon: -35.2, lat: -5.79 },
  { uf: "AM", nome: "Amazonas", regiao: "N", lon: -60.02, lat: -3.1 },
  { uf: "AL", nome: "Alagoas", regiao: "NE", lon: -35.7, lat: -9.65 },
  { uf: "PI", nome: "Piauí", regiao: "NE", lon: -42.8, lat: -5.09 },
  { uf: "SE", nome: "Sergipe", regiao: "NE", lon: -37.07, lat: -10.95 },
  { uf: "TO", nome: "Tocantins", regiao: "N", lon: -48.33, lat: -10.18 },
  { uf: "RO", nome: "Rondônia", regiao: "N", lon: -63.9, lat: -8.76 },
  { uf: "AC", nome: "Acre", regiao: "N", lon: -67.8, lat: -9.97 },
  { uf: "AP", nome: "Amapá", regiao: "N", lon: -51.07, lat: 0.03 },
  { uf: "RR", nome: "Roraima", regiao: "N", lon: -60.67, lat: 2.82 },
];

/** Lookup rápido UF → info. */
export const ESTADO_POR_UF: Record<string, EstadoInfo> = Object.fromEntries(
  ESTADOS.map((e) => [e.uf, e]),
);

/** Contorno simplificado do Brasil (47 pontos em [lon, lat]). */
export const CONTORNO_BR: ReadonlyArray<readonly [number, number]> = [
  [-61, 5], [-55, 4], [-51, 4.2], [-50, 2], [-48.5, 0], [-44.3, -1.5], [-41, -2.8], [-38.5, -3.7], [-35.2, -5.2],
  [-34.8, -7.1], [-34.9, -8.5], [-35.7, -9.8], [-37, -11], [-38.5, -13], [-39, -15.5], [-39.7, -18], [-40.3, -20.3],
  [-42, -22], [-43.2, -23], [-45, -23.8], [-46.3, -24], [-48.5, -25.6], [-48.6, -27.6], [-50, -29], [-50.2, -30.5],
  [-52, -32], [-53.4, -33.7], [-55, -31], [-57, -30], [-56, -27], [-54.6, -25.6], [-54, -24], [-58, -20], [-58, -17],
  [-60, -16], [-60, -13], [-63, -11], [-66, -10], [-70, -11], [-73.5, -9.5], [-72, -7], [-70, -4], [-69, -1], [-67, 1], [-64, 2], [-62, 4],
];

/** Projeta (lon, lat) → (x, y) num viewBox 1000×1000. Mesma fórmula do mockup. */
export function proj(lon: number, lat: number): { x: number; y: number } {
  return { x: 60 + (lon + 74) * 22, y: 60 + (6 - lat) * 22 };
}

/** Constrói um path SVG suave (Catmull-Rom) e fechado a partir de pontos. */
export function pathSuaveFechado(pts: ReadonlyArray<{ x: number; y: number }>): string {
  const n = pts.length;
  if (n < 2) return n ? `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} Z` : "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d + " Z";
}

/** Path do contorno BR pronto pra usar no <path d=...> (viewBox 1000×1000). */
export const PATH_CONTORNO_BR: string = pathSuaveFechado(
  CONTORNO_BR.map(([lo, la]) => proj(lo, la)),
);
