export function uid(prefix = ''): string {
  const base =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
  return prefix ? `${prefix}_${base}` : base;
}

const sek = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  maximumFractionDigits: 0,
});

const sekPrecise = new Intl.NumberFormat('sv-SE', {
  style: 'currency',
  currency: 'SEK',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function kr(value: number, precise = false): string {
  if (!Number.isFinite(value)) return '–';
  return precise ? sekPrecise.format(value) : sek.format(value);
}

export function pct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return '–';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits).replace('.', ',')} %`;
}

export function num(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '–';
  return new Intl.NumberFormat('sv-SE', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  const names = [
    'jan', 'feb', 'mar', 'apr', 'maj', 'jun',
    'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
  ];
  return `${names[Number(m) - 1] ?? m} ${y.slice(2)}`;
}

/**
 * Utskriven månad: '2026-09' → 'September 2026'.
 *
 * `monthLabel` ger 'sep 26', vilket är rätt på en diagramaxel och tvetydigt i
 * en rubrik — där läses det lika gärna som den 26 september.
 */
export function monthLongLabel(key: string): string {
  const [y, m] = key.split('-');
  const names = [
    'Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
    'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December',
  ];
  return `${names[Number(m) - 1] ?? m} ${y}`;
}

/** Datum N dagar bakåt, som ISO-datum. */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
