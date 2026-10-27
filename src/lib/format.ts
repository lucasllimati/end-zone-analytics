const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const NA = 'Não disponível';

const ok = (v: number | null | undefined): v is number => v !== null && v !== undefined && Number.isFinite(v);

export function num(v: number | null | undefined, digits = 0): string {
  if (!ok(v)) return NA;
  return digits === 0 ? nf0.format(v) : digits === 1 ? nf1.format(v) : nf2.format(v);
}

/** Percentual no estilo NFL (.750) para PCT de classificação. */
export function pct3(v: number | null | undefined): string {
  if (!ok(v)) return NA;
  return v >= 1 ? '1.000' : v.toFixed(3).replace(/^0/, '');
}

export function percent(v: number | null | undefined, digits = 1): string {
  if (!ok(v)) return NA;
  return `${num(v * 100, digits)}%`;
}

export function signed(v: number | null | undefined, digits = 0): string {
  if (!ok(v)) return NA;
  const s = num(Math.abs(v), digits);
  return v > 0 ? `+${s}` : v < 0 ? `−${s}` : s;
}

export function compact(v: number | null | undefined): string {
  if (!ok(v)) return NA;
  return new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

export function dateBR(iso: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' }): string {
  if (!iso) return NA;
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return NA;
  return new Intl.DateTimeFormat('pt-BR', opts).format(d);
}

export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return NA;
  const diff = (new Date(iso).getTime() - now) / 1000;
  const rtf = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  return rtf.format(Math.round(diff / 86400), 'day');
}

/** Altura em polegadas → "6'2\" (1,88 m)". */
export function height(inches: number | null | undefined): string {
  if (!ok(inches)) return NA;
  const ft = Math.floor(inches / 12);
  const inch = Math.round(inches % 12);
  return `${ft}'${inch}" (${nf2.format(inches * 0.0254)} m)`;
}

export function weight(lb: number | null | undefined): string {
  if (!ok(lb)) return NA;
  return `${nf0.format(lb)} lb (${nf0.format(lb * 0.4536)} kg)`;
}

export function age(birth: string | null | undefined, at = new Date()): number | null {
  if (!birth) return null;
  const b = new Date(`${birth}T12:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  let a = at.getFullYear() - b.getFullYear();
  const m = at.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < b.getDate())) a--;
  return a;
}

const WEEKDAYS: Record<string, string> = {
  Sunday: 'Dom', Monday: 'Seg', Tuesday: 'Ter', Wednesday: 'Qua', Thursday: 'Qui', Friday: 'Sex', Saturday: 'Sáb',
};
export const weekdayPt = (w: string | null | undefined) => (w ? WEEKDAYS[w] ?? w : '');

export function ordinal(n: number): string {
  return `${n}º`;
}

const ROMAN: [number, string][] = [
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

/** Numeração romana dos Super Bowls (o Super Bowl 50 usou algarismos arábicos). */
export function roman(n: number): string {
  if (n === 50) return '50';
  let out = '';
  let rest = n;
  for (const [v, s] of ROMAN) {
    while (rest >= v) {
      out += s;
      rest -= v;
    }
  }
  return out;
}

/**
 * Instante do kickoff. O nflverse publica data (YYYY-MM-DD) e horário no fuso do Leste dos EUA
 * (America/New_York, com horário de verão); aqui convertemos para um instante absoluto.
 */
export function kickoffInstant(date: string | null | undefined, timeET: string | null | undefined): Date | null {
  const d = date?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const t = timeET?.match(/^(\d{1,2}):(\d{2})/);
  if (!d || !t) return null;
  const wall = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]);
  // Deslocamento do fuso de Nova York naquele instante (EDT = -4h, EST = -5h).
  const offsetAt = (ms: number) => {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        .formatToParts(new Date(ms))
        .map((x) => [x.type, x.value]),
    );
    return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - ms;
  };
  let utc = wall - offsetAt(wall);
  utc = wall - offsetAt(utc);
  return new Date(utc);
}

/** Horário local do kickoff com o fuso (ex.: "14:00 BRT"); null se a fonte não informou o horário. */
export function kickoffLocal(date: string | null | undefined, timeET: string | null | undefined, timeZone?: string): string | null {
  const at = kickoffInstant(date, timeET);
  if (!at) return null;
  const parts = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short', timeZone }).formatToParts(at);
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? '';
  return `${get('hour')}:${get('minute')} ${get('timeZoneName')}`.trim();
}

/** Marcas de gramado sintético como vêm do nflverse (`a_turf`, `fieldturf`…) → nome legível. */
const TURF: Record<string, string> = { a_turf: 'A-Turf', fieldturf: 'FieldTurf', sportturf: 'SportTurf', matrixturf: 'Matrix Turf', astroturf: 'AstroTurf', astroplay: 'AstroPlay', dessograss: 'Desso (grama híbrida)' };

/** Tipo de gramado e marca: "grass" → Grama natural; "a_turf" → Sintético, A-Turf. */
export function surfaceLabel(s: string | null | undefined): { kind: string; brand: string | null } | null {
  if (!s) return null;
  const key = s.trim().toLowerCase();
  if (key === 'grass') return { kind: 'Grama natural', brand: null };
  return { kind: 'Sintético', brand: TURF[key] ?? s };
}
