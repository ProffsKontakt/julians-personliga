'use client';

import type { CSSProperties, ReactNode } from 'react';

/**
 * Innehållslagrets ytor.
 *
 * Två regler styr allt här:
 *
 *  1. Ljus sitter på KANTER, aldrig i kroppen. Ett kort är en mörk yta med
 *     en ljusare överkant — inte en ljus platta. Det är skillnaden mellan
 *     glas och grå plast, och det är hela anledningen till att den förra
 *     versionen såg billig ut.
 *  2. En yta får aldrig ligga direkt ovanpå en annan likadan. Nästlat
 *     innehåll använder `Inset`, som saknar kortets ljuslogik — det är just
 *     frånvaron som gör att hierarkin läses.
 *
 * Korten har medvetet ingen backdrop-filter. De ligger på ambientlagret,
 * inte på rullande innehåll, så det finns ingenting att sudda — och 20
 * filterlager per skärm är det som får appen att hacka.
 */
export function GlassCard({
  children,
  className = '',
  /** Ljusstreck i skärmens accentfärg längs överkanten. */
  accent = false,
  hero = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  accent?: boolean;
  hero?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={style}
      className={['pane', hero ? 'pane-hero' : '', accent ? 'pane-accent' : '', 'p-4', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

/** Opak yta för innehåll *inuti* ett GlassCard. Ingen ram — se `.well`. */
export function Inset({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`well ${className}`}>{children}</div>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3 px-1 pt-7 pb-2.5">
      <h2 className="micro">{children}</h2>
      {action}
    </div>
  );
}

/**
 * Nyckeltal.
 *
 * `emphasis` styr storleken, inte färgen. Färg är reserverad för riktning
 * (upp/ned) och för accenten — den får aldrig bära storleksordning, för då
 * konkurrerar den med talet självt.
 */
export function StatTile({
  label,
  value,
  delta,
  tone = 'neutral',
  hint,
  emphasis = 'normal',
  className = '',
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: 'neutral' | 'up' | 'down';
  hint?: string;
  emphasis?: 'normal' | 'stor' | 'hero';
  className?: string;
}) {
  const toneColor = tone === 'up' ? 'var(--accent)' : tone === 'down' ? '#ff6b4a' : 'var(--ink-2)';

  /*
   * Storlekarna är responsiva med flit. "1 726 000 kr" är tolv tecken, och
   * på 32 px rann det rakt ut ur en halvbred ruta på en telefon och in i
   * grannen. Talet får krympa; rutan får inte spricka.
   */
  const size =
    emphasis === 'hero'
      ? 'text-[38px] leading-[1.02] sm:text-[56px]'
      : emphasis === 'stor'
        ? 'text-[23px] leading-tight sm:text-[30px]'
        : 'text-[20px] leading-tight sm:text-[24px]';

  return (
    <GlassCard
      accent={emphasis !== 'normal'}
      hero={emphasis === 'hero'}
      className={`flex h-full flex-col justify-between gap-1 ${emphasis === 'hero' ? 'p-5 sm:p-6' : ''} ${className}`}
    >
      <div className="flex flex-col gap-1">
        <span className="micro">{label}</span>
        <span className={`tnum font-semibold break-words text-white ${size}`}>{value}</span>
        {delta && (
          <span className="tnum text-[13px] font-medium" style={{ color: toneColor }}>
            {delta}
          </span>
        )}
      </div>
      {hint && <span className="mt-2 text-[11px] leading-snug text-[var(--ink-3)]">{hint}</span>}
    </GlassCard>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <GlassCard accent className="flex flex-col items-center gap-3 py-12 text-center">
      {icon && <div style={{ color: 'var(--accent)', opacity: 0.55 }}>{icon}</div>}
      <h3 className="text-[17px] font-semibold text-white">{title}</h3>
      <p className="max-w-[38ch] text-[14px] leading-relaxed text-[var(--ink-2)]">{body}</p>
      {action}
    </GlassCard>
  );
}

export function Chip({
  children,
  color = 'var(--ink-2)',
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 32%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${color} 12%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

/** Rad i en nyckeltalslista. Siffror högerställda och tabulära. */
export function Row({
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-150 ${
        onClick ? 'active:bg-white/[0.06] lg:hover:bg-white/[0.04]' : ''
      }`}
    >
      {accent && (
        <span
          className="h-8 w-[2px] shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] text-white">{label}</span>
        {/* Radbryts hellre än kapas: kiloprisspannet är halva poängen. */}
        {sub && <span className="block text-[12px] leading-snug text-[var(--ink-3)]">{sub}</span>}
      </span>
      <span className="tnum shrink-0 text-[15px] font-medium text-[var(--ink)]">{value}</span>
    </Tag>
  );
}

/**
 * Segmenterad kontroll.
 *
 * Konstas standardfärger ger en vit pill med svart text i mörkt läge — rätt
 * för en opak iOS-yta, fel här, där den lyser som en lampa. Den aktiva
 * pillen är i stället mörk med en accentkant, samma logik som korten.
 */
export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: readonly (readonly [T, string])[];
}) {
  return (
    <div
      role="tablist"
      className="flex gap-1 rounded-full border border-[var(--hair)] bg-white/[0.045] p-1"
    >
      {options.map(([key, label]) => {
        const active = key === value;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className="flex-1 rounded-full px-3 py-2 text-[14px] font-medium transition-all duration-200"
            style={
              active
                ? {
                    background: 'rgb(var(--accent-rgb) / 0.14)',
                    color: 'var(--accent)',
                    boxShadow: 'inset 0 0 0 1px rgb(var(--accent-rgb) / 0.42)',
                  }
                : { color: 'var(--ink-2)' }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Rutnätet på dashboarden.
 *
 * En kolumn på telefon, två på surfplatta, tolv på desktop. Tolv och inte
 * fyra: det är det minsta talet som delas jämnt av 2, 3, 4 och 6, och det
 * är vad som krävs för att en rad ska kunna vara tre lika delar och nästa
 * två olika stora utan att rytmen bryts.
 */
export function Grid({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-12 lg:gap-4 ${className}`}>
      {children}
    </div>
  );
}

/** Radrubrik med ett hårfint streck ut till kanten — Trons linjespråk. */
export function RuleHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-1 pt-7 pb-3">
      <h2 className="micro shrink-0">{children}</h2>
      <span
        aria-hidden
        className="h-px flex-1"
        style={{
          background:
            'linear-gradient(90deg, rgb(var(--accent-rgb) / 0.4), rgb(255 255 255 / 0.05) 55%, transparent)',
        }}
      />
      {action}
    </div>
  );
}
