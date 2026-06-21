/**
 * Mapeamento DDD brasileiro → UF.
 * Fonte: ANATEL (planos de numeração).
 */
const DDD_UF: Record<number, string> = {
  11: "SP", 12: "SP", 13: "SP", 14: "SP", 15: "SP", 16: "SP", 17: "SP", 18: "SP", 19: "SP",
  21: "RJ", 22: "RJ", 24: "RJ",
  27: "ES", 28: "ES",
  31: "MG", 32: "MG", 33: "MG", 34: "MG", 35: "MG", 37: "MG", 38: "MG",
  41: "PR", 42: "PR", 43: "PR", 44: "PR", 45: "PR", 46: "PR",
  47: "SC", 48: "SC", 49: "SC",
  51: "RS", 53: "RS", 54: "RS", 55: "RS",
  61: "DF",
  62: "GO", 64: "GO",
  63: "TO",
  65: "MT", 66: "MT",
  67: "MS",
  68: "AC",
  69: "RO",
  71: "BA", 73: "BA", 74: "BA", 75: "BA", 77: "BA",
  79: "SE",
  81: "PE", 87: "PE",
  82: "AL",
  83: "PB",
  84: "RN",
  85: "CE", 88: "CE",
  86: "PI", 89: "PI",
  91: "PA", 93: "PA", 94: "PA",
  92: "AM", 97: "AM",
  95: "RR",
  96: "AP",
  98: "MA", 99: "MA",
};

/** Extrai DDD numérico de um telefone BR em qualquer formato. Retorna null se não der pra inferir. */
export function dddDoTelefone(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const d = String(raw).replace(/\D/g, "");
  if (!d) return null;
  // Casos:
  //  5511999999999 (13 dig, DDI 55 + DDD + 9 dig)
  //  551199999999  (12 dig, DDI 55 + DDD + 8 dig — fixo)
  //  11999999999   (11 dig sem DDI)
  //  1199999999    (10 dig sem DDI — fixo)
  let dd: string | null = null;
  if (d.length >= 12 && d.startsWith("55")) dd = d.slice(2, 4);
  else if (d.length === 10 || d.length === 11) dd = d.slice(0, 2);
  if (!dd) return null;
  const n = Number(dd);
  return Number.isFinite(n) ? n : null;
}

/** Retorna a UF (2 letras) inferida do telefone, ou null. */
export function ufPorTelefone(raw: string | null | undefined): string | null {
  const ddd = dddDoTelefone(raw);
  if (ddd == null) return null;
  return DDD_UF[ddd] || null;
}

/** Normaliza um valor de `contatos.estado` (que pode vir como nome cheio ou sigla) pra UF de 2 letras. */
export function normalizarUf(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase();
  if (s.length === 2 && /^[A-Z]{2}$/.test(s)) return s in DDD_UF_SET ? s : s; // aceita 2 letras
  const NOME_UF: Record<string, string> = {
    ACRE: "AC", ALAGOAS: "AL", AMAPA: "AP", "AMAPÁ": "AP", AMAZONAS: "AM", BAHIA: "BA",
    CEARA: "CE", "CEARÁ": "CE", "DISTRITO FEDERAL": "DF", "ESPIRITO SANTO": "ES",
    "ESPÍRITO SANTO": "ES", GOIAS: "GO", "GOIÁS": "GO", MARANHAO: "MA", "MARANHÃO": "MA",
    "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS", "MINAS GERAIS": "MG", PARA: "PA",
    "PARÁ": "PA", PARAIBA: "PB", "PARAÍBA": "PB", PARANA: "PR", "PARANÁ": "PR",
    PERNAMBUCO: "PE", PIAUI: "PI", "PIAUÍ": "PI", "RIO DE JANEIRO": "RJ",
    "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS", RONDONIA: "RO", "RONDÔNIA": "RO",
    RORAIMA: "RR", "SANTA CATARINA": "SC", "SAO PAULO": "SP", "SÃO PAULO": "SP",
    SERGIPE: "SE", TOCANTINS: "TO",
  };
  return NOME_UF[s] || null;
}

// Set auxiliar pra normalizarUf
const DDD_UF_SET: Record<string, true> = Object.fromEntries(
  Array.from(new Set(Object.values(DDD_UF))).map((uf) => [uf, true as const]),
);
