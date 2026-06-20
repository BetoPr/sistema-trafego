/**
 * Janela de horário comercial (+ almoço) do Follow-up.
 *
 * Config por agência em `configuracoes_agencia.ia.followup_janela`:
 *   { inicio, fim, almoco_ativo, almoco_inicio, almoco_fim }  // "HH:MM" (fuso SP)
 *
 * Regra: follow-up só sai DENTRO do comercial e FORA do almoço. Se cair fora,
 * o worker reagenda pro próximo instante válido (não envia). Sem config = 24h.
 */

export interface JanelaComercial {
  inicio: string;
  fim: string;
  almocoAtivo: boolean;
  almocoInicio: string;
  almocoFim: string;
}

const SP_TZ = "America/Sao_Paulo"; // SP = UTC-3 fixo (sem horário de verão desde 2019)
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

function toMin(hhmm: string): number | null {
  const m = HHMM.exec(hhmm);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

/** Lê a janela do jsonb `ia`. null = sem restrição (envia a qualquer hora). */
export function parseJanela(ia: unknown): JanelaComercial | null {
  const j = (ia as Record<string, unknown> | null)?.followup_janela as Record<string, unknown> | undefined;
  if (!j) return null;
  const inicio = String(j.inicio || "");
  const fim = String(j.fim || "");
  const mi = toMin(inicio), mf = toMin(fim);
  if (mi === null || mf === null || mi >= mf) return null; // inválido → sem restrição
  return {
    inicio,
    fim,
    almocoAtivo: !!j.almoco_ativo,
    almocoInicio: String(j.almoco_inicio || "12:00"),
    almocoFim: String(j.almoco_fim || "13:00"),
  };
}

function addDayStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function spParts(base: Date): { dateStr: string; min: number } {
  const dateStr = new Intl.DateTimeFormat("en-CA", { timeZone: SP_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(base);
  const hhmm = new Intl.DateTimeFormat("en-GB", { timeZone: SP_TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(base);
  const [h, m] = hhmm.split(":").map(Number);
  return { dateStr, min: h * 60 + m };
}

function spDateAt(dateStr: string, min: number, addDays = 0): Date {
  const d = addDays ? addDayStr(dateStr, addDays) : dateStr;
  const hh = String(Math.floor(min / 60)).padStart(2, "0");
  const mm = String(min % 60).padStart(2, "0");
  return new Date(`${d}T${hh}:${mm}:00-03:00`);
}

/**
 * Próximo instante válido pra enviar, a partir de `base`.
 * Retorna null se `base` já está dentro do comercial e fora do almoço (pode enviar agora).
 */
export function proximoEnvioValido(janela: JanelaComercial | null, base: Date): Date | null {
  if (!janela) return null;
  const ini = toMin(janela.inicio)!;
  const fim = toMin(janela.fim)!;
  const { dateStr, min } = spParts(base);

  if (min < ini) return spDateAt(dateStr, ini);        // antes de abrir → hoje, na abertura
  if (min >= fim) return spDateAt(dateStr, ini, 1);    // depois de fechar → amanhã, na abertura

  if (janela.almocoAtivo) {
    const aIni = toMin(janela.almocoInicio);
    const aFim = toMin(janela.almocoFim);
    if (aIni !== null && aFim !== null && aIni < aFim && min >= aIni && min < aFim) {
      // dentro do almoço → volta no fim do almoço (limitado ao fim do comercial)
      return spDateAt(dateStr, Math.min(aFim, fim));
    }
  }
  return null; // dentro do comercial, fora do almoço → envia agora
}
