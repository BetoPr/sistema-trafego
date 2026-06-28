/**
 * Utils de timezone — Sonar é Brasil-first (sem DST desde 2019, UTC-3 fixo).
 *
 * Display: usa Intl.DateTimeFormat pra renderizar UTC em horário BR.
 * Cálculo: usa offset constante UTC-3 pra timezones BR; suporta outras zonas via Intl.
 */

export const TZ_DEFAULT = "America/Sao_Paulo";

/** Pega offset em minutos da timezone vs UTC numa data específica. Negativo = atrás de UTC. */
function offsetMinutos(tz: string, when: Date = new Date()): number {
  // Truque: formata em ambas tz e UTC, calcula diferença
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const parts = dtf.formatToParts(when).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    parseInt(parts.year, 10),
    parseInt(parts.month, 10) - 1,
    parseInt(parts.day, 10),
    parseInt(parts.hour, 10) === 24 ? 0 : parseInt(parts.hour, 10),
    parseInt(parts.minute, 10),
    parseInt(parts.second, 10),
  );
  return Math.round((asUtc - when.getTime()) / 60000);
}

/**
 * Calcula próximo envio respeitando timezone do relatório.
 * frequencia: diario | semanal | mensal
 * hora_envio: "HH:MM" no fuso `tz`
 * Retorna Date em UTC pronto pra salvar.
 */
export function calcularProximoEnvioTZ(opts: {
  frequencia: "diario" | "semanal" | "mensal";
  hora_envio: string;
  dia_semana?: number | null;
  dia_mes?: number | null;
  timezone?: string | null;
  base?: Date;
}): Date {
  const tz = opts.timezone || TZ_DEFAULT;
  const base = opts.base || new Date();
  const [h, m] = opts.hora_envio.split(":").map((n) => parseInt(n, 10));
  const off = offsetMinutos(tz, base);

  // "agora no fuso BR" como instante em ms ajustado
  const baseTz = new Date(base.getTime() + off * 60000);

  // Constrói candidato no fuso BR: hoje com a hora alvo
  const candTz = new Date(baseTz);
  candTz.setUTCHours(h, m, 0, 0);

  if (opts.frequencia === "diario") {
    if (candTz.getTime() <= baseTz.getTime()) {
      candTz.setUTCDate(candTz.getUTCDate() + 1);
    }
  } else if (opts.frequencia === "semanal") {
    const alvo = opts.dia_semana ?? 1;
    let diff = (alvo - candTz.getUTCDay() + 7) % 7;
    if (diff === 0 && candTz.getTime() <= baseTz.getTime()) diff = 7;
    candTz.setUTCDate(candTz.getUTCDate() + diff);
  } else {
    const alvo = opts.dia_mes ?? 1;
    candTz.setUTCDate(alvo);
    if (candTz.getTime() <= baseTz.getTime()) {
      candTz.setUTCMonth(candTz.getUTCMonth() + 1);
    }
  }

  // Converte de volta pra UTC: subtrai o offset
  return new Date(candTz.getTime() - off * 60000);
}

/** Formata Date em horário BR pra display. */
export function formatarBR(d: Date | string | null, formato: "data" | "hora" | "completo" = "completo"): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";
  const tz = TZ_DEFAULT;
  if (formato === "data") {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "short", year: "numeric" }).format(dt);
  }
  if (formato === "hora") {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(dt);
  }
  const dataF = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, day: "2-digit", month: "short" }).format(dt);
  const horaF = new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(dt);
  return `${dataF} · ${horaF}`;
}

/**
 * Recebe string ISO UTC → devolve string "YYYY-MM-DDTHH:MM" no fuso BR
 * pra pré-preencher input datetime-local.
 */
export function isoUtcParaDatetimeLocalBR(iso: string | null): string {
  if (!iso) return "";
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return "";
  const off = offsetMinutos(TZ_DEFAULT, dt);
  const local = new Date(dt.getTime() + off * 60000);
  // Usa UTC getters porque já ajustamos manualmente
  const Y = local.getUTCFullYear();
  const M = String(local.getUTCMonth() + 1).padStart(2, "0");
  const D = String(local.getUTCDate()).padStart(2, "0");
  const h = String(local.getUTCHours()).padStart(2, "0");
  const m = String(local.getUTCMinutes()).padStart(2, "0");
  return `${Y}-${M}-${D}T${h}:${m}`;
}

/**
 * Recebe string "YYYY-MM-DDTHH:MM" do input datetime-local (interpretada como BR)
 * → devolve Date em UTC pronto pra salvar.
 */
export function datetimeLocalBRParaIsoUtc(local: string): Date {
  const [data, hora] = local.split("T");
  const [y, mo, d] = data.split("-").map((n) => parseInt(n, 10));
  const [h, mi] = hora.split(":").map((n) => parseInt(n, 10));
  // Cria como se fosse UTC, depois ajusta com offset BR
  const utcGuess = new Date(Date.UTC(y, mo - 1, d, h, mi, 0, 0));
  const off = offsetMinutos(TZ_DEFAULT, utcGuess);
  return new Date(utcGuess.getTime() - off * 60000);
}
