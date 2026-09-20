'use client';

import { useId, useState } from 'react';

/**
 * Diagram som inline-SVG. Inget chartbibliotek.
 *
 * Designregler som gäller här (och som är medvetna val, inte slarv):
 *
 *  - Varje segment och stapel är ALLTID direktmärkt med text.
 *  - Kategoristaplar bär EN färg — skärmens accent. Kategorierna är nominella
 *    (kött, mejeri, godis): att färga dem olika spenderar identitetskanalen på
 *    att upprepa det stapellängden redan visar. Femton färger var fel svar på
 *    rätt fråga; etiketten bär identiteten, längden bär storleken.
 *  - Ingen donut/paj. Vågräta staplar, sorterade fallande.
 *  - En skala per diagram. Aldrig två y-axlar.
 *  - Text bär textfärg, aldrig seriefärgen.
 *  - 2 px mellanrum mellan intilliggande fyllningar, 4 px rundade dataändar.
 *
 * TIER_COLORS är den enda äkta flerseriepaletten: en divergerande skala med
 * appens två poler och en neutral mitt. Validerad mot glasytan (#151A21) i
 * mörkt läge — alla tre i ljushetsbandet, kontrast ≥ 3:1, sämsta par
 * ΔE 12.5 (protanopi) och 17.9 (normalseende), alltså över golvet på 15.
 * Ändras den ska den valideras om.
 */
export const TIER_COLORS = {
  satsa: '#0aa6c4',
  neutral: '#666b73',
  'skar-ner': '#ff410d',
} as const;

const INK = 'var(--ink)';
const INK_DIM = 'var(--ink-3)';
/** Skärmens accent. Kategoristaplar och enkelseriediagram använder den. */
const ACCENT = 'var(--accent-fill)';
/** Negativa värden. Egen färg — ett minustecken ensamt räcker inte. */
const NEGATIVE = '#ff6b4a';

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
    return <p className="px-4 py-6 text-center text-[14px] text-[var(--ink-3)]">{emptyLabel}</p>;
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
                className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.07]"
                role="img"
                aria-label={`${d.label}: ${d.formatted ?? d.value}`}
              >
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width: `${Math.max(share * 100, 1.5)}%`,
                    backgroundColor: d.color ?? ACCENT,
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
    return <p className="py-4 text-center text-[14px] text-[var(--ink-3)]">Ingen data än</p>;
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

/**
 * Kolumndiagram, en serie, med nollinje.
 *
 * Negativa värden ritas nedåt från nollinjen och i varningsfärg. Tidigare
 * klampades alla staplar till minst 2 % höjd uppåt, vilket fick en
 * förlustmånad att se ut som en liten vinst — ett diagram som ljuger om
 * tecknet är värre än inget diagram.
 */
export function ColumnChart({
  data,
  format,
  height = 132,
  color = ACCENT,
}: {
  data: { label: string; value: number }[];
  format: (n: number) => string;
  height?: number;
  color?: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  if (data.length === 0) {
    return <p className="py-8 text-center text-[14px] text-[var(--ink-3)]">Ingen data än</p>;
  }

  const max = Math.max(...data.map((d) => d.value), 0);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = max - min || 1;
  const posH = (max / span) * height;
  const negH = height - posH;
  const harNegativa = min < 0;

  const shown = active !== null ? data[active] : data[data.length - 1];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px]" style={{ color: INK_DIM }}>
          {shown.label}
        </span>
        <span
          className="tnum text-[15px] font-semibold"
          style={{ color: shown.value < 0 ? NEGATIVE : INK }}
        >
          {format(shown.value)}
        </span>
      </div>

      <div className="relative" style={{ height }}>
        {/* Nollinjen ritas bara när den faktiskt delar data. */}
        {harNegativa && (
          <div
            aria-hidden
            className="absolute right-0 left-0 h-px"
            style={{ top: posH, background: 'rgb(255 255 255 / 0.16)' }}
          />
        )}

        <div className="flex h-full items-stretch justify-center gap-2">
          {data.map((d, i) => {
            const isActive = active === null ? i === data.length - 1 : active === i;
            const neg = d.value < 0;
            const andel = Math.abs(d.value) / span;
            return (
              <button
                key={d.label}
                type="button"
                className="group relative flex h-full flex-1 flex-col"
                style={{ maxWidth: 72 }}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                aria-label={`${d.label}: ${format(d.value)}`}
              >
                {/* Positiv halva: stapeln växer uppåt från nollinjen. */}
                <span className="flex w-full items-end" style={{ height: posH }}>
                  {!neg && (
                    <span
                      className="w-full rounded-t-[4px] transition-all duration-300"
                      style={{
                        height: `${Math.max(andel * 100, 1)}%`,
                        backgroundColor: color,
                        opacity: isActive ? 1 : 0.45,
                      }}
                    />
                  )}
                </span>
                {/* Negativ halva: nedåt, i varningsfärg. */}
                <span className="flex w-full items-start" style={{ height: negH }}>
                  {neg && (
                    <span
                      className="w-full rounded-b-[4px] transition-all duration-300"
                      style={{
                        height: `${Math.max(andel * 100, 1)}%`,
                        backgroundColor: NEGATIVE,
                        opacity: isActive ? 1 : 0.45,
                      }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
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
  color = ACCENT,
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
      <p className="py-8 text-center text-[14px] text-[var(--ink-3)]">
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
          stroke="rgb(var(--accent-rgb) / 0.35)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {/* 2 px ring i ytans färg så markören läser även över linjen. */}
        <circle cx={x(shownIndex)} cy={y(shown.value)} r="6" fill="var(--page)" />
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

/* ------------------------------------------------------------------ */
/* Reaktorn — nollpunktsmätare                                         */
/* ------------------------------------------------------------------ */

/**
 * Månadens täckningsbidrag mätt mot de fasta kostnaderna.
 *
 * Det här är svaret på frågan om en 3D-matris. En roterande kub hade kodat
 * noll variabler och åldrats på ett halvår. Den här ringen kodar en enda
 * sak, och det är månadens viktigaste: hur långt täckningsbidraget räcker
 * mot de kostnader som löper oavsett. Hela varvet är nollpunkten. Allt
 * bortom den är vinst, och ritas som ett andra varv i en ljusare ton.
 *
 * Saknas fasta kostnader finns ingen nollpunkt att mäta mot. Då ritas ingen
 * mätare alls — en tom ring hade påstått att nollpunkten var noll.
 */
export function Reactor({
  tb,
  fasta,
  format,
}: {
  tb: number;
  fasta: number;
  format: (n: number) => string;
}) {
  const id = useId();
  const SWEEP = 75; // 270° av 360, uttryckt mot pathLength=100
  const har = fasta > 0;

  const andel = har ? Math.max(tb / fasta, 0) : 0;
  const primar = Math.min(andel, 1);
  const overskott = Math.max(andel - 1, 0);
  // Ett andra varv räcker till dubbla nollpunkten; däröver kapas ringen och
  // siffran får bära resten. Bättre en ärlig kapning än en ring som snurrar.
  const overskottVisat = Math.min(overskott, 1);

  const ring = (r: number, frac: number, stroke: string, width: number, opacity = 1) => (
    <circle
      cx="120"
      cy="120"
      r={r}
      pathLength="100"
      fill="none"
      stroke={stroke}
      strokeWidth={width}
      strokeLinecap="round"
      strokeDasharray={`${(SWEEP * frac).toFixed(2)} 100`}
      transform="rotate(135 120 120)"
      opacity={opacity}
    />
  );

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 240 216"
        className="w-full max-w-[280px]"
        role="img"
        aria-label={
          har
            ? `Täckningsbidrag ${format(tb)} av ${format(fasta)} i fasta kostnader, ${(andel * 100).toFixed(0)} procent av nollpunkten`
            : `Täckningsbidrag ${format(tb)}. Inga fasta kostnader inlagda, så nollpunkten är okänd.`
        }
      >
        <defs>
          <filter id={`glow-${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Spår */}
        {ring(96, 1, 'rgb(255 255 255 / 0.07)', 6)}
        {ring(78, 1, 'rgb(255 255 255 / 0.05)', 4)}

        {har && (
          <g filter={`url(#glow-${id})`}>
            {ring(96, primar, 'var(--accent-fill)', 6)}
            {overskottVisat > 0 && ring(78, overskottVisat, 'var(--accent-hot)', 4)}
          </g>
        )}

        {/* Nollpunktsmarkering: slutet av första varvet. */}
        {har && (
          <g transform="rotate(45 120 120)">
            <line
              x1="120"
              y1="12"
              x2="120"
              y2="32"
              stroke={INK_DIM}
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>

      <p className="text-center text-[12px] leading-relaxed" style={{ color: INK_DIM }}>
        {har ? (
          <>
            Täckningsbidraget täcker{' '}
            <span className="tnum font-semibold" style={{ color: INK }}>
              {(andel * 100).toFixed(0)} %
            </span>{' '}
            av {format(fasta)} i fasta kostnader.
            {overskott > 1 && ' Överskottet är större än ringen rymmer.'}
          </>
        ) : (
          <>Inga fasta kostnader inlagda — nollpunkten går inte att räkna ut.</>
        )}
      </p>
    </div>
  );
}
