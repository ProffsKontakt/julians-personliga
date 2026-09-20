'use client';

import { Block } from 'konsta/react';
import Link from 'next/link';
import { useMemo } from 'react';
import { StackedShare, TIER_COLORS } from '@/components/charts';
import { IconChart, IconDumbbell, IconReceipt } from '@/components/icons';
import Shell from '@/components/Shell';
import { GlassCard, SectionTitle, StatTile } from '@/components/ui';
import {
  buildInsights,
  flattenItems,
  spendByTier,
  summarize,
  weeklyLoad,
  workoutVolume,
} from '@/lib/analytics';
import { useStore } from '@/lib/store';
import { daysAgo, kr, num, pct } from '@/lib/utils';

export default function HomePage() {
  const { state, ready } = useStore();

  const recentReceipts = useMemo(
    () => state.receipts.filter((r) => r.purchasedAt >= daysAgo(30)),
    [state.receipts],
  );
  const recentSpend = recentReceipts.reduce((a, r) => a + r.total, 0);
  const tiers = useMemo(
    () => spendByTier(flattenItems(recentReceipts)),
    [recentReceipts],
  );
  const foodInsight = useMemo(() => buildInsights(state.receipts)[0], [state.receipts]);

  const portfolio = useMemo(
    () => summarize(state.holdings, state.cashflows),
    [state.holdings, state.cashflows],
  );

  const recentWorkouts = useMemo(
    () => state.workouts.filter((w) => w.date >= daysAgo(28)),
    [state.workouts],
  );
  const recentVolume = recentWorkouts.reduce((a, w) => a + workoutVolume(w), 0);
  const weeks = useMemo(() => weeklyLoad(state.workouts), [state.workouts]);
  const trend = weeks.length >= 2 ? weeks[weeks.length - 1].volume - weeks[weeks.length - 2].volume : 0;

  const empty =
    ready &&
    state.receipts.length === 0 &&
    state.holdings.length === 0 &&
    state.workouts.length === 0;

  return (
    <Shell
      title="Jarvis"
      subtitle={greeting()}
      right={
        <Link href="/konto" className="p-2 text-[#0a84ff] text-[15px] font-medium">
          Konto
        </Link>
      }
    >
      {empty ? (
        <Block className="!mt-4 space-y-3">
          <GlassCard className="space-y-2">
            <h2 className="text-[20px] font-semibold leading-snug text-white">
              Hubben är tom — det är meningen.
            </h2>
            <p className="text-[15px] leading-relaxed text-white/55">
              Allt ligger lokalt i den här webbläsaren. Inget konto, ingen molndatabas, inget som
              läcker. Börja med vilket område du vill; de tre pratar med varandra här på förstasidan.
            </p>
          </GlassCard>

          <StartCard
            href="/kvitton"
            icon={<IconReceipt className="w-6 h-6" />}
            title="Skanna ett kvitto"
            body="Fota ett matkvitto. Modellen delar upp det i varor, mängd, pris och kilopris."
          />
          <StartCard
            href="/kapital"
            icon={<IconChart className="w-6 h-6" />}
            title="Lägg in ett innehav"
            body="Antal och GAV räcker. Kurs är valfri — utan den säger appen det rakt ut."
          />
          <StartCard
            href="/kraft"
            icon={<IconDumbbell className="w-6 h-6" />}
            title="Logga ett pass"
            body="Vikt och reps. Från andra passet börjar progressionskurvorna ritas."
          />
        </Block>
      ) : (
        <Block className="!mt-0 space-y-0">
          <SectionTitle action={<Arrow href="/kvitton" />}>Mat · 30 dagar</SectionTitle>
          {recentReceipts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <StatTile
                  label="Utgift"
                  value={kr(recentSpend)}
                  hint={`${recentReceipts.length} kvitton`}
                />
                <StatTile
                  label="Till näringstätt"
                  value={
                    recentSpend > 0 ? `${((tiers.satsa / recentSpend) * 100).toFixed(0)} %` : '–'
                  }
                  hint={`${kr(tiers['skar-ner'])} på det strykbara`}
                />
              </div>
              <GlassCard className="mt-3">
                <StackedShare
                  segments={[
                    { label: 'Satsa på', value: tiers.satsa, color: TIER_COLORS.satsa },
                    { label: 'Neutralt', value: tiers.neutral, color: TIER_COLORS.neutral },
                    { label: 'Skär ner', value: tiers['skar-ner'], color: TIER_COLORS['skar-ner'] },
                  ]}
                  format={(n) => kr(n)}
                />
              </GlassCard>
              {foodInsight && (
                <GlassCard className="mt-3 space-y-1.5">
                  <h3 className="text-[16px] font-semibold leading-snug text-white">
                    {foodInsight.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-white/55">{foodInsight.body}</p>
                </GlassCard>
              )}
            </>
          ) : (
            <Quiet href="/kvitton" text="Inga kvitton de senaste 30 dagarna." />
          )}

          <SectionTitle action={<Arrow href="/kapital" />}>Kapital</SectionTitle>
          {state.holdings.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Marknadsvärde"
                value={kr(portfolio.marketValue)}
                hint={`${state.holdings.length} innehav`}
              />
              <StatTile
                label="Orealiserat"
                value={kr(portfolio.gain)}
                delta={pct(portfolio.gainPct)}
                tone={portfolio.gain >= 0 ? 'up' : 'down'}
                hint={
                  portfolio.unpricedCount > 0
                    ? `${portfolio.unpricedCount} utan kurs`
                    : undefined
                }
              />
            </div>
          ) : (
            <Quiet href="/kapital" text="Inga innehav inlagda." />
          )}

          <SectionTitle action={<Arrow href="/kraft" />}>Kraft · 4 veckor</SectionTitle>
          {recentWorkouts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              <StatTile
                label="Pass"
                value={String(recentWorkouts.length)}
                hint={`${(recentWorkouts.length / 4).toFixed(1)} per vecka`}
              />
              <StatTile
                label="Volym"
                value={`${num(recentVolume / 1000, 1)} ton`}
                delta={
                  trend !== 0
                    ? `${trend > 0 ? '+' : ''}${num(trend)} kg mot förra veckan`
                    : undefined
                }
                tone={trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral'}
              />
            </div>
          ) : (
            <Quiet href="/kraft" text="Inga pass de senaste fyra veckorna." />
          )}

          <SectionTitle>Om datan</SectionTitle>
          <GlassCard shine={false}>
            <p className="text-[13px] leading-relaxed text-white/45">
              Allt lagras i den här webbläsarens IndexedDB. Byter du enhet, rensar webbläsardata
              eller kör i privat läge är hubben tom. Det är ett medvetet första steg — nästa är en
              riktig databas med inloggning.
            </p>
          </GlassCard>
        </Block>
      )}
    </Shell>
  );
}

function StartCard({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="block active:opacity-70">
      <GlassCard className="flex items-start gap-4">
        <span className="mt-0.5 text-[#0a84ff]">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold text-white">{title}</span>
          <span className="mt-0.5 block text-[14px] leading-relaxed text-white/50">{body}</span>
        </span>
      </GlassCard>
    </Link>
  );
}

function Quiet({ href, text }: { href: string; text: string }) {
  return (
    <Link href={href} className="block active:opacity-70">
      <GlassCard shine={false}>
        <p className="text-[14px] text-white/45">{text}</p>
      </GlassCard>
    </Link>
  );
}

function Arrow({ href }: { href: string }) {
  return (
    <Link href={href} className="text-[13px] font-medium text-[#0a84ff]">
      Öppna
    </Link>
  );
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Sent uppe.';
  if (hour < 10) return 'God morgon.';
  if (hour < 14) return 'God förmiddag.';
  if (hour < 18) return 'God eftermiddag.';
  if (hour < 23) return 'God kväll.';
  return 'Sent uppe.';
}
