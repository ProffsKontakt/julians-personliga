'use client';

import type { ReactNode } from 'react';

/**
 * Innehållslagrets glasytor.
 *
 * Regel som gäller i hela appen: en glasyta får aldrig ligga direkt ovanpå en
 * annan. Blur staplas multiplikativt och läsbarheten dör. Nästlade block
 * använder `Inset` nedan, som är opakt.
 */
export function GlassCard({
  children,
  className = '',
  elevated = false,
  shine = true,
}: {
  children: ReactNode;
  className?: string;
  elevated?: boolean;
  shine?: boolean;
}) {
  return (
    <div
      className={[
        elevated ? 'glass-card-elevated' : 'glass-card',
        shine ? 'glass-shine' : '',
        'p-4',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  );
}

/** Opak yta för innehåll *inuti* ett GlassCard. */
export function Inset({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl bg-white/[0.06] border border-white/[0.07] ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between px-1 pt-6 pb-2">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-white/45">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function StatTile({
  label,
  value,
  delta,
  tone = 'neutral',
  hint,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: 'neutral' | 'up' | 'down';
  hint?: string;
}) {
  const toneClass =
    tone === 'up' ? 'text-[#30d158]' : tone === 'down' ? 'text-[#ff453a]' : 'text-white/55';

  return (
    <GlassCard className="flex flex-col gap-1">
      <span className="text-[12px] font-medium uppercase tracking-[0.06em] text-white/45">
        {label}
      </span>
      <span className="tnum text-[26px] leading-tight font-semibold text-white">{value}</span>
      {delta && <span className={`tnum text-[13px] font-medium ${toneClass}`}>{delta}</span>}
      {hint && <span className="text-[11px] leading-snug text-white/35">{hint}</span>}
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
    <GlassCard className="flex flex-col items-center gap-3 py-10 text-center">
      {icon && <div className="text-white/35">{icon}</div>}
      <h3 className="text-[17px] font-semibold text-white">{title}</h3>
      <p className="max-w-[34ch] text-[14px] leading-relaxed text-white/50">{body}</p>
      {action}
    </GlassCard>
  );
}

export function Chip({
  children,
  color = 'rgba(255,255,255,0.5)',
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium"
      style={{
        color,
        borderColor: `color-mix(in oklab, ${color} 35%, transparent)`,
        backgroundColor: `color-mix(in oklab, ${color} 14%, transparent)`,
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
      className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
        onClick ? 'active:bg-white/[0.06]' : ''
      }`}
    >
      {accent && (
        <span
          className="h-8 w-1 shrink-0 rounded-full"
          style={{ backgroundColor: accent }}
          aria-hidden
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] text-white">{label}</span>
        {/* Radbryts hellre än kapas: kiloprisspannet är halva poängen. */}
        {sub && <span className="block text-[12px] leading-snug text-white/40">{sub}</span>}
      </span>
      <span className="tnum shrink-0 text-[15px] font-medium text-white/85">{value}</span>
    </Tag>
  );
}

/**
 * Segmenterad kontroll.
 *
 * Konstas standardfärger ger en vit pill med svart text i mörkt läge. Det är
 * korrekt för en opak iOS-yta men fel ovanpå glas — den lyser som en lampa.
 * Här är pillen i stället en ljusare glasnyans med vit text.
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
      className="flex gap-1 rounded-full border border-white/10 bg-white/[0.07] p-1 backdrop-blur-xl"
    >
      {options.map(([key, label]) => {
        const active = key === value;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(key)}
            className={`flex-1 rounded-full px-3 py-2 text-[14px] font-medium transition-colors duration-200 ${
              active
                ? 'bg-white/[0.16] text-white shadow-[inset_0_0.5px_0_rgba(255,255,255,0.25)]'
                : 'text-white/50 active:text-white/80'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
