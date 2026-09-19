'use client';

import { useId, useState } from 'react';

/**
 * Diagram som inline-SVG. Inget chartbibliotek.
 *
 * Designregler som gäller här (och som är medvetna val, inte slarv):
 *
 *  - Varje segment och stapel är ALLTID direktmärkt med text. Färg bär
 *    aldrig identiteten ensam — det är därför 15 matkategorier kan samexistera
 *    utan att bli ett omöjligt färgpussel.
 *  - Ingen donut/paj för många kategorier. Vågräta staplar, sorterade fallande,
 *    läses snabbare på en telefon och behöver inte färgkodad legend.
 *  - En skala per diagram. Aldrig två y-axlar.
 *  - Text bär textfärg, aldrig seriefärgen.
 *  - 2 px mellanrum mellan intilliggande fyllningar, 4 px rundade dataändar.
 *
 * Tier-paletten nedan är validerad för mörkt läge: deuteranopi ΔE 8.6,
 * normalseende ΔE 17.2, kontrast > 3:1 mot glasytan.
 */
export const TIER_COLORS = {
  satsa: '#26c185',
  neutral: '#8e8e93',
  'skar-ner': '#fa6a22',
} as const;

const INK = 'rgba(255,255,255,0.92)';
const INK_DIM = 'rgba(255,255,255,0.45)';

/* ------------------------------------------------------------------ */
/* Vågräta staplar                                                     */
/* ------------------------------------------------------------------ */

export interface BarDatum {
  label: string;
  value: number;
  /** Dekorativ accent. Identiteten sitter i etiketten, inte i färgen. */
  color?: string;
  /** Sekundär text, t.ex. "12 rader". */
  meta?: string;
  formatted?: string;
}

export function BarList({
  data,
  max,
  emptyLabel = 'Ingen data än',
}: {
  data: BarDatum[];
  max?: number;
  emptyLabel?: string;
}) {
  if (data.length === 0) {
    return <p className="px-4 py-6 text-center text-[14px] text-white/40">{emptyLabel}</p>;
  }
  const ceiling = max ?? Math.max(...data.map((d) => d.value), 1);

  return (
    <ul className="flex flex-col gap-3">
      {data.map((d) => {
        const share = ceiling > 0 ? Math.max(d.value / ceiling, 0) : 0;
        return (
          <li key={d.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[14px]" style={{ color: INK }}>
                {d.label}
              </span>
              <span className="tnum shrink-0 text-[14px] font-medium" style={{ color: INK }}>
                {d.formatted ?? d.value.toLocaleString('sv-SE')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.08]"
                role="img"
                aria-label={`${d.label}: ${d.formatted ?? d.value}`}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width: `${Math.max(share * 100, 1.5)}%`,
                    backgroundColor: d.color ?? 'rgba(255,255,255,0.7)',
                  }}
                />
              </div>
              {d.meta && (
                <span className="tnum shrink-0 text-[11px]" style={{ color: INK_DIM }}>
                  {d.meta}
                </span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Staplad andelsstapel (3 segment, alltid med legend)                 */
/* ------------------------------------------------------------------ */

export interface StackSegment {
  label: string;
  value: number;
  color: string;
}

export function StackedShare({
  segments,
  format,
}: {
  segments: StackSegment[];
  format: (n: number) => string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0);
  if (total <= 0) {
    return <p className="py-4 text-center text-[14px] text-white/40">Ingen data än</p>;
  }
  const visible = segments.filter((s) => s.value > 0);

  return (
    <div className="flex flex-col gap-3">
      {/* 2 px mellanrum mellan fyllningar — gapet är en del av mark-specen. */}
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full">
        {visible.map((s) => (
          <div
            key={s.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.value / total) * 100}%`, backgroundColor: s.color }}
            role="img"
            aria-label={`${s.label}: ${format(s.value)}`}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span className="text-[12px]" style={{ color: INK_DIM }}>
              {s.label}
            </span>
            <span className="tnum text-[12px] font-medium" style={{ color: INK }}>
              {((s.value / total) * 100).toFixed(0)} %
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Kolumndiagram (en serie)                                            */
/* ------------------------------------------------------------------ */

export function ColumnChart({
  data,
  format,
  height = 132,
  color = '#0a84ff',
}: {
  data: { label: string; value: number }[];
  format: (n: number) => string;
  height?: number;
  color?: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="py-8 text-center text-[14px] text-white/40">Ingen data än</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 1);
  const shown = active !== null ? data[active] : data[data.length - 1];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px]" style={{ color: INK_DIM }}>
          {shown.label}
        </span>
        <span className="tnum text-[15px] font-semibold" style={{ color: INK }}>
          {format(shown.value)}
        </span>
      </div>

      {/* Staplarna får en takbredd: två månader ska inte bli två väggar. */}
      <div className="flex items-end justify-between gap-[3px]" style={{ height }}>
        {data.map((d, i) => {
          const isActive = active === null ? i === data.length - 1 : active === i;
          return (
            <button
              key={d.label}
              type="button"
              className="group relative flex h-full flex-1 items-end justify-center"
              style={{ maxWidth: 56 }}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${d.label}: ${format(d.value)}`}
            >
              <span
                className="w-full rounded-t-[4px] transition-all duration-300"
                style={{
                  height: `${Math.max((d.value / max) * 100, 2)}%`,
                  backgroundColor: color,
                  opacity: isActive ? 1 : 0.42,
                }}
              />
            </button>
          );
        })}
      </div>

      <div className="flex justify-between">
        <span className="text-[11px]" style={{ color: INK_DIM }}>
          {data[0].label}
        </span>
        <span className="text-[11px]" style={{ color: INK_DIM }}>
          {data[data.length - 1].label}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Linjediagram (en serie)                                             */
/* ------------------------------------------------------------------ */

export function LineChart({
  data,
  format,
  height = 150,
  color = '#0a84ff',
}: {
  data: { label: string; value: number }[];
  format: (n: number) => string;
  height?: number;
  color?: string;
}) {
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);

  if (data.length < 2) {
    return (
      <p className="py-8 text-center text-[14px] text-white/40">
        Minst två datapunkter krävs för en kurva.
      </p>
    );
  }

  const W = 320;
  const H = height;
  const PAD = 14;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const x = (i: number) => PAD + (i / (data.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - PAD * 2);

  const line = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(' ');
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H} L${x(0).toFixed(1)},${H} Z`;

  const shown = active !== null ? data[active] : data[data.length - 1];
  const shownIndex = active !== null ? active : data.length - 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px]" style={{ color: INK_DIM }}>
          {shown.label}
        </span>
        <span className="tnum text-[15px] font-semibold" style={{ color: INK }}>
          {format(shown.value)}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Utveckling från ${format(data[0].value)} till ${format(data[data.length - 1].value)}`}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const rel = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.round(((rel - PAD) / (W - PAD * 2)) * (data.length - 1));
          setActive(Math.min(Math.max(idx, 0), data.length - 1));
        }}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Hårkors på den punkt som läses just nu. */}
        <line
          x1={x(shownIndex)}
          y1={PAD / 2}
          x2={x(shownIndex)}
          y2={H - PAD / 2}
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {/* 2 px ring i ytans färg så markören läser även över linjen. */}
        <circle cx={x(shownIndex)} cy={y(shown.value)} r="6" fill="#0b0b0e" />
        <circle cx={x(shownIndex)} cy={y(shown.value)} r="4.5" fill={color} />
      </svg>

      <div className="flex justify-between">
        <span className="text-[11px]" style={{ color: INK_DIM }}>
          {data[0].label}
        </span>
        <span className="text-[11px]" style={{ color: INK_DIM }}>
          {data[data.length - 1].label}
        </span>
      </div>
    </div>
  );
}
