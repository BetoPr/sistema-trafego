/**
 * Divide texto da IA em N mensagens (blocos).
 * Regras:
 *   1. Se IA usou separador explícito (\n\n por default), respeita os blocos.
 *   2. Senão, divide por chars conforme regras_split[].
 *   3. Nunca passa de max_msgs.
 */
export interface FormatoResposta {
  bullets?: boolean;
  separador_blocos?: string;
  max_msgs?: number;
  regras_split?: Array<{ chars_max: number; n_msgs: number }>;
}

export function dividirEmBlocos(texto: string, formato: FormatoResposta): string[] {
  if (!texto?.trim()) return [];
  const maxMsgs = Math.max(1, Math.min(5, formato.max_msgs || 3));
  const sep = formato.separador_blocos || "\n\n";

  // Primeiro tenta respeitar separador explícito da IA
  const blocosExplicitos = texto
    .split(sep)
    .map((s) => s.trim())
    .filter(Boolean);
  if (blocosExplicitos.length > 1) {
    return blocosExplicitos.slice(0, maxMsgs);
  }

  // Caso contrário, decide quantas msgs pelo tamanho
  const len = texto.length;
  const regras = formato.regras_split || [
    { chars_max: 80, n_msgs: 1 },
    { chars_max: 200, n_msgs: 2 },
    { chars_max: 500, n_msgs: 3 },
  ];
  let nMsgs = maxMsgs;
  for (const r of regras) {
    if (len <= r.chars_max) {
      nMsgs = Math.min(maxMsgs, r.n_msgs);
      break;
    }
  }
  if (nMsgs <= 1) return [texto.trim()];

  // Tenta quebrar por frases (ponto final, !, ?)
  const frases = texto.match(/[^.!?]+[.!?]+\s*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) || [texto];
  if (frases.length <= 1) return [texto];

  // Distribui frases entre nMsgs balanceando tamanho
  const alvoTam = Math.ceil(len / nMsgs);
  const blocos: string[] = [];
  let acc = "";
  for (const f of frases) {
    if ((acc + " " + f).length > alvoTam && acc) {
      blocos.push(acc.trim());
      acc = f;
      if (blocos.length >= nMsgs - 1) {
        // resto vai no último bloco
        acc = [acc, ...frases.slice(frases.indexOf(f) + 1)].join(" ");
        break;
      }
    } else {
      acc = acc ? `${acc} ${f}` : f;
    }
  }
  if (acc.trim()) blocos.push(acc.trim());
  return blocos.slice(0, nMsgs);
}

export function gapAleatorio(minSeg: number, maxSeg: number): number {
  const mi = Math.max(0, minSeg);
  const ma = Math.max(mi, maxSeg);
  return (mi + Math.random() * (ma - mi)) * 1000;
}
