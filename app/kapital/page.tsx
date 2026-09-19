'use client';

import { Block, Button } from 'konsta/react';
import { useMemo, useState } from 'react';
import { BarList } from '@/components/charts';
import HoldingForm from '@/components/HoldingForm';
import { IconPlus, IconSparkle, IconTrash, IconWarning } from '@/components/icons';
import Shell from '@/components/Shell';
import { Chip, EmptyState, GlassCard, Row, SectionTitle, StatTile, Tabs } from '@/components/ui';
import { concentrationWarnings, exposureBy, summarize, valuate } from '@/lib/analytics';
import { useStore } from '@/lib/store';
import type { Holding } from '@/lib/types';
import { kr, pct } from '@/lib/utils';

type View = 'portfolj' | 'exponering' | 'briefing';

const ACCENTS = ['#0a84ff', '#bf5af0', '#26c185', '#fa6a22', '#40c8e0', '#ffd60a'];

export default function KapitalPage() {
  const { state, ready, saveHolding, removeHolding, error: storeError } = useStore();
  const [view, setView] = useState<View>('portfolj');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Holding | undefined>();

  const holdings = state.holdings;
  const summary = useMemo(() => summarize(holdings, state.cashflows), [holdings, state.cashflows]);
  const valuations = useMemo(
    () => valuate(holdings).sort((a, b) => b.marketValue - a.marketValue),
    [holdings],
  );
  const warnings = useMemo(() => concentrationWarnings(holdings), [holdings]);

  async function handleSave(holding: Holding) {
    await saveHolding(holding);
    setEditing(undefined);
  }

  return (
    <Shell
      title="Kapital"
      subtitle={ready ? `${holdings.length} innehav · ${kr(summary.marketValue)}` : 'Läser…'}
      right={
        <button
          onClick={() => {
            setEditing(undefined);
            setFormOpen(true);
          }}
          className="p-2 text-[#0a84ff]"
          aria-label="Lägg till innehav"
        >
          <IconPlus className="w-6 h-6" />
        </button>
      }
    >
      <Block className="!mt-3 !mb-0">
        <Tabs
          value={view}
          onChange={setView}
          options={
            [
              ['portfolj', 'Portfölj'],
            ['exponering', 'Exponering'],
            ['briefing', 'Omvärlden'],
            ] as const
          }
        />
      </Block>

      {holdings.length === 0 ? (
        <Block className="!mt-6">
          <EmptyState
            title="Tom portfölj"
            body="Lägg in aktier, fonder och ETF:er med antal och GAV. Kurs är valfri — utan den värderas innehavet till anskaffningsvärde, och appen säger det rakt ut i stället för att visa en påhittad siffra."
            action={
              <Button rounded onClick={() => setFormOpen(true)} className="mt-2">
                Lägg till första innehavet
              </Button>
            }
          />
        </Block>
      ) : view === 'portfolj' ? (
        <Portfolio
          summary={summary}
          valuations={valuations}
          warnings={warnings}
          onEdit={(h) => {
            setEditing(h);
            setFormOpen(true);
          }}
          onRemove={(id) => void removeHolding(id)}
        />
      ) : view === 'exponering' ? (
        <Exposure holdings={holdings} />
      ) : (
        <Briefing holdings={holdings} totalValue={summary.marketValue} />
      )}

      <HoldingForm
        key={editing?.id ?? 'ny'}
        opened={formOpen}
        initial={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        onSave={(h) => void handleSave(h)}
      />
    </Shell>
  );
}

/* ------------------------------------------------------------------ */

function Portfolio({
  summary,
  valuations,
  warnings,
  onEdit,
  onRemove,
}: {
  summary: ReturnType<typeof summarize>;
  valuations: ReturnType<typeof valuate>;
  warnings: string[];
  onEdit: (h: Holding) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <Block className="!mt-0 space-y-0">
      <SectionTitle>Ställning</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Marknadsvärde"
          value={kr(summary.marketValue)}
          hint={`Anskaffat ${kr(summary.costBasis)}`}
        />
        <StatTile
          label="Orealiserat"
          value={kr(summary.gain)}
          delta={pct(summary.gainPct)}
          tone={summary.gain >= 0 ? 'up' : 'down'}
        />
      </div>

      {summary.unpricedCount > 0 && (
        <GlassCard className="mt-3 flex items-start gap-3" shine={false}>
          <IconWarning className="w-5 h-5 shrink-0 text-[#fa6a22]" />
          <p className="text-[14px] leading-relaxed text-white/70">
            {summary.unpricedCount} innehav saknar kurs och räknas till anskaffningsvärde. Det gör
            att {(summary.staleShare * 100).toFixed(0)} % av portföljvärdet ovan är en placeholder,
            inte en marknadsvärdering.
          </p>
        </GlassCard>
      )}

      <SectionTitle>Innehav</SectionTitle>
      <GlassCard className="!p-0 overflow-hidden">
        <ul className="divide-y divide-white/[0.06]">
          {valuations.map((v, i) => (
            <li key={v.holding.id} className="flex items-center">
              <div className="min-w-0 flex-1">
                <Row
                  accent={ACCENTS[i % ACCENTS.length]}
                  onClick={() => onEdit(v.holding)}
                  label={v.holding.name}
                  sub={[
                    v.holding.ticker,
                    `${v.holding.quantity} × ${v.holding.avgCost} ${v.holding.currency}`,
                    v.holding.account,
                    v.hasPrice ? null : 'ingen kurs',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  value={
                    <span className="flex flex-col items-end">
                      <span>{kr(v.marketValue)}</span>
                      {v.hasPrice && (
                        <span
                          className={`text-[12px] ${
                            v.gain >= 0 ? 'text-[#26c185]' : 'text-[#fa6a22]'
                          }`}
                        >
                          {pct(v.gainPct)}
                        </span>
                      )}
                    </span>
                  }
                />
              </div>
              <button
                onClick={() => onRemove(v.holding.id)}
                className="px-3 py-4 text-white/25 active:text-[#fa6a22]"
                aria-label={`Ta bort ${v.holding.name}`}
              >
                <IconTrash className="w-5 h-5" />
              </button>
            </li>
          ))}
        </ul>
      </GlassCard>

      {warnings.length > 0 && (
        <>
          <SectionTitle>Vad som sticker ut</SectionTitle>
          <div className="space-y-3">
            {warnings.map((warning, i) => (
              <GlassCard key={i} className="flex items-start gap-3" shine={false}>
                <IconWarning className="w-5 h-5 shrink-0 text-[#fa6a22]" />
                <p className="text-[14px] leading-relaxed text-white/70">{warning}</p>
              </GlassCard>
            ))}
          </div>
        </>
      )}

      <SectionTitle>Kassaflöden</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Insatt" value={kr(summary.deposited)} />
        <StatTile label="Uttaget" value={kr(summary.withdrawn)} />
        <StatTile label="Utdelningar" value={kr(summary.dividends)} tone="up" />
        <StatTile label="Avgifter" value={kr(summary.fees)} tone="down" />
      </div>
    </Block>
  );
}

function Exposure({ holdings }: { holdings: Holding[] }) {
  const [dimension, setDimension] = useState<'tags' | 'kind' | 'account' | 'currency'>('tags');
  const data = useMemo(() => exposureBy(holdings, dimension), [holdings, dimension]);

  const labels: Record<typeof dimension, string> = {
    tags: 'Teman',
    kind: 'Tillgångsslag',
    account: 'Konto',
    currency: 'Valuta',
  };

  return (
    <Block className="!mt-0 space-y-0">
      <SectionTitle>Dela upp på</SectionTitle>
      <div className="flex flex-wrap gap-2">
        {(['tags', 'kind', 'account', 'currency'] as const).map((d) => (
          <button key={d} onClick={() => setDimension(d)}>
            <Chip color={dimension === d ? '#0a84ff' : 'rgba(255,255,255,0.45)'}>{labels[d]}</Chip>
          </button>
        ))}
      </div>

      <SectionTitle>{labels[dimension]}</SectionTitle>
      <GlassCard>
        <BarList
          data={data.map((e, i) => ({
            label: e.label,
            value: e.value,
            color: ACCENTS[i % ACCENTS.length],
            formatted: kr(e.value),
            meta: `${(e.share * 100).toFixed(0)} %`,
          }))}
        />
      </GlassCard>

      {dimension === 'tags' && (
        <p className="px-1 pt-3 text-[12px] leading-relaxed text-white/35">
          Ett innehav räknas fullt i varje tema det bär. Summan kan därför överstiga 100 % — det är
          meningen, teman överlappar.
        </p>
      )}
    </Block>
  );
}

function Briefing({ holdings, totalValue }: { holdings: Holding[]; totalValue: number }) {
  const [state, setState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; message: string }
    | { status: 'done'; brief: string; sources: { title: string; url: string }[]; at: string }
  >({ status: 'idle' });

  async function run() {
    setState({ status: 'loading' });
    const total = totalValue || 1;
    const vals = valuate(holdings);
    try {
      const response = await fetch('/api/kapital/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalValue,
          holdings: vals.map((v) => ({
            name: v.holding.name,
            ticker: v.holding.ticker,
            kind: v.holding.kind,
            share: v.marketValue / total,
            currency: v.holding.currency,
            tags: v.holding.tags,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setState({ status: 'error', message: payload.message ?? 'Något gick fel.' });
        return;
      }
      setState({
        status: 'done',
        brief: payload.brief,
        sources: payload.sources ?? [],
        at: payload.generatedAt,
      });
    } catch (e) {
      setState({ status: 'error', message: e instanceof Error ? e.message : 'Nätverksfel.' });
    }
  }

  return (
    <Block className="!mt-0 space-y-0">
      <SectionTitle>Omvärldsbild</SectionTitle>
      <GlassCard className="space-y-3">
        <p className="text-[14px] leading-relaxed text-white/55">
          Modellen söker upp vad som händer just nu och ställer det mot dina innehav — vad som talar
          emot, vad som talar för, och vad som är värt att hålla ögonen på. Det är en lägesbild, inte
          rådgivning.
        </p>
        <Button
          rounded
          onClick={run}
          disabled={state.status === 'loading' || holdings.length === 0}
        >
          <span className="flex items-center gap-2">
            <IconSparkle
              className={`w-5 h-5 ${state.status === 'loading' ? 'animate-pulse' : ''}`}
            />
            {state.status === 'loading' ? 'Söker och analyserar…' : 'Hämta lägesbild'}
          </span>
        </Button>
        {state.status === 'loading' && (
          <p className="text-[13px] text-white/40">
            Det här tar en halv minut. Modellen gör riktiga webbsökningar.
          </p>
        )}
      </GlassCard>

      {state.status === 'error' && (
        <GlassCard className="mt-3 flex items-start gap-3" shine={false}>
          <IconWarning className="w-5 h-5 shrink-0 text-[#fa6a22]" />
          <p className="text-[14px] leading-relaxed text-white/75">{state.message}</p>
        </GlassCard>
      )}

      {state.status === 'done' && (
        <>
          <SectionTitle>
            Lägesbild {new Date(state.at).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}
          </SectionTitle>
          <GlassCard>
            <Markdown text={state.brief} />
          </GlassCard>

          {state.sources.length > 0 && (
            <>
              <SectionTitle>Källor</SectionTitle>
              <GlassCard className="!p-0 overflow-hidden">
                <ul className="divide-y divide-white/[0.06]">
                  {state.sources.map((source, i) => (
                    <li key={i}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-4 py-3 active:bg-white/[0.06]"
                      >
                        <span className="block truncate text-[14px] text-white">
                          {source.title}
                        </span>
                        <span className="block truncate text-[12px] text-white/35">
                          {safeHost(source.url)}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </>
          )}
        </>
      )}
    </Block>
  );
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Minimal markdown: rubriker, punktlistor, fet text, brödtext.
 * Räcker för briefingens fasta struktur och undviker ett helt beroende.
 * Texten renderas aldrig som HTML — allt går genom React som ren text.
 */
function Markdown({ text }: { text: string }) {
  const lines = text.split('\n');

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('## ')) {
          return (
            <h3
              key={i}
              className="pt-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/45 first:pt-0"
            >
              {trimmed.slice(3)}
            </h3>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={i} className="text-[18px] font-semibold text-white">
              {trimmed.slice(2)}
            </h2>
          );
        }
        if (/^[-*]\s/.test(trimmed)) {
          return (
            <p key={i} className="flex gap-2 text-[14px] leading-relaxed text-white/75">
              <span className="text-white/30">·</span>
              <span>{bold(trimmed.replace(/^[-*]\s/, ''))}</span>
            </p>
          );
        }
        return (
          <p key={i} className="text-[14px] leading-relaxed text-white/75">
            {bold(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function bold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <strong key={i} className="font-semibold text-white">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
