/**
 * Contexto temporal pra IA: bloco pra prepender no system prompt
 * + mapa de placeholders {{...}} pra substituicao inline.
 * Default timezone America/Sao_Paulo. Sem deps externas (usa Intl).
 */

export interface ContextoTemporal {
  block: string;
  replacements: Record<string, string>;
  timezone: string;
  now: Date;
}

const WEEKDAYS_PT = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const WEEKDAY_KEYS = [
  "data_proximo_domingo",
  "data_proxima_segunda",
  "data_proxima_terca",
  "data_proxima_quarta",
  "data_proxima_quinta",
  "data_proxima_sexta",
  "data_proximo_sabado",
];

function partsInTimezone(date: Date, timezone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "";
  const weekdayShort = get("weekday");
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  return {
    year: parseInt(get("year"), 10),
    month: parseInt(get("month"), 10),
    day: parseInt(get("day"), 10),
    hour: parseInt(get("hour"), 10),
    minute: parseInt(get("minute"), 10),
    weekday: weekdayMap[weekdayShort] ?? 0,
  };
}

function ddmmyyyy(p: { year: number; month: number; day: number }): string {
  const dd = String(p.day).padStart(2, "0");
  const mm = String(p.month).padStart(2, "0");
  return `${dd}/${mm}/${p.year}`;
}

function isoDate(p: { year: number; month: number; day: number }): string {
  const dd = String(p.day).padStart(2, "0");
  const mm = String(p.month).padStart(2, "0");
  return `${p.year}-${mm}-${dd}`;
}

function addDaysInTimezone(
  base: { year: number; month: number; day: number },
  days: number,
  timezone: string,
): { year: number; month: number; day: number; weekday: number } {
  const baseUtc = Date.UTC(base.year, base.month - 1, base.day, 12, 0, 0);
  const target = new Date(baseUtc + days * 86400000);
  const parts = partsInTimezone(target, timezone);
  return { year: parts.year, month: parts.month, day: parts.day, weekday: parts.weekday };
}

function nextWeekday(
  base: { year: number; month: number; day: number; weekday: number },
  targetWeekday: number,
  timezone: string,
): { year: number; month: number; day: number; weekday: number } {
  let delta = targetWeekday - base.weekday;
  if (delta <= 0) delta += 7;
  return addDaysInTimezone(base, delta, timezone);
}

function periodoDoDia(hour: number): string {
  if (hour >= 5 && hour <= 11) return "manhã";
  if (hour >= 12 && hour <= 17) return "tarde";
  if (hour >= 18 && hour <= 23) return "noite";
  return "madrugada";
}

export function buildContextoTemporal(
  timezone: string = "America/Sao_Paulo",
  now: Date = new Date(),
): ContextoTemporal {
  const today = partsInTimezone(now, timezone);

  const hojeStr = ddmmyyyy(today);
  const horaStr = `${String(today.hour).padStart(2, "0")}:${String(today.minute).padStart(2, "0")}`;
  const diaSemana = WEEKDAYS_PT[today.weekday];
  const isoToday = isoDate(today);
  const periodo = periodoDoDia(today.hour);

  const amanha = addDaysInTimezone(today, 1, timezone);
  const depoisAmanha = addDaysInTimezone(today, 2, timezone);

  const replacements: Record<string, string> = {
    data_hoje: hojeStr,
    hora_atual: horaStr,
    dia_semana: diaSemana,
    data_amanha: ddmmyyyy(amanha),
    data_depois_amanha: ddmmyyyy(depoisAmanha),
    data_iso: isoToday,
    timestamp_iso: now.toISOString(),
    periodo_dia: periodo,
    timezone,
  };

  for (let i = 0; i < 7; i++) {
    const next = nextWeekday(today, i, timezone);
    replacements[WEEKDAY_KEYS[i]] = ddmmyyyy(next);
  }

  const block =
    `[CONTEXTO TEMPORAL]\n` +
    `Data de hoje: ${diaSemana}, ${hojeStr}\n` +
    `Hora atual (${timezone}): ${horaStr} (${periodo})\n` +
    `Amanhã: ${ddmmyyyy(amanha)}\n` +
    `Depois de amanhã: ${ddmmyyyy(depoisAmanha)}\n` +
    `Use sempre essas referências ao falar de datas/agendamentos com o cliente. Nunca invente datas.`;

  return { block, replacements, timezone, now };
}

export function aplicarPlaceholders(
  texto: string,
  replacements: Record<string, string>,
): string {
  let out = texto;
  for (const [key, value] of Object.entries(replacements)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export function temPlaceholders(texto: string): boolean {
  return /\{\{[a-z_]+\}\}/i.test(texto);
}

/**
 * Resolve uma referencia temporal em pt-BR pra data ISO + descricao.
 * Deterministico, sem LLM. Usado pela tool consultar_data.
 */
export function resolverReferenciaTemporal(
  referencia: string,
  timezone: string = "America/Sao_Paulo",
  now: Date = new Date(),
):
  | { resolvido: true; iso: string; dia_semana: string; descricao: string }
  | { resolvido: false; motivo: string } {
  const ref = referencia.trim().toLowerCase();
  const today = partsInTimezone(now, timezone);

  const format = (p: { year: number; month: number; day: number; weekday: number }, desc: string) => ({
    resolvido: true as const,
    iso: isoDate(p),
    dia_semana: WEEKDAYS_PT[p.weekday],
    descricao: desc,
  });

  if (ref === "hoje") return format(today, "hoje");
  if (ref === "amanhã" || ref === "amanha") return format(addDaysInTimezone(today, 1, timezone), "amanhã");
  if (ref === "ontem") return format(addDaysInTimezone(today, -1, timezone), "ontem");
  if (
    ref === "depois de amanhã" ||
    ref === "depois de amanha" ||
    ref === "depois amanhã" ||
    ref === "depois amanha"
  ) {
    return format(addDaysInTimezone(today, 2, timezone), "depois de amanhã");
  }

  const mDias = ref.match(/(?:daqui\s*a?\s*|em\s+)(\d+)\s*dias?/);
  if (mDias) {
    const n = parseInt(mDias[1], 10);
    if (n >= 0 && n <= 365) {
      return format(addDaysInTimezone(today, n, timezone), `daqui a ${n} dia(s)`);
    }
  }

  const weekdayMap: Record<string, number> = {
    domingo: 0,
    segunda: 1, "segunda-feira": 1,
    "terça": 2, terca: 2, "terça-feira": 2, "terca-feira": 2,
    quarta: 3, "quarta-feira": 3,
    quinta: 4, "quinta-feira": 4,
    sexta: 5, "sexta-feira": 5,
    "sábado": 6, sabado: 6,
  };
  const cleaned = ref
    .replace(/^proxima\s+|^próxima\s+|^proximo\s+|^próximo\s+/, "")
    .replace(/\s+que\s+vem$/, "")
    .trim();
  if (cleaned in weekdayMap) {
    const target = weekdayMap[cleaned];
    const next = nextWeekday(today, target, timezone);
    return format(next, `próxima ${WEEKDAYS_PT[target]}`);
  }

  const mIso = ref.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mIso) {
    const y = parseInt(mIso[1], 10);
    const m = parseInt(mIso[2], 10);
    const d = parseInt(mIso[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const baseUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
      const parts = partsInTimezone(new Date(baseUtc), timezone);
      return format(parts, `data ISO ${ref}`);
    }
  }

  const mBr = ref.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (mBr) {
    const d = parseInt(mBr[1], 10);
    const m = parseInt(mBr[2], 10);
    const y = parseInt(mBr[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      const baseUtc = Date.UTC(y, m - 1, d, 12, 0, 0);
      const parts = partsInTimezone(new Date(baseUtc), timezone);
      return format(parts, `data ${ref}`);
    }
  }

  return {
    resolvido: false,
    motivo: `Não consegui interpretar "${referencia}". Tente: "amanhã", "próxima segunda", "daqui a 3 dias", "2026-06-22" ou "22/06/2026".`,
  };
}
